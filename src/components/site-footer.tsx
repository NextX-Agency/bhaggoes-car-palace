import Image from "next/image";
import Link from "next/link";
import type { SiteSettings } from "@/lib/domain";
import { buildWhatsAppLink, parseLocations, safeExternalUrl } from "@/lib/domain";
import { compareCarsEnabled } from "@/lib/features";
import { SocialIcon, type SocialPlatform } from "@/components/social-icon";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const copyrightYear = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Paramaribo" }).format(new Date());
  const socialPlatforms = [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["tiktok", "TikTok"]] as const;
  const socialLinks = socialPlatforms.flatMap(([platform, label]) => {
    const url = safeExternalUrl(settings.social_links?.[platform]);
    return url ? [{ platform: platform as SocialPlatform, label, url }] : [];
  });
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, I have a question.`);
  const hasContact = Boolean(settings.phone || settings.email || settings.address || whatsapp || socialLinks.length);

  return <footer className="site-footer">
    <div className="container footer-main">
      <div className="footer-brand">
        <Link href="/" aria-label={`${settings.business_name} home`}><Image src={settings.logo_url || "/images/bhaggoes-logo-approved.png"} alt={settings.business_name} width={316} height={108} loading="eager" unoptimized={!settings.logo_url} sizes="220px" /></Link>
      </div>
      <nav className="footer-col" aria-label="Cars">
        <p className="footer-label">Cars</p>
        <Link href="/cars">Inventory</Link>
        <Link href="/favorites">Saved cars</Link>
        {compareCarsEnabled ? <Link href="/compare">Compare cars</Link> : null}
        {settings.financing_enabled ? <Link href="/financing">Financing</Link> : null}
      </nav>
      <nav className="footer-col" aria-label="Dealership">
        <p className="footer-label">Dealership</p>
        <Link href="/about">About</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      {hasContact ? <div className="footer-col">
        <p className="footer-label">Contact</p>
        {whatsapp ? <a className="footer-social-link" href={whatsapp} target="_blank" rel="noreferrer"><SocialIcon platform="whatsapp" />WhatsApp</a> : null}
        {settings.phone ? <a href={`tel:${settings.phone}`}>{settings.phone}</a> : null}
        {settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : null}
        {parseLocations(settings.address).map((location) => <a key={location.address} href={location.mapUrl} target="_blank" rel="noreferrer">{location.name ? `${location.name} · ${location.address}` : location.address}</a>)}
        {socialLinks.map(({ platform, label, url }) => <a className="footer-social-link" href={url} key={label} target="_blank" rel="noopener noreferrer"><SocialIcon platform={platform} />{label}</a>)}
      </div> : null}
    </div>
    <div className="container footer-bottom">
      <span>© {copyrightYear} {settings.business_name}</span>
      <nav aria-label="Legal"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
    </div>
  </footer>;
}
