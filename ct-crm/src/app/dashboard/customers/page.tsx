"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCustomers, getCustomerReminders, createCustomer, updateCustomer,
  updateCustomerStatus, deleteCustomer as deleteCustomerAction, addCustomerNote, createCustomerReminder,
} from "@/server/customers";
import { toast } from "sonner";
import {
  Search, Plus, MoreHorizontal, Mail, Building, DollarSign, X, Eye,
  Pencil, Trash2, Bell, StickyNote, Star, StarOff, Copy, Calendar,
  Clock, Tag, CheckCircle2, SlidersHorizontal, Hash, MessageSquare,
  ShieldCheck, AlertTriangle, TrendingUp, Users, Activity,
  ChevronDown, FileText, Handshake, Phone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type CustomerStatus = "ACTIVE" | "AT_RISK" | "CHURNED" | "NEW";

interface CNote { id: string; text: string; created_at: string; author?: string; }
interface Reminder { id: string; cust_id: string; cust_name: string; title: string; type: "call" | "email" | "meeting" | "follow_up"; datetime: string; note?: string; done: boolean; }

interface Customer {
  id: string;
  contact_name: string;
  company?: string;
  email?: string;
  phone?: string;
  lifetime_value?: number;
  customer_since?: string;
  status: CustomerStatus;
  contract_status?: string;
  contract_title?: string;
  contract_value?: number;
  total_deals?: number;
  total_interactions?: number;
  health_score?: number;
  industry?: string;
  city?: string;
  notes?: string;
  starred?: boolean;
  tags?: string[];
  cnotes?: CNote[];
  created_at?: string;
}

const ALL_COLUMNS = [
  { key: "name", label: "Customer", required: true },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "ltv", label: "LTV" },
  { key: "health", label: "Health" },
  { key: "deals", label: "Deals" },
  { key: "contract", label: "Contract" },
  { key: "since", label: "Since" },
  { key: "actions", label: "Actions", required: true },
];

const FALLBACK: Customer[] = [
  { id: "c1", contact_name: "Vikram Singh", company: "Acme Corp", email: "vikram@acmecorp.in", phone: "+91-9876543210", lifetime_value: 1250000, customer_since: new Date(Date.now() - 86400000 * 180).toISOString(), status: "ACTIVE", contract_status: "SIGNED", contract_title: "Enterprise Annual License", contract_value: 450000, total_deals: 4, total_interactions: 32, health_score: 92, industry: "Technology", city: "Mumbai", starred: true, tags: ["Enterprise", "VIP"], cnotes: [{ id: "n1", text: "Renewed for 2nd year. Champion is Vikram.", created_at: new Date(Date.now() - 86400000).toISOString(), author: "You" }], created_at: new Date(Date.now() - 86400000 * 180).toISOString() },
  { id: "c2", contact_name: "Neha Patel", company: "TechStart", email: "neha@techstart.io", phone: "+91-9876543211", lifetime_value: 380000, customer_since: new Date(Date.now() - 86400000 * 120).toISOString(), status: "ACTIVE", contract_status: "SIGNED", contract_title: "Growth Plan", contract_value: 120000, total_deals: 2, total_interactions: 18, health_score: 78, industry: "SaaS", city: "Bangalore", starred: false, tags: ["Startup"], cnotes: [], created_at: new Date(Date.now() - 86400000 * 120).toISOString() },
  { id: "c3", contact_name: "Arjun Mehta", company: "CloudSoft Technologies", email: "arjun@cloudsoft.in", phone: "+91-9876543212", lifetime_value: 920000, customer_since: new Date(Date.now() - 86400000 * 365).toISOString(), status: "ACTIVE", contract_status: "SIGNED", contract_title: "Platform License + Support", contract_value: 320000, total_deals: 5, total_interactions: 47, health_score: 95, industry: "Cloud", city: "Pune", starred: true, tags: ["Partner"], cnotes: [], created_at: new Date(Date.now() - 86400000 * 365).toISOString() },
  { id: "c4", contact_name: "Sanya Reddy", company: "DataFlow Inc", email: "sanya@dataflow.co", phone: "+91-9876543213", lifetime_value: 150000, customer_since: new Date(Date.now() - 86400000 * 45).toISOString(), status: "AT_RISK", contract_status: "SENT", contract_title: "Starter Package", contract_value: 80000, total_deals: 1, total_interactions: 8, health_score: 38, industry: "Analytics", city: "Hyderabad", starred: false, tags: ["Follow-up"], cnotes: [], created_at: new Date(Date.now() - 86400000 * 45).toISOString() },
  { id: "c5", contact_name: "Rohan Joshi", company: "NovaTech Labs", email: "rohan@novatech.in", phone: "+91-9876543214", lifetime_value: 680000, customer_since: new Date(Date.now() - 86400000 * 240).toISOString(), status: "ACTIVE", contract_status: "SIGNED", contract_title: "Enterprise Migration", contract_value: 280000, total_deals: 3, total_interactions: 25, health_score: 84, industry: "HealthTech", city: "Delhi", starred: false, tags: [], cnotes: [], created_at: new Date(Date.now() - 86400000 * 240).toISOString() },
  { id: "c6", contact_name: "Meera Iyer", company: "Horizon Media", email: "meera@horizonmedia.in", lifetime_value: 45000, customer_since: new Date(Date.now() - 86400000 * 20).toISOString(), status: "AT_RISK", contract_status: "DRAFT", contract_title: "Trial Extension", contract_value: 30000, total_deals: 1, total_interactions: 3, health_score: 28, industry: "Media", city: "Chennai", starred: false, tags: [], cnotes: [], created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
  { id: "c7", contact_name: "Karan Deshmukh", company: "BluePeak Industries", email: "karan@bluepeak.co", lifetime_value: 2100000, customer_since: new Date(Date.now() - 86400000 * 500).toISOString(), status: "ACTIVE", contract_status: "SIGNED", contract_title: "Multi-Year Strategic Partnership", contract_value: 750000, total_deals: 7, total_interactions: 62, health_score: 98, industry: "Manufacturing", city: "Ahmedabad", starred: true, tags: ["VIP", "Strategic"], cnotes: [], created_at: new Date(Date.now() - 86400000 * 500).toISOString() },
  { id: "c8", contact_name: "Priya Nair", company: "Global Systems", email: "priya@globalsys.in", lifetime_value: 520000, customer_since: new Date(Date.now() - 86400000 * 300).toISOString(), status: "CHURNED", contract_status: "EXPIRED", contract_title: "Annual Maintenance", contract_value: 180000, total_deals: 3, total_interactions: 14, health_score: 12, industry: "IT Services", city: "Kochi", starred: false, tags: [], cnotes: [], created_at: new Date(Date.now() - 86400000 * 300).toISOString() },
];

function getStatusColor(s: CustomerStatus) {
  const m: Record<CustomerStatus, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: "rgba(16,185,129,.15)", text: "#10b981", border: "rgba(16,185,129,.3)" },
    NEW: { bg: "rgba(59,130,246,.15)", text: "#3b82f6", border: "rgba(59,130,246,.3)" },
    AT_RISK: { bg: "rgba(234,179,8,.15)", text: "#eab308", border: "rgba(234,179,8,.3)" },
    CHURNED: { bg: "rgba(239,68,68,.15)", text: "#ef4444", border: "rgba(239,68,68,.3)" },
  };
  return m[s];
}

