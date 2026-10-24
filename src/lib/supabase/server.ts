import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const { url, key } = getSupabaseEnv();
  const cookieStore = await cookies();
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, secure: options?.secure ?? secure }));
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes sessions.
        }
      },
    },
  });
}
