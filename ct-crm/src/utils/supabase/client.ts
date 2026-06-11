import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Reuse a single browser client instance instead of creating a new one
// (with its own auth listeners/timers) on every call — avoids the
// "Multiple GoTrueClient instances" overhead that was slowing down
// navigation and button responses across the app.
let client: SupabaseClient | undefined;

export const createClient = () => {
  if (!client) {
    client = createBrowserClient(
      supabaseUrl!,
      supabaseKey!,
    );
  }
  return client;
};
