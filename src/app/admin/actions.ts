"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import { safeExternalUrl, slugify } from "@/lib/domain";
import { listingTitle } from "@/lib/vehicle-templates";
import { getAdminVehicle, getSettings } from "@/lib/data";
import { clearFailures, clientAddress, isThrottled, recordFailure } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site-url";
import { buildWindowSticker, type WindowStickerData } from "@/lib/window-sticker";
import { claimStickerUse, STICKER_BUCKET, stickerUsesLeft } from "@/lib/window-sticker-quota";
import { createClient } from "@/lib/supabase/server";
import { mirrorSiteAsset, mirrorVehicleImage, r2Configured } from "@/lib/r2-images";

type ActionState = { error?: string; ok?: boolean };
const AVAILABILITY = ["available", "on_the_way", "reserved", "sold", "rental"];

// Turns the first zod issue into a short Dutch sentence that names the field instead of showing zod's English default.
type Issue = { path: PropertyKey[]; code: string; message: string; origin?: string };
function fieldError(issue: Issue | undefined, labels: Record<string, string>, fallback: string) {
  if (!issue) return fallback;
  if (issue.code === "custom") return issue.message;
  const label = labels[issue.path.map(String).join(".")] ?? labels[String(issue.path[issue.path.length - 1] ?? "")];
  if (!label) return fallback;
  if (issue.code === "too_big") return `${label} is te lang of te hoog.`;
  if (issue.code === "too_small") return issue.origin === "string" || issue.origin === "array" ? `${label} is te kort of ontbreekt.` : `${label} is te laag.`;
  if (issue.code === "invalid_format") return `${label} heeft geen geldige notatie.`;
  return `${label}: vul een geldige waarde in.`;
}

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Je sessie is verlopen. Log opnieuw in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Beheerderstoegang is vereist.");
  return supabase;
}

// Expires the public caches in lib/data.ts (same tag names) so saved changes show on the site immediately.
function expirePublicCache(...tags: ("settings" | "vehicles" | "faqs" | "pages")[]) {
  for (const tag of tags) updateTag(tag);
}

// The photo editor writes images straight to Supabase from the browser, so it calls this once its changes are done.
export async function refreshPublicInventoryAction(vehicleId?: string): Promise<ActionState & { remaining?: number }> {
  try {
    const supabase = await verifyAdmin();
    let remaining = 0;
    if (r2Configured) {
      if (vehicleId && !z.string().uuid().safeParse(vehicleId).success) throw new Error("Ongeldige auto.");
      const { data: vehicles, error: vehicleError } = await (vehicleId
        ? supabase.from("vehicles").select("id").eq("id", vehicleId).eq("published", true).is("archived_at", null)
        : supabase.from("vehicles").select("id").eq("published", true).is("archived_at", null));
      if (vehicleError) throw vehicleError;
      const ids = (vehicles ?? []).map((vehicle) => vehicle.id);
      if (ids.length) {
        const { data, error } = await supabase.from("vehicle_images").select("id, vehicle_id, storage_path, r2_ready")
          .in("vehicle_id", ids).eq("r2_ready", false).not("storage_path", "like", "/images/%").limit(4);
        if (error) throw error;
        if (data?.length) {
          const result = await syncR2ImageRows(supabase, data);
          if (result.failedIds.length) throw new Error("Enkele foto’s konden nog niet via Cloudflare worden geladen. Ze blijven voorlopig via de bestaande route beschikbaar.");
        }
        if (vehicleId) {
          const count = await supabase.from("vehicle_images").select("id", { count: "exact", head: true })
            .eq("vehicle_id", vehicleId).eq("r2_ready", false).not("storage_path", "like", "/images/%");
          if (count.error) throw count.error;
          remaining = count.count ?? 0;
        }
      }
    }
    expirePublicCache("vehicles"); return { ok: true, remaining };
  }
  catch (error) { return { error: error instanceof Error ? error.message : "De website kon niet worden bijgewerkt." }; }
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (value: string) => value || null;
const optionalNumber = (value: string) => value === "" ? null : Number(value);

const templateFieldsSchema = z.object({
  make: z.string().max(80).optional(),
  model: z.string().max(100).optional(),
  variant: z.string().max(120).optional(),
  engine_capacity: z.string().max(50).optional(),
  fuel_type: z.string().max(50).optional(),
  transmission: z.string().max(50).optional(),
  drive_type: z.string().max(50).optional(),
  body_type: z.string().max(50).optional(),
  exterior_color: z.string().max(50).optional(),
  interior_color: z.string().max(50).optional(),
  seats: z.string().regex(/^(|[1-9][0-9]?)$/).optional(),
  doors: z.string().regex(/^(|[1-9][0-9]?)$/).optional(),
  condition: z.enum(["new", "used"]).optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(60),
});

export async function saveVehicleTemplateAction(form: FormData): Promise<ActionState & { id?: string }> {
  try {
    const supabase = await verifyAdmin();
    const name = z.string().trim().min(2).max(80).safeParse(text(form, "name"));
    let raw: unknown;
    try { raw = JSON.parse(text(form, "fields")); } catch { return { error: "Uitvoeringsgegevens kunnen niet worden gelezen." }; }
    const fields = templateFieldsSchema.safeParse(raw);
    if (!name.success || !fields.success) return { error: "Controleer de naam en de voertuiggegevens van de uitvoering." };
    const { data, error } = await supabase.from("vehicle_templates").insert({ name: name.data, fields: fields.data }).select("id").single();
    if (error || !data) return { error: error?.code === "23505" ? "Er bestaat al een uitvoering met deze naam." : "De uitvoering kon niet worden opgeslagen." };
    revalidatePath("/admin/inventory/new");
    return { ok: true, id: data.id };
  } catch (error) { return { error: error instanceof Error ? error.message : "De uitvoering kon niet worden opgeslagen." }; }
}

export async function deleteVehicleTemplateAction(form: FormData): Promise<ActionState> {
  try {
    const id = z.string().uuid().safeParse(text(form, "id"));
    if (!id.success) return { error: "Kies een geldige uitvoering." };
    const supabase = await verifyAdmin();
    const { error } = await supabase.from("vehicle_templates").delete().eq("id", id.data);
    if (error) return { error: "De uitvoering kon niet worden verwijderd." };
    revalidatePath("/admin/inventory/new");
    return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De uitvoering kon niet worden verwijderd." }; }
}

export async function signInAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) }).safeParse({ email: text(form, "email"), password: String(form.get("password") ?? "") });
  if (!parsed.success) return { error: "Vul een geldig e-mailadres en wachtwoord in." };
  // Throttle password guessing per account and per address (best effort, per server instance).
  const emailKey = `login:email:${parsed.data.email.toLowerCase()}`; const addressKey = `login:ip:${await clientAddress()}`;
  if (isThrottled(emailKey, 5) || isThrottled(addressKey, 20)) return { error: "Te veel mislukte pogingen. Wacht 15 minuten en probeer het opnieuw." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) { recordFailure(emailKey, 15 * 60_000); recordFailure(addressKey, 15 * 60_000); return { error: "Deze inloggegevens kloppen niet." }; }
    clearFailures(emailKey);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
    if (profile?.role !== "admin") { await supabase.auth.signOut(); return { error: "Dit account heeft geen beheerderstoegang." }; }
  } catch { return { error: "Inloggen is nog niet ingesteld. Voeg de Supabase-projectinstellingen toe en probeer het opnieuw." }; }
  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const vehicleFieldLabels: Record<string, string> = { title: "De titel", make: "Het merk", model: "Het model", variant: "De variant", year: "Het bouwjaar", price: "De interne prijs", cash_price: "De cashprijs", currency: "De valuta", mileage: "De kilometerstand", engine_capacity: "De motorinhoud", fuel_type: "De brandstof", transmission: "De transmissie", drive_type: "De aandrijving", body_type: "De carrosserie", exterior_color: "De buitenkleur", interior_color: "De binnenkleur", seats: "Het aantal zitplaatsen", doors: "Het aantal deuren", description: "De beschrijving", condition: "De conditie", availability: "De beschikbaarheid", stock_number: "Het stocknummer", vin: "Het chassisnummer", admin_notes: "De interne notities", features: "De kenmerken" };
