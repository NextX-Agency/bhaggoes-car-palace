import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Gauge, Fuel, Settings2 } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { availabilityLabels, formatAmount } from "@/lib/domain";
import { VehicleActions } from "@/components/vehicle-actions";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const image = vehicle.images.find((item) => item.is_cover)?.url ?? vehicle.images[0]?.url;
  return <article className="vehicle-card">
    <div className="vehicle-card-media">
      <Link href={`/cars/${vehicle.slug}`} aria-label={`View ${vehicle.title}`}>
        {image ? <Image src={image} alt={vehicle.images[0]?.alt_text ?? vehicle.title} fill sizes="(max-width: 700px) 90vw, (max-width: 1120px) 45vw, 28vw" className="vehicle-photo" /> : <div className="vehicle-image-empty"><span className="car-mark" aria-hidden="true">B</span><span>No photo available</span></div>}
      </Link>
      <div className="card-top-tags">{vehicle.featured ? <span className="tag tag-featured">Featured</span> : null}<span className={`tag tag-${vehicle.availability}`}>{availabilityLabels[vehicle.availability]}</span></div>
      <VehicleActions vehicleId={vehicle.id} compact />
    </div>
    <div className="vehicle-card-body">
      <div className="vehicle-card-titleline"><div><p className="eyebrow">{vehicle.year ?? ""}{vehicle.year ? " · " : ""}{vehicle.make}</p><h3><Link href={`/cars/${vehicle.slug}`}>{vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ""}</Link></h3></div><strong className="vehicle-price">{formatAmount(vehicle.price, vehicle.currency)}</strong></div>
      <div className="vehicle-card-specs">
        {vehicle.mileage != null ? <span><Gauge size={14} />{new Intl.NumberFormat().format(vehicle.mileage)} km</span> : null}
        {vehicle.transmission ? <span><Settings2 size={14} />{vehicle.transmission}</span> : null}
        {vehicle.fuel_type ? <span><Fuel size={14} />{vehicle.fuel_type}</span> : null}
      </div>
      <Link className="card-link" href={`/cars/${vehicle.slug}`}>Explore this car <ArrowUpRight size={16} /></Link>
    </div>
  </article>;
}
