"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { WidgetWrapper } from "./widget-wrapper";

interface PipelineStage {
  name: string;
  count: number;
  value: number;
  color: string;
  conversionRate?: number;
}

interface PipelineFunnelProps {
  data: PipelineStage[];
  loading?: boolean;
}

export function PipelineFunnel({ data, loading }: PipelineFunnelProps) {
  return (
    <WidgetWrapper
      title="Sales Pipeline"
      subtitle="Conversion funnel across stages"
      loading={loading}
      empty={data.length === 0}
      emptyTitle="No pipeline data"
      emptyDescription="Create your first deal to see the pipeline."
    >
      <div className="flex flex-col gap-4">
        {/* Funnel Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card-bg-solid)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "var(--text-color)",
                }}
                formatter={(value: any) => [`${value} deals`, "Count"]}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stage breakdown */}
        <div className="grid grid-cols-5 gap-2">
          {data.map((stage, i) => (
            <div key={stage.name} className="text-center">
              <div className="text-xs font-semibold" style={{ color: stage.color }}>
                {stage.count}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{stage.name}</div>
              {i < data.length - 1 && stage.conversionRate !== undefined && (
                <div className="text-[9px] mt-1" style={{ color: "var(--graph-to)" }}>
                  {stage.conversionRate}% →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
}
