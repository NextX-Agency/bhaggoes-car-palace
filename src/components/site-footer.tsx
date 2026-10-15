import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/domain";
import { buildWhatsAppLink, safeExternalUrl } from "@/lib/domain";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const socialPlatforms = [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["tiktok", "TikTok"]] as const;
  const socialLinks = socialPlatforms.flatMap(([platform, label]) => {
    const url = safeExternalUrl(settings.social_links?.[platform]);
    return url ? [{ label, url }] : [];
  });
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, I have a question.`);
  const hasContact = Boolean(settings.phone || settings.email || settings.address || whatsapp);

  return <footer className="site-footer">
    <div className="container footer-main">
      <div className="footer-brand">
        <Link href="/" aria-label={`${settings.business_name} home`}><Image src={settings.logo_url || "/images/bhaggoes-logo-approved.png"} alt={settings.business_name} width={316} height={108} sizes="170px" /></Link>
      </div>
      <nav className="footer-col" aria-label="Cars">
        <p className="footer-label">Cars</p>
        <Link href="/cars">Inventory</Link>
        <Link href="/favorites">Saved cars</Link>
        <Link href="/compare">Compare cars</Link>
        {settings.financing_enabled ? <Link href="/financing">Financing</Link> : null}
      </nav>
      <nav className="footer-col" aria-label="Dealership">
        <p className="footer-label">Dealership</p>
        <Link href="/about">About</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <div className="footer-col">
        <p className="footer-label">Contact</p>
        {settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={15} aria-hidden="true" />{settings.phone}</a> : null}
        {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a> : null}
        {settings.email ? <a href={`mailto:${settings.email}`}><Mail size={15} aria-hidden="true" />{settings.email}</a> : null}
        {settings.address ? <p><MapPin size={15} aria-hidden="true" />{settings.address}</p> : null}
        {!hasContact ? <Link href="/contact">Send a message</Link> : null}
        {socialLinks.map(({ label, url }) => <a href={url} key={label} target="_blank" rel="noopener noreferrer">{label}</a>)}
      </div>
    </div>
    <div className="container footer-bottom">
      <span>© {new Date().getFullYear()} {settings.business_name}</span>
      <nav aria-label="Legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/admin/login">Staff sign in</Link></nav>
    </div>
  </footer>;
}
