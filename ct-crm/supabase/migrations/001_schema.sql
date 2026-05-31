-- ============================================
-- CT-CRM Phase 1 — Complete Database Schema
-- Based on FRD v1.0.0 Production Blueprint
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. USERS TABLE (linked to auth.users)
-- ============================================
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'SALES_MANAGER', 'SALES_REP', 'VIEWER');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'SALES_REP',
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_auth ON users(auth_user_id);

-- ============================================
-- 3. LEADS TABLE
-- ============================================
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'REJECTED');

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT DEFAULT 'DIRECT',
  status lead_status DEFAULT 'NEW',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_status ON leads(status);

-- ============================================
-- 4. PROSPECTS TABLE (BANT Framework)
-- ============================================
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  budget DECIMAL(15, 2),
  authority BOOLEAN DEFAULT false,
  need TEXT,
  timeline TEXT,
  qualified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  qualified_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. DEALS TABLE
-- ============================================
CREATE TYPE deal_stage AS ENUM ('NEW', 'PROPOSAL', 'NEGOTIATION', 'CONTRACT', 'WON', 'LOST');

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  stage deal_stage DEFAULT 'NEW',
  probability INT DEFAULT 10,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  expected_close_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deals_org ON deals(organization_id);
CREATE INDEX idx_deals_stage ON deals(stage);

-- ============================================
-- 6. CONTRACTS TABLE
-- ============================================
CREATE TYPE contract_status AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'EXPIRED');

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contract_number TEXT UNIQUE NOT NULL,
  status contract_status DEFAULT 'DRAFT',
  value DECIMAL(15, 2) DEFAULT 0,
  file_url TEXT,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  lifetime_value DECIMAL(15, 2) DEFAULT 0,
  customer_since TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'ACTIVE'
);

-- ============================================
-- 8. TASKS TABLE
-- ============================================
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  priority task_priority DEFAULT 'MEDIUM',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  related_type TEXT NOT NULL,
  related_id UUID NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_org_assigned ON tasks(organization_id, assigned_to);

-- ============================================
-- 9. NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  related_type TEXT NOT NULL,
  related_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notes_related ON notes(related_type, related_id);

-- ============================================
-- 10. ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  related_type TEXT NOT NULL,
  related_id UUID NOT NULL,
  entity_name TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_org ON activities(organization_id);

-- ============================================
-- 11. CUSTOM FIELD DEFINITIONS
-- ============================================
CREATE TYPE field_type AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN');

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type field_type DEFAULT 'TEXT',
  related_module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, field_name, related_module)
);

-- ============================================
-- 12. CUSTOM FIELD VALUES
-- ============================================
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  UNIQUE(definition_id, lead_id)
);

-- ============================================
-- 13. DASHBOARD LAYOUTS (User preferences)
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout_config JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their org's data
-- (Simplified policies — production would be more granular)

CREATE POLICY "Users can view own org" ON organizations
  FOR ALL USING (true);

CREATE POLICY "Users can view org users" ON users
  FOR ALL USING (true);

CREATE POLICY "Users can manage org leads" ON leads
  FOR ALL USING (true);

CREATE POLICY "Users can manage prospects" ON prospects
  FOR ALL USING (true);

CREATE POLICY "Users can manage deals" ON deals
  FOR ALL USING (true);

CREATE POLICY "Users can manage contracts" ON contracts
  FOR ALL USING (true);

CREATE POLICY "Users can manage customers" ON customers
  FOR ALL USING (true);

CREATE POLICY "Users can manage tasks" ON tasks
  FOR ALL USING (true);

CREATE POLICY "Users can manage notes" ON notes
  FOR ALL USING (true);

CREATE POLICY "Users can manage activities" ON activities
  FOR ALL USING (true);

CREATE POLICY "Users can manage custom fields" ON custom_field_definitions
  FOR ALL USING (true);

CREATE POLICY "Users can manage field values" ON custom_field_values
  FOR ALL USING (true);

CREATE POLICY "Users can manage layouts" ON dashboard_layouts
  FOR ALL USING (true);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
