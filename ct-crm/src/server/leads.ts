"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leadNotes, leads, reminders } from "@/db/schema";
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
}

function toSnakeLead(row: typeof leads.$inferSelect, notes: any[] = []) {
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

export async function getLeads() {
  const dbUser = await getOrCreateDbUser();
  const leadRows = await db
    .select()
    .from(leads)
    .where(eq(leads.organizationId, dbUser.organizationId))
    .orderBy(desc(leads.createdAt));

  if (leadRows.length === 0) return [];

  const leadIds = leadRows.map((l) => l.id);
  const notes = await db
    .select()
    .from(leadNotes)
    .where(inArray(leadNotes.leadId, leadIds))
    .orderBy(desc(leadNotes.createdAt));

  return leadRows.map((row) =>
    toSnakeLead(
      row,
      notes
        .filter((n) => n.leadId === row.id)
        .map((n) => ({
          id: n.id,
          text: n.text,
          created_at: (n.createdAt ?? new Date()).toISOString(),
          author: n.author ?? "You",
        }))
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
