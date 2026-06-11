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
