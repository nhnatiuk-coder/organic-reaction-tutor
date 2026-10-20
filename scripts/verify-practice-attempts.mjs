import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import Indigo from "indigo-ketcher";

const root = resolve(import.meta.dirname, "..");
const temporary = mkdtempSync("/tmp/practice-attempt-check-");
try {
  for (const file of [
    "curated-practice-bank",
    "question-settings",
    "sn1-nucleophiles",
    "alkene-geometry",
    "questions",
    "expanded-practice-bank.generated",
    "answer-keys.server",
    "expanded-answer-keys.generated.server",
    "practice-attempts",
    "practice-report",
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
  const load = (name) =>
    import(pathToFileURL(resolve(temporary, `${name}.mjs`)).href);
  const {
    MAX_PRACTICE_ATTEMPTS,
    isPracticeQuestionFinished,
    recordPracticeAttempt,
  } = await load("practice-attempts");
  const { ANSWER_KEYS, gradeStructure } = await load("answer-keys.server");
  const { PRACTICE_QUESTIONS } = await load("questions");
  const { summarizePracticeReport } = await load("practice-report");
  assert.equal(MAX_PRACTICE_ATTEMPTS, 3);
  const wrongKey = "VNWKTOKETHGBQD-UHFFFAOYSA-N"; // Methane, never a bank product.
  const indigo = await Indigo();
  const options = new indigo.MapStringString();
  let productCount = 0;
  try {
    for (const question of PRACTICE_QUESTIONS) {
      const key = ANSWER_KEYS.find((answer) => answer.id === question.id);
      const slots =
        "correct" in key ? ["main"] : ["substitution", "elimination"];
      let state;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const grades = slots.map((slot) => {
          const target = slot === "main" ? key : key[slot];
          const grade = gradeStructure(question.id, wrongKey, slot, attempt);
          assert.equal(grade.verdict, "incorrect");
          if (attempt < 3)
            assert.equal(
              grade.solution,
              undefined,
              `${question.id}: answer revealed early`,
            );
          else {
            assert.ok(
              grade.solution?.smiles,
              `${question.id}: missing model structure`,
            );
            assert.equal(grade.solution.name, target.correctName);
            const drawnKey = indigo.convert(
              grade.solution.smiles,
              "inchi-key",
              options,
            );
            assert.equal(
              target.requireStereo ? drawnKey : drawnKey.split("-")[0],
              target.requireStereo
                ? target.correct
                : target.correct.split("-")[0],
              `${question.id} ${slot}: revealed diagram differs from grading key`,
            );
            assert.equal(
              gradeStructure(question.id, drawnKey, slot).verdict,
              "correct",
            );
            productCount += 1;
          }
          return grade;
        });
        const result =
          slots.length === 1
            ? { kind: "single", grade: grades[0] }
            : {
                kind: "competition",
                substitution: grades[0],
                elimination: grades[1],
              };
        state = recordPracticeAttempt(state, result);
        assert.equal(
          state.attempts,
          attempt,
          "A two-product submission counts once",
        );
        assert.equal(isPracticeQuestionFinished(state), attempt === 3);
      }
      const afterLimit = recordPracticeAttempt(state, {
        kind: "single",
        grade: { verdict: "correct" },
      });
      assert.equal(
        afterLimit,
        state,
        "Revisiting or checking again must not reset a completed problem",
      );
      assert.equal(
        afterLimit.latestAttempt,
        "incorrect",
        "Revealing an answer must not award credit",
      );
      assert.throws(() => gradeStructure(question.id, wrongKey, slots[0], 4));
      const correctGrades = slots.map((slot) =>
        gradeStructure(
          question.id,
          (slot === "main" ? key : key[slot]).correct,
          slot,
          1,
        ),
      );
      for (const slot of slots) {
        const target = slot === "main" ? key : key[slot];
        for (const attempt of [1, 2, 3]) {
          const correct = gradeStructure(
            question.id,
            target.correct,
            slot,
            attempt,
          );
          assert.equal(correct.verdict, "correct");
          assert.deepEqual(
            correct.solution,
            {
              name: target.correctName,
              smiles: target.correctSmiles,
            },
            `${question.id} ${slot}: correct attempt ${attempt} did not return its model product`,
          );
        }
        if (target.requireStereo) {
          const unspecified = `${target.correct.split("-")[0]}-UHFFFAOYSA-N`;
          const partial = gradeStructure(question.id, unspecified, slot, 1);
          assert.equal(partial.verdict, "partial");
          assert.equal(
            partial.solution,
            undefined,
            "Incomplete stereochemistry must not reveal an unsolved product early",
          );
        }
      }
      const correctResult =
        slots.length === 1
          ? { kind: "single", grade: correctGrades[0] }
          : {
              kind: "competition",
              substitution: correctGrades[0],
              elimination: correctGrades[1],
            };
      const solved = recordPracticeAttempt(undefined, correctResult);
      assert.equal(isPracticeQuestionFinished(solved), true);
      assert.equal(solved.attempts, 1);
      assert.equal(
        recordPracticeAttempt(solved, state.result),
        solved,
        "Solved questions must stay solved",
      );
    }
  } finally {
    options.delete();
  }
  const grade = (verdict) => ({
    verdict,
    message: verdict,
    explanation: "Feedback",
  });
  let partial = recordPracticeAttempt(undefined, {
    kind: "competition",
    substitution: grade("correct"),
    elimination: grade("incorrect"),
  });
  assert.equal(partial.latestAttempt, "partial");
  assert.equal(
    isPracticeQuestionFinished(partial),
    false,
    "One correct competition product does not finish the problem",
  );
  partial = recordPracticeAttempt(partial, {
    kind: "competition",
    substitution: grade("correct"),
    elimination: grade("partial"),
  });
  assert.equal(isPracticeQuestionFinished(partial), false);
  partial = recordPracticeAttempt(partial, {
    kind: "competition",
    substitution: grade("correct"),
    elimination: grade("partial"),
  });
  assert.equal(partial.attempts, 3);
  assert.equal(partial.firstAttempt, "partial");
  assert.equal(isPracticeQuestionFinished(partial), true);
  const summary = summarizePracticeReport({
    totalProblems: 1,
    outcomes: [partial],
  });
  assert.equal(summary.correct, 0);
  assert.equal(summary.partial, 1);
  assert.equal(
    gradeStructure("q2", wrongKey, "main", 3),
    null,
    "Archived answers must remain inaccessible",
  );
  assert.equal(isPracticeQuestionFinished(undefined), false);
  console.log(
    `Attempt limit verified: ${PRACTICE_QUESTIONS.length} questions, ${productCount} validated model products, third-check reveal, early success, partial competition, no fourth attempt, and unchanged report credit.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
