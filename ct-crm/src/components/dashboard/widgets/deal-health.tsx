"use client";

import { WidgetWrapper } from "./widget-wrapper";

interface DealHealthData {
  open: number;
  atRisk: number;
  stalled: number;
  negotiation: number;
  contract: number;
}

interface DealHealthProps {
  data: DealHealthData;
  loading?: boolean;
}

export function DealHealth({ data, loading }: DealHealthProps) {
  const cards = [
    { label: "Open", value: data.open, color: "#3b82f6", emoji: "📊" },
    { label: "At Risk", value: data.atRisk, color: "#ef4444", emoji: "⚠️" },
    { label: "Stalled", value: data.stalled, color: "#f97316", emoji: "⏸️" },
    { label: "Negotiation", value: data.negotiation, color: "#eab308", emoji: "🤝" },
    { label: "Contract", value: data.contract, color: "#8b5cf6", emoji: "📄" },
  ];

  return (
    <WidgetWrapper
      title="Deal Health"
      subtitle="Pipeline status overview"
      loading={loading}
      empty={Object.values(data).every((v) => v === 0)}
      emptyTitle="No deals in pipeline"
      emptyDescription="Create deals to monitor pipeline health."
    >
      <div className="grid grid-cols-5 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-3 text-center transition-all hover:scale-105 hover:shadow-md"
            style={{
              background: `${card.color}08`,
              border: `1px solid ${card.color}20`,
            }}
          >
            <span className="text-lg">{card.emoji}</span>
            <div className="cause-font text-xl font-bold mt-1" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
