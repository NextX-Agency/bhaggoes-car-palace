import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { FinanceCalculator } from "@/components/finance-calculator";
import { getSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> { const settings = await getSettings(); return { title: "Financing", description: settings.financing_enabled ? "Estimate monthly vehicle payments and contact Bhaggoes Car Palace with financing questions." : "The dealership has not published financing information yet.", alternates: { canonical: "/financing" }, robots: { index: settings.financing_enabled, follow: true } }; }
export default async function FinancingPage() {
  const settings = await getSettings();
  return <div className="container page-wrap"><div className="page-intro"><h1>Financing</h1>{settings.financing_enabled ? settings.financing_notes ? <p>{settings.financing_notes}</p> : null : <p>The dealership has not published financing details on this website yet.</p>}</div>{settings.financing_enabled ? <div className="support-grid"><FinanceCalculator currency={settings.currency ?? ""} /><section className="support-card"><h2>Ask a question</h2><ContactForm /></section></div> : <section className="support-card"><h2>Contact us</h2><ContactForm /></section>}</div>;
}
