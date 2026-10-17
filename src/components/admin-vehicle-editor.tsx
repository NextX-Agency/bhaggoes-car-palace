"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
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
    formData.delete("photos");
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
    const client = createClient();
    const { error } = await client.from("vehicle_images").delete().eq("id", image.id);
    if (error) { setMessage("Could not remove the photo record."); return; }
    if (!image.storage_path.startsWith("/images/")) {
      const storage = await client.storage.from("vehicle-images").remove([image.storage_path]);
      if (storage.error) setMessage("Photo removed from the listing, but its stored file could not be deleted. Ask an administrator to clean up storage.");
    }
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
  const defaults = { title: vehicle?.title ?? "", make: vehicle?.make ?? "", model: vehicle?.model ?? "", variant: vehicle?.variant ?? "", year: vehicle?.year ?? "", price: vehicle?.price ?? "", cash_price: vehicle?.cash_price ?? "", currency: vehicle?.currency ?? "", mileage: vehicle?.mileage ?? "", engine_capacity: vehicle?.engine_capacity ?? "", fuel_type: vehicle?.fuel_type ?? "", transmission: vehicle?.transmission ?? "", drive_type: vehicle?.drive_type ?? "", body_type: vehicle?.body_type ?? "", exterior_color: vehicle?.exterior_color ?? "", interior_color: vehicle?.interior_color ?? "", seats: vehicle?.seats ?? "", doors: vehicle?.doors ?? "", description: vehicle?.description ?? "", stock_number: vehicle?.stock_number ?? "", vin: privateInfo?.vin ?? "", admin_notes: privateInfo?.admin_notes ?? "" };
  const archived = Boolean(vehicle?.archived_at);
  const selectedFeatures = featureText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  const progress = uploadProgress ? Math.round(((uploadProgress.current - 1) / uploadProgress.total) * 100) : 0;
  return <form className="admin-form vehicle-editor" onSubmit={handleSubmit}>
    <input type="hidden" name="id" value={savedId} />
    <div className="editor-main">
      <section className="admin-form-section" aria-labelledby="basic-heading"><h2 id="basic-heading">Basic details</h2><div className="admin-form-grid">
        <label className="admin-field span-all">Listing title<input name="title" defaultValue={defaults.title} required maxLength={180} placeholder="e.g. 2021 Toyota RAV4 Limited" /></label>
        <label className="admin-field">Make<input name="make" defaultValue={defaults.make} required placeholder="Toyota" /></label>
        <label className="admin-field">Model<input name="model" defaultValue={defaults.model} required placeholder="RAV4" /></label>
        <label className="admin-field">Variant / trim<input name="variant" defaultValue={defaults.variant} placeholder="Limited" /></label>
        <label className="admin-field">Year<input name="year" type="number" inputMode="numeric" min="1886" max="2200" defaultValue={defaults.year} /></label>
        <label className="admin-field">Condition<select name="condition" defaultValue={vehicle?.condition ?? "used"}><option value="new">New</option><option value="used">Used</option></select></label>
        <label className="admin-field">Mileage (km)<input name="mileage" type="number" inputMode="numeric" min="0" step="1" defaultValue={defaults.mileage} /></label>
        <label className="admin-field span-all">Description<textarea name="description" defaultValue={defaults.description} maxLength={10000} rows={6} /></label>
      </div></section>

      <section className="admin-form-section" aria-labelledby="specs-heading"><h2 id="specs-heading">Specifications</h2><div className="admin-form-grid">
        <label className="admin-field">Engine<input name="engine_capacity" defaultValue={defaults.engine_capacity} placeholder="2.5L" /></label>
        <label className="admin-field">Fuel type<input name="fuel_type" defaultValue={defaults.fuel_type} placeholder="Gasoline" list="fuel-options" /></label>
        <label className="admin-field">Transmission<input name="transmission" defaultValue={defaults.transmission} placeholder="Automatic" list="transmission-options" /></label>
        <label className="admin-field">Drive type<input name="drive_type" defaultValue={defaults.drive_type} placeholder="AWD" /></label>
        <label className="admin-field">Body type<input name="body_type" defaultValue={defaults.body_type} placeholder="SUV" list="body-options" /></label>
        <label className="admin-field">Exterior color<input name="exterior_color" defaultValue={defaults.exterior_color} /></label>
        <label className="admin-field">Interior color<input name="interior_color" defaultValue={defaults.interior_color} /></label>
        <label className="admin-field">Seats<input name="seats" type="number" inputMode="numeric" min="1" max="100" defaultValue={defaults.seats} /></label>
        <label className="admin-field">Doors<input name="doors" type="number" inputMode="numeric" min="1" max="20" defaultValue={defaults.doors} /></label>
      </div>
      <datalist id="fuel-options"><option value="Gasoline" /><option value="Diesel" /><option value="Hybrid" /><option value="Electric" /></datalist>
      <datalist id="transmission-options"><option value="Automatic" /><option value="Manual" /><option value="CVT" /></datalist>
      <datalist id="body-options"><option value="SUV" /><option value="Sedan" /><option value="Hatchback" /><option value="Pickup" /><option value="Van" /><option value="Coupe" /></datalist></section>

      <section className="admin-form-section" aria-labelledby="photos-heading"><div className="admin-section-head"><div><h2 id="photos-heading">Vehicle photos</h2><p className="muted">Add up to 15 views: front, sides, rear, interior and details. Drag to reorder; the first photo is the cover.</p></div><span className="muted">{photos.length} / 15</span></div>
        {photos.length ? <div className="admin-photo-grid" role="list" aria-label="Vehicle photos">{photos.map((photo, index) => <div className={`admin-photo${index === 0 ? " cover" : ""}${draggingPhoto === index ? " is-dragging" : ""}`} key={photo.id} role="listitem" draggable onDragStart={(event) => { setDraggingPhoto(index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); void reorderPhoto(from, index); }} onDragEnd={() => setDraggingPhoto(null)} aria-label={`Photo ${index + 1}${index === 0 ? ", cover photo" : ""}`}>
          {photo.url ? <Image src={photo.url} alt={photo.alt_text ?? "Vehicle photo"} fill sizes="200px" unoptimized /> : <span className="photo-no-preview">Image saved</span>}
          {index === 0 ? <span className="cover-label">Cover</span> : null}
          <button className="photo-remove" type="button" onClick={() => { if (window.confirm("Remove this photo?")) void removePhoto(photo); }} aria-label={`Remove photo ${index + 1}`}><Trash2 size={14} /></button>
          <div className="photo-actions">
            <button type="button" onClick={() => void movePhoto(index, -1)} aria-label={`Move photo ${index + 1} earlier`} disabled={index === 0}><ArrowLeft size={14} /></button>
            {index > 0 ? <button type="button" className="photo-cover-button" onClick={() => void reorderPhoto(index, 0)} aria-label={`Use photo ${index + 1} as cover`}>Set cover</button> : null}
            <button type="button" onClick={() => void movePhoto(index, 1)} aria-label={`Move photo ${index + 1} later`} disabled={index === photos.length - 1}><ArrowRight size={14} /></button>
          </div>
        </div>)}</div> : null}
        <div className={`drop-zone${uploading ? " is-uploading" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const files = Array.from(event.dataTransfer.files); if (!savedId) { setMessage("Save this vehicle first to enable photo uploads."); return; } if (files.some((file) => !file.type.startsWith("image/"))) { setMessage("Drop image files only."); return; } if (files.length) void uploadFiles(savedId, files); }}>
          <ImagePlus size={24} aria-hidden="true" />
          <label className="photo-file-picker">Choose photos<input type="file" name="photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={photos.length >= 15 || uploading} onChange={(event) => { const input = event.currentTarget; const files = Array.from(input.files ?? []); if (savedId && files.length) { input.value = ""; void uploadFiles(savedId, files); } else if (files.length) setMessage(`${files.length} photo${files.length === 1 ? "" : "s"} selected. They upload when you save.`); }} /></label>
          <p>{savedId ? "or drag photos here · JPEG, PNG, WebP or AVIF up to 15 MB" : "Photos upload when you save the car."}</p>
        </div>
        {uploadProgress ? <div className="upload-progress" role="status" aria-live="polite"><div className="upload-progress-bar"><span style={{ width: `${Math.max(progress, 6)}%` }} /></div><p><LoaderCircle size={14} className="spin" aria-hidden="true" /> Uploading {uploadProgress.current} of {uploadProgress.total}: {uploadProgress.name}</p></div> : null}
      </section>

      <section className="admin-form-section" aria-labelledby="features-heading"><h2 id="features-heading">Features</h2>
        <div className="feature-chips">{commonFeatures.map((feature) => <label className={`feature-chip${selectedFeatures.includes(feature) ? " is-on" : ""}`} key={feature}><input type="checkbox" checked={selectedFeatures.includes(feature)} onChange={(event) => toggledFeature(feature, event.target.checked)} />{feature}</label>)}</div>
        <label className="admin-field" style={{ marginTop: 18 }}>All features <span className="help-text">One per line</span><textarea name="features" value={featureText} onChange={(event) => setFeatureText(event.target.value)} rows={4} /></label>
      </section>
    </div>

    <div className="editor-side">
      <section className="admin-form-section" aria-labelledby="pricing-heading"><h2 id="pricing-heading">Price & status</h2><div className="admin-form-grid single">
        {archived ? <p className="help-text">This car is archived and hidden. Saving edits will keep it archived. Use Restore in Inventory when you want to show it again.</p> : null}
        <div className="price-field"><label className="admin-field">Interne prijs<input name="price" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={defaults.price} placeholder="On request" /></label><label className="admin-field">Cashprijs / giraal deal<input name="cash_price" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={defaults.cash_price} placeholder="On request" /></label></div>
        <label className="admin-field">Currency<input name="currency" defaultValue={defaults.currency} placeholder="USD" maxLength={8} /></label>
        <p className="help-text">If you enter a price, enter its currency too (for example USD or SRD).</p>
        <label className="admin-field">Availability<select name="availability" defaultValue={vehicle?.availability ?? "available"}><option value="available">Available</option><option value="on_the_way">On the way</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="rental">Rental</option></select></label>
        <label className="admin-field">Stock number<input name="stock_number" defaultValue={defaults.stock_number} /></label>
        <div className="admin-switches">
          <label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={vehicle?.published ?? false} disabled={archived} /><span><strong>Show on website</strong><small>{archived ? "Restore this car in Inventory first" : "Visitors can open this listing"}</small></span></label>
          <label className="admin-checkbox"><input type="checkbox" name="featured" defaultChecked={vehicle?.featured ?? false} /><span><strong>Show on homepage</strong><small>Appears in the homepage car section</small></span></label>
        </div>
      </div></section>
      <section className="admin-form-section" aria-labelledby="private-heading"><h2 id="private-heading">Private</h2><div className="admin-form-grid single">
        <label className="admin-field">VIN<input name="vin" defaultValue={defaults.vin} autoComplete="off" /></label>
        <label className="admin-field">Staff notes<textarea name="admin_notes" defaultValue={defaults.admin_notes} rows={4} /></label>
        <p className="help-text">Only staff can see these fields.</p>
      </div></section>
    </div>

    <div className="admin-form-footer"><div>{state.error ? <p className="admin-feedback admin-error" role="alert">{state.error}</p> : message ? <p className="admin-feedback" role="status"><Check size={14} /> {message}</p> : null}</div><div className="admin-row-actions">{savedId ? <button className="danger-button" type="button" disabled={pending || uploading} onClick={() => { if (!window.confirm("Delete this car permanently? This cannot be undone. To hide it without losing it, use Archive in Inventory.")) return; const data = new FormData(); data.set("id", savedId); setDeleting(true); startTransition(async () => { const result = await deleteVehicleAction(data); setDeleting(false); if (result.error) { setState(result); setMessage(""); return; } if (result.warning) window.alert(result.warning); router.push("/admin/inventory"); }); }}>{deleting ? "Deleting…" : "Delete permanently"}</button> : null}<Link className="button button-ghost" href="/admin/inventory">Cancel</Link><button className="button button-primary" type="submit" disabled={pending || uploading}>{pending && !deleting ? "Saving…" : savedId ? "Save changes" : "Save car"}</button></div></div>
  </form>;
}
