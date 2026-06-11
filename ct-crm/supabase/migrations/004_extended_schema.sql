-- ============================================================
-- CT-CRM Migration 004 — Extended Schema for Full Feature Set
-- Run this in Supabase SQL Editor → SQL Editor → New Query
-- ============================================================

-- ─── 1. LEADS: add extended columns ─────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS estimated_value  DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website          TEXT,
  ADD COLUMN IF NOT EXISTS linkedin         TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS country          TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS industry         TEXT,
  ADD COLUMN IF NOT EXISTS employee_count   TEXT,
  ADD COLUMN IF NOT EXISTS priority         TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS starred          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags             TEXT[] DEFAULT '{}';

-- ─── 2. PROSPECTS: add extended columns ─────────────────────
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'QUALIFIED',
  ADD COLUMN IF NOT EXISTS source     TEXT DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS industry   TEXT,
  ADD COLUMN IF NOT EXISTS city       TEXT,
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS starred    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags       TEXT[] DEFAULT '{}';

-- ─── 3. CUSTOMERS: add extended columns ──────────────────────
-- Make contract_id optional (allow standalone customers)
ALTER TABLE customers
  ALTER COLUMN contract_id DROP NOT NULL;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS total_deals        INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_interactions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_score       INT DEFAULT 80,
  ADD COLUMN IF NOT EXISTS contract_status    TEXT DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS contract_title     TEXT,
  ADD COLUMN IF NOT EXISTS contract_value     DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS industry           TEXT,
  ADD COLUMN IF NOT EXISTS city               TEXT,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS starred            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags               TEXT[] DEFAULT '{}';

-- ─── 4. CONTACTS TABLE (new standalone table) ────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  first_name      TEXT,
  last_name       TEXT,
  contact_name    TEXT,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  job_title       TEXT,
  department      TEXT,
  status          TEXT DEFAULT 'ACTIVE',
  lifetime_value  DECIMAL(15,2) DEFAULT 0,
  customer_since  TIMESTAMPTZ DEFAULT now(),
  website         TEXT,
  linkedin_url    TEXT,
  industry        TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'India',
  notes           TEXT,
  starred         BOOLEAN DEFAULT false,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users can manage contacts'
  ) THEN
    CREATE POLICY "Users can manage contacts" ON contacts FOR ALL USING (true);
  END IF;
END $$;

-- ─── 5. LEAD_NOTES TABLE (activity notes per lead) ───────────
CREATE TABLE IF NOT EXISTS lead_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  author     TEXT DEFAULT 'You',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lead_notes' AND policyname = 'Users can manage lead notes'
  ) THEN
    CREATE POLICY "Users can manage lead notes" ON lead_notes FOR ALL USING (true);
  END IF;
END $$;

-- ─── 6. CONTACT_NOTES TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  author      TEXT DEFAULT 'You',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_notes' AND policyname = 'Users can manage contact notes'
  ) THEN
    CREATE POLICY "Users can manage contact notes" ON contact_notes FOR ALL USING (true);
  END IF;
END $$;

-- ─── 7. PROSPECT_NOTES TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS prospect_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  author      TEXT DEFAULT 'You',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospect_notes_prospect ON prospect_notes(prospect_id);
ALTER TABLE prospect_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prospect_notes' AND policyname = 'Users can manage prospect notes'
  ) THEN
    CREATE POLICY "Users can manage prospect notes" ON prospect_notes FOR ALL USING (true);
  END IF;
END $$;

-- ─── 8. CUSTOMER_NOTES TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  author      TEXT DEFAULT 'You',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_notes' AND policyname = 'Users can manage customer notes'
  ) THEN
    CREATE POLICY "Users can manage customer notes" ON customer_notes FOR ALL USING (true);
  END IF;
END $$;

-- ─── 9. REMINDERS TABLE (universal — links to any entity) ────
CREATE TABLE IF NOT EXISTS reminders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  TEXT NOT NULL,  -- 'lead' | 'contact' | 'prospect' | 'customer' | 'deal'
  entity_id    UUID NOT NULL,
  entity_name  TEXT,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'call',  -- 'call'|'email'|'meeting'|'follow_up'
  datetime     TIMESTAMPTZ NOT NULL,
  note         TEXT,
  done         BOOLEAN DEFAULT false,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_entity ON reminders(entity_type, entity_id);
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND policyname = 'Users can manage reminders'
  ) THEN
    CREATE POLICY "Users can manage reminders" ON reminders FOR ALL USING (true);
  END IF;
END $$;

-- ─── 10. DEALS: add missing columns ─────────────────────────
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS starred      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags         TEXT[] DEFAULT '{}';

-- ─── 11. Contacts auto-update trigger ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 12. Seed initial contacts from leads data ───────────────
-- (Safe to run multiple times — only inserts if contacts is empty)
DO $$
DECLARE
  org_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  IF (SELECT COUNT(*) FROM contacts) = 0 THEN
    INSERT INTO contacts (organization_id, first_name, last_name, contact_name, email, phone, company, job_title, status, lifetime_value, industry, city, tags)
    SELECT
      organization_id,
      first_name, last_name,
      first_name || ' ' || last_name,
      email, phone, company,
      CASE source
        WHEN 'GOOGLE' THEN 'Marketing Manager'
        WHEN 'REFERRAL' THEN 'VP Sales'
        WHEN 'DIRECT' THEN 'CEO'
        ELSE 'Head of IT'
      END,
      CASE status
        WHEN 'QUALIFIED' THEN 'ACTIVE'
        WHEN 'INTERESTED' THEN 'PROSPECT'
        ELSE 'PROSPECT'
      END,
      COALESCE(estimated_value, 0),
      industry, city,
      ARRAY[source]
    FROM leads
    LIMIT 20;
  END IF;
END $$;

-- ─── Done ────────────────────────────────────────────────────
-- Summary of what this migration adds:
-- • leads:         estimated_value, website, linkedin, city, country, industry, employee_count, priority, starred, tags
-- • prospects:     status, source, industry, city, notes, starred, tags
-- • customers:     phone, total_deals, total_interactions, health_score, contract_status, contract_title, contract_value, industry, city, notes, starred, tags (contract_id now optional)
-- • deals:         company_name, notes, starred, tags
-- • NEW contacts:  full contact directory table
-- • NEW lead_notes, contact_notes, prospect_notes, customer_notes: per-entity note threads
-- • NEW reminders: universal reminder table for all entity types
