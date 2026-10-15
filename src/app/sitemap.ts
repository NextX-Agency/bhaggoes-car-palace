import type { MetadataRoute } from "next";
import { getSettings, getVehicles } from "@/lib/data";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [first, settings] = await Promise.all([getVehicles({ page: 1, pageSize: 48 }), getSettings()]);
  const pages = Math.ceil(first.total / first.pageSize);
  const remaining = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => getVehicles({ page: index + 2, pageSize: 48 })));
  const vehicles = [first.vehicles, ...remaining.map((result) => result.vehicles)].flat();
  const staticRoutes = ["", "/cars", "/about", "/contact", ...(settings.financing_enabled ? ["/financing"] : []), "/faq", "/privacy", "/terms"];
  return [...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date() })), ...vehicles.map((vehicle) => ({ url: `${base}/cars/${vehicle.slug}`, lastModified: new Date(vehicle.updated_at) }))];
}
