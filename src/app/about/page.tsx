import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/data";
import { parseLocations, safeExternalUrl } from "@/lib/domain";

export const metadata: Metadata = { title: "About Us", description: "About Bhaggoes Car Palace.", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const settings = await getSettings();
  const locations = parseLocations(settings.address);
  const tiktok = safeExternalUrl(settings.social_links?.tiktok);
  return <div className="container page-wrap">
    <div className="page-intro"><p className="section-kicker">Meet the dealership</p><h1>About {settings.business_name}</h1><p>From a new arrival to the right car for you: explore the details and speak with our team directly.</p></div>
    <div className="about-layout">
      <div className="about-content">
        <Image className="about-brandmark" src={settings.logo_url || "/images/bhaggoes-logo-approved.png"} alt={settings.business_name} width={440} height={150} sizes="(max-width: 700px) 80vw, 380px" loading="eager" />
        {settings.about_text ? <p className="support-copy">{settings.about_text}</p> : <p className="support-copy">You may have seen our new arrivals on social media. Here you can take a closer look at the cars we publish, from their photos and specifications to their prices. Toyota, Mazda and Jeep are among the makes we have featured. When one catches your eye, contact our team or visit us in Suriname.</p>}
        {settings.slogan ? <p className="about-slogan">{settings.slogan}</p> : null}
        <div className="about-actions"><Link className="button button-primary" href="/cars">Browse our cars</Link><Link className="button button-outline" href="/contact">Contact us</Link></div>
        {tiktok ? <a className="text-link" href={tiktok} target="_blank" rel="noopener noreferrer">See new arrivals on TikTok</a> : null}
        {locations.length ? <p className="about-location">Visit us in {locations.length === 1 ? "Suriname" : `${locations.length} locations in Suriname`}.</p> : null}
      </div>
      <div className="about-photo"><Image src="/images/harrier-2018/front-three-quarter.webp" alt="Toyota Harrier photographed at the dealership" fill sizes="(max-width: 800px) 100vw, 45vw" /></div>
    </div>
  </div>;
}
