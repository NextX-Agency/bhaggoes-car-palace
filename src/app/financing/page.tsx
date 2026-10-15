import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { FinanceCalculator } from "@/components/finance-calculator";
import { getSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> { const settings = await getSettings(); return { title: "Financing", description: settings.financing_enabled ? "Estimate monthly vehicle payments and contact Bhaggoes Car Palace with financing questions." : "The dealership has not published financing information yet.", alternates: { canonical: "/financing" }, robots: { index: settings.financing_enabled, follow: true } }; }
export default async function FinancingPage() {
  const settings = await getSettings();
  return <div className="container page-wrap"><div className="page-intro"><p className="eyebrow">Plan your next step</p><h1>{settings.financing_enabled ? "Make room for what moves you." : "Financing information"}</h1><p>{settings.financing_enabled ? settings.financing_notes || "Use this calculator to estimate payments, then talk with the team about your questions." : "The dealership has not published financing details on this website yet."}</p></div>{settings.financing_enabled ? <div className="support-grid"><FinanceCalculator currency={settings.currency ?? ""} /><section className="support-card"><p className="eyebrow">Questions welcome</p><h2>Talk it through</h2><p className="support-copy">Payment examples are estimates only. Actual offers, rates, eligibility, and terms can vary and should be confirmed directly.</p><ContactForm /></section></div> : <section className="support-card"><p className="eyebrow">Need help?</p><h2>Ask the dealership</h2><p className="support-copy">Contact the team with a question about a vehicle or purchasing process.</p><ContactForm /></section>}</div>;
}
