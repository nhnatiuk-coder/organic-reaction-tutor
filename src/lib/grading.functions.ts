import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_PRACTICE_ATTEMPTS } from "./practice-attempts";

const GradeInput = z.object({
  questionId: z.string().min(1).max(20),
  productSlot: z.enum(["main", "substitution", "elimination"]).default("main"),
  attemptNumber: z.number().int().min(1).max(MAX_PRACTICE_ATTEMPTS),
  inchiKey: z
    .string()
    .trim()
    .regex(
      /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i,
      "Unrecognised structure fingerprint",
    ),
});

export type GradeResult = {
  verdict: "correct" | "partial" | "incorrect";
  message: string;
  explanation: string;
  /** Returned only with the final allowed check, never in the public bank. */
  solution?: { name: string; smiles: string };
};

export const gradeAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GradeInput.parse(input))
  .handler(async ({ data }): Promise<GradeResult> => {
    const { gradeStructure } = await import("./answer-keys.server");
    const result = gradeStructure(
      data.questionId,
      data.inchiKey,
      data.productSlot,
      data.attemptNumber,
    );
    if (!result) throw new Error("Unknown question");
    return result;
  });
