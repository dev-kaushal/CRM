"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DealDetailLoading from "./loading";
import {
  getDealById,
  updateDeal,
  updateDealStage,
  toggleDealStar,
  deleteDeal as deleteDealAction,
  addDealNote,
  getDealPipelineStatus,
  getDealFollowUps,
  createDealFollowUp,
  toggleDealFollowUpDone,
  deleteDealFollowUp,
  getDealReminders,
} from "@/server/deals";
import { toggleReminderDone, createReminder } from "@/server/calendar";
import { getTeamMembers } from "@/server/users";
import { getActivitiesForEntity, createActivity } from "@/server/activities";
import { buildDemoCadence, CadenceBoard } from "@/components/dashboard/widgets/cadence-board";
import { buildDemoChecklist, FollowupChecklist } from "@/components/dashboard/widgets/followup-checklist";
import { DealStagePipeline } from "@/components/dashboard/widgets/deal-stage-bar";
import { convertDealToContract } from "@/server/contracts";
import { validateFollowUp, type FollowUpValues } from "@/lib/validations/follow-up";
import { validateReminder, type ReminderValues } from "@/lib/validations/reminder";
import { toast } from "sonner";
import { DEAL_STAGES, DEAL_TYPES, CONTACT_ROLES, TASK_PRIORITIES } from "@/lib/constants";
import {
  ArrowLeft, Star, StarOff, Pencil, Trash2, Mail, Calendar, Clock,
  Building, DollarSign, Tag, Hash, Briefcase, Save,
  CheckCircle2, AlertTriangle, UserCheck, Plus, X, ChevronRight,
  MessageSquare, PhoneCall, Video, StickyNote, ArrowRightCircle, Bell,
  TrendingUp, CalendarClock, FileText, MapPin, Award, Trophy, XCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type DealStage = "NEW" | "PROPOSAL" | "NEGOTIATION" | "CONTRACT" | "WON" | "LOST";

interface DNote {
  id: string;
  text: string;
  created_at: string;
  author?: string;
}

interface DealLead {
  first_name: string;
  last_name: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  employee_count?: string;
  priority?: string;
}

interface DealProspect {
  budget: number;
  authority: boolean;
  need?: string;
  timeline?: string;
  rating?: string;
  project_name?: string;
  industry?: string;
  city?: string;
}

interface Deal {
  id: string;
  lead_id: string;
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
  lead: DealLead;
  prospect?: DealProspect;
  dnotes: DNote[];
}

interface TeamMember {
  id: string;
  full_name: string;
}

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

interface FollowUp {
  id: string;
  title: string;
  type: "call" | "email" | "meeting" | "follow_up";
  notes: string;
  due_date: string;
  done: boolean;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user_name: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface PipelineStatus {
  stage: "deal" | "contract" | "customer";
  lead_id?: string;
  prospect_id?: string;
  contract_id?: string;
  customer_id?: string;
}

// ─── Form values ────────────────────────────────────────────────────────────
interface DealFormValues {
  title: string;
  company_name: string;
  value: string;
  stage: DealStage;
  probability: string;
  expected_close_date: string;
  type: string;
  next_step: string;
  contact_name: string;
  contact_role: string;
  campaign_source: string;
  priority: string;
  owner_id: string;
  owner_name_custom: string;
  tags: string;
  notes: string;
}

function validateDealForm(form: DealFormValues) {
  const errors: Record<string, string> = {};
  if (!form.title.trim()) errors.title = "Deal title is required";
  if (!form.value.trim() || isNaN(Number(form.value)) || Number(form.value) < 0) errors.value = "Enter a valid value";
  if (form.probability.trim() && (isNaN(Number(form.probability)) || Number(form.probability) < 0 || Number(form.probability) > 100)) errors.probability = "Must be between 0 and 100";
  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STAGES: DealStage[] = ["NEW", "PROPOSAL", "NEGOTIATION", "CONTRACT", "WON", "LOST"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CAMPAIGN_SOURCE_OPTIONS = [
  "Website", "Trade Show", "Webinar", "Cold Call", "Partner Referral", "Email Campaign", "Social Media", "Content Syndication",
];

const PIPELINE_STAGES: { key: "lead" | "prospect" | PipelineStatus["stage"]; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "prospect", label: "Prospect" },
  { key: "deal", label: "Deal" },
  { key: "contract", label: "Contract" },
  { key: "customer", label: "Customer" },
];

const TYPE_OPTIONS: { value: FollowUp["type"]; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "follow_up", label: "Follow-up" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
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

function getRatingColor(rating?: string) {
  const map: Record<string, { bg: string; text: string }> = {
    Hot: { bg: "rgba(239,68,68,.15)", text: "#ef4444" },
    Warm: { bg: "rgba(245,158,11,.15)", text: "#f59e0b" },
    Cold: { bg: "rgba(59,130,246,.15)", text: "#3b82f6" },
  };
  return map[rating || ""] ?? { bg: "rgba(0,0,0,.06)", text: "var(--muted-foreground)" };
}

function RatingBadge({ rating }: { rating?: string }) {
  if (!rating) return null;
  const c = getRatingColor(rating);
  return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase" style={{ background: c.bg, color: c.text }}>{rating}</span>;
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

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function isOverdue(dueDate: string, done: boolean) {
  return !done && new Date(dueDate).getTime() < Date.now();
}

function isDueToday(dueDate: string, done: boolean) {
  if (done) return false;
  const d = new Date(dueDate);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  call: <PhoneCall size={13} />,
  email: <Mail size={13} />,
  meeting: <Video size={13} />,
  note: <StickyNote size={13} />,
  status_change: <ArrowRightCircle size={13} />,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus>({ stage: "deal" });
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFoundState] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<DealFormValues | null>(null);
  const [ownerCustomMode, setOwnerCustomMode] = useState(false);
  const [campaignCustomMode, setCampaignCustomMode] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick-action: log call/email/meeting
  const [logType, setLogType] = useState<"call" | "email" | "meeting" | null>(null);
  const [logText, setLogText] = useState("");
  const [logRelatedTo, setLogRelatedTo] = useState<"self" | "lead" | "prospect" | "contract" | "customer">("self");
  const [logAddReminder, setLogAddReminder] = useState(false);
  const [logReminderDatetime, setLogReminderDatetime] = useState("");
  const [logSubmitting, setLogSubmitting] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState("");

  // Follow-ups
  const [fuOpen, setFuOpen] = useState(false);
  const [fuForm, setFuForm] = useState<FollowUpValues>({ title: "", type: "follow_up", due_date: "", notes: "" });
  const [fuTried, setFuTried] = useState(false);

  // Reminders
  const [remOpen, setRemOpen] = useState(false);
  const [remForm, setRemForm] = useState<ReminderValues>({ title: "", type: "call", datetime: "", note: "" });
  const [remTried, setRemTried] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const dealRow = await getDealById(id);
      if (!dealRow) {
        setNotFoundState(true);
        return;
      }
      setDeal(dealRow as Deal);
      const [pipe, fus, acts, rems] = await Promise.all([
        getDealPipelineStatus(id),
        getDealFollowUps(id),
        getActivitiesForEntity("deal", id),
        getDealReminders(),
      ]);
      setPipeline(pipe as PipelineStatus);
      setFollowUps(fus as FollowUp[]);
      setActivityLog(acts as ActivityItem[]);
      setReminders((rems as Reminder[]).filter((r) => r.p_id === id));
    } catch {
      toast.error("Failed to load deal");
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    getTeamMembers().then(members => setTeamMembers(members.map(m => ({ id: m.id, full_name: m.full_name })))).catch(() => {});
  }, []);

  // ─── Cadence & Checklist (demo data) ────────────────────────────────────
  const cadenceColumns = useMemo(() => buildDemoCadence(deal?.id || id, "Deals"), [deal?.id, id]);
  const checklistItems = useMemo(() => buildDemoChecklist(deal?.id || id), [deal?.id, id]);

  // ─── Live validation ─────────────────────────────────────────────────────
  const { valid: formValid, errors: formErrors } = form ? validateDealForm(form) : { valid: true, errors: {} as Record<string, string> };
  const { valid: fuValid, errors: fuErrors } = validateFollowUp(fuForm);
  const { valid: remValid, errors: remErrors } = validateReminder(remForm);

  // ─── Edit ────────────────────────────────────────────────────────────────
  const startEdit = () => {
    if (!deal) return;
    setForm({
      title: deal.title, company_name: deal.company_name || "",
      value: String(deal.value || ""), stage: deal.stage, probability: String(deal.probability ?? 10),
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.slice(0, 10) : "",
      type: deal.type || DEAL_TYPES[0], next_step: deal.next_step || "",
      contact_name: deal.contact_name || "", contact_role: deal.contact_role || "",
      campaign_source: deal.campaign_source || "", priority: deal.priority || "MEDIUM",
      tags: (deal.tags || []).join(", "), notes: deal.notes || "",
      owner_id: deal.owner_id || "", owner_name_custom: deal.owner_name_custom || "",
    });
    setOwnerCustomMode(!deal.owner_id && !!deal.owner_name_custom);
    setCampaignCustomMode(!!deal.campaign_source && !CAMPAIGN_SOURCE_OPTIONS.includes(deal.campaign_source));
    setTriedSubmit(false);
    setEditMode(true);
  };

  const setF = (k: keyof DealFormValues, v: string) => setForm((f) => (f ? { ...f, [k]: v } as DealFormValues : f));

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !form) return;
    if (!formValid) { setTriedSubmit(true); toast.error("Please fix the highlighted fields"); return; }
    setSavingEdit(true);
    const value = parseFloat(form.value) || 0;
    const probability = Number(form.probability) || 0;
    const updates = {
      title: form.title, company_name: form.company_name, value, stage: form.stage, probability,
      expected_close_date: form.expected_close_date || null, type: form.type, next_step: form.next_step,
      contact_name: form.contact_name, contact_role: form.contact_role, campaign_source: form.campaign_source,
      priority: form.priority, notes: form.notes,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      owner_id: form.owner_id || undefined,
      owner_name_custom: form.owner_id ? undefined : (form.owner_name_custom || undefined),
    };
    setDeal((d) => (d ? {
      ...d, ...updates,
      expected_close_date: form.expected_close_date || undefined,
      expected_revenue: Math.round((value * probability) / 100),
      owner_name: form.owner_id ? teamMembers.find((m) => m.id === form.owner_id)?.full_name : (form.owner_name_custom || undefined),
    } : d));
    try {
      await updateDeal(deal.id, {
        ...updates,
        expected_close_date: form.expected_close_date || null,
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
      });
      toast.success("Deal updated");
      setEditMode(false);
    } catch {
      toast.error("Failed to update deal");
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Stage & star ────────────────────────────────────────────────────────
  const handleStageChange = async (next: DealStage) => {
    if (!deal) return;
    const probability = getStageStyle(next).probability;
    setDeal((d) => (d ? { ...d, stage: next, probability, expected_revenue: Math.round((d.value * probability) / 100) } : d));
    try {
      await updateDealStage(deal.id, next, probability);
      toast.success(`Stage → ${getStageStyle(next).label}`);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  const handleToggleStar = async () => {
    if (!deal) return;
    const next = !deal.starred;
    setDeal((d) => (d ? { ...d, starred: next } : d));
    try {
      await toggleDealStar(deal.id, next);
    } catch {
      toast.error("Failed to update");
      setDeal((d) => (d ? { ...d, starred: !next } : d));
    }
  };

  const handleGenerateContract = async () => {
    if (!deal) return;
    setGeneratingContract(true);
    try {
      const result = await convertDealToContract(deal.id);
      if (!result) throw new Error("not found");
      setPipeline((p) => ({ ...p, stage: "contract", contract_id: result.id }));
      toast.success("Contract generated");
    } catch {
      toast.error("Failed to generate contract");
    } finally {
      setGeneratingContract(false);
    }
  };

  // ─── Quick actions: log call / email / meeting ──────────────────────────
  const handleLogActivity = async () => {
    if (!deal || !logType || !logText.trim()) return;
    setLogSubmitting(true);
    const text = logText.trim();

    let relatedType = "deal";
    let relatedId = deal.id;
    let entityName = deal.title;
    if (logRelatedTo === "lead" && pipeline.lead_id) { relatedType = "lead"; relatedId = pipeline.lead_id; entityName = `Lead for ${entityName}`; }
    else if (logRelatedTo === "prospect" && pipeline.prospect_id) { relatedType = "prospect"; relatedId = pipeline.prospect_id; entityName = `Prospect for ${entityName}`; }
    else if (logRelatedTo === "contract" && pipeline.contract_id) { relatedType = "contract"; relatedId = pipeline.contract_id; entityName = `Contract for ${entityName}`; }
    else if (logRelatedTo === "customer" && pipeline.customer_id) { relatedType = "customer"; relatedId = pipeline.customer_id; entityName = `Customer ${entityName}`; }

    try {
      const row = await createActivity({
        type: logType,
        related_type: relatedType,
        related_id: relatedId,
        entity_name: entityName,
        description: text,
      });
      if (relatedType === "deal") {
        setActivityLog((p) => [
          { id: row.id, type: logType, description: text, user_name: "You", entity_type: "deal", entity_id: deal.id, entity_name: entityName, created_at: new Date().toISOString() },
          ...p,
        ]);
      }
      if (logAddReminder && logReminderDatetime) {
        await createReminder(relatedType, relatedId, entityName, {
          title: `${logType.charAt(0).toUpperCase() + logType.slice(1)} follow-up`,
          type: logType,
          datetime: logReminderDatetime,
          note: text,
        });
        toast.success("Reminder added to calendar");
      }
      toast.success(`Logged ${logType}`);
      setLogType(null);
      setLogText("");
      setLogRelatedTo("self");
      setLogAddReminder(false);
      setLogReminderDatetime("");
    } catch {
      toast.error("Failed to log activity");
    } finally {
      setLogSubmitting(false);
    }
  };

  // ─── Notes ───────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!deal || !newNote.trim()) return;
    const text = newNote.trim();
    const temp: DNote = { id: Math.random().toString(36).slice(7), text, created_at: new Date().toISOString(), author: "You" };
    setDeal((d) => (d ? { ...d, dnotes: [temp, ...(d.dnotes || [])] } : d));
    setNewNote("");
    try {
      const row = await addDealNote(deal.id, text);
      setDeal((d) => (d ? { ...d, dnotes: d.dnotes?.map((n) => (n.id === temp.id ? { ...n, id: row.id } : n)) } : d));
      toast.success("Note added");
    } catch {
      toast.error("Failed to save note");
    }
  };

  // ─── Follow-ups ──────────────────────────────────────────────────────────
  const handleCreateFollowUp = async () => {
    if (!deal) return;
    if (!fuValid) { setFuTried(true); return; }
    try {
      const row = await createDealFollowUp(deal.id, fuForm);
      setFollowUps((p) => [...p, { id: row.id, title: fuForm.title, type: fuForm.type, notes: fuForm.notes, due_date: fuForm.due_date, done: false, created_at: new Date().toISOString() }]
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()));
      toast.success("Follow-up scheduled");
      setFuForm({ title: "", type: "follow_up", due_date: "", notes: "" });
      setFuTried(false);
      setFuOpen(false);
    } catch {
      toast.error("Failed to schedule follow-up");
    }
  };

  const handleToggleFollowUp = async (fu: FollowUp) => {
    setFollowUps((p) => p.map((f) => (f.id === fu.id ? { ...f, done: !f.done } : f)));
    try {
      await toggleDealFollowUpDone(fu.id, !fu.done);
    } catch {
      toast.error("Failed to update follow-up");
    }
  };

  const handleDeleteFollowUp = async (fuId: string) => {
    setFollowUps((p) => p.filter((f) => f.id !== fuId));
    try {
      await deleteDealFollowUp(fuId);
    } catch {
      toast.error("Failed to delete follow-up");
    }
  };

  // ─── Reminders ───────────────────────────────────────────────────────────
  const handleCreateReminder = async () => {
    if (!deal) return;
    if (!remValid) { setRemTried(true); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, p_id: deal.id, p_name: deal.title, title: remForm.title, type: remForm.type, datetime: remForm.datetime, note: remForm.note, done: false };
    setReminders((p) => [...p, r].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
    setRemForm({ title: "", type: "call", datetime: "", note: "" });
    setRemTried(false);
    setRemOpen(false);
    try {
      const row = await createReminder("deal", deal.id, r.p_name, { title: r.title, type: r.type, datetime: r.datetime, note: r.note });
      setReminders((p) => p.map((x) => (x.id === tempId ? { ...x, id: row.id } : x)));
      toast.success("Reminder set");
    } catch {
      toast.error("Failed to set reminder");
    }
  };

  const handleToggleReminder = async (r: Reminder) => {
    setReminders((p) => p.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)));
    try {
      await toggleReminderDone(r.id, !r.done);
    } catch {
      toast.error("Failed to update reminder");
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deal) return;
    setDeleting(true);
    try {
      await deleteDealAction(deal.id);
      toast.success("Deal deleted");
      router.push("/dashboard/deals");
    } catch {
      toast.error("Failed to delete deal");
      setDeleting(false);
    }
  };

  // ─── Loading / not-found ─────────────────────────────────────────────────
  if (loading) {
    return <DealDetailLoading />;
  }

  if (notFound || !deal) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Link href="/dashboard/deals" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70" style={{ color: "var(--graph-to)" }}><ArrowLeft size={14} />Back to Deals</Link>
        <div className="rounded-2xl border p-10 text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Deal not found</p>
          <p className="text-xs text-muted-foreground mt-1">It may have been deleted, or you don&apos;t have access to it.</p>
        </div>
      </div>
    );
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.key === pipeline.stage);
  const overdueFollowUps = followUps.filter((f) => isOverdue(f.due_date, f.done));
  const dueTodayFollowUps = followUps.filter((f) => isDueToday(f.due_date, f.done));
  const ringColor = overdueFollowUps.length > 0 ? "#ef4444" : dueTodayFollowUps.length > 0 ? "#eab308" : deal.starred ? "#a855f7" : undefined;
  const stageStyle = getStageStyle(deal.stage);
  const priorityStyle = getPriorityStyle(deal.priority);

  const timeline = [
    ...activityLog.map((a) => ({ id: a.id, type: a.type, title: a.description, sub: a.user_name, created_at: a.created_at })),
    ...(deal.dnotes || []).map((n) => ({ id: n.id, type: "note", title: n.text, sub: n.author || "You", created_at: n.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const scrollTo = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Stage badge link helper for the pipeline breadcrumb
  const stageHref = (key: string): string | undefined => {
    if (key === "lead") return pipeline.lead_id ? `/dashboard/leads/${pipeline.lead_id}` : undefined;
    if (key === "prospect") return pipeline.prospect_id ? `/dashboard/prospects/${pipeline.prospect_id}` : undefined;
    if (key === "contract") return pipeline.contract_id ? `/dashboard/contracts` : undefined;
    if (key === "customer") return pipeline.customer_id ? `/dashboard/customers` : undefined;
    return undefined;
  };

  // Avatar initials from company name, falling back to deal title
  const initialsSource = deal.company_name || deal.title;
  const initials = initialsSource.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* Back link */}
      <Link href="/dashboard/deals" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70 w-fit" style={{ color: "var(--graph-to)" }}><ArrowLeft size={14} />Back to Deals</Link>

      {/* ── HEADER ── */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a", boxShadow: ringColor ? `0 0 0 3px ${ringColor}` : undefined }}>
                {initials || "DL"}
              </div>
              {(overdueFollowUps.length > 0 || dueTodayFollowUps.length > 0) && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: overdueFollowUps.length > 0 ? "#ef4444" : "#eab308", color: "#0a0a0a" }}>
                  {overdueFollowUps.length + dueTodayFollowUps.length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="cause-font text-xl font-bold" style={{ color: "var(--text-color)" }}>{deal.title}</h1>
                <button onClick={handleToggleStar} className="hover:opacity-70">{deal.starred ? <Star size={16} fill="#eab308" color="#eab308" /> : <StarOff size={16} className="text-muted-foreground" />}</button>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{deal.company_name || "No company"}{deal.type ? ` · ${deal.type}` : ""}</p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <select value={deal.stage} onChange={(e) => handleStageChange(e.target.value as DealStage)} className="px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer outline-none uppercase border" style={{ background: stageStyle.bg, color: stageStyle.text, borderColor: stageStyle.border }}>
                  {STAGES.map((s) => <option key={s} value={s}>{getStageStyle(s).label}</option>)}
                </select>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase" style={{ background: priorityStyle.bg, color: priorityStyle.text }}>{priorityStyle.label}</span>
                {deal.campaign_source && <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>{deal.campaign_source}</span>}
                {overdueFollowUps.length > 0 && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1" style={{ background: "rgba(239,68,68,.12)", color: "#ef4444" }}><AlertTriangle size={10} />{overdueFollowUps.length} overdue</span>}
                {dueTodayFollowUps.length > 0 && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1" style={{ background: "rgba(234,179,8,.12)", color: "#eab308" }}><Clock size={10} />{dueTodayFollowUps.length} due today</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && <button onClick={startEdit} className="h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><Pencil size={12} />Edit</button>}
            <button onClick={() => setDeleteOpen(true)} className="h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ borderColor: "rgba(239,68,68,.3)", color: "#ef4444" }}><Trash2 size={12} />Delete</button>
          </div>
        </div>

        {/* Commercial-terms summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {[
            { label: "Value", value: `₹${deal.value.toLocaleString("en-IN")}`, color: "var(--graph-to)" },
            { label: "Probability", value: `${deal.probability}%`, color: "var(--text-color)" },
            { label: "Expected Close", value: deal.expected_close_date ? fmtDate(deal.expected_close_date) : "—", color: "var(--text-color)" },
            { label: "Owner", value: deal.owner_name || "Unassigned", color: "var(--text-color)" },
          ].map((item) => (
            <div key={item.label} className="p-2.5 rounded-xl border" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
              <p className="text-xs font-semibold line-clamp-2" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Stage pipeline bar */}
        <div className="mt-4">
          <DealStagePipeline stage={deal.stage} onStageClick={handleStageChange} />
        </div>

        {/* Pipeline breadcrumb */}
        <div className="flex items-center gap-1 mt-4 flex-wrap">
          {PIPELINE_STAGES.map((s, i) => {
            const reached = i <= stageIndex;
            const href = stageHref(s.key);
            const badge = (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase" style={{ background: reached ? "var(--graph-to)" : "var(--accent)", color: reached ? "#0a0a0a" : "var(--muted-foreground)" }}>{s.label}</span>
            );
            return (
              <div key={s.key} className="flex items-center gap-1">
                {href ? <Link href={href} className="hover:opacity-80">{badge}</Link> : badge}
                {i < PIPELINE_STAGES.length - 1 && <ChevronRight size={12} className="text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* Quick action bar */}
        <div className="flex flex-wrap gap-2 mt-4">
          <QuickActionButton icon={<PhoneCall size={13} />} label="Log Call" onClick={() => setLogType("call")} active={logType === "call"} />
          <QuickActionButton icon={<Mail size={13} />} label="Log Email" onClick={() => setLogType("email")} active={logType === "email"} />
          <QuickActionButton icon={<Video size={13} />} label="Log Meeting" onClick={() => setLogType("meeting")} active={logType === "meeting"} />
          <QuickActionButton icon={<Bell size={13} />} label="Set Reminder" onClick={() => { setRemOpen(true); scrollTo("reminders"); }} />
          <QuickActionButton icon={<Calendar size={13} />} label="Schedule Follow-up" onClick={() => { setFuOpen(true); scrollTo("followups"); }} />
          {deal.stage !== "WON" && <QuickActionButton icon={<Trophy size={13} />} label="Mark Won" onClick={() => handleStageChange("WON")} primary />}
          {deal.stage !== "LOST" && <QuickActionButton icon={<XCircle size={13} />} label="Mark Lost" onClick={() => handleStageChange("LOST")} />}
          {pipeline.contract_id ? (
            <Link href="/dashboard/contracts" className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--graph-to)" }}><FileText size={13} />View Contract</Link>
          ) : deal.stage === "WON" && (
            <QuickActionButton icon={<FileText size={13} />} label={generatingContract ? "Generating..." : "Generate Contract"} onClick={handleGenerateContract} disabled={generatingContract} />
          )}
        </div>

        {/* Log activity inline form */}
        {logType && (
          <div className="mt-3 p-3 rounded-xl border space-y-2" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">What happened on this {logType}?</p>
            <textarea autoFocus rows={2} value={logText} onChange={(e) => setLogText(e.target.value)} className="ct-fi w-full" style={{ height: "auto", padding: "0.5rem 0.75rem" }} placeholder={`E.g. Discussed pricing, next steps...`} />
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--text-color)" }}>Related To</label>
                <select value={logRelatedTo} onChange={(e) => setLogRelatedTo(e.target.value as typeof logRelatedTo)} className="ct-fi">
                  <option value="self">This Deal</option>
                  {pipeline.lead_id && <option value="lead">Originating Lead</option>}
                  {pipeline.prospect_id && <option value="prospect">Originating Prospect</option>}
                  {pipeline.contract_id && <option value="contract">Contract</option>}
                  {pipeline.customer_id && <option value="customer">Customer</option>}
                </select>
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer" style={{ color: "var(--text-color)" }}>
                  <input type="checkbox" checked={logAddReminder} onChange={(e) => setLogAddReminder(e.target.checked)} className="w-3.5 h-3.5" />
                  Add reminder for this
                </label>
              </div>
            </div>
            {logAddReminder && (
              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--text-color)" }}>Reminder Date & Time</label>
                <input type="datetime-local" value={logReminderDatetime} onChange={(e) => setLogReminderDatetime(e.target.value)} className="ct-fi" />
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={handleLogActivity} disabled={logSubmitting || !logText.trim() || (logAddReminder && !logReminderDatetime)} className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>{logSubmitting ? "Saving..." : `Log ${logType}`}</button>
              <button onClick={() => { setLogType(null); setLogText(""); setLogRelatedTo("self"); setLogAddReminder(false); setLogReminderDatetime(""); }} className="h-8 px-3 rounded-lg text-xs font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── BODY: side-nav + sections ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "180px 1fr" }}>
        {/* Side nav */}
        <div className="hidden md:block">
          <div className="sticky top-20 space-y-1 rounded-2xl border p-2" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            {[
              { id: "overview", label: "Overview" },
              { id: "activity", label: "Activity" },
              { id: "followups", label: "Follow-ups" },
              { id: "cadence", label: "Cadence" },
              { id: "checklist", label: "Checklist" },
              { id: "notes", label: "Notes" },
              { id: "reminders", label: "Reminders" },
            ].map((s) => (
              <button key={s.id} onClick={() => scrollTo(s.id)} className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-80" style={{ color: "var(--text-color)" }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-5 min-w-0">
          {/* Overview */}
          <section id="overview" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Overview</h2>
              {editMode && (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="h-8 px-3 rounded-lg text-xs font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                  <button form="edit-deal-form" type="submit" disabled={savingEdit || !formValid} className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Save size={12} />{savingEdit ? "Saving..." : "Save Changes"}</button>
                </div>
              )}
            </div>

            {editMode && form ? (
              <form id="edit-deal-form" onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <EF label="Deal Title *" error={triedSubmit ? formErrors.title : undefined}><input value={form.title} onChange={(e) => setF("title", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Company"><input value={form.company_name} onChange={(e) => setF("company_name", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Value (₹) *" error={triedSubmit ? formErrors.value : undefined}><input type="number" value={form.value} onChange={(e) => setF("value", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Stage">
                    <select value={form.stage} onChange={(e) => { const ns = e.target.value as DealStage; setF("stage", ns); setF("probability", String(getStageStyle(ns).probability)); }} className="ct-fi">
                      {STAGES.map((s) => <option key={s} value={s}>{getStageStyle(s).label}</option>)}
                    </select>
                  </EF>
                  <EF label="Probability (%)" error={triedSubmit ? formErrors.probability : undefined}><input type="number" min={0} max={100} value={form.probability} onChange={(e) => setF("probability", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Expected Close Date"><input type="date" value={form.expected_close_date} onChange={(e) => setF("expected_close_date", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Type">
                    <select value={form.type} onChange={(e) => setF("type", e.target.value)} className="ct-fi">
                      {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </EF>
                  <EF label="Priority">
                    <select value={form.priority} onChange={(e) => setF("priority", e.target.value)} className="ct-fi">
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{getPriorityStyle(p).label}</option>)}
                    </select>
                  </EF>
                  <EF label="Contact Name"><input value={form.contact_name} onChange={(e) => setF("contact_name", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Contact Role">
                    <select value={form.contact_role} onChange={(e) => setF("contact_role", e.target.value)} className="ct-fi">
                      <option value="">—</option>
                      {CONTACT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </EF>
                  <EF label="Campaign Source">
                    {(() => {
                      const isCustom = campaignCustomMode || (!!form.campaign_source && !CAMPAIGN_SOURCE_OPTIONS.includes(form.campaign_source));
                      return (
                        <>
                          <select value={isCustom ? "__custom__" : form.campaign_source} onChange={(e) => { if (e.target.value === "__custom__") { setCampaignCustomMode(true); setF("campaign_source", ""); } else { setCampaignCustomMode(false); setF("campaign_source", e.target.value); } }} className="ct-fi">
                            <option value="">—</option>
                            {CAMPAIGN_SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            <option value="__custom__">+ Add custom source...</option>
                          </select>
                          {isCustom && (
                            <input value={form.campaign_source} onChange={(e) => setF("campaign_source", e.target.value)} className="ct-fi mt-2" placeholder="Type custom source" autoFocus />
                          )}
                        </>
                      );
                    })()}
                  </EF>
                  <EF label="Owner">
                    <select
                      value={ownerCustomMode ? "__custom__" : form.owner_id}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setOwnerCustomMode(true);
                          setF("owner_id", "");
                        } else {
                          setOwnerCustomMode(false);
                          setF("owner_id", e.target.value);
                          setF("owner_name_custom", "");
                        }
                      }}
                      className="ct-fi"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      <option value="__custom__">+ Add custom owner...</option>
                    </select>
                    {ownerCustomMode && (
                      <input value={form.owner_name_custom} onChange={(e) => setF("owner_name_custom", e.target.value)} className="ct-fi mt-2" placeholder="Type owner name" autoFocus />
                    )}
                  </EF>
                  <EF label="Tags (comma separated)"><input value={form.tags} onChange={(e) => setF("tags", e.target.value)} className="ct-fi" /></EF>
                </div>
                <EF label="Next Step"><input value={form.next_step} onChange={(e) => setF("next_step", e.target.value)} className="ct-fi" placeholder="e.g. Send revised proposal" /></EF>
                <EF label="Notes"><textarea rows={4} value={form.notes} onChange={(e) => setF("notes", e.target.value)} className="ct-fi" style={{ height: "auto", padding: "0.6rem 0.75rem" }} /></EF>
              </form>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <DS title="Deal Info">
                  <DR icon={<Building size={12} />} label="Company"><span style={{ color: "var(--text-color)" }}>{deal.company_name || "—"}</span></DR>
                  <DR icon={<Briefcase size={12} />} label="Type"><span style={{ color: "var(--text-color)" }}>{deal.type || "—"}</span></DR>
                  <DR icon={<UserCheck size={12} />} label="Contact">{deal.contact_name ? <span style={{ color: "var(--text-color)" }}>{deal.contact_name}{deal.contact_role ? ` (${deal.contact_role})` : ""}</span> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<ArrowRightCircle size={12} />} label="Next Step"><span style={{ color: "var(--text-color)" }}>{deal.next_step || "—"}</span></DR>
                  <DR icon={<Calendar size={12} />} label="Created"><span style={{ color: "var(--text-color)" }}>{fmtDate(deal.created_at)}</span></DR>
                </DS>
                <DS title="Pipeline & Value">
                  <DR icon={<DollarSign size={12} />} label="Value"><span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{deal.value.toLocaleString("en-IN")}</span></DR>
                  <DR icon={<TrendingUp size={12} />} label="Expected Revenue"><span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{deal.expected_revenue.toLocaleString("en-IN")}</span></DR>
                  <DR icon={<Hash size={12} />} label="Probability"><span style={{ color: "var(--text-color)" }}>{deal.probability}%</span></DR>
                  <DR icon={<CalendarClock size={12} />} label="Expected Close"><span style={{ color: "var(--text-color)" }}>{deal.expected_close_date ? fmtDate(deal.expected_close_date) : "—"}</span></DR>
                  <DR icon={<Briefcase size={12} />} label="Owner"><span style={{ color: "var(--text-color)" }}>{deal.owner_name || "Unassigned"}</span></DR>
                  {deal.tags && deal.tags.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <div className="text-muted-foreground mt-0.5 shrink-0"><Tag size={12} /></div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Tags</span>
                        <div className="flex flex-wrap gap-1.5">{deal.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>
                      </div>
                    </div>
                  )}
                </DS>
                <DS title="Originating Lead">
                  <DR icon={<UserCheck size={12} />} label="Contact"><span style={{ color: "var(--text-color)" }}>{deal.lead.first_name} {deal.lead.last_name}</span></DR>
                  <DR icon={<Mail size={12} />} label="Email">{deal.lead.email ? <a href={`mailto:${deal.lead.email}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{deal.lead.email}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<Building size={12} />} label="Website">{deal.lead.website ? <a href={deal.lead.website} target="_blank" rel="noreferrer" className="hover:underline truncate" style={{ color: "var(--graph-to)" }}>{deal.lead.website}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<Hash size={12} />} label="Employees"><span style={{ color: "var(--text-color)" }}>{deal.lead.employee_count || "—"}</span></DR>
                </DS>
                {deal.prospect && (
                  <DS title="Originating Prospect (BANT)">
                    <DR icon={<DollarSign size={12} />} label="Budget"><span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{(deal.prospect.budget || 0).toLocaleString("en-IN")}</span></DR>
                    <DR icon={<CheckCircle2 size={12} />} label="Authority"><span style={{ color: deal.prospect.authority ? "#10b981" : "#ef4444" }}>{deal.prospect.authority ? "Confirmed" : "Unverified"}</span></DR>
                    <DR icon={<Clock size={12} />} label="Timeline"><span style={{ color: "var(--text-color)" }}>{deal.prospect.timeline?.split(" (")[0] || "—"}</span></DR>
                    <DR icon={<MapPin size={12} />} label="Location"><span style={{ color: "var(--text-color)" }}>{deal.prospect.city || "—"}</span></DR>
                    <DR icon={<Hash size={12} />} label="Industry"><span style={{ color: "var(--text-color)" }}>{deal.prospect.industry || "—"}</span></DR>
                    <DR icon={<Award size={12} />} label="Rating"><RatingBadge rating={deal.prospect.rating} /></DR>
                    {deal.prospect.need && (
                      <div className="flex items-start gap-2.5">
                        <div className="text-muted-foreground mt-0.5 shrink-0"><MessageSquare size={12} /></div>
                        <div className="flex-1 min-w-0"><span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Need</span><div className="text-xs" style={{ color: "var(--text-color)" }}>{deal.prospect.need}</div></div>
                      </div>
                    )}
                  </DS>
                )}
                {deal.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Background Notes</p>
                    <p className="text-xs leading-relaxed rounded-xl border p-3" style={{ color: "var(--text-color)", borderColor: "var(--card-border)", background: "var(--accent)" }}>{deal.notes}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Activity Timeline */}
          <section id="activity" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h2 className="cause-font text-base font-bold mb-3" style={{ color: "var(--text-color)" }}>Activity Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet. Log a call, email, or meeting above to get started.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5" style={{ background: "var(--accent)", color: "var(--graph-to)" }}>{ACTIVITY_ICON[item.type] || <MessageSquare size={13} />}</div>
                    <div className="flex-1 min-w-0 pb-3 border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase" style={{ color: "var(--graph-to)" }}>{item.type.replace("_", " ")}</span>
                        <span className="text-[9px] text-muted-foreground">· {item.sub} · {timeAgo(item.created_at)}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-color)" }}>{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Follow-ups */}
          <section id="followups" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Follow-ups</h2>
              <button onClick={() => setFuOpen((o) => !o)} className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={12} />New Follow-up</button>
            </div>

            {fuOpen && (
              <div className="mb-4 p-3 rounded-xl border space-y-2.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <EF label="Title *" error={fuTried ? fuErrors.title : undefined}><input value={fuForm.title} onChange={(e) => setFuForm((f) => ({ ...f, title: e.target.value }))} className="ct-fi" placeholder="Send proposal" /></EF>
                  <EF label="Type">
                    <select value={fuForm.type} onChange={(e) => setFuForm((f) => ({ ...f, type: e.target.value as FollowUp["type"] }))} className="ct-fi">
                      {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </EF>
                  <EF label="Due Date *" error={fuTried ? fuErrors.due_date : undefined}><input type="date" value={fuForm.due_date} onChange={(e) => setFuForm((f) => ({ ...f, due_date: e.target.value }))} className="ct-fi" /></EF>
                  <EF label="Notes"><input value={fuForm.notes} onChange={(e) => setFuForm((f) => ({ ...f, notes: e.target.value }))} className="ct-fi" /></EF>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateFollowUp} disabled={!fuValid} className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save</button>
                  <button onClick={() => { setFuOpen(false); setFuTried(false); }} className="h-8 px-3 rounded-lg text-xs font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                </div>
              </div>
            )}

            {followUps.length === 0 ? (
              <p className="text-xs text-muted-foreground">No follow-ups scheduled.</p>
            ) : (
              <div className="space-y-2">
                {followUps.map((fu) => {
                  const overdue = isOverdue(fu.due_date, fu.done);
                  const today = isDueToday(fu.due_date, fu.done);
                  return (
                    <div key={fu.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: overdue ? "rgba(239,68,68,.3)" : today ? "rgba(234,179,8,.3)" : "var(--card-border)", background: overdue ? "rgba(239,68,68,.06)" : today ? "rgba(234,179,8,.06)" : "transparent" }}>
                      <button onClick={() => handleToggleFollowUp(fu)} className="shrink-0">{fu.done ? <CheckCircle2 size={16} style={{ color: "#10b981" }} /> : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: overdue ? "#ef4444" : today ? "#eab308" : "var(--card-border)" }} />}</button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: fu.done ? "line-through" : "none" }}>{fu.title}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDate(fu.due_date)}{fu.notes ? ` · ${fu.notes}` : ""}</p>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{fu.type.replace("_", " ")}</span>
                      <button onClick={() => handleDeleteFollowUp(fu.id)} className="shrink-0 hover:opacity-70"><X size={13} className="text-muted-foreground" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Cadence Board */}
          <section id="cadence" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Engagement Cadence</h2>
            <p className="text-xs text-muted-foreground mb-3">Deal follow-through sequence</p>
            <CadenceBoard columns={cadenceColumns} />
          </section>

          {/* Follow-up Checklist */}
          <section id="checklist" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h2 className="cause-font text-base font-bold mb-3" style={{ color: "var(--text-color)" }}>Follow-up Checklist</h2>
            <FollowupChecklist items={checklistItems} />
          </section>

          {/* Notes */}
          <section id="notes" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h2 className="cause-font text-base font-bold mb-3" style={{ color: "var(--text-color)" }}>Notes</h2>
            <div className="flex gap-2 mb-4">
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddNote()} className="ct-fi flex-1" placeholder="Add a note..." />
              <button onClick={handleAddNote} disabled={!newNote.trim()} className="h-9 px-3 rounded-xl text-xs font-semibold disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Add</button>
            </div>
            {(deal.dnotes?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {deal.dnotes!.map((n) => (
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
          </section>

          {/* Reminders */}
          <section id="reminders" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Reminders</h2>
              <button onClick={() => setRemOpen((o) => !o)} className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Plus size={12} />New Reminder</button>
            </div>

            {remOpen && (
              <div className="mb-4 p-3 rounded-xl border space-y-2.5" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <EF label="Title *" error={remTried ? remErrors.title : undefined}><input value={remForm.title} onChange={(e) => setRemForm((f) => ({ ...f, title: e.target.value }))} className="ct-fi" placeholder="Follow-up call" /></EF>
                  <EF label="Type">
                    <select value={remForm.type} onChange={(e) => setRemForm((f) => ({ ...f, type: e.target.value as ReminderValues["type"] }))} className="ct-fi">
                      {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </EF>
                  <EF label="Date & Time *" error={remTried ? remErrors.datetime : undefined}><input type="datetime-local" value={remForm.datetime} onChange={(e) => setRemForm((f) => ({ ...f, datetime: e.target.value }))} className="ct-fi" /></EF>
                  <EF label="Note"><input value={remForm.note} onChange={(e) => setRemForm((f) => ({ ...f, note: e.target.value }))} className="ct-fi" /></EF>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateReminder} disabled={!remValid} className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Save</button>
                  <button onClick={() => { setRemOpen(false); setRemTried(false); }} className="h-8 px-3 rounded-lg text-xs font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                </div>
              </div>
            )}

            {reminders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No reminders set.</p>
            ) : (
              <div className="space-y-2">
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border" style={{ borderColor: r.done ? "var(--card-border)" : "rgba(234,179,8,.3)", background: r.done ? "transparent" : "rgba(234,179,8,.06)" }}>
                    <button onClick={() => handleToggleReminder(r)} className="shrink-0">{r.done ? <CheckCircle2 size={14} style={{ color: "#10b981" }} /> : <Clock size={14} style={{ color: "#eab308" }} />}</button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--text-color)", textDecoration: r.done ? "line-through" : "none" }}>{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDateTime(r.datetime)}{r.note ? ` · ${r.note}` : ""}</p>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{r.type.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── DELETE MODAL ── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <h3 className="cause-font text-lg font-bold mb-2" style={{ color: "var(--text-color)" }}>Delete Deal?</h3>
            <p className="text-xs text-muted-foreground mb-4">This will permanently delete <strong>{deal.title}</strong> and all associated notes and reminders. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 h-10 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 h-10 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: "#ef4444", color: "#fff" }}>{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ct-fi {
          height: 2.25rem;
          width: 100%;
          padding: 0 0.75rem;
          border-radius: 0.75rem;
          font-size: 0.75rem;
          background: var(--card-bg-solid);
          border: 1px solid var(--card-border);
          color: var(--text-color);
          outline: none;
        }
        .ct-fi:focus { border-color: var(--graph-to); }
      `}</style>
    </div>
  );
}

// ─── Local helper components ───────────────────────────────────────────────
function QuickActionButton({ icon, label, onClick, active, primary, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed" style={{ borderColor: active ? "var(--graph-to)" : primary ? "var(--graph-to)" : "var(--card-border)", background: active || primary ? "var(--graph-to)" : "transparent", color: active || primary ? "#0a0a0a" : "var(--text-color)" }}>
      {icon}{label}
    </button>
  );
}

function DS({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
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

function EF({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>
      {children}
      {error && <p className="text-[10px] font-medium" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}
