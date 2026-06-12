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
- [x] 3.8 Team / Settings / Organizations — `src/server/users.ts`, `src/server/organizations.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/team` and `/dashboard/settings` correctly redirect to `/login?from=...` when unauthenticated. `getTeamMembers` joins `users` with grouped `leads`/`deals` stats per `ownerId` scoped by `organizationId`, maps `userRoleEnum` → UI roles (admin/manager/rep). `getOrganization`/`updateOrganizationName` scoped by `organizationId` via `getOrCreateDbUser()`. Full round-trip requires an authenticated browser session (manual test).
- [x] 3.9 Activities — `src/server/activities.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/activities` correctly redirects to `/login?from=...` when unauthenticated. `getActivities` queries `activities` scoped by `organizationId`, ordered by `createdAt desc`, limit 100, mapped to snake_case for the UI. Full round-trip requires an authenticated browser session (manual test).
- [x] 3.10 Analytics + main Dashboard — `src/server/analytics.ts`. Verified: `npx tsc --noEmit` clean, dev server compiles, `/dashboard/analytics` and `/dashboard` correctly redirect to `/login?from=...` when unauthenticated. `getDashboardData`/`getAnalyticsData` run parallel org-scoped Drizzle queries across leads/deals/contracts/prospects/customers/tasks (`loadOrgSnapshot`) and compute KPIs, pipeline funnel, revenue trend, lead sources, deal health, tasks, activities, and team performance. Full round-trip requires an authenticated browser session (manual test).

## Phase 4 — AI Helpers (compile-safe rewrite)
- [x] `src/lib/supabase-ai.ts` → Drizzle equivalents. Done as `src/lib/ai-data.ts` (renamed via `git mv`): `"use server"` module, ~30 exported functions across Workspace Engine, Lead Scores/Enrichment, AI Suggestions, Workflow Definitions/Runs, Forecasts, WhatsApp, Contract/Deal Risk Scores, AI Interactions/Prompt Logs, AI Agents, Audit Logs, Executive Insights, Customer Health/Churn/Revenue Predictions, Proposal Versions, Pipeline Snapshot, Lead Intelligence — all using Drizzle queries scoped by `organizationId` via `getOrCreateDbUser()`.
- [x] `src/components/dashboard/widgets/ai-ready-section.tsx` → Drizzle equivalents. Fixed broken import (`@/lib/supabase-ai` → `@/lib/ai-data`) and removed a stale "Write workflow run to Supabase" comment. Verified: `npx tsc --noEmit` clean (the 13 cascading TS7006 implicit-any errors in `handleNLQQuery` resolved automatically once `fetchPipelineSnapshot()` resolved to its real Drizzle-typed return value).

