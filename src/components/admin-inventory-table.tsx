"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ArrowUpDown, Copy, Plus, Search } from "lucide-react";
import { duplicateVehicleAction, updateVehicleAction } from "@/app/admin/actions";

export type AdminVehicle = { id: string; slug: string; title: string; make: string; model: string; year: number | null; price: number | null; currency: string | null; availability: string; featured: boolean; published: boolean; archived_at: string | null; updated_at: string };
const col = createColumnHelper<AdminVehicle>();
const statusLabels: Record<string, string> = { available: "Available", on_the_way: "On the way", reserved: "Reserved", sold: "Sold", rental: "Rental" };

export function AdminInventoryTable({ data }: { data: AdminVehicle[] }) {
  const [sorting, setSorting] = useState<SortingState>([]); const [filter, setFilter] = useState("");
  const columns = useMemo(() => [
    col.accessor("title", { header: "Vehicle", cell: (info) => <Link href={`/admin/inventory/${info.row.original.id}`} className="vehicle-admin-link">{info.getValue()}<small>{info.row.original.year ?? "Year not set"} · {info.row.original.make}</small></Link> }),
    col.accessor("price", { header: "Price", cell: (info) => info.getValue() == null ? "On request" : `${info.row.original.currency ?? ""} ${new Intl.NumberFormat().format(info.getValue()!)}` }),
    col.accessor("availability", { header: "Status", cell: (info) => <form action={updateVehicleAction}><input type="hidden" name="id" value={info.row.original.id} /><select className="status-select" name="availability" aria-label={`Change status for ${info.row.original.title}`} defaultValue={info.getValue()} onChange={(event) => event.currentTarget.form?.requestSubmit()}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></form> }),
    col.accessor("published", { header: "Visibility", cell: (info) => <form action={updateVehicleAction}><input type="hidden" name="id" value={info.row.original.id} /><input type="hidden" name="published" value={String(!info.getValue())} /><button className={`admin-badge ${info.getValue() ? "" : "draft"}`} type="submit">{info.getValue() ? "Published" : "Draft"}</button></form> }),
    col.accessor("updated_at", { header: "Updated", cell: (info) => new Date(info.getValue()).toLocaleDateString() }),
    col.display({ id: "actions", header: "Actions", cell: (info) => <div className="admin-row-actions"><Link href={`/admin/inventory/${info.row.original.id}`}>Edit</Link><form action={duplicateVehicleAction}><input type="hidden" name="id" value={info.row.original.id} /><button type="submit" title="Duplicate vehicle"><Copy size={14} /></button></form></div> }),
  ], []);
  // TanStack Table intentionally exposes imperative table methods for the table renderer.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, state: { sorting, globalFilter: filter }, onSortingChange: setSorting, onGlobalFilterChange: setFilter, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel() });
  return <><div className="inventory-table-toolbar"><label><Search size={16} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search your inventory" /></label><Link className="button button-dark" href="/admin/inventory/new"><Plus size={16} /> Add car</Link></div><div className="admin-table-wrap"><table className="admin-table"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}>{header.isPlaceholder ? null : <button className="table-sort" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getCanSort() ? <ArrowUpDown size={11} /> : null}</button>}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>) : <tr><td colSpan={columns.length} className="table-empty">No vehicles yet. Add the dealership&apos;s first listing to get started.</td></tr>}</tbody></table></div><div className="table-pagination"><span>{table.getFilteredRowModel().rows.length} vehicles</span><div><button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>← Previous</button><span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span><button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next →</button></div></div></>;
}
