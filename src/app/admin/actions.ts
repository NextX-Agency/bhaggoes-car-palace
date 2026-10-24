"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeExternalUrl, slugify } from "@/lib/domain";
import { clearFailures, clientAddress, isThrottled, recordFailure } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

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
export async function refreshPublicInventoryAction(): Promise<ActionState> {
  try { await verifyAdmin(); expirePublicCache("vehicles"); return { ok: true }; }
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
  title: z.string().trim().min(2).max(180), make: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(100),
  variant: z.string().max(120), year: z.number().int().min(1886).max(2200).nullable(), price: z.number().min(0).max(1_000_000_000).nullable(), cash_price: z.number().min(0).max(1_000_000_000).nullable(), currency: z.string().max(8), mileage: z.number().min(0).max(10_000_000).nullable(),
  engine_capacity: z.string().max(50), fuel_type: z.string().max(50), transmission: z.string().max(50), drive_type: z.string().max(50), body_type: z.string().max(50), exterior_color: z.string().max(50), interior_color: z.string().max(50), seats: z.number().int().min(1).max(100).nullable(), doors: z.number().int().min(1).max(20).nullable(), description: z.string().max(10000), condition: z.enum(["new", "used"]), availability: z.enum(["available", "on_the_way", "reserved", "sold", "rental"]), featured: z.boolean(), published: z.boolean(), stock_number: z.string().max(80), vin: z.string().max(80), admin_notes: z.string().max(5000), features: z.array(z.string().max(80)).max(60),
}).refine((value) => (value.price === null && value.cash_price === null) || Boolean(value.currency.trim()), { path: ["currency"], message: "Kies een valuta als je een prijs invult." });

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
    const existingId = text(form, "id");
    if (existingId && !z.string().uuid().safeParse(existingId).success) return { error: "Deze auto is niet gevonden. Ga terug naar de voorraad en probeer het opnieuw." };
    const slugBase = slugify([value.year, value.make, value.model, value.variant].filter(Boolean).join(" ")) || "vehicle";
    let slug = `${slugBase}-${crypto.randomUUID().slice(0, 6)}`;
    let archived = false;
    if (existingId) {
      const { data: current, error: currentError } = await supabase.from("vehicles").select("slug, archived_at").eq("id", existingId).maybeSingle();
      if (currentError || !current) return { error: "Deze auto is niet gevonden. Ga terug naar de voorraad en probeer het opnieuw." };
      slug = current.slug;
      archived = Boolean(current.archived_at);
    }
    const vehiclePayload = {
      slug,
      title: value.title, make: value.make, model: value.model, variant: nullable(value.variant), year: value.year, price: value.price, cash_price: value.cash_price, currency: nullable(value.currency), mileage: value.mileage,
      engine_capacity: nullable(value.engine_capacity), fuel_type: nullable(value.fuel_type), transmission: nullable(value.transmission), drive_type: nullable(value.drive_type), body_type: nullable(value.body_type), exterior_color: nullable(value.exterior_color), interior_color: nullable(value.interior_color), seats: value.seats, doors: value.doors, description: nullable(value.description), condition: value.condition, availability: value.availability, featured: value.featured, published: archived ? false : value.published, stock_number: nullable(value.stock_number),
    };
    const result = existingId
      ? await supabase.from("vehicles").update(vehiclePayload).eq("id", existingId).select("id,slug").single()
      : await supabase.from("vehicles").insert({ ...vehiclePayload, archived_at: null }).select("id,slug").single();
    if (result.error || !result.data) return { error: result.error?.code === "23505" ? "Dit stocknummer is al in gebruik." : "De auto kon niet worden opgeslagen." };
    const { error: privateError } = await supabase.from("vehicle_private").upsert({ vehicle_id: result.data.id, vin: nullable(value.vin), admin_notes: nullable(value.admin_notes) }, { onConflict: "vehicle_id" });
    if (privateError) return { error: "De auto is opgeslagen, maar het chassisnummer en de interne notities niet. Sla opnieuw op om het nog eens te proberen." };
    const names = [...new Set(value.features.map((name) => name.trim()).filter(Boolean))];
    if (names.length) {
      const featureRows = await supabase.from("features").upsert(names.map((name) => ({ name, category: "other" })), { onConflict: "name" }).select("id");
      if (featureRows.error || !featureRows.data) return { error: "De auto is opgeslagen, maar de kenmerken niet." };
      await supabase.from("vehicle_features").delete().eq("vehicle_id", result.data.id);
      const links = await supabase.from("vehicle_features").insert(featureRows.data.map((feature) => ({ vehicle_id: result.data.id, feature_id: feature.id })));
      if (links.error) return { error: "De auto is opgeslagen, maar de kenmerken niet." };
    } else await supabase.from("vehicle_features").delete().eq("vehicle_id", result.data.id);
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
    slug: `${slugify(vehicle.title)}-${crypto.randomUUID().slice(0, 6)}`, title: vehicle.title, make: vehicle.make, model: vehicle.model,
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
    redirect(`/admin/inventory/${data.id}`);
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
    const settings = { business_name: text(form, "business_name"), slogan: text(form, "slogan"), phone: nullable(text(form, "phone")), whatsapp: nullable(text(form, "whatsapp")), email: nullable(text(form, "email")), address: nullable(text(form, "address")), currency: nullable(text(form, "currency")), homepage_title: text(form, "homepage_title"), homepage_subtitle: text(form, "homepage_subtitle"), seo_title: text(form, "seo_title"), seo_description: text(form, "seo_description"), about_text: nullable(text(form, "about_text")), financing_enabled: text(form, "financing_enabled") === "on", financing_notes: nullable(text(form, "financing_notes")), sales_terms: salesTerms, show_sold: text(form, "show_sold") === "on", business_hours: businessHours, social_links: socialLinks, logo_path: nullable(text(form, "logo_path")) };
    const parsed = z.object({ business_name: z.string().min(2).max(120), slogan: z.string().max(180), phone: z.string().max(40).nullable(), whatsapp: z.string().max(40).refine((value) => /^\d{7,15}$/.test(value.replace(/\D/g, "")), { message: "WhatsApp-nummer: gebruik landnummer plus nummer, bijvoorbeeld +597 866-8777." }).nullable(), email: z.union([z.string().email(), z.literal("")]).nullable(), address: z.string().max(1500).nullable(), currency: z.string().max(8).nullable(), homepage_title: z.string().min(2).max(180), homepage_subtitle: z.string().max(350), seo_title: z.string().min(1).max(120), seo_description: z.string().min(1).max(320), about_text: z.string().max(10000).nullable(), financing_enabled: z.boolean(), financing_notes: z.string().max(2000).nullable(), sales_terms: z.object({ benefits: z.array(z.string().min(2).max(160)).max(15), internal_down_percent: z.number().int().min(0).max(100), internal_max_months: z.number().int().min(1).max(120), bank_down_percent: z.number().int().min(0).max(100), trade_in: z.boolean(), promo_text: z.string().max(300) }), show_sold: z.boolean(), business_hours: z.record(z.string().max(60), z.string().max(120)).refine((hours) => Object.keys(hours).length <= 14, { message: "Gebruik maximaal 14 regels voor de openingstijden." }), social_links: z.record(z.string(), z.string().max(300)), logo_path: z.string().max(300).regex(/^(?!.*\.\.)([A-Za-z0-9][A-Za-z0-9._\/-]*|https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/site-assets\/[A-Za-z0-9._\/-]+)$/).nullable() }).safeParse(settings);
    if (!parsed.success) return { error: fieldError(parsed.error.issues[0], settingsFieldLabels, "Controleer de website-instellingen en probeer het opnieuw.") };
    const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
    if (error) return { error: "De website-instellingen konden niet worden opgeslagen." };
    // show_sold changes which cars are public, so the vehicle caches expire together with the settings.
    expirePublicCache("settings", "vehicles"); revalidatePath("/", "layout"); return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "De website-instellingen konden niet worden opgeslagen." }; }
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
