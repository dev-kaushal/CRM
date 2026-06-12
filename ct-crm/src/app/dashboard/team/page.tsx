"use client";

import { useEffect, useState } from "react";
import { getTeamMembers } from "@/server/users";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import {
  Search, Plus, Users, Shield, UserCheck, Mail, Phone,
  Target, DollarSign, Handshake, TrendingUp, MoreVertical, X
} from "lucide-react";

// ============================================
// Types
// ============================================
interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "rep";
  status: "active" | "inactive";
  avatar_url?: string;
  assigned_leads: number;
  open_deals: number;
  closed_deals: number;
  revenue_generated: number;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Admin", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  manager: { label: "Manager", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  rep: { label: "Sales Rep", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
};

// ============================================
// Fallback Demo Data
// ============================================
const FALLBACK_TEAM: TeamMember[] = [
  { id: "u1", full_name: "Amit Kumar", email: "amit@ctcrm.io", phone: "+91-9876543210", role: "admin", status: "active", assigned_leads: 18, open_deals: 6, closed_deals: 12, revenue_generated: 1850000, created_at: new Date(Date.now() - 86400000 * 365).toISOString() },
  { id: "u2", full_name: "Priya Sharma", email: "priya@ctcrm.io", phone: "+91-9876543211", role: "manager", status: "active", assigned_leads: 24, open_deals: 8, closed_deals: 15, revenue_generated: 2200000, created_at: new Date(Date.now() - 86400000 * 300).toISOString() },
  { id: "u3", full_name: "Rahul Verma", email: "rahul@ctcrm.io", phone: "+91-9876543212", role: "rep", status: "active", assigned_leads: 32, open_deals: 10, closed_deals: 8, revenue_generated: 980000, created_at: new Date(Date.now() - 86400000 * 180).toISOString() },
  { id: "u4", full_name: "Sneha Desai", email: "sneha@ctcrm.io", phone: "+91-9876543213", role: "rep", status: "active", assigned_leads: 20, open_deals: 5, closed_deals: 10, revenue_generated: 1450000, created_at: new Date(Date.now() - 86400000 * 150).toISOString() },
  { id: "u5", full_name: "Vikash Gupta", email: "vikash@ctcrm.io", phone: "+91-9876543214", role: "rep", status: "inactive", assigned_leads: 0, open_deals: 0, closed_deals: 6, revenue_generated: 520000, created_at: new Date(Date.now() - 86400000 * 400).toISOString() },
  { id: "u6", full_name: "Ananya Nair", email: "ananya@ctcrm.io", phone: "+91-9876543215", role: "manager", status: "active", assigned_leads: 15, open_deals: 4, closed_deals: 9, revenue_generated: 1100000, created_at: new Date(Date.now() - 86400000 * 90).toISOString() },
];

