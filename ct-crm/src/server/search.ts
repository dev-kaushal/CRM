"use server";

import { and, eq, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import { leads, deals, contacts, customers } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

export interface SearchResult {
  id: string;
  type: "lead" | "deal" | "contact" | "customer";
  title: string;
  subtitle?: string;
  href: string;
}

/** Cross-entity search across leads, deals, contacts and customers, org-scoped. */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const dbUser = await getOrCreateDbUser();
  const orgId = dbUser.organizationId;
  const pattern = `%${q}%`;

  const [leadRows, dealRows, contactRows, customerRows] = await Promise.all([
    db.select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName, email: leads.email, company: leads.company })
      .from(leads)
      .where(and(eq(leads.organizationId, orgId), or(
        ilike(leads.firstName, pattern),
        ilike(leads.lastName, pattern),
        ilike(leads.email, pattern),
        ilike(leads.company, pattern),
      )))
      .limit(5),
    db.select({ id: deals.id, title: deals.title, companyName: deals.companyName })
      .from(deals)
      .where(and(eq(deals.organizationId, orgId), or(
        ilike(deals.title, pattern),
        ilike(deals.companyName, pattern),
      )))
      .limit(5),
    db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, contactName: contacts.contactName, email: contacts.email, company: contacts.company })
      .from(contacts)
      .where(and(eq(contacts.organizationId, orgId), or(
        ilike(contacts.firstName, pattern),
        ilike(contacts.lastName, pattern),
        ilike(contacts.contactName, pattern),
        ilike(contacts.email, pattern),
        ilike(contacts.company, pattern),
      )))
      .limit(5),
    db.select({ id: customers.id, company: customers.company, contactName: customers.contactName, email: customers.email })
      .from(customers)
      .where(and(eq(customers.organizationId, orgId), or(
        ilike(customers.company, pattern),
        ilike(customers.contactName, pattern),
        ilike(customers.email, pattern),
      )))
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  leadRows.forEach((r) => results.push({
    id: r.id,
    type: "lead",
    title: `${r.firstName} ${r.lastName}`.trim(),
    subtitle: r.company || r.email || undefined,
    href: `/dashboard/leads/${r.id}`,
  }));

  dealRows.forEach((r) => results.push({
    id: r.id,
    type: "deal",
    title: r.title,
    subtitle: r.companyName || undefined,
    href: `/dashboard/deals`,
  }));

  contactRows.forEach((r) => results.push({
    id: r.id,
    type: "contact",
    title: r.contactName || `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Untitled Contact",
    subtitle: r.company || r.email || undefined,
    href: `/dashboard/contacts`,
  }));

  customerRows.forEach((r) => results.push({
    id: r.id,
    type: "customer",
    title: r.company,
    subtitle: r.contactName || r.email || undefined,
    href: `/dashboard/customers`,
  }));

  return results;
}
