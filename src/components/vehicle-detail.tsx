import { Check, MessageCircle, Phone } from "lucide-react";
import { AvailabilityBadge } from "@/components/availability-badge";
import { FinanceCalculator } from "@/components/finance-calculator";
import { VehicleActions } from "@/components/vehicle-actions";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { VehicleShareButton } from "@/components/vehicle-share-button";
import type { SiteSettings, Vehicle } from "@/lib/domain";
import { buildWhatsAppLink, formatAmount, formatMileage, vehicleSpecifications } from "@/lib/domain";
import { siteUrl } from "@/lib/site-url";

export function vehicleDisplayName(vehicle: Vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
}

export function VehicleDetail({ vehicle, settings, preview = false }: { vehicle: Vehicle; settings: SiteSettings; preview?: boolean }) {
  const name = vehicleDisplayName(vehicle);
  const heading = [vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
  const price = formatAmount(vehicle.price, vehicle.currency ?? settings.currency);
  const hasPrice = vehicle.price != null;
  const whatsApp = preview ? null : buildWhatsAppLink(settings.whatsapp, `Hello, I'm interested in the ${name} listed at ${settings.business_name}. Is it still available? ${siteUrl()}/cars/${vehicle.slug}`);
  const keySpecs = ([
    ["Mileage", formatMileage(vehicle.mileage)], ["Transmission", vehicle.transmission], ["Fuel", vehicle.fuel_type],
    ["Engine", vehicle.engine_capacity], ["Body type", vehicle.body_type],
  ] as [string, string | null][]).filter((item): item is [string, string] => Boolean(item[1])).slice(0, 4);
  const specifications = vehicleSpecifications(vehicle);
  const Title = preview ? "h2" : "h1";
  const inquire = vehicle.availability !== "sold";

  return <>
    <div className="detail-layout">
      <div className="detail-gallery"><VehicleGallery images={vehicle.images} title={name} /></div>

      <aside className="detail-aside" aria-label="Price and contact">
        <div className="detail-summary">
          <div>
            <p className="eyebrow">{[vehicle.year, vehicle.condition === "new" ? "New" : "Used"].filter(Boolean).join(" · ")}</p>
            <Title>{heading}</Title>
          </div>
          <div className="detail-head-row">
            <strong className={`detail-price${hasPrice ? "" : " is-request"}`}>{price}</strong>
            <AvailabilityBadge availability={vehicle.availability} />
          </div>
          {keySpecs.length ? <dl className="key-specs">{keySpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
          {!preview && inquire ? <div className="contact-actions">
            {whatsApp ? <a className="button button-whatsapp" href={whatsApp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> Ask on WhatsApp</a> : null}
            {!whatsApp ? <a className="button button-primary" href="/contact">Contact the dealership</a> : null}
            {settings.phone ? <a className="button button-ghost" href={`tel:${settings.phone}`}><Phone size={17} aria-hidden="true" /> {settings.phone}</a> : null}
          </div> : null}
          {!preview ? <div className="detail-tools"><VehicleActions vehicleId={vehicle.id} /><VehicleShareButton title={name} businessName={settings.business_name} /></div> : null}
        </div>
      </aside>

      <div className="detail-content">
        {specifications.length ? <section className="detail-block" aria-labelledby="specs-heading">
          <h2 id="specs-heading">Specifications</h2>
          <dl className="spec-table">{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section> : null}
        {vehicle.description ? <section className="detail-block detail-description" aria-labelledby="description-heading">
          <h2 id="description-heading">Description</h2>
          <p>{vehicle.description}</p>
        </section> : null}
        {vehicle.features.length ? <section className="detail-block" aria-labelledby="features-heading">
          <h2 id="features-heading">Features</h2>
          <ul className="feature-list">{vehicle.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul>
        </section> : null}
        {settings.financing_enabled && hasPrice && !preview ? <section className="detail-block"><FinanceCalculator price={vehicle.price ?? 0} currency={vehicle.currency ?? settings.currency ?? ""} /></section> : null}
      </div>
    </div>

    {!preview ? <div className="mobile-cta">
      <div className="mobile-cta-price"><span>{heading}</span><strong>{price}</strong></div>
      {whatsApp && inquire ? <a className="button button-whatsapp" href={whatsApp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> WhatsApp</a> : <a className="button button-primary" href="/contact">Contact</a>}
    </div> : null}
  </>;
}
