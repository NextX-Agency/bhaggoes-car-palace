"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { deleteVehicleAction, deleteVehicleTemplateAction, refreshPublicInventoryAction, saveVehicleAction, saveVehicleTemplateAction } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/browser";
import { parseListingText } from "@/lib/listing-import";
import { isSupportedPhoto, maxPhotoBytes, maxSourcePhotoBytes, photoAccept, preparePhoto } from "@/lib/photo-optimize";
import { bodyTypes, currencies, driveTypes, fuelTypes, transmissionTypes, vehicleColors, vehicleMakes } from "@/lib/vehicle-catalog";
import { BrandLogo } from "@/components/brand-logo";
import { ComboField } from "@/components/combo-field";
import { dutchValidation } from "@/components/admin-submit";
import { modelsForMake } from "@/lib/vehicle-models";
import { listingTitle, templateFieldNames, type VehicleTemplate, type VehicleTemplateFields } from "@/lib/vehicle-templates";

// Option names are stored data and shown on the website as they are; everything else on this screen is Dutch.
const commonFeatures = ["Air conditioning", "Backup camera", "Bluetooth", "Apple CarPlay", "Android Auto", "Leather seats", "Keyless entry", "Alloy wheels", "Cruise control", "Sunroof", "Parking sensors"];
const importLabels: Record<string, string> = { year: "Bouwjaar", make: "Merk", model: "Model", fuel_type: "Brandstof", transmission: "Transmissie", body_type: "Carrosserie", seats: "Zitplaatsen", stock_number: "Stocknummer", price: "Interne prijs", cash_price: "Cashprijs" };
const maxPhotos = 15;
const photoCount = (count: number) => `${count} ${count === 1 ? "foto" : "foto’s"}`;

type Notice = { text: string; error?: boolean };

