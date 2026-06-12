"use client";

import { useEffect, useState } from "react";
import { getDeals, updateDealStage, createDeal } from "@/server/deals";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import { DollarSign, ShieldAlert, Award, Calculator, Layers, ArrowRightLeft, Plus } from "lucide-react";

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: "NEW" | "PROPOSAL" | "NEGOTIATION" | "CONTRACT" | "WON" | "LOST";
  probability: number;
  expected_close_date?: string;
  company_name?: string;
  lead?: {
    company: string;
    first_name: string;
    last_name: string;
  };
}

const STAGE_MULTIPLIERS = {
  NEW: 10,
  PROPOSAL: 30,
  NEGOTIATION: 60,
  CONTRACT: 80,
  WON: 100,
  LOST: 0,
};

const STAGES: Deal["stage"][] = ["NEW", "PROPOSAL", "NEGOTIATION", "CONTRACT", "WON", "LOST"];

const FALLBACK_DEALS: Deal[] = [
  { id: "d-1", title: "Enterprise CRM License", value: 450000, stage: "WON", probability: 100, company_name: "Acme Corp" },
  { id: "d-2", title: "Cloud Migration Package", value: 780000, stage: "CONTRACT", probability: 80, company_name: "TechStart" },
  { id: "d-3", title: "API Integration Suite", value: 320000, stage: "NEGOTIATION", probability: 60, company_name: "CloudSoft Technologies" },
  { id: "d-4", title: "Data Analytics Platform", value: 550000, stage: "PROPOSAL", probability: 30, company_name: "DataFlow Inc" },
  { id: "d-5", title: "AI Chatbot Integration", value: 180000, stage: "NEW", probability: 10, company_name: "NovaTech Labs" },
  { id: "d-6", title: "HR Automation Suite", value: 290000, stage: "LOST", probability: 0, company_name: "BrightPath Systems" },
];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(FALLBACK_DEALS);
  const [loading, setLoading] = useState(true);
  const [isForecastView, setIsForecastView] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Deal Form State
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Deal["stage"]>("NEW");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const rows = await getDeals();
      if (rows.length > 0) {
        setDeals(rows as Deal[]);
      }
    } catch {
      console.warn("Using offline fallback deal data.");
      setDeals(FALLBACK_DEALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleUpdateStage = async (id: string, nextStage: Deal["stage"]) => {
    const prob = STAGE_MULTIPLIERS[nextStage];
    // Optimistic update — instant response
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: nextStage, probability: prob } : d));
    
    try {
      await updateDealStage(id, nextStage, prob);
      toast.success(`Deal shifted to ${nextStage}`);
    } catch {
      toast.error("Failed to update deal stage");
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !value) {
      toast.error("Please enter a valid title and deal value");
      return;
    }

    setSubmitting(true);
    const prob = STAGE_MULTIPLIERS[stage];
    const dealValueNum = parseFloat(value) || 0;

    try {
      await createDeal({ title, value: dealValueNum, stage, probability: prob, company_name: companyName });
      toast.success("Deal pipeline record created");
      setIsModalOpen(false);
      resetForm();
      fetchDeals();
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setValue("");
    setStage("NEW");
    setCompanyName("");
  };

  // Calculate Pipeline Sums
  const calculateTotalValue = () => {
    return deals.reduce((sum, d) => sum + (isForecastView ? d.value * (d.probability / 100) : d.value), 0);
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>
            Deal Pipeline Board
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track deal stages, values, and closure forecast dynamics visually.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Forecast Toggle */}
          <button
            onClick={() => setIsForecastView(!isForecastView)}
            className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-[var(--card-border)] hover:bg-[rgba(0,0,0,0.02)]"
            style={{
              background: isForecastView ? "rgba(0, 242, 254, 0.12)" : "transparent",
              color: isForecastView ? "var(--graph-to)" : "var(--text-color)",
              borderColor: isForecastView ? "var(--graph-to)" : "var(--card-border)"
            }}
          >
            <Calculator size={14} />
            <span>{isForecastView ? "Weighted Forecast Active" : "Show Weighted Forecast"}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            style={{ background: "var(--graph-to)", color: "#0a0a0a" }}
          >
            <Plus size={16} />
            <span>New Deal</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Pipeline Velocity Value</span>
          <span className="cause-font text-xl font-bold" style={{ color: "var(--text-color)" }}>
            ₹{calculateTotalValue().toLocaleString("en-IN")}
            {isForecastView && <span className="text-xs text-muted-foreground ml-1.5 font-normal italic">(Weighted Forecast)</span>}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Active Opportunities</span>
          <span className="cause-font text-xl font-bold" style={{ color: "var(--text-color)" }}>
            {deals.filter(d => d.stage !== "WON" && d.stage !== "LOST").length} deals
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Won Closures</span>
          <span className="cause-font text-xl font-bold" style={{ color: "var(--text-color)" }}>
            {deals.filter(d => d.stage === "WON").length} deals
          </span>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 view-transition">
        {STAGES.map((st) => {
          const stageDeals = deals.filter(d => d.stage === st);
          const stageSum = stageDeals.reduce((sum, d) => sum + (isForecastView ? d.value * (d.probability / 100) : d.value), 0);
          const prob = STAGE_MULTIPLIERS[st];

          return (
            <div key={st} className="flex flex-col gap-3 p-3 rounded-2xl border min-h-[500px]" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              {/* Kanban Column Header */}
              <div className="flex flex-col gap-1 pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]" style={{ color: "var(--text-color)" }}>
                    <Layers size={12} className="opacity-70" />
                    <span>{st}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(0,0,0,0.05)", color: "var(--muted-foreground)" }}>
                    {stageDeals.length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                  <span>Probability: <strong>{prob}%</strong></span>
                  <span className="font-semibold text-[var(--text-color)]">₹{stageSum?.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Kanban Cards */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {stageDeals.map((d) => {
                  const company = d.company_name || d.lead?.company || "Individual";
                  const displayVal = isForecastView ? d.value * (d.probability / 100) : d.value;
                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl border space-y-3 transition-all hover:-translate-y-1 hover:shadow-md"
                      style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}
                    >
                      <div className="space-y-0.5">
                        <span className="block text-xs font-bold" style={{ color: "var(--text-color)" }}>{d.title}</span>
                        <span className="block text-[9px] text-muted-foreground font-semibold">{company}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs border-t pt-2.5" style={{ borderColor: "var(--card-border)" }}>
                        <span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{displayVal?.toLocaleString("en-IN")}</span>
                        <div className="flex items-center gap-1">
                          {st !== "NEW" && (
                            <button
                              onClick={() => handleUpdateStage(d.id, STAGES[STAGES.indexOf(st) - 1])}
                              className="h-5 w-5 rounded border flex items-center justify-center text-[9px] hover:bg-[rgba(0,0,0,0.02)]"
                              style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}
                              title="Shift back"
                            >
                              ‹
                            </button>
                          )}
                          {st !== "LOST" && st !== "WON" && (
                            <button
                              onClick={() => handleUpdateStage(d.id, STAGES[STAGES.indexOf(st) + 1])}
                              className="h-5 w-5 rounded border flex items-center justify-center text-[9px] hover:bg-[rgba(0,0,0,0.02)]"
                              style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}
                              title="Shift forward"
                            >
                              ›
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Deal Sliding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm t-modal-backdrop" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto p-8 shadow-2xl flex flex-col justify-between t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--card-border)" }}>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>Log New Deal Opportunity</h2>
                <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-[rgba(0,0,0,0.05)]" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>×</button>
              </div>

              <form onSubmit={handleCreateDeal} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold block" style={{ color: "var(--text-color)" }}>Opportunity Title *</label>
                  <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold block" style={{ color: "var(--text-color)" }}>Deal Value (INR) *</label>
                  <input type="number" required value={value} onChange={(e) => setValue(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold block" style={{ color: "var(--text-color)" }}>Company Client Name</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold block" style={{ color: "var(--text-color)" }}>Initial Stage</label>
                  <select value={stage} onChange={(e) => setStage(e.target.value as any)} className="w-full h-10 border rounded-xl px-3 outline-none bg-transparent" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-6 border-t" style={{ borderColor: "var(--card-border)" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-xl border font-semibold transition-colors hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold transition-opacity" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Logging Deal..." : "Log Opportunity"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