const vehicleSchema = z.object({
  title: z.string().trim().max(180), make: z.string().trim().max(80), model: z.string().trim().max(100),
  variant: z.string().max(120), year: z.number().int().min(1886).max(2200).nullable(), price: z.number().min(0).max(1_000_000_000).nullable(), cash_price: z.number().min(0).max(1_000_000_000).nullable(), currency: z.string().max(8), mileage: z.number().min(0).max(10_000_000).nullable(),
  engine_capacity: z.string().max(50), fuel_type: z.string().max(50), transmission: z.string().max(50), drive_type: z.string().max(50), body_type: z.string().max(50), exterior_color: z.string().max(50), interior_color: z.string().max(50), seats: z.number().int().min(1).max(100).nullable(), doors: z.number().int().min(1).max(20).nullable(), description: z.string().max(10000), condition: z.enum(["new", "used"]), availability: z.enum(["available", "on_the_way", "reserved", "sold", "rental"]), featured: z.boolean(), published: z.boolean(), stock_number: z.string().max(80), vin: z.string().max(80), admin_notes: z.string().max(5000), features: z.array(z.string().max(80)).max(60),
});

// Only photos are needed to list a car: when there is no title, one is made from the details or the stock number.
const photoOnlyTitle = (stockNumber: string | null | undefined) => stockNumber ? `Vehicle ${stockNumber}` : "Vehicle";

