# Next-Gen AI-Native Glassmorphic CRM — Project Context

Welcome! This document is the single source of truth (SSOT) for the CRM project structure, database schemas, and architectural guidelines. It is designed to allow any incoming AI agent or software engineer to understand the system instantly.

---

## 1. Project Vision & Aesthetic System
- **Objective:** Fully transition manual sales operations out of fragmented spreadsheets into a unified, ambient, real-time workspace.
- **Aesthetic Theme:** Dark mode by default with soft translucent blurs, curated HSL colors, neon teal highlights, and micro-scaling transitions.
- **Glassmorphism Spec:**
  ```css
  background: rgba(26, 26, 26, 0.45);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  ```

---

## 2. Core Technology Stack
| Layer | Selected Tech | Details & Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router, TS) | Dynamic Client-Side rendering for dashboards, fast layout routing. |
| **Styling Engine** | Tailwind CSS + Vanilla CSS | Ambient dark colors, glassmorphic card boundaries, custom transitions. |
| **Database & Auth** | Supabase (PostgreSQL) | Native authentication, REST API access, Row-Level Security (RLS). |
| **ORM Interface** | Prisma ORM | Complete type safety mirroring PostgreSQL tables to TS interfaces. |
| **Data Viz** | Recharts Library | SVG-rendered fluid graphs (Pipeline Funnel, Revenue Trends). |
| **Drag & Drop** | `@dnd-kit/core` | Multi-column Kanban board card movements in the Deals module. |
| **Export/Import** | `xlsx` (SheetJS) | Bi-directional Excel ledger backups for lead streams. |
| **AI Processing** | OpenAI & Anthropic API | Large Language Models (LLM) for Copilot, scores, and messaging. |
| **Social Sign-In** | Google OAuth2 (Supabase) | Unified single-sign-on OAuth2 auth provider logic. |

---

## 3. Database Architecture & Schema Spec
The CRM operates on a highly relational schema with strict multi-tenancy rules (`organization_id` partitions all resources). 

### Conceptual Entity Relationships
```
[User] (Owner) ── manages ── [Lead] ── qualify trigger ──> [Prospect] (BANT Gate) ──> [Deal] (Kanban)
  │                            │                             │                          │
  └── assigned ── [Task] <─────┘                             └── associated ────────────┼── [Contract]
  │                                                                                     │
  └── logged ──── [Activity] <──────────────────────────────────────────────────────────┘
```

### Relational Table Structures (Phase 1 Base)
- **`organizations` (Tenants):** Core workspace rows containing names, website domains, and timestamps.
- **`users` (RBAC Users):** System accounts mapping to `SUPER_ADMIN`, `ORG_ADMIN` (Company Owner), `SALES_MANAGER`, `SALES_REP`, or `VIEWER`.
- **`leads` (Prospects Intake):** Incoming client records tagged with `status` (`NEW`, `CONTACTED`, `INTERESTED`, `QUALIFIED`, `REJECTED`) and marketing `source`.
- **`prospects` (BANT qualification gate):** Stores evaluation parameters (budget check, authority validation, need identification, and timeline schedule).
- **`deals` (Pipeline Opportunities):** Traded values sorted across stages (`NEW`, `PROPOSAL`, `NEGOTIATION`, `CONTRACT`, `WON`, `LOST`) with weighted revenue forecasting.
- **`contracts` (Agreement Ledger):** Signature records tracking `status` (`DRAFT`, `SENT`, `SIGNED`, `EXPIRED`) and e-signature integrity logs.
- **`customers` (Paying Retainers):** Active corporate customers tracking overall Lifetime Value (LTV) and health indexes.
- **`tasks` (Calendaring Checklist):** Time-bound reminders linked to entities, categorized by priority levels (`low`, `medium`, `high`, `urgent`).
- **`activities` (Chronological Feed):** Immutable timeline entries tracking user changes (`LEAD_CREATED`, `STATUS_CHANGE`, `DEAL_WON`, etc.).
- **`notes` (Shared Notes):** Free-form team conversations and discussions appended to lead files.

