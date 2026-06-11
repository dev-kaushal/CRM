"use server";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, leads, users } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

const ROLE_MAP: Record<string, "admin" | "manager" | "rep"> = {
  SUPER_ADMIN: "admin",
  ORG_ADMIN: "admin",
  SALES_MANAGER: "manager",
  SALES_REP: "rep",
  VIEWER: "rep",
};

export async function getTeamMembers() {
  const dbUser = await getOrCreateDbUser();

  const memberRows = await db
    .select()
    .from(users)
    .where(eq(users.organizationId, dbUser.organizationId))
    .orderBy(desc(users.createdAt));

  const leadCounts = await db
    .select({ ownerId: leads.ownerId, count: sql<number>`count(*)` })
    .from(leads)
    .where(eq(leads.organizationId, dbUser.organizationId))
    .groupBy(leads.ownerId);

  const dealStats = await db
    .select({
      ownerId: deals.ownerId,
      stage: deals.stage,
      count: sql<number>`count(*)`,
      value: sql<string>`coalesce(sum(${deals.value}), 0)`,
    })
    .from(deals)
    .where(eq(deals.organizationId, dbUser.organizationId))
    .groupBy(deals.ownerId, deals.stage);

  return memberRows.map((u) => {
    const assignedLeads = leadCounts.find((l) => l.ownerId === u.id)?.count ?? 0;
    const userDeals = dealStats.filter((d) => d.ownerId === u.id);
    const openDeals = userDeals
      .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
      .reduce((s, d) => s + Number(d.count), 0);
    const closedDeals = userDeals
      .filter((d) => d.stage === "WON")
      .reduce((s, d) => s + Number(d.count), 0);
    const revenue = userDeals
      .filter((d) => d.stage === "WON")
      .reduce((s, d) => s + Number(d.value), 0);

    return {
      id: u.id,
      full_name: u.fullName,
      email: u.email,
      phone: u.phone ?? undefined,
      role: ROLE_MAP[u.role ?? "SALES_REP"] ?? "rep",
      status: (u.status ?? "ACTIVE").toLowerCase(),
      avatar_url: u.avatarUrl ?? undefined,
      assigned_leads: Number(assignedLeads),
      open_deals: openDeals,
      closed_deals: closedDeals,
      revenue_generated: revenue,
      created_at: (u.createdAt ?? new Date()).toISOString(),
    };
  });
}