export async function saveVehicleAction(_previous: ActionState & { id?: string; slug?: string }, form: FormData): Promise<ActionState & { id?: string; slug?: string }> {
  try {
    const supabase = await verifyAdmin();
    const fields = {
      title: text(form, "title"), make: text(form, "make"), model: text(form, "model"), variant: text(form, "variant"), year: optionalNumber(text(form, "year")), price: optionalNumber(text(form, "price")), cash_price: optionalNumber(text(form, "cash_price")), currency: text(form, "currency"), mileage: optionalNumber(text(form, "mileage")),
      engine_capacity: text(form, "engine_capacity"), fuel_type: text(form, "fuel_type"), transmission: text(form, "transmission"), drive_type: text(form, "drive_type"), body_type: text(form, "body_type"), exterior_color: text(form, "exterior_color"), interior_color: text(form, "interior_color"), seats: optionalNumber(text(form, "seats")), doors: optionalNumber(text(form, "doors")), description: text(form, "description"), condition: text(form, "condition"), availability: text(form, "availability"), featured: text(form, "featured") === "on", published: text(form, "published") === "on", stock_number: text(form, "stock_number"), vin: text(form, "vin"), admin_notes: text(form, "admin_notes"), features: text(form, "features").split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
    };
    const parsed = vehicleSchema.safeParse(fields);
    if (!parsed.success) return { error: fieldError(parsed.error.issues[0], vehicleFieldLabels, "Controleer de gegevens van de auto en probeer het opnieuw.") };
    const value = parsed.data;
    const title = value.title || listingTitle(value.year ? String(value.year) : "", value.make, value.model, value.variant);
    const existingId = text(form, "id");
    if (existingId && !z.string().uuid().safeParse(existingId).success) return { error: "Deze auto is niet gevonden. Ga terug naar de voorraad en probeer het opnieuw." };
    const slugBase = slugify([value.year, value.make, value.model, value.variant].filter(Boolean).join(" ")) || "vehicle";
    let slug = `${slugBase}-${crypto.randomUUID().slice(0, 6)}`;
    let archived = false;
    let currentStock: string | null = null;
    if (existingId) {
      const { data: current, error: currentError } = await supabase.from("vehicles").select("slug, archived_at, stock_number").eq("id", existingId).maybeSingle();
      if (currentError || !current) return { error: "Deze auto is niet gevonden. Ga terug naar de voorraad en probeer het opnieuw." };
      slug = current.slug;
      archived = Boolean(current.archived_at);
      currentStock = current.stock_number;
    }
    const vehiclePayload = {
      slug,
      title: title || photoOnlyTitle(nullable(value.stock_number) ?? currentStock), make: nullable(value.make), model: nullable(value.model), variant: nullable(value.variant), year: value.year, price: value.price, cash_price: value.cash_price, currency: nullable(value.currency), mileage: value.mileage,
      engine_capacity: nullable(value.engine_capacity), fuel_type: nullable(value.fuel_type), transmission: nullable(value.transmission), drive_type: nullable(value.drive_type), body_type: nullable(value.body_type), exterior_color: nullable(value.exterior_color), interior_color: nullable(value.interior_color), seats: value.seats, doors: value.doors, description: nullable(value.description), condition: value.condition, availability: value.availability, featured: value.featured, published: archived ? false : value.published, stock_number: nullable(value.stock_number),
    };
    const result = existingId
      ? await supabase.from("vehicles").update(vehiclePayload).eq("id", existingId).select("id,slug").single()
      : await supabase.from("vehicles").insert({ ...vehiclePayload, archived_at: null }).select("id,slug,stock_number").single();
    if (result.error || !result.data) return { error: result.error?.code === "23505" ? "Dit stocknummer is al in gebruik." : result.error?.code === "23502" ? "Merk en model zijn nog verplicht in de database. Voer de nieuwste database-update (migratie) uit om auto’s zonder merk of model op te slaan." : "De auto kon niet worden opgeslagen." };
    // A new photo-only car gets its automatic stock number on insert, so its title can only name it afterwards.
    if (!title && !existingId && "stock_number" in result.data && result.data.stock_number && !value.stock_number) {
      await supabase.from("vehicles").update({ title: photoOnlyTitle(result.data.stock_number as string) }).eq("id", result.data.id);
    }
    const savedWithError = (error: string) => {
      expirePublicCache("vehicles"); revalidatePath("/admin"); revalidatePath("/admin/inventory");
      return { id: result.data.id, slug: result.data.slug, error };
    };
    const { error: privateError } = await supabase.from("vehicle_private").upsert({ vehicle_id: result.data.id, vin: nullable(value.vin), admin_notes: nullable(value.admin_notes) }, { onConflict: "vehicle_id" });
    if (privateError) return savedWithError("De auto is opgeslagen, maar het chassisnummer en de interne notities niet. Sla opnieuw op om het nog eens te proberen.");
    const names = [...new Set(value.features.map((name) => name.trim()).filter(Boolean))];
    if (names.length) {
      const featureRows = await supabase.from("features").upsert(names.map((name) => ({ name, category: "other" })), { onConflict: "name" }).select("id");
      if (featureRows.error || !featureRows.data) return savedWithError("De auto is opgeslagen, maar de kenmerken niet.");
      const { error: removeFeaturesError } = await supabase.from("vehicle_features").delete().eq("vehicle_id", result.data.id);
      if (removeFeaturesError) return savedWithError("De auto is opgeslagen, maar de kenmerken niet.");
      const links = await supabase.from("vehicle_features").insert(featureRows.data.map((feature) => ({ vehicle_id: result.data.id, feature_id: feature.id })));
      if (links.error) return savedWithError("De auto is opgeslagen, maar de kenmerken niet.");
    } else {
      const { error: removeFeaturesError } = await supabase.from("vehicle_features").delete().eq("vehicle_id", result.data.id);
      if (removeFeaturesError) return savedWithError("De auto is opgeslagen, maar de kenmerken niet.");
    }
    expirePublicCache("vehicles"); revalidatePath("/"); revalidatePath("/cars"); revalidatePath(`/cars/${result.data.slug}`); revalidatePath("/admin"); revalidatePath("/admin/inventory");
    return { ok: true, id: result.data.id, slug: result.data.slug };
  } catch (error) { return { error: error instanceof Error ? error.message : "De auto kon niet worden opgeslagen." }; }
}

export async function deleteVehicleAction(form: FormData): Promise<ActionState & { warning?: string }> {
  const id = text(form, "id");
  if (!z.string().uuid().safeParse(id).success) return { error: "Deze auto kon niet worden herkend." };
  try {
    const supabase = await verifyAdmin();
    const { data: images, error: imageReadError } = await supabase.from("vehicle_images").select("storage_path").eq("vehicle_id", id);
    if (imageReadError) return { error: "De foto’s van de auto konden niet worden gecontroleerd. Er is niets verwijderd." };
    const { error: deleteError } = await supabase.from("vehicles").delete().eq("id", id).select("id").single();
    if (deleteError) return { error: "De auto kon niet worden verwijderd." };
    let warning: string | undefined;
    if (images.length) {
      const { error: storageError } = await supabase.storage.from("vehicle-images").remove(images.map((image) => image.storage_path).filter((path) => !path.startsWith("/images/")));
      if (storageError) warning = "De auto is verwijderd, maar de opgeslagen fotobestanden konden niet worden verwijderd. Controleer Supabase Storage om de resterende bestanden op te ruimen.";
    }
    expirePublicCache("vehicles"); revalidatePath("/"); revalidatePath("/cars"); revalidatePath("/admin/inventory");
    return warning ? { ok: true, warning } : { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "De auto kon niet worden verwijderd." };
  }
}

export async function duplicateVehicleAction(form: FormData) {
  const id = text(form, "id"); if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await verifyAdmin();
  const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", id).single();
  if (!vehicle) return;
  const payload = {
    slug: `${slugify(vehicle.title) || "vehicle"}-${crypto.randomUUID().slice(0, 6)}`, title: vehicle.title, make: vehicle.make, model: vehicle.model,
    variant: vehicle.variant, year: vehicle.year, price: vehicle.price, cash_price: vehicle.cash_price, currency: vehicle.currency, mileage: vehicle.mileage,
    engine_capacity: vehicle.engine_capacity, fuel_type: vehicle.fuel_type, transmission: vehicle.transmission, drive_type: vehicle.drive_type,
    body_type: vehicle.body_type, exterior_color: vehicle.exterior_color, interior_color: vehicle.interior_color, seats: vehicle.seats,
    doors: vehicle.doors, description: vehicle.description, condition: vehicle.condition, availability: vehicle.availability,
    stock_number: null, published: false, featured: false, archived_at: null,
  };
  const { data } = await supabase.from("vehicles").insert(payload).select("id").single();
  if (data) {
    const { data: features } = await supabase.from("vehicle_features").select("feature_id").eq("vehicle_id", id);
    if (features?.length) await supabase.from("vehicle_features").insert(features.map((feature) => ({ vehicle_id: data.id, feature_id: feature.feature_id })));
    redirect(`/admin/inventory/${data.id}?opgeslagen=kopie`);
  }
}

