import type { Metadata } from "next";
import { SavedCars } from "@/components/favorites-compare";

export const metadata: Metadata = { title: "Saved Cars", alternates: { canonical: "/favorites" }, robots: { index: false, follow: true } };
export default function FavoritesPage() { return <><div className="container page-wrap page-intro"><h1>Saved Cars</h1><p>Saved on this device.</p></div><SavedCars mode="favorites" /></>; }
