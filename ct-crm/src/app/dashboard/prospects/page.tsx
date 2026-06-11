"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Search, Plus, MoreHorizontal, Mail, Building, DollarSign, X, Eye,
  Pencil, Trash2, Bell, StickyNote, Star, StarOff, Copy, Calendar,
  Clock, Tag, CheckCircle2, SlidersHorizontal, Hash, MessageSquare,
  ShieldCheck, ArrowRight, UserCheck, AlertTriangle, Filter,
  Phone, ChevronDown, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ProspectStatus = "QUALIFIED" | "PROPOSAL_SENT" | "IN_NEGOTIATION" | "DEAL_OPENED" | "LOST";

interface PNote { id: string; text: string; created_at: string; author?: string; }
interface Reminder { id: string; p_id: string; p_name: string; title: string; type: "call" | "email" | "meeting" | "follow_up"; datetime: string; note?: string; done: boolean; }

interface Prospect {
  id: string;
  lead_id?: string;
  first_name: string;
  last_name: string;
  company?: string;
  email?: string;
  phone?: string;
  budget?: number;
  authority?: boolean;
  need?: string;
  timeline?: string;
  status: ProspectStatus;
  source?: string;
  industry?: string;
  city?: string;
  notes?: string;
  starred?: boolean;
  tags?: string[];
  pnotes?: PNote[];
  qualified_at?: string;
  created_at?: string;
}

const ALL_COLUMNS = [
  { key: "name", label: "Prospect", required: true },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "budget", label: "Budget" },
  { key: "authority", label: "Authority" },
  { key: "timeline", label: "Timeline" },
  { key: "status", label: "Status" },
  { key: "industry", label: "Industry" },
  { key: "need", label: "Need" },
  { key: "qualified_at", label: "Qualified" },
  { key: "actions", label: "Actions", required: true },
];

const TIMELINE_OPTS = ["Immediate (0-15 days)", "Near-Term (30-60 days)", "Mid-Term (90 days)", "Long-Term (6 months+)"];

