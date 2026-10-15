import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, CarFront, Inbox, Settings2, Files, LogOut } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";

const items = [["Overview", "/admin", LayoutDashboard], ["Inventory", "/admin/inventory", CarFront], ["Inquiries", "/admin/inquiries", Inbox], ["Website settings", "/admin/settings", Settings2], ["Pages & FAQs", "/admin/content", Files]] as const;
export function AdminFrame({ active, email, children }: { active: string; email: string; children: React.ReactNode }) {
  return <div className="admin-page"><div className="admin-layout"><aside className="admin-sidebar"><Link href="/admin" className="admin-sidebar-brand"><Image src="/images/bhaggoes-logo-approved.png" alt="Bhaggoes Car Palace" width={150} height={60} /><span>Admin</span></Link><nav className="admin-nav" aria-label="Admin navigation">{items.map(([label, href, Icon]) => <Link className={active === href ? "active" : ""} href={href} key={href}><Icon size={17} />{label}</Link>)}</nav></aside><section className="admin-content"><div className="admin-topline"><h1>{active === "/admin" ? "Overview" : items.find((item) => item[1] === active)?.[0] ?? "Administration"}</h1><div className="admin-user"><span className="admin-avatar">{email.slice(0, 1).toUpperCase()}</span><span>{email}</span><form action={signOutAction}><button className="icon-link" aria-label="Sign out"><LogOut size={17} /></button></form></div></div>{children}</section></div></div>;
}
