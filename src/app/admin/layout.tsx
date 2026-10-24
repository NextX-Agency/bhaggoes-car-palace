import type { Metadata } from "next";
export const metadata: Metadata = { title: "Beheer", robots: { index: false, follow: false } };
// Staff pages depend on the signed-in user and must never be prerendered or cached (the public site is ISR).
export const dynamic = "force-dynamic";
// The dashboard is Dutch while the site root declares English, so this wrapper tells browsers and screen readers which language the staff pages use.
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <div lang="nl">{children}</div>; }
