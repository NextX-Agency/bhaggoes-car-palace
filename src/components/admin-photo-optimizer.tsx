"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, CircleAlert, ImageDown, LoaderCircle } from "lucide-react";
import { countLargePhotosAction, optimizePhotosAction } from "@/app/admin/actions";

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Dashboard card that appears while stored photos are larger than needed, and shrinks them in one go. */
export function AdminPhotoOptimizer() {
  const router = useRouter();
  const [count, setCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, saved: 0 });
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);

  // Checked after the page has loaded, so the dashboard itself never waits for it.
  useEffect(() => { let active = true; void countLargePhotosAction().then((value) => { if (active) setCount(value.count); }); return () => { active = false; }; }, []);

  async function run() {
    if (running || !count) return;
    setRunning(true); setResult(null);
    const failed: string[] = []; let done = 0; let saved = 0;
    setProgress({ done: 0, total: count, saved: 0 });
    for (let round = 0; round < 200; round += 1) {
      let step: Awaited<ReturnType<typeof optimizePhotosAction>>;
      // A dropped connection or a server timeout must not leave the button spinning; what was done is kept.
      try { step = await optimizePhotosAction(failed); }
      catch { setResult({ text: `Onderbroken na ${done} foto’s (verbinding of time-out). Tik nogmaals op “Foto’s verkleinen” om verder te gaan.`, error: true }); break; }
      if (step.error) { setResult({ text: step.error, error: true }); break; }
      done += step.optimized; saved += step.savedBytes; failed.push(...step.failedIds);
      setProgress({ done: done + failed.length, total: count, saved });
      if (!step.remaining || (!step.optimized && !step.failedIds.length)) break;
    }
    setRunning(false);
    const left = await countLargePhotosAction().then((value) => value.count).catch(() => failed.length);
    setCount(left);
    if (!failed.length && !left) setResult((current) => current ?? { text: `${done} foto’s verkleind, ${megabytes(saved)} bespaard. Foto’s laden nu veel sneller.` });
    else if (failed.length) setResult({ text: `${done} foto’s verkleind; ${failed.length} konden niet worden verwerkt en blijven zoals ze zijn.`, error: true });
    router.refresh();
  }

  if (!count && !result) return null;
  const percent = progress.total ? Math.round(progress.done / progress.total * 100) : 0;
  return <section className="catalog-switch photo-optimizer" aria-labelledby="photo-optimizer-title">
    <span className="catalog-switch-icon" aria-hidden="true">{result && !result.error ? <Check size={18} /> : <ImageDown size={18} />}</span>
    <div className="catalog-switch-text">
      <strong id="photo-optimizer-title">{result && !count ? "Foto’s geoptimaliseerd" : `${count} foto’s zijn groter dan nodig`}</strong>
      <span>{running ? `Bezig: ${progress.done} van ${progress.total} (${megabytes(progress.saved)} bespaard)…` : result ? result.text : "Daardoor laden de foto’s traag, vooral op de telefoon. Verklein ze in één keer; de kwaliteit blijft scherp genoeg voor de website."}</span>
      {running ? <div className="upload-progress-bar" aria-hidden="true"><span style={{ width: `${Math.max(percent, 4)}%` }} /></div> : null}
    </div>
    {count ? <button type="button" className="button button-primary button-sm" onClick={() => void run()} disabled={running} aria-busy={running || undefined}>{running ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : result?.error ? <CircleAlert size={15} aria-hidden="true" /> : <ImageDown size={15} aria-hidden="true" />}{running ? "Bezig…" : "Foto’s verkleinen"}</button> : null}
  </section>;
}
