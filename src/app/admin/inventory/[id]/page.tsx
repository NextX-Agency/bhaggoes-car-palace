import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { AdminVehicleEditor } from "@/components/admin-vehicle-editor";
import { getAdminVehicle, getAdminVehicleTemplates } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(); const { id } = await params; const [result, templates] = await Promise.all([getAdminVehicle(id), getAdminVehicleTemplates()]);
  if (!result) notFound();
  const editorVehicle = { ...result.vehicle, vin: result.privateDetails.vin, admin_notes: result.privateDetails.admin_notes };
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"} title={result.vehicle.title || "Auto bewerken"} actions={<><Link className="button button-ghost button-sm" href="/admin/inventory"><ArrowLeft size={15} /> Voorraad</Link><Link className="button button-outline button-sm" href={`/admin/inventory/${result.vehicle.id}/preview`} target="_blank"><Eye size={15} /> Voorbeeld</Link></>}><AdminVehicleEditor vehicle={editorVehicle} templates={templates} /></AdminFrame>;
}
