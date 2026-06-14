"use server";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contracts, customers, dealNotes, deals, leads, prospects, reminders, tasks, users } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";
import { seedProspectsFromLeads, seedDemoProspects } from "./prospects";

function toSnakeDeal(row: {
  id: string;
  title: string;
  value: string | null;
  stage: string | null;
  probability: number | null;
  expectedCloseDate: Date | null;
  companyName: string | null;
  notes?: string | null;
  type: string | null;
  nextStep: string | null;
  campaignSource: string | null;
  contactName: string | null;
  contactRole: string | null;
  priority: string | null;
  tags: string[] | null;
  createdAt: Date | null;
  starred: boolean | null;
  ownerId: string | null;
  ownerNameCustom: string | null;
  leadId: string;
  prospectId: string | null;
  leadCompany: string | null;
  leadFirstName: string | null;
  leadLastName: string | null;
  industry?: string | null;
  rating?: string | null;
  projectName?: string | null;
}, ownerName?: string | null) {
  const value = row.value ? Number(row.value) : 0;
  const probability = row.probability ?? 10;
  return {
    id: row.id,
    lead_id: row.leadId,
    prospect_id: row.prospectId ?? undefined,
    title: row.title,
    value,
    stage: (row.stage ?? "NEW") as "NEW" | "PROPOSAL" | "NEGOTIATION" | "CONTRACT" | "WON" | "LOST",
    probability,
    expected_close_date: row.expectedCloseDate?.toISOString(),
    company_name: row.companyName ?? undefined,
    notes: row.notes ?? undefined,
    type: row.type ?? undefined,
    next_step: row.nextStep ?? undefined,
    campaign_source: row.campaignSource ?? undefined,
    contact_name: row.contactName ?? undefined,
    contact_role: row.contactRole ?? undefined,
    priority: row.priority ?? "MEDIUM",
    tags: row.tags ?? [],
    starred: row.starred ?? false,
    created_at: (row.createdAt ?? new Date()).toISOString(),
    owner_id: row.ownerId ?? undefined,
    owner_name: ownerName ?? row.ownerNameCustom ?? undefined,
    owner_name_custom: row.ownerNameCustom ?? undefined,
    expected_revenue: Math.round((value * probability) / 100),
    lead: row.leadCompany
      ? { company: row.leadCompany, first_name: row.leadFirstName ?? "", last_name: row.leadLastName ?? "" }
      : undefined,
    industry: row.industry ?? undefined,
    rating: row.rating ?? undefined,
    project_name: row.projectName ?? undefined,
  };
}

export async function getDeals() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({
      id: deals.id,
      leadId: deals.leadId,
      prospectId: deals.prospectId,
      title: deals.title,
      value: deals.value,
      stage: deals.stage,
      probability: deals.probability,
      expectedCloseDate: deals.expectedCloseDate,
      companyName: deals.companyName,
      notes: deals.notes,
      type: deals.type,
      nextStep: deals.nextStep,
      campaignSource: deals.campaignSource,
      contactName: deals.contactName,
      contactRole: deals.contactRole,
      priority: deals.priority,
      tags: deals.tags,
      createdAt: deals.createdAt,
      starred: deals.starred,
      ownerId: deals.ownerId,
      ownerNameCustom: deals.ownerNameCustom,
      ownerName: users.fullName,
      leadCompany: leads.company,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
      industry: prospects.industry,
      rating: prospects.rating,
      projectName: prospects.projectName,
    })
    .from(deals)
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .leftJoin(users, eq(deals.ownerId, users.id))
    .leftJoin(prospects, eq(deals.prospectId, prospects.id))
    .where(eq(deals.organizationId, dbUser.organizationId))
    .orderBy(desc(deals.createdAt));

  return rows.map((row) => toSnakeDeal(row, row.ownerName));
}

