import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { AdminVehicleEditor } from "@/components/admin-vehicle-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminVehicleTemplates, getSettings } from "@/lib/data";

export default async function NewVehiclePage() {
  const { user } = await requireAdmin();
  const [templates, settings] = await Promise.all([getAdminVehicleTemplates(), getSettings()]);
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"} title="Add car" actions={<Link className="button button-ghost button-sm" href="/admin/inventory"><ArrowLeft size={15} /> Inventory</Link>}><AdminVehicleEditor templates={templates} settings={settings} /></AdminFrame>;
}
