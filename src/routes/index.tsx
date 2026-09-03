import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";

import { QUESTIONS } from "@/lib/questions";
import { gradeAnswer, type GradeResult } from "@/lib/grading.functions";

import ReactionScheme from "@/components/ReactionScheme";

const KetcherCanvas = lazy(() => import("@/components/KetcherCanvas"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Organic Reaction Drawing Practice | SN1, SN2, E1, E2" },
      {
        name: "description",
        content:
          "Draw the major product for five substitution and elimination reactions in a real structure editor and get instant, structure-aware feedback.",
      },
      { property: "og:title", content: "Organic Reaction Drawing Practice" },
      {
        property: "og:description",
        content:
          "Practice SN1, SN2, E1 and E2 major products by drawing them — graded on molecular structure, not multiple choice.",
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
  const ketcherRef = useRef<Ketcher | null>(null);

  const grade = useServerFn(gradeAnswer);
  const question = QUESTIONS[index]!;

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

  async function goTo(next: number) {
    setIndex(next);
    setResult(null);
    setError(null);
    await ketcherRef.current?.setMolecule("");
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
        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Question list">
          {QUESTIONS.map((q, i) => (
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
          ))}
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
                onClick={() => goTo((index + 1) % QUESTIONS.length)}
                className="rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                Next
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
