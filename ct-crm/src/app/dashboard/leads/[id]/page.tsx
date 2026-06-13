"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LeadDetailLoading from "./loading";
import {
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead as deleteLeadAction,
  addLeadNote,
  getLeadPipelineStatus,
  getLeadFollowUps,
  createLeadFollowUp,
  toggleLeadFollowUpDone,
  deleteLeadFollowUp,
  getLeadReminders,
  createLeadReminder,
  toggleLeadReminderDone,
} from "@/server/leads";
import { getTeamMembers } from "@/server/users";
import { getActivitiesForEntity, createActivity } from "@/server/activities";
import { convertLeadToProspect } from "@/server/prospects";
import { validateLeadForm, type LeadFormValues } from "@/lib/validations/lead";
import { validateProspectConversion, type ProspectConversionValues } from "@/lib/validations/prospect-conversion";
import { validateFollowUp, type FollowUpValues } from "@/lib/validations/follow-up";
import { validateReminder, type ReminderValues } from "@/lib/validations/reminder";
import { toast } from "sonner";
import {
  ArrowLeft, Star, StarOff, Pencil, Trash2, Phone, Mail, Calendar, Clock,
  Building, DollarSign, Tag, MapPin, Globe, Linkedin, MessageSquare,
  CheckCircle2, Plus, X, ChevronRight, Briefcase, Hash, Users, Save,
  PhoneCall, Video, StickyNote, AlertTriangle, ArrowRightCircle, Bell,
} from "lucide-react";

// ─── Types (mirrors src/app/dashboard/leads/page.tsx) ─────────────────────────
type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "QUALIFIED" | "REJECTED";

interface LeadNote {
  id: string;
  text: string;
  created_at: string;
  author?: string;
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
  stage: "lead" | "prospect" | "deal" | "contract" | "customer";
  prospect_id?: string;
  deal_id?: string;
  contract_id?: string;
  customer_id?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
// "QUALIFIED" is intentionally excluded — that transition is represented by the
// Convert-to-Prospect flow below, not a lead status.
const STAGES: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "REJECTED"];

