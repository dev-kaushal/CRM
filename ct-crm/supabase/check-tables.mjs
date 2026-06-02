const SUPABASE_URL = 'https://dmykjqinxtpyztmgeigu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iSyqold08IxxjnVRU5fTgQ_XXOBXPLa';

async function checkTable(tableName) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id&limit=1`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if (res.ok) return 'Yes';
  const text = await res.text();
  return text;
}

async function run() {
  console.log('Phase 1 (leads):', await checkTable('leads'));
  console.log('Phase 2 (lead_scores):', await checkTable('lead_scores'));
  console.log('Phase 3 (ai_agents):', await checkTable('ai_agents'));
}

run();
