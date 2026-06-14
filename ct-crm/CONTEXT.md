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
  leads.ts          # leads + lead_notes + reminders + pipeline status + per-lead follow-ups (tasks)
  prospects.ts      # prospects + prospect_notes + convertLeadToProspect (lead → prospect, BANT)
  deals.ts
  contracts.ts
  customers.ts      # customers + customer_notes
  contacts.ts       # contacts + contact_notes
  tasks.ts
  activities.ts     # getActivities() + createActivity()/getActivitiesForEntity() for entity timelines
  analytics.ts      # dashboard/analytics aggregates, both accept an optional AnalyticsRange { from?, to? }
  calendar.ts       # getAllReminders()/toggleReminderDone()/snoozeReminder()/updateReminder()/deleteReminder() — cross-entity reminders (lead/prospect/customer/contact)

src/lib/validations/  # Zod schemas + validate*() helpers for client-side form gating
  lead.ts             # leadFormSchema/validateLeadForm — email OR phone required
  prospect-conversion.ts  # BANT schema for lead → prospect conversion
  follow-up.ts        # per-lead follow-up task schema
  reminder.ts         # Set Reminder / Calendar quick-create schema
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

## Form Validation Pattern (Zod)
`src/lib/validations/*.ts` each export a Zod object schema plus a `validate<Name>(values)` helper returning `{ valid: boolean, errors: Record<string, string> }` (first issue per field path). Client components compute this on every render from current form state — e.g. `src/app/dashboard/leads/page.tsx` derives `formValid`/`formErrors` from `leadFormSchema`, disables the submit button while `!formValid`, and only renders inline field errors after a failed submit attempt (`triedSubmit` flag). This is the pattern to follow when adding validation to other forms (Prospects, Deals, Contacts, etc.).

## Date-Range Filtering Pattern
- `src/components/dashboard/date-range-picker.tsx` — shared `DateRangePicker` (All Time/Today/This Week/This Month/Custom) + `getDateRangeBounds(value)` / `isWithinDateRange(dateStr, bounds)` / `dateRangeLabel(value)`. Used by the Leads page KPI row/Reports tab (Phase 13) and the Dashboard (Phase 14). The Calendar page (Phase 15) uses the same Monday-start `(date.getDay()+6)%7` convention for its month grid but does not use `DateRangePicker` itself (it has its own month prev/next nav).
- `src/components/dashboard/widgets/leads-reports.tsx` — 4 recharts widgets (`LeadsBySourceChart`, `LeadsStatusFunnel`, `LeadsPriorityBreakdown`, `LeadsCreatedTrend`) consumed by the Leads page "Reports" tab, each wrapped in the existing `WidgetWrapper`.
- `src/server/analytics.ts`'s `getDashboardData(range?)` / `getAnalyticsData(range?)` accept `AnalyticsRange { from?: string; to?: string }` (ISO date strings, derived from `getDateRangeBounds(...).from/to`). All row sets (`leadRows`/`dealRows`/`contractRows`/`prospectRows`/`customerRows`) are filtered by their creation timestamp (`prospects.qualifiedAt`/`customers.customerSince` for those two tables) via `inRange()`; "Monthly Revenue" and "Tasks Due Today" stay anchored to the real current month/day regardless of the selected range. `revenueTrend()` returns daily buckets (capped at 92 days) when both `from`/`to` are set, else falls back to `lastNMonths()`.

