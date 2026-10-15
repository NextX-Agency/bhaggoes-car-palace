"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, Menu, X } from "lucide-react";
import type { SiteSettings } from "@/lib/domain";

const links = [
  ["Inventory", "/cars"], ["About", "/about"], ["Financing", "/financing"], ["FAQs", "/faq"], ["Contact", "/contact"],
] as const;

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="topline"><div className="container topline-inner"><span>{settings.slogan}</span><span className="topline-note">A better way to find your next car</span></div></div>
      <div className="container nav-row">
        <Link href="/" className="brand" aria-label={`${settings.business_name} home`} onClick={() => setOpen(false)}>
          <Image src={settings.logo_url || "/images/bhaggoes-logo-source.png"} alt={settings.business_name} width={260} height={104} priority unoptimized />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="nav-actions">
          <Link className="icon-link" href="/favorites" aria-label="Saved cars"><Heart size={19} /><span className="nav-action-label">Saved</span></Link>
          <Link href="/cars" className="button button-dark nav-cta">Find a car <span aria-hidden="true">↗</span></Link>
          <button className="menu-toggle" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open ? <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}<span aria-hidden="true">↗</span></Link>)}
        <Link href="/compare" onClick={() => setOpen(false)}>Compare cars<span aria-hidden="true">↗</span></Link>
      </nav> : null}
    </header>
  );
}
