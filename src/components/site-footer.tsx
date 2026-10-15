import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/domain";
import { safeExternalUrl } from "@/lib/domain";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const socialPlatforms = [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["tiktok", "TikTok"]] as const;
  const socialLinks = socialPlatforms.flatMap(([platform, label]) => {
    const url = safeExternalUrl(settings.social_links?.[platform]);
    return url ? [{ label, url }] : [];
  });
  return <footer className="site-footer">
    <div className="container footer-main">
      <div className="footer-brand"><Image className={settings.logo_url ? "footer-logo-custom" : "footer-logo-default"} src={settings.logo_url || "/images/bhaggoes-logo-clean.png"} alt={settings.business_name} width={228} height={91} /></div>
      <div><p className="footer-label">Explore</p><Link href="/cars">Browse inventory</Link><Link href="/about">About the dealership</Link>{settings.financing_enabled ? <Link href="/financing">Financing</Link> : null}<Link href="/faq">Frequently asked questions</Link></div>
      <div><p className="footer-label">Get in touch</p>{settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={15} />{settings.phone}</a> : null}{settings.address ? <span><MapPin size={15} />{settings.address}</span> : null}{settings.email ? <a href={`mailto:${settings.email}`}>{settings.email}<ArrowUpRight size={14} /></a> : null}<Link href="/contact">Send us a message <ArrowUpRight size={14} /></Link>{socialLinks.length ? <div className="footer-socials" aria-label="Social media">{socialLinks.map(({ label, url }) => <a href={url} key={label} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={12} /></a>)}</div> : null}</div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} {settings.business_name}</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/admin/login">Staff sign in</Link></div></div>
  </footer>;
}
