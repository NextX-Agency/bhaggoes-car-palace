import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { CatalogNotice } from "@/components/catalog-notice";
import { EmptyState } from "@/components/empty-state";
import { MobileFilterDrawer } from "@/components/mobile-filter-drawer";
import { SortSelect } from "@/components/sort-select";
import { VehicleFilterForm, sortLabels } from "@/components/vehicle-filter-form";
import { VehicleGrid } from "@/components/vehicle-grid";
import { getSettings, getVehicles, getVehicleFilterOptions } from "@/lib/data";
import { availabilityLabels, type Availability, type VehicleFilters } from "@/lib/domain";
import { compareCarsEnabled } from "@/lib/features";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

// /cars and /cars?make=X (a make that is in stock) are the indexable pages. Any other filter, search or page
// number canonicalises to /cars and stays out of the index, so filter combinations cannot flood search results.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const keys = Object.keys(params).filter((key) => one(params[key]));
  const requestedMake = one(params.make)?.trim();
  const base = { title: "Cars for sale in Suriname", description: "Explore the current car listings at Bhaggoes Car Palace in Suriname. Filter by make, price, year and more, then ask us about availability.", alternates: { canonical: "/cars" } };
  if ((await getSettings()).catalog_hidden) return { ...base, title: "Cars", robots: { index: false, follow: true } };
  if (!keys.length) return base;
  if (requestedMake && keys.length === 1) {
    const { makes, makeCounts } = await getVehicleFilterOptions();
    const make = makes.find((item) => item.toLowerCase() === requestedMake.toLowerCase() && makeCounts[item]);
    if (make) return { title: `${make} cars for sale in Suriname`, description: `Explore ${makeCounts[make]} ${make} ${makeCounts[make] === 1 ? "car" : "cars"} at Bhaggoes Car Palace in Suriname. View photos and details, then ask about availability.`, alternates: { canonical: `/cars?make=${encodeURIComponent(make)}` } };
  }
  return { ...base, robots: { index: false, follow: true } };
}
const numberValue = (value: string | string[] | undefined) => { const parsed = Number(one(value)); return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined; };
const filterKeys = ["search", "make", "model", "year", "minPrice", "maxPrice", "fuel", "transmission", "bodyType", "color", "condition", "availability", "maxMileage"] as const;
const conditions = ["new", "used"] as const;
const number = (value: number) => new Intl.NumberFormat("en-US").format(value);

export default async function CarsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sort = one(params.sort);
  const filters: VehicleFilters = {
    search: one(params.search) || undefined, make: one(params.make) || undefined, model: one(params.model) || undefined, year: numberValue(params.year),
    minPrice: numberValue(params.minPrice), maxPrice: numberValue(params.maxPrice),
    fuel: one(params.fuel) || undefined, transmission: one(params.transmission) || undefined, bodyType: one(params.bodyType) || undefined,
    color: one(params.color) || undefined, maxMileage: numberValue(params.maxMileage),
    condition: conditions.find((value) => value === one(params.condition)),
    availability: (Object.keys(availabilityLabels) as Availability[]).find((value) => value === one(params.availability)),
    sort: sort && sort in sortLabels ? sort as VehicleFilters["sort"] : "newest", page: numberValue(params.page) ?? 1,
  };
  const [{ vehicles, total, page, pageSize }, options, settings] = await Promise.all([getVehicles(filters), getVehicleFilterOptions(), getSettings()]);
  const selectedMake = options.makes.find((make) => make.toLowerCase() === filters.make?.toLowerCase() && options.makeCounts[make]);
  if (settings.catalog_hidden) return <div className="catalog-page"><CatalogNotice settings={settings} headingLevel={1} /></div>;

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
      case "maxMileage": return `Up to ${number(Number(value))} km`;
      case "condition": return value === "new" ? "New" : "Used";
      case "availability": return availabilityLabels[value as Availability] ?? value;
      default: return value;
    }
  };

  return <div className="container page-wrap inventory-page">
    <div className="inventory-head">
      <div>
        <h1>{selectedMake ? `${selectedMake} cars for sale in Suriname` : "Cars for sale in Suriname"}</h1>
        <p className="inventory-intro">Browse the current listings at {settings.business_name}. Contact our team to confirm availability or arrange a visit.</p>
      </div>
      {compareCarsEnabled ? <Link href="/compare" className="text-link">Compare cars <ArrowRight size={16} /></Link> : null}
    </div>
    <div className="inventory-layout">
      <aside className="filter-panel" aria-label="Filters">
        <h2 className="filter-heading">Filters</h2>
        <VehicleFilterForm filters={filters} options={options} />
      </aside>
      <div className="inventory-results">
        <h2 className="sr-only">Vehicle listings</h2>
        <div className="results-bar">
          <div className="mobile-filter-trigger"><MobileFilterDrawer activeCount={active.length} formId="mobile-filters"><VehicleFilterForm filters={filters} options={options} id="mobile-filters" /></MobileFilterDrawer></div>
          <SortSelect value={filters.sort ?? "newest"} hidden={active} labels={sortLabels} />
        </div>
        {active.length ? <div className="active-filters" aria-label="Active filters">
          {active.map(([key, value]) => <Link className="chip" key={key} href={query([...active.filter(([other]) => other !== key), ...sortEntry])} aria-label={`Remove filter ${chipLabel(key, value)}`}>{chipLabel(key, value)}<X size={14} aria-hidden="true" /></Link>)}
          <Link className="chip chip-clear" href={query(sortEntry)}>Clear all</Link>
        </div> : null}
        {vehicles.length
          ? <VehicleGrid vehicles={vehicles} priorityCount={1} defaultCurrency={settings.currency} />
          : active.length
            ? <EmptyState title="No cars match your filters" href={query(sortEntry)} action="Clear filters" />
            : total > 0
              ? <EmptyState title="There are no cars on this page" text="The list has changed since this link was made." href={query(sortEntry)} action="Back to the first page" />
              : <EmptyState title="No cars are listed right now" href="/contact" action="Ask about availability" />}
        {pageCount > 1 ? <nav className="pagination" aria-label="Inventory pages">
          <span>Page {page} of {pageCount}</span>
          <div>{page > 1 ? <Link href={pageHref(page - 1)} rel="prev"><ArrowLeft size={16} /> Previous</Link> : null}{page < pageCount ? <Link href={pageHref(page + 1)} rel="next">Next <ArrowRight size={16} /></Link> : null}</div>
        </nav> : null}
      </div>
    </div>
  </div>;
}
