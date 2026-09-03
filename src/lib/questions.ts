// Client-safe question data. NEVER put answer structures or keys in this file.
import { DISABLED_QUESTION_IDS } from "./question-settings";
export type Question = {
  id: string;
  mechanism: "SN1" | "SN2" | "E1" | "E2";
  /** "text" = written prompt only. "scheme" = rendered reaction scheme. */
  format: "text" | "scheme";
  title: string;
  substrate: string;
  reagents: string;
  conditions: string;
  prompt: string;
  stereochemistryMatters: boolean;
  /** SMILES of the starting material — only used to draw scheme questions. */
  substrateSmiles?: string;
};

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    mechanism: "SN2",
    format: "text",
    title: "Primary halide with a strong nucleophile",
    substrate: "1-bromobutane",
    reagents: "NaCN",
    conditions: "DMSO, 25 °C",
    prompt:
      "Draw the major organic product. Ignore inorganic by-products (NaBr) — draw only the organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q2",
    mechanism: "SN1",
    format: "text",
    title: "Tertiary halide solvolysis",
    substrate: "2-bromo-2-methylpropane (tert-butyl bromide)",
    reagents: "excess CH₃CH₂OH (solvent)",
    conditions: "25 °C, no added base",
    prompt: "Draw the major organic substitution product of this solvolysis.",
    stereochemistryMatters: false,
  },
  {
    id: "q3",
    mechanism: "E2",
    format: "text",
    title: "Bulky base selectivity",
    substrate: "2-bromo-2-methylbutane",
    reagents: "potassium tert-butoxide (KOC(CH₃)₃)",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the major alkene product. Think carefully about which β-hydrogen a bulky base removes.",
    stereochemistryMatters: false,
  },
  {
    id: "q4",
    mechanism: "E1",
    format: "text",
    title: "Acid-catalysed dehydration",
    substrate: "2-methylcyclohexan-1-ol",
    reagents: "concentrated H₂SO₄",
    conditions: "heat (distil product)",
    prompt: "Draw the major alkene product of this dehydration.",
    stereochemistryMatters: false,
  },
  {
    id: "q5",
    mechanism: "SN2",
    format: "text",
    title: "Stereochemistry at the reacting carbon",
    substrate: "(S)-2-bromobutane",
    reagents: "NaOH",
    conditions: "DMSO, 50 °C",
    prompt:
      "Draw the major organic product including stereochemistry. Use wedge/dash bonds — this question is graded on configuration as well as connectivity.",
    stereochemistryMatters: true,
  },
  {
    id: "q6",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary halide with an alkoxide",
    substrate: "1-bromopropane",
    substrateSmiles: "CCCBr",
    reagents: "NaOCH\u2083",
    conditions: "CH\u2083OH, 50 \u00b0C",
    prompt:
      "Read the scheme and draw the major organic product in the editor. Ignore NaBr.",
    stereochemistryMatters: false,
  },
  {
    id: "q7",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary halide in aqueous acetone",
    substrate: "1-bromo-1-methylcyclohexane",
    substrateSmiles: "CC1(Br)CCCCC1",
    reagents: "H\u2082O",
    conditions: "acetone, 25 \u00b0C",
    prompt: "Draw the major organic substitution product of this solvolysis.",
    stereochemistryMatters: false,
  },
  {
    id: "q8",
    mechanism: "E1",
    format: "scheme",
    title: "Acid-catalysed dehydration of a tertiary alcohol",
    substrate: "2-methylbutan-2-ol",
    substrateSmiles: "CCC(C)(C)O",
    reagents: "concentrated H\u2082SO\u2084",
    conditions: "heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q9",
    mechanism: "E2",
    format: "scheme",
    title: "E2 with a small strong base (Zaitsev)",
    substrate: "2-bromopentane",
    substrateSmiles: "CCCC(C)Br",
    reagents: "NaOCH\u2082CH\u2083",
    conditions: "CH\u2083CH\u2082OH, heat",
    prompt:
      "Draw the major alkene product. Either geometric isomer is accepted \u2014 focus on which alkene forms.",
    stereochemistryMatters: false,
  },
  {
    id: "q10",
    mechanism: "E2",
    format: "scheme",
    title: "E2 with a bulky base (Hofmann)",
    substrate: "2-bromohexane",
    substrateSmiles: "CCCCC(C)Br",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the major alkene product. Compare carefully with the Zaitsev case.",
    stereochemistryMatters: false,
  },
];

/** Questions currently available to students. */
export const PRACTICE_QUESTIONS = QUESTIONS.filter(
  (question) => !DISABLED_QUESTION_IDS.has(question.id),
);

export const getQuestion = (id: string) => QUESTIONS.find((q) => q.id === id);

export const isQuestionActive = (id: string) =>
  PRACTICE_QUESTIONS.some((question) => question.id === id);
