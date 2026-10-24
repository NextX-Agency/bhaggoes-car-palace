import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, hasSupabaseEnv } from "./env";

let client: SupabaseClient | null = null;

// Cookie-free client for public, cacheable reads. RLS grants anon read access to published content only,
// so this never depends on the visitor's session and is safe to use inside unstable_cache.
export function createPublicClient(): SupabaseClient | null {
  if (!hasSupabaseEnv()) return null;
  if (!client) {
    const { url, key } = getSupabaseEnv();
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }
  return client;
}
