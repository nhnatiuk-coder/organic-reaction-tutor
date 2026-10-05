import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Indigo from "indigo-ketcher";

const root = resolve(import.meta.dirname, "..");
const outputQuestions = resolve(
  root,
  "src/lib/expanded-practice-bank.generated.ts",
);
const outputAnswers = resolve(
  root,
  "src/lib/expanded-answer-keys.generated.server.ts",
);

const indigo = await Indigo();
const options = new indigo.MapStringString();
const inchiKey = (smiles) => indigo.convert(smiles, "inchi-key", options);

/**
 * Build a compact, rooted alkyl tree. The depth is deliberately limited to
 * three C–C bonds from the attachment point, so no generated open carbon
 * chain can grow beyond eight carbons once it is placed in a reaction.
 */
function countCarbons(smiles) {
  return (smiles.match(/C/g) ?? []).length;
}

function compactAlkylTails() {
  const all = [{ smiles: "C", rootBranch: false }];
  const seen = new Set(["C"]);

  for (let depth = 1; depth <= 3; depth += 1) {
    const subtrees = [...all];
    const add = (children) => {
      const ordered = [...children].sort((first, second) =>
        first.smiles.localeCompare(second.smiles),
      );
      const [mainChain, ...branches] = ordered;
      const smiles = `C${branches.map((branch) => `(${branch.smiles})`).join("")}${mainChain?.smiles ?? ""}`;
      if (seen.has(smiles) || countCarbons(smiles) > 18) return;
      seen.add(smiles);
      all.push({ smiles, rootBranch: children.length >= 2 });
    };

    for (let first = 0; first < subtrees.length; first += 1) {
      add([subtrees[first]]);
      for (let second = first; second < subtrees.length; second += 1) {
        add([subtrees[first], subtrees[second]]);
        for (let third = second; third < subtrees.length; third += 1) {
          add([subtrees[first], subtrees[second], subtrees[third]]);
        }
      }
    }
  }

  return all;
}

function compactCycloalkylTails() {
  return [
    "C1CC1",
    "C1(C)CC1",
    "C1CC(C)1",
    "C1CCC1",
    "C1(C)CCC1",
    "C1CC(C)C1",
    "C1C(C)CC1",
    "C1CC(C)(C)C1",
  ].map((smiles) => ({ smiles, rootBranch: true }));
}

// The sequence is deterministic, keeps every tail distinct, and includes
// small cycloalkyl skeletons alongside compact branched acyclic skeletons.
const TAIL_CANDIDATES = [
  ...compactCycloalkylTails(),
  ...compactAlkylTails(),
];

const usedTailKeys = new Set();
const usedSubstrateKeys = new Set();
let tailCursor = 0;

function takeTail(options = {}) {
  for (let attempts = 0; attempts < TAIL_CANDIDATES.length; attempts += 1) {
    const candidate =
      TAIL_CANDIDATES[tailCursor++ % TAIL_CANDIDATES.length];
    if (options.rootBranch && !candidate.rootBranch) continue;
    const tail = candidate.smiles;
    const key = inchiKey(`C${tail}`).split("-")[0];
    if (!usedTailKeys.has(key)) {
      usedTailKeys.add(key);
      return tail;
    }
  }

  throw new Error("Could not generate enough distinct carbon skeletons");
}

const questions = [];
const answerKeys = [];

const TOSYLATE_SMILES = "OS(=O)(=O)c1ccc(C)cc1";

/**
 * Each generated carbon skeleton is used only once, but the leaving group
 * should not be a cue that every reaction is a bromide. Split alkyl leaving
 * groups approximately evenly among bromide, iodide, tosylate, and chloride.
 */
function leavingGroupVariant(index, { allowChloride = true } = {}) {
  if (!allowChloride) {
    const variant = index % 3;
    if (variant === 1) {
      return { id: "bromide", label: "bromide", smiles: "Br" };
    }
    if (variant === 2) {
      return { id: "iodide", label: "iodide", smiles: "I" };
    }
    return {
      id: "tosylate",
      label: "tosylate (OTs)",
      smiles: TOSYLATE_SMILES,
    };
  }

  const variant = index % 4;
  if (variant === 1) return { id: "bromide", label: "bromide", smiles: "Br" };
  if (variant === 2) return { id: "iodide", label: "iodide", smiles: "I" };
  if (variant === 3) {
    return {
      id: "tosylate",
      label: "tosylate (OTs)",
      smiles: TOSYLATE_SMILES,
    };
  }
  return { id: "chloride", label: "chloride", smiles: "Cl" };
}

