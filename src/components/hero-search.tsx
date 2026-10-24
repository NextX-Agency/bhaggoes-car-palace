import { Search } from "lucide-react";
import Link from "next/link";
import { MakeSelect } from "@/components/make-select";

export function HeroSearch({ makes }: { makes: string[] }) {
  return <form action="/cars" className="hero-search" role="search" aria-label="Search cars">
    <div className="field"><span>Make</span><MakeSelect name="make" makes={makes} labelledBy="hero-make-label" /><span id="hero-make-label" className="sr-only">Make</span></div>
    <label className="field">Model<input name="model" placeholder="Any model" autoComplete="off" /></label>
    <label className="field hero-search-advanced">Max price<input name="maxPrice" type="number" inputMode="numeric" min="0" step="500" placeholder="No limit" /></label>
    <label className="field hero-search-advanced">Year<input name="year" type="number" inputMode="numeric" min="1886" max="2200" placeholder="Any year" /></label>
    <button className="button button-primary" type="submit"><Search size={18} aria-hidden="true" /> Search cars</button>
    <Link className="hero-search-more" href="/cars">More filters on the cars page</Link>
  </form>;
}
