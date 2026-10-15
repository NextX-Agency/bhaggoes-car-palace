import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
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
    <div className="page-intro"><h1>Contact</h1></div>
    <div className={hasDetails ? "support-grid" : "support-single"}>
      <section aria-labelledby="message-heading"><h2 id="message-heading" className="support-heading">Send a message</h2><ContactForm /></section>
      {hasDetails ? <aside className="support-card">
        {settings.phone || settings.email || settings.address ? <dl className="contact-details">
          {settings.phone ? <div><dt>Phone</dt><dd><a href={`tel:${settings.phone}`}>{settings.phone}</a></dd></div> : null}
          {settings.email ? <div><dt>Email</dt><dd><a href={`mailto:${settings.email}`}>{settings.email}</a></dd></div> : null}
          {settings.address ? <div><dt>Address</dt><dd><a href={map ?? undefined} target="_blank" rel="noreferrer">{settings.address}</a></dd></div> : null}
        </dl> : null}
        {whatsapp ? <a className="button button-whatsapp button-block" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> Message on WhatsApp</a> : null}
        {hours.length ? <div className="contact-hours"><h2>Opening hours</h2><div className="hours">{hours.map(([day, time]) => <div key={day}><span>{day}</span><span>{time}</span></div>)}</div></div> : null}
        {mapEmbed ? <div className="map-embed"><iframe src={mapEmbed} title={`Map to ${settings.business_name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div> : null}
      </aside> : null}
    </div>
  </div>;
}
