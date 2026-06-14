"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  getDeals,
  getDealReminders,
  updateDealStage,
  toggleDealStar,
  createDeal,
  updateDeal,
  deleteDeal,
  addDealNote,
  seedDealsFromProspects,
} from "@/server/deals";
import { createReminder, toggleReminderDone } from "@/server/calendar";
import { getTeamMembers } from "@/server/users";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";
import { DateRangePicker, getDateRangeBounds, isWithinDateRange, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { DealsByStageFunnel, DealsByTypeBreakdown, DealsByCampaignSourceChart, DealsCreatedVsClosingTrend, type DealTrendDatum } from "@/components/dashboard/widgets/deals-reports";
import type { CountDatum } from "@/components/dashboard/widgets/prospects-reports";
import DealsLoading from "./loading";
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { DEAL_STAGES, DEAL_TYPES, CONTACT_ROLES, TASK_PRIORITIES } from "@/lib/constants";
import {
  Search, Filter, Plus, Table2, Kanban as KanbanIcon, Grid,
  MoreHorizontal, Building, X, Eye,
  Pencil, Trash2, Bell, StickyNote, Star, StarOff, Copy,
  SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  Wallet, Calculator, Briefcase, Award, CalendarClock, List, BarChart3, Sparkles,
  Hash, CalendarDays, TrendingUp, User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type DealStage = "NEW" | "PROPOSAL" | "NEGOTIATION" | "CONTRACT" | "WON" | "LOST";

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

interface Deal {
  id: string;
  lead_id?: string;
  prospect_id?: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  expected_close_date?: string;
  company_name?: string;
  notes?: string;
  type?: string;
  next_step?: string;
  campaign_source?: string;
  contact_name?: string;
  contact_role?: string;
  priority: string;
  tags: string[];
  starred: boolean;
  created_at: string;
  owner_id?: string;
  owner_name?: string;
  owner_name_custom?: string;
  expected_revenue: number;
  lead?: { company: string; first_name: string; last_name: string };
  industry?: string;
  rating?: string;
  project_name?: string;
}

interface TeamMember {
  id: string;
  full_name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: DealStage[] = ["NEW", "PROPOSAL", "NEGOTIATION", "CONTRACT", "WON", "LOST"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const ALL_COLUMNS = [
  { key: "title", label: "Deal", required: true },
  { key: "company", label: "Company" },
  { key: "contact_name", label: "Contact Name" },
  { key: "stage", label: "Stage" },
  { key: "type", label: "Type" },
  { key: "value", label: "Value" },
  { key: "expected_revenue", label: "Expected Revenue" },
  { key: "probability", label: "Probability" },
  { key: "expected_close_date", label: "Expected Close" },
  { key: "owner", label: "Owner" },
  { key: "campaign_source", label: "Campaign Source" },
  { key: "tags", label: "Tags" },
  { key: "next_step", label: "Next Step" },
  { key: "priority", label: "Priority" },
  { key: "created_at", label: "Created" },
  { key: "actions", label: "Actions", required: true },
];

// Columns the global search box can be scoped to
const SEARCH_COLUMNS = [
  { key: "title", label: "Title" },
  { key: "company", label: "Company" },
  { key: "contact_name", label: "Contact Name" },
  { key: "tags", label: "Tags" },
  { key: "next_step", label: "Next Step" },
  { key: "notes", label: "Notes" },
];

const PAGE_SIZES = [10, 50, 100, 200];

const CAMPAIGN_SOURCE_OPTIONS = [
  "Website", "Trade Show", "Webinar", "Cold Call", "Partner Referral", "Email Campaign", "Social Media", "Content Syndication",
];

const FALLBACK_DEALS: Deal[] = [
  { id: "d-1", title: "Enterprise CRM License", value: 450000, stage: "WON", probability: 100, expected_revenue: 450000, company_name: "Acme Corp", type: "New Business", priority: "HIGH", tags: ["Enterprise"], starred: true, created_at: new Date(Date.now() - 86400000 * 12).toISOString(), expected_close_date: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "d-2", title: "Cloud Migration Package", value: 780000, stage: "CONTRACT", probability: 80, expected_revenue: 624000, company_name: "TechStart", type: "Existing Business - Upsell", priority: "URGENT", tags: ["Hot", "Strategic"], starred: false, created_at: new Date(Date.now() - 86400000 * 9).toISOString(), expected_close_date: new Date(Date.now() + 86400000 * 5).toISOString() },
  { id: "d-3", title: "API Integration Suite", value: 320000, stage: "NEGOTIATION", probability: 60, expected_revenue: 192000, company_name: "CloudSoft Technologies", type: "New Business", priority: "MEDIUM", tags: [], starred: false, created_at: new Date(Date.now() - 86400000 * 6).toISOString(), expected_close_date: new Date(Date.now() + 86400000 * 10).toISOString() },
  { id: "d-4", title: "Data Analytics Platform", value: 550000, stage: "PROPOSAL", probability: 30, expected_revenue: 165000, company_name: "DataFlow Inc", type: "New Business", priority: "MEDIUM", tags: ["Mid-market"], starred: false, created_at: new Date(Date.now() - 86400000 * 4).toISOString(), expected_close_date: new Date(Date.now() + 86400000 * 21).toISOString() },
  { id: "d-5", title: "AI Chatbot Integration", value: 180000, stage: "NEW", probability: 10, expected_revenue: 18000, company_name: "NovaTech Labs", type: "New Business", priority: "LOW", tags: ["New"], starred: false, created_at: new Date(Date.now() - 86400000).toISOString(), expected_close_date: new Date(Date.now() + 86400000 * 35).toISOString() },
  { id: "d-6", title: "HR Automation Suite", value: 290000, stage: "LOST", probability: 0, expected_revenue: 0, company_name: "BrightPath Systems", type: "Existing Business - Renewal", priority: "LOW", tags: ["At Risk"], starred: false, created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStageStyle(stage: DealStage) {
  const map: Record<DealStage, { bg: string; text: string; border: string; key: keyof typeof DEAL_STAGES }> = {
    NEW: { bg: "rgba(59,130,246,.15)", text: "#3b82f6", border: "rgba(59,130,246,.3)", key: "new" },
    PROPOSAL: { bg: "rgba(249,115,22,.15)", text: "#f97316", border: "rgba(249,115,22,.3)", key: "proposal" },
    NEGOTIATION: { bg: "rgba(234,179,8,.15)", text: "#eab308", border: "rgba(234,179,8,.3)", key: "negotiation" },
    CONTRACT: { bg: "rgba(139,92,246,.15)", text: "#8b5cf6", border: "rgba(139,92,246,.3)", key: "contract" },
    WON: { bg: "rgba(16,185,129,.15)", text: "#10b981", border: "rgba(16,185,129,.3)", key: "won" },
    LOST: { bg: "rgba(239,68,68,.15)", text: "#ef4444", border: "rgba(239,68,68,.3)", key: "lost" },
  };
  const m = map[stage];
  const cfg = DEAL_STAGES[m.key];
  return { bg: m.bg, text: m.text, border: m.border, probability: cfg.probability, label: cfg.label };
}

function getPriorityStyle(priority?: string) {
  const cfg = TASK_PRIORITIES[(priority || "MEDIUM").toLowerCase() as keyof typeof TASK_PRIORITIES];
  const color = cfg?.color || "#3b82f6";
  return { bg: `${color}22`, text: color, label: cfg?.label || "Medium" };
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

// Highlight ring color: overdue follow-up (red) > due-today follow-up (amber) > starred (purple)
function getHighlightColor(deal: Deal, reminders: Reminder[]): string | undefined {
  const pending = reminders.filter(r => r.p_id === deal.id && !r.done);
  const now = new Date();
  if (pending.some(r => new Date(r.datetime).getTime() < now.getTime())) return "#ef4444";
  if (pending.some(r => new Date(r.datetime).toDateString() === now.toDateString())) return "#eab308";
  if (deal.starred) return "#a855f7";
  return undefined;
}

// Groups deals by created-day (→ "created") and expected-close-day (→ "closing"), merged and sorted chronologically.
function buildDealTrendData(items: Deal[]): DealTrendDatum[] {
  const counts = new Map<string, { label: string; created: number; closing: number }>();
  items.forEach(d => {
    if (d.created_at) {
      const dt = new Date(d.created_at);
      const key = dt.toISOString().slice(0, 10);
      const label = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const existing = counts.get(key) || { label, created: 0, closing: 0 };
      existing.created++;
      counts.set(key, existing);
    }
    if (d.expected_close_date) {
      const dt = new Date(d.expected_close_date);
      const key = dt.toISOString().slice(0, 10);
      const label = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const existing = counts.get(key) || { label, created: 0, closing: 0 };
      existing.closing++;
      counts.set(key, existing);
    }
  });
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ date: v.label, created: v.created, closing: v.closing }));
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DealsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"Table" | "Kanban" | "Grid">("Table");
  const [search, setSearch] = useState("");
  const [searchCols, setSearchCols] = useState<Set<string>>(new Set(SEARCH_COLUMNS.map(c => c.key)));
  const [activePanel, setActivePanel] = useState<"search" | "filters" | null>(null);
  const [stageFilters, setStageFilters] = useState<Set<string>>(new Set());
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [campaignFilters, setCampaignFilters] = useState<Set<string>>(new Set());
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [priorityFilters, setPriorityFilters] = useState<Set<string>>(new Set());
  const [valueMin, setValueMin] = useState("");
  const [valueMax, setValueMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Tab navigation + date-range filter for KPI cards/Reports
  const [pageTab, setPageTab] = useState<"Deals" | "Reports">("Deals");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: "all" });

  // UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editD, setEditD] = useState<Deal | null>(null);
  const [deleteD, setDeleteD] = useState<Deal | null>(null);
  const [reminderD, setReminderD] = useState<Deal | null>(null);
  const [noteForD, setNoteForD] = useState<Deal | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [remindersPanelOpen, setRemindersPanelOpen] = useState(false);
  const [todayPanelOpen, setTodayPanelOpen] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("ct-crm-deals-columns");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.every(c => typeof c === "string")) return parsed;
        }
      } catch { /* ignore malformed storage */ }
    }
    return ["title", "company", "stage", "value", "expected_revenue", "probability", "expected_close_date", "owner", "priority", "actions"];
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Form
  const [form, setForm] = useState({
    title: "", company_name: "", type: DEAL_TYPES[0] as string, priority: "MEDIUM",
    stage: "NEW" as DealStage, probability: 10, value: "", expected_close_date: "",
    contact_name: "", contact_role: "", campaign_source: "", next_step: "",
    owner_id: "", owner_name_custom: "", tags: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [reminderForm, setReminderForm] = useState({ title: "", type: "call" as Reminder["type"], datetime: "", note: "" });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ownerCustomMode, setOwnerCustomMode] = useState(false);

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const [dealRows, reminderRows] = await Promise.all([getDeals(), getDealReminders()]);
      if (dealRows.length) setDeals(dealRows as Deal[]);
      if (reminderRows.length) setReminders(reminderRows as Reminder[]);
    } catch {
      setDeals(FALLBACK_DEALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => {
    getTeamMembers().then(members => setTeamMembers(members.map(m => ({ id: m.id, full_name: m.full_name })))).catch(() => {});
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("ct-crm-deals-columns", JSON.stringify(visibleCols)); } catch { /* ignore */ }
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
  useEffect(() => {
    if (isCreateOpen || editD || deleteD || noteForD || reminderD || columnEditorOpen || remindersPanelOpen || todayPanelOpen) {
      setActionMenuId(null);
    }
  }, [isCreateOpen, editD, deleteD, noteForD, reminderD, columnEditorOpen, remindersPanelOpen, todayPanelOpen]);

  // "New Deal" header quick action (?new=1) auto-opens this page's create drawer
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setIsCreateOpen(true);
      router.replace("/dashboard/deals", { scroll: false });
    }
  }, [searchParams, router]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleUpdateStage = useCallback(async (id: string, nextStage: DealStage) => {
    const prob = getStageStyle(nextStage).probability;
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: nextStage, probability: prob, expected_revenue: Math.round((d.value * prob) / 100) } : d));
    try {
      await updateDealStage(id, nextStage, prob);
      toast.success(`Stage → ${nextStage}`);
    } catch { toast.error("Failed to update deal stage"); }
  }, []);

  const handleToggleStar = useCallback((id: string) => {
    setDeals(prev => {
      const deal = prev.find(d => d.id === id);
      const next = !deal?.starred;
      toggleDealStar(id, next).catch(() => toast.error("Failed to update star"));
      return prev.map(d => d.id === id ? { ...d, starred: next } : d);
    });
  }, []);

  // ─── Kanban drag-and-drop ───────────────────────────────────────────────
  const [draggingDeal, setDraggingDeal] = useState<Deal | null>(null);
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setDraggingDeal(deals.find(d => d.id === e.active.id) || null);
  }, [deals]);
  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDraggingDeal(null);
    const { active, over } = e;
    if (!over) return;
    const newStage = over.id as DealStage;
    const deal = deals.find(d => d.id === active.id);
    if (deal && deal.stage !== newStage && (STAGES as string[]).includes(newStage)) {
      handleUpdateStage(deal.id, newStage);
    }
  }, [deals, handleUpdateStage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.value) { toast.error("Title and value required"); return; }
    setSubmitting(true);
    try {
      await createDeal({
        title: form.title,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        probability: form.probability,
        company_name: form.company_name || undefined,
        type: form.type || undefined,
        next_step: form.next_step || undefined,
        campaign_source: form.campaign_source || undefined,
        contact_name: form.contact_name || undefined,
        contact_role: form.contact_role || undefined,
        priority: form.priority,
        expected_close_date: form.expected_close_date || null,
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      toast.success("✅ Deal created!");
      setIsCreateOpen(false);
      resetForm();
      await fetchDeals();
    } catch {
      toast.error("Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editD) return;
    setSubmitting(true);
    try {
      await updateDeal(editD.id, {
        title: form.title,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        probability: form.probability,
        company_name: form.company_name || undefined,
        type: form.type || undefined,
        next_step: form.next_step || undefined,
        campaign_source: form.campaign_source || undefined,
        contact_name: form.contact_name || undefined,
        contact_role: form.contact_role || undefined,
        priority: form.priority,
        expected_close_date: form.expected_close_date || null,
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
        notes: form.notes,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      toast.success("✅ Deal updated!");
      setEditD(null);
      resetForm();
      await fetchDeals();
    } catch {
      toast.error("Failed to update deal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteD) return;
    setDeals(p => p.filter(x => x.id !== deleteD.id));
    toast.success("Deal removed");
    const id = deleteD.id;
    setDeleteD(null);
    try { await deleteDeal(id); } catch { toast.error("Failed to delete deal on server"); }
  };

  const handleAddNote = async (d: Deal) => {
    if (!newNote.trim()) return;
    const noteText = newNote.trim();
    setNewNote("");
    try {
      await addDealNote(d.id, noteText);
      toast.success("✅ Note saved to database!");
    } catch { toast.error("Failed to save note"); }
  };

  const handleSetReminder = async () => {
    if (!reminderD || !reminderForm.title || !reminderForm.datetime) { toast.error("Fill title & date/time"); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, p_id: reminderD.id, p_name: reminderD.title, ...reminderForm, done: false };
    setReminders(p => [...p, r]);
    toast.success(`⏰ Reminder set for ${new Date(reminderForm.datetime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
    setReminderD(null);
    setReminderForm({ title: "", type: "call", datetime: "", note: "" });
    try {
      const row = await createReminder("deal", reminderD.id, reminderD.title, reminderForm);
      setReminders(p => p.map(x => x.id === tempId ? { ...x, id: row.id } : x));
    } catch { /* keep optimistic reminder */ }
  };

  const handleToggleReminder = (id: string) => {
    setReminders(p => p.map(r => r.id === id ? { ...r, done: true } : r));
    toggleReminderDone(id, true).catch(() => {});
  };

  const handleSeedDemo = async () => {
    setSeedingDemo(true);
    try {
      const result = await seedDealsFromProspects();
      if (result.skipped) {
        toast.error("Demo data already loaded.");
      } else {
        toast.success(`Loaded ${result.inserted} demo deals`);
        await fetchDeals();
      }
    } catch {
      toast.error("Failed to load demo data");
    } finally {
      setSeedingDemo(false);
    }
  };

  const openEdit = (d: Deal) => {
    setForm({
      title: d.title,
      company_name: d.company_name || "",
      type: d.type || DEAL_TYPES[0],
      priority: d.priority || "MEDIUM",
      stage: d.stage,
      probability: d.probability,
      value: String(d.value || ""),
      expected_close_date: d.expected_close_date ? d.expected_close_date.slice(0, 10) : "",
      contact_name: d.contact_name || "",
      contact_role: d.contact_role || "",
      campaign_source: d.campaign_source || "",
      next_step: d.next_step || "",
      owner_id: d.owner_id || "",
      owner_name_custom: d.owner_name_custom || "",
      tags: (d.tags || []).join(", "),
      notes: d.notes || "",
    });
    setOwnerCustomMode(!d.owner_id && !!d.owner_name_custom);
    setEditD(d);
  };

  const resetForm = () => {
    setForm({
      title: "", company_name: "", type: DEAL_TYPES[0], priority: "MEDIUM",
      stage: "NEW", probability: 10, value: "", expected_close_date: "",
      contact_name: "", contact_role: "", campaign_source: "", next_step: "",
      owner_id: "", owner_name_custom: "", tags: "", notes: "",
    });
    setOwnerCustomMode(false);
  };

  // ─── Filtering (advanced column-scoped search + multi-select filters) ─────
  const availableTypes = Array.from(new Set([...DEAL_TYPES, ...deals.map(d => d.type).filter(Boolean) as string[]]));
  const availableCampaignSources = Array.from(new Set([...CAMPAIGN_SOURCE_OPTIONS, ...deals.map(d => d.campaign_source).filter(Boolean) as string[]]));
  const availableTags = Array.from(new Set(deals.flatMap(d => d.tags || []).filter(Boolean))) as string[];

  const matchesSearch = (d: Deal, q: string) => {
    if (!q) return true;
    const hay: string[] = [];
    if (searchCols.has("title")) hay.push(d.title);
    if (searchCols.has("company")) hay.push(d.company_name || "");
    if (searchCols.has("contact_name")) hay.push(d.contact_name || "");
    if (searchCols.has("tags")) hay.push((d.tags || []).join(" "));
    if (searchCols.has("next_step")) hay.push(d.next_step || "");
    if (searchCols.has("notes")) hay.push(d.notes || "");
    return hay.join("   ").toLowerCase().includes(q);
  };

  const filtered = deals.filter(d => {
    const q = search.trim().toLowerCase();
    if (!matchesSearch(d, q)) return false;
    if (stageFilters.size > 0 && !stageFilters.has(d.stage)) return false;
    if (typeFilters.size > 0 && !typeFilters.has(d.type || "")) return false;
    if (campaignFilters.size > 0 && !campaignFilters.has(d.campaign_source || "")) return false;
    if (tagFilters.size > 0 && !(d.tags || []).some(t => tagFilters.has(t))) return false;
    if (priorityFilters.size > 0 && !priorityFilters.has(d.priority)) return false;
    if (valueMin && d.value < Number(valueMin)) return false;
    if (valueMax && d.value > Number(valueMax)) return false;
    if (dateFrom && (!d.expected_close_date || new Date(d.expected_close_date) < new Date(dateFrom))) return false;
    if (dateTo && (!d.expected_close_date || new Date(d.expected_close_date) > new Date(`${dateTo}T23:59:59`))) return false;
    return true;
  });

  const activeFilterCount = stageFilters.size + typeFilters.size + campaignFilters.size + tagFilters.size + priorityFilters.size
    + (valueMin ? 1 : 0) + (valueMax ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const clearAllFilters = () => {
    setStageFilters(new Set()); setTypeFilters(new Set()); setCampaignFilters(new Set());
    setTagFilters(new Set()); setPriorityFilters(new Set());
    setValueMin(""); setValueMax(""); setDateFrom(""); setDateTo("");
  };

  // ─── Pagination ─────────────────────────────────────────────────────────
  useEffect(() => { setPage(1); }, [search, searchCols, stageFilters, typeFilters, campaignFilters, tagFilters, priorityFilters, valueMin, valueMax, dateFrom, dateTo, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedStart = (page - 1) * pageSize;
  const paged = filtered.slice(pagedStart, pagedStart + pageSize);

  const activeReminders = reminders.filter(r => !r.done);
  const todayFollowUps = activeReminders.filter(r => new Date(r.datetime).toDateString() === new Date().toDateString());

  // ─── KPI summary cards + Reports ───────────────────────────────────────────
  const rangeBounds = getDateRangeBounds(dateRange);
  const rangeDeals = deals.filter(d => isWithinDateRange(d.created_at, rangeBounds));
  const openDeals = deals.filter(d => d.stage !== "WON" && d.stage !== "LOST");
  const kpiTotalPipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
  const kpiWeightedForecast = openDeals.reduce((s, d) => s + d.expected_revenue, 0);
  const kpiOpenDeals = openDeals.length;
  const kpiWonThisPeriod = rangeDeals.filter(d => d.stage === "WON").length;
  const kpiAvgDealSize = openDeals.length > 0 ? Math.round(kpiTotalPipelineValue / openDeals.length) : 0;
  const weekFromNow = new Date(Date.now() + 7 * 86400000);
  const kpiClosingThisWeek = openDeals.filter(d => d.expected_close_date && new Date(d.expected_close_date) >= new Date() && new Date(d.expected_close_date) <= weekFromNow).length;

  // Reports tab data — respects dateRange via rangeDeals
  const stageData: CountDatum[] = STAGES.map(s => ({ name: getStageStyle(s).label, count: rangeDeals.filter(d => d.stage === s).length, color: getStageStyle(s).text }));
  const typeData: CountDatum[] = availableTypes.map(t => ({ name: t, count: rangeDeals.filter(d => d.type === t).length }));
  const campaignSourceData: CountDatum[] = availableCampaignSources.map(c => ({ name: c, count: rangeDeals.filter(d => d.campaign_source === c).length }));
  const trendData: DealTrendDatum[] = buildDealTrendData(rangeDeals);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading && deals.length === 0) return <DealsLoading />;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Deals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{deals.length} total · {filtered.length} shown{activeReminders.length > 0 ? ` · ${activeReminders.length} reminders` : ""}</p>
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
          {!loading && deals.length < 5 && (
            <Btn ghost onClick={handleSeedDemo} disabled={seedingDemo} icon={<Sparkles size={13} />}>
              {seedingDemo ? "Loading…" : "Load Demo Data"}
            </Btn>
          )}
          <Btn primary onClick={() => setIsCreateOpen(true)} icon={<Plus size={15} />}>New Deal</Btn>
        </div>
      </div>

      {/* KPI Summary Cards — respect the date-range filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Wallet size={16} />} label="Total Pipeline Value" value={`₹${kpiTotalPipelineValue.toLocaleString("en-IN")}`} />
        <KpiCard icon={<Calculator size={16} />} label="Weighted Forecast" value={`₹${kpiWeightedForecast.toLocaleString("en-IN")}`} color="#00f2fe" />
        <KpiCard icon={<Briefcase size={16} />} label="Open Deals" value={String(kpiOpenDeals)} color="#3b82f6" />
        <KpiCard icon={<Award size={16} />} label="Won This Period" value={String(kpiWonThisPeriod)} color="#10b981" />
        <KpiCard icon={<TrendingUp size={16} />} label="Avg Deal Size" value={`₹${kpiAvgDealSize.toLocaleString("en-IN")}`} color="#eab308" />
        <KpiCard icon={<CalendarClock size={16} />} label="Closing This Week" value={String(kpiClosingThisWeek)} color="#a855f7" />
      </div>

      {/* Tab navigation + date-range picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher
          value={pageTab}
          onChange={(id) => setPageTab(id as "Deals" | "Reports")}
          options={[
            { id: "Deals", label: "Deals", icon: <List size={13} /> },
            { id: "Reports", label: "Reports", icon: <BarChart3 size={13} /> },
          ]}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {pageTab === "Reports" ? (
        /* REPORTS TAB — stage funnel, type breakdown, campaign source, created-vs-closing trend */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 view-transition" key="reports-view">
          <DealsByStageFunnel data={stageData} loading={loading} />
          <DealsByTypeBreakdown data={typeData} loading={loading} />
          <DealsByCampaignSourceChart data={campaignSourceData} loading={loading} />
          <DealsCreatedVsClosingTrend data={trendData} loading={loading} />
        </div>
      ) : (
        <>
          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input type="text" placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-52 pl-9 pr-3 rounded-xl text-xs bg-transparent border" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
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
                    <FilterChipGroup label="Stage" options={STAGES.map(s => ({ value: s, label: getStageStyle(s).label }))} selected={stageFilters} onToggle={v => toggleSetValue(setStageFilters, v)} />
                    <FilterChipGroup label="Type" options={availableTypes.map(t => ({ value: t, label: t }))} selected={typeFilters} onToggle={v => toggleSetValue(setTypeFilters, v)} />
                    <FilterChipGroup label="Campaign Source" options={availableCampaignSources.map(c => ({ value: c, label: c }))} selected={campaignFilters} onToggle={v => toggleSetValue(setCampaignFilters, v)} />
                    {availableTags.length > 0 && <FilterChipGroup label="Tags" options={availableTags.map(t => ({ value: t, label: t }))} selected={tagFilters} onToggle={v => toggleSetValue(setTagFilters, v)} />}
                    <FilterChipGroup label="Priority" options={PRIORITY_OPTIONS.map(p => ({ value: p, label: getPriorityStyle(p).label }))} selected={priorityFilters} onToggle={v => toggleSetValue(setPriorityFilters, v)} />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Value (₹)</p>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="Min" value={valueMin} onChange={e => setValueMin(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                        <span className="text-muted-foreground text-xs">to</span>
                        <input type="number" placeholder="Max" value={valueMax} onChange={e => setValueMax(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Expected Close Date Range</p>
                      <div className="flex items-center gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                        <span className="text-muted-foreground text-xs">to</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="ct-fi" style={{ height: "2rem", fontSize: "0.75rem" }} />
                      </div>
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
              <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>No deals found</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust filters or create a new deal.</p>
              <button onClick={() => setIsCreateOpen(true)} className="mt-4 h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={14} />New Deal</button>
            </div>
          ) : view === "Table" ? (
            <DealsTable
              paged={paged}
              visibleCols={visibleCols}
              reminders={reminders}
              actionMenuId={actionMenuId}
              actionMenuPos={actionMenuPos}
              setActionMenuId={setActionMenuId}
              setActionMenuPos={setActionMenuPos}
              onView={(d) => router.push(`/dashboard/deals/${d.id}`)}
              onEdit={openEdit}
              onToggleStar={handleToggleStar}
              onUpdateStage={handleUpdateStage}
              onAddNote={setNoteForD}
              onSetReminder={setReminderD}
              onDelete={setDeleteD}
            />
          ) : view === "Kanban" ? (
            /* KANBAN — drag-and-drop via @dnd-kit */
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div key="kanban-view" className="overflow-x-auto pb-1 -mx-1 px-1 view-transition">
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(6, minmax(220px, 1fr))", minWidth: 1320 }}>
                  {STAGES.map(stage => {
                    const sd = filtered.filter(d => d.stage === stage);
                    const style = getStageStyle(stage);
                    return (
                      <KanbanColumn key={stage} stage={stage} style={style} count={sd.length} value={sd.reduce((s, d) => s + d.value, 0)}>
                        {sd.map(d => (
                          <KanbanCard key={d.id} deal={d} highlight={getHighlightColor(d, reminders)} onView={() => router.push(`/dashboard/deals/${d.id}`)} onEdit={() => openEdit(d)} />
                        ))}
                        {sd.length === 0 && <div className="flex-1 flex items-center justify-center min-h-[60px]"><p className="text-[10px] text-muted-foreground">Drop here</p></div>}
                      </KanbanColumn>
                    );
                  })}
                </div>
              </div>
              <DragOverlay>
                {draggingDeal ? <KanbanCardContent deal={draggingDeal} overlay /> : null}
              </DragOverlay>
            </DndContext>
          ) : (
            /* GRID */
            <div key="grid-view" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 view-transition">
              {paged.map(d => {
                const style = getStageStyle(d.stage);
                const pStyle = getPriorityStyle(d.priority);
                const highlight = getHighlightColor(d, reminders);
                return (
                  <div key={d.id} className="p-5 rounded-2xl border space-y-3 hover:shadow-lg cursor-pointer" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", transition: "box-shadow .15s", boxShadow: highlight ? `0 0 0 2px ${highlight}` : undefined }} onClick={() => router.push(`/dashboard/deals/${d.id}`)}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); handleToggleStar(d.id); }}>{d.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="opacity-30" />}</button>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{d.title}</h3>
                          <p className="text-xs text-muted-foreground">{d.company_name || d.lead?.company || "—"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: style.bg, color: style.text }}>{style.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: pStyle.bg, color: pStyle.text }}>{pStyle.label}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {d.contact_name && <div className="flex items-center gap-1.5"><User size={11} className="opacity-60 shrink-0" /><span className="truncate">{d.contact_name}{d.contact_role ? ` · ${d.contact_role}` : ""}</span></div>}
                      {d.expected_close_date && <div className="flex items-center gap-1.5"><CalendarClock size={11} className="opacity-60 shrink-0" />{fmtDate(d.expected_close_date)}</div>}
                    </div>
                    <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                      <span className="text-sm font-bold" style={{ color: "var(--graph-to)" }}>₹{d.value.toLocaleString("en-IN")}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,.04)", color: "var(--muted-foreground)" }}><Hash size={10} />{d.probability}% · ₹{d.expected_revenue.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(d)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><Pencil size={11} /></button>
                      <button onClick={() => setDeleteD(d)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "#ef4444" }}><Trash2 size={11} /></button>
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
      {(isCreateOpen || editD) && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 t-modal-backdrop" onClick={() => { setIsCreateOpen(false); setEditD(null); resetForm(); }} />
          <div className="relative ml-auto h-full w-full max-w-[520px] overflow-y-auto shadow-2xl t-drawer-panel" style={{ background: "var(--card-bg-solid)", borderLeft: "1px solid var(--card-border)" }}>
            <form onSubmit={editD ? handleEdit : handleCreate}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "var(--card-bg-solid)", borderBottom: "1px solid var(--card-border)" }}>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>{editD ? "Edit Deal" : "New Deal"}</h2>
                <button type="button" onClick={() => { setIsCreateOpen(false); setEditD(null); resetForm(); }} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={15} /></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <PFS title="Deal Information">
                  <PFF label="Deal Title *"><input required value={form.title} onChange={e => setF("title", e.target.value)} className="dct-fi" placeholder="Enterprise CRM License" /></PFF>
                  <PFF label="Company / Account *"><input required value={form.company_name} onChange={e => setF("company_name", e.target.value)} className="dct-fi" placeholder="Acme Corp" /></PFF>
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Type">
                      <select value={form.type} onChange={e => setF("type", e.target.value)} className="dct-fi">
                        {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </PFF>
                    <PFF label="Priority">
                      <select value={form.priority} onChange={e => setF("priority", e.target.value)} className="dct-fi">
                        {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{getPriorityStyle(p).label}</option>)}
                      </select>
                    </PFF>
                  </div>
                </PFS>
                <PFS title="Pipeline & Value">
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Stage">
                      <select value={form.stage} onChange={e => { const ns = e.target.value as DealStage; setF("stage", ns); setF("probability", getStageStyle(ns).probability); }} className="dct-fi">
                        {STAGES.map(s => <option key={s} value={s}>{getStageStyle(s).label}</option>)}
                      </select>
                    </PFF>
                    <PFF label="Probability (%)"><input type="number" min={0} max={100} value={form.probability} onChange={e => setF("probability", Number(e.target.value))} className="dct-fi" /></PFF>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Value (₹) *"><input type="number" required value={form.value} onChange={e => setF("value", e.target.value)} className="dct-fi" placeholder="500000" /></PFF>
                    <PFF label="Expected Close Date"><input type="date" value={form.expected_close_date} onChange={e => setF("expected_close_date", e.target.value)} className="dct-fi" /></PFF>
                  </div>
                </PFS>
                <PFS title="Contact & Campaign">
                  <div className="grid grid-cols-2 gap-3">
                    <PFF label="Contact Name"><input value={form.contact_name} onChange={e => setF("contact_name", e.target.value)} className="dct-fi" placeholder="Vikram Singh" /></PFF>
                    <PFF label="Contact Role">
                      <select value={form.contact_role} onChange={e => setF("contact_role", e.target.value)} className="dct-fi">
                        <option value="">—</option>
                        {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </PFF>
                  </div>
                  <PFF label="Campaign Source">
                    {(() => {
                      const isCustom = !!form.campaign_source && !CAMPAIGN_SOURCE_OPTIONS.includes(form.campaign_source);
                      return (
                        <>
                          <select value={isCustom ? "__custom__" : form.campaign_source} onChange={e => setF("campaign_source", e.target.value === "__custom__" ? "" : e.target.value)} className="dct-fi">
                            <option value="">—</option>
                            {CAMPAIGN_SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            <option value="__custom__">+ Add custom source...</option>
                          </select>
                          {isCustom && <input value={form.campaign_source} onChange={e => setF("campaign_source", e.target.value)} className="dct-fi mt-2" placeholder="Type custom source" autoFocus />}
                        </>
                      );
                    })()}
                  </PFF>
                  <PFF label="Next Step"><input value={form.next_step} onChange={e => setF("next_step", e.target.value)} className="dct-fi" placeholder="e.g. Send proposal" /></PFF>
                </PFS>
                <PFS title="Owner & Tags">
                  <PFF label="Owner">
                    {(() => (
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
                          className="dct-fi"
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                          <option value="__custom__">+ Add custom owner...</option>
                        </select>
                        {ownerCustomMode && (
                          <input value={form.owner_name_custom} onChange={e => setF("owner_name_custom", e.target.value)} className="dct-fi mt-2" placeholder="Type owner name" autoFocus />
                        )}
                      </>
                    ))()}
                  </PFF>
                  <PFF label="Tags (comma separated)"><input value={form.tags} onChange={e => setF("tags", e.target.value)} className="dct-fi" placeholder="Hot, Enterprise" /></PFF>
                  <PFF label="Notes"><textarea rows={3} value={form.notes} onChange={e => setF("notes", e.target.value)} className="dct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Key context..." /></PFF>
                </PFS>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsCreateOpen(false); setEditD(null); resetForm(); }} className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold text-sm hover:opacity-80 active:scale-95" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Saving..." : (editD ? "Save Changes" : "Create Deal")}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteD(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,.1)" }}><Trash2 size={22} style={{ color: "#ef4444" }} /></div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: "var(--text-color)" }}>Remove Deal?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5"><strong style={{ color: "var(--text-color)" }}>{deleteD.title}</strong> for <strong style={{ color: "var(--text-color)" }}>{deleteD.company_name || deleteD.lead?.company || "Unknown"}</strong> will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteD(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 h-10 rounded-xl font-semibold text-sm text-white hover:opacity-80" style={{ background: "#ef4444" }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NOTE ── */}
      {noteForD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setNoteForD(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Add Note — {noteForD.title}</h3><button onClick={() => setNoteForD(null)} className="hover:opacity-70"><X size={15} /></button></div>
            <textarea autoFocus rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} className="w-full border rounded-xl p-3 text-sm outline-none resize-none" style={{ borderColor: "var(--card-border)", background: "var(--accent)", color: "var(--text-color)" }} placeholder="Write note..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteForD(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={() => { handleAddNote(noteForD); setNoteForD(null); }} className="flex-1 h-10 rounded-xl font-semibold text-sm hover:opacity-80" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SET REMINDER ── */}
      {reminderD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setReminderD(null)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>Set Reminder</h3><p className="text-xs text-muted-foreground">For: {reminderD.title}</p></div><button onClick={() => setReminderD(null)} className="hover:opacity-70"><X size={15} /></button></div>
            <div className="space-y-3">
              <PFF label="Title *"><input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} className="dct-fi" placeholder="Send revised proposal" /></PFF>
              <div className="grid grid-cols-2 gap-3">
                <PFF label="Type"><select value={reminderForm.type} onChange={e => setReminderForm(f => ({ ...f, type: e.target.value as any }))} className="dct-fi"><option value="call">📞 Call</option><option value="email">✉️ Email</option><option value="meeting">🗓 Meeting</option><option value="follow_up">🔁 Follow-up</option></select></PFF>
                <PFF label="Date & Time *"><input type="datetime-local" value={reminderForm.datetime} onChange={e => setReminderForm(f => ({ ...f, datetime: e.target.value }))} className="dct-fi" min={new Date().toISOString().slice(0, 16)} /></PFF>
              </div>
              <PFF label="Note"><textarea rows={2} value={reminderForm.note} onChange={e => setReminderForm(f => ({ ...f, note: e.target.value }))} className="dct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="What to discuss..." /></PFF>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setReminderD(null)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
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
                        <button onClick={() => { setRemindersPanelOpen(false); router.push(`/dashboard/deals/${r.p_id}`); }} className="text-[11px] hover:underline" style={{ color: "var(--graph-to)" }}>{r.p_name}</button>
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
                        <button onClick={() => { setTodayPanelOpen(false); router.push(`/dashboard/deals/${r.p_id}`); }} className="text-[11px] hover:underline" style={{ color: "var(--graph-to)" }}>{r.p_name}</button>
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

      <style>{`.dct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.dct-fi:focus{border-color:var(--graph-to)}.dct-fi::placeholder{color:var(--muted-foreground);opacity:.7}.ct-fi{width:100%;height:2.5rem;border:1px solid var(--card-border);border-radius:.75rem;padding:0 .75rem;font-size:.8125rem;outline:none;background:var(--accent);color:var(--text-color);transition:border-color .15s}.ct-fi:focus{border-color:var(--graph-to)}.ct-fi::placeholder{color:var(--muted-foreground);opacity:.7}.deal-row{transition:background .12s}.deal-row:hover{--row-bg:var(--accent);background:var(--accent)}`}</style>
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
function KanbanColumn({ stage, style, count, value, children }: { stage: DealStage; style: { bg: string; text: string; border: string; label: string }; count: number; value: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className="flex flex-col gap-2.5 p-3 rounded-2xl border min-h-[480px]" style={{ background: isOver ? "var(--accent)" : "var(--card-bg)", borderColor: isOver ? "var(--graph-to)" : "var(--card-border)", transition: "background .15s, border-color .15s" }}>
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: style.text }} />
          <span className="text-xs font-bold uppercase" style={{ color: "var(--text-color)" }}>{style.label}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: style.bg, color: style.text }}>{count}</span>
        </div>
        <span className="text-[9px] text-muted-foreground">₹{value.toLocaleString("en-IN")}</span>
      </div>
      {children}
    </div>
  );
}
function KanbanCardContent({ deal, overlay, highlight }: { deal: Deal; overlay?: boolean; highlight?: string }) {
  const ring = highlight ? `0 0 0 2px ${highlight}` : undefined;
  const shadow = overlay ? "0 12px 24px -8px rgba(0,0,0,.35)" : ring;
  const pStyle = getPriorityStyle(deal.priority);
  return (
    <div className="p-3 rounded-xl border space-y-2" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)", boxShadow: shadow, width: overlay ? 230 : undefined }}>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <span className="block text-xs font-bold truncate" style={{ color: "var(--text-color)" }}>{deal.title}</span>
          {(deal.company_name || deal.lead?.company) && <span className="block text-[10px] text-muted-foreground truncate">{deal.company_name || deal.lead?.company}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: pStyle.bg, color: pStyle.text }}>{pStyle.label}</span>
          {deal.starred && <Star size={11} fill="#eab308" color="#eab308" className="shrink-0" />}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">{deal.probability}% · {fmtDate(deal.expected_close_date)}</span>
        <span className="text-xs font-bold" style={{ color: "var(--graph-to)" }}>₹{deal.value.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
function KanbanCard({ deal, highlight, onView, onEdit }: { deal: Deal; highlight?: string; onView: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: "grab",
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="relative group hover:-translate-y-0.5 hover:shadow-md" onClick={onView}>
      <KanbanCardContent deal={deal} highlight={highlight} />
      <button onClick={e => { e.stopPropagation(); onEdit(); }} className="absolute top-2 right-2 h-5 w-5 rounded-md border flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg)", transition: "opacity .15s" }}>
        <Pencil size={9} />
      </button>
    </div>
  );
}

// ─── Table view ──────────────────────────────────────────────────────────────
function DealsTable({
  paged, visibleCols, reminders, actionMenuId, actionMenuPos,
  setActionMenuId, setActionMenuPos, onView, onEdit, onToggleStar,
  onUpdateStage, onAddNote, onSetReminder, onDelete,
}: {
  paged: Deal[];
  visibleCols: string[];
  reminders: Reminder[];
  actionMenuId: string | null;
  actionMenuPos: { top: number; left: number } | null;
  setActionMenuId: (id: string | null) => void;
  setActionMenuPos: (pos: { top: number; left: number } | null) => void;
  onView: (d: Deal) => void;
  onEdit: (d: Deal) => void;
  onToggleStar: (id: string) => void;
  onUpdateStage: (id: string, stage: DealStage) => void;
  onAddNote: (d: Deal) => void;
  onSetReminder: (d: Deal) => void;
  onDelete: (d: Deal) => void;
}) {
  return (
    <div key="table-view" className="rounded-2xl border overflow-hidden view-transition" style={{ borderColor: "var(--card-border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[1200px]" style={{ background: "var(--card-bg)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--card-border)", color: "var(--muted-foreground)", background: "var(--card-bg-solid)" }}>
              {visibleCols.includes("title") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 z-10" style={{ background: "var(--card-bg-solid)", minWidth: 220, boxShadow: "4px 0 8px -4px rgba(0,0,0,.25)" }}>Deal</th>}
              {visibleCols.includes("company") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Company</th>}
              {visibleCols.includes("contact_name") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 150 }}>Contact</th>}
              {visibleCols.includes("stage") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Stage</th>}
              {visibleCols.includes("type") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 170 }}>Type</th>}
              {visibleCols.includes("value") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right" style={{ minWidth: 110 }}>Value</th>}
              {visibleCols.includes("expected_revenue") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right" style={{ minWidth: 130 }}>Exp. Revenue</th>}
              {visibleCols.includes("probability") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right">Probability</th>}
              {visibleCols.includes("expected_close_date") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 120 }}>Exp. Close</th>}
              {visibleCols.includes("owner") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 130 }}>Owner</th>}
              {visibleCols.includes("campaign_source") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Campaign Source</th>}
              {visibleCols.includes("tags") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Tags</th>}
              {visibleCols.includes("next_step") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 160 }}>Next Step</th>}
              {visibleCols.includes("priority") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Priority</th>}
              {visibleCols.includes("created_at") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap">Created</th>}
              {visibleCols.includes("actions") && <th className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap text-right sticky right-0 z-10" style={{ background: "var(--card-bg-solid)", boxShadow: "-4px 0 8px -4px rgba(0,0,0,.25)" }}>Actions</th>}
            </tr>
          </thead>
          <tbody style={{ color: "var(--text-color)" }}>
            {paged.map(d => {
              const style = getStageStyle(d.stage);
              const pStyle = getPriorityStyle(d.priority);
              const highlight = getHighlightColor(d, reminders);
              return (
                <tr key={d.id} className="deal-row border-b" style={{ borderColor: "var(--card-border)", boxShadow: highlight ? `inset 3px 0 0 0 ${highlight}` : undefined }}>
                  {visibleCols.includes("title") && (
                    <td className="px-4 py-3 sticky left-0 z-10" style={{ background: "var(--row-bg, var(--card-bg-solid))", boxShadow: highlight ? `4px 0 8px -4px rgba(0,0,0,.25), inset 3px 0 0 0 ${highlight}` : "4px 0 8px -4px rgba(0,0,0,.25)" }}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onToggleStar(d.id)} className="shrink-0">{d.starred ? <Star size={12} fill="#eab308" color="#eab308" /> : <StarOff size={12} className="text-muted-foreground opacity-30" />}</button>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a" }}><Briefcase size={13} /></div>
                        <div className="min-w-0">
                          <button onClick={() => onView(d)} className="font-semibold hover:underline text-left truncate block max-w-[180px]" style={{ color: "var(--text-color)" }}>{d.title}</button>
                          {d.tags && d.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5 overflow-hidden whitespace-nowrap ct-fade-right" style={{ maxWidth: 160 }}>
                              {d.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleCols.includes("company") && <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-muted-foreground"><Building size={11} className="opacity-60 shrink-0" />{d.company_name || d.lead?.company || "—"}</div></td>}
                  {visibleCols.includes("contact_name") && <td className="px-4 py-3 text-muted-foreground"><span className="whitespace-nowrap overflow-hidden block max-w-[150px] text-[11px] ct-fade-right">{d.contact_name ? `${d.contact_name}${d.contact_role ? ` · ${d.contact_role}` : ""}` : "—"}</span></td>}
                  {visibleCols.includes("stage") && (
                    <td className="px-4 py-3">
                      <select value={d.stage} onChange={e => onUpdateStage(d.id, e.target.value as DealStage)} className="px-2 py-1 rounded-xl font-bold text-[10px] cursor-pointer outline-none uppercase" style={{ background: style.bg, color: style.text, border: "none" }}>
                        {STAGES.map(s => <option key={s} value={s}>{getStageStyle(s).label}</option>)}
                      </select>
                    </td>
                  )}
                  {visibleCols.includes("type") && <td className="px-4 py-3 text-muted-foreground text-[11px]"><span className="whitespace-nowrap overflow-hidden block max-w-[160px] ct-fade-right">{d.type || "—"}</span></td>}
                  {visibleCols.includes("value") && <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--graph-to)" }}>₹{d.value.toLocaleString("en-IN")}</td>}
                  {visibleCols.includes("expected_revenue") && <td className="px-4 py-3 text-right text-muted-foreground">₹{d.expected_revenue.toLocaleString("en-IN")}</td>}
                  {visibleCols.includes("probability") && <td className="px-4 py-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(0,0,0,.04)", color: "var(--muted-foreground)" }}>{d.probability}%</span></td>}
                  {visibleCols.includes("expected_close_date") && (
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                      <div style={{ color: "var(--text-color)" }}>{fmtDate(d.expected_close_date)}</div>
                    </td>
                  )}
                  {visibleCols.includes("owner") && <td className="px-4 py-3 text-muted-foreground text-[11px]">{d.owner_name || d.owner_name_custom || "—"}</td>}
                  {visibleCols.includes("campaign_source") && <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: "rgba(0,0,0,.03)", borderColor: "var(--card-border)" }}>{d.campaign_source || "—"}</span></td>}
                  {visibleCols.includes("tags") && (
                    <td className="px-4 py-3">
                      {d.tags && d.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">{d.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                  {visibleCols.includes("next_step") && <td className="px-4 py-3 text-muted-foreground"><span className="whitespace-nowrap overflow-hidden block max-w-[170px] text-[11px] ct-fade-right">{d.next_step || "—"}</span></td>}
                  {visibleCols.includes("priority") && <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: pStyle.bg, color: pStyle.text }}>{pStyle.label}</span></td>}
                  {visibleCols.includes("created_at") && (
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[11px]">
                      <div style={{ color: "var(--text-color)" }}>{fmtDate(d.created_at)}</div>
                      <div className="text-[10px] opacity-70">{timeAgo(d.created_at)}</div>
                    </td>
                  )}
                  {visibleCols.includes("actions") && (
                    <td className="px-4 py-3 text-right sticky right-0 z-10" style={{ background: "var(--row-bg, var(--card-bg-solid))", boxShadow: "-4px 0 8px -4px rgba(0,0,0,.25)" }}>
                      <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            if (actionMenuId === d.id) {
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
                            setActionMenuId(d.id);
                          }}
                          className="h-7 w-7 rounded-lg border flex items-center justify-center hover:opacity-75 ml-auto" style={{ borderColor: "var(--card-border)" }}
                        >
                          <MoreHorizontal size={13} />
                        </button>
                        {actionMenuId === d.id && actionMenuPos && createPortal(
                          <div className="fixed w-44 rounded-xl overflow-hidden shadow-xl z-[9999]" onClick={e => e.stopPropagation()} style={{ top: actionMenuPos.top, left: actionMenuPos.left, background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
                            <AM icon={<Eye size={12} />} label="View Details" onClick={() => { onView(d); setActionMenuId(null); }} />
                            <AM icon={<Pencil size={12} />} label="Edit Deal" onClick={() => { onEdit(d); setActionMenuId(null); }} />
                            <AM icon={<StickyNote size={12} />} label="Add Note" onClick={() => { onAddNote(d); setActionMenuId(null); }} />
                            <AM icon={<Bell size={12} />} label="Set Reminder" onClick={() => { onSetReminder(d); setActionMenuId(null); }} />
                            <AM icon={d.starred ? <StarOff size={12} /> : <Star size={12} />} label={d.starred ? "Unstar" : "Star"} onClick={() => { onToggleStar(d.id); setActionMenuId(null); }} />
                            <AM icon={<Copy size={12} />} label="Copy Title" onClick={() => { navigator.clipboard.writeText(d.title); toast.success("Copied"); setActionMenuId(null); }} />
                            <div style={{ borderTop: "1px solid var(--card-border)" }}>
                              <AM icon={<Trash2 size={12} />} label="Delete" danger onClick={() => { onDelete(d); setActionMenuId(null); }} />
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
