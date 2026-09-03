import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";

import { QUESTIONS } from "@/lib/questions";
import { gradeAnswer, type GradeResult } from "@/lib/grading.functions";

import ReactionScheme from "@/components/ReactionScheme";

const KetcherCanvas = lazy(() => import("@/components/KetcherCanvas"));

const TOPIC_FILTERS = ["Mixed", "SN1", "SN2", "E1", "E2"] as const;
type TopicFilter = (typeof TOPIC_FILTERS)[number];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Organic Reaction Drawing Practice | SN1, SN2, E1, E2" },
      {
        name: "description",
        content:
          "Draw the major product for ten substitution and elimination reactions — text prompts and full reaction schemes — in a real structure editor with instant feedback.",
      },
      { property: "og:title", content: "Organic Reaction Drawing Practice" },
      {
        property: "og:description",
        content:
          "Practice SN1, SN2, E1, Zaitsev and Hofmann E2 products by drawing them — graded on molecular structure, not multiple choice.",
      },
    ],
  }),
  component: PracticePage,
});

function EditorSkeleton() {
  return (
    <div className="flex h-[520px] items-center justify-center rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
      Loading structure editor…
    </div>
  );
}

function PracticePage() {
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [topicFilter, setTopicFilter] = useState<TopicFilter>("Mixed");
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([QUESTIONS[0]!.id]);
  const ketcherRef = useRef<Ketcher | null>(null);

  const grade = useServerFn(gradeAnswer);
  const question = QUESTIONS[index]!;
  const activeQuestions = QUESTIONS.filter(
    (item) => topicFilter === "Mixed" || item.mechanism === topicFilter,
  );
  const completedInCurrentSet = seenQuestionIds.filter((id) =>
    activeQuestions.some((item) => item.id === id),
  ).length;

  async function check() {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const smiles = (await ketcher.getSmiles()).trim();
      if (!smiles) {
        setError("The canvas is empty — draw your product first.");
        return;
      }
      if (smiles.includes(">")) {
        setError("Draw only the product structure, not a full reaction arrow.");
        return;
      }
      const inchiKey = (await ketcher.getInChIKey()).trim();
      setResult(await grade({ data: { questionId: question.id, inchiKey } }));
    } catch {
      setError("Could not read that structure. Check for open valences or unfinished bonds.");
    } finally {
      setChecking(false);
    }
  }

  async function showQuestion(next: number) {
    setIndex(next);
    setResult(null);
    setError(null);
    await ketcherRef.current?.setMolecule("");
  }

  async function goTo(next: number) {
    const nextQuestion = QUESTIONS[next]!;
    setSeenQuestionIds((seen) =>
      seen.includes(nextQuestion.id) ? seen : [...seen, nextQuestion.id],
    );
    await showQuestion(next);
  }

  async function startTopicPractice(nextTopic: TopicFilter) {
    setTopicFilter(nextTopic);
    const matching = QUESTIONS.filter(
      (item) => nextTopic === "Mixed" || item.mechanism === nextTopic,
    );
    const first = matching[Math.floor(Math.random() * matching.length)]!;
    setSeenQuestionIds([first.id]);
    await showQuestion(QUESTIONS.indexOf(first));
  }

  async function nextRandomProblem() {
    const unvisited = activeQuestions.filter(
      (item) => !seenQuestionIds.includes(item.id),
    );
    const choices =
      unvisited.length > 0
        ? unvisited
        : activeQuestions.filter((item) => item.id !== question.id);
    const fallbackChoices = choices.length > 0 ? choices : activeQuestions;
    const next =
      fallbackChoices[Math.floor(Math.random() * fallbackChoices.length)]!;
    setSeenQuestionIds((seen) =>
      unvisited.length > 0 ? [...seen, next.id] : [next.id],
    );
    await showQuestion(QUESTIONS.indexOf(next));
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
            Draw the major product for each substitution or elimination reaction. Your
            drawing is graded on molecular structure, not on how it is arranged. Nothing is
            saved — no account, no attempt history.
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
                Endless practice
              </p>
              <h2
                id="endless-practice-heading"
                className="mt-1 text-lg font-semibold text-card-foreground"
              >
                Keep practicing with verified reaction problems
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {completedInCurrentSet} of {activeQuestions.length} problems visited in this{" "}
                {topicFilter.toLowerCase()} set.
                {completedInCurrentSet === activeQuestions.length
                  ? " You have completed the set — the next problem starts a fresh cycle."
                  : ""}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="text-sm font-medium text-card-foreground">
                Topic
                <select
                  value={topicFilter}
                  onChange={(event) =>
                    startTopicPractice(event.target.value as TopicFilter)
                  }
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground sm:w-32"
                >
                  {TOPIC_FILTERS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={nextRandomProblem}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                New random problem
              </button>
            </div>
          </div>
        </section>

        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Question list">
          {activeQuestions.map((q) => {
            const i = QUESTIONS.indexOf(q);
            return (
            <li key={q.id}>
              <button
                onClick={() => goTo(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Question ${i + 1}, ${q.mechanism}, ${
                  q.format === "scheme" ? "reaction scheme" : "text prompt"
                }`}
                className={
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
                  (i === index
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")
                }
              >
                {i + 1}. {q.mechanism}
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

        {question.format === "scheme" && question.substrateSmiles && (
          <div className="mb-6">
            <ReactionScheme
              substrateSmiles={question.substrateSmiles}
              substrateName={question.substrate}
              above={question.reagents}
              below={question.conditions}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="space-y-4">
            <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Question {index + 1} of {QUESTIONS.length}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-card-foreground">
                {question.title}
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Substrate</dt>
                  <dd className="text-card-foreground">{question.substrate}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Reagent</dt>
                  <dd className="text-card-foreground">{question.reagents}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Conditions</dt>
                  <dd className="text-card-foreground">{question.conditions}</dd>
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

            <div className="flex gap-2">
              <button
                onClick={check}
                disabled={checking}
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {checking ? "Checking…" : "Check my structure"}
              </button>
              <button
                onClick={nextRandomProblem}
                className="rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                Random next
              </button>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            {result && (
              <div
                className={
                  "rounded-xl border p-4 text-sm " +
                  (result.verdict === "correct"
                    ? "border-primary bg-accent text-accent-foreground"
                    : result.verdict === "partial"
                      ? "border-chart-4 bg-card text-card-foreground"
                      : "border-destructive/40 bg-card text-card-foreground")
                }
              >
                <p className="font-semibold">{result.message}</p>
                <p className="mt-2 text-muted-foreground">{result.explanation}</p>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Draw the major product
            </div>
            <div className="h-[560px]">
              <ClientOnly fallback={<EditorSkeleton />}>
                <Suspense fallback={<EditorSkeleton />}>
                  <KetcherCanvas
                    onInit={(k) => {
                      ketcherRef.current = k;
                      (window as unknown as { ketcher?: Ketcher }).ketcher = k;
                    }}
                  />
                </Suspense>
              </ClientOnly>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