export async function getDealById(id: string) {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({
      id: deals.id,
      leadId: deals.leadId,
      prospectId: deals.prospectId,
      title: deals.title,
      value: deals.value,
      stage: deals.stage,
      probability: deals.probability,
      expectedCloseDate: deals.expectedCloseDate,
      companyName: deals.companyName,
      notes: deals.notes,
      type: deals.type,
      nextStep: deals.nextStep,
      campaignSource: deals.campaignSource,
      contactName: deals.contactName,
      contactRole: deals.contactRole,
      priority: deals.priority,
      tags: deals.tags,
      createdAt: deals.createdAt,
      starred: deals.starred,
      ownerId: deals.ownerId,
      ownerNameCustom: deals.ownerNameCustom,
      ownerName: users.fullName,
      leadCompany: leads.company,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
      leadEmail: leads.email,
      leadPhone: leads.phone,
      leadWebsite: leads.website,
      leadLinkedin: leads.linkedin,
      leadEmployeeCount: leads.employeeCount,
      leadPriority: leads.priority,
      prospectBudget: prospects.budget,
      prospectAuthority: prospects.authority,
      prospectNeed: prospects.need,
      prospectTimeline: prospects.timeline,
      prospectRating: prospects.rating,
      prospectProjectName: prospects.projectName,
      prospectIndustry: prospects.industry,
      prospectCity: prospects.city,
    })
    .from(deals)
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .leftJoin(users, eq(deals.ownerId, users.id))
    .leftJoin(prospects, eq(deals.prospectId, prospects.id))
    .where(and(eq(deals.id, id), eq(deals.organizationId, dbUser.organizationId)))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  const notes = await db
    .select()
    .from(dealNotes)
    .where(eq(dealNotes.dealId, id))
    .orderBy(desc(dealNotes.createdAt));

  const value = row.value ? Number(row.value) : 0;
  const probability = row.probability ?? 10;

  return {
    id: row.id,
    lead_id: row.leadId,
    prospect_id: row.prospectId ?? undefined,
    title: row.title,
    value,
    stage: (row.stage ?? "NEW") as "NEW" | "PROPOSAL" | "NEGOTIATION" | "CONTRACT" | "WON" | "LOST",
    probability,
    expected_close_date: row.expectedCloseDate?.toISOString(),
    company_name: row.companyName ?? undefined,
    notes: row.notes ?? undefined,
    type: row.type ?? undefined,
    next_step: row.nextStep ?? undefined,
    campaign_source: row.campaignSource ?? undefined,
    contact_name: row.contactName ?? undefined,
    contact_role: row.contactRole ?? undefined,
    priority: row.priority ?? "MEDIUM",
    tags: row.tags ?? [],
    starred: row.starred ?? false,
    created_at: (row.createdAt ?? new Date()).toISOString(),
    owner_id: row.ownerId ?? undefined,
    owner_name: row.ownerName ?? row.ownerNameCustom ?? undefined,
    owner_name_custom: row.ownerNameCustom ?? undefined,
    expected_revenue: Math.round((value * probability) / 100),
    lead: {
      first_name: row.leadFirstName ?? "",
      last_name: row.leadLastName ?? "",
      company: row.leadCompany ?? undefined,
      email: row.leadEmail ?? undefined,
      phone: row.leadPhone ?? undefined,
      website: row.leadWebsite ?? undefined,
      linkedin: row.leadLinkedin ?? undefined,
      employee_count: row.leadEmployeeCount ?? undefined,
      priority: row.leadPriority ?? undefined,
    },
    prospect: row.prospectId
      ? {
          budget: row.prospectBudget ? Number(row.prospectBudget) : 0,
          authority: row.prospectAuthority ?? false,
          need: row.prospectNeed ?? undefined,
          timeline: row.prospectTimeline ?? undefined,
          rating: row.prospectRating ?? undefined,
          project_name: row.prospectProjectName ?? undefined,
          industry: row.prospectIndustry ?? undefined,
          city: row.prospectCity ?? undefined,
        }
      : undefined,
    dnotes: notes.map((n) => ({
      id: n.id,
      text: n.text,
      created_at: (n.createdAt ?? new Date()).toISOString(),
      author: n.author ?? "You",
    })),
  };
}

