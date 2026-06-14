import { z } from "zod";

// Form shown when converting a Prospect into a Deal (Phase 26).
export const dealConversionSchema = z.object({
  title: z.string().trim().min(1, "Deal title is required"),
  value: z
    .string()
    .trim()
    .min(1, "Value is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Value must be a positive number"),
  stage: z.enum(["NEW", "PROPOSAL", "NEGOTIATION", "CONTRACT", "WON", "LOST"]),
  probability: z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), "Probability must be between 0 and 100"),
  expected_close_date: z.string().optional(),
});

export type DealConversionValues = z.input<typeof dealConversionSchema>;

export function validateDealConversion(values: DealConversionValues) {
  const result = dealConversionSchema.safeParse(values);
  if (result.success) return { valid: true, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
