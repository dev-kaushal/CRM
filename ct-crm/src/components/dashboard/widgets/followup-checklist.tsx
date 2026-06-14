"use client";

import { CheckCircle2 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ChecklistItem {
  id: string;
  label: string;
  due_date: string; // ISO
  done: boolean;
}

// ─── Deterministic demo data ───────────────────────────────────────────────
function hashSeed(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TASK_LABELS = [
  "Send welcome email", "Schedule discovery call", "Share proposal deck", "Follow up on pricing",
  "Confirm decision maker", "Send case study", "Check in after demo", "Request feedback",
  "Share contract draft", "Plan onboarding call",
];

/** Builds ~8-10 checklist rows for an entity, seeded from its id with a mix
 * of done/overdue/upcoming due dates relative to today. */
export function buildDemoChecklist(entityId: string): ChecklistItem[] {
  const rand = mulberry32(hashSeed(entityId + "-checklist"));
  const count = 8 + Math.floor(rand() * 3); // 8-10
  const items: ChecklistItem[] = [];
  for (let i = 0; i < count; i++) {
    const offset = Math.floor(rand() * 21) - 10; // -10..+10 days
    const due = new Date();
    due.setDate(due.getDate() + offset);
    const done = offset < 0 ? rand() > 0.35 : rand() > 0.85;
    items.push({ id: `${entityId}-cl-${i}`, label: TASK_LABELS[i % TASK_LABELS.length], due_date: due.toISOString(), done });
  }
  return items;
}

// ─── UI ─────────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function FollowupChecklist({ items }: { items: ChecklistItem[] }) {
  const today = startOfDay(new Date());

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const due = startOfDay(new Date(item.due_date));
        const overdue = !item.done && due < today;
        const isToday = !item.done && due === today;
        const onTrack = item.done || due >= today;
        return (
          <div key={item.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: overdue ? "rgba(239,68,68,.3)" : isToday ? "rgba(234,179,8,.3)" : "var(--card-border)", background: overdue ? "rgba(239,68,68,.06)" : isToday ? "rgba(234,179,8,.06)" : "transparent" }}>
            {item.done ? <CheckCircle2 size={16} style={{ color: "#10b981" }} className="shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: overdue ? "#ef4444" : isToday ? "#eab308" : "var(--card-border)" }} />}
            <p className="flex-1 min-w-0 text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: item.done ? "line-through" : "none" }}>{item.label}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: onTrack ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", color: onTrack ? "#10b981" : "#ef4444" }}>{fmtDate(item.due_date)}</span>
          </div>
        );
      })}
    </div>
  );
}
