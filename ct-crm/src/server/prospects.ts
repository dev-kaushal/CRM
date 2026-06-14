"use server";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contracts, customers, deals, leads, prospectNotes, prospects, reminders, tasks, users } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";
import { seedDemoLeads } from "./leads";

interface ProspectInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  budget?: number;
  authority?: boolean;
  need?: string;
  timeline?: string;
  status?: string;
  source?: string;
  industry?: string;
  city?: string;
  notes?: string;
  tags?: string[];
  owner_id?: string | null;
  owner_name_custom?: string | null;
  rating?: string | null;
  project_name?: string | null;
}

function toSnakeProspect(row: {
  id: string;
  budget: string | null;
  authority: boolean | null;
  need: string | null;
  timeline: string | null;
  qualifiedAt: Date | null;
  status: string | null;
  source: string | null;
  industry: string | null;
  city: string | null;
  notes: string | null;
  starred: boolean | null;
  tags: string[] | null;
  createdAt: Date | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  leadId: string;
  ownerId?: string | null;
  ownerNameCustom?: string | null;
  rating?: string | null;
  projectName?: string | null;
}, pnotes: any[] = [], ownerName?: string | null) {
  return {
    id: row.id,
    lead_id: row.leadId,
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    budget: row.budget ? Number(row.budget) : 0,
    authority: row.authority ?? false,
    need: row.need ?? undefined,
    timeline: row.timeline ?? undefined,
    status: row.status ?? "QUALIFIED",
    source: row.source ?? undefined,
    industry: row.industry ?? undefined,
    city: row.city ?? undefined,
    notes: row.notes ?? undefined,
    starred: row.starred ?? false,
    tags: row.tags ?? [],
    pnotes,
    owner_id: row.ownerId ?? undefined,
    owner_name: ownerName ?? row.ownerNameCustom ?? undefined,
    owner_name_custom: row.ownerNameCustom ?? undefined,
    rating: row.rating ?? undefined,
    project_name: row.projectName ?? undefined,
    qualified_at: (row.qualifiedAt ?? new Date()).toISOString(),
    created_at: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function getProspects() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({
      id: prospects.id,
      leadId: prospects.leadId,
      budget: prospects.budget,
      authority: prospects.authority,
      need: prospects.need,
      timeline: prospects.timeline,
      qualifiedAt: prospects.qualifiedAt,
      status: prospects.status,
      source: prospects.source,
      industry: prospects.industry,
      city: prospects.city,
      notes: prospects.notes,
      starred: prospects.starred,
      tags: prospects.tags,
      ownerId: prospects.ownerId,
      ownerNameCustom: prospects.ownerNameCustom,
      rating: prospects.rating,
      projectName: prospects.projectName,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      phone: leads.phone,
      company: leads.company,
      createdAt: leads.createdAt,
      ownerName: users.fullName,
    })
    .from(prospects)
    .innerJoin(leads, eq(prospects.leadId, leads.id))
    .leftJoin(users, eq(prospects.ownerId, users.id))
    .where(eq(leads.organizationId, dbUser.organizationId))
    .orderBy(desc(prospects.qualifiedAt));

  if (rows.length === 0) return [];

  const prospectIds = rows.map((r) => r.id);
  const notes = await db
    .select()
    .from(prospectNotes)
    .where(inArray(prospectNotes.prospectId, prospectIds))
    .orderBy(desc(prospectNotes.createdAt));

  return rows.map((row) =>
    toSnakeProspect(
      row,
      notes
        .filter((n) => n.prospectId === row.id)
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

export async function getProspectById(id: string) {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({
      id: prospects.id,
      leadId: prospects.leadId,
      budget: prospects.budget,
      authority: prospects.authority,
      need: prospects.need,
      timeline: prospects.timeline,
      qualifiedAt: prospects.qualifiedAt,
      status: prospects.status,
      source: prospects.source,
      industry: prospects.industry,
      city: prospects.city,
      notes: prospects.notes,
      starred: prospects.starred,
      tags: prospects.tags,
      ownerId: prospects.ownerId,
      ownerNameCustom: prospects.ownerNameCustom,
      rating: prospects.rating,
      projectName: prospects.projectName,
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      phone: leads.phone,
      company: leads.company,
      createdAt: leads.createdAt,
      ownerName: users.fullName,
    })
    .from(prospects)
    .innerJoin(leads, eq(prospects.leadId, leads.id))
    .leftJoin(users, eq(prospects.ownerId, users.id))
    .where(and(eq(prospects.id, id), eq(leads.organizationId, dbUser.organizationId)))
    .limit(1);

  if (rows.length === 0) return null;

  const notes = await db
    .select()
    .from(prospectNotes)
    .where(eq(prospectNotes.prospectId, id))
    .orderBy(desc(prospectNotes.createdAt));

  return toSnakeProspect(
    rows[0],
    notes.map((n) => ({
      id: n.id,
      text: n.text,
      created_at: (n.createdAt ?? new Date()).toISOString(),
      author: n.author ?? "You",
    })),
    rows[0].ownerName
  );
}

// Pipeline breadcrumb (mirrors getLeadPipelineStatus): which stage(s) of
// Prospect → Deal → Contract → Customer this prospect has reached, plus the
// lead it was qualified from and the ids needed to link onward.
export async function getProspectPipelineStatus(prospectId: string) {
  const base = { stage: "prospect" as "prospect" | "deal" | "contract" | "customer", lead_id: undefined as string | undefined, deal_id: undefined as string | undefined, contract_id: undefined as string | undefined, customer_id: undefined as string | undefined };

  const [prospectRow] = await db.select({ leadId: prospects.leadId }).from(prospects).where(eq(prospects.id, prospectId)).limit(1);
  if (!prospectRow) return base;
  base.lead_id = prospectRow.leadId;

  const [dealRow] = await db.select({ id: deals.id }).from(deals).where(eq(deals.prospectId, prospectId)).orderBy(desc(deals.createdAt)).limit(1);
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

// ─── Follow-ups — per-prospect tasks backed by the shared `tasks` table ───────
function toSnakeProspectFollowUp(row: typeof tasks.$inferSelect) {
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

export async function getProspectFollowUps(prospectId: string) {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.organizationId, dbUser.organizationId), eq(tasks.relatedType, "prospect"), eq(tasks.relatedId, prospectId)))
    .orderBy(asc(tasks.dueDate));
  return rows.map(toSnakeProspectFollowUp);
}

export async function createProspectFollowUp(prospectId: string, input: { title: string; type: string; due_date: string; notes?: string }) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(tasks)
    .values({
      organizationId: dbUser.organizationId,
      title: input.title,
      description: JSON.stringify({ type: input.type, notes: input.notes ?? "" }),
      dueDate: new Date(input.due_date),
      priority: "MEDIUM",
      relatedType: "prospect",
      relatedId: prospectId,
      isCompleted: false,
    })
    .returning({ id: tasks.id });
  return row;
}

export async function toggleProspectFollowUpDone(id: string, done: boolean) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(tasks)
    .set({ isCompleted: done })
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)));
}

