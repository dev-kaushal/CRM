"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import {
  TrendingUp, DollarSign, Target, Zap, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Calendar
} from "lucide-react";

// ============================================
// Types & Demo Data
// ============================================
interface AnalyticsData {
  totalRevenue: number;
  conversionRate: number;
  avgDealSize: number;
  pipelineVelocity: number;
  revenueChange: number;
  conversionChange: number;
  dealSizeChange: number;
  velocityChange: number;
  monthlyRevenue: { month: string; value: number }[];
  funnelStages: { name: string; count: number; color: string; percent: number }[];
  sourceBreakdown: { source: string; count: number; color: string }[];
  dealStages: { stage: string; count: number; value: number; color: string }[];
  winLossRatio: { won: number; lost: number };
}

const DEMO_DATA: AnalyticsData = {
  totalRevenue: 4250000,
  conversionRate: 34.5,
  avgDealSize: 236000,
  pipelineVelocity: 18,
  revenueChange: 12.5,
  conversionChange: 4.1,
  dealSizeChange: -2.3,
  velocityChange: 8.7,
  monthlyRevenue: [
    { month: "Jan", value: 520000 },
    { month: "Feb", value: 610000 },
    { month: "Mar", value: 580000 },
    { month: "Apr", value: 720000 },
    { month: "May", value: 850000 },
    { month: "Jun", value: 970000 },
  ],
  funnelStages: [
    { name: "Leads", count: 248, color: "#3b82f6", percent: 100 },
    { name: "Prospects", count: 142, color: "#f97316", percent: 57 },
    { name: "Deals", count: 86, color: "#eab308", percent: 35 },
    { name: "Contracts", count: 52, color: "#8b5cf6", percent: 21 },
    { name: "Customers", count: 38, color: "#10b981", percent: 15 },
  ],
  sourceBreakdown: [
    { source: "Google Ads", count: 82, color: "#4285f4" },
    { source: "Meta Ads", count: 56, color: "#1877f2" },
    { source: "Referral", count: 44, color: "#10b981" },
    { source: "Direct", count: 38, color: "#8b5cf6" },
    { source: "WhatsApp", count: 28, color: "#25d366" },
  ],
  dealStages: [
    { stage: "New", count: 12, value: 600000, color: "#3b82f6" },
    { stage: "Proposal", count: 8, value: 400000, color: "#f97316" },
    { stage: "Negotiation", count: 6, value: 300000, color: "#eab308" },
    { stage: "Contract", count: 4, value: 200000, color: "#8b5cf6" },
    { stage: "Won", count: 18, value: 900000, color: "#10b981" },
    { stage: "Lost", count: 5, value: 250000, color: "#ef4444" },
  ],
  winLossRatio: { won: 18, lost: 5 },
};

