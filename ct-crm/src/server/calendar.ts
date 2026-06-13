"use server";

import { and, asc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, customers, deals, contracts, leads, prospects, reminders } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

/** Cross-entity reminders (lead/prospect/customer/contact), org-scoped, optionally bounded by date range. */
export async function getAllReminders(rangeStart?: Date, rangeEnd?: Date) {
  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;

  const [leadRows, prospectRows, customerRows, contactRows] = await Promise.all([
    db.select({ id: leads.id }).from(leads).where(eq(leads.organizationId, orgId)),
    db.select({ id: prospects.id }).from(prospects).innerJoin(leads, eq(prospects.leadId, leads.id)).where(eq(leads.organizationId, orgId)),
    db.select({ id: customers.id }).from(customers).where(eq(customers.organizationId, orgId)),
    db.select({ id: contacts.id }).from(contacts).where(eq(contacts.organizationId, orgId)),
  ]);

  const idsByType: Record<string, string[]> = {
    lead: leadRows.map(r => r.id),
    prospect: prospectRows.map(r => r.id),
    customer: customerRows.map(r => r.id),
    contact: contactRows.map(r => r.id),
  };

  const conditions = Object.entries(idsByType)
    .filter(([, ids]) => ids.length > 0)
    .map(([type, ids]) => and(eq(reminders.entityType, type), inArray(reminders.entityId, ids)));

  if (conditions.length === 0) return [];

  let whereClause = or(...conditions);
  if (rangeStart) whereClause = and(whereClause, gte(reminders.datetime, rangeStart));
  if (rangeEnd) whereClause = and(whereClause, lte(reminders.datetime, rangeEnd));

  const rows = await db.select().from(reminders).where(whereClause).orderBy(asc(reminders.datetime));

  return rows.map(r => ({
    id: r.id,
    entity_type: r.entityType,
    entity_id: r.entityId,
    entity_name: r.entityName ?? "",
    title: r.title,
    type: r.type,
    datetime: r.datetime.toISOString(),
    note: r.note ?? undefined,
    done: r.done ?? false,
  }));
}

export async function toggleReminderDone(id: string, done: boolean) {
  await db.update(reminders).set({ done }).where(eq(reminders.id, id));
}

/** Pushes a reminder's due time forward by `hours` (default 1). */
export async function snoozeReminder(id: string, hours = 1) {
  await db
    .update(reminders)
    .set({ datetime: sql`${reminders.datetime} + interval '1 hour' * ${hours}` })
    .where(eq(reminders.id, id));
}

export async function updateReminder(id: string, input: { title?: string; type?: string; datetime?: string; note?: string }) {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.type !== undefined) updates.type = input.type;
  if (input.datetime !== undefined) updates.datetime = new Date(input.datetime);
  if (input.note !== undefined) updates.note = input.note;
  await db.update(reminders).set(updates).where(eq(reminders.id, id));
}

export async function deleteReminder(id: string) {
  await db.delete(reminders).where(eq(reminders.id, id));
}

export interface DailyEntityCounts {
  leads: number;
  prospects: number;
  deals: number;
  contracts: number;
}

/** Per-day counts of new leads/prospects/deals/contracts created within the range, org-scoped. Keyed by `Date.toDateString()`. */
export async function getDailyEntityCounts(rangeStart: Date, rangeEnd: Date): Promise<Record<string, DailyEntityCounts>> {
  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;

  const [leadRows, prospectRows, dealRows, contractRows] = await Promise.all([
    db.select({ createdAt: leads.createdAt }).from(leads)
      .where(and(eq(leads.organizationId, orgId), gte(leads.createdAt, rangeStart), lte(leads.createdAt, rangeEnd))),
    db.select({ createdAt: prospects.qualifiedAt }).from(prospects)
      .innerJoin(leads, eq(prospects.leadId, leads.id))
      .where(and(eq(leads.organizationId, orgId), gte(prospects.qualifiedAt, rangeStart), lte(prospects.qualifiedAt, rangeEnd))),
    db.select({ createdAt: deals.createdAt }).from(deals)
      .where(and(eq(deals.organizationId, orgId), gte(deals.createdAt, rangeStart), lte(deals.createdAt, rangeEnd))),
    db.select({ createdAt: contracts.createdAt }).from(contracts)
      .innerJoin(deals, eq(contracts.dealId, deals.id))
      .where(and(eq(deals.organizationId, orgId), gte(contracts.createdAt, rangeStart), lte(contracts.createdAt, rangeEnd))),
  ]);

  const map: Record<string, DailyEntityCounts> = {};
  const bump = (rows: { createdAt: Date | null }[], key: keyof DailyEntityCounts) => {
    rows.forEach((r) => {
      if (!r.createdAt) return;
      const k = r.createdAt.toDateString();
      if (!map[k]) map[k] = { leads: 0, prospects: 0, deals: 0, contracts: 0 };
      map[k][key]++;
    });
  };
  bump(leadRows, "leads");
  bump(prospectRows, "prospects");
  bump(dealRows, "deals");
  bump(contractRows, "contracts");

  return map;
}
