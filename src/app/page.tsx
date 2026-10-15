import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, ShieldCheck, SlidersHorizontal, WalletCards } from "lucide-react";
import { VehicleGrid } from "@/components/vehicle-grid";
import { getFeaturedVehicles, getSettings } from "@/lib/data";

export default async function HomePage() {
  const [settings, featured] = await Promise.all([getSettings(), getFeaturedVehicles(3)]);
  return <>
    <section className="hero">
      <Image className="hero-photo" src="/images/hero-suv.webp" alt="A modern SUV on a quiet road" fill priority sizes="100vw" />
      <div className="hero-shade" />
      <div className="container hero-content"><p className="hero-kicker"><span className="kicker-dot" />Quality cars, honest prices</p><h1>{settings.homepage_title}</h1><p className="hero-copy">{settings.homepage_subtitle}</p><div className="hero-buttons"><Link className="button button-accent" href="/cars">Explore our cars <ArrowUpRight size={17} /></Link><Link className="button button-glass" href="/contact">Talk to our team</Link></div><p className="hero-slogan">{settings.slogan}</p></div>
      <a className="hero-scroll" href="#inventory"><ArrowDown size={15} />Scroll to explore</a>
      <div className="hero-index"><span>01</span><i /><span>BHAGGOES CAR PALACE</span></div>
    </section>

    <section className="search-band"><div className="container search-band-inner"><div><p className="eyebrow">Find your next car</p><h2>What are you looking for?</h2></div><form action="/cars" className="hero-search"><label htmlFor="home-search" className="sr-only">Search by make or model</label><span aria-hidden="true">⌕</span><input id="home-search" name="search" placeholder="Try a make or model" /><button type="submit">Search inventory <ArrowUpRight size={15} /></button></form></div></section>

    <section id="inventory" className="section section-inventory"><div className="container"><div className="section-heading"><div><p className="eyebrow">The latest arrivals</p><h2>Cars to consider</h2><p className="section-subtitle">A few handpicked options from our current inventory.</p></div><Link className="text-link" href="/cars">View all cars <ArrowUpRight size={16} /></Link></div><VehicleGrid vehicles={featured} emptyTitle="Our next arrivals are on the way" emptyText="Check back soon or contact the team to ask what is available." /></div></section>

    <section className="promise-section"><div className="container promise-grid"><div className="promise-heading"><p className="eyebrow">The Bhaggoes approach</p><h2>Buying a car should feel straightforward.</h2><Link className="text-link" href="/about">Get to know us <ArrowUpRight size={16} /></Link></div><div className="promise-card"><span className="promise-icon"><Check size={20} /></span><p className="eyebrow">01 · Start with the right car</p><h3>Clear details</h3><p>See each car&apos;s specifications, price, and availability in one place.</p></div><div className="promise-card"><span className="promise-icon"><SlidersHorizontal size={20} /></span><p className="eyebrow">02 · Compare your options</p><h3>Make it your choice</h3><p>Save a favorite or compare up to three listings as you browse.</p></div><div className="promise-card"><span className="promise-icon"><ShieldCheck size={20} /></span><p className="eyebrow">03 · Ask the team</p><h3>Get a clear answer</h3><p>Send a question about a specific car and the team can follow up.</p></div><div className="promise-card promise-card-last"><span className="promise-icon"><WalletCards size={20} /></span><p className="eyebrow">04 · Plan your budget</p><h3>Estimate with care</h3><p>Use a simple payment estimate to explore possible monthly costs.</p></div></div></section>

    {settings.financing_enabled ? <section className="finance-cta"><div className="container finance-cta-inner"><div><p className="eyebrow">A simple next step</p><h2>Questions about financing?</h2><p>{settings.financing_notes || "Contact our team to discuss your options."}</p></div><Link className="button button-light" href="/financing">Explore financing <ArrowUpRight size={16} /></Link></div></section> : null}
    <section className="closing-cta"><div className="container closing-cta-inner"><div><p className="eyebrow">Your next drive starts here</p><h2>Found something you like?</h2><p>Browse the current inventory or send the team a question about a car.</p></div><div className="closing-buttons"><Link className="button button-dark" href="/cars">Browse all cars <ArrowUpRight size={16} /></Link><Link className="text-link" href="/contact">Contact the dealership</Link></div></div></section>
  </>;
}