// Pipeline breadcrumb (mirrors getProspectPipelineStatus): which stage(s) of
// Deal → Contract → Customer this deal has reached, plus the lead/prospect ids
// it originated from for linking back up the chain.
export async function getDealPipelineStatus(dealId: string) {
  const base = {
    stage: "deal" as "deal" | "contract" | "customer",
    lead_id: undefined as string | undefined,
    prospect_id: undefined as string | undefined,
    contract_id: undefined as string | undefined,
    customer_id: undefined as string | undefined,
  };

  const [dealRow] = await db.select({ leadId: deals.leadId, prospectId: deals.prospectId }).from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!dealRow) return base;
  base.lead_id = dealRow.leadId;
  base.prospect_id = dealRow.prospectId ?? undefined;

  const [contractRow] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.dealId, dealId)).orderBy(desc(contracts.createdAt)).limit(1);
  if (!contractRow) return base;
  base.stage = "contract";
  base.contract_id = contractRow.id;

  const [customerRow] = await db.select({ id: customers.id }).from(customers).where(eq(customers.contractId, contractRow.id)).limit(1);
  if (!customerRow) return base;
  base.stage = "customer";
  base.customer_id = customerRow.id;

  return base;
}

export async function updateDealStage(id: string, stage: string, probability: number) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(deals)
    .set({ stage: stage as typeof deals.$inferInsert.stage, probability, updatedAt: new Date() })
    .where(and(eq(deals.id, id), eq(deals.organizationId, dbUser.organizationId)));
}

export async function toggleDealStar(id: string, starred: boolean) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(deals)
    .set({ starred })
    .where(and(eq(deals.id, id), eq(deals.organizationId, dbUser.organizationId)));
}

export async function createDeal(input: {
  title: string;
  value: number;
  stage: string;
  probability: number;
  company_name?: string;
  type?: string;
  next_step?: string;
  campaign_source?: string;
  contact_name?: string;
  contact_role?: string;
  priority?: string;
  expected_close_date?: string | null;
  owner_id?: string | null;
  owner_name_custom?: string | null;
  tags?: string[];
}) {
  const dbUser = await getOrCreateDbUser();

  const [lead] = await db
    .insert(leads)
    .values({
      organizationId: dbUser.organizationId,
      firstName: "Opportunity",
      lastName: "Contact",
      email: `deal-${Math.floor(Math.random() * 100000)}@corp.com`,
      company: input.company_name || "New Enterprise",
      status: "QUALIFIED",
    })
    .returning({ id: leads.id });

  const [deal] = await db
    .insert(deals)
    .values({
      organizationId: dbUser.organizationId,
      leadId: lead.id,
      title: input.title,
      value: String(input.value),
      stage: input.stage as typeof deals.$inferInsert.stage,
      probability: input.probability,
      ownerId: input.owner_id || dbUser.id,
      ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null),
      companyName: input.company_name,
      type: input.type,
      nextStep: input.next_step,
      campaignSource: input.campaign_source,
      contactName: input.contact_name,
      contactRole: input.contact_role,
      priority: input.priority || "MEDIUM",
      expectedCloseDate: input.expected_close_date ? new Date(input.expected_close_date) : null,
      tags: input.tags ?? [],
    })
    .returning({ id: deals.id });

  return deal;
}

