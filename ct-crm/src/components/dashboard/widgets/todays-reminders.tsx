"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Phone, Mail, Users, Bell, Clock, ArrowUpRight } from "lucide-react";
import { WidgetWrapper } from "./widget-wrapper";

export interface ReminderItem {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  title: string;
  type: string;
  datetime: string;
  note?: string;
  done: boolean;
}

export const TYPE_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  follow_up: Bell,
};

export const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  prospect: "Prospect",
  deal: "Deal",
  customer: "Customer",
  contact: "Contact",
};

export function entityHref(type: string, id: string) {
  if (type === "lead") return `/dashboard/leads/${id}`;
  if (type === "prospect") return `/dashboard/prospects/${id}`;
  if (type === "deal") return `/dashboard/deals/${id}`;
  if (type === "customer") return "/dashboard/customers";
  return "/dashboard/contacts";
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function TodaysReminders({
  reminders,
  loading,
  onToggle,
  onSnooze,
}: {
  reminders: ReminderItem[];
  loading?: boolean;
  onToggle: (id: string, done: boolean) => void;
  onSnooze: (id: string) => void;
}) {
  return (
    <WidgetWrapper
      title="Today's Reminders"
      subtitle="Follow-ups due today"
      loading={loading}
      empty={reminders.length === 0}
      emptyTitle="All caught up"
      emptyDescription="No reminders due today."
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {reminders.map((r) => {
          const Icon = TYPE_ICONS[r.type] ?? Bell;
          return (
            <div
              key={r.id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border"
              style={{
                borderColor: r.done ? "var(--card-border)" : "rgba(234,179,8,.3)",
                background: r.done ? "transparent" : "rgba(234,179,8,.06)",
              }}
            >
              <button onClick={() => onToggle(r.id, !r.done)} className="shrink-0" title={r.done ? "Mark as not done" : "Mark as done"}>
                {r.done ? <CheckCircle2 size={15} style={{ color: "#10b981" }} /> : <Circle size={15} style={{ color: "#eab308" }} />}
              </button>
              <Icon size={13} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: r.done ? "line-through" : "none" }}>{r.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {ENTITY_LABELS[r.entity_type] ?? r.entity_type}{r.entity_name ? ` · ${r.entity_name}` : ""} · {fmtTime(r.datetime)}
                </p>
              </div>
              {!r.done && (
                <button onClick={() => onSnooze(r.id)} className="shrink-0 p-1 rounded-lg hover:opacity-70" title="Snooze 1 hour" style={{ color: "var(--muted-foreground)" }}>
                  <Clock size={13} />
                </button>
              )}
              <Link href={entityHref(r.entity_type, r.entity_id)} className="shrink-0 p-1 rounded-lg hover:opacity-70" title="Open" style={{ color: "var(--graph-to)" }}>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
}
