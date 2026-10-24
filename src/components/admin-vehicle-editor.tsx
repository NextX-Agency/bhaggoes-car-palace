"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { deleteVehicleAction, deleteVehicleTemplateAction, saveVehicleAction, saveVehicleTemplateAction } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/browser";
import { parseListingText } from "@/lib/listing-import";
import { bodyTypes, currencies, driveTypes, fuelTypes, transmissionTypes, vehicleColors, vehicleMakes } from "@/lib/vehicle-catalog";
import { BrandLogo } from "@/components/brand-logo";
import { listingTitle, templateFieldNames, type VehicleTemplate, type VehicleTemplateFields } from "@/lib/vehicle-templates";

const commonFeatures = ["Air conditioning", "Backup camera", "Bluetooth", "Apple CarPlay", "Android Auto", "Leather seats", "Keyless entry", "Alloy wheels", "Cruise control", "Sunroof", "Parking sensors"];
const importLabels: Record<string, string> = { year: "Bouwjaar", make: "Merk", model: "Model", fuel_type: "Brandstof", transmission: "Transmissie", body_type: "Carrosserie", seats: "Zitplaatsen", stock_number: "Stocknummer", price: "Interne prijs", cash_price: "Cashprijs" };
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

export function AdminVehicleEditor({ vehicle, templates = [] }: { vehicle?: Vehicle | null; templates?: VehicleTemplate[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const generatedTitle = useRef("");
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({}); const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [savedId, setSavedId] = useState(vehicle?.id ?? "");
  const [photos, setPhotos] = useState(vehicle?.images ?? []); const [featureText, setFeatureText] = useState((vehicle?.features ?? []).join("\n")); const [uploading, setUploading] = useState(false); const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [importText, setImportText] = useState("");
  const [makePreview, setMakePreview] = useState(vehicle?.make ?? "");
  const [startMode, setStartMode] = useState<"paste" | "template">(vehicle ? "template" : "paste");
  const imported = parseListingText(importText);
  const previewUrls = useRef(new Set<string>());
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const toggledFeature = (feature: string, checked: boolean) => {
    const selected = new Set(featureText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean));
    if (checked) selected.add(feature); else selected.delete(feature);
    setFeatureText([...selected].join("\n"));
  };
  const field = (form: HTMLFormElement, name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  const refreshTitle = (form: HTMLFormElement) => {
    if (vehicle) return;
    const title = field(form, "title");
    if (!title || (title.value && title.value !== generatedTitle.current)) return;
    const next = listingTitle(field(form, "year")?.value ?? "", field(form, "make")?.value ?? "", field(form, "model")?.value ?? "", field(form, "variant")?.value ?? "");
    title.value = next;
    generatedTitle.current = next;
  };
  const applyTemplate = () => {
    const template = templates.find((item) => item.id === selectedTemplate);
    const form = formRef.current;
    if (!template || !form) return;
    for (const name of templateFieldNames) {
      const input = field(form, name);
      if (input) input.value = template.fields[name] ?? (name === "condition" ? "used" : "");
    }
    setFeatureText(template.fields.features.join("\n"));
    setMakePreview(field(form, "make")?.value ?? "");
    refreshTitle(form);
    setMessage(`Template “${template.name}” toegepast. Controleer de gegevens voor u opslaat.`);
  };
  const applyImportedText = () => {
    const form = formRef.current;
    if (!form) return;
    const entries = Object.entries(imported.fields);
    if (!entries.length && !imported.features.length) { setMessage("Geen herkenbare voertuiggegevens gevonden. Vul ze handmatig in."); return; }
    for (const [name, value] of entries) {
      const input = field(form, name);
      if (input && value) input.value = value;
    }
    if (imported.features.length) setFeatureText((current) => [...new Set([...current.split(/[\n,]/).map((value) => value.trim()).filter(Boolean), ...imported.features])].join("\n"));
    setMakePreview(field(form, "make")?.value ?? "");
    refreshTitle(form);
    setMessage("Advertentiegegevens ingevuld. Controleer de specificaties en prijzen voordat u opslaat.");
  };
  const saveTemplate = () => {
    const form = formRef.current;
    if (!form || !templateName.trim()) { setMessage("Geef de template eerst een naam."); return; }
    const fields = {
      ...Object.fromEntries(templateFieldNames.map((name) => [name, field(form, name)?.value ?? ""])),
      features: featureText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
    } as VehicleTemplateFields;
    const data = new FormData();
    data.set("name", templateName.trim());
    data.set("fields", JSON.stringify(fields));
    startTransition(async () => {
      const result = await saveVehicleTemplateAction(data);
      if (result.error) { setMessage(result.error); return; }
      setTemplateName("");
      setSelectedTemplate(result.id ?? "");
      setMessage("Template opgeslagen. Alle beheerders kunnen hem gebruiken.");
      router.refresh();
    });
  };
  const deleteTemplate = () => {
    const template = templates.find((item) => item.id === selectedTemplate);
    if (!template || !window.confirm(`Template “${template.name}” verwijderen?`)) return;
    const data = new FormData();
    data.set("id", template.id);
    startTransition(async () => {
      const result = await deleteVehicleTemplateAction(data);
      if (result.error) { setMessage(result.error); return; }
      setSelectedTemplate("");
      setMessage("Template verwijderd.");
      router.refresh();
    });
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
  const templatePreview = templates.find((item) => item.id === selectedTemplate);
  const templateValues = templatePreview ? templateFieldNames.filter((name) => name !== "condition" && templatePreview.fields[name]) : [];
  const progress = uploadProgress ? Math.round(((uploadProgress.current - 1) / uploadProgress.total) * 100) : 0;
  return <form ref={formRef} className="admin-form vehicle-editor" onSubmit={handleSubmit}>
    <input type="hidden" name="id" value={savedId} />
    <section className="admin-form-section editor-template-panel" aria-labelledby="template-heading">
      <h2 id="template-heading">{vehicle ? "Gegevens hergebruiken" : "Snelle start"}</h2>
      <div className="editor-shared-summary"><strong>Financiering, aankoopvoordelen en contact worden automatisch toegevoegd.</strong><Link href="/admin/settings">Wijzig vaste informatie</Link></div>
      {!vehicle ? <div className="editor-mode-switch" role="group" aria-label="Kies een snelle start"><button type="button" aria-pressed={startMode === "paste"} onClick={() => setStartMode("paste")}>Advertentie plakken</button><button type="button" aria-pressed={startMode === "template"} onClick={() => setStartMode("template")}>Template kiezen</button></div> : null}
      {!vehicle && startMode === "paste" ? <div className="editor-import"><h3>Advertentietekst plakken</h3><p className="help-text">Plak een bestaand bericht. Controleer de ingevulde gegevens voordat u opslaat.</p>
        <label className="admin-field">Bestaande advertentie<textarea value={importText} onChange={(event) => setImportText(event.target.value)} rows={5} placeholder={"2018 - Toyota Harrier | Panoramic sunroof | JBL sound system\nPrijs: $26950,-\nGiraal deal: $25950,-"} /></label>
        {Object.keys(imported.fields).length || imported.features.length ? <div className="editor-import-preview"><strong>Herkend:</strong>{Object.entries(imported.fields).map(([name, value]) => <span key={name}>{importLabels[name] ?? name}: {value}</span>)}{imported.features.length ? <span>Opties: {imported.features.join(", ")}</span> : null}</div> : null}
        <button className="button button-primary" type="button" onClick={applyImportedText} disabled={!importText.trim()}>Vul formulier in</button>
      </div> : <div className="editor-template-box"><div className="editor-template-heading"><strong>Bewaarde uitvoeringen</strong></div>
        <div className="editor-template-controls">
          <label className="admin-field">Bewaarde uitvoering<select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}><option value="">Kies een uitvoering</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        </div>
        {templatePreview ? <div className="editor-template-preview"><strong>{templatePreview.name}</strong><p>{templateValues.length ? templateValues.map((name) => templatePreview.fields[name]).join(" · ") : "Geen specificaties opgeslagen"}</p><p>{templatePreview.fields.features.length ? `${templatePreview.fields.features.length} opties: ${templatePreview.fields.features.join(", ")}` : "Geen opties opgeslagen"}</p><small>Jaar, prijzen, stocknummer en foto’s blijven per auto apart.</small><button className="button button-primary" type="button" onClick={applyTemplate} disabled={pending}>Vul deze gegevens in</button></div> : null}
        <details className="editor-template-manage"><summary>Uitvoeringen beheren</summary><p className="help-text">Bewaar de ingevulde specificaties en opties voor de volgende auto.</p><div className="editor-template-controls"><label className="admin-field">Naam voor hergebruik<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} placeholder="Bijv. Toyota Harrier Premium" /></label><button className="button button-ghost" type="button" onClick={saveTemplate} disabled={pending || !templateName.trim()}>Bewaar uitvoering</button></div>{templatePreview ? <button className="editor-template-delete" type="button" onClick={deleteTemplate} disabled={pending}>Verwijder “{templatePreview.name}”</button> : null}</details>
      </div>}
    </section>
    <div className="editor-main">
      <section className="admin-form-section" aria-labelledby="basic-heading"><h2 id="basic-heading">Basic details</h2><div className="admin-form-grid">
        <label className="admin-field span-all">Listing title<input name="title" defaultValue={defaults.title} required maxLength={180} placeholder="Wordt automatisch ingevuld" /></label>
        <label className="admin-field">Make<input name="make" defaultValue={defaults.make} required maxLength={80} list="make-options" placeholder="Toyota" onInput={(event) => { setMakePreview(event.currentTarget.value); refreshTitle(event.currentTarget.form!); }} /><span className="help-text">Choose a suggestion or type any make.</span>{makePreview.trim() ? <span className="admin-make-preview"><BrandLogo make={makePreview} />{makePreview.trim()}</span> : null}</label>
        <label className="admin-field">Model<input name="model" defaultValue={defaults.model} required maxLength={100} placeholder="RAV4" onInput={(event) => refreshTitle(event.currentTarget.form!)} /><span className="help-text">Type the exact model; every model is accepted.</span></label>
        <label className="admin-field">Variant / trim<input name="variant" defaultValue={defaults.variant} maxLength={120} placeholder="Limited" onInput={(event) => refreshTitle(event.currentTarget.form!)} /></label>
        <label className="admin-field">Year<input name="year" type="number" inputMode="numeric" min="1886" max="2200" defaultValue={defaults.year} onInput={(event) => refreshTitle(event.currentTarget.form!)} /></label>
        <label className="admin-field">Condition<select name="condition" defaultValue={vehicle?.condition ?? "used"}><option value="new">New</option><option value="used">Used</option></select></label>
      </div><datalist id="make-options">{vehicleMakes.map((make) => <option key={make} value={make} />)}</datalist></section>

      <section className="admin-form-section" aria-labelledby="specs-heading"><h2 id="specs-heading">Specifications</h2><div className="admin-form-grid">
        <label className="admin-field">Fuel type<input name="fuel_type" defaultValue={defaults.fuel_type} maxLength={50} placeholder="Gasoline" list="fuel-options" /></label>
        <label className="admin-field">Transmission<input name="transmission" defaultValue={defaults.transmission} maxLength={50} placeholder="Automatic" list="transmission-options" /></label>
        <label className="admin-field">Body type<input name="body_type" defaultValue={defaults.body_type} maxLength={50} placeholder="SUV" list="body-options" /></label>
        <label className="admin-field">Seats<input name="seats" type="number" inputMode="numeric" min="1" max="100" defaultValue={defaults.seats} /></label>
      </div>
      <datalist id="fuel-options">{fuelTypes.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="transmission-options">{transmissionTypes.map((item) => <option key={item} value={item} />)}</datalist>
      <datalist id="body-options">{bodyTypes.map((item) => <option key={item} value={item} />)}</datalist></section>

      <details className="admin-form-section editor-advanced"><summary>Extra gegevens (optioneel)</summary><p className="help-text">Een aparte omschrijving is niet nodig: vaste verkoopinformatie verschijnt automatisch op elke voertuigpagina.</p><div className="admin-form-grid">
        <label className="admin-field">Mileage (km)<input name="mileage" type="number" inputMode="numeric" min="0" step="1" defaultValue={defaults.mileage} /></label>
        <label className="admin-field">Engine<input name="engine_capacity" defaultValue={defaults.engine_capacity} maxLength={50} placeholder="2.5L" /></label>
        <label className="admin-field">Drive type<input name="drive_type" defaultValue={defaults.drive_type} maxLength={50} list="drive-options" placeholder="AWD" /></label>
        <label className="admin-field">Exterior color<input name="exterior_color" defaultValue={defaults.exterior_color} maxLength={50} list="color-options" /></label>
        <label className="admin-field">Interior color<input name="interior_color" defaultValue={defaults.interior_color} maxLength={50} list="color-options" /></label>
        <label className="admin-field">Doors<input name="doors" type="number" inputMode="numeric" min="1" max="20" defaultValue={defaults.doors} /></label>
        <label className="admin-field span-all">Description<textarea name="description" defaultValue={defaults.description} maxLength={10000} rows={6} /></label>
      </div><datalist id="drive-options">{driveTypes.map((item) => <option key={item} value={item} />)}</datalist><datalist id="color-options">{vehicleColors.map((item) => <option key={item} value={item} />)}</datalist></details>

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
        <label className="admin-field">Currency<input name="currency" defaultValue={defaults.currency || "USD"} placeholder="USD" maxLength={8} list="currency-options" /></label><datalist id="currency-options">{currencies.map((item) => <option key={item} value={item} />)}</datalist>
        <p className="help-text">If you enter a price, enter its currency too (for example USD or SRD).</p>
        <label className="admin-field">Availability<select name="availability" defaultValue={vehicle?.availability ?? "available"}><option value="available">Available</option><option value="on_the_way">On the way</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="rental">Rental</option></select></label>
        <label className="admin-field">Stocknummer<input name="stock_number" defaultValue={defaults.stock_number} maxLength={80} placeholder="Automatisch bij opslaan" /><span className="help-text">Laat leeg voor een uniek BCP-nummer, of voer uw eigen nummer in.</span></label>
        <div className="admin-switches">
          <label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={vehicle?.published ?? false} disabled={archived} /><span><strong>Show on website</strong><small>{archived ? "Restore this car in Inventory first" : "Visitors can open this listing"}</small></span></label>
          <label className="admin-checkbox"><input type="checkbox" name="featured" defaultChecked={vehicle?.featured ?? false} /><span><strong>Show on homepage</strong><small>Appears in the homepage car section</small></span></label>
        </div>
      </div></section>
      <section className="admin-form-section" aria-labelledby="private-heading"><h2 id="private-heading">Private</h2><div className="admin-form-grid single">
        <label className="admin-field">VIN<input name="vin" defaultValue={defaults.vin} maxLength={80} autoComplete="off" /></label>
        <label className="admin-field">Staff notes<textarea name="admin_notes" defaultValue={defaults.admin_notes} maxLength={5000} rows={4} /></label>
        <p className="help-text">Only staff can see these fields.</p>
      </div></section>
    </div>

    <div className="admin-form-footer"><div>{state.error ? <p className="admin-feedback admin-error" role="alert">{state.error}</p> : message ? <p className="admin-feedback" role="status"><Check size={14} /> {message}</p> : null}</div><div className="admin-row-actions">{savedId ? <button className="danger-button" type="button" disabled={pending || uploading} onClick={() => { if (!window.confirm("Delete this car permanently? This cannot be undone. To hide it without losing it, use Archive in Inventory.")) return; const data = new FormData(); data.set("id", savedId); setDeleting(true); startTransition(async () => { const result = await deleteVehicleAction(data); setDeleting(false); if (result.error) { setState(result); setMessage(""); return; } if (result.warning) window.alert(result.warning); router.push("/admin/inventory"); }); }}>{deleting ? "Deleting…" : "Delete permanently"}</button> : null}<Link className="button button-ghost" href="/admin/inventory">Cancel</Link><button className="button button-primary" type="submit" disabled={pending || uploading}>{pending && !deleting ? "Saving…" : savedId ? "Save changes" : "Save car"}</button></div></div>
  </form>;
}
