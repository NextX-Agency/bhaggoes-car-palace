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
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: settings.seo_title, template: `%s | ${settings.business_name}` },
    description: settings.seo_description,
    openGraph: { type: "website", siteName: settings.business_name, title: settings.seo_title, description: settings.seo_description, locale: "en_US", images: [defaultShareImage] },
    twitter: { card: "summary_large_image", title: settings.seo_title, description: settings.seo_description, images: [defaultShareImage.url] },
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
