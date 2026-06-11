"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

export async function getActivities() {
  const dbUser = await getOrCreateDbUser();

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.organizationId, dbUser.organizationId))
    .orderBy(desc(activities.createdAt))
    .limit(100);

  return rows.map((a) => ({
    id: a.id,
    type: a.type.toLowerCase(),
    description: a.description,
    user_name: a.userName ?? "System",
    entity_type: a.relatedType,
    entity_name: a.entityName ?? undefined,
    metadata: (a.metadata as Record<string, unknown>) ?? undefined,
    created_at: (a.createdAt ?? new Date()).toISOString(),
  }));
}
