import type { Metadata } from "next";
import { SavedCars } from "@/components/favorites-compare";

export const metadata: Metadata = { title: "Compare Cars", description: "Compare up to three Bhaggoes Car Palace vehicle listings side by side.", alternates: { canonical: "/compare" }, robots: { index: false, follow: true } };
export default function ComparePage() {
  return <div className="container page-wrap"><div className="page-intro"><h1>Compare cars</h1><p>Compare up to three cars side by side.</p></div><SavedCars mode="compare" /></div>;
}
