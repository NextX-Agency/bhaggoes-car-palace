import type { MetadataRoute } from "next";
import { getPublicVehicleSitemapEntries, getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [vehicles, settings] = await Promise.all([getPublicVehicleSitemapEntries(), getSettings()]);
  const staticRoutes = ["", "/cars", "/contact", ...(settings.financing_enabled ? ["/financing"] : []), "/faq", "/privacy", "/terms"];
  return [...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date() })), ...vehicles.map((vehicle) => ({ url: `${base}/cars/${vehicle.slug}`, lastModified: new Date(vehicle.updated_at) }))];
}
