"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, customers, deals, leads, prospects, tasks } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";
import { getActivities } from "./activities";
import { getTasks } from "./tasks";
import { getTeamMembers } from "./users";
import { LEAD_SOURCES, DEAL_STAGES } from "@/lib/constants";
import type { KPIMetric, Task, TaskType, TaskPriority, TaskStatus, Activity, ActivityType } from "@/lib/types";

const PIPELINE_COLORS = ["#3b82f6", "#f97316", "#eab308", "#8b5cf6", "#10b981"];

/** Optional date-range bounds (ISO strings) accepted by the dashboard/analytics queries. */
export interface AnalyticsRange {
  from?: string;
  to?: string;
}

function parseRange(range?: AnalyticsRange) {
  return {
    from: range?.from ? new Date(range.from) : null,
    to: range?.to ? new Date(range.to) : null,
  };
}

function inRange(d: Date | null | undefined, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true;
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function lastNMonths(n: number) {
  const out: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ label: d.toLocaleDateString("en-US", { month: "short" }), year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

/** Revenue trend: daily buckets within an explicit range (capped at 92 days), else the last N months. */
function revenueTrend(wonDeals: { value: string | number | null; createdAt: Date | null; updatedAt: Date | null }[], from: Date | null, to: Date | null, fallbackMonths = 12) {
  if (from && to) {
    const days: { month: string; revenue: number }[] = [];
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    let i = 0;
    while (cursor <= end && i < 92) {
      const dayKey = cursor.toDateString();
      const revenue = wonDeals
        .filter((d) => (d.updatedAt ?? d.createdAt ?? new Date()).toDateString() === dayKey)
        .reduce((s, d) => s + Number(d.value), 0);
      days.push({ month: cursor.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue });
      cursor.setDate(cursor.getDate() + 1);
      i++;
    }
    return days;
  }
  return lastNMonths(fallbackMonths).map((m) => ({
    month: m.label,
    revenue: wonDeals
      .filter((d) => {
        const dt = d.updatedAt ?? d.createdAt ?? new Date();
        return dt.getFullYear() === m.year && dt.getMonth() === m.month;
      })
      .reduce((s, d) => s + Number(d.value), 0),
  }));
}

async function loadOrgSnapshot() {
  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;

  const [leadRows, dealRows, contractRows, prospectRows, customerRows, taskRows] = await Promise.all([
    db.select().from(leads).where(eq(leads.organizationId, orgId)),
    db.select().from(deals).where(eq(deals.organizationId, orgId)),
    db
      .select({ id: contracts.id, status: contracts.status, value: contracts.value, createdAt: contracts.createdAt })
      .from(contracts)
      .innerJoin(deals, eq(contracts.dealId, deals.id))
      .where(eq(deals.organizationId, orgId)),
    db
      .select({ id: prospects.id, qualifiedAt: prospects.qualifiedAt })
      .from(prospects)
      .innerJoin(leads, eq(prospects.leadId, leads.id))
      .where(eq(leads.organizationId, orgId)),
    db.select().from(customers).where(eq(customers.organizationId, orgId)),
    db.select().from(tasks).where(eq(tasks.organizationId, orgId)),
  ]);

  return { dbUser, leadRows, dealRows, contractRows, prospectRows, customerRows, taskRows };
}

export async function getDashboardData(range?: AnalyticsRange) {
  const { dbUser, leadRows, dealRows, contractRows, prospectRows, customerRows, taskRows } = await loadOrgSnapshot();
  const { from, to } = parseRange(range);

  const scopedLeads = leadRows.filter((l) => inRange(l.createdAt, from, to));
  const scopedDeals = dealRows.filter((d) => inRange(d.createdAt, from, to));
  const scopedContracts = contractRows.filter((c) => inRange(c.createdAt, from, to));
  const scopedProspects = prospectRows.filter((p) => inRange(p.qualifiedAt, from, to));
  const scopedCustomers = customerRows.filter((c) => inRange(c.customerSince, from, to));

  const wonDeals = scopedDeals.filter((d) => d.stage === "WON");
  const lostDeals = scopedDeals.filter((d) => d.stage === "LOST");
  const openDeals = scopedDeals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const totalRevenue = wonDeals.reduce((s, d) => s + Number(d.value), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyRevenue = dealRows
    .filter((d) => d.stage === "WON" && (d.updatedAt ?? d.createdAt ?? now) >= monthStart)
    .reduce((s, d) => s + Number(d.value), 0);

  const qualifiedLeadsCount = scopedLeads.filter((l) => l.status === "QUALIFIED").length;
  const signedContractsCount = scopedContracts.filter((c) => c.status === "SIGNED").length;
  const todayStr = now.toDateString();
  const tasksDueToday = taskRows.filter((t) => !t.isCompleted && t.dueDate.toDateString() === todayStr).length;
  const conversionRate = scopedLeads.length > 0 ? (qualifiedLeadsCount / scopedLeads.length) * 100 : 0;

  const kpiMetrics: KPIMetric[] = [
    { label: "Total Revenue", value: totalRevenue, change: 0, changeType: "neutral", format: "currency", icon: "💰" },
    { label: "Monthly Revenue", value: monthlyRevenue, change: 0, changeType: "neutral", format: "currency", icon: "📈" },
    { label: "Open Deals", value: openDeals.length, change: 0, changeType: "neutral", format: "number", icon: "📊" },
    { label: "Won Deals", value: wonDeals.length, change: 0, changeType: "neutral", format: "number", icon: "🏆" },
    { label: "Qualified Leads", value: qualifiedLeadsCount, change: 0, changeType: "neutral", format: "number", icon: "🎯" },
    { label: "Contracts Signed", value: signedContractsCount, change: 0, changeType: "neutral", format: "number", icon: "✍️" },
    { label: "Tasks Due Today", value: tasksDueToday, change: 0, changeType: "neutral", format: "number", icon: "📋" },
    { label: "Conversion Rate", value: conversionRate.toFixed(1), change: 0, changeType: "neutral", format: "percent", icon: "⚡" },
  ];

  const pipelineData = [
    { name: "Lead", count: scopedLeads.length, value: scopedLeads.length * 50000, color: PIPELINE_COLORS[0], conversionRate: 75 },
    { name: "Prospect", count: scopedProspects.length, value: scopedProspects.length * 80000, color: PIPELINE_COLORS[1], conversionRate: 75 },
    { name: "Deal", count: scopedDeals.length, value: scopedDeals.reduce((s, d) => s + Number(d.value), 0), color: PIPELINE_COLORS[2], conversionRate: 75 },
    { name: "Contract", count: scopedContracts.length, value: scopedContracts.reduce((s, c) => s + Number(c.value ?? 0), 0), color: PIPELINE_COLORS[3], conversionRate: 75 },
    { name: "Customer", count: scopedCustomers.length, value: scopedCustomers.reduce((s, c) => s + Number(c.lifetimeValue ?? 0), 0), color: PIPELINE_COLORS[4] },
  ];

  const pipelineOverview = {
    leads: scopedLeads.length,
    prospects: scopedProspects.length,
    deals: scopedDeals.length,
    won: wonDeals.length,
    lost: lostDeals.length,
  };

  const revenueData = revenueTrend(wonDeals, from, to, 12);

  const sourceCounts: Record<string, number> = {};
  scopedLeads.forEach((l) => {
    const src = (l.source ?? "OTHER").toLowerCase();
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  });
  const leadSources = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }));

  const negotiationCount = scopedDeals.filter((d) => d.stage === "NEGOTIATION").length;
  const contractCount = scopedDeals.filter((d) => d.stage === "CONTRACT").length;
  const atRiskCount = scopedDeals.filter((d) => {
    if (d.stage === "WON" || d.stage === "LOST") return false;
    return !!d.expectedCloseDate && d.expectedCloseDate < now;
  }).length;
  const stalledCount = scopedDeals.filter((d) => {
    if (d.stage !== "NEW" && d.stage !== "PROPOSAL") return false;
    const created = d.createdAt ?? now;
    return now.getTime() - created.getTime() > 30 * 86400000;
  }).length;

  const dealHealth = {
    open: openDeals.length,
    atRisk: atRiskCount,
    stalled: stalledCount,
    negotiation: negotiationCount,
    contract: contractCount,
  };

  const taskList = await getTasks();
  const formattedTasks: Task[] = taskList.map((t) => ({
    id: t.id,
    org_id: dbUser.organizationId,
    title: t.title,
    type: t.type as TaskType,
    priority: t.priority as TaskPriority,
    status: t.status as TaskStatus,
    due_date: t.due_date,
    assigned_to: t.assigned_to,
    created_at: t.created_at,
  }));

  const activityList = await getActivities();
  const formattedActivities: Activity[] = activityList.map((a) => ({
    id: a.id,
    org_id: dbUser.organizationId,
    type: a.type as ActivityType,
    description: a.description,
    user_id: "",
    user_name: a.user_name,
    entity_type: a.entity_type,
    entity_name: a.entity_name,
    metadata: a.metadata,
    created_at: a.created_at,
  }));

  const team = await getTeamMembers();
  const teamMembers = team.map((m) => {
    const totalDeals = m.open_deals + m.closed_deals;
    return {
      name: m.full_name,
      avatar: m.avatar_url,
      revenue: m.revenue_generated,
      dealsWon: m.closed_deals,
      conversionRate: totalDeals > 0 ? Math.round((m.closed_deals / totalDeals) * 100) : 0,
      callsMade: 0,
      tasksCompleted: taskRows.filter((t) => t.assignedTo === m.id && t.isCompleted).length,
    };
  });

  return { kpiMetrics, pipelineData, pipelineOverview, revenueData, leadSources, dealHealth, tasks: formattedTasks, activities: formattedActivities, teamMembers };
}

