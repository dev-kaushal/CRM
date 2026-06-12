"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getContacts, getContactReminders, createContact, updateContact,
  updateContactStatus, deleteContact as deleteContactAction, addContactNote, createContactReminder,
} from "@/server/contacts";
import { toast } from "sonner";
import {
  Search, Filter, Plus, MoreHorizontal, Mail, Phone, Building,
  X, Eye, Pencil, Trash2, Bell, StickyNote, Star, StarOff, Copy,
  Calendar, Clock, User, Tag, CheckCircle2, SlidersHorizontal,
  Hash, MessageSquare, Briefcase, Globe, Linkedin,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ContactStatus = "ACTIVE" | "INACTIVE" | "PROSPECT" | "CHURNED";

interface ContactNote {
  id: string;
  text: string;
  created_at: string;
  author?: string;
}

interface Reminder {
  id: string;
  contact_id: string;
  contact_name: string;
  title: string;
  type: "call" | "email" | "meeting" | "follow_up";
  datetime: string;
  note?: string;
  done: boolean;
}

interface Contact {
  id: string;
  contact_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  department?: string;
  status: ContactStatus;
  lifetime_value?: number;
  customer_since?: string;
  city?: string;
  country?: string;
  industry?: string;
  website?: string;
  linkedin_url?: string;
  notes?: string;
  starred?: boolean;
  tags?: string[];
  contact_notes?: ContactNote[];
  created_at?: string;
}

const FALLBACK_CONTACTS: Contact[] = [
  { id: "c1", first_name: "Vikram", last_name: "Singh", contact_name: "Vikram Singh", email: "vikram@acmecorp.in", phone: "+91-9876543210", company: "Acme Corp", job_title: "CTO", department: "Technology", status: "ACTIVE", lifetime_value: 450000, customer_since: new Date(Date.now() - 8640000000).toISOString(), city: "Mumbai", industry: "Technology", starred: true, tags: ["Enterprise", "Decision Maker"], contact_notes: [{ id: "n1", text: "Met at SaaS conference. Very interested in enterprise tier.", created_at: new Date(Date.now() - 86400000).toISOString(), author: "You" }], created_at: new Date(Date.now() - 8640000000).toISOString() },
  { id: "c2", first_name: "Neha", last_name: "Patel", contact_name: "Neha Patel", email: "neha@techstart.io", phone: "+91-9876543211", company: "TechStart", job_title: "CEO", department: "Executive", status: "PROSPECT", lifetime_value: 0, customer_since: new Date(Date.now() - 172800000).toISOString(), city: "Bangalore", industry: "SaaS", starred: false, tags: ["Startup"], contact_notes: [], created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: "c3", first_name: "Arjun", last_name: "Mehta", contact_name: "Arjun Mehta", email: "arjun@cloudsoft.in", phone: "+91-9876543212", company: "CloudSoft Technologies", job_title: "VP Sales", department: "Sales", status: "ACTIVE", lifetime_value: 320000, customer_since: new Date(Date.now() - 259200000).toISOString(), city: "Pune", industry: "Cloud", starred: true, tags: ["Partner"], contact_notes: [], created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: "c4", first_name: "Sanya", last_name: "Reddy", contact_name: "Sanya Reddy", email: "sanya@dataflow.co", phone: "+91-9876543213", company: "DataFlow Inc", job_title: "Head of IT", department: "IT", status: "ACTIVE", lifetime_value: 280000, customer_since: new Date(Date.now() - 345600000).toISOString(), city: "Hyderabad", industry: "Analytics", starred: false, tags: [], contact_notes: [], created_at: new Date(Date.now() - 345600000).toISOString() },
  { id: "c5", first_name: "Rohan", last_name: "Joshi", contact_name: "Rohan Joshi", email: "rohan@novatech.in", phone: "+91-9876543214", company: "NovaTech Labs", job_title: "Founder", department: "Executive", status: "PROSPECT", lifetime_value: 0, customer_since: new Date().toISOString(), city: "Delhi", industry: "HealthTech", starred: false, tags: ["New"], contact_notes: [], created_at: new Date().toISOString() },
];

const ALL_COLUMNS = [
  { key: "name", label: "Name", required: true },
  { key: "job_title", label: "Job Title" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "status", label: "Status" },
  { key: "lifetime_value", label: "LTV" },
  { key: "industry", label: "Industry" },
  { key: "city", label: "City" },
  { key: "notes_preview", label: "Notes" },
  { key: "since", label: "Since" },
  { key: "actions", label: "Actions", required: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusColor(s: ContactStatus) {
  const m: Record<ContactStatus, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: "rgba(16,185,129,.15)", text: "#10b981", border: "rgba(16,185,129,.3)" },
    PROSPECT: { bg: "rgba(59,130,246,.15)", text: "#3b82f6", border: "rgba(59,130,246,.3)" },
    INACTIVE: { bg: "rgba(148,163,184,.15)", text: "#94a3b8", border: "rgba(148,163,184,.3)" },
    CHURNED: { bg: "rgba(239,68,68,.15)", text: "#ef4444", border: "rgba(239,68,68,.3)" },
  };
  return m[s];
}

function timeAgo(d?: string) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fullName(c: Contact) {
  return c.contact_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(FALLBACK_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [industryFilter, setIndustryFilter] = useState("ALL");

  // UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewContact, setViewContact] = useState<Contact | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [reminderContact, setReminderContact] = useState<Contact | null>(null);
  const [noteForContact, setNoteForContact] = useState<Contact | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(["name", "job_title", "company", "email", "phone", "status", "lifetime_value", "notes_preview", "since", "actions"]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", job_title: "", department: "", status: "ACTIVE" as ContactStatus, lifetime_value: "", city: "", country: "India", industry: "", website: "", linkedin_url: "", notes: "", tags: "" });
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [reminderForm, setReminderForm] = useState({ title: "", type: "call" as Reminder["type"], datetime: "", note: "" });

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const [contactRows, reminderRows] = await Promise.all([getContacts(), getContactReminders()]);
      if (contactRows.length) setContacts(contactRows as Contact[]);
      if (reminderRows.length) setReminders(reminderRows as Reminder[]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => {
    if (!actionMenuId) return;
    const h = () => setActionMenuId(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [actionMenuId]);

  const handleUpdateStatus = useCallback(async (id: string, next: ContactStatus) => {
    setContacts(p => p.map(c => c.id === id ? { ...c, status: next } : c));
    if (viewContact?.id === id) setViewContact(v => v ? { ...v, status: next } : v);
    try {
      await updateContactStatus(id, next);
      toast.success(`Status → ${next}`);
    } catch {
      toast.error("Failed to update status");
    }
  }, [viewContact]);

  const handleToggleStar = useCallback((id: string) => {
    setContacts(p => p.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
    if (viewContact?.id === id) setViewContact(v => v ? { ...v, starred: !v.starred } : v);
  }, [viewContact]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.email) { toast.error("Name & email required"); return; }
    setSubmitting(true);
    const payload = {
      first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone,
      company: form.company, job_title: form.job_title, department: form.department, status: form.status,
      lifetime_value: parseFloat(form.lifetime_value) || 0, city: form.city, country: form.country,
      industry: form.industry, website: form.website, linkedin_url: form.linkedin_url, notes: form.notes,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    const full: Contact = { id: "", ...payload, contact_name: `${form.first_name} ${form.last_name}`.trim(), starred: false, contact_notes: [], created_at: new Date().toISOString(), customer_since: new Date().toISOString() };
    try {
      const row = await createContact(payload);
      setContacts(p => [{ ...full, id: row.id }, ...p]);
      toast.success("✅ Contact saved to database!");
    } catch {
      toast.error("Failed to save contact");
    } finally { setSubmitting(false); setIsCreateOpen(false); resetForm(); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContact) return;
    setSubmitting(true);
    const payload = {
      first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone,
      company: form.company, job_title: form.job_title, department: form.department, status: form.status,
      lifetime_value: parseFloat(form.lifetime_value) || 0, city: form.city, country: form.country,
      industry: form.industry, website: form.website, linkedin_url: form.linkedin_url, notes: form.notes,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };
    const updated = { ...editContact, ...payload, contact_name: `${form.first_name} ${form.last_name}`.trim() };
    setContacts(p => p.map(c => c.id === editContact.id ? updated : c));
    if (viewContact?.id === editContact.id) setViewContact(updated);
    try {
      await updateContact(editContact.id, payload);
      toast.success("✅ Contact updated!");
    } catch { toast.error("Failed to update contact"); }
    finally { setSubmitting(false); setEditContact(null); }
  };

  const handleDelete = async () => {
    if (!deleteContact) return;
    const id = deleteContact.id;
    setContacts(p => p.filter(c => c.id !== id));
    if (viewContact?.id === id) setViewContact(null);
    setDeleteContact(null);
    try {
      await deleteContactAction(id);
      toast.success("Contact deleted");
    } catch { toast.error("Failed to delete contact"); }
  };

  const handleAddNote = async (contact: Contact) => {
    if (!newNote.trim()) return;
    const noteText = newNote.trim();
    const tempNote: ContactNote = { id: Math.random().toString(36).slice(7), text: noteText, created_at: new Date().toISOString(), author: "You" };
    const updated = { ...contact, contact_notes: [tempNote, ...(contact.contact_notes || [])] };
    setContacts(p => p.map(c => c.id === contact.id ? updated : c));
    if (viewContact?.id === contact.id) setViewContact(updated);
    setNewNote("");
    try {
      const row = await addContactNote(contact.id, noteText);
      const realNote = { ...tempNote, id: row.id };
      setContacts(p => p.map(c => c.id === contact.id ? { ...c, contact_notes: c.contact_notes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : c));
      if (viewContact?.id === contact.id) setViewContact(v => v ? { ...v, contact_notes: v.contact_notes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : v);
      toast.success("✅ Note saved!");
    } catch { toast.error("Failed to save note"); }
  };

  const handleSetReminder = async () => {
    if (!reminderContact || !reminderForm.title || !reminderForm.datetime) { toast.error("Fill title & date/time"); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, contact_id: reminderContact.id, contact_name: fullName(reminderContact), ...reminderForm, done: false };
    setReminders(p => [...p, r]);
    toast.success(`⏰ Reminder set for ${new Date(reminderForm.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
    setReminderContact(null);
    setReminderForm({ title: "", type: "call", datetime: "", note: "" });
    try {
      const row = await createContactReminder({ entity_id: reminderContact.id, entity_name: r.contact_name, title: r.title, type: r.type, datetime: r.datetime, note: r.note });
      setReminders(p => p.map(x => x.id === tempId ? { ...x, id: row.id } : x));
    } catch {}
  };

  const openEdit = (c: Contact) => {
    setForm({ first_name: c.first_name || "", last_name: c.last_name || "", email: c.email || "", phone: c.phone || "", company: c.company || "", job_title: c.job_title || "", department: c.department || "", status: c.status, lifetime_value: String(c.lifetime_value || ""), city: c.city || "", country: c.country || "India", industry: c.industry || "", website: c.website || "", linkedin_url: c.linkedin_url || "", notes: c.notes || "", tags: (c.tags || []).join(", ") });
    setEditContact(c);
  };
  const resetForm = () => setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", job_title: "", department: "", status: "ACTIVE", lifetime_value: "", city: "", country: "India", industry: "", website: "", linkedin_url: "", notes: "", tags: "" });

  const industries = [...new Set(contacts.map(c => c.industry).filter(Boolean))];

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    return (!q || `${fullName(c)} ${c.email} ${c.company} ${c.phone}`.toLowerCase().includes(q))
      && (statusFilter === "ALL" || c.status === statusFilter)
      && (industryFilter === "ALL" || c.industry === industryFilter);
  });

  const activeReminders = reminders.filter(r => !r.done);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Contacts Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contacts.length} total · {filtered.length} shown{activeReminders.length > 0 ? ` · ${activeReminders.length} reminders` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeReminders.length > 0 && <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border" style={{ background: "rgba(234,179,8,.1)", borderColor: "rgba(234,179,8,.3)", color: "#eab308" }}><Bell size={13} />{activeReminders.length} reminder{activeReminders.length > 1 ? "s" : ""}</div>}
          <CBt ghost onClick={() => setColumnEditorOpen(true)} icon={<SlidersHorizontal size={13} />}>Columns</CBt>
          <CBt primary onClick={() => { resetForm(); setIsCreateOpen(true); }} icon={<Plus size={15} />}>New Contact</CBt>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input type="text" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 pl-9 pr-3 rounded-xl text-xs bg-transparent border" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
          </div>
          <div className="flex items-center gap-1.5 border px-2.5 h-9 rounded-xl text-xs" style={{ borderColor: "var(--card-border)" }}>
            <Filter size={12} className="text-muted-foreground" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-transparent font-medium cursor-pointer outline-none" style={{ color: "var(--text-color)" }}>
              <option value="ALL">All Status</option>
              {(["ACTIVE", "PROSPECT", "INACTIVE", "CHURNED"] as ContactStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {industries.length > 0 && (
            <div className="flex items-center gap-1.5 border px-2.5 h-9 rounded-xl text-xs" style={{ borderColor: "var(--card-border)" }}>
              <Hash size={12} className="text-muted-foreground" />
              <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} className="bg-transparent font-medium cursor-pointer outline-none" style={{ color: "var(--text-color)" }}>
                <option value="ALL">All Industries</option>
                {industries.map(i => <option key={i} value={i!}>{i}</option>)}
              </select>
            </div>
          )}
          {(search || statusFilter !== "ALL" || industryFilter !== "ALL") && (
            <button onClick={() => { setSearch(""); setStatusFilter("ALL"); setIndustryFilter("ALL"); }} className="h-9 px-3 rounded-xl text-xs flex items-center gap-1 font-semibold" style={{ color: "#ef4444", background: "rgba(239,68,68,.1)" }}><X size={12} />Clear</button>
          )}
        </div>
        <div className="text-xs text-muted-foreground px-3">
          Total LTV: <span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{filtered.reduce((s, c) => s + (c.lifetime_value || 0), 0).toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}><User size={24} className="text-muted-foreground" /></div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>No contacts found</p>
          <p className="text-xs text-muted-foreground mt-1">Create a new contact to get started.</p>
          <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="mt-4 h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={14} />New Contact</button>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden view-transition" style={{ borderColor: "var(--card-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]" style={{ background: "var(--card-bg)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg-solid)" }}>
                  {visibleCols.includes("name") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 z-10" style={{ background: "var(--card-bg-solid)", minWidth: 200 }}>Contact</th>}
                  {visibleCols.includes("job_title") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Title / Dept</th>}
                  {visibleCols.includes("company") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Company</th>}
                  {visibleCols.includes("email") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 190 }}>Email</th>}
                  {visibleCols.includes("phone") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Phone</th>}
                  {visibleCols.includes("status") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 130 }}>Status</th>}
                  {visibleCols.includes("lifetime_value") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right" style={{ minWidth: 110 }}>LTV</th>}
                  {visibleCols.includes("industry") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Industry</th>}
                  {visibleCols.includes("city") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">City</th>}
                  {visibleCols.includes("notes_preview") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Notes</th>}
                  {visibleCols.includes("since") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Since</th>}
                  {visibleCols.includes("actions") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)" }}>Actions</th>}
                </tr>
              </thead>
              <tbody style={{ color: "var(--text-color)" }}>
                {filtered.map(contact => {
                  const badge = getStatusColor(contact.status);
                  return (
                    <tr key={contact.id} className="border-b hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)", transition: "background .1s" }}>
                      {visibleCols.includes("name") && (
                        <td className="px-4 py-3 sticky left-0 z-10" style={{ background: "inherit" }}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleStar(contact.id)} className="shrink-0">{contact.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="opacity-30" />}</button>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{(contact.first_name || "?")[0]}{(contact.last_name || "")[0]}</div>
                            <div>
                              <button onClick={() => setViewContact(contact)} className="font-semibold hover:underline text-left" style={{ color: "var(--text-color)" }}>{fullName(contact)}</button>
                              {contact.tags && contact.tags.length > 0 && (
                                <div className="flex gap-1 mt-0.5">{contact.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("job_title") && <td className="px-4 py-3"><div className="text-xs font-semibold" style={{ color: "var(--text-color)" }}>{contact.job_title || "—"}</div>{contact.department && <div className="text-[10px] text-muted-foreground">{contact.department}</div>}</td>}
                      {visibleCols.includes("company") && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-muted-foreground"><Building size={11} className="shrink-0 opacity-60" />{contact.company || "—"}</div></td>}
                      {visibleCols.includes("email") && <td className="px-4 py-3">{contact.email ? <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:underline" style={{ color: "var(--graph-to)" }}><Mail size={11} />{contact.email}</a> : <span className="text-muted-foreground">—</span>}</td>}
                      {visibleCols.includes("phone") && <td className="px-4 py-3">{contact.phone ? <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-muted-foreground hover:underline"><Phone size={11} />{contact.phone}</a> : <span className="text-muted-foreground">—</span>}</td>}
                      {visibleCols.includes("status") && (
                        <td className="px-4 py-3">
                          <select value={contact.status} onChange={e => handleUpdateStatus(contact.id, e.target.value as ContactStatus)} className="px-2 py-1 rounded-xl font-bold text-[10px] cursor-pointer outline-none uppercase" style={{ background: badge.bg, color: badge.text, border: "none" }}>
                            {(["ACTIVE", "PROSPECT", "INACTIVE", "CHURNED"] as ContactStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      )}
                      {visibleCols.includes("lifetime_value") && <td className="px-4 py-3 text-right font-bold" style={{ color: (contact.lifetime_value || 0) > 0 ? "var(--graph-to)" : "var(--muted-foreground)" }}>{(contact.lifetime_value || 0) > 0 ? `₹${contact.lifetime_value!.toLocaleString("en-IN")}` : "—"}</td>}
                      {visibleCols.includes("industry") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{contact.industry || "—"}</td>}
                      {visibleCols.includes("city") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{contact.city || "—"}</td>}
                      {visibleCols.includes("notes_preview") && (
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-1 max-w-[140px] block text-[11px]">{contact.notes || "—"}</span>
                          {(contact.contact_notes?.length ?? 0) > 0 && <span className="text-[9px] flex items-center gap-0.5 mt-0.5" style={{ color: "var(--graph-to)" }}><MessageSquare size={9} />{contact.contact_notes!.length}</span>}
                        </td>
                      )}
                      {visibleCols.includes("since") && <td className="px-4 py-3 text-muted-foreground text-[11px] whitespace-nowrap">{fmtDate(contact.customer_since || contact.created_at)}</td>}
                      {visibleCols.includes("actions") && (
                        <td className="px-4 py-3 text-right sticky right-0 z-10" style={{ background: "inherit" }}>
                          <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setActionMenuId(actionMenuId === contact.id ? null : contact.id)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-75 ml-auto" style={{ borderColor: "var(--card-border)" }}>
                              <MoreHorizontal size={13} />
                            </button>
                            {actionMenuId === contact.id && (
                              <div className="absolute right-0 mt-1 w-44 rounded-xl overflow-hidden shadow-xl z-50" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
                                <CAM icon={<Eye size={12} />} label="View Details" onClick={() => { setViewContact(contact); setActionMenuId(null); }} />
                                <CAM icon={<Pencil size={12} />} label="Edit Contact" onClick={() => { openEdit(contact); setActionMenuId(null); }} />
                                <CAM icon={<StickyNote size={12} />} label="Add Note" onClick={() => { setNoteForContact(contact); setActionMenuId(null); }} />
                                <CAM icon={<Bell size={12} />} label="Set Reminder" onClick={() => { setReminderContact(contact); setActionMenuId(null); }} />
                                <CAM icon={contact.starred ? <StarOff size={12} /> : <Star size={12} />} label={contact.starred ? "Unstar" : "Star"} onClick={() => { handleToggleStar(contact.id); setActionMenuId(null); }} />
                                <CAM icon={<Copy size={12} />} label="Copy Email" onClick={() => { if (contact.email) navigator.clipboard.writeText(contact.email); toast.success("Copied"); setActionMenuId(null); }} />
                                <div style={{ borderTop: "1px solid var(--card-border)" }}>
                                  <CAM icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { setDeleteContact(contact); setActionMenuId(null); }} />
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

      {/* ── VIEW DETAILS DRAWER ── */}
      {viewContact && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => setViewContact(null)} />
          <div className="relative ml-auto h-full w-full max-w-[520px] flex flex-col overflow-hidden shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--card-border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{(viewContact.first_name || "?")[0]}{(viewContact.last_name || "")[0]}</div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{fullName(viewContact)}</p>
                  <p className="text-xs text-muted-foreground">{viewContact.job_title || ""}{viewContact.company ? ` · ${viewContact.company}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleToggleStar(viewContact.id)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}>{viewContact.starred ? <Star size={14} fill="#eab308" color="#eab308" /> : <StarOff size={14} className="text-muted-foreground" />}</button>
                <button onClick={() => { openEdit(viewContact); setViewContact(null); }} className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><Pencil size={12} />Edit</button>
                <button onClick={() => setViewContact(null)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                <select value={viewContact.status} onChange={e => handleUpdateStatus(viewContact.id, e.target.value as ContactStatus)} className="px-3 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer outline-none uppercase border" style={{ background: getStatusColor(viewContact.status).bg, color: getStatusColor(viewContact.status).text, borderColor: getStatusColor(viewContact.status).border }}>
                  {(["ACTIVE", "PROSPECT", "INACTIVE", "CHURNED"] as ContactStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {(viewContact.lifetime_value || 0) > 0 && <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold" style={{ background: "rgba(0,242,254,.12)", color: "var(--graph-to)" }}>LTV ₹{viewContact.lifetime_value!.toLocaleString("en-IN")}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ icon: <Bell size={13} />, label: "Reminder", action: () => setReminderContact(viewContact) }, { icon: <StickyNote size={13} />, label: "Add Note", action: () => setNoteForContact(viewContact) }, { icon: <Trash2 size={13} />, label: "Delete", danger: true, action: () => { setDeleteContact(viewContact); setViewContact(null); } }].map(b => (
                  <button key={b.label} onClick={b.action} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold hover:opacity-70" style={{ borderColor: b.danger ? "rgba(239,68,68,.3)" : "var(--card-border)", color: b.danger ? "#ef4444" : "var(--text-color)", background: b.danger ? "rgba(239,68,68,.06)" : "var(--accent)" }}>{b.icon}{b.label}</button>
                ))}
              </div>
              <CDS title="Contact Info">
                {viewContact.email && <CDR icon={<Mail size={12} />} label="Email"><a href={`mailto:${viewContact.email}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewContact.email}</a></CDR>}
                {viewContact.phone && <CDR icon={<Phone size={12} />} label="Phone"><a href={`tel:${viewContact.phone}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewContact.phone}</a></CDR>}
                <CDR icon={<Briefcase size={12} />} label="Title / Dept"><span style={{ color: "var(--text-color)" }}>{[viewContact.job_title, viewContact.department].filter(Boolean).join(" · ") || "—"}</span></CDR>
                <CDR icon={<Building size={12} />} label="Company"><span style={{ color: "var(--text-color)" }}>{viewContact.company || "—"}</span></CDR>
                {viewContact.website && <CDR icon={<Globe size={12} />} label="Website"><a href={`https://${viewContact.website}`} target="_blank" className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewContact.website}</a></CDR>}
                {viewContact.linkedin_url && <CDR icon={<Linkedin size={12} />} label="LinkedIn"><a href={viewContact.linkedin_url} target="_blank" className="hover:underline" style={{ color: "var(--graph-to)" }}>{viewContact.linkedin_url}</a></CDR>}
              </CDS>
              <CDS title="Details">
                <CDR icon={<Hash size={12} />} label="Industry"><span style={{ color: "var(--text-color)" }}>{viewContact.industry || "—"}</span></CDR>
                <CDR icon={<Tag size={12} />} label="Location"><span style={{ color: "var(--text-color)" }}>{[viewContact.city, viewContact.country].filter(Boolean).join(", ") || "—"}</span></CDR>
                <CDR icon={<Calendar size={12} />} label="Contact Since"><span style={{ color: "var(--text-color)" }}>{fmtDate(viewContact.customer_since || viewContact.created_at)}</span></CDR>
              </CDS>
              {viewContact.tags && viewContact.tags.length > 0 && <CDS title="Tags"><div className="flex flex-wrap gap-1.5">{viewContact.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div></CDS>}
              {viewContact.notes && <CDS title="Notes"><p className="text-xs leading-relaxed" style={{ color: "var(--text-color)" }}>{viewContact.notes}</p></CDS>}
              <CDS title="Activity Log" action={<button onClick={() => setNoteForContact(viewContact)} className="text-xs flex items-center gap-1 font-semibold hover:opacity-70" style={{ color: "var(--graph-to)" }}><Plus size={12} />Add Note</button>}>
                {(viewContact.contact_notes?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No notes yet.</p> : (
                  <div className="space-y-3">
                    {viewContact.contact_notes!.map(n => (
                      <div key={n.id} className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{(n.author || "Y")[0]}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-bold" style={{ color: "var(--text-color)" }}>{n.author}</span><span className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</span></div>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-color)" }}>{n.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CDS>
              {reminders.filter(r => r.contact_id === viewContact.id).length > 0 && (
                <CDS title="Reminders">
                  {reminders.filter(r => r.contact_id === viewContact.id).map(r => (
                    <div key={r.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: r.done ? "var(--card-border)" : "rgba(234,179,8,.3)", background: r.done ? "transparent" : "rgba(234,179,8,.06)" }}>
                      <button onClick={() => setReminders(p => p.map(x => x.id === r.id ? { ...x, done: !x.done } : x))} className="shrink-0">{r.done ? <CheckCircle2 size={14} style={{ color: "#10b981" }} /> : <Clock size={14} style={{ color: "#eab308" }} />}</button>
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: r.done ? "line-through" : "none" }}>{r.title}</p><p className="text-[10px] text-muted-foreground">{new Date(r.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{r.type}</span>
                    </div>
                  ))}
                </CDS>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT DRAWER ── */}
      {(isCreateOpen || editContact) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => { setIsCreateOpen(false); setEditContact(null); }} />
          <div className="relative ml-auto h-full w-full max-w-[520px] overflow-y-auto shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <form onSubmit={editContact ? handleEdit : handleCreate}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "var(--card-bg-solid)", borderBottom: "1px solid var(--card-border)" }}>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>{editContact ? "Edit Contact" : "New Contact"}</h2>
                <button type="button" onClick={() => { setIsCreateOpen(false); setEditContact(null); }} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={15} /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <CFS title="Identity">
                  <div className="grid grid-cols-2 gap-3">
                    <CFF label="First Name *"><input required value={form.first_name} onChange={e => setF("first_name", e.target.value)} className="cct-fi" placeholder="Vikram" /></CFF>
                    <CFF label="Last Name"><input value={form.last_name} onChange={e => setF("last_name", e.target.value)} className="cct-fi" placeholder="Singh" /></CFF>
                  </div>
                  <CFF label="Email *"><input type="email" required value={form.email} onChange={e => setF("email", e.target.value)} className="cct-fi" /></CFF>
                  <CFF label="Phone"><input value={form.phone} onChange={e => setF("phone", e.target.value)} className="cct-fi" placeholder="+91-..." /></CFF>
                </CFS>
                <CFS title="Professional">
                  <CFF label="Job Title"><input value={form.job_title} onChange={e => setF("job_title", e.target.value)} className="cct-fi" placeholder="CTO" /></CFF>
                  <CFF label="Department"><input value={form.department} onChange={e => setF("department", e.target.value)} className="cct-fi" placeholder="Technology" /></CFF>
                  <CFF label="Company"><input value={form.company} onChange={e => setF("company", e.target.value)} className="cct-fi" placeholder="Acme Corp" /></CFF>
                  <div className="grid grid-cols-2 gap-3">
                    <CFF label="Industry"><input value={form.industry} onChange={e => setF("industry", e.target.value)} className="cct-fi" placeholder="Technology" /></CFF>
                    <CFF label="Lifetime Value (₹)"><input type="number" value={form.lifetime_value} onChange={e => setF("lifetime_value", e.target.value)} className="cct-fi" /></CFF>
                  </div>
                  <CFF label="Website"><input value={form.website} onChange={e => setF("website", e.target.value)} className="cct-fi" placeholder="company.in" /></CFF>
                  <CFF label="LinkedIn URL"><input value={form.linkedin_url} onChange={e => setF("linkedin_url", e.target.value)} className="cct-fi" placeholder="linkedin.com/in/..." /></CFF>
                </CFS>
                <CFS title="Location">
                  <div className="grid grid-cols-2 gap-3">
                    <CFF label="City"><input value={form.city} onChange={e => setF("city", e.target.value)} className="cct-fi" placeholder="Mumbai" /></CFF>
                    <CFF label="Country"><input value={form.country} onChange={e => setF("country", e.target.value)} className="cct-fi" /></CFF>
                  </div>
                </CFS>
                <CFS title="Metadata">
                  <CFF label="Status">
                    <select value={form.status} onChange={e => setF("status", e.target.value as ContactStatus)} className="cct-fi">
                      {(["ACTIVE", "PROSPECT", "INACTIVE", "CHURNED"] as ContactStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </CFF>
                  <CFF label="Tags (comma separated)"><input value={form.tags} onChange={e => setF("tags", e.target.value)} className="cct-fi" placeholder="Enterprise, Partner" /></CFF>
                  <CFF label="Notes"><textarea rows={3} value={form.notes} onChange={e => setF("notes", e.target.value)} className="cct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Key context..." /></CFF>
                </CFS>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsCreateOpen(false); setEditContact(null); }} className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold text-sm hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Saving..." : (editContact ? "Save Changes" : "Create Contact")}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteContact(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,.1)" }}><Trash2 size={22} style={{ color: "#ef4444" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "var(--text-color)" }}>Delete Contact?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5"><strong style={{ color: "var(--text-color)" }}>{fullName(deleteContact)}</strong> will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteContact(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-10 rounded-xl font-semibold text-sm text-white" style={{ background: "#ef4444" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NOTE MODAL ── */}
      {noteForContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setNoteForContact(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Add Note — {fullName(noteForContact)}</h3><button onClick={() => setNoteForContact(null)}><X size={15} /></button></div>
            <textarea autoFocus rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full border rounded-xl p-3 text-sm outline-none resize-none" style={{ borderColor: "var(--card-border)", background: "var(--accent)", color: "var(--text-color)" }} placeholder="Write note..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteForContact(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={() => { handleAddNote(noteForContact); setNoteForContact(null); }} className="flex-1 h-10 rounded-xl font-semibold text-sm" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMINDER MODAL ── */}
      {reminderContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setReminderContact(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Set Reminder</h3><p className="text-xs text-muted-foreground">For: {fullName(reminderContact)}</p></div><button onClick={() => setReminderContact(null)}><X size={15} /></button></div>
            <div className="space-y-3">
              <CFF label="Title *"><input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} className="cct-fi" placeholder="Follow-up call" /></CFF>
              <div className="grid grid-cols-2 gap-3">
                <CFF label="Type"><select value={reminderForm.type} onChange={e => setReminderForm(f => ({ ...f, type: e.target.value as any }))} className="cct-fi"><option value="call">📞 Call</option><option value="email">✉️ Email</option><option value="meeting">🗓 Meeting</option><option value="follow_up">🔁 Follow-up</option></select></CFF>
                <CFF label="Date & Time *"><input type="datetime-local" value={reminderForm.datetime} onChange={e => setReminderForm(f => ({ ...f, datetime: e.target.value }))} className="cct-fi" min={new Date().toISOString().slice(0, 16)} /></CFF>
              </div>
              <CFF label="Note"><textarea rows={2} value={reminderForm.note} onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))} className="cct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="What to discuss..." /></CFF>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setReminderContact(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
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
                <label key={col.key} className="flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer hover:bg-accent" style={{ transition: "background .1s" }}>
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

      <style>{`.cct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.cct-fi:focus{border-color:var(--graph-to)}.cct-fi::placeholder{color:var(--muted-foreground);opacity:.7}`}</style>
    </div>
  );
}

function CBt({ children, onClick, primary, ghost, icon }: any) {
  return <button onClick={onClick} className="h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 active:scale-95" style={{ background: primary ? "var(--graph-to)" : "var(--card-bg)", color: primary ? "#0a0a0a" : "var(--text-color)", border: ghost ? "1px solid var(--card-border)" : "none", transition: "opacity .15s" }}>{icon}{children}</button>;
}
function CAM({ icon, label, onClick, danger }: any) {
  return <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left hover:bg-accent" style={{ color: danger ? "#ef4444" : "var(--text-color)", transition: "background .1s" }}>{icon}{label}</button>;
}
function CDS({ title, children, action }: any) {
  return <div><div className="flex items-center justify-between mb-2"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{action}</div><div className="rounded-xl border p-3.5 space-y-2.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>{children}</div></div>;
}
function CDR({ icon, label, children }: any) {
  return <div className="flex items-start gap-2.5"><div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div><div className="flex-1 min-w-0"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span><div className="text-xs">{children}</div></div></div>;
}
function CFS({ title, children }: any) {
  return <div className="space-y-3"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{children}</div>;
}
function CFF({ label, children }: any) {
  return <div className="space-y-1.5"><label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>{children}</div>;
}
