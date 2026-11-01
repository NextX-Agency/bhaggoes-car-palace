import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Navigation, Phone } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import type { SiteSettings } from "@/lib/domain";
import { buildWhatsAppLink, mapEmbedUrl, parseLocations, safeExternalUrl } from "@/lib/domain";

const socialLabels = { facebook: "Facebook", tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" } as const;

// Real photos from the lot, used until staff upload their own in the settings.
const defaultPhotos = ["/images/harrier-2018/front-three-quarter.webp", "/images/harrier-2018/rear.webp", "/images/harrier-2018/cockpit.webp", "/images/harrier-2018/front.webp", "/images/harrier-2018/panoramic-roof.webp"];

export const defaultCatalogMessage = "Our stock changes every day. Message us or come by the lot and we will show you what is available.";

/**
 * Shown instead of the cars while the catalog is switched off in the dashboard. Deliberately light on text:
 * a cinematic photo of the lot, a moving band with what every purchase includes, and both showrooms on a map.
 */
export function CatalogNotice({ settings, headingLevel = 2, id = "catalog-notice" }: { settings: SiteSettings; headingLevel?: 1 | 2; id?: string }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, which cars do you have available right now?`);
  const locations = parseLocations(settings.address);
  const terms = settings.sales_terms;
  const socials = (["facebook", "tiktok", "instagram", "youtube"] as const).flatMap((platform) => {
    const url = safeExternalUrl(settings.social_links?.[platform]);
    return url ? [{ platform, url, label: socialLabels[platform] }] : [];
  });
  const photos = settings.catalog_image_urls?.length ? settings.catalog_image_urls : defaultPhotos;
  const [cover, ...rest] = photos;
  const strip = (rest.length ? rest : photos).slice(0, 5);
  const place = locations.map((location) => location.name).filter(Boolean).join(" & ");
  const ticker = [
    settings.slogan,
    ...terms.benefits,
    settings.financing_enabled ? `Financing from ${terms.bank_down_percent}% down` : "",
    terms.trade_in ? "Trade-ins welcome" : "",
  ].filter(Boolean);

  return <section className={`lot${headingLevel === 1 ? " is-page" : ""}`} aria-labelledby={`${id}-title`}>
    <div className="lot-cover">
      <Image className="lot-cover-photo" src={cover} alt={`The lot at ${settings.business_name}`} fill sizes="100vw" />
      <div className="container lot-cover-content">
        <p className="lot-place"><span aria-hidden="true" />{settings.business_name}{place ? <em className="lot-place-extra"> · {place}</em> : null}</p>
        <Heading id={`${id}-title`}>Ask us what is on the lot today.</Heading>
        <p className="lot-message">{settings.catalog_hidden_message || defaultCatalogMessage}</p>
        <div className="lot-actions">
          {whatsapp ? <a className="button lot-button-light" href={whatsapp} target="_blank" rel="noopener noreferrer"><SocialIcon platform="whatsapp" /> WhatsApp us</a> : null}
          {settings.phone ? <a className="button lot-button-line" href={`tel:${settings.phone}`}><Phone size={17} aria-hidden="true" /> {settings.phone}</a> : <Link className="button lot-button-line" href="/contact">Contact</Link>}
        </div>
        {locations.length ? <a className="lot-scroll" href={`#${id}-showrooms`}>See our {locations.length === 1 ? "showroom" : "showrooms"} <ArrowDown size={16} aria-hidden="true" /></a> : null}
      </div>
    </div>

    {ticker.length ? <div className="lot-ticker">
      <ul className="sr-only">{ticker.map((item) => <li key={item}>{item}</li>)}</ul>
      {/* Two identical runs side by side make the loop seamless; only the list above is read out. */}
      <div className="lot-ticker-track" aria-hidden="true">
        {[0, 1].map((run) => <div className="lot-ticker-run" key={run}>{ticker.map((item) => <span key={item}>{item}</span>)}</div>)}
      </div>
    </div> : null}

    {strip.length > 1 ? <div className="lot-strip">
      {strip.map((src) => <figure key={src} className="lot-strip-photo"><Image src={src} alt="" fill sizes="(max-width: 640px) 74vw, 25vw" /></figure>)}
    </div> : null}

    {locations.length ? <div className="lot-visit" id={`${id}-showrooms`}>
      <div className="container">
        <div className="lot-visit-head">
          <h3>Come see the cars in person.</h3>
          {socials.length ? <p>New arrivals first on {socials.map(({ platform, url, label }, index) => <span key={platform}>{index ? index === socials.length - 1 ? " & " : ", " : ""}<a href={url} target="_blank" rel="noopener noreferrer">{label}</a></span>)}</p> : null}
        </div>
        <div className={`lot-maps count-${Math.min(locations.length, 3)}`}>
          {locations.map((location, index) => <article className="lot-map" key={location.address}>
            <iframe src={mapEmbedUrl(location.address)} title={`Google Maps: ${location.name || location.address}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
            <div className="lot-map-card">
              <span className="lot-map-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div><h4>{location.name || `Location ${index + 1}`}</h4><p>{location.address}</p></div>
              <a className="lot-map-go" href={location.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${location.name || location.address}`}><Navigation size={18} aria-hidden="true" /><span>Directions</span><ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </article>)}
        </div>
      </div>
    </div> : null}
  </section>;
}
