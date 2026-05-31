"use client";

import { WidgetWrapper } from "./widget-wrapper";

export function AIReadySection() {
  const sections = [
    {
      title: "Lead Scoring",
      description: "AI-powered lead qualification and priority ranking",
      icon: "🎯",
      gradient: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    },
    {
      title: "Deal Intelligence",
      description: "Predictive deal health and close probability analysis",
      icon: "💡",
      gradient: "linear-gradient(135deg, #10b981, #00f2fe)",
    },
    {
      title: "Forecast Insights",
      description: "ML-driven revenue forecasting and pipeline predictions",
      icon: "📈",
      gradient: "linear-gradient(135deg, #f97316, #eab308)",
    },
    {
      title: "Meeting Intelligence",
      description: "Smart meeting summaries, action items, and follow-ups",
      icon: "🧠",
      gradient: "linear-gradient(135deg, #a855f7, #ec4899)",
    },
  ];

  return (
    <WidgetWrapper
      title="AI Intelligence Suite"
      subtitle="Powered by pgvector & ML — Phase 2"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="relative rounded-xl p-4 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg group"
            style={{
              background: "var(--accent)",
              border: "1px solid var(--card-border)",
            }}
          >
            {/* Gradient accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ background: section.gradient }}
            />

            <span className="text-2xl">{section.icon}</span>
            <h4 className="text-sm font-semibold mt-2" style={{ color: "var(--text-color)" }}>
              {section.title}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              {section.description}
            </p>

            {/* Coming Soon Badge */}
            <div
              className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
              style={{
                background: "var(--card-border)",
                color: "var(--muted-foreground)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Coming Soon
            </div>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
