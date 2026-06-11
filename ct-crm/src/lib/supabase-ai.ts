"use server";

/**
 * AI Module Helpers (Drizzle/Neon)
 * Centralized query functions for Phase 2 & Phase 3 tables
 */

import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { getOrCreateDbUser } from "@/server/auth";
import {
  leads,
  deals,
  contracts,
  customers,
  customFieldDefinitions,
  customFieldValues,
  leadScores,
  leadEnrichment,
  aiSuggestions,
  workflowDefinitions,
  workflowRuns,
  forecastSnapshots,
  whatsappConversations,
  whatsappMessages,
  contractScores,
  dealRiskScores,
  aiInteractions,
  promptLogs,
  aiAgents,
  agentTasks,
  agentAuditLogs,
  executiveInsights,
  customerHealthScores,
  churnPredictions,
  revenuePredictions,
  proposalVersions,
  proposalAnalytics,
} from "@/db/schema";

type WorkspaceLeadInput = {
  name: string;
  company: string;
  source: string;
  status?: string;
  value: number;
};

function splitLeadName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "Imported";
  const lastName = parts.join(" ") || "Lead";
  return { firstName, lastName };
}

// ============================================
// PHASE 3: Universal Workspace Data Bridge
// ============================================
export async function fetchWorkspaceLeads() {
  const dbUser = await getOrCreateDbUser();

  const leadRows = await db
    .select()
    .from(leads)
    .where(eq(leads.organizationId, dbUser.organizationId))
    .orderBy(desc(leads.createdAt))
    .limit(20);

  if (leadRows.length === 0) return [];

  const leadIds = leadRows.map((l) => l.id);
  const [dealRows, fieldValueRows] = await Promise.all([
    db.select().from(deals).where(inArray(deals.leadId, leadIds)),
    db
      .select({
        id: customFieldValues.id,
        definitionId: customFieldValues.definitionId,
        leadId: customFieldValues.leadId,
        value: customFieldValues.value,
        fieldName: customFieldDefinitions.fieldName,
        fieldType: customFieldDefinitions.fieldType,
      })
      .from(customFieldValues)
      .innerJoin(customFieldDefinitions, eq(customFieldValues.definitionId, customFieldDefinitions.id))
      .where(inArray(customFieldValues.leadId, leadIds)),
  ]);

  return leadRows.map((lead) => {
    const primaryDeal = dealRows
      .filter((d) => d.leadId === lead.id)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))[0];

    const customValues: Record<string, unknown> = {};
    fieldValueRows
      .filter((fv) => fv.leadId === lead.id)
      .forEach((fv) => {
        const key = fv.fieldName?.toLowerCase().replace(/\s+/g, "_");
        if (key) {
          customValues[key] = fv.value;
          customValues[`${key}__fieldId`] = fv.definitionId;
          customValues[`${key}__valueId`] = fv.id;
          customValues[`${key}__type`] = fv.fieldType ?? "TEXT";
        }
      });

    return {
      id: lead.id,
      dealId: primaryDeal?.id,
      name: `${lead.firstName} ${lead.lastName}`.trim(),
      company: lead.company || "Individual",
      source: (lead.source || "DIRECT").toUpperCase(),
      status: lead.status || "NEW",
      value: Number(primaryDeal?.value ?? 0),
      ...customValues,
    };
  });
}

