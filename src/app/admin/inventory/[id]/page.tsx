import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminFrame } from "@/components/admin-frame";
import { AdminVehicleEditor } from "@/components/admin-vehicle-editor";
import { getAdminVehicle } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(); const { id } = await params; const result = await getAdminVehicle(id);
  if (!result) notFound();
  const editorVehicle = { ...result.vehicle, vin: result.privateDetails.vin, admin_notes: result.privateDetails.admin_notes };
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"}><div className="admin-topline inner-admin-title"><h1>Edit Vehicle</h1><div className="admin-row-actions"><Link className="text-link" href={`/admin/inventory/${result.vehicle.id}/preview`} target="_blank">Preview listing ↗</Link><Link className="text-link" href="/admin/inventory">Back to inventory</Link></div></div><AdminVehicleEditor vehicle={editorVehicle} /></AdminFrame>;
}
