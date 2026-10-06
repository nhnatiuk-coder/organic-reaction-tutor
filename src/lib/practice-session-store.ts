import { z } from "zod";

const settingsSchema = z.object({
  modeId: z.enum([
    "mixed",
    "sn1",
    "sn2",
    "e1",
    "e2",
    "substitution",
    "elimination",
  ]),
  difficulty: z.enum([
    "progressive",
    "introductory",
    "intermediate",
    "advanced",
  ]),
  sessionLength: z.union([
    z.literal(5),
    z.literal(10),
    z.literal(25),
    z.literal(30),
    z.literal(50),
    z.literal("all"),
  ]),
});
const restartSchema = z.object({
  settings: settingsSchema,
  studentView: z.boolean(),
  questionIds: z.array(z.string().min(1)).min(1),
});
const verdictSchema = z.enum(["correct", "partial", "incorrect"]);
const completedSchema = restartSchema
  .extend({
    report: z.object({
      practiceSet: z.string(),
      difficulty: z.string(),
      sessionLength: z.string(),
      startedAt: z.coerce.date(),
      finishedAt: z.coerce.date(),
      totalProblems: z.number().int().positive(),
      outcomes: z.array(
        z.object({
          questionNumber: z.number().int().positive(),
          reference: z.string().min(1),
          attempts: z.number().int().nonnegative(),
          firstAttempt: verdictSchema,
          latestAttempt: verdictSchema,
        }),
      ),
    }),
  })
  .refine(
    (session) =>
      session.questionIds.length === session.report.totalProblems &&
      session.report.outcomes.length === session.report.totalProblems &&
      new Set(session.questionIds).size === session.questionIds.length,
  );

export type CompletedPracticeSession = z.infer<typeof completedSchema>;
export type RestartPracticeSession = z.infer<typeof restartSchema>;
const REPORT_KEY = "organic-tutor:completed-session:v1";
const RESTART_KEY = "organic-tutor:restart-session:v1";
let completedCache: CompletedPracticeSession | null = null;
let restartCache: RestartPracticeSession | null = null;

/** Report data stays in this browser tab, never in a server or URL. */
export function saveCompletedPracticeSession(
  session: CompletedPracticeSession,
) {
  if (typeof window === "undefined") return;
  completedCache = completedSchema.parse(session);
  try {
    window.sessionStorage.setItem(REPORT_KEY, JSON.stringify(completedCache));
  } catch {
    /* In-memory navigation still works when tab storage is unavailable. */
  }
}

export function readCompletedPracticeSession(): CompletedPracticeSession | null {
  if (typeof window === "undefined") return null;
  if (completedCache) return completedCache;
  try {
    const raw = window.sessionStorage.getItem(REPORT_KEY);
    if (!raw) return null;
    const parsed = completedSchema.safeParse(JSON.parse(raw));
    completedCache = parsed.success ? parsed.data : null;
  } catch {
    completedCache = null;
  }
  return completedCache;
}

export function queuePracticeRestart(session: CompletedPracticeSession) {
  if (typeof window === "undefined") return;
  // Keep exactly the same set, with no answers, attempts, or hints carried over.
  restartCache = restartSchema.parse(session);
  completedCache = null;
  try {
    window.sessionStorage.setItem(RESTART_KEY, JSON.stringify(restartCache));
    window.sessionStorage.removeItem(REPORT_KEY);
  } catch {
    /* The same-tab fallback preserves the requested restart. */
  }
}

export function takePracticeRestart(
  studentView: boolean,
): RestartPracticeSession | null {
  if (typeof window === "undefined") return null;
  let pending = restartCache;
  if (!pending) {
    try {
      const raw = window.sessionStorage.getItem(RESTART_KEY);
      if (raw) {
        const parsed = restartSchema.safeParse(JSON.parse(raw));
        pending = parsed.success ? parsed.data : null;
      }
    } catch {
      return null;
    }
  }
  if (!pending || pending.studentView !== studentView) return null;
  restartCache = null;
  try {
    window.sessionStorage.removeItem(RESTART_KEY);
  } catch {
    /* Already consumed in memory. */
  }
  return pending;
}
