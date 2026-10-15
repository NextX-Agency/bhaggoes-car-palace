import { defaultSettings, type SiteSettings, type Vehicle, type VehicleFilters } from "@/lib/domain";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

async function clientOrNull() {
  if (!hasSupabaseEnv()) return null;
  try { return await createClient(); } catch { return null; }
}

export async function getSettings(): Promise<SiteSettings> {
  const client = await clientOrNull();
  if (!client) return defaultSettings;
  const { data, error } = await client.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return defaultSettings;
  const settings = { ...defaultSettings, ...data } as SiteSettings;
  settings.logo_url = settings.logo_path
    ? settings.logo_path.startsWith("http") ? settings.logo_path : client.storage.from("site-assets").getPublicUrl(settings.logo_path).data.publicUrl
    : null;
  return settings;
}

async function attachVehicleMedia(rows: Record<string, unknown>[], client: Awaited<ReturnType<typeof createClient>>) {
  if (!rows.length) return [] as Vehicle[];
  const ids = rows.map((row) => row.id as string);
  const [imageResult, featureResult] = await Promise.all([
    client.from("vehicle_images").select("id, vehicle_id, storage_path, alt_text, sort_order, is_cover")
      .in("vehicle_id", ids).order("sort_order", { ascending: true }),
    client.from("vehicle_features").select("vehicle_id, feature_id, features(name)")
      .in("vehicle_id", ids),
  ]);

  const images = imageResult.data ?? [];
  const byVehicle = new Map<string, typeof images>();
  for (const image of images) byVehicle.set(image.vehicle_id, [...(byVehicle.get(image.vehicle_id) ?? []), image]);
  const byFeature = new Map<string, string[]>();
  for (const row of featureResult.data ?? []) {
    const relation = row.features as unknown as { name: string } | null;
    if (relation?.name) byFeature.set(row.vehicle_id, [...(byFeature.get(row.vehicle_id) ?? []), relation.name]);
  }

  return rows.map((row) => ({
    ...row,
    images: (byVehicle.get(row.id as string) ?? []).map((image) => ({
      id: image.id,
      storage_path: image.storage_path,
      alt_text: image.alt_text,
      sort_order: image.sort_order,
      is_cover: image.is_cover,
      url: `/api/vehicle-images/${image.storage_path.split("/").map(encodeURIComponent).join("/")}`,
    })),
    features: byFeature.get(row.id as string) ?? [],
  })) as unknown as Vehicle[];
}

export async function getVehicles(filters: VehicleFilters = {}) {
  const client = await clientOrNull();
  if (!client) return { vehicles: [] as Vehicle[], total: 0, page: filters.page ?? 1, pageSize: filters.pageSize ?? PAGE_SIZE };

  const pageSize = Math.min(Math.max(filters.pageSize ?? PAGE_SIZE, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);
  const start = (page - 1) * pageSize;
  let query = client.from("vehicles").select("*", { count: "exact" })
    .eq("published", true).is("archived_at", null);

  if (filters.search?.trim()) query = query.textSearch("search_vector", filters.search.trim(), { type: "websearch", config: "simple" });
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
  if (filters.minMileage != null) query = query.gte("mileage", filters.minMileage);
  if (filters.maxMileage != null) query = query.lte("mileage", filters.maxMileage);

  const orderMap = {
    newest: ["created_at", false], oldest: ["created_at", true],
    "price-asc": ["price", true], "price-desc": ["price", false],
    "year-desc": ["year", false], "mileage-asc": ["mileage", true],
  } as const;
  const [column, ascending] = orderMap[filters.sort ?? "newest"] ?? orderMap.newest;
  query = query.order(column, { ascending, nullsFirst: false }).range(start, start + pageSize - 1);

  const { data, count, error } = await query;
  if (error || !data) return { vehicles: [] as Vehicle[], total: 0, page, pageSize };
  return { vehicles: await attachVehicleMedia(data, client), total: count ?? 0, page, pageSize };
}

export async function getFeaturedVehicles(limit = 4) {
  const client = await clientOrNull();
  if (!client) return [] as Vehicle[];
  const { data, error } = await client.from("vehicles").select("*")
    .eq("published", true).eq("featured", true).is("archived_at", null)
    .order("created_at", { ascending: false }).limit(limit);
  return error || !data ? [] : attachVehicleMedia(data, client);
}

export async function getRecentVehicles(limit = 4) {
  const client = await clientOrNull();
  if (!client) return [] as Vehicle[];
  const { data, error } = await client.from("vehicles").select("*")
    .eq("published", true).is("archived_at", null)
    .order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 12));
  return error || !data ? [] : attachVehicleMedia(data, client);
}

