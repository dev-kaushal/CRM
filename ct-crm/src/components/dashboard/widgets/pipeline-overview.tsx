"use client";

import { Users, UserCheck, Briefcase, Trophy, XCircle, FileText, Handshake, DoorOpen, Ban, Sparkles, ScrollText } from "lucide-react";

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

export interface ProspectsByStageData {
  qualified: number;
  proposalSent: number;
  inNegotiation: number;
  dealOpened: number;
  lost: number;
}

const STAGE_ITEMS = [
  { key: "qualified", label: "Qualified", icon: UserCheck, color: "#3b82f6" },
  { key: "proposalSent", label: "Proposal Sent", icon: FileText, color: "#f97316" },
  { key: "inNegotiation", label: "Negotiation", icon: Handshake, color: "#eab308" },
  { key: "dealOpened", label: "Deal Opened", icon: DoorOpen, color: "#10b981" },
  { key: "lost", label: "Lost", icon: Ban, color: "#ef4444" },
] as const;

export function ProspectsByStage({ data, loading }: { data: ProspectsByStageData; loading?: boolean }) {
  return (
    <div className="p-4 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Prospects by Stage</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {STAGE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-3">
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
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface DealsByStageData {
  new: number;
  proposal: number;
  negotiation: number;
  contract: number;
  won: number;
  lost: number;
}

const DEAL_STAGE_ITEMS = [
  { key: "new", label: "New", icon: Sparkles, color: "#3b82f6" },
  { key: "proposal", label: "Proposal", icon: FileText, color: "#f97316" },
  { key: "negotiation", label: "Negotiation", icon: Handshake, color: "#eab308" },
  { key: "contract", label: "Contract", icon: ScrollText, color: "#8b5cf6" },
  { key: "won", label: "Won", icon: Trophy, color: "#10b981" },
  { key: "lost", label: "Lost", icon: Ban, color: "#ef4444" },
] as const;

export function DealsByStage({ data, loading }: { data: DealsByStageData; loading?: boolean }) {
  return (
    <div className="p-4 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Deals by Stage</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {DEAL_STAGE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-3">
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
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