export async function updateWorkspaceLeadCell(row: any, colKey: string, value: string | number) {
  if (colKey === "name") {
    const { firstName, lastName } = splitLeadName(String(value));
    await db.update(leads).set({ firstName, lastName, updatedAt: new Date() }).where(eq(leads.id, row.id));
    return;
  }

  if (colKey === "company") {
    await db.update(leads).set({ company: String(value), updatedAt: new Date() }).where(eq(leads.id, row.id));
    return;
  }

  if (colKey === "source") {
    await db.update(leads).set({ source: String(value), updatedAt: new Date() }).where(eq(leads.id, row.id));
    return;
  }

  if (colKey === "status") {
    await db
      .update(leads)
      .set({ status: value as typeof leads.$inferInsert.status, updatedAt: new Date() })
      .where(eq(leads.id, row.id));
    return;
  }

  if (colKey === "value" && row.dealId) {
    await db
      .update(deals)
      .set({ value: String(Number(value) || 0), updatedAt: new Date() })
      .where(eq(deals.id, row.dealId));
    return;
  }

  const fieldId = row[`${colKey}__fieldId`];
  const valueId = row[`${colKey}__valueId`];
  if (fieldId) {
    if (valueId) {
      const [updated] = await db
        .update(customFieldValues)
        .set({ value: String(value ?? "") })
        .where(eq(customFieldValues.id, valueId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(customFieldValues)
      .values({ leadId: row.id, definitionId: fieldId, value: String(value ?? "") })
      .returning();
    return created;
  }
}

export async function createWorkspaceCustomField(orgId: string, label: string, fieldType: string) {
  const [created] = await db
    .insert(customFieldDefinitions)
    .values({
      organizationId: orgId,
      fieldName: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      fieldLabel: label,
      fieldType: fieldType as typeof customFieldDefinitions.$inferInsert.fieldType,
      relatedModule: "leads",
    })
    .returning();

  return created;
}

export async function importWorkspaceLeads(orgId: string, leadsInput: WorkspaceLeadInput[]) {
  const createdRows = [];

  for (const lead of leadsInput) {
    const { firstName, lastName } = splitLeadName(lead.name);
    const [createdLead] = await db
      .insert(leads)
      .values({
        organizationId: orgId,
        firstName,
        lastName,
        company: lead.company,
        source: lead.source,
        status: (lead.status as typeof leads.$inferInsert.status) || "NEW",
      })
      .returning();

    const [createdDeal] = await db
      .insert(deals)
      .values({
        organizationId: orgId,
        leadId: createdLead.id,
        title: `${lead.company || lead.name} Opportunity`,
        value: String(lead.value),
        stage: lead.status === "QUALIFIED" ? "PROPOSAL" : "NEW",
        probability: lead.status === "QUALIFIED" ? 60 : 20,
      })
      .returning();

    createdRows.push({
      id: createdLead.id,
      dealId: createdDeal.id,
      name: `${createdLead.firstName} ${createdLead.lastName}`,
      company: createdLead.company,
      source: createdLead.source,
      status: createdLead.status,
      value: Number(createdDeal.value ?? 0),
    });
  }

  return createdRows;
}

// ============================================
// PHASE 2: Lead Scores
// ============================================
export async function fetchLeadScores() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select({
      id: leadScores.id,
      leadId: leadScores.leadId,
      score: leadScores.score,
      factors: leadScores.factors,
      updatedAt: leadScores.updatedAt,
      lead: {
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        company: leads.company,
        source: leads.source,
        status: leads.status,
        estimatedValue: leads.estimatedValue,
        email: leads.email,
      },
    })
    .from(leadScores)
    .innerJoin(leads, eq(leadScores.leadId, leads.id))
    .where(eq(leads.organizationId, dbUser.organizationId))
    .orderBy(desc(leadScores.score));
}

export async function upsertLeadScore(leadId: string, score: number, factors: Record<string, any>) {
  const [row] = await db
    .insert(leadScores)
    .values({ leadId, score, factors, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: leadScores.leadId,
      set: { score, factors, updatedAt: new Date() },
    })
    .returning();

  return row;
}

// ============================================
// PHASE 2: Lead Enrichment
// ============================================
export async function fetchLeadEnrichment(leadId: string) {
  const [row] = await db.select().from(leadEnrichment).where(eq(leadEnrichment.leadId, leadId)).limit(1);
  return row ?? null;
}

export async function upsertLeadEnrichment(leadId: string, enrichment: {
  website?: string; industry?: string; employee_count?: number;
  linkedin_url?: string; location?: string; tech_stack?: string[];
}) {
  const values = {
    website: enrichment.website,
    industry: enrichment.industry,
    employeeCount: enrichment.employee_count,
    linkedinUrl: enrichment.linkedin_url,
    location: enrichment.location,
    techStack: enrichment.tech_stack ?? [],
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(leadEnrichment)
    .values({ leadId, ...values })
    .onConflictDoUpdate({
      target: leadEnrichment.leadId,
      set: values,
    })
    .returning();

  return row;
}

// ============================================
// PHASE 2: AI Suggestions
// ============================================
export async function fetchAISuggestions(entityType: string, entityId: string) {
  return db
    .select()
    .from(aiSuggestions)
    .where(and(eq(aiSuggestions.entityType, entityType), eq(aiSuggestions.entityId, entityId)))
    .orderBy(desc(aiSuggestions.createdAt))
    .limit(10);
}

export async function createAISuggestion(orgId: string, entityType: string, entityId: string, actionText: string, priority: string, context?: string) {
  const [row] = await db
    .insert(aiSuggestions)
    .values({ organizationId: orgId, entityType, entityId, actionText, priority, analyzedContext: context })
    .returning();

  return row;
}

// ============================================
// PHASE 2: Workflow Definitions & Runs
// ============================================
export async function fetchWorkflowDefinitions() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.organizationId, dbUser.organizationId))
    .orderBy(desc(workflowDefinitions.createdAt));
}

