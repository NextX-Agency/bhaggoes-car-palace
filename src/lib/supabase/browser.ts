"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!browserClient) {
    const { url, key } = getSupabaseEnv();
    browserClient = createBrowserClient(url, key, { cookieOptions: { secure: typeof window !== "undefined" && window.location.protocol === "https:" } });
  }
  return browserClient;
}
