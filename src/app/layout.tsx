import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
import "./admin-extra.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  alternates: { canonical: "/" },
  title: { default: "Bhaggoes Car Palace | Quality Cars, Honest Prices", template: "%s | Bhaggoes Car Palace" },
  description: "Browse the Bhaggoes Car Palace vehicle inventory and contact the dealership about a car.",
  openGraph: { type: "website", siteName: "Bhaggoes Car Palace", title: "Bhaggoes Car Palace", description: "We beat anybody's prices." },
};

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
