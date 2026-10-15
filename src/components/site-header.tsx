"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, Heart, Menu, X } from "lucide-react";
import type { SiteSettings } from "@/lib/domain";
import { emptyBrowserSnapshot, FAVORITES_KEY, parseStoredIds, readBrowserSnapshot, subscribeToBrowserStore } from "@/lib/browser-store";

const links = [
  ["Inventory", "/cars"], ["Financing", "/financing"], ["About", "/about"], ["FAQ", "/faq"], ["Contact", "/contact"],
] as const;

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const favoritesSnapshot = useSyncExternalStore(subscribeToBrowserStore, () => readBrowserSnapshot(FAVORITES_KEY), emptyBrowserSnapshot);
  const savedCount = parseStoredIds(favoritesSnapshot, 100).length;
  const visibleLinks = links.filter(([label]) => (label !== "Financing" || settings.financing_enabled) && (label !== "About" || settings.about_text));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenPath(null); };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="site-header">
      <div className="container nav-row">
        <Link href="/" className="brand" aria-label={`${settings.business_name} home`}>
          <Image src={settings.logo_url || "/images/bhaggoes-logo-approved.png"} alt={settings.business_name} width={316} height={108} loading="eager" sizes="180px" />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {visibleLinks.map(([label, href]) => <Link href={href} key={href} aria-current={isActive(href) ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="nav-actions">
          <Link className="icon-button" href="/favorites" aria-label={savedCount ? `Saved cars (${savedCount})` : "Saved cars"}>
            <Heart size={20} />{savedCount ? <span className="count" aria-hidden="true">{savedCount}</span> : null}
          </Link>
          <button className="icon-button menu-toggle" type="button" onClick={() => setOpenPath(open ? null : pathname)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open ? <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile navigation">
        {visibleLinks.map(([label, href]) => <Link href={href} key={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpenPath(null)}>{label}<ArrowRight size={18} aria-hidden="true" /></Link>)}
        <Link href="/compare" aria-current={isActive("/compare") ? "page" : undefined} onClick={() => setOpenPath(null)}>Compare cars<ArrowRight size={18} aria-hidden="true" /></Link>
        <Link href="/favorites" aria-current={isActive("/favorites") ? "page" : undefined} onClick={() => setOpenPath(null)}>Saved cars{savedCount ? ` (${savedCount})` : ""}<ArrowRight size={18} aria-hidden="true" /></Link>
        {settings.phone ? <div className="mobile-nav-actions"><a className="button button-outline" href={`tel:${settings.phone}`}>Call {settings.phone}</a></div> : null}
      </nav> : null}
    </header>
  );
}