### Relational Table Structures (Phase 2 AI Extensions)
- **`lead_scores`:** Dynamic lead evaluation indexes (0-100 rating based on company size, sources, timelines).
- **`lead_enrichment`:** Autoloaded metadata profiles (website employees count, LinkedIn URLs).
- **`ai_suggestions`:** Recommended CRM actions displayed inside the Copilot Sidebar.
- **`meeting_transcripts` / `meeting_summaries`:** Audio logs and actionable item checklists synced from Google Meet/Zoom/Teams.
- **`workflow_definitions` / `workflow_runs`:** Automated flow scripts triggers (Status Move -> Task Creation).
- **`forecast_snapshots`:** Revenue planning estimations and confidence indexes.
- **`whatsapp_conversations` / `whatsapp_messages`:** Two-way customer dialogue history.
- **`contract_scores`:** Engagement rating checking views, response velocities, and contract readiness.
- **`deal_risk_scores`:** Flags showing stalled opportunity parameters (Low to Critical).
- **`ai_interactions` / `prompt_logs`:** Logging parameters tracking tokens consumed, models called, and prompt queries.

### Relational Table Structures (Phase 3 Autonomous Extensions)
- **`ai_agents`:** Agent identity settings (active task parameters, specialized prompts, instructions).
- **`agent_tasks`:** Micro-schedules assigned to virtual agents (SDR email dispatches, CRM duplicates scan checks).
- **`agent_memories`:** Persistent organizational knowledge records matching semantic search prompts.
- **`agent_conversations`:** Inter-agent dialogue records executing joint pipelines (SDR negotiating with Proposal).
- **`proposal_versions` / `proposal_analytics`:** Dynamic offer drafts tracking custom discount approval stages and telemetry metrics.
- **`meeting_intelligence`:** Structured speaking scripts, objection battle cards, and question suggestions.
- **`knowledge_embeddings`:** Vector indexes storing corporate docs, call audios, and files.
- **`customer_health_scores` / `churn_predictions`:** Analytics tracking renewals and churn warnings.
- **`revenue_predictions`:** Semi-autonomous predictive cash-flow models.
- **`agent_workflows`:** Custom triggers routed through AI reasoning pipelines.
- **`executive_insights`:** CEO strategic commands log.
- **`agent_audit_logs`:** Time-travel trace ledgers tracking AI actions.

---

## 4. Key Directories & File Map
All application modules reside within the `/ct-crm/src` directory:

```
/ct-crm
├── supabase/
│   ├── migrations/001_schema.sql     # Base PostgreSQL schemas & RLS configs
│   ├── setup.mjs                     # Seeding Script using REST client
│   └── seed.mjs                      # Supplemental seed datasets
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Login, registration, and onboarding flows
│   │   ├── dashboard/                # Main authenticated shell routes
│   │   │   ├── activities/           # Chronological interaction feeds
│   │   │   ├── analytics/            # Funnel progression & attribution charts
│   │   │   ├── contacts/             # Unified buyer stakeholder directory
│   │   │   ├── contracts/            # Document ledgers & e-signature logs
│   │   │   ├── customers/            # LTV metrics and account health dashboards
│   │   │   ├── deals/                # Kanban visual board with drag-and-drop
│   │   │   ├── leads/                # Leads intake hub & import/export engine
│   │   │   ├── prospects/            # BANT qualification gates
│   │   │   ├── tasks/                # Calendar grids, task checklists, and schedulers
│   │   │   └── settings/             # System customization & dynamic field engines
│   ├── components/                   # Reusable glassmorphic UI layout widgets
│   ├── hooks/                        # Custom React hooks (e.g. useUser)
│   └── utils/
│       └── supabase/                 # Supabase client-side configurations
```

---

## 5. Live Database Sync & Mock Data Fail-safe
To support extreme performance and local development:
- **Active Supabase Hooks:** Every module is fully wired to query active Supabase API tables.
- **High-Fidelity Mocks:** In the event that database tables are missing or not populated yet, all modules automatically catch exceptions and fall back to robust offline/demo data structures. 
- **Offline Sandbox:** This dual-layer layout allows full sandbox evaluation of all application screens without demanding a running database connection.

---

## 6. How to Run the Project
1. **Initialize Project:**
   ```bash
   cd ct-crm
   npm install
   ```
2. **Execute Database Seeding (Rest API Populate):**
   ```bash
   node supabase/setup.mjs
   ```
