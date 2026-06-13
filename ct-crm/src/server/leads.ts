"use server";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contracts, deals, customers, leadNotes, leads, prospects, reminders, tasks, users } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

interface LeadInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: string;
  estimated_value?: number;
  notes?: string;
  website?: string;
  linkedin?: string;
  city?: string;
  country?: string;
  industry?: string;
  employee_count?: string;
  priority?: string;
  tags?: string[];
  owner_id?: string | null;
  owner_name_custom?: string | null;
}

function toSnakeLead(row: typeof leads.$inferSelect, notes: any[] = [], ownerName?: string | null) {
  return {
    id: row.id,
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email ?? "",
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    source: row.source ?? undefined,
    status: row.status ?? "NEW",
    estimated_value: row.estimatedValue ? Number(row.estimatedValue) : 0,
    notes: row.notes ?? undefined,
    created_at: (row.createdAt ?? new Date()).toISOString(),
    owner_id: row.ownerId ?? undefined,
    owner_name: ownerName ?? row.ownerNameCustom ?? undefined,
    owner_name_custom: row.ownerNameCustom ?? undefined,
    website: row.website ?? undefined,
    linkedin: row.linkedin ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    industry: row.industry ?? undefined,
    employee_count: row.employeeCount ?? undefined,
    priority: row.priority ?? "medium",
    starred: row.starred ?? false,
    tags: row.tags ?? [],
    lead_notes: notes,
  };
}

export async function getLeadById(id: string) {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({ lead: leads, ownerName: users.fullName })
    .from(leads)
    .leftJoin(users, eq(leads.ownerId, users.id))
    .where(and(eq(leads.id, id), eq(leads.organizationId, dbUser.organizationId)))
    .limit(1);

  if (rows.length === 0) return null;

  const notes = await db
    .select()
    .from(leadNotes)
    .where(eq(leadNotes.leadId, id))
    .orderBy(desc(leadNotes.createdAt));

  return toSnakeLead(
    rows[0].lead,
    notes.map((n) => ({
      id: n.id,
      text: n.text,
      created_at: (n.createdAt ?? new Date()).toISOString(),
      author: n.author ?? "You",
    })),
    rows[0].ownerName
  );
}

// Pipeline breadcrumb (#21, #27): which stage(s) of Lead → Prospect → Deal →
// Contract → Customer this lead has reached, plus the ids needed to link there.
export async function getLeadPipelineStatus(leadId: string) {
  const base = { stage: "lead" as "lead" | "prospect" | "deal" | "contract" | "customer", prospect_id: undefined as string | undefined, deal_id: undefined as string | undefined, contract_id: undefined as string | undefined, customer_id: undefined as string | undefined };

  const [prospectRow] = await db.select({ id: prospects.id }).from(prospects).where(eq(prospects.leadId, leadId)).limit(1);
  if (!prospectRow) return base;
  base.stage = "prospect";
  base.prospect_id = prospectRow.id;

  const [dealRow] = await db.select({ id: deals.id }).from(deals).where(eq(deals.leadId, leadId)).orderBy(desc(deals.createdAt)).limit(1);
  if (!dealRow) return base;
  base.stage = "deal";
  base.deal_id = dealRow.id;

  const [contractRow] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.dealId, dealRow.id)).orderBy(desc(contracts.createdAt)).limit(1);
  if (!contractRow) return base;
  base.stage = "contract";
  base.contract_id = contractRow.id;

  const [customerRow] = await db.select({ id: customers.id }).from(customers).where(eq(customers.contractId, contractRow.id)).limit(1);
  if (!customerRow) return base;
  base.stage = "customer";
  base.customer_id = customerRow.id;

  return base;
}

// ─── Follow-ups (#19, #20) — per-lead tasks backed by the shared `tasks` table ─
function toSnakeFollowUp(row: typeof tasks.$inferSelect) {
  let meta: { type?: string; notes?: string } = {};
  try {
    const parsed = row.description ? JSON.parse(row.description) : {};
    if (parsed && typeof parsed === "object") meta = parsed;
  } catch {
    meta = { notes: row.description ?? "" };
  }
  return {
    id: row.id,
    title: row.title,
    type: (meta.type ?? "follow_up") as "call" | "email" | "meeting" | "follow_up",
    notes: meta.notes ?? "",
    due_date: row.dueDate.toISOString(),
    done: row.isCompleted ?? false,
    created_at: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function getLeadFollowUps(leadId: string) {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.organizationId, dbUser.organizationId), eq(tasks.relatedType, "lead"), eq(tasks.relatedId, leadId)))
    .orderBy(asc(tasks.dueDate));
  return rows.map(toSnakeFollowUp);
}

