import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { getFaqs, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Answers about browsing, visiting and buying a car at Bhaggoes Car Palace.", alternates: { canonical: "/faq" } };
export default async function FAQPage() {
  const [publishedFaqs, settings] = await Promise.all([getFaqs(), getSettings()]);
  const commonFaqs = [
    { question: "Are the cars shown online still available?", answer: <>Availability can change. Open the car you like and ask our team to confirm before you visit.</> },
    { question: "Can I see a car in person?", answer: <>Yes. Find our locations and directions on the <Link href="/contact">contact page</Link>. Tell us which car you want to see so we can confirm it is there.</> },
    { question: "How do I ask about a specific car?", answer: <>Use the WhatsApp button on its detail page. It includes a link to the car, so our team knows which listing you mean.</> },
    ...(settings.financing_enabled ? [{ question: "Can I finance a car?", answer: <>See the options currently listed on our <Link href="/financing">financing page</Link>. Our team can confirm the terms for a particular car; bank approval is decided by the lender.</> }] : []),
    ...(settings.sales_terms.trade_in ? [{ question: "Can I trade in my current car?", answer: <>Trade-ins are listed as an option. Contact our team to discuss your car and arrange an assessment.</> }] : []),
    { question: "Why do some cars show two prices?", answer: <>A listing may show separate in-house and cash prices. Ask our team to confirm the current price and payment terms before you decide.</> },
  ];

  return <div className="container page-wrap faq-page">
    <header className="faq-heading"><p className="section-kicker">Good to know</p><h1>Questions before you visit?</h1><p>Start here. For a specific car, speak directly with the Bhaggoes team.</p></header>
    <div className="faq-layout">
      <section className="faq-list" aria-label="Frequently asked questions">
        {(publishedFaqs.length ? publishedFaqs.map((faq) => ({ question: faq.question, answer: faq.answer })) : commonFaqs).map((item) => <details className="faq-item" key={item.question}><summary><span>{item.question}</span><Plus size={20} aria-hidden="true" /></summary><div className="faq-answer">{item.answer}</div></details>)}
      </section>
      <aside className="faq-aside"><p>Need a hand?</p><h2>Ask us about the car you have in mind.</h2><Link href="/contact">Contact the team <ArrowRight size={18} aria-hidden="true" /></Link></aside>
    </div>
  </div>;
}
