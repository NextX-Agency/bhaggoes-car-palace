import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { coverImage, formatAmount, formatMileage, isDemoVehicle } from "@/lib/domain";
import { AvailabilityBadge } from "@/components/availability-badge";
import { VehicleActions } from "@/components/vehicle-actions";

export function VehicleCard({ vehicle, priority = false }: { vehicle: Vehicle; priority?: boolean }) {
  const image = coverImage(vehicle.images);
  const name = `${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ""}`;
  const specs = [formatMileage(vehicle.mileage), vehicle.transmission, vehicle.fuel_type].filter(Boolean);
  const hasPrice = vehicle.price != null;
  return <article className="vcard">
    <div className="vcard-media">
      {image?.url
        ? <Image src={image.url} alt={image.alt_text ?? vehicle.title} fill sizes="(max-width: 600px) 100vw, (max-width: 1080px) 50vw, 400px" loading={priority ? "eager" : "lazy"} />
        : <div className="vcard-noimage"><Camera size={26} aria-hidden="true" /><span>No photos yet</span></div>}
      {vehicle.availability !== "available" ? <div className="vcard-status"><AvailabilityBadge availability={vehicle.availability} /></div> : null}
      {isDemoVehicle(vehicle) ? <span className="vcard-demo">Demo listing</span> : null}
      <VehicleActions vehicleId={vehicle.id} name={vehicle.title} compact />
    </div>
    <div className="vcard-body">
      <p className="vcard-meta">{[vehicle.year, vehicle.make].filter(Boolean).join(" · ")}</p>
      <h3 className="vcard-title"><Link href={`/cars/${vehicle.slug}`}>{name}</Link></h3>
      {specs.length ? <ul className="vcard-specs">{specs.map((spec) => <li key={spec}>{spec}</li>)}</ul> : null}
      <strong className={`vcard-price${hasPrice ? "" : " is-request"}`}>{isDemoVehicle(vehicle) ? "Demo only" : formatAmount(vehicle.price, vehicle.currency)}</strong>
    </div>
  </article>;
}
