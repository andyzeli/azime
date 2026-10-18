import { postExamInputSchema, type PostExamInput } from "@azime/contracts";
export type { PostExamInput } from "@azime/contracts";

// TODO: Finalize this prompt and the output field descriptions together.
export const postExamAnalysisSystemPrompt = `
Post-exam analysis prompt is not implemented.
`.trim();

export const buildPostExamAnalysisUserPrompt = (input: PostExamInput) =>
  JSON.stringify(postExamInputSchema.parse(input), null, 2);

//case context, scope, case summary, reviewed analysis, pdq, questionnaire, exam, findings, post-exam steers
