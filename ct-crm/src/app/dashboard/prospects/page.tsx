"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  getProspects,
  getProspectReminders,
  createProspect,
  updateProspect,
  updateProspectStatus,
  deleteProspect,
  addProspectNote,
  createProspectReminder,
  seedDemoProspects,
  seedProspectsFromLeads,
} from "@/server/prospects";
import { getTeamMembers } from "@/server/users";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";
import { DateRangePicker, getDateRangeBounds, isWithinDateRange, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { ProspectsBySourceChart, ProspectsStageFunnel, ProspectsIndustryBreakdown, ProspectsQualifiedTrend, type CountDatum, type TrendDatum } from "@/components/dashboard/widgets/prospects-reports";
import ProspectsLoading from "./loading";
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  Search, Filter, Plus, Table2, Kanban as KanbanIcon, Grid,
  MoreHorizontal, Mail, Phone, Building, X, Eye,
  Pencil, Trash2, Bell, StickyNote, Star, StarOff, Copy,
  SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  Users, UserPlus, Wallet, List, BarChart3, Sparkles,
  CheckCircle2, AlertTriangle, UserCheck, Hash, Clock, Calendar,
  TrendingUp, Target, CalendarDays,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ProspectStatus = "QUALIFIED" | "PROPOSAL_SENT" | "IN_NEGOTIATION" | "DEAL_OPENED" | "LOST";

interface PNote { id: string; text: string; created_at: string; author?: string; }

interface Reminder {
  id: string;
  p_id: string;
  p_name: string;
  title: string;
  type: "call" | "email" | "meeting" | "follow_up";
  datetime: string;
  note?: string;
  done: boolean;
}

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
  owner_id?: string;
  owner_name?: string;
  owner_name_custom?: string;
  rating?: string;
  project_name?: string;
  qualified_at?: string;
  created_at?: string;
}

interface TeamMember {
  id: string;
  full_name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: ProspectStatus[] = ["QUALIFIED", "PROPOSAL_SENT", "IN_NEGOTIATION", "DEAL_OPENED", "LOST"];
const RATING_OPTIONS = ["Hot", "Warm", "Cold"];

const ALL_COLUMNS = [
  { key: "name", label: "Prospect", required: true },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "budget", label: "Budget" },
  { key: "authority", label: "Authority" },
  { key: "need", label: "Need" },
  { key: "timeline", label: "Timeline" },
  { key: "status", label: "Stage" },
  { key: "source", label: "Source" },
  { key: "industry", label: "Industry" },
  { key: "city", label: "City" },
  { key: "tags", label: "Tags" },
  { key: "rating", label: "Rating" },
  { key: "project_name", label: "Project" },
  { key: "qualified_at", label: "Qualified" },
  { key: "actions", label: "Actions", required: true },
];

// Columns the global search box can be scoped to
const SEARCH_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "city", label: "City" },
  { key: "industry", label: "Industry" },
  { key: "tags", label: "Tags" },
  { key: "need", label: "Need" },
  { key: "notes", label: "Notes" },
];

const PAGE_SIZES = [10, 50, 100, 200];

const SOURCE_OPTIONS = ["DIRECT", "GOOGLE", "META", "REFERRAL", "WHATSAPP", "EVENT", "OTHER"];
const TIMELINE_OPTS = ["Immediate (0-15 days)", "Near-Term (30-60 days)", "Mid-Term (90 days)", "Long-Term (6 months+)"];

