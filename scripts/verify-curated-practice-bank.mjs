import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import Indigo from "indigo-ketcher";

const root = resolve(import.meta.dirname, "..");
const temporaryModules = mkdtempSync(resolve(tmpdir(), "reaction-bank-check-"));
const files = [
  "curated-practice-bank",
  "question-settings",
  "sn1-nucleophiles",
  "alkene-geometry",
  "scheme-abbreviations",
  "questions",
  "expanded-practice-bank.generated",
  "answer-keys.server",
  "expanded-answer-keys.generated.server",
  "practice-selection",
];

try {
  // Compile only the data and selection modules so the same checks run in the
  // Cloudflare build without loading React, Ketcher, or server request handlers.
  for (const file of files) {
    const source = readFileSync(resolve(root, `src/lib/${file}.ts`), "utf8");
    const compiled = ts
      .transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
        },
      })
      .outputText.replace(/from "\.\/([^"\n]+)"/g, 'from "./$1.mjs"');
    writeFileSync(resolve(temporaryModules, `${file}.mjs`), compiled);
  }
  const load = (file) =>
    import(pathToFileURL(resolve(temporaryModules, `${file}.mjs`)).href);
  const { CURATED_PRACTICE_BANK, CURATED_QUESTION_LEVELS } = await load(
    "curated-practice-bank",
  );
  const {
    QUESTIONS,
    PRACTICE_QUESTIONS,
    getQuestionDifficulty,
    getQuestionMechanisms,
    getQuestionReference,
  } = await load("questions");
  const { DISABLED_QUESTION_IDS } = await load("question-settings");
  const { getSchemeDisplaySmiles, TOSYLATE_DISPLAY_ATOM } = await load(
    "scheme-abbreviations",
  );
  const { SN1_NUCLEOPHILE_ASSIGNMENTS, SN1_NUCLEOPHILES } =
    await load("sn1-nucleophiles");
  const { ANSWER_KEYS, gradeStructure } = await load("answer-keys.server");
  const { ALKENE_GEOMETRY_FEEDBACK } = await load("alkene-geometry");
  const { questionsForFilters, sessionQuestionsFor } =
    await load("practice-selection");
  const byId = new Map(QUESTIONS.map((question) => [question.id, question]));
  const answers = new Map(ANSWER_KEYS.map((answer) => [answer.id, answer]));
  assert.equal(byId.size, QUESTIONS.length, "Duplicate authored question IDs");
  assert.equal(answers.size, ANSWER_KEYS.length, "Duplicate answer-key IDs");
  assert.equal(
    CURATED_QUESTION_LEVELS.size,
    114,
    "Expected 114 distinct questions, including six shared competition questions",
  );

  const quotas = { introductory: 5, intermediate: 10, advanced: 15 };
  const counts = {};
  for (const [mechanism, levels] of Object.entries(CURATED_PRACTICE_BANK)) {
    const ids = Object.values(levels).flat();
    assert.equal(new Set(ids).size, 30, `${mechanism}: duplicate selection`);
    counts[mechanism] = {};
    for (const [level, selected] of Object.entries(levels)) {
      assert.equal(
        selected.length,
        quotas[level],
        `${mechanism}: wrong ${level} quota`,
      );
      for (const id of selected) {
        const question = byId.get(id);
        assert.ok(question, `Missing curated question ${id}`);
        assert.ok(
          getQuestionMechanisms(question).includes(mechanism),
          `${id} does not cover ${mechanism}`,
        );
        assert.equal(
          getQuestionDifficulty(question),
          level,
          `${id}: wrong difficulty`,
        );
      }
      const available = questionsForFilters({ mechanisms: [mechanism] }, level);
      const expectedActive = selected.filter(
        (id) => !DISABLED_QUESTION_IDS.has(id),
      );
      assert.deepEqual(
        available.map((question) => question.id).sort(),
        [...expectedActive].sort(),
      );
      counts[mechanism][level] = available.length;
    }
  }

  const protectedIds = [
    "q55",
    "q56",
    "q57",
    "q58",
    "q59", // constrained and E/Z E2
    "q72",
    "q73",
    "q74",
    "q75",
    "q76",
    "q77", // rearrangements
    "q78",
    "q79",
    "q80",
    "q81",
    "q82",
    "q83", // competition
    "q5",
    "q84",
    "q86",
    "q87", // existing inversion exercises
  ];
  for (const id of protectedIds)
    assert.ok(CURATED_QUESTION_LEVELS.has(id), `Lost protected problem ${id}`);
  assert.equal(getQuestionReference(byId.get("q58")), "RXN-0058");
  assert.equal(getQuestionReference(byId.get("q83")), "RXN-0083");

  for (const question of QUESTIONS) {
    const answer = answers.get(question.id);
    if (
      !CURATED_QUESTION_LEVELS.has(question.id) ||
      DISABLED_QUESTION_IDS.has(question.id)
    ) {
      if (answer) {
        const slot = "correct" in answer ? "main" : "substitution";
        const target = slot === "main" ? answer : answer.substitution;
        assert.equal(
          gradeStructure(question.id, target.correct, slot),
          null,
          `Archived problem ${question.id} is still gradable`,
        );
      }
      continue;
    }
    assert.equal(
      question.format,
      "scheme",
      `${question.id}: missing reaction scheme`,
    );
    assert.ok(
      question.substrateSmiles,
      `${question.id}: missing substrate drawing`,
    );
    assert.ok(answer, `${question.id}: missing grading key`);
    const slots =
      question.answerMode === "competition"
        ? ["substitution", "elimination"]
        : ["main"];
    for (const slot of slots) {
      const target = slot === "main" ? answer : answer[slot];
      assert.ok(target?.correct, `${question.id}: missing ${slot} key`);
      assert.equal(
        gradeStructure(question.id, target.correct, slot)?.verdict,
        "correct",
      );
      if (question.stereochemistryMatters) {
        assert.equal(
          target.requireStereo,
          true,
          `${question.id}: stereochemistry grading lost`,
        );
        const unspecified = `${target.correct.split("-")[0]}-UHFFFAOYSA-N`;
        assert.equal(
          gradeStructure(question.id, unspecified, slot)?.verdict,
          "partial",
        );
      }
    }
  }

  const modes = [
    ["SN1"],
    ["SN2"],
    ["E1"],
    ["E2"],
    ["SN1", "SN2"],
    ["E1", "E2"],
    ["SN1", "SN2", "E1", "E2"],
  ];
  const specificGeometryE2Ids = new Set(["q58", "q59"]);
  function assertE2GeometryCoverage(session, available, difficulty) {
    if (
      session.length >= 10 &&
      ["progressive", "advanced"].includes(difficulty) &&
      available.some((question) => specificGeometryE2Ids.has(question.id))
    ) {
      assert.ok(
        session.some((question) => specificGeometryE2Ids.has(question.id)),
        `${difficulty} set of ${session.length} omitted the E/Z-specific E2 problems`,
      );
    }
  }
  for (const mechanisms of modes) {
    for (const difficulty of ["progressive", ...Object.keys(quotas)]) {
      const available = questionsForFilters({ mechanisms }, difficulty);
      for (const length of [5, 10, 25, 30, 50, "all"]) {
        for (const randomize of [false, true]) {
          const session = sessionQuestionsFor(
            available,
            difficulty,
            length,
            randomize,
          );
          assert.equal(
            session.length,
            length === "all"
              ? available.length
              : Math.min(length, available.length),
          );
          assert.equal(
            new Set(session.map((question) => question.id)).size,
            session.length,
            "Repeated problem in session",
          );
          assertE2GeometryCoverage(session, available, difficulty);
          if (difficulty === "progressive") {
            const ranks = session.map((question) =>
              Object.keys(quotas).indexOf(getQuestionDifficulty(question)),
            );
            assert.deepEqual(
              ranks,
              [...ranks].sort((a, b) => a - b),
              "Progressive session went backwards in difficulty",
            );
          }
        }
      }
    }
  }
  assert.deepEqual(sessionQuestionsFor([], "progressive", 10), []);

  // Exercise many reproducible shuffles, including mixed banks where the two
  // E/Z-specific problems would otherwise be easy to miss in a short session.
  const originalRandom = Math.random;
  try {
    for (let seed = 1; seed <= 40; seed += 1) {
      let state = seed;
      Math.random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 2 ** 32;
      };
      for (const mechanisms of modes) {
        for (const difficulty of ["progressive", "advanced"]) {
          const available = questionsForFilters({ mechanisms }, difficulty);
          for (const length of [10, 25, 30, 50, "all"]) {
            const session = sessionQuestionsFor(available, difficulty, length);
            assertE2GeometryCoverage(session, available, difficulty);
            assert.equal(
              session.length,
              length === "all"
                ? available.length
                : Math.min(length, available.length),
            );
            assert.equal(
              new Set(session.map((question) => question.id)).size,
              session.length,
            );
            assert.ok(
              session.every((question) => available.includes(question)),
              "Coverage added a problem outside the filtered bank",
            );
            if (difficulty === "progressive") {
              const ranks = session.map((question) =>
                Object.keys(quotas).indexOf(getQuestionDifficulty(question)),
              );
              assert.deepEqual(
                ranks,
                [...ranks].sort((a, b) => a - b),
              );
            }
          }
        }
      }
    }
  } finally {
    Math.random = originalRandom;
  }

  // Confirm the boundary and the replacement path without relying on luck.
  const advancedE2 = questionsForFilters({ mechanisms: ["E2"] }, "advanced");
  const ordinaryFirst = [
    ...advancedE2.filter((question) => !specificGeometryE2Ids.has(question.id)),
    ...advancedE2.filter((question) => specificGeometryE2Ids.has(question.id)),
  ];
  assert.deepEqual(
    sessionQuestionsFor(ordinaryFirst, "advanced", 5, false),
    ordinaryFirst.slice(0, 5),
  );
  const coveredTen = sessionQuestionsFor(ordinaryFirst, "advanced", 10, false);
  assertE2GeometryCoverage(coveredTen, ordinaryFirst, "advanced");
  assert.deepEqual(coveredTen.slice(0, 9), ordinaryFirst.slice(0, 9));
  const noEligibleE2 = ordinaryFirst.filter(
    (question) => !specificGeometryE2Ids.has(question.id),
  );
  assert.deepEqual(
    sessionQuestionsFor(noEligibleE2, "advanced", 10, false),
    noEligibleE2.slice(0, 10),
  );
  console.log(
    "E2 geometry coverage verified: qualifying Progressive/Advanced sets, 40 seeded shuffles, filters, order, and 5-question boundary.",
  );

  // Solvent choices and the corresponding answer keys must change together.
  // All six choices appear five times, including shared SN1/E1 problems.
  const sn1Ids = Object.values(CURATED_PRACTICE_BANK.SN1).flat();
  assert.deepEqual(
    Object.keys(SN1_NUCLEOPHILE_ASSIGNMENTS).sort(),
    [...sn1Ids].sort(),
    "Solvent assignments must cover exactly the curated SN1 bank",
  );
  const solventCounts = Object.fromEntries(
    Object.keys(SN1_NUCLEOPHILES).map((name) => [name, 0]),
  );
  for (const id of sn1Ids) {
    const solventId = SN1_NUCLEOPHILE_ASSIGNMENTS[id];
    const solvent = SN1_NUCLEOPHILES[solventId];
    const question = byId.get(id);
    solventCounts[solventId] += 1;
    assert.equal(
      question.reagents,
      solvent.reagents,
      `${id}: wrong nucleophile`,
    );
    assert.ok(question.conditions.includes("Δ"), `${id}: heat notation lost`);
    assert.doesNotMatch(
      question.conditions,
      /°\s*C/,
      `${id}: numeric temperature`,
    );
    if (solventId !== "water") {
      assert.ok(question.conditions.includes(`${solvent.label} (solvent)`));
      assert.doesNotMatch(question.conditions, /aqueous|water/i);
      assert.doesNotMatch(question.prompt, /water attacks|Methanol is/);
      assert.doesNotMatch(question.title, /hydrolysis/i);
    }
  }
  for (const count of Object.values(solventCounts)) assert.equal(count, 5);

  // Regression checks for the two retained drawings whose old keys contained
  // the wrong number of carbons. Chemistry software derives these fingerprints
  // directly from independently written product structures.
  const indigo = await Indigo();
  const options = new indigo.MapStringString();
  try {
    // Independently enumerated with RDKit, then checked here using the same
    // Indigo chemistry engine as Ketcher. Cover every active E1 target,
    // including only the elimination slot of shared SN1/E1 questions.
    const e1Products = JSON.parse(
      readFileSync(resolve(root, "scripts/fixtures/e1-major-products.json"), "utf8"),
    );
    assert.deepEqual(
      e1Products.map((product) => product.id).sort(),
      Object.values(CURATED_PRACTICE_BANK.E1).flat().slice().sort(),
      "Independent E1 product checks must cover the entire active E1 bank",
    );
    let geometryChecks = 0;
    for (const product of e1Products) {
      const question = byId.get(product.id);
      const answer = answers.get(product.id);
      const target = product.slot === "main" ? answer : answer[product.slot];
      const majorKey = indigo.convert(product.productSmiles, "inchi-key", options);
      assert.equal(majorKey, product.expectedKey, `${product.id}: RDKit/Indigo disagreement`);
      assert.equal(target.correct, majorKey, `${product.id}: wrong E1 major-product key`);
      assert.equal(target.requireStereo, product.geometryGraded);
      assert.equal(Boolean(question.alkeneGeometryMatters), product.geometryGraded);
      assert.equal(gradeStructure(product.id, majorKey, product.slot)?.verdict, "correct");
      if (!product.geometryGraded) continue;
      geometryChecks += 1;
      const minorKey = indigo.convert(product.minorProductSmiles, "inchi-key", options);
      assert.equal(minorKey, product.minorKey, `${product.id}: wrong Z reference`);
      assert.equal(minorKey.split("-")[0], majorKey.split("-")[0]);
      assert.notEqual(minorKey, majorKey);
      for (const submitted of [minorKey, `${majorKey.split("-")[0]}-UHFFFAOYSA-N`]) {
        const result = gradeStructure(product.id, submitted, product.slot);
        assert.equal(result?.verdict, "partial", `${product.id}: Z/unspecified geometry accepted`);
        assert.equal(result.message, ALKENE_GEOMETRY_FEEDBACK);
        assert.doesNotMatch(result.message, /wedge|dash|reacting carbon/i);
      }
      if (product.slot === "elimination") {
        assert.equal(answer.substitution.requireStereo, false);
        assert.equal(gradeStructure(product.id, answer.substitution.correct, "substitution")?.verdict, "correct");
      }
    }
    assert.equal(geometryChecks, 8);
    console.log(`E1 major products verified: ${e1Products.length}; E/Z grading: ${geometryChecks}.`);

    let tosylateDrawings = 0;
    for (const question of PRACTICE_QUESTIONS) {
      const original = question.substrateSmiles;
      const display = getSchemeDisplaySmiles(original);
      if (!original.includes("S(=O)") && !original.includes("S(=O)(=O)")) {
        assert.equal(
          display,
          original,
          `${question.id}: non-tosylate drawing changed`,
        );
      }
      if (!display.includes(TOSYLATE_DISPLAY_ATOM)) continue;
      tosylateDrawings += 1;
      assert.ok(
        display.length < original.length,
        `${question.id}: group not shortened`,
      );
      // Re-expand at the retained oxygen using a branch. This independent
      // molecular comparison checks attachment position and full stereochemistry
      // for leading sulfonate, branch, terminal, and cyclic encodings alike.
      const restored = display.replaceAll(
        TOSYLATE_DISPLAY_ATOM,
        "O(S(=O)(=O)c%99ccc(C)cc%99)",
      );
      assert.equal(
        indigo.convert(restored, "inchi-key", options),
        indigo.convert(original, "inchi-key", options),
        `${question.id}: abbreviation changed connectivity or stereochemistry`,
      );
    }
    assert.ok(tosylateDrawings > 0, "No active tosylate schemes were checked");
    console.log(`Compact tosylate drawings verified: ${tosylateDrawings}.`);

    for (const [id, slot, smiles] of [
      ["q69", "main", "N#CCCC1CC1"],
      ["q83", "substitution", "CC(OCC)C(C)c1ccccc1"],
      ["q83", "elimination", "CC=C(C)c1ccccc1"],
      ["q5", "main", "C[C@@H](O)CC"],
    ]) {
      const key = indigo.convert(smiles, "inchi-key", options);
      assert.equal(
        gradeStructure(id, key, slot)?.verdict,
        "correct",
        `${id}: correctly drawn ${slot} product was rejected`,
      );
    }

    // Independently written products, rather than the generator's templates:
    // water gives an alcohol; each alcohol solvent contributes its alkyl group
    // through oxygen. In rearrangements the oxygen bonds to the new cation site.
    // Test a wrong-solvent product for every question to catch label-only edits.
    const sn1Products = [
      ["g-sn1-intro-07", "CC(O)(C)C", "CC(OC)(C)C"],
      ["g-sn1-intro-08", "CC(OC)(C)CC", "CC(O)(C)CC"],
      ["g-sn1-intro-09", "CC(OCC)(C)CCC", "CC(O)(C)CCC"],
      ["g-sn1-intro-10", "CC(OCCC)(C)CCCC", "CC(O)(C)CCCC"],
      ["g-sn1-intro-11", "CC(OC(C)C)(C)CCCCC", "CC(O)(C)CCCCC"],
      ["q32", "CCCCOC(C)c1ccccc1", "CC(O)c1ccccc1"],
      ["q33", "CC(O)(C)c1ccccc1", "CC(OC)(C)c1ccccc1"],
      ["q35", "COC1(C)CCCC1", "CC1(O)CCCC1"],
      ["q36", "CCOC1(CC)CCCCC1", "CCC1(O)CCCCC1"],
      ["q37", "CCCOC1(c2ccccc2)CCCCC1", "OC1(c2ccccc2)CCCCC1"],
      ["q38", "CC(C)OC1(CC)CCCC1", "CCC1(O)CCCC1"],
      ["q39", "CCCCOC1(CCC)CCCC1", "CCCC1(O)CCCC1"],
      ["g-sn1-inter-09", "CCC(O)(C)C", "CCC(OC)(C)C"],
      ["g-sn1-inter-10", "CCC(OC)(C)CC", "CCC(O)(C)CC"],
      ["g-sn1-inter-11", "CCC(OCC)(C)CCC", "CCC(O)(C)CCC"],
      ["q34", "CCCOC(c1ccccc1)c1ccccc1", "OC(c1ccccc1)c1ccccc1"],
      ["q72", "CCCCCC(C)(C)OC(C)C", "CC(O)(C)CCCCC"],
      ["q73", "CCCC(C)C(C)(C)OCCCC", "CC(O)(C)C(C)CCC"],
      ["q74", "CCC(O)(C)CCCC", "CCC(OC)(C)CCCC"],
      ["q78", "CCCCCCC(C)(C)OC", "CC(O)(C)CCCCCC"],
      ["q79", "CCOC1(C(C)(C)C)CCCCCC1", "CC(C)(C)C1(O)CCCCCC1"],
      ["q80", "CCCOC(C)(CC)c1ccccc1", "CC(O)(c1ccccc1)CC"],
      ["g-sn1-adv-11", "CCC(OC(C)C)(C)C", "CCC(O)(C)C"],
      ["g-sn1-adv-12", "CCC(OCCCC)(C)CC", "CCC(O)(C)CC"],
      ["g-sn1-adv-13", "CCC(O)(C)CCC", "CCC(OC)(C)CCC"],
      ["g-sn1-adv-14", "CCC(OC)(C)CCCC", "CCC(O)(C)CCCC"],
      ["g-sn1-adv-15", "CCC(OCC)(C)CCCCC", "CCC(O)(C)CCCCC"],
      ["g-sn1-adv-19", "CCC(OCCC)(C)CC(C)CC", "CCC(O)(C)CC(C)CC"],
      ["g-sn1-adv-20", "CCC(OC(C)C)(C)CC(C)CCC", "CCC(O)(C)CC(C)CCC"],
      ["g-sn1-adv-21", "CCC(OCCCC)(C)CCCC(C)C", "CCC(O)(C)CCCC(C)C"],
    ];
    assert.deepEqual(
      sn1Products.map(([id]) => id).sort(),
      [...sn1Ids].sort(),
      "Every curated SN1 structure must have an independent product check",
    );
    for (const [id, product, wrongSolventProduct] of sn1Products) {
      const slot =
        byId.get(id).answerMode === "competition" ? "substitution" : "main";
      assert.equal(
        gradeStructure(id, indigo.convert(product, "inchi-key", options), slot)
          ?.verdict,
        "correct",
        `${id}: correctly drawn solvent-derived product was rejected`,
      );
      assert.equal(
        gradeStructure(
          id,
          indigo.convert(wrongSolventProduct, "inchi-key", options),
          slot,
        )?.verdict,
        "incorrect",
        `${id}: product from the wrong nucleophile was accepted`,
      );
    }
    for (const [id, unrearranged] of [
      ["q72", "CC(C)C(OC(C)C)CCCC"],
      ["q73", "CC(C)(C)C(OCCCC)CCC"],
    ]) {
      const result = gradeStructure(
        id,
        indigo.convert(unrearranged, "inchi-key", options),
      );
      assert.equal(result?.verdict, "incorrect");
      assert.match(
        result?.feedback ?? result?.message ?? "",
        /unrearranged ether/i,
      );
    }
    // Solvent changes preserve competition alkene connectivity; the major
    // geometry is required where the elimination product has E/Z isomers.
    for (const [id, alkene] of [
      ["q78", "CC(C)=CCCCCC"],
      ["q79", "CC(C)(C)C1=CCCCCC1"],
      ["q80", "C/C=C(\\C)c1ccccc1"],
    ]) {
      assert.equal(
        gradeStructure(
          id,
          indigo.convert(alkene, "inchi-key", options),
          "elimination",
        )?.verdict,
        "correct",
      );
    }
  } finally {
    options.delete();
  }

  console.log(
    `Curated bank verified: ${PRACTICE_QUESTIONS.length} active distinct questions.`,
  );
  console.log(JSON.stringify(counts));
  console.log(`SN1 nucleophiles verified: ${JSON.stringify(solventCounts)}`);
} finally {
  rmSync(temporaryModules, { recursive: true, force: true });
}
