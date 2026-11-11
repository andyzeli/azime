import { useMutationState } from "@tanstack/react-query";
import { supportedRegions, type Region } from "@azime/contracts";

// AI passes run as mutations keyed by case, so the case shell can show a pass is running
// on every tab, even after the tab that started it is closed.
export type AiPass = "summary" | "preExam" | "refined" | "postExam" | "report";

export const aiMutationKey = (caseId: string, pass: AiPass, region?: Region) =>
  ["ai", caseId, pass, region ?? null] as const;

const passText: Record<AiPass, { name: string; wait: string }> = {
  summary: {
    name: "The case summary is generating",
    wait: "Please wait before running analysis; it reads the summary.",
  },
  preExam: {
    name: "Treatment analysis is running",
    wait: "Please wait before changing diagnoses or the treatment review; edits made now may require running analysis again.",
  },
  refined: {
    name: "The prep sheet is updating",
    wait: "Please wait before changing diagnoses or the treatment review; edits made now may leave the prep sheet out of date.",
  },
  postExam: {
    name: "Post-exam analysis is running",
    wait: "Please wait before changing the visit, diagnoses or the treatment review; edits made now may require running it again.",
  },
  report: {
    name: "The report draft is being written",
    wait: "Please wait before making changes; edits made now will leave the draft out of date.",
  },
};

const regionLabel = (region: Region) =>
  supportedRegions.find(({ value }) => value === region)?.label ?? region;

// One message per running pass, e.g. "Treatment analysis is running (Lumbar spine). Please wait…"
export function useRunningAiPasses(caseId: string) {
  const keys = useMutationState({
    filters: { mutationKey: ["ai", caseId], status: "pending" },
    select: (m) => m.options.mutationKey as ReturnType<typeof aiMutationKey>,
  });
  const passes = [...new Set(keys.map(([, , pass]) => pass))];
  return passes.map((pass) => {
    const regions = [
      ...new Set(keys.flatMap(([, , p, r]) => (p === pass && r ? [r] : []))),
    ];
    const where = regions.length ? ` (${regions.map(regionLabel).join(", ")})` : "";
    return `${passText[pass].name}${where}. ${passText[pass].wait}`;
  });
}
