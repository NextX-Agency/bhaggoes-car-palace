import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { VehicleDetail } from "@/components/vehicle-detail";
import { getAdminVehicle, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Voorbeeld van advertentie", robots: { index: false, follow: false } };

export default async function VehiclePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin();
  const { id } = await params;
  const [result, settings] = await Promise.all([getAdminVehicle(id), getSettings()]);
  if (!result) notFound();
  const vehicle = result.vehicle;

  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"} title="Voorbeeld van advertentie" actions={<Link className="button button-outline button-sm" href={`/admin/inventory/${vehicle.id}`}><ArrowLeft size={15} aria-hidden="true" /> Terug naar bewerken</Link>}>
    <p className="callout admin-callout" role="status">{vehicle.archived_at ? "Deze auto is gearchiveerd en niet zichtbaar voor klanten." : vehicle.published ? "Zo zien klanten de opgeslagen advertentie." : "Deze advertentie is nog verborgen en niet zichtbaar voor klanten."} Niet-opgeslagen wijzigingen staan hier nog niet in.</p>
    <div className="admin-preview"><VehicleDetail vehicle={vehicle} settings={settings} preview /></div>
  </AdminFrame>;
}
