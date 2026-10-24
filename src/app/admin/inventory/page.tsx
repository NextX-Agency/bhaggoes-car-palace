import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { AdminInventoryTable } from "@/components/admin-inventory-table";
import { getAdminVehicles } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminInventoryPage() {
  const { user } = await requireAdmin(); const vehicles = await getAdminVehicles();
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Beheerder"} actions={<Link className="button button-primary" href="/admin/inventory/new"><Plus size={17} aria-hidden="true" /> Nieuwe auto</Link>}><p className="admin-inventory-intro">Tik op een auto om de gegevens en foto’s te bewerken. Wijzig hier de status, of archiveer een auto om hem van de website te halen.</p><section className="admin-section admin-section-flush" aria-label="Voorraad"><AdminInventoryTable data={vehicles} /></section></AdminFrame>;
}
