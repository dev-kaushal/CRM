import { z } from "zod";

// Per-lead follow-up tasks (#19, #20) — Schedule Call/Email/Meeting/Follow-up.
export const followUpSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(["call", "email", "meeting", "follow_up"]),
  due_date: z.string().trim().min(1, "Due date is required"),
  notes: z.string(),
});

export type FollowUpValues = z.input<typeof followUpSchema>;

export function validateFollowUp(values: FollowUpValues) {
  const result = followUpSchema.safeParse(values);
  if (result.success) return { valid: true, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
