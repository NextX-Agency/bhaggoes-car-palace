import { Search } from "lucide-react";
import type { VehicleFilters } from "@/lib/domain";
import { brandLogoMap } from "@/components/brand-logo";
import { VehicleMakeModelFilter } from "@/components/vehicle-make-model-filter";

export type FilterOptions = { makes: string[]; modelsByMake: Record<string, string[]>; fuels: string[]; transmissions: string[]; bodyTypes: string[]; colors: string[] };

export const sortLabels: Record<NonNullable<VehicleFilters["sort"]>, string> = {
  newest: "Newest listings", oldest: "Oldest listings", "price-asc": "Price: low to high", "price-desc": "Price: high to low", "year-desc": "Year: newest first",
};

export function VehicleFilterForm({ filters, options, id }: { filters: VehicleFilters; options: FilterOptions; id?: string }) {
  return <form className="filter-form" action="/cars" id={id}>
    <label>Search<input type="search" name="search" defaultValue={filters.search} placeholder="Stock no., model, color, option…" enterKeyHint="search" /></label>
    <VehicleMakeModelFilter makes={options.makes} modelsByMake={options.modelsByMake} make={filters.make} model={filters.model} logos={brandLogoMap(filters.make ? [...options.makes, filters.make] : options.makes)} />
    <div className="filter-group" role="group" aria-label="Price"><span>Price</span><div className="filter-two">
      <label><input name="minPrice" type="number" inputMode="numeric" min="0" defaultValue={filters.minPrice} placeholder="Min" aria-label="Price from" /></label>
      <label><input name="maxPrice" type="number" inputMode="numeric" min="0" defaultValue={filters.maxPrice} placeholder="Max" aria-label="Price to" /></label>
    </div></div>
    <label>Year<input name="year" type="number" inputMode="numeric" min="1886" max="2200" defaultValue={filters.year} placeholder="Any year" /></label>
    {options.bodyTypes.length ? <label>Body type<select name="bodyType" defaultValue={filters.bodyType ?? ""}><option value="">Any body type</option>{options.bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
    {options.fuels.length ? <label>Fuel<select name="fuel" defaultValue={filters.fuel ?? ""}><option value="">Any fuel</option>{options.fuels.map((fuel) => <option key={fuel}>{fuel}</option>)}</select></label> : null}
    {options.colors.length ? <label>Color<select name="color" defaultValue={filters.color ?? ""}><option value="">Any color</option>{options.colors.map((color) => <option key={color}>{color}</option>)}</select></label> : null}
    <label>Condition<select name="condition" defaultValue={filters.condition ?? ""}><option value="">New or used</option><option value="new">New</option><option value="used">Used</option></select></label>
    <label>Availability<select name="availability" defaultValue={filters.availability ?? ""}><option value="">Any availability</option><option value="available">Available</option><option value="on_the_way">On the way</option><option value="reserved">Reserved</option><option value="rental">Rental</option></select></label>
    <label>Max mileage (km)<input name="maxMileage" type="number" inputMode="numeric" min="0" step="1000" defaultValue={filters.maxMileage} placeholder="Any mileage" /></label>
    {options.transmissions.length ? <label>Transmission<select name="transmission" defaultValue={filters.transmission ?? ""}><option value="">Any transmission</option>{options.transmissions.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
    {filters.sort && filters.sort !== "newest" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
    <button className="button button-primary filter-submit" type="submit"><Search size={16} aria-hidden="true" /> Apply filters</button>
  </form>;
}
