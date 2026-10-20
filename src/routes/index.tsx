import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";

import {
  getMechanismRevealLabel,
  getQuestionReference,
  PRACTICE_QUESTIONS,
  type ElementaryMechanism,
} from "@/lib/questions";
import { gradeAnswer, type GradeResult } from "@/lib/grading.functions";
import { type PracticeReportOutcome } from "@/lib/practice-report";
import {
  saveCompletedPracticeSession,
  takePracticeRestart,
} from "@/lib/practice-session-store";

import ReactionScheme from "@/components/ReactionScheme";
import CorrectAnswer from "@/components/CorrectAnswer";
import {
  MAX_PRACTICE_ATTEMPTS,
  isPracticeQuestionFinished,
  recordPracticeAttempt,
  type PracticeResult,
  type QuestionAttemptState,
} from "@/lib/practice-attempts";
import {
  questionsForFilters,
  sessionQuestionsFor,
  type DifficultyFilter,
  type SessionLength,
  type PracticeModeId,
  type PracticeSettings,
} from "@/lib/practice-selection";
export type {
  DifficultyFilter,
  SessionLength,
  PracticeModeId,
  PracticeSettings,
} from "@/lib/practice-selection";

const KetcherCanvas = lazy(() => import("@/components/KetcherCanvas"));

type PracticeMode = {
  id: PracticeModeId;
  label: string;
  description: string;
  mechanisms: readonly ElementaryMechanism[];
};

export const PRACTICE_MODES: readonly PracticeMode[] = [
  {
    id: "mixed",
    label: "Mixed",
    description: "All reaction types",
    mechanisms: ["SN1", "SN2", "E1", "E2"],
  },
  {
    id: "sn1",
    label: "SN1",
    description: "SN1 reactions",
    mechanisms: ["SN1"],
  },
  {
    id: "sn2",
    label: "SN2",
    description: "SN2 reactions",
    mechanisms: ["SN2"],
  },
  { id: "e1", label: "E1", description: "E1 reactions", mechanisms: ["E1"] },
  { id: "e2", label: "E2", description: "E2 reactions", mechanisms: ["E2"] },
  {
    id: "substitution",
    label: "SN1 + SN2",
    description: "Substitution reactions",
    mechanisms: ["SN1", "SN2"],
  },
  {
    id: "elimination",
    label: "E1 + E2",
    description: "Elimination reactions",
    mechanisms: ["E1", "E2"],
  },
];

export const DIFFICULTY_OPTIONS: readonly {
  id: DifficultyFilter;
  label: string;
  description: string;
}[] = [
  {
    id: "progressive",
    label: "Progressive",
    description: "Introductory questions first, then intermediate and advanced",
  },
  {
    id: "introductory",
    label: "Introductory",
    description: "Straightforward single-pathway reactions",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Regiochemistry, branching, or less-direct substrates",
  },
  {
    id: "advanced",
    label: "Advanced",
    description:
      "Stereochemistry, rearrangements, conformations, or two products",
  },
];

export const SESSION_LENGTHS: readonly SessionLength[] = [
  5,
  10,
  25,
  30,
  50,
  "all",
];

export const DEFAULT_STUDENT_SETTINGS: PracticeSettings = {
  modeId: "mixed",
  difficulty: "progressive",
  sessionLength: 10,
};

export function normalisePracticeSettings(
  settings?: Partial<PracticeSettings>,
): PracticeSettings {
  const modeId = PRACTICE_MODES.some((mode) => mode.id === settings?.modeId)
    ? settings!.modeId!
    : DEFAULT_STUDENT_SETTINGS.modeId;
  const difficulty = DIFFICULTY_OPTIONS.some(
    (option) => option.id === settings?.difficulty,
  )
    ? settings!.difficulty!
    : DEFAULT_STUDENT_SETTINGS.difficulty;
  const sessionLength = SESSION_LENGTHS.includes(
    settings?.sessionLength as SessionLength,
  )
    ? (settings!.sessionLength as SessionLength)
    : DEFAULT_STUDENT_SETTINGS.sessionLength;

  return { modeId, difficulty, sessionLength };
}

function hideMechanismNames(text: string) {
  return text.replace(/\b(SN1|SN2|E1|E2)\b/g, "the expected pathway");
}