export async function getAnalyticsData(range?: AnalyticsRange) {
  const { dealRows, leadRows, contractRows, prospectRows, customerRows } = await loadOrgSnapshot();
  const { from, to } = parseRange(range);

  const scopedLeads = leadRows.filter((l) => inRange(l.createdAt, from, to));
  const scopedDeals = dealRows.filter((d) => inRange(d.createdAt, from, to));
  const scopedContracts = contractRows.filter((c) => inRange(c.createdAt, from, to));
  const scopedProspects = prospectRows.filter((p) => inRange(p.qualifiedAt, from, to));
  const scopedCustomers = customerRows.filter((c) => inRange(c.customerSince, from, to));

  const wonDeals = scopedDeals.filter((d) => d.stage === "WON");
  const lostDeals = scopedDeals.filter((d) => d.stage === "LOST");
  const totalRevenue = wonDeals.reduce((s, d) => s + Number(d.value), 0);
  const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
  const conversionRate = scopedLeads.length > 0 ? (scopedLeads.filter((l) => l.status === "QUALIFIED").length / scopedLeads.length) * 100 : 0;

  const velocityDeals = wonDeals.filter((d) => d.createdAt && d.updatedAt);
  const pipelineVelocity = velocityDeals.length > 0
    ? Math.round(velocityDeals.reduce((s, d) => s + (d.updatedAt!.getTime() - d.createdAt!.getTime()) / 86400000, 0) / velocityDeals.length)
    : 0;

  const monthlyRevenue = revenueTrend(wonDeals, from, to, 6).map((r) => ({ month: r.month, value: r.revenue }));

  const funnelBase = scopedLeads.length || 1;
  const funnelStages = [
    { name: "Leads", count: scopedLeads.length, color: PIPELINE_COLORS[0], percent: 100 },
    { name: "Prospects", count: scopedProspects.length, color: PIPELINE_COLORS[1], percent: Math.round((scopedProspects.length / funnelBase) * 100) },
    { name: "Deals", count: scopedDeals.length, color: PIPELINE_COLORS[2], percent: Math.round((scopedDeals.length / funnelBase) * 100) },
    { name: "Contracts", count: scopedContracts.length, color: PIPELINE_COLORS[3], percent: Math.round((scopedContracts.length / funnelBase) * 100) },
    { name: "Customers", count: scopedCustomers.length, color: PIPELINE_COLORS[4], percent: Math.round((scopedCustomers.length / funnelBase) * 100) },
  ];

  const sourceCounts: Record<string, number> = {};
  scopedLeads.forEach((l) => {
    const src = (l.source ?? "OTHER").toLowerCase();
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  });
  const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({
    source: LEAD_SOURCES[source as keyof typeof LEAD_SOURCES]?.label ?? source,
    count,
    color: LEAD_SOURCES[source as keyof typeof LEAD_SOURCES]?.color ?? "#717478",
  }));

  const stageDefs = [
    { key: "NEW" as const, label: "New", color: DEAL_STAGES.new.color },
    { key: "PROPOSAL" as const, label: "Proposal", color: DEAL_STAGES.proposal.color },
    { key: "NEGOTIATION" as const, label: "Negotiation", color: DEAL_STAGES.negotiation.color },
    { key: "CONTRACT" as const, label: "Contract", color: DEAL_STAGES.contract.color },
    { key: "WON" as const, label: "Won", color: DEAL_STAGES.won.color },
    { key: "LOST" as const, label: "Lost", color: DEAL_STAGES.lost.color },
  ];
  const dealStages = stageDefs.map((s) => {
    const rows = scopedDeals.filter((d) => d.stage === s.key);
    return { stage: s.label, count: rows.length, value: rows.reduce((sum, d) => sum + Number(d.value), 0), color: s.color };
  });

  return {
    totalRevenue,
    conversionRate: Number(conversionRate.toFixed(1)),
    avgDealSize,
    pipelineVelocity,
    revenueChange: 0,
    conversionChange: 0,
    dealSizeChange: 0,
    velocityChange: 0,
    monthlyRevenue,
    funnelStages,
    sourceBreakdown,
    dealStages,
    winLossRatio: { won: wonDeals.length, lost: lostDeals.length },
  };
}