const FALLBACK: Prospect[] = [
  { id: "p1", first_name: "Vikram", last_name: "Singh", company: "Acme Corp", email: "vikram@acmecorp.in", phone: "+91-9876543210", budget: 450000, authority: true, need: "Enterprise cloud dashboard implementation with SSO and audit logs.", timeline: "Immediate (0-15 days)", status: "DEAL_OPENED", source: "REFERRAL", industry: "Technology", city: "Mumbai", starred: true, tags: ["Hot", "Enterprise"], pnotes: [{ id: "n1", text: "Approved by board. Awaiting legal sign-off on contract.", created_at: new Date(Date.now() - 86400000).toISOString(), author: "You" }], qualified_at: new Date(Date.now() - 86400000 * 3).toISOString(), created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "p2", first_name: "Arjun", last_name: "Mehta", company: "CloudSoft Technologies", email: "arjun@cloudsoft.in", phone: "+91-9876543212", budget: 320000, authority: true, need: "Operational ERP API connectivity and data pipeline automation.", timeline: "Near-Term (30-60 days)", status: "IN_NEGOTIATION", source: "GOOGLE", industry: "Cloud", city: "Pune", starred: false, tags: ["Negotiating"], pnotes: [], qualified_at: new Date(Date.now() - 86400000 * 7).toISOString(), created_at: new Date(Date.now() - 86400000 * 9).toISOString() },
  { id: "p3", first_name: "Sanya", last_name: "Reddy", company: "DataFlow Inc", email: "sanya@dataflow.co", budget: 280000, authority: true, need: "Real-time analytics dashboard with custom KPI widgets.", timeline: "Mid-Term (90 days)", status: "PROPOSAL_SENT", source: "DIRECT", industry: "Analytics", city: "Hyderabad", starred: false, tags: ["Mid-market"], pnotes: [], qualified_at: new Date(Date.now() - 86400000 * 10).toISOString(), created_at: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: "p4", first_name: "Rohan", last_name: "Joshi", company: "NovaTech Labs", email: "rohan@novatech.in", budget: 150000, authority: false, need: "AI chatbot for customer support automation.", timeline: "Long-Term (6 months+)", status: "QUALIFIED", source: "META", industry: "HealthTech", city: "Delhi", starred: false, tags: ["New"], pnotes: [], qualified_at: new Date(Date.now() - 86400000).toISOString(), created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusColor(s: ProspectStatus) {
  const map: Record<ProspectStatus, { bg: string; text: string; border: string }> = {
    QUALIFIED: { bg: "rgba(59,130,246,.15)", text: "#3b82f6", border: "rgba(59,130,246,.3)" },
    PROPOSAL_SENT: { bg: "rgba(249,115,22,.15)", text: "#f97316", border: "rgba(249,115,22,.3)" },
    IN_NEGOTIATION: { bg: "rgba(234,179,8,.15)", text: "#eab308", border: "rgba(234,179,8,.3)" },
    DEAL_OPENED: { bg: "rgba(16,185,129,.15)", text: "#10b981", border: "rgba(16,185,129,.3)" },
    LOST: { bg: "rgba(239,68,68,.15)", text: "#ef4444", border: "rgba(239,68,68,.3)" },
  };
  return map[s];
}

function getAuthorityColor(authority?: boolean) {
  return authority ? { bg: "rgba(16,185,129,.15)", text: "#10b981" } : { bg: "rgba(239,68,68,.15)", text: "#ef4444" };
}

function getRatingColor(rating?: string) {
  const map: Record<string, { bg: string; text: string }> = {
    Hot: { bg: "rgba(239,68,68,.15)", text: "#ef4444" },
    Warm: { bg: "rgba(245,158,11,.15)", text: "#f59e0b" },
    Cold: { bg: "rgba(59,130,246,.15)", text: "#3b82f6" },
  };
  return map[rating || ""] ?? { bg: "rgba(0,0,0,.06)", text: "var(--muted-foreground)" };
}

function RatingBadge({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  const c = getRatingColor(rating);
  return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: c.bg, color: c.text }}>{rating}</span>;
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

function toggleSetValue(setFn: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
  setFn(prev => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });
}

function getNextFollowUp(pId: string, reminders: Reminder[]): Reminder | null {
  const upcoming = reminders
    .filter(r => r.p_id === pId && !r.done)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  return upcoming[0] || null;
}

// Highlight ring color: overdue follow-up (red) > due-today follow-up (amber) > starred (purple)
// Local copy mirroring leads' getHighlightColor — Phase 25 may centralize this into a shared helper.
function getHighlightColor(prospect: Prospect, reminders: Reminder[]): string | undefined {
  const pending = reminders.filter(r => r.p_id === prospect.id && !r.done);
  const now = new Date();
  if (pending.some(r => new Date(r.datetime).getTime() < now.getTime())) return "#ef4444";
  if (pending.some(r => new Date(r.datetime).toDateString() === now.toDateString())) return "#eab308";
  if (prospect.starred) return "#a855f7";
  return undefined;
}

// Groups prospects by qualified-day for the "Prospects Qualified" trend chart, sorted chronologically.
function buildTrendData(items: Prospect[]): TrendDatum[] {
  const counts = new Map<string, { label: string; count: number }>();
  items.forEach(p => {
    if (!p.qualified_at) return;
    const d = new Date(p.qualified_at);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const existing = counts.get(key);
    if (existing) existing.count++; else counts.set(key, { label, count: 1 });
  });
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ date: v.label, count: v.count }));
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProspectsPage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Table" | "Kanban" | "Grid">("Table");
  const [search, setSearch] = useState("");
  const [searchCols, setSearchCols] = useState<Set<string>>(new Set(SEARCH_COLUMNS.map(c => c.key)));
  const [activePanel, setActivePanel] = useState<"search" | "filters" | null>(null);
  const [stageFilters, setStageFilters] = useState<Set<string>>(new Set());
  const [sourceFilters, setSourceFilters] = useState<Set<string>>(new Set());
  const [industryFilters, setIndustryFilters] = useState<Set<string>>(new Set());
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [ratingFilters, setRatingFilters] = useState<Set<string>>(new Set());
  const [authorityFilters, setAuthorityFilters] = useState<Set<string>>(new Set());
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [followUpTodayFilter, setFollowUpTodayFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Tab navigation + date-range filter for KPI cards/Reports
  const [pageTab, setPageTab] = useState<"Prospects" | "Reports">("Prospects");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: "all" });

  // UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editP, setEditP] = useState<Prospect | null>(null);
  const [deleteP, setDeleteP] = useState<Prospect | null>(null);
  const [reminderP, setReminderP] = useState<Prospect | null>(null);
  const [noteForP, setNoteForP] = useState<Prospect | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [remindersPanelOpen, setRemindersPanelOpen] = useState(false);
  const [todayPanelOpen, setTodayPanelOpen] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [convertingLeads, setConvertingLeads] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("ct-crm-prospects-columns");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.every(c => typeof c === "string")) return parsed;
        }
      } catch { /* ignore malformed storage */ }
    }
    return ["name", "company", "email", "budget", "authority", "timeline", "status", "need", "qualified_at", "actions"];
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Form
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", budget: "", authority: false, need: "", timeline: TIMELINE_OPTS[1], status: "QUALIFIED" as ProspectStatus, source: "DIRECT", industry: "", city: "", notes: "", tags: "", owner_id: "", owner_name_custom: "", rating: "Warm", project_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [reminderForm, setReminderForm] = useState({ title: "", type: "call" as Reminder["type"], datetime: "", note: "" });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ownerCustomMode, setOwnerCustomMode] = useState(false);

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      const [prospectRows, reminderRows] = await Promise.all([getProspects(), getProspectReminders()]);
      if (prospectRows.length) {
        setProspects(prospectRows as Prospect[]);
      }
      if (reminderRows.length) {
        setReminders(reminderRows as Reminder[]);
      }
    } catch {
      setProspects(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);
  useEffect(() => {
    getTeamMembers().then(members => setTeamMembers(members.map(m => ({ id: m.id, full_name: m.full_name })))).catch(() => {});
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("ct-crm-prospects-columns", JSON.stringify(visibleCols)); } catch { /* ignore */ }
  }, [visibleCols]);
  useEffect(() => {
    if (!actionMenuId) return;
    const h = () => setActionMenuId(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [actionMenuId]);
  useEffect(() => {
    if (!actionMenuId) return;
    const close = () => setActionMenuId(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [actionMenuId]);
  useEffect(() => {
    if (!activePanel) return;
    const h = () => setActivePanel(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [activePanel]);
  // Close any open row action-menu when a modal/drawer opens, so its portal
  // (rendered at z-[9999]) can't bleed above the modal's backdrop (z-50).
  useEffect(() => {
    if (isCreateOpen || editP || deleteP || noteForP || reminderP || columnEditorOpen || remindersPanelOpen || todayPanelOpen) {
      setActionMenuId(null);
    }
  }, [isCreateOpen, editP, deleteP, noteForP, reminderP, columnEditorOpen, remindersPanelOpen, todayPanelOpen]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleUpdateStatus = useCallback(async (id: string, next: ProspectStatus) => {
    setProspects(p => p.map(x => x.id === id ? { ...x, status: next } : x));
    try {
      await updateProspectStatus(id, next);
      toast.success(`Stage → ${next.replace(/_/g, " ")}`);
    } catch { toast.error("Failed to update stage"); }
  }, []);

  const handleToggleStar = useCallback((id: string) => {
    setProspects(p => p.map(x => x.id === id ? { ...x, starred: !x.starred } : x));
  }, []);

  // ─── Kanban drag-and-drop ───────────────────────────────────────────────
  const [draggingProspect, setDraggingProspect] = useState<Prospect | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setDraggingProspect(prospects.find(p => p.id === e.active.id) || null);
  }, [prospects]);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDraggingProspect(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as ProspectStatus;
    const prospect = prospects.find(p => p.id === active.id);
    if (prospect && prospect.status !== newStatus && (STAGES as string[]).includes(newStatus)) {
      handleUpdateStatus(prospect.id, newStatus);
    }
  }, [prospects, handleUpdateStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) { toast.error("Name required"); return; }
    setSubmitting(true);
    const full: Prospect = { id: "", first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, company: form.company, budget: parseFloat(form.budget) || 0, authority: form.authority, need: form.need, timeline: form.timeline, status: form.status, source: form.source, industry: form.industry, city: form.city, notes: form.notes, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [], rating: form.rating, project_name: form.project_name, starred: false, pnotes: [], qualified_at: new Date().toISOString(), created_at: new Date().toISOString() };
    try {
      const row = await createProspect({
        first_name: form.first_name, last_name: form.last_name, email: form.email,
        phone: form.phone, company: form.company, budget: parseFloat(form.budget) || 0,
        authority: form.authority, need: form.need, timeline: form.timeline,
        status: form.status, source: form.source, industry: form.industry,
        city: form.city, notes: form.notes,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        rating: form.rating || null,
        project_name: form.project_name.trim() || null,
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
      });
      setProspects(p => [{ ...full, id: row.id }, ...p]);
      toast.success("✅ Prospect saved to database!");
    } catch {
      toast.error("Failed to save prospect");
    } finally { setSubmitting(false); setIsCreateOpen(false); resetForm(); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editP) return;
    setSubmitting(true);
    const updates: Partial<Prospect> = { first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, company: form.company, budget: parseFloat(form.budget) || 0, authority: form.authority, need: form.need, timeline: form.timeline, status: form.status, source: form.source, industry: form.industry, city: form.city, notes: form.notes, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [], rating: form.rating, project_name: form.project_name, owner_id: form.owner_id || undefined, owner_name_custom: form.owner_id ? undefined : (form.owner_name_custom || undefined) };
    if (form.owner_id) updates.owner_name = teamMembers.find(m => m.id === form.owner_id)?.full_name;
    const updated = { ...editP, ...updates };
    setProspects(p => p.map(x => x.id === editP.id ? updated : x));
    try {
      await updateProspect(editP.id, {
        first_name: updates.first_name!, last_name: updates.last_name!, email: updates.email,
        phone: updates.phone, company: updates.company, budget: updates.budget,
        authority: updates.authority, need: updates.need, timeline: updates.timeline,
        status: updates.status, source: updates.source, industry: updates.industry, city: updates.city,
        notes: updates.notes, tags: updates.tags,
        rating: form.rating || null,
        project_name: form.project_name.trim() || null,
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
      });
      toast.success("✅ Prospect updated!");
    } catch { toast.error("Failed to update prospect"); }
    finally { setSubmitting(false); setEditP(null); }
  };

  const handleDelete = async () => {
    if (!deleteP) return;
    setProspects(p => p.filter(x => x.id !== deleteP.id));
    toast.success("Prospect removed");
    const id = deleteP.id;
    setDeleteP(null);
    try { await deleteProspect(id); } catch { toast.error("Failed to delete prospect on server"); }
  };

  const handleAddNote = async (p: Prospect) => {
    if (!newNote.trim()) return;
    const noteText = newNote.trim();
    const tempNote: PNote = { id: Math.random().toString(36).slice(7), text: noteText, created_at: new Date().toISOString(), author: "You" };
    const updated = { ...p, pnotes: [tempNote, ...(p.pnotes || [])] };
    setProspects(prev => prev.map(x => x.id === p.id ? updated : x));
    setNewNote("");
    try {
      const row = await addProspectNote(p.id, noteText);
      const realNote = { ...tempNote, id: row.id };
      setProspects(prev => prev.map(x => x.id === p.id ? { ...x, pnotes: x.pnotes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : x));
      toast.success("✅ Note saved to database!");
    } catch { toast.error("Failed to save note"); }
  };

  const handleSetReminder = async () => {
    if (!reminderP || !reminderForm.title || !reminderForm.datetime) { toast.error("Fill title & date/time"); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, p_id: reminderP.id, p_name: `${reminderP.first_name} ${reminderP.last_name}`, ...reminderForm, done: false };
    setReminders(p => [...p, r]);
    toast.success(`⏰ Reminder set for ${new Date(reminderForm.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
    setReminderP(null);
    setReminderForm({ title: "", type: "call", datetime: "", note: "" });
    try {
      const row = await createProspectReminder({ entity_id: reminderP.id, entity_name: r.p_name, title: r.title, type: r.type, datetime: r.datetime, note: r.note });
      setReminders(p => p.map(x => x.id === tempId ? { ...x, id: row.id } : x));
    } catch { }
  };

  const handleToggleReminder = (id: string) => {
    setReminders(p => p.map(r => r.id === id ? { ...r, done: true } : r));
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const result = await seedDemoProspects();
      if (result.skipped) {
        toast.error("Demo data already loaded.");
      } else {
        toast.success(`Loaded ${result.inserted} demo prospects`);
        await fetchProspects();
      }
    } catch {
      toast.error("Failed to load demo data");
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleConvertLeads = async () => {
    setConvertingLeads(true);
    try {
      const result = await seedProspectsFromLeads(15);
      if (result.inserted > 0) {
        toast.success(`Converted ${result.inserted} leads to prospects`);
        await fetchProspects();
      } else {
        toast.error("No leads available to convert");
      }
    } catch {
      toast.error("Failed to convert leads to prospects");
    } finally {
      setConvertingLeads(false);
    }
  };

  const openEdit = (p: Prospect) => {
    setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email || "", phone: p.phone || "", company: p.company || "", budget: String(p.budget || ""), authority: p.authority || false, need: p.need || "", timeline: p.timeline || TIMELINE_OPTS[1], status: p.status, source: p.source || "DIRECT", industry: p.industry || "", city: p.city || "", notes: p.notes || "", tags: (p.tags || []).join(", "), owner_id: p.owner_id || "", owner_name_custom: p.owner_name_custom || "", rating: p.rating || "Warm", project_name: p.project_name || "" });
    setOwnerCustomMode(!p.owner_id && !!p.owner_name_custom);
    setEditP(p);
  };

  const resetForm = () => {
    setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", budget: "", authority: false, need: "", timeline: TIMELINE_OPTS[1], status: "QUALIFIED", source: "DIRECT", industry: "", city: "", notes: "", tags: "", owner_id: "", owner_name_custom: "", rating: "Warm", project_name: "" });
    setOwnerCustomMode(false);
  };

  // ─── Filtering (advanced column-scoped search + multi-select filters) ─────
  const availableSources = Array.from(new Set([...SOURCE_OPTIONS, ...prospects.map(p => p.source).filter(Boolean) as string[]]));
  const availableIndustries = Array.from(new Set(prospects.map(p => p.industry).filter(Boolean))) as string[];
  const availableTags = Array.from(new Set(prospects.flatMap(p => p.tags || []).filter(Boolean))) as string[];

  const matchesSearch = (p: Prospect, q: string) => {
    if (!q) return true;
    const hay: string[] = [];
    if (searchCols.has("name")) hay.push(`${p.first_name} ${p.last_name}`);
    if (searchCols.has("company")) hay.push(p.company || "");
    if (searchCols.has("email")) hay.push(p.email || "");
    if (searchCols.has("phone")) hay.push(p.phone || "");
    if (searchCols.has("city")) hay.push(p.city || "");
    if (searchCols.has("industry")) hay.push(p.industry || "");
    if (searchCols.has("tags")) hay.push((p.tags || []).join(" "));
    if (searchCols.has("need")) hay.push(p.need || "");
    if (searchCols.has("notes")) hay.push(p.notes || "", ...(p.pnotes || []).map(n => n.text));
    return hay.join("   ").toLowerCase().includes(q);
  };

  const todayFollowUpProspectIds = new Set(
    reminders.filter(r => !r.done && new Date(r.datetime).toDateString() === new Date().toDateString()).map(r => r.p_id)
  );

  const filtered = prospects.filter(p => {
    const q = search.trim().toLowerCase();
    if (!matchesSearch(p, q)) return false;
    if (stageFilters.size > 0 && !stageFilters.has(p.status)) return false;
    if (sourceFilters.size > 0 && !sourceFilters.has(p.source || "")) return false;
    if (industryFilters.size > 0 && !industryFilters.has(p.industry || "")) return false;
    if (tagFilters.size > 0 && !(p.tags || []).some(t => tagFilters.has(t))) return false;
    if (ratingFilters.size > 0 && !ratingFilters.has(p.rating || "")) return false;
    if (authorityFilters.size > 0) {
      const val = p.authority ? "Yes" : "No";
      if (!authorityFilters.has(val)) return false;
    }
    if (budgetMin && (p.budget || 0) < Number(budgetMin)) return false;
    if (budgetMax && (p.budget || 0) > Number(budgetMax)) return false;
    if (dateFrom && new Date(p.qualified_at || p.created_at || 0) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.qualified_at || p.created_at || 0) > new Date(`${dateTo}T23:59:59`)) return false;
    if (followUpTodayFilter && !todayFollowUpProspectIds.has(p.id)) return false;
    return true;
  });

  const activeFilterCount = stageFilters.size + sourceFilters.size + industryFilters.size + tagFilters.size + ratingFilters.size + authorityFilters.size
    + (budgetMin ? 1 : 0) + (budgetMax ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (followUpTodayFilter ? 1 : 0);

  const clearAllFilters = () => {
    setStageFilters(new Set()); setSourceFilters(new Set()); setIndustryFilters(new Set());
    setTagFilters(new Set()); setRatingFilters(new Set()); setAuthorityFilters(new Set());
    setBudgetMin(""); setBudgetMax(""); setDateFrom(""); setDateTo(""); setFollowUpTodayFilter(false);
  };

  // ─── Pagination ─────────────────────────────────────────────────────────
  useEffect(() => { setPage(1); }, [search, searchCols, stageFilters, sourceFilters, industryFilters, tagFilters, ratingFilters, authorityFilters, budgetMin, budgetMax, dateFrom, dateTo, followUpTodayFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedStart = (page - 1) * pageSize;
  const paged = filtered.slice(pagedStart, pagedStart + pageSize);

  const activeReminders = reminders.filter(r => !r.done);
  const todayFollowUps = activeReminders.filter(r => new Date(r.datetime).toDateString() === new Date().toDateString());

  // ─── KPI summary cards + Reports ───────────────────────────────────────────
  const rangeBounds = getDateRangeBounds(dateRange);
  const rangeProspects = prospects.filter(p => isWithinDateRange(p.qualified_at || p.created_at || new Date().toISOString(), rangeBounds));
  const kpiTotalProspects = prospects.length;
  const kpiNewInRange = rangeProspects.length;
  const kpiPipelineValue = rangeProspects.reduce((s, p) => s + (p.budget || 0), 0);
  const kpiAvgBudget = rangeProspects.length > 0 ? Math.round(kpiPipelineValue / rangeProspects.length) : 0;
  const kpiInNegotiation = rangeProspects.filter(p => p.status === "PROPOSAL_SENT" || p.status === "IN_NEGOTIATION").length;
  const kpiDealsOpened = rangeProspects.filter(p => p.status === "DEAL_OPENED").length;
  const kpiFollowUpsToday = reminders.filter(r => !r.done && new Date(r.datetime).toDateString() === new Date().toDateString()).length;
  const kpiOverdueFollowUps = reminders.filter(r => !r.done && new Date(r.datetime).getTime() < Date.now()).length;
  const pct = (num: number, den: number) => den > 0 ? `${Math.round((num / den) * 100)}%` : "0%";

  // Reports tab data — respects dateRange via rangeProspects
  const sourceData: CountDatum[] = availableSources.map(s => ({ name: s, count: rangeProspects.filter(p => p.source === s).length }));
  const stageData: CountDatum[] = STAGES.map(s => ({ name: s.replace(/_/g, " "), count: rangeProspects.filter(p => p.status === s).length, color: getStatusColor(s).text }));
  const industryData: CountDatum[] = availableIndustries.map(i => ({ name: i, count: rangeProspects.filter(p => p.industry === i).length }));
  const trendData: TrendDatum[] = buildTrendData(rangeProspects);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading && prospects.length === 0) return <ProspectsLoading />;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Prospects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{prospects.length} total · {filtered.length} shown{activeReminders.length > 0 ? ` · ${activeReminders.length} reminders` : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeReminders.length > 0 && (
            <button onClick={() => setRemindersPanelOpen(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border hover:opacity-80" style={{ background: "rgba(234,179,8,.1)", borderColor: "rgba(234,179,8,.3)", color: "#eab308", transition: "opacity .15s" }}>
              <Bell size={13} />{activeReminders.length} reminder{activeReminders.length > 1 ? "s" : ""}
            </button>
          )}
          {todayFollowUps.length > 0 && (
            <button onClick={() => setTodayPanelOpen(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border hover:opacity-80" style={{ background: "rgba(168,85,247,.1)", borderColor: "rgba(168,85,247,.3)", color: "#a855f7", transition: "opacity .15s" }}>
              <CalendarDays size={13} />{todayFollowUps.length} follow-up{todayFollowUps.length > 1 ? "s" : ""} today
            </button>
          )}
          {!loading && prospects.length < 5 && (
            <Btn ghost onClick={handleSeedDemo} disabled={seedingDemo} icon={<Sparkles size={13} />}>
              {seedingDemo ? "Loading…" : "Load Demo Data"}
            </Btn>
          )}
          {!loading && prospects.length < 15 && (
            <Btn ghost onClick={handleConvertLeads} disabled={convertingLeads} icon={<UserCheck size={13} />}>
              {convertingLeads ? "Converting…" : "Convert 15 Leads"}
            </Btn>
          )}
          <Btn primary onClick={() => router.push("/dashboard/prospects/new")} icon={<Plus size={15} />}>New Prospect</Btn>
        </div>
      </div>

      {/* KPI Summary Cards — respect the date-range filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Users size={16} />} label="Total Prospects" value={String(kpiTotalProspects)} />
        <KpiCard icon={<UserPlus size={16} />} label="New This Period" value={String(kpiNewInRange)} color="#3b82f6" sub={`${pct(kpiNewInRange, kpiTotalProspects)} of total`} />
        <KpiCard icon={<Wallet size={16} />} label="Pipeline Value" value={`₹${kpiPipelineValue.toLocaleString("en-IN")}`} color="#00f2fe" sub={kpiAvgBudget > 0 ? `Avg ₹${kpiAvgBudget.toLocaleString("en-IN")}/prospect` : undefined} />
        <KpiCard icon={<TrendingUp size={16} />} label="In Proposal/Negotiation" value={String(kpiInNegotiation)} color="#eab308" sub={`${pct(kpiInNegotiation, kpiNewInRange)} of period`} />
        <KpiCard icon={<Target size={16} />} label="Deals Opened" value={String(kpiDealsOpened)} color="#10b981" sub={`${pct(kpiDealsOpened, kpiTotalProspects)} of total`} />
        <KpiCard icon={<Bell size={16} />} label="Follow-ups Today" value={String(kpiFollowUpsToday)} color="#a855f7" sub={kpiOverdueFollowUps > 0 ? `${kpiOverdueFollowUps} overdue` : undefined} />
      </div>

      {/* Tab navigation + date-range picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher
          value={pageTab}
          onChange={(id) => setPageTab(id as "Prospects" | "Reports")}
          options={[
            { id: "Prospects", label: "Prospects", icon: <List size={13} /> },
            { id: "Reports", label: "Reports", icon: <BarChart3 size={13} /> },
          ]}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {pageTab === "Reports" ? (
        /* REPORTS TAB — prospects-by-source, stage funnel, industry breakdown, qualified trend */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 view-transition" key="reports-view">
          <ProspectsBySourceChart data={sourceData} loading={loading} />
          <ProspectsStageFunnel data={stageData} loading={loading} />
          <ProspectsIndustryBreakdown data={industryData} loading={loading} />
          <ProspectsQualifiedTrend data={trendData} loading={loading} />
        </div>
      ) : (
        <>
          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input type="text" placeholder="Search prospects..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 pl-9 pr-3 rounded-xl text-xs bg-transparent border" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>

              {/* Advanced search: pick which columns the query matches against */}
              <div className="relative">
                <button type="button" onClick={(e) => { e.stopPropagation(); setActivePanel(p => p === "search" ? null : "search"); }} className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>
                  Search in <span className="text-muted-foreground">({searchCols.size}/{SEARCH_COLUMNS.length})</span><ChevronDown size={12} />
                </button>
                {activePanel === "search" && (
                  <div className="absolute left-0 mt-1 w-52 rounded-xl border shadow-xl z-50 p-2" onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
                    <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b" style={{ borderColor: "var(--card-border)" }}>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Search Columns</span>
                      <button type="button" onClick={() => setSearchCols(searchCols.size === SEARCH_COLUMNS.length ? new Set() : new Set(SEARCH_COLUMNS.map(c => c.key)))} className="text-[10px] font-semibold" style={{ color: "var(--graph-to)" }}>
                        {searchCols.size === SEARCH_COLUMNS.length ? "Clear" : "All"}
                      </button>
                    </div>
                    {SEARCH_COLUMNS.map(c => (
                      <label key={c.key} className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer rounded hover:bg-accent">
                        <input type="checkbox" checked={searchCols.has(c.key)} onChange={() => toggleSetValue(setSearchCols, c.key)} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced per-column filters */}
              <div className="relative">
                <button type="button" onClick={(e) => { e.stopPropagation(); setActivePanel(p => p === "filters" ? null : "filters"); }} className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border relative" style={{ borderColor: activeFilterCount > 0 ? "var(--graph-to)" : "var(--card-border)", color: "var(--text-color)" }}>
                  <Filter size={12} />Filters
                  {activeFilterCount > 0 && <span className="text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>{activeFilterCount}</span>}
                  <ChevronDown size={12} />
                </button>
                {activePanel === "filters" && (
                  <div className="absolute left-0 mt-1 w-[22rem] max-h-[70vh] overflow-y-auto rounded-xl border shadow-xl z-50 p-3.5 space-y-3.5" onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
                    <FilterChipGroup label="Stage" options={STAGES.map(s => ({ value: s, label: s.replace(/_/g, " ") }))} selected={stageFilters} onToggle={v => toggleSetValue(setStageFilters, v)} />
                    <FilterChipGroup label="Source" options={availableSources.map(s => ({ value: s, label: s }))} selected={sourceFilters} onToggle={v => toggleSetValue(setSourceFilters, v)} />
                    {availableIndustries.length > 0 && <FilterChipGroup label="Industry" options={availableIndustries.map(i => ({ value: i, label: i }))} selected={industryFilters} onToggle={v => toggleSetValue(setIndustryFilters, v)} />}
                    {availableTags.length > 0 && <FilterChipGroup label="Tags" options={availableTags.map(t => ({ value: t, label: t }))} selected={tagFilters} onToggle={v => toggleSetValue(setTagFilters, v)} />}
                    <FilterChipGroup label="Rating" options={RATING_OPTIONS.map(r => ({ value: r, label: r }))} selected={ratingFilters} onToggle={v => toggleSetValue(setRatingFilters, v)} />
                    <FilterChipGroup label="Authority" options={[{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }]} selected={authorityFilters} onToggle={v => toggleSetValue(setAuthorityFilters, v)} />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Budget (₹)</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="Min" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                        <span className="text-muted-foreground text-xs">to</span>
                        <input type="number" placeholder="Max" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Qualified Date Range</p>
                      <div className="flex items-center gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                        <span className="text-muted-foreground text-xs">to</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Follow-ups</p>
                      <label className="flex items-center gap-2 px-1 py-1 text-xs cursor-pointer rounded hover:bg-accent">
                        <input type="checkbox" checked={followUpTodayFilter} onChange={e => setFollowUpTodayFilter(e.target.checked)} />
                        <CalendarDays size={12} style={{ color: "#a855f7" }} />Due today
                      </label>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={clearAllFilters} className="flex-1 h-8 rounded-lg border text-xs font-semibold hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Clear all</button>
                      <button type="button" onClick={() => setActivePanel(null)} className="flex-1 h-8 rounded-lg text-xs font-semibold hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Done</button>
                    </div>
                  </div>
                )}
              </div>

              {(search || activeFilterCount > 0) && (
                <button onClick={() => { setSearch(""); clearAllFilters(); }} className="h-9 px-3 rounded-xl text-xs flex items-center gap-1 font-semibold" style={{ color: "#ef4444", background: "rgba(239,68,68,.1)", transition: "opacity .15s" }}>
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
              <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>No prospects found</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust filters or create a new prospect.</p>
              <button onClick={() => router.push("/dashboard/prospects/new")} className="mt-4 h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={14} />New Prospect</button>
            </div>
          ) : view === "Table" ? (
            <ProspectsTable
              paged={paged}
              visibleCols={visibleCols}
              reminders={reminders}
              actionMenuId={actionMenuId}
              actionMenuPos={actionMenuPos}
              setActionMenuId={setActionMenuId}
              setActionMenuPos={setActionMenuPos}
              onView={(p) => router.push(`/dashboard/prospects/${p.id}`)}
              onEdit={openEdit}
              onToggleStar={handleToggleStar}
              onUpdateStatus={handleUpdateStatus}
              onAddNote={setNoteForP}
              onSetReminder={setReminderP}
              onDelete={setDeleteP}
            />
          ) : view === "Kanban" ? (
            /* KANBAN — drag-and-drop via @dnd-kit */
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div key="kanban-view" className="overflow-x-auto pb-1 -mx-1 px-1 view-transition">
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5, minmax(220px, 1fr))", minWidth: 1100 }}>
                  {STAGES.map(stage => {
                    const sp = filtered.filter(p => p.status === stage);
                    const badge = getStatusColor(stage);
                    return (
                      <KanbanColumn key={stage} stage={stage} badge={badge} count={sp.length} value={sp.reduce((s, p) => s + (p.budget || 0), 0)}>
                        {sp.map(p => (
                          <KanbanCard key={p.id} prospect={p} highlight={getHighlightColor(p, reminders)} onView={() => router.push(`/dashboard/prospects/${p.id}`)} onEdit={() => openEdit(p)} />
                        ))}
                        {sp.length === 0 && <div className="flex-1 flex items-center justify-center min-h-[60px]"><p className="text-[10px] text-muted-foreground">Drop here</p></div>}
                      </KanbanColumn>
                    );
                  })}
                </div>
              </div>
              <DragOverlay>
                {draggingProspect ? <KanbanCardContent prospect={draggingProspect} overlay /> : null}
              </DragOverlay>
            </DndContext>
          ) : (
            /* GRID */
            <div key="grid-view" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 view-transition">
              {paged.map(p => {
                const badge = getStatusColor(p.status);
                const auth = getAuthorityColor(p.authority);
                const highlight = getHighlightColor(p, reminders);
                return (
                  <div key={p.id} className="p-5 rounded-2xl border space-y-3 hover:shadow-lg cursor-pointer" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", transition: "box-shadow .15s", boxShadow: highlight ? `0 0 0 2px ${highlight}` : undefined }} onClick={() => router.push(`/dashboard/prospects/${p.id}`)}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); handleToggleStar(p.id); }}>{p.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="opacity-30" />}</button>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{p.first_name} {p.last_name}</h3>
                          <p className="text-xs text-muted-foreground">{p.company || "—"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: badge.bg, color: badge.text }}>{p.status.replace(/_/g, " ")}</span>
                        {p.rating && <RatingBadge rating={p.rating} />}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {p.email && <div className="flex items-center gap-1.5"><Mail size={11} className="opacity-60 shrink-0" /><span className="truncate">{p.email}</span></div>}
                      {p.phone && <div className="flex items-center gap-1.5"><Phone size={11} className="opacity-60 shrink-0" />{p.phone}</div>}
                    </div>
                    <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                      <span className="text-sm font-bold" style={{ color: "var(--graph-to)" }}>₹{(p.budget || 0).toLocaleString("en-IN")}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: auth.bg, color: auth.text }}>{p.authority ? <><CheckCircle2 size={11} />Authority</> : <><AlertTriangle size={11} />No Authority</>}</span>
                    </div>
                    <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(p)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><Pencil size={11} /></button>
                      <button onClick={() => setDeleteP(p)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "#ef4444" }}><Trash2 size={11} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination footer — not shown for Kanban */}
          {filtered.length > 0 && view !== "Kanban" && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Rows per page</span>
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 px-2 rounded-lg border bg-transparent text-xs outline-none cursor-pointer" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span>Showing {pagedStart + 1}–{Math.min(pagedStart + pageSize, filtered.length)} of {filtered.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70 disabled:opacity-30" style={{ borderColor: "var(--card-border)" }}><ChevronLeft size={14} /></button>
                <span className="text-xs px-2" style={{ color: "var(--text-color)" }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70 disabled:opacity-30" style={{ borderColor: "var(--card-border)" }}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CREATE/EDIT DRAWER ── */}
      {(isCreateOpen || editP) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => { setIsCreateOpen(false); setEditP(null); }} />
          <div className="relative ml-auto h-full w-full max-w-[520px] overflow-y-auto shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
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
                      {(() => {
                        const isCustom = !SOURCE_OPTIONS.includes(form.source);
                        return (
                          <>
                            <select value={isCustom ? "__custom__" : form.source} onChange={e => setF("source", e.target.value === "__custom__" ? "" : e.target.value)} className="pct-fi">
                              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="__custom__">+ Add custom source...</option>
                            </select>
                            {isCustom && (
                              <input value={form.source} onChange={e => setF("source", e.target.value)} className="pct-fi mt-2" placeholder="Type custom source" autoFocus />
                            )}
                          </>
                        );
                      })()}
                    </PFF>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Rating">
                      <select value={form.rating} onChange={e => setF("rating", e.target.value)} className="pct-fi">
                        {RATING_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </PFF>
                    <PFF label="Project / Opportunity">
                      <input value={form.project_name} onChange={e => setF("project_name", e.target.value)} className="pct-fi" placeholder="e.g. Website Revamp" />
                    </PFF>
                  </div>
                  <PFF label="Owner">
                    {(() => {
                      return (
                        <>
                          <select
                            value={ownerCustomMode ? "__custom__" : form.owner_id}
                            onChange={e => {
                              if (e.target.value === "__custom__") {
                                setOwnerCustomMode(true);
                                setF("owner_id", "");
                              } else {
                                setOwnerCustomMode(false);
                                setF("owner_id", e.target.value);
                                setF("owner_name_custom", "");
                              }
                            }}
                            className="pct-fi"
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                            <option value="__custom__">+ Add custom owner...</option>
                          </select>
                          {ownerCustomMode && (
                            <input value={form.owner_name_custom} onChange={e => setF("owner_name_custom", e.target.value)} className="pct-fi mt-2" placeholder="Type owner name" autoFocus />
                          )}
                        </>
                      );
                    })()}
                  </PFF>
                  <PFF label="Tags (comma separated)"><input value={form.tags} onChange={e => setF("tags", e.target.value)} className="pct-fi" placeholder="Hot, Enterprise" /></PFF>
                  <PFF label="Notes"><textarea rows={3} value={form.notes} onChange={e => setF("notes", e.target.value)} className="pct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Key context..." /></PFF>
                </PFS>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsCreateOpen(false); setEditP(null); }} className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold text-sm hover:opacity-80 active:scale-95" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Saving..." : (editP ? "Save Changes" : "Create Prospect")}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteP(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,.1)" }}><Trash2 size={22} style={{ color: "#ef4444" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "var(--text-color)" }}>Remove Prospect?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5"><strong style={{ color: "var(--text-color)" }}>{deleteP.first_name} {deleteP.last_name}</strong> from <strong style={{ color: "var(--text-color)" }}>{deleteP.company || "Unknown"}</strong> will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteP(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-10 rounded-xl font-semibold text-sm text-white hover:opacity-80" style={{ background: "#ef4444" }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NOTE ── */}
      {noteForP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setNoteForP(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Add Note — {noteForP.first_name} {noteForP.last_name}</h3><button onClick={() => setNoteForP(null)} className="hover:opacity-70"><X size={15} /></button></div>
            <textarea autoFocus rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full border rounded-xl p-3 text-sm outline-none resize-none" style={{ borderColor: "var(--card-border)", background: "var(--accent)", color: "var(--text-color)" }} placeholder="Write note..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteForP(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={() => { handleAddNote(noteForP); setNoteForP(null); }} className="flex-1 h-10 rounded-xl font-semibold text-sm hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SET REMINDER ── */}
      {reminderP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setReminderP(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Set Reminder</h3><p className="text-xs text-muted-foreground">For: {reminderP.first_name} {reminderP.last_name}</p></div><button onClick={() => setReminderP(null)} className="hover:opacity-70"><X size={15} /></button></div>
            <div className="space-y-3">
              <PFF label="Title *"><input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} className="pct-fi" placeholder="BANT follow-up call" /></PFF>
              <div className="grid grid-cols-2 gap-3">
                <PFF label="Type"><select value={reminderForm.type} onChange={e => setReminderForm(f => ({ ...f, type: e.target.value as any }))} className="pct-fi"><option value="call">📞 Call</option><option value="email">✉️ Email</option><option value="meeting">🗓 Meeting</option><option value="follow_up">🔁 Follow-up</option></select></PFF>
                <PFF label="Date & Time *"><input type="datetime-local" value={reminderForm.datetime} onChange={e => setReminderForm(f => ({ ...f, datetime: e.target.value }))} className="pct-fi" min={new Date().toISOString().slice(0, 16)} /></PFF>
              </div>
              <PFF label="Note"><textarea rows={2} value={reminderForm.note} onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))} className="pct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="What to discuss..." /></PFF>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setReminderP(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleSetReminder} className="flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Bell size={13} />Set Reminder</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ALL REMINDERS PANEL ── */}
      {remindersPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setRemindersPanelOpen(false)} />
          <div className="relative w-full max-w-md max-h-[80vh] rounded-2xl p-6 shadow-2xl t-modal-pop flex flex-col" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-color)" }}><Bell size={14} />Reminders ({activeReminders.length})</h3>
              <button onClick={() => setRemindersPanelOpen(false)} className="hover:opacity-70"><X size={15} /></button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1">
              {activeReminders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No active reminders.</p>
              ) : (
                [...activeReminders].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()).map(r => {
                  const due = new Date(r.datetime);
                  const isOverdue = due.getTime() < Date.now();
                  const isToday = due.toDateString() === new Date().toDateString();
                  return (
                    <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "var(--text-color)" }}>{r.title}</p>
                        <button onClick={() => { setRemindersPanelOpen(false); router.push(`/dashboard/prospects/${r.p_id}`); }} className="text-[11px] hover:underline" style={{ color: "var(--graph-to)" }}>{r.p_name}</button>
                        <p className="text-[10px] mt-0.5 font-semibold" style={{ color: isOverdue ? "#ef4444" : isToday ? "#eab308" : "var(--muted-foreground)" }}>
                          {due.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{isOverdue ? " · Overdue" : isToday ? " · Today" : ""}
                        </p>
                        {r.note && <p className="text-[10px] text-muted-foreground mt-0.5">{r.note}</p>}
                      </div>
                      <button onClick={() => handleToggleReminder(r.id)} className="h-7 px-2.5 rounded-lg border text-[10px] font-semibold hover:opacity-75 shrink-0" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Done</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TODAY'S FOLLOW-UPS PANEL ── */}
      {todayPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setTodayPanelOpen(false)} />
          <div className="relative w-full max-w-md max-h-[80vh] rounded-2xl p-6 shadow-2xl t-modal-pop flex flex-col" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-color)" }}><CalendarDays size={14} />Today&apos;s Follow-ups ({todayFollowUps.length})</h3>
              <button onClick={() => setTodayPanelOpen(false)} className="hover:opacity-70"><X size={15} /></button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1">
              {todayFollowUps.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No follow-ups due today.</p>
              ) : (
                [...todayFollowUps].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()).map(r => {
                  const due = new Date(r.datetime);
                  return (
                    <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "var(--text-color)" }}>{r.title}</p>
                        <button onClick={() => { setTodayPanelOpen(false); router.push(`/dashboard/prospects/${r.p_id}`); }} className="text-[11px] hover:underline" style={{ color: "var(--graph-to)" }}>{r.p_name}</button>
                        <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#a855f7" }}>
                          {due.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · Today
                        </p>
                        {r.note && <p className="text-[10px] text-muted-foreground mt-0.5">{r.note}</p>}
                      </div>
                      <button onClick={() => handleToggleReminder(r.id)} className="h-7 px-2.5 rounded-lg border text-[10px] font-semibold hover:opacity-75 shrink-0" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Done</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── COLUMN EDITOR ── */}
      {columnEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setColumnEditorOpen(false)} />
          <div className="relative w-full max-w-sm max-h-[85vh] rounded-2xl p-6 shadow-2xl t-modal-pop flex flex-col" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4 shrink-0"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}><SlidersHorizontal size={14} className="inline mr-1.5" />Customise Columns</h3><button onClick={() => setColumnEditorOpen(false)} className="hover:opacity-70"><X size={14} /></button></div>
            <p className="text-xs text-muted-foreground mb-4 shrink-0">Toggle columns in the table view. Your selection is saved automatically.</p>
            <div className="space-y-1.5 overflow-y-auto pr-1">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer hover:bg-accent" style={{ transition: "background .1s" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-color)" }}>{col.label}</span>
                  <div className="relative w-9 h-5 rounded-full cursor-pointer" style={{ background: visibleCols.includes(col.key) ? "var(--graph-to)" : "var(--card-border)", transition: "background .15s" }} onClick={() => { if (col.required) return; setVisibleCols(p => p.includes(col.key) ? p.filter(c => c !== col.key) : [...p, col.key]); }}>
                    <div className="absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full shadow" style={{ left: visibleCols.includes(col.key) ? "19px" : "3px", transition: "left .15s" }} />
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-5 shrink-0">
              <button onClick={() => setVisibleCols(ALL_COLUMNS.map(c => c.key))} className="flex-1 h-9 rounded-xl border text-xs font-semibold hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Show All</button>
              <button onClick={() => setColumnEditorOpen(false)} className="flex-1 h-9 rounded-xl text-xs font-semibold hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Done</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.pct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.pct-fi:focus{border-color:var(--graph-to)}.pct-fi::placeholder{color:var(--muted-foreground);opacity:.7}.ct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.ct-fi:focus{border-color:var(--graph-to)}.ct-fi::placeholder{color:var(--muted-foreground);opacity:.7}.prospect-row{transition:background .12s}.prospect-row:hover{--row-bg:var(--accent);background:var(--accent)}`}</style>
    </div>
  );
}

// ─── Tiny shared components ───────────────────────────────────────────────────
function Btn({ children, onClick, primary, ghost, icon, disabled }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; ghost?: boolean; icon?: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: primary ? "var(--graph-to)" : "var(--card-bg)", color: primary ? "#0a0a0a" : "var(--text-color)", border: ghost ? "1px solid var(--card-border)" : "none", transition: "opacity .15s" }}>
      {icon}{children}
    </button>
  );
}
function AM({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-left hover:bg-accent" style={{ color: danger ? "#ef4444" : "var(--text-color)", transition: "background .1s" }}>{icon}{label}</button>;
}
function KpiCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="p-4 rounded-2xl border flex items-center gap-3" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color ? `${color}22` : "var(--accent)", color: color || "var(--graph-to)" }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold truncate" style={{ color: "var(--text-color)" }}>{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        {sub && <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: color || "var(--graph-to)" }}>{sub}</p>}
      </div>
    </div>
  );
}
function PDS({ title, children, action }: any) { return <div><div className="flex items-center justify-between mb-2"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{action}</div><div className="rounded-xl border p-3.5 space-y-2.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>{children}</div></div>; }
function PDR({ icon, label, children }: any) { return <div className="flex items-start gap-2.5"><div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div><div className="flex-1 min-w-0"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</span><div className="text-xs">{children}</div></div></div>; }
function PFS({ title, children }: any) { return <div className="space-y-3"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{children}</div>; }
function PFF({ label, children }: any) { return <div className="space-y-1.5"><label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>{children}</div>; }

function FilterChipGroup({ label, options, selected, onToggle }: { label: string; options: { value: string; label: string }[]; selected: Set<string>; onToggle: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onToggle(o.value)} className="px-2 py-1 rounded-lg text-[10px] font-semibold border hover:opacity-80" style={{ borderColor: selected.has(o.value) ? "var(--graph-to)" : "var(--card-border)", background: selected.has(o.value) ? "var(--graph-to)" : "transparent", color: selected.has(o.value) ? "#0a0a0a" : "var(--text-color)" }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Kanban components ──────────────────────────────────────────────────────
function KanbanColumn({ stage, badge, count, value, children }: { stage: ProspectStatus; badge: { bg: string; text: string; border: string }; count: number; value: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className="flex flex-col gap-2.5 p-3 rounded-2xl border min-h-[480px]" style={{ background: isOver ? "var(--accent)" : "var(--card-bg)", borderColor: isOver ? "var(--graph-to)" : "var(--card-border)", transition: "background .15s, border-color .15s" }}>
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: badge.text }} />
          <span className="text-xs font-bold uppercase" style={{ color: "var(--text-color)" }}>{stage.replace(/_/g, " ")}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: badge.bg, color: badge.text }}>{count}</span>
        </div>
        <span className="text-[9px] text-muted-foreground">₹{value.toLocaleString("en-IN")}</span>
      </div>
      {children}
    </div>
  );
}
function KanbanCardContent({ prospect, overlay, highlight }: { prospect: Prospect; overlay?: boolean; highlight?: string }) {
  const ring = highlight ? `0 0 0 2px ${highlight}` : undefined;
  const shadow = overlay ? "0 12px 24px -8px rgba(0,0,0,.35)" : ring;
  const auth = getAuthorityColor(prospect.authority);
  return (
    <div className="p-3 rounded-xl border space-y-2" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)", boxShadow: shadow, width: overlay ? 230 : undefined }}>
      <div className="flex items-start justify-between gap-1">
        <div>
          <span className="block text-xs font-bold" style={{ color: "var(--text-color)" }}>{prospect.first_name} {prospect.last_name}</span>
          {prospect.company && <span className="block text-[10px] text-muted-foreground">{prospect.company}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {prospect.rating && <RatingBadge rating={prospect.rating} />}
          {prospect.starred && <Star size={11} fill="#eab308" color="#eab308" className="shrink-0" />}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1" style={{ background: auth.bg, color: auth.text }}>{prospect.authority ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}{prospect.authority ? "Yes" : "No"}</span>
        <span className="text-xs font-bold" style={{ color: "var(--graph-to)" }}>₹{(prospect.budget || 0).toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
function KanbanCard({ prospect, highlight, onView, onEdit }: { prospect: Prospect; highlight?: string; onView: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: prospect.id });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: "grab",
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="relative group hover:-translate-y-0.5 hover:shadow-md" onClick={onView}>
      <KanbanCardContent prospect={prospect} highlight={highlight} />
      <button onClick={e => { e.stopPropagation(); onEdit(); }} className="absolute top-2 right-2 h-5 w-5 rounded-md border flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg)", transition: "opacity .15s" }}>
        <Pencil size={9} />
      </button>
    </div>
  );
}

