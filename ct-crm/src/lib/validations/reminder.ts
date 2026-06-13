import { z } from "zod";

// Set Reminder modal (Leads/Prospects/etc.) and Calendar quick-create (#26).
export const reminderSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  type: z.enum(["call", "email", "meeting", "follow_up"]),
  datetime: z.string().trim().min(1, "Date & time is required"),
  note: z.string(),
});

export type ReminderValues = z.input<typeof reminderSchema>;

export function validateReminder(values: ReminderValues) {
  const result = reminderSchema.safeParse(values);
  if (result.success) return { valid: true, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
