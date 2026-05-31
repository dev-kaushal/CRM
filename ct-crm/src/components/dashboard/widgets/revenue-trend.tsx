"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WidgetWrapper } from "./widget-wrapper";

interface RevenueDataPoint {
  month: string;
  revenue: number;
  forecast?: number;
}

interface RevenueTrendProps {
  data: RevenueDataPoint[];
  loading?: boolean;
}

const TIME_PERIODS = ["7D", "30D", "90D", "12M"] as const;

export function RevenueTrend({ data, loading }: RevenueTrendProps) {
  const [activePeriod, setActivePeriod] = useState<typeof TIME_PERIODS[number]>("12M");

  return (
    <WidgetWrapper
      title="Revenue Analytics"
      subtitle="Revenue trend and forecast"
      loading={loading}
      empty={data.length === 0}
      emptyTitle="No revenue data"
      emptyDescription="Close your first deal to start tracking revenue."
      headerAction={
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--accent)" }}>
          {TIME_PERIODS.map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all"
              style={{
                background: activePeriod === period ? "var(--card-bg-solid)" : "transparent",
                color: activePeriod === period ? "var(--text-color)" : "var(--muted-foreground)",
                boxShadow: activePeriod === period ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {period}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--graph-to)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--graph-to)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--card-border)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card-bg-solid)",
                border: "1px solid var(--card-border)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "var(--text-color)",
              }}
              formatter={(value: number) => [`₹${(value / 100000).toFixed(1)}L`, ""]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--graph-to)"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--graph-to)", strokeWidth: 0 }}
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#forecastGrad)"
              dot={false}
              name="Forecast"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}
