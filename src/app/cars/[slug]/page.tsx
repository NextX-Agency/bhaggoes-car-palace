import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Fuel, Gauge, Settings2 } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { FinanceCalculator } from "@/components/finance-calculator";
import { VehicleActions } from "@/components/vehicle-actions";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { VehicleShareButton } from "@/components/vehicle-share-button";
import { VehicleGrid } from "@/components/vehicle-grid";
import { getSettings, getVehicleBySlug, getVehicles } from "@/lib/data";
import { availabilityLabels, buildWhatsAppLink, formatAmount } from "@/lib/domain";
import { siteUrl } from "@/lib/site-url";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const vehicle = await getVehicleBySlug(slug);
  return vehicle ? { title: vehicle.title, description: vehicle.description?.slice(0, 155) || `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model} for sale at Bhaggoes Car Palace.`, alternates: { canonical: `/cars/${slug}` }, openGraph: { images: vehicle.images[0]?.url ? [vehicle.images[0].url] : [] }, robots: { index: true, follow: true } } : { title: "Vehicle not found", robots: { index: false, follow: false } };
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [vehicle, settings] = await Promise.all([getVehicleBySlug(slug), getSettings()]);
  if (!vehicle) notFound();
  const { vehicles: similar } = await getVehicles({ make: vehicle.make, pageSize: 3, page: 1 });
  const related = similar.filter((item) => item.id !== vehicle.id).slice(0, 3);
  const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.variant].filter(Boolean).join(" ");
  const whatsApp = buildWhatsAppLink(settings.whatsapp, `Hello, I'm interested in the ${title} listed on ${settings.business_name}. Is it still available? ${siteUrl()}/cars/${vehicle.slug}`);
  const specifications = [
    ["Condition", vehicle.condition], ["Mileage", vehicle.mileage == null ? null : `${new Intl.NumberFormat().format(vehicle.mileage)} km`],
    ["Engine", vehicle.engine_capacity], ["Fuel", vehicle.fuel_type], ["Transmission", vehicle.transmission], ["Drive type", vehicle.drive_type],
    ["Body type", vehicle.body_type], ["Exterior", vehicle.exterior_color], ["Interior", vehicle.interior_color],
    ["Seats", vehicle.seats?.toString() ?? null], ["Doors", vehicle.doors?.toString() ?? null],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const jsonLd = { "@context": "https://schema.org", "@type": "Vehicle", url: `${siteUrl()}/cars/${vehicle.slug}`, name: title, brand: { "@type": "Brand", name: vehicle.make }, model: vehicle.model, vehicleModelDate: vehicle.year?.toString(), mileageFromOdometer: vehicle.mileage == null ? undefined : { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" }, offers: vehicle.price == null ? undefined : { "@type": "Offer", price: vehicle.price, priceCurrency: vehicle.currency ?? undefined, availability: vehicle.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability" }, image: vehicle.images.map((image) => image.url).filter(Boolean) };
  return <div className="container page-wrap detail-page">
    <nav className="breadcrumbs"><Link href="/cars"><ArrowLeft size={14} /> Inventory</Link><span>/</span><span>{vehicle.make} {vehicle.model}</span></nav>
    <div className="detail-layout"><div className="detail-primary"><VehicleGallery images={vehicle.images} title={title} />
      {vehicle.description || vehicle.features.length ? <div className="detail-description">{vehicle.description ? <><h2>Description</h2><p>{vehicle.description}</p></> : null}
        {vehicle.features.length ? <div className="feature-list"><h3>Features and equipment</h3><ul>{vehicle.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul></div> : null}
      </div> : null}
      {settings.financing_enabled ? <FinanceCalculator price={vehicle.price ?? 0} currency={vehicle.currency ?? settings.currency ?? ""} /> : null}
    </div><aside className="detail-aside"><div className="detail-title"><span className={`tag tag-${vehicle.availability}`}>{availabilityLabels[vehicle.availability]}</span><p className="eyebrow">{vehicle.year ?? "Year available on request"} · {vehicle.make}</p><h1>{vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ""}</h1><strong>{formatAmount(vehicle.price, vehicle.currency ?? settings.currency)}</strong></div>
      <div className="detail-quick-specs">{vehicle.mileage != null ? <span><Gauge size={17} />{new Intl.NumberFormat().format(vehicle.mileage)} km</span> : null}{vehicle.transmission ? <span><Settings2 size={17} />{vehicle.transmission}</span> : null}{vehicle.fuel_type ? <span><Fuel size={17} />{vehicle.fuel_type}</span> : null}</div>
      <VehicleActions vehicleId={vehicle.id} />
      <VehicleShareButton title={title} businessName={settings.business_name} />
      {whatsApp ? <a className="button button-whatsapp" href={whatsApp} target="_blank" rel="noreferrer">Ask about this car on WhatsApp <ArrowUpRight size={16} /></a> : null}
      <div className="spec-list"><h2>Vehicle specifications</h2>{specifications.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <div className="detail-inquiry"><h2>Send Inquiry</h2><ContactForm vehicleId={vehicle.id} vehicleName={title} /></div>
    </aside></div>
    {related.length ? <section className="section related-section"><div className="section-heading"><h2>Similar Cars</h2><Link className="text-link" href="/cars">View all <ArrowUpRight size={16} /></Link></div><VehicleGrid vehicles={related} /></section> : null}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
  </div>;
}