## Dashboard Home (`/dashboard`)
- `src/server/calendar.ts` — `getAllReminders(rangeStart?, rangeEnd?)` unions the `reminders` table across lead/prospect/customer/contact entity types (org-scoped via the same ID-lookup pattern as each entity's own `get*Reminders`), `toggleReminderDone(id, done)`, `snoozeReminder(id, hours=1)` (Postgres `interval` arithmetic via Drizzle `sql`).
- `src/components/dashboard/widgets/pipeline-overview.tsx` — `PipelineOverview` 5-card strip (Leads/Prospects/Deals/Won/Lost), fed by `getDashboardData()`'s `pipelineOverview` field, rendered full-width below the welcome header. The same file also exports `ProspectsByStage` (Phase 29) — a bordered card with a 5-up icon row (Qualified/Proposal Sent/Negotiation/Deal Opened/Lost), fed by `getDashboardData()`'s `prospectsByStage` field (counts of org-scoped, date-range-filtered prospects grouped by `prospects.status`), rendered directly below `PipelineOverview`. Also exports `DealsByStage` (Phase 35) — a bordered card with a 6-up icon row (New/Proposal/Negotiation/Contract/Won/Lost), fed by `getDashboardData()`'s `dealsByStage` field (counts of `scopedDeals` grouped by `deals.stage`), rendered directly below `ProspectsByStage`.
- `src/components/dashboard/widgets/todays-reminders.tsx` — `TodaysReminders` widget, fed by `getAllReminders(startOfToday, endOfToday)`; each row has a type icon, done-toggle, "Snooze 1hr", and a jump-to-entity link (`/dashboard/leads/[id]` for leads; list pages for prospect/customer/contact, which have no detail route yet). Rendered as a third column alongside `LeadVelocity`/`DealHealth`.
- The welcome header's `DateRangePicker` drives `dateRange` state → `getDashboardData(range)`, re-fetching KPI/pipeline/revenue/lead-source/deal-health data on change.

## Calendar Page (`/dashboard/calendar`)
- `src/app/dashboard/calendar/page.tsx` (+ `loading.tsx`) — month-grid view of cross-entity reminders via `getAllReminders(gridStart, gridEnd)` (Phase 15). Grid is 6×7, Monday-start (`(date.getDay()+6)%7` offset), built from a `monthDate` state with prev/next/"Today" controls.
- Each day cell shows up to 3 reminder chips (color-coded by `type` via a local `TYPE_COLORS` map) plus a "+N more" indicator; today is highlighted with `var(--graph-to)`.
- Clicking a day opens a `.t-drawer-panel` listing that day's reminders, reusing `TYPE_ICONS`/`ENTITY_LABELS`/`entityHref` exported from `src/components/dashboard/widgets/todays-reminders.tsx` (also used by the Dashboard's `TodaysReminders` widget — single source of truth for type-icon/entity-label/detail-link mappings).
- Per-reminder actions: done/undone toggle (`toggleReminderDone`), snooze 1hr (`snoozeReminder`, triggers a refetch since `datetime` changes), inline edit (title/type/datetime/note via `validateReminder`/`ReminderValues`, saved via `updateReminder`), delete (`deleteReminder`), and a jump-to-entity link.
- **No "create reminder" flow on this page** — the `reminders` table requires non-null `entityType`/`entityId`, so reminders are always created from an entity's own page (e.g. the lead detail page's Reminders section). Calendar is view/manage-only.
- **Pipeline Activity (Phase 19)** — `getDailyEntityCounts(rangeStart, rangeEnd)` in `src/server/calendar.ts` returns per-day counts of new Leads/Prospects/Deals/Contracts (org-scoped, grouped by `Date.toDateString()`, same convention as reminders). Each day cell shows non-zero counts as small colored badges; the day drawer shows a 2×2 "Pipeline Activity" stat grid (Leads/Prospects/Deals/Contracts) above "Reminders & Follow-ups", each card linking to its list page. Prospect "created" date uses `prospects.qualifiedAt` (no separate `createdAt` column); Contract count is scoped via `contracts.dealId → deals.organizationId`.

## Leads — Owner Assignment & List Scoping (Phase 22)
- **Owner is now a real, assignable field** — `leads.owner_id → users.id`. `createLead`/`updateLead` (`src/server/leads.ts`) accept `owner_id?: string | null`; both the Create/Edit Lead drawer (`src/app/dashboard/leads/page.tsx`) and the lead detail page's Overview edit form (`src/app/dashboard/leads/[id]/page.tsx`) have an "Owner" `<select>` populated from `getTeamMembers()` (`src/server/users.ts`). `leadFormSchema`/`LeadFormValues` includes `owner_id: z.string()` (empty string = unassigned → stored as `NULL`).
- **Leads list excludes converted-to-prospect leads** — `getLeads()` left-joins `prospects` on `prospects.leadId = leads.id` and filters `isNull(prospects.id)`. Once `convertLeadToProspect` inserts a `prospects` row for a lead, that lead drops out of `/dashboard/leads` (it now lives in `/dashboard/prospects`); the underlying `leads` row, `status = "QUALIFIED"`, notes, and reminders are unchanged, and `getLeadById`/the detail page still resolve it directly. Follow this left-join + `isNull(...)` pattern for any future "exclude entities that have moved to the next pipeline stage" list.
- **Free-text custom Owner (Phase 23)** — `leads.owner_name_custom` (nullable `text`) lets a lead be assigned to someone outside the org's team list (no `users` row). The Owner `<select>` in both the Create/Edit drawer and the lead detail Overview edit form has a "+ Add custom owner..." option that reveals a text `<input>`; local `ownerCustomMode` state drives whether the input shows. `createLead`/`updateLead` enforce mutual exclusivity server-side: `ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null)` — picking a real team member always clears any custom name. `toSnakeLead`'s `owner_name` falls back to `ownerNameCustom` when no `users.fullName` is joined, so the Owner column/detail row display the custom name transparently.

