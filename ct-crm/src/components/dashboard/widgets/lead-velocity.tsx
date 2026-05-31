"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { WidgetWrapper } from "./widget-wrapper";
import { LEAD_SOURCES } from "@/lib/constants";

interface LeadSourceData {
  source: string;
  count: number;
}

interface LeadVelocityProps {
  sourceData: LeadSourceData[];
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  qualified: number;
  loading?: boolean;
}

export function LeadVelocity({
  sourceData,
  newToday,
  newThisWeek,
  newThisMonth,
  qualified,
  loading,
}: LeadVelocityProps) {
  const chartData = sourceData.map((s) => ({
    name: LEAD_SOURCES[s.source as keyof typeof LEAD_SOURCES]?.label || s.source,
    value: s.count,
    color: LEAD_SOURCES[s.source as keyof typeof LEAD_SOURCES]?.color || "#717478",
  }));

  return (
    <WidgetWrapper
      title="Lead Velocity"
      subtitle="Intake volume and source breakdown"
      loading={loading}
      empty={sourceData.length === 0 && newThisMonth === 0}
      emptyTitle="No leads yet"
      emptyDescription="Start capturing leads to track velocity."
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Velocity Metrics */}
        <div className="space-y-4">
          {[
            { label: "New Today", value: newToday, color: "#3b82f6" },
            { label: "This Week", value: newThisWeek, color: "#f97316" },
            { label: "This Month", value: newThisMonth, color: "#eab308" },
            { label: "Qualified", value: qualified, color: "#10b981" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text-color)" }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Source Pie Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card-bg-solid)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "var(--text-color)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3" style={{ borderTop: "1px solid var(--card-border)" }}>
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-[10px] text-muted-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}
