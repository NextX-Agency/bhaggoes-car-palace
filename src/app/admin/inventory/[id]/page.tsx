import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, Eye } from "lucide-react";
import { duplicateVehicleAction } from "@/app/admin/actions";
import { PendingSubmit } from "@/components/admin-pending-button";
import { AdminFrame } from "@/components/admin-frame";
import { AdminVehicleEditor } from "@/components/admin-vehicle-editor";
import { WindowStickerButton } from "@/components/window-sticker-button";
import { getAdminVehicle, getAdminVehicleTemplates } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { STICKER_BUCKET, STICKER_LIMIT, stickerUsesLeft } from "@/lib/window-sticker-quota";

export const metadata = { title: "Auto bewerken" };

export default async function EditVehiclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ opgeslagen?: string }> }) {
  const { supabase, user } = await requireAdmin(); const { id } = await params; const { opgeslagen } = await searchParams;
  const [result, templates, stickerUses] = await Promise.all([getAdminVehicle(id), getAdminVehicleTemplates(), stickerUsesLeft(supabase.storage.from(STICKER_BUCKET)).catch(() => null)]);
  if (!result) notFound();
  const editorVehicle = { ...result.vehicle, vin: result.privateDetails.vin, admin_notes: result.privateDetails.admin_notes };
  return <AdminFrame active="/admin/inventory" email={user.email ?? "Beheerder"} title={result.vehicle.title || "Auto bewerken"} actions={<>
    <Link className="button button-ghost button-sm" href="/admin/inventory"><ArrowLeft size={15} /> Voorraad</Link>
    {/* A car that is online opens on the real website; otherwise the preview shows how it will look. */}
    {result.vehicle.published && !result.vehicle.archived_at ? <Link className="button button-outline button-sm" href={`/cars/${result.vehicle.slug}`} target="_blank" rel="noopener"><ExternalLink size={15} aria-hidden="true" /> Bekijk op website</Link> : <Link className="button button-outline button-sm" href={`/admin/inventory/${result.vehicle.id}/preview`} target="_blank" rel="noopener"><Eye size={15} aria-hidden="true" /> Voorbeeld</Link>}
    <WindowStickerButton vehicleId={result.vehicle.id} initialUsesLeft={stickerUses} limit={STICKER_LIMIT} />
    <form action={duplicateVehicleAction}><input type="hidden" name="id" value={result.vehicle.id} /><PendingSubmit className="button button-outline button-sm" pendingLabel="Kopiëren…"><Copy size={15} aria-hidden="true" /> Dupliceren</PendingSubmit></form>
  </>}><AdminVehicleEditor vehicle={editorVehicle} templates={templates} notice={opgeslagen === "1" ? "Auto opgeslagen." : opgeslagen === "kopie" ? "Kopie gemaakt: foto’s en stocknummer zijn leeg en hij staat nog niet online. Pas aan wat anders is en sla op." : undefined} /></AdminFrame>;
}
