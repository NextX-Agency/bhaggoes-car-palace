"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { availabilityLabels, formatAmount } from "@/lib/domain";
import { VehicleActions } from "@/components/vehicle-actions";
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
  if (!ready) return <div className="container page-wrap"><div className="skeleton skeleton-panel" /></div>;
  if (!vehicles.length) return <div className="container page-wrap"><div className="empty-state"><span className="empty-icon" aria-hidden="true">♡</span><h2>{favoriteMode ? "No saved cars yet" : "Start your comparison"}</h2><p>{favoriteMode ? "Tap the heart on a car to keep it here while you browse." : "Add two or three cars to compare their key details side by side."}</p><Link className="button button-dark" href="/cars">Browse inventory <ArrowUpRight size={16} /></Link></div></div>;
  if (favoriteMode) return <div className="container page-wrap"><div className="vehicle-grid">{vehicles.map((vehicle) => <VehicleSavedCard key={vehicle.id} vehicle={vehicle} />)}</div></div>;
  const rows: [string, (vehicle: Vehicle) => string][] = [
    ["Price", (v) => formatAmount(v.price, v.currency)], ["Year", (v) => v.year?.toString() ?? "—"], ["Mileage", (v) => v.mileage == null ? "—" : `${new Intl.NumberFormat().format(v.mileage)} km`],
    ["Engine", (v) => v.engine_capacity ?? "—"], ["Transmission", (v) => v.transmission ?? "—"], ["Fuel", (v) => v.fuel_type ?? "—"], ["Body type", (v) => v.body_type ?? "—"], ["Condition", (v) => v.condition], ["Availability", (v) => availabilityLabels[v.availability]], ["Features", (v) => v.features.join(", ") || "—"],
  ];
  return <div className="container page-wrap"><div className="compare-scroll"><table className="compare-table"><thead><tr><th>Compare</th>{vehicles.map((vehicle) => <th key={vehicle.id}><button className="compare-remove" onClick={() => writeStoredIds(COMPARE_KEY, ids.filter((id) => id !== vehicle.id))} aria-label={`Remove ${vehicle.title}`}><X size={14} /></button><Link href={`/cars/${vehicle.slug}`} className="compare-car-image">{vehicle.images[0]?.url ? <Image src={vehicle.images[0].url} alt="" fill sizes="240px" /> : <span className="car-mark">B</span>}</Link><strong>{vehicle.title}</strong><Link className="text-link" href={`/cars/${vehicle.slug}`}>View details <ArrowUpRight size={13} /></Link><VehicleActions vehicleId={vehicle.id} /></th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{vehicles.map((vehicle) => <td key={vehicle.id}>{value(vehicle)}</td>)}</tr>)}</tbody></table></div></div>;
}

function VehicleSavedCard({ vehicle }: { vehicle: Vehicle }) {
  return <article className="vehicle-card"><div className="vehicle-card-media"><Link href={`/cars/${vehicle.slug}`}>{vehicle.images[0]?.url ? <Image src={vehicle.images[0].url} alt="" fill sizes="(max-width: 700px) 90vw, 30vw" className="vehicle-photo" /> : <div className="vehicle-image-empty"><span className="car-mark">B</span><span>No photo available</span></div>}</Link><VehicleActions vehicleId={vehicle.id} compact /></div><div className="vehicle-card-body"><p className="eyebrow">{vehicle.year ?? ""} · {vehicle.make}</p><h3><Link href={`/cars/${vehicle.slug}`}>{vehicle.title}</Link></h3><strong>{formatAmount(vehicle.price, vehicle.currency)}</strong></div></article>;
}
