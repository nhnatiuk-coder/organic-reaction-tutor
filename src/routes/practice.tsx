import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  DEFAULT_STUDENT_SETTINGS,
  DIFFICULTY_OPTIONS,
  normalisePracticeSettings,
  PRACTICE_MODES,
  PracticePage,
  type DifficultyFilter,
  type PracticeModeId,
  type SessionLength,
  SESSION_LENGTHS,
} from "./index";

type StudentPracticeSearch = {
  start?: string;
  mode?: string;
  difficulty?: string;
  length?: string;
};

export const Route = createFileRoute("/practice")({
  validateSearch: (search: Record<string, unknown>): StudentPracticeSearch => ({
    start: typeof search.start === "string" ? search.start : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
    difficulty:
      typeof search.difficulty === "string" ? search.difficulty : undefined,
    length: typeof search.length === "string" ? search.length : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Organic Reaction Drawing Practice" },
      {
        name: "description",
        content:
          "Practice drawing major organic reaction products with instant structural feedback.",
      },
    ],
  }),
  component: StudentPracticePage,
});

function StudentPracticePage() {
  const search = Route.useSearch();
  const sessionLength =
    search.length === "all" ? "all" : (Number(search.length) as SessionLength);
  const settings = normalisePracticeSettings({
    modeId: search.mode as PracticeModeId,
    difficulty: search.difficulty as DifficultyFilter,
    sessionLength,
  });

  if (search.start === "1") {
    return (
      <PracticePage
        studentView
        initialSettings={settings}
        showSessionControls={false}
        setupHref="/practice"
      />
    );
  }

  return <StudentSetupPage />;
}

function StudentSetupPage() {
  const [modeId, setModeId] = useState<PracticeModeId>(
    DEFAULT_STUDENT_SETTINGS.modeId,
  );
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(
    DEFAULT_STUDENT_SETTINGS.difficulty,
  );
  const [sessionLength, setSessionLength] = useState<SessionLength>(
    DEFAULT_STUDENT_SETTINGS.sessionLength,
  );
  const selectedMode = PRACTICE_MODES.find((mode) => mode.id === modeId)!;
  const startHref = `/practice?${new URLSearchParams({
    start: "1",
    mode: modeId,
    difficulty,
    length: String(sessionLength),
  }).toString()}`;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            Organic Chemistry I · Practice
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Reaction Drawing Practice
          </h1>
          <p className="mt-2 max-w-2xl text-sm opacity-90">
            Build a practice set, then draw the major organic product for each
            reaction.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Before you begin
          </p>
          <h2 className="mt-1 text-xl font-semibold text-card-foreground">
            How to use this practice
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
            <li>
              Choose the reaction type, difficulty, and number of problems for
              this session.
            </li>
            <li>
              Read the reaction scheme, then draw only the major organic product
              in the structure editor.
            </li>
            <li>
              Select{" "}
              <strong className="font-semibold text-card-foreground">
                Check my structure
              </strong>{" "}
              for immediate feedback. You may request a reaction-type hint when
              you decide you need one.
            </li>
          </ol>
          <p className="mt-5 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            Your work is not saved and no account is required.
          </p>
        </section>

        <section
          aria-labelledby="practice-setup-heading"
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Practice setup
          </p>
          <h2
            id="practice-setup-heading"
            className="mt-1 text-xl font-semibold text-card-foreground"
          >
            Choose your set
          </h2>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-card-foreground">
              Reaction type
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRACTICE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setModeId(mode.id)}
                  aria-pressed={mode.id === modeId}
                  className={
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                    (mode.id === modeId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedMode.description}
            </p>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-card-foreground">
              Difficulty
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDifficulty(option.id)}
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
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-card-foreground">
              Number of problems
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SESSION_LENGTHS.map((length) => (
                <button
                  key={String(length)}
                  type="button"
                  onClick={() => setSessionLength(length)}
                  aria-pressed={length === sessionLength}
                  className={
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                    (length === sessionLength
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")
                  }
                >
                  {length === "all" ? "All available" : `${length}`}
                </button>
              ))}
            </div>
          </fieldset>

          <a
            href={startHref}
            className="mt-6 block rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start practice
          </a>
        </section>
      </div>
    </main>
  );
}
