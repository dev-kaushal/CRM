"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, prospectNotes, prospects, reminders } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

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
}, pnotes: any[] = []) {
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
      firstName: leads.firstName,
      lastName: leads.lastName,
      email: leads.email,
      phone: leads.phone,
      company: leads.company,
      createdAt: leads.createdAt,
    })
    .from(prospects)
    .innerJoin(leads, eq(prospects.leadId, leads.id))
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
        }))
    )
  );
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
    .select({ id: leads.id, source: leads.source })
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