export async function updateDeal(id: string, input: {
  title: string;
  value: number;
  stage: string;
  probability: number;
  company_name?: string;
  type?: string;
  next_step?: string;
  campaign_source?: string;
  contact_name?: string;
  contact_role?: string;
  priority?: string;
  expected_close_date?: string | null;
  owner_id?: string | null;
  owner_name_custom?: string | null;
  notes?: string;
  tags?: string[];
}) {
  const dbUser = await getOrCreateDbUser();

  await db
    .update(deals)
    .set({
      title: input.title,
      value: String(input.value),
      stage: input.stage as typeof deals.$inferInsert.stage,
      probability: input.probability,
      companyName: input.company_name,
      type: input.type,
      nextStep: input.next_step,
      campaignSource: input.campaign_source,
      contactName: input.contact_name,
      contactRole: input.contact_role,
      priority: input.priority || "MEDIUM",
      expectedCloseDate: input.expected_close_date ? new Date(input.expected_close_date) : null,
      ownerId: input.owner_id || null,
      ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null),
      notes: input.notes,
      tags: input.tags ?? [],
      updatedAt: new Date(),
    })
    .where(and(eq(deals.id, id), eq(deals.organizationId, dbUser.organizationId)));
}

export async function deleteDeal(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(dealNotes).where(eq(dealNotes.dealId, id));
  await db.delete(reminders).where(and(eq(reminders.entityType, "deal"), eq(reminders.entityId, id)));
  await db.delete(tasks).where(and(eq(tasks.relatedType, "deal"), eq(tasks.relatedId, id)));
  await db.delete(deals).where(and(eq(deals.id, id), eq(deals.organizationId, dbUser.organizationId)));
}

export async function convertProspectToDeal(
  prospectId: string,
  input: {
    title: string;
    value: number;
    stage: string;
    probability: number;
    expected_close_date?: string | null;
    owner_id?: string | null;
    owner_name_custom?: string | null;
    company_name?: string;
    notes?: string;
    tags?: string[];
    priority?: string;
  }
) {
  const dbUser = await getOrCreateDbUser();

  const [prospect] = await db
    .select({ id: prospects.id, leadId: prospects.leadId, source: prospects.source })
    .from(prospects)
    .innerJoin(leads, eq(prospects.leadId, leads.id))
    .where(and(eq(prospects.id, prospectId), eq(leads.organizationId, dbUser.organizationId)))
    .limit(1);

  if (!prospect) return null;

  const [deal] = await db
    .insert(deals)
    .values({
      organizationId: dbUser.organizationId,
      leadId: prospect.leadId,
      prospectId: prospect.id,
      title: input.title,
      value: String(input.value),
      stage: input.stage as typeof deals.$inferInsert.stage,
      probability: input.probability,
      ownerId: input.owner_id || null,
      ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null),
      expectedCloseDate: input.expected_close_date ? new Date(input.expected_close_date) : null,
      companyName: input.company_name,
      notes: input.notes,
      tags: input.tags ?? [],
      type: "New Business",
      campaignSource: prospect.source ?? undefined,
      priority: input.priority || "MEDIUM",
    })
    .returning({ id: deals.id });

  await db
    .update(prospects)
    .set({ status: "DEAL_OPENED" })
    .where(eq(prospects.id, prospectId));

  return deal;
}

// ─── Follow-ups — per-deal tasks backed by the shared `tasks` table ─────────
function toSnakeDealFollowUp(row: typeof tasks.$inferSelect) {
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

export async function getDealFollowUps(dealId: string) {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.organizationId, dbUser.organizationId), eq(tasks.relatedType, "deal"), eq(tasks.relatedId, dealId)))
    .orderBy(asc(tasks.dueDate));
  return rows.map(toSnakeDealFollowUp);
}

export async function createDealFollowUp(dealId: string, input: { title: string; type: string; due_date: string; notes?: string }) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(tasks)
    .values({
      organizationId: dbUser.organizationId,
      title: input.title,
      description: JSON.stringify({ type: input.type, notes: input.notes ?? "" }),
      dueDate: new Date(input.due_date),
      priority: "MEDIUM",
      relatedType: "deal",
      relatedId: dealId,
      isCompleted: false,
    })
    .returning({ id: tasks.id });
  return row;
}

export async function toggleDealFollowUpDone(id: string, done: boolean) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(tasks)
    .set({ isCompleted: done })
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)));
}

export async function deleteDealFollowUp(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)));
}

