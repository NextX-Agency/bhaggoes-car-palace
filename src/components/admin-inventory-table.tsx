"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnFiltersState, type RowSelectionState, type SortingState } from "@tanstack/react-table";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, Camera, Eye, EyeOff, Pencil, Search, Star, StarOff, Tags, X } from "lucide-react";
import { bulkUpdateVehiclesAction, updateVehicleAction } from "@/app/admin/actions";
import type { VehicleImage } from "@/lib/domain";

export type AdminVehicle = { id: string; slug: string; title: string; make: string; model: string; year: number | null; price: number | null; currency: string | null; stock_number?: string | null; availability: string; featured: boolean; published: boolean; archived_at: string | null; updated_at: string; images: VehicleImage[] };
const col = createColumnHelper<AdminVehicle>();
const statusLabels: Record<string, string> = { available: "Available", on_the_way: "On the way", reserved: "Reserved", sold: "Sold", rental: "Rental" };
const priceLabel = (vehicle: AdminVehicle) => vehicle.price == null ? "On request" : `${vehicle.currency ? `${vehicle.currency} ` : ""}${new Intl.NumberFormat("en-US").format(vehicle.price)}`;
const visibilityOf = (vehicle: AdminVehicle) => vehicle.archived_at ? "archived" : vehicle.published ? "published" : "draft";

