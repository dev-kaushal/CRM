"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import {
  Search, Building, Mail, Shield, TrendingUp, Users, DollarSign,
  ChevronDown, ChevronUp, FileText, Handshake, Clock, Activity
} from "lucide-react";

// ============================================
// Types
// ============================================
interface Customer {
  id: string;
  contact_name: string;
  company: string;
  email: string;
  lifetime_value: number;
  customer_since: string;
  status: string;
  contract_status?: string;
  contract_title?: string;
  contract_value?: number;
  total_deals?: number;
  total_interactions?: number;
  health_score?: number;
}

// ============================================
// Fallback Demo Data
// ============================================
const FALLBACK_CUSTOMERS: Customer[] = [
  { id: "c1", contact_name: "Vikram Singh", company: "Acme Corp", email: "vikram@acmecorp.in", lifetime_value: 1250000, customer_since: new Date(Date.now() - 86400000 * 180).toISOString(), status: "ACTIVE", contract_status: "signed", contract_title: "Enterprise Annual License", contract_value: 450000, total_deals: 4, total_interactions: 32, health_score: 92 },
  { id: "c2", contact_name: "Neha Patel", company: "TechStart", email: "neha@techstart.io", lifetime_value: 380000, customer_since: new Date(Date.now() - 86400000 * 120).toISOString(), status: "ACTIVE", contract_status: "signed", contract_title: "Growth Plan Subscription", contract_value: 120000, total_deals: 2, total_interactions: 18, health_score: 78 },
  { id: "c3", contact_name: "Arjun Mehta", company: "CloudSoft Technologies", email: "arjun@cloudsoft.in", lifetime_value: 920000, customer_since: new Date(Date.now() - 86400000 * 365).toISOString(), status: "ACTIVE", contract_status: "signed", contract_title: "Platform License + Support", contract_value: 320000, total_deals: 5, total_interactions: 47, health_score: 95 },
  { id: "c4", contact_name: "Sanya Reddy", company: "DataFlow Inc", email: "sanya@dataflow.co", lifetime_value: 150000, customer_since: new Date(Date.now() - 86400000 * 45).toISOString(), status: "ACTIVE", contract_status: "sent", contract_title: "Starter Package", contract_value: 80000, total_deals: 1, total_interactions: 8, health_score: 55 },
  { id: "c5", contact_name: "Rohan Joshi", company: "NovaTech Labs", email: "rohan@novatech.in", lifetime_value: 680000, customer_since: new Date(Date.now() - 86400000 * 240).toISOString(), status: "ACTIVE", contract_status: "signed", contract_title: "Enterprise Migration Deal", contract_value: 280000, total_deals: 3, total_interactions: 25, health_score: 84 },
  { id: "c6", contact_name: "Meera Iyer", company: "Horizon Media", email: "meera@horizonmedia.in", lifetime_value: 45000, customer_since: new Date(Date.now() - 86400000 * 20).toISOString(), status: "AT_RISK", contract_status: "draft", contract_title: "Trial Extension", contract_value: 30000, total_deals: 1, total_interactions: 3, health_score: 28 },
  { id: "c7", contact_name: "Karan Deshmukh", company: "BluePeak Industries", email: "karan@bluepeak.co", lifetime_value: 2100000, customer_since: new Date(Date.now() - 86400000 * 500).toISOString(), status: "ACTIVE", contract_status: "signed", contract_title: "Multi-Year Strategic Partnership", contract_value: 750000, total_deals: 7, total_interactions: 62, health_score: 98 },
  { id: "c8", contact_name: "Priya Nair", company: "Global Systems", email: "priya@globalsys.in", lifetime_value: 520000, customer_since: new Date(Date.now() - 86400000 * 300).toISOString(), status: "CHURNED", contract_status: "expired", contract_title: "Annual Maintenance Contract", contract_value: 180000, total_deals: 3, total_interactions: 14, health_score: 12 },
];

function getHealthColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function getHealthLabel(score: number): string {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "At Risk";
  return "Critical";
}

