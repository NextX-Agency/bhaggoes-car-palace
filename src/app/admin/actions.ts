"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; ok?: boolean };

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session has expired. Sign in again.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Administrator access is required.");
  return supabase;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (value: string) => value || null;
const optionalNumber = (value: string) => value === "" ? null : Number(value);

export async function signInAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({ email: text(form, "email"), password: String(form.get("password") ?? "") });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: "Those sign-in details could not be verified." };
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
    if (profile?.role !== "admin") { await supabase.auth.signOut(); return { error: "This account has not been granted dealership administrator access." }; }
  } catch { return { error: "Sign-in is not configured yet. Add the Supabase project settings and try again." }; }
  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const vehicleSchema = z.object({
  title: z.string().trim().min(2).max(180), make: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(100),
  variant: z.string().max(120), year: z.number().int().min(1886).max(2200).nullable(), price: z.number().min(0).nullable(), currency: z.string().max(8), mileage: z.number().min(0).nullable(),
  engine_capacity: z.string().max(50), fuel_type: z.string().max(50), transmission: z.string().max(50), drive_type: z.string().max(50), body_type: z.string().max(50), exterior_color: z.string().max(50), interior_color: z.string().max(50), seats: z.number().int().min(1).max(100).nullable(), doors: z.number().int().min(1).max(20).nullable(), description: z.string().max(10000), condition: z.enum(["new", "used"]), availability: z.enum(["available", "on_the_way", "reserved", "sold", "rental"]), featured: z.boolean(), published: z.boolean(), stock_number: z.string().max(80), vin: z.string().max(80), admin_notes: z.string().max(5000), features: z.array(z.string().max(80)).max(60),
});