const PIPELINE_STAGES: { key: PipelineStatus["stage"]; label: string }[] = [
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
export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus>({ stage: "lead" });
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFoundState] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<LeadFormValues | null>(null);
  const [ownerCustomMode, setOwnerCustomMode] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick-action: log call/email/meeting
  const [logType, setLogType] = useState<"call" | "email" | "meeting" | null>(null);
  const [logText, setLogText] = useState("");
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

  // Convert to Prospect
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState<ProspectConversionValues>({ budget: "", authority: "", need: "", timeline: "", industry: "", city: "" });
  const [convertTried, setConvertTried] = useState(false);
  const [converting, setConverting] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const leadRow = await getLeadById(id);
      if (!leadRow) {
        setNotFoundState(true);
        return;
      }
      setLead(leadRow as Lead);
      const [pipe, fus, acts, rems] = await Promise.all([
        getLeadPipelineStatus(id),
        getLeadFollowUps(id),
        getActivitiesForEntity("lead", id),
        getLeadReminders(),
      ]);
      setPipeline(pipe as PipelineStatus);
      setFollowUps(fus as FollowUp[]);
      setActivityLog(acts as ActivityItem[]);
      setReminders((rems as Reminder[]).filter((r) => r.lead_id === id));
    } catch {
      toast.error("Failed to load lead");
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    getTeamMembers().then(members => setTeamMembers(members.map(m => ({ id: m.id, full_name: m.full_name })))).catch(() => {});
  }, []);

  // ─── Live validation ─────────────────────────────────────────────────────
  const { valid: formValid, errors: formErrors } = form ? validateLeadForm(form) : { valid: true, errors: {} as Record<string, string> };
  const { valid: fuValid, errors: fuErrors } = validateFollowUp(fuForm);
  const { valid: remValid, errors: remErrors } = validateReminder(remForm);
  const { valid: convertValid, errors: convertErrors } = validateProspectConversion(convertForm);

  // ─── Edit ────────────────────────────────────────────────────────────────
  const startEdit = () => {
    if (!lead) return;
    setForm({
      first_name: lead.first_name, last_name: lead.last_name, email: lead.email, phone: lead.phone || "",
      company: lead.company || "", source: lead.source || "DIRECT", estimated_value: String(lead.estimated_value || ""),
      notes: lead.notes || "", website: lead.website || "", linkedin: lead.linkedin || "", city: lead.city || "",
      country: lead.country || "India", industry: lead.industry || "", employee_count: lead.employee_count || "",
      priority: (lead.priority || "medium") as LeadFormValues["priority"], status: lead.status, tags: (lead.tags || []).join(", "),
      owner_id: lead.owner_id || "", owner_name_custom: lead.owner_name_custom || "",
    });
    setOwnerCustomMode(!lead.owner_id && !!lead.owner_name_custom);
    setTriedSubmit(false);
    setEditMode(true);
  };

  const setF = (k: keyof LeadFormValues, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !form) return;
    if (!formValid) { setTriedSubmit(true); toast.error("Please fix the highlighted fields"); return; }
    setSavingEdit(true);
    const updates = {
      first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone,
      company: form.company, source: form.source, status: form.status, estimated_value: parseFloat(form.estimated_value) || 0,
      notes: form.notes, website: form.website, linkedin: form.linkedin, city: form.city, country: form.country,
      industry: form.industry, employee_count: form.employee_count, priority: form.priority,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      owner_id: form.owner_id || undefined,
      owner_name_custom: form.owner_id ? undefined : (form.owner_name_custom || undefined),
    };
    setLead((l) => (l ? { ...l, ...updates, owner_name: form.owner_id ? teamMembers.find((m) => m.id === form.owner_id)?.full_name : (form.owner_name_custom || undefined) } : l));
    try {
      await updateLead(lead.id, { ...updates, owner_id: form.owner_id || null, owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null) });
      toast.success("Lead updated");
      setEditMode(false);
    } catch {
      toast.error("Failed to update lead");
    } finally {
      setSavingEdit(false);
    }
  };

  // ─── Status & star ───────────────────────────────────────────────────────
  const handleStatusChange = async (next: LeadStatus) => {
    if (!lead) return;
    setLead((l) => (l ? { ...l, status: next } : l));
    try {
      await updateLeadStatus(lead.id, next);
      toast.success(`Status → ${next}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleToggleStar = () => {
    setLead((l) => (l ? { ...l, starred: !l.starred } : l));
  };

  // ─── Quick actions: log call / email / meeting (#10, #27) ──────────────────
  const handleLogActivity = async () => {
    if (!lead || !logType || !logText.trim()) return;
    setLogSubmitting(true);
    const text = logText.trim();
    try {
      const row = await createActivity({
        type: logType,
        related_type: "lead",
        related_id: lead.id,
        entity_name: `${lead.first_name} ${lead.last_name}`,
        description: text,
      });
      setActivityLog((p) => [
        { id: row.id, type: logType, description: text, user_name: "You", entity_type: "lead", entity_id: lead.id, entity_name: `${lead.first_name} ${lead.last_name}`, created_at: new Date().toISOString() },
        ...p,
      ]);
      toast.success(`Logged ${logType}`);
      setLogType(null);
      setLogText("");
    } catch {
      toast.error("Failed to log activity");
    } finally {
      setLogSubmitting(false);
    }
  };

  // ─── Notes ───────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    const text = newNote.trim();
    const temp: LeadNote = { id: Math.random().toString(36).slice(7), text, created_at: new Date().toISOString(), author: "You" };
    setLead((l) => (l ? { ...l, lead_notes: [temp, ...(l.lead_notes || [])] } : l));
    setNewNote("");
    try {
      const row = await addLeadNote(lead.id, text);
      setLead((l) => (l ? { ...l, lead_notes: l.lead_notes?.map((n) => (n.id === temp.id ? { ...n, id: row.id } : n)) } : l));
      toast.success("Note added");
    } catch {
      toast.error("Failed to save note");
    }
  };

  // ─── Follow-ups (#19, #20) ───────────────────────────────────────────────
  const handleCreateFollowUp = async () => {
    if (!lead) return;
    if (!fuValid) { setFuTried(true); return; }
    try {
      const row = await createLeadFollowUp(lead.id, fuForm);
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
      await toggleLeadFollowUpDone(fu.id, !fu.done);
    } catch {
      toast.error("Failed to update follow-up");
    }
  };

  const handleDeleteFollowUp = async (fuId: string) => {
    setFollowUps((p) => p.filter((f) => f.id !== fuId));
    try {
      await deleteLeadFollowUp(fuId);
    } catch {
      toast.error("Failed to delete follow-up");
    }
  };

  // ─── Reminders ───────────────────────────────────────────────────────────
  const handleCreateReminder = async () => {
    if (!lead) return;
    if (!remValid) { setRemTried(true); return; }
    const tempId = Math.random().toString(36).slice(7);
    const r: Reminder = { id: tempId, lead_id: lead.id, lead_name: `${lead.first_name} ${lead.last_name}`, title: remForm.title, type: remForm.type, datetime: remForm.datetime, note: remForm.note, done: false };
    setReminders((p) => [...p, r].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()));
    setRemForm({ title: "", type: "call", datetime: "", note: "" });
    setRemTried(false);
    setRemOpen(false);
    try {
      const row = await createLeadReminder({ entity_id: lead.id, entity_name: r.lead_name, title: r.title, type: r.type, datetime: r.datetime, note: r.note });
      setReminders((p) => p.map((x) => (x.id === tempId ? { ...x, id: row.id } : x)));
      toast.success("Reminder set");
    } catch {
      toast.error("Failed to set reminder");
    }
  };

  const handleToggleReminder = async (r: Reminder) => {
    setReminders((p) => p.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)));
    try {
      await toggleLeadReminderDone(r.id, !r.done);
    } catch {
      toast.error("Failed to update reminder");
    }
  };

  // ─── Convert to Prospect (#15) ──────────────────────────────────────────────
  const openConvert = () => {
    if (!lead) return;
    setConvertForm({ budget: lead.estimated_value ? String(lead.estimated_value) : "", authority: "", need: "", timeline: "", industry: lead.industry || "", city: lead.city || "" });
    setConvertTried(false);
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!lead) return;
    if (!convertValid) { setConvertTried(true); return; }
    setConverting(true);
    try {
      await convertLeadToProspect(lead.id, {
        budget: parseFloat(convertForm.budget) || 0,
        authority: convertForm.authority,
        need: convertForm.need,
        timeline: convertForm.timeline,
        industry: convertForm.industry,
        city: convertForm.city,
      });
      toast.success("Converted to Prospect!");
      setConvertOpen(false);
      router.push("/dashboard/prospects");
    } catch {
      toast.error("Failed to convert lead");
    } finally {
      setConverting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!lead) return;
    setDeleting(true);
    try {
      await deleteLeadAction(lead.id);
      toast.success("Lead deleted");
      router.push("/dashboard/leads");
    } catch {
      toast.error("Failed to delete lead");
      setDeleting(false);
    }
  };

  // ─── Loading / not-found ─────────────────────────────────────────────────
  if (loading) {
    return <LeadDetailLoading />;
  }

  if (notFound || !lead) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Link href="/dashboard/leads" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70" style={{ color: "var(--graph-to)" }}><ArrowLeft size={14} />Back to Leads</Link>
        <div className="rounded-2xl border p-10 text-center" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Lead not found</p>
          <p className="text-xs text-muted-foreground mt-1">It may have been deleted, or you don&apos;t have access to it.</p>
        </div>
      </div>
    );
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.key === pipeline.stage);
  const overdueFollowUps = followUps.filter((f) => isOverdue(f.due_date, f.done));
  const dueTodayFollowUps = followUps.filter((f) => isDueToday(f.due_date, f.done));
  const ringColor = overdueFollowUps.length > 0 ? "#ef4444" : dueTodayFollowUps.length > 0 ? "#eab308" : lead.starred ? "#a855f7" : undefined;

  const timeline = [
    ...activityLog.map((a) => ({ id: a.id, type: a.type, title: a.description, sub: a.user_name, created_at: a.created_at })),
    ...(lead.lead_notes || []).map((n) => ({ id: n.id, type: "note", title: n.text, sub: n.author || "You", created_at: n.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const scrollTo = (sectionId: string) => document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      {/* Back link */}
      <Link href="/dashboard/leads" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70 w-fit" style={{ color: "var(--graph-to)" }}><ArrowLeft size={14} />Back to Leads</Link>

      {/* ── HEADER ── */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: "linear-gradient(135deg,#a855f7,#00f2fe)", color: "#0a0a0a", boxShadow: ringColor ? `0 0 0 3px ${ringColor}` : undefined }}>
                {lead.first_name[0]}{lead.last_name[0]}
              </div>
              {(overdueFollowUps.length > 0 || dueTodayFollowUps.length > 0) && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: overdueFollowUps.length > 0 ? "#ef4444" : "#eab308", color: "#0a0a0a" }}>
                  {overdueFollowUps.length + dueTodayFollowUps.length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="cause-font text-xl font-bold" style={{ color: "var(--text-color)" }}>{lead.first_name} {lead.last_name}</h1>
                <button onClick={handleToggleStar} className="hover:opacity-70">{lead.starred ? <Star size={16} fill="#eab308" color="#eab308" /> : <StarOff size={16} className="text-muted-foreground" />}</button>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{lead.company || "No company"}{lead.industry ? ` · ${lead.industry}` : ""}</p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <select value={lead.status} onChange={(e) => handleStatusChange(e.target.value as LeadStatus)} className="px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer outline-none uppercase border" style={{ background: getStatusColor(lead.status).bg, color: getStatusColor(lead.status).text, borderColor: getStatusColor(lead.status).border }}>
                  {(STAGES.includes(lead.status) ? STAGES : [...STAGES, lead.status]).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase" style={{ background: getPriColor(lead.priority).bg, color: getPriColor(lead.priority).text }}>{lead.priority || "low"} priority</span>
                {lead.source && <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>{lead.source}</span>}
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

        {/* Pipeline breadcrumb (#21, #27) */}
        <div className="flex items-center gap-1 mt-4 flex-wrap">
          {PIPELINE_STAGES.map((s, i) => {
            const reached = i <= stageIndex;
            return (
              <div key={s.key} className="flex items-center gap-1">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase" style={{ background: reached ? "var(--graph-to)" : "var(--accent)", color: reached ? "#0a0a0a" : "var(--muted-foreground)" }}>{s.label}</span>
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
          {pipeline.stage === "lead" ? (
            <QuickActionButton icon={<ArrowRightCircle size={13} />} label="Convert to Prospect" onClick={openConvert} primary />
          ) : (
            <Link href="/dashboard/prospects" className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--graph-to)" }}><ArrowRightCircle size={13} />View Prospect</Link>
          )}
        </div>

        {/* Log activity inline form */}
        {logType && (
          <div className="mt-3 p-3 rounded-xl border" style={{ borderColor: "var(--card-border)", background: "var(--accent)" }}>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">What happened on this {logType}?</p>
            <textarea autoFocus rows={2} value={logText} onChange={(e) => setLogText(e.target.value)} className="ct-fi w-full" style={{ height: "auto", padding: "0.5rem 0.75rem" }} placeholder={`E.g. Discussed pricing, next steps...`} />
            <div className="flex gap-2 mt-2">
              <button onClick={handleLogActivity} disabled={logSubmitting || !logText.trim()} className="h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>{logSubmitting ? "Saving..." : `Log ${logType}`}</button>
              <button onClick={() => { setLogType(null); setLogText(""); }} className="h-8 px-3 rounded-lg text-xs font-semibold border" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
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
                  <button form="edit-lead-form" type="submit" disabled={savingEdit || !formValid} className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Save size={12} />{savingEdit ? "Saving..." : "Save Changes"}</button>
                </div>
              )}
            </div>

            {editMode && form ? (
              <form id="edit-lead-form" onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <EF label="First Name *" error={triedSubmit ? formErrors.first_name : undefined}><input value={form.first_name} onChange={(e) => setF("first_name", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Last Name *" error={triedSubmit ? formErrors.last_name : undefined}><input value={form.last_name} onChange={(e) => setF("last_name", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Email" error={triedSubmit ? formErrors.email : undefined}><input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Phone"><input value={form.phone} onChange={(e) => setF("phone", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Company"><input value={form.company} onChange={(e) => setF("company", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Industry"><input value={form.industry} onChange={(e) => setF("industry", e.target.value)} className="ct-fi" /></EF>
                  <EF label="City"><input value={form.city} onChange={(e) => setF("city", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Country"><input value={form.country} onChange={(e) => setF("country", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Website"><input value={form.website} onChange={(e) => setF("website", e.target.value)} className="ct-fi" /></EF>
                  <EF label="LinkedIn"><input value={form.linkedin} onChange={(e) => setF("linkedin", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Employees">
                    <select value={form.employee_count} onChange={(e) => setF("employee_count", e.target.value)} className="ct-fi">
                      <option value="">Select range</option>
                      {["1-10", "10-50", "50-100", "100-500", "500-1000", "1000+"].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </EF>
                  <EF label="Lead Source">
                    <select value={form.source} onChange={(e) => setF("source", e.target.value)} className="ct-fi">
                      {[["DIRECT", "Direct Form"], ["GOOGLE", "Google Ads"], ["META", "Meta Ads"], ["REFERRAL", "Referral"], ["WHATSAPP", "WhatsApp"], ["LINKEDIN", "LinkedIn"], ["EVENT", "Event"], ["OTHER", "Other"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </EF>
                  <EF label="Estimated Value (₹)" error={triedSubmit ? formErrors.estimated_value : undefined}><input type="number" value={form.estimated_value} onChange={(e) => setF("estimated_value", e.target.value)} className="ct-fi" /></EF>
                  <EF label="Priority">
                    <select value={form.priority} onChange={(e) => setF("priority", e.target.value as LeadFormValues["priority"])} className="ct-fi">
                      {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </EF>
                  <EF label="Owner">
                    <select
                      value={ownerCustomMode ? "__custom__" : form.owner_id}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setOwnerCustomMode(true);
                          setForm((f) => (f ? { ...f, owner_id: "" } : f));
                        } else {
                          setOwnerCustomMode(false);
                          setForm((f) => (f ? { ...f, owner_id: e.target.value, owner_name_custom: "" } : f));
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
                <EF label="Background Notes"><textarea rows={4} value={form.notes} onChange={(e) => setF("notes", e.target.value)} className="ct-fi" style={{ height: "auto", padding: "0.6rem 0.75rem" }} /></EF>
                <p className="text-[10px] text-muted-foreground">* Required. Provide at least an email or phone number so a rep can reach this lead.</p>
              </form>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <DS title="Contact">
                  <DR icon={<Mail size={12} />} label="Email">{lead.email ? <a href={`mailto:${lead.email}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{lead.email}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<Phone size={12} />} label="Phone">{lead.phone ? <a href={`tel:${lead.phone}`} className="hover:underline" style={{ color: "var(--graph-to)" }}>{lead.phone}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<Building size={12} />} label="Company"><span style={{ color: "var(--text-color)" }}>{lead.company || "—"}</span></DR>
                  <DR icon={<Globe size={12} />} label="Website">{lead.website ? <a href={`https://${lead.website}`} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "var(--graph-to)" }}>{lead.website}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<Linkedin size={12} />} label="LinkedIn">{lead.linkedin ? <a href={`https://${lead.linkedin}`} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "var(--graph-to)" }}>{lead.linkedin}</a> : <span className="text-muted-foreground">—</span>}</DR>
                  <DR icon={<MapPin size={12} />} label="Location"><span style={{ color: "var(--text-color)" }}>{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</span></DR>
                </DS>
                <DS title="Deal Info">
                  <DR icon={<DollarSign size={12} />} label="Est. Value"><span className="font-bold" style={{ color: "var(--graph-to)" }}>₹{(lead.estimated_value || 0).toLocaleString("en-IN")}</span></DR>
                  <DR icon={<Hash size={12} />} label="Industry"><span style={{ color: "var(--text-color)" }}>{lead.industry || "—"}</span></DR>
                  <DR icon={<Users size={12} />} label="Employees"><span style={{ color: "var(--text-color)" }}>{lead.employee_count || "—"}</span></DR>
                  <DR icon={<Briefcase size={12} />} label="Owner"><span style={{ color: "var(--text-color)" }}>{lead.owner_name || "Unassigned"}</span></DR>
                  <DR icon={<Calendar size={12} />} label="Created"><span style={{ color: "var(--text-color)" }}>{fmtDate(lead.created_at)}</span></DR>
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="flex items-start gap-2.5">
                      <div className="text-muted-foreground mt-0.5 shrink-0"><Tag size={12} /></div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Tags</span>
                        <div className="flex flex-wrap gap-1.5">{lead.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: "rgba(168,85,247,.12)", color: "#a855f7" }}>{t}</span>)}</div>
                      </div>
                    </div>
                  )}
                </DS>
                {lead.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Background Notes</p>
                    <p className="text-xs leading-relaxed rounded-xl border p-3" style={{ color: "var(--text-color)", borderColor: "var(--card-border)", background: "var(--accent)" }}>{lead.notes}</p>
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

          {/* Notes */}
          <section id="notes" className="rounded-2xl border p-5 scroll-mt-20" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h2 className="cause-font text-base font-bold mb-3" style={{ color: "var(--text-color)" }}>Notes</h2>
            <div className="flex gap-2 mb-4">
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddNote()} className="ct-fi flex-1" placeholder="Add a note..." />
              <button onClick={handleAddNote} disabled={!newNote.trim()} className="h-9 px-3 rounded-xl text-xs font-semibold disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Add</button>
            </div>
            {(lead.lead_notes?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {lead.lead_notes!.map((n) => (
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

      {/* ── CONVERT TO PROSPECT MODAL ── */}
      {convertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setConvertOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl t-modal-pop space-y-4" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>Convert to Prospect</h3>
              <button onClick={() => setConvertOpen(false)} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:opacity-70" style={{ borderColor: "var(--card-border)" }}><X size={14} /></button>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Capture BANT details — Budget, Authority, Need, Timeline — to qualify {lead.first_name} as a Prospect.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <EF label="Budget (₹) *" error={convertTried ? convertErrors.budget : undefined}><input type="number" value={convertForm.budget} onChange={(e) => setConvertForm((f) => ({ ...f, budget: e.target.value }))} className="ct-fi" placeholder="500000" /></EF>
              <EF label="Timeline *" error={convertTried ? convertErrors.timeline : undefined}><input value={convertForm.timeline} onChange={(e) => setConvertForm((f) => ({ ...f, timeline: e.target.value }))} className="ct-fi" placeholder="Next quarter" /></EF>
              <EF label="Decision Maker / Authority *" error={convertTried ? convertErrors.authority : undefined}><input value={convertForm.authority} onChange={(e) => setConvertForm((f) => ({ ...f, authority: e.target.value }))} className="ct-fi" placeholder="e.g. CTO sign-off" /></EF>
              <EF label="Industry *" error={convertTried ? convertErrors.industry : undefined}><input value={convertForm.industry} onChange={(e) => setConvertForm((f) => ({ ...f, industry: e.target.value }))} className="ct-fi" /></EF>
              <EF label="City *" error={convertTried ? convertErrors.city : undefined}><input value={convertForm.city} onChange={(e) => setConvertForm((f) => ({ ...f, city: e.target.value }))} className="ct-fi" /></EF>
              <EF label="Need / Pain Point *" error={convertTried ? convertErrors.need : undefined}><input value={convertForm.need} onChange={(e) => setConvertForm((f) => ({ ...f, need: e.target.value }))} className="ct-fi" placeholder="What problem are we solving?" /></EF>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConvertOpen(false)} className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
              <button onClick={handleConvert} disabled={converting || !convertValid} title={!convertValid ? "Fill in all BANT fields to enable conversion" : undefined} className="flex-1 h-11 rounded-xl font-semibold text-sm disabled:cursor-not-allowed" style={{ background: "var(--graph-to)", color: "#0a0a0a", opacity: (converting || !convertValid) ? 0.5 : 1 }}>{converting ? "Converting..." : "Convert"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm t-modal-backdrop" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl t-modal-pop" style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}>
            <h3 className="cause-font text-lg font-bold mb-2" style={{ color: "var(--text-color)" }}>Delete Lead?</h3>
            <p className="text-xs text-muted-foreground mb-4">This will permanently delete <strong>{lead.first_name} {lead.last_name}</strong> and all associated notes and reminders. This cannot be undone.</p>
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
