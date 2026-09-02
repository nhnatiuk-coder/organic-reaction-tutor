import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GradeInput = z.object({
  questionId: z.string().min(1).max(20),
  inchiKey: z
    .string()
    .trim()
    .regex(/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i, "Unrecognised structure fingerprint"),
});

export type GradeResult = {
  verdict: "correct" | "partial" | "incorrect";
  message: string;
  explanation: string;
};

export const gradeAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GradeInput.parse(input))
  .handler(async ({ data }): Promise<GradeResult> => {
    const { gradeStructure } = await import("./answer-keys.server");
    const result = gradeStructure(data.questionId, data.inchiKey);
    if (!result) throw new Error("Unknown question");
    return result;
  });
