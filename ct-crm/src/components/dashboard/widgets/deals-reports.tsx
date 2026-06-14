"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { WidgetWrapper } from "./widget-wrapper";
import type { CountDatum } from "./prospects-reports";

export interface DealTrendDatum { date: string; created: number; closing: number }

const tooltipStyle = {
  background: "var(--card-bg-solid)",
  border: "1px solid var(--card-border)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "var(--text-color)",
};

export function DealsByStageFunnel({ data, loading }: { data: CountDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Deals by Stage"
      subtitle="Pipeline distribution across stages"
      loading={loading}
      empty={data.every(d => d.count === 0)}
      emptyTitle="No stage data"
      emptyDescription="Deals will be grouped by stage once available."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value} deals`, "Count"]} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color || "var(--graph-to)"} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}

const PIE_COLORS = ["#3b82f6", "#f97316", "#eab308", "#10b981", "#ef4444", "#a855f7", "#94a3b8", "#00f2fe"];

export function DealsByTypeBreakdown({ data, loading }: { data: CountDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Deals by Type"
      subtitle="New business vs. existing-account activity"
      loading={loading}
      empty={data.every(d => d.count === 0)}
      emptyTitle="No type data"
      emptyDescription="Deals will be grouped by type once available."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any) => [`${value} deals`, name]} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "var(--muted-foreground)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}

export function DealsByCampaignSourceChart({ data, loading }: { data: CountDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Deals by Campaign Source"
      subtitle="Which campaigns are generating opportunities"
      loading={loading}
      empty={data.every(d => d.count === 0)}
      emptyTitle="No campaign data"
      emptyDescription="Deals will be grouped by campaign source once available."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value} deals`, "Count"]} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--graph-to)" fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}

export function DealsCreatedVsClosingTrend({ data, loading }: { data: DealTrendDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Created vs. Closing"
      subtitle="Deals created vs. expected to close over time"
      loading={loading}
      empty={data.every(d => d.created === 0 && d.closing === 0)}
      emptyTitle="No trend data"
      emptyDescription="Deal creation and close-date activity will appear here."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "var(--muted-foreground)" }} />
            <Line type="monotone" dataKey="created" name="Created" stroke="var(--graph-to)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--graph-to)", strokeWidth: 0 }} />
            <Line type="monotone" dataKey="closing" name="Closing" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}
