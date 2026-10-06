import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Indigo from "indigo-ketcher";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
// The browser and build use the same public solvent assignments. Transpile
// this standalone data module so the generator does not need a TS runtime.
const nucleophileModule = ts.transpileModule(
  readFileSync(resolve(root, "src/lib/sn1-nucleophiles.ts"), "utf8"),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  },
).outputText;
const { getSn1Nucleophile, SN1_NUCLEOPHILES, sn1SolvolysisConditions } =
  await import(
    `data:text/javascript;base64,${Buffer.from(nucleophileModule).toString("base64")}`
  );
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
 * A deliberately small, readable palette of alkyl and cycloalkyl fragments.
 * No fragment contains a long zig-zag chain or a dense cluster of branches.
 * A few single methyl branches and small rings keep the exercise bank varied
 * without making students decode an artificial-looking carbon tree first.
 *
 * The palette contains more than 50 distinct fragments, so a complete
 * mechanism/difficulty set has no repeated fragment. Fragments may recur in
 * a different reaction context elsewhere in the 600-question bank; that is a
 * purposeful trade-off for clear, chemically familiar structures.
 */
const RAW_TAIL_CANDIDATES = [
  // Straight chains and one simple methyl branch.
  "C",
  "CC",
  "CCC",
  "CCCC",
  "CCCCC",
  "C(C)C",
  "C(C)CC",
  "C(C)CCC",
  "CC(C)C",
  "CC(C)CC",
  "CC(C)CCC",
  "CCC(C)C",
  "CCC(C)CC",
  "CCCC(C)C",
  "C(C)(C)C",
  "CC(C)(C)C",
  "C(CC)CC",
  "C(CC)CCC",
  "CC(CC)CC",
  "CCC(CC)C",
  "CCCC(CC)C",
  "CCCCC(C)C",
  "CCC(C)CCC",
  "CC(C)CCCC",
  "C(C)CCCC",
  "C(CC)CCCC",
  "C(C)(C)CC",
  "C(C)(C)CCC",
  "C(C)(CC)CC",
  "CC(C)(C)CC",
  "CC(C)(CC)C",

  // Cyclopropyl fragments with short, unbranched spacers.
  "C1CC1",
  "CC1CC1",
  "CCC1CC1",
  "C1CC(C)1",
  "CC1C(C)C1",
  "C1CC(CC)1",
  "CC1CC(C)1",
  "C1(C)CC1",
  "CC1(C)CC1",
  "C1(CC)CC1",
  "C1C(CC)C1",
  "C1(C)C(C)C1",
  "C1C(C)(C)C1",
  "C1(CC)C(C)C1",

  // Cyclobutyl fragments with short, unbranched spacers.
  "C1CCC1",
  "CC1CCC1",
  "CCC1CCC1",
  "C1CCC(C)1",
  "CC1C(C)CC1",
  "CC1CC(C)C1",
  "C1CCC(CC)1",
  "CC1CCC(C)1",
  "C1(C)CCC1",
  "C1(C)CC(C)1",
  "C1CC(C)(C)1",
  "C1(C)C(C)C1",
  "C1C(C)CC1",
  "C1CC(C)(C)C1",
  "C1(CC)CCC1",
  "C1C(CC)CC1",
  "C1CC(CC)C1",
  "C1(C)C(C)CC1",
  "C1(C)CC(C)C1",
  "C1C(C)C(C)C1",
  "C1C(C)(C)CC1",
  "C1CC(C)(C)C1",
  "C1C(C)C(CC)C1",
  "C1C(CC)C(C)C1",

  // Cyclopentyl fragments. Rings keep the drawing compact without extending
  // the longest carbon path beyond the eight-carbon guard below.
  "C1CCCC1",
  "CC1CCCC1",
  "C1(C)CCCC1",

  // Larger rings are still simple to read. The guard below limits each ring
  // to eight carbons and separately limits any open carbon chain to eight.
  "C1CCCCC1",
  "CC1CCCCC1",
  "CCC1CCCCC1",
  "C1(C)CCCCC1",
  "C1CCCCCC1",
  "CC1CCCCCC1",
  "C1(C)CCCCCC1",
  "C1CCCCCCC1",
  "CC1CCCCCCC1",
  "C1(C)CCCCCCC1",
];

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
      .filter(
        ({ element, index }) => element === "C" && !aromaticAtoms.has(index),
      )
      .map(({ index }) => index),
  );
  const allCarbonAdjacency = new Map(
    [...carbonAtoms].map((index) => [index, []]),
  );
  const carbonBonds = [];
  for (const [first, second] of bonds) {
    const left = first - 1;
    const right = second - 1;
    if (carbonAtoms.has(left) && carbonAtoms.has(right)) {
      allCarbonAdjacency.get(left).push(right);
      allCarbonAdjacency.get(right).push(left);
      carbonBonds.push([left, right]);
    }
  }

  // A ring is permitted when the ring itself has eight carbons or fewer.
  // Ring bonds are intentionally excluded from the open-chain calculation:
  // a cyclohexane with a short substituent is not a nine-carbon *chain*.
  const hasAlternativePath = (start, target, excludedLeft, excludedRight) => {
    const queue = [start];
    const visited = new Set([start]);
    while (queue.length > 0) {
      const atom = queue.shift();
      for (const neighbour of allCarbonAdjacency.get(atom)) {
        if (
          (atom === excludedLeft && neighbour === excludedRight) ||
          (atom === excludedRight && neighbour === excludedLeft)
        ) {
          continue;
        }
        if (neighbour === target) return true;
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    return false;
  };

  const openChainAdjacency = new Map(
    [...carbonAtoms].map((index) => [index, []]),
  );
  const ringAdjacency = new Map([...carbonAtoms].map((index) => [index, []]));
  for (const [left, right] of carbonBonds) {
    if (hasAlternativePath(left, right, left, right)) {
      ringAdjacency.get(left).push(right);
      ringAdjacency.get(right).push(left);
    } else {
      openChainAdjacency.get(left).push(right);
      openChainAdjacency.get(right).push(left);
    }
  }

  let largestRing = 0;
  const visitedRingAtoms = new Set();
  for (const atom of carbonAtoms) {
    if (visitedRingAtoms.has(atom) || ringAdjacency.get(atom).length === 0) {
      continue;
    }
    const queue = [atom];
    visitedRingAtoms.add(atom);
    let ringAtoms = 0;
    while (queue.length > 0) {
      const current = queue.shift();
      ringAtoms += 1;
      for (const neighbour of ringAdjacency.get(current)) {
        if (!visitedRingAtoms.has(neighbour)) {
          visitedRingAtoms.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    largestRing = Math.max(largestRing, ringAtoms);
  }

  let longest = 0;
  const visit = (atom, visited) => {
    longest = Math.max(longest, visited.size);
    for (const neighbour of openChainAdjacency.get(atom)) {
      if (visited.has(neighbour)) continue;
      visited.add(neighbour);
      visit(neighbour, visited);
      visited.delete(neighbour);
    }
  };
  for (const atom of carbonAtoms) visit(atom, new Set([atom]));
  return { longestChain: longest, largestRing };
}

function fitsCarbonLimit(smiles) {
  const { longestChain, largestRing } = longestAliphaticCarbonChain(smiles);
  return (
    longestChain <= MAX_CARBON_CHAIN_LENGTH &&
    largestRing <= MAX_CARBON_CHAIN_LENGTH
  );
}

function assertCarbonChainLimit(smiles, label) {
  const { longestChain, largestRing } = longestAliphaticCarbonChain(smiles);
  if (longestChain > MAX_CARBON_CHAIN_LENGTH) {
    throw new Error(
      `${label} has a ${longestChain}-carbon chain; the maximum is ${MAX_CARBON_CHAIN_LENGTH}.`,
    );
  }
  if (largestRing > MAX_CARBON_CHAIN_LENGTH) {
    throw new Error(
      `${label} has a ${largestRing}-carbon ring; the maximum is ${MAX_CARBON_CHAIN_LENGTH}.`,
    );
  }
}

// Every fragment must work even in the largest generated carbon framework.
// This makes the palette self-policing: adding a readable-looking fragment
// cannot quietly reintroduce an over-eight-carbon chain in one reaction type.
const TAIL_TEST_CONTEXTS = [
  (tail) => `N#CC${tail}`,
  (tail) => `C(C)(CC)${tail}`,
  (tail) => `CC(Br)C(C)${tail}`,
  (tail) => `C[C@H](Br)C(C)(C)${tail}`,
];
const knownTailKeys = new Set();
const TAIL_CANDIDATES = RAW_TAIL_CANDIDATES.filter((tail) => {
  // The tail is where the previous generator became visually crowded. Limit
  // it to at most two shallow branches; the latter are used sparingly for
  // familiar motifs such as a compact dimethylcycloalkyl group.
  if ((tail.match(/\(/g) ?? []).length > 2) return false;
  const key = inchiKey(`C${tail}`).split("-")[0];
  if (knownTailKeys.has(key)) return false;
  if (
    TAIL_TEST_CONTEXTS.some(
      (makeStructure) => !fitsCarbonLimit(makeStructure(tail)),
    )
  ) {
    return false;
  }
  knownTailKeys.add(key);
  return true;
});

if (TAIL_CANDIDATES.length < 50) {
  throw new Error(
    `Expected at least 50 readable carbon fragments; received ${TAIL_CANDIDATES.length}.`,
  );
}

let tailCursor = 0;

function takeTail() {
  return TAIL_CANDIDATES[tailCursor++ % TAIL_CANDIDATES.length];
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

  // A 50-question mechanism/difficulty set receives 50 different fragments.
  // The same familiar scaffold may intentionally reappear under different
  // reagents elsewhere in the bank so students can compare reaction outcomes
  // without the generator resorting to dense, highly branched structures.

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
    const tail = takeTail();
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
    const nucleophile =
      getSn1Nucleophile(`g-sn1-intro-${String(index).padStart(2, "0")}`) ??
      SN1_NUCLEOPHILES.water;
    const substrateSmiles =
      leavingGroup.id === "tosylate"
        ? `C(C)(C)(${tail})${leavingGroup.smiles}`
        : `${leavingGroup.smiles}C(C)(C)${tail}`;
    return {
      title: `Tertiary alkyl ${leavingGroup.label} solvolysis in ${nucleophile.label}`,
      substrate: `Tertiary alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      reagents: nucleophile.reagents,
      conditions: sn1SolvolysisConditions(nucleophile, "aqueous acetone"),
      prompt:
        "Draw the organic substitution product of this solvolysis. The displayed solvent is the nucleophile.",
      correctName: `the tertiary ${nucleophile.productType}`,
      explanation: `The tertiary ${leavingGroup.label} ionises in the polar protic medium. ${nucleophile.label} captures the carbocation, and deprotonation gives the ${nucleophile.productType}.`,
      productSmiles: `C(C)(C)(${nucleophile.oxygenFragment})${tail}`,
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
    const tail = takeTail();
    const leavingGroup = leavingGroupVariant(index);
    const nucleophile =
      getSn1Nucleophile(`g-sn1-inter-${String(index).padStart(2, "0")}`) ??
      SN1_NUCLEOPHILES.methanol;
    const substrateSmiles =
      leavingGroup.id === "tosylate"
        ? `C(C)(CC)(${tail})${leavingGroup.smiles}`
        : `${leavingGroup.smiles}C(C)(CC)${tail}`;
    return {
      title: `Highly substituted ${leavingGroup.label} in ${nucleophile.label}`,
      substrate: `Highly substituted alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      reagents: nucleophile.reagents,
      conditions: sn1SolvolysisConditions(nucleophile, "no added base"),
      prompt:
        "Draw the organic substitution product. The displayed solvent is the nucleophile.",
      correctName: `the tertiary ${nucleophile.productType}`,
      explanation: `Ionisation of the highly substituted ${leavingGroup.label} gives a stable tertiary carbocation. ${nucleophile.label} attacks that cation, giving the ${nucleophile.productType} after deprotonation.`,
      productSmiles: `C(C)(CC)(${nucleophile.oxygenFragment})${tail}`,
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
    const nucleophile =
      getSn1Nucleophile(`g-sn1-adv-${String(index).padStart(2, "0")}`) ??
      SN1_NUCLEOPHILES.water;
    const { leavingGroup, substrateSmiles } = secondarySubstrateSmiles(
      index,
      tail,
      (leavingGroupSmiles) => `CC(${leavingGroupSmiles})C(C)${tail}`,
    );
    return {
      title: `Secondary ${leavingGroup.label} requiring a hydride shift`,
      substrate: `Branched secondary alkyl ${leavingGroup.label} (see scheme)`,
      substrateSmiles,
      reagents: nucleophile.reagents,
      conditions: sn1SolvolysisConditions(nucleophile, "AgNO₃"),
      prompt:
        "Draw the organic substitution product. Consider the more stable carbocation that can form before the displayed solvent attacks.",
      correctName: `the rearranged tertiary ${nucleophile.productType}`,
      explanation: `Loss of the ${leavingGroup.label} first gives a secondary carbocation. A hydride shift forms the more stable tertiary carbocation, which is then trapped by ${nucleophile.label}. Deprotonation gives the rearranged ${nucleophile.productType}.`,
      productSmiles: `CCC(${nucleophile.oxygenFragment})(C)${tail}`,
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
    const tail = takeTail();
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
    const tail = takeTail();
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
    const tail = takeTail();
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
  `Generated ${questions.length} questions from ${TAIL_CANDIDATES.length} readable carbon fragments.`,
);
