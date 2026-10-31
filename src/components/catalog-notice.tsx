import Link from "next/link";
import { ArrowUpRight, BadgePercent, Check, Clock, Mail, MapPin, Phone } from "lucide-react";
import { SocialIcon, type SocialPlatform } from "@/components/social-icon";
import type { SiteSettings } from "@/lib/domain";
import { buildWhatsAppLink, parseLocations, safeExternalUrl } from "@/lib/domain";

const socialLabels = { facebook: "Facebook", tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" } as const;

export const defaultCatalogMessage = "Our stock changes every day, so we share the current cars directly. Message us on WhatsApp, give us a call or visit one of our showrooms and we will help you find the right car.";

/**
 * Shown instead of the cars while the catalog is switched off in the dashboard: everything a visitor needs to
 * reach the dealership (contact, locations, opening hours) plus what every purchase includes.
 */
export function CatalogNotice({ settings, headingLevel = 2, id = "catalog-notice" }: { settings: SiteSettings; headingLevel?: 1 | 2; id?: string }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, which cars do you have available right now?`);
  const locations = parseLocations(settings.address);
  const hours = Object.entries(settings.business_hours ?? {});
  const terms = settings.sales_terms;
  const benefits = terms.benefits;
  const socials = (["facebook", "tiktok", "instagram", "youtube"] as const).flatMap((platform) => {
    const url = safeExternalUrl(settings.social_links?.[platform]);
    return url ? [{ platform: platform as SocialPlatform, url, label: socialLabels[platform] }] : [];
  });
  const offer = settings.financing_enabled || terms.trade_in || terms.promo_text;

  return <section className="catalog-notice" aria-labelledby={`${id}-title`}>
    <div className="container">
      <div className="catalog-card">
        <div className="catalog-card-main">
          <p className="section-kicker">Current stock</p>
          <Heading id={`${id}-title`}>Ask us about our current cars</Heading>
          <p className="catalog-message">{settings.catalog_hidden_message || defaultCatalogMessage}</p>
          <div className="catalog-actions">
            {whatsapp ? <a className="button button-primary button-lg" href={whatsapp} target="_blank" rel="noopener noreferrer"><SocialIcon platform="whatsapp" /> Message on WhatsApp</a> : null}
            {settings.phone ? <a className="button button-outline button-lg" href={`tel:${settings.phone}`}><Phone size={18} aria-hidden="true" /> Call {settings.phone}</a> : <Link className="button button-outline button-lg" href="/contact">Contact us</Link>}
          </div>
          {socials.length ? <div className="catalog-socials"><span>Follow us for new arrivals</span>{socials.map(({ platform, url, label }) => <a key={platform} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><SocialIcon platform={platform} size={18} />{label}</a>)}</div> : null}
        </div>

        <div className="catalog-card-info">
          {locations.length ? <div className="catalog-info-block">
            <h3><MapPin size={16} aria-hidden="true" /> {locations.length === 1 ? "Showroom" : "Showrooms"}</h3>
            <ul className="catalog-locations">{locations.map((location, index) => <li key={location.address}><a href={location.mapUrl} target="_blank" rel="noopener noreferrer"><span><strong>{location.name || `Location ${index + 1}`}</strong>{location.address}</span><ArrowUpRight size={17} aria-hidden="true" /></a></li>)}</ul>
          </div> : null}
          {hours.length ? <div className="catalog-info-block">
            <h3><Clock size={16} aria-hidden="true" /> Opening hours</h3>
            <div className="hours catalog-hours">{hours.map(([day, time]) => <div key={day}><span>{day}</span><span>{time}</span></div>)}</div>
          </div> : null}
          {settings.phone || settings.email || whatsapp ? <div className="catalog-info-block">
            <h3><Phone size={16} aria-hidden="true" /> Contact</h3>
            <ul className="catalog-contact">
              {settings.phone ? <li><a href={`tel:${settings.phone}`}><Phone size={15} aria-hidden="true" />{settings.phone}</a></li> : null}
              {whatsapp && settings.whatsapp ? <li><a href={whatsapp} target="_blank" rel="noopener noreferrer"><SocialIcon platform="whatsapp" size={15} />WhatsApp {settings.whatsapp}</a></li> : null}
              {settings.email ? <li><a href={`mailto:${settings.email}`}><Mail size={15} aria-hidden="true" />{settings.email}</a></li> : null}
            </ul>
          </div> : null}
        </div>
      </div>

      {benefits.length || offer ? <div className="catalog-perks">
        {benefits.length ? <div className="catalog-perk-block">
          <h3>Every purchase includes</h3>
          <ul className="feature-list">{benefits.map((benefit) => <li key={benefit}><Check size={16} aria-hidden="true" />{benefit}</li>)}</ul>
        </div> : null}
        {offer ? <div className="catalog-perk-block catalog-perk-offer">
          <h3><BadgePercent size={17} aria-hidden="true" /> {settings.financing_enabled ? "Financing" : "Offers"}</h3>
          {settings.financing_enabled ? <><p><strong>In-house:</strong> {terms.internal_down_percent}% down payment · up to {terms.internal_max_months} months</p><p><strong>Bank:</strong> from {terms.bank_down_percent}% down payment</p></> : null}
          {terms.trade_in ? <p>Trade-ins are welcome.</p> : null}
          {terms.promo_text ? <p className="catalog-promo">{terms.promo_text}</p> : null}
          {settings.financing_enabled ? <Link className="text-link" href="/financing">Financing details <ArrowUpRight size={15} aria-hidden="true" /></Link> : null}
        </div> : null}
      </div> : null}
    </div>
  </section>;
}
