import type { MetadataRoute } from "next";
import { getPublicVehicleSitemapEntries, getSettings, getVehicleFilterOptions } from "@/lib/data";
import { absoluteUrl } from "@/lib/site-url";

// Built from tagged caches, so it is static and refreshes when an admin saves (or at most every 5 minutes).
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vehicles, settings, options] = await Promise.all([getPublicVehicleSitemapEntries(), getSettings(), getVehicleFilterOptions()]);
  const timestamps = vehicles.map((vehicle) => new Date(vehicle.updated_at).getTime()).filter(Number.isFinite);
  const inventoryUpdated = timestamps.length ? new Date(Math.max(...timestamps)) : undefined;
  const settingsUpdated = settings.updated_at ? new Date(settings.updated_at) : undefined;

  // lastModified is only set where it is known; a fresh "now" on every request would teach crawlers to ignore it.
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: inventoryUpdated, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/cars"), lastModified: inventoryUpdated, changeFrequency: "daily", priority: 0.9 },
    // One landing page per make in stock (indexable via the canonical set in cars/page.tsx).
    ...options.makes.filter((make) => options.makeCounts[make]).map((make) => ({ url: absoluteUrl(`/cars?make=${encodeURIComponent(make)}`), lastModified: inventoryUpdated, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: absoluteUrl("/contact"), lastModified: settingsUpdated, changeFrequency: "monthly", priority: 0.6 },
    ...(settings.financing_enabled ? [{ url: absoluteUrl("/financing"), lastModified: settingsUpdated, changeFrequency: "monthly" as const, priority: 0.6 }] : []),
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];
  return [
    ...pages,
    ...vehicles.map((vehicle) => ({ url: absoluteUrl(`/cars/${vehicle.slug}`), lastModified: new Date(vehicle.updated_at), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
