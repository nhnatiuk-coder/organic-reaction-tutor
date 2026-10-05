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
  },,
  {
    id: "q11",
    correct: "LFQSCWFLJHTTHZ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "ethanol",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q12",
    correct: "YSIMAPNUZAVQER-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "octanenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q13",
    correct: "RIAWWRJHTAZJSU-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methoxyoctane",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q14",
    correct: "ZVEZMVFBMOOHAT-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "nonane-1-thiol",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q15",
    correct: "SZKKNEOUHLFYNA-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "undecanenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q16",
    correct: "PFNHSEQQEPMLNI-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-methylpentan-1-ol",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q17",
    correct: "UYVAUDQQSCEZEL-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-ethoxy-3-methylpentane",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q18",
    correct: "ZRBLVTMNOAUKIX-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,3-dimethylhexanenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q19",
    correct: "RSLLLJWHUVGJPC-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methoxy-2,3-dimethylbutane",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q20",
    correct: "FNVNYWLQBGDZSC-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-methylheptanenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q21",
    correct: "YGZVAQICDGBHMD-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3-methylhexan-1-ol",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q22",
    correct: "ALKSCVWMOPPMSA-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,3-dimethylheptanenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q23",
    correct: "BCUYBJKERRIVDV-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methoxy-2,3-dimethylpentane",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q24",
    correct: "PLOIXTARDKUIKQ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,5-dimethylhexanenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q25",
    correct: "UXUMVHGYHSDYOR-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methoxy-3,3-dimethylpentane",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q26",
    correct: "NFFDLENKVNHMPC-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,3,4-trimethylpentanenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q27",
    correct: "GQKZBCPTCWJTAS-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "benzyl methyl ether",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q28",
    correct: "SJNALLRHIVGIBI-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "but-3-enenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q29",
    correct: "VDTUJQCSPFYIKZ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "4-methoxybut-1-ene",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q30",
    correct: "UNAQSRLBVVDYGP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "hex-5-enenitrile",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q31",
    correct: "UFULDTPDHIRNGS-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "hex-5-en-1-ol",
    explanation: "A strong nucleophile reacts at the unhindered carbon, replacing the leaving group in one concerted substitution step.",
    distractors: {},
  },
  {
    id: "q32",
    correct: "WAPNOHKVXSQRPX-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-phenylethanol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q33",
    correct: "BDCFWIDZNLCTMF-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-phenylpropan-2-ol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q34",
    correct: "QILSFLSDHQAZET-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "diphenylmethanol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q35",
    correct: "CAKWRXVKWGUISE-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-methylcyclopentan-1-ol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q36",
    correct: "BUCJHJXFXUZJHL-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-ethylcyclohexan-1-ol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q37",
    correct: "DTTDXHDYTWQDCS-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-phenylcyclohexan-1-ol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q38",
    correct: "LPCWIFPJLFCXRS-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-ethylcyclopentan-1-ol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q39",
    correct: "GJEILRJIINEWJO-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-propylcyclopentan-1-ol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q40",
    correct: "PVHCTQIRJHNLMY-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-isopropylcyclopentan-1-ol",
    explanation: "The substrate can ionize to a stabilised carbocation, then water captures that intermediate to give the major substitution product.",
    distractors: {},
  },
  {
    id: "q41",
    correct: "HGCIXCUEYOPUTN-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "cyclohexene",
    explanation: "Under acidic, heated conditions, loss of water produces a carbocation and elimination gives the more stable alkene.",
    distractors: {},
  },
  {
    id: "q42",
    correct: "ZXIJMRYMVAMXQP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "cycloheptene",
    explanation: "Under acidic, heated conditions, loss of water produces a carbocation and elimination gives the more stable alkene.",
    distractors: {},
  },
  {
    id: "q43",
    correct: "CFBGXYDUODCMNS-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "cyclobutene",
    explanation: "Under acidic, heated conditions, loss of water produces a carbocation and elimination gives the more stable alkene.",
    distractors: {},
  },
  {
    id: "q44",
    correct: "WCPWJMLXSZIWOP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-propylcyclohex-1-ene",
    explanation: "Under acidic, heated conditions, loss of water produces a carbocation and elimination gives the more stable alkene.",
    distractors: {},
  },
  {
    id: "q45",
    correct: "ZYMCVIZKLGUPBG-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-isopropylcyclohex-1-ene",
    explanation: "Under acidic, heated conditions, loss of water produces a carbocation and elimination gives the more stable alkene.",
    distractors: {},
  },
  {
    id: "q46",
    correct: "GQBKAYONUCKYKT-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-tert-butylcyclohex-1-ene",
    explanation: "Under acidic, heated conditions, loss of water produces a carbocation and elimination gives the more stable alkene.",
    distractors: {},
  },
  {
    id: "q47",
    correct: "JOHIXGUTSXXADV-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "undec-2-ene",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q48",
    correct: "CRSBERNSMYQZNG-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "dodec-1-ene",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q49",
    correct: "QIRVGKYPAOQVNP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "methylenecyclobutane",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q50",
    correct: "FYHISAJRLZLAQP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-ethylidenecyclobutane",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q51",
    correct: "XJYOAWSHIQNEGC-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "methylenecycloheptane",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q52",
    correct: "LPIQUOYDBNQMRZ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "cyclopentene",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q53",
    correct: "URYYVOIYTNXXBN-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "cyclooctene",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q54",
    correct: "GQRWNDZUODCEAJ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "methylenecyclooctane",
    explanation: "A strong base removes a β-hydrogen as the leaving group departs in one concerted elimination step.",
    distractors: {},
  },
  {
    id: "q55",
    correct: "BWYHTITWPWGSHN-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,3-dimethylcyclohex-1-ene",
    explanation: "Only the β-hydrogen anti-periplanar to the axial bromide can be removed. The gem-dimethyl β-carbon has no hydrogen, so only one alkene is possible.",
    distractors: {},
  },
  {
    id: "q56",
    correct: "FONFXXNTLGAHGI-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,3-dimethylcyclopent-1-ene",
    explanation: "The β-carbon bearing the two methyl groups has no hydrogen. The remaining anti-periplanar β-hydrogen gives the single allowed alkene.",
    distractors: {},
  },
  {
    id: "q57",
    correct: "JDRWZCSQCGVIFT-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,3-dimethylcyclohept-1-ene",
    explanation: "The gem-dimethyl β-carbon cannot donate a β-hydrogen. Elimination therefore occurs only at the β-carbon with the anti-periplanar hydrogen.",
    distractors: {},
  },
  {
    id: "q58",
    correct: "SOSOLNHZGZXTFK-ZHACJKMWSA-N",
    requireStereo: true,
    correctName: "(E)-1-tert-butyl-2-methyl-2-phenylethene",
    explanation: "Only one β-hydrogen is available, and the stated anti-periplanar arrangement fixes the substituents on opposite sides of the new double bond. The product is therefore the E alkene.",
    distractors: {},
  },
  {
    id: "q59",
    correct: "HZSSEAVJEGAJAU-QXMHVHEDSA-N",
    requireStereo: true,
    correctName: "(Z)-1-tert-butyl-2-ethyl-2-phenylethene",
    explanation: "Only one β-hydrogen is available, and the stated anti-periplanar arrangement fixes the tert-butyl and phenyl groups on the same side of the new double bond. The product is therefore the Z alkene.",
    distractors: {},
  },
  {
    id: "q60",
    correct: "RRMMRGUHEYXOQZ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-iodo-4-methylheptane",
    explanation:
      "Iodide is a strong nucleophile and replaces bromide at the primary carbon. Acetone helps drive this halogen exchange by precipitating sodium bromide.",
    distractors: {},
  },
  {
    id: "q61",
    correct: "JHKJQWFHNIOUKY-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "iodomethylcyclopropane",
    explanation:
      "Iodide replaces bromide at the primary cyclopropylmethyl carbon; the cyclopropane ring is unchanged during the halogen exchange.",
    distractors: {},
  },
  {
    id: "q62",
    correct: "ASGAOGZVKDPMHV-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3-ethylhexan-1-amine",
    explanation:
      "Excess ammonia attacks the primary bromide and, after proton transfer, gives the neutral primary amine. Excess ammonia minimises further alkylation.",
    distractors: {},
  },
  {
    id: "q63",
    correct: "NQJLVGQKPMVHTD-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "4-cyclohexylbutan-1-amine",
    explanation:
      "The primary bromide is replaced by an amino group. The cyclohexyl ring is a spectator and remains attached to the four-carbon chain.",
    distractors: {},
  },
  {
    id: "q64",
    correct: "BDTAOZDLJWEHSP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-azido-3-methoxypropane",
    explanation:
      "Azide is a strong nucleophile and weak base, so it cleanly replaces bromide at the primary carbon. Keep the methoxy group unchanged.",
    distractors: {},
  },
  {
    id: "q65",
    correct: "YVPUHRTVWANKKE-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-(azidomethyl)-4-tert-butylbenzene",
    explanation:
      "Azide substitutes for bromide at the benzylic carbon. The tert-butyl group remains in the para position on the aromatic ring.",
    distractors: {},
  },
  {
    id: "q66",
    correct: "QJEZJFBJQUYOCP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-ethoxy-4-ethylhexane",
    explanation:
      "Iodide is an excellent leaving group on a primary carbon. Ethoxide displaces it to form an ether, with the carbon skeleton unchanged.",
    distractors: {},
  },
  {
    id: "q67",
    correct: "ICMVGKQFVMTRLB-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "4-phenylbutanenitrile",
    explanation:
      "Cyanide attacks through carbon and replaces iodide. The nitrile carbon becomes a new carbon at the end of the original propyl chain.",
    distractors: {},
  },
  {
    id: "q68",
    correct: "MQUOOEBCMHJVBN-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1-azido-2-methoxyethane",
    explanation:
      "Azide substitutes for iodide at the primary carbon. The ether oxygen remains part of the product and is not the leaving group.",
    distractors: {},
  },
  {
    id: "q69",
    correct: "FAUQRRGKJKMEIW-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-cyclopropylacetonitrile",
    explanation:
      "Tosylate is a good leaving group. Cyanide displaces it through carbon, producing the nitrile and adding the nitrile carbon to the chain.",
    distractors: {},
  },
  {
    id: "q70",
    correct: "SVQQGGBOCJRIFS-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "4-azidobutylcyclopentane",
    explanation:
      "Azide replaces the tosylate group at the primary carbon. Keep the cyclopentyl group attached to the end of the four-carbon chain.",
    distractors: {},
  },
  {
    id: "q71",
    correct: "CGNLNKFBSBFJHY-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "5-phenylpentan-1-amine",
    explanation:
      "Excess ammonia displaces the tosylate group and gives the neutral primary amine. The phenyl group remains at the far end of the chain.",
    distractors: {},
  },
  {
    id: "q72",
    correct: "ACBMYYVZWKYLIP-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2-methylheptan-2-ol",
    explanation:
      "Bromide leaves first, giving a secondary carbocation at C3. A 1,2-hydride shift from C2 moves the positive charge to the more stable tertiary C2 carbocation; water then attacks that rearranged cation.",
    distractors: {
      QGVFLDUEHSIZIG:
        "That is the unrearranged alcohol. Water has been placed at the original C3 carbocation, but a 1,2-hydride shift gives a more stable tertiary cation before water attacks.",
    },
  },
  {
    id: "q73",
    correct: "BFKOEFFCVFMWPF-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2,3-dimethylhexan-2-ol",
    explanation:
      "Ionisation first gives a secondary carbocation at C3. Because the adjacent C2 has no hydride to shift, a 1,2-methyl shift occurs instead, placing the positive charge at tertiary C2 before water attacks.",
    distractors: {
      PFHLGQKVKALLMD:
        "That is the unrearranged alcohol. Before water attacks, a methyl group migrates from the adjacent quaternary carbon to make a more stable tertiary carbocation.",
    },
  },
  {
    id: "q74",
    correct: "PQOSNJHBSNZITJ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3-methylheptan-3-ol",
    explanation:
      "Loss of bromide gives a secondary C2 carbocation. A 1,2-hydride shift from C3 produces a tertiary carbocation at C3, and water captures that rearranged intermediate.",
    distractors: {
      SZERMVMTUUAYML:
        "That is the unrearranged alcohol. A hydride shift from the adjacent, more substituted carbon forms a tertiary carbocation before water attacks.",
    },
  },
  {
    id: "q75",
    correct: "RGYAVZGBAJFMIZ-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "2,3-dimethylhex-2-ene",
    explanation:
      "After water leaves, the secondary carbocation is adjacent to a quaternary carbon. A 1,2-methyl shift produces a tertiary carbocation, and E1 deprotonation then gives the tetrasubstituted alkene.",
    distractors: {
      RXYYKIMRVXDSFR:
        "That alkene comes from eliminating without rearranging. A methyl shift first gives a more stable tertiary carbocation and leads to the more substituted major alkene.",
    },
  },
  {
    id: "q76",
    correct: "XTUXVDJHGIEBAA-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "3,4-dimethylhex-3-ene",
    explanation:
      "Water leaves from C2 to give a secondary carbocation. A 1,2-hydride shift from C3 makes a tertiary C3 carbocation; removal of a beta hydrogen from C4 then gives the tetrasubstituted major alkene.",
    distractors: {
      FMNLVKMLDPGPRY:
        "That is the unrearranged alkene. A hydride shift first gives a tertiary carbocation, which can eliminate to the more substituted 3,4-dimethylhex-3-ene.",
    },
  },
  {
    id: "q77",
    correct: "VJKWRJZRTVBJTH-UHFFFAOYSA-N",
    requireStereo: false,
    correctName: "1,2-diethylcyclohexene",
    explanation:
      "After protonation and loss of water, one ethyl group migrates from the adjacent gem-diethyl carbon. The resulting tertiary carbocation eliminates to give the tetrasubstituted 1,2-diethylcyclohexene.",
    distractors: {
      SPDOKYMOIPQIQN:
        "That alkene is formed without rearrangement. An ethyl shift gives a more stable tertiary carbocation, which then forms the more substituted major alkene.",
    },
  }
];

export function gradeStructure(questionId: string, inchiKey: string) {
  const key = ANSWER_KEYS.find((k) => k.id === questionId);
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
