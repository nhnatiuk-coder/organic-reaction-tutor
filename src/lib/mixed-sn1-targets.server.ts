// Server-only elimination targets for the Mixed versions of existing SN1 questions.
// Structures were independently enumerated with RDKit and are checked with Indigo.
import type { AnswerTarget } from "./answer-keys.server";
import { ALKENE_GEOMETRY_FEEDBACK } from "./alkene-geometry";

const targets: Record<string, AnswerTarget> = {
  q32: {
    correct: "PPBRXRYQALVLMV-UHFFFAOYSA-N",
    correctSmiles: "C=Cc1ccccc1",
    requireStereo: false,
    correctName: "styrene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  q33: {
    correct: "XYLMUPLGERFSHI-UHFFFAOYSA-N",
    correctSmiles: "C=C(C)c1ccccc1",
    requireStereo: false,
    correctName: "2-phenylprop-1-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  q35: {
    correct: "ATQUFXWBVZUTKO-UHFFFAOYSA-N",
    correctSmiles: "CC1=CCCC1",
    requireStereo: false,
    correctName: "1-methylcyclopent-1-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  q36: {
    correct: "IFVMAGPISVKRAR-UHFFFAOYSA-N",
    correctSmiles: "CCC1=CCCCC1",
    requireStereo: false,
    correctName: "1-ethylcyclohex-1-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "BPBOWYWUOUJKLO-UHFFFAOYSA-N",
        correctSmiles: "CC=C1CCCCC1",
        correctName: "ethylidenecyclohexane",
      },
    ],
  },
  q37: {
    correct: "WCMSFBRREKZZFL-UHFFFAOYSA-N",
    correctSmiles: "C1=C(c2ccccc2)CCCC1",
    requireStereo: false,
    correctName: "1-phenylcyclohex-1-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  q38: {
    correct: "QYYQTLLGVAPKPN-UHFFFAOYSA-N",
    correctSmiles: "CCC1=CCCC1",
    requireStereo: false,
    correctName: "1-ethylcyclopent-1-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "VONKRKBGTZDZNV-UHFFFAOYSA-N",
        correctSmiles: "CC=C1CCCC1",
        correctName: "ethylidenecyclopentane",
      },
    ],
  },
  q39: {
    correct: "FLWGCAJANMGQBB-UHFFFAOYSA-N",
    correctSmiles: "CCCC1=CCCC1",
    requireStereo: false,
    correctName: "1-propylcyclopent-1-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "JCZSETXGLMHOIT-UHFFFAOYSA-N",
        correctSmiles: "CCC=C1CCCC1",
        correctName: "propylidenecyclopentane",
      },
    ],
  },
  q72: {
    correct: "WEPNJTDVIIKRIK-UHFFFAOYSA-N",
    correctSmiles: "CCCCC=C(C)C",
    requireStereo: false,
    correctName: "2-methylhept-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  q73: {
    correct: "RGYAVZGBAJFMIZ-UHFFFAOYSA-N",
    correctSmiles: "CCCC(C)=C(C)C",
    requireStereo: false,
    correctName: "2,3-dimethylhex-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  q74: {
    correct: "OFKLSPUVNMOIJB-VMPITWQZSA-N",
    correctSmiles: "C/C=C(\\C)CCCC",
    requireStereo: true,
    correctName: "(E)-3-methylhept-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "AAUHUDBDDBJONC-BQYQJAHWSA-N",
        correctSmiles: "CCC/C=C(\\C)CC",
        correctName: "(E)-3-methylhept-3-ene",
      },
    ],
  },
  "g-sn1-intro-07": {
    correct: "VQTUBCCKSQIDNK-UHFFFAOYSA-N",
    correctSmiles: "C=C(C)C",
    requireStereo: false,
    correctName: "2-methylpropene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-intro-08": {
    correct: "BKOOMYPCSUNDGP-UHFFFAOYSA-N",
    correctSmiles: "CC=C(C)C",
    requireStereo: false,
    correctName: "2-methylbut-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-intro-09": {
    correct: "JMMZCWZIJXAGKW-UHFFFAOYSA-N",
    correctSmiles: "CCC=C(C)C",
    requireStereo: false,
    correctName: "2-methylpent-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-intro-10": {
    correct: "BWEKDYGHDCHWEN-UHFFFAOYSA-N",
    correctSmiles: "CCCC=C(C)C",
    requireStereo: false,
    correctName: "2-methylhex-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-intro-11": {
    correct: "WEPNJTDVIIKRIK-UHFFFAOYSA-N",
    correctSmiles: "CCCCC=C(C)C",
    requireStereo: false,
    correctName: "2-methylhept-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-inter-09": {
    correct: "BKOOMYPCSUNDGP-UHFFFAOYSA-N",
    correctSmiles: "CC=C(C)C",
    requireStereo: false,
    correctName: "2-methylbut-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-inter-10": {
    correct: "BEQGRRJLJLVQAQ-GQCTYLIASA-N",
    correctSmiles: "C/C=C(\\C)CC",
    requireStereo: true,
    correctName: "(E)-3-methylpent-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-inter-11": {
    correct: "JZMUUSXQSKCZNO-FNORWQNLSA-N",
    correctSmiles: "C/C=C(\\C)CCC",
    requireStereo: true,
    correctName: "(E)-3-methylhex-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "FHHSSXNRVNXTBG-VOTSOKGWSA-N",
        correctSmiles: "CC/C=C(\\C)CC",
        correctName: "(E)-3-methylhex-3-ene",
      },
    ],
  },
  "g-sn1-adv-11": {
    correct: "BKOOMYPCSUNDGP-UHFFFAOYSA-N",
    correctSmiles: "CC=C(C)C",
    requireStereo: false,
    correctName: "2-methylbut-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-adv-12": {
    correct: "BEQGRRJLJLVQAQ-GQCTYLIASA-N",
    correctSmiles: "C/C=C(\\C)CC",
    requireStereo: true,
    correctName: "(E)-3-methylpent-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
  },
  "g-sn1-adv-15": {
    correct: "VOKPUAYTTWEUPZ-WEVVVXLNSA-N",
    correctSmiles: "C/C=C(\\C)CCCCC",
    requireStereo: true,
    correctName: "(E)-3-methyloct-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "RRPHUUXRVVPAAY-CMDGGOBGSA-N",
        correctSmiles: "CCCC/C=C(\\C)CC",
        correctName: "(E)-3-methyloct-3-ene",
      },
    ],
  },
  "g-sn1-adv-19": {
    correct: "OWOZHKRTPTVIAP-VMPITWQZSA-N",
    correctSmiles: "C/C=C(\\C)CC(C)CC",
    requireStereo: true,
    correctName: "(E)-3,5-dimethylhept-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "OXOLZWHOQAEIAW-VQHVLOKHSA-N",
        correctSmiles: "CC/C(C)=C/C(C)CC",
        correctName: "(E)-3,5-dimethylhept-3-ene",
      },
    ],
  },
  "g-sn1-adv-20": {
    correct: "NMLLTOMMZIQBCA-RMKNXTFCSA-N",
    correctSmiles: "C/C=C(\\C)CC(C)CCC",
    requireStereo: true,
    correctName: "(E)-3,5-dimethyloct-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "IRBGIGZYDOSRMS-CMDGGOBGSA-N",
        correctSmiles: "CCCC(C)/C=C(\\C)CC",
        correctName: "(E)-3,5-dimethyloct-3-ene",
      },
    ],
  },
  "g-sn1-adv-21": {
    correct: "ADGIRGGMVLTMJM-BJMVGYQFSA-N",
    correctSmiles: "C/C=C(\\C)CCCC(C)C",
    requireStereo: true,
    correctName: "(E)-3,7-dimethyloct-2-ene",
    explanation:
      "Loss of the leaving group gives a carbocation. Removal of a beta hydrogen forms a more substituted alkene; solvent capture gives the competing substitution product. Include any carbocation rearrangement before drawing either product.",
    distractors: {},
    alternatives: [
      {
        correct: "RMOJMFBVFPIYJA-CSKARUKUSA-N",
        correctSmiles: "CC/C(C)=C/CCC(C)C",
        correctName: "(E)-3,7-dimethyloct-3-ene",
      },
    ],
  },
};

export const MIXED_SN1_ELIMINATION_TARGETS = Object.fromEntries(
  Object.entries(targets).map(([id, target]) => [
    id,
    target.requireStereo
      ? { ...target, stereoFeedback: ALKENE_GEOMETRY_FEEDBACK }
      : target,
  ]),
);
