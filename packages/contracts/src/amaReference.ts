import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z
  .string()
  .refine((value) => value.trim().length > 0, "Expected nonempty text");
const optionSchema = z.strictObject({
  value: text,
  label: text,
  help: text.optional(),
});
const questionFields = {
  id,
  group: z.enum(["PE", "CS", "diagnosis"]),
  prompt: text,
  help: text.optional(),
};
export const amaQuestionSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...questionFields, type: z.literal("boolean") }),
  z.strictObject({
    ...questionFields,
    type: z.literal("choice"),
    options: z
      .array(optionSchema)
      .min(2)
      .refine(
        (options) =>
          new Set(options.map((option) => option.value)).size ===
          options.length,
        "Duplicate option value"
      ),
  }),
]);
export type AmaQuestion = z.infer<typeof amaQuestionSchema>;

export type AmaRule =
  | { field: string; equals: boolean | string }
  | { all: AmaRule[] }
  | { any: AmaRule[] }
  | { at_least: number; of: AmaRule[] };

// Strict variants keep malformed or ambiguous operators out of persisted rules.
export const amaRuleSchema: z.ZodType<AmaRule> = z.lazy(() =>
  z.union([
    z.strictObject({ field: id, equals: z.union([z.boolean(), text]) }),
    z.strictObject({ all: z.array(amaRuleSchema).min(1) }),
    z.strictObject({ any: z.array(amaRuleSchema).min(1) }),
    z
      .strictObject({
        at_least: z.number().int().positive(),
        of: z.array(amaRuleSchema).min(1),
      })
      .refine(
        (rule) => rule.at_least <= rule.of.length,
        "Count exceeds number of conditions"
      ),
  ])
);
export const amaEntrySchema = z.strictObject({
  entry_id: z.string().regex(/^\d+[A-Z]$/),
  impairment: z.strictObject({
    value: z.number().min(0).max(100),
    unit: z.literal("WPI"),
  }),
  criteria: amaRuleSchema,
});
export type AmaEntry = z.infer<typeof amaEntrySchema>;
export const amaExaminationTaskSchema = z.strictObject({
  id,
  prompt: text,
  help: text.optional(),
  question_ids: z
    .array(id)
    .min(1)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate task question reference"
    ),
});
export type AmaExaminationTask = z.infer<typeof amaExaminationTaskSchema>;

export const amaNerveRootSchema = z
  .string()
  .regex(/^(C[1-8]|T(?:[1-9]|1[0-2])|L[1-5]|S[1-5])$/);

