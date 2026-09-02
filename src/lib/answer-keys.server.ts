// SERVER ONLY. Never import this from a component or a *.functions.ts module scope.
// Structures are stored as standard InChIKeys (skeleton block = connectivity,
// full key = connectivity + stereochemistry).

export type AnswerKey = {
  id: string;
  /** Full standard InChIKey of the correct major product. */
  correct: string;
  /** Whether the stereo block of the key must also match. */
  requireStereo: boolean;
  correctName: string;
  explanation: string;
  /** Recognised wrong answers keyed by InChIKey skeleton (first 14 chars). */
  distractors: Record<string, string>;
};

const skeleton = (key: string) => key.split("-")[0]!;

export const ANSWER_KEYS: AnswerKey[] = [
  {
    id: "q1",
    correct: "RFFFKMOABOFIDF-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "pentanenitrile (CH₃CH₂CH₂CH₂C≡N)",
    explanation:
      "Cyanide is a strong, weakly basic nucleophile and the substrate is primary, so backside attack (SN2) wins over elimination. The C–Br bond is replaced by C–C≡N.",
    distractors: {
      MPPPKRYCTPRNTB: "That is the starting bromide — no reaction has been drawn.",
      VXNZUUAINFGPBY:
        "That is the E2 alkene. Cyanide is a good nucleophile but a weak base, and the substrate is primary, so substitution dominates.",
      LRHPLDYGYMQRHN:
        "That is butan-1-ol. Hydroxide/water is not the nucleophile here — cyanide is.",
    },
  },
  {
    id: "q2",
    correct: "NUMQCACRALPSHD-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-ethoxy-2-methylpropane (tert-butyl ethyl ether)",
    explanation:
      "The tertiary carbocation forms first (SN1), then the ethanol solvent attacks and loses a proton, giving the ether.",
    distractors: {
      JOUWCKCVTDSMHF: "That is the starting bromide — no reaction has been drawn.",
      DKGAVHZHDRPRBM:
        "That is tert-butanol, the product you would get with water as the solvent. Here ethanol is the nucleophile.",
      VQTUBCCKSQIDNK:
        "That is 2-methylpropene, the E1 by-product. Under mild solvolysis conditions with no added base, substitution is the major pathway.",
    },
  },
  {
    id: "q3",
    correct: "MHNNAWXXUZQSNM-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-methylbut-1-ene",
    explanation:
      "tert-Butoxide is a bulky base, so it removes the more accessible methyl β-hydrogen. That gives the less substituted (Hofmann) alkene as the major product.",
    distractors: {
      BKOOMYPCSUNDGP:
        "That is 2-methylbut-2-ene, the Zaitsev product. A bulky base such as tert-butoxide reverses that preference and gives the Hofmann alkene.",
      RKSOPLXZQNSWAS: "That is the starting bromide — no reaction has been drawn.",
      DKGAVHZHDRPRBM:
        "That is a substitution product. A tertiary substrate with a bulky strong base eliminates rather than substitutes.",
    },
  },
  {
    id: "q4",
    correct: "CTMHWPIWNRWQEG-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methylcyclohex-1-ene",
    explanation:
      "Protonation and loss of water gives a secondary cation that forms the more substituted (Zaitsev) alkene: the trisubstituted 1-methylcyclohexene.",
    distractors: {
      NDVWOBYBJYUSMF: "That is the starting alcohol — no reaction has been drawn.",
      YULMNMJFAZWLLN:
        "That is methylenecyclohexane, the exocyclic (Hofmann) alkene. With acid and heat the more substituted endocyclic alkene is favoured.",
    },
  },
  {
    id: "q5",
    correct: "BTANRVKWQNVYAZ-SCSAIBSYSA-N",
    requireStereo: true,
    correctName: "(R)-butan-2-ol",
    explanation:
      "Hydroxide attacks the backside of the C–Br bond, so the configuration at the stereocentre inverts. The priority order is unchanged, so (S)-bromide gives (R)-alcohol.",
    distractors: {
      UPSXAPQYNGXVBF: "That is the starting bromide — no reaction has been drawn.",
      IAQRGUVFOMOMEM:
        "That is but-2-ene. Hydroxide in a polar aprotic solvent with a secondary substrate gives mainly substitution.",
    },
  },
];

export function gradeStructure(questionId: string, inchiKey: string) {
  const key = ANSWER_KEYS.find((k) => k.id === questionId);
  if (!key) return null;

  const submitted = inchiKey.trim().toUpperCase();
  const sameSkeleton = skeleton(submitted) === skeleton(key.correct);
  const sameStereo = submitted.split("-")[1] === key.correct.split("-")[1];

  if (sameSkeleton && (!key.requireStereo || sameStereo)) {
    return {
      verdict: "correct" as const,
      message: `Correct — that's ${key.correctName}.`,
      explanation: key.explanation,
    };
  }

  if (sameSkeleton && key.requireStereo) {
    return {
      verdict: "partial" as const,
      message:
        "Right connectivity, wrong stereochemistry at the reacting carbon. Check your wedge/dash bonds.",
      explanation: key.explanation,
    };
  }

  const hint = key.distractors[skeleton(submitted)];
  return {
    verdict: "incorrect" as const,
    message: hint ?? "That isn't the major product of this reaction.",
    explanation: key.explanation,
  };
}
