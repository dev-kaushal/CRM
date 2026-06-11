"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";

export type DbUser = typeof users.$inferSelect;

/**
 * Resolves the signed-in Clerk user to a `users` row, lazily creating an
 * organization + user row on first sign-in (no webhook needed for MVP).
 *
 * `auth()` decodes the session JWT locally (no network call), unlike
 * `currentUser()` which always hits Clerk's Backend API. We only pay that
 * extra round trip once, on first-ever login when a `users` row doesn't
 * exist yet — every subsequent action for an existing user skips it.
 */
export async function getOrCreateDbUser(): Promise<DbUser> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });
  if (existing) {
    return existing;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Not authenticated");
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
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  return existing ?? null;
}
