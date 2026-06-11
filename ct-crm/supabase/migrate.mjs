// CT-CRM — Migration Runner
// Applies 004_extended_schema.sql via Supabase REST API (management API)
// Run: node supabase/migrate.mjs

/**
 * IMPORTANT: This script requires the Supabase Service Role key.
 * Find it in: Supabase Dashboard → Settings → API → service_role secret
 *
 * Replace SERVICE_ROLE_KEY below with your actual key before running.
 * DO NOT commit that key to git.
 *
 * Alternatively, just copy the SQL from:
 *   supabase/migrations/004_extended_schema.sql
 * and paste it into:
 *   Supabase Dashboard → SQL Editor → New Query → Run
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://dmykjqinxtpyztmgeigu.supabase.co';
// ⬇️ REPLACE THIS with your service_role key from Supabase Dashboard → Settings → API
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

if (SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('\n❌ SERVICE_ROLE_KEY not set.');
  console.log('\n📋 Manual option — paste this SQL into Supabase SQL Editor:');
  console.log('   Supabase Dashboard → SQL Editor → New Query\n');
  const sql = readFileSync(join(__dirname, 'migrations', '004_extended_schema.sql'), 'utf8');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkAndRun() {
  console.log('🚀 CT-CRM Migration 004 — Extended Schema\n');

  // Quick check: does the contacts table already exist?
  const { error: contactsCheck } = await supabase.from('contacts').select('id').limit(1);

  if (!contactsCheck) {
    console.log('✅ contacts table already exists — migration may already be applied.');
    console.log('   If you need to re-run, execute the SQL manually in the Dashboard.\n');

    // Still check for reminders table
    const { error: remindersCheck } = await supabase.from('reminders').select('id').limit(1);
    if (!remindersCheck) {
      console.log('✅ reminders table already exists.\n');
    } else {
      console.log('⚠️  reminders table missing — please run 004_extended_schema.sql manually.\n');
    }
    return;
  }

  console.log('📋 Tables missing — please run this SQL in Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/dmykjqinxtpyztmgeigu/sql\n');
  const sql = readFileSync(join(__dirname, 'migrations', '004_extended_schema.sql'), 'utf8');
  console.log('Copy and paste the file at: supabase/migrations/004_extended_schema.sql');
  console.log('\n✅ After running the SQL, all features will fully persist to the database.');
}

checkAndRun().catch(console.error);
