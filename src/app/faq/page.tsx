import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getFaqs } from "@/lib/data";

export const metadata: Metadata = { title: "Frequently Asked Questions", description: "Answers to common questions about Bhaggoes Car Palace vehicle listings.", alternates: { canonical: "/faq" } };
export default async function FAQPage() {
  const faqs = await getFaqs();
  return <div className="container page-wrap">
    <div className="page-intro"><h1>Frequently asked questions</h1></div>
    {faqs.length
      ? <div className="faq-list">{faqs.map((item) => <details className="faq-item" key={item.id}><summary>{item.question}<Plus size={20} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
      : <EmptyState title="No questions published yet" href="/contact" action="Contact us" />}
  </div>;
}
