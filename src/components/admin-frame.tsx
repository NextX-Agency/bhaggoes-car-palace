import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CarFront, ExternalLink, Files, Inbox, LayoutDashboard, LogOut, Settings2 } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";

const items = [["Overview", "/admin", LayoutDashboard], ["Inventory", "/admin/inventory", CarFront], ["Inquiries", "/admin/inquiries", Inbox], ["Website settings", "/admin/settings", Settings2], ["Pages & FAQs", "/admin/content", Files]] as const;

export function AdminFrame({ active, email, title, description, actions, children }: { active: string; email: string; title?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const heading = title ?? items.find((item) => item[1] === active)?.[0] ?? "Administration";
  return <div className="admin-page">
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-sidebar-brand" aria-label="Dashboard home"><Image src="/images/bhaggoes-logo-approved.png" alt="Bhaggoes Car Palace" width={316} height={108} sizes="140px" loading="eager" /></Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          {items.map(([label, href, Icon]) => <Link className={active === href ? "active" : ""} aria-current={active === href ? "page" : undefined} href={href} key={href}><Icon size={18} aria-hidden="true" />{label}</Link>)}
        </nav>
        <div className="admin-sidebar-foot">
          <Link href="/" target="_blank" className="admin-site-link"><ExternalLink size={16} aria-hidden="true" /> View website</Link>
          <div className="admin-user">
            <span className="admin-avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>
            <span className="admin-email" title={email}>{email}</span>
            <form action={signOutAction}><button className="admin-icon-button" aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></form>
          </div>
        </div>
      </aside>
      <section className="admin-content">
        <header className="admin-topline">
          <div><h1>{heading}</h1>{description ? <p>{description}</p> : null}</div>
          {actions ? <div className="admin-topline-actions">{actions}</div> : null}
        </header>
        {children}
      </section>
    </div>
  </div>;
}
