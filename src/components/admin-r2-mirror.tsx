"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CloudUpload, LoaderCircle } from "lucide-react";
import { countR2ImagesAction, syncR2ImagesAction } from "@/app/admin/actions";

/** Copies published photos in small batches while the admin dashboard is open. */
export function AdminR2Mirror() {
  const started = useRef(false);
  const [state, setState] = useState<{ done: number; total: number; error?: string } | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    void (async () => {
      const pending = await countR2ImagesAction();
      if (cancelled || pending.error || !pending.ids.length) {
        if (!cancelled && pending.error) setState({ done: 0, total: 0, error: pending.error });
        return;
      }
      let done = 0;
      setState({ done, total: pending.ids.length });
      for (let offset = 0; offset < pending.ids.length && !cancelled; offset += 2) {
        try {
          const result = await syncR2ImagesAction(pending.ids.slice(offset, offset + 2));
          if (result.error) throw new Error(result.error);
          done += result.copied;
          if (result.failedIds.length) throw new Error(`${result.failedIds.length} foto’s konden niet worden gekopieerd. Vernieuw deze pagina om opnieuw te proberen.`);
          setState({ done, total: pending.ids.length });
        } catch (error) {
          setState({ done, total: pending.ids.length, error: error instanceof Error ? error.message : "De kopie is onderbroken. Vernieuw deze pagina om verder te gaan." });
          return;
        }
      }
    })().catch(() => { if (!cancelled) setState({ done: 0, total: 0, error: "De fotokopie is onderbroken. Vernieuw deze pagina om verder te gaan." }); });
    return () => { cancelled = true; };
  }, []);

  if (!state) return null;
  const complete = state.done === state.total && !state.error;
  return <section className="catalog-switch photo-optimizer" aria-live="polite">
    <span className="catalog-switch-icon" aria-hidden="true">{complete ? <Check size={18} /> : <CloudUpload size={18} />}</span>
    <div className="catalog-switch-text">
      <strong>{complete ? "Foto’s via Cloudflare geladen" : "Foto’s naar Cloudflare kopiëren"}</strong>
      <span>{state.error || `${state.done} van ${state.total} foto’s gekopieerd. De website blijft online tijdens het kopiëren.`}</span>
      {!complete && state.total && !state.error ? <div className="upload-progress-bar" aria-hidden="true"><span style={{ width: `${Math.max(4, state.done / state.total * 100)}%` }} /></div> : null}
    </div>
    {!complete && !state.error ? <LoaderCircle size={20} className="spin" aria-label="Bezig" /> : null}
  </section>;
}
