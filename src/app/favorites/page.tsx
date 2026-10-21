import type { Metadata } from "next";
import { SavedCars } from "@/components/favorites-compare";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Saved Cars", alternates: { canonical: "/favorites" }, robots: { index: false, follow: true } };
export default async function FavoritesPage() {
  const settings = await getSettings();
  return <div className="container page-wrap"><div className="page-intro"><h1>Saved cars</h1><p>Saved on this device.</p></div><SavedCars mode="favorites" defaultCurrency={settings.currency} /></div>;
}
