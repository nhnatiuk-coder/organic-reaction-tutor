// Client-safe question data. NEVER put answer structures or keys in this file.
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
];

export const getQuestion = (id: string) => QUESTIONS.find((q) => q.id === id);
