import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";

import {
  getQuestionDifficulty,
  getMechanismRevealLabel,
  getQuestionMechanisms,
  PRACTICE_QUESTIONS,
  type DifficultyLevel,
  type ElementaryMechanism,
} from "@/lib/questions";
import { gradeAnswer, type GradeResult } from "@/lib/grading.functions";
import {
  downloadPracticeReport,
  type PracticeReportOutcome,
  type PracticeReportVerdict,
} from "@/lib/practice-report";

import ReactionScheme from "@/components/ReactionScheme";

const KetcherCanvas = lazy(() => import("@/components/KetcherCanvas"));

type SinglePracticeResult = {
  kind: "single";
  grade: GradeResult;
};

type CompetitionPracticeResult = {
  kind: "competition";
  substitution: GradeResult;
  elimination: GradeResult;
};

type PracticeResult = SinglePracticeResult | CompetitionPracticeResult;

type QuestionReportResult = {
  attempts: number;
  firstAttempt: PracticeReportVerdict;
  latestAttempt: PracticeReportVerdict;
};

export type PracticeModeId =
  "mixed" | "sn1" | "sn2" | "e1" | "e2" | "substitution" | "elimination";

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

export type DifficultyFilter = "progressive" | DifficultyLevel;
export type SessionLength = 5 | 10 | 25 | 50 | "all";

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

export const SESSION_LENGTHS: readonly SessionLength[] = [5, 10, 25, 50, "all"];

export type PracticeSettings = {
  modeId: PracticeModeId;
  difficulty: DifficultyFilter;
  sessionLength: SessionLength;
};

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

function questionsForFilters(mode: PracticeMode, difficulty: DifficultyFilter) {
  return PRACTICE_QUESTIONS.filter(
    (question) =>
      getQuestionMechanisms(question).some((mechanism) =>
        mode.mechanisms.includes(mechanism),
      ) &&
      (difficulty === "progressive" ||
        getQuestionDifficulty(question) === difficulty),
  );
}

function shuffle<T>(items: readonly T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex]!,
      shuffled[index]!,
    ];
  }
  return shuffled;
}

