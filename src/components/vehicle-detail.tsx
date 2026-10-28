import { Check, MapPin, Phone } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { VehicleActions } from "@/components/vehicle-actions";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { VehicleShareButton } from "@/components/vehicle-share-button";
import { BrandLogo } from "@/components/brand-logo";
import type { SiteSettings, Vehicle } from "@/lib/domain";
import { buildWhatsAppLink, formatAmount, parseLocations, safeExternalUrl, vehicleSpecifications } from "@/lib/domain";
import { siteUrl } from "@/lib/site-url";

export function vehicleDisplayName(vehicle: Vehicle) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
}

export function VehicleDetail({ vehicle, settings, preview = false }: { vehicle: Vehicle; settings: SiteSettings; preview?: boolean }) {
  const name = vehicleDisplayName(vehicle);
  const heading = [vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
  const price = formatAmount(vehicle.price, vehicle.currency ?? settings.currency);
  const cashPrice = vehicle.cash_price == null ? null : formatAmount(vehicle.cash_price, vehicle.currency ?? settings.currency);
  const hasPrice = vehicle.price != null;
  const message = `Hello ${settings.business_name}, I saw the ${name} on your website. Can you confirm its current availability and price? ${siteUrl()}/cars/${vehicle.slug}`;
  const whatsApp = preview ? null : buildWhatsAppLink(settings.whatsapp, message);
  const specifications = vehicleSpecifications(vehicle);
  const keySpecs = specifications.filter(([label]) => label !== "Stock number").slice(0, 4);
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
              <div><span>Intern prijs</span><strong className={`detail-price${hasPrice ? "" : " is-request"}`}>{price}</strong></div>
              {cashPrice ? <div className="detail-cash-price"><span>Cash price · bank transfer</span><strong>{cashPrice}</strong></div> : null}
            </div>
          </div>
          {keySpecs.length ? <dl className="key-specs">{keySpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
          {!preview && inquire ? <div className="contact-actions">
            {whatsApp ? <a className="button button-whatsapp" href={whatsApp} target="_blank" rel="noreferrer"><SocialIcon platform="whatsapp" /> Ask on WhatsApp</a> : null}
            {!whatsApp ? <a className="button button-primary" href="/contact">Contact the dealership</a> : null}
            {settings.phone ? <a className="button button-ghost" href={`tel:${settings.phone}`}><Phone size={17} aria-hidden="true" /> {settings.phone}</a> : null}
            {facebook ? <a className="detail-social-link" href={facebook} target="_blank" rel="noreferrer"><SocialIcon platform="facebook" /> Message us on Facebook</a> : null}
          </div> : null}
          {!preview ? <div className="detail-tools"><VehicleActions vehicleId={vehicle.id} /><VehicleShareButton title={name} businessName={settings.business_name} /></div> : null}
        </div>
      </aside>

      <div className="detail-content">
        {vehicle.description?.trim() ? <section className="detail-block detail-description" aria-labelledby="description-heading"><h2 id="description-heading">About this car</h2><p>{vehicle.description}</p></section> : null}
        {specifications.length ? <section className="detail-block" aria-labelledby="specs-heading">
          <h2 id="specs-heading">Car details</h2>
          <dl className="spec-table">{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section> : null}
        {vehicle.features.length ? <section className="detail-block" aria-labelledby="features-heading">
          <h2 id="features-heading">Features</h2>
          <ul className="feature-list">{vehicle.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul>
        </section> : null}
        {settings.sales_terms.benefits.length ? <section className="detail-block dealership-benefits" aria-labelledby="benefits-heading">
          <h2 id="benefits-heading">Purchase benefits</h2>
          <ul className="feature-list">
            {settings.sales_terms.benefits.map((benefit) => <li key={benefit}><Check size={16} aria-hidden="true" />{benefit}</li>)}
          </ul>
          <p className="detail-benefits-note">Ask our team which benefits apply to this car.</p>
        </section> : null}
        {settings.financing_enabled || settings.sales_terms.trade_in || settings.sales_terms.promo_text ? <section className="detail-block dealership-terms" aria-labelledby="terms-heading">
          <h2 id="terms-heading">{settings.financing_enabled ? settings.sales_terms.trade_in ? "Financing and trade-ins" : "Financing" : settings.sales_terms.trade_in ? "Trade-ins and offers" : "Offers"}</h2>
          {settings.financing_enabled ? <><p><strong>In-house:</strong> {settings.sales_terms.internal_down_percent}% down payment · up to {settings.sales_terms.internal_max_months} months.</p><p><strong>Bank:</strong> From {settings.sales_terms.bank_down_percent}% down payment.</p></> : null}
          {settings.sales_terms.trade_in ? <p>Trade-ins are possible.</p> : null}
          {settings.sales_terms.promo_text ? <p>{settings.sales_terms.promo_text}</p> : null}
          {settings.financing_enabled && settings.financing_notes ? <p>{settings.financing_notes}</p> : null}
          {settings.financing_enabled ? <p className="detail-terms-note">Confirm current terms and the final price with the team. Bank approval is decided by the lender.</p> : null}
        </section> : null}
        {locations.length ? <section className="detail-block dealership-locations" aria-labelledby="locations-heading"><h2 id="locations-heading">Visit us</h2><div>{locations.map((location) => <a key={location.address} href={location.mapUrl} target="_blank" rel="noreferrer"><MapPin size={18} aria-hidden="true" /><span><strong>{location.name ?? "Location"}</strong>{location.address}</span></a>)}</div></section> : null}
      </div>
    </div>

    {!preview ? <div className="mobile-cta">
      <div className="mobile-cta-price"><span>{cashPrice ? "Cash price" : "Intern prijs"} · {heading}</span><strong>{cashPrice ?? price}</strong></div>
      {whatsApp && inquire ? <a className="button button-whatsapp" href={whatsApp} target="_blank" rel="noreferrer"><SocialIcon platform="whatsapp" /> WhatsApp</a> : <a className="button button-primary" href="/contact">Contact</a>}
    </div> : null}
  </>;
}
