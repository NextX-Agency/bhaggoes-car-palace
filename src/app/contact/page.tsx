import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { getSettings } from "@/lib/data";
import { buildWhatsAppLink } from "@/lib/domain";

export const metadata: Metadata = { title: "Contact", description: "Contact Bhaggoes Car Palace about its vehicles or send the dealership a question.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const settings = await getSettings();
  const map = settings.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}` : null;
  const mapEmbed = settings.address ? `https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed` : null;
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, I have a question.`);
  const hours = Object.entries(settings.business_hours ?? {});
  const hasDetails = Boolean(settings.phone || settings.email || settings.address || whatsapp || hours.length);
  return <div className="container page-wrap">
    <div className="page-intro"><h1>Contact us</h1></div>
    <div className="support-grid">
      <section className="support-card" aria-labelledby="message-heading"><h2 id="message-heading">Send a message</h2><ContactForm /></section>
      {hasDetails ? <aside>
        <div className="support-card">
          <h2>Dealership</h2>
          <div className="contact-details">
            {settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={17} aria-hidden="true" />{settings.phone}</a> : null}
            {settings.email ? <a href={`mailto:${settings.email}`}><Mail size={17} aria-hidden="true" />{settings.email}</a> : null}
            {settings.address ? <a href={map ?? undefined} target="_blank" rel="noreferrer"><MapPin size={17} aria-hidden="true" />{settings.address}</a> : null}
          </div>
          {mapEmbed ? <div className="map-embed"><iframe src={mapEmbed} title={`Map to ${settings.business_name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div> : null}
          {whatsapp ? <a className="button button-whatsapp button-block" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> Message on WhatsApp</a> : null}
        </div>
        {hours.length ? <div className="support-card"><h2><Clock size={18} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 8 }} />Opening hours</h2><div className="hours">{hours.map(([day, time]) => <div key={day}><span>{day}</span><span>{time}</span></div>)}</div></div> : null}
      </aside> : null}
    </div>
  </div>;
}
