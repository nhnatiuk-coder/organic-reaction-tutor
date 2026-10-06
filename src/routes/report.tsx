import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  downloadPracticeReport,
  summarizePracticeReport,
} from "@/lib/practice-report";
import {
  queuePracticeRestart,
  readCompletedPracticeSession,
  type CompletedPracticeSession,
} from "@/lib/practice-session-store";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Practice Session Report" }] }),
  component: ReportPage,
});

function ReportPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CompletedPracticeSession | null>();
  const [restarting, setRestarting] = useState(false);
  useEffect(() => {
    setSession(readCompletedPracticeSession());
  }, []);

  if (!session) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <section className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold text-card-foreground">
            {session === undefined
              ? "Loading your report…"
              : "No completed session report"}
          </h1>
          {session === null && (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Finish a practice set to see its results here. Reports stay in
                the browser tab where you completed the session.
              </p>
              <a
                href="/practice"
                className="mt-5 inline-block rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
              >
                Start practice
              </a>
            </>
          )}
        </section>
      </main>
    );
  }

  const { report } = session;
  const summary = summarizePracticeReport(report);
  const metrics = [
    ["Correct", summary.correct],
    ["Partially correct", summary.partial],
    ["Needs revision", summary.incorrect],
    ["Not checked", summary.notChecked],
  ] as const;

  async function restart() {
    if (!session || restarting) return;
    setRestarting(true);
    queuePracticeRestart(session);
    if (session.studentView) {
      await navigate({
        to: "/practice",
        search: {
          start: "1",
          mode: session.settings.modeId,
          difficulty: session.settings.difficulty,
          length: String(session.settings.sessionLength),
        },
      });
    } else {
      await navigate({ to: "/" });
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            Organic Chemistry I · Session complete
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Your practice report</h1>
          <p className="mt-2 text-sm opacity-90">
            {report.practiceSet} · {report.difficulty} · {report.totalProblems}{" "}
            problems
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section
          aria-labelledby="report-summary-heading"
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2
            id="report-summary-heading"
            className="text-xl font-semibold text-card-foreground"
          >
            Session results
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {summary.checkedCount} of {report.totalProblems} problems checked.
            Final-check accuracy: {summary.accuracy}%. Correct on the first
            check: {summary.firstAttemptCorrect}.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map(([label, count]) => (
              <div key={label} className="rounded-lg bg-muted/50 p-4">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-card-foreground">
                  {count}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={restart}
              disabled={restarting}
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {restarting ? "Restarting…" : "Restart this set"}
            </button>
            <button
              onClick={() => downloadPracticeReport(report)}
              className="rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary"
            >
              Download PDF report
            </button>
            <a
              href={session.studentView ? "/practice" : "/"}
              className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-card-foreground"
            >
              Choose a new set
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Restart repeats these same questions with fresh attempts and hints.
            Your report stays only in this browser tab; no account or student
            name is required.
          </p>
        </section>
        <section
          aria-labelledby="question-outcomes-heading"
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          <h2
            id="question-outcomes-heading"
            className="px-6 py-4 text-lg font-semibold text-card-foreground"
          >
            Question outcomes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Question
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Reference
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Final result
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Checks
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.outcomes.map((outcome) => (
                  <tr
                    key={outcome.reference}
                    className="border-t border-border text-card-foreground"
                  >
                    <td className="px-6 py-3">{outcome.questionNumber}</td>
                    <td className="px-6 py-3 font-medium">
                      {outcome.reference}
                    </td>
                    <td className="px-6 py-3">
                      {outcome.attempts === 0
                        ? "Not checked"
                        : outcome.latestAttempt === "correct"
                          ? "Correct"
                          : outcome.latestAttempt === "partial"
                            ? "Partially correct"
                            : "Needs revision"}
                    </td>
                    <td className="px-6 py-3">{outcome.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
