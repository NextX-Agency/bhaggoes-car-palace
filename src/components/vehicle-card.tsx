import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { coverImage, formatAmount, formatMileage } from "@/lib/domain";
import { VehicleActions } from "@/components/vehicle-actions";
import { BrandLogo } from "@/components/brand-logo";

export function VehicleCard({ vehicle, priority = false, defaultCurrency }: { vehicle: Vehicle; priority?: boolean; defaultCurrency?: string | null }) {
  const image = coverImage(vehicle.images);
  const name = `${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ""}`;
  const specs = [formatMileage(vehicle.mileage), vehicle.transmission, vehicle.fuel_type].filter(Boolean);
  const hasPrice = vehicle.price != null;
  const currency = vehicle.currency ?? defaultCurrency;
  return <article className="vcard">
    <div className="vcard-media">
      {image?.url
        ? <Image src={image.url} alt={image.alt_text ?? vehicle.title} fill sizes="(max-width: 600px) 100vw, (max-width: 1080px) 50vw, 400px" loading={priority ? "eager" : "lazy"} />
        : <div className="vcard-noimage"><Camera size={26} aria-hidden="true" /><span>No photos yet</span></div>}
      <VehicleActions vehicleId={vehicle.id} name={vehicle.title} compact />
    </div>
    <div className="vcard-body">
      <p className="vcard-meta"><BrandLogo make={vehicle.make} />{[vehicle.year, vehicle.make].filter(Boolean).join(" · ")}</p>
      <h3 className="vcard-title"><Link href={`/cars/${vehicle.slug}`}>{name}</Link></h3>
      {specs.length ? <ul className="vcard-specs">{specs.map((spec) => <li key={spec}>{spec}</li>)}</ul> : null}
      <div className="vcard-prices"><span>In-house price <strong className={`vcard-price${hasPrice ? "" : " is-request"}`}>{formatAmount(vehicle.price, currency)}</strong></span>{vehicle.cash_price != null ? <span>Cash price <strong className="vcard-cash-price">{formatAmount(vehicle.cash_price, currency)}</strong></span> : null}</div>
    </div>
  </article>;
}
