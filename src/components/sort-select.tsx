"use client";

import type { VehicleFilters } from "@/lib/domain";

export function SortSelect({ value, hidden, labels }: { value: string; hidden: [string, string][]; labels: Record<NonNullable<VehicleFilters["sort"]>, string> }) {
  return <form className="sort-compact" action="/cars">
    {hidden.map(([key, entry]) => <input key={key} type="hidden" name={key} value={entry} />)}
    <label htmlFor="sort-compact">Sort by</label>
    <select id="sort-compact" name="sort" defaultValue={value} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
      {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select>
    <noscript><button className="button button-outline button-sm" type="submit">Sort</button></noscript>
  </form>;
}
