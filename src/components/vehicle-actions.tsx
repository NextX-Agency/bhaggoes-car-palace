"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowLeftRight, Heart } from "lucide-react";
import { COMPARE_KEY, emptyBrowserSnapshot, parseStoredIds, readBrowserSnapshot, subscribeToBrowserStore, writeStoredIds } from "@/lib/browser-store";
import { FAVORITES_KEY } from "@/lib/browser-store";

export function VehicleActions({ vehicleId, compact = false, name }: { vehicleId: string; compact?: boolean; name?: string }) {
  const suffix = name ? ` ${name}` : " car";
  const favoritesSnapshot = useSyncExternalStore(subscribeToBrowserStore, () => readBrowserSnapshot(FAVORITES_KEY), emptyBrowserSnapshot);
  const compareSnapshot = useSyncExternalStore(subscribeToBrowserStore, () => readBrowserSnapshot(COMPARE_KEY), emptyBrowserSnapshot);
  const favorites = parseStoredIds(favoritesSnapshot, 100);
  const compare = parseStoredIds(compareSnapshot, 3);
  const [notice, setNotice] = useState("");

  function toggleFavorite() {
    const next = favorites.includes(vehicleId) ? favorites.filter((id) => id !== vehicleId) : [...favorites, vehicleId].slice(-100);
    writeStoredIds(FAVORITES_KEY, next);
  }
  function toggleCompare() {
    if (compare.includes(vehicleId)) {
      const next = compare.filter((id) => id !== vehicleId); writeStoredIds(COMPARE_KEY, next); setNotice("Removed from comparison");
    } else if (compare.length >= 3) setNotice("Compare up to three cars at a time");
    else { const next = [...compare, vehicleId]; writeStoredIds(COMPARE_KEY, next); setNotice("Added to comparison"); }
    window.setTimeout(() => setNotice(""), 2600);
  }
  return <div className={`vehicle-actions${compact ? " compact" : ""}`}>
    <button type="button" className={`action-round${favorites.includes(vehicleId) ? " is-active" : ""}`} onClick={toggleFavorite} aria-label={favorites.includes(vehicleId) ? `Remove${suffix} from saved cars` : `Save${suffix}`} aria-pressed={favorites.includes(vehicleId)}><Heart size={compact ? 17 : 16} fill={favorites.includes(vehicleId) ? "currentColor" : "none"} />{compact ? null : <span>{favorites.includes(vehicleId) ? "Saved" : "Save"}</span>}</button>
    <button type="button" className={`action-round compare${compare.includes(vehicleId) ? " is-active" : ""}`} onClick={toggleCompare} aria-label={compare.includes(vehicleId) ? `Remove${suffix} from comparison` : `Compare${suffix}`} aria-pressed={compare.includes(vehicleId)}><ArrowLeftRight size={compact ? 16 : 15} />{compact ? null : <span>{compare.includes(vehicleId) ? "Comparing" : "Compare"}</span>}</button>
    <span role="status" className="sr-only">{notice}</span>
  </div>;
}
