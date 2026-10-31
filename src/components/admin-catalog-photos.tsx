"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { isSupportedPhoto, photoAccept, preparePhoto } from "@/lib/photo-optimize";

const MAX_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024; // site-assets bucket limit
type Photo = { path: string; url: string };

/** Photos of the lot for the banner shown while the catalog is hidden. Saved with the rest of the settings. */
export function AdminCatalogPhotos({ paths, urls }: { paths: string[]; urls: string[] }) {
  const [photos, setPhotos] = useState<Photo[]>(paths.map((path, index) => ({ path, url: urls[index] ?? "" })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function add(list: FileList | null) {
    const files = Array.from(list ?? []).filter(isSupportedPhoto).slice(0, MAX_PHOTOS - photos.length);
    if (!files.length) { setError(photos.length >= MAX_PHOTOS ? `Maximaal ${MAX_PHOTOS} foto’s.` : "Kies JPEG-, PNG-, WebP- of HEIC-foto’s."); return; }
    setBusy(true); setError("");
    const client = createClient(); const added: Photo[] = []; let failed = 0;
    await Promise.all(files.map(async (file) => {
      try {
        const photo = await preparePhoto(file);
        if (photo.size > MAX_BYTES || !/^image\/(jpeg|png|webp|avif)$/.test(photo.type)) throw new Error("size");
        const path = `catalog/${crypto.randomUUID()}.${photo.type.split("/")[1].replace("jpeg", "jpg")}`;
        const { error: uploadError } = await client.storage.from("site-assets").upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw uploadError;
        const url = URL.createObjectURL(photo); previews.current.push(url);
        added.push({ path, url });
      } catch { failed += 1; }
    }));
    setPhotos((current) => [...current, ...added].slice(0, MAX_PHOTOS));
    if (failed) setError(`${failed} ${failed === 1 ? "foto kon" : "foto’s konden"} niet worden geüpload. Controleer de verbinding of kies een kleinere foto.`);
    setBusy(false);
  }
  const move = (from: number, to: number) => setPhotos((current) => { if (to < 0 || to >= current.length) return current; const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });

  return <div className="catalog-photos">
    <input type="hidden" name="catalog_images" value={JSON.stringify(photos.map((photo) => photo.path))} />
    <span className="admin-field">Foto’s in de banner <span className="help-text">Tot {MAX_PHOTOS} foto’s van jullie terrein, showroom of bord. De eerste is de grote foto. Geen foto’s gekozen? Dan worden standaardfoto’s van het terrein gebruikt.</span></span>
    <div className="catalog-photos-grid">
      {photos.map((photo, index) => <div className={`catalog-photos-item${index === 0 ? " is-first" : ""}`} key={photo.path}>
        {photo.url ? <Image src={photo.url} alt={`Bannerfoto ${index + 1}`} fill sizes="180px" unoptimized /> : null}
        {index === 0 ? <span className="cover-label">Groot</span> : null}
        <button type="button" className="photo-remove" onClick={() => setPhotos((current) => current.filter((item) => item.path !== photo.path))} aria-label={`Verwijder bannerfoto ${index + 1}`}><Trash2 size={15} aria-hidden="true" /></button>
        <div className="photo-actions">
          <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Bannerfoto ${index + 1} naar voren`}><ArrowLeft size={15} aria-hidden="true" /></button>
          <button type="button" onClick={() => move(index, index + 1)} disabled={index === photos.length - 1} aria-label={`Bannerfoto ${index + 1} naar achteren`}><ArrowRight size={15} aria-hidden="true" /></button>
        </div>
      </div>)}
      {photos.length < MAX_PHOTOS ? <label className="catalog-photos-add">{busy ? <LoaderCircle size={20} className="spin" aria-hidden="true" /> : <ImagePlus size={20} aria-hidden="true" />}<span>{busy ? "Uploaden…" : "Foto’s toevoegen"}</span><input type="file" accept={photoAccept} multiple disabled={busy} onChange={(event) => { void add(event.currentTarget.files); event.currentTarget.value = ""; }} /></label> : null}
    </div>
    {error ? <p className="admin-error" role="alert">{error}</p> : null}
    {photos.length && !busy ? <p className="help-text">Klik op “Website-instellingen opslaan” om de foto’s te gebruiken.</p> : null}
  </div>;
}
