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
  const { ANSWER_KEYS, gradeStructure } = await load("answer-keys.server");
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

  // Regression checks for the two retained drawings whose old keys contained
  // the wrong number of carbons. Chemistry software derives these fingerprints
  // directly from independently written product structures.
  const indigo = await Indigo();
  const options = new indigo.MapStringString();
  try {
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
  } finally {
    options.delete();
  }

  console.log(
    `Curated bank verified: ${PRACTICE_QUESTIONS.length} active distinct questions.`,
  );
  console.log(JSON.stringify(counts));
} finally {
  rmSync(temporaryModules, { recursive: true, force: true });
}
