"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getLeads,
  getLeadReminders,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead as deleteLeadAction,
  addLeadNote,
  createLeadReminder,
  toggleLeadReminderDone,
  seedDemoLeads,
} from "@/server/leads";
import { getTeamMembers } from "@/server/users";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";
import { DateRangePicker, getDateRangeBounds, isWithinDateRange, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { LeadsBySourceChart, LeadsStatusFunnel, LeadsPriorityBreakdown, LeadsCreatedTrend, type CountDatum, type TrendDatum } from "@/components/dashboard/widgets/leads-reports";
import { validateLeadForm, type LeadFormValues } from "@/lib/validations/lead";
import LeadsLoading from "./loading";
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  Search, Filter, Plus, Table2, Kanban as KanbanIcon, Grid,
  MoreHorizontal, Mail, Phone, Building, X, Eye,
  Pencil, Trash2, Bell, StickyNote, Star, StarOff, Copy,
  SlidersHorizontal, Download, Upload, MessageSquare,
  ChevronDown, ChevronLeft, ChevronRight,
  Users, UserPlus, CalendarDays, Wallet, List, BarChart3, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "REJECTED";

interface LeadNote {
  id: string;
  text: string;
  created_at: string;
  author?: string;
}

interface TeamMember {
  id: string;
  full_name: string;
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
  owner_name?: string;
  owner_name_custom?: string;
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
// "QUALIFIED" is intentionally excluded — that transition is represented by the
// separate Convert-to-Prospect flow on the lead detail page, not a lead status.
const STAGES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "REJECTED"];

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
  { key: "owner", label: "Owner" },
  { key: "next_follow_up", label: "Next Follow-up" },
  { key: "last_note", label: "Last Note" },
  { key: "created_at", label: "Created" },
  { key: "actions", label: "Actions", required: true },
];

// Columns the global search box can be scoped to (#7 — advanced search)
const SEARCH_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "city", label: "City" },
  { key: "industry", label: "Industry" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" },
];

const PAGE_SIZES = [10, 50, 100, 200];

const SOURCE_OPTIONS = ["GOOGLE", "META", "REFERRAL", "WHATSAPP", "DIRECT", "LINKEDIN", "EVENT", "OTHER"];
const PRIORITY_OPTIONS = ["urgent", "high", "medium", "low"];

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

function toggleSetValue(setFn: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
  setFn(prev => {
    const next = new Set(prev);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });
}

function getNextFollowUp(leadId: string, reminders: Reminder[]): Reminder | null {
  const upcoming = reminders
    .filter(r => r.lead_id === leadId && !r.done)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  return upcoming[0] || null;
}

// Highlight ring color (#22): overdue follow-up (red) > due-today follow-up (amber) > starred (purple)
function getHighlightColor(lead: Lead, reminders: Reminder[]): string | undefined {
  const pending = reminders.filter(r => r.lead_id === lead.id && !r.done);
  const now = new Date();
  if (pending.some(r => new Date(r.datetime).getTime() < now.getTime())) return "#ef4444";
  if (pending.some(r => new Date(r.datetime).toDateString() === now.toDateString())) return "#eab308";
  if (lead.starred) return "#a855f7";
  return undefined;
}