export function AdminVehicleEditor({ vehicle, templates = [], notice }: { vehicle?: Vehicle | null; templates?: VehicleTemplate[]; notice?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const generatedTitle = useRef("");
  const [pending, startTransition] = useTransition();
  const [templatePending, startTemplateTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [savedId, setSavedId] = useState(vehicle?.id ?? "");
  const [photos, setPhotos] = useState(vehicle?.images ?? []); const [featureText, setFeatureText] = useState((vehicle?.features ?? []).join("\n")); const [uploading, setUploading] = useState(false); const [message, setMessage] = useState<Notice | null>(notice ? { text: notice } : null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draggingPhoto, setDraggingPhoto] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [importText, setImportText] = useState("");
  const [makePreview, setMakePreview] = useState(vehicle?.make ?? "");
  const [startMode, setStartMode] = useState<"paste" | "template">(vehicle ? "template" : "paste");
  const imported = parseListingText(importText);
  const previewUrls = useRef(new Set<string>());
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const notify = (text: string, error = false) => setMessage({ text, error });
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
    setDirty(true);
    notify(`Uitvoering “${template.name}” ingevuld. Controleer de gegevens voordat je opslaat.`);
  };
  const applyImportedText = () => {
    const form = formRef.current;
    if (!form) return;
    const entries = Object.entries(imported.fields);
    if (!entries.length && !imported.features.length) { notify("Geen herkenbare voertuiggegevens gevonden. Vul ze handmatig in.", true); return; }
    for (const [name, value] of entries) {
      const input = field(form, name);
      if (input && value) input.value = value;
    }
    if (imported.features.length) setFeatureText((current) => [...new Set([...current.split(/[\n,]/).map((value) => value.trim()).filter(Boolean), ...imported.features])].join("\n"));
    setMakePreview(field(form, "make")?.value ?? "");
    refreshTitle(form);
    setDirty(true);
    notify("Advertentiegegevens ingevuld. Controleer de specificaties en prijzen voordat je opslaat.");
  };
  const saveTemplate = () => {
    const form = formRef.current;
    if (!form || !templateName.trim()) { notify("Geef de uitvoering eerst een naam.", true); return; }
    const fields = {
      ...Object.fromEntries(templateFieldNames.map((name) => [name, field(form, name)?.value ?? ""])),
      features: featureText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
    } as VehicleTemplateFields;
    const data = new FormData();
    data.set("name", templateName.trim());
    data.set("fields", JSON.stringify(fields));
    startTemplateTransition(async () => {
      const result = await saveVehicleTemplateAction(data);
      if (result.error) { notify(result.error, true); return; }
      setTemplateName("");
      setSelectedTemplate(result.id ?? "");
      notify("Uitvoering opgeslagen. Alle beheerders kunnen hem gebruiken.");
      router.refresh();
    });
  };
  const deleteTemplate = () => {
    const template = templates.find((item) => item.id === selectedTemplate);
    if (!template || !window.confirm(`Uitvoering “${template.name}” verwijderen?`)) return;
    const data = new FormData();
    data.set("id", template.id);
    startTemplateTransition(async () => {
      const result = await deleteVehicleTemplateAction(data);
      if (result.error) { notify(result.error, true); return; }
      setSelectedTemplate("");
      notify("Uitvoering verwijderd.");
      router.refresh();
    });
  };
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || uploading) return;
    const form = event.currentTarget; const formData = new FormData(form); formData.set("features", featureText);
    const files = Array.from(form.querySelector<HTMLInputElement>('input[name="photos"]')?.files ?? []);
    formData.delete("photos");
    if (photos.length + files.length > maxPhotos) { notify(`Een auto kan maximaal ${maxPhotos} foto’s hebben. Je hebt er al ${photos.length} en hebt er ${files.length} gekozen.`, true); return; }
    startTransition(async () => {
      setMessage(null);
      const result = await saveVehicleAction({}, formData);
      if (result.error) { notify(result.error, true); return; }
      if (!result.id) { notify("De auto kon niet worden opgeslagen.", true); return; }
      setSavedId(result.id); setDirty(false);
      const saved = vehicle ? "Wijzigingen opgeslagen." : "Auto opgeslagen.";
      // A new car moves on to its own page once everything is in; when a photo failed it stays here so the retry button and the reason stay visible.
      const complete = files.length ? await uploadFiles(result.id, files, `${saved} `) : (notify(saved), true);
      if (!vehicle && complete) router.replace(`/admin/inventory/${result.id}?opgeslagen=1`);
    });
  }
  /** Uploads photos one by one; returns true when every photo made it. Photos that failed on the connection are kept for the retry button. */
  async function uploadFiles(vehicleId: string, files: File[], prefix = ""): Promise<boolean> {
    if (uploading) return false;
    if (photos.length + files.length > maxPhotos) { notify(`${prefix}Een auto kan maximaal ${maxPhotos} foto’s hebben. Je kunt er nog ${Math.max(0, maxPhotos - photos.length)} toevoegen.`, true); return false; }
    setUploading(true); setMessage(null); setFailedFiles([]);
    const issues: string[] = []; const retry: File[] = [];
    let uploaded = 0;
    try {
      const client = createClient();
      for (const [index, file] of files.entries()) {
        setUploadProgress({ current: index + 1, total: files.length, name: file.name });
        try {
          if (!isSupportedPhoto(file)) { issues.push(`${file.name} is geen ondersteunde foto (gebruik JPEG, PNG, WebP, AVIF of HEIC).`); continue; }
          if (file.size > maxSourcePhotoBytes) { issues.push(`${file.name} is groter dan ${maxSourcePhotoBytes / 1024 / 1024} MB.`); continue; }
          let optimized: File;
          try { optimized = await preparePhoto(file); } catch (cause) { issues.push(`${file.name} ${cause instanceof Error ? cause.message : "kon niet worden verwerkt."}`); continue; }
          if (optimized.size > maxPhotoBytes) { issues.push(`${file.name} is ook na het verkleinen groter dan ${maxPhotoBytes / 1024 / 1024} MB.`); continue; }
          const extension = optimized.type.split("/")[1].replace("jpeg", "jpg"); const path = `${vehicleId}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await client.storage.from("vehicle-images").upload(path, optimized, { contentType: optimized.type, upsert: false });
          if (uploadError) { issues.push(`${file.name} kon niet worden geüpload. Controleer je verbinding.`); retry.push(file); continue; }
          const nextOrder = photos.length + uploaded;
          const imageAlt = `${vehicle?.title ?? "Vehicle"} photo ${nextOrder + 1}`;
          const { data: imageRecord, error } = await client.from("vehicle_images").insert({ vehicle_id: vehicleId, storage_path: path, alt_text: imageAlt, sort_order: nextOrder, is_cover: nextOrder === 0 }).select("id").single();
          if (error || !imageRecord) { await client.storage.from("vehicle-images").remove([path]); issues.push(`${file.name} kon niet aan de auto worden toegevoegd.`); retry.push(file); }
          else {
            uploaded += 1;
            const previewUrl = URL.createObjectURL(optimized);
            previewUrls.current.add(previewUrl);
            setPhotos((current) => [...current, { id: imageRecord.id, storage_path: path, alt_text: imageAlt, sort_order: current.length, is_cover: current.length === 0, url: previewUrl }]);
          }
        } catch { issues.push(`${file.name} kon niet worden geüpload. Controleer je verbinding.`); retry.push(file); }
      }
      const input = formRef.current?.querySelector<HTMLInputElement>('input[name="photos"]'); if (input) input.value = "";
      setFailedFiles(retry);
      if (uploaded) void refreshPublicInventoryAction(); // photos are written straight to Supabase, so refresh the public site cache
      if (issues.length) notify(`${prefix}${uploaded} van ${files.length} foto’s geüpload. ${issues.join(" ")}${retry.length ? " Gebruik “Opnieuw proberen” om de mislukte foto’s nog eens te uploaden." : ""}`, true);
      else notify(`${prefix}${photoCount(uploaded)} geüpload.`);
      return !issues.length;
    } catch { notify(`${prefix}Foto-opslag is niet ingesteld. Controleer de Supabase-verbinding.`, true); return false; }
    finally { setUploading(false); setUploadProgress(null); }
  }
  // One photo change at a time: a second tap while the first is saving would race on the photo order.
  async function photoTask(task: () => Promise<void>) {
    if (photoBusy) return;
    setPhotoBusy(true);
    try { await task(); } catch { notify("De wijziging aan de foto’s is niet gelukt. Controleer je verbinding en probeer het opnieuw.", true); } finally { setPhotoBusy(false); }
  }
  const removePhoto = (image: Vehicle["images"][number]) => photoTask(async () => {
    const client = createClient();
    const { error } = await client.from("vehicle_images").delete().eq("id", image.id);
    if (error) { notify("De foto kon niet worden verwijderd.", true); return; }
    if (!image.storage_path.startsWith("/images/")) {
      const storage = await client.storage.from("vehicle-images").remove([image.storage_path]);
      if (storage.error) notify("De foto is uit de advertentie gehaald, maar het opgeslagen bestand kon niet worden verwijderd. Vraag een beheerder om de opslag op te ruimen.", true);
    }
    const remaining = photos.filter((item) => item.id !== image.id);
    if (savedId && remaining.length) {
      const { error: orderError } = await client.rpc("reorder_vehicle_images", { p_vehicle_id: savedId, p_image_ids: remaining.map((item) => item.id) });
      if (orderError) notify("De foto is verwijderd, maar de nieuwe omslagfoto kon niet worden ingesteld. Laad deze pagina opnieuw om de volgorde te controleren.", true);
    }
    if (image.url?.startsWith("blob:")) { URL.revokeObjectURL(image.url); previewUrls.current.delete(image.url); }
    setPhotos(remaining.map((item, index) => ({ ...item, sort_order: index, is_cover: index === 0 })));
    void refreshPublicInventoryAction();
  });
  const reorderPhoto = (from: number, to: number) => photoTask(async () => {
    // `from` comes from drag data, so anything that is not a photo position (for example dragged text) is ignored.
    if (!Number.isInteger(from) || from < 0 || from >= photos.length || to < 0 || to >= photos.length || from === to) return;
    const next = [...photos]; const [moved] = next.splice(from, 1); if (!moved) return; next.splice(to, 0, moved);
    const client = createClient(); const { error } = await client.rpc("reorder_vehicle_images", { p_vehicle_id: savedId, p_image_ids: next.map((image) => image.id) });
    if (error) { notify("De volgorde van de foto’s kon niet worden opgeslagen.", true); return; }
    setPhotos(next.map((item, position) => ({ ...item, sort_order: position, is_cover: position === 0 })));
    void refreshPublicInventoryAction();
  });
  const movePhoto = (index: number, direction: -1 | 1) => reorderPhoto(index, index + direction);
  const deleteVehicle = () => {
    if (!window.confirm("Deze auto permanent verwijderen? Dit kan niet ongedaan worden gemaakt. Wil je hem alleen van de website halen, gebruik dan Archiveren in de voorraad.")) return;
    const data = new FormData(); data.set("id", savedId); setDeleting(true);
    startTransition(async () => {
      const result = await deleteVehicleAction(data); setDeleting(false);
      if (result.error) { notify(result.error, true); return; }
      if (result.warning) window.alert(result.warning);
      router.push("/admin/inventory");
    });
  };
  const privateInfo = vehicle as (Vehicle & { vin?: string | null; admin_notes?: string | null }) | null | undefined;
  const defaults = { title: vehicle?.title ?? "", make: vehicle?.make ?? "", model: vehicle?.model ?? "", variant: vehicle?.variant ?? "", year: vehicle?.year ?? "", price: vehicle?.price ?? "", cash_price: vehicle?.cash_price ?? "", currency: vehicle?.currency ?? "", mileage: vehicle?.mileage ?? "", engine_capacity: vehicle?.engine_capacity ?? "", fuel_type: vehicle?.fuel_type ?? "", transmission: vehicle?.transmission ?? "", drive_type: vehicle?.drive_type ?? "", body_type: vehicle?.body_type ?? "", exterior_color: vehicle?.exterior_color ?? "", interior_color: vehicle?.interior_color ?? "", seats: vehicle?.seats ?? "", doors: vehicle?.doors ?? "", description: vehicle?.description ?? "", stock_number: vehicle?.stock_number ?? "", vin: privateInfo?.vin ?? "", admin_notes: privateInfo?.admin_notes ?? "" };
  const archived = Boolean(vehicle?.archived_at);
  const selectedFeatures = featureText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  const templatePreview = templates.find((item) => item.id === selectedTemplate);
  const templateValues = templatePreview ? templateFieldNames.filter((name) => name !== "condition" && templatePreview.fields[name]) : [];
  const progress = uploadProgress ? Math.round(((uploadProgress.current - 1) / uploadProgress.total) * 100) : 0;
  const busy = pending || uploading || templatePending;
  return <form ref={formRef} className="admin-form vehicle-editor" onSubmit={handleSubmit} onInvalidCapture={dutchValidation.onInvalidCapture} onInput={(event) => { dutchValidation.onInput(event); setDirty(true); }} onChange={(event) => { dutchValidation.onChange(event); setDirty(true); }}>
    <input type="hidden" name="id" value={savedId} />
    <section className="admin-form-section editor-template-panel" aria-labelledby="template-heading">
      <h2 id="template-heading">{vehicle ? "Gegevens hergebruiken" : "Snelle start"}</h2>
      <div className="editor-shared-summary"><strong>Financiering, aankoopvoordelen en contact worden automatisch toegevoegd.</strong><Link href="/admin/settings">Wijzig vaste informatie</Link></div>
      {!vehicle ? <div className="editor-mode-switch" role="group" aria-label="Kies een snelle start"><button type="button" aria-pressed={startMode === "paste"} onClick={() => setStartMode("paste")}>Advertentie plakken</button><button type="button" aria-pressed={startMode === "template"} onClick={() => setStartMode("template")}>Uitvoering kiezen</button></div> : null}
      {!vehicle && startMode === "paste" ? <div className="editor-import"><h3>Advertentietekst plakken</h3><p className="help-text">Plak een bestaand bericht. Controleer de ingevulde gegevens voordat je opslaat.</p>
        <label className="admin-field">Bestaande advertentie<textarea value={importText} onChange={(event) => setImportText(event.target.value)} rows={5} placeholder={"2018 - Toyota Harrier | Panoramic sunroof | JBL sound system\nPrijs: $26950,-\nGiraal deal: $25950,-"} /></label>
        {Object.keys(imported.fields).length || imported.features.length ? <div className="editor-import-preview"><strong>Herkend:</strong>{Object.entries(imported.fields).map(([name, value]) => <span key={name}>{importLabels[name] ?? name}: {value}</span>)}{imported.features.length ? <span>Opties: {imported.features.join(", ")}</span> : null}</div> : null}
        <button className="button button-primary" type="button" onClick={applyImportedText} disabled={!importText.trim()}>Vul formulier in</button>
      </div> : <div className="editor-template-box"><div className="editor-template-heading"><strong>Bewaarde uitvoeringen</strong></div>
        <div className="editor-template-controls">
          <label className="admin-field">Bewaarde uitvoering<select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}><option value="">{templates.length ? "Kies een uitvoering" : "Nog geen uitvoeringen bewaard"}</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        </div>
        {templatePreview ? <div className="editor-template-preview"><strong>{templatePreview.name}</strong><p>{templateValues.length ? templateValues.map((name) => templatePreview.fields[name]).join(" · ") : "Geen specificaties opgeslagen"}</p><p>{templatePreview.fields.features.length ? `${templatePreview.fields.features.length} opties: ${templatePreview.fields.features.join(", ")}` : "Geen opties opgeslagen"}</p><small>Jaar, prijzen, stocknummer en foto’s blijven per auto apart.</small><button className="button button-primary" type="button" onClick={applyTemplate} disabled={busy}>Vul deze gegevens in</button></div> : null}
        <details className="editor-template-manage"><summary>Uitvoeringen beheren</summary><p className="help-text">Bewaar de ingevulde specificaties en opties voor de volgende auto.</p><div className="editor-template-controls"><label className="admin-field">Naam voor hergebruik<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={80} placeholder="Bijv. Toyota Harrier Premium" /></label><button className="button button-ghost" type="button" onClick={saveTemplate} disabled={busy || !templateName.trim()}>{templatePending ? "Bezig…" : "Bewaar uitvoering"}</button></div>{templatePreview ? <button className="editor-template-delete" type="button" onClick={deleteTemplate} disabled={busy}>Verwijder “{templatePreview.name}”</button> : null}</details>
      </div>}
    </section>
    <div className="editor-main">
      <section className="admin-form-section" aria-labelledby="basic-heading"><h2 id="basic-heading">Basisgegevens</h2><div className="admin-form-grid">
        <label className="admin-field span-all">Titel van de advertentie<input name="title" defaultValue={defaults.title} required maxLength={180} placeholder="Wordt automatisch ingevuld" /></label>
        <label className="admin-field">Merk<ComboField name="make" label="Merk" options={vehicleMakes} defaultValue={defaults.make} required maxLength={80} placeholder="Toyota" renderOption={(option) => <BrandLogo make={option} />} onInput={(event) => { setMakePreview(event.currentTarget.value); refreshTitle(event.currentTarget.form!); }} /><span className="help-text">Kies uit de lijst of typ een ander merk.</span>{makePreview.trim() ? <span className="admin-make-preview"><BrandLogo make={makePreview} />{makePreview.trim()}</span> : null}</label>
        <label className="admin-field">Model<ComboField name="model" label="Model" options={modelsForMake(makePreview)} defaultValue={defaults.model} required maxLength={100} placeholder="RAV4" emptyText="Kies eerst een merk voor modelsuggesties, of typ zelf een model." onInput={(event) => refreshTitle(event.currentTarget.form!)} /><span className="help-text">Kies uit de lijst of typ het exacte model; elk model is toegestaan.</span></label>
        <label className="admin-field">Variant<input name="variant" defaultValue={defaults.variant} maxLength={120} placeholder="Limited" onInput={(event) => refreshTitle(event.currentTarget.form!)} /></label>
        <label className="admin-field">Bouwjaar<input name="year" type="number" inputMode="numeric" min="1886" max="2200" defaultValue={defaults.year} onInput={(event) => refreshTitle(event.currentTarget.form!)} /></label>
        <label className="admin-field">Conditie<select name="condition" defaultValue={vehicle?.condition ?? "used"}><option value="new">Nieuw</option><option value="used">Gebruikt</option></select></label>
      </div></section>

      <section className="admin-form-section" aria-labelledby="specs-heading"><h2 id="specs-heading">Specificaties</h2><div className="admin-form-grid">
        <label className="admin-field">Brandstof<ComboField name="fuel_type" label="Brandstof" options={fuelTypes} defaultValue={defaults.fuel_type} maxLength={50} placeholder="Gasoline" /></label>
        <label className="admin-field">Transmissie<ComboField name="transmission" label="Transmissie" options={transmissionTypes} defaultValue={defaults.transmission} maxLength={50} placeholder="Automatic" /></label>
        <label className="admin-field">Carrosserie<ComboField name="body_type" label="Carrosserie" options={bodyTypes} defaultValue={defaults.body_type} maxLength={50} placeholder="SUV" /></label>
        <label className="admin-field">Zitplaatsen<input name="seats" type="number" inputMode="numeric" min="1" max="100" defaultValue={defaults.seats} /></label>
      </div></section>

      <details className="admin-form-section editor-advanced"><summary>Extra gegevens (optioneel)</summary><p className="help-text">Een aparte omschrijving is niet nodig: vaste verkoopinformatie verschijnt automatisch op elke voertuigpagina.</p><div className="admin-form-grid">
        <label className="admin-field">Kilometerstand (km)<input name="mileage" type="number" inputMode="numeric" min="0" step="1" defaultValue={defaults.mileage} /></label>
        <label className="admin-field">Motorinhoud<input name="engine_capacity" defaultValue={defaults.engine_capacity} maxLength={50} placeholder="2.5L" /></label>
        <label className="admin-field">Aandrijving<ComboField name="drive_type" label="Aandrijving" options={driveTypes} defaultValue={defaults.drive_type} maxLength={50} placeholder="AWD" /></label>
        <label className="admin-field">Buitenkleur<ComboField name="exterior_color" label="Buitenkleur" options={vehicleColors} defaultValue={defaults.exterior_color} maxLength={50} /></label>
        <label className="admin-field">Binnenkleur<ComboField name="interior_color" label="Binnenkleur" options={vehicleColors} defaultValue={defaults.interior_color} maxLength={50} /></label>
        <label className="admin-field">Deuren<input name="doors" type="number" inputMode="numeric" min="1" max="20" defaultValue={defaults.doors} /></label>
        <label className="admin-field span-all">Omschrijving<textarea name="description" defaultValue={defaults.description} maxLength={10000} rows={6} /></label>
      </div></details>

      <section className="admin-form-section" aria-labelledby="photos-heading"><div className="admin-section-head"><div><h2 id="photos-heading">Foto’s</h2><p className="muted">Voeg maximaal {maxPhotos} foto’s toe: voorkant, zijkanten, achterkant, interieur en details. De eerste foto is de omslagfoto. Verplaats foto’s met de pijltjes of sleep ze naar een andere plek.</p></div><span className="muted">{photos.length} / {maxPhotos}</span></div>
        {photos.length ? <div className="admin-photo-grid" role="list" aria-label="Foto’s van de auto" aria-busy={photoBusy || undefined}>{photos.map((photo, index) => <div className={`admin-photo${index === 0 ? " cover" : ""}${draggingPhoto === index ? " is-dragging" : ""}${photoBusy ? " is-busy" : ""}`} key={photo.id} role="listitem" draggable={!photoBusy} onDragStart={(event) => { setDraggingPhoto(index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setDraggingPhoto(null); void reorderPhoto(Number(event.dataTransfer.getData("text/plain")), index); }} onDragEnd={() => setDraggingPhoto(null)} aria-label={`Foto ${index + 1}${index === 0 ? ", omslagfoto" : ""}`}>
          {photo.url ? <Image src={photo.url} alt={`Foto ${index + 1}`} fill sizes="200px" unoptimized /> : <span className="photo-no-preview">Foto opgeslagen</span>}
          {index === 0 ? <span className="cover-label">Omslag</span> : null}
          <button className="photo-remove" type="button" disabled={photoBusy} onClick={() => { if (window.confirm("Deze foto verwijderen?")) void removePhoto(photo); }} aria-label={`Verwijder foto ${index + 1}`} title="Foto verwijderen"><Trash2 size={16} aria-hidden="true" /></button>
          <div className="photo-actions">
            <button type="button" onClick={() => void movePhoto(index, -1)} aria-label={`Verplaats foto ${index + 1} naar voren`} title="Naar voren" disabled={photoBusy || index === 0}><ArrowLeft size={16} aria-hidden="true" /></button>
            {index > 0 ? <button type="button" className="photo-cover-button" onClick={() => void reorderPhoto(index, 0)} disabled={photoBusy} aria-label={`Maak foto ${index + 1} de omslagfoto`} title="Als omslagfoto instellen"><Star size={16} aria-hidden="true" /></button> : null}
            <button type="button" onClick={() => void movePhoto(index, 1)} aria-label={`Verplaats foto ${index + 1} naar achteren`} title="Naar achteren" disabled={photoBusy || index === photos.length - 1}><ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </div>)}</div> : null}
        <div className={`drop-zone${uploading ? " is-uploading" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const files = Array.from(event.dataTransfer.files); if (!savedId) { notify("Sla de auto eerst op om foto’s te kunnen uploaden.", true); return; } if (files.length) void uploadFiles(savedId, files); }}>
          <ImagePlus size={24} aria-hidden="true" />
          <label className="photo-file-picker">Foto’s kiezen<input type="file" name="photos" accept={photoAccept} multiple disabled={photos.length >= maxPhotos || uploading} onChange={(event) => { const input = event.currentTarget; const files = Array.from(input.files ?? []); if (!files.length) return; if (photos.length + files.length > maxPhotos) { input.value = ""; notify(`Een auto kan maximaal ${maxPhotos} foto’s hebben. Je kunt er nog ${maxPhotos - photos.length} toevoegen.`, true); } else if (savedId) { input.value = ""; void uploadFiles(savedId, files); } else notify(`${photoCount(files.length)} gekozen. Ze worden geüpload zodra je de auto opslaat.`); }} /></label>
          <p>{savedId ? <><span className="drop-hint-drag">Of sleep foto’s hierheen. </span>JPEG, PNG, WebP, AVIF of HEIC. Grote foto’s worden automatisch verkleind.</> : "Foto’s worden geüpload zodra je de auto opslaat."}</p>
        </div>
        {uploadProgress ? <div className="upload-progress" role="status" aria-live="polite"><div className="upload-progress-bar"><span style={{ width: `${Math.max(progress, 6)}%` }} /></div><p><LoaderCircle size={14} className="spin" aria-hidden="true" /> Foto {uploadProgress.current} van {uploadProgress.total} wordt geüpload: {uploadProgress.name}</p></div> : null}
        {failedFiles.length && !uploading ? <div className="upload-retry"><button className="button button-outline button-sm" type="button" onClick={() => void uploadFiles(savedId, failedFiles)}>Opnieuw proberen ({photoCount(failedFiles.length)})</button></div> : null}
      </section>

      <section className="admin-form-section" aria-labelledby="features-heading"><h2 id="features-heading">Opties</h2>
        <div className="feature-chips">{commonFeatures.map((feature) => <label className={`feature-chip${selectedFeatures.includes(feature) ? " is-on" : ""}`} key={feature}><input type="checkbox" checked={selectedFeatures.includes(feature)} onChange={(event) => toggledFeature(feature, event.target.checked)} />{feature}</label>)}</div>
        <label className="admin-field" style={{ marginTop: 18 }}>Alle opties <span className="help-text">Eén per regel. Ze staan zo op de website.</span><textarea name="features" value={featureText} onChange={(event) => setFeatureText(event.target.value)} rows={4} /></label>
      </section>
    </div>

    <div className="editor-side">
      <section className="admin-form-section" aria-labelledby="pricing-heading"><h2 id="pricing-heading">Prijs en status</h2><div className="admin-form-grid single">
        {archived ? <p className="help-text">Deze auto is gearchiveerd en verborgen. Opslaan houdt hem gearchiveerd. Gebruik Herstellen in de voorraad om hem weer te tonen.</p> : null}
        <div className="price-field"><label className="admin-field">Interne prijs<input name="price" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={defaults.price} placeholder="Op aanvraag" /></label><label className="admin-field">Cashprijs / giraal deal<input name="cash_price" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={defaults.cash_price} placeholder="Op aanvraag" /></label></div>
        <label className="admin-field">Valuta<ComboField name="currency" label="Valuta" options={currencies} defaultValue={defaults.currency || "USD"} placeholder="USD" maxLength={8} autoCapitalize="characters" /></label>
        <p className="help-text">Vul je een prijs in, kies dan ook de valuta (bijvoorbeeld USD of SRD).</p>
        <label className="admin-field">Beschikbaarheid<select name="availability" defaultValue={vehicle?.availability ?? "available"}><option value="available">Beschikbaar</option><option value="on_the_way">Onderweg</option><option value="reserved">Gereserveerd</option><option value="sold">Verkocht</option><option value="rental">Verhuur</option></select></label>
        <label className="admin-field">Stocknummer<input name="stock_number" defaultValue={defaults.stock_number} maxLength={80} placeholder="Automatisch bij opslaan" /><span className="help-text">Laat leeg voor een uniek BCP-nummer, of voer je eigen nummer in.</span></label>
        <div className="admin-switches">
          <label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={vehicle?.published ?? false} disabled={archived} /><span><strong>Tonen op de website</strong><small>{archived ? "Herstel deze auto eerst in de voorraad" : "Bezoekers kunnen deze advertentie openen"}</small></span></label>
          <label className="admin-checkbox"><input type="checkbox" name="featured" defaultChecked={vehicle?.featured ?? false} /><span><strong>Tonen op de homepage</strong><small>Verschijnt in het autogedeelte van de homepage</small></span></label>
        </div>
      </div></section>
      <section className="admin-form-section" aria-labelledby="private-heading"><h2 id="private-heading">Alleen voor medewerkers</h2><div className="admin-form-grid single">
        <label className="admin-field">Chassisnummer (VIN)<input name="vin" defaultValue={defaults.vin} maxLength={80} autoComplete="off" autoCapitalize="characters" /></label>
        <label className="admin-field">Interne notities<textarea name="admin_notes" defaultValue={defaults.admin_notes} maxLength={5000} rows={4} /></label>
        <p className="help-text">Bezoekers van de website zien deze velden nooit.</p>
      </div></section>
    </div>

    <div className="admin-form-footer"><div className="admin-form-message" role="status" aria-live="polite">{message ? <p className={`admin-feedback${message.error ? " admin-error" : ""}`} role={message.error ? "alert" : undefined}>{message.error ? <CircleAlert size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} {message.text}</p> : null}</div><div className="admin-row-actions">{savedId ? <button className="danger-button" type="button" disabled={busy || photoBusy} onClick={deleteVehicle}>{deleting ? "Verwijderen…" : "Permanent verwijderen"}</button> : null}<Link className="button button-ghost" href="/admin/inventory" onClick={(event) => { if (dirty && !window.confirm("Je hebt wijzigingen die nog niet zijn opgeslagen. Toch weggaan?")) event.preventDefault(); }}>Annuleren</Link><button className="button button-primary" type="submit" disabled={busy || photoBusy} aria-busy={pending || undefined}>{pending || uploading ? <><LoaderCircle size={16} className="spin" aria-hidden="true" />{deleting ? "Verwijderen…" : uploading ? "Foto’s uploaden…" : "Opslaan…"}</> : savedId ? "Wijzigingen opslaan" : "Auto opslaan"}</button></div></div>
  </form>;
}