export async function deleteProspectFollowUp(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)));
}

export async function getProspectReminders() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({ id: prospects.id })
    .from(prospects)
    .innerJoin(leads, eq(prospects.leadId, leads.id))
    .where(eq(leads.organizationId, dbUser.organizationId));

  if (rows.length === 0) return [];

  const prospectIds = rows.map((r) => r.id);
  const reminderRows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.entityType, "prospect"), inArray(reminders.entityId, prospectIds)))
    .orderBy(asc(reminders.datetime));

  return reminderRows.map((r) => ({
    id: r.id,
    p_id: r.entityId,
    p_name: r.entityName ?? "",
    title: r.title,
    type: r.type,
    datetime: r.datetime.toISOString(),
    note: r.note ?? undefined,
    done: r.done ?? false,
  }));
}

// Converts an existing Lead into a Prospect (#15) — unlike createProspect()
// this does NOT create a new lead row, it links a `prospects` row to the
// existing lead and advances its status. Returns the existing prospect if
// one is already linked (idempotent).
export async function convertLeadToProspect(leadId: string, bant: { budget: number; authority: string; need: string; timeline: string; industry?: string; city?: string }) {
  const dbUser = await getOrCreateDbUser();

  const [lead] = await db
    .select({ id: leads.id, source: leads.source, ownerId: leads.ownerId, ownerNameCustom: leads.ownerNameCustom })
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.organizationId, dbUser.organizationId)))
    .limit(1);
  if (!lead) throw new Error("Lead not found");

  const existing = await db.select({ id: prospects.id }).from(prospects).where(eq(prospects.leadId, leadId)).limit(1);
  if (existing.length > 0) return existing[0];

  await db
    .update(leads)
    .set({ status: "QUALIFIED", industry: bant.industry, city: bant.city, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  const [prospect] = await db
    .insert(prospects)
    .values({
      leadId,
      budget: String(bant.budget ?? 0),
      authority: true,
      need: bant.need,
      timeline: bant.timeline,
      qualifiedBy: dbUser.id,
      status: "QUALIFIED",
      source: lead.source,
      industry: bant.industry,
      city: bant.city,
      notes: `Decision maker / authority: ${bant.authority}`,
      starred: false,
      tags: [],
      ownerId: lead.ownerId,
      ownerNameCustom: lead.ownerNameCustom,
    })
    .returning({ id: prospects.id });

  return prospect;
}

export async function createProspect(input: ProspectInput) {
  const dbUser = await getOrCreateDbUser();

  const [lead] = await db
    .insert(leads)
    .values({
      organizationId: dbUser.organizationId,
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email ?? "",
      phone: input.phone,
      company: input.company,
      source: input.source,
      status: "QUALIFIED",
      industry: input.industry,
      city: input.city,
      notes: input.notes,
    })
    .returning({ id: leads.id });

  const [prospect] = await db
    .insert(prospects)
    .values({
      leadId: lead.id,
      budget: String(input.budget ?? 0),
      authority: input.authority ?? false,
      need: input.need,
      timeline: input.timeline,
      status: input.status ?? "QUALIFIED",
      source: input.source,
      industry: input.industry,
      city: input.city,
      notes: input.notes,
      starred: false,
      tags: input.tags ?? [],
      ownerId: input.owner_id || null,
      ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null),
      rating: input.rating ?? null,
      projectName: input.project_name ?? null,
    })
    .returning({ id: prospects.id });

  return prospect;
}

