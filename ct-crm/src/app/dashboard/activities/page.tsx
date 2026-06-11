"use client";

import { useEffect, useState } from "react";
import { getActivities } from "@/server/activities";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import {
  Search, Filter, Clock, Target, DollarSign, FileText, CheckSquare,
  MessageSquare, Phone, Mail, TrendingUp, TrendingDown, Trophy, XCircle, Pencil
} from "lucide-react";

// ============================================
// Types & Constants
// ============================================
interface Activity {
  id: string;
  type: string;
  description: string;
  user_name: string;
  entity_type?: string;
  entity_name?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

const ACTIVITY_TYPES: Record<string, { label: string; emoji: string; color: string; icon: typeof Target }> = {
  lead_created: { label: "Lead Created", emoji: "🎯", color: "#3b82f6", icon: Target },
  lead_updated: { label: "Lead Updated", emoji: "✏️", color: "#f97316", icon: Pencil },
  deal_created: { label: "Deal Created", emoji: "💰", color: "#10b981", icon: DollarSign },
  deal_updated: { label: "Deal Updated", emoji: "📊", color: "#eab308", icon: TrendingUp },
  deal_won: { label: "Deal Won", emoji: "🎉", color: "#10b981", icon: Trophy },
  deal_lost: { label: "Deal Lost", emoji: "❌", color: "#ef4444", icon: XCircle },
  contract_signed: { label: "Contract Signed", emoji: "✍️", color: "#8b5cf6", icon: FileText },
  task_completed: { label: "Task Completed", emoji: "✅", color: "#10b981", icon: CheckSquare },
  note_added: { label: "Note Added", emoji: "📝", color: "#717478", icon: MessageSquare },
  call_logged: { label: "Call Logged", emoji: "📞", color: "#3b82f6", icon: Phone },
  email_sent: { label: "Email Sent", emoji: "✉️", color: "#f97316", icon: Mail },
};

// ============================================
// Fallback Demo Data
// ============================================
const now = Date.now();
const FALLBACK_ACTIVITIES: Activity[] = [
  { id: "a1", type: "deal_won", description: "Deal 'Acme Corp Enterprise License' marked as Won — ₹4,50,000", user_name: "Amit Kumar", entity_type: "deal", entity_name: "Acme Corp Enterprise License", created_at: new Date(now - 1800000).toISOString() },
  { id: "a2", type: "lead_created", description: "New lead 'Sanya Reddy' captured from Google Ads campaign.", user_name: "System", entity_type: "lead", entity_name: "Sanya Reddy", created_at: new Date(now - 3600000).toISOString() },
  { id: "a3", type: "task_completed", description: "Follow-up call with CloudSoft Technologies completed.", user_name: "Priya Sharma", entity_type: "task", entity_name: "CloudSoft Follow-up", created_at: new Date(now - 7200000).toISOString() },
  { id: "a4", type: "contract_signed", description: "Contract for TechStart annual subscription signed digitally.", user_name: "Rahul Verma", entity_type: "contract", entity_name: "TechStart Annual", created_at: new Date(now - 14400000).toISOString() },
  { id: "a5", type: "email_sent", description: "Pricing proposal email sent to DataFlow Inc.", user_name: "Priya Sharma", entity_type: "lead", entity_name: "DataFlow Inc", created_at: new Date(now - 28800000).toISOString() },
  { id: "a6", type: "deal_created", description: "New deal 'NovaTech Platform Migration' created — ₹1,50,000", user_name: "Amit Kumar", entity_type: "deal", entity_name: "NovaTech Migration", created_at: new Date(now - 43200000).toISOString() },
  { id: "a7", type: "call_logged", description: "Discovery call with Horizon Media — discussed requirements.", user_name: "Rahul Verma", entity_type: "lead", entity_name: "Horizon Media", created_at: new Date(now - 86400000).toISOString() },
  { id: "a8", type: "lead_updated", description: "Lead 'Vikram Singh' status changed from Interested to Qualified.", user_name: "Amit Kumar", entity_type: "lead", entity_name: "Vikram Singh", created_at: new Date(now - 90000000).toISOString() },
  { id: "a9", type: "note_added", description: "Added internal note on Acme Corp account health review.", user_name: "Priya Sharma", entity_type: "contact", entity_name: "Acme Corp", created_at: new Date(now - 100800000).toISOString() },
  { id: "a10", type: "deal_updated", description: "Deal 'CloudSoft Expansion' moved to Negotiation stage.", user_name: "Rahul Verma", entity_type: "deal", entity_name: "CloudSoft Expansion", created_at: new Date(now - 129600000).toISOString() },
  { id: "a11", type: "deal_lost", description: "Deal 'Vertex Solutions CRM' marked as Lost — competitor chosen.", user_name: "Amit Kumar", entity_type: "deal", entity_name: "Vertex Solutions CRM", created_at: new Date(now - 172800000).toISOString() },
  { id: "a12", type: "task_completed", description: "Quarterly business review presentation prepared.", user_name: "Priya Sharma", entity_type: "task", entity_name: "QBR Prep", created_at: new Date(now - 200000000).toISOString() },
  { id: "a13", type: "lead_created", description: "New lead 'Meera Iyer' from WhatsApp inquiry.", user_name: "System", entity_type: "lead", entity_name: "Meera Iyer", created_at: new Date(now - 259200000).toISOString() },
  { id: "a14", type: "email_sent", description: "Contract renewal notice sent to Global Systems.", user_name: "Rahul Verma", entity_type: "contract", entity_name: "Global Systems", created_at: new Date(now - 345600000).toISOString() },
  { id: "a15", type: "contract_signed", description: "Service agreement for BluePeak Industries executed.", user_name: "Amit Kumar", entity_type: "contract", entity_name: "BluePeak Industries", created_at: new Date(now - 432000000).toISOString() },
];

// ============================================
// Helpers
// ============================================
function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  if (d > weekAgo) return "This Week";
  return "Earlier";
}

