"use client";

import { useEffect, useState } from "react";
import { getOrganization, updateOrganizationName } from "@/server/organizations";
import { toast } from "sonner";
import {
  Building, Globe, Plug, Shield, Bell, Palette, Save, ExternalLink,
  Check, X, Lock, Key, Monitor, Smartphone, Clock, Mail, Calendar,
  MessageSquare, Zap, Type, Hash, CalendarDays, ListFilter
} from "lucide-react";
import { ViewSwitcher } from "@/components/dashboard/view-switcher";

// ============================================
// Types
// ============================================
interface OrgSettings {
  name: string;
  slug: string;
  logo_url: string;
  timezone: string;
  currency: string;
  primary_color: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Mail;
  connected: boolean;
  status: string;
}

interface CustomField {
  id: string;
  entity: string;
  field_name: string;
  field_type: "text" | "number" | "date" | "select";
  required: boolean;
}

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

interface Session {
  id: string;
  device: string;
  location: string;
  last_active: string;
  current: boolean;
  icon: typeof Monitor;
}

// ============================================
// Demo Data
// ============================================
const DEMO_ORG: OrgSettings = {
  name: "CT-CRM Enterprise",
  slug: "ct-crm",
  logo_url: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  primary_color: "#0891b2",
};

const DEMO_INTEGRATIONS: Integration[] = [
  { id: "i1", name: "WhatsApp Business", description: "Connect WhatsApp Business API for automated messaging and lead capture.", icon: MessageSquare, connected: true, status: "Active" },
  { id: "i2", name: "Email SMTP", description: "Configure SMTP relay for transactional emails and automated follow-ups.", icon: Mail, connected: true, status: "Active" },
  { id: "i3", name: "Google Calendar", description: "Sync meetings, tasks, and deadlines with Google Calendar.", icon: Calendar, connected: false, status: "Not Connected" },
  { id: "i4", name: "Zapier", description: "Connect with 5000+ apps for workflow automation and data sync.", icon: Zap, connected: false, status: "Not Connected" },
];

const DEMO_CUSTOM_FIELDS: CustomField[] = [
  { id: "cf1", entity: "Leads", field_name: "Company Size", field_type: "select", required: false },
  { id: "cf2", entity: "Leads", field_name: "Industry", field_type: "text", required: true },
  { id: "cf3", entity: "Leads", field_name: "Annual Revenue", field_type: "number", required: false },
  { id: "cf4", entity: "Deals", field_name: "Contract Duration", field_type: "number", required: true },
  { id: "cf5", entity: "Deals", field_name: "Implementation Date", field_type: "date", required: false },
  { id: "cf6", entity: "Contacts", field_name: "Preferred Language", field_type: "select", required: false },
  { id: "cf7", entity: "Contacts", field_name: "LinkedIn URL", field_type: "text", required: false },
];

const DEMO_NOTIFICATIONS: NotificationSetting[] = [
  { id: "n1", label: "Deal Won", description: "Notify when a deal is marked as Won.", email: true, push: true },
  { id: "n2", label: "Lead Assigned", description: "Notify when a new lead is assigned to you.", email: true, push: true },
  { id: "n3", label: "Task Due", description: "Remind before a task due date.", email: true, push: false },
  { id: "n4", label: "Contract Expiring", description: "Alert when a contract is expiring within 30 days.", email: true, push: true },
  { id: "n5", label: "Weekly Report", description: "Receive a weekly performance summary email.", email: true, push: false },
  { id: "n6", label: "New Team Member", description: "Notify when a new team member joins.", email: false, push: true },
];

const DEMO_SESSIONS: Session[] = [
  { id: "s1", device: "Chrome on Windows", location: "Mumbai, India", last_active: "Now", current: true, icon: Monitor },
  { id: "s2", device: "Safari on iPhone", location: "Mumbai, India", last_active: "2 hours ago", current: false, icon: Smartphone },
];

