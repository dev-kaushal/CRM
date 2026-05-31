// CT-CRM — Database Setup & Seed Script
// Run: node supabase/seed.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dmykjqinxtpyztmgeigu.supabase.co',
  'sb_publishable_iSyqold08IxxjnVRU5fTgQ_XXOBXPLa'
);

// Fixed UUIDs for referential integrity
const ORG_ID = '11111111-1111-1111-1111-111111111111';
const USERS = [
  { id: 'aaaa0001-0001-0001-0001-000000000001', name: 'Kaushal Patel', email: 'kaushal@cosmictrio.com', role: 'ORG_ADMIN' },
  { id: 'aaaa0001-0001-0001-0001-000000000002', name: 'Priya Sharma', email: 'priya@cosmictrio.com', role: 'SALES_MANAGER' },
  { id: 'aaaa0001-0001-0001-0001-000000000003', name: 'Rahul Kumar', email: 'rahul@cosmictrio.com', role: 'SALES_REP' },
  { id: 'aaaa0001-0001-0001-0001-000000000004', name: 'Anika Gupta', email: 'anika@cosmictrio.com', role: 'SALES_REP' },
];

const LEAD_DATA = [
  { fn: 'Vikram', ln: 'Singh', email: 'vikram@acmecorp.in', company: 'Acme Corp', source: 'GOOGLE', status: 'QUALIFIED', phone: '+91-9876543210' },
  { fn: 'Neha', ln: 'Patel', email: 'neha@techstart.io', company: 'TechStart', source: 'META', status: 'INTERESTED', phone: '+91-9876543211' },
  { fn: 'Arjun', ln: 'Mehta', email: 'arjun@cloudsoft.in', company: 'CloudSoft Technologies', source: 'REFERRAL', status: 'QUALIFIED', phone: '+91-9876543212' },
  { fn: 'Sanya', ln: 'Reddy', email: 'sanya@dataflow.co', company: 'DataFlow Inc', source: 'DIRECT', status: 'CONTACTED', phone: '+91-9876543213' },
  { fn: 'Rohan', ln: 'Joshi', email: 'rohan@novatech.in', company: 'NovaTech Labs', source: 'WHATSAPP', status: 'NEW', phone: '+91-9876543214' },
  { fn: 'Meera', ln: 'Iyer', email: 'meera@greentech.co', company: 'GreenTech Solutions', source: 'GOOGLE', status: 'QUALIFIED', phone: '+91-9876543215' },
  { fn: 'Karan', ln: 'Bhatia', email: 'karan@metaverse.io', company: 'MetaVerse Studios', source: 'META', status: 'INTERESTED', phone: '+91-9876543216' },
  { fn: 'Divya', ln: 'Nair', email: 'divya@quantumleap.ai', company: 'QuantumLeap AI', source: 'REFERRAL', status: 'NEW', phone: '+91-9876543217' },
  { fn: 'Amit', ln: 'Verma', email: 'amit@primestack.com', company: 'PrimeStack Corp', source: 'DIRECT', status: 'CONTACTED', phone: '+91-9876543218' },
  { fn: 'Pooja', ln: 'Sharma', email: 'pooja@clearview.in', company: 'ClearView Analytics', source: 'GOOGLE', status: 'QUALIFIED', phone: '+91-9876543219' },
  { fn: 'Ravi', ln: 'Kapoor', email: 'ravi@skyline.in', company: 'Skyline Ventures', source: 'WHATSAPP', status: 'INTERESTED', phone: '+91-9876543220' },
  { fn: 'Ananya', ln: 'Das', email: 'ananya@fusion.io', company: 'FusionWorks', source: 'META', status: 'NEW', phone: '+91-9876543221' },
  { fn: 'Suresh', ln: 'Menon', email: 'suresh@brightpath.in', company: 'BrightPath Systems', source: 'REFERRAL', status: 'QUALIFIED', phone: '+91-9876543222' },
  { fn: 'Priti', ln: 'Gupta', email: 'priti@nexgen.co', company: 'NexGen Digital', source: 'GOOGLE', status: 'CONTACTED', phone: '+91-9876543223' },
  { fn: 'Manish', ln: 'Tiwari', email: 'manish@orbitaltech.in', company: 'Orbital Technologies', source: 'DIRECT', status: 'INTERESTED', phone: '+91-9876543224' },
  { fn: 'Shreya', ln: 'Roy', email: 'shreya@bluechip.co', company: 'BlueChip Industries', source: 'META', status: 'NEW', phone: '+91-9876543225' },
  { fn: 'Deepak', ln: 'Saxena', email: 'deepak@ironclad.in', company: 'IronClad Security', source: 'WHATSAPP', status: 'QUALIFIED', phone: '+91-9876543226' },
  { fn: 'Kavita', ln: 'Pillai', email: 'kavita@solarflare.io', company: 'SolarFlare Energy', source: 'REFERRAL', status: 'CONTACTED', phone: '+91-9876543227' },
  { fn: 'Rajesh', ln: 'Malhotra', email: 'rajesh@vertex.com', company: 'Vertex Solutions', source: 'GOOGLE', status: 'INTERESTED', phone: '+91-9876543228' },
  { fn: 'Tanya', ln: 'Chopra', email: 'tanya@pinnacle.in', company: 'Pinnacle Group', source: 'DIRECT', status: 'NEW', phone: '+91-9876543229' },
];

