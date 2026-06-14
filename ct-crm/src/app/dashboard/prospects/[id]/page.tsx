"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProspectDetailLoading from "./loading";
import {
  getProspectById,
  updateProspect,
  updateProspectStatus,
  deleteProspect as deleteProspectAction,
  addProspectNote,
  getProspectPipelineStatus,
  getProspectFollowUps,
  createProspectFollowUp,
  toggleProspectFollowUpDone,
  deleteProspectFollowUp,
  getProspectReminders,
  createProspectReminder,
} from "@/server/prospects";
import { toggleReminderDone, createReminder } from "@/server/calendar";
import { getTeamMembers } from "@/server/users";
import { getActivitiesForEntity, createActivity } from "@/server/activities";
import { buildDemoCadence, CadenceBoard } from "@/components/dashboard/widgets/cadence-board";
import { buildDemoChecklist, FollowupChecklist } from "@/components/dashboard/widgets/followup-checklist";
import { convertProspectToDeal } from "@/server/deals";
import { validateFollowUp, type FollowUpValues } from "@/lib/validations/follow-up";
import { validateReminder, type ReminderValues } from "@/lib/validations/reminder";
import { validateDealConversion, type DealConversionValues } from "@/lib/validations/deal-conversion";
import { toast } from "sonner";
import {
  ArrowLeft, Star, StarOff, Pencil, Trash2, Phone, Mail, Calendar, Clock,
  Building, DollarSign, Tag, MapPin, Hash, Briefcase, Save,
  CheckCircle2, AlertTriangle, UserCheck, Plus, X, ChevronRight,
  MessageSquare, PhoneCall, Video, StickyNote, ArrowRightCircle, Bell,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type ProspectStatus = "QUALIFIED" | "PROPOSAL_SENT" | "IN_NEGOTIATION" | "DEAL_OPENED" | "LOST";

interface PNote {
  id: string;
  text: string;
  created_at: string;
  author?: string;
}

interface Prospect {
  id: string;
  lead_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
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
  stage: "prospect" | "deal" | "contract" | "customer";
  lead_id?: string;
  deal_id?: string;
  contract_id?: string;
  customer_id?: string;
}

// ─── Form values ────────────────────────────────────────────────────────────
interface ProspectFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  city: string;
  budget: string;
  authority: boolean;
  need: string;
  timeline: string;
  status: ProspectStatus;
  source: string;
  rating: string;
  project_name: string;
  tags: string;
  notes: string;
  owner_id: string;
  owner_name_custom: string;
}

interface ConvertFormValues {
  title: string;
  value: string;
  stage: string;
  probability: string;
  expected_close_date: string;
  owner_id: string;
  owner_name_custom: string;
  company_name: string;
  tags: string;
}

