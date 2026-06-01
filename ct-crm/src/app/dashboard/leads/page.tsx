"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/utils/supabase/client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import { Search, Filter, Plus, Table2, Kanban as KanbanIcon, Grid, MoreHorizontal, User, Mail, Phone, Building, DollarSign } from "lucide-react";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "REJECTED";
  estimated_value: number;
  notes: string;
  created_at: string;
  owner_id?: string;
  owner?: { full_name: string };
}

const FALLBACK_LEADS: Lead[] = [
  { id: "1", first_name: "Vikram", last_name: "Singh", email: "vikram@acmecorp.in", phone: "+91-9876543210", company: "Acme Corp", source: "GOOGLE", status: "QUALIFIED", estimated_value: 450000, notes: "Needs enterprise integration.", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "2", first_name: "Neha", last_name: "Patel", email: "neha@techstart.io", phone: "+91-9876543211", company: "TechStart", source: "META", status: "INTERESTED", estimated_value: 120000, notes: "Requested pricing breakdown.", created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: "3", first_name: "Arjun", last_name: "Mehta", email: "arjun@cloudsoft.in", phone: "+91-9876543212", company: "CloudSoft Technologies", source: "REFERRAL", status: "QUALIFIED", estimated_value: 320000, notes: "Ready to sign proposal.", created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: "4", first_name: "Sanya", last_name: "Reddy", email: "sanya@dataflow.co", phone: "+91-9876543213", company: "DataFlow Inc", source: "DIRECT", status: "CONTACTED", estimated_value: 280000, notes: "Introductory call completed.", created_at: new Date(Date.now() - 345600000).toISOString() },
  { id: "5", first_name: "Rohan", last_name: "Joshi", email: "rohan@novatech.in", phone: "+91-9876543214", company: "NovaTech Labs", source: "WHATSAPP", status: "NEW", estimated_value: 150000, notes: "Inquiry via chat bot.", created_at: new Date().toISOString() },
];

