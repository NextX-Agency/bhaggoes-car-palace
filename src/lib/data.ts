import { unstable_cache } from "next/cache";
import { cache } from "react";
import { defaultSettings, normalizeSiteSettings, type SiteSettings, type Vehicle, type VehicleFilters } from "@/lib/domain";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { searchTermGroups } from "@/lib/search";
import type { VehicleTemplate } from "@/lib/vehicle-templates";
import { r2VehicleImageUrl } from "@/lib/vehicle-image-url";

const PAGE_SIZE = 12;
const VEHICLE_WITH_MEDIA_SELECT = "*,vehicle_images(id, storage_path, alt_text, sort_order, is_cover, r2_ready),vehicle_features(features(name))";

export async function getAdminVehicleTemplates(): Promise<VehicleTemplate[]> {
  const client = await clientOrNull();
  if (!client) return [];
  const { data, error } = await client.from("vehicle_templates").select("id, name, fields").order("name");
  return error ? [] : (data ?? []) as VehicleTemplate[];
}

async function clientOrNull() {
  if (!hasSupabaseEnv()) return null;
  try { return await createClient(); } catch { return null; }
}

// Public reads go through a cookie-free client and unstable_cache so public pages can be static/ISR.
// Admin saves call updateTag() for these tags (see admin/actions.ts), so edits show up immediately;
// the revalidate windows below are only a safety net for changes made outside the admin (SQL, dashboard).
// Loaders throw on database errors so a failed refresh keeps the last good page instead of caching an empty one.
export const CACHE_TAGS = { settings: "settings", vehicles: "vehicles", faqs: "faqs", pages: "pages" } as const;
const REVALIDATE_SECONDS = 300;

function publicClient() {
  const client = createPublicClient();
  if (!client) throw new Error("Supabase environment variables are not configured.");
  return client;
}

