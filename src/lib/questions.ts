// Client-safe question data. NEVER put answer structures or keys in this file.
import { DISABLED_QUESTION_IDS } from "./question-settings";
import { GENERATED_QUESTIONS } from "./expanded-practice-bank.generated";
import { CURATED_QUESTION_LEVELS } from "./curated-practice-bank";
import { getSn1Nucleophile, sn1SolvolysisConditions } from "./sn1-nucleophiles";

export type ElementaryMechanism = "SN1" | "SN2" | "E1" | "E2";
export type QuestionMechanism = ElementaryMechanism | "SN1/E1" | "SN2/E2";
export type DifficultyLevel = "introductory" | "intermediate" | "advanced";

export type Question = {
  id: string;
  /** Carbon skeleton identifier. Each active skeleton appears only once. */
  skeletonId: string;
  mechanism: QuestionMechanism;
  /** Instructor-defined level used by the student practice filter. */
  difficulty?: DifficultyLevel;
  /** Competition questions require one substitution and one elimination product. */
  answerMode?: "single" | "competition";
  /** "text" = written prompt only. "scheme" = rendered reaction scheme. */
  format: "text" | "scheme";
  title: string;
  substrate: string;
  reagents: string;
  conditions: string;
  prompt: string;
  stereochemistryMatters: boolean;
  /** Optional instructor-supplied conformational constraint for stereospecific E2 practice. */
  conformationalHint?: string;
  /** SMILES of the starting material — only used to draw scheme questions. */
  substrateSmiles?: string;
};

/** Elementary pathways represented by a question, used for student practice filters. */
export function getQuestionMechanisms(
  question: Question,
): readonly ElementaryMechanism[] {
  if (question.mechanism === "SN1/E1") return ["SN1", "E1"];
  if (question.mechanism === "SN2/E2") return ["SN2", "E2"];
  return [question.mechanism];
}

/** Shown only when a student requests the optional reaction-type hint. */
export function getMechanismRevealLabel(question: Question) {
  if (question.mechanism === "SN1/E1") return "SN1 and E1";
  if (question.mechanism === "SN2/E2") return "SN2 and E2";
  return question.mechanism;
}

/**
 * Difficulty is based on the reasoning the question requires, rather than on
 * its mechanism name. This keeps each topic available at more than one level.
 */
export function getQuestionDifficulty(question: Question): DifficultyLevel {
  const curatedLevel = CURATED_QUESTION_LEVELS.get(question.id);
  if (curatedLevel) return curatedLevel;
  if (question.difficulty) return question.difficulty;

  const description = [question.title, question.prompt, question.substrate]
    .join(" ")
    .toLowerCase();

  if (
    question.answerMode === "competition" ||
    question.stereochemistryMatters ||
    question.conformationalHint ||
    /rearrang|hydride shift|neopentyl|diarylmethyl|gem-dialkyl|quaternary/.test(
      description,
    )
  ) {
    return "advanced";
  }

  if (
    question.mechanism === "E2" ||
    /bulky|zaitsev|hofmann|branched|benzylic|allylic|alkenyl|tosylate|cyclo/.test(
      description,
    )
  ) {
    return "intermediate";
  }

  return "introductory";
}

