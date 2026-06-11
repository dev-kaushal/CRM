import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "SALES_MANAGER",
  "SALES_REP",
  "VIEWER",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "QUALIFIED",
  "REJECTED",
]);

export const dealStageEnum = pgEnum("deal_stage", [
  "NEW",
  "PROPOSAL",
  "NEGOTIATION",
  "CONTRACT",
  "WON",
  "LOST",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "DRAFT",
  "SENT",
  "SIGNED",
  "EXPIRED",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const fieldTypeEnum = pgEnum("field_type", [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
]);

// ---------------------------------------------------------------------------
// Core CRM tables
// ---------------------------------------------------------------------------
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry"),
  website: text("website"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").default("SALES_REP"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  status: text("status").default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  source: text("source").default("DIRECT"),
  status: leadStatusEnum("status").default("NEW"),
  ownerId: uuid("owner_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  estimatedValue: numeric("estimated_value").default("0"),
  website: text("website"),
  linkedin: text("linkedin"),
  city: text("city"),
  country: text("country").default("India"),
  industry: text("industry"),
  employeeCount: text("employee_count"),
  priority: text("priority").default("medium"),
  starred: boolean("starred").default(false),
  tags: text("tags").array().default([]),
});

export const prospects = pgTable("prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id),
  budget: numeric("budget"),
  authority: boolean("authority").default(false),
  need: text("need"),
  timeline: text("timeline"),
  qualifiedBy: uuid("qualified_by").references(() => users.id),
  qualifiedAt: timestamp("qualified_at", { withTimezone: true }).defaultNow(),
  status: text("status").default("QUALIFIED"),
  source: text("source").default("DIRECT"),
  industry: text("industry"),
  city: text("city"),
  notes: text("notes"),
  starred: boolean("starred").default(false),
  tags: text("tags").array().default([]),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  prospectId: uuid("prospect_id").references(() => prospects.id),
  title: text("title").notNull(),
  value: numeric("value").notNull().default("0"),
  stage: dealStageEnum("stage").default("NEW"),
  probability: integer("probability").default(10),
  ownerId: uuid("owner_id").references(() => users.id),
  expectedCloseDate: timestamp("expected_close_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  companyName: text("company_name"),
  notes: text("notes"),
  starred: boolean("starred").default(false),
  tags: text("tags").array().default([]),
});

export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  contractNumber: text("contract_number").notNull().unique(),
  status: contractStatusEnum("status").default("DRAFT"),
  value: numeric("value").default("0"),
  fileUrl: text("file_url"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  company: text("company").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  lifetimeValue: numeric("lifetime_value").default("0"),
  customerSince: timestamp("customer_since", { withTimezone: true }).defaultNow(),
  status: text("status").default("ACTIVE"),
  phone: text("phone"),
  totalDeals: integer("total_deals").default(0),
  totalInteractions: integer("total_interactions").default(0),
  healthScore: integer("health_score").default(80),
  contractStatus: text("contract_status").default("DRAFT"),
  contractTitle: text("contract_title"),
  contractValue: numeric("contract_value").default("0"),
  industry: text("industry"),
  city: text("city"),
  notes: text("notes"),
  starred: boolean("starred").default(false),
  tags: text("tags").array().default([]),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  priority: taskPriorityEnum("priority").default("MEDIUM"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  relatedType: text("related_type").notNull(),
  relatedId: uuid("related_id").notNull(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  content: text("content").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  relatedType: text("related_type").notNull(),
  relatedId: uuid("related_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  type: text("type").notNull(),
  userId: uuid("user_id").references(() => users.id),
  userName: text("user_name"),
  relatedType: text("related_type").notNull(),
  relatedId: uuid("related_id").notNull(),
  entityName: text("entity_name"),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  department: text("department"),
  status: text("status").default("ACTIVE"),
  lifetimeValue: numeric("lifetime_value").default("0"),
  customerSince: timestamp("customer_since", { withTimezone: true }).defaultNow(),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  industry: text("industry"),
  city: text("city"),
  country: text("country").default("India"),
  notes: text("notes"),
  starred: boolean("starred").default(false),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Notes (per-entity) + Reminders
// ---------------------------------------------------------------------------
export const leadNotes = pgTable("lead_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  text: text("text").notNull(),
  author: text("author").default("You"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const contactNotes = pgTable("contact_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  text: text("text").notNull(),
  author: text("author").default("You"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const prospectNotes = pgTable("prospect_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  prospectId: uuid("prospect_id")
    .notNull()
    .references(() => prospects.id),
  text: text("text").notNull(),
  author: text("author").default("You"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const customerNotes = pgTable("customer_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  text: text("text").notNull(),
  author: text("author").default("You"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  entityName: text("entity_name"),
  title: text("title").notNull(),
  type: text("type").notNull().default("call"),
  datetime: timestamp("datetime", { withTimezone: true }).notNull(),
  note: text("note"),
  done: boolean("done").default(false),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Custom fields & dashboard layout
// ---------------------------------------------------------------------------
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  fieldName: text("field_name").notNull(),
  fieldLabel: text("field_label").notNull(),
  fieldType: fieldTypeEnum("field_type").default("TEXT"),
  relatedModule: text("related_module").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const customFieldValues = pgTable("custom_field_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  definitionId: uuid("definition_id")
    .notNull()
    .references(() => customFieldDefinitions.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  value: text("value").notNull(),
});

export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  layoutConfig: jsonb("layout_config").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// AI / Phase 2-3 tables
// ---------------------------------------------------------------------------
export const leadScores = pgTable("lead_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id),
  score: integer("score").notNull(),
  factors: jsonb("factors").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const leadEnrichment = pgTable("lead_enrichment", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id),
  website: text("website"),
  industry: text("industry"),
  employeeCount: integer("employee_count"),
  linkedinUrl: text("linkedin_url"),
  location: text("location"),
  techStack: jsonb("tech_stack").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  actionText: text("action_text").notNull(),
  priority: text("priority").default("MEDIUM"),
  analyzedContext: text("analyzed_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const meetingTranscripts = pgTable("meeting_transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  source: text("source").notNull(),
  transcript: jsonb("transcript").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const meetingSummaries = pgTable("meeting_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  transcriptId: uuid("transcript_id")
    .notNull()
    .unique()
    .references(() => meetingTranscripts.id),
  summary: text("summary").notNull(),
  decisions: jsonb("decisions").default([]),
  actionItems: jsonb("action_items").default([]),
  risks: jsonb("risks").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  conditions: jsonb("conditions").default([]),
  actions: jsonb("actions").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflowDefinitions.id),
  triggerEntityId: uuid("trigger_entity_id").notNull(),
  status: text("status").default("COMPLETED"),
  logs: jsonb("logs").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const forecastSnapshots = pgTable("forecast_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  month: text("month").notNull(),
  predictedRevenue: numeric("predicted_revenue").notNull(),
  confidenceScore: integer("confidence_score").default(80),
  riskFactors: jsonb("risk_factors").default([]),
  assumptions: jsonb("assumptions").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  leadId: uuid("lead_id").references(() => leads.id),
  contactName: text("contact_name"),
  lastMessage: text("last_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => whatsappConversations.id),
  direction: text("direction").notNull(),
  messageText: text("message_text"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const contractScores = pgTable("contract_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id")
    .notNull()
    .unique()
    .references(() => contracts.id),
  readinessScore: integer("readiness_score").notNull(),
  factors: jsonb("factors").default({}),
  recommendations: jsonb("recommendations").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const dealRiskScores = pgTable("deal_risk_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .unique()
    .references(() => deals.id),
  riskLevel: text("risk_level").default("MEDIUM"),
  factors: jsonb("factors").default([]),
  recommendations: jsonb("recommendations").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const aiInteractions = pgTable("ai_interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  query: text("query").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const promptLogs = pgTable("prompt_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  feature: text("feature").notNull(),
  prompt: text("prompt").notNull(),
  completion: text("completion").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  model: text("model").default("gpt-4o"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const aiAgents = pgTable("ai_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  agentName: text("agent_name").notNull(),
  agentRole: text("agent_role").notNull(),
  systemInstructions: text("system_instructions").notNull(),
  status: text("status").default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const agentTasks = pgTable("agent_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => aiAgents.id),
  description: text("description").notNull(),
  status: text("status").default("PENDING"),
  targetEntityType: text("target_entity_type").notNull(),
  targetEntityId: uuid("target_entity_id").notNull(),
  logs: jsonb("logs").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const agentMemories = pgTable("agent_memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  memoryContent: text("memory_content").notNull(),
  semanticTokens: integer("semantic_tokens").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const agentConversations = pgTable("agent_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  sessionId: uuid("session_id").notNull(),
  senderAgentId: uuid("sender_agent_id").references(() => aiAgents.id),
  receiverAgentId: uuid("receiver_agent_id").references(() => aiAgents.id),
  messageContent: text("message_content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const proposalVersions = pgTable("proposal_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  versionNumber: integer("version_number").notNull(),
  pricingConfig: jsonb("pricing_config").notNull().default({}),
  content: text("content").notNull(),
  approvalStatus: text("approval_status").default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const proposalAnalytics = pgTable("proposal_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id")
    .notNull()
    .references(() => proposalVersions.id),
  eventType: text("event_type").notNull(),
  ipAddress: text("ip_address"),
  viewDuration: integer("view_duration").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const meetingIntelligence = pgTable("meeting_intelligence", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id").notNull().unique(),
  talkingPoints: jsonb("talking_points").default([]),
  objectionsDetected: jsonb("objections_detected").default([]),
  risksFlagged: jsonb("risks_flagged").default([]),
  competitorsMentioned: jsonb("competitors_mentioned").default([]),
  actionRecommendations: jsonb("action_recommendations").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const knowledgeEmbeddings = pgTable("knowledge_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  chunkText: text("chunk_text").notNull(),
  embeddingVector: jsonb("embedding_vector"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const customerHealthScores = pgTable("customer_health_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id),
  score: integer("score").notNull(),
  factors: jsonb("factors").default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const churnPredictions = pgTable("churn_predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id),
  riskLevel: text("risk_level").default("LOW"),
  probability: integer("probability").notNull(),
  factors: jsonb("factors").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const revenuePredictions = pgTable("revenue_predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  targetMonth: text("target_month").notNull(),
  predictedValue: numeric("predicted_value").notNull(),
  confidencePercentage: integer("confidence_percentage").default(80),
  factors: jsonb("factors").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const agentWorkflows = pgTable("agent_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  workflowName: text("workflow_name").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  aiRoutingPipeline: jsonb("ai_routing_pipeline").notNull().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const executiveInsights = pgTable("executive_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  insightText: text("insight_text").notNull(),
  impactLevel: text("impact_level").default("MEDIUM"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const agentAuditLogs = pgTable("agent_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  agentName: text("agent_name").notNull(),
  actionDescription: text("action_description").notNull(),
  targetEntity: text("target_entity").notNull(),
  targetId: uuid("target_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
