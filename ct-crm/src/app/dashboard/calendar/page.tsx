"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, CheckCircle2, Circle, Clock, Trash2, Pencil, ArrowUpRight, UserPlus, Target, Handshake, FileText } from "lucide-react";
import { getAllReminders, toggleReminderDone, snoozeReminder, updateReminder, deleteReminder, getDailyEntityCounts, type DailyEntityCounts } from "@/server/calendar";
import { validateReminder, type ReminderValues } from "@/lib/validations/reminder";
import { TYPE_ICONS, ENTITY_LABELS, entityHref, type ReminderItem } from "@/components/dashboard/widgets/todays-reminders";

const TYPE_COLORS: Record<string, string> = {
  call: "#3b82f6",
  email: "#f97316",
  meeting: "#a855f7",
  follow_up: "#eab308",
};

/** Pipeline activity (#26 extension) — new leads/prospects/deals/contracts created on a given day. */
const PIPELINE_STAGES: { key: keyof DailyEntityCounts; label: string; icon: typeof UserPlus; color: string; href: string }[] = [
  { key: "leads", label: "New Leads", icon: UserPlus, color: "#3b82f6", href: "/dashboard/leads" },
  { key: "prospects", label: "New Prospects", icon: Target, color: "#f97316", href: "/dashboard/prospects" },
  { key: "deals", label: "New Deals", icon: Handshake, color: "#eab308", href: "/dashboard/deals" },
  { key: "contracts", label: "New Contracts", icon: FileText, color: "#a855f7", href: "/dashboard/contracts" },
];

const EMPTY_COUNTS: DailyEntityCounts = { leads: 0, prospects: 0, deals: 0, contracts: 0 };