const CORE_QUESTIONS: Question[] = [
  {
    id: "q1",
    skeletonId: "butane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary halide with a strong nucleophile",
    substrate: "1-bromobutane",
    substrateSmiles: "CCCCBr",
    reagents: "NaCN",
    conditions: "DMSO, 25 °C",
    prompt:
      "Draw the major organic product. Ignore inorganic by-products (NaBr) — draw only the organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q2",
    skeletonId: "2-methylpropane",
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
    skeletonId: "2-methylbutane",
    mechanism: "E2",
    format: "scheme",
    title: "Bulky base selectivity",
    substrate: "2-bromo-2-methylbutane",
    substrateSmiles: "CCC(C)(C)Br",
    reagents: "potassium tert-butoxide (KOC(CH₃)₃)",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the major alkene product. Think carefully about which β-hydrogen a bulky base removes.",
    stereochemistryMatters: false,
  },
  {
    id: "q4",
    skeletonId: "methylcyclohexane",
    mechanism: "E1",
    format: "scheme",
    title: "Acid-catalysed dehydration",
    substrate: "2-methylcyclohexan-1-ol",
    substrateSmiles: "OC1C(C)CCCC1",
    reagents: "concentrated H₂SO₄",
    conditions: "heat (distil product)",
    prompt: "Draw the major alkene product of this dehydration.",
    stereochemistryMatters: false,
  },
  {
    id: "q5",
    skeletonId: "butane",
    mechanism: "SN2",
    format: "scheme",
    title: "Stereochemistry at the reacting carbon",
    substrate: "(S)-2-bromobutane",
    substrateSmiles: "C[C@H](Br)CC",
    reagents: "NaOH",
    conditions: "DMSO, 50 °C",
    prompt:
      "Draw the major organic product including stereochemistry. Use wedge/dash bonds — this question is graded on configuration as well as connectivity.",
    stereochemistryMatters: true,
  },
  {
    id: "q6",
    skeletonId: "propane",
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
    skeletonId: "methylcyclohexane",
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
    skeletonId: "2-methylbutane",
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
    skeletonId: "pentane",
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
    skeletonId: "hexane",
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

const EXPANDED_QUESTIONS: Question[] = [
  {
    id: "q11",
    skeletonId: "ethane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary bromide with hydroxide",
    substrate: "bromoethane",
    substrateSmiles: "CCBr",
    reagents: "NaOH",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q12",
    skeletonId: "heptane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary bromide with cyanide",
    substrate: "1-bromoheptane",
    substrateSmiles: "CCCCCCCBr",
    reagents: "NaCN",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q13",
    skeletonId: "octane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary bromide with an alkoxide",
    substrate: "1-bromooctane",
    substrateSmiles: "CCCCCCCCBr",
    reagents: "NaOCH₃",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q14",
    skeletonId: "nonane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary bromide with hydrosulfide",
    substrate: "1-bromononane",
    substrateSmiles: "CCCCCCCCCBr",
    reagents: "NaSH",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q15",
    skeletonId: "decane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary bromide with cyanide",
    substrate: "1-bromodecane",
    substrateSmiles: "CCCCCCCCCCBr",
    reagents: "NaCN",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q16",
    skeletonId: "2-methylpentane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide substitution",
    substrate: "1-bromo-2-methylpentane",
    substrateSmiles: "BrCC(C)CCC",
    reagents: "NaOH",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q17",
    skeletonId: "3-methylpentane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide ether formation",
    substrate: "1-bromo-3-methylpentane",
    substrateSmiles: "BrCCC(C)CC",
    reagents: "NaOCH₂CH₃",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q18",
    skeletonId: "2,2-dimethylbutane",
    mechanism: "SN2",
    format: "scheme",
    title: "Neopentyl-like primary bromide with cyanide",
    substrate: "1-bromo-2,2-dimethylbutane",
    substrateSmiles: "BrCC(C)(C)CC",
    reagents: "NaCN",
    conditions: "DMF, heat",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q19",
    skeletonId: "2,3-dimethylbutane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide with methoxide",
    substrate: "1-bromo-2,3-dimethylbutane",
    substrateSmiles: "BrCC(C)C(C)C",
    reagents: "NaOCH₃",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q20",
    skeletonId: "2-methylhexane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide with cyanide",
    substrate: "1-bromo-2-methylhexane",
    substrateSmiles: "BrCC(C)CCCC",
    reagents: "NaCN",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q21",
    skeletonId: "3-methylhexane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide with hydroxide",
    substrate: "1-bromo-3-methylhexane",
    substrateSmiles: "BrCCC(C)CCC",
    reagents: "NaOH",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q22",
    skeletonId: "2,2-dimethylpentane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide with cyanide",
    substrate: "1-bromo-2,2-dimethylpentane",
    substrateSmiles: "BrCC(C)(C)CCC",
    reagents: "NaCN",
    conditions: "DMF, heat",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q23",
    skeletonId: "2,3-dimethylpentane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide with methoxide",
    substrate: "1-bromo-2,3-dimethylpentane",
    substrateSmiles: "BrCC(C)C(C)CC",
    reagents: "NaOCH₃",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q24",
    skeletonId: "2,4-dimethylpentane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide with cyanide",
    substrate: "1-bromo-2,4-dimethylpentane",
    substrateSmiles: "BrCC(C)CC(C)C",
    reagents: "NaCN",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q25",
    skeletonId: "3,3-dimethylpentane",
    mechanism: "SN2",
    format: "scheme",
    title: "Branched primary bromide with methoxide",
    substrate: "1-bromo-3,3-dimethylpentane",
    substrateSmiles: "BrCCC(C)(C)CC",
    reagents: "NaOCH₃",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q26",
    skeletonId: "2,2,3-trimethylbutane",
    mechanism: "SN2",
    format: "scheme",
    title: "Highly branched primary bromide with cyanide",
    substrate: "1-bromo-2,2,3-trimethylbutane",
    substrateSmiles: "BrCC(C)(C)C(C)C",
    reagents: "NaCN",
    conditions: "DMF, heat",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q27",
    skeletonId: "toluene",
    mechanism: "SN2",
    format: "scheme",
    title: "Benzylic bromide ether formation",
    substrate: "benzyl bromide",
    substrateSmiles: "BrCc1ccccc1",
    reagents: "NaOCH₃",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q28",
    skeletonId: "propene",
    mechanism: "SN2",
    format: "scheme",
    title: "Allylic bromide with cyanide",
    substrate: "3-bromoprop-1-ene",
    substrateSmiles: "C=CCBr",
    reagents: "NaCN",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q29",
    skeletonId: "but-1-ene",
    mechanism: "SN2",
    format: "scheme",
    title: "Alkenyl primary bromide ether formation",
    substrate: "4-bromobut-1-ene",
    substrateSmiles: "C=CCCBr",
    reagents: "NaOCH₃",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q30",
    skeletonId: "pent-1-ene",
    mechanism: "SN2",
    format: "scheme",
    title: "Alkenyl primary bromide with cyanide",
    substrate: "5-bromopent-1-ene",
    substrateSmiles: "C=CCCCBr",
    reagents: "NaCN",
    conditions: "DMF, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q31",
    skeletonId: "hex-1-ene",
    mechanism: "SN2",
    format: "scheme",
    title: "Alkenyl primary bromide with hydroxide",
    substrate: "6-bromohex-1-ene",
    substrateSmiles: "C=CCCCCBr",
    reagents: "NaOH",
    conditions: "DMSO, 25 °C",
    prompt: "Draw the major organic product.",
    stereochemistryMatters: false,
  },
  {
    id: "q32",
    skeletonId: "ethylbenzene",
    mechanism: "SN1",
    format: "scheme",
    title: "Benzylic bromide hydrolysis",
    substrate: "1-bromo-1-phenylethane",
    substrateSmiles: "CC(Br)c1ccccc1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q33",
    skeletonId: "isopropylbenzene",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary benzylic bromide hydrolysis",
    substrate: "2-bromo-2-phenylpropane",
    substrateSmiles: "CC(C)(Br)c1ccccc1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q34",
    skeletonId: "diphenylmethane",
    mechanism: "SN1",
    format: "scheme",
    title: "Diarylmethyl chloride hydrolysis",
    substrate: "benzhydryl chloride",
    substrateSmiles: "ClC(c1ccccc1)c1ccccc1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q35",
    skeletonId: "methylcyclopentane",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary cyclopentyl bromide hydrolysis",
    substrate: "1-bromo-1-methylcyclopentane",
    substrateSmiles: "CC1(Br)CCCC1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q36",
    skeletonId: "ethylcyclohexane",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary cyclohexyl bromide hydrolysis",
    substrate: "1-bromo-1-ethylcyclohexane",
    substrateSmiles: "CCC1(Br)CCCCC1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q37",
    skeletonId: "phenylcyclohexane",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary arylcyclohexyl bromide hydrolysis",
    substrate: "1-bromo-1-phenylcyclohexane",
    substrateSmiles: "BrC1(c2ccccc2)CCCCC1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q38",
    skeletonId: "ethylcyclopentane",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary cyclopentyl bromide hydrolysis",
    substrate: "1-bromo-1-ethylcyclopentane",
    substrateSmiles: "CCC1(Br)CCCC1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q39",
    skeletonId: "propylcyclopentane",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary cyclopentyl bromide hydrolysis",
    substrate: "1-bromo-1-propylcyclopentane",
    substrateSmiles: "CCCC1(Br)CCCC1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q40",
    skeletonId: "isopropylcyclopentane",
    mechanism: "SN1",
    format: "scheme",
    title: "Tertiary cyclopentyl bromide hydrolysis",
    substrate: "1-bromo-1-isopropylcyclopentane",
    substrateSmiles: "CC(C)C1(Br)CCCC1",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product.",
    stereochemistryMatters: false,
  },
  {
    id: "q41",
    skeletonId: "cyclohexane",
    mechanism: "E1",
    format: "scheme",
    title: "Cyclohexanol dehydration",
    substrate: "cyclohexanol",
    substrateSmiles: "OC1CCCCC1",
    reagents: "H₂SO₄",
    conditions: "heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q42",
    skeletonId: "cycloheptane",
    mechanism: "E1",
    format: "scheme",
    title: "Cycloheptanol dehydration",
    substrate: "cycloheptanol",
    substrateSmiles: "OC1CCCCCC1",
    reagents: "H₂SO₄",
    conditions: "heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q43",
    skeletonId: "cyclobutane",
    mechanism: "E1",
    format: "scheme",
    title: "Cyclobutanol dehydration",
    substrate: "cyclobutanol",
    substrateSmiles: "OC1CCC1",
    reagents: "H₂SO₄",
    conditions: "heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q44",
    skeletonId: "propylcyclohexane",
    mechanism: "E1",
    format: "scheme",
    title: "Alkylcyclohexanol dehydration",
    substrate: "1-propylcyclohexan-1-ol",
    substrateSmiles: "CCCC1(O)CCCCC1",
    reagents: "H₂SO₄",
    conditions: "heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q45",
    skeletonId: "isopropylcyclohexane",
    mechanism: "E1",
    format: "scheme",
    title: "Branched alkylcyclohexanol dehydration",
    substrate: "1-isopropylcyclohexan-1-ol",
    substrateSmiles: "CC(C)C1(O)CCCCC1",
    reagents: "H₃PO₄",
    conditions: "heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q46",
    skeletonId: "tert-butylcyclohexane",
    mechanism: "E1",
    format: "scheme",
    title: "Tert-butylcyclohexanol dehydration",
    substrate: "1-tert-butylcyclohexan-1-ol",
    substrateSmiles: "CC(C)(C)C1(O)CCCCC1",
    reagents: "H₂SO₄",
    conditions: "heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q47",
    skeletonId: "undecane",
    mechanism: "E2",
    format: "scheme",
    title: "Secondary bromide with a small strong base",
    substrate: "2-bromoundecane",
    substrateSmiles: "CCCCCCCCCC(C)Br",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q48",
    skeletonId: "dodecane",
    mechanism: "E2",
    format: "scheme",
    title: "Secondary bromide with a bulky base",
    substrate: "2-bromododecane",
    substrateSmiles: "CCCCCCCCCCC(C)Br",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q49",
    skeletonId: "methylcyclobutane",
    mechanism: "E2",
    format: "scheme",
    title: "Tertiary cyclobutyl bromide with a bulky base",
    substrate: "1-bromo-1-methylcyclobutane",
    substrateSmiles: "CC1(Br)CCC1",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q50",
    skeletonId: "ethylcyclobutane",
    mechanism: "E2",
    format: "scheme",
    title: "Tertiary cyclobutyl bromide with a bulky base",
    substrate: "1-bromo-1-ethylcyclobutane",
    substrateSmiles: "CCC1(Br)CCC1",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q51",
    skeletonId: "methylcycloheptane",
    mechanism: "E2",
    format: "scheme",
    title: "Tertiary cycloheptyl bromide with a bulky base",
    substrate: "1-bromo-1-methylcycloheptane",
    substrateSmiles: "CC1(Br)CCCCCC1",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q52",
    skeletonId: "cyclopentane",
    mechanism: "E2",
    format: "scheme",
    title: "Secondary cyclopentyl bromide with base",
    substrate: "bromocyclopentane",
    substrateSmiles: "BrC1CCCC1",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q53",
    skeletonId: "cyclooctane",
    mechanism: "E2",
    format: "scheme",
    title: "Secondary cyclooctyl bromide with base",
    substrate: "bromocyclooctane",
    substrateSmiles: "BrC1CCCCCCC1",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q54",
    skeletonId: "methylcyclooctane",
    mechanism: "E2",
    format: "scheme",
    title: "Tertiary cyclooctyl bromide with a bulky base",
    substrate: "1-bromo-1-methylcyclooctane",
    substrateSmiles: "CC1(Br)CCCCCCC1",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt: "Draw the major alkene product.",
    stereochemistryMatters: false,
  },
  {
    id: "q55",
    skeletonId: "2,2-dimethylcyclohexane",
    mechanism: "E2",
    format: "scheme",
    title: "Conformationally constrained cyclohexane elimination",
    substrate: "1-bromo-2,2-dimethylcyclohexane",
    substrateSmiles: "BrC1C(C)(C)CCCC1",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the single alkene allowed by the anti-periplanar β-hydrogen in the supplied conformer.",
    stereochemistryMatters: false,
    conformationalHint:
      "Use the locked chair conformer: Br at C1 is axial, and C2 has no β-hydrogen. The only anti-periplanar β-hydrogen is axial at C6.",
  },
  {
    id: "q56",
    skeletonId: "2,2-dimethylcyclopentane",
    mechanism: "E2",
    format: "scheme",
    title: "Conformationally constrained cyclopentane elimination",
    substrate: "1-bromo-2,2-dimethylcyclopentane",
    substrateSmiles: "BrC1C(C)(C)CCC1",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the alkene formed by anti-periplanar elimination. Only one β-carbon bears an available hydrogen.",
    stereochemistryMatters: false,
    conformationalHint:
      "The conformer shown is locked for this exercise: the β-carbon bearing the two methyl groups has no hydrogen. Remove the β-hydrogen anti to C–Br.",
  },
  {
    id: "q57",
    skeletonId: "2,2-dimethylcycloheptane",
    mechanism: "E2",
    format: "scheme",
    title: "Conformationally constrained cycloheptane elimination",
    substrate: "1-bromo-2,2-dimethylcycloheptane",
    substrateSmiles: "BrC1C(C)(C)CCCCCC1",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the single alkene permitted by the anti-periplanar β-hydrogen in the supplied conformer.",
    stereochemistryMatters: false,
    conformationalHint:
      "Use the locked conformer: the gem-dimethyl β-carbon has no hydrogen, leaving one anti-periplanar β-hydrogen available for elimination.",
  },
  {
    id: "q58",
    skeletonId: "tert-butyl-phenyl-methyl-alkene",
    mechanism: "E2",
    format: "scheme",
    title: "Acyclic stereospecific elimination (E product)",
    substrate: "(1R,2R)-1-bromo-1-tert-butyl-2-methyl-2-phenylethane",
    substrateSmiles: "CC(C)(C)[C@H](Br)[C@H](C)c1ccccc1",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, heat",
    prompt:
      "Draw the alkene, including its E/Z stereochemistry. The reactive conformation permits only one product geometry.",
    stereochemistryMatters: true,
    conformationalHint:
      "Use the supplied reactive staggered conformation: Br and the only β-hydrogen are anti-periplanar. The tert-butyl group and phenyl group are on opposite sides of the forming double bond.",
  },
  {
    id: "q59",
    skeletonId: "tert-butyl-phenyl-ethyl-alkene",
    mechanism: "E2",
    format: "scheme",
    title: "Acyclic stereospecific elimination (Z product)",
    substrate: "(1R,2S)-1-bromo-1-tert-butyl-2-ethyl-2-phenylethane",
    substrateSmiles: "CC(C)(C)[C@H](Br)[C@H](CC)c1ccccc1",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, heat",
    prompt:
      "Draw the alkene, including its E/Z stereochemistry. The reactive conformation permits only one product geometry.",
    stereochemistryMatters: true,
    conformationalHint:
      "Use the supplied reactive staggered conformation: Br and the only β-hydrogen are anti-periplanar. The tert-butyl group and phenyl group are on the same side of the forming double bond.",
  },
  {
    id: "q60",
    skeletonId: "4-methylheptane",
    mechanism: "SN2",
    format: "scheme",
    title: "Finkelstein halogen exchange",
    substrate: "1-bromo-4-methylheptane",
    substrateSmiles: "BrCCCC(C)CCC",
    reagents: "NaI",
    conditions: "acetone, 25 °C",
    prompt:
      "Draw the organic product of this halogen-exchange reaction. Replace the leaving group; do not draw NaBr.",
    stereochemistryMatters: false,
  },
  {
    id: "q61",
    skeletonId: "methylcyclopropane",
    mechanism: "SN2",
    format: "scheme",
    title: "Finkelstein exchange on a cyclopropylmethyl halide",
    substrate: "bromomethylcyclopropane",
    substrateSmiles: "BrCC1CC1",
    reagents: "NaI",
    conditions: "acetone, 25 °C",
    prompt:
      "Draw the product of the halide exchange. The carbon skeleton remains unchanged.",
    stereochemistryMatters: false,
  },
  {
    id: "q62",
    skeletonId: "3-ethylhexane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary bromide with ammonia",
    substrate: "1-bromo-3-ethylhexane",
    substrateSmiles: "BrCCC(CC)CCC",
    reagents: "NH₃ (excess)",
    conditions: "ethanol, 50 °C",
    prompt:
      "Draw the major organic product. Assume excess ammonia is used to favour the primary amine rather than further alkylation.",
    stereochemistryMatters: false,
  },
  {
    id: "q63",
    skeletonId: "butylcyclohexane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary bromide with ammonia beside a ring",
    substrate: "4-bromobutylcyclohexane",
    substrateSmiles: "BrCCCCC1CCCCC1",
    reagents: "NH₃ (excess)",
    conditions: "ethanol, 50 °C",
    prompt:
      "Draw the major organic product. Treat ammonia as the nucleophile and draw the neutral amine product.",
    stereochemistryMatters: false,
  },
  {
    id: "q64",
    skeletonId: "3-methoxypropane",
    mechanism: "SN2",
    format: "scheme",
    title: "Azide substitution on a primary bromide",
    substrate: "1-bromo-3-methoxypropane",
    substrateSmiles: "COCCCBr",
    reagents: "NaN₃",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product of this azide substitution. Show the azide group as part of the product structure.",
    stereochemistryMatters: false,
  },
  {
    id: "q65",
    skeletonId: "4-tert-butylmethylbenzene",
    mechanism: "SN2",
    format: "scheme",
    title: "Azide substitution at a benzylic carbon",
    substrate: "4-tert-butylbenzyl bromide",
    substrateSmiles: "CC(C)(C)c1ccc(CBr)cc1",
    reagents: "NaN₃",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product. Azide replaces bromide at the benzylic carbon.",
    stereochemistryMatters: false,
  },
  {
    id: "q66",
    skeletonId: "4-ethylhexane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary iodide with an alkoxide",
    substrate: "4-ethyl-1-iodohexane",
    substrateSmiles: "ICCCC(CC)CC",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, 25 °C",
    prompt:
      "Draw the major organic product. Iodide is the leaving group; ethoxide becomes part of the product.",
    stereochemistryMatters: false,
  },
  {
    id: "q67",
    skeletonId: "propylbenzene",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary iodide with cyanide",
    substrate: "3-iodopropylbenzene",
    substrateSmiles: "ICCCc1ccccc1",
    reagents: "NaCN",
    conditions: "DMSO, 25 °C",
    prompt:
      "Draw the major organic product. Cyanide attacks through carbon, extending the carbon chain by one carbon.",
    stereochemistryMatters: false,
  },
  {
    id: "q68",
    skeletonId: "2-methoxyethane",
    mechanism: "SN2",
    format: "scheme",
    title: "Primary iodide with azide",
    substrate: "1-iodo-2-methoxyethane",
    substrateSmiles: "COCCI",
    reagents: "NaN₃",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product. Iodide leaves and azide becomes the new substituent.",
    stereochemistryMatters: false,
  },
  {
    id: "q69",
    skeletonId: "ethylcyclopropane",
    mechanism: "SN2",
    format: "scheme",
    title: "Tosylate with cyanide",
    substrate: "2-cyclopropylethyl tosylate (OTs)",
    substrateSmiles: "O=S(=O)(c1ccc(C)cc1)OCCC1CC1",
    reagents: "NaCN",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product. The tosylate group is the leaving group; do not include it in the product.",
    stereochemistryMatters: false,
  },
  {
    id: "q70",
    skeletonId: "butylcyclopentane",
    mechanism: "SN2",
    format: "scheme",
    title: "Tosylate with azide",
    substrate: "4-cyclopentylbutyl tosylate (OTs)",
    substrateSmiles: "O=S(=O)(c1ccc(C)cc1)OCCCCC1CCCC1",
    reagents: "NaN₃",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product. Replace the tosylate leaving group with azide.",
    stereochemistryMatters: false,
  },
  {
    id: "q71",
    skeletonId: "pentylbenzene",
    mechanism: "SN2",
    format: "scheme",
    title: "Tosylate with ammonia",
    substrate: "5-phenylpentyl tosylate (OTs)",
    substrateSmiles: "O=S(=O)(c1ccc(C)cc1)OCCCCCc1ccccc1",
    reagents: "NH₃ (excess)",
    conditions: "ethanol, 50 °C",
    prompt:
      "Draw the major organic product. Assume excess ammonia gives the primary amine rather than further alkylation.",
    stereochemistryMatters: false,
  },
  {
    id: "q72",
    skeletonId: "2-methylheptane",
    mechanism: "SN1",
    format: "scheme",
    title: "Branched secondary bromide in water",
    substrate: "3-bromo-2-methylheptane",
    substrateSmiles: "CC(C)C(Br)CCCC",
    reagents: "H₂O",
    conditions: "aqueous acetone, AgNO₃, 25 °C",
    prompt:
      "Draw the major organic product. Consider whether the carbocation can rearrange before water attacks.",
    stereochemistryMatters: false,
  },
  {
    id: "q73",
    skeletonId: "2,2-dimethylhexane",
    mechanism: "SN1",
    format: "scheme",
    title: "Branched secondary bromide beside a quaternary carbon",
    substrate: "3-bromo-2,2-dimethylhexane",
    substrateSmiles: "CC(C)(C)C(Br)CCC",
    reagents: "H₂O",
    conditions: "aqueous acetone, AgNO₃, 25 °C",
    prompt:
      "Draw the major organic product. Consider whether the carbocation can rearrange before water attacks.",
    stereochemistryMatters: false,
  },
  {
    id: "q74",
    skeletonId: "3-methylheptane",
    mechanism: "SN1",
    format: "scheme",
    title: "Secondary bromide beside a more substituted carbon",
    substrate: "2-bromo-3-methylheptane",
    substrateSmiles: "CC(Br)C(C)CCCC",
    reagents: "H₂O",
    conditions: "aqueous acetone, AgNO₃, 25 °C",
    prompt:
      "Draw the major organic product. Consider whether the carbocation can rearrange before water attacks.",
    stereochemistryMatters: false,
  },
  {
    id: "q75",
    skeletonId: "3,3-dimethylhexane",
    mechanism: "E1",
    format: "scheme",
    title: "Branched alcohol dehydration",
    substrate: "3,3-dimethylhexan-2-ol",
    substrateSmiles: "CC(O)C(C)(C)CCC",
    reagents: "concentrated H₂SO₄",
    conditions: "heat",
    prompt:
      "Draw the major alkene product. Consider whether the carbocation can rearrange after water leaves.",
    stereochemistryMatters: false,
  },
  {
    id: "q76",
    skeletonId: "3,4-dimethylhexane",
    mechanism: "E1",
    format: "scheme",
    title: "Branched alcohol dehydration with a hydride shift",
    substrate: "3,4-dimethylhexan-2-ol",
    substrateSmiles: "CC(O)C(C)C(C)CC",
    reagents: "concentrated H₂SO₄",
    conditions: "heat",
    prompt:
      "Draw the major alkene product. Consider whether the carbocation can rearrange after water leaves.",
    stereochemistryMatters: false,
  },
  {
    id: "q77",
    skeletonId: "2,2-diethylcyclohexane",
    mechanism: "E1",
    format: "scheme",
    title: "Gem-dialkyl cyclohexanol dehydration",
    substrate: "2,2-diethylcyclohexan-1-ol",
    substrateSmiles: "OC1C(CC)(CC)CCCC1",
    reagents: "concentrated H₂SO₄",
    conditions: "heat",
    prompt:
      "Draw the major alkene product. Consider whether the carbocation can rearrange after water leaves.",
    stereochemistryMatters: false,
  },
  {
    id: "q78",
    skeletonId: "2-methyloctane",
    mechanism: "SN1/E1",
    answerMode: "competition",
    format: "scheme",
    title: "Tertiary bromide solvolysis",
    substrate: "2-bromo-2-methyloctane",
    substrateSmiles: "CC(Br)(C)CCCCCC",
    reagents: "H₂O",
    conditions: "aqueous ethanol, heat",
    prompt:
      "Draw both major organic products: the product from substitution and the major alkene from elimination.",
    stereochemistryMatters: false,
  },
  {
    id: "q79",
    skeletonId: "tert-butylcycloheptane",
    mechanism: "SN1/E1",
    answerMode: "competition",
    format: "scheme",
    title: "Tertiary cycloheptyl bromide solvolysis",
    substrate: "1-bromo-1-tert-butylcycloheptane",
    substrateSmiles: "CC(C)(C)C1(Br)CCCCCC1",
    reagents: "H₂O",
    conditions: "aqueous acetone, heat",
    prompt:
      "Draw both major organic products: the product from substitution and the major alkene from elimination.",
    stereochemistryMatters: false,
  },
  {
    id: "q80",
    skeletonId: "2-phenylbutane",
    mechanism: "SN1/E1",
    answerMode: "competition",
    format: "scheme",
    title: "Tertiary benzylic bromide solvolysis",
    substrate: "2-bromo-2-phenylbutane",
    substrateSmiles: "CC(Br)(c1ccccc1)CC",
    reagents: "H₂O",
    conditions: "aqueous acetone, heat",
    prompt:
      "Draw both major organic products: the product from substitution and the major alkene from elimination.",
    stereochemistryMatters: false,
  },
  {
    id: "q81",
    skeletonId: "4-methyloctane",
    mechanism: "SN2/E2",
    answerMode: "competition",
    format: "scheme",
    title: "Secondary bromide with a small alkoxide",
    substrate: "2-bromo-4-methyloctane",
    substrateSmiles: "CC(Br)CC(C)CCCC",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, heat",
    prompt:
      "Draw both major organic products: the product from substitution and the major alkene from elimination.",
    stereochemistryMatters: false,
  },
  {
    id: "q82",
    skeletonId: "cyclopentylcyclohexane",
    mechanism: "SN2/E2",
    answerMode: "competition",
    format: "scheme",
    title: "Secondary cyclohexyl bromide with methoxide",
    substrate: "1-bromo-2-cyclopentylcyclohexane",
    substrateSmiles: "BrC1C(C2CCCC2)CCCC1",
    reagents: "NaOCH₃",
    conditions: "DMSO, heat",
    prompt:
      "Draw both major organic products: the product from substitution and the major alkene from elimination.",
    stereochemistryMatters: false,
  },
  {
    id: "q83",
    skeletonId: "3-phenylbutane",
    mechanism: "SN2/E2",
    answerMode: "competition",
    format: "scheme",
    title: "Secondary bromide with ethoxide",
    substrate: "2-bromo-3-phenylbutane",
    substrateSmiles: "CC(Br)C(C)c1ccccc1",
    reagents: "NaOCH₂CH₃",
    conditions: "ethanol, heat",
    prompt:
      "Draw both major organic products: the product from substitution and the major alkene from elimination.",
    stereochemistryMatters: false,
  },
  {
    id: "q84",
    skeletonId: "5-methylheptane",
    mechanism: "SN2",
    format: "scheme",
    title: "Chiral secondary bromide with iodide",
    substrate: "2-bromo-5-methylheptane",
    substrateSmiles: "C[C@H](Br)CCC(C)CC",
    reagents: "NaI",
    conditions: "acetone, 50 °C",
    prompt:
      "Draw the major organic product, including stereochemistry. Use wedge/dash bonds — the configuration is graded as well as connectivity.",
    stereochemistryMatters: true,
  },
  {
    id: "q85",
    skeletonId: "6-methylnonane",
    mechanism: "SN2",
    format: "scheme",
    title: "Chiral secondary bromide with azide",
    substrate: "3-bromo-6-methylnonane",
    substrateSmiles: "CC[C@H](Br)CCC(C)CCC",
    reagents: "NaN₃",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product, including stereochemistry. Use wedge/dash bonds — the configuration is graded as well as connectivity.",
    stereochemistryMatters: true,
  },
  {
    id: "q86",
    skeletonId: "butylbenzene",
    mechanism: "SN2",
    format: "scheme",
    title: "Chiral benzylic bromide with cyanide",
    substrate: "2-bromo-1-phenylbutane",
    substrateSmiles: "c1ccccc1C[C@H](Br)CC",
    reagents: "NaCN",
    conditions: "DMSO, 25 °C",
    prompt:
      "Draw the major organic product, including stereochemistry. Use wedge/dash bonds — the configuration is graded as well as connectivity.",
    stereochemistryMatters: true,
  },
  {
    id: "q87",
    skeletonId: "4-ethylheptane",
    mechanism: "SN2",
    format: "scheme",
    title: "Chiral secondary bromide with thiophenoxide",
    substrate: "3-bromo-4-ethylheptane",
    substrateSmiles: "CC[C@H](Br)C(CC)CCC",
    reagents: "NaSC₆H₅",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product, including stereochemistry. Use wedge/dash bonds — the configuration is graded as well as connectivity.",
    stereochemistryMatters: true,
  },
  {
    id: "q88",
    skeletonId: "5-ethylnonane",
    mechanism: "SN2",
    format: "scheme",
    title: "Chiral secondary bromide with azide",
    substrate: "4-bromo-5-ethylnonane",
    substrateSmiles: "CCC[C@H](Br)C(CC)CCCC",
    reagents: "NaN₃",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product, including stereochemistry. Use wedge/dash bonds — the configuration is graded as well as connectivity.",
    stereochemistryMatters: true,
  },
];

export const QUESTIONS: Question[] = [
  ...CORE_QUESTIONS,
  ...EXPANDED_QUESTIONS,
  ...GENERATED_QUESTIONS,
].map((question) => {
  const nucleophile = getSn1Nucleophile(question.id);
  if (nucleophile) {
    question = {
      ...question,
      title: question.title
        .replace(/\bhydrolysis\b/gi, "solvolysis")
        .replace(/\bin (?:water|methanol)\b/gi, `in ${nucleophile.label}`),
      reagents: nucleophile.reagents,
      conditions: sn1SolvolysisConditions(nucleophile, question.conditions),
      prompt:
        question.answerMode === "competition"
          ? question.prompt
          : question.prompt
              .replace(
                /major organic (?:substitution )?product/g,
                "organic substitution product",
              )
              .replace(/water attacks/g, "the solvent attacks")
              .replace(
                /Methanol is the nucleophile and solvent\./g,
                "The displayed solvent is the nucleophile.",
              ),
    };
  }
  // Use the instructor's heat notation consistently in both the scheme and
  // conditions card, including generated and shared SN1/E1 questions.
  if (!getQuestionMechanisms(question).includes("SN1")) return question;
  return {
    ...question,
    conditions: question.conditions
      .replace(/\b\d+(?:\.\d+)?(?:\s*[–-]\s*\d+(?:\.\d+)?)?\s*°\s*C\b/g, "Δ")
      .replace(/\b(?:heat|reflux)\b/gi, "Δ"),
  };
});

/**
 * Permanent instructor/student references for questions. New questions should
 * always be appended to QUESTIONS so an existing reference never changes.
 */
const QUESTION_REFERENCES = new Map(
  QUESTIONS.map((question, index) => [
    question.id,
    `RXN-${String(index + 1).padStart(4, "0")}`,
  ]),
);

export const getQuestionReference = (question: Pick<Question, "id">) =>
  QUESTION_REFERENCES.get(question.id) ?? `RXN-${question.id.toUpperCase()}`;

/** The curated bank shared by the instructor preview and student practice.
 * Explicit curation retains inversion and competition questions even when a
 * different reaction uses the same familiar skeleton. Archive switches still
 * take precedence and archived/unselected questions cannot be graded.
 */
export const PRACTICE_QUESTIONS = QUESTIONS.filter(
  (question) =>
    CURATED_QUESTION_LEVELS.has(question.id) &&
    !DISABLED_QUESTION_IDS.has(question.id),
);

export const getQuestion = (id: string) => QUESTIONS.find((q) => q.id === id);

export const isQuestionActive = (id: string) =>
  PRACTICE_QUESTIONS.some((question) => question.id === id);
