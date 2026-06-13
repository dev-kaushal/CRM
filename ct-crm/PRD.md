# CT-CRM — Product Requirements Document

## Overview
CT-CRM is a multi-tenant CRM web application built with Next.js 15 (App Router), React 18, and Tailwind CSS. It manages the full sales lifecycle: leads → prospects → deals → contracts → customers, plus contacts, tasks, activities, team management, and analytics. A glassmorphic, dark/light-themed UI is a core product requirement and must be preserved across this migration.

## Current Migration Scope
This document tracks the requirements for the **Supabase → Clerk + Neon/Drizzle backend migration**. Functional scope of the product is unchanged; only the auth provider and database/ORM are replaced.

### Goals
1. Remove all Supabase dependencies (Auth + Database/Postgres client) from the codebase.
2. Authentication via **Clerk** (email/password + Google OAuth), preserving the existing login/register UI exactly.
3. Database via **Neon Postgres**, accessed through **Drizzle ORM**, with all 40 tables from the provided schema created.
4. All existing CRM features (leads, prospects, deals, contracts, customers, contacts, tasks, activities, team, analytics, settings) continue to work identically from the user's perspective.
5. Multi-tenancy preserved via `organizations` / `organization_id`, with lazy provisioning of an org + user row on first Clerk login.
6. Zero build/type errors; each module manually verified against the live Neon database before being marked complete.

### Non-Goals (this migration)
- No visual/design changes.
- No new features beyond what's needed to keep existing features working.
- AI/Phase-2-3 tables (lead_scores, workflow_definitions, ai_agents, etc.) are created in the schema but their UI (`ai-ready-section.tsx`, Workspace Engine) only needs to compile and run without Supabase — full feature parity for these is best-effort.

## Core Entities
Organizations, Users (Clerk-linked), Leads, Prospects, Deals, Contracts, Customers, Contacts, Tasks, Notes (lead/prospect/customer/contact), Activities, Reminders, plus ~28 supporting AI/analytics tables (see `CONTEXT.md` for full schema reference).

## Tech Stack (post-migration)
- Next.js 15 / React 18 / Tailwind CSS (unchanged)
- Auth: Clerk (`@clerk/nextjs`), custom UI flow
- Database: Neon Postgres
- ORM: Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, neon-http driver)
- Data access: Next.js Server Actions in `src/server/*.ts`

## Success Criteria
- `npx tsc --noEmit` and `npm run build` succeed with zero Supabase references in `src/`.
- A new user can register, verify, and log in via Clerk (email/password and Google).
- Every dashboard page loads and mutates data against Neon, identical to prior Supabase behavior.
- Login/register pages are visually unchanged.

See `DEVPLAN.md` for the phased task breakdown and `CONTEXT.md` for architecture details.

## Phase 7 Addendum — Performance & Motion Design
### Goals
1. Eliminate redundant Clerk Backend API calls (`currentUser()`) from the hot path of every server action — use `auth()` (local JWT decode) for the existing-user lookup in `getOrCreateDbUser()`/`getCurrentDbUser()`.
2. Introduce a consistent, themed motion-design system (`transitions-dev`) for page transitions, modals/drawers, sliding tab/view switchers, and loading skeletons — respecting `prefers-reduced-motion`.
3. Apply the motion system to Leads and Prospects as the reference implementation, then roll out to the remaining 11 dashboard pages (see `DEVPLAN.md` Phase 7 checklist).

### Success Criteria
- Navigating between dashboard pages and clicking buttons/actions no longer incurs an extra Clerk network round trip on the common path.
- Leads and Prospects pages have animated page transitions, sliding view switchers (where applicable), animated modal/drawer open transitions, and pulsing loading skeletons, all degrading gracefully under `prefers-reduced-motion`.

## Phase 9–17 Addendum — Leads 360° / Calendar / Reporting
### Goals
1. Bring the Leads Intake page to a polished, feature-complete CRM module: sticky-column table with pagination, advanced column-scoped search, multi-criteria filters, Kanban drag-and-drop (`@dnd-kit`), Zod-validated forms, KPI summary cards, and a Reports tab (source/status/priority/trend charts) — all driven by a shared `DateRangePicker`.
2. Add a full-page **Lead Detail (360°)** view (`/dashboard/leads/[id]`) with a pipeline-stage breadcrumb (Lead → Prospect → Deal → Contract → Customer), quick-action logging (call/email/meeting/note), follow-ups, activity timeline, and a "Convert to Prospect" (BANT) flow that links an existing lead to a new `prospects` row rather than duplicating it.
3. Extend the Dashboard with a range-aware Pipeline Overview strip (Leads/Prospects/Deals/Won/Lost) and a "Today's Reminders" widget.
4. Add a **Calendar** page (`/dashboard/calendar`) — a month-grid view/manage surface for cross-entity reminders (lead/prospect/customer/contact), with a day-detail drawer supporting toggle/snooze/edit/delete and jump-to-entity links.
5. Provide a one-click **"Load Demo Data"** action (Leads page, shown only when the org has <5 leads) that seeds ~50 realistic leads with varied statuses/sources/priorities/notes/reminders, so every feature above has real data to demonstrate.

### Non-Goals
- No schema migration for "standalone" reminders — the `reminders` table requires `entityType`/`entityId`, so the Calendar page is view/manage-only (creation stays on each entity's own page).
- App-wide Zod validation rollout beyond the Lead form is out of scope for this pass (pattern documented in `CONTEXT.md` for future modules).

### Success Criteria
- `npx tsc --noEmit` clean across the whole project; `/dashboard`, `/dashboard/leads`, `/dashboard/leads/[id]`, `/dashboard/calendar` all redirect to `/login` when unauthenticated (307).
- Leads page: table/Kanban/Grid views, pagination, search/filters, KPI cards, and Reports tab all respect the selected date range; Kanban supports drag-and-drop stage changes.
- Lead detail page renders the pipeline breadcrumb, supports logging activities/follow-ups/notes, and "Convert to Prospect" creates a linked `prospects` row.
- Dashboard shows the Pipeline Overview strip and Today's Reminders widget, both range-aware where applicable.
- Calendar page renders a month grid with per-day reminder indicators and a working day-detail drawer.
- "Load Demo Data" inserts 50 leads with varied data and disappears once the org has 5+ leads.