export async function updateProspect(id: string, input: ProspectInput) {
  const dbUser = await getOrCreateDbUser();

  const existing = await db
    .select({ leadId: prospects.leadId })
    .from(prospects)
    .innerJoin(leads, eq(prospects.leadId, leads.id))
    .where(and(eq(prospects.id, id), eq(leads.organizationId, dbUser.organizationId)))
    .limit(1);

  if (existing.length === 0) return;

  await db
    .update(leads)
    .set({
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      industry: input.industry,
      city: input.city,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, existing[0].leadId));

  await db
    .update(prospects)
    .set({
      budget: String(input.budget ?? 0),
      authority: input.authority ?? false,
      need: input.need,
      timeline: input.timeline,
      status: input.status,
      industry: input.industry,
      city: input.city,
      notes: input.notes,
      tags: input.tags ?? [],
      ownerId: input.owner_id || null,
      ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null),
      rating: input.rating ?? null,
      projectName: input.project_name ?? null,
    })
    .where(eq(prospects.id, id));
}

export async function updateProspectStatus(id: string, status: string) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(prospects)
    .set({ status })
    .where(
      and(
        eq(prospects.id, id),
        inArray(
          prospects.leadId,
          db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, dbUser.organizationId))
        )
      )
    );
}

export async function deleteProspect(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(prospectNotes).where(eq(prospectNotes.prospectId, id));
  await db.delete(reminders).where(and(eq(reminders.entityType, "prospect"), eq(reminders.entityId, id)));
  await db
    .delete(prospects)
    .where(
      and(
        eq(prospects.id, id),
        inArray(
          prospects.leadId,
          db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, dbUser.organizationId))
        )
      )
    );
}

export async function addProspectNote(prospectId: string, text: string) {
  const [row] = await db
    .insert(prospectNotes)
    .values({ prospectId, text, author: "You" })
    .returning({ id: prospectNotes.id });
  return row;
}

