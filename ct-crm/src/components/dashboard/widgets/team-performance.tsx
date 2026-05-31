"use client";

import { WidgetWrapper } from "./widget-wrapper";

interface TeamMember {
  name: string;
  avatar?: string;
  revenue: number;
  dealsWon: number;
  conversionRate: number;
  callsMade: number;
  tasksCompleted: number;
}

interface TeamPerformanceProps {
  members: TeamMember[];
  loading?: boolean;
}

export function TeamPerformance({ members, loading }: TeamPerformanceProps) {
  const sorted = [...members].sort((a, b) => b.revenue - a.revenue);

  return (
    <WidgetWrapper
      title="Team Performance"
      subtitle="Sales leaderboard — Admin & Manager view"
      loading={loading}
      empty={members.length === 0}
      emptyTitle="No team data"
      emptyDescription="Team performance will appear once deals are assigned."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">#</th>
              <th className="text-left py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rep</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Won</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Conv %</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Calls</th>
              <th className="text-right py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((member, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
              const initials = member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <tr
                  key={member.name}
                  className="transition-colors hover:bg-accent/50"
                  style={{ borderBottom: "1px solid var(--card-border)" }}
                >
                  <td className="py-2.5 text-sm">{medal}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #a855f7, #00f2fe)", color: "#0a0a0a" }}
                      >
                        {initials}
                      </div>
                      <span className="text-sm font-medium" style={{ color: "var(--text-color)" }}>
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="text-sm font-semibold" style={{ color: "#10b981" }}>
                      ₹{(member.revenue / 100000).toFixed(1)}L
                    </span>
                  </td>
                  <td className="py-2.5 text-right text-sm" style={{ color: "var(--text-color)" }}>
                    {member.dealsWon}
                  </td>
                  <td className="py-2.5 text-right text-sm" style={{ color: "var(--graph-to)" }}>
                    {member.conversionRate}%
                  </td>
                  <td className="py-2.5 text-right text-sm text-muted-foreground">{member.callsMade}</td>
                  <td className="py-2.5 text-right text-sm text-muted-foreground">{member.tasksCompleted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </WidgetWrapper>
  );
}