// Opening a window sticker uses one of the limited uses (lib/window-sticker-quota.ts). The sticker is built
// from the car as it is saved right now, and is only returned after a use was claimed.
export async function openWindowStickerAction(id: string): Promise<{ sticker?: WindowStickerData; usesLeft?: number | null; locked?: boolean; error?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Deze auto kon niet worden herkend." };
  try {
    const supabase = await verifyAdmin();
    const [result, settings] = await Promise.all([getAdminVehicle(id), getSettings()]);
    if (!result) return { error: "Deze auto bestaat niet meer. Vernieuw de pagina." };
    const storage = supabase.storage.from(STICKER_BUCKET);
    const claim = await claimStickerUse(storage);
    if (claim === "exhausted") return { locked: true, usesLeft: 0 };
    if (claim === "error") return { error: "De raamsticker kon niet worden geopend. Controleer je verbinding en probeer het opnieuw; er is niets verbruikt." };
    return { sticker: buildWindowSticker(result.vehicle, settings, siteUrl()), usesLeft: await stickerUsesLeft(storage) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "De raamsticker kon niet worden geopend." };
  }
}

export async function updateVehicleAction(form: FormData) {
  const id = text(form, "id"); if (!z.string().uuid().safeParse(id).success) return;
  const status = text(form, "availability"); const published = text(form, "published"); const featured = text(form, "featured"); const archived = text(form, "archived");
  const payload: Record<string, unknown> = {};
  if (AVAILABILITY.includes(status)) payload.availability = status;
  if (published === "true" || published === "false") payload.published = published === "true";
  if (featured === "true" || featured === "false") payload.featured = featured === "true";
  if (archived === "true") { payload.archived_at = new Date().toISOString(); payload.published = false; }
  if (archived === "false") payload.archived_at = null;
  if (!Object.keys(payload).length) return;
  const supabase = await verifyAdmin();
  // An archived car stays hidden: publishing is only allowed for cars that are not archived.
  const query = supabase.from("vehicles").update(payload).eq("id", id);
  const { error } = await (payload.published === true && archived !== "false" ? query.is("archived_at", null) : query);
  if (error) throw new Error("De wijziging van de auto kon niet worden opgeslagen.");
  expirePublicCache("vehicles"); revalidatePath("/"); revalidatePath("/cars"); revalidatePath("/admin/inventory");
}

export async function bulkUpdateVehiclesAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const idsResult = z.array(z.string().uuid()).min(1).max(100).safeParse((() => { try { return JSON.parse(text(form, "ids")); } catch { return null; } })());
  if (!idsResult.success) return { error: idsResult.error.issues[0]?.code === "too_big" ? "Selecteer maximaal 100 auto’s tegelijk." : "Selecteer minstens één auto en probeer het opnieuw." };
  const operation = text(form, "operation");
  const status = text(form, "availability");
  const requestedStatus = operation === "status" ? status : operation.startsWith("status:") ? operation.slice(7) : "";
  const payload: Record<string, unknown> = {};
  if (operation === "publish") payload.published = true;
  else if (operation === "unpublish") payload.published = false;
  else if (operation === "feature") payload.featured = true;
  else if (operation === "unfeature") payload.featured = false;
  else if (operation === "archive") { payload.archived_at = new Date().toISOString(); payload.published = false; }
  else if (operation === "restore") payload.archived_at = null;
  else if (requestedStatus && AVAILABILITY.includes(requestedStatus)) payload.availability = requestedStatus;
  else return { error: "Kies een geldige actie voor de geselecteerde auto’s." };

  try {
    const supabase = await verifyAdmin();
    // Archived cars are never published or featured by a bulk action; restore them first.
    const query = supabase.from("vehicles").update(payload).in("id", idsResult.data);
    const { error } = await (operation === "publish" || operation === "feature" ? query.is("archived_at", null) : query);
    if (error) return { error: "De geselecteerde auto’s konden niet worden bijgewerkt." };
    expirePublicCache("vehicles"); revalidatePath("/"); revalidatePath("/cars"); revalidatePath("/admin"); revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "De geselecteerde auto’s konden niet worden bijgewerkt." };
  }
}

