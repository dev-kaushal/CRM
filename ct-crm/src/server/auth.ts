"use server";

import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";

export type DbUser = typeof users.$inferSelect;

/**
 * Resolves the signed-in Clerk user to a `users` row, lazily creating an
 * organization + user row on first sign-in (no webhook needed for MVP).
 */
export async function getOrCreateDbUser(): Promise<DbUser> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Not authenticated");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUser.id),
  });
  if (existing) {
    return existing;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email ||
    "New User";

  const orgName = `${fullName}'s Organization`;
  const slug = `org-${clerkUser.id}`.toLowerCase();

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug })
    .returning();

  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      organizationId: org.id,
      email,
      fullName,
      role: "ORG_ADMIN",
    })
    .returning();

  return user;
}

/**
 * Returns the `users` row for the current Clerk session, or `null` if not
 * signed in. Does NOT create a row — use `getOrCreateDbUser()` for that.
 */
export async function getCurrentDbUser(): Promise<DbUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUser.id),
  });

  return existing ?? null;
}