export async function createLeadFollowUp(leadId: string, input: { title: string; type: string; due_date: string; notes?: string }) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(tasks)
    .values({
      organizationId: dbUser.organizationId,
      title: input.title,
      description: JSON.stringify({ type: input.type, notes: input.notes ?? "" }),
      dueDate: new Date(input.due_date),
      priority: "MEDIUM",
      relatedType: "lead",
      relatedId: leadId,
      isCompleted: false,
    })
    .returning({ id: tasks.id });
  return row;
}

export async function updateLeadFollowUp(id: string, input: { title: string; type: string; due_date: string; notes?: string }) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(tasks)
    .set({
      title: input.title,
      description: JSON.stringify({ type: input.type, notes: input.notes ?? "" }),
      dueDate: new Date(input.due_date),
    })
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)));
}

export async function toggleLeadFollowUpDone(id: string, done: boolean) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(tasks)
    .set({ isCompleted: done })
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)));
}

export async function deleteLeadFollowUp(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)));
}

export async function getLeads() {
  const dbUser = await getOrCreateDbUser();
  // Exclude leads that have already been converted to a prospect — once a lead
  // is qualified into the pipeline, it belongs to the Prospects module, not Leads.
  const leadRows = await db
    .select({ lead: leads, ownerName: users.fullName })
    .from(leads)
    .leftJoin(users, eq(leads.ownerId, users.id))
    .leftJoin(prospects, eq(prospects.leadId, leads.id))
    .where(and(eq(leads.organizationId, dbUser.organizationId), isNull(prospects.id)))
    .orderBy(desc(leads.createdAt));

  if (leadRows.length === 0) return [];

  const leadIds = leadRows.map((r) => r.lead.id);
  const notes = await db
    .select()
    .from(leadNotes)
    .where(inArray(leadNotes.leadId, leadIds))
    .orderBy(desc(leadNotes.createdAt));

  return leadRows.map((row) =>
    toSnakeLead(
      row.lead,
      notes
        .filter((n) => n.leadId === row.lead.id)
        .map((n) => ({
          id: n.id,
          text: n.text,
          created_at: (n.createdAt ?? new Date()).toISOString(),
          author: n.author ?? "You",
        })),
      row.ownerName
    )
  );
}

export async function getLeadReminders() {
  const dbUser = await getOrCreateDbUser();
  const leadRows = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.organizationId, dbUser.organizationId));

  if (leadRows.length === 0) return [];

  const leadIds = leadRows.map((l) => l.id);
  const rows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.entityType, "lead"), inArray(reminders.entityId, leadIds)))
    .orderBy(asc(reminders.datetime));

  return rows.map((r) => ({
    id: r.id,
    lead_id: r.entityId,
    lead_name: r.entityName ?? "",
    title: r.title,
    type: r.type,
    datetime: r.datetime.toISOString(),
    note: r.note ?? undefined,
    done: r.done ?? false,
  }));
}

export async function createLead(input: LeadInput) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(leads)
    .values({
      organizationId: dbUser.organizationId,
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      source: input.source,
      status: input.status as typeof leads.$inferInsert.status,
      estimatedValue: String(input.estimated_value ?? 0),
      notes: input.notes,
      website: input.website,
      linkedin: input.linkedin,
      city: input.city,
      country: input.country,
      industry: input.industry,
      employeeCount: input.employee_count,
      priority: input.priority,
      starred: false,
      tags: input.tags ?? [],
      ownerId: input.owner_id || null,
      ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null),
    })
    .returning({ id: leads.id });
  return row;
}

export async function updateLead(id: string, input: LeadInput) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(leads)
    .set({
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      source: input.source,
      status: input.status as typeof leads.$inferInsert.status,
      estimatedValue: String(input.estimated_value ?? 0),
      notes: input.notes,
      website: input.website,
      linkedin: input.linkedin,
      city: input.city,
      country: input.country,
      industry: input.industry,
      employeeCount: input.employee_count,
      priority: input.priority,
      tags: input.tags ?? [],
      ownerId: input.owner_id || null,
      ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null),
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, id), eq(leads.organizationId, dbUser.organizationId)));
}

export async function updateLeadStatus(id: string, status: string) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(leads)
    .set({ status: status as typeof leads.$inferInsert.status, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.organizationId, dbUser.organizationId)));
}

export async function deleteLead(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(leadNotes).where(eq(leadNotes.leadId, id));
  await db.delete(reminders).where(and(eq(reminders.entityType, "lead"), eq(reminders.entityId, id)));
  await db.delete(leads).where(and(eq(leads.id, id), eq(leads.organizationId, dbUser.organizationId)));
}