const settingsFieldLabels: Record<string, string> = { business_name: "De bedrijfsnaam", slogan: "De slogan", phone: "Het telefoonnummer", whatsapp: "Het WhatsApp-nummer", email: "Het e-mailadres", address: "De locaties", currency: "De valuta", homepage_title: "De homepagina-titel", homepage_subtitle: "De ondersteunende tekst", seo_title: "De paginatitel", seo_description: "De paginabeschrijving", about_text: "De tekst over het bedrijf", financing_notes: "De financieringsnotitie", "sales_terms.benefits": "De voordelen voor de klant", "sales_terms.internal_down_percent": "De interne aanbetaling", "sales_terms.internal_max_months": "Het maximaal aantal maanden", "sales_terms.bank_down_percent": "De aanbetaling voor de bank", "sales_terms.promo_text": "De actietekst", logo_path: "Het logo" };
export async function saveSettingsAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const supabase = await verifyAdmin();
    const hourLines = text(form, "business_hours").split("\n").map((line) => line.trim()).filter(Boolean);
    const businessHours: Record<string, string> = {};
    for (const line of hourLines) {
      const split = line.indexOf(":"); const day = line.slice(0, split).trim(); const hours = line.slice(split + 1).trim();
      if (split < 1 || !day || !hours) return { error: `Openingstijden: gebruik per regel "Dag: tijden", bijvoorbeeld "Maandag-vrijdag: 9:00 - 17:00". Controleer: "${line.slice(0, 40)}".` };
      businessHours[day] = hours;
    }
    const socialLinks: Record<string, string> = {};
    for (const platform of ["instagram", "facebook", "youtube", "tiktok"]) {
      const value = text(form, platform);
      if (!value) continue;
      const safeUrl = safeExternalUrl(value);
      if (!safeUrl) return { error: `Vul een geldige http- of https-link in voor ${platform[0].toUpperCase()}${platform.slice(1)}.` };
      socialLinks[platform] = safeUrl;
    }
    const salesTerms = {
      benefits: text(form, "benefits").split("\n").map((line) => line.trim()).filter(Boolean),
      internal_down_percent: optionalNumber(text(form, "internal_down_percent")),
      internal_max_months: optionalNumber(text(form, "internal_max_months")),
      bank_down_percent: optionalNumber(text(form, "bank_down_percent")),
      trade_in: text(form, "trade_in") === "on",
      promo_text: text(form, "promo_text"),
    };
    let catalogImages: unknown = [];
    try { catalogImages = JSON.parse(text(form, "catalog_images") || "[]"); } catch { return { error: "De foto’s voor de banner konden niet worden gelezen." }; }
    const images = z.array(z.string().regex(/^(catalog\/[0-9a-f-]{36}\.(webp|jpg|png|avif)|https:\/\/media\.bhaggoescarpalace\.com\/site-assets\/catalog\/[0-9a-f-]{36}\.(webp|jpg|png|avif)\.webp)$/)).max(6).safeParse(catalogImages);
    if (!images.success) return { error: "Gebruik maximaal 6 foto’s voor de banner." };
    const catalog = { catalog_hidden: text(form, "catalog_hidden") === "on", catalog_hidden_message: nullable(text(form, "catalog_hidden_message")), catalog_images: images.data };
    if (catalog.catalog_hidden_message && catalog.catalog_hidden_message.length > 600) return { error: "Het bericht bij de verborgen catalogus mag maximaal 600 tekens zijn." };
    const settings = { business_name: text(form, "business_name"), slogan: text(form, "slogan"), phone: nullable(text(form, "phone")), whatsapp: nullable(text(form, "whatsapp")), email: nullable(text(form, "email")), address: nullable(text(form, "address")), currency: nullable(text(form, "currency")), homepage_title: text(form, "homepage_title"), homepage_subtitle: text(form, "homepage_subtitle"), seo_title: text(form, "seo_title"), seo_description: text(form, "seo_description"), about_text: nullable(text(form, "about_text")), financing_enabled: text(form, "financing_enabled") === "on", financing_notes: nullable(text(form, "financing_notes")), sales_terms: salesTerms, show_sold: text(form, "show_sold") === "on", business_hours: businessHours, social_links: socialLinks, logo_path: nullable(text(form, "logo_path")) };
    const parsed = z.object({ business_name: z.string().min(2).max(120), slogan: z.string().max(180), phone: z.string().max(40).nullable(), whatsapp: z.string().max(40).refine((value) => /^\d{7,15}$/.test(value.replace(/\D/g, "")), { message: "WhatsApp-nummer: gebruik landnummer plus nummer, bijvoorbeeld +597 866-8777." }).nullable(), email: z.union([z.string().email(), z.literal("")]).nullable(), address: z.string().max(1500).nullable(), currency: z.string().max(8).nullable(), homepage_title: z.string().min(2).max(180), homepage_subtitle: z.string().max(350), seo_title: z.string().min(1).max(120), seo_description: z.string().min(1).max(320), about_text: z.string().max(10000).nullable(), financing_enabled: z.boolean(), financing_notes: z.string().max(2000).nullable(), sales_terms: z.object({ benefits: z.array(z.string().min(2).max(160)).max(15), internal_down_percent: z.number().int().min(0).max(100), internal_max_months: z.number().int().min(1).max(120), bank_down_percent: z.number().int().min(0).max(100), trade_in: z.boolean(), promo_text: z.string().max(300) }), show_sold: z.boolean(), business_hours: z.record(z.string().max(60), z.string().max(120)).refine((hours) => Object.keys(hours).length <= 14, { message: "Gebruik maximaal 14 regels voor de openingstijden." }), social_links: z.record(z.string(), z.string().max(300)), logo_path: z.string().max(300).regex(/^(?!.*\.\.)([A-Za-z0-9][A-Za-z0-9._\/-]*|https:\/\/media\.bhaggoescarpalace\.com\/site-assets\/[A-Za-z0-9._\/-]+|https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/site-assets\/[A-Za-z0-9._\/-]+)$/).nullable() }).safeParse(settings);
    if (!parsed.success) return { error: fieldError(parsed.error.issues[0], settingsFieldLabels, "Controleer de website-instellingen en probeer het opnieuw.") };
    const { data: previous } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    const originalCatalogPaths = [...catalog.catalog_images];
    if (r2Configured && process.env.NEXT_PUBLIC_R2_IMAGE_BASE_URL) {
      const mirror = async (path: string) => {
        const { data, error: downloadError } = await supabase.storage.from("site-assets").download(path);
        if (downloadError || !data) return path;
        try { return await mirrorSiteAsset(path, Buffer.from(await data.arrayBuffer())) ?? path; }
        catch { return path; }
      };
      if (parsed.data.logo_path?.startsWith("brand/")) parsed.data.logo_path = await mirror(parsed.data.logo_path);
      catalog.catalog_images = await Promise.all(catalog.catalog_images.map((path) => path.startsWith("catalog/") ? mirror(path) : path));
    }
    let { error } = await supabase.from("site_settings").update({ ...parsed.data, ...(form.has("catalog_hidden_message") ? catalog : {}) }).eq("id", 1);
    // Banner photos that were taken out are deleted from storage, so they do not pile up.
    const before = Array.isArray(previous?.catalog_images) ? previous.catalog_images as string[] : [];
    const dropped = before.filter((path) => path.startsWith("catalog/") && !originalCatalogPaths.includes(path));
    if (!error && dropped.length && form.has("catalog_hidden_message")) await supabase.storage.from("site-assets").remove(dropped);
    // Older databases do not have the catalog columns yet: save everything else and say what is missing.
    // Older databases may miss the newest columns: save what fits and say what is missing.
    if (error && isMissingColumn(error) && form.has("catalog_hidden_message")) {
      const { catalog_images: photos, ...withoutPhotos } = catalog;
      ({ error } = await supabase.from("site_settings").update({ ...parsed.data, ...withoutPhotos }).eq("id", 1));
      if (!error) { expirePublicCache("settings", "vehicles"); revalidatePath("/", "layout"); return photos.length ? { error: "De instellingen zijn opgeslagen, maar de foto’s voor de banner nog niet: de database heeft eerst een kleine update (migratie) nodig." } : { ok: true }; }
      if (isMissingColumn(error)) {
        ({ error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1));
        if (!error) { expirePublicCache("settings", "vehicles"); revalidatePath("/", "layout"); return catalog.catalog_hidden ? { error: catalogMigrationMessage } : { ok: true }; }
      }
    }
    if (error) return { error: "De website-instellingen konden niet worden opgeslagen." };
    // show_sold changes which cars are public, so the vehicle caches expire together with the settings.
    expirePublicCache("settings", "vehicles"); revalidatePath("/", "layout"); return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De website-instellingen konden niet worden opgeslagen." }; }
}