// ─── Notes ──────────────────────────────────────────────────────────────────
export async function addDealNote(dealId: string, text: string) {
  const [row] = await db
    .insert(dealNotes)
    .values({ dealId, text, author: "You" })
    .returning({ id: dealNotes.id });
  return row;
}

// ─── Reminders ──────────────────────────────────────────────────────────────
export async function getDealReminders() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({ id: deals.id })
    .from(deals)
    .where(eq(deals.organizationId, dbUser.organizationId));

  if (rows.length === 0) return [];

  const dealIds = rows.map((r) => r.id);
  const reminderRows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.entityType, "deal"), inArray(reminders.entityId, dealIds)))
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

// ─── Demo Data Seeding (Phase 32) ───────────────────────────────────────────
const SEED_DEAL_TYPES = [
  "New Business",
  "Existing Business - Upsell",
  "Existing Business - Renewal",
  "Existing Business - Replacement",
];
const SEED_CAMPAIGN_SOURCES = [
  "Website", "Trade Show", "Webinar", "Cold Call", "Partner Referral", "Email Campaign", "Social Media", "Content Syndication",
];
const SEED_NEXT_STEPS = [
  "Send revised proposal", "Schedule demo with technical team", "Follow up on contract redlines",
  "Confirm budget approval", "Arrange executive call", "Share case studies",
  "Negotiate final pricing", "Await procurement sign-off",
];
const SEED_CONTACT_ROLES = [
  "Decision Maker", "Influencer", "Champion", "Evaluator", "End User", "Other",
];
const SEED_CONTACT_FIRST_NAMES = ["Aisha", "Dev", "Ritika", "Sahil", "Tara", "Vinay", "Naina", "Rajat", "Simran", "Kabir"];
const SEED_CONTACT_LAST_NAMES = ["Khan", "Rao", "Bhatia", "Sethi", "Nanda", "Oberoi", "Chadha", "Bedi", "Arora", "Kohli"];
const SEED_DEAL_TAGS = ["Hot", "Enterprise", "Upsell", "Renewal", "Strategic", "Fast-track", "At Risk", "Budget Approved"];
const SEED_DEAL_NOTES = [
  "Stakeholders aligned on rollout timeline.",
  "Pricing approved by finance, awaiting legal review.",
  "Technical evaluation completed successfully.",
  "Champion confirmed internal budget sign-off.",
  "Competitor comparison requested by client.",
];
const SEED_DEAL_STAGES = ["NEW", "PROPOSAL", "NEGOTIATION", "CONTRACT", "WON", "LOST"];
const SEED_DEAL_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STAGE_PROBABILITY: Record<string, number> = { NEW: 10, PROPOSAL: 30, NEGOTIATION: 60, CONTRACT: 80, WON: 100, LOST: 0 };
const SEED_DEAL_REMINDER_TITLES = [
  { title: "Follow-up call", type: "call" },
  { title: "Send proposal email", type: "email" },
  { title: "Negotiation meeting", type: "meeting" },
  { title: "Check in on next steps", type: "follow_up" },
];

/**
 * Converts existing DEAL_OPENED prospects (not yet linked to a deal) into deals
 * via `convertProspectToDeal`, then enriches each with varied Zoho/HubSpot-style
 * fields (type/campaign source/next step/contact name+role/tags/expected close
 * date/stage). Tops up with seedProspectsFromLeads/seedDemoProspects if the org
 * doesn't have enough DEAL_OPENED prospects. No-ops if the org already has 5+ deals.
 */
