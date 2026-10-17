import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { AdminVehicleEditor } from "@/components/admin-vehicle-editor";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminVehicleTemplates } from "@/lib/data";

export default async function NewVehiclePage() {
  const { user } = await requireAdmin();
  const templates = await getAdminVehicleTemplates();
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"} title="Add car" actions={<Link className="button button-ghost button-sm" href="/admin/inventory"><ArrowLeft size={15} /> Inventory</Link>}><AdminVehicleEditor templates={templates} /></AdminFrame>;
}
