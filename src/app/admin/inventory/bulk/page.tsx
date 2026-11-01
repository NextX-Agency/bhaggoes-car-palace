import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminBulkUpload } from "@/components/admin-bulk-upload";
import { AdminFrame } from "@/components/admin-frame";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Snel uploaden" };

export default async function BulkUploadPage() {
  const [{ user }, settings] = await Promise.all([requireAdmin(), getSettings()]);
  return <AdminFrame active="/admin/inventory/bulk" email={user.email ?? "Beheerder"} title="Snel uploaden" actions={<Link className="button button-ghost button-sm" href="/admin/inventory"><ArrowLeft size={15} /> Voorraad</Link>}>
    <p className="admin-inventory-intro">Zet in één keer meerdere auto’s online. Alleen foto’s is genoeg: merk, model, prijs en de rest kun je hier of later per auto invullen.</p>
    <AdminBulkUpload defaultCurrency={settings.currency || "USD"} />
  </AdminFrame>;
}
