"use client";

import { useEffect, useState } from "react";
import { getTasks, createTask, updateTaskStatus } from "@/server/tasks";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import {
  Search, Plus, List, LayoutGrid, Calendar as CalendarIcon,
  Clock, CheckCircle2, Circle, XCircle, AlertTriangle,
  Phone, Mail, Users, RotateCcw, MoreHorizontal, ChevronLeft, ChevronRight, Clipboard
} from "lucide-react";

// ============================================
// Types
// ============================================
interface Task {
  id: string;
  title: string;
  description: string;
  type: "call" | "meeting" | "email" | "follow_up" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  due_date: string;
  assigned_to: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

// ============================================
// Constants
// ============================================
const TASK_TYPES: Record<string, { label: string; emoji: string }> = {
  call: { label: "Call", emoji: "📞" },
  meeting: { label: "Meeting", emoji: "📅" },
  email: { label: "Email", emoji: "✉️" },
  follow_up: { label: "Follow Up", emoji: "🔄" },
  other: { label: "Other", emoji: "📋" },
};

const TASK_PRIORITIES: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "#717478" },
  medium: { label: "Medium", color: "#3b82f6" },
  high: { label: "High", color: "#f97316" },
  urgent: { label: "Urgent", color: "#ef4444" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  pending: { label: "Pending", color: "#717478", icon: Circle },
  in_progress: { label: "In Progress", color: "#3b82f6", icon: Clock },
  completed: { label: "Completed", color: "#10b981", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "#ef4444", icon: XCircle },
};

const STATUSES: Task["status"][] = ["pending", "in_progress", "completed", "cancelled"];