const DEAL_TEMPLATES = [
  { title: 'Enterprise CRM License', value: 450000, stage: 'WON', prob: 100 },
  { title: 'Cloud Migration Package', value: 780000, stage: 'CONTRACT', prob: 80 },
  { title: 'API Integration Suite', value: 320000, stage: 'NEGOTIATION', prob: 60 },
  { title: 'Data Analytics Platform', value: 550000, stage: 'PROPOSAL', prob: 30 },
  { title: 'Security Audit & Compliance', value: 280000, stage: 'WON', prob: 100 },
  { title: 'Mobile App Development', value: 920000, stage: 'NEGOTIATION', prob: 60 },
  { title: 'AI Chatbot Integration', value: 180000, stage: 'NEW', prob: 10 },
  { title: 'ERP System Upgrade', value: 1250000, stage: 'CONTRACT', prob: 80 },
  { title: 'DevOps Pipeline Setup', value: 350000, stage: 'WON', prob: 100 },
  { title: 'Custom Dashboard Build', value: 420000, stage: 'PROPOSAL', prob: 30 },
  { title: 'Blockchain PoC', value: 680000, stage: 'NEW', prob: 10 },
  { title: 'IoT Fleet Management', value: 890000, stage: 'NEGOTIATION', prob: 60 },
  { title: 'HR Automation Suite', value: 290000, stage: 'LOST', prob: 0 },
  { title: 'E-commerce Platform', value: 1100000, stage: 'WON', prob: 100 },
  { title: 'Video Conferencing Tool', value: 150000, stage: 'PROPOSAL', prob: 30 },
];

