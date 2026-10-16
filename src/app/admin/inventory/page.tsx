import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { AdminInventoryTable } from "@/components/admin-inventory-table";
import { getAdminVehicles } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminInventoryPage() {
  const { user } = await requireAdmin(); const vehicles = await getAdminVehicles();
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"} actions={<Link className="button button-primary" href="/admin/inventory/new"><Plus size={17} /> Add car</Link>}><p className="admin-inventory-intro">Click a car to edit its details and photos. Change its status here, or archive it to remove it from the website. Demo listings are examples, not cars for sale.</p><section className="admin-section admin-section-flush"><AdminInventoryTable data={vehicles} /></section></AdminFrame>;
}
