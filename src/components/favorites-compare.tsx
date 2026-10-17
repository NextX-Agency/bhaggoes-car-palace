"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, X } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { availabilityLabels, coverImage, formatAmount, formatMileage } from "@/lib/domain";
import { EmptyState } from "@/components/empty-state";
import { VehicleGrid } from "@/components/vehicle-grid";
import { COMPARE_KEY, emptyBrowserSnapshot, FAVORITES_KEY, parseStoredIds, readBrowserSnapshot, subscribeToBrowserStore, writeStoredIds } from "@/lib/browser-store";
type Mode = "favorites" | "compare";

function useSavedCars(mode: Mode) {
  const key = mode === "favorites" ? FAVORITES_KEY : COMPARE_KEY;
  const snapshot = useSyncExternalStore(subscribeToBrowserStore, () => readBrowserSnapshot(key), emptyBrowserSnapshot);
  const ids = parseStoredIds(snapshot, mode === "favorites" ? 100 : 3);
  const signature = ids.join(",");
  const [loaded, setLoaded] = useState<{ signature: string; vehicles: Vehicle[] } | null>(null);
  useEffect(() => {
    if (!signature) return;
    const controller = new AbortController();
    const orderedIds = signature.split(",");
    fetch(`/api/vehicles?ids=${encodeURIComponent(signature)}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<{ vehicles?: Vehicle[] }>)
      .then((payload) => {
        const byId = new Map((payload.vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));
        setLoaded({ signature, vehicles: orderedIds.map((id) => byId.get(id)).filter((vehicle): vehicle is Vehicle => Boolean(vehicle)) });
      })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setLoaded({ signature, vehicles: [] }); });
    return () => controller.abort();
  }, [mode, signature]);
  const ready = !signature || loaded?.signature === signature;
  return { vehicles: signature && loaded?.signature === signature ? loaded.vehicles : [], ready, ids };
}

export function SavedCars({ mode }: { mode: Mode }) {
  const { vehicles, ready, ids } = useSavedCars(mode);
  const favoriteMode = mode === "favorites";
  if (!ready) return <div className="vehicle-grid" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div className="skeleton-card" key={index}><span className="skeleton" /><span className="skeleton skeleton-line w-40" /><span className="skeleton skeleton-line w-70" /></div>)}</div>;
  if (!vehicles.length) return <EmptyState title={favoriteMode ? "No saved cars yet" : "Nothing to compare yet"} text={favoriteMode ? "Tap the heart on any car to save it on this device." : "Add up to three cars with the compare button on each listing."} href="/cars" action="Browse cars" />;
  if (favoriteMode) return <VehicleGrid vehicles={vehicles} />;
  const rows: [string, (vehicle: Vehicle) => string][] = [
    ["Interne prijs", (v) => formatAmount(v.price, v.currency)], ["Cashprijs", (v) => v.cash_price == null ? "—" : formatAmount(v.cash_price, v.currency)], ["Year", (v) => v.year?.toString() ?? "—"], ["Mileage", (v) => formatMileage(v.mileage) ?? "—"],
    ["Engine", (v) => v.engine_capacity ?? "—"], ["Transmission", (v) => v.transmission ?? "—"], ["Fuel", (v) => v.fuel_type ?? "—"], ["Body type", (v) => v.body_type ?? "—"], ["Condition", (v) => v.condition === "new" ? "New" : "Used"], ["Availability", (v) => availabilityLabels[v.availability]], ["Features", (v) => v.features.join(", ") || "—"],
  ];
  return <div className="compare-scroll"><table className="compare-table"><thead><tr><th scope="col"><span className="sr-only">Detail</span></th>{vehicles.map((vehicle) => { const image = coverImage(vehicle.images); return <th key={vehicle.id} scope="col"><button className="compare-remove" type="button" onClick={() => writeStoredIds(COMPARE_KEY, ids.filter((id) => id !== vehicle.id))} aria-label={`Remove ${vehicle.title} from comparison`}><X size={15} /></button><Link href={`/cars/${vehicle.slug}`} className="compare-car-image" tabIndex={-1} aria-hidden="true">{image?.url ? <Image src={image.url} alt="" fill sizes="280px" /> : null}</Link><strong>{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}</strong><Link className="text-link" href={`/cars/${vehicle.slug}`}>View car <ArrowRight size={14} /></Link></th>; })}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{vehicles.map((vehicle) => <td key={vehicle.id}>{value(vehicle)}</td>)}</tr>)}</tbody></table></div>;
}