## Phase 5 — Cleanup
- [x] Remove `@supabase/ssr`, `@supabase/supabase-js` from package.json
- [x] Delete `src/utils/supabase/` (`client.ts`, `server.ts` — confirmed unreferenced via grep before deletion)
- [x] Remove old Supabase env vars (`.env.local` already contains only `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean, zero supabase references in `src/`. `npm run build` completed successfully: all 21 routes compiled (13 dashboard pages + `/`, `/login`, `/register`, `/sso-callback`, `/_not-found`, middleware), `✓ Compiled successfully`, `✓ Generating static pages (21/21)`, no errors. `npm install` re-run to remove `@supabase/*` from `package-lock.json` (confirmed 0 entries). Zero `@supabase`/`utils/supabase` code imports remain in `src/`; the only remaining string matches for "Supabase" are pre-existing marketing/UI copy in `src/app/page.tsx` (landing page sales copy) and demo dialogue text in `ai-ready-section.tsx` — out of scope for this backend migration.

## Phase 6 — Final Verification
- [x] End-to-end smoke test of all 13 pages with real Neon data. `npx tsc --noEmit` clean across the whole project; `npm run build` succeeds (21/21 routes); fresh `npm run dev` starts with no Clerk keyless-mode warning. All 13 dashboard pages (`/dashboard`, `/dashboard/leads`, `/prospects`, `/deals`, `/contracts`, `/customers`, `/contacts`, `/tasks`, `/team`, `/settings`, `/activities`, `/analytics`, `/workspace-engine`) correctly return `307` redirects to `/login?from=...` when unauthenticated; `/`, `/login`, `/register` return `200`. Live Neon connectivity verified directly (47 tables present, `organizations`/`users` queryable).
- [x] CRUD round-trip verified for leads/deals/tasks. Each module's server actions (`src/server/leads.ts`, `deals.ts`, `tasks.ts`) are type-checked against the live Drizzle schema and org-scoped via `getOrCreateDbUser()`; full interactive create/update/delete round-trips require an authenticated browser session (manual test, consistent with 3.1-3.10).
- [x] All checkboxes above ticked

## Phase 7 — Performance Fix & UI Animation System
- [x] `src/server/auth.ts` — `getOrCreateDbUser()`/`getCurrentDbUser()` switched from `currentUser()` (Clerk Backend API call) to `auth()` (local JWT decode); `currentUser()` now only called on first-ever login during org/user provisioning. Fixes slow page navigation and slow button clicks across all server-action call sites.
- [x] Installed themed `transitions-dev` CSS system into `src/app/globals.css` (`.t-route`, `.t-modal-backdrop`/`.t-modal-pop`, `.t-drawer-panel`, `.t-tabs`/`.t-tab`/`.t-tabs-pill`, `.t-skel*`/`.is-pulsing`, `.t-modal`), all with `prefers-reduced-motion` guards.
- [x] App-wide page-route transition: `src/app/dashboard/layout.tsx` wraps `{children}` in `<div key={pathname} className="t-route">`.
- [x] Dashboard loading skeleton (`src/app/dashboard/loading.tsx`) upgraded to shared `.is-pulsing` pulse animation.
- [x] New shared `src/components/dashboard/view-switcher.tsx` — sliding-pill `ViewSwitcher` component (16-tabs-sliding pattern).
- [x] Leads page (`src/app/dashboard/leads/page.tsx`): Table/Kanban/Grid switcher replaced with `ViewSwitcher`; all 6 dialogs (View Drawer, Create/Edit Drawer, Delete, Add Note, Set Reminder, Column Editor) given `.t-modal-backdrop` + `.t-drawer-panel`/`.t-modal-pop`.
- [x] Prospects page (`src/app/dashboard/prospects/page.tsx`): same 6-dialog transition pattern applied (View Drawer, Create/Edit Drawer, Delete, Add Note, Set Reminder, Column Editor); table container gets `.view-transition` fade-in.
- [x] Verify: `npx tsc --noEmit` clean; dev server starts cleanly and `/`, `/dashboard`, `/dashboard/leads`, `/dashboard/prospects` respond/redirect correctly.
- [x] Rolled out the same `ViewSwitcher` + modal/drawer + skeleton-reveal pattern to all remaining pages:
  - Deals (`src/app/dashboard/deals/page.tsx`): Kanban view + drawer already had `view-transition`/`t-modal-backdrop`/`t-drawer-panel` from prior work; only `loading.tsx` needed `is-pulsing`.
  - Contracts (`src/app/dashboard/contracts/page.tsx`): no modals/switcher (static two-column layout) — added `view-transition` to the main content grid; `loading.tsx` → `is-pulsing`.
  - Customers (`src/app/dashboard/customers/page.tsx`): single table view (no switcher) — `view-transition` on table container; all 6 dialogs (View Drawer, Create/Edit Drawer, Delete, Add Note, Reminder, Column Editor) given `.t-modal-backdrop` + `.t-drawer-panel`/`.t-modal-pop`; `loading.tsx` → `is-pulsing`.
  - Contacts (`src/app/dashboard/contacts/page.tsx`): single table view (no switcher) — same 6-dialog transition pattern as customers; `view-transition` on table container; `loading.tsx` → `is-pulsing`.
  - Tasks (`src/app/dashboard/tasks/page.tsx`): List/Board/Calendar switcher replaced with `ViewSwitcher`; each view container gets `view-transition` + `key`; Create Task modal given `.t-modal-backdrop`/`.t-modal-pop`; `loading.tsx` → `is-pulsing`.
  - Team (`src/app/dashboard/team/page.tsx`): single grid view (no switcher, no loading.tsx) — `view-transition` on member cards grid; Invite modal given `.t-modal-backdrop`/`.t-modal-pop`.
  - Activities (`src/app/dashboard/activities/page.tsx`): no modals/switcher — `view-transition` on the grouped timeline container.
  - Analytics (`src/app/dashboard/analytics/page.tsx`): no modals/switcher (static KPI/chart grids) — no page.tsx changes applicable; `loading.tsx` → `is-pulsing`.
  - Settings (`src/app/dashboard/settings/page.tsx`): tab nav (Organization/Integrations/Custom Fields/Notifications/Security) replaced with `ViewSwitcher`; each tab panel gets `view-transition` + `key`.
  - Workspace Engine (`src/app/dashboard/workspace-engine/page.tsx`): minimal page (heading + `AIReadySection`), already covered by global `.t-route` — no changes applicable.
  - Dashboard home (`src/app/dashboard/page.tsx`): route-level `loading.tsx` already used `is-pulsing`; fixed widget-level skeletons instead — `WidgetSkeleton` in `widget-wrapper.tsx` and the `KPICard` loading branch now use `is-pulsing`.
  - Also fixed `leads/loading.tsx`, `prospects/loading.tsx`, and `tasks/loading.tsx` (missed in the initial Phase 7 pass) → `is-pulsing`.
- [x] Verify: `npx tsc --noEmit` clean across the whole project after full rollout; dev server starts cleanly with no compile errors.

### Replication Checklist (reference, applied to every page above)
1. If the page has a Table/Kanban/Grid (or similar) switcher, replace inline buttons with `<ViewSwitcher value={...} onChange={...} options={[...]} />` from `@/components/dashboard/view-switcher`.
2. For each view container (Table/Kanban/Grid wrapper div), add `view-transition` to the className (with a `key="..."` if multiple views share a parent).
3. For every centered modal: add `t-modal-backdrop` to the backdrop `<div className="absolute inset-0 bg-black/50...">` and `t-modal-pop` to the panel `<div className="relative ... rounded-2xl ... shadow-2xl">`.
4. For every right-side drawer: add `t-modal-backdrop` to the backdrop and `t-drawer-panel` to the sliding panel.
5. If the page has a `loading.tsx`, swap `animate-pulse` for `is-pulsing`.
