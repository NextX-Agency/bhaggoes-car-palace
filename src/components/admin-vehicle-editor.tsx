"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { deleteVehicleAction, saveVehicleAction } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/browser";

const commonFeatures = ["Air conditioning", "Backup camera", "Bluetooth", "Apple CarPlay", "Android Auto", "Leather seats", "Keyless entry", "Alloy wheels", "Cruise control", "Sunroof", "Parking sensors"];
const maxPhotoBytes = 15 * 1024 * 1024;

async function optimizePhoto(file: File): Promise<File> {
  if (!globalThis.createImageBitmap || (file.size < 450_000 && !file.name.match(/\.png$/i))) return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/webp" && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "vehicle-photo";
    return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export function AdminVehicleEditor({ vehicle }: { vehicle?: Vehicle | null }) {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({}); const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [savedId, setSavedId] = useState(vehicle?.id ?? "");
  const [photos, setPhotos] = useState(vehicle?.images ?? []); const [featureText, setFeatureText] = useState((vehicle?.features ?? []).join("\n")); const [uploading, setUploading] = useState(false); const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null);
  const previewUrls = useRef(new Set<string>());
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const toggledFeature = (feature: string, checked: boolean) => {
    const selected = new Set(featureText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean));
    if (checked) selected.add(feature); else selected.delete(feature);
    setFeatureText([...selected].join("\n"));
  };
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const formData = new FormData(form); formData.set("features", featureText);
    const files = Array.from(form.querySelector<HTMLInputElement>('input[name="photos"]')?.files ?? []);
    startTransition(async () => { setMessage(""); const result = await saveVehicleAction({}, formData); setState(result); if (result.error) { setMessage(result.error); return; } if (!result.id) { setMessage("Vehicle could not be saved."); return; } setSavedId(result.id); setMessage("Vehicle saved."); if (files.length) await uploadFiles(result.id, files); if (!vehicle) router.replace(`/admin/inventory/${result.id}`); });
  }
  async function uploadFiles(vehicleId: string, files: File[]) {
    if (uploading) return;
    if (photos.length + files.length > 15) { setMessage("A vehicle can have up to 15 photos."); return; }
    setUploading(true); setMessage("");
    try {
      const client = createClient();
      let uploaded = 0;
      const issues: string[] = [];
      for (const [index, file] of files.entries()) {
        setUploadProgress({ current: index + 1, total: files.length, name: file.name });
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > maxPhotoBytes) { issues.push(`${file.name} is not a supported image or is over 15 MB.`); continue; }
        const optimized = await optimizePhoto(file);
        if (optimized.size > maxPhotoBytes) { issues.push(`${file.name} is still over 15 MB after optimization.`); continue; }
        const extension = optimized.type.split("/")[1].replace("jpeg", "jpg"); const path = `${vehicleId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage.from("vehicle-images").upload(path, optimized, { contentType: optimized.type, upsert: false });
        if (uploadError) { issues.push(`${file.name} could not be uploaded. Check your connection and try again.`); continue; }
        const nextOrder = photos.length + uploaded;
        const imageAlt = `${vehicle?.title ?? "Vehicle"} photo ${nextOrder + 1}`;
        const { data: imageRecord, error } = await client.from("vehicle_images").insert({ vehicle_id: vehicleId, storage_path: path, alt_text: imageAlt, sort_order: nextOrder, is_cover: nextOrder === 0 }).select("id").single();
        if (error || !imageRecord) { await client.storage.from("vehicle-images").remove([path]); issues.push(`${file.name} could not be added to the vehicle.`); }
        else {
          uploaded += 1;
          const previewUrl = URL.createObjectURL(optimized);
          previewUrls.current.add(previewUrl);
          setPhotos((current) => [...current, { id: imageRecord.id, storage_path: path, alt_text: imageAlt, sort_order: current.length, is_cover: current.length === 0, url: previewUrl }]);
        }
      }
      const input = document.querySelector<HTMLInputElement>('input[name="photos"]'); if (input) input.value = "";
      setMessage(issues.length ? `${uploaded} of ${files.length} photos uploaded. ${issues.join(" ")}` : `${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded and optimized where possible.`);
    } catch { setMessage("Photo storage is not configured. Check the Supabase connection."); }
    finally { setUploading(false); setUploadProgress(null); }
  }
  async function removePhoto(image: Vehicle["images"][number]) {
    const client = createClient(); const storage = await client.storage.from("vehicle-images").remove([image.storage_path]);
    if (storage.error) { setMessage("Could not remove this photo."); return; }
    const { error } = await client.from("vehicle_images").delete().eq("id", image.id);
    if (error) { setMessage("Could not remove the photo record."); return; }
    const remaining = photos.filter((item) => item.id !== image.id);
    if (savedId && remaining.length) {
      const { error: orderError } = await client.rpc("reorder_vehicle_images", { p_vehicle_id: savedId, p_image_ids: remaining.map((item) => item.id) });
      if (orderError) setMessage("The photo was removed, but its replacement cover could not be set. Reload this listing to verify photo order.");
    }
    if (image.url?.startsWith("blob:")) { URL.revokeObjectURL(image.url); previewUrls.current.delete(image.url); }
    setPhotos(remaining.map((item, index) => ({ ...item, sort_order: index, is_cover: index === 0 })));
  }
  async function reorderPhoto(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos]; const [moved] = next.splice(from, 1); if (!moved) return; next.splice(to, 0, moved);
    const client = createClient(); const { error } = await client.rpc("reorder_vehicle_images", { p_vehicle_id: savedId, p_image_ids: next.map((image) => image.id) });
    if (error) { setMessage("Photo order could not be saved."); return; }
    setPhotos(next.map((item, position) => ({ ...item, sort_order: position, is_cover: position === 0 })));
    setDraggingPhoto(null);
  }
  async function movePhoto(index: number, direction: -1 | 1) {
    await reorderPhoto(index, index + direction);
  }
  const privateInfo = vehicle as (Vehicle & { vin?: string | null; admin_notes?: string | null }) | null | undefined;
  const defaults = { title: vehicle?.title ?? "", make: vehicle?.make ?? "", model: vehicle?.model ?? "", variant: vehicle?.variant ?? "", year: vehicle?.year ?? "", price: vehicle?.price ?? "", currency: vehicle?.currency ?? "", mileage: vehicle?.mileage ?? "", engine_capacity: vehicle?.engine_capacity ?? "", fuel_type: vehicle?.fuel_type ?? "", transmission: vehicle?.transmission ?? "", drive_type: vehicle?.drive_type ?? "", body_type: vehicle?.body_type ?? "", exterior_color: vehicle?.exterior_color ?? "", interior_color: vehicle?.interior_color ?? "", seats: vehicle?.seats ?? "", doors: vehicle?.doors ?? "", description: vehicle?.description ?? "", stock_number: vehicle?.stock_number ?? "", vin: privateInfo?.vin ?? "", admin_notes: privateInfo?.admin_notes ?? "" };
  return <form className="admin-form" onSubmit={handleSubmit}>
    <input type="hidden" name="id" value={savedId} />
    <section className="admin-form-section"><h2>Basic information</h2><div className="admin-form-grid">
      <label className="admin-field span-2">Vehicle title<input name="title" defaultValue={defaults.title} required maxLength={180} placeholder="e.g. Toyota RAV4 Limited" /></label>
      <label className="admin-field">Make<input name="make" defaultValue={defaults.make} required /></label><label className="admin-field">Model<input name="model" defaultValue={defaults.model} required /></label><label className="admin-field">Variant / trim<input name="variant" defaultValue={defaults.variant} /></label>
      <label className="admin-field">Year<input name="year" type="number" min="1886" max="2200" defaultValue={defaults.year} /></label><label className="admin-field">Price<input name="price" type="number" min="0" step="0.01" defaultValue={defaults.price} /></label><label className="admin-field">Currency<input name="currency" defaultValue={defaults.currency} placeholder="SRD, USD…" /></label>
      <label className="admin-field">Condition<select name="condition" defaultValue={vehicle?.condition ?? "used"}><option value="new">New</option><option value="used">Used</option></select></label><label className="admin-field">Availability<select name="availability" defaultValue={vehicle?.availability ?? "available"}><option value="available">Available</option><option value="on_the_way">On the way</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="rental">Rental</option></select></label><label className="admin-field">Stock / reference number<input name="stock_number" defaultValue={defaults.stock_number} /></label>
      <label className="admin-field span-all">Description<textarea name="description" defaultValue={defaults.description} maxLength={10000} rows={5} /></label>
    </div></section>
    <section className="admin-form-section"><h2>Specifications</h2><div className="admin-form-grid"><label className="admin-field">Mileage<input name="mileage" type="number" min="0" step="1" defaultValue={defaults.mileage} /></label><label className="admin-field">Engine capacity<input name="engine_capacity" defaultValue={defaults.engine_capacity} placeholder="e.g. 2.5L" /></label><label className="admin-field">Fuel type<input name="fuel_type" defaultValue={defaults.fuel_type} placeholder="Gasoline, hybrid…" /></label><label className="admin-field">Transmission<input name="transmission" defaultValue={defaults.transmission} placeholder="Automatic, manual…" /></label><label className="admin-field">Drive type<input name="drive_type" defaultValue={defaults.drive_type} placeholder="FWD, AWD…" /></label><label className="admin-field">Body type<input name="body_type" defaultValue={defaults.body_type} placeholder="SUV, sedan…" /></label><label className="admin-field">Exterior color<input name="exterior_color" defaultValue={defaults.exterior_color} /></label><label className="admin-field">Interior color<input name="interior_color" defaultValue={defaults.interior_color} /></label><label className="admin-field">Seats<input name="seats" type="number" min="1" max="100" defaultValue={defaults.seats} /></label><label className="admin-field">Doors<input name="doors" type="number" min="1" max="20" defaultValue={defaults.doors} /></label></div></section>
    <section className="admin-form-section"><h2>Features and equipment</h2><div className="admin-checkbox-row">{commonFeatures.map((feature) => <label className="admin-checkbox" key={feature}><input type="checkbox" checked={featureText.split(/[\n,]/).map((item) => item.trim()).includes(feature)} onChange={(event) => toggledFeature(feature, event.target.checked)} />{feature}</label>)}</div><label className="admin-field" style={{ marginTop: 16 }}>Add or edit features <span className="help-text">Separate features with a new line or comma.</span><textarea name="features" value={featureText} onChange={(event) => setFeatureText(event.target.value)} rows={4} placeholder="Enter another feature" /></label></section>
    <section className="admin-form-section"><h2>Private details</h2><div className="admin-form-grid"><label className="admin-field">VIN <span className="help-text">Only visible to administrators.</span><input name="vin" defaultValue={defaults.vin} /></label><label className="admin-field span-2">Admin notes <span className="help-text">These notes are never shown publicly.</span><textarea name="admin_notes" defaultValue={defaults.admin_notes} rows={3} /></label></div></section>
    <section className="admin-form-section"><h2>Photos</h2><p className="section-subtitle">Add up to 15 JPEG, PNG, WebP, or AVIF images. Each photo may be up to 15 MB. Large images are optimized in your browser before upload.</p>
      <div className="admin-photo-grid" role="list" aria-label="Vehicle photos">{photos.map((photo, index) => <div className={`admin-photo${photo.is_cover || index === 0 ? " cover" : ""}${draggingPhoto === index ? " is-dragging" : ""}`} key={photo.id} role="listitem" draggable onDragStart={(event) => { setDraggingPhoto(index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); void reorderPhoto(from, index); }} onDragEnd={() => setDraggingPhoto(null)} aria-label={`Photo ${index + 1}${index === 0 ? ", cover image" : ""}`}>
        {photo.url ? <Image src={photo.url} alt={photo.alt_text ?? "Vehicle photo"} fill sizes="180px" unoptimized /> : <span className="photo-no-preview">Image saved</span>}
        <button type="button" onClick={() => void removePhoto(photo)} aria-label={`Remove photo ${index + 1}`}><Trash2 size={13} /></button>
        <div className="photo-actions"><button type="button" onClick={() => void movePhoto(index, -1)} aria-label={`Move photo ${index + 1} earlier`} disabled={index === 0}><ArrowUp size={12} /></button><button type="button" onClick={() => void movePhoto(index, 1)} aria-label={`Move photo ${index + 1} later`} disabled={index === photos.length - 1}><ArrowDown size={12} /></button>{index === 0 ? <span>Cover</span> : null}</div>
      </div>)}</div>
      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const files = Array.from(event.dataTransfer.files); if (!savedId) { setMessage("Save this vehicle first to enable photo uploads."); return; } if (files.some((file) => !file.type.startsWith("image/"))) { setMessage("Drop image files only."); return; } if (files.length) void uploadFiles(savedId, files); }}>
        <ImagePlus size={20} /><strong>Add vehicle photos</strong><label className="photo-file-picker">Choose image files<input type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={!savedId || photos.length >= 15 || uploading} onChange={(event) => { const input = event.currentTarget; const files = Array.from(input.files ?? []); input.value = ""; if (savedId && files.length) void uploadFiles(savedId, files); }} /></label>
        <p>{!savedId ? "Save this vehicle first to enable photo uploads." : `${photos.length} of 15 photos · Drop files here to upload`}</p>
      </div>
      {uploadProgress ? <p className="admin-feedback" role="status" aria-live="polite"><LoaderCircle size={14} className="spin" /> Preparing and uploading photo {uploadProgress.current} of {uploadProgress.total}: {uploadProgress.name}</p> : null}
    </section>
    <section className="admin-form-section"><h2>Publishing</h2><div className="admin-checkbox-row"><label className="admin-checkbox"><input type="checkbox" name="featured" defaultChecked={vehicle?.featured ?? false} />Feature this vehicle on the homepage</label><label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={vehicle?.published ?? false} />Publish on the public website</label></div></section>
    <div className="admin-form-footer"><div>{state.error ? <p className="admin-feedback admin-error" role="alert">{state.error}</p> : message ? <p className="admin-feedback" role="status"><Check size={14} /> {message}</p> : <p className="admin-feedback">Changes are saved to your dealership website.</p>}</div><div className="admin-row-actions"><Link href="/admin/inventory">Cancel</Link>{savedId ? <button className="danger-button" type="button" disabled={pending || uploading} onClick={() => { if (!window.confirm("Permanently delete this vehicle and its photo records?")) return; const data = new FormData(); data.set("id", savedId); setDeleting(true); startTransition(async () => { const result = await deleteVehicleAction(data); setDeleting(false); if (result.error) { setState(result); setMessage(""); return; } if (result.warning) window.alert(result.warning); router.push("/admin/inventory"); }); }}>{deleting ? "Deleting…" : "Delete"}</button> : null}<button className="button button-dark" type="submit" disabled={pending || uploading}>{pending && !deleting ? "Saving…" : "Save vehicle"}</button></div></div>
  </form>;
}
