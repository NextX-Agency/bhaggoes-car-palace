import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
import "./admin-extra.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: settings.seo_title, template: `%s | ${settings.business_name}` },
    description: settings.seo_description,
    openGraph: { type: "website", siteName: settings.business_name, title: settings.seo_title, description: settings.seo_description },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="en">
      <body>
        <SiteHeader settings={settings} />
        <main>{children}</main>
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
