import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { HeroSearch } from "@/components/hero-search";
import { VehicleGrid } from "@/components/vehicle-grid";
import { BrandLogo } from "@/components/brand-logo";
import { getFeaturedVehicles, getRecentVehicles, getSettings, getVehicleFilterOptions } from "@/lib/data";
import { buildWhatsAppLink, parseLocations } from "@/lib/domain";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const imageProps = { alt: "Illustrative Toyota Hilux scene inspired by a Surinamese dealership forecourt", sizes: "100vw", loading: "eager" as const, fetchPriority: "high" as const };
  const { props: { srcSet: desktopHero } } = getImageProps({ ...imageProps, src: "/images/hero-hilux-suriname-illustrative.webp", width: 1672, height: 941 });
  const { props: { srcSet: mobileHero, ...heroImgProps } } = getImageProps({ ...imageProps, src: "/images/hero-mobile-illustrative.webp", width: 1122, height: 1402 });
  const [settings, featured, recent, filterOptions] = await Promise.all([
    getSettings(), getFeaturedVehicles(6), getRecentVehicles(6), getVehicleFilterOptions(),
  ]);
  const vehicles = featured.length >= 3 ? featured : recent;
  const whatsappHref = buildWhatsAppLink(settings.whatsapp, `Hello, I have a question about a car at ${settings.business_name}.`);
  const hours = Object.entries(settings.business_hours ?? {});
  const locations = parseLocations(settings.address);
  const hasVisitDetails = Boolean(settings.address || settings.phone || settings.email || hours.length);
  const makes = filterOptions.makes.filter((make) => filterOptions.makeCounts[make]);

  return <>
    <section className="hero home-hero" aria-labelledby="hero-title">
      <div className="hero-visual"><picture><source media="(min-width: 641px)" srcSet={desktopHero} /><img {...heroImgProps} alt={imageProps.alt} srcSet={mobileHero} className="hero-photo" /></picture></div>
      <div className="hero-shade" />
      <div className="container hero-content">
        <p className="hero-kicker">Welcome to</p>
        <h1 id="hero-title">{settings.business_name}</h1>
        {settings.homepage_title !== "Browse Our Cars" ? <p className="hero-heading-tagline">{settings.homepage_title}</p> : null}
        {settings.slogan ? <p className="hero-slogan">{settings.slogan}</p> : null}
        <p className="hero-copy">{settings.homepage_subtitle || "See the cars we have listed, then ask our team about the one you want to visit."}</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/cars">Explore the cars <ArrowRight size={18} aria-hidden="true" /></Link>
          {whatsappHref ? <a className="button button-hero-outline" href={whatsappHref} target="_blank" rel="noreferrer"><SocialIcon platform="whatsapp" /> Ask us on WhatsApp</a> : null}
        </div>
      </div>
    </section>

    <div className="container hero-search-dock"><HeroSearch makes={filterOptions.makes} /></div>

    <section className="section home-inventory" aria-labelledby="home-cars">
      <div className="container">
        <div className="section-heading">
          <div><p className="section-kicker">Explore our inventory</p><h2 id="home-cars">{vehicles === featured ? "Featured cars" : "Latest cars"}</h2></div>
          {vehicles.length ? <Link className="button button-primary button-lg section-heading-cta" href="/cars">View all cars <ArrowRight size={20} aria-hidden="true" /></Link> : null}
        </div>
        {vehicles.length
          ? <VehicleGrid vehicles={vehicles} defaultCurrency={settings.currency} />
          : <EmptyState title="No cars are listed right now" href="/contact" action="Ask about availability" />}
        {vehicles.length ? <div className="home-more"><Link className="button button-outline button-lg" href="/cars">View all cars <ArrowRight size={20} aria-hidden="true" /></Link></div> : null}
      </div>
    </section>

    {makes.length > 1 ? <section className="section-tight" aria-labelledby="home-makes">
      <div className="container">
        <div className="section-heading"><h2 id="home-makes">Browse by make</h2></div>
        <nav className="make-links" aria-label="Browse by make">
          {makes.map((make) => <Link key={make} href={`/cars?make=${encodeURIComponent(make)}`}><BrandLogo make={make} />{make}</Link>)}
        </nav>
      </div>
    </section> : null}

    {hasVisitDetails || whatsappHref ? <section className="section section-muted home-visit" aria-labelledby="home-visit">
      <div className="container visit">
        <div>
          <p className="section-kicker">Here to help</p>
          <h2 id="home-visit">Visit {settings.business_name}</h2>
          <p className="visit-intro">Have a car in mind? Ask about availability or come see us in person.</p>
          <div className="visit-actions">
            {whatsappHref ? <a className="button button-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer"><SocialIcon platform="whatsapp" /> Message on WhatsApp</a> : null}
            {settings.phone ? <a className="button button-outline" href={`tel:${settings.phone}`}><Phone size={17} aria-hidden="true" /> Call us</a> : <Link className="button button-outline" href="/contact">Send a message</Link>}
          </div>
        </div>
        <div className="visit-details">
          {locations.length ? <div><h3>{locations.length === 1 ? "Location" : "Locations"}</h3>{locations.map((location) => <p key={location.address}>{location.name ? <><strong>{location.name}</strong><br /></> : null}<a href={location.mapUrl} target="_blank" rel="noreferrer">{location.address}</a></p>)}</div> : null}
          {settings.phone ? <div><h3>Phone</h3><a href={`tel:${settings.phone}`}>{settings.phone}</a></div> : null}
          {settings.email ? <div><h3>Email</h3><a href={`mailto:${settings.email}`}>{settings.email}</a></div> : null}
          {hours.length ? <div><h3>Opening hours</h3><div className="hours">{hours.map(([day, time]) => <div key={day}><span>{day}</span><span>{time}</span></div>)}</div></div> : null}
        </div>
      </div>
    </section> : null}
  </>;
}