export async function createProspectReminder(input: {
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
      entityType: "prospect",
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

// ─── Demo Data Seeding (Phase 24) ──────────────────────────────────────────
const SEED_FIRST_NAMES = [
  "Vikram", "Neha", "Arjun", "Sanya", "Rohan", "Priya", "Karan", "Ananya", "Aditya", "Pooja",
  "Rahul", "Divya", "Siddharth", "Kavya", "Manish", "Ritu", "Vivek", "Tanvi", "Akash", "Sneha",
  "Nikhil", "Meera", "Suresh", "Ishita", "Gaurav", "Aarti", "Harsh", "Nidhi", "Yash", "Swati",
];
const SEED_LAST_NAMES = [
  "Singh", "Patel", "Mehta", "Reddy", "Joshi", "Sharma", "Kapoor", "Iyer", "Verma", "Nair",
  "Gupta", "Malhotra", "Chopra", "Bose", "Rao", "Desai", "Pillai", "Saxena", "Agarwal", "Bhatt",
  "Kulkarni", "Menon", "Trivedi", "Banerjee", "Chauhan", "Shetty", "Mishra", "Khanna", "Dutta", "Sinha",
];
const SEED_COMPANIES = [
  "Acme Corp", "TechStart", "CloudSoft Technologies", "DataFlow Inc", "NovaTech Labs",
  "Quantum Systems", "BluePeak Solutions", "Zenith Digital", "Orbit Analytics", "Skyline Ventures",
  "Pinnacle Software", "Nexus Innovations", "Vertex Cloud", "Stellar Commerce", "Apex Industries",
  "Horizon Health", "Catalyst Media", "Infinity Retail", "Prime Logistics", "Vector Robotics",
  "Lumen Energy", "Crestline Finance", "Bright Path Edu", "Falcon Manufacturing", "Evergreen Foods",
  "Granite Realty", "Meridian Pharma", "Spark Mobility", "Cobalt Networks", "Ridgeline Group",
];
const SEED_INDUSTRIES = ["Technology", "SaaS", "Cloud", "Analytics", "HealthTech", "FinTech", "E-commerce", "Manufacturing", "Education", "Real Estate"];
const SEED_CITIES = ["Mumbai", "Bangalore", "Pune", "Hyderabad", "Delhi", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Surat"];
const SEED_SOURCES = ["DIRECT", "GOOGLE", "META", "REFERRAL", "WHATSAPP", "EVENT", "OTHER"];
const SEED_STAGES = ["QUALIFIED", "PROPOSAL_SENT", "IN_NEGOTIATION", "DEAL_OPENED", "LOST"];
const SEED_TAGS = ["Hot", "Enterprise", "Mid-market", "Negotiating", "New", "Budget Approved", "Renewal", "Referral"];
const SEED_NEEDS = [
  "Enterprise cloud dashboard implementation with SSO and audit logs.",
  "Operational ERP API connectivity and data pipeline automation.",
  "Real-time analytics dashboard with custom KPI widgets.",
  "AI chatbot for customer support automation.",
  "Mobile-first CRM rollout for the field sales team.",
  "Custom reporting suite with role-based access controls.",
  "Migration from legacy on-prem system to cloud.",
  "Integration with existing accounting and billing software.",
];
const SEED_TIMELINES = ["Immediate (0-15 days)", "Near-Term (30-60 days)", "Mid-Term (90 days)", "Long-Term (6 months+)"];
const SEED_PNOTES = [
  "Approved by board. Awaiting legal sign-off on contract.",
  "Demo went well, evaluating against one competitor.",
  "Budget confirmed, finalizing scope of work.",
  "Decision maker requested a custom proposal.",
  "Internal champion is pushing for fast-track signing.",
];
const SEED_REMINDER_TITLES = [
  { title: "Follow-up call", type: "call" },
  { title: "Send proposal email", type: "email" },
  { title: "Negotiation meeting", type: "meeting" },
  { title: "Check in on decision", type: "follow_up" },
];

/**
 * Seeds ~30 demo prospects (each backed by a paired QUALIFIED lead row),
 * varied stages/sources/industries/cities/budgets/authority, spread over the
 * last 90 days, plus notes/reminders for some of them. No-ops if the org
 * already has 5+ prospects.
 */
export async function seedDemoProspects() {
  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;

  const existingProspects = await db
    .select({ id: prospects.id })
    .from(prospects)
    .innerJoin(leads, eq(prospects.leadId, leads.id))
    .where(eq(leads.organizationId, orgId));
  if (existingProspects.length >= 5) return { skipped: true, count: existingProspects.length };

  const COUNT = 30;
  const now = Date.now();
  const DAY = 86400000;

  // Step 1: create paired QUALIFIED lead rows
  const leadRows = Array.from({ length: COUNT }, (_, i) => {
    const firstName = SEED_FIRST_NAMES[i % SEED_FIRST_NAMES.length];
    const lastName = SEED_LAST_NAMES[i % SEED_LAST_NAMES.length];
    const company = SEED_COMPANIES[i % SEED_COMPANIES.length];
    const industry = SEED_INDUSTRIES[i % SEED_INDUSTRIES.length];
    const city = SEED_CITIES[i % SEED_CITIES.length];
    const source = SEED_SOURCES[i % SEED_SOURCES.length];
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
      status: "QUALIFIED" as const,
      city,
      country: "India",
      industry,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const insertedLeads = await db.insert(leads).values(leadRows).returning({ id: leads.id });

  // Step 2: create paired prospect rows
  const prospectRows = insertedLeads.map((lead, i) => {
    const stage = SEED_STAGES[i % SEED_STAGES.length];
    const source = SEED_SOURCES[(i + 2) % SEED_SOURCES.length];
    const industry = SEED_INDUSTRIES[i % SEED_INDUSTRIES.length];
    const city = SEED_CITIES[i % SEED_CITIES.length];
    const budget = 50000 + (i % 20) * 97500; // ranges roughly 50k - 2,000,000
    const authority = i % 3 !== 0; // ~2/3 true
    const need = SEED_NEEDS[i % SEED_NEEDS.length];
    const timeline = SEED_TIMELINES[i % SEED_TIMELINES.length];
    const qualifiedAt = new Date(now - Math.floor(Math.random() * 90) * DAY);
    const tags = i % 2 === 0 ? [SEED_TAGS[i % SEED_TAGS.length], SEED_TAGS[(i + 3) % SEED_TAGS.length]] : [];

    return {
      leadId: lead.id,
      budget: String(budget),
      authority,
      need,
      timeline,
      qualifiedAt,
      status: stage,
      source,
      industry,
      city,
      notes: null,
      starred: i % 9 === 0,
      tags,
    };
  });

  const insertedProspects = await db.insert(prospects).values(prospectRows).returning({ id: prospects.id });

  // ~40% of prospects get a prospect note
  const noteRows = insertedProspects
    .filter((_, i) => i % 5 < 2)
    .map((p, idx) => ({
      prospectId: p.id,
      text: SEED_PNOTES[idx % SEED_PNOTES.length],
      author: "You",
    }));
  if (noteRows.length > 0) await db.insert(prospectNotes).values(noteRows);

  // ~30% of prospects get a reminder — mix of overdue, due today, and upcoming
  const reminderRows = insertedProspects
    .filter((_, i) => i % 10 < 3)
    .map((p, idx) => {
      const origIdx = insertedProspects.findIndex((row) => row.id === p.id);
      const cycle = idx % 3; // 0 = overdue, 1 = due today, 2 = upcoming
      const offsetDays = cycle === 0 ? -(1 + (idx % 3)) : cycle === 2 ? 1 + (idx % 5) : 0;
      const datetime = new Date(now + offsetDays * DAY);
      datetime.setHours(9 + (idx % 8), 0, 0, 0);
      const r = SEED_REMINDER_TITLES[idx % SEED_REMINDER_TITLES.length];
      const seedLead = leadRows[origIdx];
      return {
        entityType: "prospect",
        entityId: p.id,
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

  return { skipped: false, inserted: insertedProspects.length };
}

/**
 * Converts up to `count` existing leads (not yet linked to a prospect) into
 * prospects via `convertLeadToProspect`, so the resulting prospects carry
 * real lead data (name/company/email/etc.) rather than freshly-seeded
 * "Unknown" rows. Tops up with `seedDemoLeads()` if the org doesn't have
 * enough convertible leads. Stages are cycled across the 5 prospect statuses.
 */
export async function seedProspectsFromLeads(count = 15) {
  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;

  const findCandidates = () =>
    db
      .select({ id: leads.id, industry: leads.industry, city: leads.city })
      .from(leads)
      .leftJoin(prospects, eq(prospects.leadId, leads.id))
      .where(and(eq(leads.organizationId, orgId), isNull(prospects.id)))
      .orderBy(desc(leads.createdAt))
      .limit(count);

  let candidates = await findCandidates();
  if (candidates.length < count) {
    await seedDemoLeads();
    candidates = await findCandidates();
  }

  const insertedIds: string[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const lead = candidates[i];
    const stage = SEED_STAGES[i % SEED_STAGES.length];
    const budget = 50000 + (i % 20) * 97500;
    const authority = i % 3 !== 0;
    const need = SEED_NEEDS[i % SEED_NEEDS.length];
    const timeline = SEED_TIMELINES[i % SEED_TIMELINES.length];
    const industry = lead.industry ?? SEED_INDUSTRIES[i % SEED_INDUSTRIES.length];
    const city = lead.city ?? SEED_CITIES[i % SEED_CITIES.length];

    const result = await convertLeadToProspect(lead.id, {
      budget,
      authority: authority ? "Yes" : "No",
      need,
      timeline,
      industry,
      city,
    });
    if (result?.id) {
      if (stage !== "QUALIFIED") await updateProspectStatus(result.id, stage);
      insertedIds.push(result.id);
    }
  }

  return { inserted: insertedIds.length };
}
