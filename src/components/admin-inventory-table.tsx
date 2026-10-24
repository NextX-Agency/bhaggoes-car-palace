"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type ButtonHTMLAttributes, type SelectHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnFiltersState, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, Camera, Eye, EyeOff, Pencil, Search, Star, StarOff, Tags, X } from "lucide-react";
import { bulkUpdateVehiclesAction, updateVehicleAction } from "@/app/admin/actions";
import type { VehicleImage } from "@/lib/domain";

export type AdminVehicle = { id: string; slug: string; title: string; make: string; model: string; year: number | null; price: number | null; currency: string | null; stock_number?: string | null; availability: string; featured: boolean; published: boolean; archived_at: string | null; updated_at: string; images: VehicleImage[] };
const col = createColumnHelper<AdminVehicle>();
const statusLabels: Record<string, string> = { available: "Beschikbaar", on_the_way: "Onderweg", reserved: "Gereserveerd", sold: "Verkocht", rental: "Verhuur" };
const monthNames = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
// Fixed Suriname time (UTC-3, no daylight saving) and our own month names: the server and every browser print the same text, so hydration never mismatches.
const dateLabel = (iso: string) => { const time = Date.parse(iso); if (Number.isNaN(time)) return ""; const date = new Date(time - 3 * 3600 * 1000); return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`; };
const priceLabel = (vehicle: AdminVehicle) => vehicle.price == null ? "Op aanvraag" : `${vehicle.currency ? `${vehicle.currency} ` : ""}${new Intl.NumberFormat("en-US").format(vehicle.price)}`;
const visibilityOf = (vehicle: AdminVehicle) => vehicle.archived_at ? "archived" : vehicle.published ? "published" : "draft";

// Row controls lock while their save is running, so a second tap cannot fire a duplicate update.
function PendingSelect(props: SelectHTMLAttributes<HTMLSelectElement>) { const { pending } = useFormStatus(); return <select {...props} disabled={pending} aria-busy={pending || undefined} />; }
function PendingButton(props: ButtonHTMLAttributes<HTMLButtonElement>) { const { pending } = useFormStatus(); return <button {...props} disabled={pending} aria-busy={pending || undefined} />; }

function StatusSelect({ vehicle }: { vehicle: AdminVehicle }) {
  return <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><PendingSelect className={`status-select status-select-${vehicle.availability}`} name="availability" aria-label={`Beschikbaarheid van ${vehicle.title}`} defaultValue={vehicle.availability} onChange={(event) => event.currentTarget.form?.requestSubmit()}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</PendingSelect></form>;
}
function FeaturedToggle({ vehicle }: { vehicle: AdminVehicle }) {
  return <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><input type="hidden" name="featured" value={String(!vehicle.featured)} /><PendingButton className={`star-toggle${vehicle.featured ? " is-on" : ""}`} type="submit" aria-pressed={vehicle.featured} aria-label={`${vehicle.title} uitgelicht op de homepage`} title={vehicle.featured ? "Staat op de homepage — tik om te verwijderen" : "Staat niet op de homepage — tik om toe te voegen"}><Star size={16} fill={vehicle.featured ? "currentColor" : "none"} aria-hidden="true" /><span>{vehicle.featured ? "Ja" : "Nee"}</span></PendingButton></form>;
}
function VisibilityToggle({ vehicle }: { vehicle: AdminVehicle }) {
  if (vehicle.archived_at) return <span className="admin-badge archived">Gearchiveerd</span>;
  return <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><input type="hidden" name="published" value={String(!vehicle.published)} /><PendingButton className={`admin-badge ${vehicle.published ? "published" : "draft"}`} type="submit" aria-label={`${vehicle.title}: ${vehicle.published ? "zichtbaar op de website, tik om te verbergen" : "verborgen voor de website, tik om te tonen"}`} title={vehicle.published ? "Zichtbaar op de website — tik om te verbergen" : "Verborgen voor de website — tik om te tonen"}>{vehicle.published ? "Zichtbaar" : "Verborgen"}</PendingButton></form>;
}
function RowActions({ vehicle }: { vehicle: AdminVehicle }) {
  return <div className="admin-row-actions">
    <Link className="row-action" href={`/admin/inventory/${vehicle.id}`} aria-label={`Bewerk ${vehicle.title}`}><Pencil size={15} aria-hidden="true" /><span className="row-action-label">Bewerken</span></Link>
    <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><input type="hidden" name="archived" value={vehicle.archived_at ? "false" : "true"} /><PendingButton className="row-action" type="submit" title={vehicle.archived_at ? "Terugzetten in de voorraad als concept" : "Archiveren en van de website halen"} aria-label={`${vehicle.archived_at ? "Herstel" : "Archiveer"} ${vehicle.title}`}>{vehicle.archived_at ? <ArchiveRestore size={15} aria-hidden="true" /> : <Archive size={15} aria-hidden="true" />}<span className="row-action-label">{vehicle.archived_at ? "Herstellen" : "Archiveren"}</span></PendingButton></form>
  </div>;
}
function Thumb({ vehicle, size }: { vehicle: AdminVehicle; size: number }) {
  const image = vehicle.images.find((item) => item.is_cover) ?? vehicle.images[0];
  return <div className="inventory-table-photo">{image?.url ? <Image src={image.url} alt="" fill sizes={`${size}px`} unoptimized /> : <Camera size={18} role="img" aria-label="Geen foto" />}</div>;
}

export function AdminInventoryTable({ data }: { data: AdminVehicle[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filter, setFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [bulkState, bulkAction, pendingBulk] = useActionState(bulkUpdateVehiclesAction, {});
  useEffect(() => { if (bulkState.ok) { setRowSelection({}); setStatusPickerOpen(false); } }, [bulkState]);

  const columns = useMemo(() => [
    col.display({ id: "select", enableSorting: false, header: ({ table }) => <label className="table-check"><input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} aria-label="Selecteer alle auto’s op deze pagina" /></label>, cell: ({ row }) => <label className="table-check"><input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label={`Selecteer ${row.original.title}`} /></label> }),
    col.accessor("title", { header: "Auto", cell: (info) => <div className="vehicle-admin-cell"><Thumb vehicle={info.row.original} size={64} /><Link href={`/admin/inventory/${info.row.original.id}`} className="vehicle-admin-link">{info.getValue()}<small>{[info.row.original.year, info.row.original.make, info.row.original.model].filter(Boolean).join(" · ")}</small></Link></div> }),
    col.accessor("price", { header: "Prijs", sortUndefined: "last", cell: (info) => <span className="admin-price tabular">{priceLabel(info.row.original)}</span> }),
    col.accessor("availability", { header: "Status", filterFn: "equalsString", cell: (info) => <StatusSelect vehicle={info.row.original} /> }),
    col.accessor((row) => visibilityOf(row), { id: "visibility", header: "Website", filterFn: "equalsString", cell: (info) => <VisibilityToggle vehicle={info.row.original} /> }),
    col.accessor("featured", { header: "Homepage", cell: (info) => <FeaturedToggle vehicle={info.row.original} /> }),
    col.accessor("updated_at", { header: "Bijgewerkt", cell: (info) => <span className="muted">{dateLabel(info.getValue())}</span> }),
    col.display({ id: "actions", header: () => <span className="sr-only">Acties</span>, enableSorting: false, cell: (info) => <RowActions vehicle={info.row.original} /> }),
  ], []);

  // TanStack Table intentionally exposes imperative table methods for the table renderer.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, state: { sorting, globalFilter: filter, rowSelection, columnFilters }, onSortingChange: setSorting, onGlobalFilterChange: setFilter, onColumnFiltersChange: setColumnFilters, onRowSelectionChange: setRowSelection, getRowId: (row) => row.id, enableRowSelection: true, globalFilterFn: (row, _id, value: string) => [row.original.title, row.original.make, row.original.model, row.original.year].join(" ").toLowerCase().includes(value.toLowerCase()), getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 20 } } });
  // Only cars that are still visible under the current search and filters count, so a bulk action never touches hidden rows.
  const selectedIds = table.getFilteredSelectedRowModel().rows.map((row) => row.id);
  const setColumnFilter = (id: string, value: string) => setColumnFilters((current) => [...current.filter((item) => item.id !== id), ...(value ? [{ id, value }] : [])]);
  const columnFilter = (id: string) => (columnFilters.find((item) => item.id === id)?.value as string | undefined) ?? "";
  const rows = table.getRowModel().rows;
  const filtered = Boolean(filter || columnFilters.length);
  const emptyText = data.length ? "Geen auto’s gevonden met deze filters." : "Nog geen auto’s. Voeg je eerste auto toe om te beginnen.";

  return <>
    <div className="inventory-table-toolbar">
      <label className="table-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Zoek in de voorraad</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Zoek op merk, model of jaar" /></label>
      <div className="table-filters">
        <label><span className="sr-only">Filter op beschikbaarheid</span><select className="admin-input" value={columnFilter("availability")} onChange={(event) => setColumnFilter("availability", event.target.value)}><option value="">Alle beschikbaarheid</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="sr-only">Filter op zichtbaarheid op de website</span><select className="admin-input" value={columnFilter("visibility")} onChange={(event) => setColumnFilter("visibility", event.target.value)}><option value="">Alle advertenties</option><option value="published">Zichtbaar op de website</option><option value="draft">Verborgen (concept)</option><option value="archived">Gearchiveerd</option></select></label>
      </div>
    </div>
    {selectedIds.length ? <form action={bulkAction} className="bulk-inventory-toolbar">
      <input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
      <strong className="bulk-selection-count">{selectedIds.length} geselecteerd</strong>
      <div className="bulk-action-list" role="group" aria-label="Acties voor geselecteerde auto’s">
        <button type="submit" name="operation" value="publish" className="bulk-icon-action" title="Geselecteerde auto’s tonen op de website" aria-label="Geselecteerde auto’s tonen op de website" disabled={pendingBulk}><Eye size={18} aria-hidden="true" /><span>Tonen</span></button>
        <button type="submit" name="operation" value="unpublish" className="bulk-icon-action" title="Geselecteerde auto’s verbergen voor de website" aria-label="Geselecteerde auto’s verbergen voor de website" disabled={pendingBulk}><EyeOff size={18} aria-hidden="true" /><span>Verbergen</span></button>
        <button type="submit" name="operation" value="feature" className="bulk-icon-action" title="Geselecteerde auto’s uitlichten op de homepage" aria-label="Geselecteerde auto’s uitlichten op de homepage" disabled={pendingBulk}><Star size={18} aria-hidden="true" /><span>Uitlichten</span></button>
        <button type="submit" name="operation" value="unfeature" className="bulk-icon-action" title="Geselecteerde auto’s van de homepage halen" aria-label="Geselecteerde auto’s van de homepage halen" disabled={pendingBulk}><StarOff size={18} aria-hidden="true" /><span>Niet uitlichten</span></button>
        <button type="button" className="bulk-icon-action" title="Beschikbaarheid van geselecteerde auto’s wijzigen" aria-label="Beschikbaarheid van geselecteerde auto’s wijzigen" aria-expanded={statusPickerOpen} aria-controls={statusPickerOpen ? "bulk-status-options" : undefined} onClick={() => setStatusPickerOpen((open) => !open)} disabled={pendingBulk}><Tags size={18} aria-hidden="true" /><span>Status</span></button>
        <button type="submit" name="operation" value="archive" className="bulk-icon-action is-danger" title="Geselecteerde auto’s archiveren en verbergen" aria-label="Geselecteerde auto’s archiveren en verbergen" disabled={pendingBulk} onClick={(event) => { if (!window.confirm(`${selectedIds.length} ${selectedIds.length === 1 ? "auto" : "auto’s"} archiveren? Ze verdwijnen van de website.`)) event.preventDefault(); }}><Archive size={18} aria-hidden="true" /><span>Archiveren</span></button>
        <button type="submit" name="operation" value="restore" className="bulk-icon-action" title="Geselecteerde auto’s terugzetten als concept" aria-label="Geselecteerde auto’s terugzetten als concept" disabled={pendingBulk}><ArchiveRestore size={18} aria-hidden="true" /><span>Herstellen</span></button>
      </div>
      <button type="button" className="bulk-clear-selection" onClick={() => { setRowSelection({}); setStatusPickerOpen(false); }} disabled={pendingBulk}><X size={18} aria-hidden="true" /><span>Annuleren</span></button>
      {statusPickerOpen ? <div id="bulk-status-options" className="bulk-status-options" role="group" aria-label="Beschikbaarheid instellen voor geselecteerde auto’s">{Object.entries(statusLabels).map(([value, label]) => <button type="submit" key={value} name="operation" value={`status:${value}`} className="bulk-status-option" disabled={pendingBulk}><span className={`status-dot status-select-${value}`} aria-hidden="true" />{label}</button>)}</div> : null}
      {pendingBulk ? <span className="sr-only" role="status">Geselecteerde auto’s worden opgeslagen…</span> : null}
    </form> : null}
    {bulkState.error ? <p className="admin-feedback admin-error" role="alert">{bulkState.error}</p> : bulkState.ok ? <p className="admin-feedback" role="status">Geselecteerde auto’s bijgewerkt.</p> : null}
    <div className="admin-table-wrap admin-inventory-desktop"><table className="admin-table inventory-table"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => { const sorted = header.column.getIsSorted(); return <th key={header.id} className={`col-${header.column.id}`} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}>{header.isPlaceholder ? null : header.column.getCanSort() ? <button type="button" className="table-sort" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{sorted === "asc" ? <ArrowUp size={12} /> : sorted === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}</button> : flexRender(header.column.columnDef.header, header.getContext())}</th>; })}</tr>)}</thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className={`${row.original.archived_at ? "archived-row" : ""}${row.getIsSelected() ? " selected-row" : ""}`}>{row.getVisibleCells().map((cell) => <td key={cell.id} className={`col-${cell.column.id}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={columns.length} className="table-empty">{emptyText}{filtered ? <> <button type="button" className="link-button" onClick={() => { setFilter(""); setColumnFilters([]); }}>Filters wissen</button></> : null}</td></tr>}</tbody></table></div>
    <div className="admin-inventory-mobile">{rows.length ? rows.map((row) => { const vehicle = row.original; return <article key={vehicle.id} className={`inventory-mobile-card${vehicle.archived_at ? " archived-row" : ""}`}>
      <div className="inventory-mobile-heading"><label className="inventory-mobile-select"><input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} /><span className="sr-only">Selecteer {vehicle.title}</span></label><Thumb vehicle={vehicle} size={80} /><div className="inventory-mobile-title"><Link href={`/admin/inventory/${vehicle.id}`}>{vehicle.title}</Link><span>{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" · ")}</span><strong className="tabular">{priceLabel(vehicle)}</strong></div></div>
      <div className="inventory-mobile-controls"><StatusSelect vehicle={vehicle} /><VisibilityToggle vehicle={vehicle} /><FeaturedToggle vehicle={vehicle} /></div>
      <RowActions vehicle={vehicle} />
    </article>; }) : <p className="table-empty">{emptyText}</p>}</div>
    <div className="table-pagination"><span>{table.getFilteredRowModel().rows.length} van {data.length} auto’s</span>{table.getPageCount() > 1 ? <div><button type="button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Vorige</button><span>Pagina {table.getState().pagination.pageIndex + 1} van {table.getPageCount()}</span><button type="button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Volgende</button></div> : null}</div>
  </>;
}
