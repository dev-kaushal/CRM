-- ============================================
-- CT-CRM Phase 2 — AI Revenue Operating System
-- Database Schema Expansion Migrations
-- ============================================

-- 1. LEAD SCORES TABLE
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score INT CHECK (score >= 0 AND score <= 100) NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage lead scores" ON lead_scores FOR ALL USING (true);

-- 2. LEAD ENRICHMENT TABLE
CREATE TABLE IF NOT EXISTS lead_enrichment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID UNIQUE NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  website TEXT,
  industry TEXT,
  employee_count INT,
  linkedin_url TEXT,
  location TEXT,
  tech_stack JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lead_enrichment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage lead enrichment" ON lead_enrichment FOR ALL USING (true);

-- 3. AI SUGGESTIONS TABLE
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'leads', 'deals', 'contracts', etc.
  entity_id UUID NOT NULL,
  action_text TEXT NOT NULL,
  priority TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  analyzed_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_suggestions_org ON ai_suggestions(organization_id);
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage AI suggestions" ON ai_suggestions FOR ALL USING (true);

-- 4. MEETING TRANSCRIPTS TABLE
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- 'Google Meet', 'Zoom', 'Teams'
  transcript JSONB NOT NULL DEFAULT '[]', -- Array of { speaker, timestamp, text }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_meeting_transcripts_org ON meeting_transcripts(organization_id);
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage meeting transcripts" ON meeting_transcripts FOR ALL USING (true);

-- 5. MEETING SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID UNIQUE NOT NULL REFERENCES meeting_transcripts(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  decisions JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meeting_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage meeting summaries" ON meeting_summaries FOR ALL USING (true);

-- 6. WORKFLOW DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'lead_created', 'deal_updated', etc.
  conditions JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflows_org ON workflow_definitions(organization_id);
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage workflow definitions" ON workflow_definitions FOR ALL USING (true);

-- 7. WORKFLOW RUNS TABLE
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  trigger_entity_id UUID NOT NULL,
  status TEXT DEFAULT 'COMPLETED', -- 'RUNNING', 'COMPLETED', 'FAILED'
  logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage workflow runs" ON workflow_runs FOR ALL USING (true);

-- 8. FORECAST SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- 'Jan', 'Feb', etc.
  predicted_revenue DECIMAL(15, 2) NOT NULL,
  confidence_score INT CHECK (confidence_score >= 0 AND confidence_score <= 100) DEFAULT 80,
  risk_factors JSONB DEFAULT '[]',
  assumptions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_forecasts_org ON forecast_snapshots(organization_id);
ALTER TABLE forecast_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage forecast snapshots" ON forecast_snapshots FOR ALL USING (true);

-- 9. WHATSAPP CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  contact_name TEXT,
  last_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wa_conv_org ON whatsapp_conversations(organization_id);
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage whatsapp conversations" ON whatsapp_conversations FOR ALL USING (true);

-- 10. WHATSAPP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'INBOUND', 'OUTBOUND'
  message_text TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wa_msg_conv ON whatsapp_messages(conversation_id);
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage whatsapp messages" ON whatsapp_messages FOR ALL USING (true);

-- 11. CONTRACT SCORES TABLE
CREATE TABLE IF NOT EXISTS contract_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID UNIQUE NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  readiness_score INT CHECK (readiness_score >= 0 AND readiness_score <= 100) NOT NULL,
  factors JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contract_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage contract readiness scores" ON contract_scores FOR ALL USING (true);

-- 12. DEAL RISK SCORES TABLE
CREATE TABLE IF NOT EXISTS deal_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID UNIQUE NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  risk_level TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  factors JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE deal_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage deal risk scores" ON deal_risk_scores FOR ALL USING (true);

-- 13. AI INTERACTIONS TABLE
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_int_org ON ai_interactions(organization_id);
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage AI interactions" ON ai_interactions FOR ALL USING (true);

-- 14. PROMPT LOGS TABLE
CREATE TABLE IF NOT EXISTS prompt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'lead_score', 'forecast', 'copilot'
  prompt TEXT NOT NULL,
  completion TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  model TEXT DEFAULT 'gpt-4o',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prompts_org ON prompt_logs(organization_id);
ALTER TABLE prompt_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage prompt logs" ON prompt_logs FOR ALL USING (true);
