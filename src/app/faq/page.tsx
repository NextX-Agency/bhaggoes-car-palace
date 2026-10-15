import type { Metadata } from "next";
import Link from "next/link";
import { getFaqs } from "@/lib/data";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Answers to common questions about Bhaggoes Car Palace vehicle listings.", alternates: { canonical: "/faq" } };
export default async function FAQPage() {
  const faqs = await getFaqs();
  return <div className="container page-wrap"><div className="page-intro" style={{ textAlign: "center" }}><p className="eyebrow">A little more clarity</p><h1>Frequently asked questions.</h1><p style={{ marginInline: "auto" }}>Answers to help you browse and ask about a vehicle.</p></div>{faqs.length ? <div className="faq-list">{faqs.map((item) => <article className="faq-item" key={item.id}><h2>{item.question}</h2><p>{item.answer}</p></article>)}</div> : <div className="empty-state"><span className="empty-icon">?</span><h2>Questions? We&apos;re happy to help.</h2><p>The team can answer questions about a specific car or the buying process.</p><Link className="button button-outline" href="/contact">Contact the dealership</Link></div>}</div>;
}
