"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { contactNotes, contacts, reminders } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

interface ContactInput {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  department?: string;
  status?: string;
  lifetime_value?: number;
  city?: string;
  country?: string;
  industry?: string;
  website?: string;
  linkedin_url?: string;
  notes?: string;
  tags?: string[];
}

function toSnakeContact(row: typeof contacts.$inferSelect, contactNotesArr: any[] = []) {
  return {
    id: row.id,
    contact_name: row.contactName ?? `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim(),
    first_name: row.firstName ?? undefined,
    last_name: row.lastName ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    company: row.company ?? undefined,
    job_title: row.jobTitle ?? undefined,
    department: row.department ?? undefined,
    status: row.status ?? "ACTIVE",
    lifetime_value: row.lifetimeValue ? Number(row.lifetimeValue) : 0,
    customer_since: (row.customerSince ?? new Date()).toISOString(),
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    industry: row.industry ?? undefined,
    website: row.website ?? undefined,
    linkedin_url: row.linkedinUrl ?? undefined,
    notes: row.notes ?? undefined,
    starred: row.starred ?? false,
    tags: row.tags ?? [],
    contact_notes: contactNotesArr,
    created_at: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function getContacts() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, dbUser.organizationId))
    .orderBy(desc(contacts.createdAt));

  if (rows.length === 0) return [];

  const contactIds = rows.map((r) => r.id);
  const notes = await db
    .select()
    .from(contactNotes)
    .where(inArray(contactNotes.contactId, contactIds))
    .orderBy(desc(contactNotes.createdAt));

  return rows.map((row) =>
    toSnakeContact(
      row,
      notes
        .filter((n) => n.contactId === row.id)
        .map((n) => ({
          id: n.id,
          text: n.text,
          created_at: (n.createdAt ?? new Date()).toISOString(),
          author: n.author ?? "You",
        }))
    )
  );
}

export async function getContactReminders() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.organizationId, dbUser.organizationId));

  if (rows.length === 0) return [];

  const contactIds = rows.map((r) => r.id);
  const reminderRows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.entityType, "contact"), inArray(reminders.entityId, contactIds)))
    .orderBy(asc(reminders.datetime));

  return reminderRows.map((r) => ({
    id: r.id,
    contact_id: r.entityId,
    contact_name: r.entityName ?? "",
    title: r.title,
    type: r.type,
    datetime: r.datetime.toISOString(),
    note: r.note ?? undefined,
    done: r.done ?? false,
  }));
}

export async function createContact(input: ContactInput) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(contacts)
    .values({
      organizationId: dbUser.organizationId,
      firstName: input.first_name,
      lastName: input.last_name,
      contactName: `${input.first_name} ${input.last_name ?? ""}`.trim(),
      email: input.email,
      phone: input.phone,
      company: input.company,
      jobTitle: input.job_title,
      department: input.department,
      status: input.status ?? "ACTIVE",
      lifetimeValue: String(input.lifetime_value ?? 0),
      city: input.city,
      country: input.country ?? "India",
      industry: input.industry,
      website: input.website,
      linkedinUrl: input.linkedin_url,
      notes: input.notes,
      tags: input.tags ?? [],
      starred: false,
      customerSince: new Date(),
    })
    .returning({ id: contacts.id });
  return row;
}

export async function updateContact(id: string, input: ContactInput) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(contacts)
    .set({
      firstName: input.first_name,
      lastName: input.last_name,
      contactName: `${input.first_name} ${input.last_name ?? ""}`.trim(),
      email: input.email,
      phone: input.phone,
      company: input.company,
      jobTitle: input.job_title,
      department: input.department,
      status: input.status,
      lifetimeValue: String(input.lifetime_value ?? 0),
      city: input.city,
      country: input.country,
      industry: input.industry,
      website: input.website,
      linkedinUrl: input.linkedin_url,
      notes: input.notes,
      tags: input.tags ?? [],
      updatedAt: new Date(),
    })
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, dbUser.organizationId)));
}

export async function updateContactStatus(id: string, status: string) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(contacts)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, dbUser.organizationId)));
}

export async function deleteContact(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(contactNotes).where(eq(contactNotes.contactId, id));
  await db.delete(reminders).where(and(eq(reminders.entityType, "contact"), eq(reminders.entityId, id)));
  await db
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.organizationId, dbUser.organizationId)));
}

export async function addContactNote(contactId: string, text: string) {
  const [row] = await db
    .insert(contactNotes)
    .values({ contactId, text, author: "You" })
    .returning({ id: contactNotes.id });
  return row;
}

export async function createContactReminder(input: {
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
      entityType: "contact",
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