function StatusSelect({ vehicle }: { vehicle: AdminVehicle }) {
  return <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><select className={`status-select status-select-${vehicle.availability}`} name="availability" aria-label={`Availability of ${vehicle.title}`} defaultValue={vehicle.availability} onChange={(event) => event.currentTarget.form?.requestSubmit()}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></form>;
}
function FeaturedToggle({ vehicle }: { vehicle: AdminVehicle }) {
  return <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><input type="hidden" name="featured" value={String(!vehicle.featured)} /><button className={`star-toggle${vehicle.featured ? " is-on" : ""}`} type="submit" aria-pressed={vehicle.featured} aria-label={vehicle.featured ? `Remove ${vehicle.title} from homepage` : `Show ${vehicle.title} on homepage`} title={vehicle.featured ? "Shown on homepage — click to remove" : "Not on homepage — click to show"}><Star size={16} fill={vehicle.featured ? "currentColor" : "none"} /><span>{vehicle.featured ? "Yes" : "No"}</span></button></form>;
}
function VisibilityToggle({ vehicle }: { vehicle: AdminVehicle }) {
  if (vehicle.archived_at) return <span className="admin-badge archived">Archived</span>;
  return <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><input type="hidden" name="published" value={String(!vehicle.published)} /><button className={`admin-badge ${vehicle.published ? "published" : "draft"}`} type="submit" title={vehicle.published ? "Visible on website — click to hide" : "Hidden from website — click to show"}>{vehicle.published ? "Visible" : "Hidden"}</button></form>;
}
function RowActions({ vehicle }: { vehicle: AdminVehicle }) {
  return <div className="admin-row-actions">
    <Link className="row-action" href={`/admin/inventory/${vehicle.id}`} aria-label={`Edit ${vehicle.title}`}><Pencil size={15} />Edit</Link>
    <form action={updateVehicleAction}><input type="hidden" name="id" value={vehicle.id} /><input type="hidden" name="archived" value={vehicle.archived_at ? "false" : "true"} /><button className="row-action" type="submit" title={vehicle.archived_at ? "Restore to inventory as a draft" : "Archive and remove from website"} aria-label={`${vehicle.archived_at ? "Restore" : "Archive"} ${vehicle.title}`}>{vehicle.archived_at ? <ArchiveRestore size={15} /> : <Archive size={15} />}{vehicle.archived_at ? "Restore" : "Archive"}</button></form>
  </div>;
}
function Thumb({ vehicle, size }: { vehicle: AdminVehicle; size: number }) {
  const image = vehicle.images.find((item) => item.is_cover) ?? vehicle.images[0];
  return <div className="inventory-table-photo">{image?.url ? <Image src={image.url} alt="" fill sizes={`${size}px`} unoptimized /> : <Camera size={18} aria-label="No photo" />}</div>;
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
    col.display({ id: "select", enableSorting: false, header: ({ table }) => <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} aria-label="Select all vehicles on this page" />, cell: ({ row }) => <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} aria-label={`Select ${row.original.title}`} /> }),
    col.accessor("title", { header: "Vehicle", cell: (info) => <div className="vehicle-admin-cell"><Thumb vehicle={info.row.original} size={64} /><Link href={`/admin/inventory/${info.row.original.id}`} className="vehicle-admin-link">{info.getValue()}<small>{[info.row.original.year, info.row.original.make, info.row.original.model].filter(Boolean).join(" · ")}</small></Link></div> }),
    col.accessor("price", { header: "Price", sortUndefined: "last", cell: (info) => <span className="admin-price tabular">{priceLabel(info.row.original)}</span> }),
    col.accessor("availability", { header: "Availability", filterFn: "equalsString", cell: (info) => <StatusSelect vehicle={info.row.original} /> }),
    col.accessor((row) => visibilityOf(row), { id: "visibility", header: "Website", filterFn: "equalsString", cell: (info) => <VisibilityToggle vehicle={info.row.original} /> }),
    col.accessor("featured", { header: "Homepage", cell: (info) => <FeaturedToggle vehicle={info.row.original} /> }),
    col.accessor("updated_at", { header: "Updated", cell: (info) => <span className="muted">{new Date(info.getValue()).toLocaleDateString()}</span> }),
    col.display({ id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false, cell: (info) => <RowActions vehicle={info.row.original} /> }),
  ], []);

  // TanStack Table intentionally exposes imperative table methods for the table renderer.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, state: { sorting, globalFilter: filter, rowSelection, columnFilters }, onSortingChange: setSorting, onGlobalFilterChange: setFilter, onColumnFiltersChange: setColumnFilters, onRowSelectionChange: setRowSelection, getRowId: (row) => row.id, enableRowSelection: true, globalFilterFn: (row, _id, value: string) => [row.original.title, row.original.make, row.original.model, row.original.year].join(" ").toLowerCase().includes(value.toLowerCase()), getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 20 } } });
  const selectedIds = Object.entries(rowSelection).filter(([, selected]) => selected).map(([id]) => id);
  const setColumnFilter = (id: string, value: string) => setColumnFilters((current) => [...current.filter((item) => item.id !== id), ...(value ? [{ id, value }] : [])]);
  const columnFilter = (id: string) => (columnFilters.find((item) => item.id === id)?.value as string | undefined) ?? "";
  const rows = table.getRowModel().rows;
  const filtered = Boolean(filter || columnFilters.length);
  const emptyText = data.length ? "No vehicles match these filters." : "No vehicles yet. Add your first car to get started.";

  return <>
    <div className="inventory-table-toolbar">
      <label className="table-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search inventory</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search by make, model or year" /></label>
      <div className="table-filters">
        <label><span className="sr-only">Filter by availability</span><select className="admin-input" value={columnFilter("availability")} onChange={(event) => setColumnFilter("availability", event.target.value)}><option value="">All availability</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="sr-only">Filter by website visibility</span><select className="admin-input" value={columnFilter("visibility")} onChange={(event) => setColumnFilter("visibility", event.target.value)}><option value="">All listings</option><option value="published">Visible on website</option><option value="draft">Hidden drafts</option><option value="archived">Archived</option></select></label>
      </div>
    </div>
    {selectedIds.length ? <form action={bulkAction} className="bulk-inventory-toolbar">
      <input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
      <strong className="bulk-selection-count">{selectedIds.length} selected</strong>
      <div className="bulk-action-list" role="group" aria-label="Actions for selected vehicles">
        <button type="submit" name="operation" value="publish" className="bulk-icon-action" title="Show selected cars on website" aria-label="Show selected cars on website" disabled={pendingBulk}><Eye size={18} aria-hidden="true" /><span>Show</span></button>
        <button type="submit" name="operation" value="unpublish" className="bulk-icon-action" title="Hide selected cars from website" aria-label="Hide selected cars from website" disabled={pendingBulk}><EyeOff size={18} aria-hidden="true" /><span>Hide</span></button>
        <button type="submit" name="operation" value="feature" className="bulk-icon-action" title="Show selected cars on homepage" aria-label="Show selected cars on homepage" disabled={pendingBulk}><Star size={18} aria-hidden="true" /><span>Feature</span></button>
        <button type="submit" name="operation" value="unfeature" className="bulk-icon-action" title="Remove selected cars from homepage" aria-label="Remove selected cars from homepage" disabled={pendingBulk}><StarOff size={18} aria-hidden="true" /><span>Unfeature</span></button>
        <button type="button" className="bulk-icon-action" title="Change availability of selected cars" aria-label="Change availability of selected cars" aria-expanded={statusPickerOpen} aria-controls="bulk-status-options" onClick={() => setStatusPickerOpen((open) => !open)} disabled={pendingBulk}><Tags size={18} aria-hidden="true" /><span>Status</span></button>
        <button type="submit" name="operation" value="archive" className="bulk-icon-action is-danger" title="Archive selected cars and hide them" aria-label="Archive selected cars and hide them" disabled={pendingBulk} onClick={(event) => { if (!window.confirm(`Archive ${selectedIds.length} selected car${selectedIds.length === 1 ? "" : "s"}? They will be hidden from the website.`)) event.preventDefault(); }}><Archive size={18} aria-hidden="true" /><span>Archive</span></button>
        <button type="submit" name="operation" value="restore" className="bulk-icon-action" title="Restore selected cars as drafts" aria-label="Restore selected cars as drafts" disabled={pendingBulk}><ArchiveRestore size={18} aria-hidden="true" /><span>Restore</span></button>
      </div>
      <button type="button" className="bulk-clear-selection" onClick={() => { setRowSelection({}); setStatusPickerOpen(false); }} disabled={pendingBulk}><X size={18} aria-hidden="true" /><span>Cancel</span></button>
      {statusPickerOpen ? <div id="bulk-status-options" className="bulk-status-options" role="group" aria-label="Set availability for selected vehicles">{Object.entries(statusLabels).map(([value, label]) => <button type="submit" key={value} name="operation" value={`status:${value}`} className="bulk-status-option" disabled={pendingBulk}><span className={`status-dot status-select-${value}`} aria-hidden="true" />{label}</button>)}</div> : null}
      {pendingBulk ? <span className="sr-only" role="status">Saving selected vehicles…</span> : null}
    </form> : null}
    {bulkState.error ? <p className="admin-feedback admin-error" role="alert">{bulkState.error}</p> : bulkState.ok ? <p className="admin-feedback" role="status">Selected vehicles updated.</p> : null}
    <div className="admin-table-wrap admin-inventory-desktop"><table className="admin-table inventory-table"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => { const sorted = header.column.getIsSorted(); return <th key={header.id} className={`col-${header.column.id}`} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}>{header.isPlaceholder ? null : header.column.getCanSort() ? <button type="button" className="table-sort" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{sorted === "asc" ? <ArrowUp size={12} /> : sorted === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} />}</button> : flexRender(header.column.columnDef.header, header.getContext())}</th>; })}</tr>)}</thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className={`${row.original.archived_at ? "archived-row" : ""}${row.getIsSelected() ? " selected-row" : ""}`}>{row.getVisibleCells().map((cell) => <td key={cell.id} className={`col-${cell.column.id}`}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={columns.length} className="table-empty">{emptyText}{filtered ? <> <button type="button" className="link-button" onClick={() => { setFilter(""); setColumnFilters([]); }}>Clear filters</button></> : null}</td></tr>}</tbody></table></div>
    <div className="admin-inventory-mobile">{rows.length ? rows.map((row) => { const vehicle = row.original; return <article key={vehicle.id} className={`inventory-mobile-card${vehicle.archived_at ? " archived-row" : ""}`}>
      <div className="inventory-mobile-heading"><label className="inventory-mobile-select"><input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} /><span className="sr-only">Select {vehicle.title}</span></label><Thumb vehicle={vehicle} size={80} /><div className="inventory-mobile-title"><Link href={`/admin/inventory/${vehicle.id}`}>{vehicle.title}</Link><span>{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" · ")}</span><strong className="tabular">{priceLabel(vehicle)}</strong></div></div>
      <div className="inventory-mobile-controls"><StatusSelect vehicle={vehicle} /><VisibilityToggle vehicle={vehicle} /><FeaturedToggle vehicle={vehicle} /></div>
      <RowActions vehicle={vehicle} />
    </article>; }) : <p className="table-empty">{emptyText}</p>}</div>
    <div className="table-pagination"><span>{table.getFilteredRowModel().rows.length} of {data.length} vehicles</span>{table.getPageCount() > 1 ? <div><button type="button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</button><span>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span><button type="button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</button></div> : null}</div>
  </>;
}
