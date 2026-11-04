import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/data";
import { defaultShareImage } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
import "./admin.css";

// Public pages are static/ISR: data comes from tagged caches that admin saves expire (see lib/data.ts).
// This is the upper bound for any page that is not invalidated sooner.
export const revalidate = 300;

const display = Archivo({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["wdth"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  // Existing installations may still have the original generic defaults in the database.
  const title = settings.seo_title === "Bhaggoes Car Palace | Vehicle Inventory"
    ? "Bhaggoes Car Palace | Autodealer in Suriname" : settings.seo_title;
  const description = settings.seo_description === "Browse the Bhaggoes Car Palace vehicle inventory and contact the dealership about a car."
    ? "Bhaggoes Car Palace is een autodealer in Suriname. Bekijk onze auto's of vraag via WhatsApp naar de actuele voorraad en bezoek onze locaties."
    : settings.seo_description;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${settings.business_name}` },
    description,
    openGraph: { type: "website", siteName: settings.business_name, title, description, locale: "en_US", images: [defaultShareImage] },
    twitter: { card: "summary_large_image", title, description, images: [defaultShareImage.url] },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader settings={settings} />
        <main id="main">{children}</main>
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
