import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import Indigo from "indigo-ketcher";

const root = resolve(import.meta.dirname, "..");
const temporary = mkdtempSync("/tmp/mixed-practice-check-");
try {
  for (const file of [
    "curated-practice-bank",
    "question-settings",
    "sn1-nucleophiles",
    "alkene-geometry",
    "questions",
    "expanded-practice-bank.generated",
    "expanded-answer-keys.generated.server",
    "answer-keys.server",
    "mixed-sn1-targets.server",
    "mixed-practice",
    "practice-selection",
    "practice-attempts",
  ]) {
    const output = ts
      .transpileModule(
        readFileSync(resolve(root, `src/lib/${file}.ts`), "utf8"),
        {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ES2022,
          },
        },
      )
      .outputText.replace(/from "\.\/([^"\n]+)"/g, 'from "./$1.mjs"');
    writeFileSync(resolve(temporary, `${file}.mjs`), output);
  }
  const load = (file) =>
    import(pathToFileURL(resolve(temporary, `${file}.mjs`)).href);
  const {
    PRACTICE_QUESTIONS,
    getQuestionMechanisms,
    getMechanismRevealLabel,
    getQuestionDifficulty,
    getQuestionReference,
  } = await load("questions");
  const { questionsForFilters, sessionQuestionsFor } =
    await load("practice-selection");
  const { gradeStructure, getAnswerTarget } = await load("answer-keys.server");
  const { MIXED_SN1_ELIMINATION_TARGETS } = await load(
    "mixed-sn1-targets.server",
  );
  const { recordPracticeAttempt, isPracticeQuestionFinished } =
    await load("practice-attempts");
  const { ALKENE_GEOMETRY_FEEDBACK } = await load("alkene-geometry");
  const mixedMode = { id: "mixed", mechanisms: ["SN1", "SN2", "E1", "E2"] };
  const mixed = questionsForFilters(mixedMode, "progressive");
  const sn1 = questionsForFilters(
    { id: "sn1", mechanisms: ["SN1"] },
    "progressive",
  );
  assert.equal(sn1.length, 30);
  assert.equal(mixed.length, 113);
  assert.equal(new Set(mixed.map((q) => q.id)).size, mixed.length);
  assert.ok(sn1.some((q) => q.id === "q34"));
  assert.ok(
    !mixed.some((q) => q.id === "q34"),
    "A substrate without a beta hydrogen must not be forced into elimination",
  );
  const mixedSn1 = mixed.filter((q) =>
    getQuestionMechanisms(q).includes("SN1"),
  );
  assert.equal(mixedSn1.length, 29);
  for (const question of mixedSn1) {
    assert.equal(question.mechanism, "SN1/E1");
    assert.equal(question.answerMode, "competition");
    assert.equal(getMechanismRevealLabel(question), "SN1 and E1");
    assert.equal(
      gradeStructure(
        question.id,
        getAnswerTarget(question.id, "substitution", "mixed").correct,
        "main",
        1,
        "mixed",
      ),
      null,
      "A substitution-only submission must not complete a Mixed solvolysis question",
    );
  }
  const expectedIds = sn1
    .filter((q) => q.mechanism === "SN1" && q.id !== "q34")
    .map((q) => q.id)
    .sort();
  assert.deepEqual(
    Object.keys(MIXED_SN1_ELIMINATION_TARGETS).sort(),
    expectedIds,
    "Every converted question needs an individual elimination key",
  );
  const fixtures = JSON.parse(
    readFileSync(
      resolve(root, "scripts/fixtures/mixed-sn1-elimination-products.json"),
      "utf8",
    ),
  );
  assert.deepEqual(fixtures.map((f) => f.id).sort(), expectedIds);
  const indigo = await Indigo();
  const options = new indigo.MapStringString();
  const wrongKey = "VNWKTOKETHGBQD-UHFFFAOYSA-N";
  let geometryChecks = 0;
  let productsChecked = 0;
  try {
    for (const fixture of fixtures) {
      const source = sn1.find((q) => q.id === fixture.id);
      const question = mixed.find((q) => q.id === fixture.id);
      assert.equal(source.answerMode === "competition", false);
      assert.equal(
        source.mechanism,
        "SN1",
        "Mixed presentation must not mutate the single-topic bank",
      );
      assert.equal(question.substrateSmiles, source.substrateSmiles);
      assert.equal(question.reagents, source.reagents);
      assert.equal(question.conditions, source.conditions);
      assert.equal(getQuestionReference(question), fixture.reference);
      assert.equal(
        getQuestionDifficulty(question),
        getQuestionDifficulty(source),
      );
      const substitutionKey = indigo.convert(
        fixture.substitutionSmiles,
        "inchi-key",
        options,
      );
      assert.equal(substitutionKey, fixture.substitutionKey);
      assert.equal(
        gradeStructure(source.id, substitutionKey, "main", 1, "sn1").verdict,
        "correct",
      );
      assert.equal(getAnswerTarget(source.id, "elimination", "sn1"), null);
      const substitution = gradeStructure(
        source.id,
        substitutionKey,
        "substitution",
        1,
        "mixed",
      );
      assert.equal(substitution.verdict, "correct");
      const eliminationTarget = getAnswerTarget(
        source.id,
        "elimination",
        "mixed",
      );
      assert.equal(
        question.alkeneGeometryMatters,
        eliminationTarget.requireStereo,
      );
      const accepted = [
        eliminationTarget,
        ...(eliminationTarget.alternatives ?? []),
      ];
      assert.equal(accepted.length, fixture.products.length);
      for (const product of fixture.products) {
        assert.ok(accepted.some((target) => target.correct === product.key));
        assert.equal(
          indigo.convert(product.smiles, "inchi-key", options),
          product.key,
          `${source.id}: RDKit/Indigo product mismatch`,
        );
        const grade = gradeStructure(
          source.id,
          product.key,
          "elimination",
          1,
          "mixed",
        );
        assert.equal(grade.verdict, "correct");
        assert.equal(
          grade.solution.smiles,
          product.smiles,
          "Show the accepted product the student actually drew",
        );
        assert.equal(grade.solution.name, product.name);
        if (product.geometryGraded) {
          geometryChecks += 1;
          assert.equal(
            indigo.convert(product.minorSmiles, "inchi-key", options),
            product.minorKey,
          );
          assert.notEqual(product.minorKey, product.key);
          for (const submitted of [
            product.minorKey,
            `${product.key.split("-")[0]}-UHFFFAOYSA-N`,
          ]) {
            const partial = gradeStructure(
              source.id,
              submitted,
              "elimination",
              1,
              "mixed",
            );
            assert.equal(partial.verdict, "partial");
            assert.equal(partial.message, ALKENE_GEOMETRY_FEEDBACK);
            assert.equal(partial.solution, undefined);
            const final = gradeStructure(
              source.id,
              submitted,
              "elimination",
              3,
              "mixed",
            );
            assert.equal(final.solution.smiles, product.smiles);
          }
        }
        productsChecked += 1;
      }
      const wrong = gradeStructure(
        source.id,
        wrongKey,
        "elimination",
        1,
        "mixed",
      );
      let state = recordPracticeAttempt(undefined, {
        kind: "competition",
        substitution,
        elimination: wrong,
      });
      assert.equal(state.latestAttempt, "partial");
      assert.equal(state.attempts, 1);
      assert.equal(isPracticeQuestionFinished(state), false);
      const elimination = gradeStructure(
        source.id,
        eliminationTarget.correct,
        "elimination",
        2,
        "mixed",
      );
      state = recordPracticeAttempt(state, {
        kind: "competition",
        substitution,
        elimination,
      });
      assert.equal(state.latestAttempt, "correct");
      assert.equal(state.firstAttempt, "partial");
      assert.equal(state.attempts, 2);
      assert.equal(isPracticeQuestionFinished(state), true);
      for (const slot of ["substitution", "elimination"]) {
        for (const attempt of [1, 2, 3]) {
          const grade = gradeStructure(
            source.id,
            wrongKey,
            slot,
            attempt,
            "mixed",
          );
          assert.equal(Boolean(grade.solution), attempt === 3);
        }
      }
    }
  } finally {
    options.delete();
  }
  for (const difficulty of [
    "introductory",
    "intermediate",
    "advanced",
    "progressive",
  ]) {
    const available = questionsForFilters(mixedMode, difficulty);
    for (const length of [5, 10, 25, 30, 50, "all"]) {
      const session = sessionQuestionsFor(available, difficulty, length);
      assert.equal(new Set(session.map((q) => q.id)).size, session.length);
      assert.equal(
        session.length,
        length === "all"
          ? available.length
          : Math.min(length, available.length),
      );
      assert.ok(
        session.every((q) => q.mechanism !== "SN1"),
        "A Mixed session retained an SN1-only presentation",
      );
      if (difficulty === "progressive") {
        const ranks = session.map((q) =>
          ["introductory", "intermediate", "advanced"].indexOf(
            getQuestionDifficulty(q),
          ),
        );
        assert.deepEqual(
          ranks,
          [...ranks].sort((a, b) => a - b),
        );
      }
      if (
        session.length >= 10 &&
        ["progressive", "advanced"].includes(difficulty)
      )
        assert.ok(session.some((q) => ["q58", "q59"].includes(q.id)));
    }
  }
  for (const mode of ["sn1", "substitution"]) {
    const mechanisms = mode === "sn1" ? ["SN1"] : ["SN1", "SN2"];
    assert.equal(
      questionsForFilters({ id: mode, mechanisms }, "progressive").find(
        (q) => q.id === "q32",
      ).answerMode === "competition",
      false,
    );
  }
  assert.equal(getAnswerTarget("q34", "substitution", "mixed"), null);
  assert.equal(getAnswerTarget("q2", "substitution", "mixed"), null);
  assert.equal(
    PRACTICE_QUESTIONS.length,
    114,
    "Keep all dedicated topic-bank questions",
  );
  console.log(
    `Mixed practice verified: ${mixedSn1.length} SN1/E1 questions; ${productsChecked} new elimination products, ${geometryChecks} E/Z alternatives, both-product grading, three attempts, topic isolation, and Progressive/E2 coverage.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
