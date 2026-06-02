-- ============================================
-- CT-CRM Phase 3 — Autonomous Business OS
-- Database Schema Expansion Migrations
-- ============================================

-- 1. AI AGENTS TABLE
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_role TEXT NOT NULL, -- 'SDR', 'CRM', 'Proposal', 'Meeting', etc.
  system_instructions TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'INACTIVE', 'MAINTENANCE'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_agents_org ON ai_agents(organization_id);
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage AI agents" ON ai_agents FOR ALL USING (true);

-- 2. AGENT TASKS TABLE
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
  target_entity_type TEXT NOT NULL, -- 'leads', 'deals', etc.
  target_entity_id UUID NOT NULL,
  logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_tasks_agent ON agent_tasks(agent_id);
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage agent tasks" ON agent_tasks FOR ALL USING (true);

-- 3. AGENT MEMORIES TABLE
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'leads', 'contracts', etc.
  entity_id UUID NOT NULL,
  memory_content TEXT NOT NULL,
  semantic_tokens INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_memories_org ON agent_memories(organization_id);
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage agent memories" ON agent_memories FOR ALL USING (true);

-- 4. AGENT CONVERSATIONS TABLE (multi-agent dialogues)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  sender_agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  receiver_agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_conv_session ON agent_conversations(session_id);
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage agent conversations" ON agent_conversations FOR ALL USING (true);

-- 5. PROPOSAL VERSIONS TABLE
CREATE TABLE IF NOT EXISTS proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  pricing_config JSONB NOT NULL DEFAULT '{}',
  content TEXT NOT NULL,
  approval_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proposals_deal ON proposal_versions(deal_id);
ALTER TABLE proposal_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage proposal versions" ON proposal_versions FOR ALL USING (true);

-- 6. PROPOSAL ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS proposal_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposal_versions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'OPENED', 'VIEWED', 'DOWNLOADED', 'SHARED'
  ip_address TEXT,
  view_duration INT DEFAULT 0, -- seconds
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prop_analytics_proposal ON proposal_analytics(proposal_id);
ALTER TABLE proposal_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage proposal analytics" ON proposal_analytics FOR ALL USING (true);

-- 7. MEETING INTELLIGENCE TABLE
CREATE TABLE IF NOT EXISTS meeting_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID UNIQUE NOT NULL,
  talking_points JSONB DEFAULT '[]',
  objections_detected JSONB DEFAULT '[]',
  risks_flagged JSONB DEFAULT '[]',
  competitors_mentioned JSONB DEFAULT '[]',
  action_recommendations JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meeting_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage meeting intelligence" ON meeting_intelligence FOR ALL USING (true);

-- 8. KNOWLEDGE EMBEDDINGS TABLE
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'files', 'contracts', 'emails'
  source_id UUID NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding_vector JSONB, -- Stored as JSON representing vector coefficients for simple demo compatibility
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_knowledge_embeddings_org ON knowledge_embeddings(organization_id);
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage knowledge embeddings" ON knowledge_embeddings FOR ALL USING (true);

-- 9. CUSTOMER HEALTH SCORES TABLE
CREATE TABLE IF NOT EXISTS customer_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  score INT CHECK (score >= 0 AND score <= 100) NOT NULL,
  factors JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage customer health scores" ON customer_health_scores FOR ALL USING (true);

-- 10. CHURN PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS churn_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  risk_level TEXT DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH'
  probability INT CHECK (probability >= 0 AND probability <= 100) NOT NULL,
  factors JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage churn predictions" ON churn_predictions FOR ALL USING (true);

-- 11. REVENUE PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS revenue_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_month TEXT NOT NULL,
  predicted_value DECIMAL(15, 2) NOT NULL,
  confidence_percentage INT DEFAULT 80,
  factors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rev_predictions_org ON revenue_predictions(organization_id);
ALTER TABLE revenue_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage revenue predictions" ON revenue_predictions FOR ALL USING (true);

-- 12. AGENT WORKFLOWS TABLE
CREATE TABLE IF NOT EXISTS agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  ai_routing_pipeline JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_workflows_org ON agent_workflows(organization_id);
ALTER TABLE agent_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage agent workflows" ON agent_workflows FOR ALL USING (true);

-- 13. EXECUTIVE INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS executive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  impact_level TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  category TEXT NOT NULL, -- 'revenue', 'churn', 'conversion'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exec_insights_org ON executive_insights(organization_id);
ALTER TABLE executive_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage executive insights" ON executive_insights FOR ALL USING (true);

-- 14. AGENT AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS agent_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  action_description TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_audit_org ON agent_audit_logs(organization_id);
ALTER TABLE agent_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage agent audit logs" ON agent_audit_logs FOR ALL USING (true);
