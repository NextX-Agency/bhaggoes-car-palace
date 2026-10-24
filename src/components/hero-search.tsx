import { Search } from "lucide-react";
import Link from "next/link";
import { brandLogoMap } from "@/components/brand-logo";
import { VehicleMakeModelFilter } from "@/components/vehicle-make-model-filter";

export function HeroSearch({ makes, modelsByMake }: { makes: string[]; modelsByMake: Record<string, string[]> }) {
  return <form action="/cars" className="hero-search" role="search" aria-label="Search cars">
    <VehicleMakeModelFilter makes={makes} modelsByMake={modelsByMake} logos={brandLogoMap(makes)} layout="hero" />
    <label className="field hero-search-advanced">Max price<input name="maxPrice" type="number" inputMode="numeric" min="0" step="500" placeholder="No limit" /></label>
    <label className="field hero-search-advanced">Year<input name="year" type="number" inputMode="numeric" min="1886" max="2200" placeholder="Any year" /></label>
    <button className="button button-primary" type="submit"><Search size={18} aria-hidden="true" /> Search cars</button>
    <Link className="hero-search-more" href="/cars">More filters on the cars page</Link>
  </form>;
}
