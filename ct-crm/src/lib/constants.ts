// ============================================
// CT-CRM — Route Definitions & Constants
// ============================================

// --- Sidebar Navigation Routes ---
export const SIDEBAR_ROUTES = [
  { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboardIcon", description: "Core Terminal" },
  { path: "/dashboard/calendar", label: "Calendar", icon: "CalendarIcon", description: "Reminders & Follow-ups" },
  { path: "/dashboard/leads", label: "Leads", icon: "UsersIcon", description: "Intake Management" },
  { path: "/dashboard/prospects", label: "Prospects", icon: "TargetIcon", description: "BANT Qualification" },
  { path: "/dashboard/deals", label: "Deals", icon: "HandshakeIcon", description: "Pipeline Boards" },
  { path: "/dashboard/contracts", label: "Contracts", icon: "FileTextIcon", description: "Storage & Tracking" },
  { path: "/dashboard/customers", label: "Customers", icon: "BuildingIcon", description: "Retainer Panel" },
  { path: "/dashboard/contacts", label: "Contacts", icon: "ContactIcon", description: "Contact Profiles" },
  { path: "/dashboard/tasks", label: "Tasks", icon: "CheckSquareIcon", description: "Schedules Tracker" },
  { path: "/dashboard/activities", label: "Activities", icon: "ActivityIcon", description: "Activity Logs" },
  { path: "/dashboard/analytics", label: "Analytics", icon: "BarChartIcon", description: "Reports & Analytics" },
  { path: "/dashboard/team", label: "Team", icon: "UsersIcon", description: "Team & Roles" },
  { path: "/dashboard/settings", label: "Settings", icon: "SettingsIcon", description: "Configuration", adminOnly: true },
] as const;

// --- Lead Status Config ---
export const LEAD_STATUSES = {
  new: { label: "New", color: "#3b82f6" },
  contacted: { label: "Contacted", color: "#f97316" },
  interested: { label: "Interested", color: "#eab308" },
  qualified: { label: "Qualified", color: "#10b981" },
  lost: { label: "Lost", color: "#ef4444" },
} as const;

// --- Lead Sources ---
export const LEAD_SOURCES = {
  google: { label: "Google", color: "#4285f4" },
  meta: { label: "Meta", color: "#1877f2" },
  referral: { label: "Referral", color: "#10b981" },
  direct: { label: "Direct", color: "#8b5cf6" },
  whatsapp: { label: "WhatsApp", color: "#25d366" },
  other: { label: "Other", color: "#717478" },
} as const;

// --- Deal Pipeline Stages ---
export const DEAL_STAGES = {
  new: { label: "New", color: "#3b82f6", probability: 10 },
  proposal: { label: "Proposal", color: "#f97316", probability: 30 },
  negotiation: { label: "Negotiation", color: "#eab308", probability: 60 },
  contract: { label: "Contract", color: "#8b5cf6", probability: 80 },
  won: { label: "Won", color: "#10b981", probability: 100 },
  lost: { label: "Lost", color: "#ef4444", probability: 0 },
} as const;

// --- Deal Types (Zoho "Type" picklist) ---
export const DEAL_TYPES = [
  "New Business",
  "Existing Business - Upsell",
  "Existing Business - Renewal",
  "Existing Business - Replacement",
] as const;

// --- Deal Contact Roles (Zoho "Contact Role") ---
export const CONTACT_ROLES = [
  "Decision Maker",
  "Influencer",
  "Champion",
  "Evaluator",
  "End User",
  "Other",
] as const;

// --- Contract Statuses ---
export const CONTRACT_STATUSES = {
  draft: { label: "Draft", color: "#717478" },
  sent: { label: "Sent", color: "#3b82f6" },
  signed: { label: "Signed", color: "#10b981" },
  expired: { label: "Expired", color: "#ef4444" },
} as const;

// --- Task Types ---
export const TASK_TYPES = {
  call: { label: "Call", emoji: "📞" },
  meeting: { label: "Meeting", emoji: "📅" },
  email: { label: "Email", emoji: "✉️" },
  follow_up: { label: "Follow Up", emoji: "🔄" },
  other: { label: "Other", emoji: "📋" },
} as const;

// --- Task Priorities ---
export const TASK_PRIORITIES = {
  low: { label: "Low", color: "#717478" },
  medium: { label: "Medium", color: "#3b82f6" },
  high: { label: "High", color: "#f97316" },
  urgent: { label: "Urgent", color: "#ef4444" },
} as const;

// --- Activity Types ---
export const ACTIVITY_TYPES = {
  lead_created: { label: "Lead Created", emoji: "🎯", color: "#3b82f6" },
  lead_updated: { label: "Lead Updated", emoji: "✏️", color: "#f97316" },
  deal_created: { label: "Deal Created", emoji: "💰", color: "#10b981" },
  deal_updated: { label: "Deal Updated", emoji: "📊", color: "#eab308" },
  deal_won: { label: "Deal Won", emoji: "🎉", color: "#10b981" },
  deal_lost: { label: "Deal Lost", emoji: "❌", color: "#ef4444" },
  contract_signed: { label: "Contract Signed", emoji: "✍️", color: "#8b5cf6" },
  task_completed: { label: "Task Completed", emoji: "✅", color: "#10b981" },
  note_added: { label: "Note Added", emoji: "📝", color: "#717478" },
  call_logged: { label: "Call Logged", emoji: "📞", color: "#3b82f6" },
  email_sent: { label: "Email Sent", emoji: "✉️", color: "#f97316" },
} as const;

// --- Currency Formatter ---
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

// --- Compact Number Formatter ---
export function formatCompact(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

// --- Percentage Formatter ---
export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// --- Date Formatter ---
export function formatRelativeDate(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
