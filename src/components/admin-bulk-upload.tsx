"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, ClipboardPaste, ImagePlus, LoaderCircle, Merge, Plus, Trash2, X } from "lucide-react";
import { refreshPublicInventoryAction, saveVehicleAction, updateVehicleAction } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/browser";
import { parseListingText } from "@/lib/listing-import";
import { isSupportedPhoto, photoAccept } from "@/lib/photo-optimize";
import { vehicleMakes } from "@/lib/vehicle-catalog";
import { modelsForMake } from "@/lib/vehicle-models";
import { maxPhotosPerVehicle, uploadVehiclePhotos } from "@/lib/vehicle-photo-upload";
import { syncPublishedVehicleImages } from "@/lib/admin-r2-sync";

type Status = "idle" | "saving" | "done" | "error";
type DraftFields = { make: string; model: string; year: string; price: string; cash_price: string; stock_number: string; availability: string };
type Draft = DraftFields & { key: string; files: File[]; previews: string[]; listing: string; status: Status; message?: string; id?: string; savedPhotos?: number; progress?: { done: number; total: number } };
type GroupMode = "together" | "each";

const emptyFields: DraftFields = { make: "", model: "", year: "", price: "", cash_price: "", stock_number: "", availability: "available" };
const statusOptions = [["available", "Beschikbaar"], ["on_the_way", "Onderweg"], ["reserved", "Gereserveerd"], ["rental", "Verhuur"], ["sold", "Verkocht"]] as const;
const photoCount = (count: number) => `${count} ${count === 1 ? "foto" : "foto’s"}`;
const carCount = (count: number) => `${count} ${count === 1 ? "auto" : "auto’s"}`;
const CAR_CONCURRENCY = 1;

let keySeed = 0;
const newDraft = (files: File[]): Draft => ({ ...emptyFields, key: `draft-${Date.now()}-${keySeed++}`, files, previews: files.map((file) => URL.createObjectURL(file)), listing: "", status: "idle" });

