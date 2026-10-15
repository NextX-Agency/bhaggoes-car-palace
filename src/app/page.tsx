import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { VehicleGrid } from "@/components/vehicle-grid";
import { getFeaturedVehicles, getRecentVehicles, getSettings, getVehicleFilterOptions } from "@/lib/data";
import { buildWhatsAppLink } from "@/lib/domain";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [settings, featured, recent, filterOptions] = await Promise.all([
    getSettings(), getFeaturedVehicles(3), getRecentVehicles(3), getVehicleFilterOptions(),
  ]);
  const vehicles = featured.length ? featured : recent;
  const whatsappHref = buildWhatsAppLink(settings.whatsapp, `Hello, I have a question about a vehicle at ${settings.business_name}.`);

  return <>
    <section className="hero">
      <Image className="hero-photo" src="/images/hero-suv.webp" alt="SUV on a road" fill loading="eager" fetchPriority="high" sizes="100vw" />
      <div className="hero-shade" />
      <div className="container hero-content">
        <h1>{settings.homepage_title}</h1>
        {settings.homepage_subtitle ? <p className="hero-copy">{settings.homepage_subtitle}</p> : null}
        <Link className="button button-accent" href="/cars">Browse inventory <ArrowUpRight size={17} /></Link>
      </div>
    </section>

    <section className="search-band" aria-labelledby="home-search-heading">
      <div className="container search-band-inner">
        <h2 id="home-search-heading">Search cars</h2>
        <form action="/cars" className="hero-search hero-search-advanced">
          <div className="hero-search-fields">
            <label>Make<select name="make" defaultValue=""><option value="">All makes</option>{filterOptions.makes.map((make) => <option key={make}>{make}</option>)}</select></label>
            <label>Model<input name="model" placeholder="Any model" /></label>
            <label>Year<input name="year" type="number" min="1886" max="2200" placeholder="Any year" /></label>
            <label>Condition<select name="condition" defaultValue=""><option value="">New or used</option><option value="new">New</option><option value="used">Used</option></select></label>
            <label>Price from<input name="minPrice" type="number" min="0" placeholder="No minimum" /></label>
            <label>Price to<input name="maxPrice" type="number" min="0" placeholder="No maximum" /></label>
            <label>Availability<select name="availability" defaultValue=""><option value="">Any status</option><option value="available">Available</option><option value="on_the_way">On the way</option><option value="reserved">Reserved</option><option value="rental">Rental</option><option value="sold">Sold</option></select></label>
            <button type="submit">Search inventory <ArrowUpRight size={15} /></button>
          </div>
        </form>
      </div>
    </section>

    <section className="section section-inventory"><div className="container">
      <div className="section-heading"><h2>{featured.length ? "Featured Cars" : "Available Cars"}</h2><Link className="text-link" href="/cars">View all cars <ArrowUpRight size={16} /></Link></div>
      <VehicleGrid vehicles={vehicles} emptyTitle="No vehicles listed yet" emptyText="Contact us to ask about current availability." emptyHref="/contact" emptyAction="Contact us" />
    </div></section>

    {vehicles.length ? <section className="closing-cta"><div className="container closing-cta-inner">
      <h2>Contact the dealership</h2>
      {whatsappHref ? <a className="button button-dark" href={whatsappHref} target="_blank" rel="noreferrer">Message on WhatsApp <ArrowUpRight size={16} /></a> : <Link className="button button-dark" href="/contact">Contact us <ArrowUpRight size={16} /></Link>}
    </div></section> : null}
  </>;
}