export async function createWorkflowDefinition(orgId: string, name: string, triggerEvent: string, conditions: any[], actions: any[]) {
  const [row] = await db
    .insert(workflowDefinitions)
    .values({ organizationId: orgId, name, triggerEvent, conditions, actions, isActive: true })
    .returning();

  return row;
}

export async function createWorkflowRun(workflowId: string, entityId: string, logs: any[]) {
  const [row] = await db
    .insert(workflowRuns)
    .values({ workflowId, triggerEntityId: entityId, status: "COMPLETED", logs })
    .returning();

  return row;
}

// ============================================
// PHASE 2: Forecast Snapshots
// ============================================
export async function fetchForecasts() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select()
    .from(forecastSnapshots)
    .where(eq(forecastSnapshots.organizationId, dbUser.organizationId))
    .orderBy(desc(forecastSnapshots.createdAt));
}

export async function createForecastSnapshot(orgId: string, month: string, predictedRevenue: number, confidenceScore: number, riskFactors: any[] = [], assumptions: any[] = []) {
  const [row] = await db
    .insert(forecastSnapshots)
    .values({ organizationId: orgId, month, predictedRevenue: String(predictedRevenue), confidenceScore, riskFactors, assumptions })
    .returning();

  return row;
}

// ============================================
// PHASE 2: WhatsApp Conversations & Messages
// ============================================
export async function fetchWhatsAppConversations() {
  const dbUser = await getOrCreateDbUser();

  const convs = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.organizationId, dbUser.organizationId))
    .orderBy(desc(whatsappConversations.updatedAt));

  if (convs.length === 0) return [];

  const convIds = convs.map((c) => c.id);
  const msgs = await db.select().from(whatsappMessages).where(inArray(whatsappMessages.conversationId, convIds));

  return convs.map((c) => ({ ...c, messages: msgs.filter((m) => m.conversationId === c.id) }));
}

export async function createWhatsAppConversation(orgId: string, leadId: string | null, contactName: string) {
  const [row] = await db
    .insert(whatsappConversations)
    .values({ organizationId: orgId, leadId, contactName })
    .returning();

  return row;
}

export async function createWhatsAppMessage(conversationId: string, direction: "INBOUND" | "OUTBOUND", messageText: string) {
  const [row] = await db
    .insert(whatsappMessages)
    .values({ conversationId, direction, messageText })
    .returning();

  await db
    .update(whatsappConversations)
    .set({ lastMessage: messageText, updatedAt: new Date() })
    .where(eq(whatsappConversations.id, conversationId));

  return row;
}

// ============================================
// PHASE 2: Contract Scores
// ============================================
export async function fetchContractScores() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select({
      id: contractScores.id,
      contractId: contractScores.contractId,
      readinessScore: contractScores.readinessScore,
      factors: contractScores.factors,
      recommendations: contractScores.recommendations,
      updatedAt: contractScores.updatedAt,
      contract: {
        id: contracts.id,
        contractNumber: contracts.contractNumber,
        status: contracts.status,
        value: contracts.value,
      },
    })
    .from(contractScores)
    .innerJoin(contracts, eq(contractScores.contractId, contracts.id))
    .innerJoin(deals, eq(contracts.dealId, deals.id))
    .where(eq(deals.organizationId, dbUser.organizationId))
    .orderBy(desc(contractScores.readinessScore));
}

export async function upsertContractScore(contractId: string, readinessScore: number, factors: Record<string, any>, recommendations: any[]) {
  const [row] = await db
    .insert(contractScores)
    .values({ contractId, readinessScore, factors, recommendations, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: contractScores.contractId,
      set: { readinessScore, factors, recommendations, updatedAt: new Date() },
    })
    .returning();

  return row;
}

