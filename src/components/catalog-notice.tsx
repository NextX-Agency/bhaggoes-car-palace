import Link from "next/link";
import { SocialIcon } from "@/components/social-icon";
import type { SiteSettings } from "@/lib/domain";
import { buildWhatsAppLink, parseLocations, safeExternalUrl } from "@/lib/domain";

const socialLabels = { facebook: "Facebook", tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" } as const;

export const defaultCatalogMessage = "We are not listing cars online right now. Our stock changes daily, so send us a WhatsApp or come by one of our showrooms and we will show you what is on the lot.";

/**
 * Shown instead of the cars while the catalog is switched off in the dashboard. Laid out like a printed
 * price sheet: one statement, the phone number, and the practical details side by side.
 */
export function CatalogNotice({ settings, headingLevel = 2, id = "catalog-notice" }: { settings: SiteSettings; headingLevel?: 1 | 2; id?: string }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, which cars do you have available right now?`);
  const locations = parseLocations(settings.address);
  const hours = Object.entries(settings.business_hours ?? {});
  const terms = settings.sales_terms;
  const socials = (["facebook", "tiktok", "instagram", "youtube"] as const).flatMap((platform) => {
    const url = safeExternalUrl(settings.social_links?.[platform]);
    return url ? [{ platform, url, label: socialLabels[platform] }] : [];
  });
  const payment: [string, string][] = [
    ...(settings.financing_enabled ? [
      ["In-house", `${terms.internal_down_percent}% down, the rest in up to ${terms.internal_max_months} months`],
      ["Bank", `From ${terms.bank_down_percent}% down`],
    ] as [string, string][] : []),
    ...(terms.trade_in ? [["Trade-in", "Your current car is accepted"]] as [string, string][] : []),
  ];

  return <section className={`lot${headingLevel === 1 ? " is-page" : ""}`} aria-labelledby={`${id}-title`}>
    <div className="container">
      <div className="lot-intro">
        <Heading id={`${id}-title`}>Ask us what is on the lot today.</Heading>
        <div className="lot-contact">
          <p>{settings.catalog_hidden_message || defaultCatalogMessage}</p>
          {settings.phone ? <a className="lot-phone" href={`tel:${settings.phone}`}>{settings.phone}</a> : null}
          <div className="lot-actions">
            {whatsapp ? <a className="button button-primary" href={whatsapp} target="_blank" rel="noopener noreferrer"><SocialIcon platform="whatsapp" /> WhatsApp us</a> : null}
            {settings.phone ? <a className="button button-outline" href={`tel:${settings.phone}`}>Call</a> : <Link className="button button-outline" href="/contact">Contact</Link>}
          </div>
        </div>
      </div>

      <div className="lot-sheet">
        {locations.length ? <div className="lot-column">
          <h3>{locations.length === 1 ? "Showroom" : "Showrooms"}</h3>
          {locations.map((location, index) => <div className="lot-location" key={location.address}>
            <strong>{location.name || `Location ${index + 1}`}</strong>
            <span>{location.address}</span>
            <a href={location.mapUrl} target="_blank" rel="noopener noreferrer">Directions ↗</a>
          </div>)}
          {hours.length ? <dl className="lot-hours">{hours.map(([day, time]) => <div key={day}><dt>{day}</dt><dd>{time}</dd></div>)}</dl> : null}
        </div> : null}

        {terms.benefits.length ? <div className="lot-column">
          <h3>Included with every car</h3>
          <ol className="lot-included">{terms.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ol>
        </div> : null}

        {payment.length || terms.promo_text ? <div className="lot-column">
          <h3>Paying</h3>
          {payment.length ? <dl className="lot-terms">{payment.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
          {terms.promo_text ? <p className="lot-note">{terms.promo_text}</p> : null}
          {settings.financing_enabled ? <Link className="lot-link" href="/financing">Financing details →</Link> : null}
        </div> : null}
      </div>

      {socials.length ? <p className="lot-social">New arrivals go up on {socials.map(({ platform, url, label }, index) => <span key={platform}>{index ? index === socials.length - 1 ? " and " : ", " : ""}<a href={url} target="_blank" rel="noopener noreferrer">{label}</a></span>)} first.</p> : null}
    </div>
  </section>;
}
