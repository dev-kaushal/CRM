"use client";

import { Mail, PhoneCall, ListChecks } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
export type CadenceStepType = "email" | "call" | "task";
export type CadenceStatus = "Sent" | "Opened" | "Completed" | "Scheduled";

export interface CadenceStep {
  type: CadenceStepType;
  trigger: string;
  template: string;
  status: CadenceStatus;
}

export interface CadenceColumn {
  title: string;
  steps: CadenceStep[];
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

const TYPE_CYCLE: CadenceStepType[] = ["email", "call", "task", "email", "call"];
const TRIGGER_VERB: Record<CadenceStepType, string> = {
  email: "Email is Sent",
  call: "Call is Logged",
  task: "Task is Completed",
};

/** Builds a 5-column cadence board for an entity, seeded from its id so the
 * layout is stable across renders/visits but varies between entities. */
export function buildDemoCadence(entityId: string, entityLabel: string): CadenceColumn[] {
  const rand = mulberry32(hashSeed(entityId));
  const completedThrough = Math.floor(rand() * 6); // 0-5 columns already worked

  return TYPE_CYCLE.map((primaryType, idx) => {
    const n = idx + 1;
    const trigger = n === 1
      ? "Do this 2 days after enrollment"
      : `Do this ${[3, 5, 7, 9][idx - 1]} days after previous ${TRIGGER_VERB[TYPE_CYCLE[idx - 1]]}`;

    const isPast = n <= completedThrough;
    const template = `Non-engaged ${entityLabel} Follow-up ${n}`;
    const steps: CadenceStep[] = [{
      type: primaryType,
      trigger,
      template,
      status: isPast ? (primaryType === "email" ? (rand() > 0.4 ? "Opened" : "Sent") : "Completed") : "Scheduled",
    }];

    if (rand() > 0.5) {
      const secondaryType: CadenceStepType = primaryType === "email" ? "task" : "email";
      steps.push({
        type: secondaryType,
        trigger: `Do this 1 day after ${TRIGGER_VERB[primaryType]}`,
        template,
        status: isPast ? (secondaryType === "email" ? (rand() > 0.5 ? "Opened" : "Sent") : "Completed") : "Scheduled",
      });
    }

    return { title: `Follow-up ${n}`, steps };
  });
}

// ─── UI ─────────────────────────────────────────────────────────────────────
const TYPE_ICON: Record<CadenceStepType, React.ReactNode> = {
  email: <Mail size={13} />,
  call: <PhoneCall size={13} />,
  task: <ListChecks size={13} />,
};

const STATUS_COLOR: Record<CadenceStatus, { bg: string; text: string }> = {
  Sent: { bg: "rgba(59,130,246,.12)", text: "#3b82f6" },
  Opened: { bg: "rgba(168,85,247,.12)", text: "#a855f7" },
  Completed: { bg: "rgba(16,185,129,.12)", text: "#10b981" },
  Scheduled: { bg: "rgba(148,163,184,.12)", text: "#94a3b8" },
};

export function CadenceBoard({ columns }: { columns: CadenceColumn[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {columns.map((col) => (
        <div key={col.title} className="flex-1 min-w-[180px] space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">{col.title}</p>
          {col.steps.map((step, i) => (
            <div key={i} className="rounded-xl border p-2.5 space-y-1.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--card-bg-solid)", color: "var(--graph-to)" }}>{TYPE_ICON[step.type]}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: STATUS_COLOR[step.status].bg, color: STATUS_COLOR[step.status].text }}>{step.status}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">{step.trigger}</p>
              <p className="text-[10px] font-semibold leading-snug" style={{ color: "var(--text-color)" }}>{step.template}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
