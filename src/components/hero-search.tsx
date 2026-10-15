import { Search } from "lucide-react";

export function HeroSearch({ makes }: { makes: string[] }) {
  return <form action="/cars" className="hero-search" role="search" aria-label="Search cars">
    <label className="field">Make
      <select name="make" defaultValue=""><option value="">All makes</option>{makes.map((make) => <option key={make}>{make}</option>)}</select>
    </label>
    <label className="field">Model<input name="model" placeholder="Any model" autoComplete="off" /></label>
    <label className="field">Max price<input name="maxPrice" type="number" inputMode="numeric" min="0" step="500" placeholder="No limit" /></label>
    <label className="field">Year<input name="year" type="number" inputMode="numeric" min="1886" max="2200" placeholder="Any year" /></label>
    <button className="button button-primary" type="submit"><Search size={18} aria-hidden="true" /> Search cars</button>
  </form>;
}
