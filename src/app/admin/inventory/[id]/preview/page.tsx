import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Fuel, Gauge, Settings2 } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { getAdminVehicle } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { availabilityLabels, formatAmount } from "@/lib/domain";

export const metadata: Metadata = { title: "Listing preview", robots: { index: false, follow: false } };

export default async function VehiclePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin();
  const { id } = await params;
  const result = await getAdminVehicle(id);
  if (!result) notFound();

  const vehicle = result.vehicle;
  const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
  const specifications = [
    ["Condition", vehicle.condition],
    ["Mileage", vehicle.mileage == null ? null : `${new Intl.NumberFormat().format(vehicle.mileage)} km`],
    ["Engine", vehicle.engine_capacity], ["Fuel", vehicle.fuel_type], ["Transmission", vehicle.transmission],
    ["Drive type", vehicle.drive_type], ["Body type", vehicle.body_type], ["Exterior", vehicle.exterior_color],
    ["Interior", vehicle.interior_color], ["Seats", vehicle.seats?.toString() ?? null], ["Doors", vehicle.doors?.toString() ?? null],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return <AdminFrame active="/admin/inventory" email={user.email ?? "Administrator"}>
    <div className="admin-topline inner-admin-title">
      <div><h1>Listing preview</h1><p>This private preview is visible to dealership staff only.</p></div>
      <Link className="text-link" href={`/admin/inventory/${vehicle.id}`}><ArrowLeft size={15} /> Back to editor</Link>
    </div>
    <p className="callout">{vehicle.published ? "Previewing the saved listing." : "This listing is a draft. Publish it from the editor when it is ready for customers."}</p>
    <div className="detail-layout">
      <div className="detail-primary">
        <VehicleGallery images={vehicle.images} title={title} />
        <div className="detail-description">
          <p className="eyebrow">About this car</p><h2>Details that matter.</h2>
          <p>{vehicle.description || "More information about this car is available from the dealership team."}</p>
          {vehicle.features.length ? <div className="feature-list"><h3>Features and equipment</h3><ul>{vehicle.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul></div> : null}
        </div>
      </div>
      <aside className="detail-aside">
        <div className="detail-title"><span className={`tag tag-${vehicle.availability}`}>{availabilityLabels[vehicle.availability]}</span><p className="eyebrow">{vehicle.year ?? "Year available on request"} · {vehicle.make}</p><h2>{vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ""}</h2><strong>{formatAmount(vehicle.price, vehicle.currency)}</strong></div>
        <div className="detail-quick-specs">{vehicle.mileage != null ? <span><Gauge size={17} />{new Intl.NumberFormat().format(vehicle.mileage)} km</span> : null}{vehicle.transmission ? <span><Settings2 size={17} />{vehicle.transmission}</span> : null}{vehicle.fuel_type ? <span><Fuel size={17} />{vehicle.fuel_type}</span> : null}</div>
        <div className="spec-list"><h2>Vehicle specifications</h2>{specifications.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </aside>
    </div>
  </AdminFrame>;
}