const catalogMigrationMessage = "De catalogus kon niet worden verborgen: de database heeft eerst de nieuwste update (migratie) nodig. De andere instellingen zijn opgeslagen.";
const isMissingColumn = (error: { code?: string }) => error.code === "PGRST204" || error.code === "42703";

/** The one-tap switch on the dashboard: hides or shows every car on the public website. */
export async function setCatalogHiddenAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const hidden = text(form, "hidden");
  if (hidden !== "true" && hidden !== "false") return { error: "Kies of de catalogus zichtbaar moet zijn." };
  try {
    const supabase = await verifyAdmin();
    const { error } = await supabase.from("site_settings").update({ catalog_hidden: hidden === "true" }).eq("id", 1);
    if (error) return { error: isMissingColumn(error) ? "De database heeft eerst de nieuwste update (migratie) nodig voordat de catalogus verborgen kan worden." : "De catalogus kon niet worden bijgewerkt." };
    expirePublicCache("settings", "vehicles"); revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De catalogus kon niet worden bijgewerkt." }; }
}

/** Quick price edit from the inventory list; an empty field means "price on request". */
export async function updateVehiclePriceAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const id = text(form, "id");
  if (!z.string().uuid().safeParse(id).success) return { error: "Deze auto kon niet worden herkend." };
  const parsed = z.object({ price: z.number().min(0).max(1_000_000_000).nullable(), cash_price: z.number().min(0).max(1_000_000_000).nullable() })
    .safeParse({ price: optionalNumber(text(form, "price").replace(/[^\d.]/g, "")), cash_price: optionalNumber(text(form, "cash_price").replace(/[^\d.]/g, "")) });
  if (!parsed.success) return { error: "Vul een geldige prijs in, of laat het veld leeg voor ‘op aanvraag’." };
  try {
    const supabase = await verifyAdmin();
    const { error } = await supabase.from("vehicles").update(parsed.data).eq("id", id);
    if (error) return { error: "De prijs kon niet worden opgeslagen." };
    expirePublicCache("vehicles"); revalidatePath("/admin"); revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De prijs kon niet worden opgeslagen." }; }
}

export async function updateInquiryAction(form: FormData) {
  const id = text(form, "id"); const status = text(form, "status");
  if (!z.string().uuid().safeParse(id).success || !["new", "contacted", "closed"].includes(status)) return;
  const supabase = await verifyAdmin();
  const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
  if (error) throw new Error("De status van de aanvraag kon niet worden opgeslagen.");
  revalidatePath("/admin/inquiries"); revalidatePath("/admin");
}

export async function deleteInquiryAction(form: FormData) {
  const id = text(form, "id"); if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await verifyAdmin();
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error("De aanvraag kon niet worden verwijderd.");
  revalidatePath("/admin/inquiries"); revalidatePath("/admin");
}

export async function saveFaqAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const supabase = await verifyAdmin(); const id = text(form, "id");
    if (id && !z.string().uuid().safeParse(id).success) return { error: "Deze vraag kon niet worden herkend." };
    const parsed = z.object({ question: z.string().trim().min(4).max(300), answer: z.string().trim().min(5).max(5000), sort_order: z.coerce.number().int().min(0).max(10000), published: z.boolean() }).safeParse({ question: text(form, "question"), answer: text(form, "answer"), sort_order: text(form, "sort_order") || 0, published: text(form, "published") === "on" });
    if (!parsed.success) return { error: fieldError(parsed.error.issues[0], { question: "De vraag", answer: "Het antwoord", sort_order: "De volgorde" }, "Controleer de vraag en het antwoord.") };
    const { error } = id ? await supabase.from("faq_items").update(parsed.data).eq("id", id) : await supabase.from("faq_items").insert(parsed.data);
    if (error) return { error: "De vraag kon niet worden opgeslagen." };
    expirePublicCache("faqs"); revalidatePath("/faq"); revalidatePath("/admin/content"); return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De vraag kon niet worden opgeslagen." }; }
}

export async function deleteFaqAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const id = text(form, "id"); if (!z.string().uuid().safeParse(id).success) return { error: "Deze vraag kon niet worden herkend." };
  try {
    const supabase = await verifyAdmin(); const { error } = await supabase.from("faq_items").delete().eq("id", id);
    if (error) return { error: "De vraag kon niet worden verwijderd." };
    expirePublicCache("faqs"); revalidatePath("/faq"); revalidatePath("/admin/content"); return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De vraag kon niet worden verwijderd." }; }
}

export async function saveContentPageAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const supabase = await verifyAdmin();
    const parsed = z.object({ slug: z.enum(["privacy", "terms"]), title: z.string().min(2).max(180), body: z.string().max(15000), seo_title: z.string().max(180).optional(), seo_description: z.string().max(350).optional(), published: z.boolean() }).refine((page) => !page.published || page.body.trim().length >= 25, { message: "Voeg eerst enkele zinnen toe voordat je deze pagina publiceert." }).safeParse({ slug: text(form, "slug"), title: text(form, "title"), body: text(form, "body"), seo_title: text(form, "seo_title"), seo_description: text(form, "seo_description"), published: text(form, "published") === "on" });
    if (!parsed.success) return { error: fieldError(parsed.error.issues[0], { title: "De paginatitel", body: "De inhoud", seo_description: "De zoekbeschrijving", slug: "De pagina" }, "Controleer de pagina en probeer het opnieuw.") };
    const { seo_title: seoTitle, seo_description: seoDescription, ...page } = parsed.data;
    // The editor has no search-title field, so only touch seo_title when the form actually sends one.
    const { error } = await supabase.from("content_pages").upsert({ ...page, ...(form.has("seo_title") ? { seo_title: nullable(seoTitle ?? "") } : {}), seo_description: nullable(seoDescription ?? "") }, { onConflict: "slug" });
    if (error) return { error: "De pagina kon niet worden opgeslagen." };
    expirePublicCache("pages"); revalidatePath(`/${parsed.data.slug}`); revalidatePath("/admin/content"); return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De pagina kon niet worden opgeslagen." }; }
}

// Photos uploaded before the browser-side shrinking (or from a browser that could not shrink them) are often
// 2–5 MB. These are re-encoded once to match the browser upload cap.
const LARGE_PHOTO_BYTES = 450 * 1024;
const OPTIMIZE_BATCH = 4; // small enough to finish well within a serverless time limit
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type R2ImageRow = { id: string; vehicle_id: string; storage_path: string; r2_ready: boolean };