## Lead Detail Page (360° View)
- `src/app/dashboard/leads/[id]/page.tsx` (+ `loading.tsx`) — full-page lead detail, replaces the old view drawer (table/grid/kanban "view" actions now `router.push` here).
- Pipeline breadcrumb (Lead → Prospect → Deal → Contract → Customer) comes from `getLeadPipelineStatus(leadId)` in `src/server/leads.ts`, which checks for existing `prospects`/`deals`/`contracts`/`customers` rows linked to the lead.
- Per-lead follow-ups reuse the `tasks` table (`relatedType: "lead"`, `relatedId: leadId`, JSON-packed `description: { type, notes }`) via `getLeadFollowUps`/`createLeadFollowUp`/`updateLeadFollowUp`/`toggleLeadFollowUpDone`/`deleteLeadFollowUp` in `src/server/leads.ts`.
- Activity timeline merges `lead_notes` + `activities` (via `getActivitiesForEntity("lead", leadId)`) + reminders, sorted by time.
- "Convert to Prospect" uses `convertLeadToProspect(leadId, bant)` in `src/server/prospects.ts` — sets the lead to `qualified` and creates a `prospects` row pointing at the existing lead (distinct from `createProspect`, which always creates a new lead+prospect pair).
- Highlight ring (red = overdue follow-up, amber = due-today follow-up, purple = starred) is computed by a shared `getHighlightColor(lead, reminders)` helper, used on the leads list (table/grid/kanban) and the detail-page header avatar.

## Demo Data Seeding
- `seedDemoLeads()` in `src/server/leads.ts` (Phase 16) — inserts 50 demo leads (cycling through all statuses/sources/priorities/industries/cities, `created_at` randomized over the last 90 days), ~40% with a `lead_notes` row and ~30% with a `reminders` row (mix of overdue/due-today/upcoming). No-ops with `{ skipped: true, count }` if the org already has 5+ leads.
- Triggered by a "Load Demo Data" button in `src/app/dashboard/leads/page.tsx`'s header toolbar, shown only when `leads.length < 5`; refetches the leads list on success.

## Schema Reference
Full 40-table schema (provided by user) lives conceptually in `src/db/schema.ts`. Enum definitions sourced from `supabase/migrations/001_schema.sql`:
- `user_role`: SUPER_ADMIN, ORG_ADMIN, SALES_MANAGER, SALES_REP, VIEWER
- `lead_status`: NEW, CONTACTED, INTERESTED, QUALIFIED, REJECTED — **QUALIFIED is UI-hidden as of Phase 21**: not selectable in status pickers/filters/Kanban (Leads list `STAGES` and the lead detail page both use `["NEW","CONTACTED","INTERESTED","REJECTED"]`), but the enum/column/existing rows are unchanged — legacy `QUALIFIED` leads still render and their `<select>` includes `QUALIFIED` as a fallback option so they remain editable. QUALIFIED is reached only via "Convert to Prospect" (`convertLeadToProspect`).
- `deal_stage`: NEW, PROPOSAL, NEGOTIATION, CONTRACT, WON, LOST
- `contract_status`: DRAFT, SENT, SIGNED, EXPIRED
- `task_priority`: LOW, MEDIUM, HIGH
- `field_type`: TEXT, NUMBER, DATE, BOOLEAN

Key adaptation: `users.auth_user_id uuid REFERENCES auth.users(id)` → `users.clerk_user_id text unique not null` (no `auth` schema in Neon).

**Columns added post-migration (Phases 25-26)**:
- `prospects`: `owner_id uuid references users.id`, `owner_name_custom text`, `rating text` ("Hot"/"Warm"/"Cold"), `project_name text`.
- `deals`: `owner_name_custom text` (custom-owner fallback, same pattern as `leads`/`prospects`). `deals.tags text[]` already existed but had no UI until the Phase 26 Convert-to-Deal modal.

**Columns/tables added post-migration (Phases 31-33, Zoho/HubSpot Deal parity)**:
- `deals`: `type text` (Deal Type: New Business / Existing Business - Upsell/Renewal/Replacement — see `DEAL_TYPES` in `src/lib/constants.ts`), `nextStep text`, `campaignSource text`, `contactName text`, `contactRole text` (`CONTACT_ROLES`: Decision Maker/Influencer/Champion/Evaluator/End User/Other), `priority text default 'MEDIUM'` (LOW/MEDIUM/HIGH/URGENT, mirrors `TASK_PRIORITIES`).
- New `dealNotes` table (`id`/`dealId → deals.id`/`text`/`author default 'You'`/`createdAt`), mirrors `prospectNotes`/`leadNotes`.

## Removed
- `@supabase/ssr`, `@supabase/supabase-js` packages
- `src/utils/supabase/` (client.ts, server.ts, middleware.ts)
- `src/app/auth/callback/route.ts`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env vars
- Hidden "Workspace Engine" / AI-agent UI: `src/app/dashboard/workspace-engine/`, `src/components/dashboard/widgets/ai-ready-section.tsx`, `src/lib/ai-data.ts` — dead code (page was never linked in `SIDEBAR_ROUTES`). The 28 backing `agent_*`/`ai_*`/`workflow_*`/etc. tables remain in `src/db/schema.ts`/Neon, unused by any current code path.

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

