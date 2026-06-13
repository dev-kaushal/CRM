import { z } from "zod";

// BANT (Budget, Authority, Need, Timeline) form shown when converting a Lead to a Prospect (#15).
export const prospectConversionSchema = z.object({
  budget: z.string().trim().min(1, "Budget is required"),
  authority: z.string().trim().min(1, "Decision-maker is required"),
  need: z.string().trim().min(1, "Need / pain point is required"),
  timeline: z.string().trim().min(1, "Timeline is required"),
  industry: z.string().trim().min(1, "Industry is required"),
  city: z.string().trim().min(1, "City is required"),
});

export type ProspectConversionValues = z.input<typeof prospectConversionSchema>;

export function validateProspectConversion(values: ProspectConversionValues) {
  const result = prospectConversionSchema.safeParse(values);
  if (result.success) return { valid: true, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
