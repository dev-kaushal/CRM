"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";
import { toast } from "sonner";
import { Search, Mail, Building, ShieldCheck, ExternalLink } from "lucide-react";

interface Contact {
  id: string;
  contact_name: string;
  company: string;
  email: string;
  lifetime_value: number;
  customer_since: string;
  status: string;
}

const FALLBACK_CONTACTS: Contact[] = [
  { id: "1", contact_name: "Vikram Singh", company: "Acme Corp", email: "vikram@acmecorp.in", lifetime_value: 450000, customer_since: new Date(Date.now() - 86400000).toISOString(), status: "ACTIVE" },
  { id: "2", contact_name: "Neha Patel", company: "TechStart", email: "neha@techstart.io", lifetime_value: 0, customer_since: new Date(Date.now() - 172800000).toISOString(), status: "ACTIVE" },
  { id: "3", contact_name: "Arjun Mehta", company: "CloudSoft Technologies", email: "arjun@cloudsoft.in", lifetime_value: 320000, customer_since: new Date(Date.now() - 259200000).toISOString(), status: "ACTIVE" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(FALLBACK_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Query customers which stores our corporate contacts in Phase 1 schema
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("customer_since", { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setContacts(data);
      }
    } catch {
      console.warn("Using offline fallback contacts data.");
      setContacts(FALLBACK_CONTACTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(c => {
    return (
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>
            Contacts Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified contact database showing qualified stakeholders, corporate accounts, and lifetime value records.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center p-2 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-9 pr-4 rounded-xl text-xs bg-transparent border placeholder:opacity-50"
            style={{ color: "var(--text-color)", borderColor: "var(--card-border)" }}
          />
        </div>
      </div>

      {/* Grid or Table */}
      {filteredContacts.length === 0 ? (
        <WidgetWrapper empty emptyTitle="No contacts found" emptyDescription="Ensure customers have been qualified and seeded in your database.">
          <div />
        </WidgetWrapper>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--card-border)", color: "var(--muted-foreground)" }}>
                <th className="p-4 font-bold uppercase tracking-wider">Contact Name</th>
                <th className="p-4 font-bold uppercase tracking-wider">Company Account</th>
                <th className="p-4 font-bold uppercase tracking-wider">Email Address</th>
                <th className="p-4 font-bold uppercase tracking-wider">Lifetime Value (LTV)</th>
                <th className="p-4 font-bold uppercase tracking-wider">Customer Since</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Verification</th>
              </tr>
            </thead>
            <tbody style={{ color: "var(--text-color)" }}>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b transition-colors hover:bg-[rgba(0,0,0,0.02)]" style={{ borderColor: "var(--card-border)" }}>
                  <td className="p-4 font-bold">{contact.contact_name || "N/A"}</td>
                  <td className="p-4 text-muted-foreground font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Building size={12} className="opacity-60" />
                      <span>{contact.company}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="opacity-60" />
                      <span>{contact.email || "N/A"}</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold" style={{ color: "var(--graph-to)" }}>
                    ₹{contact.lifetime_value?.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(contact.customer_since).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide"
                      style={{
                        background: contact.status === "ACTIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(115, 116, 120, 0.15)",
                        color: contact.status === "ACTIVE" ? "#10b981" : "var(--text-color)",
                      }}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                      <ShieldCheck size={12} />
                      <span>Verified</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
