import type { Metadata } from "next";
import { SavedCars } from "@/components/favorites-compare";

export const metadata: Metadata = { title: "Saved Cars", alternates: { canonical: "/favorites" }, robots: { index: false, follow: true } };
export default function FavoritesPage() { return <><div className="container page-wrap page-intro"><p className="eyebrow">Keep your options close</p><h1>Saved cars</h1><p>Your saved cars stay on this device while you browse.</p></div><SavedCars mode="favorites" /></>; }
