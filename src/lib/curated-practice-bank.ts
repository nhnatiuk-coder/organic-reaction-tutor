/**
 * Instructor-selected student bank. Each mechanism filter contains exactly
 * 5 introductory, 10 intermediate, and 15 advanced questions. Competition
 * questions count in both relevant filters and appear once in mixed practice.
 * Unselected source questions and grading keys remain recoverable.
 */
export const CURATED_PRACTICE_BANK = {
  SN1: {
    introductory: [
      "g-sn1-intro-07",
      "g-sn1-intro-08",
      "g-sn1-intro-09",
      "g-sn1-intro-10",
      "g-sn1-intro-11",
    ],
    intermediate: [
      "q32",
      "q33",
      "q35",
      "q36",
      "q37",
      "q38",
      "q39",
      "g-sn1-inter-09",
      "g-sn1-inter-10",
      "g-sn1-inter-11",
    ],
    advanced: [
      "q34",
      "q72",
      "q73",
      "q74",
      "q78",
      "q79",
      "q80",
      "g-sn1-adv-11",
      "g-sn1-adv-12",
      "q89",
      "q90",
      "g-sn1-adv-15",
      "g-sn1-adv-19",
      "g-sn1-adv-20",
      "g-sn1-adv-21",
    ],
  },
  SN2: {
    introductory: ["q1", "q60", "q62", "q64", "q68"],
    intermediate: [
      "q6",
      "q16",
      "q17",
      "q27",
      "q28",
      "q61",
      "q65",
      "q66",
      "q69",
      "q71",
    ],
    advanced: [
      "q5",
      "q18",
      "q84",
      "q86",
      "q87",
      "q81",
      "q82",
      "q83",
      "g-sn2-adv-06",
      "g-sn2-adv-07",
      "g-sn2-adv-08",
      "g-sn2-adv-09",
      "g-sn2-adv-13",
      "g-sn2-adv-14",
      "g-sn2-adv-23",
    ],
  },
  E1: {
    introductory: [
      "g-e1-intro-13",
      "g-e1-intro-14",
      "g-e1-intro-15",
      "g-e1-intro-16",
      "g-e1-intro-17",
    ],
    intermediate: [
      "q4",
      "q41",
      "q42",
      "q43",
      "g-e1-intro-18",
      "g-e1-intro-19",
      "g-e1-intro-20",
      "g-e1-intro-21",
      "g-e1-intro-22",
      "g-e1-intro-23",
    ],
    advanced: [
      "q75",
      "q76",
      "q77",
      "q78",
      "q79",
      "q80",
      "q46",
      "g-e1-adv-31",
      "q89",
      "g-e1-inter-21",
      "g-e1-inter-22",
      "g-e1-inter-29",
      "q90",
      "g-e1-adv-23",
      "g-e1-adv-24",
    ],
  },
  E2: {
    introductory: [
      "g-e2-intro-19",
      "g-e2-intro-20",
      "g-e2-intro-21",
      "g-e2-intro-22",
      "g-e2-intro-23",
    ],
    intermediate: [
      "q3",
      "q9",
      "q10",
      "q52",
      "q53",
      "g-e2-inter-21",
      "g-e2-inter-22",
      "g-e2-inter-26",
      "g-e2-inter-27",
      "g-e2-inter-28",
    ],
    advanced: [
      "q55",
      "q56",
      "q57",
      "q58",
      "q59",
      "q81",
      "q82",
      "q83",
      "g-e2-adv-23",
      "g-e2-adv-24",
      "g-e2-adv-25",
      "g-e2-adv-26",
      "g-e2-adv-27",
      "g-e2-adv-41",
      "g-e2-adv-42",
    ],
  },
} as const;

export type CuratedDifficulty = "introductory" | "intermediate" | "advanced";

export const CURATED_QUESTION_LEVELS = new Map<string, CuratedDifficulty>();
for (const levels of Object.values(CURATED_PRACTICE_BANK)) {
  for (const [level, ids] of Object.entries(levels)) {
    for (const id of ids) {
      const previous = CURATED_QUESTION_LEVELS.get(id);
      if (previous && previous !== level) {
        throw new Error(`Conflicting curated difficulty for ${id}`);
      }
      CURATED_QUESTION_LEVELS.set(id, level as CuratedDifficulty);
    }
  }
}
