import { AdminFrame } from "@/components/admin-frame";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Website-instellingen" };

export default async function AdminSettingsPage() { const { user } = await requireAdmin(); const settings = await getSettings(); return <AdminFrame active="/admin/settings" email={user.email ?? "Beheerder"}><AdminSettingsForm settings={settings} /></AdminFrame>; }
