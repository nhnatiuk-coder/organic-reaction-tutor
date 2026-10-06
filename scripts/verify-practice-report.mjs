import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const temporaryModules = mkdtempSync("/tmp/practice-report-check-");
try {
  for (const file of ["practice-report", "practice-session-store"]) {
    const compiled = ts
      .transpileModule(
        readFileSync(resolve(root, `src/lib/${file}.ts`), "utf8"),
        {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ES2022,
          },
        },
      )
      .outputText.replace(
        'from "zod"',
        `from "${pathToFileURL(resolve(root, "node_modules/zod/index.js"))}"`,
      );
    writeFileSync(resolve(temporaryModules, `${file}.mjs`), compiled);
  }
  const reportModule = pathToFileURL(
    resolve(temporaryModules, "practice-report.mjs"),
  ).href;
  const storeModule = pathToFileURL(
    resolve(temporaryModules, "practice-session-store.mjs"),
  ).href;
  const { summarizePracticeReport, createPracticeReportPdf } = await import(
    reportModule
  );
  const report = {
    practiceSet: "Mixed",
    difficulty: "Intermediate",
    sessionLength: "All available problems",
    startedAt: new Date("2026-10-06T12:00:00Z"),
    finishedAt: new Date("2026-10-06T12:15:00Z"),
    totalProblems: 4,
    outcomes: [
      {
        questionNumber: 1,
        reference: "RXN-0001",
        attempts: 2,
        firstAttempt: "incorrect",
        latestAttempt: "correct",
      },
      {
        questionNumber: 2,
        reference: "RXN-0003",
        attempts: 1,
        firstAttempt: "partial",
        latestAttempt: "partial",
      },
      {
        questionNumber: 3,
        reference: "RXN-0004",
        attempts: 1,
        firstAttempt: "incorrect",
        latestAttempt: "incorrect",
      },
      {
        questionNumber: 4,
        reference: "RXN-0005",
        attempts: 0,
        firstAttempt: "incorrect",
        latestAttempt: "incorrect",
      },
    ],
  };
  assert.deepEqual(summarizePracticeReport(report), {
    checkedCount: 3,
    correct: 1,
    partial: 1,
    incorrect: 1,
    firstAttemptCorrect: 0,
    notChecked: 1,
    accuracy: 33,
  });
  const pdf = createPracticeReportPdf(report);
  assert.equal(pdf.type, "application/pdf");
  const pdfText = await pdf.text();
  assert.ok(pdfText.startsWith("%PDF-1.4"));
  for (const text of [
    "Correct on final check: 1",
    "Partially correct on final check: 1",
    "Not checked: 1",
    "Final-check accuracy: 33%",
    "RXN-0005",
  ])
    assert.ok(pdfText.includes(text), text);

  const values = new Map();
  globalThis.window = {
    sessionStorage: {
      setItem: (key, value) => values.set(key, value),
      getItem: (key) => values.get(key) ?? null,
      removeItem: (key) => values.delete(key),
    },
  };
  const store = await import(storeModule);
  const completed = {
    settings: {
      modeId: "mixed",
      difficulty: "intermediate",
      sessionLength: "all",
    },
    studentView: false,
    questionIds: ["q1", "q3", "q4", "q5"],
    report,
  };
  store.saveCompletedPracticeSession(completed);
  const afterRefresh = await import(`${storeModule}?refresh`);
  assert.deepEqual(
    afterRefresh.readCompletedPracticeSession(),
    completed,
    "Report and Date fields must survive a page refresh",
  );
  store.queuePracticeRestart(completed);
  assert.equal(store.readCompletedPracticeSession(), null);
  assert.equal(
    store.takePracticeRestart(true),
    null,
    "Teacher restart must not leak into student sessions",
  );
  assert.deepEqual(
    store.takePracticeRestart(false),
    {
      settings: completed.settings,
      studentView: false,
      questionIds: completed.questionIds,
    },
    "Restart must preserve the exact question set without previous attempts",
  );
  assert.equal(
    store.takePracticeRestart(false),
    null,
    "A restart must only be consumed once",
  );
  assert.equal(values.size, 0, "Restart clears the old report");
  const studentCompleted = { ...completed, studentView: true };
  store.saveCompletedPracticeSession(studentCompleted);
  store.queuePracticeRestart(studentCompleted);
  assert.equal(store.takePracticeRestart(true).studentView, true);

  values.set("organic-tutor:completed-session:v1", "malformed report");
  const invalidStore = await import(`${storeModule}?invalid`);
  assert.equal(
    invalidStore.readCompletedPracticeSession(),
    null,
    "A stale/malformed report must not crash the report page",
  );

  globalThis.window.sessionStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const fallbackStore = await import(`${storeModule}?fallback`);
  fallbackStore.saveCompletedPracticeSession(completed);
  assert.deepEqual(fallbackStore.readCompletedPracticeSession(), completed);
  fallbackStore.queuePracticeRestart(completed);
  assert.deepEqual(
    fallbackStore.takePracticeRestart(false).questionIds,
    completed.questionIds,
  );
  delete globalThis.window;
  assert.equal(
    fallbackStore.readCompletedPracticeSession(),
    null,
    "Server renders must not access browser report data",
  );
  console.log(
    "Practice report verified: outcomes, PDF, refresh, exact-set restart, student/teacher separation, and storage fallback.",
  );
} finally {
  delete globalThis.window;
  rmSync(temporaryModules, { recursive: true, force: true });
}
