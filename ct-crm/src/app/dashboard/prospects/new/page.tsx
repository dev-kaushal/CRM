"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProspect } from "@/server/prospects";
import { getTeamMembers } from "@/server/users";
import { toast } from "sonner";
import { ArrowLeft, Save, X, UserCheck } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
type ProspectStatus = "QUALIFIED" | "PROPOSAL_SENT" | "IN_NEGOTIATION" | "DEAL_OPENED" | "LOST";

const STAGES: ProspectStatus[] = ["QUALIFIED", "PROPOSAL_SENT", "IN_NEGOTIATION", "DEAL_OPENED", "LOST"];
const SOURCE_OPTIONS = ["DIRECT", "GOOGLE", "META", "REFERRAL", "WHATSAPP", "EVENT", "OTHER"];
const TIMELINE_OPTS = ["Immediate (0-15 days)", "Near-Term (30-60 days)", "Mid-Term (90 days)", "Long-Term (6 months+)"];
const RATING_OPTIONS = ["Hot", "Warm", "Cold"];

interface TeamMember {
  id: string;
  full_name: string;
}

interface FormState {
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

const INITIAL_FORM: FormState = {
  first_name: "", last_name: "", email: "", phone: "", company: "", industry: "", city: "",
  budget: "", authority: false, need: "", timeline: TIMELINE_OPTS[1], status: "QUALIFIED",
  source: "DIRECT", rating: "Warm", project_name: "", tags: "", notes: "", owner_id: "", owner_name_custom: "",
};

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form: FormState) {
  const errors: Record<string, string> = {};
  if (!form.first_name.trim()) errors.first_name = "First name is required";
  if (!form.last_name.trim()) errors.last_name = "Last name is required";
  if (!form.email.trim() && !form.phone.trim()) errors.email = "Add an email or phone number so a rep can reach this prospect";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address";
  if (form.budget.trim() && (isNaN(Number(form.budget)) || Number(form.budget) < 0)) errors.budget = "Must be a positive number";
  return { valid: Object.keys(errors).length === 0, errors };
}

