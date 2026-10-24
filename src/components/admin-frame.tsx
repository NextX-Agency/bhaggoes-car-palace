import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { AdminMobileNav } from "@/components/admin-mobile-nav";
import { AdminNavLink } from "@/components/admin-nav-link";
import { PendingSubmit } from "@/components/admin-pending-button";
import { adminNavItems as items } from "@/lib/admin-nav";

export function AdminFrame({ active, email, title, actions, children }: { active: string; email: string; title?: string; actions?: ReactNode; children: ReactNode }) {
  const heading = title ?? items.find((item) => item[1] === active)?.[0] ?? "Beheer";
  return <div className="admin-page">
    <AdminMobileNav active={active} email={email} />
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-sidebar-brand" aria-label="Naar het overzicht"><Image src="/images/bhaggoes-logo-approved.png" alt="Bhaggoes Car Palace" width={316} height={108} sizes="140px" loading="eager" /></Link>
        <nav className="admin-nav" aria-label="Beheernavigatie">
          {items.map(([label, href, Icon]) => <AdminNavLink active={active === href} href={href} key={href}><Icon size={18} aria-hidden="true" />{label}</AdminNavLink>)}
        </nav>
        <div className="admin-sidebar-foot">
          <Link href="/" target="_blank" className="admin-site-link"><ExternalLink size={16} aria-hidden="true" /> Bekijk website</Link>
          <div className="admin-user">
            <span className="admin-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>
            <div className="admin-user-details"><span className="admin-user-label">Ingelogd als</span><span className="admin-email" title={email}>{email}</span></div>
          </div>
          <form action={signOutAction}><PendingSubmit className="admin-signout-button" pendingLabel="Uitloggen…"><LogOut size={16} aria-hidden="true" /> Uitloggen</PendingSubmit></form>
        </div>
      </aside>
      <section className="admin-content">
        <header className="admin-topline">
          <h1>{heading}</h1>
          {actions ? <div className="admin-topline-actions">{actions}</div> : null}
        </header>
        {children}
      </section>
    </div>
  </div>;
}
