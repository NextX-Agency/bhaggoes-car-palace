import { AdminFrame } from "@/components/admin-frame";
import { AdminInventoryTable } from "@/components/admin-inventory-table";
import { getAdminVehicles } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminInventoryPage() {
  const { user } = await requireAdmin(); const vehicles = await getAdminVehicles();
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"}><section className="admin-section"><div className="admin-section-head"><div><h2>Your vehicle listings</h2><p>Edit specifications, publish listings, and update inventory status.</p></div></div><AdminInventoryTable data={vehicles} /></section></AdminFrame>;
}