function conditionsForLeavingGroup(leavingGroup, standardConditions) {
  if (leavingGroup.id !== "chloride") return standardConditions;
  return standardConditions.replace("25 °C", "50 °C").replace("heat", "reflux");
}

function primaryLeavingGroupVariant(index, tail) {
  const leavingGroup = leavingGroupVariant(index);
  if (leavingGroup.id === "tosylate") {
    return {
      ...leavingGroup,
      substrateSmiles: `C${tail}${TOSYLATE_SMILES}`,
      atTailEnd: true,
    };
  }

  return {
    ...leavingGroup,
    substrateSmiles: `${leavingGroup.smiles}C${tail}`,
    atTailEnd: false,
  };
}

function primarySubstitutionProduct(variant, tail, nucleophile) {
  const products = {
    cyanide: variant.atTailEnd ? `C${tail}C#N` : `N#CC${tail}`,
    azide: variant.atTailEnd ? `C${tail}[N-]=[N+]=N` : `[N-]=[N+]=NC${tail}`,
  };
  return products[nucleophile];
}

function primaryEliminationProduct(variant, tail) {
  return variant.atTailEnd ? `C${tail}=C` : `C=${tail}`;
}

function secondarySubstrateSmiles(index, tail, pattern, options) {
  const leavingGroup = leavingGroupVariant(index, options);
  return {
    leavingGroup,
    substrateSmiles: pattern(leavingGroup.smiles),
  };
}

const MAX_CARBON_CHAIN_LENGTH = 8;

function longestAliphaticCarbonChain(smiles) {
  const molfile = indigo.convert(smiles, "molfile", options);
  const lines = molfile.split(/\r?\n/);
  const countsIndex = lines.findIndex((line) => /V2000\s*$/.test(line));
  if (countsIndex < 0) {
    throw new Error(`Could not inspect carbon skeleton for ${smiles}`);
  }

  const [atomCount, bondCount] = lines[countsIndex]
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(Number);
  const atoms = lines
    .slice(countsIndex + 1, countsIndex + 1 + atomCount)
    .map((line) => line.trim().split(/\s+/)[3]);
  const bonds = lines
    .slice(countsIndex + 1 + atomCount, countsIndex + 1 + atomCount + bondCount)
    .map((line) => line.trim().split(/\s+/).slice(0, 3).map(Number));

  // Aromatic carbons belong to phenyl/tosylate groups, not the alkyl carbon
  // skeleton students are being asked to follow. Exclude them from the chain
  // limit while still applying the rule to every aliphatic carbon.
  const aromaticAtoms = new Set();
  for (const [first, second, bondType] of bonds) {
    if (bondType === 4) {
      aromaticAtoms.add(first - 1);
      aromaticAtoms.add(second - 1);
    }
  }

  const carbonAtoms = new Set(
    atoms
      .map((element, index) => ({ element, index }))
      .filter(({ element, index }) => element === "C" && !aromaticAtoms.has(index))
      .map(({ index }) => index),
  );
  const adjacency = new Map(
    [...carbonAtoms].map((index) => [index, []]),
  );
  for (const [first, second] of bonds) {
    const left = first - 1;
    const right = second - 1;
    if (carbonAtoms.has(left) && carbonAtoms.has(right)) {
      adjacency.get(left).push(right);
      adjacency.get(right).push(left);
    }
  }

  let longest = 0;
  const visit = (atom, visited) => {
    longest = Math.max(longest, visited.size);
    for (const neighbour of adjacency.get(atom)) {
      if (visited.has(neighbour)) continue;
      visited.add(neighbour);
      visit(neighbour, visited);
      visited.delete(neighbour);
    }
  };
  for (const atom of carbonAtoms) visit(atom, new Set([atom]));
  return longest;
}

function assertCarbonChainLimit(smiles, label) {
  const longest = longestAliphaticCarbonChain(smiles);
  if (longest > MAX_CARBON_CHAIN_LENGTH) {
    throw new Error(
      `${label} has a ${longest}-carbon chain; the maximum is ${MAX_CARBON_CHAIN_LENGTH}.`,
    );
  }
}

