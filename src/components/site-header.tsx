"use client";

import * as Dialog from "@radix-ui/react-dialog";
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

// Keep in sync with the 960px breakpoint in globals.css where the desktop navigation takes over.
const DESKTOP_QUERY = "(min-width: 961px)";

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so any route change (link, back button, redirect) closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);
  const favoritesSnapshot = useSyncExternalStore(subscribeToBrowserStore, () => readBrowserSnapshot(FAVORITES_KEY), emptyBrowserSnapshot);
  const savedCount = parseStoredIds(favoritesSnapshot, 100).length;
  const visibleLinks = links.filter(([label]) => (label !== "Financing" || settings.financing_enabled) && (label !== "About" || settings.about_text));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const close = () => { if (desktop.matches) setOpenPath(null); };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const brand = <Link href="/" className="brand" aria-label={`${settings.business_name} home`}>
    <Image src={settings.logo_url || "/images/bhaggoes-logo-approved.png"} alt={settings.business_name} width={316} height={108} loading="eager" sizes="180px" />
  </Link>;
  const favoritesLink = <Link className="icon-button" href="/favorites" aria-label={savedCount ? `Saved cars (${savedCount})` : "Saved cars"}>
    <Heart size={20} />{savedCount ? <span className="count" aria-hidden="true">{savedCount}</span> : null}
  </Link>;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header className="site-header">
        <div className="container nav-row">
          {brand}
          <nav className="desktop-nav" aria-label="Main navigation">
            {visibleLinks.map(([label, href]) => <Link href={href} key={href} aria-current={isActive(href) ? "page" : undefined}>{label}</Link>)}
          </nav>
          <div className="nav-actions">
            {favoritesLink}
            <Dialog.Trigger asChild>
              <button className="icon-button menu-toggle" type="button" aria-label="Open menu"><Menu size={22} /></button>
            </Dialog.Trigger>
          </div>
        </div>
      </header>
      <Dialog.Portal>
        {/* The overlay carries Radix's scroll lock, which also stops touch scrolling of the page on iOS Safari. */}
        <Dialog.Overlay className="mobile-menu-overlay" />
        <Dialog.Content className="mobile-menu" aria-describedby={undefined} onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}>
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="mobile-menu-bar">
            <div className="container nav-row">
              {brand}
              <div className="nav-actions">
                {favoritesLink}
                <Dialog.Close asChild><button className="icon-button" type="button" aria-label="Close menu"><X size={22} /></button></Dialog.Close>
              </div>
            </div>
          </div>
          <nav className="mobile-nav container" aria-label="Mobile navigation">
            {visibleLinks.map(([label, href]) => <Link href={href} key={href} aria-current={isActive(href) ? "page" : undefined}>{label}<ArrowRight size={18} aria-hidden="true" /></Link>)}
            <Link href="/compare" aria-current={isActive("/compare") ? "page" : undefined}>Compare cars<ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/favorites" aria-current={isActive("/favorites") ? "page" : undefined}>Saved cars{savedCount ? ` (${savedCount})` : ""}<ArrowRight size={18} aria-hidden="true" /></Link>
            {settings.phone ? <div className="mobile-nav-actions"><a className="button button-outline" href={`tel:${settings.phone}`}>Call {settings.phone}</a></div> : null}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
