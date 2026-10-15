import type { Metadata } from "next";
import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "About Us", description: "Learn about Bhaggoes Car Palace and its approach to finding your next car.", alternates: { canonical: "/about" } };
export default async function AboutPage() {
  const settings = await getSettings();
  return <div className="container page-wrap"><div className="page-intro"><p className="eyebrow">About {settings.business_name}</p><h1>Cars, choice, and a clearer way forward.</h1><p>{settings.slogan}</p></div><div className="support-grid"><div><p className="support-copy">{settings.about_text || "Bhaggoes Car Palace is preparing its story for this page. In the meantime, explore the current inventory or get in touch with a question about a car."}</p><div className="promise-card" style={{ marginTop: 24 }}><span className="promise-icon"><Check size={19} /></span><h3>Information you can compare</h3><p>Every published listing is managed by the dealership team and can be compared side by side.</p></div></div><aside className="support-card"><p className="eyebrow">Come see what&apos;s available</p><h2>Explore our inventory</h2><p className="support-copy">Browse current listings, save cars for later, and ask the team about a vehicle that interests you.</p><Link className="button button-dark" href="/cars">Browse cars <ArrowUpRight size={16} /></Link></aside></div></div>;
}
