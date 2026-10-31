import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight, BadgeCheck, Banknote, Check, Clock, Fuel, Landmark, Mail, MapPin, Navigation, Phone, Repeat, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import { SocialIcon, type SocialPlatform } from "@/components/social-icon";
import type { SiteSettings } from "@/lib/domain";
import { buildWhatsAppLink, mapEmbedUrl, parseLocations, safeExternalUrl } from "@/lib/domain";

const socialLabels = { facebook: "Facebook", tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" } as const;

export const defaultCatalogMessage = "Our stock changes every day, so we share the current cars directly. Message us on WhatsApp, give us a call or visit one of our showrooms and we will help you find the right car.";

// The purchase benefits are free text from the dashboard; pick a fitting icon from the words staff use.
const benefitIcons: [RegExp, LucideIcon][] = [
  [/keuring|verzeker|insur|inspect/i, ShieldCheck], [/kenteken|plate|registr/i, BadgeCheck], [/snel|vlot|fast|quick/i, Zap],
  [/service|onderhoud|maintenance/i, Wrench], [/poets|stoom|clean|wash/i, Sparkles], [/tank|benzine|fuel|brandstof/i, Fuel],
];
const benefitIcon = (benefit: string) => benefitIcons.find(([pattern]) => pattern.test(benefit))?.[1] ?? Check;

/**
 * Shown instead of the cars while the catalog is switched off in the dashboard: a landing section with
 * everything a visitor needs to reach the dealership and what every purchase includes.
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
  const highlights: { icon: LucideIcon; value: string; label: string }[] = [
    ...(locations.length ? [{ icon: MapPin, value: `${locations.length} ${locations.length === 1 ? "showroom" : "showrooms"}`, label: locations.map((location) => location.name).filter(Boolean).join(" & ") || "Visit us in person" }] : []),
    ...(settings.financing_enabled ? [{ icon: Banknote, value: `From ${terms.bank_down_percent}% down`, label: "Bank and in-house financing" }] : []),
    ...(terms.trade_in ? [{ icon: Repeat, value: "Trade-ins", label: "Bring your current car" }] : []),
    ...(benefits.length ? [{ icon: ShieldCheck, value: `${benefits.length} extras`, label: "Included with every car" }] : []),
  ];

  return <section className={`catalog-notice${headingLevel === 1 ? " is-page" : ""}`} aria-labelledby={`${id}-title`}>
    {highlights.length ? <div className="container catalog-highlights-dock">
      <ul className="catalog-highlights" aria-label="Why buy at Bhaggoes">{highlights.map(({ icon: Icon, value, label }) => <li key={value}><span className="catalog-highlight-icon" aria-hidden="true"><Icon size={22} /></span><span><strong>{value}</strong>{label}</span></li>)}</ul>
    </div> : null}

    <div className="container catalog-feature">
      <div className="catalog-cta">
        <p className="catalog-eyebrow"><span aria-hidden="true" /> Current stock</p>
        <Heading id={`${id}-title`}>Your next car is one message away</Heading>
        <p className="catalog-message">{settings.catalog_hidden_message || defaultCatalogMessage}</p>
        <div className="catalog-actions">
          {whatsapp ? <a className="button catalog-button-whatsapp button-lg" href={whatsapp} target="_blank" rel="noopener noreferrer"><SocialIcon platform="whatsapp" size={20} /> Message on WhatsApp</a> : null}
          {settings.phone ? <a className="button catalog-button-ghost button-lg" href={`tel:${settings.phone}`}><Phone size={18} aria-hidden="true" /> Call {settings.phone}</a> : <Link className="button catalog-button-ghost button-lg" href="/contact">Contact us</Link>}
        </div>
        {hours.length || settings.email ? <ul className="catalog-quick-contact">
          {hours.length ? <li><Clock size={16} aria-hidden="true" />{hours.map(([day, time]) => `${day}: ${time}`).join(" · ")}</li> : null}
          {settings.email ? <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${settings.email}`}>{settings.email}</a></li> : null}
        </ul> : null}
      </div>

      {benefits.length ? <div className="catalog-benefits">
        <p className="section-kicker">With every purchase</p>
        <h3>Drive away ready</h3>
        <ul>{benefits.map((benefit) => { const Icon = benefitIcon(benefit); return <li key={benefit}><span aria-hidden="true"><Icon size={20} /></span>{benefit}</li>; })}</ul>
      </div> : null}
    </div>

    {locations.length ? <div className="container catalog-section">
      <div className="catalog-section-head"><div><p className="section-kicker">Visit us</p><h3>{locations.length === 1 ? "Our showroom" : "Our showrooms"}</h3></div><Link className="text-link" href="/contact">All contact details <ArrowRight size={16} aria-hidden="true" /></Link></div>
      <div className="catalog-locations">
        {locations.map((location, index) => <article key={location.address} className="catalog-location">
          <div className="catalog-map"><iframe src={mapEmbedUrl(location.address)} title={`Map: ${location.name || location.address}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /></div>
          <div className="catalog-location-body">
            <span className="catalog-location-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div><h4>{location.name || `Location ${index + 1}`}</h4><p>{location.address}</p></div>
            <a className="button button-primary" href={location.mapUrl} target="_blank" rel="noopener noreferrer"><Navigation size={16} aria-hidden="true" /> Directions</a>
          </div>
        </article>)}
      </div>
    </div> : null}

    {settings.financing_enabled || terms.trade_in ? <div className="container catalog-section">
      <div className="catalog-section-head"><div><p className="section-kicker">Pay your way</p><h3>Financing and trade-ins</h3></div>{settings.financing_enabled ? <Link className="text-link" href="/financing">Financing details <ArrowRight size={16} aria-hidden="true" /></Link> : null}</div>
      <div className="catalog-finance">
        {settings.financing_enabled ? <>
          <div className="catalog-finance-card"><Banknote size={22} aria-hidden="true" /><p>In-house financing</p><strong>{terms.internal_down_percent}%<small> down</small></strong><span>Pay the rest in up to {terms.internal_max_months} months</span></div>
          <div className="catalog-finance-card"><Landmark size={22} aria-hidden="true" /><p>Bank financing</p><strong>{terms.bank_down_percent}%<small> down</small></strong><span>We help you with the application</span></div>
        </> : null}
        {terms.trade_in ? <div className="catalog-finance-card is-accent"><Repeat size={22} aria-hidden="true" /><p>Trade-in</p><strong>Welcome</strong><span>Your current car counts towards the next one</span></div> : null}
      </div>
      {terms.promo_text ? <p className="catalog-promo"><Sparkles size={17} aria-hidden="true" />{terms.promo_text}</p> : null}
    </div> : null}

    {socials.length ? <div className="container catalog-section">
      <div className="catalog-follow">
        <div><h3>See new arrivals first</h3><p>We post every new car on our socials as soon as it arrives.</p></div>
        <div className="catalog-follow-links">{socials.map(({ platform, url, label }) => <a key={platform} href={url} target="_blank" rel="noopener noreferrer"><SocialIcon platform={platform} size={20} />{label}<ArrowUpRight size={15} aria-hidden="true" /></a>)}</div>
      </div>
    </div> : null}
  </section>;
}