function addQuestion({
  id,
  skeletonId,
  mechanism,
  difficulty,
  title,
  substrate,
  substrateSmiles,
  reagents,
  conditions,
  prompt,
  stereochemistryMatters = false,
  conformationalHint,
  productSmiles,
  correctName,
  explanation,
}) {
  assertCarbonChainLimit(substrateSmiles, `${id} substrate`);
  assertCarbonChainLimit(productSmiles, `${id} product`);

  const substrateKey = inchiKey(substrateSmiles).split("-")[0];
  if (usedSubstrateKeys.has(substrateKey)) {
    throw new Error(`Duplicate generated starting structure for ${id}`);
  }
  usedSubstrateKeys.add(substrateKey);

  const correct = inchiKey(productSmiles);
  if (!/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(correct)) {
    throw new Error(`Could not validate the product for ${id}`);
  }

  questions.push({
    id,
    skeletonId,
    mechanism,
    difficulty,
    format: "scheme",
    title,
    substrate,
    substrateSmiles,
    reagents,
    conditions,
    prompt,
    stereochemistryMatters,
    ...(conformationalHint ? { conformationalHint } : {}),
  });
  answerKeys.push({
    id,
    correct,
    requireStereo: stereochemistryMatters,
    correctName,
    explanation,
    distractors: {},
  });
}

function fill(prefix, details, build) {
  for (let index = 1; index <= 50; index += 1) {
    const id = `${prefix}-${String(index).padStart(2, "0")}`;
    addQuestion({
      id,
      skeletonId: `generated-${id}`,
      ...details,
      ...build(index),
    });
  }
}

fill(
  "g-sn2-intro",
  {
    mechanism: "SN2",
    difficulty: "introductory",
    title: "Primary alkyl bromide with cyanide",
    substrate: "Primary alkyl bromide (see scheme)",
    reagents: "NaCN",
    conditions: "DMSO, 25 °C",
    prompt:
      "Draw the major organic product. Replace bromide with the cyanide carbon; do not draw inorganic by-products.",
    correctName: "the substitution nitrile",
    explanation:
      "Cyanide is a strong, weakly basic nucleophile. With a primary bromide in DMSO, substitution gives the nitrile product.",
  },
  (index) => {
    const tail = takeTail();
    const variant = primaryLeavingGroupVariant(index, tail);
    return {
      title: `Primary alkyl ${variant.label} with cyanide`,
      substrate: `Primary alkyl ${variant.label} (see scheme)`,
      substrateSmiles: variant.substrateSmiles,
      conditions: conditionsForLeavingGroup(variant, "DMSO, 25 °C"),
      prompt: `Draw the major organic product. Replace the ${variant.label} with the cyanide carbon; do not draw inorganic by-products.`,
      explanation: `Cyanide is a strong, weakly basic nucleophile. With a primary ${variant.label} in DMSO, substitution gives the nitrile product.`,
      productSmiles: primarySubstitutionProduct(variant, tail, "cyanide"),
    };
  },
);

fill(
  "g-sn2-inter",
  {
    mechanism: "SN2",
    difficulty: "intermediate",
    title: "Branched primary alkyl bromide with azide",
    substrate: "Branched primary alkyl bromide (see scheme)",
    reagents: "NaN₃",
    conditions: "DMF, 25 °C",
    prompt:
      "Draw the major organic product. Replace bromide with azide; use the reaction scheme to keep the carbon skeleton intact.",
    correctName: "the alkyl azide substitution product",
    explanation:
      "Azide is a good nucleophile and weak base. A primary bromide in DMF reacts by substitution while retaining the carbon skeleton shown in the scheme.",
  },
  (index) => {
    const tail = takeTail({ rootBranch: true });
    const variant = primaryLeavingGroupVariant(index, tail);
    return {
      title: `Branched primary alkyl ${variant.label} with azide`,
      substrate: `Branched primary alkyl ${variant.label} (see scheme)`,
      substrateSmiles: variant.substrateSmiles,
      conditions: conditionsForLeavingGroup(variant, "DMF, 25 °C"),
      prompt: `Draw the major organic product. Replace the ${variant.label} with azide; use the reaction scheme to keep the carbon skeleton intact.`,
      explanation: `Azide is a good nucleophile and weak base. A primary ${variant.label} in DMF reacts by substitution while retaining the carbon skeleton shown in the scheme.`,
      productSmiles: primarySubstitutionProduct(variant, tail, "azide"),
    };
  },
);