export function AdminBulkUpload({ defaultCurrency }: { defaultCurrency: string }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [mode, setMode] = useState<GroupMode>("together");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [publish, setPublish] = useState(true);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const draftsRef = useRef(drafts);
  const runningRef = useRef(false);
  useEffect(() => { draftsRef.current = drafts; }, [drafts]);
  // Free the photo previews when leaving the page.
  useEffect(() => () => draftsRef.current.forEach((draft) => draft.previews.forEach((url) => URL.revokeObjectURL(url))), []);
  const pendingDrafts = drafts.filter((draft) => draft.status !== "done");
  useEffect(() => {
    if (!running && !pendingDrafts.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running, pendingDrafts.length]);

  const update = (key: string, change: Partial<Draft> | ((draft: Draft) => Partial<Draft>)) =>
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...(typeof change === "function" ? change(draft) : change) } : draft));

  function addFiles(list: FileList | File[] | null, into?: string) {
    if (runningRef.current) { setNotice({ text: "Wacht tot de huidige opslag klaar is voordat je meer foto’s toevoegt.", error: true }); return; }
    const files = Array.from(list ?? []).filter(isSupportedPhoto);
    if (!files.length) { setNotice({ text: "Kies foto’s (JPEG, PNG, WebP, AVIF of HEIC).", error: true }); return; }
    setNotice(null);
    if (into) {
      const target = drafts.find((draft) => draft.key === into);
      const room = maxPhotosPerVehicle - (target?.savedPhotos ?? 0) - (target?.files.length ?? 0);
      const accepted = files.slice(0, Math.max(room, 0));
      if (accepted.length < files.length) setNotice({ text: `Een auto kan maximaal ${maxPhotosPerVehicle} foto’s hebben; ${photoCount(files.length - accepted.length)} niet toegevoegd.`, error: true });
      update(into, (draft) => ({ files: [...draft.files, ...accepted], previews: [...draft.previews, ...accepted.map((file) => URL.createObjectURL(file))], status: draft.status === "error" ? "idle" : draft.status }));
      return;
    }
    // "Samen": every selection is one car (more than 15 photos are spread over several cars). "Los": one car per photo.
    const groups: File[][] = [];
    if (mode === "each") for (const file of files) groups.push([file]);
    else for (let index = 0; index < files.length; index += maxPhotosPerVehicle) groups.push(files.slice(index, index + maxPhotosPerVehicle));
    setDrafts((current) => [...current, ...groups.map(newDraft)]);
    if (mode === "together" && groups.length > 1) setNotice({ text: `Meer dan ${maxPhotosPerVehicle} foto’s gekozen: verdeeld over ${carCount(groups.length)}. Voeg ze samen of verplaats foto’s als dat niet klopt.` });
  }

  function removePhoto(key: string, index: number) {
    update(key, (draft) => { URL.revokeObjectURL(draft.previews[index]); return { files: draft.files.filter((_, item) => item !== index), previews: draft.previews.filter((_, item) => item !== index) }; });
  }
  function removeDraft(key: string) {
    if (runningRef.current) return;
    const draft = drafts.find((item) => item.key === key);
    draft?.previews.forEach((url) => URL.revokeObjectURL(url));
    setDrafts((current) => current.filter((item) => item.key !== key));
  }
  function mergeWithPrevious(key: string) {
    const index = drafts.findIndex((draft) => draft.key === key);
    const previous = drafts[index - 1]; const draft = drafts[index];
    if (!previous || !draft) return;
    if (previous.files.length + draft.files.length > maxPhotosPerVehicle) { setNotice({ text: `Samenvoegen kan niet: een auto kan maximaal ${maxPhotosPerVehicle} foto’s hebben.`, error: true }); return; }
    const merged: Draft = { ...previous, files: [...previous.files, ...draft.files], previews: [...previous.previews, ...draft.previews] };
    // Details typed on either card are kept; the earlier card wins when both have a value.
    for (const field of Object.keys(emptyFields) as (keyof DraftFields)[]) if (!merged[field] || (field === "availability" && merged[field] === "available")) merged[field] = draft[field] || merged[field];
    setDrafts([...drafts.slice(0, index - 1), merged, ...drafts.slice(index + 1)]);
  }
  function applyListing(key: string) {
    const draft = drafts.find((item) => item.key === key);
    if (!draft) return;
    const parsed = parseListingText(draft.listing).fields;
    const filled = (["make", "model", "year", "price", "cash_price", "stock_number"] as const).filter((field) => parsed[field]);
    if (!filled.length) { update(key, { message: "Geen gegevens herkend in deze tekst.", status: "error" }); return; }
    update(key, { ...Object.fromEntries(filled.map((field) => [field, parsed[field]])), message: undefined, status: "idle" });
  }

  async function saveDraft(draft: Draft, client: ReturnType<typeof createClient>) {
    // A card without photos and without any details would become a blank listing on the website.
    const empty = !draft.id && !draft.files.length && (["make", "model", "year", "price", "cash_price", "stock_number"] as const).every((field) => !draft[field].trim());
    if (empty) { update(draft.key, { status: "error", message: "Deze kaart is leeg. Voeg foto’s of gegevens toe, of haal hem weg." }); return false; }
    update(draft.key, { status: "saving", message: undefined, progress: draft.files.length ? { done: 0, total: draft.files.length } : undefined });
    let id = draft.id;
    if (!id) {
      const form = new FormData();
      for (const field of Object.keys(emptyFields) as (keyof DraftFields)[]) form.set(field, draft[field].trim());
      form.set("currency", draft.price || draft.cash_price ? currency.trim().toUpperCase() : "");
      form.set("condition", "used");
      if (publish && !draft.files.length) form.set("published", "on");
      const result = await saveVehicleAction({}, form);
      if (result.error || !result.id) { update(draft.key, { id: result.id, status: "error", message: result.error ?? "De auto kon niet worden opgeslagen.", progress: undefined }); return false; }
      id = result.id;
      update(draft.key, { id });
    }
    const finish = async () => {
      if (publish) { const form = new FormData(); form.set("id", id); form.set("published", "true"); await updateVehicleAction(form); await syncPublishedVehicleImages(id); }
      update(draft.key, { status: "done", files: [], previews: [], progress: undefined, message: undefined });
      return true;
    };
    if (!draft.files.length) return finish();
    const { data: existing, error: readError } = await client.from("vehicle_images").select("id, sort_order").eq("vehicle_id", id).order("sort_order");
    if (readError || !existing) { update(draft.key, { status: "error", message: "De opgeslagen foto’s konden niet worden gecontroleerd. Probeer opnieuw.", progress: undefined }); return false; }
    if (existing.length + draft.files.length > maxPhotosPerVehicle) { update(draft.key, { status: "error", savedPhotos: existing.length, message: `Deze auto heeft al ${photoCount(existing.length)}. Verwijder foto’s of kies er minder dan ${maxPhotosPerVehicle - existing.length}.`, progress: undefined }); return false; }
    const altBase = [draft.year, draft.make, draft.model].filter(Boolean).join(" ") || "Vehicle";
    const { uploaded, issues, retry } = await uploadVehiclePhotos({ client, vehicleId: id, files: draft.files, existing, altBase, onProgress: (done, total) => update(draft.key, { progress: { done, total } }) });
    uploaded.forEach((photo) => URL.revokeObjectURL(photo.url));
    update(draft.key, { savedPhotos: existing.length + uploaded.length });
    if (issues.length) {
      // The car exists; keep only the photos that still have to go up, so "Opnieuw" uploads just those.
      const retrySet = new Set(retry);
      draft.files.forEach((file, index) => { if (!retrySet.has(file)) URL.revokeObjectURL(draft.previews[index]); });
      update(draft.key, (current) => ({ status: "error", message: `Auto als concept opgeslagen. ${existing.length + uploaded.length} foto’s aanwezig; ${retry.length} opnieuw te proberen. ${issues.join(" ")}`, files: retry, previews: retry.map((file) => current.previews[current.files.indexOf(file)] ?? URL.createObjectURL(file)), progress: undefined }));
      return false;
    }
    draft.previews.forEach((url) => URL.revokeObjectURL(url));
    update(draft.key, { files: [], previews: [], progress: undefined });
    return finish();
  }

  async function saveAll() {
    const queue = drafts.filter((draft) => draft.status !== "done" && draft.status !== "saving");
    if (!queue.length || runningRef.current) return;
    runningRef.current = true;
    setRunning(true); setNotice(null);
    try {
      const client = createClient();
      let saved = 0; let failed = 0;
      const worker = async () => {
        for (let draft = queue.shift(); draft; draft = queue.shift()) {
          // Read the latest version of the card: fields may have been edited after the queue was built.
          const latest = draftsRef.current.find((item) => item.key === draft!.key) ?? draft;
          try { if (await saveDraft(latest, client)) saved += 1; else failed += 1; }
          catch { failed += 1; update(latest.key, { status: "error", message: "Er ging iets mis. Controleer je verbinding en probeer het opnieuw.", progress: undefined }); }
        }
      };
      await Promise.all(Array.from({ length: CAR_CONCURRENCY }, worker));
      if (saved) void refreshPublicInventoryAction();
      setNotice(failed ? { text: `${carCount(saved)} opgeslagen, ${failed} met een probleem. Bekijk de rode kaarten en probeer het opnieuw.`, error: true } : { text: `${carCount(saved)} opgeslagen${publish ? " en online gezet" : " als concept"}.` });
      router.refresh();
    } catch { setNotice({ text: "Opslaan is onderbroken. Je kaarten staan nog hier; probeer opnieuw.", error: true }); }
    finally { runningRef.current = false; setRunning(false); }
  }

  function clearDone() {
    drafts.filter((draft) => draft.status === "done").forEach((draft) => draft.previews.forEach((url) => URL.revokeObjectURL(url)));
    setDrafts((current) => current.filter((draft) => draft.status !== "done"));
  }

  const photoTotal = pendingDrafts.reduce((sum, draft) => sum + draft.files.length, 0);
  const doneCount = drafts.length - pendingDrafts.length;

  return <div className="bulk-upload">
    <section className="admin-form-section bulk-intro" aria-labelledby="bulk-start-heading">
      <h2 id="bulk-start-heading">Foto’s kiezen</h2>
      <div className="editor-mode-switch" role="group" aria-label="Hoe worden de foto’s verdeeld?">
        <button type="button" aria-pressed={mode === "together"} onClick={() => setMode("together")} disabled={running}>Elke keuze is één auto</button>
        <button type="button" aria-pressed={mode === "each"} onClick={() => setMode("each")} disabled={running}>Elke foto is een aparte auto</button>
      </div>
      <p className="help-text">{mode === "together" ? "Kies de foto’s van één auto, daarna die van de volgende auto. Elke keer komt er een kaart bij." : "Handig voor advertentiefoto’s of flyers: van elke foto wordt een eigen auto gemaakt."}</p>
      <div className={`drop-zone bulk-drop${dragging ? " is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}>
        <ImagePlus size={26} aria-hidden="true" />
        <label className="photo-file-picker">Foto’s kiezen<input type="file" accept={photoAccept} multiple disabled={running} onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
        <p><span className="drop-hint-drag">Of sleep foto’s hierheen. </span>Merk, model, prijs en de rest zijn optioneel en kun je later aanvullen.</p>
      </div>
      <button type="button" className="button button-ghost button-sm bulk-add-empty" onClick={() => setDrafts((current) => [...current, newDraft([])])} disabled={running}><Plus size={15} aria-hidden="true" /> Auto zonder foto’s toevoegen</button>
    </section>

    {drafts.length ? <section className="bulk-list" aria-label="Auto’s om op te slaan">
      {drafts.map((draft, index) => {
        const locked = running || draft.status === "saving" || draft.status === "done" || Boolean(draft.id);
        const models = modelsForMake(draft.make);
        return <article key={draft.key} className={`bulk-card is-${draft.status}`} aria-label={`Auto ${index + 1}`}>
          <header className="bulk-card-head">
            <strong>Auto {index + 1}</strong>
            <span className="muted">{photoCount((draft.savedPhotos ?? 0) + draft.files.length)}{draft.savedPhotos ? ` (${draft.savedPhotos} opgeslagen)` : ""}</span>
            {draft.status === "done" ? <span className="bulk-state is-done"><Check size={14} aria-hidden="true" /> Opgeslagen</span> : draft.status === "saving" ? <span className="bulk-state"><LoaderCircle size={14} className="spin" aria-hidden="true" /> {draft.progress ? `${draft.progress.done}/${draft.progress.total} foto’s` : "Opslaan…"}</span> : null}
            <div className="bulk-card-tools">
              {draft.id ? <Link className="text-link" href={`/admin/inventory/${draft.id}`} target="_blank">Bewerken</Link> : null}
              {index > 0 && !locked && !drafts[index - 1].id ? <button type="button" className="row-action" onClick={() => mergeWithPrevious(draft.key)} title="Deze foto’s bij de vorige auto voegen"><Merge size={15} aria-hidden="true" /><span className="row-action-label">Bij vorige auto</span></button> : null}
              {!draft.id && draft.status !== "saving" && draft.status !== "done" ? <button type="button" className="row-action" onClick={() => removeDraft(draft.key)} disabled={running} aria-label={`Auto ${index + 1} weghalen`} title="Weghalen"><Trash2 size={15} aria-hidden="true" /></button> : null}
            </div>
          </header>
          {draft.status === "done" ? null : <>
            <div className="bulk-photos">
              {draft.previews.map((url, photo) => <div className={`bulk-photo${photo === 0 ? " cover" : ""}`} key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a file that is not uploaded yet */}
                <img src={url} alt={`Foto ${photo + 1}`} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                {photo === 0 ? <span className="cover-label">Omslag</span> : null}
                {!running && draft.status !== "saving" ? <button type="button" className="photo-remove" onClick={() => removePhoto(draft.key, photo)} aria-label={`Verwijder foto ${photo + 1}`}><X size={14} aria-hidden="true" /></button> : null}
              </div>)}
              {draft.files.length < maxPhotosPerVehicle && !running && draft.status !== "saving" ? <label className="bulk-photo bulk-photo-add"><ImagePlus size={20} aria-hidden="true" /><span>Foto’s</span><input type="file" accept={photoAccept} multiple onChange={(event) => { addFiles(event.currentTarget.files, draft.key); event.currentTarget.value = ""; }} /></label> : null}
            </div>
            {draft.progress ? <div className="upload-progress-bar" aria-hidden="true"><span style={{ width: `${Math.max(Math.round(draft.progress.done / draft.progress.total * 100), 6)}%` }} /></div> : null}
            <div className="bulk-fields">
              <label className="admin-field">Merk<input value={draft.make} list="bulk-makes" onChange={(event) => update(draft.key, { make: event.target.value })} disabled={locked} placeholder="Optioneel" maxLength={80} /></label>
              <label className="admin-field">Model<input value={draft.model} list={`bulk-models-${draft.key}`} onChange={(event) => update(draft.key, { model: event.target.value })} disabled={locked} placeholder="Optioneel" maxLength={100} />{models.length ? <datalist id={`bulk-models-${draft.key}`}>{models.map((model) => <option key={model} value={model} />)}</datalist> : null}</label>
              <label className="admin-field">Bouwjaar<input value={draft.year} onChange={(event) => update(draft.key, { year: event.target.value.replace(/\D/g, "").slice(0, 4) })} disabled={locked} inputMode="numeric" placeholder="Optioneel" /></label>
              <label className="admin-field">Interne prijs<input value={draft.price} onChange={(event) => update(draft.key, { price: event.target.value.replace(/[^\d.]/g, "") })} disabled={locked} inputMode="decimal" placeholder="Op aanvraag" /></label>
              <label className="admin-field">Cashprijs<input value={draft.cash_price} onChange={(event) => update(draft.key, { cash_price: event.target.value.replace(/[^\d.]/g, "") })} disabled={locked} inputMode="decimal" placeholder="Op aanvraag" /></label>
              <label className="admin-field">Stocknummer<input value={draft.stock_number} onChange={(event) => update(draft.key, { stock_number: event.target.value.toUpperCase() })} disabled={locked} placeholder="Automatisch" maxLength={80} autoCapitalize="characters" autoCorrect="off" spellCheck={false} /></label>
              <label className="admin-field">Beschikbaarheid<select value={draft.availability} onChange={(event) => update(draft.key, { availability: event.target.value })} disabled={locked}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            {!locked ? <details className="bulk-listing"><summary><ClipboardPaste size={15} aria-hidden="true" /> Advertentietekst plakken</summary>
              <textarea rows={3} value={draft.listing} onChange={(event) => update(draft.key, { listing: event.target.value })} placeholder={"2018 - Toyota Harrier | Panoramic sunroof\nPrijs: $26950,-"} aria-label={`Advertentietekst voor auto ${index + 1}`} />
              <button type="button" className="button button-outline button-sm" onClick={() => applyListing(draft.key)} disabled={!draft.listing.trim()}>Vul gegevens in</button>
            </details> : null}
          </>}
          {draft.message ? <p className={`admin-feedback${draft.status === "error" ? " admin-error" : ""}`} role={draft.status === "error" ? "alert" : undefined}>{draft.status === "error" ? <CircleAlert size={14} aria-hidden="true" /> : null} {draft.message}</p> : null}
        </article>;
      })}
      <datalist id="bulk-makes">{vehicleMakes.map((make) => <option key={make} value={make} />)}</datalist>
    </section> : null}

    <div className="admin-form-footer bulk-footer">
      <div className="bulk-options">
        <label className="admin-field bulk-currency">Valuta<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 8))} disabled={running} placeholder="USD" /></label>
        <label className="admin-checkbox"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} disabled={running} /><span><strong>Direct tonen op de website</strong><small>Uitvinken om ze eerst als concept op te slaan</small></span></label>
      </div>
      <div className="admin-form-message" role="status" aria-live="polite">{notice ? <p className={`admin-feedback${notice.error ? " admin-error" : ""}`}>{notice.error ? <CircleAlert size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} {notice.text}</p> : null}</div>
      <div className="admin-row-actions">
        {doneCount ? <button type="button" className="button button-ghost" onClick={clearDone} disabled={running}>Opgeslagen kaarten wissen ({doneCount})</button> : null}
        {doneCount && !pendingDrafts.length ? <Link className="button button-outline" href="/admin/inventory">Naar de voorraad</Link> : null}
        <button type="button" className="button button-primary" onClick={() => void saveAll()} disabled={running || !pendingDrafts.length} aria-busy={running || undefined}>{running ? <><LoaderCircle size={16} className="spin" aria-hidden="true" /> Bezig met opslaan…</> : pendingDrafts.length ? `${carCount(pendingDrafts.length)} opslaan${photoTotal ? ` (${photoCount(photoTotal)})` : ""}` : "Niets om op te slaan"}</button>
      </div>
    </div>
  </div>;
}
