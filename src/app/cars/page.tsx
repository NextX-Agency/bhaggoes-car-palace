import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { VehicleGrid } from "@/components/vehicle-grid";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { getVehicles, getVehicleFilterOptions } from "@/lib/data";
import type { Availability, VehicleCondition, VehicleFilters } from "@/lib/domain";

export const metadata: Metadata = { title: "Browse Cars", description: "Search current Bhaggoes Car Palace vehicle listings by make, price, year, condition, and more.", alternates: { canonical: "/cars" } };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type FilterOptions = Awaited<ReturnType<typeof getVehicleFilterOptions>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const numberValue = (value: string | string[] | undefined) => { const parsed = Number(one(value)); return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; };

export default async function CarsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters: VehicleFilters = {
    search: one(params.search), make: one(params.make), model: one(params.model), year: numberValue(params.year),
    minPrice: numberValue(params.minPrice), maxPrice: numberValue(params.maxPrice), minMileage: numberValue(params.minMileage), maxMileage: numberValue(params.maxMileage),
    fuel: one(params.fuel), transmission: one(params.transmission), bodyType: one(params.bodyType),
    condition: one(params.condition) as VehicleCondition | undefined, availability: one(params.availability) as Availability | undefined,
    sort: (one(params.sort) as VehicleFilters["sort"]) ?? "newest", page: numberValue(params.page) ?? 1,
  };
  const [{ vehicles, total, page, pageSize }, options] = await Promise.all([getVehicles(filters), getVehicleFilterOptions()]);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (key !== "page" && value && !Array.isArray(value)) query.set(key, value);
  const pageCount = Math.ceil(total / pageSize);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => !["sort", "page", "pageSize"].includes(key) && Boolean(value)).length;
  return <div className="container page-wrap inventory-page">
    <div className="page-intro page-intro-row"><div><p className="eyebrow">Bhaggoes Car Palace · Inventory</p><h1>Find your next car.</h1><p>Explore current listings, narrow your search, and compare the details that matter to you.</p></div><Link href="/compare" className="text-link">Compare saved cars ↗</Link></div>
    <div className="inventory-layout">
      <aside className="filter-panel"><div className="filter-heading"><h2><SlidersHorizontal size={18} /> Refine your search</h2><Link href="/cars" aria-label="Clear filters"><X size={16} /> Clear</Link></div>
        <VehicleFilterForm filters={filters} options={options} />
      </aside>
      <div className="inventory-results"><div className="results-bar"><div className="results-count"><div className="mobile-filter-trigger"><MobileFilterDrawer activeCount={activeFilterCount}><VehicleFilterForm filters={filters} options={options} /></MobileFilterDrawer></div><p><strong>{total}</strong> {total === 1 ? "car" : "cars"} found</p></div><form className="sort-compact" action="/cars">{Object.entries(params).map(([key, value]) => key !== "page" && key !== "sort" ? (Array.isArray(value) ? value.map((entry, index) => <input key={`${key}-${index}`} type="hidden" name={key} value={entry} />) : value ? <input key={key} type="hidden" name={key} value={value} /> : null) : null)}<label htmlFor="sort-compact">Sort</label><select id="sort-compact" name="sort" defaultValue={filters.sort}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price-asc">Price: low first</option><option value="price-desc">Price: high first</option><option value="year-desc">Year: newest</option><option value="mileage-asc">Mileage: lowest</option></select><button aria-label="Sort inventory">↗</button></form></div>
        <VehicleGrid vehicles={vehicles} />
        {pageCount > 1 ? <nav className="pagination" aria-label="Inventory pages"><span>Page {page} of {pageCount}</span><div>{page > 1 ? <Link href={`/cars?${query.toString()}&page=${page - 1}`}>← Previous</Link> : null}{page < pageCount ? <Link href={`/cars?${query.toString()}&page=${page + 1}`}>Next →</Link> : null}</div></nav> : null}
      </div>
    </div>
  </div>;
}

function VehicleFilterForm({ filters, options }: { filters: VehicleFilters; options: FilterOptions }) {
  return <form className="filter-form" action="/cars">
    <label>Search<input name="search" defaultValue={filters.search} placeholder="Make, model, or keyword" /></label>
    <label>Make<select name="make" defaultValue={filters.make ?? ""}><option value="">All makes</option>{options.makes.map((make) => <option key={make}>{make}</option>)}</select></label>
    <label>Model<input name="model" defaultValue={filters.model} placeholder="Any model" /></label>
    <label>Year<input name="year" type="number" min="1886" max="2200" defaultValue={filters.year} placeholder="Any year" /></label>
    <div className="filter-two"><label>Price from<input name="minPrice" type="number" min="0" defaultValue={filters.minPrice} placeholder="No min" /></label><label>Price to<input name="maxPrice" type="number" min="0" defaultValue={filters.maxPrice} placeholder="No max" /></label></div>
    <div className="filter-two"><label>Mileage from<input name="minMileage" type="number" min="0" defaultValue={filters.minMileage} placeholder="No min" /></label><label>Mileage to<input name="maxMileage" type="number" min="0" defaultValue={filters.maxMileage} placeholder="No max" /></label></div>
    <label>Fuel<select name="fuel" defaultValue={filters.fuel ?? ""}><option value="">Any fuel</option>{options.fuels.map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label>
    <label>Transmission<select name="transmission" defaultValue={filters.transmission ?? ""}><option value="">Any transmission</option>{options.transmissions.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Body type<select name="bodyType" defaultValue={filters.bodyType ?? ""}><option value="">Any body type</option>{options.bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Condition<select name="condition" defaultValue={filters.condition ?? ""}><option value="">New or used</option><option value="new">New</option><option value="used">Used</option></select></label>
    <label>Availability<select name="availability" defaultValue={filters.availability ?? ""}><option value="">Any status</option><option value="available">Available</option><option value="on_the_way">On the way</option><option value="reserved">Reserved</option><option value="rental">Rental</option><option value="sold">Sold</option></select></label>
    <label>Sort by<select name="sort" defaultValue={filters.sort}><option value="newest">Newest arrivals</option><option value="oldest">Oldest arrivals</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="year-desc">Year: newest first</option><option value="mileage-asc">Mileage: low to high</option></select></label>
    <button className="button button-dark filter-submit" type="submit"><Search size={16} /> Apply filters</button>
  </form>;
}