fill(
  "g-sn2-adv",
  {
    mechanism: "SN2",
    difficulty: "advanced",
    title: "Chiral secondary alkyl bromide with hydroxide",
    substrate: "Chiral secondary alkyl bromide (see scheme)",
    reagents: "NaOH",
    conditions: "DMSO, 25 °C",
    prompt:
      "Draw the major organic product, including wedge/dash stereochemistry. The configuration at the reacting carbon is graded.",
    stereochemistryMatters: true,
    correctName: "the inverted alcohol product",
    explanation:
      "Hydroxide attacks the secondary carbon from the back. The carbon skeleton is retained, but the reacting stereocentre must invert.",
  },
  (index) => {
    const tail = takeTail();
    const { leavingGroup, substrateSmiles } = secondarySubstrateSmiles(
      index,
      tail,
      (leavingGroupSmiles) => `C[C@H](${leavingGroupSmiles})${tail}`,
      { allowChloride: false },
    );
    return {
      title: `Chiral secondary alkyl ${leavingGroup.label} with hydroxide`,
      substrate: `Chiral secondary alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      explanation: `Hydroxide attacks the secondary carbon from the back as the ${leavingGroup.label} leaves. The carbon skeleton is retained, but the reacting stereocentre must invert.`,
      productSmiles: `C[C@@H](O)${tail}`,
    };
  },
);

fill(
  "g-sn1-intro",
  {
    mechanism: "SN1",
    difficulty: "introductory",
    title: "Tertiary alkyl bromide solvolysis",
    substrate: "Tertiary alkyl bromide (see scheme)",
    reagents: "H₂O",
    conditions: "aqueous acetone, 25 °C",
    prompt: "Draw the major organic substitution product of this solvolysis.",
    correctName: "the tertiary alcohol",
    explanation:
      "The tertiary bromide ionises in the polar protic medium, then water captures the carbocation to give the alcohol.",
  },
  (index) => {
    const tail = takeTail();
    const leavingGroup = leavingGroupVariant(index);
    const substrateSmiles =
      leavingGroup.id === "tosylate"
        ? `C(C)(C)(${tail})${leavingGroup.smiles}`
        : `${leavingGroup.smiles}C(C)(C)${tail}`;
    return {
      title: `Tertiary alkyl ${leavingGroup.label} solvolysis`,
      substrate: `Tertiary alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      conditions: conditionsForLeavingGroup(
        leavingGroup,
        "aqueous acetone, 25 °C",
      ),
      explanation: `The tertiary ${leavingGroup.label} ionises in the polar protic medium, then water captures the carbocation to give the alcohol.`,
      productSmiles: `OC(C)(C)${tail}`,
    };
  },
);

fill(
  "g-sn1-inter",
  {
    mechanism: "SN1",
    difficulty: "intermediate",
    title: "Highly substituted bromide in methanol",
    substrate: "Highly substituted alkyl bromide (see scheme)",
    reagents: "CH₃OH (solvent)",
    conditions: "25 °C, no added base",
    prompt:
      "Draw the major organic substitution product. Methanol is the nucleophile and solvent.",
    correctName: "the tertiary methyl ether",
    explanation:
      "Ionisation gives a stable tertiary carbocation. Methanol attacks that cation, giving the methyl ether after deprotonation.",
  },
  (index) => {
    const tail = takeTail({ rootBranch: true });
    const leavingGroup = leavingGroupVariant(index);
    const substrateSmiles =
      leavingGroup.id === "tosylate"
        ? `C(C)(CC)(${tail})${leavingGroup.smiles}`
        : `${leavingGroup.smiles}C(C)(CC)${tail}`;
    return {
      title: `Highly substituted ${leavingGroup.label} in methanol`,
      substrate: `Highly substituted alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      conditions: conditionsForLeavingGroup(
        leavingGroup,
        "25 °C, no added base",
      ),
      explanation: `Ionisation of the highly substituted ${leavingGroup.label} gives a stable tertiary carbocation. Methanol attacks that cation, giving the methyl ether after deprotonation.`,
      productSmiles: `COC(C)(CC)${tail}`,
    };
  },
);

fill(
  "g-sn1-adv",
  {
    mechanism: "SN1",
    difficulty: "advanced",
    title: "Secondary bromide requiring a hydride shift",
    substrate: "Branched secondary alkyl bromide (see scheme)",
    reagents: "H₂O",
    conditions: "aqueous acetone, AgNO₃, 25 °C",
    prompt:
      "Draw the major organic product. Consider the more stable carbocation that can form before water attacks.",
    correctName: "the rearranged tertiary alcohol",
    explanation:
      "Loss of bromide first gives a secondary carbocation. A hydride shift forms the more stable tertiary carbocation, which is then trapped by water.",
  },
  (index) => {
    const tail = takeTail();
    const { leavingGroup, substrateSmiles } = secondarySubstrateSmiles(
      index,
      tail,
      (leavingGroupSmiles) => `CC(${leavingGroupSmiles})C(C)${tail}`,
    );
    return {
      title: `Secondary ${leavingGroup.label} requiring a hydride shift`,
      substrate: `Branched secondary alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      conditions: conditionsForLeavingGroup(
        leavingGroup,
        "aqueous acetone, AgNO₃, 25 °C",
      ),
      explanation: `Loss of the ${leavingGroup.label} first gives a secondary carbocation. A hydride shift forms the more stable tertiary carbocation, which is then trapped by water.`,
      productSmiles: `CCC(O)(C)${tail}`,
    };
  },
);

