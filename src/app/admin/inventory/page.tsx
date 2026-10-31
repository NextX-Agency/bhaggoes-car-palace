import Link from "next/link";
import { EyeOff, Images, Plus } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { AdminInventoryTable } from "@/components/admin-inventory-table";
import { getAdminVehicles, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Voorraad" };

export default async function AdminInventoryPage() {
  const { user } = await requireAdmin(); const [vehicles, settings] = await Promise.all([getAdminVehicles(), getSettings()]);
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Beheerder"} actions={<><Link className="button button-outline" href="/admin/inventory/bulk"><Images size={17} aria-hidden="true" /> Snel uploaden</Link><Link className="button button-primary" href="/admin/inventory/new"><Plus size={17} aria-hidden="true" /> Nieuwe auto</Link></>}>{settings.catalog_hidden ? <p className="catalog-switch is-hidden"><span className="catalog-switch-icon" aria-hidden="true"><EyeOff size={18} /></span><span className="catalog-switch-text"><strong>De catalogus is verborgen</strong><span>Geen enkele auto is nu te zien op de website. Je kunt gewoon verder werken; zet de catalogus weer aan via het <Link href="/admin">overzicht</Link>.</span></span></p> : null}<p className="admin-inventory-intro">Tik op een auto om de gegevens en foto’s te bewerken. Wijzig hier de status, of archiveer een auto om hem van de website te halen.</p><section className="admin-section admin-section-flush" aria-label="Voorraad"><AdminInventoryTable data={vehicles} /></section></AdminFrame>;
}
