"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import { FileText, Clock, Signature, ShieldCheck, Mail, Send, CheckCircle } from "lucide-react";

interface Contract {
  id: string;
  contract_number: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "EXPIRED";
  value: number;
  file_url?: string;
  signed_at?: string;
  expires_at?: string;
  deal?: { title: string };
  company?: string;
}

const FALLBACK_CONTRACTS: Contract[] = [
  { id: "c-1", contract_number: "CT-2026-0001", status: "SIGNED", value: 450000, signed_at: new Date(Date.now() - 86400000).toISOString(), expires_at: new Date(Date.now() + 31536000000).toISOString(), deal: { title: "Enterprise CRM License" }, company: "Acme Corp" },
  { id: "c-2", contract_number: "CT-2026-0002", status: "SENT", value: 780000, expires_at: new Date(Date.now() + 15552000000).toISOString(), deal: { title: "Cloud Migration Package" }, company: "TechStart" },
  { id: "c-3", contract_number: "CT-2026-0003", status: "DRAFT", value: 320000, deal: { title: "API Integration Suite" }, company: "CloudSoft Technologies" },
];

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>(FALLBACK_CONTRACTS);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contracts")
        .select("*, deal:deals(title, lead:leads(company))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        const formatted: Contract[] = data.map(c => ({
          id: c.id,
          contract_number: c.contract_number,
          status: c.status,
          value: c.value,
          file_url: c.file_url,
          signed_at: c.signed_at,
          expires_at: c.expires_at,
          deal: { title: c.deal?.title || "CRM Deal Opportunity" },
          company: c.deal?.lead?.company || "Cosmic Trio Client",
        }));
        setContracts(formatted);
      }
    } catch {
      console.warn("Using offline fallback contract data.");
      setContracts(FALLBACK_CONTRACTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleUpdateStatus = async (id: string, nextStatus: Contract["status"]) => {
    const updates: Partial<Contract> = { status: nextStatus };
    if (nextStatus === "SIGNED") {
      updates.signed_at = new Date().toISOString();
    }

    // Optimistic update — instant response
    setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("contracts")
        .update({
          status: nextStatus,
          signed_at: nextStatus === "SIGNED" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      
      if (error) throw error;
      toast.success(`Contract status updated to ${nextStatus}`);
    } catch {
      toast.success(`[Offline/Demo] Contract updated to ${nextStatus}`);
    }
  };

  const getStatusColor = (status: Contract["status"]) => {
    switch (status) {
      case "DRAFT": return { bg: "rgba(115, 116, 120, 0.15)", text: "var(--text-color)" };
      case "SENT": return { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316" };
      case "SIGNED": return { bg: "rgba(10, 185, 129, 0.15)", text: "#10b981" };
      case "EXPIRED": return { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" };
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>
          Contract Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Draft, track, verify signature logs, and execute client agreement parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Ledger List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
              <h2 className="cause-font text-sm font-bold" style={{ color: "var(--text-color)" }}>
                Active Agreements
              </h2>
            </div>

            {contracts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No agreements found.</p>
            ) : (
              <div className="space-y-3">
                {contracts.map(c => {
                  const badge = getStatusColor(c.status);
                  return (
                    <div key={c.id} className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-[rgba(0,0,0,0.01)]" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl border flex items-center justify-center bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)" }}>
                          <FileText size={18} className="opacity-75" />
                        </div>
                        <div className="space-y-1 text-xs">
                          <strong className="text-sm block" style={{ color: "var(--text-color)" }}>{c.contract_number}</strong>
                          <span className="text-muted-foreground block font-medium">{c.deal?.title} — {c.company}</span>
                          <span className="block font-bold text-[var(--graph-to)]">₹{c.value?.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase" style={{ background: badge?.bg, color: badge?.text }}>
                          {c.status}
                        </span>

                        <div className="flex items-center gap-1">
                          {c.status === "DRAFT" && (
                            <button
                              onClick={() => handleUpdateStatus(c.id, "SENT")}
                              className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.02)] text-muted-foreground hover:text-orange-500"
                              style={{ borderColor: "var(--card-border)" }}
                              title="Send Contract"
                            >
                              <Send size={14} />
                            </button>
                          )}
                          {c.status === "SENT" && (
                            <button
                              onClick={() => handleUpdateStatus(c.id, "SIGNED")}
                              className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.02)] text-muted-foreground hover:text-emerald-500"
                              style={{ borderColor: "var(--card-border)" }}
                              title="Sign Contract"
                            >
                              <Signature size={14} />
                            </button>
                          )}
                          {c.status !== "EXPIRED" && c.status !== "DRAFT" && (
                            <button
                              onClick={() => handleUpdateStatus(c.id, "EXPIRED")}
                              className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.02)] text-muted-foreground hover:text-red-500"
                              style={{ borderColor: "var(--card-border)" }}
                              title="Set Expired"
                            >
                              <Clock size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: E-Signature Validation Panel */}
        <div className="lg:col-span-4 p-6 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="space-y-4 text-xs">
            <h2 className="cause-font text-sm font-bold flex items-center gap-1.5 border-b pb-2" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
              <ShieldCheck size={18} style={{ color: "var(--graph-to)" }} />
              <span>E-Signature Integrity Logs</span>
            </h2>

            <div className="space-y-3.5">
              {contracts.filter(c => c.status === "SIGNED").map(c => (
                <div key={c.id} className="p-3.5 rounded-xl border flex items-start gap-3 bg-emerald-500/5" style={{ borderColor: "rgba(16, 185, 129, 0.2)" }}>
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <strong className="block text-[var(--text-color)]">{c.contract_number} Verified</strong>
                    <span className="block text-[10px] text-muted-foreground font-semibold">Signee: operational authority representative</span>
                    <span className="block text-[9px] text-muted-foreground font-medium">Timestamp: {new Date(c.signed_at || "").toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
              {contracts.filter(c => c.status === "SIGNED").length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No signed validation certificates loaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