function GradeFeedback({
  label,
  grade,
}: {
  label?: string;
  grade: GradeResult;
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 text-sm " +
        (grade.verdict === "correct"
          ? "border-primary bg-accent text-accent-foreground"
          : grade.verdict === "partial"
            ? "border-chart-4 bg-card text-card-foreground"
            : "border-destructive/40 bg-card text-card-foreground")
      }
    >
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      )}
      <p className="font-semibold">{grade.message}</p>
      <p className="mt-2 text-muted-foreground">
        {hideMechanismNames(grade.explanation)}
      </p>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Organic Reaction Drawing Practice" },
      {
        name: "description",
        content:
          "Draw the major product for organic reaction practice problems in a real structure editor with instant feedback.",
      },
      { property: "og:title", content: "Organic Reaction Drawing Practice" },
      {
        property: "og:description",
        content:
          "Draw and receive immediate feedback on major organic reaction products.",
      },
    ],
  }),
  component: InstructorPracticePage,
});

function InstructorPracticePage() {
  return <PracticePage initialSettings={{ sessionLength: "all" }} />;
}

function EditorSkeleton() {
  return (
    <div className="flex h-[520px] items-center justify-center rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
      Loading structure editor…
    </div>
  );
}

function ProductEditor({
  title,
  onInit,
}: {
  title: string;
  onInit: (ketcher: Ketcher | null) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="h-[560px]">
        <ClientOnly fallback={<EditorSkeleton />}>
          <Suspense fallback={<EditorSkeleton />}>
            <KetcherCanvas onInit={onInit} title={title} />
          </Suspense>
        </ClientOnly>
      </div>
    </section>
  );
}

