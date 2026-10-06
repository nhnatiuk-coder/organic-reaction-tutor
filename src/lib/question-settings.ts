/**
 * Instructor controls for the practice bank.
 *
 * To remove a problem from student practice, add its ID below.
 * Example: "q3",
 *
 * The question and its answer key are preserved, so remove the ID later to restore it.
 */
export const DISABLED_QUESTION_IDS = new Set<string>([
  "q2",
  // Archived because their displayed carbon skeleton exceeds the eight-carbon
  // maximum. The records and grading keys remain available for restoration or
  // later rewriting as shorter, distinct structures.
  "q14",
  "q15",
  "q44",
  "q47",
  "q48",
  "q49",
  "q50",
  "q51",
  "q54",
  "q63",
  "q70",
  "q85",
  "q88",
]);
