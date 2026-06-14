"use client";

import { ChevronRight } from "lucide-react";
import { DEAL_STAGES } from "@/lib/constants";

export type DealStage = "NEW" | "PROPOSAL" | "NEGOTIATION" | "CONTRACT" | "WON" | "LOST";

export const FORWARD_STAGES: DealStage[] = ["NEW", "PROPOSAL", "NEGOTIATION", "CONTRACT", "WON"];

export function getStageStyle(stage: DealStage) {
  const map: Record<DealStage, { bg: string; text: string; border: string; key: keyof typeof DEAL_STAGES }> = {
    NEW: { bg: "rgba(59,130,246,.15)", text: "#3b82f6", border: "rgba(59,130,246,.3)", key: "new" },
    PROPOSAL: { bg: "rgba(249,115,22,.15)", text: "#f97316", border: "rgba(249,115,22,.3)", key: "proposal" },
    NEGOTIATION: { bg: "rgba(234,179,8,.15)", text: "#eab308", border: "rgba(234,179,8,.3)", key: "negotiation" },
    CONTRACT: { bg: "rgba(139,92,246,.15)", text: "#8b5cf6", border: "rgba(139,92,246,.3)", key: "contract" },
    WON: { bg: "rgba(16,185,129,.15)", text: "#10b981", border: "rgba(16,185,129,.3)", key: "won" },
    LOST: { bg: "rgba(239,68,68,.15)", text: "#ef4444", border: "rgba(239,68,68,.3)", key: "lost" },
  };
  const m = map[stage];
  const cfg = DEAL_STAGES[m.key];
  return { bg: m.bg, text: m.text, border: m.border, probability: cfg.probability, label: cfg.label };
}

export function DealStagePipeline({ stage, onStageClick }: { stage: DealStage; onStageClick: (stage: DealStage) => void }) {
  const currentForwardIndex = FORWARD_STAGES.indexOf(stage);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {FORWARD_STAGES.map((s, i) => {
        const reached = stage !== "LOST" && i <= currentForwardIndex;
        const sStyle = getStageStyle(s);
        return (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => onStageClick(s)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase hover:opacity-80"
              style={{ background: reached ? sStyle.bg : "var(--accent)", color: reached ? sStyle.text : "var(--muted-foreground)", border: `1px solid ${reached ? sStyle.border : "var(--card-border)"}` }}
            >
              {sStyle.label}
            </button>
            {i < FORWARD_STAGES.length - 1 && <ChevronRight size={12} className="text-muted-foreground" />}
          </div>
        );
      })}
      <span className="mx-1 text-muted-foreground text-[10px]">|</span>
      <button
        onClick={() => onStageClick("LOST")}
        className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase hover:opacity-80"
        style={{ background: stage === "LOST" ? getStageStyle("LOST").bg : "var(--accent)", color: stage === "LOST" ? getStageStyle("LOST").text : "var(--muted-foreground)", border: `1px solid ${stage === "LOST" ? getStageStyle("LOST").border : "var(--card-border)"}` }}
      >
        Lost
      </button>
    </div>
  );
}