const TYPE_OPTIONS: { value: ReminderValues["type"]; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "follow_up", label: "Follow-up" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 6x7 grid of dates (Monday-start) covering the full month plus leading/trailing days. */
function buildGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** Converts an ISO datetime string to a value usable by <input type="datetime-local">. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarPage() {
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [dailyCounts, setDailyCounts] = useState<Record<string, DailyEntityCounts>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReminderValues>({ title: "", type: "call", datetime: "", note: "" });
  const [editTried, setEditTried] = useState(false);

  const grid = useMemo(() => buildGrid(monthDate), [monthDate]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [rows, counts] = await Promise.all([
        getAllReminders(grid[0], grid[grid.length - 1]),
        getDailyEntityCounts(grid[0], grid[grid.length - 1]),
      ]);
      setReminders(rows);
      setDailyCounts(counts);
    } catch (err) {
      console.warn("Failed to load reminders.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthDate]);

  const remindersByDay = useMemo(() => {
    const map = new Map<string, ReminderItem[]>();
    reminders.forEach((r) => {
      const key = new Date(r.datetime).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    });
    return map;
  }, [reminders]);

  const today = new Date();
  const selectedReminders = selectedDate ? (remindersByDay.get(selectedDate.toDateString()) ?? []) : [];
  const selectedCounts = selectedDate ? (dailyCounts[selectedDate.toDateString()] ?? EMPTY_COUNTS) : EMPTY_COUNTS;
  const selectedTotal = selectedCounts.leads + selectedCounts.prospects + selectedCounts.deals + selectedCounts.contracts;

  const handleToggle = async (id: string, done: boolean) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, done } : r)));
    try {
      await toggleReminderDone(id, done);
    } catch (err) {
      console.warn("Failed to update reminder.", err);
    }
  };

  const handleSnooze = async (id: string) => {
    try {
      await snoozeReminder(id, 1);
      await refresh();
    } catch (err) {
      console.warn("Failed to snooze reminder.", err);
    }
  };

  const handleDelete = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) setEditingId(null);
    try {
      await deleteReminder(id);
    } catch (err) {
      console.warn("Failed to delete reminder.", err);
    }
  };

  const startEdit = (r: ReminderItem) => {
    setEditingId(r.id);
    setEditTried(false);
    setEditForm({ title: r.title, type: r.type as ReminderValues["type"], datetime: toLocalInput(r.datetime), note: r.note ?? "" });
  };

  const { valid: editValid, errors: editErrors } = validateReminder(editForm);

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editValid) { setEditTried(true); return; }
    const id = editingId;
    const newDatetime = new Date(editForm.datetime).toISOString();
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, title: editForm.title, type: editForm.type, datetime: newDatetime, note: editForm.note } : r)));
    setEditingId(null);
    try {
      await updateReminder(id, { title: editForm.title, type: editForm.type, datetime: editForm.datetime, note: editForm.note });
    } catch (err) {
      console.warn("Failed to update reminder.", err);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto view-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Reminders &amp; follow-ups across leads, prospects, customers, and contacts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthDate(startOfMonth(new Date()))} className="h-9 px-3 rounded-xl text-xs font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Today</button>
          <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="h-9 w-9 rounded-xl border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: "var(--text-color)" }}>
            {monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="h-9 w-9 rounded-xl border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Month Grid */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--card-border)" }}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{w}</div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${loading ? "is-pulsing" : ""}`}>
          {grid.map((d, i) => {
            const isCurrentMonth = d.getMonth() === monthDate.getMonth();
            const isToday = d.toDateString() === today.toDateString();
            const isSelected = selectedDate?.toDateString() === d.toDateString();
            const dayReminders = remindersByDay.get(d.toDateString()) ?? [];
            const visible = dayReminders.slice(0, 3);
            const extra = dayReminders.length - visible.length;
            const counts = dailyCounts[d.toDateString()];
            const activeStages = counts ? PIPELINE_STAGES.filter((s) => counts[s.key] > 0) : [];

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className="text-left p-2 min-h-[88px] border-b border-r flex flex-col gap-1 transition-colors hover:bg-[var(--accent)]"
                style={{
                  borderColor: "var(--card-border)",
                  background: isSelected ? "var(--accent)" : "transparent",
                  opacity: isCurrentMonth ? 1 : 0.4,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      color: isToday ? "#0a0a0a" : "var(--text-color)",
                      background: isToday ? "var(--graph-to)" : "transparent",
                    }}
                  >
                    {d.getDate()}
                  </span>
                  {activeStages.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {activeStages.map((s) => (
                        <span key={s.key} className="text-[8px] font-bold px-1 rounded-full" style={{ background: `${s.color}1a`, color: s.color }} title={`${counts[s.key]} ${s.label.toLowerCase()}`}>
                          {counts[s.key]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  {visible.map((r) => (
                    <div key={r.id} className="text-[9px] font-semibold px-1 py-0.5 rounded truncate flex items-center gap-1" style={{ background: `${TYPE_COLORS[r.type] ?? "#717478"}1a`, color: TYPE_COLORS[r.type] ?? "var(--muted-foreground)", textDecoration: r.done ? "line-through" : "none" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[r.type] ?? "#717478" }} />
                      <span className="truncate">{r.title}</span>
                    </div>
                  ))}
                  {extra > 0 && <div className="text-[9px] text-muted-foreground font-semibold px-1">+{extra} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DAY DRAWER ── */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => { setSelectedDate(null); setEditingId(null); }} />
          <div className="relative ml-auto h-full w-full max-w-[440px] overflow-y-auto shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: "var(--card-bg-solid)", borderBottom: "1px solid var(--card-border)" }}>
              <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>
                {selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <button onClick={() => { setSelectedDate(null); setEditingId(null); }} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={14} /></button>
            </div>

            {/* Pipeline activity — new leads/prospects/deals/contracts created on this day */}
            <div className="px-5 pt-4">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Pipeline Activity</p>
              {selectedTotal === 0 ? (
                <p className="text-xs text-muted-foreground mb-3">No new leads, prospects, deals, or contracts on this day.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {PIPELINE_STAGES.map((s) => {
                    const Icon = s.icon;
                    const count = selectedCounts[s.key];
                    return (
                      <Link key={s.key} href={s.href} className="flex items-center gap-2 p-2.5 rounded-xl border hover:opacity-80" style={{ borderColor: "var(--card-border)", background: count > 0 ? `${s.color}0d` : "transparent" }}>
                        <Icon size={14} style={{ color: count > 0 ? s.color : "var(--muted-foreground)" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold" style={{ color: count > 0 ? s.color : "var(--text-color)" }}>{count}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{s.label}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 pb-5 pt-1 space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Reminders &amp; Follow-ups</p>
              {selectedReminders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No reminders on this day.</p>
              ) : (
                selectedReminders.map((r) => {
                  const Icon = TYPE_ICONS[r.type] ?? Clock;
                  const isEditing = editingId === r.id;
                  return (
                    <div key={r.id} className="p-3 rounded-xl border space-y-2" style={{ borderColor: r.done ? "var(--card-border)" : "rgba(234,179,8,.3)", background: r.done ? "transparent" : "rgba(234,179,8,.06)" }}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="ct-fi" placeholder="Title" />
                            {editTried && editErrors.title && <p className="text-[10px] font-medium" style={{ color: "#ef4444" }}>{editErrors.title}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as ReminderValues["type"] }))} className="ct-fi">
                              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <div className="space-y-1">
                              <input type="datetime-local" value={editForm.datetime} onChange={(e) => setEditForm((f) => ({ ...f, datetime: e.target.value }))} className="ct-fi" />
                              {editTried && editErrors.datetime && <p className="text-[10px] font-medium" style={{ color: "#ef4444" }}>{editErrors.datetime}</p>}
                            </div>
                          </div>
                          <input value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} className="ct-fi" placeholder="Note" />
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="h-8 px-3 rounded-lg text-xs font-semibold" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save</button>
                            <button onClick={() => setEditingId(null)} className="h-8 px-3 rounded-lg text-xs font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <button onClick={() => handleToggle(r.id, !r.done)} className="shrink-0 mt-0.5" title={r.done ? "Mark as not done" : "Mark as done"}>
                            {r.done ? <CheckCircle2 size={15} style={{ color: "#10b981" }} /> : <Circle size={15} style={{ color: "#eab308" }} />}
                          </button>
                          <Icon size={13} className="shrink-0 mt-1" style={{ color: "var(--muted-foreground)" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: r.done ? "line-through" : "none" }}>{r.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {ENTITY_LABELS[r.entity_type] ?? r.entity_type}{r.entity_name ? ` · ${r.entity_name}` : ""} · {fmtTime(r.datetime)}
                            </p>
                            {r.note && <p className="text-[10px] text-muted-foreground mt-0.5">{r.note}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!r.done && (
                              <button onClick={() => handleSnooze(r.id)} className="p-1 rounded-lg hover:opacity-70" title="Snooze 1 hour" style={{ color: "var(--muted-foreground)" }}><Clock size={13} /></button>
                            )}
                            <button onClick={() => startEdit(r)} className="p-1 rounded-lg hover:opacity-70" title="Edit" style={{ color: "var(--muted-foreground)" }}><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(r.id)} className="p-1 rounded-lg hover:opacity-70" title="Delete" style={{ color: "#ef4444" }}><Trash2 size={13} /></button>
                            <Link href={entityHref(r.entity_type, r.entity_id)} className="p-1 rounded-lg hover:opacity-70" title="Open" style={{ color: "var(--graph-to)" }}><ArrowUpRight size={13} /></Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
