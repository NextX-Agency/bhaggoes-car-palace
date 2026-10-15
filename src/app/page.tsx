import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { HeroSearch } from "@/components/hero-search";
import { VehicleGrid } from "@/components/vehicle-grid";
import { getAvailableCount, getFeaturedVehicles, getRecentVehicles, getSettings, getVehicleFilterOptions } from "@/lib/data";
import { buildWhatsAppLink } from "@/lib/domain";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [settings, featured, recent, filterOptions, availableCount] = await Promise.all([
    getSettings(), getFeaturedVehicles(6), getRecentVehicles(6), getVehicleFilterOptions(), getAvailableCount(),
  ]);
  const vehicles = featured.length >= 3 ? featured : recent;
  const whatsappHref = buildWhatsAppLink(settings.whatsapp, `Hello, I have a question about a car at ${settings.business_name}.`);
  const hours = Object.entries(settings.business_hours ?? {});
  const hasVisitDetails = Boolean(settings.address || settings.phone || settings.email || hours.length);
  const makes = filterOptions.makes.filter((make) => filterOptions.makeCounts[make]);

  return <>
    <section className="hero" aria-labelledby="hero-title">
      <Image className="hero-photo" src="/images/hero-suv.webp" alt="" fill loading="eager" fetchPriority="high" sizes="100vw" />
      <div className="hero-shade" />
      <div className="container hero-content">
        <h1 id="hero-title">{settings.homepage_title}</h1>
        {settings.slogan ? <p className="hero-slogan">{settings.slogan}</p> : null}
        {settings.homepage_subtitle ? <p className="hero-copy">{settings.homepage_subtitle}</p> : null}
        {availableCount ? <p className="hero-stock"><strong>{availableCount}</strong> {availableCount === 1 ? "car" : "cars"} available</p> : null}
      </div>
    </section>

    <div className="container hero-search-dock"><HeroSearch makes={filterOptions.makes} /></div>

    <section className="section home-inventory" aria-labelledby="home-cars">
      <div className="container">
        <div className="section-heading">
          <h2 id="home-cars">{vehicles === featured ? "Featured cars" : "Latest cars"}</h2>
          {vehicles.length ? <Link className="text-link" href="/cars">View all cars <ArrowRight size={16} /></Link> : null}
        </div>
        {vehicles.length
          ? <VehicleGrid vehicles={vehicles} />
          : <EmptyState title="No cars are listed right now" href="/contact" action="Ask about availability" />}
      </div>
    </section>

    {makes.length > 1 ? <section className="section-tight" aria-labelledby="home-makes">
      <div className="container">
        <div className="section-heading"><h2 id="home-makes">Browse by make</h2></div>
        <nav className="make-links" aria-label="Browse by make">
          {makes.map((make) => <Link key={make} href={`/cars?make=${encodeURIComponent(make)}`}>{make}<span>{filterOptions.makeCounts[make]}</span></Link>)}
        </nav>
      </div>
    </section> : null}

    {hasVisitDetails || whatsappHref ? <section className="section section-muted" aria-labelledby="home-visit">
      <div className="container visit">
        <div>
          <h2 id="home-visit">Visit {settings.business_name}</h2>
          <div className="visit-actions">
            {whatsappHref ? <a className="button button-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">Message on WhatsApp</a> : null}
            {settings.phone ? <a className="button button-outline" href={`tel:${settings.phone}`}><Phone size={17} aria-hidden="true" /> Call us</a> : <Link className="button button-outline" href="/contact">Send a message</Link>}
          </div>
        </div>
        <div className="visit-details">
          {settings.address ? <div><h3>Address</h3><p>{settings.address}</p></div> : null}
          {settings.phone ? <div><h3>Phone</h3><a href={`tel:${settings.phone}`}>{settings.phone}</a></div> : null}
          {settings.email ? <div><h3>Email</h3><a href={`mailto:${settings.email}`}>{settings.email}</a></div> : null}
          {hours.length ? <div><h3>Opening hours</h3><div className="hours">{hours.map(([day, time]) => <div key={day}><span>{day}</span><span>{time}</span></div>)}</div></div> : null}
        </div>
      </div>
    </section> : null}
  </>;
}
