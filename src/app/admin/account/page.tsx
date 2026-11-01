import { AdminAccountForm } from "@/components/admin-account-form";
import { AdminFrame } from "@/components/admin-frame";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Mijn account" };

export default async function AdminAccountPage() {
  const { user, supabase } = await requireAdmin({ allowTemporaryPassword: true });
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const mustChange = Boolean(user.user_metadata?.must_change_password);
  return <AdminFrame active="/admin/account" email={user.email ?? "Beheerder"} title="Mijn account">
    <AdminAccountForm email={user.email ?? ""} name={profile?.display_name ?? ""} mustChange={mustChange} />
  </AdminFrame>;
}
