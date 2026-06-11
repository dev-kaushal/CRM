"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getLeads,
  getLeadReminders,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead as deleteLeadAction,
  addLeadNote,
  createLeadReminder,
} from "@/server/leads";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";
import { toast } from "sonner";
import {
  Search, Filter, Plus, Table2, Kanban as KanbanIcon, Grid,
  MoreHorizontal, Mail, Phone, Building, DollarSign, X, Eye,
  Pencil, Trash2, Bell, StickyNote, Star, StarOff, Copy,
  Calendar, Clock, User, Tag, AlertCircle, CheckCircle2,
  SlidersHorizontal, Download, Upload, Hash, MessageSquare,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "REJECTED";

interface LeadNote {
  id: string;
  text: string;
  created_at: string;
  author?: string;
}

interface Reminder {
  id: string;
  lead_id: string;
  lead_name: string;
  title: string;
  type: "call" | "email" | "meeting" | "follow_up";
  datetime: string;
  note?: string;
  done: boolean;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  source?: string;
  status: LeadStatus;
  estimated_value?: number;
  notes?: string;
  created_at: string;
  owner_id?: string;
  // Extended local fields (not guaranteed in DB schema)
  website?: string;
  linkedin?: string;
  city?: string;
  country?: string;
  industry?: string;
  employee_count?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  starred?: boolean;
  tags?: string[];
  lead_notes?: LeadNote[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "REJECTED"];

const ALL_COLUMNS = [
  { key: "name", label: "Name", required: true },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "source", label: "Source" },
  { key: "estimated_value", label: "Est. Value" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "industry", label: "Industry" },
  { key: "city", label: "City" },
  { key: "notes_preview", label: "Notes" },
  { key: "created_at", label: "Created" },
  { key: "actions", label: "Actions", required: true },
];

const FALLBACK_LEADS: Lead[] = [
  { id: "1", first_name: "Vikram", last_name: "Singh", email: "vikram@acmecorp.in", phone: "+91-9876543210", company: "Acme Corp", source: "GOOGLE", status: "QUALIFIED", estimated_value: 450000, notes: "Needs enterprise integration. Budget approved.", created_at: new Date(Date.now() - 86400000).toISOString(), city: "Mumbai", industry: "Technology", priority: "high", starred: true, tags: ["Enterprise", "Hot Lead"], lead_notes: [{ id: "n1", text: "Had initial call, very interested.", created_at: new Date(Date.now() - 3600000).toISOString(), author: "You" }] },
  { id: "2", first_name: "Neha", last_name: "Patel", email: "neha@techstart.io", phone: "+91-9876543211", company: "TechStart", source: "META", status: "INTERESTED", estimated_value: 120000, notes: "Requested pricing breakdown.", created_at: new Date(Date.now() - 172800000).toISOString(), city: "Bangalore", industry: "SaaS", priority: "medium", starred: false, tags: ["Startup"], lead_notes: [] },
  { id: "3", first_name: "Arjun", last_name: "Mehta", email: "arjun@cloudsoft.in", phone: "+91-9876543212", company: "CloudSoft Technologies", source: "REFERRAL", status: "QUALIFIED", estimated_value: 320000, notes: "Ready to sign proposal.", created_at: new Date(Date.now() - 259200000).toISOString(), city: "Pune", industry: "Cloud", priority: "urgent", starred: true, tags: ["Ready to Close"], lead_notes: [] },
  { id: "4", first_name: "Sanya", last_name: "Reddy", email: "sanya@dataflow.co", phone: "+91-9876543213", company: "DataFlow Inc", source: "DIRECT", status: "CONTACTED", estimated_value: 280000, notes: "Introductory call completed.", created_at: new Date(Date.now() - 345600000).toISOString(), city: "Hyderabad", industry: "Analytics", priority: "medium", starred: false, tags: ["Follow-up"], lead_notes: [] },
  { id: "5", first_name: "Rohan", last_name: "Joshi", email: "rohan@novatech.in", phone: "+91-9876543214", company: "NovaTech Labs", source: "WHATSAPP", status: "NEW", estimated_value: 150000, notes: "Inquiry via chat bot.", created_at: new Date().toISOString(), city: "Delhi", industry: "HealthTech", priority: "low", starred: false, tags: [], lead_notes: [] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusColor(s: LeadStatus) {
  const map: Record<LeadStatus, { bg: string; text: string; border: string }> = {
    NEW: { bg: "rgba(59,130,246,.15)", text: "#3b82f6", border: "rgba(59,130,246,.3)" },
    CONTACTED: { bg: "rgba(249,115,22,.15)", text: "#f97316", border: "rgba(249,115,22,.3)" },
    INTERESTED: { bg: "rgba(234,179,8,.15)", text: "#eab308", border: "rgba(234,179,8,.3)" },
    QUALIFIED: { bg: "rgba(16,185,129,.15)", text: "#10b981", border: "rgba(16,185,129,.3)" },
    REJECTED: { bg: "rgba(239,68,68,.15)", text: "#ef4444", border: "rgba(239,68,68,.3)" },
  };
  return map[s];
}

function getPriColor(p?: string) {
  const map: Record<string, { bg: string; text: string }> = {
    urgent: { bg: "rgba(239,68,68,.15)", text: "#ef4444" },
    high: { bg: "rgba(249,115,22,.15)", text: "#f97316" },
    medium: { bg: "rgba(234,179,8,.15)", text: "#eab308" },
    low: { bg: "rgba(148,163,184,.15)", text: "#94a3b8" },
  };
  return map[p || "low"] || map.low;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(FALLBACK_LEADS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Table" | "Kanban" | "Grid">("Table");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [noteForLead, setNoteForLead] = useState<Lead | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(["name", "company", "email", "phone", "source", "estimated_value", "status", "priority", "notes_preview", "created_at", "actions"]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Form
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", source: "DIRECT", estimated_value: "", notes: "", website: "", linkedin: "", city: "", country: "India", industry: "", employee_count: "", priority: "medium" as Lead["priority"], status: "NEW" as LeadStatus, tags: "" });
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [reminderForm, setReminderForm] = useState({ title: "", type: "call" as Reminder["type"], datetime: "", note: "" });

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const [leadRows, reminderRows] = await Promise.all([getLeads(), getLeadReminders()]);
      if (leadRows.length) {
        setLeads(leadRows as Lead[]);
      }
      if (reminderRows.length) {
        setReminders(reminderRows as Reminder[]);
      }
    } catch {
      // Keep fallback data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => {
    if (!actionMenuId) return;
    const h = () => setActionMenuId(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [actionMenuId]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleUpdateStatus = useCallback(async (id: string, next: LeadStatus) => {
    setLeads(p => p.map(l => l.id === id ? { ...l, status: next } : l));
    if (viewLead?.id === id) setViewLead(v => v ? { ...v, status: next } : v);
    try {
      await updateLeadStatus(id, next);
      toast.success(`Status → ${next}`);
    } catch { toast.error("Failed to update status"); }
  }, [viewLead]);

  const handleToggleStar = useCallback((id: string) => {
    setLeads(p => p.map(l => l.id === id ? { ...l, starred: !l.starred } : l));
    if (viewLead?.id === id) setViewLead(v => v ? { ...v, starred: !v.starred } : v);
  }, [viewLead]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email) { toast.error("Name & Email required"); return; }
    setSubmitting(true);
    const fullPayload: Omit<Lead, "id"> = {
      first_name: form.first_name, last_name: form.last_name, email: form.email,
      phone: form.phone, company: form.company, source: form.source,
      status: form.status, estimated_value: parseFloat(form.estimated_value) || 0,
      notes: form.notes, website: form.website, linkedin: form.linkedin,
      city: form.city, country: form.country, industry: form.industry,
      employee_count: form.employee_count, priority: form.priority,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      created_at: new Date().toISOString(), lead_notes: [], starred: false,
    };
    try {
      const row = await createLead({
        first_name: form.first_name, last_name: form.last_name, email: form.email,
        phone: form.phone, company: form.company, source: form.source,
        status: form.status, estimated_value: parseFloat(form.estimated_value) || 0,
        notes: form.notes, website: form.website, linkedin: form.linkedin,
        city: form.city, country: form.country, industry: form.industry,
        employee_count: form.employee_count, priority: form.priority,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      const newLead: Lead = { ...fullPayload, id: row.id };
      setLeads(p => [newLead, ...p]);
      toast.success("✅ Lead saved to database!");
    } catch {
      toast.error("Failed to save lead");
    } finally {
      setSubmitting(false); setIsCreateOpen(false); resetForm();
    }
  };

  const handleEditLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    setSubmitting(true);
    const updates: Partial<Lead> = {
      first_name: form.first_name, last_name: form.last_name, email: form.email,
      phone: form.phone, company: form.company, source: form.source,
      status: form.status, estimated_value: parseFloat(form.estimated_value) || 0,
      notes: form.notes, website: form.website, linkedin: form.linkedin,
      city: form.city, country: form.country, industry: form.industry,
      employee_count: form.employee_count, priority: form.priority,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    const updatedLead = { ...editLead, ...updates };
    setLeads(p => p.map(l => l.id === editLead.id ? updatedLead : l));
    if (viewLead?.id === editLead.id) setViewLead(updatedLead);
    try {
      await updateLead(editLead.id, {
        first_name: updates.first_name!, last_name: updates.last_name!,
        email: updates.email!, phone: updates.phone, company: updates.company,
        source: updates.source, status: updates.status,
        estimated_value: updates.estimated_value, notes: updates.notes,
        website: updates.website, linkedin: updates.linkedin,
        city: updates.city, country: updates.country, industry: updates.industry,
        employee_count: updates.employee_count, priority: updates.priority,
        tags: updates.tags,
      });
      toast.success("✅ Lead updated in database!");
    } catch {
      toast.error("Failed to update lead");
    } finally { setSubmitting(false); setEditLead(null); }
  };

  const handleDeleteLead = async () => {
    if (!deleteLead) return;
    setLeads(p => p.filter(l => l.id !== deleteLead.id));
    if (viewLead?.id === deleteLead.id) setViewLead(null);
    toast.success("Lead deleted");
    const id = deleteLead.id;
    setDeleteLead(null);
    try { await deleteLeadAction(id); } catch { toast.error("Failed to delete lead on server"); }
  };

  const handleAddNote = async (lead: Lead) => {
    if (!newNote.trim()) return;
    const noteText = newNote.trim();
    const tempNote: LeadNote = { id: Math.random().toString(36).slice(7), text: noteText, created_at: new Date().toISOString(), author: "You" };
    const updated = { ...lead, lead_notes: [tempNote, ...(lead.lead_notes || [])] };
    setLeads(p => p.map(l => l.id === lead.id ? updated : l));
    if (viewLead?.id === lead.id) setViewLead(updated);
    setNewNote("");
    try {
      const row = await addLeadNote(lead.id, noteText);
      const realNote = { ...tempNote, id: row.id };
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, lead_notes: l.lead_notes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : l));
      if (viewLead?.id === lead.id) setViewLead(v => v ? { ...v, lead_notes: v.lead_notes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : v);
      toast.success("✅ Note saved to database!");
    } catch { toast.error("Failed to save note"); }
  };

  const handleSetReminder = async () => {
    if (!reminderLead || !reminderForm.title || !reminderForm.datetime) { toast.error("Fill title & date/time"); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, lead_id: reminderLead.id, lead_name: `${reminderLead.first_name} ${reminderLead.last_name}`, ...reminderForm, done: false };
    setReminders(p => [...p, r]);
    toast.success(`⏰ Reminder set for ${new Date(reminderForm.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
    setReminderLead(null);
    setReminderForm({ title: "", type: "call", datetime: "", note: "" });
    // Persist to DB
    try {
      const row = await createLeadReminder({ entity_id: reminderLead.id, entity_name: r.lead_name, title: r.title, type: r.type, datetime: r.datetime, note: r.note });
      setReminders(p => p.map(x => x.id === tempId ? { ...x, id: row.id } : x));
    } catch {}
  };

  const handleExport = async () => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(leads.map(l => ({ "First Name": l.first_name, "Last Name": l.last_name, Email: l.email, Phone: l.phone || "", Company: l.company || "", Source: l.source || "", Status: l.status, Priority: l.priority || "", Industry: l.industry || "", City: l.city || "", "Estimated Value": l.estimated_value || 0, Notes: l.notes || "", Tags: (l.tags || []).join(", "), "Created At": l.created_at })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, "CT_CRM_Leads.xlsx");
      toast.success("Exported!");
    } catch { toast.error("Export failed"); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const json: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!json.length) { toast.error("Empty file"); return; }
        const imported: Lead[] = json.map(r => ({ id: Math.random().toString(36).slice(7), first_name: r["First Name"] || r.first_name || "Imported", last_name: r["Last Name"] || r.last_name || "Lead", email: r.Email || r.email || `lead${Math.random().toString(36).slice(5)}@import.com`, phone: r.Phone || "", company: r.Company || "", source: (r.Source || "DIRECT").toUpperCase(), status: (r.Status || "NEW").toUpperCase() as LeadStatus, estimated_value: parseFloat(r["Estimated Value"] || 0) || 0, notes: r.Notes || "", priority: (r.Priority || "medium") as Lead["priority"], created_at: new Date().toISOString(), lead_notes: [] }));
        setLeads(p => [...imported, ...p]);
        toast.success(`Imported ${imported.length} leads`);
      } catch { toast.error("Import failed"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const openEdit = (lead: Lead) => {
    setForm({ first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone || "", company: lead.company || "", source: lead.source || "DIRECT", estimated_value: String(lead.estimated_value || ""), notes: lead.notes || "", website: lead.website || "", linkedin: lead.linkedin || "", city: lead.city || "", country: lead.country || "India", industry: lead.industry || "", employee_count: lead.employee_count || "", priority: lead.priority || "medium", status: lead.status, tags: (lead.tags || []).join(", ") });
    setEditLead(lead);
  };

  const resetForm = () => setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", source: "DIRECT", estimated_value: "", notes: "", website: "", linkedin: "", city: "", country: "India", industry: "", employee_count: "", priority: "medium", status: "NEW", tags: "" });

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return (!q || `${l.first_name} ${l.last_name} ${l.email} ${l.company} ${l.phone}`.toLowerCase().includes(q))
      && (sourceFilter === "ALL" || l.source === sourceFilter)
      && (statusFilter === "ALL" || l.status === statusFilter)
      && (priorityFilter === "ALL" || l.priority === priorityFilter);
  });

  const activeReminders = reminders.filter(r => !r.done);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Leads Intake</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{leads.length} total · {filtered.length} shown{activeReminders.length > 0 ? ` · ${activeReminders.length} reminders` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeReminders.length > 0 && (
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border" style={{ background: "rgba(234,179,8,.1)", borderColor: "rgba(234,179,8,.3)", color: "#eab308" }}>
              <Bell size={13} />{activeReminders.length} reminder{activeReminders.length > 1 ? "s" : ""}
            </div>
          )}
          <input type="file" id="xl-import" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Btn ghost onClick={() => document.getElementById("xl-import")?.click()} icon={<Upload size={13} />}>Import</Btn>
          <Btn ghost onClick={handleExport} icon={<Download size={13} />}>Export</Btn>
          <Btn primary onClick={() => { resetForm(); setIsCreateOpen(true); }} icon={<Plus size={15} />}>New Lead</Btn>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input type="text" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 pl-9 pr-3 rounded-xl text-xs bg-transparent border" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
          </div>
          {[
            { val: sourceFilter, set: setSourceFilter, icon: <Filter size={12} />, opts: [["ALL", "All Sources"], ["GOOGLE", "Google Ads"], ["META", "Meta Ads"], ["REFERRAL", "Referral"], ["WHATSAPP", "WhatsApp"], ["DIRECT", "Direct"]] },
            { val: statusFilter, set: setStatusFilter, icon: <Tag size={12} />, opts: [["ALL", "All Status"], ...STAGES.map(s => [s, s])] },
            { val: priorityFilter, set: setPriorityFilter, icon: <AlertCircle size={12} />, opts: [["ALL", "All Priority"], ["urgent", "Urgent"], ["high", "High"], ["medium", "Medium"], ["low", "Low"]] },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 border px-2.5 h-9 rounded-xl text-xs" style={{ borderColor: "var(--card-border)" }}>
              <span className="text-muted-foreground">{f.icon}</span>
              <select value={f.val} onChange={e => f.set(e.target.value)} className="bg-transparent font-medium cursor-pointer outline-none" style={{ color: "var(--text-color)" }}>
                {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          {(search || sourceFilter !== "ALL" || statusFilter !== "ALL" || priorityFilter !== "ALL") && (
            <button onClick={() => { setSearch(""); setSourceFilter("ALL"); setStatusFilter("ALL"); setPriorityFilter("ALL"); }} className="h-9 px-3 rounded-xl text-xs flex items-center gap-1 font-semibold" style={{ color: "#ef4444", background: "rgba(239,68,68,.1)", transition: "opacity .15s" }}>
              <X size={12} />Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {view === "Table" && <Btn ghost onClick={() => setColumnEditorOpen(true)} icon={<SlidersHorizontal size={13} />}>Columns</Btn>}
          <ViewSwitcher
            value={view}
            onChange={(id) => setView(id as "Table" | "Kanban" | "Grid")}
            options={[
              { id: "Table", label: "Table", icon: <Table2 size={13} /> },
              { id: "Kanban", label: "Kanban", icon: <KanbanIcon size={13} /> },
              { id: "Grid", label: "Grid", icon: <Grid size={13} /> },
            ]}
          />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}><Search size={24} className="text-muted-foreground" /></div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>No leads found</p>
          <p className="text-xs text-muted-foreground mt-1">Adjust filters or create a new lead.</p>
          <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="mt-4 h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={14} />New Lead</button>
        </div>
      ) : view === "Table" ? (
        /* TABLE */
        <div key="table-view" className="rounded-2xl border overflow-hidden view-transition" style={{ borderColor: "var(--card-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]" style={{ background: "var(--card-bg)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg-solid)" }}>
                  {visibleCols.includes("name") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 z-10" style={{ background: "var(--card-bg-solid)", minWidth: 200 }}>Name</th>}
                  {visibleCols.includes("company") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Company</th>}
                  {visibleCols.includes("email") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 190 }}>Email</th>}
                  {visibleCols.includes("phone") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Phone</th>}
                  {visibleCols.includes("source") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Source</th>}
                  {visibleCols.includes("estimated_value") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right" style={{ minWidth: 110 }}>Value</th>}
                  {visibleCols.includes("status") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 130 }}>Status</th>}
                  {visibleCols.includes("priority") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Priority</th>}
                  {visibleCols.includes("industry") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Industry</th>}
                  {visibleCols.includes("city") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">City</th>}
                  {visibleCols.includes("notes_preview") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 170 }}>Notes</th>}
                  {visibleCols.includes("created_at") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Created</th>}
                  {visibleCols.includes("actions") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)" }}>Actions</th>}
                </tr>
              </thead>
              <tbody style={{ color: "var(--text-color)" }}>
                {filtered.map(lead => {
                  const badge = getStatusColor(lead.status);
                  const pri = getPriColor(lead.priority);
                  return (
                    <tr key={lead.id} className="border-b hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)", transition: "background .1s" }}>
                      {visibleCols.includes("name") && (
                        <td className="px-4 py-3 sticky left-0 z-10" style={{ background: "var(--card-bg-solid)" }}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleStar(lead.id)} className="shrink-0">{lead.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="text-muted-foreground opacity-30" />}</button>
                            <div>
                              <button onClick={() => setViewLead(lead)} className="font-semibold hover:underline text-left" style={{ color: "var(--text-color)" }}>{lead.first_name} {lead.last_name}</button>
                              {lead.tags && lead.tags.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {lead.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}
                                  {lead.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{lead.tags.length - 2}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("company") && <td className="px-4 py-3 text-muted-foreground">{lead.company || "—"}</td>}
                      {visibleCols.includes("email") && <td className="px-4 py-3"><a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 hover:underline" style={{ color: "var(--graph-to)" }}><Mail size={11} className="shrink-0" />{lead.email}</a></td>}
                      {visibleCols.includes("phone") && <td className="px-4 py-3">{lead.phone ? <a href={`tel:${lead.phone}`} className="text-muted-foreground hover:underline flex items-center gap-1"><Phone size={11} />{lead.phone}</a> : <span className="text-muted-foreground">—</span>}</td>}
                      {visibleCols.includes("source") && <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: "rgba(0,0,0,.03)", borderColor: "var(--card-border)" }}>{lead.source}</span></td>}
                      {visibleCols.includes("estimated_value") && <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--graph-to)" }}>₹{(lead.estimated_value || 0).toLocaleString("en-IN")}</td>}
                      {visibleCols.includes("status") && (
                        <td className="px-4 py-3">
                          <select value={lead.status} onChange={e => handleUpdateStatus(lead.id, e.target.value as LeadStatus)} className="px-2 py-1 rounded-xl font-bold text-[10px] cursor-pointer outline-none uppercase" style={{ background: badge.bg, color: badge.text, border: "none" }}>
                            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      )}
                      {visibleCols.includes("priority") && <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: pri.bg, color: pri.text }}>{lead.priority || "—"}</span></td>}
                      {visibleCols.includes("industry") && <td className="px-4 py-3 text-muted-foreground">{lead.industry || "—"}</td>}
                      {visibleCols.includes("city") && <td className="px-4 py-3 text-muted-foreground">{lead.city || "—"}</td>}
                      {visibleCols.includes("notes_preview") && (
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-1 max-w-[160px] block text-[11px]">{lead.notes || "—"}</span>
                          {(lead.lead_notes?.length ?? 0) > 0 && <span className="text-[9px] flex items-center gap-0.5 mt-0.5" style={{ color: "var(--graph-to)" }}><MessageSquare size={9} />{lead.lead_notes!.length} note{lead.lead_notes!.length > 1 ? "s" : ""}</span>}
                        </td>
                      )}
                      {visibleCols.includes("created_at") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[11px]">{timeAgo(lead.created_at)}</td>}
                      {visibleCols.includes("actions") && (
                        <td className="px-4 py-3 text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)" }}>
                          <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setActionMenuId(actionMenuId === lead.id ? null : lead.id)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-75 ml-auto" style={{ borderColor: "var(--card-border)" }}>
                              <MoreHorizontal size={13} />
                            </button>
                            {actionMenuId === lead.id && (
                              <div className="absolute right-0 mt-1 w-44 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
                                <AM icon={<Eye size={12} />} label="View Details" onClick={() => { setViewLead(lead); setActionMenuId(null); }} />
                                <AM icon={<Pencil size={12} />} label="Edit Lead" onClick={() => { openEdit(lead); setActionMenuId(null); }} />
                                <AM icon={<StickyNote size={12} />} label="Add Note" onClick={() => { setNoteForLead(lead); setActionMenuId(null); }} />
                                <AM icon={<Bell size={12} />} label="Set Reminder" onClick={() => { setReminderLead(lead); setActionMenuId(null); }} />
                                <AM icon={lead.starred ? <StarOff size={12} /> : <Star size={12} />} label={lead.starred ? "Unstar" : "Star"} onClick={() => { handleToggleStar(lead.id); setActionMenuId(null); }} />
                                <AM icon={<Copy size={12} />} label="Copy Email" onClick={() => { navigator.clipboard.writeText(lead.email); toast.success("Copied"); setActionMenuId(null); }} />
                                <div style={{ borderTop: "1px solid var(--card-border)" }}>
                                  <AM icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { setDeleteLead(lead); setActionMenuId(null); }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : view === "Kanban" ? (
        /* KANBAN */
        <div key="kanban-view" className="grid grid-cols-1 md:grid-cols-5 gap-4 view-transition">
          {STAGES.map(stage => {
            const sl = filtered.filter(l => l.status === stage);
            const badge = getStatusColor(stage);
            return (
              <div key={stage} className="flex flex-col gap-2.5 p-3 rounded-2xl border min-h-[480px]" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: badge.text }} />
                    <span className="text-xs font-bold uppercase" style={{ color: "var(--text-color)" }}>{stage}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: badge.bg, color: badge.text }}>{sl.length}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">₹{sl.reduce((s, l) => s + (l.estimated_value || 0), 0).toLocaleString("en-IN")}</span>
                </div>
                {sl.map(l => (
                  <div key={l.id} className="p-3 rounded-xl border space-y-2 hover:-translate-y-0.5 hover:shadow-md cursor-pointer" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)", transition: "transform .15s, box-shadow .15s" }} onClick={() => setViewLead(l)}>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="block text-xs font-bold" style={{ color: "var(--text-color)" }}>{l.first_name} {l.last_name}</span>
                        {l.company && <span className="block text-[10px] text-muted-foreground">{l.company}</span>}
                      </div>
                      {l.starred && <Star size={11} fill="#eab308" color="#eab308" className="shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: getPriColor(l.priority).bg, color: getPriColor(l.priority).text }}>{l.priority}</span>
                      <span className="text-xs font-bold" style={{ color: "var(--graph-to)" }}>₹{(l.estimated_value || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex gap-1 border-t pt-2" style={{ borderColor: "var(--card-border)" }} onClick={e => e.stopPropagation()}>
                      {STAGES.filter(s => s !== stage).map(s => (
                        <button key={s} onClick={() => handleUpdateStatus(l.id, s)} className="text-[8px] font-bold px-1 py-0.5 rounded hover:opacity-80" style={{ background: getStatusColor(s).bg, color: getStatusColor(s).text }} title={s}>{s[0]}</button>
                      ))}
                      <button onClick={() => openEdit(l)} className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded border hover:opacity-80" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}><Pencil size={8} /></button>
                    </div>
                  </div>
                ))}
                {sl.length === 0 && <div className="flex-1 flex items-center justify-center"><p className="text-[10px] text-muted-foreground">No leads</p></div>}
              </div>
            );
          })}
        </div>
      ) : (
        /* GRID */
        <div key="grid-view" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 view-transition">
          {filtered.map(lead => {
            const badge = getStatusColor(lead.status);
            return (
              <div key={lead.id} className="p-5 rounded-2xl border space-y-3 hover:shadow-lg cursor-pointer" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", transition: "box-shadow .15s" }} onClick={() => setViewLead(lead)}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); handleToggleStar(lead.id); }}>{lead.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="opacity-30" />}</button>
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{lead.first_name} {lead.last_name}</h3>
                      <p className="text-xs text-muted-foreground">{lead.company || "—"}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: badge.bg, color: badge.text }}>{lead.status}</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Mail size={11} className="opacity-60 shrink-0" /><span className="truncate">{lead.email}</span></div>
                  {lead.phone && <div className="flex items-center gap-1.5"><Phone size={11} className="opacity-60 shrink-0" />{lead.phone}</div>}
                </div>
                <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                  <span className="text-sm font-bold" style={{ color: "var(--graph-to)" }}>₹{(lead.estimated_value || 0).toLocaleString("en-IN")}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(lead)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><Pencil size={11} /></button>
                    <button onClick={() => setDeleteLead(lead)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "#ef4444" }}><Trash2 size={11} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── VIEW DETAILS DRAWER ── */}
      {viewLead && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => setViewLead(null)} />
          <div className="relative ml-auto h-full w-full max-w-[520px] flex flex-col overflow-hidden shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{viewLead.first_name[0]}{viewLead.last_name[0]}</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{viewLead.first_name} {viewLead.last_name}</p>
                  <p className="text-xs text-muted-foreground">{viewLead.company || "No company"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleToggleStar(viewLead.id)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}>{viewLead.starred ? <Star size={14} fill="#eab308" color="#eab308" /> : <StarOff size={14} className="text-muted-foreground" />}</button>
                <button onClick={() => { openEdit(viewLead); setViewLead(null); }} className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><Pencil size={12} />Edit</button>
                <button onClick={() => setViewLead(null)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={14} /></button>
              </div>
            </div>
            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                <select value={viewLead.status} onChange={e => handleUpdateStatus(viewLead.id, e.target.value as LeadStatus)} className="px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer outline-none uppercase border" style={{ background: getStatusColor(viewLead.status).bg, color: getStatusColor(viewLead.status).text, borderColor: getStatusColor(viewLead.status).border }}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase" style={{ background: getPriColor(viewLead.priority).bg, color: getPriColor(viewLead.priority).text }}>{viewLead.priority || "No"} Priority</span>
                <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>{viewLead.source}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ icon: <Bell size={13} />, label: "Reminder", action: () => setReminderLead(viewLead) }, { icon: <StickyNote size={13} />, label: "Add Note", action: () => setNoteForLead(viewLead) }, { icon: <Trash2 size={13} />, label: "Delete", danger: true, action: () => { setDeleteLead(viewLead); setViewLead(null); } }].map(b => (
                  <button key={b.label} onClick={b.action} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold hover:opacity-70" style={{ borderColor: b.danger ? "rgba(239,68,68,.3)" : "var(--card-border)", color: b.danger ? "#ef4444" : "var(--text-color)", background: b.danger ? "rgba(239,68,68,.06)" : "var(--accent)" }}>{b.icon}{b.label}</button>
                ))}
              </div>
              <DS title="Contact">
                <DR icon={<Mail size={12} />} label="Email"><a href={`mailto:${viewLead.email}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewLead.email}</a></DR>
                <DR icon={<Phone size={12} />} label="Phone">{viewLead.phone ? <a href={`tel:${viewLead.phone}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewLead.phone}</a> : <span className="text-muted-foreground">—</span>}</DR>
                <DR icon={<Building size={12} />} label="Company"><span style={{ color: "var(--text-color)" }}>{viewLead.company || "—"}</span></DR>
                {viewLead.website && <DR icon={<ExternalLink size={12} />} label="Website"><a href={`https://${viewLead.website}`} target="_blank" className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewLead.website}</a></DR>}
              </DS>
              <DS title="Deal Info">
                <DR icon={<DollarSign size={12} />} label="Est. Value"><span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{(viewLead.estimated_value || 0).toLocaleString("en-IN")}</span></DR>
                <DR icon={<Hash size={12} />} label="Industry"><span style={{ color: "var(--text-color)" }}>{viewLead.industry || "—"}</span></DR>
                <DR icon={<User size={12} />} label="Employees"><span style={{ color: "var(--text-color)" }}>{viewLead.employee_count || "—"}</span></DR>
                <DR icon={<Tag size={12} />} label="Location"><span style={{ color: "var(--text-color)" }}>{[viewLead.city, viewLead.country].filter(Boolean).join(", ") || "—"}</span></DR>
                <DR icon={<Calendar size={12} />} label="Created"><span style={{ color: "var(--text-color)" }}>{fmtDate(viewLead.created_at)}</span></DR>
              </DS>
              {viewLead.tags && viewLead.tags.length > 0 && (
                <DS title="Tags">
                  <div className="flex flex-wrap gap-1.5">{viewLead.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>
                </DS>
              )}
              {viewLead.notes && <DS title="Background Notes"><p className="text-xs leading-relaxed" style={{ color: "var(--text-color)" }}>{viewLead.notes}</p></DS>}
              <DS title="Activity Log" action={<button onClick={() => setNoteForLead(viewLead)} className="text-xs flex items-center gap-1 font-semibold hover:opacity-70" style={{ color: "var(--graph-to)" }}><Plus size={12} />Add Note</button>}>
                {(viewLead.lead_notes?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No notes yet.</p> : (
                  <div className="space-y-3">
                    {viewLead.lead_notes!.map(n => (
                      <div key={n.id} className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{(n.author || "Y")[0]}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-bold" style={{ color: "var(--text-color)" }}>{n.author}</span><span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span></div>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-color)" }}>{n.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DS>
              {reminders.filter(r => r.lead_id === viewLead.id).length > 0 && (
                <DS title="Reminders">
                  {reminders.filter(r => r.lead_id === viewLead.id).map(r => (
                    <div key={r.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: r.done ? "var(--card-border)" : "rgba(234,179,8,.3)", background: r.done ? "transparent" : "rgba(234,179,8,.06)" }}>
                      <button onClick={() => setReminders(p => p.map(x => x.id === r.id ? { ...x, done: !x.done } : x))} className="shrink-0">{r.done ? <CheckCircle2 size={14} style={{ color: "#10b981" }} /> : <Clock size={14} style={{ color: "#eab308" }} />}</button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: r.done ? "line-through" : "none" }}>{r.title}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(r.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{r.type}</span>
                    </div>
                  ))}
                </DS>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT DRAWER ── */}
      {(isCreateOpen || editLead) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => { setIsCreateOpen(false); setEditLead(null); }} />
          <div className="relative ml-auto h-full w-full max-w-[520px] overflow-y-auto shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <form onSubmit={editLead ? handleEditLead : handleCreateLead}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "var(--card-bg-solid)", borderBottom: "1px solid var(--card-border)" }}>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>{editLead ? "Edit Lead" : "Create New Lead"}</h2>
                <button type="button" onClick={() => { setIsCreateOpen(false); setEditLead(null); }} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={15} /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <FS title="Identity">
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="First Name *"><input required value={form.first_name} onChange={e => setF("first_name", e.target.value)} className="ct-fi" placeholder="Vikram" /></FF>
                    <FF label="Last Name *"><input required value={form.last_name} onChange={e => setF("last_name", e.target.value)} className="ct-fi" placeholder="Singh" /></FF>
                  </div>
                  <FF label="Email *"><input type="email" required value={form.email} onChange={e => setF("email", e.target.value)} className="ct-fi" placeholder="vikram@company.in" /></FF>
                  <FF label="Phone"><input value={form.phone} onChange={e => setF("phone", e.target.value)} className="ct-fi" placeholder="+91-9876543210" /></FF>
                </FS>
                <FS title="Company">
                  <FF label="Company Name"><input value={form.company} onChange={e => setF("company", e.target.value)} className="ct-fi" placeholder="Acme Corp" /></FF>
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="Industry"><input value={form.industry} onChange={e => setF("industry", e.target.value)} className="ct-fi" placeholder="Technology" /></FF>
                    <FF label="Employees">
                      <select value={form.employee_count} onChange={e => setF("employee_count", e.target.value)} className="ct-fi">
                        <option value="">Select range</option>
                        {["1-10","10-50","50-100","100-500","500-1000","1000+"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </FF>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="City"><input value={form.city} onChange={e => setF("city", e.target.value)} className="ct-fi" placeholder="Mumbai" /></FF>
                    <FF label="Country"><input value={form.country} onChange={e => setF("country", e.target.value)} className="ct-fi" /></FF>
                  </div>
                  <FF label="Website"><input value={form.website} onChange={e => setF("website", e.target.value)} className="ct-fi" placeholder="acmecorp.in" /></FF>
                  <FF label="LinkedIn"><input value={form.linkedin} onChange={e => setF("linkedin", e.target.value)} className="ct-fi" placeholder="linkedin.com/in/name" /></FF>
                </FS>
                <FS title="Deal Details">
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="Lead Source">
                      <select value={form.source} onChange={e => setF("source", e.target.value)} className="ct-fi">
                        {[["DIRECT","Direct Form"],["GOOGLE","Google Ads"],["META","Meta Ads"],["REFERRAL","Referral"],["WHATSAPP","WhatsApp"],["LINKEDIN","LinkedIn"],["EVENT","Event"],["OTHER","Other"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </FF>
                    <FF label="Estimated Value (₹)"><input type="number" value={form.estimated_value} onChange={e => setF("estimated_value", e.target.value)} className="ct-fi" placeholder="500000" /></FF>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="Status">
                      <select value={form.status} onChange={e => setF("status", e.target.value as LeadStatus)} className="ct-fi">
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FF>
                    <FF label="Priority">
                      <select value={form.priority} onChange={e => setF("priority", e.target.value as any)} className="ct-fi">
                        {["low","medium","high","urgent"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                      </select>
                    </FF>
                  </div>
                  <FF label="Tags (comma separated)"><input value={form.tags} onChange={e => setF("tags", e.target.value)} className="ct-fi" placeholder="Enterprise, Hot Lead" /></FF>
                </FS>
                <FS title="Notes">
                  <FF label="Background Notes"><textarea rows={4} value={form.notes} onChange={e => setF("notes", e.target.value)} className="ct-fi" style={{ height: "auto", padding: "0.6rem 0.75rem" }} placeholder="Key context..." /></FF>
                </FS>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsCreateOpen(false); setEditLead(null); }} className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold text-sm hover:opacity-80 active:scale-95" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Saving..." : (editLead ? "Save Changes" : "Create Lead")}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteLead(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,.1)" }}><Trash2 size={22} style={{ color: "#ef4444" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "var(--text-color)" }}>Delete Lead?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5"><strong style={{ color: "var(--text-color)" }}>{deleteLead.first_name} {deleteLead.last_name}</strong> from <strong style={{ color: "var(--text-color)" }}>{deleteLead.company || "Unknown"}</strong> will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteLead(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleDeleteLead} className="flex-1 h-10 rounded-xl font-semibold text-sm text-white hover:opacity-80" style={{ background: "#ef4444" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NOTE MODAL ── */}
      {noteForLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setNoteForLead(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Add Note — {noteForLead.first_name} {noteForLead.last_name}</h3>
              <button onClick={() => setNoteForLead(null)} className="hover:opacity-70"><X size={15} /></button>
            </div>
            <textarea autoFocus rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full border rounded-xl p-3 text-sm outline-none resize-none" style={{ borderColor: "var(--card-border)", background: "var(--accent)", color: "var(--text-color)" }} placeholder="Write your note..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteForLead(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={() => { handleAddNote(noteForLead); setNoteForLead(null); }} className="flex-1 h-10 rounded-xl font-semibold text-sm hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SET REMINDER MODAL ── */}
      {reminderLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setReminderLead(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Set Reminder</h3><p className="text-xs text-muted-foreground">For: {reminderLead.first_name} {reminderLead.last_name}</p></div>
              <button onClick={() => setReminderLead(null)} className="hover:opacity-70"><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <FF label="Reminder Title *"><input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} className="ct-fi" placeholder="Follow-up call" /></FF>
              <div className="grid grid-cols-2 gap-3">
                <FF label="Type">
                  <select value={reminderForm.type} onChange={e => setReminderForm(f => ({ ...f, type: e.target.value as any }))} className="ct-fi">
                    <option value="call">📞 Call</option><option value="email">✉️ Email</option><option value="meeting">🗓 Meeting</option><option value="follow_up">🔁 Follow-up</option>
                  </select>
                </FF>
                <FF label="Date & Time *"><input type="datetime-local" value={reminderForm.datetime} onChange={e => setReminderForm(f => ({ ...f, datetime: e.target.value }))} className="ct-fi" min={new Date().toISOString().slice(0, 16)} /></FF>
              </div>
              <FF label="Note (optional)"><textarea rows={2} value={reminderForm.note} onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))} className="ct-fi" style={{ height: "auto", padding: "0.5rem 0.75rem" }} placeholder="What to discuss..." /></FF>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setReminderLead(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleSetReminder} className="flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Bell size={13} />Set Reminder</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLUMN EDITOR ── */}
      {columnEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setColumnEditorOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}><SlidersHorizontal size={14} className="inline mr-1.5" />Customise Columns</h3><button onClick={() => setColumnEditorOpen(false)} className="hover:opacity-70"><X size={14} /></button></div>
            <p className="text-xs text-muted-foreground mb-4">Toggle columns in the table view.</p>
            <div className="space-y-1.5">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer hover:bg-accent" style={{ transition: "background .1s" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-color)" }}>{col.label}</span>
                  <div className="relative w-9 h-5 rounded-full cursor-pointer" style={{ background: visibleCols.includes(col.key) ? "var(--graph-to)" : "var(--card-border)", transition: "background .15s" }} onClick={() => { if (col.required) return; setVisibleCols(p => p.includes(col.key) ? p.filter(c => c !== col.key) : [...p, col.key]); }}>
                    <div className="absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full shadow" style={{ left: visibleCols.includes(col.key) ? "19px" : "3px", transition: "left .15s" }} />
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setVisibleCols(ALL_COLUMNS.map(c => c.key))} className="flex-1 h-9 rounded-xl border text-xs font-semibold hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Show All</button>
              <button onClick={() => setColumnEditorOpen(false)} className="flex-1 h-9 rounded-xl text-xs font-semibold hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.ct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.ct-fi:focus{border-color:var(--graph-to)}.ct-fi::placeholder{color:var(--muted-foreground);opacity:.7}`}</style>
    </div>
  );
}

// ─── Tiny shared components ───────────────────────────────────────────────────
function Btn({ children, onClick, primary, ghost, icon }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; ghost?: boolean; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 active:scale-95" style={{ background: primary ? "var(--graph-to)" : "var(--card-bg)", color: primary ? "#0a0a0a" : "var(--text-color)", border: ghost ? "1px solid var(--card-border)" : "none", transition: "opacity .15s" }}>
      {icon}{children}
    </button>
  );
}
function AM({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left hover:bg-accent" style={{ color: danger ? "#ef4444" : "var(--text-color)", transition: "background .1s" }}>{icon}{label}</button>;
}
function DS({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{action}</div>
      <div className="rounded-xl border p-3.5 space-y-2.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>{children}</div>
    </div>
  );
}
function DR({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span><div className="text-xs">{children}</div></div>
    </div>
  );
}
function FS({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{children}</div>;
}
function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>{children}</div>;
}
