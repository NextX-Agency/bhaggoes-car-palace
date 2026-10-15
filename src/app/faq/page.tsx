import type { Metadata } from "next";
import Link from "next/link";
import { getFaqs } from "@/lib/data";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Answers to common questions about Bhaggoes Car Palace vehicle listings.", alternates: { canonical: "/faq" } };
export default async function FAQPage() {
  const faqs = await getFaqs();
  return <div className="container page-wrap"><div className="page-intro"><h1>Frequently Asked Questions</h1></div>{faqs.length ? <div className="faq-list">{faqs.map((item) => <article className="faq-item" key={item.id}><h2>{item.question}</h2><p>{item.answer}</p></article>)}</div> : <div className="empty-state"><h2>No questions published yet</h2><Link className="button button-outline" href="/contact">Contact us</Link></div>}</div>;
}
