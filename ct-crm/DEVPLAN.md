# CT-CRM — Dev Plan: Supabase → Clerk + Neon/Drizzle Migration

Checkboxes are ticked only after the corresponding work is implemented AND verified (type-check / dev-server smoke test / DB query as applicable).

## Phase 0 — Project Docs
- [x] PRD.md
- [x] DEVPLAN.md
- [x] CONTEXT.md

## Phase 1 — DB Foundation (Neon + Drizzle)
- [x] Install `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`
- [x] Add `DATABASE_URL` to `.env.local`
- [x] `src/db/schema.ts` — all 47 tables + enums (clerk_user_id adaptation on `users`)
- [x] `drizzle.config.ts`, `src/db/index.ts`
- [x] `drizzle-kit push` to Neon — verified 47 tables exist

## Phase 2 — Auth (Clerk)
- [x] Install `@clerk/nextjs`
- [x] Add Clerk env vars to `.env.local`
- [x] `src/server/auth.ts` — `getOrCreateDbUser()`, `getCurrentDbUser()`
- [x] `<ClerkProvider>` in root layout
- [x] New `src/middleware.ts` (clerkMiddleware + route matcher)
- [x] `src/app/(auth)/sso-callback/page.tsx`
- [x] Rewire `login-form.tsx` (useSignIn, Google OAuth)
- [x] Rewire `register-form.tsx` (useSignUp + verification)
- [x] Rewire `use-user.ts` shim
- [x] Rewire `src/app/page.tsx` auth check
- [x] Delete `src/app/auth/callback/route.ts`, `src/utils/supabase/middleware.ts`
- [x] Verify: redirect rules (confirmed via dev server logs — unauth request redirected to `/login?from=...`), org/user provisioning logic (tested insert/query against Neon schema directly). Interactive register/login/logout + email verification + Google OAuth round-trip in-browser still needs manual confirmation (requires live email/OAuth interaction).

## Phase 3 — Core CRM Pages
- [x] 3.1 Leads (+ lead_notes, reminders) — `src/server/leads.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/leads` correctly redirects to `/login?from=...` when unauthenticated. Full CRUD round-trip against Neon requires an authenticated browser session (manual test).
- [x] 3.2 Prospects (+ prospect_notes) — `src/server/prospects.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/prospects` correctly redirects to `/login?from=...` when unauthenticated. Note: `prospects.lead_id` is NOT NULL/unique — `createProspect` inserts a paired `leads` row (status QUALIFIED) then the `prospects` row; `updateProspect` updates both. Full CRUD round-trip requires an authenticated browser session (manual test).
- [x] 3.3 Deals — `src/server/deals.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/deals` correctly redirects to `/login?from=...` when unauthenticated. `createDeal` creates a paired placeholder `leads` row (matching prior Supabase behavior) then the `deals` row. Full CRUD round-trip requires an authenticated browser session (manual test). 
- [x] 3.4 Contracts — `src/server/contracts.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/contracts` correctly redirects to `/login?from=...` when unauthenticated. `getContracts` joins `contracts` → `deals` → `leads` to scope by org and resolve company name. `updateContractStatus` verifies the contract belongs to the org via the same join before updating; sets `signed_at` on SIGNED, clears it otherwise. Full CRUD round-trip requires an authenticated browser session (manual test).
- [x] 3.5 Customers (+ customer_notes) — `src/server/customers.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/customers` correctly redirects to `/login?from=...` when unauthenticated. `getCustomers`/`getCustomerReminders` scoped by `organizationId`; `createCustomer`/`updateCustomer` persist the full account form (status, LTV, health score, industry, city, contract fields, notes, tags); `deleteCustomer` cascades `customer_notes` and `reminders`. Full CRUD round-trip requires an authenticated browser session (manual test).
- [x] 3.6 Contacts (+ contact_notes) — `src/server/contacts.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/contacts` correctly redirects to `/login?from=...` when unauthenticated. `getContacts`/`getContactReminders` scoped by `organizationId`; `createContact`/`updateContact` persist the full directory form (identity, professional, location, status, LTV, tags, notes); `deleteContact` cascades `contact_notes` and `reminders`. Full CRUD round-trip requires an authenticated browser session (manual test).
- [x] 3.7 Tasks — `src/server/tasks.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/tasks` correctly redirects to `/login?from=...` when unauthenticated. The `tasks` table only has `priority` (LOW/MEDIUM/HIGH), `is_completed`, and required `related_type`/`related_id` columns — to preserve the existing UI's richer model (type, 4-state status, urgent priority, free-text assignee) without changing the schema or design, `getTasks`/`createTask`/`updateTaskStatus` serialize `{text, type, priority, status, assigned_to}` as JSON into the `description` column (with `priority`/`is_completed` columns kept in sync for potential DB-level filtering); `relatedType`/`relatedId` set to `"general"`/`organizationId` placeholders since tasks aren't tied to a specific entity in this view. Full CRUD round-trip requires an authenticated browser session (manual test).
- [ ] 3.8 Team / Settings / Organizations — `src/server/users.ts`, `src/server/organizations.ts`
- [ ] 3.9 Activities — `src/server/activities.ts`
- [ ] 3.10 Analytics + main Dashboard — `src/server/analytics.ts`

## Phase 4 — AI Helpers (compile-safe rewrite)
- [ ] `src/lib/supabase-ai.ts` → Drizzle equivalents
- [ ] `src/components/dashboard/widgets/ai-ready-section.tsx` → Drizzle equivalents

## Phase 5 — Cleanup
- [ ] Remove `@supabase/ssr`, `@supabase/supabase-js` from package.json
- [ ] Delete `src/utils/supabase/`
- [ ] Remove old Supabase env vars
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` clean, zero supabase references in `src/`

## Phase 6 — Final Verification
- [ ] End-to-end smoke test of all 13 pages with real Neon data
- [ ] CRUD round-trip verified for leads/deals/tasks
- [ ] All checkboxes above ticked
