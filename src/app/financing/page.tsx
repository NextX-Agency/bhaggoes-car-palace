import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { getSettings } from "@/lib/data";
import { buildWhatsAppLink } from "@/lib/domain";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: "Financing",
    description: settings.financing_enabled
      ? "Explore the financing options listed by Bhaggoes Car Palace and ask the team about current terms."
      : "Ask Bhaggoes Car Palace about current vehicle financing options.",
    alternates: { canonical: "/financing" },
    robots: { index: settings.financing_enabled, follow: true },
  };
}

export default async function FinancingPage() {
  const settings = await getSettings();
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, I have a financing question.`);
  const terms = settings.sales_terms;

  return <div className="container page-wrap financing-page">
    <section className="finance-hero" aria-labelledby="finance-title">
      <div className="finance-hero-copy">
        <p className="finance-eyebrow">Bhaggoes Car Palace · Buying options</p>
        <h1 id="finance-title">A way forward for your next car.</h1>
        <p>See the options currently listed, then talk with our team about the car and terms that work for you.</p>
        {whatsapp ? <a className="button finance-hero-button" href={whatsapp} target="_blank" rel="noopener noreferrer"><SocialIcon platform="whatsapp" /> Ask us about financing</a> : <Link className="button finance-hero-button" href="/contact">Talk to our team <ArrowRight size={18} /></Link>}
      </div>
      <div className="finance-hero-image"><Image src="/images/harrier-2018/front-three-quarter.webp" alt="Toyota Harrier photographed at Bhaggoes Car Palace" fill loading="eager" sizes="(max-width: 760px) 100vw, 42vw" /></div>
    </section>

    {settings.financing_enabled ? <section className="finance-options" aria-labelledby="finance-options-title">
      <div className="finance-options-intro"><p className="section-kicker">Your options</p><h2 id="finance-options-title">Choose how you buy.</h2><p>These are the dealership terms currently shown online. Ask for the final terms for your chosen vehicle before making a decision.</p></div>
      <div className="finance-option-list">
        <div className="finance-option"><div><span className="finance-option-index">01</span><h3>In-house financing</h3><p>Arrange a payment plan directly with the dealership.</p></div><div className="finance-option-figure"><strong>{terms.internal_down_percent}%</strong><span>down payment · up to {terms.internal_max_months} months</span></div></div>
        <div className="finance-option"><div><span className="finance-option-index">02</span><h3>Bank financing</h3><p>Ask the team about applying through a bank. Approval and final terms are decided by the lender.</p></div><div className="finance-option-figure"><strong>{terms.bank_down_percent}%</strong><span>starting down payment</span></div></div>
        {terms.trade_in ? <div className="finance-option finance-option-trade"><div><span className="finance-option-index">03</span><h3>Trade in your car</h3><p>Ask the team to assess your current vehicle as part of the purchase.</p></div><ArrowRight size={24} aria-hidden="true" /></div> : null}
      </div>
    </section> : <section className="finance-unpublished"><h2>Let’s talk about your options.</h2><p>Financing terms are not published online right now. Our team can tell you what is available for the car you have in mind.</p></section>}

    {settings.financing_enabled && (settings.financing_notes || terms.promo_text) ? <div className="finance-note">{settings.financing_notes ? <p>{settings.financing_notes}</p> : null}{terms.promo_text ? <p>{terms.promo_text}</p> : null}</div> : null}
    <div className="finance-next"><div><h2>Found a car you like?</h2><p>Send us the listing and we’ll talk through the current price and options.</p></div><Link className="button button-primary" href="/cars">Explore the cars <ArrowRight size={18} aria-hidden="true" /></Link></div>
  </div>;
}