function sessionQuestionsFor(
  questions: readonly (typeof PRACTICE_QUESTIONS)[number][],
  difficulty: DifficultyFilter,
  sessionLength: SessionLength,
  randomize = true,
) {
  const total =
    sessionLength === "all"
      ? questions.length
      : Math.min(sessionLength, questions.length);

  if (difficulty !== "progressive") {
    const ordered = randomize ? shuffle(questions) : [...questions];
    return ordered.slice(0, total);
  }

  const levels: readonly DifficultyLevel[] = [
    "introductory",
    "intermediate",
    "advanced",
  ];
  const groups = levels
    .map((level) => {
      const grouped = questions.filter(
        (question) => getQuestionDifficulty(question) === level,
      );
      return randomize ? shuffle(grouped) : grouped;
    })
    .filter((group) => group.length > 0);

  if (sessionLength === "all") return groups.flat();

  const targetPerGroup = Math.floor(total / groups.length);
  let remaining = total % groups.length;
  const selected = groups.flatMap((group) => {
    const target = targetPerGroup + (remaining > 0 ? 1 : 0);
    remaining -= 1;
    return group.slice(0, target);
  });

  // Reallocate only if a future bank has fewer questions at one level.
  if (selected.length < total) {
    const selectedIds = new Set(selected.map((question) => question.id));
    for (const question of groups.flat()) {
      if (selected.length >= total) break;
      if (!selectedIds.has(question.id)) selected.push(question);
    }
  }

  return selected;
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
  onInit: (ketcher: Ketcher) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="h-[560px]">
        <ClientOnly fallback={<EditorSkeleton />}>
          <Suspense fallback={<EditorSkeleton />}>
            <KetcherCanvas onInit={onInit} />
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
  const initialPracticeMode = PRACTICE_MODES.find(
    (mode) => mode.id === settings.modeId,
  )!;
  const initialSessionQuestions = sessionQuestionsFor(
    questionsForFilters(initialPracticeMode, settings.difficulty),
    settings.difficulty,
    settings.sessionLength,
    false,
  );
  const [practiceModeId, setPracticeModeId] = useState<PracticeModeId>(
    settings.modeId,
  );
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(
    settings.difficulty,
  );
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    settings.sessionLength,
  );
  const [sessionQuestionIds, setSessionQuestionIds] = useState(
    initialSessionQuestions.map((question) => question.id),
  );
  const [currentQuestionId, setCurrentQuestionId] = useState(
    initialSessionQuestions[0]?.id ?? "",
  );
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>(
    initialSessionQuestions[0]?.id ? [initialSessionQuestions[0].id] : [],
  );
  const [hintQuestionIds, setHintQuestionIds] = useState<string[]>([]);
  const [reportByQuestionId, setReportByQuestionId] = useState<
    Record<string, QuestionReportResult>
  >({});
  const [sessionStartedAt, setSessionStartedAt] = useState(() => new Date());
  const ketcherRef = useRef<Ketcher | null>(null);
  const substitutionKetcherRef = useRef<Ketcher | null>(null);
  const eliminationKetcherRef = useRef<Ketcher | null>(null);

  const grade = useServerFn(gradeAnswer);
  const practiceMode = PRACTICE_MODES.find(
    (mode) => mode.id === practiceModeId,
  )!;
  const activeQuestions = questionsForFilters(practiceMode, difficulty);

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
  const isCompetition = question.answerMode === "competition";
  const isMechanismHintShown = hintQuestionIds.includes(question.id);
  const completedInCurrentSet = seenQuestionIds.filter((id) =>
    sessionQuestions.some((item) => item.id === id),
  ).length;
  const sessionComplete = completedInCurrentSet >= questionsInSession;
  const reportOutcomes: PracticeReportOutcome[] = sessionQuestions.map(
    (sessionQuestion, questionNumber) => {
      const report = reportByQuestionId[sessionQuestion.id];
      return report
        ? { questionNumber: questionNumber + 1, ...report }
        : {
            questionNumber: questionNumber + 1,
            attempts: 0,
            firstAttempt: "incorrect",
            latestAttempt: "incorrect",
          };
    },
  );
  const checkedCount = reportOutcomes.filter(
    (outcome) => outcome.attempts > 0,
  ).length;
  const correctCount = reportOutcomes.filter(
    (outcome) => outcome.attempts > 0 && outcome.latestAttempt === "correct",
  ).length;
  const partialCount = reportOutcomes.filter(
    (outcome) => outcome.attempts > 0 && outcome.latestAttempt === "partial",
  ).length;
  const incorrectCount = reportOutcomes.filter(
    (outcome) => outcome.attempts > 0 && outcome.latestAttempt === "incorrect",
  ).length;

  function recordReportResult(verdict: PracticeReportVerdict) {
    setReportByQuestionId((report) => {
      const previous = report[question.id];
      return {
        ...report,
        [question.id]: {
          attempts: (previous?.attempts ?? 0) + 1,
          firstAttempt: previous?.firstAttempt ?? verdict,
          latestAttempt: verdict,
        },
      };
    });
  }

  function competitionVerdict(
    substitution: GradeResult,
    elimination: GradeResult,
  ): PracticeReportVerdict {
    if (
      substitution.verdict === "correct" &&
      elimination.verdict === "correct"
    ) {
      return "correct";
    }
    if (
      substitution.verdict === "incorrect" &&
      elimination.verdict === "incorrect"
    ) {
      return "incorrect";
    }
    return "partial";
  }

  function downloadReport() {
    downloadPracticeReport({
      practiceSet: practiceMode.label,
      difficulty:
        DIFFICULTY_OPTIONS.find((option) => option.id === difficulty)?.label ??
        difficulty,
      sessionLength:
        sessionLength === "all"
          ? "All available problems"
          : `${questionsInSession} problems`,
      startedAt: sessionStartedAt,
      finishedAt: new Date(),
      totalProblems: questionsInSession,
      outcomes: reportOutcomes,
    });
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
    setChecking(true);
    setError(null);
    setResult(null);
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
              inchiKey: substitutionInchiKey,
            },
          }),
          grade({
            data: {
              questionId: question.id,
              productSlot: "elimination",
              inchiKey: eliminationInchiKey,
            },
          }),
        ]);

        setResult({
          kind: "competition",
          substitution,
          elimination,
        });
        recordReportResult(competitionVerdict(substitution, elimination));
        return;
      }

      const inchiKey = await readInchiKey(
        ketcherRef.current,
        "The product drawing",
      );
      if (!inchiKey) return;
      const graded = await grade({
        data: { questionId: question.id, productSlot: "main", inchiKey },
      });
      setResult({
        kind: "single",
        grade: graded,
      });
      recordReportResult(graded.verdict);
    } catch {
      setError(
        "Could not read that structure. Check for open valences or unfinished bonds.",
      );
    } finally {
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
    setCurrentQuestionId(nextQuestionId);
    setResult(null);
    setError(null);
    await clearEditors();
  }

  async function goTo(nextQuestion: (typeof activeQuestions)[number]) {
    setSeenQuestionIds((seen) =>
      seen.includes(nextQuestion.id) ? seen : [...seen, nextQuestion.id],
    );
    await showQuestion(nextQuestion.id);
  }

  async function nextRandomProblem() {
    if (sessionComplete) {
      await startPracticeSession(activeQuestions);
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
    setSeenQuestionIds((seen) => [...seen, next.id]);
    await showQuestion(next.id);
  }

  async function startPracticeSession(
    questions: typeof activeQuestions,
    nextDifficulty = difficulty,
    nextSessionLength = sessionLength,
  ) {
    const nextSessionQuestions = sessionQuestionsFor(
      questions,
      nextDifficulty,
      nextSessionLength,
    );
    const firstQuestion = nextSessionQuestions[0];
    if (!firstQuestion) return;

    setSessionQuestionIds(nextSessionQuestions.map((question) => question.id));
    setCurrentQuestionId(firstQuestion.id);
    setSeenQuestionIds([firstQuestion.id]);
    setReportByQuestionId({});
    setSessionStartedAt(new Date());
    setResult(null);
    setError(null);
    await clearEditors();
  }

  async function selectPracticeMode(nextMode: PracticeMode) {
    setPracticeModeId(nextMode.id);
    await startPracticeSession(
      questionsForFilters(nextMode, difficulty),
      difficulty,
      sessionLength,
    );
  }

  async function selectDifficulty(nextDifficulty: DifficultyFilter) {
    setDifficulty(nextDifficulty);
    await startPracticeSession(
      questionsForFilters(practiceMode, nextDifficulty),
      nextDifficulty,
      sessionLength,
    );
  }

  async function selectSessionLength(nextLength: SessionLength) {
    setSessionLength(nextLength);
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
            it is arranged. Nothing is saved — no account, no attempt history.
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
                  ? " This session is complete — start a new one whenever you are ready."
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
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {sessionComplete
                  ? "Start new session"
                  : difficulty === "progressive"
                    ? "Next problem"
                    : "New random problem"}
              </button>
            </div>
          </div>
          {sessionComplete && (
            <section
              aria-labelledby="session-report-heading"
              className="mt-5 rounded-lg border border-primary/30 bg-accent p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Session complete
              </p>
              <h3
                id="session-report-heading"
                className="mt-1 text-base font-semibold text-accent-foreground"
              >
                Your practice report is ready
              </h3>
              <p className="mt-1 text-sm text-accent-foreground">
                {correctCount} correct, {partialCount} partially correct, and{" "}
                {incorrectCount} needing revision across {checkedCount} checked{" "}
                {checkedCount === 1 ? "problem" : "problems"}.{" "}
                {questionsInSession - checkedCount > 0
                  ? `${questionsInSession - checkedCount} ${questionsInSession - checkedCount === 1 ? "problem was" : "problems were"} not checked.`
                  : "Every problem was checked."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                The PDF is created only in this browser. It does not include a
                student name and is not saved by the site.
              </p>
              <button
                onClick={downloadReport}
                className="mt-4 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Download PDF report
              </button>
            </section>
          )}
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
                      disabled={!available}
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
              conformationalHint={question.conformationalHint}
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
              <h2 className="mt-1 text-lg font-semibold text-card-foreground">
                {isCompetition
                  ? "Draw both major products"
                  : "Draw the major product"}
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
            </article>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={check}
                disabled={checking}
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {checking
                  ? "Checking…"
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
                className="rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                {sessionComplete ? "Start new session" : "Random next"}
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
              title="Draw the major product"
              onInit={(ketcher) => {
                ketcherRef.current = ketcher;
                (window as unknown as { ketcher?: Ketcher }).ketcher = ketcher;
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
