"use client";

import { Users, UserCheck, Briefcase, Trophy, XCircle } from "lucide-react";

export interface PipelineOverviewData {
  leads: number;
  prospects: number;
  deals: number;
  won: number;
  lost: number;
}

const ITEMS = [
  { key: "leads", label: "Leads", icon: Users, color: "#3b82f6" },
  { key: "prospects", label: "Prospects", icon: UserCheck, color: "#f97316" },
  { key: "deals", label: "Deals", icon: Briefcase, color: "#eab308" },
  { key: "won", label: "Won", icon: Trophy, color: "#10b981" },
  { key: "lost", label: "Lost", icon: XCircle, color: "#ef4444" },
] as const;

export function PipelineOverview({ data, loading }: { data: PipelineOverviewData; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="p-4 rounded-2xl border flex items-center gap-3"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${item.color}22`, color: item.color }}
            >
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              {loading ? (
                <div className="h-6 w-10 rounded is-pulsing" style={{ background: "var(--accent)" }} />
              ) : (
                <p className="text-lg font-bold truncate" style={{ color: "var(--text-color)" }}>{data[item.key]}</p>
              )}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
