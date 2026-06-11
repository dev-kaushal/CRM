"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customerNotes, customers, reminders } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

interface CustomerInput {
  contact_name: string;
  company?: string;
  email?: string;
  phone?: string;
  status?: string;
  lifetime_value?: number;
  health_score?: number;
  industry?: string;
  city?: string;
  contract_title?: string;
  contract_value?: number;
  contract_status?: string;
  notes?: string;
  tags?: string[];
}

function toSnakeCustomer(row: typeof customers.$inferSelect, cnotes: any[] = []) {
  return {
    id: row.id,
    contact_name: row.contactName ?? "",
    company: row.company ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    lifetime_value: row.lifetimeValue ? Number(row.lifetimeValue) : 0,
    customer_since: (row.customerSince ?? new Date()).toISOString(),
    status: row.status ?? "ACTIVE",
    contract_status: row.contractStatus ?? undefined,
    contract_title: row.contractTitle ?? undefined,
    contract_value: row.contractValue ? Number(row.contractValue) : 0,
    total_deals: row.totalDeals ?? 0,
    total_interactions: row.totalInteractions ?? 0,
    health_score: row.healthScore ?? 80,
    industry: row.industry ?? undefined,
    city: row.city ?? undefined,
    notes: row.notes ?? undefined,
    starred: row.starred ?? false,
    tags: row.tags ?? [],
    cnotes,
    created_at: (row.customerSince ?? new Date()).toISOString(),
  };
}

export async function getCustomers() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.organizationId, dbUser.organizationId))
    .orderBy(desc(customers.customerSince));

  if (rows.length === 0) return [];

  const customerIds = rows.map((r) => r.id);
  const notes = await db
    .select()
    .from(customerNotes)
    .where(inArray(customerNotes.customerId, customerIds))
    .orderBy(desc(customerNotes.createdAt));

  return rows.map((row) =>
    toSnakeCustomer(
      row,
      notes
        .filter((n) => n.customerId === row.id)
        .map((n) => ({
          id: n.id,
          text: n.text,
          created_at: (n.createdAt ?? new Date()).toISOString(),
          author: n.author ?? "You",
        }))
    )
  );
}

export async function getCustomerReminders() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.organizationId, dbUser.organizationId));

  if (rows.length === 0) return [];

  const customerIds = rows.map((r) => r.id);
  const reminderRows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.entityType, "customer"), inArray(reminders.entityId, customerIds)))
    .orderBy(asc(reminders.datetime));

  return reminderRows.map((r) => ({
    id: r.id,
    cust_id: r.entityId,
    cust_name: r.entityName ?? "",
    title: r.title,
    type: r.type,
    datetime: r.datetime.toISOString(),
    note: r.note ?? undefined,
    done: r.done ?? false,
  }));
}

export async function createCustomer(input: CustomerInput) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(customers)
    .values({
      organizationId: dbUser.organizationId,
      contactName: input.contact_name,
      company: input.company ?? "",
      email: input.email,
      phone: input.phone,
      status: input.status ?? "ACTIVE",
      lifetimeValue: String(input.lifetime_value ?? 0),
      healthScore: input.health_score ?? 80,
      industry: input.industry,
      city: input.city,
      contractTitle: input.contract_title,
      contractValue: String(input.contract_value ?? 0),
      contractStatus: input.contract_status ?? "DRAFT",
      notes: input.notes,
      tags: input.tags ?? [],
      starred: false,
      customerSince: new Date(),
    })
    .returning({ id: customers.id });
  return row;
}

export async function updateCustomer(id: string, input: CustomerInput) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(customers)
    .set({
      contactName: input.contact_name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      status: input.status,
      lifetimeValue: String(input.lifetime_value ?? 0),
      healthScore: input.health_score ?? 80,
      industry: input.industry,
      city: input.city,
      contractTitle: input.contract_title,
      contractValue: String(input.contract_value ?? 0),
      contractStatus: input.contract_status,
      notes: input.notes,
      tags: input.tags ?? [],
    })
    .where(and(eq(customers.id, id), eq(customers.organizationId, dbUser.organizationId)));
}

export async function updateCustomerStatus(id: string, status: string) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(customers)
    .set({ status })
    .where(and(eq(customers.id, id), eq(customers.organizationId, dbUser.organizationId)));
}

export async function deleteCustomer(id: string) {
  const dbUser = await getOrCreateDbUser();
  await db.delete(customerNotes).where(eq(customerNotes.customerId, id));
  await db.delete(reminders).where(and(eq(reminders.entityType, "customer"), eq(reminders.entityId, id)));
  await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.organizationId, dbUser.organizationId)));
}

export async function addCustomerNote(customerId: string, text: string) {
  const [row] = await db
    .insert(customerNotes)
    .values({ customerId, text, author: "You" })
    .returning({ id: customerNotes.id });
  return row;
}

export async function createCustomerReminder(input: {
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
      entityType: "customer",
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
