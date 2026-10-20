import type { GradeResult } from "./grading.functions";
import type { PracticeReportVerdict } from "./practice-report";

export const MAX_PRACTICE_ATTEMPTS = 3;

export type PracticeResult =
  | { kind: "single"; grade: GradeResult }
  | {
      kind: "competition";
      substitution: GradeResult;
      elimination: GradeResult;
    };

export type QuestionAttemptState = {
  attempts: number;
  firstAttempt: PracticeReportVerdict;
  latestAttempt: PracticeReportVerdict;
  result: PracticeResult;
};

export function isPracticeQuestionFinished(state?: QuestionAttemptState) {
  return Boolean(
    state &&
    (state.latestAttempt === "correct" ||
      state.attempts >= MAX_PRACTICE_ATTEMPTS),
  );
}

/** A completed check of both competition products counts as one attempt. */
export function recordPracticeAttempt(
  previous: QuestionAttemptState | undefined,
  result: PracticeResult,
): QuestionAttemptState {
  if (previous && isPracticeQuestionFinished(previous)) return previous;
  const grades =
    result.kind === "single"
      ? [result.grade]
      : [result.substitution, result.elimination];
  const verdict = grades.every((grade) => grade.verdict === "correct")
    ? "correct"
    : grades.every((grade) => grade.verdict === "incorrect")
      ? "incorrect"
      : "partial";
  return {
    attempts: (previous?.attempts ?? 0) + 1,
    firstAttempt: previous?.firstAttempt ?? verdict,
    latestAttempt: verdict,
    result,
  };
}