const FIELD_TYPE_CONFIG: Record<string, { icon: typeof Type; color: string }> = {
  text: { icon: Type, color: "#3b82f6" },
  number: { icon: Hash, color: "#f97316" },
  date: { icon: CalendarDays, color: "#8b5cf6" },
  select: { icon: ListFilter, color: "#10b981" },
};

const TABS = [
  { id: "organization", label: "Organization", icon: Building },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "custom-fields", label: "Custom Fields", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

// ============================================
// Component
// ============================================
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("organization");
  const [org, setOrg] = useState<OrgSettings>(DEMO_ORG);
  const [integrations, setIntegrations] = useState(DEMO_INTEGRATIONS);
  const [customFields] = useState(DEMO_CUSTOM_FIELDS);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const [sessions] = useState(DEMO_SESSIONS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOrganization()
      .then((row) => setOrg(row))
      .catch(() => console.warn("Using offline fallback organization data."));
  }, []);

  const handleSaveOrg = async () => {
    setSaving(true);
    try {
      await updateOrganizationName(org.name);
      toast.success("Organization settings saved");
    } catch {
      toast.error("Failed to save organization settings");
    }
    setSaving(false);
  };

  const toggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.id === id) {
        const newConnected = !i.connected;
        toast.success(newConnected ? `${i.name} connected` : `${i.name} disconnected`);
        return { ...i, connected: newConnected, status: newConnected ? "Active" : "Not Connected" };
      }
      return i;
    }));
  };

  const toggleNotification = (id: string, type: "email" | "push") => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, [type]: !n[type] } : n));
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">System configuration — organization, integrations, custom fields, and security. Admin only.</p>
      </div>

      {/* Tab Navigation */}
      <ViewSwitcher
        value={activeTab}
        onChange={setActiveTab}
        options={TABS.map(tab => ({ id: tab.id, label: tab.label, icon: <tab.icon size={14} /> }))}
      />

      {/* Tab Content */}
      {activeTab === "organization" && (
        <div key="organization" className="rounded-2xl border p-6 space-y-6 view-transition" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Organization Profile</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Manage your organization details and preferences.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company Name</label>
              <input value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })}
                className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Organization Slug</label>
              <input value={org.slug} disabled
                className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent opacity-50 cursor-not-allowed" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Timezone</label>
              <select value={org.timezone} onChange={e => setOrg({ ...org, timezone: e.target.value })}
                className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent cursor-pointer" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Currency</label>
              <select value={org.currency} onChange={e => setOrg({ ...org, currency: e.target.value })}
                className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent cursor-pointer" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logo URL</label>
              <input value={org.logo_url} onChange={e => setOrg({ ...org, logo_url: e.target.value })} placeholder="https://..."
                className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={handleSaveOrg} disabled={saving}
              className="h-9 px-6 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>
              <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "integrations" && (
        <div key="integrations" className="grid grid-cols-1 sm:grid-cols-2 gap-4 view-transition">
          {integrations.map(integration => (
            <div key={integration.id} className="rounded-2xl border p-5 transition-all duration-200 hover:shadow-md" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: integration.connected ? "rgba(16,185,129,0.15)" : "var(--accent)" }}>
                  <integration.icon size={18} style={{ color: integration.connected ? "#10b981" : "var(--muted-foreground)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold" style={{ color: "var(--text-color)" }}>{integration.name}</h3>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase" style={{
                      background: integration.connected ? "rgba(16,185,129,0.15)" : "rgba(113,116,120,0.15)",
                      color: integration.connected ? "#10b981" : "#717478",
                    }}>{integration.status}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{integration.description}</p>
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
                <button onClick={() => toggleIntegration(integration.id)}
                  className="h-8 px-4 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all hover:scale-105 border"
                  style={{
                    borderColor: integration.connected ? "rgba(239,68,68,0.3)" : "var(--card-border)",
                    color: integration.connected ? "#ef4444" : "var(--graph-to)",
                    background: integration.connected ? "rgba(239,68,68,0.05)" : "transparent",
                  }}>
                  {integration.connected ? <><X size={12} /> Disconnect</> : <><Plug size={12} /> Connect</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "custom-fields" && (
        <div key="custom-fields" className="rounded-2xl border overflow-hidden view-transition" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--card-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Custom Fields</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">View and manage custom data fields for CRM entities.</p>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
                <th className="p-4 font-bold uppercase tracking-wider">Entity</th>
                <th className="p-4 font-bold uppercase tracking-wider">Field Name</th>
                <th className="p-4 font-bold uppercase tracking-wider">Type</th>
                <th className="p-4 font-bold uppercase tracking-wider">Required</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-color)" }}>
              {customFields.map(field => {
                const typeConf = FIELD_TYPE_CONFIG[field.field_type];
                const TypeIcon = typeConf.icon;
                return (
                  <tr key={field.id} className="border-b transition-colors hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)" }}>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide" style={{ background: "var(--accent)", color: "var(--text-color)" }}>
                        {field.entity}
                      </span>
                    </td>
                    <td className="p-4 font-bold">{field.field_name}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase" style={{ background: typeConf.color + "15", color: typeConf.color }}>
                        <TypeIcon size={10} /> {field.field_type}
                      </span>
                    </td>
                    <td className="p-4">
                      {field.required ? <Check size={14} style={{ color: "#10b981" }} /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "notifications" && (
        <div key="notifications" className="rounded-2xl border overflow-hidden view-transition" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--card-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Notification Preferences</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Control which notifications you receive via email and push.</p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
            {notifications.map(n => (
              <div key={n.id} className="flex items-center justify-between p-5 transition-colors hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)" }}>
                <div className="flex-1">
                  <p className="text-xs font-bold" style={{ color: "var(--text-color)" }}>{n.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Email Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Email</span>
                    <button onClick={() => toggleNotification(n.id, "email")}
                      className="relative w-9 h-5 rounded-full transition-all duration-300 cursor-pointer"
                      style={{ background: n.email ? "#10b981" : "var(--accent)" }}>
                      <div className="absolute top-0.5 h-4 w-4 rounded-full transition-all duration-300"
                        style={{ left: n.email ? "18px" : "2px", background: n.email ? "#fff" : "var(--muted-foreground)" }} />
                    </button>
                  </div>
                  {/* Push Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Push</span>
                    <button onClick={() => toggleNotification(n.id, "push")}
                      className="relative w-9 h-5 rounded-full transition-all duration-300 cursor-pointer"
                      style={{ background: n.push ? "#10b981" : "var(--accent)" }}>
                      <div className="absolute top-0.5 h-4 w-4 rounded-full transition-all duration-300"
                        style={{ left: n.push ? "18px" : "2px", background: n.push ? "#fff" : "var(--muted-foreground)" }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div key="security" className="space-y-4 view-transition">
          {/* Password */}
          <div className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center gap-2">
              <Lock size={16} style={{ color: "var(--text-color)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Change Password</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Password</label>
                <input type="password" placeholder="••••••••"
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Password</label>
                <input type="password" placeholder="••••••••"
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                <input type="password" placeholder="••••••••"
                  className="w-full h-9 px-3 mt-1.5 rounded-xl text-xs border bg-transparent" style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => toast.success("Password updated")}
                className="h-9 px-4 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>Update Password</button>
            </div>
          </div>

          {/* 2FA */}
          <div className="rounded-2xl border p-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <Key size={18} style={{ color: "#10b981" }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Two-Factor Authentication</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Add an extra layer of security to your account.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>
                Not Enabled
              </span>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="p-5 border-b" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>Active Sessions</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Devices currently logged into your account.</p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
              {sessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
                      <session.icon size={16} style={{ color: session.current ? "var(--graph-to)" : "var(--muted-foreground)" }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold" style={{ color: "var(--text-color)" }}>{session.device}</p>
                        {session.current && (
                          <span className="px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>This Device</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{session.location}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock size={8} /> {session.last_active}</span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <button onClick={() => toast.success("Session revoked")}
                      className="h-7 px-3 rounded-lg text-[9px] font-bold border transition-all hover:scale-105"
                      style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
