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
export type PracticeModeId =
  "mixed" | "sn1" | "sn2" | "e1" | "e2" | "substitution" | "elimination";
export type PracticeSettings = {
  modeId: PracticeModeId;
  difficulty: DifficultyFilter;
  sessionLength: SessionLength;
};

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

function isStereospecificE2(question: Question) {
  return (
    getQuestionMechanisms(question).includes("E2") &&
    Boolean(question.conformationalHint) &&
    (question.stereochemistryMatters || question.alkeneGeometryMatters)
  );
}

function ensureStereospecificE2(
  selected: Question[],
  available: readonly Question[],
  difficulty: DifficultyFilter,
) {
  if (
    selected.length < 10 ||
    (difficulty !== "progressive" && difficulty !== "advanced") ||
    selected.some(isStereospecificE2)
  ) {
    return selected;
  }

  // The available bank has already been filtered by reaction type, difficulty,
  // and archive settings. Never add a question outside those selections.
  const required = available.find(isStereospecificE2);
  if (!required) return selected;

  // Replace within the same level so a Progressive set keeps its difficulty
  // allocation and easy-to-hard order. The E/Z problems are advanced.
  const replacementIndex = selected
    .map(getQuestionDifficulty)
    .lastIndexOf(getQuestionDifficulty(required));
  if (replacementIndex < 0) return selected;
  const covered = [...selected];
  covered[replacementIndex] = required;
  return covered;
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
    return ensureStereospecificE2(ordered.slice(0, total), ordered, difficulty);
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
  const ordered = groups.flat();
  return ensureStereospecificE2(
    ordered.filter((question) => selectedIds.has(question.id)),
    ordered,
    difficulty,
  );
}