export async function addLeadNote(leadId: string, text: string) {
  const [row] = await db
    .insert(leadNotes)
    .values({ leadId, text, author: "You" })
    .returning({ id: leadNotes.id });
  return row;
}

export async function toggleLeadReminderDone(id: string, done: boolean) {
  await db.update(reminders).set({ done }).where(eq(reminders.id, id));
}

export async function createLeadReminder(input: {
  entity_id: string;
  entity_name: string;
  title: string;
  type: string;
  datetime: string;
  note?: string;
}) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(reminders)
    .values({
      entityType: "lead",
      entityId: input.entity_id,
      entityName: input.entity_name,
      title: input.title,
      type: input.type,
      datetime: new Date(input.datetime),
      note: input.note,
      done: false,
      createdBy: dbUser.id,
    })
    .returning({ id: reminders.id });
  return row;
}

// ─── Demo Data Seeding (Phase 16) ──────────────────────────────────────────
const SEED_FIRST_NAMES = [
  "Vikram", "Neha", "Arjun", "Sanya", "Rohan", "Priya", "Karan", "Ananya", "Aditya", "Pooja",
  "Rahul", "Divya", "Siddharth", "Kavya", "Manish", "Ritu", "Vivek", "Tanvi", "Akash", "Sneha",
  "Nikhil", "Meera", "Suresh", "Ishita", "Gaurav", "Aarti", "Harsh", "Nidhi", "Yash", "Swati",
  "Rajeev", "Bhavna", "Tarun", "Kriti", "Sameer", "Lavanya", "Deepak", "Anjali", "Mohit", "Shreya",
  "Abhinav", "Riya", "Naveen", "Pallavi", "Kunal", "Simran", "Vishal", "Komal", "Rakesh", "Diya",
];
const SEED_LAST_NAMES = [
  "Singh", "Patel", "Mehta", "Reddy", "Joshi", "Sharma", "Kapoor", "Iyer", "Verma", "Nair",
  "Gupta", "Malhotra", "Chopra", "Bose", "Rao", "Desai", "Pillai", "Saxena", "Agarwal", "Bhatt",
  "Kulkarni", "Menon", "Trivedi", "Banerjee", "Chauhan", "Shetty", "Mishra", "Khanna", "Dutta", "Sinha",
  "Pandey", "Gowda", "Rana", "Thakur", "Bajaj", "Sethi", "Goel", "Bhalla", "Arora", "Chatterjee",
  "Nayak", "Mahajan", "Bedi", "Kohli", "Tandon", "Vora", "Ahuja", "Sood", "Dixit", "Krishnan",
];
const SEED_COMPANIES = [
  "Acme Corp", "TechStart", "CloudSoft Technologies", "DataFlow Inc", "NovaTech Labs",
  "Quantum Systems", "BluePeak Solutions", "Zenith Digital", "Orbit Analytics", "Skyline Ventures",
  "Pinnacle Software", "Nexus Innovations", "Vertex Cloud", "Stellar Commerce", "Apex Industries",
  "Horizon Health", "Catalyst Media", "Infinity Retail", "Prime Logistics", "Vector Robotics",
  "Lumen Energy", "Crestline Finance", "Bright Path Edu", "Falcon Manufacturing", "Evergreen Foods",
  "Granite Realty", "Meridian Pharma", "Spark Mobility", "Cobalt Networks", "Ridgeline Group",
  "Atlas Engineering", "Velocity Sports", "Northstar Travel", "Coral Hospitality", "Ironclad Security",
  "Maple Insurance", "Beacon Telecom", "Quartz Materials", "Sunrise Agritech", "Wavelength Studios",
  "Anchor Shipping", "Element Apparel", "Trident Defense", "Glow Cosmetics", "Pivot Consulting",
  "Summit Capital", "Echo Broadcasting", "Cascade Water", "Onyx Automotive", "Lattice Biotech",
];
const SEED_INDUSTRIES = ["Technology", "SaaS", "Cloud", "Analytics", "HealthTech", "FinTech", "E-commerce", "Manufacturing", "Education", "Real Estate"];
const SEED_CITIES = ["Mumbai", "Bangalore", "Pune", "Hyderabad", "Delhi", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Surat"];
const SEED_STATUSES: NonNullable<typeof leads.$inferInsert.status>[] = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "REJECTED"];
const SEED_SOURCES = ["GOOGLE", "META", "REFERRAL", "WHATSAPP", "DIRECT", "LINKEDIN", "EVENT", "OTHER"];
const SEED_PRIORITIES = ["urgent", "high", "medium", "low"];
const SEED_TAGS = ["Enterprise", "Hot Lead", "Startup", "Ready to Close", "Follow-up", "Referral", "VIP", "Budget Approved"];
const SEED_NOTES = [
  "Had initial call, very interested.",
  "Requested pricing breakdown.",
  "Ready to sign proposal.",
  "Introductory call completed.",
  "Waiting on internal budget approval.",
  "Demo scheduled for next week.",
  "Comparing us against a competitor.",
  "Needs custom integration support.",
];
const SEED_REMINDER_TITLES = [
  { title: "Follow-up call", type: "call" },
  { title: "Send pricing email", type: "email" },
  { title: "Product demo meeting", type: "meeting" },
  { title: "Check in on proposal", type: "follow_up" },
];

