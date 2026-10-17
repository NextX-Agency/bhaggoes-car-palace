import { Check, MapPin, MessageCircle, Phone } from "lucide-react";
import { AvailabilityBadge } from "@/components/availability-badge";
import { VehicleActions } from "@/components/vehicle-actions";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { VehicleShareButton } from "@/components/vehicle-share-button";
import { BrandLogo } from "@/components/brand-logo";
import type { SiteSettings, Vehicle } from "@/lib/domain";
import { buildWhatsAppLink, formatAmount, isDemoVehicle, parseLocations, safeExternalUrl, vehicleSpecifications } from "@/lib/domain";
import { siteUrl } from "@/lib/site-url";

export function vehicleDisplayName(vehicle: Vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
}

export function VehicleDetail({ vehicle, settings, preview = false }: { vehicle: Vehicle; settings: SiteSettings; preview?: boolean }) {
  const name = vehicleDisplayName(vehicle);
  const heading = [vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
  const demo = isDemoVehicle(vehicle);
  const price = formatAmount(vehicle.price, vehicle.currency ?? settings.currency);
  const cashPrice = vehicle.cash_price == null ? null : formatAmount(vehicle.cash_price, vehicle.currency ?? settings.currency);
  const hasPrice = vehicle.price != null;
  const message = `Hello ${settings.business_name}, I saw the ${name} on your website. Can you confirm its current availability and price? ${siteUrl()}/cars/${vehicle.slug}`;
  const whatsApp = preview ? null : buildWhatsAppLink(settings.whatsapp, message);
  const specifications = vehicleSpecifications(vehicle);
  const keySpecs = specifications.filter(([, value]) => value !== "—").slice(0, 4);
  const locations = parseLocations(settings.address);
  const facebook = safeExternalUrl(settings.social_links?.facebook);
  const Title = preview ? "h2" : "h1";
  const inquire = vehicle.availability !== "sold";

  return <>
    <div className="detail-layout">
      <div className="detail-gallery"><VehicleGallery images={vehicle.images} title={name} /></div>

      <aside className="detail-aside" aria-label="Price and contact">
        <div className="detail-summary">
          <div>
            <p className="eyebrow detail-brand"><BrandLogo make={vehicle.make} />{[vehicle.year, vehicle.condition === "new" ? "New" : "Used"].filter(Boolean).join(" · ")}</p>
            <Title>{heading}</Title>
          </div>
          <div className="detail-head-row">
            <div className="detail-prices">
              <div><span>Interne prijs</span><strong className={`detail-price${hasPrice ? "" : " is-request"}`}>{price}</strong></div>
              {cashPrice ? <div className="detail-cash-price"><span>Cashprijs · giraal deal</span><strong>{cashPrice}</strong></div> : null}
            </div>
            {demo ? <span className="status">Check availability</span> : <AvailabilityBadge availability={vehicle.availability} />}
          </div>
          {keySpecs.length ? <dl className="key-specs">{keySpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
          {!preview && inquire ? <div className="contact-actions">
            {whatsApp ? <a className="button button-whatsapp" href={whatsApp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> Vraag via WhatsApp</a> : null}
            {!whatsApp ? <a className="button button-primary" href="/contact">Contact the dealership</a> : null}
            {settings.phone ? <a className="button button-ghost" href={`tel:${settings.phone}`}><Phone size={17} aria-hidden="true" /> {settings.phone}</a> : null}
            {facebook ? <a className="detail-social-link" href={facebook} target="_blank" rel="noreferrer">Stuur ons een bericht via Facebook</a> : null}
          </div> : null}
          {!preview ? <div className="detail-tools"><VehicleActions vehicleId={vehicle.id} /><VehicleShareButton title={name} businessName={settings.business_name} /></div> : null}
        </div>
      </aside>

      <div className="detail-content">
        {specifications.length ? <section className="detail-block" aria-labelledby="specs-heading">
          <h2 id="specs-heading">Voertuiggegevens</h2>
          <dl className="spec-table">{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section> : null}
        {vehicle.features.length ? <section className="detail-block" aria-labelledby="features-heading">
          <h2 id="features-heading">Uitvoering</h2>
          <ul className="feature-list">{vehicle.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul>
        </section> : null}
        <section className="detail-block dealership-benefits" aria-labelledby="benefits-heading">
          <h2 id="benefits-heading">Bij aankoop krijgt u</h2>
          <ul className="feature-list">
            {["1 jaar keuring en verzekering", "Nieuwe kentekenplaat", "Snelle en vlotte afhandeling", "Complete servicebeurt", "Stoom- en poetsbeurt", "Volle tank benzine"].map((benefit) => <li key={benefit}><Check size={16} aria-hidden="true" />{benefit}</li>)}
          </ul>
        </section>
        <section className="detail-block dealership-terms" aria-labelledby="terms-heading">
          <h2 id="terms-heading">Financiering en inruil</h2>
          <p><strong>Intern:</strong> 70% aanbetaling, maximaal 6 maanden.</p>
          <p><strong>Bank:</strong> vanaf 25% aanbetaling.</p>
          <p>Inruil mogelijk. Neem vandaag contact op voor eventuele extra korting.</p>
        </section>
        {locations.length ? <section className="detail-block dealership-locations" aria-labelledby="locations-heading"><h2 id="locations-heading">Bezoek ons</h2><div>{locations.map((location) => <a key={location.address} href={location.mapUrl} target="_blank" rel="noreferrer"><MapPin size={18} aria-hidden="true" /><span><strong>{location.name ?? "Locatie"}</strong>{location.address}</span></a>)}</div></section> : null}
      </div>
    </div>

    {!preview ? <div className="mobile-cta">
      <div className="mobile-cta-price"><span>{heading}</span><strong>{cashPrice ?? price}</strong></div>
      {whatsApp && inquire ? <a className="button button-whatsapp" href={whatsApp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> WhatsApp</a> : <a className="button button-primary" href="/contact">Contact</a>}
    </div> : null}
  </>;
}