export default function NewProspectPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ownerCustomMode, setOwnerCustomMode] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTeamMembers().then((members) => setTeamMembers(members.map((m) => ({ id: m.id, full_name: m.full_name })))).catch(() => {});
  }, []);

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { valid, errors } = validate(form);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setTriedSubmit(true); toast.error("Please fix the highlighted fields"); return; }
    setSubmitting(true);
    try {
      const row = await createProspect({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        budget: parseFloat(form.budget) || 0,
        authority: form.authority,
        need: form.need.trim() || undefined,
        timeline: form.timeline,
        status: form.status,
        source: form.source,
        rating: form.rating || null,
        project_name: form.project_name.trim() || null,
        industry: form.industry.trim() || undefined,
        city: form.city.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        owner_id: form.owner_id || null,
        owner_name_custom: form.owner_id ? null : (form.owner_name_custom || null),
      });
      toast.success("Prospect created");
      router.push(`/dashboard/prospects/${row.id}`);
    } catch {
      toast.error("Failed to create prospect");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-10">
      {/* Back link */}
      <Link href="/dashboard/prospects" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-70 w-fit" style={{ color: "var(--graph-to)" }}><ArrowLeft size={14} />Back to Prospects</Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="cause-font text-xl font-bold" style={{ color: "var(--text-color)" }}>New Prospect</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/prospects" className="h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold hover:opacity-70" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}><X size={12} />Cancel</Link>
          <button form="new-prospect-form" type="submit" disabled={submitting} className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}><Save size={12} />{submitting ? "Saving..." : "Save Prospect"}</button>
        </div>
      </div>

      <form id="new-prospect-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <section className="rounded-2xl border p-5 space-y-3.5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Identity</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <EF label="First Name *" error={triedSubmit ? errors.first_name : undefined}><input value={form.first_name} onChange={(e) => setF("first_name", e.target.value)} className="pct-fi" placeholder="Vikram" /></EF>
            <EF label="Last Name *" error={triedSubmit ? errors.last_name : undefined}><input value={form.last_name} onChange={(e) => setF("last_name", e.target.value)} className="pct-fi" placeholder="Singh" /></EF>
            <EF label="Email" error={triedSubmit ? errors.email : undefined}><input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} className="pct-fi" /></EF>
            <EF label="Phone"><input value={form.phone} onChange={(e) => setF("phone", e.target.value)} className="pct-fi" /></EF>
            <EF label="Company"><input value={form.company} onChange={(e) => setF("company", e.target.value)} className="pct-fi" placeholder="Acme Corp" /></EF>
            <EF label="Industry"><input value={form.industry} onChange={(e) => setF("industry", e.target.value)} className="pct-fi" placeholder="Technology" /></EF>
            <EF label="City"><input value={form.city} onChange={(e) => setF("city", e.target.value)} className="pct-fi" placeholder="Mumbai" /></EF>
          </div>
          <p className="text-[10px] text-muted-foreground">* Required. Provide at least an email or phone number so a rep can reach this prospect.</p>
        </section>

        {/* BANT Qualification */}
        <section className="rounded-2xl border p-5 space-y-3.5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>BANT Qualification</h2>
          <EF label="Budget (₹)" error={triedSubmit ? errors.budget : undefined}><input type="number" value={form.budget} onChange={(e) => setF("budget", e.target.value)} className="pct-fi" placeholder="500000" /></EF>
          <div className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: "var(--card-border)", background: form.authority ? "rgba(16,185,129,.06)" : "var(--accent)" }} onClick={() => setF("authority", !form.authority)}>
            <input type="checkbox" checked={form.authority} onChange={() => {}} className="w-4 h-4 rounded cursor-pointer" />
            <div>
              <p className="text-xs font-bold" style={{ color: "var(--text-color)" }}>Decision Authority Verified</p>
              <p className="text-[10px] text-muted-foreground">Contact has budget sign-off power</p>
            </div>
            {form.authority && <UserCheck size={16} className="ml-auto text-emerald-500" />}
          </div>
          <EF label="Need / Pain Point"><textarea rows={3} value={form.need} onChange={(e) => setF("need", e.target.value)} className="pct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Describe requirements..." /></EF>
          <EF label="Timeline">
            <select value={form.timeline} onChange={(e) => setF("timeline", e.target.value)} className="pct-fi">
              {TIMELINE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </EF>
        </section>

        {/* Pipeline */}
        <section className="rounded-2xl border p-5 space-y-3.5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <h2 className="cause-font text-base font-bold" style={{ color: "var(--text-color)" }}>Pipeline</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <EF label="Stage">
              <select value={form.status} onChange={(e) => setF("status", e.target.value as ProspectStatus)} className="pct-fi">
                {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </EF>
            <EF label="Source">
              {(() => {
                const isCustom = !SOURCE_OPTIONS.includes(form.source);
                return (
                  <>
                    <select value={isCustom ? "__custom__" : form.source} onChange={(e) => setF("source", e.target.value === "__custom__" ? "" : e.target.value)} className="pct-fi">
                      {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      <option value="__custom__">+ Add custom source...</option>
                    </select>
                    {isCustom && (
                      <input value={form.source} onChange={(e) => setF("source", e.target.value)} className="pct-fi mt-2" placeholder="Type custom source" autoFocus />
                    )}
                  </>
                );
              })()}
            </EF>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <EF label="Rating">
              <select value={form.rating} onChange={(e) => setF("rating", e.target.value)} className="pct-fi">
                {RATING_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </EF>
            <EF label="Project / Opportunity"><input value={form.project_name} onChange={(e) => setF("project_name", e.target.value)} className="pct-fi" placeholder="e.g. Website Revamp" /></EF>
          </div>
          <EF label="Owner">
            {(() => {
              return (
                <>
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
                    className="pct-fi"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    <option value="__custom__">+ Add custom owner...</option>
                  </select>
                  {ownerCustomMode && (
                    <input value={form.owner_name_custom} onChange={(e) => setF("owner_name_custom", e.target.value)} className="pct-fi mt-2" placeholder="Type owner name" autoFocus />
                  )}
                </>
              );
            })()}
          </EF>
          <EF label="Tags (comma separated)"><input value={form.tags} onChange={(e) => setF("tags", e.target.value)} className="pct-fi" placeholder="Hot, Enterprise" /></EF>
          <EF label="Notes"><textarea rows={3} value={form.notes} onChange={(e) => setF("notes", e.target.value)} className="pct-fi" style={{ height: "auto", padding: ".5rem .75rem" }} placeholder="Key context..." /></EF>
        </section>

        <div className="flex gap-3">
          <Link href="/dashboard/prospects" className="flex-1 h-11 rounded-xl border font-semibold text-sm hover:opacity-75 flex items-center justify-center" style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</Link>
          <button type="submit" disabled={submitting} className="flex-1 h-11 rounded-xl font-semibold text-sm hover:opacity-80 active:scale-95 disabled:opacity-50" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>{submitting ? "Saving..." : "Create Prospect"}</button>
        </div>
      </form>

      <style jsx>{`
        .pct-fi {
          width: 100%;
          height: 2.5rem;
          border: 1px solid var(--card-border);
          border-radius: 0.75rem;
          padding: 0 0.75rem;
          font-size: 0.8125rem;
          outline: none;
          background: var(--accent);
          color: var(--text-color);
          transition: border-color .15s;
        }
        .pct-fi:focus { border-color: var(--graph-to); }
        .pct-fi::placeholder { color: var(--muted-foreground); opacity: .7; }
      `}</style>
    </div>
  );
}

// ─── Local helper components ───────────────────────────────────────────────
function EF({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: "var(--text-color)" }}>{label}</label>
      {children}
      {error && <p className="text-[10px] font-medium" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}
