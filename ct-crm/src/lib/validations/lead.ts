import { z } from "zod";

// Validates the Create/Edit Lead form's raw string-based field values.
// Email OR phone is required so a sales rep always has a way to reach the lead (#17).
export const leadFormSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().refine(v => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address"),
  phone: z.string().trim(),
  company: z.string().trim(),
  source: z.string(),
  estimated_value: z.string().refine(v => v.trim() === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Must be a positive number"),
  notes: z.string(),
  website: z.string(),
  linkedin: z.string(),
  city: z.string(),
  country: z.string(),
  industry: z.string(),
  employee_count: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "REJECTED"]),
  tags: z.string(),
  owner_id: z.string(),
  owner_name_custom: z.string(),
}).refine(data => data.email.trim() !== "" || data.phone.trim() !== "", {
  message: "Add an email or phone number so a rep can reach this lead",
  path: ["email"],
});

export type LeadFormValues = z.input<typeof leadFormSchema>;

export function validateLeadForm(values: LeadFormValues) {
  const result = leadFormSchema.safeParse(values);
  if (result.success) return { valid: true, errors: {} as Record<string, string> };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