function validateProspectForm(form: ProspectFormValues) {
  const errors: Record<string, string> = {};
  if (!form.first_name.trim()) errors.first_name = "First name is required";
  if (!form.last_name.trim()) errors.last_name = "Last name is required";
  if (!form.email.trim() && !form.phone.trim()) errors.email = "Add an email or phone number so a rep can reach this prospect";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address";
  if (form.budget.trim() && (isNaN(Number(form.budget)) || Number(form.budget) < 0)) errors.budget = "Must be a positive number";
  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const STAGES: ProspectStatus[] = ["QUALIFIED", "PROPOSAL_SENT", "IN_NEGOTIATION", "DEAL_OPENED", "LOST"];
const SOURCE_OPTIONS = ["DIRECT", "GOOGLE", "META", "REFERRAL", "WHATSAPP", "EVENT", "OTHER"];
const TIMELINE_OPTS = ["Immediate (0-15 days)", "Near-Term (30-60 days)", "Mid-Term (90 days)", "Long-Term (6 months+)"];
const RATING_OPTIONS = ["Hot", "Warm", "Cold"];
const DEAL_STAGE_OPTIONS = ["NEW", "PROPOSAL", "NEGOTIATION", "CONTRACT", "WON", "LOST"];

const PIPELINE_STAGES: { key: "lead" | PipelineStatus["stage"]; label: string }[] = [
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
export default function ProspectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id as string;

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus>({ stage: "prospect" });
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFoundState] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ProspectFormValues | null>(null);
  const [ownerCustomMode, setOwnerCustomMode] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick-action: log call/email/meeting
  const [logType, setLogType] = useState<"call" | "email" | "meeting" | null>(null);
  const [logText, setLogText] = useState("");
  const [logRelatedTo, setLogRelatedTo] = useState<"self" | "lead" | "deal" | "contract" | "customer">("self");
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

  // Convert to Deal
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState<ConvertFormValues>({ title: "", value: "", stage: "NEW", probability: "10", expected_close_date: "", owner_id: "", owner_name_custom: "", company_name: "", tags: "" });
  const [convertOwnerCustomMode, setConvertOwnerCustomMode] = useState(false);
  const [convertTried, setConvertTried] = useState(false);
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const prospectRow = await getProspectById(id);
      if (!prospectRow) {
        setNotFoundState(true);
        return;
      }
      setProspect(prospectRow as Prospect);
      const [pipe, fus, acts, rems] = await Promise.all([
        getProspectPipelineStatus(id),
        getProspectFollowUps(id),
        getActivitiesForEntity("prospect", id),
        getProspectReminders(),
      ]);
      setPipeline(pipe as PipelineStatus);
      setFollowUps(fus as FollowUp[]);
      setActivityLog(acts as ActivityItem[]);
      setReminders((rems as Reminder[]).filter((r) => r.p_id === id));
    } catch {
      toast.error("Failed to load prospect");
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
  const cadenceColumns = useMemo(() => buildDemoCadence(prospect?.id || id, "Prospects"), [prospect?.id, id]);
  const checklistItems = useMemo(() => buildDemoChecklist(prospect?.id || id), [prospect?.id, id]);

  // ─── Live validation ─────────────────────────────────────────────────────
  const { valid: formValid, errors: formErrors } = form ? validateProspectForm(form) : { valid: true, errors: {} as Record<string, string> };
  const { valid: fuValid, errors: fuErrors } = validateFollowUp(fuForm);
  const { valid: remValid, errors: remErrors } = validateReminder(remForm);

  // ─── Edit ────────────────────────────────────────────────────────────────
  const startEdit = () => {
    if (!prospect) return;
    setForm({
      first_name: prospect.first_name, last_name: prospect.last_name, email: prospect.email || "", phone: prospect.phone || "",
      company: prospect.company || "", industry: prospect.industry || "", city: prospect.city || "",
      budget: String(prospect.budget || ""), authority: prospect.authority || false, need: prospect.need || "",
      timeline: prospect.timeline || TIMELINE_OPTS[1], status: prospect.status, source: prospect.source || "DIRECT",
      rating: prospect.rating || "Warm", project_name: prospect.project_name || "",
      tags: (prospect.tags || []).join(", "), notes: prospect.notes || "",
      owner_id: prospect.owner_id || "", owner_name_custom: prospect.owner_name_custom || "",
    });
    setOwnerCustomMode(!prospect.owner_id && !!prospect.owner_name_custom);
    setTriedSubmit(false);
    setEditMode(true);
  };

  const setF = (k: keyof ProspectFormValues, v: string | boolean) => setForm((f) => (f ? { ...f, [k]: v } as ProspectFormValues : f));

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prospect || !form) return;
    if (!formValid) { setTriedSubmit(true); toast.error("Please fix the highlighted fields"); return; }
    setSavingEdit(true);
    const updates = {
      first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone,
      company: form.company, industry: form.industry, city: form.city,
      budget: parseFloat(form.budget) || 0, authority: form.authority, need: form.need, timeline: form.timeline,
      status: form.status, source: form.source, notes: form.notes,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      rating: form.rating, project_name: form.project_name,
      owner_id: form.owner_id || undefined,
      owner_name_custom: form.owner_id ? undefined : (form.owner_name_custom || undefined),
    };
    setProspect((p) => (p ? { ...p, ...updates, owner_name: form.owner_id ? teamMembers.find((m) => m.id === form.owner_id)?.full_name : (form.owner_name_custom || undefined) } : p));
    try {
      await updateProspect(prospect.id, {
        ...updates,
        rating: form.rating || null,
        project_name: form.project_name.trim() || null,
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
      });
      toast.success("Prospect updated");
      setEditMode(false);
    } catch {
      toast.error("Failed to update prospect");
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Status & star ───────────────────────────────────────────────────────
  const handleStatusChange = async (next: ProspectStatus) => {
    if (!prospect) return;
    setProspect((p) => (p ? { ...p, status: next } : p));
    try {
      await updateProspectStatus(prospect.id, next);
      toast.success(`Stage → ${next.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  const handleToggleStar = async () => {
    if (!prospect) return;
    const next = !prospect.starred;
    setProspect((p) => (p ? { ...p, starred: next } : p));
    try {
      await updateProspect(prospect.id, {
        first_name: prospect.first_name, last_name: prospect.last_name, email: prospect.email, phone: prospect.phone,
        company: prospect.company, budget: prospect.budget, authority: prospect.authority, need: prospect.need,
        timeline: prospect.timeline, status: prospect.status, source: prospect.source, industry: prospect.industry,
        city: prospect.city, notes: prospect.notes, tags: prospect.tags,
        rating: prospect.rating || null, project_name: prospect.project_name || null,
        owner_id: prospect.owner_id || null, owner_name_custom: prospect.owner_id ? null : (prospect.owner_name_custom || null),
      });
    } catch {
      toast.error("Failed to update");
      setProspect((p) => (p ? { ...p, starred: !next } : p));
    }
  };

  // ─── Quick actions: log call / email / meeting (#28) ────────────────────
  const handleLogActivity = async () => {
    if (!prospect || !logType || !logText.trim()) return;
    setLogSubmitting(true);
    const text = logText.trim();

    let relatedType = "prospect";
    let relatedId = prospect.id;
    let entityName = `${prospect.first_name} ${prospect.last_name}`;
    if (logRelatedTo === "lead" && pipeline.lead_id) { relatedType = "lead"; relatedId = pipeline.lead_id; entityName = `Lead for ${entityName}`; }
    else if (logRelatedTo === "deal" && pipeline.deal_id) { relatedType = "deal"; relatedId = pipeline.deal_id; entityName = `Deal for ${entityName}`; }
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
      if (relatedType === "prospect") {
        setActivityLog((p) => [
          { id: row.id, type: logType, description: text, user_name: "You", entity_type: "prospect", entity_id: prospect.id, entity_name: entityName, created_at: new Date().toISOString() },
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
    if (!prospect || !newNote.trim()) return;
    const text = newNote.trim();
    const temp: PNote = { id: Math.random().toString(36).slice(7), text, created_at: new Date().toISOString(), author: "You" };
    setProspect((p) => (p ? { ...p, pnotes: [temp, ...(p.pnotes || [])] } : p));
    setNewNote("");
    try {
      const row = await addProspectNote(prospect.id, text);
      setProspect((p) => (p ? { ...p, pnotes: p.pnotes?.map((n) => (n.id === temp.id ? { ...n, id: row.id } : n)) } : p));
      toast.success("Note added");
    } catch {
      toast.error("Failed to save note");
    }
  };

  // ─── Follow-ups ──────────────────────────────────────────────────────────
  const handleCreateFollowUp = async () => {
    if (!prospect) return;
    if (!fuValid) { setFuTried(true); return; }
    try {
      const row = await createProspectFollowUp(prospect.id, fuForm);
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
      await toggleProspectFollowUpDone(fu.id, !fu.done);
    } catch {
      toast.error("Failed to update follow-up");
    }
  };

  const handleDeleteFollowUp = async (fuId: string) => {
    setFollowUps((p) => p.filter((f) => f.id !== fuId));
    try {
      await deleteProspectFollowUp(fuId);
    } catch {
      toast.error("Failed to delete follow-up");
    }
  };

  // ─── Reminders ───────────────────────────────────────────────────────────
  const handleCreateReminder = async () => {
    if (!prospect) return;
    if (!remValid) { setRemTried(true); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, p_id: prospect.id, p_name: `${prospect.first_name} ${prospect.last_name}`, title: remForm.title, type: remForm.type, datetime: remForm.datetime, note: remForm.note, done: false };
    setReminders((p) => [...p, r].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
    setRemForm({ title: "", type: "call", datetime: "", note: "" });
    setRemTried(false);
    setRemOpen(false);
    try {
      const row = await createProspectReminder({ entity_id: prospect.id, entity_name: r.p_name, title: r.title, type: r.type, datetime: r.datetime, note: r.note });
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

  // ─── Convert to Deal ─────────────────────────────────────────────────────
  const openConvert = () => {
    if (!prospect) return;
    const fullName = `${prospect.first_name} ${prospect.last_name}`.trim();
    setConvertForm({
      title: prospect.project_name || `${prospect.company || fullName} Opportunity`,
      value: String(prospect.budget || 0),
      stage: "NEW",
      probability: "10",
      expected_close_date: "",
      owner_id: prospect.owner_id || "",
      owner_name_custom: prospect.owner_name_custom || "",
      company_name: prospect.company || "",
      tags: (prospect.tags || []).join(", "),
    });
    setConvertOwnerCustomMode(!prospect.owner_id && !!prospect.owner_name_custom);
    setConvertTried(false);
    setConvertOpen(true);
  };

  const setCF = (k: keyof ConvertFormValues, v: string) => setConvertForm((f) => ({ ...f, [k]: v }));

  const { valid: convertValid, errors: convertErrors } = validateDealConversion(convertForm as unknown as DealConversionValues);

  const handleConvertToDeal = async () => {
    if (!prospect) return;
    if (!convertValid) { setConvertTried(true); toast.error("Please fix the highlighted fields"); return; }
    setConvertSubmitting(true);
    try {
      const deal = await convertProspectToDeal(prospect.id, {
        title: convertForm.title.trim(),
        value: Number(convertForm.value) || 0,
        stage: convertForm.stage,
        probability: Number(convertForm.probability) || 0,
        expected_close_date: convertForm.expected_close_date || null,
        owner_id: convertForm.owner_id || null,
        owner_name_custom: convertForm.owner_id ? null : (convertForm.owner_name_custom || null),
        company_name: convertForm.company_name.trim() || undefined,
        tags: convertForm.tags ? convertForm.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      if (!deal) { toast.error("Failed to convert prospect"); return; }
      toast.success("Converted to deal");
      setConvertOpen(false);
      router.push("/dashboard/deals");
    } catch {
      toast.error("Failed to convert prospect");
    } finally {
      setConvertSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!prospect) return;
    setDeleting(true);
    try {
      await deleteProspectAction(prospect.id);
      toast.success("Prospect deleted");
      router.push("/dashboard/prospects");
    } catch {
      toast.error("Failed to delete prospect");
      setDeleting(false);
    }
  };

  // ─── Loading / not-found ─────────────────────────────────────────────────
  if (loading) {
    return <ProspectDetailLoading />;
  }

  if (notFound || !prospect) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Link href="/dashboard/prospects" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70" style={{ color: "var(--graph-to)" }}><ArrowLeft size={14} />Back to Prospects</Link>
        <div className="rounded-2xl border p-10 text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Prospect not found</p>
          <p className="text-xs text-muted-foreground mt-1">It may have been deleted, or you don&apos;t have access to it.</p>
        </div>
      </div>
    );
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  // Pipeline starts at "prospect" — the "lead" stage (index 0) is always
  // considered reached since every prospect originates from a lead.
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.key === pipeline.stage);
  const overdueFollowUps = followUps.filter((f) => isOverdue(f.due_date, f.done));
  const dueTodayFollowUps = followUps.filter((f) => isDueToday(f.due_date, f.done));
  const ringColor = overdueFollowUps.length > 0 ? "#ef4444" : dueTodayFollowUps.length > 0 ? "#eab308" : prospect.starred ? "#a855f7" : undefined;
  const auth = getAuthorityColor(prospect.authority);

  const timeline = [
    ...activityLog.map((a) => ({ id: a.id, type: a.type, title: a.description, sub: a.user_name, created_at: a.created_at })),
    ...(prospect.pnotes || []).map((n) => ({ id: n.id, type: "note", title: n.text, sub: n.author || "You", created_at: n.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const scrollTo = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Stage badge link helper for the pipeline breadcrumb
  const stageHref = (key: string): string | undefined => {
    if (key === "lead") return pipeline.lead_id ? `/dashboard/leads/${pipeline.lead_id}` : undefined;
    if (key === "deal") return pipeline.deal_id ? `/dashboard/deals` : undefined;
    if (key === "contract") return pipeline.contract_id ? `/dashboard/contracts` : undefined;
    if (key === "customer") return pipeline.customer_id ? `/dashboard/customers` : undefined;
    return undefined;
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* Back link */}
      <Link href="/dashboard/prospects" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70 w-fit" style={{ color: "var(--graph-to)" }}><ArrowLeft size={14} />Back to Prospects</Link>

      {/* ── HEADER ── */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a", boxShadow: ringColor ? `0 0 0 3px ${ringColor}` : undefined }}>
                {prospect.first_name[0]}{(prospect.last_name || "")[0]}
              </div>
              {(overdueFollowUps.length > 0 || dueTodayFollowUps.length > 0) && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: overdueFollowUps.length > 0 ? "#ef4444" : "#eab308", color: "#0a0a0a" }}>
                  {overdueFollowUps.length + dueTodayFollowUps.length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="cause-font text-xl font-bold" style={{ color: "var(--text-color)" }}>{prospect.first_name} {prospect.last_name}</h1>
                <button onClick={handleToggleStar} className="hover:opacity-70">{prospect.starred ? <Star size={16} fill="#eab308" color="#eab308" /> : <StarOff size={16} className="text-muted-foreground" />}</button>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{prospect.company || "No company"}{prospect.industry ? ` · ${prospect.industry}` : ""}</p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <select value={prospect.status} onChange={(e) => handleStatusChange(e.target.value as ProspectStatus)} className="px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer outline-none uppercase border" style={{ background: getStatusColor(prospect.status).bg, color: getStatusColor(prospect.status).text, borderColor: getStatusColor(prospect.status).border }}>
                  {(STAGES.includes(prospect.status) ? STAGES : [...STAGES, prospect.status]).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1" style={{ background: auth.bg, color: auth.text }}>{prospect.authority ? <><CheckCircle2 size={10} />Authority</> : <><AlertTriangle size={10} />No Authority</>}</span>
                <RatingBadge rating={prospect.rating} />
                {prospect.source && <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>{prospect.source}</span>}
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

        {/* BANT summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {[
            { label: "B — Budget", value: `₹${(prospect.budget || 0).toLocaleString("en-IN")}`, color: "var(--graph-to)" },
            { label: "A — Authority", value: prospect.authority ? "Confirmed" : "Unverified", color: prospect.authority ? "#10b981" : "#ef4444" },
            { label: "N — Need", value: prospect.need || "—", color: "var(--text-color)" },
            { label: "T — Timeline", value: prospect.timeline?.split(" (")[0] || "—", color: "var(--text-color)" },
          ].map((item) => (
            <div key={item.label} className="p-2.5 rounded-xl border" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
              <p className="text-xs font-semibold line-clamp-2" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
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
          {pipeline.stage === "prospect" ? (
            <QuickActionButton icon={<ArrowRightCircle size={13} />} label="Convert to Deal" onClick={openConvert} primary />
          ) : (
            <Link href="/dashboard/deals" className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--graph-to)" }}><ArrowRightCircle size={13} />View Deal</Link>
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
                  <option value="self">This Prospect</option>
                  {pipeline.lead_id && <option value="lead">Originating Lead</option>}
                  {pipeline.deal_id && <option value="deal">Deal</option>}
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
                  <button form="edit-prospect-form" type="submit" disabled={savingEdit || !formValid} className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Save size={12} />{savingEdit ? "Saving..." : "Save Changes"}</button>
                </div>
              )}
            </div>

            {editMode && form ? (
              <form id="edit-prospect-form" onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <EF label="First Name *" error={triedSubmit ? formErrors.first_name : undefined}><input value={form.first_name} onChange={(e) => setF("first_name", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Last Name *" error={triedSubmit ? formErrors.last_name : undefined}><input value={form.last_name} onChange={(e) => setF("last_name", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Email" error={triedSubmit ? formErrors.email : undefined}><input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Phone"><input value={form.phone} onChange={(e) => setF("phone", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Company"><input value={form.company} onChange={(e) => setF("company", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Industry"><input value={form.industry} onChange={(e) => setF("industry", e.target.value)} className="ct-fi" /></EF>
                  <EF label="City"><input value={form.city} onChange={(e) => setF("city", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Budget (₹)" error={triedSubmit ? formErrors.budget : undefined}><input type="number" value={form.budget} onChange={(e) => setF("budget", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Timeline">
                    <select value={form.timeline} onChange={(e) => setF("timeline", e.target.value)} className="ct-fi">
                      {TIMELINE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </EF>
                  <EF label="Stage">
                    <select value={form.status} onChange={(e) => setF("status", e.target.value as ProspectStatus)} className="ct-fi">
                      {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </EF>
                  <EF label="Source">
                    {(() => {
                      const isCustom = !SOURCE_OPTIONS.includes(form.source);
                      return (
                        <>
                          <select value={isCustom ? "__custom__" : form.source} onChange={(e) => setF("source", e.target.value === "__custom__" ? "" : e.target.value)} className="ct-fi">
                            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            <option value="__custom__">+ Add custom source...</option>
                          </select>
                          {isCustom && (
                            <input value={form.source} onChange={(e) => setF("source", e.target.value)} className="ct-fi mt-2" placeholder="Type custom source" autoFocus />
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
                  <EF label="Rating">
                    <select value={form.rating} onChange={(e) => setF("rating", e.target.value)} className="ct-fi">
                      {RATING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </EF>
                  <EF label="Project / Opportunity"><input value={form.project_name} onChange={(e) => setF("project_name", e.target.value)} className="ct-fi" placeholder="e.g. Website Revamp" /></EF>
                  <EF label="Tags (comma separated)"><input value={form.tags} onChange={(e) => setF("tags", e.target.value)} className="ct-fi" /></EF>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: "var(--card-border)", background: form.authority ? "rgba(16,185,129,.06)" : "var(--accent)" }} onClick={() => setF("authority", !form.authority)}>
                  <input type="checkbox" checked={form.authority} onChange={() => {}} className="w-4 h-4 rounded cursor-pointer" />
                  <div>
                    <p className="text-xs font-bold" style={{ color: "var(--text-color)" }}>Decision Authority Verified</p>
                    <p className="text-[10px] text-muted-foreground">Contact has budget sign-off power</p>
                  </div>
                  {form.authority && <UserCheck size={16} className="ml-auto text-emerald-500" />}
                </div>
                <EF label="Need / Pain Point"><textarea rows={3} value={form.need} onChange={(e) => setF("need", e.target.value)} className="ct-fi" style={{ height: "auto", padding: "0.6rem 0.75rem" }} /></EF>
                <EF label="Notes"><textarea rows={4} value={form.notes} onChange={(e) => setF("notes", e.target.value)} className="ct-fi" style={{ height: "auto", padding: "0.6rem 0.75rem" }} /></EF>
                <p className="text-[10px] text-muted-foreground">* Required. Provide at least an email or phone number so a rep can reach this prospect.</p>
              </form>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <DS title="Contact">
                  <DR icon={<Mail size={12} />} label="Email">{prospect.email ? <a href={`mailto:${prospect.email}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{prospect.email}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<Phone size={12} />} label="Phone">{prospect.phone ? <a href={`tel:${prospect.phone}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{prospect.phone}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<Building size={12} />} label="Company"><span style={{ color: "var(--text-color)" }}>{prospect.company || "—"}</span></DR>
                  <DR icon={<MapPin size={12} />} label="Location"><span style={{ color: "var(--text-color)" }}>{prospect.city || "—"}</span></DR>
                  <DR icon={<Hash size={12} />} label="Industry"><span style={{ color: "var(--text-color)" }}>{prospect.industry || "—"}</span></DR>
                </DS>
                <DS title="Deal Info">
                  <DR icon={<DollarSign size={12} />} label="Budget"><span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{(prospect.budget || 0).toLocaleString("en-IN")}</span></DR>
                  <DR icon={<Clock size={12} />} label="Timeline"><span style={{ color: "var(--text-color)" }}>{prospect.timeline || "—"}</span></DR>
                  <DR icon={<Briefcase size={12} />} label="Owner"><span style={{ color: "var(--text-color)" }}>{prospect.owner_name || "Unassigned"}</span></DR>
                  <DR icon={<Hash size={12} />} label="Project"><span style={{ color: "var(--text-color)" }}>{prospect.project_name || "—"}</span></DR>
                  <DR icon={<Calendar size={12} />} label="Qualified"><span style={{ color: "var(--text-color)" }}>{prospect.qualified_at ? fmtDate(prospect.qualified_at) : "—"}</span></DR>
                  {prospect.tags && prospect.tags.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <div className="text-muted-foreground mt-0.5 shrink-0"><Tag size={12} /></div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Tags</span>
                        <div className="flex flex-wrap gap-1.5">{prospect.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>
                      </div>
                    </div>
                  )}
                </DS>
                {prospect.need && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Need / Pain Point</p>
                    <p className="text-xs leading-relaxed rounded-xl border p-3" style={{ color: "var(--text-color)", borderColor: "var(--card-border)", background: "var(--accent)" }}>{prospect.need}</p>
                  </div>
                )}
                {prospect.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Background Notes</p>
                    <p className="text-xs leading-relaxed rounded-xl border p-3" style={{ color: "var(--text-color)", borderColor: "var(--card-border)", background: "var(--accent)" }}>{prospect.notes}</p>
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
            <p className="text-xs text-muted-foreground mb-3">Non-engaged Prospects Follow-up sequence</p>
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
            {(prospect.pnotes?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {prospect.pnotes!.map((n) => (
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

      {/* ── CONVERT TO DEAL MODAL ── */}
      {convertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setConvertOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl t-modal-pop space-y-4" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>Convert to Deal</h3>
              <button onClick={() => setConvertOpen(false)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={14} /></button>
            </div>

            <div className="space-y-3">
              <EF label="Deal Title *" error={convertTried ? convertErrors.title : undefined}>
                <input value={convertForm.title} onChange={(e) => setCF("title", e.target.value)} className="ct-fi" placeholder="e.g. Website Revamp Opportunity" />
              </EF>
              <div className="grid sm:grid-cols-2 gap-3">
                <EF label="Value (₹) *" error={convertTried ? convertErrors.value : undefined}>
                  <input type="number" value={convertForm.value} onChange={(e) => setCF("value", e.target.value)} className="ct-fi" placeholder="500000" />
                </EF>
                <EF label="Probability (%)" error={convertTried ? convertErrors.probability : undefined}>
                  <input type="number" min={0} max={100} value={convertForm.probability} onChange={(e) => setCF("probability", e.target.value)} className="ct-fi" />
                </EF>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <EF label="Stage">
                  <select value={convertForm.stage} onChange={(e) => setCF("stage", e.target.value)} className="ct-fi">
                    {DEAL_STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </EF>
                <EF label="Expected Close Date">
                  <input type="date" value={convertForm.expected_close_date} onChange={(e) => setCF("expected_close_date", e.target.value)} className="ct-fi" />
                </EF>
              </div>
              <EF label="Company Name">
                <input value={convertForm.company_name} onChange={(e) => setCF("company_name", e.target.value)} className="ct-fi" placeholder="Acme Corp" />
              </EF>
              <EF label="Owner">
                <select
                  value={convertOwnerCustomMode ? "__custom__" : convertForm.owner_id}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setConvertOwnerCustomMode(true);
                      setCF("owner_id", "");
                    } else {
                      setConvertOwnerCustomMode(false);
                      setCF("owner_id", e.target.value);
                      setCF("owner_name_custom", "");
                    }
                  }}
                  className="ct-fi"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  <option value="__custom__">+ Add custom owner...</option>
                </select>
                {convertOwnerCustomMode && (
                  <input value={convertForm.owner_name_custom} onChange={(e) => setCF("owner_name_custom", e.target.value)} className="ct-fi mt-2" placeholder="Type owner name" autoFocus />
                )}
              </EF>
              <EF label="Tags (comma separated)">
                <input value={convertForm.tags} onChange={(e) => setCF("tags", e.target.value)} className="ct-fi" placeholder="Hot, Enterprise" />
              </EF>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConvertOpen(false)} className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleConvertToDeal} disabled={convertSubmitting} className="flex-1 h-11 rounded-xl font-semibold text-sm hover:opacity-80 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><ArrowRightCircle size={14} />{convertSubmitting ? "Converting..." : "Convert to Deal"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <h3 className="cause-font text-lg font-bold mb-2" style={{ color: "var(--text-color)" }}>Delete Prospect?</h3>
            <p className="text-xs text-muted-foreground mb-4">This will permanently delete <strong>{prospect.first_name} {prospect.last_name}</strong> and all associated notes and reminders. This cannot be undone.</p>
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
function QuickActionButton({ icon, label, onClick, active, primary }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border hover:opacity-80" style={{ borderColor: active ? "var(--graph-to)" : primary ? "var(--graph-to)" : "var(--card-border)", background: active || primary ? "var(--graph-to)" : "transparent", color: active || primary ? "#0a0a0a" : "var(--text-color)" }}>
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