/**
 * Seeds ~50 demo leads (varied statuses/sources/priorities/industries/cities,
 * created over the last 90 days) plus notes/reminders for some of them, so
 * pagination, filters, reports, dashboard cards, and the calendar all have
 * real data to demonstrate. No-ops if the org already has 5+ leads.
 */
export async function seedDemoLeads() {
  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;

  const existing = await db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, orgId));
  if (existing.length >= 5) return { skipped: true, count: existing.length };

  const COUNT = 50;
  const now = Date.now();
  const DAY = 86400000;

  const rows = Array.from({ length: COUNT }, (_, i) => {
    const firstName = SEED_FIRST_NAMES[i % SEED_FIRST_NAMES.length];
    const lastName = SEED_LAST_NAMES[i % SEED_LAST_NAMES.length];
    const company = SEED_COMPANIES[i % SEED_COMPANIES.length];
    const status = SEED_STATUSES[i % SEED_STATUSES.length];
    const source = SEED_SOURCES[i % SEED_SOURCES.length];
    const priority = SEED_PRIORITIES[i % SEED_PRIORITIES.length];
    const industry = SEED_INDUSTRIES[i % SEED_INDUSTRIES.length];
    const city = SEED_CITIES[i % SEED_CITIES.length];
    const createdAt = new Date(now - Math.floor(Math.random() * 90) * DAY);
    const slug = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}`;

    return {
      organizationId: orgId,
      firstName,
      lastName,
      email: `${slug}@${company.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
      phone: `+91-9${String(800000000 + i * 137).padStart(9, "0")}`,
      company,
      source,
      status,
      estimatedValue: String(50000 + (i % 10) * 45000),
      notes: i % 5 < 2 ? SEED_NOTES[i % SEED_NOTES.length] : null,
      website: `https://www.${company.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
      linkedin: `https://linkedin.com/company/${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      city,
      country: "India",
      industry,
      employeeCount: ["1-10", "11-50", "51-200", "201-500", "500+"][i % 5],
      priority,
      starred: i % 9 === 0,
      tags: [SEED_TAGS[i % SEED_TAGS.length], SEED_TAGS[(i + 3) % SEED_TAGS.length]],
      createdAt,
      updatedAt: createdAt,
    };
  });

  const inserted = await db.insert(leads).values(rows).returning({ id: leads.id });

  // ~40% of leads get a lead note
  const noteRows = inserted
    .filter((_, i) => i % 5 < 2)
    .map((lead, idx) => ({
      leadId: lead.id,
      text: SEED_NOTES[idx % SEED_NOTES.length],
      author: "You",
    }));
  if (noteRows.length > 0) await db.insert(leadNotes).values(noteRows);

  // ~30% of leads get a reminder — mix of overdue, due today, and upcoming
  const reminderRows = inserted
    .filter((_, i) => i % 10 < 3)
    .map((lead, idx) => {
      const cycle = idx % 3; // 0 = overdue, 1 = due today, 2 = upcoming
      const offsetDays = cycle === 0 ? -(1 + (idx % 3)) : cycle === 2 ? 1 + (idx % 5) : 0;
      const datetime = new Date(now + offsetDays * DAY);
      datetime.setHours(9 + (idx % 8), 0, 0, 0);
      const r = SEED_REMINDER_TITLES[idx % SEED_REMINDER_TITLES.length];
      const seedLead = rows[inserted.findIndex((row) => row.id === lead.id)];
      return {
        entityType: "lead",
        entityId: lead.id,
        entityName: `${seedLead.firstName} ${seedLead.lastName}`,
        title: r.title,
        type: r.type,
        datetime,
        note: null,
        done: false,
        createdBy: dbUser.id,
      };
    });
  if (reminderRows.length > 0) await db.insert(reminders).values(reminderRows);

  return { skipped: false, inserted: inserted.length };
}
