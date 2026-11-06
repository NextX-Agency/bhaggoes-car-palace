// Browser-side photo upload for the dashboard. Photos are shrunk and uploaded several at a time instead of
// one by one, and shrinking can start as soon as photos are chosen (warmPhotos), before the car is saved.
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupportedPhoto, maxPhotoBytes, maxSourcePhotoBytes, preparePhoto } from "./photo-optimize";

export const maxPhotosPerVehicle = 15;
// Safari on an iPad can stall when several camera originals are encoded and sent together.
const UPLOAD_CONCURRENCY = 2;
// Decoding photos is the memory-heavy step (iPads), so fewer of those run at once.
const PREPARE_CONCURRENCY = 2;

export type UploadedPhoto = { id: string; storage_path: string; alt_text: string; sort_order: number; is_cover: boolean; url: string };
export type UploadResult = { uploaded: UploadedPhoto[]; issues: string[]; retry: File[]; ordered: boolean };

/** Runs tasks with at most `limit` running at the same time. */
function limiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => { active -= 1; queue.shift()?.(); };
  return <T,>(task: () => Promise<T>) => new Promise<T>((resolve, reject) => {
    const run = () => { active += 1; task().then(resolve, reject).finally(next); };
    if (active < limit) run(); else queue.push(run);
  });
}

const prepareLimit = limiter(PREPARE_CONCURRENCY);
const prepared = new WeakMap<File, Promise<File>>();

/** Starts shrinking photos in the background; the upload later reuses the result. */
export function preparedPhoto(file: File) {
  let job = prepared.get(file);
  if (!job) {
    job = prepareLimit(() => preparePhoto(file));
    // A failed preparation is reported by the upload; nothing to do with it here.
    job.catch(() => undefined);
    prepared.set(file, job);
  }
  return job;
}

export function warmPhotos(files: File[]) {
  for (const file of files) if (isSupportedPhoto(file) && file.size <= maxSourcePhotoBytes) void preparedPhoto(file);
}

async function uploadWithRetry(client: SupabaseClient, path: string, photo: File) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { error } = await client.storage.from("vehicle-images").upload(path, photo, { contentType: photo.type, upsert: false });
      if (!error || (attempt > 0 && String(error.statusCode) === "409")) return true;
    } catch { /* A lost connection can recover on the next attempt. */ }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
}

/** Sort positions 0–14 that are still free, so new photos never collide with existing ones. */
function freePositions(taken: number[], count: number) {
  const used = new Set(taken);
  const free: number[] = [];
  for (let position = 0; position < maxPhotosPerVehicle && free.length < count; position += 1) if (!used.has(position)) free.push(position);
  return free;
}

export async function uploadVehiclePhotos({ client, vehicleId, files, existing, altBase, onProgress }: {
  client: SupabaseClient;
  vehicleId: string;
  files: File[];
  /** The photos the car already has, in their current order. */
  existing: { id: string; sort_order: number }[];
  altBase: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<UploadResult> {
  const issues: string[] = [];
  const retry: File[] = [];
  const positions = freePositions(existing.map((photo) => photo.sort_order), files.length);
  if (positions.length < files.length) return { uploaded: [], issues: [`Een auto kan maximaal ${maxPhotosPerVehicle} foto’s hebben.`], retry: [], ordered: false };
  const results: (UploadedPhoto | null)[] = files.map(() => null);
  const uploadLimit = limiter(UPLOAD_CONCURRENCY);
  let done = 0;
  onProgress?.(0, files.length);

  await Promise.all(files.map((file, index) => uploadLimit(async () => {
    try {
      if (!isSupportedPhoto(file)) { issues.push(`${file.name} is geen ondersteunde foto (gebruik JPEG, PNG, WebP, AVIF of HEIC).`); return; }
      if (file.size > maxSourcePhotoBytes) { issues.push(`${file.name} is groter dan ${maxSourcePhotoBytes / 1024 / 1024} MB.`); return; }
      let optimized: File;
      try { optimized = await preparedPhoto(file); } catch (cause) { issues.push(`${file.name} ${cause instanceof Error ? cause.message : "kon niet worden verwerkt."}`); return; }
      if (optimized.size > maxPhotoBytes) { issues.push(`${file.name} is ook na het verkleinen groter dan ${maxPhotoBytes / 1024 / 1024} MB.`); return; }
      const extension = optimized.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${vehicleId}/${crypto.randomUUID()}.${extension}`;
      if (!await uploadWithRetry(client, path, optimized)) { issues.push(`${file.name} kon niet worden geüpload. Controleer je verbinding.`); retry.push(file); return; }
      const sortOrder = positions[index];
      const altText = `${altBase} photo ${sortOrder + 1}`;
      const { data, error } = await client.from("vehicle_images").insert({ vehicle_id: vehicleId, storage_path: path, alt_text: altText, sort_order: sortOrder, is_cover: false }).select("id").single();
      if (error || !data) { await client.storage.from("vehicle-images").remove([path]); issues.push(`${file.name} kon niet aan de auto worden toegevoegd.`); retry.push(file); return; }
      results[index] = { id: data.id, storage_path: path, alt_text: altText, sort_order: sortOrder, is_cover: false, url: URL.createObjectURL(optimized) };
    } catch { issues.push(`${file.name} kon niet worden geüpload. Controleer je verbinding.`); retry.push(file); }
    finally { done += 1; onProgress?.(done, files.length); }
  })));

  const uploaded = results.filter((photo): photo is UploadedPhoto => Boolean(photo));
  let ordered = false;
  if (uploaded.length) {
    // One call puts every photo in order (existing first, new ones in the order chosen) and makes the first the cover.
    const order = [...[...existing].sort((a, b) => a.sort_order - b.sort_order).map((photo) => photo.id), ...uploaded.map((photo) => photo.id)];
    try {
      const { error } = await client.rpc("reorder_vehicle_images", { p_vehicle_id: vehicleId, p_image_ids: order });
      if (error) throw error;
      ordered = true;
      uploaded.forEach((photo, index) => { photo.sort_order = existing.length + index; photo.is_cover = existing.length + index === 0; });
    } catch { issues.push("De foto’s zijn geüpload, maar de volgorde kon niet worden opgeslagen. Controleer de volgorde op de pagina van de auto."); }
  }
  return { uploaded, issues, retry, ordered };
}