// ============================================
// PHASE 2: Deal Risk Scores
// ============================================
export async function fetchDealRiskScores() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select({
      id: dealRiskScores.id,
      dealId: dealRiskScores.dealId,
      riskLevel: dealRiskScores.riskLevel,
      factors: dealRiskScores.factors,
      recommendations: dealRiskScores.recommendations,
      updatedAt: dealRiskScores.updatedAt,
      deal: { id: deals.id, title: deals.title, value: deals.value, stage: deals.stage },
    })
    .from(dealRiskScores)
    .innerJoin(deals, eq(dealRiskScores.dealId, deals.id))
    .where(eq(deals.organizationId, dbUser.organizationId))
    .orderBy(desc(dealRiskScores.updatedAt));
}

export async function upsertDealRiskScore(dealId: string, riskLevel: string, factors: any[], recommendations: any[]) {
  const [row] = await db
    .insert(dealRiskScores)
    .values({ dealId, riskLevel, factors, recommendations, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: dealRiskScores.dealId,
      set: { riskLevel, factors, recommendations, updatedAt: new Date() },
    })
    .returning();

  return row;
}

// ============================================
// PHASE 2: AI Interactions & Prompt Logs
// ============================================
export async function logAIInteraction(orgId: string, userId: string | null, query: string, response: string) {
  const [row] = await db
    .insert(aiInteractions)
    .values({ organizationId: orgId, userId, query, response })
    .returning();

  return row;
}

export async function logPrompt(orgId: string, feature: string, prompt: string, completion: string, tokensUsed: number, model: string = "gpt-4o") {
  const [row] = await db
    .insert(promptLogs)
    .values({ organizationId: orgId, feature, prompt, completion, tokensUsed, model })
    .returning();

  return row;
}

// ============================================
// PHASE 3: AI Agents Registry
// ============================================
export async function fetchAIAgents() {
  const dbUser = await getOrCreateDbUser();

  const agentRows = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, dbUser.organizationId))
    .orderBy(aiAgents.createdAt);

  if (agentRows.length === 0) return [];

  const agentIds = agentRows.map((a) => a.id);
  const taskRows = await db.select().from(agentTasks).where(inArray(agentTasks.agentId, agentIds));

  return agentRows.map((a) => ({ ...a, tasks: taskRows.filter((t) => t.agentId === a.id) }));
}

export async function upsertAIAgent(orgId: string, agentName: string, agentRole: string, systemInstructions: string, status: string = "ACTIVE") {
  const [row] = await db
    .insert(aiAgents)
    .values({ organizationId: orgId, agentName, agentRole, systemInstructions, status })
    .returning();

  return row;
}

export async function createAgentTask(agentId: string, description: string, entityType: string, entityId: string, logs: any[] = []) {
  const [row] = await db
    .insert(agentTasks)
    .values({ agentId, description, targetEntityType: entityType, targetEntityId: entityId, status: "COMPLETED", logs, completedAt: new Date() })
    .returning();

  return row;
}

// ============================================
// PHASE 3: Agent Audit Logs
// ============================================
export async function fetchAgentAuditLogs() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select()
    .from(agentAuditLogs)
    .where(eq(agentAuditLogs.organizationId, dbUser.organizationId))
    .orderBy(desc(agentAuditLogs.createdAt))
    .limit(50);
}

export async function createAgentAuditLog(orgId: string, agentName: string, actionDescription: string, targetEntity: string, targetId: string) {
  const [row] = await db
    .insert(agentAuditLogs)
    .values({ organizationId: orgId, agentName, actionDescription, targetEntity, targetId })
    .returning();

  return row;
}

// ============================================
// PHASE 3: Executive Insights
// ============================================
export async function fetchExecutiveInsights() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select()
    .from(executiveInsights)
    .where(eq(executiveInsights.organizationId, dbUser.organizationId))
    .orderBy(desc(executiveInsights.createdAt))
    .limit(20);
}

export async function createExecutiveInsight(orgId: string, insightText: string, impactLevel: string, category: string) {
  const [row] = await db
    .insert(executiveInsights)
    .values({ organizationId: orgId, insightText, impactLevel, category })
    .returning();

  return row;
}