## Animated Icons (`@animateicons/react`)
`@animateicons/react/lucide` provides drop-in animated replacements for `lucide-react` icons (same names + `Icon` suffix, e.g. `MailIcon`, `DashboardIcon`). Each icon is a `forwardRef` component exposing an imperative handle with `startAnimation()` / `stopAnimation()`.

Pattern: hold a `useRef<any>(null)`, pass it as `ref` to the icon, and call `iconRef.current?.startAnimation()` / `stopAnimation()` from the hover (or focus/blur) handlers on the enclosing element.

- `src/components/auth/login-form.tsx` / `register-form.tsx` — email/password field icons animate on input hover/focus.
- `src/components/dashboard/sidebar/sidebar.tsx` — all `SIDEBAR_ROUTES` nav icons (`ICON_MAP`) use the animated `lucide` set and play on nav-item hover (`onMouseEnter`/`onMouseLeave` on the `<Link>`).

No new dependency was added for this — `@animateicons/react` was already installed for the auth forms.

**Calendar icon (no animated equivalent in `@animateicons/react/lucide`)**: `src/components/dashboard/sidebar/animated-calendar-icon.tsx` exports a `CalendarIcon` that wraps `lucide-react`'s `Calendar` in the same `forwardRef` + `{ startAnimation, stopAnimation }` imperative-handle shape via `useImperativeHandle`. `startAnimation()` bumps a `playKey` state and remounts the icon (`key={playKey}`) with the `.ct-calendar-icon-play` class (globals.css — a one-shot rotate/scale "flip" keyframe, `prefers-reduced-motion`-guarded); `stopAnimation()` is a no-op since the animation is one-shot. Mapped in `ICON_MAP.CalendarIcon` (sidebar.tsx) so it's a drop-in for the other animated icons.

This pattern has been rolled out to all dashboard pages (leads, prospects, deals, contracts, customers, contacts, tasks, team, activities, analytics, settings, dashboard home):
- `ViewSwitcher` where a page has a real Table/Kanban/Grid/List/Calendar/tab switcher (leads, tasks, settings); pages with a single view (prospects, customers, contacts, contracts, team, activities, analytics) skip this step.
- `.view-transition` on each view/content container (table, kanban board, grid, tab panel, timeline, etc.), with a `key="..."` when multiple views share a parent.
- `.t-modal-backdrop` + `.t-modal-pop` on every centered modal (delete confirmations, add note, reminder, column editor, create/invite forms).
- `.t-modal-backdrop` + `.t-drawer-panel` on every right-side drawer (view/create/edit panels).
- `.is-pulsing` on every `loading.tsx` skeleton and widget-level loading skeleton.

**Convention: `@animateicons/react/lucide` is the only animated-icon source for this project.** Do not introduce `@lucide-animated/*` (shadcn registry) or any other animated-icon package — `@lucide-animated` is not a real npm package and `npx shadcn add ...` requires a full shadcn/ui `components.json` init (Radix/Base primitives, Tailwind/CSS-var setup) that this project intentionally does not use. If a needed icon has no animated equivalent in `@animateicons/react/lucide`, follow the `animated-calendar-icon.tsx` pattern: wrap the plain `lucide-react` icon in a `forwardRef` + `useImperativeHandle` shim exposing `{ startAnimation, stopAnimation }`.

- `src/components/dashboard/header/header.tsx` — sidebar-toggle (`MenuIcon`), search (`SearchIcon`), quick-actions (`CirclePlusIcon` + per-item `UserPlusIcon`/`HandCoinsIcon`/`CheckCheckIcon`/`ContactIcon`), notifications (`BellIcon`), theme toggle (`SunIcon`/`MoonIcon`), and user-menu (`UserRoundIcon`/`SettingsIcon`/`LogoutIcon`) all use this hover `startAnimation`/`stopAnimation` pattern.

