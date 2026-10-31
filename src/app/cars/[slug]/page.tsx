import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { VehicleDetail, vehicleDisplayName } from "@/components/vehicle-detail";
import { CatalogNotice } from "@/components/catalog-notice";
import { VehicleGrid } from "@/components/vehicle-grid";
import { JsonLd } from "@/components/json-ld";
import { getRelatedVehicles, getSettings, getVehicleBySlug, getVehicleSlugsForBuild } from "@/lib/data";
import { isDemoVehicle } from "@/lib/domain";
import { breadcrumbJsonLd, defaultShareImage, vehicleDescription, vehicleJsonLd, vehicleShareImages } from "@/lib/seo";

// Pre-render the newest cars at build time; every other car is rendered on first request and then cached (ISR).
export async function generateStaticParams() {
  return (await getVehicleSlugsForBuild()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [vehicle, settings] = await Promise.all([getVehicleBySlug(slug), getSettings()]);
  if (settings.catalog_hidden) return { title: "Cars", robots: { index: false, follow: true } };
  if (!vehicle) return { title: "Car not found", robots: { index: false, follow: false } };
  const demo = isDemoVehicle(vehicle);
  const title = vehicleDisplayName(vehicle);
  const description = vehicleDescription(vehicle, settings);
  const shareImages = vehicleShareImages(vehicle);
  const images = shareImages.length ? shareImages : [defaultShareImage];
  return { title, description, alternates: { canonical: `/cars/${slug}` }, openGraph: { type: "website", url: `/cars/${slug}`, siteName: settings.business_name, title, description, locale: "en_US", images }, twitter: { card: "summary_large_image", title, description, images: images.map((image) => image.url) }, robots: { index: !demo, follow: true } };
}

export default async function VehiclePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [vehicle, settings] = await Promise.all([getVehicleBySlug(slug), getSettings()]);
  // A shared link to a car while the catalog is switched off still lands on the dealership's details.
  if (settings.catalog_hidden) return <div className="catalog-page"><CatalogNotice settings={settings} headingLevel={1} /></div>;
  if (!vehicle) notFound();
  const related = await getRelatedVehicles(vehicle.make, vehicle.id, 3);
  const name = vehicleDisplayName(vehicle);
  const makeHref = vehicle.make ? `/cars?make=${encodeURIComponent(vehicle.make)}` : null;
  const jsonLd = [vehicleJsonLd(vehicle, settings), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Cars", path: "/cars" }, ...(vehicle.make && makeHref ? [{ name: vehicle.make, path: makeHref }] : []), { name, path: `/cars/${vehicle.slug}` }])];

  return <div className="container page-wrap detail-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/cars"><ChevronLeft size={15} /> All cars</Link>{makeHref ? <><span aria-hidden="true">/</span><Link href={makeHref}>{vehicle.make}</Link></> : null}<span aria-hidden="true">/</span><span aria-current="page">{vehicle.model || name}</span></nav>
    <VehicleDetail vehicle={vehicle} settings={settings} />
    {related.length ? <section className="related-section" aria-labelledby="related-heading"><div className="section-heading"><h2 id="related-heading">More {vehicle.make} cars</h2>{makeHref ? <Link className="text-link" href={makeHref}>View all <ArrowRight size={16} /></Link> : null}</div><VehicleGrid vehicles={related} defaultCurrency={settings.currency} /></section> : null}
    <JsonLd data={jsonLd} />
  </div>;
}
