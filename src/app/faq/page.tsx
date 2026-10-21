import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { getFaqs } from "@/lib/data";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Answers about browsing, visiting and buying a car at Bhaggoes Car Palace.", alternates: { canonical: "/faq" } };
export default async function FAQPage() {
  const publishedFaqs = await getFaqs();

  return <div className="container page-wrap faq-page">
    <header className="faq-heading"><p className="section-kicker">Good to know</p><h1>Questions before you visit?</h1><p>Start here. For a specific car, speak directly with the Bhaggoes team.</p></header>
    <div className="faq-layout">
      <section className="faq-list" aria-label="Frequently asked questions">
        {publishedFaqs.length ? publishedFaqs.map((item) => <details className="faq-item" key={item.id}><summary><span>{item.question}</span><Plus size={20} aria-hidden="true" /></summary><div className="faq-answer">{item.answer}</div></details>) : <div className="faq-empty"><h2>Questions? We’re here to help.</h2><p>Ask our team directly about the car or buying option you have in mind.</p><Link href="/contact">Contact the team <ArrowRight size={18} aria-hidden="true" /></Link></div>}
      </section>
      <aside className="faq-aside"><p>Need a hand?</p><h2>Ask us about the car you have in mind.</h2><Link href="/contact">Contact the team <ArrowRight size={18} aria-hidden="true" /></Link></aside>
    </div>
  </div>;
}