## Sticky/Overflow Patterns (Phase 18 fixes)
- **Dropdowns inside horizontally-scrollable, sticky-column tables must be portaled.** `overflow-x-auto` implicitly clips the y-axis too, and `position: absolute` inside a `position: sticky` ancestor is bound to that ancestor's box — both cause dropdown menus to clip/overlap. Fix pattern (see the leads table row-action menu, `src/app/dashboard/leads/page.tsx`): render the menu via `createPortal(..., document.body)` as `position: fixed`, compute `top`/`left` from the trigger's `getBoundingClientRect()`, flip upward if it won't fit below, use `z-[9999]`, and close on scroll/resize.
- **Highlight/indicator styles on sticky-column rows must be applied to the sticky cell itself, not just the `<tr>`.** A sticky `<td>`'s own `background` paints over the row's `box-shadow`/outline on that edge. If a row-level highlight needs to be visible at the sticky edge (e.g. the leads table's starred/overdue/due-today left-edge indicator), merge it into that `<td>`'s own `boxShadow`.
- **Sections below the global sticky `Header` (`sticky top-0 z-30 h-16`, 64px) need `top-20`/`scroll-mt-20` (80px), not `top-6`/`scroll-mt-6` (24px)**, for any `position: sticky` side-nav or `scrollIntoView` anchor target — otherwise they render/scroll-to partially behind the header. See the lead detail page (`src/app/dashboard/leads/[id]/page.tsx`) side-nav and section anchors.

## Leads Page — Live-QA Fixes (Phase 21)
- **Column visibility persistence**: `visibleCols` in `src/app/dashboard/leads/page.tsx` is initialized via a lazy `useState` that reads `localStorage["ct-crm-leads-columns"]` (JSON array of column ids, validated before use) and a `useEffect` writes it back on every change — same lazy-init/write-back shape as `theme-provider.tsx`'s `"ct-crm-theme"` key. Use this pattern for any other per-user UI preference that should survive a refresh.
- **All Reminders panel**: clicking the "X reminders" badge opens a `.t-modal-pop` modal listing every active reminder (sorted by datetime, overdue/today color-coded, lead-name link + note), with a "Done" button calling `toggleLeadReminderDone(id, true)` (`src/server/leads.ts`).
- **Custom dropdown values**: the Lead Source field is a preset `<select>` that swaps to a free-text `<input>` when the user types a value outside the preset list (IIFE pattern in the Create/Edit drawer). `availableSources` (presets ∪ distinct values already in `leads`) feeds both the Source filter chips and the Reports tab's source chart — follow this when adding "custom value" support to other enum-like dropdowns (e.g. Industry).
- **`.ct-fade-right` utility** (`globals.css`): `mask-image`/`-webkit-mask-image: linear-gradient(to right, #000 80%, transparent 100%)` — applied to table cells with overflow-prone single-line content (Name tag row, Notes preview) so content fades out at the right edge instead of being hard-clipped. Reusable for any `overflow-hidden whitespace-nowrap` cell.
- **Theme-toggle sound**: `src/lib/sound.ts` exports `playThemeToggleSound(nextTheme)` — a Web Audio (`AudioContext`/`OscillatorNode`/`GainNode`) two-tone chime, no audio assets. Called from the header's theme-toggle `onClick` alongside `toggleTheme()`. Follow this no-asset Web Audio pattern for any future UI sound effects.
- **Modal-open closes stray portaled menus**: an effect in `leads/page.tsx` sets `actionMenuId` to `null` whenever any modal/drawer state becomes true, preventing the row action-menu's `createPortal`/`z-[9999]` from rendering above a modal's `z-50` backdrop. Apply the same effect whenever a new modal is added to a page that also has a portaled `z-[9999]` menu.

## Prospects Page — Full Leads Parity (Phase 24)
`src/app/dashboard/prospects/page.tsx` mirrors the Leads page (Phases 9/10/11/13/16/21) feature-for-feature:
- **Columns + column editor** — 15-column `ALL_COLUMNS` (Prospect/Company/Email/Phone/Budget/Authority/Need/Timeline/Stage/Source/Industry/City/Tags/Qualified/Actions), `name`/`actions` required+sticky, persisted to `localStorage["ct-crm-prospects-columns"]` via the same lazy-init/write-back pattern as `"ct-crm-leads-columns"`.
- **Sticky Prospect (left) + Actions (right) columns**, pagination (`PAGE_SIZES = [10, 50, 100, 200]`, "Showing X–Y of Z"), column-scoped "Search in ▾" (name/company/email/phone/city/industry/tags/need/notes), and a Filters popover (`FilterChipGroup` for Stage/Source/Industry/Tags/Authority, plus Budget min/max and Qualified-date range).
- **KPI row + `DateRangePicker`** — Total Prospects, New This Period, Pipeline Value (₹), In Proposal/Negotiation, Deals Opened, Follow-ups Today — all date-range aware.
- **`ViewSwitcher`: Table / Kanban / Grid / Reports** — Kanban drag-drop (`@dnd-kit/core`) across the 5 `STAGES` calls `updateProspectStatus` on drop; Table has the same portaled `z-[9999]` row-action menu and `getHighlightColor(prospect, reminders)` highlight-ring pattern as Leads.
- **Reports tab** — `src/components/dashboard/widgets/prospects-reports.tsx` (`ProspectsBySourceChart`/`ProspectsStageFunnel`/`ProspectsIndustryBreakdown`/`ProspectsQualifiedTrend`, recharts via `WidgetWrapper`, date-range filtered by `qualified_at`), same shapes as `leads-reports.tsx`.
- **Demo data** — `seedDemoProspects()` in `src/server/prospects.ts` inserts 30 paired lead+prospect rows; "Load Demo Data" button shown when `prospects.length < 5`.

## Prospect Detail Page (360° View), "Add Prospect" Flow & Owner Assignment (Phase 25)
- **New `/dashboard/prospects/new`** — standalone full-page "Add New Prospect" form (Identity / BANT Qualification / Pipeline sections, incl. Owner select + "+ Add custom owner..." and custom-source option). On submit calls `createProspect()` then routes to `/dashboard/prospects/[id]`. The list page's "New Prospect" header button and empty-state button route here instead of opening the create drawer (the drawer remains for **Edit** only).
- **New `/dashboard/prospects/[id]` + `loading.tsx`** — mirrors `leads/[id]/page.tsx`: header (avatar/highlight ring/star/Stage badge/Source badge/BANT badges), 5-stage pipeline breadcrumb (Lead → Prospect → Deal → Contract → Customer) from `getProspectPipelineStatus(prospectId)` (`src/server/prospects.ts`, walks `deals.prospectId → contracts.dealId → customers.contractId`, plus the originating `lead_id`), quick-actions (Log Call/Email/Meeting via `createActivity` with `relatedType:"prospect"`, Set Reminder, Schedule Follow-up, Convert to Deal / "View Deal" once converted), side-nav (Overview/Activity/Follow-ups/Notes/Reminders + Cadence/Checklist from Phase 27), Overview edit form (incl. Owner select), Activity Timeline (`getActivitiesForEntity("prospect", id)` + `pnotes`), Notes (`addProspectNote`), Reminders (`getProspectReminders`/`createProspectReminder`).
- **Per-prospect follow-ups** reuse the `tasks` table (`relatedType:"prospect"`) via `getProspectFollowUps`/`createProspectFollowUp`/`toggleProspectFollowUpDone`/`deleteProspectFollowUp` in `src/server/prospects.ts` — same shape as the Lead follow-up CRUD.
- **Owner assignment** — `prospects.owner_id → users.id` + `prospects.owner_name_custom: text`, same mutual-exclusivity write rule as Leads (Phase 22/23): `createProspect`/`updateProspect` set `ownerNameCustom: input.owner_id ? null : (input.owner_name_custom || null)`. `getProspects()`/`getProspectById()` left-join `users` on `ownerId` and fall back to `ownerNameCustom` for `owner_name`. `convertLeadToProspect` carries the lead's `ownerId`/`ownerNameCustom` onto the new prospect row.
- **Navigation**: row clicks (Table/Kanban/Grid), "View Details" row action, and "All Reminders" panel prospect links all `router.push(/dashboard/prospects/[id])` — the right-side View Drawer was removed entirely (same as Leads Phase 12). `todays-reminders.tsx`'s `entityHref("prospect", id)` now returns `/dashboard/prospects/${id}`.

## Prospect CRM Fields (Rating/Project) & Convert to Deal (Phase 26)
- **New fields** — `prospects.rating: text` ("Hot"/"Warm"/"Cold") and `prospects.project_name: text` (free-text "opportunity" name, like a Deal Name placeholder before a Deal exists). Wired into: the Prospects list (`ALL_COLUMNS` "Rating"/"Project" columns, a Rating multi-select `FilterChipGroup`, and `getRatingColor`/`RatingBadge` helpers — Hot=red/Warm=amber/Cold=blue — used across Table/Kanban/Grid), the Create/Edit drawer's Pipeline section, `/dashboard/prospects/new`, and the detail page header (`RatingBadge`) + Overview edit form + view-mode "Deal Info" (Project row).
- **`convertProspectToDeal(prospectId, input)`** (`src/server/deals.ts`) — validates the prospect via `prospects.leadId → leads.organizationId`, inserts a `deals` row carrying `leadId`/`prospectId`/`title`/`value`/`stage`/`probability`/`ownerId`/`ownerNameCustom`/`expectedCloseDate`/`companyName`/`notes`/`tags`, sets the prospect's `status` to `"DEAL_OPENED"`, returns `{ id }`. `deals.owner_name_custom: text` was added alongside (same custom-owner pattern as Leads/Prospects).
- **Convert-to-Deal modal** on `/dashboard/prospects/[id]` — full form (Deal Title*, Value (₹)*/Probability (%), Stage/Expected Close Date, Company Name, Owner select + custom-owner fallback, **Tags** — first UI surface for `deals.tags`, which existed in schema with no UI until now), prefilled from the prospect (`project_name`/`budget`/`company`/`owner`/`tags`). Submitting calls `convertProspectToDeal()` then routes to `/dashboard/deals`.
- **`src/lib/validations/deal-conversion.ts`** — `dealConversionSchema`/`validateDealConversion()` (title*, value* numeric ≥0, stage enum, probability 0-100, optional expected_close_date), mirroring `prospect-conversion.ts`'s `validate*` pattern.

## Cadence Board & Follow-up Checklist (Phase 27)
Two shared, read-only "engagement" widgets backed by deterministic dummy data (no DB tables), added as new side-nav sections on **both** `leads/[id]/page.tsx` and `prospects/[id]/page.tsx` (after "Follow-ups"):
- **`src/components/dashboard/widgets/cadence-board.tsx`** — `buildDemoCadence(entityId, entityLabel)` seeds a `mulberry32` PRNG from a hash of `entityId` to build a 5-column board (`"Follow-up 1"`..`"Follow-up 5"`), each with 1-2 step cards (Mail/PhoneCall/ListChecks icon, "Do this N days after..." trigger text, `"Non-engaged {entityLabel} Follow-up N"` template name, Sent/Opened/Completed/Scheduled status badge). `CadenceBoard({ columns })` renders the horizontally-scrollable board.
- **`src/components/dashboard/widgets/followup-checklist.tsx`** — `buildDemoChecklist(entityId)` seeds the same PRNG scheme for 8-10 `{label, due_date, done}` rows. `FollowupChecklist({ items })` renders `[status circle/check] [label] [date pill]` rows, reusing the overdue (red)/due-today (amber)/on-track (green) color tokens from the Follow-ups section.
- Both helpers are deterministic per `entityId` (stable across re-renders/visits, not random). Detail pages compute `cadenceColumns`/`checklistItems` via `useMemo(() => buildDemoCadence(entity?.id || id, "Leads"|"Prospects"), [...])` / `buildDemoChecklist(...)`.

## "Related To" Activity Targeting & Cross-Entity Reminders (Phase 28)
- **`createReminder(entityType, entityId, entityName, input)`** (`src/server/calendar.ts`) — entity-agnostic reminder insert (mirrors `createLeadReminder`/`createProspectReminder`), reuses the shared `reminders` table so results surface on `/dashboard/calendar` and the notifications bell for any entity type.
- **Log Call/Email/Meeting inline form** on both `leads/[id]/page.tsx` and `prospects/[id]/page.tsx` gained:
  - A "Related To" `<select>` (`logRelatedTo`, default `"self"`) offering the entity's linked pipeline stages — Deal/Contract/Customer (via `pipeline.deal_id`/`contract_id`/`customer_id`), and on the Prospect page also "Originating Lead" (`pipeline.lead_id`). `handleLogActivity` resolves `related_type`/`related_id`/`entity_name` from the selection before calling `createActivity`, and only appends to the local timeline when the target is the entity itself.
  - An "Add reminder for this" checkbox revealing a `datetime-local` input (`logAddReminder`/`logReminderDatetime`); on submit also calls `createReminder(...)`.

## Deals Page — Full Table/Kanban/Grid/Reports Parity (Phase 32)
`src/app/dashboard/deals/page.tsx` was rewritten from a 321-line Kanban-only board to mirror `prospects/page.tsx`'s Phase 24 structure:
- **16-column `ALL_COLUMNS`** (Deal/Company/Contact Name/Stage/Type/Value/Expected Revenue/Probability/Expected Close/Owner/Campaign Source/Tags/Next Step/Priority/Created/Actions), `title`/`actions` required+sticky, persisted to `localStorage["ct-crm-deals-columns"]`.
- **Sticky Deal (left) + Actions (right)** columns via `DealsTable`, pagination (`PAGE_SIZES = [10, 50, 100, 200]`), column-scoped "Search in ▾" (title/company/contact name/tags/next step/notes), and a Filters popover (Stage/Type/Campaign Source/Tags/Priority chips + Value ₹ range + Expected-close-date range).
- **KPI row + `DateRangePicker`** — Total Pipeline Value, Weighted Forecast (₹), Open Deals, Won This Period, Avg Deal Size, Closing This Week.
- **`ViewSwitcher`: Table / Kanban / Grid / Reports.** Kanban keeps the 6 `STAGES` columns via `@dnd-kit/core` drag-drop (`updateDealStage` on drop). Grid is a card layout with stage/priority badges. Reports tab is `src/components/dashboard/widgets/deals-reports.tsx` (`DealsByStageFunnel`, `DealsByTypeBreakdown`, `DealsByCampaignSourceChart`, `DealsCreatedVsClosingTrend`), computed client-side from the fetched `deals` array + `dateRange`.
- **"New Deal" drawer** expanded to Deal Information / Pipeline & Value / Contact & Campaign / Owner & Tags sections (Zoho-style Create-Deal fields).
- **`seedDealsFromProspects()`** (`src/server/deals.ts`) — "Load Demo Data" (shown when `deals.length < 5`) converts existing `DEAL_OPENED` prospects into deals via `convertProspectToDeal`, varying type/campaign source/next step/contact/tags/expected close/stage/priority; ~30% get reminders, ~40% get a `dealNotes` entry.
- Row click (Table/Kanban/Grid) → `router.push(/dashboard/deals/${id})` (Phase 33 detail page).

## Deal Detail Page (360°), Pipeline Continuity & Stage Pipeline Bar (Phase 33-34)
- `src/app/dashboard/deals/[id]/page.tsx` (+ `loading.tsx`) mirrors `prospects/[id]/page.tsx`'s Phase 25 structure, replacing the Prospect BANT row with a **4-card commercial-terms summary** (Value ₹ / Probability / Expected Close / Owner).
- **`getDealById(id)`** (`src/server/deals.ts`) returns full Lead→Prospect→Deal continuity: `lead: {first_name,last_name,company?,email?,phone?,website?,linkedin?,employee_count?,priority?}` and, when `prospect_id` is set, `prospect: {budget,authority,need?,timeline?,rating?,project_name?,industry?,city?}`, plus `dnotes` (from the new `dealNotes` table). The detail page renders these as read-only "Originating Lead" and "Originating Prospect (BANT)" panels — the latter only when `deal.prospect` is present.
- **`getDealPipelineStatus(dealId)`** → `{stage:"deal"|"contract"|"customer", lead_id?, prospect_id?, contract_id?, customer_id?}`, drives the Lead→Prospect→Deal→Contract→Customer breadcrumb (same `PIPELINE_STAGES`/`stageHref` pattern as the Prospect detail page).
- **`src/components/dashboard/widgets/deal-stage-bar.tsx`** — `DealStagePipeline({ stage, onStageClick })`, a Zoho-style horizontal progress bar across `NEW→PROPOSAL→NEGOTIATION→CONTRACT→WON` (each pill clickable, calling `updateDealStage` via `handleStageChange`) plus a separate "Lost" pill that highlights red when `stage === "LOST"`. Also exports `getStageStyle`/`FORWARD_STAGES`/`DealStage` for reuse. Rendered below the commercial-terms summary on the detail page.
- **Quick actions**: Log Call/Email/Meeting (with "Related To" selector: self/lead/prospect/contract/customer based on `pipeline` ids), Set Reminder, Schedule Follow-up, Mark Won/Mark Lost (`handleStageChange("WON"|"LOST")`), and Generate/View Contract.
- **Contract conversion** — `convertDealToContract(dealId)` (`src/server/contracts.ts`) validates org ownership, generates `contractNumber: CT-${Date.now().toString(36).toUpperCase()}`, inserts a `DRAFT` `contracts` row with `value: deal.value`. "Generate Contract" quick action shows when `deal.stage === "WON"` and no contract exists yet; "View Contract" (→ `/dashboard/contracts`) shows once `pipeline.contract_id` is set.
- **Follow-ups/Notes/Reminders/Cadence/Checklist** sections reuse the same patterns as the Prospect detail page (`getDealFollowUps`/`createDealFollowUp`/etc. on `tasks` with `relatedType:"deal"`; `addDealNote`/`dealNotes`; generic `createReminder("deal", dealId, ...)`/`getDealReminders`; `buildDemoCadence(id,"Deals")`/`buildDemoChecklist(id)`).
- `src/components/dashboard/widgets/todays-reminders.tsx` — `ENTITY_LABELS.deal = "Deal"` and `entityHref` route `"deal"` → `/dashboard/deals/${id}`.

## Global Header (`src/components/dashboard/header/header.tsx`)
- **Search (⌘K)**: modal input is wired to `globalSearch(query)` (`src/server/search.ts`, `"use server"`), debounced 250ms, min 2 chars. Cross-entity, org-scoped search over leads/deals/contacts/customers (5 results each), returning `{ id, type, title, subtitle, href }`. Clicking a result navigates and closes the modal.
- **Quick Actions ("+")**: each item (`Create Lead/Deal/Task/Contact`) routes to its list page with `?new=1`. Those pages (`leads`, `deals`, `tasks`, `contacts`) read this via `useSearchParams` in a `useEffect`, call `resetForm()` (where applicable) + open their existing create modal/drawer state (`isCreateOpen`/`isModalOpen`), then `router.replace()` to strip the param.
- **Notifications bell**: badge count + dropdown are populated from `getAllReminders()` (`src/server/calendar.ts`), filtered client-side to `!done && datetime <= endOfToday` (overdue = red dot, due-today = amber dot). Clicking an item routes to the owning entity (`lead` → `/dashboard/leads/[id]`, others → their list page).
- **User menu "Profile"**: routes to `/dashboard/settings?tab=security`. The settings page (`src/app/dashboard/settings/page.tsx`) reads the initial active tab from `?tab=` via `useSearchParams` (falls back to `"organization"` if missing/invalid).