async function seed() {
  console.log('🚀 Starting CT-CRM database seed...\n');

  // 1. Organization
  console.log('📦 Creating organization...');
  const { error: orgErr } = await supabase.from('organizations').upsert({
    id: ORG_ID, name: 'Cosmic Trio', slug: 'cosmic-trio', industry: 'Technology', website: 'https://cosmictrio.com'
  });
  if (orgErr) { console.error('Org error:', orgErr.message); return; }

  // 2. Users
  console.log('👥 Creating users...');
  for (const u of USERS) {
    await supabase.from('users').upsert({
      id: u.id, organization_id: ORG_ID, email: u.email, full_name: u.name, role: u.role, status: 'ACTIVE'
    });
  }

  // 3. Leads
  console.log('🎯 Creating 20 leads...');
  const leadIds = [];
  for (let i = 0; i < LEAD_DATA.length; i++) {
    const l = LEAD_DATA[i];
    const ownerId = USERS[i % USERS.length].id;
    const { data } = await supabase.from('leads').insert({
      organization_id: ORG_ID, first_name: l.fn, last_name: l.ln, email: l.email,
      phone: l.phone, company: l.company, source: l.source, status: l.status, owner_id: ownerId,
    }).select('id').single();
    if (data) leadIds.push(data.id);
  }

  // 4. Prospects (for QUALIFIED leads)
  console.log('🔍 Creating prospects...');
  const qualifiedLeadIds = [];
  for (let i = 0; i < leadIds.length; i++) {
    if (LEAD_DATA[i].status === 'QUALIFIED') {
      const { data } = await supabase.from('prospects').insert({
        lead_id: leadIds[i], budget: (200000 + Math.random() * 1000000).toFixed(2),
        authority: true, need: 'Enterprise software solution for scaling operations',
        timeline: '30-60 days', qualified_by: USERS[i % USERS.length].id,
      }).select('id').single();
      if (data) qualifiedLeadIds.push({ prospectId: data.id, leadIdx: i });
    }
  }

  // 5. Deals
  console.log('💰 Creating 15 deals...');
  const dealIds = [];
  for (let i = 0; i < DEAL_TEMPLATES.length; i++) {
    const d = DEAL_TEMPLATES[i];
    const leadIdx = i % leadIds.length;
    const prospect = qualifiedLeadIds.find(q => q.leadIdx === leadIdx);
    const closeDate = new Date(); closeDate.setDate(closeDate.getDate() + (i * 7) + 14);
    const { data } = await supabase.from('deals').insert({
      organization_id: ORG_ID, lead_id: leadIds[leadIdx], prospect_id: prospect?.prospectId || null,
      title: d.title, value: d.value, stage: d.stage, probability: d.prob,
      owner_id: USERS[i % USERS.length].id, expected_close_date: closeDate.toISOString(),
    }).select('id').single();
    if (data) dealIds.push(data.id);
  }

  // 6. Contracts
  console.log('📄 Creating contracts...');
  const contractIds = [];
  const wonDeals = DEAL_TEMPLATES.map((d, i) => ({ ...d, dealId: dealIds[i] })).filter(d => d.stage === 'WON' || d.stage === 'CONTRACT');
  for (let i = 0; i < wonDeals.length; i++) {
    const statuses = ['SIGNED', 'SIGNED', 'SENT', 'DRAFT'];
    const signed = new Date(); signed.setDate(signed.getDate() - (i * 15));
    const expires = new Date(); expires.setDate(expires.getDate() + 365);
    const { data } = await supabase.from('contracts').insert({
      deal_id: wonDeals[i].dealId, contract_number: `CT-2025-${String(i + 1).padStart(4, '0')}`,
      status: statuses[i % statuses.length], value: wonDeals[i].value,
      signed_at: statuses[i % statuses.length] === 'SIGNED' ? signed.toISOString() : null,
      expires_at: expires.toISOString(),
    }).select('id').single();
    if (data) contractIds.push(data.id);
  }

  // 7. Customers
  console.log('🏢 Creating customers...');
  const signedContracts = contractIds.slice(0, 3);
  const customerCompanies = ['Acme Corp', 'CloudSoft Technologies', 'DataFlow Inc'];
  for (let i = 0; i < signedContracts.length; i++) {
    await supabase.from('customers').insert({
      organization_id: ORG_ID, contract_id: signedContracts[i],
      company: customerCompanies[i], contact_name: LEAD_DATA[i].fn + ' ' + LEAD_DATA[i].ln,
      email: LEAD_DATA[i].email, lifetime_value: DEAL_TEMPLATES[i].value, status: 'ACTIVE',
    });
  }

  // 8. Tasks
  console.log('✅ Creating 12 tasks...');
  const taskData = [
    { title: 'Follow up with Acme Corp on proposal', type: 'CALL', priority: 'HIGH', days: 0 },
    { title: 'Send revised pricing to TechStart', type: 'EMAIL', priority: 'HIGH', days: 0 },
    { title: 'Review CloudSoft contract terms', type: 'REVIEW', priority: 'MEDIUM', days: 0 },
    { title: 'Prepare Q4 sales forecast', type: 'REPORT', priority: 'LOW', days: 1 },
    { title: 'Demo QuantumLeap AI integration', type: 'MEETING', priority: 'HIGH', days: -1 },
    { title: 'Update CRM pipeline data', type: 'ADMIN', priority: 'LOW', days: -2 },
    { title: 'Client onboarding — DataFlow', type: 'ONBOARDING', priority: 'HIGH', days: 2 },
    { title: 'Negotiate SolarFlare terms', type: 'CALL', priority: 'MEDIUM', days: 3 },
    { title: 'Send NDA to Vertex Solutions', type: 'EMAIL', priority: 'MEDIUM', days: 4 },
    { title: 'Weekly team standup', type: 'MEETING', priority: 'LOW', days: 5 },
    { title: 'Quarterly business review prep', type: 'REPORT', priority: 'HIGH', days: 7 },
    { title: 'Follow up with BlueChip Industries', type: 'CALL', priority: 'MEDIUM', days: -1 },
  ];
  for (let i = 0; i < taskData.length; i++) {
    const t = taskData[i];
    const due = new Date(); due.setDate(due.getDate() + t.days); due.setHours(10 + (i % 8), 0, 0);
    await supabase.from('tasks').insert({
      organization_id: ORG_ID, title: t.title, description: `Task: ${t.title}`,
      due_date: due.toISOString(), priority: t.priority, assigned_to: USERS[i % USERS.length].id,
      related_type: 'LEADS', related_id: leadIds[i % leadIds.length], is_completed: t.days < -1,
    });
  }

  // 9. Activities
  console.log('📊 Creating 15 activities...');
  const actData = [
    { type: 'DEAL_WON', desc: 'closed deal with', entity: 'Acme Corp', mins: 30 },
    { type: 'LEAD_CREATED', desc: 'added new lead', entity: 'GreenTech Solutions', mins: 60 },
    { type: 'CONTRACT_SIGNED', desc: 'signed contract for', entity: 'DataFlow Inc', mins: 120 },
    { type: 'TASK_COMPLETED', desc: 'completed follow-up with', entity: 'NovaTech Labs', mins: 240 },
    { type: 'CALL', desc: 'logged discovery call with', entity: 'MetaVerse Studios', mins: 480 },
    { type: 'DEAL_CREATED', desc: 'opened new deal for', entity: 'QuantumLeap AI', mins: 720 },
    { type: 'EMAIL', desc: 'sent proposal to', entity: 'PrimeStack Corp', mins: 960 },
    { type: 'STATUS_CHANGE', desc: 'qualified lead from', entity: 'ClearView Analytics', mins: 1440 },
    { type: 'CALL', desc: 'had pricing discussion with', entity: 'Skyline Ventures', mins: 1800 },
    { type: 'LEAD_CREATED', desc: 'captured inbound lead from', entity: 'FusionWorks', mins: 2160 },
    { type: 'TASK_COMPLETED', desc: 'finished onboarding for', entity: 'BrightPath Systems', mins: 2880 },
    { type: 'EMAIL', desc: 'sent contract draft to', entity: 'NexGen Digital', mins: 3600 },
    { type: 'DEAL_WON', desc: 'closed enterprise deal with', entity: 'IronClad Security', mins: 4320 },
    { type: 'STATUS_CHANGE', desc: 'moved to negotiation', entity: 'SolarFlare Energy', mins: 5760 },
    { type: 'CALL', desc: 'conducted product demo for', entity: 'Vertex Solutions', mins: 7200 },
  ];
  for (let i = 0; i < actData.length; i++) {
    const a = actData[i];
    const createdAt = new Date(Date.now() - a.mins * 60000);
    const user = USERS[i % USERS.length];
    await supabase.from('activities').insert({
      organization_id: ORG_ID, type: a.type, user_id: user.id, user_name: user.name,
      related_type: 'DEALS', related_id: dealIds[i % dealIds.length] || ORG_ID,
      entity_name: a.entity, description: a.desc, created_at: createdAt.toISOString(),
    });
  }

  // 10. Notes
  console.log('📝 Creating notes...');
  const noteTexts = [
    'Client is very interested in our enterprise plan. Budget approved by CFO.',
    'Need to schedule follow-up demo next week. Technical team wants to see API docs.',
    'Competitor pricing is lower but our feature set is significantly stronger.',
    'Contract terms agreed. Waiting for legal review on their end.',
    'Great initial call. Decision maker is the VP of Engineering.',
  ];
  for (let i = 0; i < noteTexts.length; i++) {
    await supabase.from('notes').insert({
      organization_id: ORG_ID, content: noteTexts[i], created_by: USERS[i % USERS.length].id,
      related_type: 'LEADS', related_id: leadIds[i],
    });
  }

  console.log('\n✅ CT-CRM database seeded successfully!');
  console.log(`   📦 1 Organization`);
  console.log(`   👥 ${USERS.length} Users`);
  console.log(`   🎯 ${leadIds.length} Leads`);
  console.log(`   🔍 ${qualifiedLeadIds.length} Prospects`);
  console.log(`   💰 ${dealIds.length} Deals`);
  console.log(`   📄 ${contractIds.length} Contracts`);
  console.log(`   🏢 ${signedContracts.length} Customers`);
  console.log(`   ✅ ${taskData.length} Tasks`);
  console.log(`   📊 ${actData.length} Activities`);
  console.log(`   📝 ${noteTexts.length} Notes`);
}

seed().catch(console.error);
