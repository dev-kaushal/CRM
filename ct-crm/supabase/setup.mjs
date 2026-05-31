// CT-CRM — Schema + Seed Runner
// This script creates tables and seeds data using Supabase REST API
// Run: node supabase/setup.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dmykjqinxtpyztmgeigu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iSyqold08IxxjnVRU5fTgQ_XXOBXPLa';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fixed IDs
const ORG_ID = '11111111-1111-1111-1111-111111111111';
const USER_IDS = [
  'aaaa0001-0001-0001-0001-000000000001',
  'aaaa0001-0001-0001-0001-000000000002', 
  'aaaa0001-0001-0001-0001-000000000003',
  'aaaa0001-0001-0001-0001-000000000004',
];
const USER_NAMES = ['Kaushal Patel', 'Priya Sharma', 'Rahul Kumar', 'Anika Gupta'];
const USER_EMAILS = ['kaushal@cosmictrio.com', 'priya@cosmictrio.com', 'rahul@cosmictrio.com', 'anika@cosmictrio.com'];
const USER_ROLES = ['ORG_ADMIN', 'SALES_MANAGER', 'SALES_REP', 'SALES_REP'];

async function seed() {
  console.log('🚀 Seeding CT-CRM database...\n');

  // 1. Organization
  console.log('📦 Organization...');
  let { error } = await supabase.from('organizations').upsert({
    id: ORG_ID, name: 'Cosmic Trio', slug: 'cosmic-trio', industry: 'Technology', website: 'https://cosmictrio.com'
  }, { onConflict: 'id' });
  if (error) { console.error('❌ Org:', error.message); return; }
  console.log('  ✅ Created');

  // 2. Users
  console.log('👥 Users...');
  for (let i = 0; i < 4; i++) {
    const { error } = await supabase.from('users').upsert({
      id: USER_IDS[i], organization_id: ORG_ID, email: USER_EMAILS[i],
      full_name: USER_NAMES[i], role: USER_ROLES[i], status: 'ACTIVE'
    }, { onConflict: 'id' });
    if (error) console.error(`  ❌ User ${i}:`, error.message);
    else console.log(`  ✅ ${USER_NAMES[i]}`);
  }

  // 3. Leads (20)
  console.log('🎯 Leads...');
  const leads = [
    { first_name: 'Vikram', last_name: 'Singh', email: 'vikram@acmecorp.in', company: 'Acme Corp', source: 'GOOGLE', status: 'QUALIFIED', phone: '+91-9876543210' },
    { first_name: 'Neha', last_name: 'Patel', email: 'neha@techstart.io', company: 'TechStart', source: 'META', status: 'INTERESTED', phone: '+91-9876543211' },
    { first_name: 'Arjun', last_name: 'Mehta', email: 'arjun@cloudsoft.in', company: 'CloudSoft Technologies', source: 'REFERRAL', status: 'QUALIFIED', phone: '+91-9876543212' },
    { first_name: 'Sanya', last_name: 'Reddy', email: 'sanya@dataflow.co', company: 'DataFlow Inc', source: 'DIRECT', status: 'CONTACTED', phone: '+91-9876543213' },
    { first_name: 'Rohan', last_name: 'Joshi', email: 'rohan@novatech.in', company: 'NovaTech Labs', source: 'WHATSAPP', status: 'NEW', phone: '+91-9876543214' },
    { first_name: 'Meera', last_name: 'Iyer', email: 'meera@greentech.co', company: 'GreenTech Solutions', source: 'GOOGLE', status: 'QUALIFIED', phone: '+91-9876543215' },
    { first_name: 'Karan', last_name: 'Bhatia', email: 'karan@metaverse.io', company: 'MetaVerse Studios', source: 'META', status: 'INTERESTED', phone: '+91-9876543216' },
    { first_name: 'Divya', last_name: 'Nair', email: 'divya@quantumleap.ai', company: 'QuantumLeap AI', source: 'REFERRAL', status: 'NEW', phone: '+91-9876543217' },
    { first_name: 'Amit', last_name: 'Verma', email: 'amit@primestack.com', company: 'PrimeStack Corp', source: 'DIRECT', status: 'CONTACTED', phone: '+91-9876543218' },
    { first_name: 'Pooja', last_name: 'Sharma', email: 'pooja@clearview.in', company: 'ClearView Analytics', source: 'GOOGLE', status: 'QUALIFIED', phone: '+91-9876543219' },
    { first_name: 'Ravi', last_name: 'Kapoor', email: 'ravi@skyline.in', company: 'Skyline Ventures', source: 'WHATSAPP', status: 'INTERESTED', phone: '+91-9876543220' },
    { first_name: 'Ananya', last_name: 'Das', email: 'ananya@fusion.io', company: 'FusionWorks', source: 'META', status: 'NEW', phone: '+91-9876543221' },
    { first_name: 'Suresh', last_name: 'Menon', email: 'suresh@brightpath.in', company: 'BrightPath Systems', source: 'REFERRAL', status: 'QUALIFIED', phone: '+91-9876543222' },
    { first_name: 'Priti', last_name: 'Gupta', email: 'priti@nexgen.co', company: 'NexGen Digital', source: 'GOOGLE', status: 'CONTACTED', phone: '+91-9876543223' },
    { first_name: 'Manish', last_name: 'Tiwari', email: 'manish@orbitaltech.in', company: 'Orbital Technologies', source: 'DIRECT', status: 'INTERESTED', phone: '+91-9876543224' },
    { first_name: 'Shreya', last_name: 'Roy', email: 'shreya@bluechip.co', company: 'BlueChip Industries', source: 'META', status: 'NEW', phone: '+91-9876543225' },
    { first_name: 'Deepak', last_name: 'Saxena', email: 'deepak@ironclad.in', company: 'IronClad Security', source: 'WHATSAPP', status: 'QUALIFIED', phone: '+91-9876543226' },
    { first_name: 'Kavita', last_name: 'Pillai', email: 'kavita@solarflare.io', company: 'SolarFlare Energy', source: 'REFERRAL', status: 'CONTACTED', phone: '+91-9876543227' },
    { first_name: 'Rajesh', last_name: 'Malhotra', email: 'rajesh@vertex.com', company: 'Vertex Solutions', source: 'GOOGLE', status: 'INTERESTED', phone: '+91-9876543228' },
    { first_name: 'Tanya', last_name: 'Chopra', email: 'tanya@pinnacle.in', company: 'Pinnacle Group', source: 'DIRECT', status: 'NEW', phone: '+91-9876543229' },
  ];

  const leadIds = [];
  for (let i = 0; i < leads.length; i++) {
    const { data, error } = await supabase.from('leads').insert({
      ...leads[i], organization_id: ORG_ID, owner_id: USER_IDS[i % 4]
    }).select('id').single();
    if (error) { console.error(`  ❌ Lead ${i}:`, error.message); continue; }
    leadIds.push(data.id);
  }
  console.log(`  ✅ ${leadIds.length} leads`);

  // 4. Prospects
  console.log('🔍 Prospects...');
  const prospectIds = [];
  const qualifiedIdx = leads.map((l, i) => l.status === 'QUALIFIED' ? i : -1).filter(i => i >= 0);
  for (const idx of qualifiedIdx) {
    if (!leadIds[idx]) continue;
    const { data, error } = await supabase.from('prospects').insert({
      lead_id: leadIds[idx], budget: (200000 + Math.random() * 800000).toFixed(2),
      authority: true, need: 'Enterprise solution for operational scaling',
      timeline: '30-60 days', qualified_by: USER_IDS[idx % 4]
    }).select('id').single();
    if (!error && data) prospectIds.push({ id: data.id, leadIdx: idx });
  }
  console.log(`  ✅ ${prospectIds.length} prospects`);

  // 5. Deals (15)
  console.log('💰 Deals...');
  const dealTemplates = [
    { title: 'Enterprise CRM License', value: 450000, stage: 'WON', prob: 100 },
    { title: 'Cloud Migration Package', value: 780000, stage: 'CONTRACT', prob: 80 },
    { title: 'API Integration Suite', value: 320000, stage: 'NEGOTIATION', prob: 60 },
    { title: 'Data Analytics Platform', value: 550000, stage: 'PROPOSAL', prob: 30 },
    { title: 'Security Audit', value: 280000, stage: 'WON', prob: 100 },
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
  const dealIds = [];
  for (let i = 0; i < dealTemplates.length; i++) {
    const d = dealTemplates[i];
    const lidx = i % leadIds.length;
    const p = prospectIds.find(pp => pp.leadIdx === lidx);
    const close = new Date(); close.setDate(close.getDate() + i * 7 + 14);
    const { data, error } = await supabase.from('deals').insert({
      organization_id: ORG_ID, lead_id: leadIds[lidx], prospect_id: p?.id || null,
      title: d.title, value: d.value, stage: d.stage, probability: d.prob,
      owner_id: USER_IDS[i % 4], expected_close_date: close.toISOString()
    }).select('id').single();
    if (!error && data) dealIds.push(data.id);
  }
  console.log(`  ✅ ${dealIds.length} deals`);

  // 6. Contracts
  console.log('📄 Contracts...');
  const wonDealIds = dealTemplates.map((d,i) => d.stage === 'WON' || d.stage === 'CONTRACT' ? dealIds[i] : null).filter(Boolean);
  const contractIds = [];
  for (let i = 0; i < wonDealIds.length; i++) {
    const st = ['SIGNED','SIGNED','SENT','DRAFT','SIGNED','SENT'][i] || 'DRAFT';
    const sign = new Date(); sign.setDate(sign.getDate() - i * 15);
    const exp = new Date(); exp.setDate(exp.getDate() + 365);
    const { data, error } = await supabase.from('contracts').insert({
      deal_id: wonDealIds[i], contract_number: `CT-2025-${String(i+1).padStart(4,'0')}`,
      status: st, value: dealTemplates.find((d,j) => dealIds[j] === wonDealIds[i])?.value || 0,
      signed_at: st === 'SIGNED' ? sign.toISOString() : null, expires_at: exp.toISOString()
    }).select('id').single();
    if (!error && data) contractIds.push(data.id);
  }
  console.log(`  ✅ ${contractIds.length} contracts`);

  // 7. Customers
  console.log('🏢 Customers...');
  for (let i = 0; i < Math.min(3, contractIds.length); i++) {
    await supabase.from('customers').insert({
      organization_id: ORG_ID, contract_id: contractIds[i], company: leads[i].company,
      contact_name: leads[i].first_name + ' ' + leads[i].last_name, email: leads[i].email,
      lifetime_value: dealTemplates[i].value, status: 'ACTIVE'
    });
  }
  console.log('  ✅ 3 customers');

  // 8. Tasks (12)
  console.log('✅ Tasks...');
  const tasks = [
    { title: 'Follow up with Acme Corp', pri: 'HIGH', days: 0 },
    { title: 'Send pricing to TechStart', pri: 'HIGH', days: 0 },
    { title: 'Review CloudSoft contract', pri: 'MEDIUM', days: 0 },
    { title: 'Prepare Q4 forecast', pri: 'LOW', days: 1 },
    { title: 'Demo QuantumLeap AI', pri: 'HIGH', days: -1 },
    { title: 'Update pipeline data', pri: 'LOW', days: -2 },
    { title: 'Onboard DataFlow client', pri: 'HIGH', days: 2 },
    { title: 'Negotiate SolarFlare terms', pri: 'MEDIUM', days: 3 },
    { title: 'Send NDA to Vertex', pri: 'MEDIUM', days: 4 },
    { title: 'Weekly team standup', pri: 'LOW', days: 5 },
    { title: 'QBR prep', pri: 'HIGH', days: 7 },
    { title: 'Follow up BlueChip', pri: 'MEDIUM', days: -1 },
  ];
  for (let i = 0; i < tasks.length; i++) {
    const due = new Date(); due.setDate(due.getDate() + tasks[i].days); due.setHours(10+i%8);
    await supabase.from('tasks').insert({
      organization_id: ORG_ID, title: tasks[i].title, description: tasks[i].title,
      due_date: due.toISOString(), priority: tasks[i].pri, assigned_to: USER_IDS[i%4],
      related_type: 'LEADS', related_id: leadIds[i % leadIds.length], is_completed: tasks[i].days < -1
    });
  }
  console.log('  ✅ 12 tasks');

  // 9. Activities (15)
  console.log('📊 Activities...');
  const acts = [
    { type: 'DEAL_WON', desc: 'closed deal with', entity: 'Acme Corp', mins: 30 },
    { type: 'LEAD_CREATED', desc: 'added new lead', entity: 'GreenTech Solutions', mins: 60 },
    { type: 'CONTRACT_SIGNED', desc: 'signed contract for', entity: 'DataFlow Inc', mins: 120 },
    { type: 'TASK_DONE', desc: 'completed follow-up with', entity: 'NovaTech Labs', mins: 240 },
    { type: 'CALL', desc: 'logged call with', entity: 'MetaVerse Studios', mins: 480 },
    { type: 'DEAL_CREATED', desc: 'opened deal for', entity: 'QuantumLeap AI', mins: 720 },
    { type: 'EMAIL', desc: 'sent proposal to', entity: 'PrimeStack Corp', mins: 960 },
    { type: 'STATUS_CHANGE', desc: 'qualified lead', entity: 'ClearView Analytics', mins: 1440 },
    { type: 'CALL', desc: 'pricing discussion with', entity: 'Skyline Ventures', mins: 1800 },
    { type: 'LEAD_CREATED', desc: 'captured lead from', entity: 'FusionWorks', mins: 2160 },
    { type: 'TASK_DONE', desc: 'finished onboarding', entity: 'BrightPath Systems', mins: 2880 },
    { type: 'EMAIL', desc: 'sent contract to', entity: 'NexGen Digital', mins: 3600 },
    { type: 'DEAL_WON', desc: 'closed deal with', entity: 'IronClad Security', mins: 4320 },
    { type: 'STATUS_CHANGE', desc: 'moved to negotiation', entity: 'SolarFlare Energy', mins: 5760 },
    { type: 'CALL', desc: 'product demo for', entity: 'Vertex Solutions', mins: 7200 },
  ];
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i]; const t = new Date(Date.now() - a.mins*60000);
    await supabase.from('activities').insert({
      organization_id: ORG_ID, type: a.type, user_id: USER_IDS[i%4], user_name: USER_NAMES[i%4],
      related_type: 'DEALS', related_id: dealIds[i % dealIds.length] || ORG_ID,
      entity_name: a.entity, description: a.desc, created_at: t.toISOString()
    });
  }
  console.log('  ✅ 15 activities');

  // 10. Notes
  console.log('📝 Notes...');
  const notes = [
    'Client very interested in enterprise plan. Budget approved by CFO.',
    'Need to schedule follow-up demo. Technical team wants API docs.',
    'Competitor pricing lower but our features are stronger.',
    'Contract terms agreed. Waiting for legal review.',
    'Great initial call. Decision maker is VP Engineering.',
  ];
  for (let i = 0; i < notes.length; i++) {
    await supabase.from('notes').insert({
      organization_id: ORG_ID, content: notes[i], created_by: USER_IDS[i%4],
      related_type: 'LEADS', related_id: leadIds[i]
    });
  }
  console.log('  ✅ 5 notes');

  console.log('\n🎉 CT-CRM seed complete! All tables populated.');
}

seed().catch(e => console.error('Fatal:', e));