export const amaDiagnosticRowSchema = z
  .strictObject({
    row_id: z.string().regex(/^\d{2}-\d{2}-\d{2}$/),
    region_id: id,
    description: text,
    nerve_roots: z.array(amaNerveRootSchema).default([]),
    help: text.nullable().optional(),
    questions: z.array(amaQuestionSchema),
    entries: z.array(amaEntrySchema).min(1),
    examination_tasks: z.array(amaExaminationTaskSchema),
  })
  .superRefine((row, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const unique = (ids: string[], path: string) => {
      const seen = new Set<string>();
      ids.forEach((value, index) => {
        if (seen.has(value)) issue([path, index], `Duplicate ID: ${value}`);
        seen.add(value);
      });
    };
    unique(row.nerve_roots, "nerve_roots");
    unique(
      row.questions.map((q) => q.id),
      "questions"
    );
    unique(
      row.entries.map((e) => e.entry_id),
      "entries"
    );
    unique(
      row.examination_tasks.map((t) => t.id),
      "examination_tasks"
    );

    const region = normalizeAmaRegion(row.region_id);
    const allowedRoots: Record<string, RegExp> = {
      cervical_spine: /^C[1-8]$/,
      thoracic_spine: /^T(?:[1-9]|1[0-2])$/,
      lumbar_spine: /^(L[1-5]|S[1-5])$/,
    };
    if (["cervical_spine", "thoracic_spine", "lumbar_spine"].includes(region)) {
      if (row.nerve_roots.some((root) => !allowedRoots[region].test(root))) {
        issue(["nerve_roots"], "Nerve roots do not belong to this region");
      }
      // Check root-specific descriptions, without mistaking fracture levels for roots.
      const match = row.description.match(
        /\b([CTLS])(\d+)(?:-([CTLS])(\d+))? Nerve Roots?\b/
      );
      let expected: string[] = [];
      if (row.description.includes("Radiculopathy")) {
        if (
          !match ||
          (match[3] && match[3] !== match[1]) ||
          Number(match[4] ?? match[2]) < Number(match[2]) ||
          Number(match[2]) < 1 ||
          Number(match[4] ?? match[2]) > 12
        ) {
          issue(["description"], "Unrecognized nerve-root description");
        } else {
          const first = Number(match[2]);
          const last = Number(match[4] ?? match[2]);
          expected = Array.from(
            { length: last - first + 1 },
            (_, i) => `${match[1]}${first + i}`
          );
        }
      }
      if (JSON.stringify(row.nerve_roots) !== JSON.stringify(expected)) {
        issue(
          ["nerve_roots"],
          "Missing or mismatched nerve roots for description"
        );
      }
    }

    const questions = new Map(row.questions.map((q) => [q.id, q]));
    const used = new Set<string>();
    const checkRule = (rule: AmaRule, path: (string | number)[]) => {
      if ("field" in rule) {
        const question = questions.get(rule.field);
        if (!question) issue(path, `Unknown question: ${rule.field}`);
        else {
          used.add(rule.field);
          if (
            question.type === "boolean"
              ? typeof rule.equals !== "boolean"
              : !question.options.some((option) => option.value === rule.equals)
          ) {
            issue(path, `Invalid answer value for ${rule.field}`);
          }
        }
        return;
      }
      const key = "all" in rule ? "all" : "any" in rule ? "any" : "of";
      const children =
        "all" in rule ? rule.all : "any" in rule ? rule.any : rule.of;
      // Structural identity is independent of JSON object property order.
      if (key === "of") {
        const keys = children.map(ruleIdentity);
        if (new Set(keys).size !== keys.length)
          issue(path, "Repeated counted predicate");
      }
      children.forEach((child, index) =>
        checkRule(child, [...path, key, index])
      );
    };
    row.entries.forEach((entry, i) =>
      checkRule(entry.criteria, ["entries", i, "criteria"])
    );
    row.questions.forEach((q, i) => {
      if (!used.has(q.id)) issue(["questions", i], `Unused question: ${q.id}`);
    });

    const covered = new Set<string>();
    row.examination_tasks.forEach((task, i) =>
      task.question_ids.forEach((questionId, j) => {
        if (questions.get(questionId)?.group !== "PE") {
          issue(
            ["examination_tasks", i, "question_ids", j],
            `Expected a local PE question: ${questionId}`
          );
        }
        covered.add(questionId);
      })
    );
    row.questions.forEach((q, i) => {
      if (q.group === "PE" && !covered.has(q.id))
        issue(["questions", i], `Missing examination task: ${q.id}`);
    });
  });
export type AmaDiagnosticRow = z.infer<typeof amaDiagnosticRowSchema>;

// Physicians grade each muscle; the row's motor_* criteria are derived from those grades.
export const amaMotorGradeSchema = z.enum(["5", "4", "3", "2", "0_to_1"]);
export type AmaMotorGrade = z.infer<typeof amaMotorGradeSchema>;

// A muscle-strength task links only motor criteria. Other motor-linked tasks (S1 heel
// raises) inform a muscle's grade but are not graded themselves.
export const isAmaMuscleStrengthTask = (task: AmaExaminationTask) =>
  task.id.endsWith("_strength") &&
  task.question_ids.every((id) => id.startsWith("motor_"));

// motor_N is met when any graded muscle is N/5. The criteria list muscles as examples of
// the root's myotome, so one muscle at that grade is enough. With no grades, all stay
// unresolved; once any muscle is graded, criteria for the other grades are not met.
export function amaMotorAnswers(
  row: AmaDiagnosticRow,
  motorGrades: Record<string, AmaMotorGrade>
): Record<string, boolean | null> {
  const grades = Object.values(motorGrades);
  return Object.fromEntries(
    row.questions
      .filter((q) => q.id.startsWith("motor_"))
      .map((q) => [
        q.id,
        grades.length
          ? grades.includes(q.id.slice("motor_".length) as AmaMotorGrade)
          : null,
      ])
  );
}

