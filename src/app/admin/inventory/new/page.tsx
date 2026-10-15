import Link from "next/link";
import { AdminFrame } from "@/components/admin-frame";
import { AdminVehicleEditor } from "@/components/admin-vehicle-editor";
import { requireAdmin } from "@/lib/admin-auth";

export default async function NewVehiclePage() {
  const { user } = await requireAdmin();
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"}><div className="admin-topline inner-admin-title"><div><h1>Add a vehicle</h1><p>Fill in the details customers need to make a confident choice.</p></div><Link className="text-link" href="/admin/inventory">Back to inventory</Link></div><AdminVehicleEditor /></AdminFrame>;
}
