// SERVER ONLY. Never import this from a component or a *.functions.ts module scope.
// Structures are stored as standard InChIKeys (skeleton block = connectivity,
// full key = connectivity + stereochemistry).
import { isQuestionActive } from "./questions";

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

/** Extra scenario IDs reuse a verified product key. */
const VARIANT_ANSWER_KEY_IDS: Record<string, string> = {
  "q11": "q1",
  "q12": "q1",
  "q13": "q10",
  "q14": "q1",
  "q15": "q1",
  "q16": "q6",
  "q17": "q6",
  "q18": "q6",
  "q19": "q6",
  "q20": "q1",
  "q21": "q6",
  "q22": "q7",
  "q23": "q7",
  "q24": "q7",
  "q25": "q7",
  "q26": "q7",
  "q27": "q7",
  "q28": "q7",
  "q29": "q7",
  "q30": "q7",
  "q31": "q7",
  "q32": "q7",
  "q33": "q8",
  "q34": "q8",
  "q35": "q8",
  "q36": "q8",
  "q37": "q4",
  "q38": "q4",
  "q39": "q4",
  "q40": "q4",
  "q41": "q4",
  "q42": "q8",
  "q43": "q10",
  "q44": "q10",
  "q45": "q10",
  "q46": "q3",
  "q47": "q3",
  "q48": "q3",
  "q49": "q9",
  "q50": "q9",
  "q51": "q9",
};

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
  {
    id: "q6",
    correct: "VNKYTQGIUYNRMY-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methoxypropane (methyl propyl ether)",
    explanation:
      "Methoxide is a strong nucleophile and the substrate is primary, so a clean SN2 (Williamson ether synthesis) replaces Br with OCH\u2083.",
    distractors: {
      CYNYIHKIEHGYOZ: "That is the starting bromide \u2014 no reaction has been drawn.",
      QQONPFPTGQHPMA:
        "That is propene, the E2 product. Methoxide is basic, but a primary substrate with an unhindered base gives substitution as the major pathway.",
      BDERNNFJNOPAEC:
        "That is propan-1-ol. The nucleophile here is methoxide, not hydroxide or water.",
    },
  },
  {
    id: "q7",
    correct: "VTBOTOBFGSVRMA-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methylcyclohexan-1-ol",
    explanation:
      "Aqueous acetone is a weakly nucleophilic solvent, so the tertiary bromide ionises first (SN1) and water captures the carbocation to give the tertiary alcohol.",
    distractors: {
      VSGXTQWTJYAQHO: "That is the starting bromide \u2014 no reaction has been drawn.",
      CTMHWPIWNRWQEG:
        "That is 1-methylcyclohexene, the E1 by-product. With no added base and mild solvolysis conditions, substitution dominates.",
      YULMNMJFAZWLLN:
        "That is methylenecyclohexane, a minor E1 alkene, not the major solvolysis product.",
    },
  },
  {
    id: "q8",
    correct: "BKOOMYPCSUNDGP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-methylbut-2-ene",
    explanation:
      "Protonation and loss of water gives a tertiary carbocation. A weak base removes the \u03b2-hydrogen that leads to the more substituted (Zaitsev) alkene.",
    distractors: {
      MSXVEPNJUHWQHW: "That is the starting alcohol \u2014 no reaction has been drawn.",
      MHNNAWXXUZQSNM:
        "That is 2-methylbut-1-ene, the less substituted alkene. E1 under thermodynamic acid conditions favours the more substituted Zaitsev alkene.",
    },
  },
  {
    id: "q9",
    correct: "QMMOXUPEWRXHJS-HWKANZROSA-N",
    requireStereo: false,
    correctName: "pent-2-ene (E isomer favoured)",
    explanation:
      "Ethoxide is a strong but small base, so it removes the \u03b2-hydrogen giving the more substituted Zaitsev alkene, pent-2-ene, mainly as the E isomer.",
    distractors: {
      LGAJYTCRJPCZRJ: "That is the starting bromide \u2014 no reaction has been drawn.",
      YWAKXRMUMFPDSH:
        "That is pent-1-ene, the Hofmann alkene. You only get that as the major product with a bulky base.",
      XFKPOLRDQWCGPV:
        "That is the SN2 ether. Hot ethoxide with a secondary substrate favours E2 elimination.",
    },
  },
  {
    id: "q10",
    correct: "LIKMAJRDDDTEIG-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "hex-1-ene",
    explanation:
      "tert-Butoxide is too bulky to reach the internal \u03b2-hydrogen easily, so it removes a terminal methyl hydrogen and gives the less substituted Hofmann alkene.",
    distractors: {
      NEBYCXAKZCQWAW: "That is the starting bromide \u2014 no reaction has been drawn.",
      RYPKRALMXUUNKS:
        "That is hex-2-ene, the Zaitsev alkene. A bulky base such as tert-butoxide reverses the usual preference.",
      DUIFXXUJVREKGP:
        "That is the substitution product. tert-Butoxide is far too hindered for SN2 on a secondary carbon.",
    },
  },
];

export function gradeStructure(questionId: string, inchiKey: string) {
  const keyId = VARIANT_ANSWER_KEY_IDS[questionId] ?? questionId;
  const key = ANSWER_KEYS.find((k) => k.id === keyId);
  if (!key || !isQuestionActive(questionId)) return null;

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