export async function saveVehicleAction(_previous: ActionState & { id?: string; slug?: string }, form: FormData): Promise<ActionState & { id?: string; slug?: string }> {
  try {
    const supabase = await verifyAdmin();
    const fields = {
      title: text(form, "title"), make: text(form, "make"), model: text(form, "model"), variant: text(form, "variant"), year: optionalNumber(text(form, "year")), price: optionalNumber(text(form, "price")), currency: text(form, "currency"), mileage: optionalNumber(text(form, "mileage")),
      engine_capacity: text(form, "engine_capacity"), fuel_type: text(form, "fuel_type"), transmission: text(form, "transmission"), drive_type: text(form, "drive_type"), body_type: text(form, "body_type"), exterior_color: text(form, "exterior_color"), interior_color: text(form, "interior_color"), seats: optionalNumber(text(form, "seats")), doors: optionalNumber(text(form, "doors")), description: text(form, "description"), condition: text(form, "condition"), availability: text(form, "availability"), featured: text(form, "featured") === "on", published: text(form, "published") === "on", stock_number: text(form, "stock_number"), vin: text(form, "vin"), admin_notes: text(form, "admin_notes"), features: text(form, "features").split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
    };
    const parsed = vehicleSchema.safeParse(fields);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Review the vehicle details and try again." };
    const value = parsed.data;
    const existingId = text(form, "id");
    const slugBase = slugify([value.year, value.make, value.model, value.variant].filter(Boolean).join(" ")) || "vehicle";
    let slug = `${slugBase}-${crypto.randomUUID().slice(0, 6)}`;
    if (existingId) {
      const { data: current } = await supabase.from("vehicles").select("slug").eq("id", existingId).maybeSingle();
      slug = current?.slug ?? slugBase;
    }
    const vehiclePayload = {
      slug,
      title: value.title, make: value.make, model: value.model, variant: nullable(value.variant), year: value.year, price: value.price, currency: nullable(value.currency), mileage: value.mileage,
      engine_capacity: nullable(value.engine_capacity), fuel_type: nullable(value.fuel_type), transmission: nullable(value.transmission), drive_type: nullable(value.drive_type), body_type: nullable(value.body_type), exterior_color: nullable(value.exterior_color), interior_color: nullable(value.interior_color), seats: value.seats, doors: value.doors, description: nullable(value.description), condition: value.condition, availability: value.availability, featured: value.featured, published: value.published, stock_number: nullable(value.stock_number), archived_at: null,
    };
    const result = existingId
      ? await supabase.from("vehicles").update(vehiclePayload).eq("id", existingId).select("id,slug").single()
      : await supabase.from("vehicles").insert(vehiclePayload).select("id,slug").single();
    if (result.error || !result.data) return { error: result.error?.code === "23505" ? "That stock number is already in use." : "The vehicle could not be saved." };
    const { error: privateError } = await supabase.from("vehicle_private").upsert({ vehicle_id: result.data.id, vin: nullable(value.vin), admin_notes: nullable(value.admin_notes) }, { onConflict: "vehicle_id" });
    if (privateError) return { error: "The vehicle was saved, but its private VIN and notes were not. Save again to retry." };
    const names = [...new Set(value.features.map((name) => name.trim()).filter(Boolean))];
    if (names.length) {
      const featureRows = await supabase.from("features").upsert(names.map((name) => ({ name, category: "other" })), { onConflict: "name" }).select("id");
      if (featureRows.error || !featureRows.data) return { error: "Vehicle saved, but features could not be updated." };
      await supabase.from("vehicle_features").delete().eq("vehicle_id", result.data.id);
      const links = await supabase.from("vehicle_features").insert(featureRows.data.map((feature) => ({ vehicle_id: result.data.id, feature_id: feature.id })));
      if (links.error) return { error: "Vehicle saved, but features could not be updated." };
    } else await supabase.from("vehicle_features").delete().eq("vehicle_id", result.data.id);
    revalidatePath("/"); revalidatePath("/cars"); revalidatePath(`/cars/${result.data.slug}`); revalidatePath("/admin"); revalidatePath("/admin/inventory");
    return { ok: true, id: result.data.id, slug: result.data.slug };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to save this vehicle." }; }
}

export async function deleteVehicleAction(form: FormData) {
  const id = text(form, "id");
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await verifyAdmin();
  const { data: images } = await supabase.from("vehicle_images").select("storage_path").eq("vehicle_id", id);
  if (images?.length) await supabase.storage.from("vehicle-images").remove(images.map((image) => image.storage_path));
  await supabase.from("vehicles").delete().eq("id", id);
  revalidatePath("/"); revalidatePath("/cars"); revalidatePath("/admin/inventory");
}

export async function duplicateVehicleAction(form: FormData) {
  const id = text(form, "id");
  const supabase = await verifyAdmin();
  const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", id).single();
  if (!vehicle) return;
  const payload = {
    slug: `${slugify(vehicle.title)}-${crypto.randomUUID().slice(0, 6)}`, title: vehicle.title, make: vehicle.make, model: vehicle.model,
    variant: vehicle.variant, year: vehicle.year, price: vehicle.price, currency: vehicle.currency, mileage: vehicle.mileage,
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
  if (["available", "on_the_way", "reserved", "sold", "rental"].includes(status)) payload.availability = status;
  if (published) payload.published = published === "true";
  if (featured) payload.featured = featured === "true";
  if (archived === "true") payload.archived_at = new Date().toISOString();
  if (archived === "false") payload.archived_at = null;
  if (!Object.keys(payload).length) return;
  const supabase = await verifyAdmin();
  const { error } = await supabase.from("vehicles").update(payload).eq("id", id);
  if (error) throw new Error("The vehicle update could not be saved.");
  revalidatePath("/"); revalidatePath("/cars"); revalidatePath("/admin/inventory");
}

export async function bulkUpdateVehiclesAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const idsResult = z.array(z.string().uuid()).min(1).max(100).safeParse((() => { try { return JSON.parse(text(form, "ids")); } catch { return null; } })());
  if (!idsResult.success) return { error: "Select at least one vehicle and try again." };
  const operation = text(form, "operation");
  const status = text(form, "availability");
  const payload: Record<string, unknown> = {};
  if (operation === "publish") payload.published = true;
  else if (operation === "unpublish") payload.published = false;
  else if (operation === "feature") payload.featured = true;
  else if (operation === "unfeature") payload.featured = false;
  else if (operation === "archive") { payload.archived_at = new Date().toISOString(); payload.published = false; }
  else if (operation === "restore") payload.archived_at = null;
  else if (operation === "status" && ["available", "on_the_way", "reserved", "sold", "rental"].includes(status)) payload.availability = status;
  else return { error: "Choose a valid action for the selected vehicles." };

  try {
    const supabase = await verifyAdmin();
    const { error } = await supabase.from("vehicles").update(payload).in("id", idsResult.data);
    if (error) return { error: "The selected vehicles could not be updated." };
    revalidatePath("/"); revalidatePath("/cars"); revalidatePath("/admin"); revalidatePath("/admin/inventory");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The selected vehicles could not be updated." };
  }
}

export async function saveSettingsAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const supabase = await verifyAdmin();
    const businessHours = text(form, "business_hours").split("\n").map((line) => line.split(":" )).filter((parts) => parts.length >= 2).reduce<Record<string, string>>((result, parts) => { const day = parts[0].trim(); const hours = parts.slice(1).join(":").trim(); if (day && hours) result[day] = hours; return result; }, {});
    const socialLinks: Record<string, string> = {};
    for (const platform of ["instagram", "facebook", "youtube", "tiktok"]) { const value = text(form, platform); if (value) socialLinks[platform] = value; }
    const settings = { business_name: text(form, "business_name"), slogan: text(form, "slogan"), phone: nullable(text(form, "phone")), whatsapp: nullable(text(form, "whatsapp")), email: nullable(text(form, "email")), address: nullable(text(form, "address")), currency: nullable(text(form, "currency")), homepage_title: text(form, "homepage_title"), homepage_subtitle: text(form, "homepage_subtitle"), seo_title: text(form, "seo_title"), seo_description: text(form, "seo_description"), about_text: nullable(text(form, "about_text")), financing_enabled: text(form, "financing_enabled") === "on", financing_notes: nullable(text(form, "financing_notes")), show_sold: text(form, "show_sold") === "on", business_hours: businessHours, social_links: socialLinks, logo_path: nullable(text(form, "logo_path")) };
    const parsed = z.object({ business_name: z.string().min(2).max(120), slogan: z.string().max(180), phone: z.string().max(40).nullable(), whatsapp: z.string().max(40).nullable(), email: z.union([z.string().email(), z.literal("")]).nullable(), address: z.string().max(300).nullable(), currency: z.string().max(8).nullable(), homepage_title: z.string().min(2).max(180), homepage_subtitle: z.string().max(350), seo_title: z.string().min(1).max(120), seo_description: z.string().min(1).max(320), about_text: z.string().max(10000).nullable(), financing_enabled: z.boolean(), financing_notes: z.string().max(2000).nullable(), show_sold: z.boolean(), business_hours: z.record(z.string(), z.string()), social_links: z.record(z.string(), z.string()), logo_path: z.string().max(300).nullable() }).safeParse(settings);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Review the website details." };
    const { error } = await supabase.from("site_settings").update(parsed.data).eq("id", 1);
    if (error) return { error: "Website settings could not be saved." };
    revalidatePath("/", "layout"); return { ok: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unable to save website settings." }; }
}

export async function updateInquiryAction(form: FormData) {
  const id = text(form, "id"); const status = text(form, "status");
  if (!z.string().uuid().safeParse(id).success || !["new", "contacted", "closed"].includes(status)) return;
  const supabase = await verifyAdmin(); await supabase.from("inquiries").update({ status }).eq("id", id);
  revalidatePath("/admin/inquiries"); revalidatePath("/admin");
}

export async function deleteInquiryAction(form: FormData) {
  const id = text(form, "id"); if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await verifyAdmin(); await supabase.from("inquiries").delete().eq("id", id);
  revalidatePath("/admin/inquiries"); revalidatePath("/admin");
}

export async function saveFaqAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const supabase = await verifyAdmin(); const id = text(form, "id");
    const parsed = z.object({ question: z.string().trim().min(4).max(300), answer: z.string().trim().min(5).max(5000), sort_order: z.coerce.number().int().min(0).max(10000), published: z.boolean() }).safeParse({ question: text(form, "question"), answer: text(form, "answer"), sort_order: text(form, "sort_order") || 0, published: text(form, "published") === "on" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { error } = id ? await supabase.from("faq_items").update(parsed.data).eq("id", id) : await supabase.from("faq_items").insert(parsed.data);
    if (error) return { error: "FAQ item could not be saved." };
    revalidatePath("/faq"); revalidatePath("/admin/content"); return { ok: true };
  } catch { return { error: "Unable to save this FAQ item." }; }
}

export async function deleteFaqAction(form: FormData) {
  const id = text(form, "id"); if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await verifyAdmin(); await supabase.from("faq_items").delete().eq("id", id);
  revalidatePath("/faq"); revalidatePath("/admin/content");
}

export async function saveContentPageAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  try {
    const supabase = await verifyAdmin();
    const parsed = z.object({ slug: z.enum(["privacy", "terms"]), title: z.string().min(2).max(180), body: z.string().max(15000), seo_title: z.string().max(180).optional(), seo_description: z.string().max(350).optional(), published: z.boolean() }).refine((page) => !page.published || page.body.trim().length >= 25, { message: "Add at least a few sentences before publishing a policy page." }).safeParse({ slug: text(form, "slug"), title: text(form, "title"), body: text(form, "body"), seo_title: text(form, "seo_title"), seo_description: text(form, "seo_description"), published: text(form, "published") === "on" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { error } = await supabase.from("content_pages").upsert({ ...parsed.data, seo_title: nullable(parsed.data.seo_title ?? ""), seo_description: nullable(parsed.data.seo_description ?? "") }, { onConflict: "slug" });
    if (error) return { error: "Page could not be saved." };
    revalidatePath(`/${parsed.data.slug}`); revalidatePath("/admin/content"); return { ok: true };
  } catch { return { error: "Unable to save page content." }; }
}