// A circumference task is one measurement site (thigh, calf, upper arm, forearm) and
// links only the atrophy bands measured at that landmark.
export const isAmaCircumferenceTask = (task: AmaExaminationTask) =>
  task.question_ids.every((id) => id.startsWith("atrophy"));

// Side-to-side difference in cm: above the lower bound, at most the upper bound.
const atrophyBands: Record<string, [number, number]> = {
  atrophy: [1, 1.5],
  atrophy_2: [1.5, 2],
  atrophy_3: [2, 3],
  atrophy_4: [3, Infinity],
};

// An atrophy band is met when any measured site linked to it falls in its range, and
// stays unresolved until a linked site is measured. Sites link only their own bands
// (L3 measures its >2 to ≤3 cm calf band at the lower patellar border).
export function amaAtrophyAnswers(
  row: AmaDiagnosticRow,
  atrophyCm: Record<string, number>,
): Record<string, boolean | null> {
  const sites = row.examination_tasks.filter(isAmaCircumferenceTask);
  return Object.fromEntries(
    row.questions
      .filter((q) => q.id in atrophyBands)
      .map((q) => {
        const [low, high] = atrophyBands[q.id];
        const measured = sites
          .filter((t) => t.question_ids.includes(q.id) && t.id in atrophyCm)
          .map((t) => atrophyCm[t.id]);
        return [q.id, measured.length ? measured.some((cm) => cm > low && cm <= high) : null];
      }),
  );
}

function ruleIdentity(rule: AmaRule): string {
  if ("field" in rule) return JSON.stringify([rule.field, rule.equals]);
  if ("all" in rule) return JSON.stringify(["all", rule.all.map(ruleIdentity)]);
  if ("any" in rule) return JSON.stringify(["any", rule.any.map(ruleIdentity)]);
  return JSON.stringify(["at_least", rule.at_least, rule.of.map(ruleIdentity)]);
}

export function normalizeAmaRegion(region: string): string {
  switch (region) {
    case "cervical":
      return "cervical_spine";
    case "thoracic":
      return "thoracic_spine";
    case "lumbar":
      return "lumbar_spine";
    default:
      return region;
  }
}

export const amaReferenceDataSchema = z
  .array(amaDiagnosticRowSchema)
  .min(1)
  .superRefine((rows, ctx) => {
    const rowIds = new Set<string>();
    const tasks = new Map<string, AmaExaminationTask>();
    rows.forEach((row, i) => {
      if (rowIds.has(row.row_id))
        ctx.addIssue({
          code: "custom",
          path: [i, "row_id"],
          message: "Duplicate row ID",
        });
      rowIds.add(row.row_id);
      row.examination_tasks.forEach((task, j) => {
        const previous = tasks.get(task.id);
        if (
          previous &&
          (previous.prompt !== task.prompt || previous.help !== task.help)
        ) {
          ctx.addIssue({
            code: "custom",
            path: [i, "examination_tasks", j],
            message: `Conflicting shared task: ${task.id}`,
          });
        }
        tasks.set(task.id, task);
      });
    });
  });

// POST /cases/:caseId/ama-candidates/:region. affectedRoots null = unknown
// (keep every mapped root row, provisionally); [] = explicitly no affected roots.
export const amaCandidatesRequestSchema = z.object({
  diagnoses: z
    .array(
      z.object({
        canonicalDx: z.string().min(1),
        affectedRoots: z.array(amaNerveRootSchema).nullable().default(null),
      })
    )
    .refine(
      (diagnoses) =>
        new Set(diagnoses.map((d) => d.canonicalDx)).size === diagnoses.length,
      "Duplicate diagnosis"
    ),
});
export type AmaCandidatesRequest = z.infer<typeof amaCandidatesRequestSchema>;

// mappedRowIds empty = "No mapped AMA row" (not 0%); candidateRowIds is what
// survives the region and root filters. rows holds each candidate once.
export type AmaCandidatesResponse = {
  diagnoses: {
    canonicalDx: string;
    affectedRoots: string[] | null;
    mappedRowIds: string[];
    candidateRowIds: string[];
    candidateTableIds: string[];
  }[];
  rows: AmaDiagnosticRow[];
  ratingTables: import("./amaRatingTables.js").AmaRatingTable[];
};