// ============================================
// PHASE 3: Customer Health & Churn
// ============================================
export async function fetchCustomerHealthScores() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select({
      id: customerHealthScores.id,
      customerId: customerHealthScores.customerId,
      score: customerHealthScores.score,
      factors: customerHealthScores.factors,
      updatedAt: customerHealthScores.updatedAt,
      customer: { id: customers.id, contactName: customers.contactName, company: customers.company, lifetimeValue: customers.lifetimeValue },
    })
    .from(customerHealthScores)
    .innerJoin(customers, eq(customerHealthScores.customerId, customers.id))
    .where(eq(customers.organizationId, dbUser.organizationId))
    .orderBy(desc(customerHealthScores.score));
}

export async function upsertCustomerHealthScore(customerId: string, score: number, factors: Record<string, any>) {
  const [row] = await db
    .insert(customerHealthScores)
    .values({ customerId, score, factors, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: customerHealthScores.customerId,
      set: { score, factors, updatedAt: new Date() },
    })
    .returning();

  return row;
}

export async function fetchChurnPredictions() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select({
      id: churnPredictions.id,
      customerId: churnPredictions.customerId,
      riskLevel: churnPredictions.riskLevel,
      probability: churnPredictions.probability,
      factors: churnPredictions.factors,
      updatedAt: churnPredictions.updatedAt,
      customer: { id: customers.id, contactName: customers.contactName, company: customers.company },
    })
    .from(churnPredictions)
    .innerJoin(customers, eq(churnPredictions.customerId, customers.id))
    .where(eq(customers.organizationId, dbUser.organizationId))
    .orderBy(desc(churnPredictions.probability));
}

// ============================================
// PHASE 3: Revenue Predictions
// ============================================
export async function fetchRevenuePredictions() {
  const dbUser = await getOrCreateDbUser();

  return db
    .select()
    .from(revenuePredictions)
    .where(eq(revenuePredictions.organizationId, dbUser.organizationId))
    .orderBy(desc(revenuePredictions.createdAt));
}

// ============================================
// PHASE 3: Proposal Versions & Analytics
// ============================================
export async function fetchProposalVersions(dealId?: string) {
  const versionRows = dealId
    ? await db.select().from(proposalVersions).where(eq(proposalVersions.dealId, dealId)).orderBy(desc(proposalVersions.createdAt))
    : await db.select().from(proposalVersions).orderBy(desc(proposalVersions.createdAt));

  if (versionRows.length === 0) return [];

  const versionIds = versionRows.map((v) => v.id);
  const analyticsRows = await db.select().from(proposalAnalytics).where(inArray(proposalAnalytics.proposalId, versionIds));

  return versionRows.map((v) => ({ ...v, analytics: analyticsRows.filter((a) => a.proposalId === v.id) }));
}

export async function createProposalVersion(dealId: string, versionNumber: number, pricingConfig: any, content: string) {
  const [row] = await db
    .insert(proposalVersions)
    .values({ dealId, versionNumber, pricingConfig, content })
    .returning();

  return row;
}

// ============================================
// PHASE 3: Pipeline Snapshot (NL Query Engine)
// ============================================
export async function fetchPipelineSnapshot() {
  const dbUser = await getOrCreateDbUser();

  const [leadRows, dealRows] = await Promise.all([
    db.select().from(leads).where(eq(leads.organizationId, dbUser.organizationId)),
    db.select().from(deals).where(eq(deals.organizationId, dbUser.organizationId)),
  ]);

  return { leads: leadRows, deals: dealRows };
}

// ============================================
// PHASE 2: Lead Score + Enrichment Lookup
// ============================================
export async function fetchLeadIntelligence(leadId: string) {
  const [scoreRow] = await db.select().from(leadScores).where(eq(leadScores.leadId, leadId)).limit(1);
  const [enrichmentRow] = await db.select().from(leadEnrichment).where(eq(leadEnrichment.leadId, leadId)).limit(1);

  return { score: scoreRow ?? null, enrichment: enrichmentRow ?? null };
}

// ============================================
// Helper: Get Organization ID
// ============================================
export async function getOrganizationId(): Promise<string> {
  const dbUser = await getOrCreateDbUser();
  return dbUser.organizationId;
}