export function PracticePage({
  studentView = false,
  initialSettings,
  showSessionControls = true,
  setupHref,
}: {
  studentView?: boolean;
  initialSettings?: Partial<PracticeSettings>;
  showSessionControls?: boolean;
  setupHref?: string;
}) {
  const settings = normalisePracticeSettings(initialSettings);
  const startingSettings = useRef(settings);
  const sessionInitialized = useRef(false);
  const [practiceModeId, setPracticeModeId] = useState<PracticeModeId>(
    settings.modeId,
  );
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(
    settings.difficulty,
  );
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    settings.sessionLength,
  );
  const [sessionQuestionIds, setSessionQuestionIds] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const checkingInProgress = useRef(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const navigationInProgress = useRef(false);
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);
  const [hintQuestionIds, setHintQuestionIds] = useState<string[]>([]);
  const [reportByQuestionId, setReportByQuestionId] = useState<
    Record<string, QuestionAttemptState>
  >({});
  const [sessionStartedAt, setSessionStartedAt] = useState(() => new Date());
  const ketcherRef = useRef<Ketcher | null>(null);
  const substitutionKetcherRef = useRef<Ketcher | null>(null);
  const eliminationKetcherRef = useRef<Ketcher | null>(null);

  const grade = useServerFn(gradeAnswer);
  const navigate = useNavigate();
  useEffect(() => {
    // Initialize after hydration so each new session is random without a
    // server/client mismatch. The guard also preserves a consumed restart
    // when React replays effects in development.
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;
    try {
      const pending = takePracticeRestart(studentView);
      const nextSettings = pending
        ? normalisePracticeSettings(pending.settings)
        : startingSettings.current;
      const nextMode = PRACTICE_MODES.find(
        (mode) => mode.id === nextSettings.modeId,
      )!;
      const availableQuestions = questionsForFilters(
        nextMode,
        nextSettings.difficulty,
      );
      const availableIds = new Set(availableQuestions.map((q) => q.id));
      const restoredIds = pending?.questionIds.filter((id) =>
        availableIds.has(id),
      );
      const nextIds = restoredIds?.length
        ? restoredIds
        : sessionQuestionsFor(
            availableQuestions,
            nextSettings.difficulty,
            nextSettings.sessionLength,
          ).map((question) => question.id);
      setPracticeModeId(nextSettings.modeId);
      setDifficulty(nextSettings.difficulty);
      setSessionLength(nextSettings.sessionLength);
      setSessionQuestionIds(nextIds);
      setCurrentQuestionId(nextIds[0] ?? "");
      setSeenQuestionIds(nextIds[0] ? [nextIds[0]] : []);
      setReportByQuestionId({});
      setHintQuestionIds([]);
      setSessionStartedAt(new Date());
      setError(null);
    } finally {
      // Finish choosing/restoring the set before students can advance it.
      setSessionReady(true);
    }
  }, [studentView]);
  const practiceMode = PRACTICE_MODES.find(
    (mode) => mode.id === practiceModeId,
  )!;
  const activeQuestions = questionsForFilters(practiceMode, difficulty);

  if (!sessionReady) {
    return (
      <main className="min-h-screen bg-background p-6">
        <p role="status" className="mx-auto max-w-6xl text-muted-foreground">
          Starting your practice session…
        </p>
      </main>
    );
  }

  if (activeQuestions.length === 0) {
    return (
      <main className="min-h-screen bg-background p-6">
        <section className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Instructor setup needed
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-card-foreground">
            No practice problems match these selections.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Choose another reaction type or difficulty level to start a practice
            session.
          </p>
        </section>
      </main>
    );
  }

  const sessionQuestions = sessionQuestionIds
    .map((id) => activeQuestions.find((item) => item.id === id))
    .filter((question): question is (typeof activeQuestions)[number] =>
      Boolean(question),
    );
  const questionsInSession = sessionQuestions.length;
  const question =
    sessionQuestions.find((item) => item.id === currentQuestionId) ??
    sessionQuestions[0] ??
    activeQuestions[0]!;
  const index = sessionQuestions.indexOf(question);
  const questionReference = getQuestionReference(question);
  const isCompetition = question.answerMode === "competition";
  const attemptState = reportByQuestionId[question.id];
  const attemptsUsed = attemptState?.attempts ?? 0;
  const questionFinished = isPracticeQuestionFinished(attemptState);
  const result = attemptState?.result ?? null;
  const revealCorrectAnswer = questionFinished;
  const answerGrades =
    result?.kind === "competition"
      ? [
          { label: "Substitution product", grade: result.substitution },
          { label: "Elimination product", grade: result.elimination },
        ]
      : result?.kind === "single"
        ? [{ label: "Major product", grade: result.grade }]
        : [];
  const correctProducts = revealCorrectAnswer
    ? answerGrades.flatMap(({ label, grade }) =>
        grade.solution ? [{ label, ...grade.solution }] : [],
      )
    : [];
  const drawingInstruction = isCompetition
    ? "Draw both major products"
    : question.mechanism === "SN1"
      ? "Draw the substitution product"
      : "Draw the major product";
  const isMechanismHintShown = hintQuestionIds.includes(question.id);
  const completedInCurrentSet = seenQuestionIds.filter((id) =>
    sessionQuestions.some((item) => item.id === id),
  ).length;
  const sessionComplete = completedInCurrentSet >= questionsInSession;
  const reportOutcomes: PracticeReportOutcome[] = sessionQuestions.map(
    (sessionQuestion, questionNumber) => {
      const report = reportByQuestionId[sessionQuestion.id];
      return report
        ? {
            questionNumber: questionNumber + 1,
            reference: getQuestionReference(sessionQuestion),
            attempts: report.attempts,
            firstAttempt: report.firstAttempt,
            latestAttempt: report.latestAttempt,
          }
        : {
            questionNumber: questionNumber + 1,
            reference: getQuestionReference(sessionQuestion),
            attempts: 0,
            firstAttempt: "incorrect",
            latestAttempt: "incorrect",
          };
    },
  );

  function recordReportResult(feedback: PracticeResult) {
    setReportByQuestionId((report) => ({
      ...report,
      [question.id]: recordPracticeAttempt(report[question.id], feedback),
    }));
  }

  async function finishSession() {
    if (checking || !sessionComplete) return;
    saveCompletedPracticeSession({
      settings: { modeId: practiceModeId, difficulty, sessionLength },
      studentView,
      questionIds: sessionQuestions.map((item) => item.id),
      report: {
        practiceSet: practiceMode.label,
        difficulty:
          DIFFICULTY_OPTIONS.find((option) => option.id === difficulty)
            ?.label ?? difficulty,
        sessionLength:
          sessionLength === "all"
            ? "All available problems"
            : `${questionsInSession} problems`,
        startedAt: sessionStartedAt,
        finishedAt: new Date(),
        totalProblems: questionsInSession,
        outcomes: reportOutcomes,
      },
    });
    await navigate({ to: "/report" });
  }

  async function readInchiKey(
    ketcher: Ketcher | null,
    label: string,
  ): Promise<string | null> {
    if (!ketcher) {
      setError(`${label} editor is still loading.`);
      return null;
    }

    const smiles = (await ketcher.getSmiles()).trim();
    if (!smiles) {
      setError(`${label} is empty — draw that product first.`);
      return null;
    }
    if (smiles.includes(">")) {
      setError(
        `${label} should contain only a product structure, not a full reaction arrow.`,
      );
      return null;
    }
    return (await ketcher.getInChIKey()).trim();
  }

  async function check() {
    if (
      checkingInProgress.current ||
      navigationInProgress.current ||
      questionFinished
    )
      return;
    checkingInProgress.current = true;
    setChecking(true);
    const attemptNumber = attemptsUsed + 1;
    setError(null);
    try {
      if (isCompetition) {
        const substitutionInchiKey = await readInchiKey(
          substitutionKetcherRef.current,
          "The substitution product drawing",
        );
        if (!substitutionInchiKey) return;

        const eliminationInchiKey = await readInchiKey(
          eliminationKetcherRef.current,
          "The elimination product drawing",
        );
        if (!eliminationInchiKey) return;

        const [substitution, elimination] = await Promise.all([
          grade({
            data: {
              questionId: question.id,
              productSlot: "substitution",
              attemptNumber,
              inchiKey: substitutionInchiKey,
            },
          }),
          grade({
            data: {
              questionId: question.id,
              productSlot: "elimination",
              attemptNumber,
              inchiKey: eliminationInchiKey,
            },
          }),
        ]);

        recordReportResult({
          kind: "competition",
          substitution,
          elimination,
        });
        return;
      }

      const inchiKey = await readInchiKey(
        ketcherRef.current,
        "The product drawing",
      );
      if (!inchiKey) return;
      const graded = await grade({
        data: {
          questionId: question.id,
          productSlot: "main",
          inchiKey,
          attemptNumber,
        },
      });
      recordReportResult({ kind: "single", grade: graded });
    } catch {
      setError(
        "Could not check that structure. Check for unfinished bonds or try again. No attempt was used.",
      );
    } finally {
      checkingInProgress.current = false;
      setChecking(false);
    }
  }

  async function clearEditors() {
    await Promise.all([
      ketcherRef.current?.setMolecule(""),
      substitutionKetcherRef.current?.setMolecule(""),
      eliminationKetcherRef.current?.setMolecule(""),
    ]);
  }

  function showMechanismHint() {
    setHintQuestionIds((hintedQuestionIds) =>
      hintedQuestionIds.includes(question.id)
        ? hintedQuestionIds
        : [...hintedQuestionIds, question.id],
    );
  }

  async function showQuestion(nextQuestionId: string) {
    // Keep the current iframe alive until its asynchronous clear completes.
    // Switching between one and two editors first would strand that request.
    await clearEditors();
    setCurrentQuestionId(nextQuestionId);
    setSeenQuestionIds((seen) =>
      seen.includes(nextQuestionId) ? seen : [...seen, nextQuestionId],
    );
    setError(null);
  }

  async function goTo(nextQuestion: (typeof activeQuestions)[number]) {
    if (checking || navigationInProgress.current) return;
    navigationInProgress.current = true;
    setNavigating(true);
    try {
      await showQuestion(nextQuestion.id);
    } finally {
      navigationInProgress.current = false;
      setNavigating(false);
    }
  }

  async function nextRandomProblem() {
    if (checking || navigationInProgress.current) return;
    navigationInProgress.current = true;
    setNavigating(true);
    try {
      if (sessionComplete) {
        await finishSession();
        return;
      }

      const unvisited = sessionQuestions.filter(
        (item) => !seenQuestionIds.includes(item.id),
      );
      const next =
        difficulty === "progressive"
          ? unvisited[0]
          : unvisited[Math.floor(Math.random() * unvisited.length)];
      if (!next) return;
      await showQuestion(next.id);
    } finally {
      navigationInProgress.current = false;
      setNavigating(false);
    }
  }

  async function startPracticeSession(
    questions: typeof activeQuestions,
    nextDifficulty = difficulty,
    nextSessionLength = sessionLength,
    nextModeId = practiceModeId,
  ) {
    if (checking || navigationInProgress.current) return;
    const nextSessionQuestions = sessionQuestionsFor(
      questions,
      nextDifficulty,
      nextSessionLength,
    );
    const firstQuestion = nextSessionQuestions[0];
    if (!firstQuestion) return;
    navigationInProgress.current = true;
    setNavigating(true);
    try {
      await clearEditors();
      setPracticeModeId(nextModeId);
      setDifficulty(nextDifficulty);
      setSessionLength(nextSessionLength);
      setSessionQuestionIds(
        nextSessionQuestions.map((question) => question.id),
      );
      setCurrentQuestionId(firstQuestion.id);
      setSeenQuestionIds([firstQuestion.id]);
      setReportByQuestionId({});
      setHintQuestionIds([]);
      setSessionStartedAt(new Date());
      setError(null);
    } finally {
      navigationInProgress.current = false;
      setNavigating(false);
    }
  }

  async function selectPracticeMode(nextMode: PracticeMode) {
    await startPracticeSession(
      questionsForFilters(nextMode, difficulty),
      difficulty,
      sessionLength,
      nextMode.id,
    );
  }

  async function selectDifficulty(nextDifficulty: DifficultyFilter) {
    await startPracticeSession(
      questionsForFilters(practiceMode, nextDifficulty),
      nextDifficulty,
      sessionLength,
    );
  }

  async function selectSessionLength(nextLength: SessionLength) {
    await startPracticeSession(activeQuestions, difficulty, nextLength);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            Organic Chemistry I · Pilot
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Reaction Drawing Practice
          </h1>
          <p className="max-w-2xl text-sm opacity-90">
            Draw the major product for each substitution or elimination
            reaction. Your drawing is graded on molecular structure, not on how
            it is arranged. No account is required. Reports stay only in this
            browser tab.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <section
          aria-labelledby="endless-practice-heading"
          className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Practice session
              </p>
              <h2
                id="endless-practice-heading"
                className="mt-1 text-lg font-semibold text-card-foreground"
              >
                Build a focused set of verified reaction problems
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {practiceMode.description} ·{" "}
                {studentView && sessionLength === "all" ? (
                  <>
                    {completedInCurrentSet}{" "}
                    {completedInCurrentSet === 1 ? "problem" : "problems"}{" "}
                    visited in this all-available session.
                  </>
                ) : (
                  <>
                    {completedInCurrentSet} of {questionsInSession}{" "}
                    {questionsInSession === 1 ? "problem" : "problems"} visited
                    in this session.
                  </>
                )}
                {sessionComplete
                  ? " All problems have been visited. Select Finish set when you are ready to view the report."
                  : ""}
              </p>
              {difficulty === "progressive" && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Progressive order: introductory → intermediate → advanced.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {setupHref && (
                <a
                  href={setupHref}
                  className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-card-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Change setup
                </a>
              )}
              <button
                onClick={nextRandomProblem}
                disabled={checking || navigating}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {sessionComplete
                  ? "Finish set"
                  : difficulty === "progressive"
                    ? "Next problem"
                    : "New random problem"}
              </button>
            </div>
          </div>
          {showSessionControls && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Choose a practice set
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Choose a practice set"
              >
                {PRACTICE_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => selectPracticeMode(mode)}
                    disabled={checking || navigating}
                    aria-pressed={mode.id === practiceMode.id}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                      (mode.id === practiceMode.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")
                    }
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Choose a difficulty level
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Choose a difficulty level"
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => selectDifficulty(option.id)}
                    disabled={checking || navigating}
                    aria-pressed={option.id === difficulty}
                    title={option.description}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                      (option.id === difficulty
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Choose a session length
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Choose a session length"
              >
                {SESSION_LENGTHS.map((length) => {
                  const available =
                    length === "all" || length <= activeQuestions.length;
                  return (
                    <button
                      key={String(length)}
                      onClick={() => selectSessionLength(length)}
                      aria-pressed={length === sessionLength}
                      disabled={!available || checking || navigating}
                      className={
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 " +
                        (length === sessionLength
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")
                      }
                    >
                      {length === "all"
                        ? "All available"
                        : `${length} questions`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {!studentView && sessionLength === "all" && (
          <ol className="mb-6 flex flex-wrap gap-2" aria-label="Question list">
            {sessionQuestions.map((q, i) => {
              return (
                <li key={q.id}>
                  <button
                    onClick={() => goTo(q)}
                    disabled={checking || navigating}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={`Question ${i + 1}, ${
                      q.format === "scheme" ? "reaction scheme" : "text prompt"
                    }`}
                    className={
                      "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
                      (i === index
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")
                    }
                  >
                    Question {i + 1}
                    {q.format === "scheme" && (
                      <span aria-hidden="true" className="ml-1 opacity-70">
                        ⌬
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {question.format === "scheme" && question.substrateSmiles && (
          <div className="mb-6">
            <ReactionScheme
              substrateSmiles={question.substrateSmiles}
              substrateName={question.substrate}
              above={question.reagents}
              below={question.conditions}
              {...(question.conformationalHint
                ? { conformationalHint: question.conformationalHint }
                : {})}
              stereochemistryMatters={question.stereochemistryMatters}
              drawingInstruction={`${drawingInstruction} in the ${isCompetition ? "editors" : "editor"}`}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="space-y-4">
            <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {studentView
                  ? "Current practice problem"
                  : sessionLength === "all"
                    ? `Question ${index + 1} of ${activeQuestions.length}`
                    : `Practice problem ${completedInCurrentSet} of ${questionsInSession}`}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Problem reference: {questionReference}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-card-foreground">
                {drawingInstruction}
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Substrate
                  </dt>
                  <dd className="text-card-foreground">{question.substrate}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Reagent</dt>
                  <dd className="text-card-foreground">{question.reagents}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Conditions
                  </dt>
                  <dd className="text-card-foreground">
                    {question.conditions}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-border pt-4 text-sm text-card-foreground">
                {question.prompt}
              </p>
              {question.stereochemistryMatters && (
                <p className="mt-3 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">
                  Stereochemistry is graded on this question.
                </p>
              )}
              {question.alkeneGeometryMatters && (
                <p className="mt-3 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">
                  {isCompetition
                    ? "The elimination product’s alkene E/Z geometry is graded."
                    : "Alkene E/Z geometry is graded on this question."}
                </p>
              )}
            </article>

            <p
              role="status"
              aria-live="polite"
              className="text-sm font-medium text-card-foreground"
            >
              Attempts used: {attemptsUsed} of {MAX_PRACTICE_ATTEMPTS}.
              {attemptState?.latestAttempt === "correct"
                ? " Correct — continue when you are ready."
                : questionFinished
                  ? " No attempts remaining. Review the correct answer below."
                  : ` ${MAX_PRACTICE_ATTEMPTS - attemptsUsed} remaining.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={check}
                disabled={checking || navigating || questionFinished}
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {checking
                  ? "Checking…"
                  : questionFinished
                    ? "Problem complete"
                    : isCompetition
                      ? "Check both structures"
                      : "Check my structure"}
              </button>
              <button
                onClick={showMechanismHint}
                disabled={isMechanismHintShown}
                className="rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-60"
              >
                {isMechanismHintShown
                  ? "Hint shown"
                  : "Show reaction-type hint"}
              </button>
              <button
                onClick={nextRandomProblem}
                disabled={checking || navigating}
                className="rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent disabled:opacity-60"
              >
                {sessionComplete ? "Finish set" : "Random next"}
              </button>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {isMechanismHintShown && (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                Hint: The relevant{" "}
                {isCompetition ? "reaction types are" : "reaction type is"}{" "}
                {getMechanismRevealLabel(question)}.
              </p>
            )}

            {result &&
              (result.kind === "single" ? (
                <>
                  <GradeFeedback grade={result.grade} />
                </>
              ) : (
                <div className="space-y-3">
                  <GradeFeedback
                    label="Substitution product"
                    grade={result.substitution}
                  />
                  <GradeFeedback
                    label="Elimination product"
                    grade={result.elimination}
                  />
                </div>
              ))}
          </section>

          {isCompetition ? (
            <div className="grid gap-6">
              <ProductEditor
                title="Substitution product"
                onInit={(ketcher) => {
                  substitutionKetcherRef.current = ketcher;
                }}
              />
              <ProductEditor
                title="Elimination product"
                onInit={(ketcher) => {
                  eliminationKetcherRef.current = ketcher;
                }}
              />
            </div>
          ) : (
            <ProductEditor
              title={drawingInstruction}
              onInit={(ketcher) => {
                ketcherRef.current = ketcher;
                if (ketcher) {
                  (window as unknown as { ketcher?: Ketcher }).ketcher =
                    ketcher;
                } else {
                  delete (window as unknown as { ketcher?: Ketcher }).ketcher;
                }
              }}
            />
          )}
        </div>
        {correctProducts.length > 0 && (
          <CorrectAnswer
            products={correctProducts}
            solved={attemptState?.latestAttempt === "correct"}
          />
        )}
      </div>
    </main>
  );
}
