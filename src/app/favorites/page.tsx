import type { Metadata } from "next";
import { CatalogNotice } from "@/components/catalog-notice";
import { SavedCars } from "@/components/favorites-compare";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Saved Cars", alternates: { canonical: "/favorites" }, robots: { index: false, follow: true } };
export default async function FavoritesPage() {
  const settings = await getSettings();
  if (settings.catalog_hidden) return <div className="catalog-page"><CatalogNotice settings={settings} headingLevel={1} /></div>;
  return <div className="container page-wrap"><div className="page-intro"><h1>Saved cars</h1><p>Saved on this device.</p></div><SavedCars mode="favorites" defaultCurrency={settings.currency} /></div>;
}
