import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { getSettings } from "@/lib/data";
import { buildWhatsAppLink, parseLocations } from "@/lib/domain";

export const metadata: Metadata = { title: "Contact", description: "Contact Bhaggoes Car Palace on WhatsApp, by phone, or visit one of its locations.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const settings = await getSettings();
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, I have a question.`);
  const locations = parseLocations(settings.address);
  const hours = Object.entries(settings.business_hours ?? {});
  const reachable = Boolean(whatsapp || settings.phone || settings.email);

  return <div className="container page-wrap">
    <div className="page-intro"><h1>Contact</h1></div>

    {reachable ? <section className="contact-direct" aria-label="Contact options">
      {whatsapp ? <a className="contact-whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
        <MessageCircle size={26} aria-hidden="true" />
        <span><strong>WhatsApp</strong>{settings.whatsapp}</span>
        <span className="button button-whatsapp">Start chat</span>
      </a> : null}
      {settings.phone || settings.email ? <dl className="contact-details">
        {settings.phone ? <div><dt>Phone</dt><dd><a href={`tel:${settings.phone}`}>{settings.phone}</a></dd></div> : null}
        {settings.email ? <div><dt>Email</dt><dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd></div> : null}
      </dl> : null}
    </section> : <div className="support-single"><ContactForm /></div>}

    {locations.length ? <section className="contact-section" aria-labelledby="locations-heading">
      <h2 id="locations-heading">{locations.length === 1 ? "Location" : "Locations"}</h2>
      <ul className="location-list">
        {locations.map((location) => <li key={location.address}>
          {location.name ? <strong>{location.name}</strong> : null}
          <p>{location.address}</p>
          <a className="text-link" href={location.mapUrl} target="_blank" rel="noreferrer">Directions</a>
        </li>)}
      </ul>
      {locations.length === 1 ? <div className="map-embed"><iframe src={`https://www.google.com/maps?q=${encodeURIComponent(locations[0].address)}&output=embed`} title={`Map to ${settings.business_name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div> : null}
    </section> : null}

    {hours.length ? <section className="contact-section" aria-labelledby="hours-heading">
      <h2 id="hours-heading">Opening hours</h2>
      <div className="hours contact-hours">{hours.map(([day, time]) => <div key={day}><span>{day}</span><span>{time}</span></div>)}</div>
    </section> : null}
  </div>;
}
