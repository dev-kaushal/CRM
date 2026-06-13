"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

function toSnakeActivity(a: typeof activities.$inferSelect) {
  return {
    id: a.id,
    type: a.type.toLowerCase(),
    description: a.description,
    user_name: a.userName ?? "System",
    entity_type: a.relatedType,
    entity_id: a.relatedId,
    entity_name: a.entityName ?? undefined,
    metadata: (a.metadata as Record<string, unknown>) ?? undefined,
    created_at: (a.createdAt ?? new Date()).toISOString(),
  };
}

// Logs a quick action (call/email/meeting/note/status change, etc.) for an
// entity's activity timeline (#10, #27 — "directly add to detail page").
export async function createActivity(input: {
  type: string;
  related_type: string;
  related_id: string;
  entity_name?: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const dbUser = await getOrCreateDbUser();
  const [row] = await db
    .insert(activities)
    .values({
      organizationId: dbUser.organizationId,
      type: input.type,
      userId: dbUser.id,
      userName: dbUser.fullName,
      relatedType: input.related_type,
      relatedId: input.related_id,
      entityName: input.entity_name,
      description: input.description,
      metadata: input.metadata,
    })
    .returning({ id: activities.id });
  return row;
}

export async function getActivitiesForEntity(relatedType: string, relatedId: string) {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select()
    .from(activities)
    .where(and(eq(activities.organizationId, dbUser.organizationId), eq(activities.relatedType, relatedType), eq(activities.relatedId, relatedId)))
    .orderBy(desc(activities.createdAt));
  return rows.map(toSnakeActivity);
}

export async function getActivities() {
  const dbUser = await getOrCreateDbUser();

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.organizationId, dbUser.organizationId))
    .orderBy(desc(activities.createdAt))
    .limit(100);

  return rows.map(toSnakeActivity);
}