async function syncR2ImageRows(supabase: SupabaseServer, rows: R2ImageRow[]) {
  let copied = 0;
  const failedIds: string[] = [];
  for (const row of rows) {
    try {
      if (row.storage_path.startsWith("/images/")) continue;
      const { data: vehicle, error: vehicleError } = await supabase.from("vehicles")
        .select("published, archived_at").eq("id", row.vehicle_id).single();
      if (vehicleError || !vehicle?.published || vehicle.archived_at) continue;
      const { data: original, error: downloadError } = await supabase.storage.from("vehicle-images").download(row.storage_path);
      if (downloadError || !original) throw new Error("download");
      await mirrorVehicleImage(row.storage_path, Buffer.from(await original.arrayBuffer()));
      const { error: updateError } = await supabase.from("vehicle_images").update({ r2_ready: true })
        .eq("id", row.id).eq("storage_path", row.storage_path);
      if (updateError) throw new Error("database update");
      copied++;
    } catch { failedIds.push(row.id); }
  }
  if (copied) expirePublicCache("vehicles");
  return { copied, failedIds };
}

export async function countR2ImagesAction(): Promise<{ ids: string[]; error?: string }> {
  try {
    if (!r2Configured) return { ids: [] };
    const supabase = await verifyAdmin();
    const { data: vehicles, error: vehicleError } = await supabase.from("vehicles")
      .select("id").eq("published", true).is("archived_at", null);
    if (vehicleError || !vehicles) throw new Error("Published cars could not be checked.");
    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    if (!vehicleIds.length) return { ids: [] };
    const { data, error } = await supabase.from("vehicle_images").select("id, storage_path")
      .in("vehicle_id", vehicleIds).eq("r2_ready", false).limit(2000);
    if (error || !data) throw new Error("Photos could not be checked.");
    return { ids: data.filter((row) => !row.storage_path.startsWith("/images/")).map((row) => row.id) };
  } catch (error) { return { ids: [], error: error instanceof Error ? error.message : "Photos could not be checked." }; }
}

export async function syncR2ImagesAction(ids: string[]): Promise<{ copied: number; failedIds: string[]; error?: string }> {
  try {
    if (!r2Configured) throw new Error("R2 is not configured.");
    const selected = z.array(z.string().uuid()).min(1).max(2).parse(ids);
    const supabase = await verifyAdmin();
    const { data, error } = await supabase.from("vehicle_images")
      .select("id, vehicle_id, storage_path, r2_ready").in("id", selected).eq("r2_ready", false);
    if (error || !data) throw new Error("Photos could not be loaded.");
    return await syncR2ImageRows(supabase, data);
  } catch (error) { return { copied: 0, failedIds: [], error: error instanceof Error ? error.message : "Photos could not be mirrored." }; }
}

async function findLargePhotos(supabase: SupabaseServer) {
  const { data: rows, error } = await supabase.from("vehicle_images").select("id, vehicle_id, storage_path");
  if (error || !rows) throw new Error("De foto’s konden niet worden gecontroleerd.");
  const stored = rows.filter((row) => !row.storage_path.startsWith("/images/"));
  const folders = [...new Set(stored.map((row) => row.storage_path.split("/")[0]))];
  const sizes = new Map<string, number>();
  for (let index = 0; index < folders.length; index += 8) {
    await Promise.all(folders.slice(index, index + 8).map(async (folder) => {
      const { data, error: listError } = await supabase.storage.from("vehicle-images").list(folder, { limit: 100 });
      if (listError) throw new Error("De foto’s konden niet worden gecontroleerd.");
      for (const object of data ?? []) sizes.set(`${folder}/${object.name}`, Number(object.metadata?.size ?? 0));
    }));
  }
  return stored.filter((row) => (sizes.get(row.storage_path) ?? 0) > LARGE_PHOTO_BYTES);
}

export async function countLargePhotosAction(): Promise<{ count: number; ids: string[]; error?: string }> {
  try { const photos = await findLargePhotos(await verifyAdmin()); return { count: photos.length, ids: photos.map((photo) => photo.id) }; }
  catch (error) { return { count: 0, ids: [], error: error instanceof Error ? error.message : "De foto’s konden niet worden gecontroleerd." }; }
}

