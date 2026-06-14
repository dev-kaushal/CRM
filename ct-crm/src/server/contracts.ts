"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, deals, leads } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

export async function getContracts() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select({
      id: contracts.id,
      contractNumber: contracts.contractNumber,
      status: contracts.status,
      value: contracts.value,
      fileUrl: contracts.fileUrl,
      signedAt: contracts.signedAt,
      expiresAt: contracts.expiresAt,
      dealTitle: deals.title,
      dealCompanyName: deals.companyName,
      leadCompany: leads.company,
    })
    .from(contracts)
    .innerJoin(deals, eq(contracts.dealId, deals.id))
    .leftJoin(leads, eq(deals.leadId, leads.id))
    .where(eq(deals.organizationId, dbUser.organizationId))
    .orderBy(desc(contracts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    contract_number: row.contractNumber,
    status: row.status ?? "DRAFT",
    value: row.value ? Number(row.value) : 0,
    file_url: row.fileUrl ?? undefined,
    signed_at: row.signedAt?.toISOString(),
    expires_at: row.expiresAt?.toISOString(),
    deal: { title: row.dealTitle || "CRM Deal Opportunity" },
    company: row.dealCompanyName || row.leadCompany || "Cosmic Trio Client",
  }));
}

export async function convertDealToContract(dealId: string) {
  const dbUser = await getOrCreateDbUser();

  const [deal] = await db
    .select({ id: deals.id, value: deals.value })
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.organizationId, dbUser.organizationId)))
    .limit(1);

  if (!deal) return null;

  const [contract] = await db
    .insert(contracts)
    .values({
      dealId: deal.id,
      contractNumber: `CT-${Date.now().toString(36).toUpperCase()}`,
      status: "DRAFT",
      value: deal.value,
    })
    .returning({ id: contracts.id });

  return { id: contract.id };
}

export async function updateContractStatus(id: string, status: "DRAFT" | "SENT" | "SIGNED" | "EXPIRED") {
  const dbUser = await getOrCreateDbUser();

  const existing = await db
    .select({ id: contracts.id })
    .from(contracts)
    .innerJoin(deals, eq(contracts.dealId, deals.id))
    .where(and(eq(contracts.id, id), eq(deals.organizationId, dbUser.organizationId)))
    .limit(1);

  if (existing.length === 0) return;

  await db
    .update(contracts)
    .set({
      status,
      signedAt: status === "SIGNED" ? new Date() : null,
    })
    .where(eq(contracts.id, id));
}
