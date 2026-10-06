import {
  getQuestionDifficulty,
  getQuestionMechanisms,
  PRACTICE_QUESTIONS,
  type DifficultyLevel,
  type ElementaryMechanism,
  type Question,
} from "./questions";

export type DifficultyFilter = "progressive" | DifficultyLevel;
export type SessionLength = 5 | 10 | 25 | 30 | 50 | "all";

export function questionsForFilters(
  mode: { mechanisms: readonly ElementaryMechanism[] },
  difficulty: DifficultyFilter,
) {
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

export function sessionQuestionsFor(
  questions: readonly Question[],
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
  if (groups.length === 0) return [];

  const targetPerGroup = Math.floor(total / groups.length);
  let remaining = total % groups.length;
  const selectedIds = new Set<string>();
  for (const group of groups) {
    const target = targetPerGroup + (remaining > 0 ? 1 : 0);
    remaining -= 1;
    for (const question of group.slice(0, target)) selectedIds.add(question.id);
  }

  // Fill shortages when a level has fewer questions, then return the chosen
  // questions in level order. Appending replacements directly would put easy
  // questions after advanced ones with the smaller curated bank.
  for (const question of groups.flat()) {
    if (selectedIds.size >= total) break;
    selectedIds.add(question.id);
  }
  return groups.flat().filter((question) => selectedIds.has(question.id));
}
