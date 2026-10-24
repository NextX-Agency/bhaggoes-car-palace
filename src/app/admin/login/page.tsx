import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Inloggen" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ setup?: string; unauthorized?: string }> }) {
  const params = await searchParams;
  if (hasSupabaseEnv()) {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
    if (user) { const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(); if (profile?.role === "admin") redirect("/admin"); }
  }
  return <AdminLoginForm setup={params.setup === "1" || !hasSupabaseEnv()} unauthorized={params.unauthorized === "1"} />;
}
