"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals, leads } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

export async function getDeals() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stage: deals.stage,
      probability: deals.probability,
      expectedCloseDate: deals.expectedCloseDate,
      companyName: deals.companyName,
      leadCompany: leads.company,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
    })
    .from(deals)
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .where(eq(deals.organizationId, dbUser.organizationId))
    .orderBy(desc(deals.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    value: row.value ? Number(row.value) : 0,
    stage: row.stage ?? "NEW",
    probability: row.probability ?? 10,
    expected_close_date: row.expectedCloseDate?.toISOString(),
    company_name: row.companyName ?? undefined,
    lead: row.leadCompany
      ? { company: row.leadCompany, first_name: row.leadFirstName ?? "", last_name: row.leadLastName ?? "" }
      : undefined,
  }));
}

export async function updateDealStage(id: string, stage: string, probability: number) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(deals)
    .set({ stage: stage as typeof deals.$inferInsert.stage, probability, updatedAt: new Date() })
    .where(and(eq(deals.id, id), eq(deals.organizationId, dbUser.organizationId)));
}

export async function createDeal(input: {
  title: string;
  value: number;
  stage: string;
  probability: number;
  company_name?: string;
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
      ownerId: dbUser.id,
      companyName: input.company_name,
    })
    .returning({ id: deals.id });

  return deal;
}
