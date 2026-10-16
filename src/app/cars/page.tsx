import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { SortSelect } from "@/components/sort-select";
import { VehicleFilterForm, sortLabels } from "@/components/vehicle-filter-form";
import { VehicleGrid } from "@/components/vehicle-grid";
import { getVehicles, getVehicleFilterOptions } from "@/lib/data";
import type { Availability, VehicleCondition, VehicleFilters } from "@/lib/domain";
import { availabilityLabels, formatMileage, isDemoVehicle } from "@/lib/domain";
import { compareCarsEnabled } from "@/lib/features";

export const metadata: Metadata = { title: "Browse Cars", description: "Browse Bhaggoes Car Palace vehicle listings by make, price, year, condition, and more.", alternates: { canonical: "/cars" } };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const numberValue = (value: string | string[] | undefined) => { const parsed = Number(one(value)); return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; };
const filterKeys = ["search", "make", "model", "year", "minPrice", "maxPrice", "minMileage", "maxMileage", "fuel", "transmission", "bodyType", "condition", "availability"] as const;
const number = (value: number) => new Intl.NumberFormat("en-US").format(value);

export default async function CarsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sort = one(params.sort);
  const filters: VehicleFilters = {
    search: one(params.search) || undefined, make: one(params.make) || undefined, model: one(params.model) || undefined, year: numberValue(params.year),
    minPrice: numberValue(params.minPrice), maxPrice: numberValue(params.maxPrice), minMileage: numberValue(params.minMileage), maxMileage: numberValue(params.maxMileage),
    fuel: one(params.fuel) || undefined, transmission: one(params.transmission) || undefined, bodyType: one(params.bodyType) || undefined,
    condition: (one(params.condition) || undefined) as VehicleCondition | undefined, availability: (one(params.availability) || undefined) as Availability | undefined,
    sort: sort && sort in sortLabels ? sort as VehicleFilters["sort"] : "newest", page: numberValue(params.page) ?? 1,
  };
  const [{ vehicles, total, page, pageSize }, options] = await Promise.all([getVehicles(filters), getVehicleFilterOptions()]);
  const demoOnly = total > 0 && vehicles.length > 0 && vehicles.every(isDemoVehicle);

  const active = filterKeys.flatMap((key) => filters[key] ? [[key, String(filters[key])] as [string, string]] : []);
  const query = (entries: [string, string][]) => { const search = new URLSearchParams(entries); return search.size ? `/cars?${search}` : "/cars"; };
  const sortEntry: [string, string][] = filters.sort && filters.sort !== "newest" ? [["sort", filters.sort]] : [];
  const pageHref = (target: number) => query([...active, ...sortEntry, ...(target > 1 ? [["page", String(target)] as [string, string]] : [])]);
  const pageCount = Math.ceil(total / pageSize);
  const chipLabel = (key: string, value: string) => {
    switch (key) {
      case "search": return `“${value}”`;
      case "minPrice": return `From ${number(Number(value))}`;
      case "maxPrice": return `Up to ${number(Number(value))}`;
      case "minMileage": return `From ${formatMileage(Number(value))}`;
      case "maxMileage": return `Up to ${formatMileage(Number(value))}`;
      case "availability": return availabilityLabels[value as Availability] ?? value;
      case "condition": return value === "new" ? "New" : "Used";
      default: return value;
    }
  };

  return <div className="container page-wrap inventory-page">
    <div className="inventory-head">
      <div>
        <h1>{demoOnly ? "Demo cars" : "Browse cars"}</h1>
        <p><strong>{total}</strong> {total === 1 ? "car" : "cars"}{active.length ? " match your filters" : " listed"}</p>
        {demoOnly ? <p className="inventory-demo-note">Example listings with sample prices. These cars are not for sale.</p> : null}
      </div>
      {compareCarsEnabled ? <Link href="/compare" className="text-link">Compare cars <ArrowRight size={16} /></Link> : null}
    </div>
    <div className="inventory-layout">
      <aside className="filter-panel" aria-label="Filters">
        <h2 className="filter-heading">Filters</h2>
        <VehicleFilterForm filters={filters} options={options} />
      </aside>
      <div className="inventory-results">
        <div className="results-bar">
          <div className="mobile-filter-trigger"><MobileFilterDrawer activeCount={active.length} formId="mobile-filters"><VehicleFilterForm filters={filters} options={options} id="mobile-filters" /></MobileFilterDrawer></div>
          <SortSelect value={filters.sort ?? "newest"} hidden={active} labels={sortLabels} />
        </div>
        {active.length ? <div className="active-filters" aria-label="Active filters">
          {active.map(([key, value]) => <Link className="chip" key={key} href={query([...active.filter(([other]) => other !== key), ...sortEntry])} aria-label={`Remove filter ${chipLabel(key, value)}`}>{chipLabel(key, value)}<X size={14} aria-hidden="true" /></Link>)}
          <Link className="chip chip-clear" href={query(sortEntry)}>Clear all</Link>
        </div> : null}
        {vehicles.length
          ? <VehicleGrid vehicles={vehicles} priorityCount={3} />
          : active.length
            ? <EmptyState title="No cars match your filters" href={query(sortEntry)} action="Clear filters" />
            : <EmptyState title="No cars are listed right now" href="/contact" action="Ask about availability" />}
        {pageCount > 1 ? <nav className="pagination" aria-label="Inventory pages">
          <span>Page {page} of {pageCount}</span>
          <div>{page > 1 ? <Link href={pageHref(page - 1)} rel="prev"><ArrowLeft size={16} /> Previous</Link> : null}{page < pageCount ? <Link href={pageHref(page + 1)} rel="next">Next <ArrowRight size={16} /></Link> : null}</div>
        </nav> : null}
      </div>
    </div>
  </div>;
}
