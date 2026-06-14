"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import { WidgetWrapper } from "./widget-wrapper";

export interface CountDatum { name: string; count: number; color?: string; }
export interface TrendDatum { date: string; count: number; }

const tooltipStyle = {
  background: "var(--card-bg-solid)",
  border: "1px solid var(--card-border)",
  borderRadius: "12px",
  fontSize: "12px",
  color: "var(--text-color)",
};

export function ProspectsBySourceChart({ data, loading }: { data: CountDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Prospects by Source"
      subtitle="Where qualified prospects came from"
      loading={loading}
      empty={data.every(d => d.count === 0)}
      emptyTitle="No source data"
      emptyDescription="Prospects will be grouped by source once available."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value} prospects`, "Count"]} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--graph-to)" fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}

export function ProspectsStageFunnel({ data, loading }: { data: CountDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Stage Funnel"
      subtitle="Prospects at each pipeline stage"
      loading={loading}
      empty={data.every(d => d.count === 0)}
      emptyTitle="No stage data"
      emptyDescription="Prospects will be grouped by stage once available."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value} prospects`, "Count"]} />
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

export function ProspectsIndustryBreakdown({ data, loading }: { data: CountDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Industry Breakdown"
      subtitle="Distribution of prospects by industry"
      loading={loading}
      empty={data.every(d => d.count === 0)}
      emptyTitle="No industry data"
      emptyDescription="Prospects will be grouped by industry once available."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any, name: any) => [`${value} prospects`, name]} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "var(--muted-foreground)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}

export function ProspectsQualifiedTrend({ data, loading }: { data: TrendDatum[]; loading?: boolean }) {
  return (
    <WidgetWrapper
      title="Prospects Qualified"
      subtitle="Qualification activity over time"
      loading={loading}
      empty={data.every(d => d.count === 0)}
      emptyTitle="No trend data"
      emptyDescription="Prospects qualified over time will appear here."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value} prospects`, "Qualified"]} />
            <Line type="monotone" dataKey="count" stroke="var(--graph-to)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--graph-to)", strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </WidgetWrapper>
  );
}
