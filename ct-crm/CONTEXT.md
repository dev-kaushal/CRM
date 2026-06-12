# CT-CRM — Architecture Context

## Stack (post-migration)
- **Framework**: Next.js 15.1.0, App Router, React 18.3.1, TypeScript, Tailwind CSS
- **Auth**: Clerk (`@clerk/nextjs`) — custom-flow (`useSignIn`/`useSignUp`), NOT prebuilt `<SignIn>`/`<SignUp>` components, to preserve existing glassmorphic login/register design
- **Database**: Neon Postgres (serverless)
- **ORM**: Drizzle ORM, `@neondatabase/serverless` with `neon-http` driver, `drizzle-kit` for schema push

## Directory Layout (new)
```
src/db/
  schema.ts        # All 40 tables + pg enums (user_role, lead_status, deal_stage, contract_status, task_priority, field_type)
  index.ts         # db = drizzle(neon(process.env.DATABASE_URL!), { schema })
drizzle.config.ts   # drizzle-kit config (dialect: postgresql, schema path, DATABASE_URL)

src/server/         # "use server" data-access modules, one per CRM area
  auth.ts           # getOrCreateDbUser(), getCurrentDbUser()
  organizations.ts
  users.ts          # team management
  leads.ts          # leads + lead_notes + reminders
  prospects.ts      # prospects + prospect_notes
  deals.ts
  contracts.ts
  customers.ts      # customers + customer_notes
  contacts.ts       # contacts + contact_notes
  tasks.ts
  activities.ts
  analytics.ts      # dashboard/analytics aggregates
```

## Auth Flow
- `src/middleware.ts` uses `clerkMiddleware()` + `createRouteMatcher()`:
  - Unauthenticated user on a non-public route → redirect to `/login?from=<path>`
  - Authenticated user visiting `/login`, `/register`, or `/` → redirect to `/dashboard`
  - Public routes: `/`, `/login`, `/register`, `/sso-callback`
- `login-form.tsx` / `register-form.tsx`: same JSX/styling, internals call Clerk's `useSignIn()`/`useSignUp()`. Google OAuth via `authenticateWithRedirect({ strategy: "oauth_google", redirectUrl: "/sso-callback", redirectUrlComplete: "/dashboard" })`.
- `src/app/(auth)/sso-callback/page.tsx` renders `<AuthenticateWithRedirectCallback signInForceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard" />` (this Clerk version's `HandleOAuthCallbackParams` type doesn't expose `redirectUrlComplete`).
- `src/hooks/use-user.ts` shims Clerk's `useUser()`/`useClerk().signOut` to the legacy shape `{ user: { email, user_metadata: { full_name } }, loading, error, signOut }` so `header.tsx` and `dashboard/page.tsx` are unchanged.

## Multi-tenancy / User Provisioning
- `users.clerk_user_id text unique not null` links a Clerk identity to a `users` row.
- `getOrCreateDbUser()` (in `src/server/auth.ts`): on first call for a Clerk user with no matching `users` row, creates a new `organizations` row and a `users` row (role `ORG_ADMIN`). All server actions call this first to scope queries by `organization_id`.

## Data Access Pattern
Pages remain `"use client"` but call exported async functions from `src/server/*.ts` (Server Actions) instead of `createClient().from("table")...`. Each server action: `getOrCreateDbUser()` → Drizzle query/mutation scoped to `organization_id` → return plain JS objects/arrays (no Supabase response wrapper).

## Schema Reference
Full 40-table schema (provided by user) lives conceptually in `src/db/schema.ts`. Enum definitions sourced from `supabase/migrations/001_schema.sql`:
- `user_role`: SUPER_ADMIN, ORG_ADMIN, SALES_MANAGER, SALES_REP, VIEWER
- `lead_status`: NEW, CONTACTED, INTERESTED, QUALIFIED, REJECTED
- `deal_stage`: NEW, PROPOSAL, NEGOTIATION, CONTRACT, WON, LOST
- `contract_status`: DRAFT, SENT, SIGNED, EXPIRED
- `task_priority`: LOW, MEDIUM, HIGH
- `field_type`: TEXT, NUMBER, DATE, BOOLEAN