/** Shrinks one known batch; the dashboard scans storage once rather than again after every four photos. */
export async function optimizePhotosAction(ids: string[]): Promise<{ optimized: number; savedBytes: number; failedIds: string[]; error?: string }> {
  try {
    const supabase = await verifyAdmin();
    const selected = z.array(z.string().uuid()).min(1).max(OPTIMIZE_BATCH).parse(ids);
    const { data: large, error: queryError } = await supabase.from("vehicle_images").select("id, vehicle_id, storage_path").in("id", selected);
    if (queryError || !large) throw new Error("De foto’s konden niet worden gecontroleerd.");
    let optimized = 0; let savedBytes = 0; const failedIds: string[] = [];
    await Promise.all(large.filter((photo) => !photo.storage_path.startsWith("/images/")).map(async (photo) => {
      try {
        const { data: original, error: downloadError } = await supabase.storage.from("vehicle-images").download(photo.storage_path);
        if (downloadError || !original) throw new Error("download");
        const source = Buffer.from(await original.arrayBuffer());
        let smaller: Buffer | null = null;
        for (const [edge, quality] of [[1600, 76], [1600, 64], [1280, 68], [1024, 58]]) {
          const candidate = await sharp(source, { failOn: "none" }).rotate()
            .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
          if (candidate.length <= LARGE_PHOTO_BYTES) { smaller = candidate; break; }
        }
        if (!smaller) throw new Error("not small enough");
        // New file first, then point the listing at it, then remove the old file: the car never shows a broken photo.
        const path = `${photo.vehicle_id}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage.from("vehicle-images").upload(path, smaller, { contentType: "image/webp", upsert: false });
        if (uploadError) throw new Error("upload");
        const { error: updateError } = await supabase.from("vehicle_images").update({ storage_path: path }).eq("id", photo.id);
        if (updateError) { await supabase.storage.from("vehicle-images").remove([path]); throw new Error("update"); }
        await supabase.storage.from("vehicle-images").remove([photo.storage_path]);
        optimized += 1; savedBytes += original.size - smaller.length;
      } catch { failedIds.push(photo.id); }
    }));
    if (optimized) { expirePublicCache("vehicles"); revalidatePath("/admin"); revalidatePath("/admin/inventory"); }
    // Photos that failed stay as they are; the caller skips them next time, so the loop always ends.
    return { optimized, failedIds, savedBytes };
  } catch (error) { return { optimized: 0, failedIds: [], savedBytes: 0, error: error instanceof Error ? error.message : "De foto’s konden niet worden geoptimaliseerd." }; }
}

// ---- Gebruikers -------------------------------------------------------------------------------------------
const userErrors: Record<string, string> = {
  invalid_email: "Vul een geldig e-mailadres in.",
  invalid_password: "Het wachtwoord moet 12 tot 72 tekens lang zijn.",
  invalid_role: "Kies een geldige toegang.",
  email_taken: "Er bestaat al een account met dit e-mailadres.",
  cannot_demote_self: "Je kunt je eigen beheerderstoegang niet uitzetten.",
  cannot_delete_self: "Je kunt je eigen account niet verwijderen.",
  use_own_account_page: "Wijzig je eigen wachtwoord via ‘Mijn account’.",
  user_not_found: "Deze gebruiker bestaat niet meer. Vernieuw de pagina.",
};
function userError(error: { message?: string; code?: string } | null, fallback: string) {
  if (!error) return fallback;
  if (error.code === "PGRST202" || error.code === "42883") return "Gebruikersbeheer is nog niet geactiveerd: de database heeft eerst de nieuwste update (migratie) nodig.";
  const key = Object.keys(userErrors).find((name) => error.message?.includes(name));
  return key ? userErrors[key] : fallback;
}
const passwordSchema = z.string().min(12).max(72);

export async function createUserAction(_previous: ActionState, form: FormData): Promise<ActionState & { created?: { email: string; password: string } }> {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: passwordSchema, name: z.string().trim().max(80), role: z.enum(["admin", "staff"]) })
    .safeParse({ email: text(form, "email"), password: String(form.get("password") ?? ""), name: text(form, "name"), role: text(form, "role") || "admin" });
  if (!parsed.success) return { error: fieldError(parsed.error.issues[0], { email: "Het e-mailadres", password: "Het tijdelijke wachtwoord (minstens 12 tekens)", name: "De naam" }, "Controleer de gegevens van de nieuwe gebruiker.") };
  try {
    const supabase = await verifyAdmin();
    const { error } = await supabase.rpc("admin_create_user", { p_email: parsed.data.email, p_password: parsed.data.password, p_display_name: parsed.data.name, p_role: parsed.data.role });
    if (error) return { error: userError(error, "De gebruiker kon niet worden aangemaakt.") };
    revalidatePath("/admin/users");
    return { ok: true, created: { email: parsed.data.email, password: parsed.data.password } };
  } catch (error) { return { error: error instanceof Error ? error.message : "De gebruiker kon niet worden aangemaakt." }; }
}

export async function updateUserAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ id: z.string().uuid(), name: z.string().trim().max(80), role: z.enum(["admin", "staff"]) }).safeParse({ id: text(form, "id"), name: text(form, "name"), role: text(form, "role") });
  if (!parsed.success) return { error: "Controleer de naam en de toegang." };
  try {
    const supabase = await verifyAdmin();
    const { error } = await supabase.rpc("admin_update_user", { p_user_id: parsed.data.id, p_display_name: parsed.data.name, p_role: parsed.data.role });
    if (error) return { error: userError(error, "De gebruiker kon niet worden bijgewerkt.") };
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De gebruiker kon niet worden bijgewerkt." }; }
}

export async function resetUserPasswordAction(_previous: ActionState, form: FormData): Promise<ActionState & { password?: string }> {
  const parsed = z.object({ id: z.string().uuid(), password: passwordSchema }).safeParse({ id: text(form, "id"), password: String(form.get("password") ?? "") });
  if (!parsed.success) return { error: "Het tijdelijke wachtwoord moet 12 tot 72 tekens lang zijn." };
  try {
    const supabase = await verifyAdmin();
    const { error } = await supabase.rpc("admin_set_user_password", { p_user_id: parsed.data.id, p_password: parsed.data.password });
    if (error) return { error: userError(error, "Het wachtwoord kon niet worden ingesteld.") };
    revalidatePath("/admin/users");
    return { ok: true, password: parsed.data.password };
  } catch (error) { return { error: error instanceof Error ? error.message : "Het wachtwoord kon niet worden ingesteld." }; }
}

export async function deleteUserAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const id = text(form, "id");
  if (!z.string().uuid().safeParse(id).success) return { error: "Deze gebruiker kon niet worden herkend." };
  try {
    const supabase = await verifyAdmin();
    const { error } = await supabase.rpc("admin_delete_user", { p_user_id: id });
    if (error) return { error: userError(error, "De gebruiker kon niet worden verwijderd.") };
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De gebruiker kon niet worden verwijderd." }; }
}

/** Mijn account: the signed-in person changes their own password (required after a temporary one) and name. */
export async function updateOwnAccountAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const password = String(form.get("password") ?? ""); const confirm = String(form.get("confirm") ?? ""); const name = text(form, "name");
  if (password && !passwordSchema.safeParse(password).success) return { error: "Gebruik een wachtwoord van 12 tot 72 tekens." };
  if (password !== confirm) return { error: "De twee wachtwoorden zijn niet hetzelfde." };
  if (name.length > 80) return { error: "De naam mag maximaal 80 tekens zijn." };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Je sessie is verlopen. Log opnieuw in." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return { error: "Beheerderstoegang is vereist." };
    if (user.user_metadata?.must_change_password && !password) return { error: "Kies eerst een nieuw wachtwoord; je gebruikt nu een tijdelijk wachtwoord." };
    if (password) {
      const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
      if (error) return { error: error.code === "same_password" ? "Kies een ander wachtwoord dan het huidige." : error.code === "weak_password" ? "Dit wachtwoord is te zwak of komt voor in gelekte lijsten. Kies een ander." : "Het wachtwoord kon niet worden gewijzigd." };
    }
    const { error: nameError } = await supabase.rpc("admin_update_user", { p_user_id: user.id, p_display_name: name, p_role: "admin" });
    if (nameError && !password) return { error: userError(nameError, "Je naam kon niet worden opgeslagen.") };
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch { return { error: "Je account kon niet worden bijgewerkt." }; }
}
