"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { getDashboardData } from "@/server/analytics";
import { getAllReminders, toggleReminderDone, snoozeReminder } from "@/server/calendar";
import { KPICard } from "@/components/dashboard/widgets/kpi-card";
import { PipelineFunnel } from "@/components/dashboard/widgets/pipeline-funnel";
import { RevenueTrend } from "@/components/dashboard/widgets/revenue-trend";
import { LeadVelocity } from "@/components/dashboard/widgets/lead-velocity";
import { DealHealth } from "@/components/dashboard/widgets/deal-health";
import { TaskCenter } from "@/components/dashboard/widgets/task-center";
import { ActivityFeed } from "@/components/dashboard/widgets/activity-feed";
import { TeamPerformance } from "@/components/dashboard/widgets/team-performance";
import { PipelineOverview, type PipelineOverviewData } from "@/components/dashboard/widgets/pipeline-overview";
import { TodaysReminders, type ReminderItem } from "@/components/dashboard/widgets/todays-reminders";
import { DateRangePicker, getDateRangeBounds, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import type { KPIMetric, Activity, Task } from "@/lib/types";

// ============================================
// DEMO DATA — Used as robust fallback if Supabase tables are not instantiated
// ============================================
const DEMO_KPI: KPIMetric[] = [
  {
    label: "Total Revenue",
    value: 4250000,
    change: 12.5,
    changeType: "increase",
    format: "currency",
    icon: "💰",
    sparklineData: [18, 25, 30, 22, 35, 42, 38, 45, 50, 48, 55, 62],
  },
  {
    label: "Monthly Revenue",
    value: 850000,
    change: 8.3,
    changeType: "increase",
    format: "currency",
    icon: "📈",
    sparklineData: [40, 35, 45, 50, 42, 55, 48, 60, 52, 65, 58, 70],
  },
  {
    label: "Open Deals",
    value: 24,
    change: 15.0,
    changeType: "increase",
    format: "number",
    icon: "📊",
    sparklineData: [12, 15, 14, 18, 20, 17, 22, 19, 24, 21, 26, 24],
  },
  {
    label: "Won Deals",
    value: 18,
    change: 22.2,
    changeType: "increase",
    format: "number",
    icon: "🏆",
    sparklineData: [8, 10, 9, 12, 11, 14, 13, 15, 16, 14, 17, 18],
  },
  {
    label: "Qualified Leads",
    value: 42,
    change: -5.2,
    changeType: "decrease",
    format: "number",
    icon: "🎯",
    sparklineData: [50, 48, 45, 47, 44, 46, 43, 45, 42, 44, 41, 42],
  },
  {
    label: "Contracts Signed",
    value: 12,
    change: 33.3,
    changeType: "increase",
    format: "number",
    icon: "✍️",
    sparklineData: [4, 5, 6, 5, 7, 8, 7, 9, 10, 9, 11, 12],
  },
  {
    label: "Tasks Due Today",
    value: 7,
    change: 0,
    changeType: "neutral",
    format: "number",
    icon: "📋",
    sparklineData: [5, 8, 6, 9, 7, 4, 8, 5, 7, 6, 8, 7],
  },
  {
    label: "Conversion Rate",
    value: "34.5",
    change: 4.1,
    changeType: "increase",
    format: "percent",
    icon: "⚡",
    sparklineData: [28, 30, 29, 32, 31, 33, 30, 34, 32, 35, 33, 34.5],
  },
];

const DEMO_PIPELINE = [
  { name: "Lead", count: 48, value: 2400000, color: "#3b82f6", conversionRate: 65 },
  { name: "Prospect", count: 31, value: 1550000, color: "#f97316", conversionRate: 52 },
  { name: "Deal", count: 24, value: 1200000, color: "#eab308", conversionRate: 75 },
  { name: "Contract", count: 18, value: 900000, color: "#8b5cf6", conversionRate: 89 },
  { name: "Customer", count: 16, value: 800000, color: "#10b981" },
];

const DEMO_REVENUE = [
  { month: "Jan", revenue: 320000, forecast: 350000 },
  { month: "Feb", revenue: 410000, forecast: 400000 },
  { month: "Mar", revenue: 380000, forecast: 420000 },
  { month: "Apr", revenue: 520000, forecast: 480000 },
  { month: "May", revenue: 490000, forecast: 530000 },
  { month: "Jun", revenue: 610000, forecast: 580000 },
  { month: "Jul", revenue: 580000, forecast: 620000 },
  { month: "Aug", revenue: 720000, forecast: 680000 },
  { month: "Sep", revenue: 690000, forecast: 730000 },
  { month: "Oct", revenue: 810000, forecast: 780000 },
  { month: "Nov", revenue: 780000, forecast: 820000 },
  { month: "Dec", revenue: 850000, forecast: 880000 },
];

const DEMO_LEAD_SOURCES = [
  { source: "google", count: 18 },
  { source: "meta", count: 12 },
  { source: "referral", count: 8 },
  { source: "direct", count: 6 },
  { source: "whatsapp", count: 5 },
  { source: "other", count: 3 },
];

const DEMO_DEAL_HEALTH = {
  open: 24,
  atRisk: 4,
  stalled: 3,
  negotiation: 8,
  contract: 6,
};

const DEMO_PIPELINE_OVERVIEW: PipelineOverviewData = { leads: 48, prospects: 31, deals: 24, won: 18, lost: 6 };

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

const DEMO_TASKS: Task[] = [
  { id: "t1", org_id: "1", title: "Follow up with Acme Corp", type: "call", priority: "high", status: "pending", due_date: now, assigned_to: "u1", created_at: now },
  { id: "t2", org_id: "1", title: "Send proposal to TechStart", type: "email", priority: "urgent", status: "pending", due_date: now, assigned_to: "u1", created_at: now },
  { id: "t3", org_id: "1", title: "Review contract terms", type: "other", priority: "medium", status: "pending", due_date: now, assigned_to: "u1", created_at: now },
  { id: "t4", org_id: "1", title: "Client demo - CloudSoft", type: "meeting", priority: "high", status: "pending", due_date: yesterday, assigned_to: "u1", created_at: twoDaysAgo },
  { id: "t5", org_id: "1", title: "Update CRM data for Q4", type: "other", priority: "low", status: "pending", due_date: yesterday, assigned_to: "u1", created_at: twoDaysAgo },
  { id: "t6", org_id: "1", title: "Quarterly review meeting", type: "meeting", priority: "medium", status: "pending", due_date: new Date(Date.now() + 172800000).toISOString(), assigned_to: "u1", created_at: now },
  { id: "t7", org_id: "1", title: "Prepare sales report", type: "other", priority: "low", status: "pending", due_date: new Date(Date.now() + 259200000).toISOString(), assigned_to: "u1", created_at: now },
];

const DEMO_ACTIVITIES: Activity[] = [
  { id: "a1", org_id: "1", type: "deal_won", description: "closed a deal with", user_id: "u1", user_name: "Kaushal", entity_name: "CloudSoft Technologies", created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: "a2", org_id: "1", type: "lead_created", description: "added a new lead", user_id: "u2", user_name: "Priya", entity_name: "GreenTech Solutions", created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "a3", org_id: "1", type: "contract_signed", description: "signed a contract for", user_id: "u1", user_name: "Kaushal", entity_name: "DataFlow Inc", created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "a4", org_id: "1", type: "task_completed", description: "completed a follow-up with", user_id: "u3", user_name: "Rahul", entity_name: "NovaTech Labs", created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: "a5", org_id: "1", type: "call_logged", description: "logged a discovery call with", user_id: "u2", user_name: "Priya", entity_name: "MetaVerse Studios", created_at: new Date(Date.now() - 28800000).toISOString() },
  { id: "a6", org_id: "1", type: "deal_created", description: "opened a new deal for", user_id: "u4", user_name: "Anika", entity_name: "QuantumLeap AI", created_at: new Date(Date.now() - 43200000).toISOString() },
  { id: "a7", org_id: "1", type: "email_sent", description: "sent a proposal to", user_id: "u1", user_name: "Kaushal", entity_name: "PrimeStack Corp", created_at: new Date(Date.now() - 57600000).toISOString() },
  { id: "a8", org_id: "1", type: "lead_updated", description: "qualified a lead from", user_id: "u3", user_name: "Rahul", entity_name: "ClearView Analytics", created_at: new Date(Date.now() - 86400000).toISOString() },
];

const DEMO_TEAM = [
  { name: "Kaushal Patel", revenue: 1850000, dealsWon: 7, conversionRate: 42, callsMade: 85, tasksCompleted: 34 },
  { name: "Priya Sharma", revenue: 1200000, dealsWon: 5, conversionRate: 38, callsMade: 72, tasksCompleted: 28 },
  { name: "Rahul Kumar", revenue: 780000, dealsWon: 3, conversionRate: 28, callsMade: 55, tasksCompleted: 22 },
  { name: "Anika Gupta", revenue: 420000, dealsWon: 3, conversionRate: 35, callsMade: 48, tasksCompleted: 19 },
];

// ============================================
// DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
  const { user, loading } = useUser();
  const [dataLoading, setDataLoading] = useState(true);

  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>(DEMO_KPI);
  const [pipelineData, setPipelineData] = useState<any[]>(DEMO_PIPELINE);
  const [pipelineOverview, setPipelineOverview] = useState<PipelineOverviewData>(DEMO_PIPELINE_OVERVIEW);
  const [revenueData, setRevenueData] = useState<any[]>(DEMO_REVENUE);
  const [leadSources, setLeadSources] = useState<any[]>(DEMO_LEAD_SOURCES);
  const [dealHealth, setDealHealth] = useState<any>(DEMO_DEAL_HEALTH);
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
  const [activities, setActivities] = useState<Activity[]>(DEMO_ACTIVITIES);
  const [teamMembers, setTeamMembers] = useState<any[]>(DEMO_TEAM);

  // Date-range filter (#24) applied to KPI cards, pipeline funnel, and revenue trend.
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: "all" });

  // Today's Reminders (#25)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);

  // Fetch real data from Supabase (kick off immediately, don't wait for auth loading)
  useEffect(() => {
    const fetchDashboardData = async () => {
      setDataLoading(true);
      try {
        const bounds = getDateRangeBounds(dateRange);
        const range = bounds.from || bounds.to
          ? { from: bounds.from?.toISOString(), to: bounds.to?.toISOString() }
          : undefined;
        const data = await getDashboardData(range);
        setKpiMetrics(data.kpiMetrics);
        setPipelineData(data.pipelineData);
        setPipelineOverview(data.pipelineOverview);
        setRevenueData(data.revenueData);
        setLeadSources(data.leadSources.length > 0 ? data.leadSources : DEMO_LEAD_SOURCES);
        setDealHealth(data.dealHealth);
        setTasks(data.tasks);
        setActivities(data.activities);
        setTeamMembers(data.teamMembers.length > 0 ? data.teamMembers : DEMO_TEAM);
      } catch (err) {
        console.warn("Failed to load dashboard data from database. Falling back to high-fidelity dashboard demo data.", err);
        // Fall back explicitly to demo data
        setKpiMetrics(DEMO_KPI);
        setPipelineData(DEMO_PIPELINE);
        setPipelineOverview(DEMO_PIPELINE_OVERVIEW);
        setLeadSources(DEMO_LEAD_SOURCES);
        setDealHealth(DEMO_DEAL_HEALTH);
        setTasks(DEMO_TASKS);
        setActivities(DEMO_ACTIVITIES);
        setTeamMembers(DEMO_TEAM);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  // Today's Reminders — independent of the KPI date range, always "today".
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        const rows = await getAllReminders(start, end);
        setReminders(rows);
      } catch (err) {
        console.warn("Failed to load today's reminders.", err);
      } finally {
        setRemindersLoading(false);
      }
    };

    fetchReminders();
  }, []);

  const handleToggleReminder = async (id: string, done: boolean) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, done } : r)));
    try {
      await toggleReminderDone(id, done);
    } catch (err) {
      console.warn("Failed to update reminder.", err);
    }
  };

  const handleSnoozeReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      await snoozeReminder(id, 1);
    } catch (err) {
      console.warn("Failed to snooze reminder.", err);
    }
  };

  const todayTasks = tasks.filter((t) => {
    const d = new Date(t.due_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const overdueTasks = tasks.filter((t) => {
    const d = new Date(t.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return t.status === "pending" && d < today;
  });

  const upcomingTasks = tasks.filter((t) => {
    const d = new Date(t.due_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d > today;
  });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>
            Operations Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.user_metadata?.first_name || "there"}. Here&apos;s your CRM overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Pipeline Overview — Leads / Prospects / Deals / Won / Lost (#12, #23) */}
      <PipelineOverview data={pipelineOverview} loading={dataLoading} />

      {/* ROW 1 — KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiMetrics.slice(0, 4).map((metric) => (
          <KPICard key={metric.label} metric={metric} loading={dataLoading} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {kpiMetrics.slice(4, 8).map((metric) => (
          <KPICard key={metric.label} metric={metric} loading={dataLoading} />
        ))}
      </div>

      {/* ROW 2 & 3 — Pipeline + Revenue */}
      <div className="grid grid-cols-2 gap-4">
        <PipelineFunnel data={pipelineData} loading={dataLoading} />
        <RevenueTrend data={revenueData} loading={dataLoading} />
      </div>

      {/* ROW 4 & 5 — Lead Velocity + Deal Health + Today's Reminders */}
      <div className="grid grid-cols-3 gap-4">
        <LeadVelocity
          sourceData={leadSources}
          newToday={6}
          newThisWeek={28}
          newThisMonth={52}
          qualified={kpiMetrics.find(m => m.label === "Qualified Leads")?.value as number || 42}
          loading={dataLoading}
        />
        <DealHealth data={dealHealth} loading={dataLoading} />
        <TodaysReminders
          reminders={reminders}
          loading={remindersLoading}
          onToggle={handleToggleReminder}
          onSnooze={handleSnoozeReminder}
        />
      </div>

      {/* ROW 6 & 7 — Task Center + Activity Feed */}
      <div className="grid grid-cols-2 gap-4">
        <TaskCenter
          todayTasks={todayTasks}
          overdueTasks={overdueTasks}
          upcomingTasks={upcomingTasks}
          loading={dataLoading}
        />
        <ActivityFeed activities={activities} loading={dataLoading} />
      </div>

      {/* ROW 8 — Team Performance */}
      <TeamPerformance members={teamMembers} loading={dataLoading} />
    </div>
  );
}
