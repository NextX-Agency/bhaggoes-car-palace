import type { Metadata } from "next";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "About Us", description: "About Bhaggoes Car Palace.", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const settings = await getSettings();
  return <div className="container page-wrap">
    <div className="page-intro"><h1>About {settings.business_name}</h1></div>
    <div className="about-content">
      {settings.slogan ? <p className="about-slogan">{settings.slogan}</p> : null}
      {settings.about_text ? <p className="support-copy">{settings.about_text}</p> : null}
    </div>
  </div>;
}
