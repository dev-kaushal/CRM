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
