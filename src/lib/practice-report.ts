export type PracticeReportVerdict = "correct" | "partial" | "incorrect";

export type PracticeReportOutcome = {
  questionNumber: number;
  attempts: number;
  firstAttempt: PracticeReportVerdict;
  latestAttempt: PracticeReportVerdict;
};

export type PracticeReportData = {
  practiceSet: string;
  difficulty: string;
  sessionLength: string;
  startedAt: Date;
  finishedAt: Date;
  totalProblems: number;
  outcomes: PracticeReportOutcome[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(date)
    .replaceAll("\u202f", " ");
}

function toPdfText(value: string) {
  return value
    .normalize("NFKD")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replace(/[^\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function wrapLine(line: string, maxLength = 78) {
  if (line.length <= maxLength) return [line];

  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function pdfByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function verdictLabel(verdict: PracticeReportVerdict) {
  if (verdict === "correct") return "Correct";
  if (verdict === "partial") return "Partially correct";
  return "Needs revision";
}

function buildPdf(lines: string[]) {
  const linesPerPage = 46;
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(lines.length / linesPerPage)) },
    (_, index) => lines.slice(index * linesPerPage, (index + 1) * linesPerPage),
  );
  const pageReferences = pages
    .map((_, index) => `${4 + index * 2} 0 R`)
    .join(" ");
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageReferences}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  pages.forEach((page, index) => {
    const pageObject = 4 + index * 2;
    const contentObject = pageObject + 1;
    const text = [
      "BT",
      "/F1 15 Tf",
      "54 742 Td",
      "18 TL",
      `(${toPdfText(page[0] ?? "Organic Chemistry I - Practice Report")}) Tj`,
      "/F1 10 Tf",
      "14 TL",
      "0 -26 Td",
      ...page
        .slice(1)
        .flatMap((line) => [`(${toPdfText(line)}) Tj`, "0 -14 Td"]),
      "ET",
    ].join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`,
      `<< /Length ${pdfByteLength(text)} >>\nstream\n${text}\nendstream`,
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdfByteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdfByteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadPracticeReport(data: PracticeReportData) {
  const checked = data.outcomes.filter((outcome) => outcome.attempts > 0);
  const correct = checked.filter(
    (outcome) => outcome.latestAttempt === "correct",
  ).length;
  const partial = checked.filter(
    (outcome) => outcome.latestAttempt === "partial",
  ).length;
  const incorrect = checked.filter(
    (outcome) => outcome.latestAttempt === "incorrect",
  ).length;
  const firstAttemptCorrect = checked.filter(
    (outcome) => outcome.firstAttempt === "correct",
  ).length;
  const lines = [
    "Organic Chemistry I - Reaction Drawing Practice Report",
    `Generated: ${formatDate(data.finishedAt)}`,
    "",
    "Session details",
    `Practice set: ${data.practiceSet}`,
    `Difficulty: ${data.difficulty}`,
    `Session length: ${data.sessionLength}`,
    `Started: ${formatDate(data.startedAt)}`,
    "",
    "Summary",
    `Problems in session: ${data.totalProblems}`,
    `Problems checked: ${checked.length}`,
    `Correct on final check: ${correct}`,
    `Partially correct on final check: ${partial}`,
    `Needs revision on final check: ${incorrect}`,
    `Not checked: ${data.totalProblems - checked.length}`,
    `Correct on first check: ${firstAttemptCorrect}`,
    `Final-check accuracy: ${checked.length ? Math.round((correct / checked.length) * 100) : 0}%`,
    "",
    "This report was generated in this browser. No student name, answer, or report was sent to or stored by the practice site.",
  ];

  if (data.totalProblems <= 50) {
    lines.push("", "Question outcomes");
    data.outcomes.forEach((outcome) => {
      lines.push(
        outcome.attempts > 0
          ? `Question ${outcome.questionNumber}: ${verdictLabel(outcome.latestAttempt)} after ${outcome.attempts} ${outcome.attempts === 1 ? "check" : "checks"} (first check: ${verdictLabel(outcome.firstAttempt)})`
          : `Question ${outcome.questionNumber}: Not checked`,
      );
    });
  } else {
    lines.push(
      "",
      "Individual question outcomes are omitted from all-available reports to keep the PDF concise.",
    );
  }

  const wrappedLines = lines.flatMap((line) => (line ? wrapLine(line) : [""]));
  const blob = buildPdf(wrappedLines);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = data.finishedAt.toISOString().slice(0, 10);
  link.href = url;
  link.download = `organic-reaction-practice-report-${date}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