// Groups leads by creation day for the "Leads Created" trend chart (#13), sorted chronologically.
function buildTrendData(items: Lead[]): TrendDatum[] {
  const counts = new Map<string, { label: string; count: number }>();
  items.forEach(l => {
    const d = new Date(l.created_at);
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
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Table" | "Kanban" | "Grid">("Table");
  const [search, setSearch] = useState("");
  const [searchCols, setSearchCols] = useState<Set<string>>(new Set(SEARCH_COLUMNS.map(c => c.key)));
  const [activePanel, setActivePanel] = useState<"search" | "filters" | null>(null);
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [sourceFilters, setSourceFilters] = useState<Set<string>>(new Set());
  const [priorityFilters, setPriorityFilters] = useState<Set<string>>(new Set());
  const [industryFilters, setIndustryFilters] = useState<Set<string>>(new Set());
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [followUpTodayFilter, setFollowUpTodayFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Tab navigation (#13) + date-range filter for KPI cards/Reports (#24)
  const [pageTab, setPageTab] = useState<"Leads" | "Reports">("Leads");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: "all" });

  // UI state
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = useState<Lead | null>(null);
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [noteForLead, setNoteForLead] = useState<Lead | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [remindersPanelOpen, setRemindersPanelOpen] = useState(false);
  const [todayPanelOpen, setTodayPanelOpen] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("ct-crm-leads-columns");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.every(c => typeof c === "string")) return parsed;
        }
      } catch { /* ignore malformed storage */ }
    }
    return ["name", "company", "email", "phone", "source", "estimated_value", "status", "priority", "notes_preview", "created_at", "actions"];
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Form
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", source: "DIRECT", estimated_value: "", notes: "", website: "", linkedin: "", city: "", country: "India", industry: "", employee_count: "", priority: "medium" as Lead["priority"], status: "NEW" as LeadStatus, tags: "", owner_id: "", owner_name_custom: "" });
  const [ownerCustomMode, setOwnerCustomMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [reminderForm, setReminderForm] = useState({ title: "", type: "call" as Reminder["type"], datetime: "", note: "" });

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ─── Live form validation (#16, #17, #18) ──────────────────────────────────
  const formValues: LeadFormValues = { ...form, priority: (form.priority ?? "medium") as LeadFormValues["priority"] };
  const { valid: formValid, errors: formErrors } = validateLeadForm(formValues);

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
      setLeads(FALLBACK_LEADS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => {
    getTeamMembers().then(members => setTeamMembers(members.map(m => ({ id: m.id, full_name: m.full_name })))).catch(() => {});
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("ct-crm-leads-columns", JSON.stringify(visibleCols)); } catch { /* ignore */ }
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
    if (isCreateOpen || editLead || deleteLead || noteForLead || reminderLead || columnEditorOpen || remindersPanelOpen || todayPanelOpen) {
      setActionMenuId(null);
    }
  }, [isCreateOpen, editLead, deleteLead, noteForLead, reminderLead, columnEditorOpen, remindersPanelOpen, todayPanelOpen]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleUpdateStatus = useCallback(async (id: string, next: LeadStatus) => {
    setLeads(p => p.map(l => l.id === id ? { ...l, status: next } : l));
    try {
      await updateLeadStatus(id, next);
      toast.success(`Status → ${next}`);
    } catch { toast.error("Failed to update status"); }
  }, []);

  const handleToggleStar = useCallback((id: string) => {
    setLeads(p => p.map(l => l.id === id ? { ...l, starred: !l.starred } : l));
  }, []);

  // ─── Kanban drag-and-drop ───────────────────────────────────────────────
  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setDraggingLead(leads.find(l => l.id === e.active.id) || null);
  }, [leads]);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDraggingLead(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find(l => l.id === active.id);
    if (lead && lead.status !== newStatus && (STAGES as string[]).includes(newStatus)) {
      handleUpdateStatus(lead.id, newStatus);
    }
  }, [leads, handleUpdateStatus]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) { setTriedSubmit(true); toast.error("Please fix the highlighted fields"); return; }
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
      owner_id: form.owner_id || undefined,
      owner_name: form.owner_id ? teamMembers.find(m => m.id === form.owner_id)?.full_name : (form.owner_name_custom || undefined),
      owner_name_custom: form.owner_id ? undefined : (form.owner_name_custom || undefined),
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
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
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
    if (!formValid) { setTriedSubmit(true); toast.error("Please fix the highlighted fields"); return; }
    setSubmitting(true);
    const updates: Partial<Lead> = {
      first_name: form.first_name, last_name: form.last_name, email: form.email,
      phone: form.phone, company: form.company, source: form.source,
      status: form.status, estimated_value: parseFloat(form.estimated_value) || 0,
      notes: form.notes, website: form.website, linkedin: form.linkedin,
      city: form.city, country: form.country, industry: form.industry,
      employee_count: form.employee_count, priority: form.priority,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      owner_id: form.owner_id || undefined,
      owner_name: form.owner_id ? teamMembers.find(m => m.id === form.owner_id)?.full_name : (form.owner_name_custom || undefined),
      owner_name_custom: form.owner_id ? undefined : (form.owner_name_custom || undefined),
    };
    const updatedLead = { ...editLead, ...updates };
    setLeads(p => p.map(l => l.id === editLead.id ? updatedLead : l));
    try {
      await updateLead(editLead.id, {
        first_name: updates.first_name!, last_name: updates.last_name!,
        email: updates.email!, phone: updates.phone, company: updates.company,
        source: updates.source, status: updates.status,
        estimated_value: updates.estimated_value, notes: updates.notes,
        website: updates.website, linkedin: updates.linkedin,
        city: updates.city, country: updates.country, industry: updates.industry,
        employee_count: updates.employee_count, priority: updates.priority,
        tags: updates.tags, owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
      });
      toast.success("✅ Lead updated in database!");
    } catch {
      toast.error("Failed to update lead");
    } finally { setSubmitting(false); setEditLead(null); }
  };

  const handleDeleteLead = async () => {
    if (!deleteLead) return;
    setLeads(p => p.filter(l => l.id !== deleteLead.id));
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
    setNewNote("");
    try {
      const row = await addLeadNote(lead.id, noteText);
      const realNote = { ...tempNote, id: row.id };
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, lead_notes: l.lead_notes?.map(n => n.id === tempNote.id ? realNote : n) || [] } : l));
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
    } catch { }
  };

  const handleToggleReminder = async (id: string) => {
    setReminders(p => p.map(r => r.id === id ? { ...r, done: true } : r));
    try { await toggleLeadReminderDone(id, true); } catch { toast.error("Failed to update reminder"); }
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const result = await seedDemoLeads();
      if (result.skipped) {
        toast.error("Demo data already loaded.");
      } else {
        toast.success(`Loaded ${result.inserted} demo leads`);
        await fetchLeads();
      }
    } catch {
      toast.error("Failed to load demo data");
    } finally {
      setSeedingDemo(false);
    }
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
    setForm({ first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone || "", company: lead.company || "", source: lead.source || "DIRECT", estimated_value: String(lead.estimated_value || ""), notes: lead.notes || "", website: lead.website || "", linkedin: lead.linkedin || "", city: lead.city || "", country: lead.country || "India", industry: lead.industry || "", employee_count: lead.employee_count || "", priority: lead.priority || "medium", status: lead.status, tags: (lead.tags || []).join(", "), owner_id: lead.owner_id || "", owner_name_custom: lead.owner_name_custom || "" });
    setOwnerCustomMode(!lead.owner_id && !!lead.owner_name_custom);
    setTriedSubmit(false);
    setEditLead(lead);
  };

  const resetForm = () => {
    setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", source: "DIRECT", estimated_value: "", notes: "", website: "", linkedin: "", city: "", country: "India", industry: "", employee_count: "", priority: "medium", status: "NEW", tags: "", owner_id: "", owner_name_custom: "" });
    setOwnerCustomMode(false);
    setTriedSubmit(false);
  };

  // Header "Create Lead" quick action (?new=1) auto-opens this page's create drawer
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      resetForm();
      setIsCreateOpen(true);
      router.replace("/dashboard/leads", { scroll: false });
    }
  }, [searchParams]);

  // ─── Filtering (advanced column-scoped search + multi-select filters) ─────
  const availableSources = Array.from(new Set([...SOURCE_OPTIONS, ...leads.map(l => l.source).filter(Boolean) as string[]]));
  const availableIndustries = Array.from(new Set(leads.map(l => l.industry).filter(Boolean))) as string[];
  const availableTags = Array.from(new Set(leads.flatMap(l => l.tags || []).filter(Boolean))) as string[];

  const matchesSearch = (l: Lead, q: string) => {
    if (!q) return true;
    const hay: string[] = [];
    if (searchCols.has("name")) hay.push(`${l.first_name} ${l.last_name}`);
    if (searchCols.has("company")) hay.push(l.company || "");
    if (searchCols.has("email")) hay.push(l.email || "");
    if (searchCols.has("phone")) hay.push(l.phone || "");
    if (searchCols.has("city")) hay.push(l.city || "");
    if (searchCols.has("industry")) hay.push(l.industry || "");
    if (searchCols.has("tags")) hay.push((l.tags || []).join(" "));
    if (searchCols.has("notes")) hay.push(l.notes || "", ...(l.lead_notes || []).map(n => n.text));
    return hay.join("   ").toLowerCase().includes(q);
  };

  const todayFollowUpLeadIds = new Set(
    reminders.filter(r => !r.done && new Date(r.datetime).toDateString() === new Date().toDateString()).map(r => r.lead_id)
  );

  const filtered = leads.filter(l => {
    const q = search.trim().toLowerCase();
    if (!matchesSearch(l, q)) return false;
    if (statusFilters.size > 0 && !statusFilters.has(l.status)) return false;
    if (sourceFilters.size > 0 && !sourceFilters.has(l.source || "")) return false;
    if (priorityFilters.size > 0 && !priorityFilters.has(l.priority || "medium")) return false;
    if (industryFilters.size > 0 && !industryFilters.has(l.industry || "")) return false;
    if (tagFilters.size > 0 && !(l.tags || []).some(t => tagFilters.has(t))) return false;
    if (valueMin && (l.estimated_value || 0) < Number(valueMin)) return false;
    if (valueMax && (l.estimated_value || 0) > Number(valueMax)) return false;
    if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(l.created_at) > new Date(`${dateTo}T23:59:59`)) return false;
    if (followUpTodayFilter && !todayFollowUpLeadIds.has(l.id)) return false;
    return true;
  });

  const activeFilterCount = statusFilters.size + sourceFilters.size + priorityFilters.size + industryFilters.size + tagFilters.size
    + (valueMin ? 1 : 0) + (valueMax ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (followUpTodayFilter ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilters(new Set()); setSourceFilters(new Set()); setPriorityFilters(new Set());
    setIndustryFilters(new Set()); setTagFilters(new Set());
    setValueMin(""); setValueMax(""); setDateFrom(""); setDateTo(""); setFollowUpTodayFilter(false);
  };

  // ─── Pagination ─────────────────────────────────────────────────────────
  useEffect(() => { setPage(1); }, [search, searchCols, statusFilters, sourceFilters, priorityFilters, industryFilters, tagFilters, valueMin, valueMax, dateFrom, dateTo, followUpTodayFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedStart = (page - 1) * pageSize;
  const paged = filtered.slice(pagedStart, pagedStart + pageSize);

  const activeReminders = reminders.filter(r => !r.done);
  const todayFollowUps = activeReminders.filter(r => new Date(r.datetime).toDateString() === new Date().toDateString());

  // ─── KPI summary cards + Reports (#11, #13, #24) ───────────────────────────
  const rangeBounds = getDateRangeBounds(dateRange);
  const rangeLeads = leads.filter(l => isWithinDateRange(l.created_at, rangeBounds));
  const kpiTotalLeads = leads.length;
  const kpiNewInRange = rangeLeads.length;
  const kpiContacted = rangeLeads.filter(l => l.status === "CONTACTED").length;
  const kpiLeadsToday = leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;
  const kpiFollowUpsToday = reminders.filter(r => !r.done && new Date(r.datetime).toDateString() === new Date().toDateString()).length;
  const kpiOverdueFollowUps = reminders.filter(r => !r.done && new Date(r.datetime).getTime() < Date.now()).length;
  const kpiPipelineValue = rangeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const kpiAvgDealValue = rangeLeads.length > 0 ? Math.round(kpiPipelineValue / rangeLeads.length) : 0;
  const pct = (num: number, den: number) => den > 0 ? `${Math.round((num / den) * 100)}%` : "0%";

  const sourceData: CountDatum[] = availableSources.map(s => ({ name: s, count: rangeLeads.filter(l => l.source === s).length }));
  const statusData: CountDatum[] = STAGES.map(s => ({ name: s, count: rangeLeads.filter(l => l.status === s).length, color: getStatusColor(s).text }));
  const priorityData: CountDatum[] = PRIORITY_OPTIONS.map(p => ({ name: p.charAt(0).toUpperCase() + p.slice(1), count: rangeLeads.filter(l => (l.priority || "medium") === p).length, color: getPriColor(p).text }));
  const trendData: TrendDatum[] = buildTrendData(rangeLeads);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading && leads.length === 0) return <LeadsLoading />;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{leads.length} total · {filtered.length} shown{activeReminders.length > 0 ? ` · ${activeReminders.length} reminders` : ""}</p>
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
          {!loading && leads.length < 5 && (
            <Btn ghost onClick={handleSeedDemo} disabled={seedingDemo} icon={<Sparkles size={13} />}>
              {seedingDemo ? "Loading…" : "Load Demo Data"}
            </Btn>
          )}
          <input type="file" id="xl-import" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Btn ghost onClick={() => document.getElementById("xl-import")?.click()} icon={<Upload size={13} />}>Import</Btn>
          <Btn ghost onClick={handleExport} icon={<Download size={13} />}>Export</Btn>
          <Btn primary onClick={() => { resetForm(); setIsCreateOpen(true); }} icon={<Plus size={15} />}>New Lead</Btn>
        </div>
      </div>

      {/* KPI Summary Cards (#11) — respect the date-range filter (#24) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Users size={16} />} label="Total Leads" value={String(kpiTotalLeads)} />
        <KpiCard icon={<UserPlus size={16} />} label="New This Period" value={String(kpiNewInRange)} color="#3b82f6" sub={`${pct(kpiNewInRange, kpiTotalLeads)} of total`} />
        <KpiCard icon={<Phone size={16} />} label="Contacted" value={String(kpiContacted)} color="#f97316" sub={`${pct(kpiContacted, kpiNewInRange)} of period`} />
        <KpiCard icon={<CalendarDays size={16} />} label="New Today" value={String(kpiLeadsToday)} color="#a855f7" sub={`${pct(kpiLeadsToday, kpiTotalLeads)} of total`} />
        <KpiCard icon={<Bell size={16} />} label="Follow-ups Today" value={String(kpiFollowUpsToday)} color="#eab308" sub={kpiOverdueFollowUps > 0 ? `${kpiOverdueFollowUps} overdue` : undefined} />
        <KpiCard icon={<Wallet size={16} />} label="Pipeline Value" value={`₹${kpiPipelineValue.toLocaleString("en-IN")}`} color="#00f2fe" sub={kpiAvgDealValue > 0 ? `Avg ₹${kpiAvgDealValue.toLocaleString("en-IN")}/lead` : undefined} />
      </div>

      {/* Tab navigation (#13) + date-range picker (#24) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher
          value={pageTab}
          onChange={(id) => setPageTab(id as "Leads" | "Reports")}
          options={[
            { id: "Leads", label: "Leads", icon: <List size={13} /> },
            { id: "Reports", label: "Reports", icon: <BarChart3 size={13} /> },
          ]}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {pageTab === "Reports" ? (
        /* REPORTS TAB (#13) — leads-by-source, status funnel, priority breakdown, created trend */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 view-transition">
          <LeadsBySourceChart data={sourceData} loading={loading} />
          <LeadsStatusFunnel data={statusData} loading={loading} />
          <LeadsPriorityBreakdown data={priorityData} loading={loading} />
          <LeadsCreatedTrend data={trendData} loading={loading} />
        </div>
      ) : (
        <>
          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input type="text" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 pl-9 pr-3 rounded-xl text-xs bg-transparent border" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>

              {/* Advanced search: pick which columns the query matches against (#7) */}
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

              {/* Advanced per-column filters (#3) */}
              <div className="relative">
                <button type="button" onClick={(e) => { e.stopPropagation(); setActivePanel(p => p === "filters" ? null : "filters"); }} className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border relative" style={{ borderColor: activeFilterCount > 0 ? "var(--graph-to)" : "var(--card-border)", color: "var(--text-color)" }}>
                  <Filter size={12} />Filters
                  {activeFilterCount > 0 && <span className="text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>{activeFilterCount}</span>}
                  <ChevronDown size={12} />
                </button>
                {activePanel === "filters" && (
                  <div className="absolute left-0 mt-1 w-[22rem] max-h-[70vh] overflow-y-auto rounded-xl border shadow-xl z-50 p-3.5 space-y-3.5" onClick={e => e.stopPropagation()} style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }}>
                    <FilterChipGroup label="Status" options={STAGES.map(s => ({ value: s, label: s }))} selected={statusFilters} onToggle={v => toggleSetValue(setStatusFilters, v)} />
                    <FilterChipGroup label="Priority" options={PRIORITY_OPTIONS.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} selected={priorityFilters} onToggle={v => toggleSetValue(setPriorityFilters, v)} />
                    <FilterChipGroup label="Source" options={availableSources.map(s => ({ value: s, label: s }))} selected={sourceFilters} onToggle={v => toggleSetValue(setSourceFilters, v)} />
                    {availableIndustries.length > 0 && <FilterChipGroup label="Industry" options={availableIndustries.map(i => ({ value: i, label: i }))} selected={industryFilters} onToggle={v => toggleSetValue(setIndustryFilters, v)} />}
                    {availableTags.length > 0 && <FilterChipGroup label="Tags" options={availableTags.map(t => ({ value: t, label: t }))} selected={tagFilters} onToggle={v => toggleSetValue(setTagFilters, v)} />}
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Estimated Value (₹)</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="Min" value={valueMin} onChange={e => setValueMin(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                        <span className="text-muted-foreground text-xs">to</span>
                        <input type="number" placeholder="Max" value={valueMax} onChange={e => setValueMax(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Created Date Range</p>
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
                      {visibleCols.includes("name") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 z-10" style={{ background: "var(--card-bg-solid)", minWidth: 200, boxShadow: "4px 0 8px -4px rgba(0,0,0,.25)" }}>Name</th>}
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
                      {visibleCols.includes("owner") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 120 }}>Owner</th>}
                      {visibleCols.includes("next_follow_up") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 160 }}>Next Follow-up</th>}
                      {visibleCols.includes("last_note") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 100 }}>Last Note</th>}
                      {visibleCols.includes("created_at") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Created</th>}
                      {visibleCols.includes("actions") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)", boxShadow: "-4px 0 8px -4px rgba(0,0,0,.25)" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody style={{ color: "var(--text-color)" }}>
                    {paged.map(lead => {
                      const badge = getStatusColor(lead.status);
                      const pri = getPriColor(lead.priority);
                      const highlight = getHighlightColor(lead, reminders);
                      return (
                        <tr key={lead.id} className="lead-row border-b" style={{ borderColor: "var(--card-border)", boxShadow: highlight ? `inset 3px 0 0 0 ${highlight}` : undefined }}>
                          {visibleCols.includes("name") && (
                            <td className="px-4 py-3 sticky left-0 z-10" style={{ background: "var(--row-bg, var(--card-bg-solid))", boxShadow: highlight ? `4px 0 8px -4px rgba(0,0,0,.25), inset 3px 0 0 0 ${highlight}` : "4px 0 8px -4px rgba(0,0,0,.25)" }}>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleToggleStar(lead.id)} className="shrink-0">{lead.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="text-muted-foreground opacity-30" />}</button>
                                <div>
                                  <button onClick={() => router.push(`/dashboard/leads/${lead.id}`)} className="font-semibold hover:underline text-left" style={{ color: "var(--text-color)" }}>{lead.first_name} {lead.last_name}</button>
                                  {lead.tags && lead.tags.length > 0 && (
                                    <div className="flex gap-1 mt-0.5 overflow-hidden whitespace-nowrap ct-fade-right" style={{ maxWidth: 160 }}>
                                      {lead.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}
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
                                {(STAGES.includes(lead.status) ? STAGES : [...STAGES, lead.status]).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                          )}
                          {visibleCols.includes("priority") && <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: pri.bg, color: pri.text }}>{lead.priority || "—"}</span></td>}
                          {visibleCols.includes("industry") && <td className="px-4 py-3 text-muted-foreground">{lead.industry || "—"}</td>}
                          {visibleCols.includes("city") && <td className="px-4 py-3 text-muted-foreground">{lead.city || "—"}</td>}
                          {visibleCols.includes("notes_preview") && (
                            <td className="px-4 py-3 text-muted-foreground">
                              <span className="whitespace-nowrap overflow-hidden block max-w-[160px] text-[11px] ct-fade-right">{lead.notes || lead.lead_notes?.[0]?.text || "—"}</span>
                              {(lead.lead_notes?.length ?? 0) > 0 && <span className="text-[9px] flex items-center gap-0.5 mt-0.5" style={{ color: "var(--graph-to)" }}><MessageSquare size={9} />{lead.lead_notes!.length} note{lead.lead_notes!.length > 1 ? "s" : ""}</span>}
                            </td>
                          )}
                          {visibleCols.includes("owner") && <td className="px-4 py-3 text-muted-foreground">{lead.owner_name || "Unassigned"}</td>}
                          {visibleCols.includes("next_follow_up") && (
                            <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                              {(() => {
                                const nf = getNextFollowUp(lead.id, reminders);
                                if (!nf) return <span className="text-muted-foreground">—</span>;
                                const due = new Date(nf.datetime);
                                const isOverdue = due.getTime() < Date.now();
                                const isToday = due.toDateString() === new Date().toDateString();
                                const color = isOverdue ? "#ef4444" : isToday ? "#eab308" : "var(--text-color)";
                                return <span style={{ color, fontWeight: (isOverdue || isToday) ? 700 : 400 }}>{due.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>;
                              })()}
                            </td>
                          )}
                          {visibleCols.includes("last_note") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{(lead.lead_notes?.length ?? 0) > 0 ? timeAgo(lead.lead_notes![0].created_at) : "—"}</td>}
                          {visibleCols.includes("created_at") && (
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                              <div style={{ color: "var(--text-color)" }}>{fmtDate(lead.created_at)}</div>
                              <div className="text-[10px] opacity-70">{timeAgo(lead.created_at)}</div>
                            </td>
                          )}
                          {visibleCols.includes("actions") && (
                            <td className="px-4 py-3 text-right sticky right-0 z-10" style={{ background: "var(--row-bg, var(--card-bg-solid))", boxShadow: "-4px 0 8px -4px rgba(0,0,0,.25)" }}>
                              <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    if (actionMenuId === lead.id) {
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
                                    setActionMenuId(lead.id);
                                  }}
                                  className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-75 ml-auto" style={{ borderColor: "var(--card-border)" }}
                                >
                                  <MoreHorizontal size={13} />
                                </button>
                                {actionMenuId === lead.id && actionMenuPos && createPortal(
                                  <div className="fixed w-44 rounded-xl overflow-hidden shadow-xl z-[9999]" onClick={e => e.stopPropagation()} style={{ top: actionMenuPos.top, left: actionMenuPos.left, background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
                                    <AM icon={<Eye size={12} />} label="View Details" onClick={() => { router.push(`/dashboard/leads/${lead.id}`); setActionMenuId(null); }} />
                                    <AM icon={<Pencil size={12} />} label="Edit Lead" onClick={() => { openEdit(lead); setActionMenuId(null); }} />
                                    <AM icon={<StickyNote size={12} />} label="Add Note" onClick={() => { setNoteForLead(lead); setActionMenuId(null); }} />
                                    <AM icon={<Bell size={12} />} label="Set Reminder" onClick={() => { setReminderLead(lead); setActionMenuId(null); }} />
                                    <AM icon={lead.starred ? <StarOff size={12} /> : <Star size={12} />} label={lead.starred ? "Unstar" : "Star"} onClick={() => { handleToggleStar(lead.id); setActionMenuId(null); }} />
                                    <AM icon={<Copy size={12} />} label="Copy Email" onClick={() => { navigator.clipboard.writeText(lead.email); toast.success("Copied"); setActionMenuId(null); }} />
                                    <div style={{ borderTop: "1px solid var(--card-border)" }}>
                                      <AM icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { setDeleteLead(lead); setActionMenuId(null); }} />
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
          ) : view === "Kanban" ? (
            /* KANBAN — drag-and-drop via @dnd-kit (#4) */
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div key="kanban-view" className="overflow-x-auto pb-1 -mx-1 px-1 view-transition">
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(230px, 1fr))", minWidth: 960 }}>
                  {STAGES.map(stage => {
                    const sl = filtered.filter(l => l.status === stage);
                    const badge = getStatusColor(stage);
                    return (
                      <KanbanColumn key={stage} stage={stage} badge={badge} count={sl.length} value={sl.reduce((s, l) => s + (l.estimated_value || 0), 0)}>
                        {sl.map(l => (
                          <KanbanCard key={l.id} lead={l} highlight={getHighlightColor(l, reminders)} onView={() => router.push(`/dashboard/leads/${l.id}`)} onEdit={() => openEdit(l)} />
                        ))}
                        {sl.length === 0 && <div className="flex-1 flex items-center justify-center min-h-[60px]"><p className="text-[10px] text-muted-foreground">Drop here</p></div>}
                      </KanbanColumn>
                    );
                  })}
                </div>
              </div>
              <DragOverlay>
                {draggingLead ? <KanbanCardContent lead={draggingLead} overlay /> : null}
              </DragOverlay>
            </DndContext>
          ) : (
            /* GRID */
            <div key="grid-view" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 view-transition">
              {paged.map(lead => {
                const badge = getStatusColor(lead.status);
                const highlight = getHighlightColor(lead, reminders);
                return (
                  <div key={lead.id} className="p-5 rounded-2xl border space-y-3 hover:shadow-lg cursor-pointer" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", transition: "box-shadow .15s", boxShadow: highlight ? `0 0 0 2px ${highlight}` : undefined }} onClick={() => router.push(`/dashboard/leads/${lead.id}`)}>
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

          {/* Pagination footer (#14) — not shown for Kanban, which always shows the full filtered set */}
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
                    <FF label="First Name *" error={triedSubmit ? formErrors.first_name : undefined}><input value={form.first_name} onChange={e => setF("first_name", e.target.value)} className="ct-fi" placeholder="Vikram" /></FF>
                    <FF label="Last Name *" error={triedSubmit ? formErrors.last_name : undefined}><input value={form.last_name} onChange={e => setF("last_name", e.target.value)} className="ct-fi" placeholder="Singh" /></FF>
                  </div>
                  <FF label="Email" error={triedSubmit ? formErrors.email : undefined}><input type="email" value={form.email} onChange={e => setF("email", e.target.value)} className="ct-fi" placeholder="vikram@company.in" /></FF>
                  <FF label="Phone"><input value={form.phone} onChange={e => setF("phone", e.target.value)} className="ct-fi" placeholder="+91-9876543210" /></FF>
                  <p className="text-[10px] text-muted-foreground -mt-1">* Required. Provide at least an email or phone number so a rep can reach this lead.</p>
                </FS>
                <FS title="Company">
                  <FF label="Company Name"><input value={form.company} onChange={e => setF("company", e.target.value)} className="ct-fi" placeholder="Acme Corp" /></FF>
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="Industry"><input value={form.industry} onChange={e => setF("industry", e.target.value)} className="ct-fi" placeholder="Technology" /></FF>
                    <FF label="Employees">
                      <select value={form.employee_count} onChange={e => setF("employee_count", e.target.value)} className="ct-fi">
                        <option value="">Select range</option>
                        {["1-10", "10-50", "50-100", "100-500", "500-1000", "1000+"].map(o => <option key={o}>{o}</option>)}
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
                      {(() => {
                        const presets: [string, string][] = [["DIRECT", "Direct Form"], ["GOOGLE", "Google Ads"], ["META", "Meta Ads"], ["REFERRAL", "Referral"], ["WHATSAPP", "WhatsApp"], ["LINKEDIN", "LinkedIn"], ["EVENT", "Event"], ["OTHER", "Other"]];
                        const isCustom = !presets.some(([v]) => v === form.source);
                        return (
                          <>
                            <select value={isCustom ? "__custom__" : form.source} onChange={e => setF("source", e.target.value === "__custom__" ? "" : e.target.value)} className="ct-fi">
                              {presets.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              <option value="__custom__">+ Add custom source...</option>
                            </select>
                            {isCustom && (
                              <input value={form.source} onChange={e => setF("source", e.target.value)} className="ct-fi mt-2" placeholder="Type custom source" autoFocus />
                            )}
                          </>
                        );
                      })()}
                    </FF>
                    <FF label="Estimated Value (₹)" error={triedSubmit ? formErrors.estimated_value : undefined}><input type="number" value={form.estimated_value} onChange={e => setF("estimated_value", e.target.value)} className="ct-fi" placeholder="500000" /></FF>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FF label="Status">
                      <select value={form.status} onChange={e => setF("status", e.target.value as LeadStatus)} className="ct-fi">
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FF>
                    <FF label="Priority">
                      <select value={form.priority} onChange={e => setF("priority", e.target.value as any)} className="ct-fi">
                        {["low", "medium", "high", "urgent"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </FF>
                  </div>
                  <FF label="Owner">
                    <select
                      value={ownerCustomMode ? "__custom__" : form.owner_id}
                      onChange={e => {
                        if (e.target.value === "__custom__") {
                          setOwnerCustomMode(true);
                          setForm(f => ({ ...f, owner_id: "" }));
                        } else {
                          setOwnerCustomMode(false);
                          setForm(f => ({ ...f, owner_id: e.target.value, owner_name_custom: "" }));
                        }
                      }}
                      className="ct-fi"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      <option value="__custom__">+ Add custom owner...</option>
                    </select>
                    {ownerCustomMode && (
                      <input value={form.owner_name_custom} onChange={e => setF("owner_name_custom", e.target.value)} className="ct-fi mt-2" placeholder="Type owner name" autoFocus />
                    )}
                  </FF>
                  <FF label="Tags (comma separated)"><input value={form.tags} onChange={e => setF("tags", e.target.value)} className="ct-fi" placeholder="Enterprise, Hot Lead" /></FF>
                </FS>
                <FS title="Notes">
                  <FF label="Background Notes"><textarea rows={4} value={form.notes} onChange={e => setF("notes", e.target.value)} className="ct-fi" style={{ height: "auto", padding: "0.6rem 0.75rem" }} placeholder="Key context..." /></FF>
                </FS>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsCreateOpen(false); setEditLead(null); }} className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting || !formValid} title={!formValid ? "Fill in the required fields to enable saving" : undefined} className="flex-1 h-11 rounded-xl font-semibold text-sm hover:opacity-80 active:scale-95 disabled:cursor-not-allowed" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: (submitting || !formValid) ? 0.5 : 1 }}>{submitting ? "Saving..." : (editLead ? "Save Changes" : "Create Lead")}</button>
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
                        <button onClick={() => { setRemindersPanelOpen(false); router.push(`/dashboard/leads/${r.lead_id}`); }} className="text-[11px] hover:underline" style={{ color: "var(--graph-to)" }}>{r.lead_name}</button>
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
                        <button onClick={() => { setTodayPanelOpen(false); router.push(`/dashboard/leads/${r.lead_id}`); }} className="text-[11px] hover:underline" style={{ color: "var(--graph-to)" }}>{r.lead_name}</button>
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

      <style>{`.ct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.ct-fi:focus{border-color:var(--graph-to)}.ct-fi::placeholder{color:var(--muted-foreground);opacity:.7}.lead-row{transition:background .12s}.lead-row:hover{--row-bg:var(--accent);background:var(--accent)}`}</style>
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
function FS({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>{children}</div>;
}
function FF({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>
      {children}
      {error && <p className="text-[10px] font-medium" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}
function KanbanColumn({ stage, badge, count, value, children }: { stage: LeadStatus; badge: { bg: string; text: string; border: string }; count: number; value: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className="flex flex-col gap-2.5 p-3 rounded-2xl border min-h-[480px]" style={{ background: isOver ? "var(--accent)" : "var(--card-bg)", borderColor: isOver ? "var(--graph-to)" : "var(--card-border)", transition: "background .15s, border-color .15s" }}>
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: badge.text }} />
          <span className="text-xs font-bold uppercase" style={{ color: "var(--text-color)" }}>{stage}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: badge.bg, color: badge.text }}>{count}</span>
        </div>
        <span className="text-[9px] text-muted-foreground">₹{value.toLocaleString("en-IN")}</span>
      </div>
      {children}
    </div>
  );
}
function KanbanCardContent({ lead, overlay, highlight }: { lead: Lead; overlay?: boolean; highlight?: string }) {
  const ring = highlight ? `0 0 0 2px ${highlight}` : undefined;
  const shadow = overlay ? "0 12px 24px -8px rgba(0,0,0,.35)" : ring;
  return (
    <div className="p-3 rounded-xl border space-y-2" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)", boxShadow: shadow, width: overlay ? 230 : undefined }}>
      <div className="flex items-start justify-between gap-1">
        <div>
          <span className="block text-xs font-bold" style={{ color: "var(--text-color)" }}>{lead.first_name} {lead.last_name}</span>
          {lead.company && <span className="block text-[10px] text-muted-foreground">{lead.company}</span>}
        </div>
        {lead.starred && <Star size={11} fill="#eab308" color="#eab308" className="shrink-0" />}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: getPriColor(lead.priority).bg, color: getPriColor(lead.priority).text }}>{lead.priority}</span>
        <span className="text-xs font-bold" style={{ color: "var(--graph-to)" }}>₹{(lead.estimated_value || 0).toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
function KanbanCard({ lead, highlight, onView, onEdit }: { lead: Lead; highlight?: string; onView: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: "grab",
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="relative group hover:-translate-y-0.5 hover:shadow-md" onClick={onView}>
      <KanbanCardContent lead={lead} highlight={highlight} />
      <button onClick={e => { e.stopPropagation(); onEdit(); }} className="absolute top-2 right-2 h-5 w-5 rounded-md border flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg)", transition: "opacity .15s" }}>
        <Pencil size={9} />
      </button>
    </div>
  );
}
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
