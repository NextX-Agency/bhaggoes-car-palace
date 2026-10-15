"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { adminNavItems } from "@/lib/admin-nav";

// Keep in sync with the 860px breakpoint in admin.css where the sidebar takes over.
const SIDEBAR_QUERY = "(min-width: 861px)";

export function AdminMobileNav({ active, email }: { active: string; email: string }) {
  const pathname = usePathname();
  // Tied to the page it was opened on, so choosing a section (or going back) always closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const sidebar = window.matchMedia(SIDEBAR_QUERY);
    const close = () => { if (sidebar.matches) setOpenPath(null); };
    sidebar.addEventListener("change", close);
    return () => sidebar.removeEventListener("change", close);
  }, [open]);

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <div className="admin-mobile-bar">
      <Link href="/admin" className="admin-mobile-brand" aria-label="Dashboard home"><Image src="/images/bhaggoes-logo-approved.png" alt="Bhaggoes Car Palace" width={316} height={108} sizes="110px" loading="eager" /></Link>
      <Dialog.Trigger asChild>
        <button className="admin-menu-button" type="button" aria-label="Open dashboard menu"><Menu size={20} aria-hidden="true" /> Menu</button>
      </Dialog.Trigger>
    </div>
    <Dialog.Portal>
      <Dialog.Overlay className="filter-drawer-overlay" />
      <Dialog.Content className="filter-drawer-content admin-drawer" aria-describedby={undefined} onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}>
        <header className="filter-drawer-header">
          <Dialog.Title>Dashboard</Dialog.Title>
          <Dialog.Close asChild><button className="filter-drawer-close" type="button" aria-label="Close dashboard menu"><X size={20} /></button></Dialog.Close>
        </header>
        <nav className="admin-drawer-nav" aria-label="Admin navigation">
          {adminNavItems.map(([label, href, Icon]) => <Link className={active === href ? "active" : ""} aria-current={active === href ? "page" : undefined} href={href} key={href}><Icon size={18} aria-hidden="true" />{label}</Link>)}
        </nav>
        <footer className="admin-drawer-foot">
          <Link href="/" target="_blank" className="admin-site-link"><ExternalLink size={16} aria-hidden="true" /> View website</Link>
          <p className="admin-email" title={email}>{email}</p>
          <form action={signOutAction}><button className="button button-outline button-block" type="submit"><LogOut size={17} aria-hidden="true" /> Sign out</button></form>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
