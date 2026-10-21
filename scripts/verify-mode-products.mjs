import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const temporary = mkdtempSync("/tmp/practice-mode-products-");
try {
  for (const name of [
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
    const source = readFileSync(resolve(root, `src/lib/${name}.ts`), "utf8");
    const output = ts
      .transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
        },
      })
      .outputText.replace(/from "\.\/([^"\n]+)"/g, 'from "./$1.mjs"');
    writeFileSync(resolve(temporary, `${name}.mjs`), output);
  }
  const load = (name) =>
    import(pathToFileURL(resolve(temporary, `${name}.mjs`)).href);
  const { QUESTIONS, getQuestionReference, getMechanismRevealLabel } =
    await load("questions");
  const { questionsForFilters, sessionQuestionsFor } =
    await load("practice-selection");
  const { ANSWER_KEYS, getAnswerTarget, gradeStructure } =
    await load("answer-keys.server");
  const { recordPracticeAttempt, isPracticeQuestionFinished } =
    await load("practice-attempts");
  const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  const keys = new Map(ANSWER_KEYS.map((key) => [key.id, key]));
  const sn1 = questionsForFilters(
    { id: "sn1", mechanisms: ["SN1"] },
    "advanced",
  );
  const reported = sn1.find((q) => q.id === "q80");
  assert.equal(
    reported.answerMode,
    "single",
    "RXN-0080 must show one substitution editor in SN1 practice",
  );
  assert.equal(reported.mechanism, "SN1");
  assert.equal(reported.alkeneGeometryMatters, false);
  assert.doesNotMatch(reported.prompt, /both|elimination|alkene/i);
  assert.equal(getMechanismRevealLabel(reported), "SN1");
  assert.equal(getQuestionReference(reported), "RXN-0080");

  const modes = [
    { id: "sn1", mechanisms: ["SN1"], slot: "substitution" },
    { id: "sn2", mechanisms: ["SN2"], slot: "substitution" },
    { id: "e1", mechanisms: ["E1"], slot: "elimination" },
    { id: "e2", mechanisms: ["E2"], slot: "elimination" },
    { id: "substitution", mechanisms: ["SN1", "SN2"], slot: "substitution" },
    { id: "elimination", mechanisms: ["E1", "E2"], slot: "elimination" },
    { id: "mixed", mechanisms: ["SN1", "SN2", "E1", "E2"] },
  ];
  let singleChecks = 0;
  let pairChecks = 0;
  const wrongKey = "VNWKTOKETHGBQD-UHFFFAOYSA-N";
  for (const mode of modes) {
    const presented = questionsForFilters(mode, "progressive");
    const inferred = questionsForFilters(
      { mechanisms: mode.mechanisms },
      "progressive",
    );
    assert.deepEqual(
      inferred,
      presented,
      `${mode.id}: filtering without an explicit ID must use the same presentation`,
    );
    for (const question of presented) {
      const source = byId.get(question.id);
      if (mode.slot) {
        assert.notEqual(
          question.answerMode,
          "competition",
          `${question.id}/${mode.id}: unexpected second editor`,
        );
        assert.ok(mode.mechanisms.includes(question.mechanism));
        const originalKey = keys.get(question.id);
        const expected =
          "correct" in originalKey ? originalKey : originalKey[mode.slot];
        const selected = getAnswerTarget(question.id, "main", mode.id);
        assert.equal(selected.correct, expected.correct);
        const grade = gradeStructure(
          question.id,
          selected.correct,
          "main",
          1,
          mode.id,
        );
        assert.equal(grade.verdict, "correct");
        assert.equal(grade.solution.smiles, selected.correctSmiles);
        const finished = recordPracticeAttempt(undefined, {
          kind: "single",
          grade,
        });
        assert.equal(finished.attempts, 1);
        assert.equal(finished.latestAttempt, "correct");
        assert.equal(isPracticeQuestionFinished(finished), true);
        const oppositeSlot =
          mode.slot === "substitution" ? "elimination" : "substitution";
        assert.equal(
          getAnswerTarget(question.id, oppositeSlot, mode.id),
          null,
          "A stale hidden editor must not be gradable in the selected mode",
        );
        if (source.answerMode === "competition") {
          assert.equal(question.answerMode, "single");
          assert.match(question.prompt, new RegExp(mode.slot));
          assert.doesNotMatch(question.prompt, /draw both/i);
          const other = originalKey[oppositeSlot];
          assert.notEqual(
            gradeStructure(question.id, other.correct, "main", 1, mode.id)
              ?.verdict,
            "correct",
          );
          const final = gradeStructure(
            question.id,
            wrongKey,
            "main",
            3,
            mode.id,
          );
          assert.equal(final.solution.smiles, selected.correctSmiles);
          if (["q89", "q90"].includes(question.id)) {
            assert.match(question.prompt, /only the ring-expansion pathway/i);
          }
        }
        singleChecks += 1;
      } else if (question.answerMode === "competition") {
        assert.equal(getAnswerTarget(question.id, "main", mode.id), null);
        const substitution = getAnswerTarget(
          question.id,
          "substitution",
          mode.id,
        );
        const elimination = getAnswerTarget(
          question.id,
          "elimination",
          mode.id,
        );
        assert.ok(substitution?.correctSmiles && elimination?.correctSmiles);
        const partial = recordPracticeAttempt(undefined, {
          kind: "competition",
          substitution: gradeStructure(
            question.id,
            substitution.correct,
            "substitution",
            1,
            mode.id,
          ),
          elimination: gradeStructure(
            question.id,
            wrongKey,
            "elimination",
            1,
            mode.id,
          ),
        });
        assert.equal(partial.latestAttempt, "partial");
        assert.equal(isPracticeQuestionFinished(partial), false);
        pairChecks += 1;
      } else {
        assert.ok(getAnswerTarget(question.id, "main", mode.id));
      }
      assert.equal(
        getQuestionReference(question),
        getQuestionReference(source),
      );
    }
    assert.equal(
      new Set(
        sessionQuestionsFor(presented, "progressive", "all").map((q) => q.id),
      ).size,
      presented.length,
    );
  }

  // The same source remains a two-product problem in Mixed, including its
  // alkene geometry requirement, without mutating the instructor bank record.
  const mixed = questionsForFilters(modes.at(-1), "advanced").find(
    (q) => q.id === "q80",
  );
  assert.equal(mixed.answerMode, "competition");
  assert.equal(mixed.alkeneGeometryMatters, true);
  assert.equal(byId.get("q80").answerMode, "competition");
  assert.equal(byId.get("q80").mechanism, "SN1/E1");
  const e1 = questionsForFilters(modes[2], "advanced").find(
    (q) => q.id === "q80",
  );
  assert.equal(e1.mechanism, "E1");
  assert.equal(e1.alkeneGeometryMatters, true);
  assert.doesNotMatch(e1.prompt, /substitution/i);
  assert.equal(getAnswerTarget("q80", "main", "sn2"), null);
  assert.equal(getAnswerTarget("q2", "main", "sn1"), null);
  console.log(
    `Practice-mode products verified: ${singleChecks} single-path presentations, ${pairChecks} Mixed competition questions, mode-specific keys, three-attempt model answers, ring-expansion instructions, stable serials, and report credit.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