const STAGES: ("NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "REJECTED")[] = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "REJECTED"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(FALLBACK_LEADS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Table" | "Kanban" | "Grid">("Table");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("DIRECT");
  const [estValue, setEstValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("leads")
        .select("*, owner:users(full_name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (data && data.length > 0) {
        setLeads(data);
      }
    } catch {
      console.warn("Could not fetch leads from database. Using fallback local records.");
      setLeads(FALLBACK_LEADS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleUpdateStatus = async (id: string, nextStatus: Lead["status"]) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("leads")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      toast.success(`Lead status updated to ${nextStatus}`);
      fetchLeads();
    } catch {
      // Local updates for fallbacks
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: nextStatus } : l));
      toast.success(`[Offline/Demo] Lead status updated to ${nextStatus}`);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      toast.error("Please fill in required fields (Name & Email)");
      return;
    }
    
    setSubmitting(true);
    const newLeadPayload = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company,
      source,
      status: "NEW" as const,
      estimated_value: parseFloat(estValue) || 0,
      notes,
    };

    try {
      const supabase = createClient();
      // Fetch organization id
      const { data: orgData } = await supabase.from("organizations").select("id").limit(1).single();
      const organization_id = orgData?.id || "11111111-1111-1111-1111-111111111111";

      const { error } = await supabase
        .from("leads")
        .insert({
          ...newLeadPayload,
          organization_id,
        });

      if (error) throw error;
      toast.success("Lead created successfully");
      setIsModalOpen(false);
      resetForm();
      fetchLeads();
    } catch {
      // Mock insert
      const demoLead: Lead = {
        id: Math.random().toString(36).substring(7),
        ...newLeadPayload,
        created_at: new Date().toISOString(),
      };
      setLeads(prev => [demoLead, ...prev]);
      toast.success("[Offline/Demo] New lead added to view");
      setIsModalOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        leads.map((l) => ({
          "First Name": l.first_name,
          "Last Name": l.last_name,
          Email: l.email,
          Phone: l.phone || "",
          Company: l.company || "",
          Source: l.source,
          Status: l.status,
          "Estimated Value": l.estimated_value,
          Notes: l.notes || "",
          "Created At": l.created_at,
        }))
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
      XLSX.writeFile(workbook, "CT_CRM_Leads.xlsx");
      toast.success("Leads exported successfully to Excel");
    } catch (err) {
      toast.error("Failed to export leads to Excel");
      console.error(err);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          toast.error("The Excel file is empty");
          return;
        }

        setLoading(true);
        const supabase = createClient();
        const { data: orgData } = await supabase.from("organizations").select("id").limit(1).single();
        const organization_id = orgData?.id || "11111111-1111-1111-1111-111111111111";

        const importedLeads: any[] = [];
        for (const row of json) {
          const first_name = row["First Name"] || row["first_name"] || "Imported";
          const last_name = row["Last Name"] || row["last_name"] || "Lead";
          const email = row["Email"] || row["email"] || `imported-${Math.floor(Math.random() * 1000)}@corp.com`;
          const phone = row["Phone"] || row["phone"] || "";
          const company = row["Company"] || row["company"] || "";
          const source = (row["Source"] || row["source"] || "DIRECT").toUpperCase();
          const status = (row["Status"] || row["status"] || "NEW").toUpperCase();
          const estimated_value = parseFloat(row["Estimated Value"] || row["estimated_value"]) || 0;
          const notes = row["Notes"] || row["notes"] || "Imported from Excel.";

          const leadRow = {
            organization_id,
            first_name,
            last_name,
            email,
            phone,
            company,
            source,
            status,
            estimated_value,
            notes,
          };

          try {
            const { error } = await supabase.from("leads").insert(leadRow);
            if (error) throw error;
          } catch {
            importedLeads.push({
              id: Math.random().toString(36).substring(7),
              ...leadRow,
              created_at: new Date().toISOString(),
            });
          }
        }

        if (importedLeads.length > 0) {
          setLeads(prev => [...importedLeads, ...prev]);
          toast.success(`[Offline/Demo] Imported ${importedLeads.length} leads successfully`);
        } else {
          toast.success(`Imported ${json.length} leads successfully to database`);
        }
        fetchLeads();
      } catch (err) {
        toast.error("Failed to parse Excel file");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setSource("DIRECT");
    setEstValue("");
    setNotes("");
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase());
    
    const matchesSource = sourceFilter === "ALL" || l.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const getStatusColor = (status: Lead["status"]) => {
    switch (status) {
      case "NEW": return { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" };
      case "CONTACTED": return { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316" };
      case "INTERESTED": return { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308" };
      case "QUALIFIED": return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" };
      case "REJECTED": return { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" };
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>
            Leads Intake
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, classify, and qualify incoming pipeline streams.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="excel-import"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleImportExcel}
          />
          <button
            onClick={() => document.getElementById("excel-import")?.click()}
            className="h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all hover:scale-105 active:scale-95 bg-[var(--card-bg)] hover:bg-[rgba(0,0,0,0.02)]"
            style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}
          >
            Import Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all hover:scale-105 active:scale-95 bg-[var(--card-bg)] hover:bg-[rgba(0,0,0,0.02)]"
            style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}
          >
            Export Excel
          </button>
          <button onClick={() => setIsModalOpen(true)} className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>
            <Plus size={16} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 md:flex md:items-center md:justify-between gap-4 p-2 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-60 pl-9 pr-4 rounded-xl text-xs bg-transparent border placeholder:opacity-50"
              style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}
            />
          </div>
          <div className="flex items-center gap-1.5 border px-2.5 h-9 rounded-xl text-xs" style={{ borderColor: "var(--card-border)" }}>
            <Filter size={14} className="text-muted-foreground" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent font-medium cursor-pointer outline-none"
              style={{ color: "var(--text-color)" }}
            >
              <option value="ALL">All Sources</option>
              <option value="GOOGLE">Google Ads</option>
              <option value="META">Meta Ads</option>
              <option value="REFERRAL">Referral</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="DIRECT">Direct Form</option>
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(0,0,0,0.05)", border: "1px solid var(--card-border)" }}>
          {[
            { id: "Table", icon: <Table2 size={14} /> },
            { id: "Kanban", icon: <KanbanIcon size={14} /> },
            { id: "Grid", icon: <Grid size={14} /> }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: view === item.id ? "var(--card-bg-solid)" : "transparent",
                color: view === item.id ? "var(--text-color)" : "var(--muted-foreground)",
                boxShadow: view === item.id ? "0 4px 12px rgba(0,0,0,0.05)" : "none"
              }}
            >
              {item.icon}
              <span>{item.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredLeads.length === 0 ? (
        <WidgetWrapper empty emptyTitle="No leads found" emptyDescription="Create a new lead or adjust your filter parameters.">
          <div />
        </WidgetWrapper>
      ) : view === "Table" ? (
        <div className="overflow-x-auto rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
                <th className="p-4 font-bold uppercase tracking-wider">Name</th>
                <th className="p-4 font-bold uppercase tracking-wider">Company</th>
                <th className="p-4 font-bold uppercase tracking-wider">Contact</th>
                <th className="p-4 font-bold uppercase tracking-wider">Source</th>
                <th className="p-4 font-bold uppercase tracking-wider">Est. Value</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-color)" }}>
              {filteredLeads.map((lead) => {
                const badge = getStatusColor(lead.status);
                return (
                  <tr key={lead.id} className="border-b transition-colors hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)" }}>
                    <td className="p-4 font-semibold">{lead.first_name} {lead.last_name}</td>
                    <td className="p-4 text-muted-foreground">{lead.company || "N/A"}</td>
                    <td className="p-4 space-y-0.5">
                      <div className="flex items-center gap-1.5"><Mail size={12} className="opacity-55" /> <span>{lead.email}</span></div>
                      {lead.phone && <div className="flex items-center gap-1.5"><Phone size={12} className="opacity-55" /> <span>{lead.phone}</span></div>}
                    </td>
                    <td className="p-4"><span className="px-2.5 py-1 rounded-lg font-bold border" style={{ background: "rgba(0,0,0,0.02)", borderColor: "var(--card-border)" }}>{lead.source}</span></td>
                    <td className="p-4 font-bold" style={{ color: "var(--graph-to)" }}>₹{lead.estimated_value?.toLocaleString("en-IN")}</td>
                    <td className="p-4">
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer outline-none uppercase transition-all"
                        style={{ background: badge?.bg, color: badge?.text }}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <button className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,0.05)] ml-auto" style={{ borderColor: "var(--card-border)" }}>
                        <MoreHorizontal size={14} className="opacity-70" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : view === "Kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(l => l.status === stage);
            const badge = getStatusColor(stage);
            return (
              <div key={stage} className="flex flex-col gap-3 p-3 rounded-2xl border min-h-[500px]" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: badge?.text }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-color)" }}>{stage}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: badge?.bg, color: badge?.text }}>{stageLeads.length}</span>
                </div>

                {/* Stage Cards */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                  {stageLeads.map(l => (
                    <div key={l.id} className="p-4 rounded-xl border space-y-3 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
                      <div className="space-y-0.5">
                        <span className="block text-xs font-bold" style={{ color: "var(--text-color)" }}>{l.first_name} {l.last_name}</span>
                        {l.company && <span className="block text-[10px] text-muted-foreground font-semibold">{l.company}</span>}
                      </div>
                      
                      <div className="text-[10px] space-y-1 text-muted-foreground">
                        <div className="flex items-center gap-1.5"><Mail size={10} className="opacity-60" /> <span>{l.email}</span></div>
                        <div className="flex items-center gap-1.5"><DollarSign size={10} className="opacity-60" /> <span className="font-bold text-[var(--text-color)]">₹{l.estimated_value?.toLocaleString("en-IN")}</span></div>
                      </div>

                      <div className="flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--card-border)" }}>
                        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(0,0,0,0.03)", color: "var(--muted-foreground)" }}>{l.source}</span>
                        <div className="flex gap-1">
                          {STAGES.filter(st => st !== stage).map(st => (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(l.id, st)}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors hover:opacity-80"
                              style={{ background: getStatusColor(st)?.bg, color: getStatusColor(st)?.text }}
                              title={`Move to ${st}`}
                            >
                              {st[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredLeads.map((lead) => {
            const badge = getStatusColor(lead.status);
            return (
              <div key={lead.id} className="p-5 rounded-2xl border space-y-4 hover:shadow-lg transition-all" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{lead.first_name} {lead.last_name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.company || "No Company"}</p>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider" style={{ background: badge?.bg, color: badge?.text }}>
                    {lead.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail size={12} className="opacity-60" /> <span>{lead.email}</span></div>
                  {lead.phone && <div className="flex items-center gap-2"><Phone size={12} className="opacity-60" /> <span>{lead.phone}</span></div>}
                  <div className="flex items-center gap-2"><Plus size={12} className="opacity-60" /> <span>Source: <strong style={{ color: "var(--text-color)" }}>{lead.source}</strong></span></div>
                </div>

                <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                  <div>
                    <span className="block text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Value Estimate</span>
                    <span className="text-sm font-bold" style={{ color: "var(--graph-to)" }}>₹{lead.estimated_value?.toLocaleString("en-IN")}</span>
                  </div>
                  <button className="h-8 px-3.5 rounded-xl text-xs border font-semibold hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Lead Sliding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md h-full overflow-y-auto p-8 shadow-2xl flex flex-col justify-between" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--card-border)" }}>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>Create New Lead</h2>
                <button onClick={() => setIsModalOpen(false)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-[rgba(0,0,0,0.05)]" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>×</button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold flex items-center gap-1" style={{ color: "var(--text-color)" }}><User size={12} /> First Name *</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold flex items-center gap-1" style={{ color: "var(--text-color)" }}><User size={12} /> Last Name *</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold flex items-center gap-1" style={{ color: "var(--text-color)" }}><Mail size={12} /> Email Address *</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold flex items-center gap-1" style={{ color: "var(--text-color)" }}><Phone size={12} /> Phone Number</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold flex items-center gap-1" style={{ color: "var(--text-color)" }}><Building size={12} /> Company Name</label>
                  <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold" style={{ color: "var(--text-color)" }}>Source</label>
                    <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none bg-transparent" style={{ borderColor: "var(--card-border)" }}>
                      <option value="DIRECT">Direct Form</option>
                      <option value="GOOGLE">Google Ads</option>
                      <option value="META">Meta Ads</option>
                      <option value="REFERRAL">Referral</option>
                      <option value="WHATSAPP">WhatsApp</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold flex items-center gap-1" style={{ color: "var(--text-color)" }}><DollarSign size={12} /> Estimated Value</label>
                    <input type="number" value={estValue} onChange={(e) => setEstValue(e.target.value)} className="w-full h-10 border rounded-xl px-3 outline-none" style={{ borderColor: "var(--card-border)" }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold" style={{ color: "var(--text-color)" }}>Notes & Background</label>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-xl p-3 outline-none resize-none" style={{ borderColor: "var(--card-border)" }} />
                </div>

                <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-xl border font-semibold transition-colors hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold transition-opacity" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? "Creating..." : "Save Lead"}
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
