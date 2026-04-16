import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const fallbackUrl = "https://example.supabase.co";
const fallbackAnonKey = "missing-supabase-anon-key";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseEnv) {
  console.warn(
    "Supabase env vars missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo with cache clear.",
  );
}

export const supabase: SupabaseClient<Database, "public"> = createClient<
  Database,
  "public"
>(supabaseUrl ?? fallbackUrl, supabaseAnonKey ?? fallbackAnonKey, {
  db: { schema: "public" },
});
