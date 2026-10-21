import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SavedCars } from "@/components/favorites-compare";
import { compareCarsEnabled } from "@/lib/features";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = compareCarsEnabled
  ? { title: "Compare Cars", description: "Compare up to three Bhaggoes Car Palace vehicle listings side by side.", alternates: { canonical: "/compare" }, robots: { index: false, follow: true } }
  : { title: "Page not found", robots: { index: false, follow: false } };
export default async function ComparePage() {
  if (!compareCarsEnabled) notFound();
  const settings = await getSettings();
  return <div className="container page-wrap"><div className="page-intro"><h1>Compare cars</h1><p>Compare up to three cars side by side.</p></div><SavedCars mode="compare" defaultCurrency={settings.currency} /></div>;
}
