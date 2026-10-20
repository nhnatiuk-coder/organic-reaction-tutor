import type { Question } from "./questions";
import type { PracticeModeId } from "./practice-selection";

/** Public presentation metadata only; model structures remain on the server. */
const MIXED_SN1_GEOMETRY_IDS = new Set([
  "q74",
  "g-sn1-inter-10",
  "g-sn1-inter-11",
  "g-sn1-adv-12",
  "g-sn1-adv-15",
  "g-sn1-adv-19",
  "g-sn1-adv-20",
  "g-sn1-adv-21",
]);

export function questionForPracticeMode(
  question: Question,
  modeId: PracticeModeId,
): Question | null {
  if (modeId !== "mixed" || question.mechanism !== "SN1") return question;
  // Benzhydryl chloride has no beta hydrogen for ordinary E1 elimination.
  // It remains available in the dedicated SN1 bank.
  if (question.id === "q34") return null;
  return {
    ...question,
    mechanism: "SN1/E1",
    answerMode: "competition",
    alkeneGeometryMatters: MIXED_SN1_GEOMETRY_IDS.has(question.id),
    prompt:
      "Draw both organic products: the substitution product and a favored elimination product. Where more than one equally substituted alkene is possible, draw one of those alkenes. Include the more stable E/Z arrangement where applicable.",
  };
}
