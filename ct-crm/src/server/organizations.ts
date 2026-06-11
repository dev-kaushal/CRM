"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

export async function getOrganization() {
  const dbUser = await getOrCreateDbUser();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, dbUser.organizationId),
  });

  return {
    name: org?.name ?? "",
    slug: org?.slug ?? "",
    logo_url: "",
    timezone: "Asia/Kolkata",
    currency: "INR",
    primary_color: "#0891b2",
  };
}

export async function updateOrganizationName(name: string) {
  const dbUser = await getOrCreateDbUser();
  await db
    .update(organizations)
    .set({ name, updatedAt: new Date() })
    .where(eq(organizations.id, dbUser.organizationId));
}
