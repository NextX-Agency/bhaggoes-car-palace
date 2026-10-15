import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { VehicleDetail } from "@/components/vehicle-detail";
import { getAdminVehicle, getSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Listing preview", robots: { index: false, follow: false } };

export default async function VehiclePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin();
  const { id } = await params;
  const [result, settings] = await Promise.all([getAdminVehicle(id), getSettings()]);
  if (!result) notFound();
  const vehicle = result.vehicle;

  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"} title="Listing preview" actions={<Link className="button button-outline button-sm" href={`/admin/inventory/${vehicle.id}`}><ArrowLeft size={15} /> Back to editor</Link>}>
    <p className="callout admin-callout">{vehicle.published ? "This is how the saved listing appears to customers." : "This listing is a draft and is not visible to customers yet."}</p>
    <div className="admin-preview"><VehicleDetail vehicle={vehicle} settings={settings} preview /></div>
  </AdminFrame>;
}
