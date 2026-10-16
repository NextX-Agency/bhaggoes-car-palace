import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { VehicleDetail, vehicleDisplayName } from "@/components/vehicle-detail";
import { VehicleGrid } from "@/components/vehicle-grid";
import { getSettings, getVehicleBySlug, getVehicles } from "@/lib/data";
import { coverImage, isDemoVehicle } from "@/lib/domain";
import { siteUrl } from "@/lib/site-url";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: "Car not found", robots: { index: false, follow: false } };
  const image = coverImage(vehicle.images)?.url;
  const demo = isDemoVehicle(vehicle);
  return { title: `${demo ? "Demo · " : ""}${vehicleDisplayName(vehicle)}`, description: demo ? `Example listing for a ${vehicleDisplayName(vehicle)}. Illustrative price and photos; not for sale.` : vehicle.description?.slice(0, 155) || `${vehicleDisplayName(vehicle)} for sale at Bhaggoes Car Palace.`, alternates: { canonical: `/cars/${slug}` }, openGraph: { images: image ? [image] : [] }, robots: { index: !demo, follow: true } };
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [vehicle, settings] = await Promise.all([getVehicleBySlug(slug), getSettings()]);
  if (!vehicle) notFound();
  const { vehicles: similar } = await getVehicles({ make: vehicle.make, pageSize: 4, page: 1 });
  const related = similar.filter((item) => item.id !== vehicle.id).slice(0, 3);
  const name = vehicleDisplayName(vehicle);
  const jsonLd = { "@context": "https://schema.org", "@type": "Vehicle", url: `${siteUrl()}/cars/${vehicle.slug}`, name, brand: { "@type": "Brand", name: vehicle.make }, model: vehicle.model, vehicleModelDate: vehicle.year?.toString(), mileageFromOdometer: vehicle.mileage == null ? undefined : { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" }, offers: isDemoVehicle(vehicle) || vehicle.price == null ? undefined : { "@type": "Offer", price: vehicle.price, priceCurrency: vehicle.currency ?? undefined, availability: vehicle.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability" }, image: vehicle.images.map((image) => image.url).filter(Boolean) };

  return <div className="container page-wrap detail-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/cars"><ChevronLeft size={15} /> All cars</Link><span aria-hidden="true">/</span><Link href={`/cars?make=${encodeURIComponent(vehicle.make)}`}>{vehicle.make}</Link><span aria-hidden="true">/</span><span aria-current="page">{vehicle.model}</span></nav>
    <VehicleDetail vehicle={vehicle} settings={settings} />
    {related.length ? <section className="related-section" aria-labelledby="related-heading"><div className="section-heading"><h2 id="related-heading">More {vehicle.make} cars</h2><Link className="text-link" href={`/cars?make=${encodeURIComponent(vehicle.make)}`}>View all <ArrowRight size={16} /></Link></div><VehicleGrid vehicles={related} /></section> : null}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
  </div>;
}
