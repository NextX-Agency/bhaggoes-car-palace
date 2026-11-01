import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Every dashboard page starts here. Someone who logged in with a temporary password (set by a colleague) is sent
 * to Mijn account first; that page passes `allowTemporaryPassword` so it can be shown.
 */
export async function requireAdmin({ allowTemporaryPassword = false }: { allowTemporaryPassword?: boolean } = {}) {
  if (!hasSupabaseEnv()) redirect("/admin/login?setup=1");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/admin/login?unauthorized=1");
  if (user.user_metadata?.must_change_password && !allowTemporaryPassword) redirect("/admin/account?eerste=1");
  return { supabase, user };
}
