/**
 * Supabase AI Module Helpers
 * Centralized query functions for Phase 2 & Phase 3 tables
 */

import { createClient } from "@/utils/supabase/client";

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
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(`
      id,
      first_name,
      last_name,
      company,
      source,
      status,
      created_at,
      deals(id, title, value, stage, probability, created_at),
      custom_field_values(id, definition_id, value, field:custom_field_definitions(id, field_name, field_label, field_type))
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data || []).map((lead: any) => {
    const primaryDeal = [...(lead.deals || [])].sort((a: any, b: any) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    })[0];

    const customValues = (lead.custom_field_values || []).reduce((acc: Record<string, any>, fieldValue: any) => {
      const key = fieldValue.field?.field_name?.toLowerCase().replace(/\s+/g, "_");
      if (key) {
        acc[key] = fieldValue.value;
        acc[`${key}__fieldId`] = fieldValue.definition_id;
        acc[`${key}__valueId`] = fieldValue.id;
        acc[`${key}__type`] = fieldValue.field?.field_type || "text";
      }
      return acc;
    }, {});

    return {
      id: lead.id,
      dealId: primaryDeal?.id,
      name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
      company: lead.company || "Individual",
      source: (lead.source || "DIRECT").toUpperCase(),
      status: lead.status || "NEW",
      value: Number(primaryDeal?.value || 0),
      ...customValues,
    };
  });
}

export async function updateWorkspaceLeadCell(row: any, colKey: string, value: string | number) {
  const supabase = createClient();

  if (colKey === "name") {
    const { firstName, lastName } = splitLeadName(String(value));
    const { error } = await supabase
      .from("leads")
      .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
    return;
  }

  if (["company", "source", "status"].includes(colKey)) {
    const { error } = await supabase
      .from("leads")
      .update({ [colKey]: value, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw error;
    return;
  }

  if (colKey === "value" && row.dealId) {
    const { error } = await supabase
      .from("deals")
      .update({ value: Number(value) || 0, updated_at: new Date().toISOString() })
      .eq("id", row.dealId);
    if (error) throw error;
    return;
  }

  const fieldId = row[`${colKey}__fieldId`];
  const valueId = row[`${colKey}__valueId`];
  if (fieldId) {
    const payload = {
      lead_id: row.id,
      definition_id: fieldId,
      value: String(value ?? ""),
    };

    const query = valueId
      ? supabase.from("custom_field_values").update({ value: payload.value }).eq("id", valueId).select().single()
      : supabase.from("custom_field_values").insert(payload).select().single();

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

export async function createWorkspaceCustomField(orgId: string, label: string, fieldType: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert({
      organization_id: orgId,
      field_name: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      field_label: label,
      field_type: fieldType,
      related_module: "leads",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function importWorkspaceLeads(orgId: string, leads: WorkspaceLeadInput[]) {
  const supabase = createClient();
  const createdRows = [];

  for (const lead of leads) {
    const { firstName, lastName } = splitLeadName(lead.name);
    const { data: createdLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        first_name: firstName,
        last_name: lastName,
        company: lead.company,
        source: lead.source,
        status: lead.status || "NEW",
      })
      .select()
      .single();

    if (leadError) throw leadError;

    const { data: createdDeal, error: dealError } = await supabase
      .from("deals")
      .insert({
        organization_id: orgId,
        lead_id: createdLead.id,
        title: `${lead.company || lead.name} Opportunity`,
        value: lead.value,
        stage: lead.status === "QUALIFIED" ? "PROPOSAL" : "NEW",
        probability: lead.status === "QUALIFIED" ? 60 : 20,
      })
      .select()
      .single();

    if (dealError) throw dealError;

    createdRows.push({
      id: createdLead.id,
      dealId: createdDeal.id,
      name: `${createdLead.first_name} ${createdLead.last_name}`,
      company: createdLead.company,
      source: createdLead.source,
      status: createdLead.status,
      value: Number(createdDeal.value || 0),
    });
  }

  return createdRows;
}

// ============================================
// PHASE 2: Lead Scores
// ============================================
export async function fetchLeadScores() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_scores")
    .select("*, lead:leads(id, first_name, last_name, company, source, status, estimated_value, email)")
    .order("score", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertLeadScore(leadId: string, score: number, factors: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_scores")
    .upsert({ lead_id: leadId, score, factors, updated_at: new Date().toISOString() }, { onConflict: "lead_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 2: Lead Enrichment
// ============================================
export async function fetchLeadEnrichment(leadId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_enrichment")
    .select("*")
    .eq("lead_id", leadId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // Ignore "no rows" error
  return data;
}

export async function upsertLeadEnrichment(leadId: string, enrichment: {
  website?: string; industry?: string; employee_count?: number;
  linkedin_url?: string; location?: string; tech_stack?: string[];
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lead_enrichment")
    .upsert({ lead_id: leadId, ...enrichment, updated_at: new Date().toISOString() }, { onConflict: "lead_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 2: AI Suggestions
// ============================================
export async function fetchAISuggestions(entityType: string, entityId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data || [];
}

export async function createAISuggestion(orgId: string, entityType: string, entityId: string, actionText: string, priority: string, context?: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_suggestions")
    .insert({ organization_id: orgId, entity_type: entityType, entity_id: entityId, action_text: actionText, priority, analyzed_context: context })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 2: Workflow Definitions & Runs
// ============================================
export async function fetchWorkflowDefinitions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_definitions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createWorkflowDefinition(orgId: string, name: string, triggerEvent: string, conditions: any[], actions: any[]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_definitions")
    .insert({ organization_id: orgId, name, trigger_event: triggerEvent, conditions, actions, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createWorkflowRun(workflowId: string, entityId: string, logs: any[]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert({ workflow_id: workflowId, trigger_entity_id: entityId, status: "COMPLETED", logs })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 2: Forecast Snapshots
// ============================================
export async function fetchForecasts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("forecast_snapshots")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createForecastSnapshot(orgId: string, month: string, predicted_revenue: number, confidence_score: number, risk_factors: any[] = [], assumptions: any[] = []) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("forecast_snapshots")
    .insert({ organization_id: orgId, month, predicted_revenue, confidence_score, risk_factors, assumptions })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 2: WhatsApp Conversations & Messages
// ============================================
export async function fetchWhatsAppConversations() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .select("*, messages:whatsapp_messages(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createWhatsAppConversation(orgId: string, leadId: string | null, contactName: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .insert({ organization_id: orgId, lead_id: leadId, contact_name: contactName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createWhatsAppMessage(conversationId: string, direction: "INBOUND" | "OUTBOUND", messageText: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .insert({ conversation_id: conversationId, direction, message_text: messageText })
    .select()
    .single();
  if (error) throw error;
  // Update conversation's last_message
  await supabase
    .from("whatsapp_conversations")
    .update({ last_message: messageText, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return data;
}

// ============================================
// PHASE 2: Contract Scores
// ============================================
export async function fetchContractScores() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contract_scores")
    .select("*, contract:contracts(id, contract_number, status, value)")
    .order("readiness_score", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertContractScore(contractId: string, readinessScore: number, factors: Record<string, any>, recommendations: any[]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contract_scores")
    .upsert({ contract_id: contractId, readiness_score: readinessScore, factors, recommendations, updated_at: new Date().toISOString() }, { onConflict: "contract_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 2: Deal Risk Scores
// ============================================
export async function fetchDealRiskScores() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deal_risk_scores")
    .select("*, deal:deals(id, title, value, stage)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertDealRiskScore(dealId: string, riskLevel: string, factors: any[], recommendations: any[]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deal_risk_scores")
    .upsert({ deal_id: dealId, risk_level: riskLevel, factors, recommendations, updated_at: new Date().toISOString() }, { onConflict: "deal_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 2: AI Interactions & Prompt Logs
// ============================================
export async function logAIInteraction(orgId: string, userId: string | null, query: string, response: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_interactions")
    .insert({ organization_id: orgId, user_id: userId, query, response })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function logPrompt(orgId: string, feature: string, prompt: string, completion: string, tokensUsed: number, model: string = "gpt-4o") {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prompt_logs")
    .insert({ organization_id: orgId, feature, prompt, completion, tokens_used: tokensUsed, model })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 3: AI Agents Registry
// ============================================
export async function fetchAIAgents() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*, tasks:agent_tasks(*)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertAIAgent(orgId: string, agentName: string, agentRole: string, systemInstructions: string, status: string = "ACTIVE") {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_agents")
    .upsert({ organization_id: orgId, agent_name: agentName, agent_role: agentRole, system_instructions: systemInstructions, status }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createAgentTask(agentId: string, description: string, entityType: string, entityId: string, logs: any[] = []) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_tasks")
    .insert({ agent_id: agentId, description, target_entity_type: entityType, target_entity_id: entityId, status: "COMPLETED", logs, completed_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 3: Agent Audit Logs
// ============================================
export async function fetchAgentAuditLogs() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function createAgentAuditLog(orgId: string, agentName: string, actionDescription: string, targetEntity: string, targetId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_audit_logs")
    .insert({ organization_id: orgId, agent_name: agentName, action_description: actionDescription, target_entity: targetEntity, target_id: targetId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 3: Executive Insights
// ============================================
export async function fetchExecutiveInsights() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("executive_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function createExecutiveInsight(orgId: string, insightText: string, impactLevel: string, category: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("executive_insights")
    .insert({ organization_id: orgId, insight_text: insightText, impact_level: impactLevel, category })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// PHASE 3: Customer Health & Churn
// ============================================
export async function fetchCustomerHealthScores() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_health_scores")
    .select("*, customer:customers(id, contact_name, company, lifetime_value)")
    .order("score", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertCustomerHealthScore(customerId: string, score: number, factors: Record<string, any>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_health_scores")
    .upsert({ customer_id: customerId, score, factors, updated_at: new Date().toISOString() }, { onConflict: "customer_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchChurnPredictions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("churn_predictions")
    .select("*, customer:customers(id, contact_name, company)")
    .order("probability", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================
// PHASE 3: Revenue Predictions
// ============================================
export async function fetchRevenuePredictions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("revenue_predictions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================
// PHASE 3: Proposal Versions & Analytics
// ============================================
export async function fetchProposalVersions(dealId?: string) {
  const supabase = createClient();
  let query = supabase.from("proposal_versions").select("*, analytics:proposal_analytics(*)").order("created_at", { ascending: false });
  if (dealId) query = query.eq("deal_id", dealId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createProposalVersion(dealId: string, versionNumber: number, pricingConfig: any, content: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposal_versions")
    .insert({ deal_id: dealId, version_number: versionNumber, pricing_config: pricingConfig, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================
// Helper: Get Organization ID
// ============================================
export async function getOrganizationId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.from("organizations").select("id").limit(1).single();
  return data?.id || "11111111-1111-1111-1111-111111111111";
}
