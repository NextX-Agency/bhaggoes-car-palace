import type { Metadata } from "next";
import { SavedCars } from "@/components/favorites-compare";

export const metadata: Metadata = { title: "Compare Cars", description: "Compare up to three Bhaggoes Car Palace vehicle listings side by side.", alternates: { canonical: "/compare" }, robots: { index: false, follow: true } };
export default function ComparePage() { return <><div className="container page-wrap page-intro"><p className="eyebrow">Make a clear choice</p><h1>Compare cars</h1><p>Compare the key details side by side. Choose up to three listings.</p></div><SavedCars mode="compare" /></>; }