fill(
  "g-e1-intro",
  {
    mechanism: "E1",
    difficulty: "introductory",
    title: "Tertiary alcohol dehydration",
    substrate: "Tertiary alcohol (see scheme)",
    reagents: "concentrated H₂SO₄",
    conditions: "heat",
    prompt: "Draw the major alkene product of this dehydration.",
    correctName: "the Zaitsev alkene",
    explanation:
      "Acid and heat dehydrate the tertiary alcohol. Elimination forms the more substituted alkene at the most substituted available beta carbon.",
  },
  () => {
    const tail = takeTail();
    return {
      substrateSmiles: `OC(C)(C)${tail}`,
      productSmiles: `C(C)(C)=${tail}`,
    };
  },
);

fill(
  "g-e1-inter",
  {
    mechanism: "E1",
    difficulty: "intermediate",
    title: "Branched tertiary alcohol dehydration",
    substrate: "Branched tertiary alcohol (see scheme)",
    reagents: "concentrated H₂SO₄",
    conditions: "heat",
    prompt:
      "Draw the major alkene product. Compare the possible beta positions and choose the most substituted alkene.",
    correctName: "the highly substituted alkene",
    explanation:
      "After ionisation, loss of a beta hydrogen gives the most substituted alkene available from the tertiary carbocation.",
  },
  () => {
    const tail = takeTail({ rootBranch: true });
    return {
      substrateSmiles: `OC(C)(CC)${tail}`,
      productSmiles: `C(C)(CC)=${tail}`,
    };
  },
);

fill(
  "g-e1-adv",
  {
    mechanism: "E1",
    difficulty: "advanced",
    title: "Secondary alcohol dehydration requiring rearrangement",
    substrate: "Branched secondary alcohol (see scheme)",
    reagents: "concentrated H₂SO₄",
    conditions: "heat",
    prompt:
      "Draw the major alkene product. Consider carbocation rearrangement before the elimination step.",
    correctName: "the rearranged Zaitsev alkene",
    explanation:
      "Water leaves to give a secondary carbocation. A hydride shift gives a more stable tertiary carbocation before deprotonation forms the major alkene.",
  },
  () => {
    const tail = takeTail({ rootBranch: true });
    return {
      substrateSmiles: `CC(O)C(C)${tail}`,
      productSmiles: `CCC(C)=${tail}`,
    };
  },
);

fill(
  "g-e2-intro",
  {
    mechanism: "E2",
    difficulty: "introductory",
    title: "Primary alkyl bromide with bulky base",
    substrate: "Primary alkyl bromide (see scheme)",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the alkene product. Only one beta carbon is available for this elimination.",
    correctName: "the terminal alkene",
    explanation:
      "A strong bulky base removes a beta hydrogen as bromide leaves. With only one beta carbon, the alkene position is fixed.",
  },
  (index) => {
    const tail = takeTail();
    const variant = primaryLeavingGroupVariant(index, tail);
    return {
      title: `Primary alkyl ${variant.label} with bulky base`,
      substrate: `Primary alkyl ${variant.label} (see scheme)`,
      substrateSmiles: variant.substrateSmiles,
      conditions: conditionsForLeavingGroup(variant, "tert-butanol, heat"),
      explanation: `A strong bulky base removes a beta hydrogen as the ${variant.label} leaves. With only one beta carbon, the alkene position is fixed.`,
      productSmiles: primaryEliminationProduct(variant, tail),
    };
  },
);