function getHealthColor(s: number) { return s >= 70 ? "#10b981" : s >= 40 ? "#eab308" : "#ef4444"; }
function getHealthLabel(s: number) { return s >= 70 ? "Healthy" : s >= 40 ? "At Risk" : "Critical"; }
function fmtDate(d?: string) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function timeAgo(d?: string) { if (!d) return "—"; const diff = Date.now() - new Date(d).getTime(); if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; return `${Math.floor(diff / 86400000)}d ago`; }

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [viewCust, setViewCust] = useState<Customer | null>(null);
  const [editCust, setEditCust] = useState<Customer | null>(null);
  const [deleteCust, setDeleteCust] = useState<Customer | null>(null);
  const [reminderCust, setReminderCust] = useState<Customer | null>(null);
  const [noteForCust, setNoteForCust] = useState<Customer | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(["name", "company", "email", "status", "ltv", "health", "deals", "contract", "since", "actions"]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newNote, setNewNote] = useState("");
  const [reminderForm, setReminderForm] = useState({ title: "", type: "call" as Reminder["type"], datetime: "", note: "" });
  const [form, setForm] = useState({ contact_name: "", company: "", email: "", phone: "", status: "ACTIVE" as CustomerStatus, lifetime_value: "", health_score: "80", industry: "", city: "", contract_title: "", contract_value: "", contract_status: "DRAFT", notes: "", tags: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const [custRows, reminderRows] = await Promise.all([getCustomers(), getCustomerReminders()]);
      if (custRows.length) setCustomers(custRows as Customer[]);
      if (reminderRows.length) setReminders(reminderRows as Reminder[]);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { if (!actionMenuId) return; const h = () => setActionMenuId(null); document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [actionMenuId]);

  const handleUpdateStatus = useCallback(async (id: string, next: CustomerStatus) => {
    setCustomers(p => p.map(c => c.id === id ? { ...c, status: next } : c));
    if (viewCust?.id === id) setViewCust(v => v ? { ...v, status: next } : v);
    try { await updateCustomerStatus(id, next); toast.success(`Status → ${next}`); }
    catch { toast.error("Failed to update status"); }
  }, [viewCust]);

  const handleToggleStar = useCallback((id: string) => {
    setCustomers(p => p.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
    if (viewCust?.id === id) setViewCust(v => v ? { ...v, starred: !v.starred } : v);
  }, [viewCust]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_name) { toast.error("Name required"); return; }
    setSubmitting(true);
    const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const payload = {
      contact_name: form.contact_name, company: form.company, email: form.email, phone: form.phone,
      status: form.status, lifetime_value: parseFloat(form.lifetime_value) || 0, health_score: parseInt(form.health_score) || 80,
      industry: form.industry, city: form.city, contract_title: form.contract_title,
      contract_value: parseFloat(form.contract_value) || 0, contract_status: form.contract_status, notes: form.notes, tags,
    };
    const full: Customer = { id: "", ...payload, starred: false, cnotes: [], customer_since: new Date().toISOString(), created_at: new Date().toISOString() };
    try {
      const row = await createCustomer(payload);
      setCustomers(p => [{ ...full, id: row.id }, ...p]);
      toast.success("✅ Customer saved to database!");
    } catch {
      toast.error("Failed to save customer");
    } finally { setSubmitting(false); setIsCreateOpen(false); resetForm(); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCust) return;
    setSubmitting(true);
    const updates: Partial<Customer> = { contact_name: form.contact_name, company: form.company, email: form.email, phone: form.phone, status: form.status, lifetime_value: parseFloat(form.lifetime_value) || 0, health_score: parseInt(form.health_score) || 80, industry: form.industry, city: form.city, contract_title: form.contract_title, contract_value: parseFloat(form.contract_value) || 0, contract_status: form.contract_status, notes: form.notes, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [] };
    const updated = { ...editCust, ...updates };
    setCustomers(p => p.map(c => c.id === editCust.id ? updated : c));
    if (viewCust?.id === editCust.id) setViewCust(updated);
    try {
      await updateCustomer(editCust.id, updates as any);
      toast.success("✅ Customer updated!");
    } catch { toast.error("Failed to update customer"); }
    finally { setSubmitting(false); setEditCust(null); }
  };

  const handleDelete = async () => {
    if (!deleteCust) return;
    const id = deleteCust.id;
    setCustomers(p => p.filter(c => c.id !== id));
    if (viewCust?.id === id) setViewCust(null);
    setDeleteCust(null);
    try {
      await deleteCustomerAction(id);
      toast.success("Customer removed");
    } catch { toast.error("Failed to delete customer"); }
  };

  const handleAddNote = async (cust: Customer) => {
    if (!newNote.trim()) return;
    const noteText = newNote.trim();
    const tempNote: CNote = { id: Math.random().toString(36).slice(7), text: noteText, created_at: new Date().toISOString(), author: "You" };
    const updated = { ...cust, cnotes: [tempNote, ...(cust.cnotes || [])] };
    setCustomers(p => p.map(c => c.id === cust.id ? updated : c));
    if (viewCust?.id === cust.id) setViewCust(updated);
    setNewNote("");
    try {
      const row = await addCustomerNote(cust.id, noteText);
      const realNote = { ...tempNote, id: row.id };
      setCustomers(p => p.map(c => c.id === cust.id ? { ...c, cnotes: c.cnotes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : c));
      if (viewCust?.id === cust.id) setViewCust(v => v ? { ...v, cnotes: v.cnotes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : v);
      toast.success("✅ Note saved!");
    } catch { toast.error("Failed to save note"); }
  };

  const handleSetReminder = async () => {
    if (!reminderCust || !reminderForm.title || !reminderForm.datetime) { toast.error("Fill title & date/time"); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, cust_id: reminderCust.id, cust_name: reminderCust.contact_name, ...reminderForm, done: false };
    setReminders(p => [...p, r]);
    toast.success(`⏰ Reminder set for ${new Date(reminderForm.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
    setReminderCust(null); setReminderForm({ title: "", type: "call", datetime: "", note: "" });
    try {
      const row = await createCustomerReminder({ entity_id: reminderCust.id, entity_name: r.cust_name, title: r.title, type: r.type, datetime: r.datetime, note: r.note });
      setReminders(p => p.map(x => x.id === tempId ? { ...x, id: row.id } : x));
    } catch {}
  };

  const openEdit = (c: Customer) => { setForm({ contact_name: c.contact_name, company: c.company || "", email: c.email || "", phone: c.phone || "", status: c.status, lifetime_value: String(c.lifetime_value || ""), health_score: String(c.health_score || 80), industry: c.industry || "", city: c.city || "", contract_title: c.contract_title || "", contract_value: String(c.contract_value || ""), contract_status: c.contract_status || "DRAFT", notes: c.notes || "", tags: (c.tags || []).join(", ") }); setEditCust(c); };
  const resetForm = () => setForm({ contact_name: "", company: "", email: "", phone: "", status: "ACTIVE", lifetime_value: "", health_score: "80", industry: "", city: "", contract_title: "", contract_value: "", contract_status: "DRAFT", notes: "", tags: "" });

  const filtered = customers.filter(c => (!search || `${c.contact_name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())) && (statusFilter === "ALL" || c.status === statusFilter));

  const totalLTV = customers.reduce((s, c) => s + (c.lifetime_value || 0), 0);
  const avgHealth = customers.length ? Math.round(customers.reduce((s, c) => s + (c.health_score || 0), 0) / customers.length) : 0;
  const activeCount = customers.filter(c => c.status === "ACTIVE").length;
  const churnCount = customers.filter(c => c.status === "CHURNED").length;
  const activeReminders = reminders.filter(r => !r.done);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Customer Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customers.length} accounts · LTV ₹{(totalLTV / 100000).toFixed(1)}L · Health {avgHealth}%{activeReminders.length > 0 ? ` · ${activeReminders.length} reminders` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeReminders.length > 0 && <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border" style={{ background: "rgba(234,179,8,.1)", borderColor: "rgba(234,179,8,.3)", color: "#eab308" }}><Bell size={13} />{activeReminders.length} reminder{activeReminders.length > 1 ? "s" : ""}</div>}
          <button onClick={() => setColumnEditorOpen(true)} className="h-9 px-3 rounded-xl text-xs font-semibold border flex items-center gap-1.5 hover:opacity-80" style={{ borderColor: "var(--card-border)", color: "var(--text-color)", background: "var(--card-bg)" }}><SlidersHorizontal size={13} />Columns</button>
          <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={15} />New Customer</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: customers.length.toString(), color: "var(--graph-to)", icon: <Users size={14} /> },
          { label: "Total LTV", value: `₹${(totalLTV / 100000).toFixed(1)}L`, color: "#10b981", icon: <DollarSign size={14} /> },
          { label: "Active", value: `${activeCount}`, color: "#3b82f6", icon: <ShieldCheck size={14} /> },
          { label: "Avg Health", value: `${avgHealth}%`, color: getHealthColor(avgHealth), icon: <Activity size={14} /> },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4 border hover:shadow-md" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", transition: "box-shadow .15s" }}>
            <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k.label}</span><span className="text-muted-foreground">{k.icon}</span></div>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 pl-9 pr-3 rounded-xl text-xs bg-transparent border" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
          </div>
          <div className="flex items-center gap-1.5 border px-2.5 h-9 rounded-xl text-xs" style={{ borderColor: "var(--card-border)" }}>
            <Tag size={12} className="text-muted-foreground" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent font-medium cursor-pointer outline-none" style={{ color: "var(--text-color)" }}>
              <option value="ALL">All Status</option>
              {(["ACTIVE", "AT_RISK", "NEW", "CHURNED"] as CustomerStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(search || statusFilter !== "ALL") && <button onClick={() => { setSearch(""); setStatusFilter("ALL"); }} className="h-9 px-3 rounded-xl text-xs flex items-center gap-1 font-semibold" style={{ color: "#ef4444", background: "rgba(239,68,68,.1)" }}><X size={12} />Clear</button>}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}><Users size={24} className="text-muted-foreground" /></div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>No customers found</p>
          <p className="text-xs text-muted-foreground mt-1">Add customers or convert deals to customer accounts.</p>
          <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="mt-4 h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={14} />New Customer</button>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden view-transition" style={{ borderColor: "var(--card-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]" style={{ background: "var(--card-bg)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg-solid)" }}>
                  {visibleCols.includes("name") && <th className="px-4 py-3 font-bold uppercase tracking-wider sticky left-0 z-10 whitespace-nowrap" style={{ background: "var(--card-bg-solid)", minWidth: 200 }}>Customer</th>}
                  {visibleCols.includes("company") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Company</th>}
                  {visibleCols.includes("email") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 180 }}>Email</th>}
                  {visibleCols.includes("phone") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Phone</th>}
                  {visibleCols.includes("status") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 110 }}>Status</th>}
                  {visibleCols.includes("ltv") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right" style={{ minWidth: 100 }}>LTV</th>}
                  {visibleCols.includes("health") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 130 }}>Health</th>}
                  {visibleCols.includes("deals") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Deals</th>}
                  {visibleCols.includes("contract") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Contract</th>}
                  {visibleCols.includes("since") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Since</th>}
                  {visibleCols.includes("actions") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)" }}>Actions</th>}
                </tr>
              </thead>
              <tbody style={{ color: "var(--text-color)" }}>
                {filtered.map(cust => {
                  const badge = getStatusColor(cust.status);
                  const hs = cust.health_score || 50;
                  const hc = getHealthColor(hs);
                  return (
                    <tr key={cust.id} className="border-b hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)", opacity: cust.status === "CHURNED" ? 0.65 : 1, transition: "background .1s" }}>
                      {visibleCols.includes("name") && (
                        <td className="px-4 py-3 sticky left-0 z-10" style={{ background: "inherit" }}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleStar(cust.id)} className="shrink-0">{cust.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="opacity-30" />}</button>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: `linear-gradient(135deg,${hc}88,${hc}44)`, color: hc }}>
                              {cust.contact_name[0]}
                            </div>
                            <div>
                              <button onClick={() => setViewCust(cust)} className="font-semibold hover:underline text-left block" style={{ color: "var(--text-color)" }}>{cust.contact_name}</button>
                              {cust.tags && cust.tags.length > 0 && <div className="flex gap-1 mt-0.5">{cust.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("company") && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-muted-foreground"><Building size={11} className="opacity-60 shrink-0" />{cust.company || "—"}</div></td>}
                      {visibleCols.includes("email") && <td className="px-4 py-3">{cust.email ? <a href={`mailto:${cust.email}`} className="flex items-center gap-1 hover:underline" style={{ color: "var(--graph-to)" }}><Mail size={11} />{cust.email}</a> : <span className="text-muted-foreground">—</span>}</td>}
                      {visibleCols.includes("phone") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{cust.phone || "—"}</td>}
                      {visibleCols.includes("status") && (
                        <td className="px-4 py-3">
                          <select value={cust.status} onChange={e => handleUpdateStatus(cust.id, e.target.value as CustomerStatus)} className="px-2 py-1 rounded-xl font-bold text-[10px] cursor-pointer outline-none uppercase" style={{ background: badge.bg, color: badge.text, border: "none" }}>
                            {(["ACTIVE", "AT_RISK", "NEW", "CHURNED"] as CustomerStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      )}
                      {visibleCols.includes("ltv") && <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--graph-to)" }}>₹{(cust.lifetime_value || 0).toLocaleString("en-IN")}</td>}
                      {visibleCols.includes("health") && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--accent)" }}>
                              <div className="h-full rounded-full" style={{ width: `${hs}%`, background: hc, transition: "width .5s" }} />
                            </div>
                            <span className="text-[9px] font-extrabold uppercase" style={{ color: hc }}>{hs}%</span>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("deals") && <td className="px-4 py-3"><span className="font-bold text-sm" style={{ color: "var(--text-color)" }}>{cust.total_deals || 0}</span><span className="text-muted-foreground text-[10px] ml-1">deals</span></td>}
                      {visibleCols.includes("contract") && (
                        <td className="px-4 py-3">
                          {cust.contract_title ? (
                            <div>
                              <span className="block text-[11px] font-semibold truncate max-w-[140px]" style={{ color: "var(--text-color)" }}>{cust.contract_title}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase mt-0.5 inline-block" style={{ background: cust.contract_status === "SIGNED" ? "rgba(16,185,129,.15)" : "rgba(148,163,184,.15)", color: cust.contract_status === "SIGNED" ? "#10b981" : "#94a3b8" }}>{cust.contract_status}</span>
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {visibleCols.includes("since") && <td className="px-4 py-3 text-muted-foreground text-[11px] whitespace-nowrap">{fmtDate(cust.customer_since)}</td>}
                      {visibleCols.includes("actions") && (
                        <td className="px-4 py-3 text-right sticky right-0 z-10" style={{ background: "inherit" }}>
                          <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setActionMenuId(actionMenuId === cust.id ? null : cust.id)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-75 ml-auto" style={{ borderColor: "var(--card-border)" }}><MoreHorizontal size={13} /></button>
                            {actionMenuId === cust.id && (
                              <div className="absolute right-0 mt-1 w-44 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
                                <KAM icon={<Eye size={12} />} label="View Details" onClick={() => { setViewCust(cust); setActionMenuId(null); }} />
                                <KAM icon={<Pencil size={12} />} label="Edit Customer" onClick={() => { openEdit(cust); setActionMenuId(null); }} />
                                <KAM icon={<StickyNote size={12} />} label="Add Note" onClick={() => { setNoteForCust(cust); setActionMenuId(null); }} />
                                <KAM icon={<Bell size={12} />} label="Set Reminder" onClick={() => { setReminderCust(cust); setActionMenuId(null); }} />
                                <KAM icon={cust.starred ? <StarOff size={12} /> : <Star size={12} />} label={cust.starred ? "Unstar" : "Star"} onClick={() => { handleToggleStar(cust.id); setActionMenuId(null); }} />
                                <KAM icon={<Copy size={12} />} label="Copy Email" onClick={() => { if (cust.email) navigator.clipboard.writeText(cust.email); toast.success("Copied"); setActionMenuId(null); }} />
                                <div style={{ borderTop: "1px solid var(--card-border)" }}>
                                  <KAM icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { setDeleteCust(cust); setActionMenuId(null); }} />
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
      {viewCust && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => setViewCust(null)} />
          <div className="relative ml-auto h-full w-full max-w-[520px] flex flex-col overflow-hidden shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0" style={{ background: `linear-gradient(135deg,${getHealthColor(viewCust.health_score||50)}88,${getHealthColor(viewCust.health_score||50)}33)`, color: getHealthColor(viewCust.health_score||50) }}>{viewCust.contact_name[0]}</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{viewCust.contact_name}</p>
                  <p className="text-xs text-muted-foreground">{viewCust.company || "No company"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleToggleStar(viewCust.id)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}>{viewCust.starred ? <Star size={14} fill="#eab308" color="#eab308" /> : <StarOff size={14} className="text-muted-foreground" />}</button>
                <button onClick={() => { openEdit(viewCust); setViewCust(null); }} className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><Pencil size={12} />Edit</button>
                <button onClick={() => setViewCust(null)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Health bar */}
              <div className="p-4 rounded-xl border" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: "var(--text-color)" }}>Account Health</span>
                  <span className="text-xs font-black" style={{ color: getHealthColor(viewCust.health_score || 50) }}>{getHealthLabel(viewCust.health_score || 50)} · {viewCust.health_score || 50}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${viewCust.health_score || 50}%`, background: getHealthColor(viewCust.health_score || 50), transition: "width .5s" }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={viewCust.status} onChange={e => handleUpdateStatus(viewCust.id, e.target.value as CustomerStatus)} className="px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer outline-none uppercase border" style={{ background: getStatusColor(viewCust.status).bg, color: getStatusColor(viewCust.status).text, borderColor: getStatusColor(viewCust.status).border }}>
                  {(["ACTIVE", "AT_RISK", "NEW", "CHURNED"] as CustomerStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold" style={{ background: "rgba(0,242,254,.12)", color: "var(--graph-to)" }}>LTV ₹{(viewCust.lifetime_value || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ icon: <Bell size={13} />, label: "Reminder", action: () => setReminderCust(viewCust) }, { icon: <StickyNote size={13} />, label: "Add Note", action: () => setNoteForCust(viewCust) }, { icon: <Trash2 size={13} />, label: "Delete", danger: true, action: () => { setDeleteCust(viewCust); setViewCust(null); } }].map(b => (
                  <button key={b.label} onClick={b.action} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold hover:opacity-70" style={{ borderColor: b.danger ? "rgba(239,68,68,.3)" : "var(--card-border)", color: b.danger ? "#ef4444" : "var(--text-color)", background: b.danger ? "rgba(239,68,68,.06)" : "var(--accent)" }}>{b.icon}{b.label}</button>
                ))}
              </div>
              <KDS title="Contact Info">
                {viewCust.email && <KDR icon={<Mail size={12} />} label="Email"><a href={`mailto:${viewCust.email}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewCust.email}</a></KDR>}
                {viewCust.phone && <KDR icon={<Phone size={12} />} label="Phone"><a href={`tel:${viewCust.phone}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewCust.phone}</a></KDR>}
                <KDR icon={<Building size={12} />} label="Company"><span style={{ color: "var(--text-color)" }}>{viewCust.company || "—"}</span></KDR>
                <KDR icon={<Hash size={12} />} label="Industry"><span style={{ color: "var(--text-color)" }}>{viewCust.industry || "—"}</span></KDR>
                <KDR icon={<Tag size={12} />} label="City"><span style={{ color: "var(--text-color)" }}>{viewCust.city || "—"}</span></KDR>
              </KDS>
              <KDS title="Account Stats">
                <KDR icon={<Handshake size={12} />} label="Total Deals"><span className="font-bold" style={{ color: "var(--text-color)" }}>{viewCust.total_deals || 0} deals closed</span></KDR>
                <KDR icon={<Activity size={12} />} label="Interactions"><span style={{ color: "var(--text-color)" }}>{viewCust.total_interactions || 0} total</span></KDR>
                <KDR icon={<Calendar size={12} />} label="Customer Since"><span style={{ color: "var(--text-color)" }}>{fmtDate(viewCust.customer_since)}</span></KDR>
              </KDS>
              {viewCust.contract_title && (
                <KDS title="Active Contract">
                  <KDR icon={<FileText size={12} />} label="Contract"><span style={{ color: "var(--text-color)" }}>{viewCust.contract_title}</span></KDR>
                  <KDR icon={<DollarSign size={12} />} label="Value"><span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{(viewCust.contract_value || 0).toLocaleString("en-IN")}</span></KDR>
                  <KDR icon={<ShieldCheck size={12} />} label="Status"><span className="font-bold uppercase text-[10px]" style={{ color: viewCust.contract_status === "SIGNED" ? "#10b981" : "#94a3b8" }}>{viewCust.contract_status}</span></KDR>
                </KDS>
              )}
              {viewCust.tags && viewCust.tags.length > 0 && <KDS title="Tags"><div className="flex flex-wrap gap-1.5">{viewCust.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div></KDS>}
              {viewCust.notes && <KDS title="Notes"><p className="text-xs leading-relaxed" style={{ color: "var(--text-color)" }}>{viewCust.notes}</p></KDS>}
              <KDS title="Activity Log" action={<button onClick={() => setNoteForCust(viewCust)} className="text-xs flex items-center gap-1 font-semibold hover:opacity-70" style={{ color: "var(--graph-to)" }}><Plus size={12} />Add</button>}>
                {(viewCust.cnotes?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No notes yet.</p> : (
                  <div className="space-y-3">{viewCust.cnotes!.map(n => (
                    <div key={n.id} className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{(n.author||"Y")[0]}</div>
                      <div><div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-bold" style={{ color: "var(--text-color)" }}>{n.author}</span><span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span></div><p className="text-xs" style={{ color: "var(--text-color)" }}>{n.text}</p></div>
                    </div>
                  ))}</div>
                )}
              </KDS>
              {reminders.filter(r => r.cust_id === viewCust.id).length > 0 && (
                <KDS title="Reminders">
                  {reminders.filter(r => r.cust_id === viewCust.id).map(r => (
                    <div key={r.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: r.done ? "var(--card-border)" : "rgba(234,179,8,.3)", background: r.done ? "transparent" : "rgba(234,179,8,.06)" }}>
                      <button onClick={() => setReminders(p => p.map(x => x.id === r.id ? { ...x, done: !x.done } : x))}>{r.done ? <CheckCircle2 size={14} style={{ color: "#10b981" }} /> : <Clock size={14} style={{ color: "#eab308" }} />}</button>
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: r.done ? "line-through" : "none" }}>{r.title}</p><p className="text-[10px] text-muted-foreground">{new Date(r.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{r.type}</span>
                    </div>
                  ))}
                </KDS>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE/EDIT DRAWER ── */}
      {(isCreateOpen || editCust) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => { setIsCreateOpen(false); setEditCust(null); }} />
          <div className="relative ml-auto h-full w-full max-w-[520px] overflow-y-auto shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <form onSubmit={editCust ? handleEdit : handleCreate}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "var(--card-bg-solid)", borderBottom: "1px solid var(--card-border)" }}>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>{editCust ? "Edit Customer" : "New Customer"}</h2>
                <button type="button" onClick={() => { setIsCreateOpen(false); setEditCust(null); }} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={15} /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <KFS title="Identity">
                  <KFF label="Full Name *"><input required value={form.contact_name} onChange={e => setF("contact_name", e.target.value)} className="kct-fi" placeholder="Vikram Singh" /></KFF>
                  <div className="grid grid-cols-2 gap-3">
                    <KFF label="Email"><input type="email" value={form.email} onChange={e => setF("email", e.target.value)} className="kct-fi" /></KFF>
                    <KFF label="Phone"><input value={form.phone} onChange={e => setF("phone", e.target.value)} className="kct-fi" /></KFF>
                  </div>
                  <KFF label="Company"><input value={form.company} onChange={e => setF("company", e.target.value)} className="kct-fi" placeholder="Acme Corp" /></KFF>
                  <div className="grid grid-cols-2 gap-3">
                    <KFF label="Industry"><input value={form.industry} onChange={e => setF("industry", e.target.value)} className="kct-fi" placeholder="Technology" /></KFF>
                    <KFF label="City"><input value={form.city} onChange={e => setF("city", e.target.value)} className="kct-fi" placeholder="Mumbai" /></KFF>
                  </div>
                </KFS>
                <KFS title="Account Details">
                  <div className="grid grid-cols-2 gap-3">
                    <KFF label="Status">
                      <select value={form.status} onChange={e => setF("status", e.target.value as CustomerStatus)} className="kct-fi">
                        {(["ACTIVE","AT_RISK","NEW","CHURNED"] as CustomerStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </KFF>
                    <KFF label="Health Score (0-100)"><input type="number" min={0} max={100} value={form.health_score} onChange={e => setF("health_score", e.target.value)} className="kct-fi" /></KFF>
                  </div>
                  <KFF label="Lifetime Value (₹)"><input type="number" value={form.lifetime_value} onChange={e => setF("lifetime_value", e.target.value)} className="kct-fi" /></KFF>
                  <KFF label="Tags (comma separated)"><input value={form.tags} onChange={e => setF("tags", e.target.value)} className="kct-fi" placeholder="VIP, Enterprise" /></KFF>
                </KFS>
                <KFS title="Contract">
                  <KFF label="Contract Title"><input value={form.contract_title} onChange={e => setF("contract_title", e.target.value)} className="kct-fi" placeholder="Enterprise Annual License" /></KFF>
                  <div className="grid grid-cols-2 gap-3">
                    <KFF label="Contract Value (₹)"><input type="number" value={form.contract_value} onChange={e => setF("contract_value", e.target.value)} className="kct-fi" /></KFF>
                    <KFF label="Contract Status">
                      <select value={form.contract_status} onChange={e => setF("contract_status", e.target.value)} className="kct-fi">
                        {["DRAFT","SENT","SIGNED","EXPIRED"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </KFF>
                  </div>
                </KFS>
                <KFS title="Notes">
                  <KFF label="Account Notes"><textarea rows={3} value={form.notes} onChange={e => setF("notes", e.target.value)} className="kct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Key account context..." /></KFF>
                </KFS>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsCreateOpen(false); setEditCust(null); }} className="flex-1 h-11 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold text-sm" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Saving..." : (editCust ? "Save Changes" : "Create Customer")}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteCust(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,.1)" }}><Trash2 size={22} style={{ color: "#ef4444" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "var(--text-color)" }}>Remove Customer?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5"><strong style={{ color: "var(--text-color)" }}>{deleteCust.contact_name}</strong> from <strong style={{ color: "var(--text-color)" }}>{deleteCust.company || "Unknown"}</strong> will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCust(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-10 rounded-xl font-semibold text-sm text-white" style={{ background: "#ef4444" }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NOTE ── */}
      {noteForCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setNoteForCust(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Add Note — {noteForCust.contact_name}</h3><button onClick={() => setNoteForCust(null)}><X size={15} /></button></div>
            <textarea autoFocus rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full border rounded-xl p-3 text-sm outline-none resize-none" style={{ borderColor: "var(--card-border)", background: "var(--accent)", color: "var(--text-color)" }} placeholder="Write note..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteForCust(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={() => { handleAddNote(noteForCust); setNoteForCust(null); }} className="flex-1 h-10 rounded-xl font-semibold text-sm" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMINDER ── */}
      {reminderCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setReminderCust(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Set Reminder</h3><p className="text-xs text-muted-foreground">For: {reminderCust.contact_name}</p></div><button onClick={() => setReminderCust(null)}><X size={15} /></button></div>
            <div className="space-y-3">
              <KFF label="Title *"><input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} className="kct-fi" placeholder="QBR call" /></KFF>
              <div className="grid grid-cols-2 gap-3">
                <KFF label="Type"><select value={reminderForm.type} onChange={e => setReminderForm(f => ({ ...f, type: e.target.value as any }))} className="kct-fi"><option value="call">📞 Call</option><option value="email">✉️ Email</option><option value="meeting">🗓 Meeting</option><option value="follow_up">🔁 Follow-up</option></select></KFF>
                <KFF label="Date & Time *"><input type="datetime-local" value={reminderForm.datetime} onChange={e => setReminderForm(f => ({ ...f, datetime: e.target.value }))} className="kct-fi" min={new Date().toISOString().slice(0, 16)} /></KFF>
              </div>
              <KFF label="Note"><textarea rows={2} value={reminderForm.note} onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))} className="kct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="What to cover..." /></KFF>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setReminderCust(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleSetReminder} className="flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Bell size={13} />Set Reminder</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COLUMN EDITOR ── */}
      {columnEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setColumnEditorOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
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

      <style>{`.kct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.kct-fi:focus{border-color:var(--graph-to)}.kct-fi::placeholder{color:var(--muted-foreground);opacity:.7}`}</style>
    </div>
  );
}

function KAM({ icon, label, onClick, danger }: any) { return <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left hover:bg-accent" style={{ color: danger ? "#ef4444" : "var(--text-color)", transition: "background .1s" }}>{icon}{label}</button>; }
function KDS({ title, children, action }: any) { return <div><div className="flex items-center justify-between mb-2"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{action}</div><div className="rounded-xl border p-3.5 space-y-2.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>{children}</div></div>; }
function KDR({ icon, label, children }: any) { return <div className="flex items-start gap-2.5"><div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div><div className="flex-1 min-w-0"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span><div className="text-xs">{children}</div></div></div>; }
function KFS({ title, children }: any) { return <div className="space-y-3"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{children}</div>; }
function KFF({ label, children }: any) { return <div className="space-y-1.5"><label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>{children}</div>; }