3. **Launch Dev Server:**
   ```bash
   npm run dev
   ```

---

## 7. Interactive User Workflows & Scenario Verification
To evaluate the Phase 3 features, verify these detailed manual testing scenarios in the frontend control panel:

### Scenario A: Dynamic Field & Calculated Spreadsheet Engine (Pillar 2 & 3)
* **Goal:** Create a schema field on the fly, edit values, and check dynamic formula recalculations.
* **Test Flow:**
  1. Go to **Excel/Airtable Workspace** tab.
  2. Click **Add Field** on the top right.
  3. Enter column name (e.g. `GST Registration`) and select data type `Text / String`. Click **Create Column**.
  4. Notice the grid inserts the column dynamically. Click any cell inside the column, type a value, and click the checkmark to save it to the live grid row.
  5. Edit an **Est. Value** cell (e.g. change Vikram Singh's from `₹4,50,000` to `₹5,00,000`). The **AI Commission** calculated column (governed by the custom formula bar above) instantly recalculates in real-time to `₹75,000` (based on `value * 0.15`).

### Scenario B: Smart CSV Import Platform (Pillar 7)
* **Goal:** Simulate ingestion mapping.
* **Test Flow:**
  1. Open **Smart Import Platform** tab.
  2. Select **Excel / CSV File Upload** card.
  3. Inspect the active schema mapping console (e.g., mapping CSV headers to CT-CRM fields like `Acquisition Channel ──> source`).
  4. Click **Execute Automated Import**. Notice the dynamic loading feedback, and then inspect the spreadsheet grid where new imported lead rows are cleanly appended.

### Scenario C: Multi-Agent AI SDR & CRM Pipeline (Pillar 1)
* **Goal:** Observe automated lead qualification and record creations.
* **Test Flow:**
  1. Open **AI SDR Workforce Console** tab.
  2. Click **Trigger AI Workforce**.
  3. Watch the visual pipeline execute:
     * **SDR Agent** ingests and qualifiers lead Vikram Singh via BANT score metrics (92/100 HOT lead).
     * **CRM Agent** audits duplicate records, establishes the Account profile, and logs a calendar check task.
     * **Proposal Agent** compiles customized pricing SOW documents.
     * **Meeting Agent** structures Zoom objection cards.
  4. Monitor logs on the real-time event timeline and notice records are auto-appended to the leads table.

### Scenario D: No-Code Visual Workflows (Pillar 4)
* **Goal:** Verify automated rules and alerts.
* **Test Flow:**
  1. Open **No-Code Workflow Builder** tab.
  2. Inspect active triggers mapping (Trigger ──> Condition IF ──> Action).
  3. Click **Test Flow** on any rule. Verify manual triggers successfully send pop-up confirmation alerts.

### Scenario E: Cost Proposal & E-Signature Badging (Pillar 10)
* **Goal:** Edit Statement of Work cost items and cryptographic signs.
* **Test Flow:**
  1. Open **Quotation SOW Platform** tab.
  2. Edit items quantities or discounts on the left configuration panel. Notice subtotal, 18% standard GST, and grand total recalculate dynamically in the live PDF preview side panel.
  3. Type your signature name in the signature field and click **Apply Digital Signature**. Watch the document terms lock and stamp a verified green cryptographic SHA-256 digital certificate badge.

### Scenario F: Universal Relationship Graph Nodes (Pillar 5)
* **Goal:** Inspect connected pipeline entities.
* **Test Flow:**
  1. Open **Relationship Visualizer** tab.
  2. Hover or click on node buttons (`Lead`, `Contact`, `Deal Opportunity`, `Contract SOW`).
  3. Verify the Universal Node Context Analysis card displays real-time AI decision-making criteria (e.g., attribution channels, conversion statistics, e-sign validation hashes).

### Scenario G: Enterprise Auditing & History Time Travel (Pillar 14 & 15)
* **Goal:** Replay past states of database tables.
* **Test Flow:**
  1. At the top of the command dashboard, locate the **DB Time Travel** slider card.
  2. Drag the slider range indicator back (e.g. from Snapshot V4 to V2).
  3. Watch the Airtable grid and forecasted metric values dynamically rewind in real-time, displaying exactly how the database was structured at that past snapshot timestamp!

