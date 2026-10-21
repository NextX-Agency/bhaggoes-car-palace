import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { HeroSearch } from "@/components/hero-search";
import { VehicleGrid } from "@/components/vehicle-grid";
import { BrandLogo } from "@/components/brand-logo";
import { getAvailableCount, getFeaturedVehicles, getRecentVehicles, getSettings, getVehicleFilterOptions } from "@/lib/data";
import { buildWhatsAppLink, coverImage, parseLocations } from "@/lib/domain";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [settings, featured, recent, filterOptions, availableCount] = await Promise.all([
    getSettings(), getFeaturedVehicles(6), getRecentVehicles(6), getVehicleFilterOptions(), getAvailableCount(),
  ]);
  const vehicles = featured.length >= 3 ? featured : recent;
  const whatsappHref = buildWhatsAppLink(settings.whatsapp, `Hello, I have a question about a car at ${settings.business_name}.`);
  const hours = Object.entries(settings.business_hours ?? {});
  const locations = parseLocations(settings.address);
  const hasVisitDetails = Boolean(settings.address || settings.phone || settings.email || hours.length);
  const makes = filterOptions.makes.filter((make) => filterOptions.makeCounts[make]);
  const heroVehicle = vehicles.find((vehicle) => coverImage(vehicle.images)?.url);
  const heroImage = heroVehicle ? coverImage(heroVehicle.images) : null;

  return <>
    <section className="hero home-hero" aria-labelledby="hero-title">
      <div className="hero-visual"><Image className="hero-photo" src={heroImage?.url || "/images/harrier-2018/front-three-quarter.webp"} alt={heroImage?.alt_text || "Toyota Harrier photographed at Bhaggoes Car Palace"} fill preload sizes="(max-width: 960px) 100vw, 58vw" /></div>
      <div className="container hero-content">
        <p className="hero-kicker">Welcome to {settings.business_name}</p>
        <Image className="hero-brandmark" src={settings.logo_url || "/images/bhaggoes-logo-approved.png"} alt={settings.business_name} width={500} height={171} sizes="(max-width: 960px) 72vw, 430px" loading="eager" />
        <h1 id="hero-title">{settings.homepage_title === "Browse Our Cars" ? <>The car you want.<br /><span>A price hard to beat.</span></> : settings.homepage_title}</h1>
        <p className="hero-copy">{settings.homepage_subtitle || "Explore the cars we have available, see the details, and speak directly with our team in Suriname."}</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/cars">See available cars <ArrowRight size={18} aria-hidden="true" /></Link>
          {whatsappHref ? <a className="button button-hero-outline" href={whatsappHref} target="_blank" rel="noreferrer"><SocialIcon platform="whatsapp" /> Talk to our team</a> : null}
        </div>
        {availableCount ? <p className="hero-stock"><strong>{availableCount}</strong> {availableCount === 1 ? "car" : "cars"} available now</p> : null}
      </div>
    </section>

    <div className="container hero-search-dock"><HeroSearch makes={filterOptions.makes} /></div>

    <section className="shopping-steps" aria-label="How to shop with Bhaggoes">
      <div className="container shopping-steps-grid">
        <div><span>01 / Explore</span><p>Browse the current selection.</p></div>
        <div><span>02 / Discover</span><p>See the details behind each car.</p></div>
        <div><span>03 / Connect</span><p>Ask us directly or come by.</p></div>
      </div>
    </section>

    <section className="section home-inventory" aria-labelledby="home-cars">
      <div className="container">
        <div className="section-heading">
          <div><p className="section-kicker">The Bhaggoes collection</p><h2 id="home-cars">{vehicles === featured ? "Featured cars" : "Latest cars"}</h2></div>
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
          {makes.map((make) => <Link key={make} href={`/cars?make=${encodeURIComponent(make)}`}><BrandLogo make={make} />{make}<span>{filterOptions.makeCounts[make]}</span></Link>)}
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