export async function getVehicleBySlug(slug: string) {
  const client = await clientOrNull();
  if (!client) return null;
  const { data, error } = await client.from("vehicles").select("*").eq("slug", slug)
    .eq("published", true).is("archived_at", null).maybeSingle();
  if (error || !data) return null;
  const [vehicle] = await attachVehicleMedia([data], client);
  return vehicle;
}

export async function getVehiclesByIds(ids: string[]) {
  const client = await clientOrNull();
  const safeIds = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
  if (!client || !safeIds.length) return [] as Vehicle[];
  const { data, error } = await client.from("vehicles").select("*").in("id", safeIds)
    .eq("published", true).is("archived_at", null);
  return error || !data ? [] : attachVehicleMedia(data, client);
}

export async function getVehicleFilterOptions() {
  const client = await clientOrNull();
  if (!client) return { makes: [], fuels: [], transmissions: [], bodyTypes: [] };
  const { data } = await client.from("vehicles")
    .select("make, fuel_type, transmission, body_type")
    .eq("published", true).is("archived_at", null).limit(1000);
  const distinct = (key: "make" | "fuel_type" | "transmission" | "body_type") =>
    Array.from(new Set((data ?? []).map((row) => row[key]).filter((value): value is string => Boolean(value)))).sort();
  return { makes: distinct("make"), fuels: distinct("fuel_type"), transmissions: distinct("transmission"), bodyTypes: distinct("body_type") };
}

export async function getPublishedPage(slug: string) {
  const client = await clientOrNull();
  if (!client) return null;
  const { data, error } = await client.from("content_pages").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  return error ? null : data;
}

export async function getFaqs() {
  const client = await clientOrNull();
  if (!client) return [];
  const { data, error } = await client.from("faq_items").select("id, question, answer")
    .eq("published", true).order("sort_order", { ascending: true });
  return error || !data ? [] : data;
}

export async function getAdminStats() {
  const client = await clientOrNull();
  if (!client) return null;
  const [vehicles, inquiries] = await Promise.all([
    client.from("vehicles").select("availability, featured, published, archived_at"),
    client.from("inquiries").select("id, status", { count: "exact", head: true }).eq("status", "new"),
  ]);
  if (vehicles.error || !vehicles.data) return null;
  const active = vehicles.data.filter((vehicle) => !vehicle.archived_at);
  return {
    total: active.length,
    available: active.filter((vehicle) => vehicle.availability === "available").length,
    reserved: active.filter((vehicle) => vehicle.availability === "reserved").length,
    sold: active.filter((vehicle) => vehicle.availability === "sold").length,
    onTheWay: active.filter((vehicle) => vehicle.availability === "on_the_way").length,
    featured: active.filter((vehicle) => vehicle.featured).length,
    newInquiries: inquiries.count ?? 0,
  };
}

export async function getAdminVehicles() {
  const client = await clientOrNull();
  if (!client) return [];
  const { data, error } = await client.from("vehicles").select("*")
    .order("updated_at", { ascending: false });
  return error || !data ? [] : attachVehicleMedia(data, client);
}

export async function getAdminVehicle(id: string) {
  const client = await clientOrNull();
  if (!client) return null;
  const [vehicleResult, privateResult] = await Promise.all([
    client.from("vehicles").select("*").eq("id", id).maybeSingle(),
    client.from("vehicle_private").select("vin, admin_notes").eq("vehicle_id", id).maybeSingle(),
  ]);
  if (vehicleResult.error || !vehicleResult.data) return null;
  const [vehicle] = await attachVehicleMedia([vehicleResult.data], client);
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
