// ============================================
// CT-CRM — Core TypeScript Interfaces
// ============================================

// --- Base Entity ---
export interface BaseEntity {
  id: string;
  org_id: string;
  created_at: string;
  updated_at?: string;
}

// --- User & Organization ---
export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  owner_id: string;
}

export interface Profile extends BaseEntity {
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: "admin" | "manager" | "rep";
  avatar_url?: string;
}

// --- Leads ---
export type LeadStatus = "new" | "contacted" | "interested" | "qualified" | "lost";
export type LeadSource = "google" | "meta" | "referral" | "direct" | "whatsapp" | "other";

export interface Lead extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_to?: string;
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

// --- Contacts ---
export interface Contact extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  tags?: string[];
}

// --- Prospects (BANT) ---
export type ProspectStatus = "pending" | "qualified" | "disqualified";

export interface Prospect extends BaseEntity {
  lead_id: string;
  budget: number | null;
  authority: boolean;
  need: string;
  timeline: string;
  status: ProspectStatus;
  score?: number;
}

// --- Deals ---
export type DealStage = "new" | "proposal" | "negotiation" | "contract" | "won" | "lost";

export interface Deal extends BaseEntity {
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  owner_id: string;
  contact_id?: string;
  company?: string;
  close_date?: string;
  notes?: string;
}

// --- Contracts ---
export type ContractStatus = "draft" | "sent" | "signed" | "expired";

export interface Contract extends BaseEntity {
  deal_id?: string;
  title: string;
  status: ContractStatus;
  value: number;
  signed_at?: string;
  expires_at?: string;
  document_url?: string;
}

// --- Customers ---
export interface Customer extends BaseEntity {
  contact_id: string;
  contract_id?: string;
  company: string;
  lifetime_value: number;
  since: string;
}

// --- Tasks ---
export type TaskType = "call" | "meeting" | "email" | "follow_up" | "other";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  assigned_to: string;
  entity_type?: "lead" | "deal" | "contact" | "contract";
  entity_id?: string;
}

// --- Activities ---
export type ActivityType =
  | "lead_created"
  | "lead_updated"
  | "deal_created"
  | "deal_updated"
  | "deal_won"
  | "deal_lost"
  | "contract_signed"
  | "task_completed"
  | "note_added"
  | "call_logged"
  | "email_sent";

export interface Activity extends BaseEntity {
  type: ActivityType;
  description: string;
  user_id: string;
  user_name?: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  metadata?: Record<string, unknown>;
}

// --- Dashboard ---
export interface DashboardLayout {
  id: string;
  user_id: string;
  layout_config: WidgetConfig[];
}

export interface WidgetConfig {
  id: string;
  visible: boolean;
  order: number;
  size?: "sm" | "md" | "lg" | "full";
}

// --- KPI ---
export interface KPIMetric {
  label: string;
  value: number | string;
  previousValue?: number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  format?: "currency" | "number" | "percent";
  sparklineData?: number[];
  icon?: string;
}

// --- Pipeline ---
export interface PipelineStage {
  name: string;
  count: number;
  value: number;
  conversionRate?: number;
  dropoffRate?: number;
}