const loadSettings = unstable_cache(async (): Promise<SiteSettings> => {
  const client = publicClient();
  const { data, error } = await client.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Unable to load site settings: ${error.message}`);
  if (!data) return defaultSettings;
  const settings = normalizeSiteSettings(data as Partial<SiteSettings>);
  settings.logo_url = settings.logo_path
    ? settings.logo_path.startsWith("http") ? settings.logo_path : client.storage.from("site-assets").getPublicUrl(settings.logo_path).data.publicUrl
    : null;
  settings.catalog_image_urls = settings.catalog_images.map((path) => path.startsWith("http") ? path : client.storage.from("site-assets").getPublicUrl(path).data.publicUrl);
  return settings;
}, ["site-settings"], { tags: [CACHE_TAGS.settings], revalidate: REVALIDATE_SECONDS });

// Read by the root layout, its metadata and most pages; cache() also dedupes it within one render.
export const getSettings = cache(async (): Promise<SiteSettings> => hasSupabaseEnv() ? loadSettings() : defaultSettings);

// The catalog switch in the settings hides every car from the public site. The database enforces the same rule
// (row level security), this check keeps the pages and caches consistent with it.
async function catalogHidden() {
  try { return (await getSettings()).catalog_hidden; } catch { return false; }
}

// The search columns are only used for filtering in the database; they are not sent on to the pages.
function withoutSearchColumns(row: Record<string, unknown>) {
  const copy = { ...row };
  delete copy.search_text; delete copy.search_vector;
  return copy;
}

function withEmbeddedMedia(rows: Record<string, unknown>[], publicImages = true): Vehicle[] {
  return rows.map((row) => {
    const { vehicle_images, vehicle_features, ...fields } = withoutSearchColumns(row);
    const images = ((vehicle_images ?? []) as { id: string; storage_path: string; alt_text: string | null; sort_order: number; is_cover: boolean; r2_ready: boolean }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({ ...image, url: image.storage_path.startsWith("/images/")
        ? image.storage_path
        : (publicImages && image.r2_ready && r2VehicleImageUrl(image.storage_path)) || `/api/vehicle-images/${image.storage_path.split("/").map(encodeURIComponent).join("/")}` }));
    const features = ((vehicle_features ?? []) as { features: { name: string } | null }[])
      .map((item) => item.features?.name).filter((name): name is string => Boolean(name));
    return { ...fields, images, features } as unknown as Vehicle;
  });
}

async function queryVehicles(filters: VehicleFilters) {
  try { return await runVehicleQuery(filters, true); }
  catch (error) {
    // Before the search migration is applied the search_text column does not exist yet; use the old full-text index.
    if (filters.search?.trim() && error instanceof Error && error.message === "search_text missing") return runVehicleQuery(filters, false);
    throw error;
  }
}

async function runVehicleQuery(filters: VehicleFilters, useSearchText: boolean) {
  const client = publicClient();
  const pageSize = Math.min(Math.max(filters.pageSize ?? PAGE_SIZE, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);
  const start = (page - 1) * pageSize;
  let query = client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT, { count: "exact" })
    .eq("published", true).is("archived_at", null);

  // Every word has to appear somewhere in the car's details (stock number, year, colour, options, price …).
  if (filters.search?.trim() && useSearchText) {
    for (const group of searchTermGroups(filters.search)) {
      query = group.length === 1 ? query.ilike("search_text", `%${group[0]}%`) : query.or(group.map((term) => `search_text.ilike."%${term}%"`).join(","));
    }
  } else if (filters.search?.trim()) query = query.textSearch("search_vector", filters.search.trim(), { type: "websearch", config: "simple" });
  if (filters.make) query = query.ilike("make", filters.make);
  if (filters.model) query = query.ilike("model", `%${filters.model}%`);
  if (filters.year) query = query.eq("year", filters.year);
  if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.availability) query = query.eq("availability", filters.availability);
  if (filters.fuel) query = query.eq("fuel_type", filters.fuel);
  if (filters.transmission) query = query.eq("transmission", filters.transmission);
  if (filters.bodyType) query = query.eq("body_type", filters.bodyType);
  if (filters.color) query = query.ilike("exterior_color", filters.color);
  if (filters.minMileage != null) query = query.gte("mileage", filters.minMileage);
  if (filters.maxMileage != null) query = query.lte("mileage", filters.maxMileage);

  const orderMap = {
    newest: ["created_at", false], oldest: ["created_at", true],
    "price-asc": ["price", true], "price-desc": ["price", false],
    "year-desc": ["year", false],
  } as const;
  const [column, ascending] = orderMap[filters.sort ?? "newest"] ?? orderMap.newest;
  query = query.order(column, { ascending, nullsFirst: false }).range(start, start + pageSize - 1);

  const { data, count, error } = await query;
  if (error?.code === "42703" && useSearchText) throw new Error("search_text missing");
  if (error || !data) throw new Error("Unable to load vehicles");
  return { vehicles: withEmbeddedMedia(data), total: count ?? 0, page, pageSize };
}

const loadVehicles = unstable_cache(queryVehicles, ["vehicle-list"], { tags: [CACHE_TAGS.vehicles], revalidate: REVALIDATE_SECONDS });

export async function getVehicles(filters: VehicleFilters = {}) {
  const empty = { vehicles: [] as Vehicle[], total: 0, page: filters.page ?? 1, pageSize: filters.pageSize ?? PAGE_SIZE };
  if (!hasSupabaseEnv() || await catalogHidden()) return empty;
  try {
    // Free-text searches are unbounded, so they are never cached (no cache-key growth); everything else is.
    return filters.search?.trim() || filters.model?.trim() ? await queryVehicles(filters) : await loadVehicles(filters);
  } catch { return empty; }
}

const loadFeaturedVehicles = unstable_cache(async (limit: number) => {
  const client = publicClient();
  const { data, error } = await client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT)
    .eq("published", true).eq("featured", true).is("archived_at", null)
    .order("created_at", { ascending: false }).limit(limit);
  if (error || !data) throw new Error("Unable to load featured vehicles");
  return withEmbeddedMedia(data);
}, ["vehicles-featured"], { tags: [CACHE_TAGS.vehicles], revalidate: REVALIDATE_SECONDS });

export async function getFeaturedVehicles(limit = 4) {
  return hasSupabaseEnv() && !await catalogHidden() ? loadFeaturedVehicles(limit) : [] as Vehicle[];
}

const loadRecentVehicles = unstable_cache(async (limit: number) => {
  const client = publicClient();
  const { data, error } = await client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT)
    .eq("published", true).is("archived_at", null)
    .order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 12));
  if (error || !data) throw new Error("Unable to load recent vehicles");
  return withEmbeddedMedia(data);
}, ["vehicles-recent"], { tags: [CACHE_TAGS.vehicles], revalidate: REVALIDATE_SECONDS });

export async function getRecentVehicles(limit = 4) {
  return hasSupabaseEnv() && !await catalogHidden() ? loadRecentVehicles(limit) : [] as Vehicle[];
}

const loadVehicleBySlug = unstable_cache(async (slug: string) => {
  const client = publicClient();
  const { data, error } = await client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT).eq("slug", slug)
    .eq("published", true).is("archived_at", null).maybeSingle();
  if (error) throw new Error("Unable to load vehicle");
  if (!data) return null;
  const [vehicle] = withEmbeddedMedia([data]);
  return vehicle;
}, ["vehicle-by-slug"], { tags: [CACHE_TAGS.vehicles], revalidate: REVALIDATE_SECONDS });

// Deduped within a render so generateMetadata and the page share one lookup.
export const getVehicleBySlug = cache(async (slug: string): Promise<Vehicle | null> => hasSupabaseEnv() && !await catalogHidden() ? loadVehicleBySlug(slug) : null);

const loadRelatedVehicles = unstable_cache(async (make: string, excludeId: string, limit: number) => {
  const client = publicClient();
  const { data, error } = await client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT)
    .eq("published", true).is("archived_at", null).ilike("make", make).neq("id", excludeId)
    .order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 12));
  if (error || !data) throw new Error("Unable to load related vehicles");
  return withEmbeddedMedia(data);
}, ["vehicles-related"], { tags: [CACHE_TAGS.vehicles], revalidate: REVALIDATE_SECONDS });

export async function getRelatedVehicles(make: string | null, excludeId: string, limit = 3) {
  return make && hasSupabaseEnv() && !await catalogHidden() ? loadRelatedVehicles(make, excludeId, limit) : [] as Vehicle[];
}

export async function getVehiclesByIds(ids: string[]) {
  const client = await clientOrNull();
  const safeIds = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
  if (!client || !safeIds.length || await catalogHidden()) return [] as Vehicle[];
  const { data, error } = await client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT).in("id", safeIds)
    .eq("published", true).is("archived_at", null);
  return error || !data ? [] : withEmbeddedMedia(data);
}

const loadVehicleFilterOptions = unstable_cache(async () => {
  const client = publicClient();
  const rows: { make: string | null; model: string | null; fuel_type: string | null; transmission: string | null; body_type: string | null; exterior_color: string | null }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from("vehicles")
      .select("make, model, fuel_type, transmission, body_type, exterior_color")
      .eq("published", true).is("archived_at", null)
      .order("id").range(offset, offset + 999);
    if (error) throw new Error("Unable to load filter options");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const distinct = (key: "make" | "fuel_type" | "transmission" | "body_type" | "exterior_color") =>
    Array.from(new Set(rows.map((row) => row[key]).filter((value): value is string => Boolean(value)))).sort();
  const makeCounts: Record<string, number> = {};
  const modelsByMake: Record<string, string[]> = {};
  for (const row of rows) {
    if (!row.make) continue;
    makeCounts[row.make] = (makeCounts[row.make] ?? 0) + 1;
    if (row.model && !modelsByMake[row.make]?.includes(row.model)) modelsByMake[row.make] = [...(modelsByMake[row.make] ?? []), row.model];
  }
  for (const models of Object.values(modelsByMake)) models.sort((a, b) => a.localeCompare(b));
  return { makes: distinct("make"), modelsByMake, fuels: distinct("fuel_type"), transmissions: distinct("transmission"), bodyTypes: distinct("body_type"), colors: distinct("exterior_color"), makeCounts };
}, ["vehicle-filter-options"], { tags: [CACHE_TAGS.vehicles], revalidate: REVALIDATE_SECONDS });

export async function getVehicleFilterOptions() {
  if (!hasSupabaseEnv() || await catalogHidden()) return { makes: [] as string[], modelsByMake: {} as Record<string, string[]>, fuels: [] as string[], transmissions: [] as string[], bodyTypes: [] as string[], colors: [] as string[], makeCounts: {} as Record<string, number> };
  return loadVehicleFilterOptions();
}

const loadPublishedPage = unstable_cache(async (slug: string) => {
  const { data, error } = await publicClient().from("content_pages").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  if (error) throw new Error("Unable to load page");
  return data;
}, ["content-page"], { tags: [CACHE_TAGS.pages], revalidate: 3600 });

export const getPublishedPage = cache(async (slug: string) => hasSupabaseEnv() ? loadPublishedPage(slug) : null);

const loadFaqs = unstable_cache(async () => {
  const { data, error } = await publicClient().from("faq_items").select("id, question, answer")
    .eq("published", true).order("sort_order", { ascending: true });
  if (error || !data) throw new Error("Unable to load FAQs");
  return data;
}, ["faq-items"], { tags: [CACHE_TAGS.faqs], revalidate: 3600 });

export async function getFaqs() {
  return hasSupabaseEnv() ? loadFaqs() : [];
}

export async function getAdminStats() {
  const client = await clientOrNull();
  if (!client) return null;
  const [vehicles, inquiries] = await Promise.all([
    client.from("vehicles").select("featured, published, archived_at"),
    client.from("inquiries").select("id, status", { count: "exact", head: true }).eq("status", "new"),
  ]);
  if (vehicles.error || !vehicles.data) return null;
  const active = vehicles.data.filter((vehicle) => !vehicle.archived_at);
  return {
    total: active.length,
    visible: active.filter((vehicle) => vehicle.published).length,
    featured: active.filter((vehicle) => vehicle.featured).length,
    newInquiries: inquiries.count ?? 0,
  };
}

export async function getAdminVehicles() {
  const client = await clientOrNull();
  if (!client) return [];
  const [{ data, error }, privateRows] = await Promise.all([
    client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT).order("updated_at", { ascending: false }),
    client.from("vehicle_private").select("vehicle_id, vin"),
  ]);
  if (error || !data) return [];
  // The chassis number is staff-only; it is added here so the inventory search can find it.
  const vins = new Map((privateRows.data ?? []).map((row) => [row.vehicle_id as string, row.vin as string | null]));
  return withEmbeddedMedia(data, false).map((vehicle) => ({ ...vehicle, vin: vins.get(vehicle.id) ?? null }));
}

export async function getAdminDashboardVehicles() {
  const client = await clientOrNull();
  if (!client) return [];
  const { data, error } = await client.from("vehicles")
    .select("id, title, make, model, published, availability, archived_at, price, cash_price, currency, year, fuel_type, transmission, body_type, seats, updated_at, vehicle_images(id, storage_path, is_cover, sort_order)")
    .is("archived_at", null)
    .order("updated_at", { ascending: false });
  return error || !data ? [] : data;
}

export async function getAdminDashboardNewInquiryCount() {
  const client = await clientOrNull();
  if (!client) return 0;
  const { count, error } = await client.from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return error ? 0 : count ?? 0;
}

export async function getAdminVehicle(id: string) {
  const client = await clientOrNull();
  if (!client) return null;
  const [vehicleResult, privateResult] = await Promise.all([
    client.from("vehicles").select(VEHICLE_WITH_MEDIA_SELECT).eq("id", id).maybeSingle(),
    client.from("vehicle_private").select("vin, admin_notes").eq("vehicle_id", id).maybeSingle(),
  ]);
  if (vehicleResult.error || !vehicleResult.data) return null;
  const [vehicle] = withEmbeddedMedia([vehicleResult.data], false);
  return { vehicle, privateDetails: privateResult.data ?? { vin: null, admin_notes: null } };
}

export async function getAdminInquiries() {
  const client = await clientOrNull();
  if (!client) return [];
  const { data, error } = await client.from("inquiries")
    .select("id, name, email, phone, message, vehicle_id, status, submitted_at, vehicles(title, slug)")
    .order("submitted_at", { ascending: false }).limit(250);
  return error || !data ? [] : data.map((row) => ({ ...row, vehicles: Array.isArray(row.vehicles) ? row.vehicles[0] ?? null : row.vehicles }));
}

export async function getAdminFaqs() {
  const client = await clientOrNull();
  if (!client) return [];
  const { data, error } = await client.from("faq_items").select("id, question, answer, sort_order, published")
    .order("sort_order", { ascending: true });
  return error || !data ? [] : data;
}

export async function getAdminPages() {
  const client = await clientOrNull();
  if (!client) return [];
  const { data, error } = await client.from("content_pages").select("slug, title, body, published, seo_title, seo_description");
  return error || !data ? [] : data;
}

const loadSitemapEntries = unstable_cache(async () => {
  const client = publicClient();
  const pageSize = 500;
  const baseQuery = () => client.from("vehicles")
    .select("slug, updated_at, stock_number", { count: "exact" })
    .eq("published", true).is("archived_at", null)
    .order("id", { ascending: true });
  const first = await baseQuery().range(0, pageSize - 1);
  if (first.error || !first.data) throw new Error("Unable to load vehicle sitemap entries");
  const pageCount = Math.ceil((first.count ?? first.data.length) / pageSize);
  const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
    baseQuery().range((index + 1) * pageSize, (index + 2) * pageSize - 1)));
  if (remaining.some((result) => result.error || !result.data)) throw new Error("Unable to load all vehicle sitemap entries");
  return [first.data, ...remaining.map((result) => result.data ?? [])]
    .flat().filter((vehicle) => !vehicle.stock_number?.startsWith("DEMO-"))
    .map((vehicle) => ({ slug: vehicle.slug as string, updated_at: vehicle.updated_at as string }));
}, ["vehicle-sitemap"], { tags: [CACHE_TAGS.vehicles], revalidate: REVALIDATE_SECONDS });

export async function getPublicVehicleSitemapEntries() {
  return hasSupabaseEnv() && !await catalogHidden() ? loadSitemapEntries() : [];
}

// Slugs to pre-render at build time. Never fails the build; every other car renders on its first request.
export async function getVehicleSlugsForBuild(limit = 24) {
  try {
    const client = createPublicClient();
    if (!client) return [];
    const { data } = await client.from("vehicles").select("slug").eq("published", true).is("archived_at", null)
      .order("created_at", { ascending: false }).limit(limit);
    return (data ?? []).map((row) => row.slug as string);
  } catch { return []; }
}

export type AdminUser = { id: string; email: string; display_name: string | null; role: "admin" | "staff"; created_at: string; last_sign_in_at: string | null; must_change_password: boolean };

/** Every login account, for the Gebruikers page. `ready` is false until the user-management migration is applied. */
export async function getAdminUsers(): Promise<{ users: AdminUser[]; ready: boolean }> {
  const client = await clientOrNull();
  if (!client) return { users: [], ready: false };
  const { data, error } = await client.rpc("admin_list_users");
  if (error) return { users: [], ready: error.code !== "PGRST202" && error.code !== "42883" };
  return { users: (data ?? []) as AdminUser[], ready: true };
}