export async function seedDealsFromProspects(count = 15) {
  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;

  const existingDeals = await db.select({ id: deals.id }).from(deals).where(eq(deals.organizationId, orgId));
  if (existingDeals.length >= 5) return { skipped: true, count: existingDeals.length };

  const findCandidates = () =>
    db
      .select({ id: prospects.id, leadId: prospects.leadId, company: leads.company })
      .from(prospects)
      .innerJoin(leads, eq(prospects.leadId, leads.id))
      .leftJoin(deals, eq(deals.prospectId, prospects.id))
      .where(and(eq(leads.organizationId, orgId), eq(prospects.status, "DEAL_OPENED"), isNull(deals.id)))
      .orderBy(desc(prospects.qualifiedAt))
      .limit(count);

  let candidates = await findCandidates();
  if (candidates.length < count) {
    await seedProspectsFromLeads(30);
    candidates = await findCandidates();
  }
  if (candidates.length < count) {
    await seedDemoProspects();
    candidates = await findCandidates();
  }

  const now = Date.now();
  const DAY = 86400000;
  const insertedIds: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const stage = SEED_DEAL_STAGES[i % SEED_DEAL_STAGES.length];
    const probability = STAGE_PROBABILITY[stage];
    const value = 100000 + (i % 25) * 85000;
    const type = SEED_DEAL_TYPES[i % SEED_DEAL_TYPES.length];
    const campaignSource = SEED_CAMPAIGN_SOURCES[i % SEED_CAMPAIGN_SOURCES.length];
    const nextStep = SEED_NEXT_STEPS[i % SEED_NEXT_STEPS.length];
    const contactName = `${SEED_CONTACT_FIRST_NAMES[i % SEED_CONTACT_FIRST_NAMES.length]} ${SEED_CONTACT_LAST_NAMES[i % SEED_CONTACT_LAST_NAMES.length]}`;
    const contactRole = SEED_CONTACT_ROLES[i % SEED_CONTACT_ROLES.length];
    const priority = SEED_DEAL_PRIORITIES[i % SEED_DEAL_PRIORITIES.length];
    const tags = i % 2 === 0 ? [SEED_DEAL_TAGS[i % SEED_DEAL_TAGS.length], SEED_DEAL_TAGS[(i + 4) % SEED_DEAL_TAGS.length]] : [];
    const expectedCloseDate = new Date(now + (7 + (i % 12) * 7) * DAY);
    const title = `${type === "New Business" ? "New Deal" : type.split(" - ")[1]} — ${candidate.company || "Opportunity"}`;

    const result = await convertProspectToDeal(candidate.id, {
      title,
      value,
      stage,
      probability,
      expected_close_date: expectedCloseDate.toISOString(),
      company_name: candidate.company || undefined,
      tags,
      priority,
    });
    if (!result?.id) continue;

    await db
      .update(deals)
      .set({ type, campaignSource, nextStep, contactName, contactRole })
      .where(eq(deals.id, result.id));

    insertedIds.push(result.id);
  }

  // ~40% of deals get a deal note
  const noteRows = insertedIds
    .filter((_, i) => i % 5 < 2)
    .map((dealId, idx) => ({
      dealId,
      text: SEED_DEAL_NOTES[idx % SEED_DEAL_NOTES.length],
      author: "You",
    }));
  if (noteRows.length > 0) await db.insert(dealNotes).values(noteRows);

  // ~30% of deals get a reminder — mix of overdue, due today, and upcoming
  const reminderRows = insertedIds
    .filter((_, i) => i % 10 < 3)
    .map((dealId, idx) => {
      const origIdx = insertedIds.indexOf(dealId);
      const cycle = idx % 3;
      const offsetDays = cycle === 0 ? -(1 + (idx % 3)) : cycle === 2 ? 1 + (idx % 5) : 0;
      const datetime = new Date(now + offsetDays * DAY);
      datetime.setHours(9 + (idx % 8), 0, 0, 0);
      const r = SEED_DEAL_REMINDER_TITLES[idx % SEED_DEAL_REMINDER_TITLES.length];
      const candidate = candidates[origIdx];
      return {
        entityType: "deal",
        entityId: dealId,
        entityName: candidate?.company || "Deal",
        title: r.title,
        type: r.type,
        datetime,
        note: null,
        done: false,
        createdBy: dbUser.id,
      };
    });
  if (reminderRows.length > 0) await db.insert(reminders).values(reminderRows);

  return { skipped: false, inserted: insertedIds.length };
}
