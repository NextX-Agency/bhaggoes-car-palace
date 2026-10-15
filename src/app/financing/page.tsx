import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { FinanceCalculator } from "@/components/finance-calculator";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Financing", description: "Estimate monthly vehicle payments and contact Bhaggoes Car Palace with financing questions.", alternates: { canonical: "/financing" } };
export default async function FinancingPage() {
  const settings = await getSettings();
  return <div className="container page-wrap"><div className="page-intro"><p className="eyebrow">Plan your next step</p><h1>Make room for what moves you.</h1><p>{settings.financing_enabled ? settings.financing_notes || "Use this calculator to estimate payments, then talk with the team about your questions." : "Use this calculator as a planning estimate. Contact the dealership for current information about payment options."}</p></div><div className="support-grid"><FinanceCalculator currency={settings.currency ?? ""} /><section className="support-card"><p className="eyebrow">Questions welcome</p><h2>Talk it through</h2><p className="support-copy">Payment examples are estimates only. Actual offers, rates, eligibility, and terms can vary and should be confirmed directly.</p><ContactForm /></section></div></div>;
}
