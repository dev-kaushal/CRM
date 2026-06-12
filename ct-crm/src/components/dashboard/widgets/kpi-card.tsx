"use client";

import { Sparkline } from "./sparkline";
import { formatCompact, formatPercent } from "@/lib/constants";
import type { KPIMetric } from "@/lib/types";

interface KPICardProps {
  metric: KPIMetric;
  loading?: boolean;
}

export function KPICard({ metric, loading }: KPICardProps) {
  if (loading) {
    return (
      <div
        className="rounded-2xl p-5 transition-all duration-300"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="is-pulsing space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-6 w-6 rounded" style={{ background: "var(--accent)" }} />
          </div>
          <div className="h-8 w-28 rounded-lg" style={{ background: "var(--accent)" }} />
          <div className="h-4 w-16 rounded" style={{ background: "var(--accent)" }} />
          <div className="h-8 w-full rounded" style={{ background: "var(--accent)" }} />
        </div>
      </div>
    );
  }

  const displayValue =
    metric.format === "currency"
      ? formatCompact(typeof metric.value === "number" ? metric.value : 0)
      : metric.format === "percent"
        ? `${metric.value}%`
        : metric.value;

  const changeColor =
    metric.changeType === "increase"
      ? "#10b981"
      : metric.changeType === "decrease"
        ? "#ef4444"
        : "var(--muted-foreground)";

  const changeArrow =
    metric.changeType === "increase" ? "↑" : metric.changeType === "decrease" ? "↓" : "—";

  return (
    <div
      className="group rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {metric.label}
        </span>
        {metric.icon && <span className="text-base">{metric.icon}</span>}
      </div>

      {/* Value */}
      <div className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>
        {displayValue}
      </div>

      {/* Trend */}
      {metric.change !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs font-semibold" style={{ color: changeColor }}>
            {changeArrow} {formatPercent(metric.change)}
          </span>
          <span className="text-[10px] text-muted-foreground">vs last month</span>
        </div>
      )}

      {/* Sparkline */}
      {metric.sparklineData && metric.sparklineData.length > 0 && (
        <div className="mt-3 -mx-1">
          <Sparkline data={metric.sparklineData} color={changeColor} />
        </div>
      )}
    </div>
  );
}
