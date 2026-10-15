import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/domain";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return <footer className="site-footer">
    <div className="container footer-main">
      <div className="footer-brand"><Image src={settings.logo_url || "/images/bhaggoes-logo-source.png"} alt={settings.business_name} width={228} height={91} unoptimized /><p>Good cars. Straightforward prices. Find the right fit for your next drive.</p></div>
      <div><p className="footer-label">Explore</p><Link href="/cars">Browse inventory</Link><Link href="/about">About the dealership</Link><Link href="/financing">Financing</Link><Link href="/faq">Frequently asked questions</Link></div>
      <div><p className="footer-label">Get in touch</p>{settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={15} />{settings.phone}</a> : <span>Phone details coming soon</span>}{settings.address ? <span><MapPin size={15} />{settings.address}</span> : <span>Visit details coming soon</span>}{settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}<ArrowUpRight size={14} /></a> : null}</div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} {settings.business_name}</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/admin/login">Staff sign in</Link></div><span>{settings.slogan}</span></div>
  </footer>;
}
