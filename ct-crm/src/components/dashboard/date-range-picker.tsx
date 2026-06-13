"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type DateRangePreset = "all" | "today" | "week" | "month" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  from?: string; // yyyy-mm-dd, only used when preset === "custom"
  to?: string; // yyyy-mm-dd, only used when preset === "custom"
}

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom Range" },
];

/** Resolves a DateRangeValue into concrete bounds. `null` means unbounded. */
export function getDateRangeBounds(value: DateRangeValue): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (value.preset) {
    case "today": {
      const from = new Date(now); from.setHours(0, 0, 0, 0);
      const to = new Date(now); to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case "week": {
      const from = new Date(now);
      const dayOffset = (from.getDay() + 6) % 7; // Monday = 0
      from.setDate(from.getDate() - dayOffset);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now); to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const to = new Date(now); to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    case "custom": {
      const from = value.from ? new Date(`${value.from}T00:00:00`) : null;
      const to = value.to ? new Date(`${value.to}T23:59:59`) : null;
      return { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

/** True if `dateStr` falls within the resolved bounds (unbounded sides always pass). */
export function isWithinDateRange(dateStr: string, bounds: { from: Date | null; to: Date | null }): boolean {
  const t = new Date(dateStr).getTime();
  if (bounds.from && t < bounds.from.getTime()) return false;
  if (bounds.to && t > bounds.to.getTime()) return false;
  return true;
}

function formatShort(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function dateRangeLabel(value: DateRangeValue): string {
  if (value.preset === "custom") {
    if (value.from && value.to) return `${formatShort(value.from)} – ${formatShort(value.to)}`;
    if (value.from) return `From ${formatShort(value.from)}`;
    if (value.to) return `Until ${formatShort(value.to)}`;
    return "Custom Range";
  }
  return PRESETS.find(p => p.id === value.preset)?.label || "All Time";
}

export function DateRangePicker({ value, onChange }: { value: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border"
        style={{ borderColor: value.preset !== "all" ? "var(--graph-to)" : "var(--card-border)", color: "var(--text-color)" }}
      >
        <Calendar size={12} />{dateRangeLabel(value)}<ChevronDown size={12} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-64 rounded-xl border shadow-xl z-50 p-2 space-y-1"
          onClick={e => e.stopPropagation()}
          style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}
        >
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange({ preset: p.id, from: value.from, to: value.to }); if (p.id !== "custom") setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent"
              style={{ color: value.preset === p.id ? "var(--graph-to)" : "var(--text-color)", background: value.preset === p.id ? "var(--accent)" : "transparent" }}
            >
              {p.label}
            </button>
          ))}
          {value.preset === "custom" && (
            <div className="pt-1.5 px-1 space-y-2" style={{ borderTop: "1px solid var(--card-border)" }}>
              <div className="space-y-1.5 pt-1.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground">From</label>
                  <input type="date" value={value.from || ""} onChange={e => onChange({ ...value, from: e.target.value })} className="ct-fi w-full" style={{ height: "2rem", fontSize: "0.75rem" }} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground">To</label>
                  <input type="date" value={value.to || ""} onChange={e => onChange({ ...value, to: e.target.value })} className="ct-fi w-full" style={{ height: "2rem", fontSize: "0.75rem" }} />
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="w-full h-8 rounded-lg text-xs font-semibold hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
