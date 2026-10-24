import type { Metadata } from "next";
import { ArrowUpRight, Phone } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { JsonLd } from "@/components/json-ld";
import { getSettings } from "@/lib/data";
import { dealerJsonLd } from "@/lib/seo";
import { buildWhatsAppLink, parseLocations, safeExternalUrl } from "@/lib/domain";

export const metadata: Metadata = {
  title: "Contact & Locations",
  description: "Visit Bhaggoes Car Palace in Suriname. See both locations on the map or contact the team directly.",
  alternates: { canonical: "/contact" },
};

function mapEmbedUrl(address: string) {
  const lower = address.toLowerCase();
  const query = lower.includes("kwattaweg-tomaatstraat 495")
    ? "Tomaat St 495, Paramaribo, Suriname"
    : lower.includes("indira ghandiweg 50")
      ? "Indira Gandhiweg 50, Wanica, Suriname"
      : address;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

export default async function ContactPage() {
  const settings = await getSettings();
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, I have a question.`);
  const locations = parseLocations(settings.address);
  const hours = Object.entries(settings.business_hours ?? {});
  const socialLinks = (["facebook", "tiktok", "instagram", "youtube"] as const).flatMap((platform) => {
    const url = safeExternalUrl(settings.social_links?.[platform]);
    return url ? [{ platform, url }] : [];
  });

  return <div className="container page-wrap contact-page">
    <JsonLd data={dealerJsonLd(settings, { website: false })} />
    <header className="contact-heading">
      <div>
        <p className="contact-eyebrow">Bhaggoes Car Palace · Suriname</p>
        <h1>Come see us.</h1>
        <p>Find the location that works for you, or speak with our team before you visit.</p>
      </div>
      <div className="contact-heading-actions">
        {whatsapp ? <a className="button button-primary" href={whatsapp} target="_blank" rel="noopener noreferrer"><SocialIcon platform="whatsapp" /> Message on WhatsApp</a> : null}
        {settings.phone ? <a className="contact-phone" href={`tel:${settings.phone}`}><Phone size={18} aria-hidden="true" />{settings.phone}</a> : null}
        {settings.email ? <a className="contact-phone" href={`mailto:${settings.email}`}>{settings.email}</a> : null}
      </div>
    </header>

    {locations.length ? <section className="contact-map-section" aria-labelledby="locations-heading">
      <div className="contact-section-heading"><h2 id="locations-heading">Find us on the map</h2><p>{locations.length === 1 ? "Our location in Suriname." : "Choose the location closest to you."}</p></div>
      <div className="contact-map-grid">
        {locations.map((location, index) => <article className="contact-location" key={location.address}>
          <div className="contact-location-info">
            <span className="contact-location-number">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{location.name || `Location ${index + 1}`}</h3><p>{location.address}</p></div>
            <a href={location.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${location.name || location.address}`}><ArrowUpRight size={20} aria-hidden="true" /><span>Directions</span></a>
          </div>
          <div className="contact-map-frame"><iframe src={mapEmbedUrl(location.address)} title={`Google Maps: ${location.name || location.address}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
        </article>)}
      </div>
    </section> : null}

    {socialLinks.length ? <section className="contact-follow" aria-labelledby="follow-heading"><div><h2 id="follow-heading">See what arrives next.</h2><p>Follow Bhaggoes Car Palace for new arrivals.</p></div><div>{socialLinks.map(({ platform, url }) => <a href={url} key={platform} target="_blank" rel="noopener noreferrer"><SocialIcon platform={platform} size={22} />{platform[0].toUpperCase() + platform.slice(1)}</a>)}</div></section> : null}

    {hours.length ? <section className="contact-hours-section" aria-labelledby="hours-heading"><h2 id="hours-heading">Opening hours</h2><div className="hours contact-hours">{hours.map(([day, time]) => <div key={day}><span>{day}</span><span>{time}</span></div>)}</div></section> : null}
  </div>;
}
