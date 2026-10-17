import type { Metadata } from "next";
import { SocialIcon } from "@/components/social-icon";
import { getSettings } from "@/lib/data";
import { bankFinancingText, buildWhatsAppLink, internalFinancingText } from "@/lib/domain";

export async function generateMetadata(): Promise<Metadata> { const settings = await getSettings(); return { title: "Financing", description: settings.financing_enabled ? "Estimate monthly vehicle payments and contact Bhaggoes Car Palace with financing questions." : "The dealership has not published financing information yet.", alternates: { canonical: "/financing" }, robots: { index: settings.financing_enabled, follow: true } }; }
export default async function FinancingPage() {
  const settings = await getSettings();
  const whatsapp = buildWhatsAppLink(settings.whatsapp, `Hello ${settings.business_name}, I have a financing question.`);
  return <div className="container page-wrap">
    <div className="page-intro"><h1>Financing</h1>{settings.financing_enabled ? settings.financing_notes ? <p>{settings.financing_notes}</p> : null : <p>Financing details are not published online. Ask the dealership about current options.</p>}</div>
    {settings.financing_enabled ? <div className="financing-terms"><p><strong>Interne financiering</strong><span>{internalFinancingText(settings.sales_terms)}</span></p><p><strong>Bankfinanciering</strong><span>{bankFinancingText(settings.sales_terms)}</span></p>{settings.sales_terms.trade_in ? <p><strong>Inruil</strong><span>Inruilmogelijkheden beschikbaar</span></p> : null}</div> : null}
    {settings.financing_enabled && settings.sales_terms.promo_text ? <p className="financing-promo">{settings.sales_terms.promo_text}</p> : null}
    {whatsapp ? <a className="button button-whatsapp financing-contact" href={whatsapp} target="_blank" rel="noreferrer"><SocialIcon platform="whatsapp" /> Ask on WhatsApp</a> : <a className="button button-primary financing-contact" href="/contact">Contact the dealership</a>}
  </div>;
}