const FALLBACK: Prospect[] = [
  { id: "p1", first_name: "Vikram", last_name: "Singh", company: "Acme Corp", email: "vikram@acmecorp.in", phone: "+91-9876543210", budget: 450000, authority: true, need: "Enterprise cloud dashboard implementation with SSO and audit logs.", timeline: "Immediate (0-15 days)", status: "DEAL_OPENED", source: "REFERRAL", industry: "Technology", city: "Mumbai", starred: true, tags: ["Hot", "Enterprise"], pnotes: [{ id: "n1", text: "Approved by board. Awaiting legal sign-off on contract.", created_at: new Date(Date.now() - 86400000).toISOString(), author: "You" }], qualified_at: new Date(Date.now() - 86400000 * 3).toISOString(), created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "p2", first_name: "Arjun", last_name: "Mehta", company: "CloudSoft Technologies", email: "arjun@cloudsoft.in", phone: "+91-9876543212", budget: 320000, authority: true, need: "Operational ERP API connectivity and data pipeline automation.", timeline: "Near-Term (30-60 days)", status: "IN_NEGOTIATION", source: "GOOGLE", industry: "Cloud", city: "Pune", starred: false, tags: ["Negotiating"], pnotes: [], qualified_at: new Date(Date.now() - 86400000 * 7).toISOString(), created_at: new Date(Date.now() - 86400000 * 9).toISOString() },
  { id: "p3", first_name: "Sanya", last_name: "Reddy", company: "DataFlow Inc", email: "sanya@dataflow.co", budget: 280000, authority: true, need: "Real-time analytics dashboard with custom KPI widgets.", timeline: "Mid-Term (90 days)", status: "PROPOSAL_SENT", source: "DIRECT", industry: "Analytics", city: "Hyderabad", starred: false, tags: ["Mid-market"], pnotes: [], qualified_at: new Date(Date.now() - 86400000 * 10).toISOString(), created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: "p4", first_name: "Rohan", last_name: "Joshi", company: "NovaTech Labs", email: "rohan@novatech.in", budget: 150000, authority: false, need: "AI chatbot for customer support automation.", timeline: "Long-Term (6 months+)", status: "QUALIFIED", source: "META", industry: "HealthTech", city: "Delhi", starred: false, tags: ["New"], pnotes: [], qualified_at: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

function getStatusColor(s: ProspectStatus) {
  const m: Record<ProspectStatus, { bg: string; text: string; border: string }> = {
    QUALIFIED: { bg: "rgba(59,130,246,.15)", text: "#3b82f6", border: "rgba(59,130,246,.3)" },
    PROPOSAL_SENT: { bg: "rgba(249,115,22,.15)", text: "#f97316", border: "rgba(249,115,22,.3)" },
    IN_NEGOTIATION: { bg: "rgba(234,179,8,.15)", text: "#eab308", border: "rgba(234,179,8,.3)" },
    DEAL_OPENED: { bg: "rgba(16,185,129,.15)", text: "#10b981", border: "rgba(16,185,129,.3)" },
    LOST: { bg: "rgba(239,68,68,.15)", text: "#ef4444", border: "rgba(239,68,68,.3)" },
  };
  return m[s];
}

function timeAgo(d?: string) { if (!d) return "—"; const diff = Date.now() - new Date(d).getTime(); if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; return `${Math.floor(diff / 86400000)}d ago`; }
function fmtDate(d?: string) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
const STAGES: ProspectStatus[] = ["QUALIFIED", "PROPOSAL_SENT", "IN_NEGOTIATION", "DEAL_OPENED", "LOST"];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [viewP, setViewP] = useState<Prospect | null>(null);
  const [editP, setEditP] = useState<Prospect | null>(null);
  const [deleteP, setDeleteP] = useState<Prospect | null>(null);
  const [reminderP, setReminderP] = useState<Prospect | null>(null);
  const [noteForP, setNoteForP] = useState<Prospect | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(["name", "company", "email", "budget", "authority", "timeline", "status", "need", "qualified_at", "actions"]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newNote, setNewNote] = useState("");
  const [reminderForm, setReminderForm] = useState({ title: "", type: "call" as Reminder["type"], datetime: "", note: "" });
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", budget: "", authority: false, need: "", timeline: TIMELINE_OPTS[1], status: "QUALIFIED" as ProspectStatus, source: "DIRECT", industry: "", city: "", notes: "", tags: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      const sb = createClient();
      const [prospectsRes, notesRes, remindersRes] = await Promise.all([
        sb.from("prospects").select("*, lead:leads(first_name,last_name,company,email,phone)").order("qualified_at", { ascending: false }),
        sb.from("prospect_notes").select("*").order("created_at", { ascending: false }),
        sb.from("reminders").select("*").eq("entity_type", "prospect").order("datetime", { ascending: true }),
      ]);
      if (prospectsRes.error) throw prospectsRes.error;
      if (prospectsRes.data?.length) {
        const notesData = notesRes.data || [];
        setProspects(prospectsRes.data.map((d: any) => ({
          ...d,
          first_name: d.lead?.first_name || d.first_name || "Unknown",
          last_name: d.lead?.last_name || d.last_name || "",
          company: d.lead?.company || d.company,
          email: d.lead?.email || d.email,
          phone: d.lead?.phone || d.phone,
          tags: d.tags || [], starred: d.starred || false,
          pnotes: notesData.filter((n: any) => n.prospect_id === d.id).map((n: any) => ({ id: n.id, text: n.text, created_at: n.created_at, author: n.author || "You" })),
        })));
      }
      if (remindersRes.data?.length) {
        setReminders(remindersRes.data.map((r: any) => ({ id: r.id, p_id: r.entity_id, p_name: r.entity_name || "", title: r.title, type: r.type, datetime: r.datetime, note: r.note || "", done: r.done || false })));
      }
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);
  useEffect(() => { if (!actionMenuId) return; const h = () => setActionMenuId(null); document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [actionMenuId]);

  const handleUpdateStatus = useCallback(async (id: string, next: ProspectStatus) => {
    setProspects(p => p.map(x => x.id === id ? { ...x, status: next } : x));
    if (viewP?.id === id) setViewP(v => v ? { ...v, status: next } : v);
    try { await createClient().from("prospects").update({ status: next }).eq("id", id); toast.success(`Status → ${next.replace(/_/g, " ")}`); }
    catch { toast.success(`[Demo] Status → ${next.replace(/_/g, " ")}`); }
  }, [viewP]);

  const handleToggleStar = useCallback((id: string) => {
    setProspects(p => p.map(x => x.id === id ? { ...x, starred: !x.starred } : x));
    if (viewP?.id === id) setViewP(v => v ? { ...v, starred: !v.starred } : v);
  }, [viewP]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error("Name required"); return; }
    setSubmitting(true);
    const full: Prospect = { id: "", first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, company: form.company, budget: parseFloat(form.budget) || 0, authority: form.authority, need: form.need, timeline: form.timeline, status: form.status, source: form.source, industry: form.industry, city: form.city, notes: form.notes, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [], starred: false, pnotes: [], qualified_at: new Date().toISOString(), created_at: new Date().toISOString() };
    try {
      const dbPayload = { budget: parseFloat(form.budget) || 0, authority: form.authority, need: form.need, timeline: form.timeline, qualified_at: new Date().toISOString() };
      const { data, error } = await createClient().from("prospects").insert(dbPayload).select("id").single();
      if (error) throw error;
      setProspects(p => [{ ...full, id: data.id }, ...p]);
      toast.success("✅ Prospect saved to database!");
    } catch {
      setProspects(p => [{ ...full, id: Math.random().toString(36).slice(7) }, ...p]);
      toast.success("[Demo] Prospect added locally");
    } finally { setSubmitting(false); setIsCreateOpen(false); resetForm(); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editP) return;
    setSubmitting(true);
    const updates: Partial<Prospect> = { first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, company: form.company, budget: parseFloat(form.budget) || 0, authority: form.authority, need: form.need, timeline: form.timeline, status: form.status, industry: form.industry, city: form.city, notes: form.notes, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [] };
    const updated = { ...editP, ...updates };
    setProspects(p => p.map(x => x.id === editP.id ? updated : x));
    if (viewP?.id === editP.id) setViewP(updated);
    try {
      const { error } = await createClient().from("prospects").update({ budget: updates.budget, authority: updates.authority, need: updates.need, timeline: updates.timeline }).eq("id", editP.id);
      if (error) throw error; toast.success("✅ Prospect updated!");
    } catch { toast.success("[Demo] Prospect updated locally"); }
    finally { setSubmitting(false); setEditP(null); }
  };

  const handleDelete = async () => {
    if (!deleteP) return;
    setProspects(p => p.filter(x => x.id !== deleteP.id));
    if (viewP?.id === deleteP.id) setViewP(null);
    toast.success("Prospect removed"); setDeleteP(null);
    try { await createClient().from("prospects").delete().eq("id", deleteP.id); } catch {}
  };

  const handleAddNote = async (p: Prospect) => {
    if (!newNote.trim()) return;
    const noteText = newNote.trim();
    const tempNote: PNote = { id: Math.random().toString(36).slice(7), text: noteText, created_at: new Date().toISOString(), author: "You" };
    const updated = { ...p, pnotes: [tempNote, ...(p.pnotes || [])] };
    setProspects(prev => prev.map(x => x.id === p.id ? updated : x));
    if (viewP?.id === p.id) setViewP(updated);
    setNewNote("");
    try {
      const { data, error } = await createClient().from("prospect_notes").insert({ prospect_id: p.id, text: noteText, author: "You" }).select("id").single();
      if (!error && data) {
        const realNote = { ...tempNote, id: data.id };
        setProspects(prev => prev.map(x => x.id === p.id ? { ...x, pnotes: x.pnotes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : x));
        if (viewP?.id === p.id) setViewP(v => v ? { ...v, pnotes: v.pnotes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : v);
        toast.success("✅ Note saved!");
      } else { toast.success("Note added"); }
    } catch { toast.success("Note added"); }
  };

  const handleSetReminder = async () => {
    if (!reminderP || !reminderForm.title || !reminderForm.datetime) { toast.error("Fill title & date/time"); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, p_id: reminderP.id, p_name: `${reminderP.first_name} ${reminderP.last_name}`, ...reminderForm, done: false };
    setReminders(p => [...p, r]);
    toast.success(`⏰ Reminder set for ${new Date(reminderForm.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
    setReminderP(null); setReminderForm({ title: "", type: "call", datetime: "", note: "" });
    try {
      const { data } = await createClient().from("reminders").insert({ entity_type: "prospect", entity_id: reminderP.id, entity_name: r.p_name, title: r.title, type: r.type, datetime: r.datetime, note: r.note, done: false }).select("id").single();
      if (data?.id) setReminders(p => p.map(x => x.id === tempId ? { ...x, id: data.id } : x));
    } catch {}
  };

  const openEdit = (p: Prospect) => { setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email || "", phone: p.phone || "", company: p.company || "", budget: String(p.budget || ""), authority: p.authority || false, need: p.need || "", timeline: p.timeline || TIMELINE_OPTS[1], status: p.status, source: p.source || "DIRECT", industry: p.industry || "", city: p.city || "", notes: p.notes || "", tags: (p.tags || []).join(", ") }); setEditP(p); };
  const resetForm = () => setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", budget: "", authority: false, need: "", timeline: TIMELINE_OPTS[1], status: "QUALIFIED", source: "DIRECT", industry: "", city: "", notes: "", tags: "" });

  const filtered = prospects.filter(p => (!search || `${p.first_name} ${p.last_name} ${p.email} ${p.company}`.toLowerCase().includes(search.toLowerCase())) && (statusFilter === "ALL" || p.status === statusFilter));
  const totalBudget = filtered.reduce((s, p) => s + (p.budget || 0), 0);
  const activeReminders = reminders.filter(r => !r.done);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>BANT Prospects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{prospects.length} qualified · Pipeline ₹{(totalBudget / 100000).toFixed(1)}L{activeReminders.length > 0 ? ` · ${activeReminders.length} reminders` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeReminders.length > 0 && <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border" style={{ background: "rgba(234,179,8,.1)", borderColor: "rgba(234,179,8,.3)", color: "#eab308" }}><Bell size={13} />{activeReminders.length} reminder{activeReminders.length > 1 ? "s" : ""}</div>}
          <button onClick={() => setColumnEditorOpen(true)} className="h-9 px-3 rounded-xl text-xs font-semibold border flex items-center gap-1.5 hover:opacity-80" style={{ borderColor: "var(--card-border)", color: "var(--text-color)", background: "var(--card-bg)" }}><SlidersHorizontal size={13} />Columns</button>
          <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={15} />New Prospect</button>
        </div>
      </div>

      {/* Pipeline progress */}
      <div className="grid grid-cols-5 gap-2">
        {STAGES.map(stage => {
          const cnt = prospects.filter(p => p.status === stage).length;
          const badge = getStatusColor(stage);
          return (
            <button key={stage} onClick={() => setStatusFilter(statusFilter === stage ? "ALL" : stage)} className="p-3 rounded-xl border text-left hover:opacity-80" style={{ background: statusFilter === stage ? badge.bg : "var(--card-bg)", borderColor: statusFilter === stage ? badge.border : "var(--card-border)", transition: "all .15s" }}>
              <p className="text-lg font-black" style={{ color: badge.text }}>{cnt}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{stage.replace(/_/g, " ")}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input type="text" placeholder="Search prospects..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 pl-9 pr-3 rounded-xl text-xs bg-transparent border" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
        </div>
        <div className="flex items-center gap-1.5 border px-2.5 h-9 rounded-xl text-xs" style={{ borderColor: "var(--card-border)" }}>
          <Filter size={12} className="text-muted-foreground" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent font-medium cursor-pointer outline-none" style={{ color: "var(--text-color)" }}>
            <option value="ALL">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        {(search || statusFilter !== "ALL") && <button onClick={() => { setSearch(""); setStatusFilter("ALL"); }} className="h-9 px-3 rounded-xl text-xs flex items-center gap-1 font-semibold" style={{ color: "#ef4444", background: "rgba(239,68,68,.1)" }}><X size={12} />Clear</button>}
        <span className="ml-auto text-xs text-muted-foreground">Total Pipeline: <span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{totalBudget.toLocaleString("en-IN")}</span></span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}><ShieldCheck size={24} className="text-muted-foreground" /></div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>No prospects found</p>
          <p className="text-xs text-muted-foreground mt-1">BANT-qualify leads to create prospects.</p>
          <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="mt-4 h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={14} />New Prospect</button>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]" style={{ background: "var(--card-bg)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg-solid)" }}>
                  {visibleCols.includes("name") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 z-10" style={{ background: "var(--card-bg-solid)", minWidth: 200 }}>Prospect</th>}
                  {visibleCols.includes("company") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Company</th>}
                  {visibleCols.includes("email") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 180 }}>Email</th>}
                  {visibleCols.includes("phone") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Phone</th>}
                  {visibleCols.includes("budget") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right" style={{ minWidth: 110 }}>Budget</th>}
                  {visibleCols.includes("authority") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Authority</th>}
                  {visibleCols.includes("timeline") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Timeline</th>}
                  {visibleCols.includes("status") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Stage</th>}
                  {visibleCols.includes("industry") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Industry</th>}
                  {visibleCols.includes("need") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 160 }}>Need</th>}
                  {visibleCols.includes("qualified_at") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Qualified</th>}
                  {visibleCols.includes("actions") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)" }}>Actions</th>}
                </tr>
              </thead>
              <tbody style={{ color: "var(--text-color)" }}>
                {filtered.map(p => {
                  const badge = getStatusColor(p.status);
                  return (
                    <tr key={p.id} className="border-b hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)", transition: "background .1s" }}>
                      {visibleCols.includes("name") && (
                        <td className="px-4 py-3 sticky left-0 z-10" style={{ background: "inherit" }}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleStar(p.id)} className="shrink-0">{p.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="opacity-30" />}</button>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{p.first_name[0]}{(p.last_name || "")[0]}</div>
                            <div>
                              <button onClick={() => setViewP(p)} className="font-semibold hover:underline text-left block" style={{ color: "var(--text-color)" }}>{p.first_name} {p.last_name}</button>
                              {p.tags && p.tags.length > 0 && <div className="flex gap-1 mt-0.5">{p.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("company") && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-muted-foreground"><Building size={11} className="opacity-60 shrink-0" />{p.company || "—"}</div></td>}
                      {visibleCols.includes("email") && <td className="px-4 py-3">{p.email ? <a href={`mailto:${p.email}`} className="flex items-center gap-1 hover:underline" style={{ color: "var(--graph-to)" }}><Mail size={11} />{p.email}</a> : <span className="text-muted-foreground">—</span>}</td>}
                      {visibleCols.includes("phone") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{p.phone || "—"}</td>}
                      {visibleCols.includes("budget") && <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--graph-to)" }}>₹{(p.budget || 0).toLocaleString("en-IN")}</td>}
                      {visibleCols.includes("authority") && <td className="px-4 py-3"><span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: p.authority ? "#10b981" : "#ef4444" }}>{p.authority ? <><CheckCircle2 size={11} />Yes</> : <><AlertTriangle size={11} />No</>}</span></td>}
                      {visibleCols.includes("timeline") && <td className="px-4 py-3 text-muted-foreground text-[11px] whitespace-nowrap">{p.timeline?.split(" (")[0] || "—"}</td>}
                      {visibleCols.includes("status") && (
                        <td className="px-4 py-3">
                          <select value={p.status} onChange={e => handleUpdateStatus(p.id, e.target.value as ProspectStatus)} className="px-2 py-1 rounded-xl font-bold text-[10px] cursor-pointer outline-none uppercase" style={{ background: badge.bg, color: badge.text, border: "none" }}>
                            {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                          </select>
                        </td>
                      )}
                      {visibleCols.includes("industry") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{p.industry || "—"}</td>}
                      {visibleCols.includes("need") && <td className="px-4 py-3 text-muted-foreground"><span className="line-clamp-1 max-w-[150px] block text-[11px]">{p.need || "—"}</span></td>}
                      {visibleCols.includes("qualified_at") && <td className="px-4 py-3 text-muted-foreground text-[11px] whitespace-nowrap">{fmtDate(p.qualified_at)}</td>}
                      {visibleCols.includes("actions") && (
                        <td className="px-4 py-3 text-right sticky right-0 z-10" style={{ background: "inherit" }}>
                          <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setActionMenuId(actionMenuId === p.id ? null : p.id)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-75 ml-auto" style={{ borderColor: "var(--card-border)" }}><MoreHorizontal size={13} /></button>
                            {actionMenuId === p.id && (
                              <div className="absolute right-0 mt-1 w-44 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
                                <PAM icon={<Eye size={12} />} label="View Details" onClick={() => { setViewP(p); setActionMenuId(null); }} />
                                <PAM icon={<Pencil size={12} />} label="Edit Prospect" onClick={() => { openEdit(p); setActionMenuId(null); }} />
                                <PAM icon={<StickyNote size={12} />} label="Add Note" onClick={() => { setNoteForP(p); setActionMenuId(null); }} />
                                <PAM icon={<Bell size={12} />} label="Set Reminder" onClick={() => { setReminderP(p); setActionMenuId(null); }} />
                                <PAM icon={p.starred ? <StarOff size={12} /> : <Star size={12} />} label={p.starred ? "Unstar" : "Star"} onClick={() => { handleToggleStar(p.id); setActionMenuId(null); }} />
                                <PAM icon={<Copy size={12} />} label="Copy Email" onClick={() => { if (p.email) navigator.clipboard.writeText(p.email); toast.success("Copied"); setActionMenuId(null); }} />
                                <div style={{ borderTop: "1px solid var(--card-border)" }}>
                                  <PAM icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { setDeleteP(p); setActionMenuId(null); }} />
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
      )}

      {/* ── VIEW DRAWER ── */}
      {viewP && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewP(null)} />
          <div className="relative ml-auto h-full w-full max-w-[520px] flex flex-col overflow-hidden shadow-2xl" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{viewP.first_name[0]}{(viewP.last_name || "")[0]}</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{viewP.first_name} {viewP.last_name}</p>
                  <p className="text-xs text-muted-foreground">{viewP.company || "No company"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleToggleStar(viewP.id)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}>{viewP.starred ? <Star size={14} fill="#eab308" color="#eab308" /> : <StarOff size={14} className="text-muted-foreground" />}</button>
                <button onClick={() => { openEdit(viewP); setViewP(null); }} className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><Pencil size={12} />Edit</button>
                <button onClick={() => setViewP(null)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                <select value={viewP.status} onChange={e => handleUpdateStatus(viewP.id, e.target.value as ProspectStatus)} className="px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer outline-none uppercase border" style={{ background: getStatusColor(viewP.status).bg, color: getStatusColor(viewP.status).text, borderColor: getStatusColor(viewP.status).border }}>
                  {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1`} style={{ background: viewP.authority ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", color: viewP.authority ? "#10b981" : "#ef4444" }}>{viewP.authority ? <><CheckCircle2 size={11} />Authority Verified</> : <><AlertTriangle size={11} />No Authority</>}</span>
              </div>

              {/* BANT summary */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "B — Budget", value: `₹${(viewP.budget || 0).toLocaleString("en-IN")}`, color: "var(--graph-to)" },
                  { label: "A — Authority", value: viewP.authority ? "Confirmed" : "Unverified", color: viewP.authority ? "#10b981" : "#ef4444" },
                  { label: "N — Need", value: viewP.need || "—", color: "var(--text-color)" },
                  { label: "T — Timeline", value: viewP.timeline?.split(" (")[0] || "—", color: "var(--text-color)" },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl border" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                    <p className="text-xs font-semibold line-clamp-2" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[{ icon: <Bell size={13} />, label: "Reminder", action: () => setReminderP(viewP) }, { icon: <StickyNote size={13} />, label: "Add Note", action: () => setNoteForP(viewP) }, { icon: <Trash2 size={13} />, label: "Delete", danger: true, action: () => { setDeleteP(viewP); setViewP(null); } }].map(b => (
                  <button key={b.label} onClick={b.action} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold hover:opacity-70" style={{ borderColor: (b as any).danger ? "rgba(239,68,68,.3)" : "var(--card-border)", color: (b as any).danger ? "#ef4444" : "var(--text-color)", background: (b as any).danger ? "rgba(239,68,68,.06)" : "var(--accent)" }}>{b.icon}{b.label}</button>
                ))}
              </div>
              <PDS title="Contact Info">
                {viewP.email && <PDR icon={<Mail size={12} />} label="Email"><a href={`mailto:${viewP.email}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewP.email}</a></PDR>}
                {viewP.phone && <PDR icon={<Phone size={12} />} label="Phone"><a href={`tel:${viewP.phone}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewP.phone}</a></PDR>}
                <PDR icon={<Building size={12} />} label="Company"><span style={{ color: "var(--text-color)" }}>{viewP.company || "—"}</span></PDR>
                <PDR icon={<Hash size={12} />} label="Industry"><span style={{ color: "var(--text-color)" }}>{viewP.industry || "—"}</span></PDR>
                <PDR icon={<Calendar size={12} />} label="Qualified"><span style={{ color: "var(--text-color)" }}>{fmtDate(viewP.qualified_at)}</span></PDR>
              </PDS>
              {viewP.tags && viewP.tags.length > 0 && <PDS title="Tags"><div className="flex flex-wrap gap-1.5">{viewP.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div></PDS>}
              {viewP.notes && <PDS title="Notes"><p className="text-xs leading-relaxed" style={{ color: "var(--text-color)" }}>{viewP.notes}</p></PDS>}
              <PDS title="Activity Log" action={<button onClick={() => setNoteForP(viewP)} className="text-xs flex items-center gap-1 font-semibold hover:opacity-70" style={{ color: "var(--graph-to)" }}><Plus size={12} />Add</button>}>
                {(viewP.pnotes?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No notes yet.</p> : (
                  <div className="space-y-3">{viewP.pnotes!.map(n => (
                    <div key={n.id} className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{(n.author || "Y")[0]}</div>
                      <div><div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-bold" style={{ color: "var(--text-color)" }}>{n.author}</span><span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span></div><p className="text-xs" style={{ color: "var(--text-color)" }}>{n.text}</p></div>
                    </div>
                  ))}</div>
                )}
              </PDS>
              {reminders.filter(r => r.p_id === viewP.id).length > 0 && (
                <PDS title="Reminders">
                  {reminders.filter(r => r.p_id === viewP.id).map(r => (
                    <div key={r.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: r.done ? "var(--card-border)" : "rgba(234,179,8,.3)", background: r.done ? "transparent" : "rgba(234,179,8,.06)" }}>
                      <button onClick={() => setReminders(p => p.map(x => x.id === r.id ? { ...x, done: !x.done } : x))}>{r.done ? <CheckCircle2 size={14} style={{ color: "#10b981" }} /> : <Clock size={14} style={{ color: "#eab308" }} />}</button>
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: r.done ? "line-through" : "none" }}>{r.title}</p><p className="text-[10px] text-muted-foreground">{new Date(r.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{r.type}</span>
                    </div>
                  ))}
                </PDS>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE/EDIT DRAWER ── */}
      {(isCreateOpen || editP) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setIsCreateOpen(false); setEditP(null); }} />
          <div className="relative ml-auto h-full w-full max-w-[520px] overflow-y-auto shadow-2xl" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <form onSubmit={editP ? handleEdit : handleCreate}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "var(--card-bg-solid)", borderBottom: "1px solid var(--card-border)" }}>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>{editP ? "Edit Prospect" : "New Prospect"}</h2>
                <button type="button" onClick={() => { setIsCreateOpen(false); setEditP(null); }} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={15} /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <PFS title="Identity">
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="First Name *"><input required value={form.first_name} onChange={e => setF("first_name", e.target.value)} className="pct-fi" placeholder="Vikram" /></PFF>
                    <PFF label="Last Name *"><input required value={form.last_name} onChange={e => setF("last_name", e.target.value)} className="pct-fi" placeholder="Singh" /></PFF>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Email"><input type="email" value={form.email} onChange={e => setF("email", e.target.value)} className="pct-fi" /></PFF>
                    <PFF label="Phone"><input value={form.phone} onChange={e => setF("phone", e.target.value)} className="pct-fi" /></PFF>
                  </div>
                  <PFF label="Company"><input value={form.company} onChange={e => setF("company", e.target.value)} className="pct-fi" placeholder="Acme Corp" /></PFF>
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Industry"><input value={form.industry} onChange={e => setF("industry", e.target.value)} className="pct-fi" placeholder="Technology" /></PFF>
                    <PFF label="City"><input value={form.city} onChange={e => setF("city", e.target.value)} className="pct-fi" placeholder="Mumbai" /></PFF>
                  </div>
                </PFS>
                <PFS title="BANT Qualification">
                  <PFF label="Budget (₹) *"><input type="number" required value={form.budget} onChange={e => setF("budget", e.target.value)} className="pct-fi" placeholder="500000" /></PFF>
                  <div className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: "var(--card-border)", background: form.authority ? "rgba(16,185,129,.06)" : "var(--accent)" }} onClick={() => setF("authority", !form.authority)}>
                    <input type="checkbox" checked={form.authority} onChange={() => {}} className="w-4 h-4 rounded cursor-pointer" />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-color)" }}>Decision Authority Verified</p>
                      <p className="text-[10px] text-muted-foreground">Contact has budget sign-off power</p>
                    </div>
                    {form.authority && <UserCheck size={16} className="ml-auto text-emerald-500" />}
                  </div>
                  <PFF label="Need / Pain Point"><textarea rows={3} value={form.need} onChange={e => setF("need", e.target.value)} className="pct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Describe requirements..." /></PFF>
                  <PFF label="Timeline">
                    <select value={form.timeline} onChange={e => setF("timeline", e.target.value)} className="pct-fi">
                      {TIMELINE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </PFF>
                </PFS>
                <PFS title="Pipeline">
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Stage">
                      <select value={form.status} onChange={e => setF("status", e.target.value as ProspectStatus)} className="pct-fi">
                        {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    </PFF>
                    <PFF label="Source">
                      <select value={form.source} onChange={e => setF("source", e.target.value)} className="pct-fi">
                        {["DIRECT", "GOOGLE", "META", "REFERRAL", "WHATSAPP", "EVENT", "OTHER"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </PFF>
                  </div>
                  <PFF label="Tags (comma separated)"><input value={form.tags} onChange={e => setF("tags", e.target.value)} className="pct-fi" placeholder="Hot, Enterprise" /></PFF>
                  <PFF label="Notes"><textarea rows={3} value={form.notes} onChange={e => setF("notes", e.target.value)} className="pct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Key context..." /></PFF>
                </PFS>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsCreateOpen(false); setEditP(null); }} className="flex-1 h-11 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold text-sm" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Saving..." : (editP ? "Save Changes" : "Create Prospect")}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteP(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,.1)" }}><Trash2 size={22} style={{ color: "#ef4444" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "var(--text-color)" }}>Remove Prospect?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5"><strong style={{ color: "var(--text-color)" }}>{deleteP.first_name} {deleteP.last_name}</strong> from <strong style={{ color: "var(--text-color)" }}>{deleteP.company || "Unknown"}</strong> will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteP(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-10 rounded-xl font-semibold text-sm text-white" style={{ background: "#ef4444" }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NOTE ── */}
      {noteForP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setNoteForP(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Add Note — {noteForP.first_name} {noteForP.last_name}</h3><button onClick={() => setNoteForP(null)}><X size={15} /></button></div>
            <textarea autoFocus rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full border rounded-xl p-3 text-sm outline-none resize-none" style={{ borderColor: "var(--card-border)", background: "var(--accent)", color: "var(--text-color)" }} placeholder="Write note..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteForP(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={() => { handleAddNote(noteForP); setNoteForP(null); }} className="flex-1 h-10 rounded-xl font-semibold text-sm" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMINDER ── */}
      {reminderP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReminderP(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Set Reminder</h3><p className="text-xs text-muted-foreground">For: {reminderP.first_name} {reminderP.last_name}</p></div><button onClick={() => setReminderP(null)}><X size={15} /></button></div>
            <div className="space-y-3">
              <PFF label="Title *"><input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} className="pct-fi" placeholder="BANT follow-up call" /></PFF>
              <div className="grid grid-cols-2 gap-3">
                <PFF label="Type"><select value={reminderForm.type} onChange={e => setReminderForm(f => ({ ...f, type: e.target.value as any }))} className="pct-fi"><option value="call">📞 Call</option><option value="email">✉️ Email</option><option value="meeting">🗓 Meeting</option><option value="follow_up">🔁 Follow-up</option></select></PFF>
                <PFF label="Date & Time *"><input type="datetime-local" value={reminderForm.datetime} onChange={e => setReminderForm(f => ({ ...f, datetime: e.target.value }))} className="pct-fi" min={new Date().toISOString().slice(0, 16)} /></PFF>
              </div>
              <PFF label="Note"><textarea rows={2} value={reminderForm.note} onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))} className="pct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="What to discuss..." /></PFF>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setReminderP(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleSetReminder} className="flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Bell size={13} />Set Reminder</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLUMN EDITOR ── */}
      {columnEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setColumnEditorOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}><SlidersHorizontal size={14} className="inline mr-1.5" />Customise Columns</h3><button onClick={() => setColumnEditorOpen(false)}><X size={14} /></button></div>
            <div className="space-y-1.5">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer hover:bg-accent">
                  <span className="text-sm font-medium" style={{ color: "var(--text-color)" }}>{col.label}</span>
                  <div className="relative w-9 h-5 rounded-full" style={{ background: visibleCols.includes(col.key) ? "var(--graph-to)" : "var(--card-border)", transition: "background .15s" }} onClick={() => { if (col.required) return; setVisibleCols(p => p.includes(col.key) ? p.filter(c => c !== col.key) : [...p, col.key]); }}>
                    <div className="absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full shadow" style={{ left: visibleCols.includes(col.key) ? "19px" : "3px", transition: "left .15s" }} />
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setVisibleCols(ALL_COLUMNS.map(c => c.key))} className="flex-1 h-9 rounded-xl border text-xs font-semibold" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Show All</button>
              <button onClick={() => setColumnEditorOpen(false)} className="flex-1 h-9 rounded-xl text-xs font-semibold" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.pct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.pct-fi:focus{border-color:var(--graph-to)}.pct-fi::placeholder{color:var(--muted-foreground);opacity:.7}`}</style>
    </div>
  );
}

function PAM({ icon, label, onClick, danger }: any) { return <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left hover:bg-accent" style={{ color: danger ? "#ef4444" : "var(--text-color)", transition: "background .1s" }}>{icon}{label}</button>; }
function PDS({ title, children, action }: any) { return <div><div className="flex items-center justify-between mb-2"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{action}</div><div className="rounded-xl border p-3.5 space-y-2.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>{children}</div></div>; }
function PDR({ icon, label, children }: any) { return <div className="flex items-start gap-2.5"><div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div><div className="flex-1 min-w-0"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span><div className="text-xs">{children}</div></div></div>; }
function PFS({ title, children }: any) { return <div className="space-y-3"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{children}</div>; }
function PFF({ label, children }: any) { return <div className="space-y-1.5"><label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>{children}</div>; }