// ============================================
// Component
// ============================================
export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(DEMO_DATA);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("quarter");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const [dealsRes, leadsRes, contractsRes] = await Promise.all([
        supabase.from("deals").select("*"),
        supabase.from("leads").select("*"),
        supabase.from("contracts").select("*"),
      ]);

      if (dealsRes.error || leadsRes.error || contractsRes.error) throw new Error("Fetch failed");

      const deals = dealsRes.data || [];
      const leads = leadsRes.data || [];
      const contracts = contractsRes.data || [];

      if (deals.length > 0 || leads.length > 0) {
        const wonDeals = deals.filter((d: any) => d.stage === "won" || d.stage === "WON");
        const lostDeals = deals.filter((d: any) => d.stage === "lost" || d.stage === "LOST");
        const totalRev = wonDeals.reduce((s: number, d: any) => s + (d.value || d.estimated_value || 0), 0);
        const avgDeal = wonDeals.length > 0 ? totalRev / wonDeals.length : 0;

        setData(prev => ({
          ...prev,
          totalRevenue: totalRev || prev.totalRevenue,
          avgDealSize: avgDeal || prev.avgDealSize,
          winLossRatio: { won: wonDeals.length || prev.winLossRatio.won, lost: lostDeals.length || prev.winLossRatio.lost },
        }));
      }
    } catch {
      console.warn("Using offline fallback analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const maxRevenue = Math.max(...data.monthlyRevenue.map(m => m.value));
  const maxSource = Math.max(...data.sourceBreakdown.map(s => s.count));
  const totalDeals = data.dealStages.reduce((s, d) => s + d.count, 0);
  const winRate = data.winLossRatio.won + data.winLossRatio.lost > 0
    ? Math.round((data.winLossRatio.won / (data.winLossRatio.won + data.winLossRatio.lost)) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance reports — funnel analysis, revenue trends, and source attribution.</p>
        </div>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
          className="h-9 px-3 rounded-xl text-xs border bg-transparent cursor-pointer"
          style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: `₹${(data.totalRevenue / 100000).toFixed(1)}L`, change: data.revenueChange, icon: DollarSign, color: "#10b981" },
          { label: "Conversion Rate", value: `${data.conversionRate}%`, change: data.conversionChange, icon: Target, color: "var(--graph-to)" },
          { label: "Avg. Deal Size", value: `₹${(data.avgDealSize / 1000).toFixed(0)}K`, change: data.dealSizeChange, icon: TrendingUp, color: "#3b82f6" },
          { label: "Pipeline Velocity", value: `${data.pipelineVelocity}d`, change: data.velocityChange, icon: Zap, color: "#8b5cf6" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-4 border transition-all duration-200 hover:shadow-md" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              <kpi.icon size={14} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
            <div className="flex items-center gap-1 mt-1.5">
              {kpi.change >= 0 ? <ArrowUpRight size={12} style={{ color: "#10b981" }} /> : <ArrowDownRight size={12} style={{ color: "#ef4444" }} />}
              <span className="text-[10px] font-bold" style={{ color: kpi.change >= 0 ? "#10b981" : "#ef4444" }}>
                {kpi.change >= 0 ? "+" : ""}{kpi.change}%
              </span>
              <span className="text-[10px] text-muted-foreground ml-0.5">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Revenue Trend + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Monthly Revenue</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Last 6 months performance</p>
            </div>
            <BarChart3 size={16} className="text-muted-foreground" />
          </div>
          <div className="flex items-end gap-3 h-48">
            {data.monthlyRevenue.map((m, i) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[9px] font-bold" style={{ color: "var(--graph-to)" }}>
                  ₹{(m.value / 100000).toFixed(1)}L
                </span>
                <div className="w-full rounded-t-lg transition-all duration-700 hover:opacity-80" style={{
                  height: `${(m.value / maxRevenue) * 100}%`,
                  background: `linear-gradient(180deg, var(--graph-to), var(--graph-from))`,
                  minHeight: "8px",
                }} />
                <span className="text-[9px] font-bold text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Lead Conversion Funnel</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pipeline stage progression</p>
            </div>
            <Target size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {data.funnelStages.map((stage, i) => (
              <div key={stage.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold" style={{ color: "var(--text-color)" }}>{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black" style={{ color: stage.color }}>{stage.count}</span>
                    {i > 0 && (
                      <span className="text-[9px] text-muted-foreground">
                        ({stage.percent}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{
                    width: `${stage.percent}%`,
                    background: stage.color,
                  }} />
                </div>
                {i < data.funnelStages.length - 1 && (
                  <div className="flex justify-center my-1">
                    <span className="text-[8px] font-bold text-muted-foreground">
                      ↓ {data.funnelStages[i + 1] ? Math.round((data.funnelStages[i + 1].count / stage.count) * 100) : 0}% conversion
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Source Attribution + Deal Distribution + Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Source Attribution */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Lead Sources</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Attribution breakdown</p>
            </div>
            <PieChart size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {data.sourceBreakdown.map(s => (
              <div key={s.source}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-color)" }}>{s.source}</span>
                  </div>
                  <span className="text-xs font-black" style={{ color: s.color }}>{s.count}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.count / maxSource) * 100}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deal Stage Distribution */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Deal Stages</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pipeline distribution</p>
            </div>
            <BarChart3 size={16} className="text-muted-foreground" />
          </div>
          {/* Stacked horizontal bar */}
          <div className="w-full h-8 rounded-xl overflow-hidden flex mb-4">
            {data.dealStages.map(d => (
              <div key={d.stage} className="h-full transition-all duration-500 hover:opacity-80 relative group"
                style={{ width: `${(d.count / totalDeals) * 100}%`, background: d.color, minWidth: "4px" }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "var(--card-bg-solid)", color: d.color, border: "1px solid var(--card-border)" }}>
                  {d.stage}: {d.count}
                </div>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="space-y-2.5">
            {data.dealStages.map(d => (
              <div key={d.stage} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded" style={{ background: d.color }} />
                  <span className="text-[10px] font-semibold" style={{ color: "var(--text-color)" }}>{d.stage}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold" style={{ color: d.color }}>{d.count} deals</span>
                  <span className="text-[10px] text-muted-foreground">₹{(d.value / 100000).toFixed(1)}L</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Win/Loss Ratio */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Win/Loss Ratio</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Deal outcome analysis</p>
            </div>
          </div>
          {/* Circular progress */}
          <div className="flex flex-col items-center py-4">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--accent)" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="#10b981" strokeWidth="10"
                  strokeDasharray={`${(winRate / 100) * 327} 327`}
                  strokeLinecap="round"
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: "#10b981" }}>{winRate}%</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Win Rate</span>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-lg font-black" style={{ color: "#10b981" }}>{data.winLossRatio.won}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Won</p>
              </div>
              <div className="w-px h-8" style={{ background: "var(--card-border)" }} />
              <div className="text-center">
                <p className="text-lg font-black" style={{ color: "#ef4444" }}>{data.winLossRatio.lost}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Lost</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