// ─── Table view ──────────────────────────────────────────────────────────────
function ProspectsTable({
  paged, visibleCols, reminders, actionMenuId, actionMenuPos,
  setActionMenuId, setActionMenuPos, onView, onEdit, onToggleStar,
  onUpdateStatus, onAddNote, onSetReminder, onDelete,
}: {
  paged: Prospect[];
  visibleCols: string[];
  reminders: Reminder[];
  actionMenuId: string | null;
  actionMenuPos: { top: number; left: number } | null;
  setActionMenuId: (id: string | null) => void;
  setActionMenuPos: (pos: { top: number; left: number } | null) => void;
  onView: (p: Prospect) => void;
  onEdit: (p: Prospect) => void;
  onToggleStar: (id: string) => void;
  onUpdateStatus: (id: string, status: ProspectStatus) => void;
  onAddNote: (p: Prospect) => void;
  onSetReminder: (p: Prospect) => void;
  onDelete: (p: Prospect) => void;
}) {
  return (
    <div key="table-view" className="rounded-2xl border overflow-hidden view-transition" style={{ borderColor: "var(--card-border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[1000px]" style={{ background: "var(--card-bg)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg-solid)" }}>
              {visibleCols.includes("name") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 z-10" style={{ background: "var(--card-bg-solid)", minWidth: 200, boxShadow: "4px 0 8px -4px rgba(0,0,0,.25)" }}>Prospect</th>}
              {visibleCols.includes("company") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Company</th>}
              {visibleCols.includes("email") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 190 }}>Email</th>}
              {visibleCols.includes("phone") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Phone</th>}
              {visibleCols.includes("budget") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right" style={{ minWidth: 110 }}>Budget</th>}
              {visibleCols.includes("authority") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Authority</th>}
              {visibleCols.includes("need") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 170 }}>Need</th>}
              {visibleCols.includes("timeline") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Timeline</th>}
              {visibleCols.includes("status") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Stage</th>}
              {visibleCols.includes("source") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Source</th>}
              {visibleCols.includes("industry") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Industry</th>}
              {visibleCols.includes("city") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">City</th>}
              {visibleCols.includes("tags") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Tags</th>}
              {visibleCols.includes("rating") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Rating</th>}
              {visibleCols.includes("project_name") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Project</th>}
              {visibleCols.includes("qualified_at") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Qualified</th>}
              {visibleCols.includes("actions") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)", boxShadow: "-4px 0 8px -4px rgba(0,0,0,.25)" }}>Actions</th>}
            </tr>
          </thead>
          <tbody style={{ color: "var(--text-color)" }}>
            {paged.map(p => {
              const badge = getStatusColor(p.status);
              const auth = getAuthorityColor(p.authority);
              const highlight = getHighlightColor(p, reminders);
              return (
                <tr key={p.id} className="prospect-row border-b" style={{ borderColor: "var(--card-border)", boxShadow: highlight ? `inset 3px 0 0 0 ${highlight}` : undefined }}>
                  {visibleCols.includes("name") && (
                    <td className="px-4 py-3 sticky left-0 z-10" style={{ background: "var(--row-bg, var(--card-bg-solid))", boxShadow: highlight ? `4px 0 8px -4px rgba(0,0,0,.25), inset 3px 0 0 0 ${highlight}` : "4px 0 8px -4px rgba(0,0,0,.25)" }}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onToggleStar(p.id)} className="shrink-0">{p.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="text-muted-foreground opacity-30" />}</button>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}>{p.first_name[0]}{(p.last_name || "")[0]}</div>
                        <div>
                          <button onClick={() => onView(p)} className="font-semibold hover:underline text-left" style={{ color: "var(--text-color)" }}>{p.first_name} {p.last_name}</button>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5 overflow-hidden whitespace-nowrap ct-fade-right" style={{ maxWidth: 160 }}>
                              {p.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleCols.includes("company") && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-muted-foreground"><Building size={11} className="opacity-60 shrink-0" />{p.company || "—"}</div></td>}
                  {visibleCols.includes("email") && <td className="px-4 py-3">{p.email ? <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:underline" style={{ color: "var(--graph-to)" }}><Mail size={11} className="shrink-0" />{p.email}</a> : <span className="text-muted-foreground">—</span>}</td>}
                  {visibleCols.includes("phone") && <td className="px-4 py-3">{p.phone ? <a href={`tel:${p.phone}`} className="text-muted-foreground hover:underline flex items-center gap-1"><Phone size={11} />{p.phone}</a> : <span className="text-muted-foreground">—</span>}</td>}
                  {visibleCols.includes("budget") && <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--graph-to)" }}>₹{(p.budget || 0).toLocaleString("en-IN")}</td>}
                  {visibleCols.includes("authority") && <td className="px-4 py-3"><span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: auth.bg, color: auth.text }}>{p.authority ? <><CheckCircle2 size={11} />Yes</> : <><AlertTriangle size={11} />No</>}</span></td>}
                  {visibleCols.includes("need") && <td className="px-4 py-3 text-muted-foreground"><span className="whitespace-nowrap overflow-hidden block max-w-[160px] text-[11px] ct-fade-right">{p.need || "—"}</span></td>}
                  {visibleCols.includes("timeline") && <td className="px-4 py-3 text-muted-foreground text-[11px] whitespace-nowrap">{p.timeline?.split(" (")[0] || "—"}</td>}
                  {visibleCols.includes("status") && (
                    <td className="px-4 py-3">
                      <select value={p.status} onChange={e => onUpdateStatus(p.id, e.target.value as ProspectStatus)} className="px-2 py-1 rounded-xl font-bold text-[10px] cursor-pointer outline-none uppercase" style={{ background: badge.bg, color: badge.text, border: "none" }}>
                        {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    </td>
                  )}
                  {visibleCols.includes("source") && <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: "rgba(0,0,0,.03)", borderColor: "var(--card-border)" }}>{p.source || "—"}</span></td>}
                  {visibleCols.includes("industry") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{p.industry || "—"}</td>}
                  {visibleCols.includes("city") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{p.city || "—"}</td>}
                  {visibleCols.includes("tags") && (
                    <td className="px-4 py-3">
                      {p.tags && p.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">{p.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                  {visibleCols.includes("rating") && <td className="px-4 py-3"><RatingBadge rating={p.rating} /></td>}
                  {visibleCols.includes("project_name") && <td className="px-4 py-3 text-muted-foreground text-[11px]"><span className="whitespace-nowrap overflow-hidden block max-w-[160px] ct-fade-right">{p.project_name || "—"}</span></td>}
                  {visibleCols.includes("qualified_at") && (
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                      <div style={{ color: "var(--text-color)" }}>{fmtDate(p.qualified_at)}</div>
                      <div className="text-[10px] opacity-70">{timeAgo(p.qualified_at)}</div>
                    </td>
                  )}
                  {visibleCols.includes("actions") && (
                    <td className="px-4 py-3 text-right sticky right-0 z-10" style={{ background: "var(--row-bg, var(--card-bg-solid))", boxShadow: "-4px 0 8px -4px rgba(0,0,0,.25)" }}>
                      <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            if (actionMenuId === p.id) {
                              setActionMenuId(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const menuHeight = 264;
                            const openUp = rect.bottom + menuHeight > window.innerHeight && rect.top > menuHeight;
                            setActionMenuPos({
                              top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
                              left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
                            });
                            setActionMenuId(p.id);
                          }}
                          className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-75 ml-auto" style={{ borderColor: "var(--card-border)" }}
                        >
                          <MoreHorizontal size={13} />
                        </button>
                        {actionMenuId === p.id && actionMenuPos && createPortal(
                          <div className="fixed w-44 rounded-xl overflow-hidden shadow-xl z-[9999]" onClick={e => e.stopPropagation()} style={{ top: actionMenuPos.top, left: actionMenuPos.left, background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
                            <AM icon={<Eye size={12} />} label="View Details" onClick={() => { onView(p); setActionMenuId(null); }} />
                            <AM icon={<Pencil size={12} />} label="Edit Prospect" onClick={() => { onEdit(p); setActionMenuId(null); }} />
                            <AM icon={<StickyNote size={12} />} label="Add Note" onClick={() => { onAddNote(p); setActionMenuId(null); }} />
                            <AM icon={<Bell size={12} />} label="Set Reminder" onClick={() => { onSetReminder(p); setActionMenuId(null); }} />
                            <AM icon={p.starred ? <StarOff size={12} /> : <Star size={12} />} label={p.starred ? "Unstar" : "Star"} onClick={() => { onToggleStar(p.id); setActionMenuId(null); }} />
                            <AM icon={<Copy size={12} />} label="Copy Email" onClick={() => { if (p.email) navigator.clipboard.writeText(p.email); toast.success("Copied"); setActionMenuId(null); }} />
                            <div style={{ borderTop: "1px solid var(--card-border)" }}>
                              <AM icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { onDelete(p); setActionMenuId(null); }} />
                            </div>
                          </div>,
                          document.body
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
  );
}