// ============================================
// Fallback Demo Data
// ============================================
const FALLBACK_TASKS: Task[] = [
  { id: "t1", title: "Follow up with Vikram Singh", description: "Discuss enterprise integration pricing and timeline.", type: "call", priority: "high", status: "pending", due_date: new Date().toISOString(), assigned_to: "Amit Kumar", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "t2", title: "Send proposal to TechStart", description: "Updated pricing proposal with annual discount.", type: "email", priority: "medium", status: "in_progress", due_date: new Date(Date.now() + 86400000).toISOString(), assigned_to: "Priya Sharma", created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: "t3", title: "Demo meeting with CloudSoft", description: "Product walkthrough and Q&A session for the engineering team.", type: "meeting", priority: "urgent", status: "pending", due_date: new Date().toISOString(), assigned_to: "Rahul Verma", created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: "t4", title: "Contract review for DataFlow", description: "Legal review of service agreement terms.", type: "other", priority: "high", status: "in_progress", due_date: new Date(Date.now() + 172800000).toISOString(), assigned_to: "Amit Kumar", created_at: new Date(Date.now() - 345600000).toISOString() },
  { id: "t5", title: "Quarterly check-in with NovaTech", description: "Review account health and upsell opportunities.", type: "follow_up", priority: "low", status: "completed", due_date: new Date(Date.now() - 86400000).toISOString(), assigned_to: "Priya Sharma", created_at: new Date(Date.now() - 432000000).toISOString() },
  { id: "t6", title: "Onboarding call with new client", description: "Walk through platform setup and initial configuration.", type: "call", priority: "medium", status: "pending", due_date: new Date(Date.now() + 259200000).toISOString(), assigned_to: "Rahul Verma", created_at: new Date(Date.now() - 518400000).toISOString() },
  { id: "t7", title: "Update CRM notes for Q2 pipeline", description: "Clean up stale deal notes and update forecasts.", type: "other", priority: "low", status: "cancelled", due_date: new Date(Date.now() - 172800000).toISOString(), assigned_to: "Amit Kumar", created_at: new Date(Date.now() - 604800000).toISOString() },
  { id: "t8", title: "Send renewal reminder to Acme Corp", description: "Contract renewal approaching in 30 days.", type: "email", priority: "high", status: "pending", due_date: new Date(Date.now() + 86400000 * 5).toISOString(), assigned_to: "Priya Sharma", created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

// ============================================
// Component
// ============================================
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(FALLBACK_TASKS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"List" | "Board" | "Calendar">("List");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<Task["type"]>("call");
  const [formPriority, setFormPriority] = useState<Task["priority"]>("medium");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [formAssignee, setFormAssignee] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const rows = await getTasks();
      if (rows.length > 0) setTasks(rows as Task[]);
    } catch {
      console.warn("Using offline fallback tasks data.");
      setTasks(FALLBACK_TASKS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleUpdateStatus = async (id: string, nextStatus: Task["status"]) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
    try {
      await updateTaskStatus(id, nextStatus);
      toast.success(`Task marked as ${STATUS_CONFIG[nextStatus].label}`);
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) { toast.error("Title is required"); return; }
    setSubmitting(true);
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: formTitle,
      description: formDesc,
      type: formType,
      priority: formPriority,
      status: "pending",
      due_date: new Date(formDueDate).toISOString(),
      assigned_to: formAssignee || "Unassigned",
      created_at: new Date().toISOString(),
    };
    try {
      const row = await createTask({
        title: formTitle,
        description: formDesc,
        type: formType,
        priority: formPriority,
        due_date: new Date(formDueDate).toISOString(),
        assigned_to: formAssignee || undefined,
      });
      newTask.id = row?.id ?? newTask.id;
      setTasks(prev => [newTask, ...prev]);
      toast.success("Task created successfully");
    } catch {
      toast.error("Failed to create task");
    }
    setSubmitting(false);
    setIsModalOpen(false);
    setFormTitle(""); setFormDesc(""); setFormType("call"); setFormPriority("medium"); setFormAssignee("");
  };

  // Filters
  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    const matchType = typeFilter === "ALL" || t.type === typeFilter;
    return matchSearch && matchPriority && matchType;
  });

  // Calendar helpers
  const getWeekDays = (offset: number) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays(calendarWeekOffset);

  const isOverdue = (t: Task) => t.status !== "completed" && t.status !== "cancelled" && new Date(t.due_date) < new Date();

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tasks by type, priority, and deadline across list, board, and calendar views.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:scale-105"
          style={{ background: "var(--graph-to)", color: "#0a0a0a" }}
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-2 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text" placeholder="Search tasks..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-9 pr-4 rounded-xl text-xs bg-transparent border placeholder:opacity-50"
            style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}
          />
        </div>

        {/* Priority filter */}
        <select
          value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 px-3 rounded-xl text-xs border bg-transparent cursor-pointer"
          style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}
        >
          <option value="ALL">All Priorities</option>
          {Object.entries(TASK_PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 px-3 rounded-xl text-xs border bg-transparent cursor-pointer"
          style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}
        >
          <option value="ALL">All Types</option>
          {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>

        {/* View switcher */}
        <div className="flex items-center gap-0.5 ml-auto p-1 rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
          {([["List", List], ["Board", LayoutGrid], ["Calendar", CalendarIcon]] as const).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v as "List" | "Board" | "Calendar")}
              className="h-7 w-7 flex items-center justify-center rounded-lg transition-all duration-200"
              style={{ background: view === v ? "var(--accent)" : "transparent", color: view === v ? "var(--text-color)" : "var(--muted-foreground)" }}
              title={v}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", count: filtered.length, color: "var(--graph-to)" },
          { label: "Pending", count: filtered.filter(t => t.status === "pending").length, color: "#717478" },
          { label: "In Progress", count: filtered.filter(t => t.status === "in_progress").length, color: "#3b82f6" },
          { label: "Overdue", count: filtered.filter(t => isOverdue(t)).length, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 border transition-all duration-200 hover:shadow-md" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Content Views */}
      {loading ? (
        <WidgetWrapper loading><div /></WidgetWrapper>
      ) : filtered.length === 0 ? (
        <WidgetWrapper empty emptyTitle="No tasks found" emptyDescription="Create your first task to get started."><div /></WidgetWrapper>
      ) : view === "List" ? (
        /* ---- LIST VIEW ---- */
        <div className="overflow-x-auto rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
                <th className="p-4 font-bold uppercase tracking-wider w-8"></th>
                <th className="p-4 font-bold uppercase tracking-wider">Task</th>
                <th className="p-4 font-bold uppercase tracking-wider">Type</th>
                <th className="p-4 font-bold uppercase tracking-wider">Priority</th>
                <th className="p-4 font-bold uppercase tracking-wider">Due Date</th>
                <th className="p-4 font-bold uppercase tracking-wider">Assigned To</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-color)" }}>
              {filtered.map(task => {
                const normalizedStatus = (task.status || "pending").toLowerCase();
                const statusCfg = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                return (
                  <tr key={task.id} className="border-b transition-colors" style={{ borderColor: "var(--card-border)", opacity: task.status === "cancelled" ? 0.5 : 1 }}>
                    <td className="p-4">
                      <button onClick={() => handleUpdateStatus(task.id, task.status === "completed" ? "pending" : "completed")} className="transition-transform hover:scale-125">
                        <StatusIcon size={16} style={{ color: statusCfg.color }} />
                      </button>
                    </td>
                    <td className="p-4">
                      <p className="font-bold" style={{ textDecoration: task.status === "completed" ? "line-through" : "none" }}>{task.title}</p>
                      {task.description && <p className="text-muted-foreground mt-0.5 text-[10px] line-clamp-1">{task.description}</p>}
                    </td>
                    <td className="p-4"><span className="text-sm">{TASK_TYPES[task.type]?.emoji}</span> <span className="text-muted-foreground">{TASK_TYPES[task.type]?.label}</span></td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide" style={{ background: TASK_PRIORITIES[task.priority]?.color + "20", color: TASK_PRIORITIES[task.priority]?.color }}>
                        {TASK_PRIORITIES[task.priority]?.label}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <span className={isOverdue(task) ? "text-red-500 font-bold" : ""}>
                        {isOverdue(task) && <AlertTriangle size={10} className="inline mr-1" />}
                        {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground font-semibold">{task.assigned_to}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide" style={{ background: statusCfg.color + "20", color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {task.status !== "completed" && task.status !== "cancelled" && (
                          <button onClick={() => handleUpdateStatus(task.id, task.status === "pending" ? "in_progress" : "completed")}
                            className="h-6 px-2 rounded-lg text-[9px] font-bold border transition-all hover:scale-105"
                            style={{ borderColor: "var(--card-border)", color: "var(--graph-to)" }}>
                            {task.status === "pending" ? "Start" : "Done"}
                          </button>
                        )}
                        {task.status !== "cancelled" && task.status !== "completed" && (
                          <button onClick={() => handleUpdateStatus(task.id, "cancelled")}
                            className="h-6 w-6 flex items-center justify-center rounded-lg transition-all hover:scale-105"
                            style={{ color: "var(--muted-foreground)" }} title="Cancel">
                            <XCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : view === "Board" ? (
        /* ---- BOARD VIEW ---- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUSES.map(status => {
            const col = filtered.filter(t => t.status === status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CONFIG[status].color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-color)" }}>{STATUS_CONFIG[status].label}</span>
                  <span className="text-[10px] font-bold text-muted-foreground ml-auto">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map(task => (
                    <div key={task.id} className="rounded-xl p-3.5 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold flex-1" style={{ color: "var(--text-color)", textDecoration: task.status === "completed" ? "line-through" : "none" }}>{task.title}</p>
                        <span className="text-sm shrink-0">{TASK_TYPES[task.type]?.emoji}</span>
                      </div>
                      {task.description && <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase" style={{ background: TASK_PRIORITIES[task.priority]?.color + "20", color: TASK_PRIORITIES[task.priority]?.color }}>
                          {task.priority}
                        </span>
                        <span className={`text-[10px] ${isOverdue(task) ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                          {isOverdue(task) && "⚠ "}{new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{task.assigned_to}</span>
                      </div>
                      {task.status !== "completed" && task.status !== "cancelled" && (
                        <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t" style={{ borderColor: "var(--card-border)" }}>
                          <button onClick={() => handleUpdateStatus(task.id, task.status === "pending" ? "in_progress" : "completed")}
                            className="flex-1 h-6 rounded-lg text-[9px] font-bold transition-all hover:scale-105"
                            style={{ background: "var(--graph-to)" + "20", color: "var(--graph-to)" }}>
                            {task.status === "pending" ? "▶ Start" : "✓ Complete"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length === 0 && <div className="text-center py-6 text-[10px] text-muted-foreground rounded-xl border border-dashed" style={{ borderColor: "var(--card-border)" }}>No tasks</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ---- CALENDAR VIEW ---- */
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--card-border)" }}>
            <button onClick={() => setCalendarWeekOffset(p => p - 1)} className="h-7 w-7 flex items-center justify-center rounded-lg transition-all hover:scale-110" style={{ color: "var(--text-color)" }}><ChevronLeft size={16} /></button>
            <div className="text-xs font-bold" style={{ color: "var(--text-color)" }}>
              {weekDays[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — {weekDays[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalendarWeekOffset(0)} className="h-7 px-2 rounded-lg text-[9px] font-bold border transition-all hover:scale-105" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Today</button>
              <button onClick={() => setCalendarWeekOffset(p => p + 1)} className="h-7 w-7 flex items-center justify-center rounded-lg transition-all hover:scale-110" style={{ color: "var(--text-color)" }}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day, i) => {
              const dayStr = day.toISOString().split("T")[0];
              const dayTasks = filtered.filter(t => t.due_date.split("T")[0] === dayStr);
              const isToday = new Date().toISOString().split("T")[0] === dayStr;
              return (
                <div key={i} className="border-r last:border-r-0 border-b-0" style={{ borderColor: "var(--card-border)", background: isToday ? "var(--accent)" : "transparent" }}>
                  <div className="p-2 text-center border-b" style={{ borderColor: "var(--card-border)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{day.toLocaleDateString("en-IN", { weekday: "short" })}</p>
                    <p className={`text-sm font-black mt-0.5 ${isToday ? "" : ""}`} style={{ color: isToday ? "var(--graph-to)" : "var(--text-color)" }}>{day.getDate()}</p>
                  </div>
                  <div className="p-1.5 space-y-1 min-h-[120px]">
                    {dayTasks.map(task => (
                      <div key={task.id}
                        className="rounded-lg p-1.5 text-[9px] font-semibold cursor-pointer transition-all hover:scale-[1.02]"
                        style={{ background: TASK_PRIORITIES[task.priority]?.color + "15", color: TASK_PRIORITIES[task.priority]?.color, borderLeft: `2px solid ${TASK_PRIORITIES[task.priority]?.color}` }}
                        title={task.description}>
                        <span className="mr-1">{TASK_TYPES[task.type]?.emoji}</span>
                        <span className="line-clamp-1">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- CREATE MODAL ---- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6 border space-y-5" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }} onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>Create New Task</h2>
              <p className="text-xs text-muted-foreground mt-1">Add a new task to your workspace.</p>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title *</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Task title..."
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Describe the task..."
                  className="w-full h-20 px-3 py-2 mt-1.5 rounded-xl text-xs border bg-transparent resize-none" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                  <select value={formType} onChange={e => setFormType(e.target.value as Task["type"])}
                    className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent cursor-pointer" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
                    {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                  <select value={formPriority} onChange={e => setFormPriority(e.target.value as Task["priority"])}
                    className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent cursor-pointer" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
                    {Object.entries(TASK_PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
                  <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                    className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned To</label>
                  <input value={formAssignee} onChange={e => setFormAssignee(e.target.value)} placeholder="Team member..."
                    className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold border transition-all hover:scale-105"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>
                  {submitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