Key adaptation: `users.auth_user_id uuid REFERENCES auth.users(id)` → `users.clerk_user_id text unique not null` (no `auth` schema in Neon).

## Removed
- `@supabase/ssr`, `@supabase/supabase-js` packages
- `src/utils/supabase/` (client.ts, server.ts, middleware.ts)
- `src/app/auth/callback/route.ts`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env vars

## Env Vars (`.env.local`, gitignored)
```
DATABASE_URL=postgresql://neondb_owner:...@.../neondb?sslmode=require&channel_binding=require
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## Performance: Auth Lookups
`getOrCreateDbUser()` / `getCurrentDbUser()` (`src/server/auth.ts`) resolve the Clerk user id via `auth()` (local JWT decode, no network call) instead of `currentUser()` (Clerk Backend API round trip). `currentUser()` is now only called once, on first-ever login, to provision a new `organizations`/`users` row. Since all server-action call sites go through `getOrCreateDbUser()`, this removes a network round trip from every navigation and button click.

## UI Animation System (transitions-dev)
`src/app/globals.css` includes a themed subset of the `.agents/skills/transitions-dev` snippets, wired to existing CT-CRM CSS vars (`--accent`, `--card-bg-solid`, `--text-color`, `--graph-to`, `--glass-shadow`, etc.), all with `prefers-reduced-motion` guards:
- `.t-route` — page-route mount transition (rise + blur + fade), applied via a `key={pathname}` wrapper in `src/app/dashboard/layout.tsx`
- `.t-modal-backdrop` / `.t-modal-pop` — mount-in animation for centered dialogs (`{condition && <div>...}` pattern)
- `.t-drawer-panel` — slide-in animation for right-side drawers (View / Create-Edit panels)
- `.t-tabs` / `.t-tab` / `.t-tabs-pill` — sliding-pill segmented control (16-tabs-sliding), used by `src/components/dashboard/view-switcher.tsx`
- `.t-skel*` / `.is-pulsing` — skeleton-reveal pulse; all `dashboard/**/loading.tsx` files and widget-level skeletons (`widget-wrapper.tsx`, `kpi-card.tsx`) use `.is-pulsing`
- `.t-modal` (06-modal verbatim) — kept for future use with a proper open/close state machine
- `.view-transition` — fade-in mount animation (`viewFadeIn 0.3s ease`) applied to view/content containers across all dashboard pages

`src/components/dashboard/view-switcher.tsx` is a shared `ViewSwitcher` component (sliding-pill tab bar). Used for: Leads Table/Kanban/Grid, Tasks List/Board/Calendar, and Settings tab navigation (Organization/Integrations/Custom Fields/Notifications/Security) — reusable on any page with a segmented view control.

This pattern has been rolled out to all dashboard pages (leads, prospects, deals, contracts, customers, contacts, tasks, team, activities, analytics, settings, workspace-engine, dashboard home):
- `ViewSwitcher` where a page has a real Table/Kanban/Grid/List/Calendar/tab switcher (leads, tasks, settings); pages with a single view (prospects, customers, contacts, contracts, team, activities, analytics, workspace-engine) skip this step.
- `.view-transition` on each view/content container (table, kanban board, grid, tab panel, timeline, etc.), with a `key="..."` when multiple views share a parent.
- `.t-modal-backdrop` + `.t-modal-pop` on every centered modal (delete confirmations, add note, reminder, column editor, create/invite forms).
- `.t-modal-backdrop` + `.t-drawer-panel` on every right-side drawer (view/create/edit panels).
- `.is-pulsing` on every `loading.tsx` skeleton and widget-level loading skeleton.
