import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/data";
import { parseLocations } from "@/lib/domain";

export const metadata: Metadata = {
  title: "About Bhaggoes Car Palace",
  description: "Get to know Bhaggoes Car Palace and see how to browse cars or visit us in Suriname.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const settings = await getSettings();
  const locations = parseLocations(settings.address);

  return <div className="container page-wrap about-page">
    <section className="about-story" aria-labelledby="about-title">
      <div className="about-story-copy">
        <p className="about-eyebrow">Bhaggoes Car Palace · Suriname</p>
        <h1 id="about-title">A closer look at Bhaggoes.</h1>
        {settings.slogan ? <p className="about-statement">{settings.slogan}</p> : null}
        <p className="about-lead">{settings.about_text || "Browse the photos, prices and details of the cars we publish. When you find one you like, speak with our team directly and come see it for yourself."}</p>
        <div className="about-links">
          <Link className="button button-primary" href="/cars">See the cars</Link>
          <Link className="text-link" href="/contact">Get in touch</Link>
        </div>
      </div>
      <div className="about-story-image">
        <Image src="/images/harrier-2018/front-three-quarter.webp" alt="Toyota Harrier photographed among cars in Suriname" fill sizes="(max-width: 800px) 100vw, 48vw" />
      </div>
    </section>
    {locations.length ? <p className="about-visit">Visit us in {locations.length === 1 ? "Suriname" : `${locations.length} locations in Suriname`}. <Link href="/contact">Find our locations</Link></p> : null}
  </div>;
}
