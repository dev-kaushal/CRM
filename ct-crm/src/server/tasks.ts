"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getOrCreateDbUser } from "./auth";

interface TaskMeta {
  text?: string;
  type?: string;
  priority?: string;
  status?: string;
  assigned_to?: string;
}

interface TaskInput {
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  due_date: string;
  assigned_to?: string;
}

const PRIORITY_MAP: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  urgent: "HIGH",
};

function parseMeta(description: string | null): TaskMeta {
  if (!description) return {};
  try {
    const parsed = JSON.parse(description);
    if (parsed && typeof parsed === "object") return parsed as TaskMeta;
  } catch {
    return { text: description };
  }
  return { text: description };
}

function buildDescription(meta: TaskMeta): string {
  return JSON.stringify(meta);
}

function toSnakeTask(row: typeof tasks.$inferSelect) {
  const meta = parseMeta(row.description);
  return {
    id: row.id,
    title: row.title,
    description: meta.text ?? "",
    type: meta.type ?? "other",
    priority: meta.priority ?? (row.priority ?? "MEDIUM").toLowerCase(),
    status: meta.status ?? (row.isCompleted ? "completed" : "pending"),
    due_date: row.dueDate.toISOString(),
    assigned_to: meta.assigned_to ?? "Unassigned",
    entity_type: row.relatedType ?? undefined,
    entity_id: row.relatedId ?? undefined,
    created_at: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function getTasks() {
  const dbUser = await getOrCreateDbUser();
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.organizationId, dbUser.organizationId))
    .orderBy(asc(tasks.dueDate));

  return rows.map(toSnakeTask);
}

export async function createTask(input: TaskInput) {
  const dbUser = await getOrCreateDbUser();
  const meta: TaskMeta = {
    text: input.description ?? "",
    type: input.type ?? "other",
    priority: input.priority ?? "medium",
    status: "pending",
    assigned_to: input.assigned_to || "Unassigned",
  };

  const [row] = await db
    .insert(tasks)
    .values({
      organizationId: dbUser.organizationId,
      title: input.title,
      description: buildDescription(meta),
      dueDate: new Date(input.due_date),
      priority: PRIORITY_MAP[input.priority ?? "medium"] ?? "MEDIUM",
      relatedType: "general",
      relatedId: dbUser.organizationId,
      isCompleted: false,
    })
    .returning({ id: tasks.id });
  return row;
}

export async function updateTaskStatus(id: string, status: string) {
  const dbUser = await getOrCreateDbUser();
  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.organizationId, dbUser.organizationId)))
    .limit(1);

  if (existing.length === 0) return;

  const meta = parseMeta(existing[0].description);
  meta.status = status;

  await db
    .update(tasks)
    .set({
      description: buildDescription(meta),
      isCompleted: status === "completed",
    })
    .where(eq(tasks.id, id));
}
