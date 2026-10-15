import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Contact", description: "Contact Bhaggoes Car Palace about its vehicles or send the dealership a question.", alternates: { canonical: "/contact" } };
export default async function ContactPage() {
  const settings = await getSettings();
  const map = settings.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}` : null;
  const mapEmbed = settings.address ? `https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed` : null;
  const hasDetails = Boolean(settings.phone || settings.email || settings.address || settings.whatsapp || (settings.business_hours && Object.keys(settings.business_hours).length));
  return <div className="container page-wrap"><div className="page-intro"><h1>Contact Us</h1></div><div className="support-grid"><section className="support-card"><h2>Send a message</h2><ContactForm /></section>{hasDetails ? <aside><div className="support-card"><h2>Contact details</h2><div className="contact-details">{settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={16} />{settings.phone}</a> : null}{settings.email ? <a href={`mailto:${settings.email}`}><Mail size={16} />{settings.email}</a> : null}{settings.address ? <a href={map ?? undefined} target="_blank" rel="noreferrer"><MapPin size={16} />{settings.address}</a> : null}</div>{mapEmbed ? <div className="map-embed"><iframe src={mapEmbed} title={`Map to ${settings.business_name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div> : null}{settings.whatsapp ? <a className="button button-dark" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Message on WhatsApp ↗</a> : null}</div>{settings.business_hours && Object.keys(settings.business_hours).length ? <div className="support-card" style={{ marginTop: 15 }}><h2>Business hours</h2>{Object.entries(settings.business_hours).map(([day, hours]) => <p key={day} className="contact-details"><span>{day}: {hours}</span></p>)}</div> : null}</aside> : null}</div></div>;
}