// ============================================
// Component
// ============================================
export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>(FALLBACK_ACTIVITIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await getActivities();
      if (data && data.length > 0) setActivities(data);
    } catch {
      console.warn("Using offline fallback activities data.");
      setActivities(FALLBACK_ACTIVITIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, []);

  const filtered = activities.filter(a => {
    const matchSearch = a.description.toLowerCase().includes(search.toLowerCase()) || a.user_name?.toLowerCase().includes(search.toLowerCase()) || a.entity_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  // Group activities by date
  const groups: Record<string, Activity[]> = {};
  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];
  filtered.forEach(a => {
    const group = getDateGroup(a.created_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(a);
  });

  // Activity type stats
  const typeCounts: Record<string, number> = {};
  activities.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Activities</h1>
        <p className="text-sm text-muted-foreground mt-1">Chronological global activity logs across all CRM entities.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Activities", count: activities.length, color: "var(--graph-to)" },
          { label: "Today", count: activities.filter(a => getDateGroup(a.created_at) === "Today").length, color: "#3b82f6" },
          { label: "Deals Won", count: activities.filter(a => a.type === "deal_won").length, color: "#10b981" },
          { label: "Tasks Done", count: activities.filter(a => a.type === "task_completed").length, color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 border transition-all duration-200 hover:shadow-md" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-2 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input type="text" placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-9 pr-4 rounded-xl text-xs bg-transparent border placeholder:opacity-50"
            style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-xl text-xs border bg-transparent cursor-pointer"
          style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
          <option value="ALL">All Types</option>
          {Object.entries(ACTIVITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <WidgetWrapper loading><div /></WidgetWrapper>
      ) : filtered.length === 0 ? (
        <WidgetWrapper empty emptyTitle="No activities found" emptyDescription="Activity logs will appear here as events occur."><div /></WidgetWrapper>
      ) : (
        <div className="space-y-8">
          {groupOrder.filter(g => groups[g]?.length).map(group => (
            <div key={group}>
              {/* Date group header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--graph-to)" }}>{group}</span>
                <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
                <span className="text-[10px] font-bold text-muted-foreground">{groups[group].length} events</span>
              </div>

              {/* Timeline items */}
              <div className="relative ml-4 pl-6 space-y-0" style={{ borderLeft: `2px solid var(--card-border)` }}>
                {groups[group].map((activity, idx) => {
                  const config = ACTIVITY_TYPES[activity.type] || { label: activity.type, emoji: "📌", color: "#717478", icon: Clock };
                  const IconComponent = config.icon;
                  return (
                    <div key={activity.id} className="relative pb-5 last:pb-0 group">
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-[31px] top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-200 group-hover:scale-125"
                        style={{ background: "var(--card-bg-solid)", borderColor: config.color }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                      </div>

                      {/* Activity card */}
                      <div
                        className="rounded-xl p-4 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: config.color + "15" }}>
                            <IconComponent size={14} style={{ color: config.color }} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide" style={{ background: config.color + "20", color: config.color }}>
                                {config.label}
                              </span>
                              {activity.entity_name && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>
                                  {activity.entity_name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-1.5" style={{ color: "var(--text-color)" }}>{activity.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] text-muted-foreground font-semibold">{activity.user_name}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock size={9} /> {getRelativeTime(activity.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Emoji */}
                          <span className="text-lg shrink-0">{config.emoji}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