// ============================================
// Component
// ============================================
export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(FALLBACK_TEAM);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "rep">("rep");
  const [inviting, setInviting] = useState(false);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const rows = await getTeamMembers();
      if (rows.length > 0) setMembers(rows as TeamMember[]);
    } catch {
      console.warn("Using offline fallback team data.");
      setMembers(FALLBACK_TEAM);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) { toast.error("Email is required"); return; }
    setInviting(true);
    // In production this would send an invitation email
    const newMember: TeamMember = {
      id: `u-${Date.now()}`,
      full_name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole,
      status: "active",
      assigned_leads: 0,
      open_deals: 0,
      closed_deals: 0,
      revenue_generated: 0,
      created_at: new Date().toISOString(),
    };
    setMembers(prev => [newMember, ...prev]);
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviting(false);
    setIsInviteOpen(false);
    setInviteEmail("");
  };

  const filtered = members.filter(m => {
    const matchSearch = m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalRevenue = members.reduce((s, m) => s + m.revenue_generated, 0);
  const activeMembers = members.filter(m => m.status === "active").length;

  // Generate initials
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].substring(0, 2);
  };

  // Generate a consistent pastel color from name
  const getAvatarColor = (name: string) => {
    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#ef4444", "#eab308"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal team onboarding, role management, and performance tracking.</p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:scale-105"
          style={{ background: "var(--graph-to)", color: "#0a0a0a" }}
        >
          <Plus size={14} /> Invite Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Members", value: members.length.toString(), color: "var(--graph-to)", icon: Users },
          { label: "Active", value: activeMembers.toString(), color: "#10b981", icon: UserCheck },
          { label: "Team Revenue", value: `₹${(totalRevenue / 100000).toFixed(1)}L`, color: "#3b82f6", icon: DollarSign },
          { label: "Total Deals Won", value: members.reduce((s, m) => s + m.closed_deals, 0).toString(), color: "#8b5cf6", icon: Handshake },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 border transition-all duration-200 hover:shadow-md" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <s.icon size={14} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap p-2 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input type="text" placeholder="Search team members..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-9 pr-4 rounded-xl text-xs bg-transparent border placeholder:opacity-50"
            style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 rounded-xl text-xs border bg-transparent cursor-pointer"
          style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
          <option value="ALL">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="rep">Sales Rep</option>
        </select>
      </div>

      {/* Member Cards */}
      {loading ? (
        <WidgetWrapper loading><div /></WidgetWrapper>
      ) : filtered.length === 0 ? (
        <WidgetWrapper empty emptyTitle="No team members found" emptyDescription="Invite your first team member to get started."><div /></WidgetWrapper>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 view-transition">
          {filtered.map(member => {
            const roleConf = ROLE_CONFIG[member.role];
            const initials = getInitials(member.full_name).toUpperCase();
            const avatarColor = getAvatarColor(member.full_name);
            return (
              <div key={member.id}
                className="rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", opacity: member.status === "inactive" ? 0.55 : 1 }}>

                {/* Top: Avatar + Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: avatarColor + "20", color: avatarColor }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold truncate" style={{ color: "var(--text-color)" }}>{member.full_name}</h3>
                      {member.status === "active" && <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail size={10} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1"
                    style={{ background: roleConf.bg, color: roleConf.color }}>
                    <Shield size={9} /> {roleConf.label}
                  </span>
                  {member.status === "inactive" && (
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                      Inactive
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground ml-auto">
                    Joined {new Date(member.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
                  {[
                    { label: "Assigned Leads", value: member.assigned_leads, icon: Target, color: "#3b82f6" },
                    { label: "Open Deals", value: member.open_deals, icon: Handshake, color: "#f97316" },
                    { label: "Deals Won", value: member.closed_deals, icon: TrendingUp, color: "#10b981" },
                    { label: "Revenue", value: `₹${(member.revenue_generated / 100000).toFixed(1)}L`, icon: DollarSign, color: "#8b5cf6" },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg p-2.5" style={{ background: "var(--accent)" }}>
                      <div className="flex items-center gap-1 mb-1">
                        <stat.icon size={9} style={{ color: stat.color }} />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                      </div>
                      <p className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 t-modal-backdrop" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setIsInviteOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 border space-y-5 t-modal-pop" style={{ background: "var(--card-bg-solid)", borderColor: "var(--card-border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="cause-font text-lg font-bold" style={{ color: "var(--text-color)" }}>Invite Team Member</h2>
                <p className="text-xs text-muted-foreground mt-1">Send an invitation to join your organization.</p>
              </div>
              <button onClick={() => setIsInviteOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-lg transition-all hover:scale-110" style={{ color: "var(--muted-foreground)" }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address *</label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" type="email"
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as "admin" | "manager" | "rep")}
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent cursor-pointer" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
                  <option value="rep">Sales Rep</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsInviteOpen(false)}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold border transition-all hover:scale-105"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-color)" }}>Cancel</button>
                <button type="submit" disabled={inviting}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>
                  {inviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