// ============================================
// Component
// ============================================
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(FALLBACK_CUSTOMERS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("customer_since", { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) setCustomers(data);
    } catch {
      console.warn("Using offline fallback customers data.");
      setCustomers(FALLBACK_CUSTOMERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = customers.filter(c => {
    const matchSearch = c.contact_name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // KPI calculations
  const totalLTV = customers.reduce((sum, c) => sum + (c.lifetime_value || 0), 0);
  const avgLTV = customers.length > 0 ? totalLTV / customers.length : 0;
  const activeCount = customers.filter(c => c.status === "ACTIVE").length;
  const churnedCount = customers.filter(c => c.status === "CHURNED").length;
  const churnRate = customers.length > 0 ? ((churnedCount / customers.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">Active customer retainer panel with lifetime value tracking and account health monitoring.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: customers.length.toString(), color: "var(--graph-to)", icon: Users },
          { label: "Total LTV", value: `₹${(totalLTV / 100000).toFixed(1)}L`, color: "#10b981", icon: DollarSign },
          { label: "Avg. LTV", value: `₹${(avgLTV / 1000).toFixed(0)}K`, color: "#3b82f6", icon: TrendingUp },
          { label: "Churn Rate", value: `${churnRate.toFixed(1)}%`, color: churnRate > 10 ? "#ef4444" : "#10b981", icon: Activity },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-4 border transition-all duration-200 hover:shadow-md" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              <kpi.icon size={14} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-black mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-2 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-9 pr-4 rounded-xl text-xs bg-transparent border placeholder:opacity-50"
            style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-xl text-xs border bg-transparent cursor-pointer"
          style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="AT_RISK">At Risk</option>
          <option value="CHURNED">Churned</option>
        </select>
      </div>

      {/* Customer Table */}
      {loading ? (
        <WidgetWrapper loading><div /></WidgetWrapper>
      ) : filtered.length === 0 ? (
        <WidgetWrapper empty emptyTitle="No customers found" emptyDescription="Customers will appear here once deals are converted."><div /></WidgetWrapper>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
                <th className="p-4 font-bold uppercase tracking-wider w-8"></th>
                <th className="p-4 font-bold uppercase tracking-wider">Customer</th>
                <th className="p-4 font-bold uppercase tracking-wider">Company</th>
                <th className="p-4 font-bold uppercase tracking-wider">Email</th>
                <th className="p-4 font-bold uppercase tracking-wider">Lifetime Value</th>
                <th className="p-4 font-bold uppercase tracking-wider">Since</th>
                <th className="p-4 font-bold uppercase tracking-wider">Health</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-color)" }}>
              {filtered.map(customer => {
                const isExpanded = expandedId === customer.id;
                const healthScore = customer.health_score || 50;
                const healthColor = getHealthColor(healthScore);
                return (
                  <>
                    <tr key={customer.id}
                      className="border-b transition-colors cursor-pointer hover:bg-[rgba(0,0,0,0.02)]"
                      style={{ borderColor: "var(--card-border)", opacity: customer.status === "CHURNED" ? 0.55 : 1 }}
                      onClick={() => setExpandedId(isExpanded ? null : customer.id)}>
                      <td className="p-4">
                        {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                      </td>
                      <td className="p-4 font-bold">{customer.contact_name}</td>
                      <td className="p-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Building size={12} className="opacity-60" /><span>{customer.company}</span></div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5"><Mail size={12} className="opacity-60" /><span>{customer.email}</span></div>
                      </td>
                      <td className="p-4 font-bold" style={{ color: "var(--graph-to)" }}>₹{customer.lifetime_value?.toLocaleString("en-IN")}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(customer.customer_since).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${healthScore}%`, background: healthColor }} />
                          </div>
                          <span className="text-[9px] font-extrabold uppercase" style={{ color: healthColor }}>{healthScore}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide" style={{
                          background: customer.status === "ACTIVE" ? "rgba(16,185,129,0.15)" : customer.status === "AT_RISK" ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                          color: customer.status === "ACTIVE" ? "#10b981" : customer.status === "AT_RISK" ? "#eab308" : "#ef4444",
                        }}>
                          {customer.status}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr key={`${customer.id}-detail`} className="border-b" style={{ borderColor: "var(--card-border)" }}>
                        <td colSpan={8} className="p-0">
                          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ background: "var(--accent)" }}>
                            {/* Contract Info */}
                            <div className="rounded-xl p-4 border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                              <div className="flex items-center gap-2 mb-3">
                                <FileText size={14} style={{ color: "#8b5cf6" }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Contract</span>
                              </div>
                              <p className="text-xs font-bold" style={{ color: "var(--text-color)" }}>{customer.contract_title || "No contract"}</p>
                              <p className="text-lg font-black mt-1" style={{ color: "#8b5cf6" }}>₹{(customer.contract_value || 0).toLocaleString("en-IN")}</p>
                              {customer.contract_status && (
                                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase" style={{
                                  background: customer.contract_status === "signed" ? "rgba(16,185,129,0.15)" : "rgba(113,116,120,0.15)",
                                  color: customer.contract_status === "signed" ? "#10b981" : "#717478",
                                }}>{customer.contract_status}</span>
                              )}
                            </div>

                            {/* Deal History */}
                            <div className="rounded-xl p-4 border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Handshake size={14} style={{ color: "#10b981" }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal History</span>
                              </div>
                              <p className="text-lg font-black" style={{ color: "#10b981" }}>{customer.total_deals || 0}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Total deals closed</p>
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] font-bold" style={{ color: "var(--text-color)" }}>LTV per deal:</span>
                                <span className="text-[10px] font-bold" style={{ color: "var(--graph-to)" }}>
                                  ₹{customer.total_deals ? (customer.lifetime_value / customer.total_deals).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0"}
                                </span>
                              </div>
                            </div>

                            {/* Engagement */}
                            <div className="rounded-xl p-4 border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Activity size={14} style={{ color: "#3b82f6" }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Engagement</span>
                              </div>
                              <p className="text-lg font-black" style={{ color: "#3b82f6" }}>{customer.total_interactions || 0}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Total interactions</p>
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-muted-foreground">Account Health</span>
                                  <span className="text-[10px] font-bold" style={{ color: healthColor }}>{getHealthLabel(healthScore)}</span>
                                </div>
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
                                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${healthScore}%`, background: healthColor }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