fill(
  "g-e2-inter",
  {
    mechanism: "E2",
    difficulty: "intermediate",
    title: "Branched tertiary bromide with ethoxide",
    substrate: "Branched tertiary alkyl bromide (see scheme)",
    reagents: "NaOCH₂CH₃",
    conditions: "CH₃CH₂OH, heat",
    prompt:
      "Draw the major alkene product. Use the scheme to select the most substituted beta position.",
    correctName: "the Zaitsev alkene",
    explanation:
      "Ethoxide is a small strong base. Concerted elimination gives the most substituted available alkene.",
  },
  (index) => {
    const tail = takeTail({ rootBranch: true });
    const leavingGroup = leavingGroupVariant(index);
    const substrateSmiles =
      leavingGroup.id === "tosylate"
        ? `C(C)(CC)(${tail})${leavingGroup.smiles}`
        : `${leavingGroup.smiles}C(C)(CC)${tail}`;
    return {
      title: `Branched tertiary ${leavingGroup.label} with ethoxide`,
      substrate: `Branched tertiary alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      conditions: conditionsForLeavingGroup(leavingGroup, "CH₃CH₂OH, heat"),
      explanation: `Ethoxide is a small strong base. Concerted elimination of the ${leavingGroup.label} gives the most substituted available alkene.`,
      productSmiles: `C(C)(CC)=${tail}`,
    };
  },
);

fill(
  "g-e2-adv",
  {
    mechanism: "E2",
    difficulty: "advanced",
    title: "Conformationally constrained E2 elimination",
    substrate: "Chiral secondary alkyl bromide (see scheme)",
    reagents: "potassium tert-butoxide",
    conditions: "tert-butanol, heat",
    prompt:
      "Draw the major alkene product. Use the supplied anti-periplanar relationship to identify the available beta hydrogen.",
    conformationalHint:
      "Use the supplied reactive staggered conformer. The bulky beta carbon on one side has no hydrogen, so only the beta hydrogen anti to C–Br can be removed.",
    correctName: "the anti-periplanar E2 alkene",
    explanation:
      "E2 requires an anti-periplanar beta hydrogen. The substituted beta carbon has no hydrogen, so elimination can occur only at the indicated methyl-side beta carbon.",
  },
  (index) => {
    const tail = takeTail();
    const { leavingGroup, substrateSmiles } = secondarySubstrateSmiles(
      index,
      tail,
      (leavingGroupSmiles) => `C[C@H](${leavingGroupSmiles})C(C)(C)${tail}`,
    );
    return {
      title: `Conformationally constrained ${leavingGroup.label} E2 elimination`,
      substrate: `Chiral secondary alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      conditions: conditionsForLeavingGroup(leavingGroup, "tert-butanol, heat"),
      productSmiles: `C=CC(C)(C)${tail}`,
      conformationalHint:
        "Use the supplied reactive staggered conformer. The bulky beta carbon on one side has no hydrogen, so only the beta hydrogen anti to the leaving group can be removed.",
      explanation:
        "E2 requires an anti-periplanar beta hydrogen. The substituted beta carbon has no hydrogen, so elimination can occur only at the indicated methyl-side beta carbon.",
    };
  },
);

if (questions.length !== 600 || answerKeys.length !== 600) {
  throw new Error(
    `Expected 600 generated questions; received ${questions.length}`,
  );
}

function tsArray(name, values, typeImport) {
  return `${typeImport}\n\n// Generated from structurally validated reaction families. Do not hand-edit; run scripts/generate-expanded-practice-bank.mjs.\nexport const ${name}: ${name.includes("ANSWER") ? "AnswerKey" : "Question"}[] = ${JSON.stringify(values, null, 2)};\n`;
}

mkdirSync(dirname(outputQuestions), { recursive: true });
writeFileSync(
  outputQuestions,
  tsArray(
    "GENERATED_QUESTIONS",
    questions,
    'import type { Question } from "./questions";',
  ),
);
writeFileSync(
  outputAnswers,
  tsArray(
    "GENERATED_ANSWER_KEYS",
    answerKeys,
    'import type { AnswerKey } from "./answer-keys.server";',
  ),
);

options.delete();
console.log(
  `Generated ${questions.length} questions with ${usedTailKeys.size} distinct carbon tails.`,
);
