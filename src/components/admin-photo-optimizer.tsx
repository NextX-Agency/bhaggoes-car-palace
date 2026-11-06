"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, ImageDown, LoaderCircle } from "lucide-react";
import { countLargePhotosAction, optimizePhotosAction } from "@/app/admin/actions";

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Dashboard card that appears while stored photos are larger than needed, and shrinks them in one go. */
export function AdminPhotoOptimizer() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, saved: 0 });
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);
  const started = useRef(false);
  const runningRef = useRef(false);

  const run = useCallback(async (ids: string[]) => {
    if (runningRef.current || !ids.length) return;
    runningRef.current = true;
    setRunning(true); setResult(null);
    const failed: string[] = []; let done = 0; let saved = 0;
    setProgress({ done: 0, total: ids.length, saved: 0 });
    for (let offset = 0; offset < ids.length; offset += 4) {
      let step: Awaited<ReturnType<typeof optimizePhotosAction>>;
      // A dropped connection or a server timeout must not leave the button spinning; what was done is kept.
      try { step = await optimizePhotosAction(ids.slice(offset, offset + 4)); }
      catch { setResult({ text: `Onderbroken na ${done} foto’s (verbinding of time-out). Probeer opnieuw om verder te gaan.`, error: true }); break; }
      if (step.error) { setResult({ text: step.error, error: true }); break; }
      done += step.optimized; saved += step.savedBytes; failed.push(...step.failedIds);
      setProgress({ done: Math.min(offset + 4, ids.length), total: ids.length, saved });
    }
    setRunning(false);
    const left = await countLargePhotosAction().catch(() => ({ count: failed.length, ids: failed }));
    setCount(left.count); setCandidateIds(left.ids);
    if (!failed.length && !left.count) setResult((current) => current ?? { text: `${done} foto’s verkleind, ${megabytes(saved)} bespaard. Foto’s laden nu veel sneller.` });
    else if (failed.length) setResult({ text: `${done} foto’s verkleind; ${failed.length} konden niet worden verwerkt en blijven zoals ze zijn.`, error: true });
    router.refresh();
    runningRef.current = false;
  }, [router]);

  // Checked after the page has loaded, so the dashboard itself never waits for it.
  useEffect(() => { let active = true; void countLargePhotosAction().then((value) => {
    if (!active) return;
    setCount(value.count); setCandidateIds(value.ids);
    if (value.error) setResult({ text: value.error, error: true });
    else if (value.count && !started.current) { started.current = true; void run(value.ids); }
  }).catch(() => { if (active) setResult({ text: "De foto’s konden niet worden gecontroleerd.", error: true }); }); return () => { active = false; }; }, [run]);

  if (!count && !result) return null;
  const percent = progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  return <section className="catalog-switch photo-optimizer" aria-labelledby="photo-optimizer-title">
    <span className="catalog-switch-icon" aria-hidden="true">{result && !result.error ? <Check size={18} /> : <ImageDown size={18} />}</span>
    <div className="catalog-switch-text">
      <strong id="photo-optimizer-title">{result && !count ? "Foto’s geoptimaliseerd" : `${count} foto’s zijn groter dan nodig`}</strong>
      <span>{running ? `Automatisch optimaliseren: ${progress.done} van ${progress.total} (${megabytes(progress.saved)} bespaard)…` : result ? result.text : "Foto’s worden automatisch verkleind zodra je dit overzicht opent."}</span>
      {running ? <div className="upload-progress-bar" aria-hidden="true"><span style={{ width: `${Math.max(percent, 4)}%` }} /></div> : null}
    </div>
    {count && !running && result?.error ? <button type="button" className="button button-primary button-sm" onClick={() => void run(candidateIds)}><CircleAlert size={15} aria-hidden="true" /> Opnieuw proberen</button> : running ? <LoaderCircle size={20} className="spin" aria-label="Bezig" /> : null}
  </section>;
}
