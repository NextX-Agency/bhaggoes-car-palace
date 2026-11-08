"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Lock, Mail, Printer, X } from "lucide-react";
import { openWindowStickerAction } from "@/app/admin/actions";
import { WindowSticker } from "@/components/window-sticker";
import type { WindowStickerData } from "@/lib/window-sticker";
import "./window-sticker.css";

const NEXTX_EMAIL = "agencynextx@gmail.com";
const SHEET_WIDTH_PX = 210 * 96 / 25.4;

/**
 * "Print Window Sticker" on a car's page. Every opening uses one of the limited uses (checked on the server), so the
 * admin confirms first. The sticker is shown above the dashboard with one Afdrukken button (print or save as PDF); it
 * is clicked by hand, so every browser allows the print dialog. After the dialog closes the sticker is removed
 * again: printing it once more is a new use.
 */
export function WindowStickerButton({ vehicleId, initialUsesLeft, limit }: { vehicleId: string; initialUsesLeft: number | null; limit: number }) {
  const [usesLeft, setUsesLeft] = useState(initialUsesLeft);
  const [busy, setBusy] = useState(false);
  const [sticker, setSticker] = useState<WindowStickerData | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeSticker = useCallback(() => setSticker(null), []);
  const unlimited = usesLeft === Infinity;
  const locked = usesLeft === 0;

  async function open() {
    if (locked) { setPaywall(true); return; }
    if (document.querySelector("form.vehicle-editor[data-unsaved]")) { setError("Je hebt wijzigingen die nog niet zijn opgeslagen. Sla de auto eerst op: de raamsticker toont de opgeslagen gegevens."); return; }
    if (!unlimited && !window.confirm(`Een raamsticker openen gebruikt 1 van je ${limit} prints${usesLeft != null ? ` (nog ${usesLeft} over)` : ""}. Na het afdrukken of opslaan als PDF sluit de sticker en kost opnieuw afdrukken weer 1 print. Doorgaan?`)) return;
    setBusy(true); setError(null);
    try {
      const result = await openWindowStickerAction(vehicleId);
      if (result.locked) { setUsesLeft(0); setPaywall(true); }
      else if (result.error) setError(result.error);
      else if (result.sticker) { setUsesLeft(result.usesLeft ?? null); setSticker(result.sticker); }
    } catch { setError("De raamsticker kon niet worden geopend. Controleer je verbinding en probeer het opnieuw."); }
    finally { setBusy(false); }
  }

  const label = unlimited || usesLeft == null ? null : locked ? "op" : `${usesLeft} van ${limit} over`;
  return <>
    <button className={`button button-outline button-sm${locked ? " ws-locked" : ""}`} type="button" onClick={() => void open()} disabled={busy} aria-busy={busy || undefined}>
      {busy ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : locked ? <Lock size={15} aria-hidden="true" /> : <Printer size={15} aria-hidden="true" />} Print Window Sticker{label ? <small className="ws-uses"> ({label})</small> : null}
    </button>
    {error ? <p className="admin-error ws-error" role="alert">{error}</p> : null}
    {sticker ? <StickerOverlay data={sticker} onClose={closeSticker} /> : null}
    <Dialog.Root open={paywall} onOpenChange={setPaywall}>
      <Dialog.Portal>
        <Dialog.Overlay className="filter-drawer-overlay" />
        <Dialog.Content lang="nl" className="ws-paywall">
          <span className="ws-paywall-icon" aria-hidden="true"><Lock size={22} /></span>
          <Dialog.Title>Je gratis raamstickers zijn op</Dialog.Title>
          <Dialog.Description>Je hebt alle {limit} gratis prints van de raamsticker gebruikt. Neem contact op met NextX om de raamsticker permanent te activeren, zonder limiet.</Dialog.Description>
          <div className="ws-paywall-actions">
            <a className="button button-primary" href={`mailto:${NEXTX_EMAIL}?subject=${encodeURIComponent("Raamsticker permanent activeren")}`}><Mail size={16} aria-hidden="true" /> Contact NextX</a>
            <Dialog.Close asChild><button className="button button-ghost" type="button">Sluiten</button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}

function StickerOverlay({ data, onClose }: { data: WindowStickerData; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const printed = useRef(false);
  const printButton = useRef<HTMLButtonElement>(null);
  const [printOpened, setPrintOpened] = useState(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(1, ((stage.current?.clientWidth ?? SHEET_WIDTH_PX) - 32) / SHEET_WIDTH_PX));
    fit(); window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Shrinks the middle of the sheet until it fits (window-sticker.css, --ws-fit). It is measured on the smallest
  // common printable area, Letter paper with the browser's default margins, so it fits every usual printer setup.
  useLayoutEffect(() => {
    const sheet = stage.current?.querySelector<HTMLElement>(".wsticker");
    const body = sheet?.querySelector<HTMLElement>(".ws-body");
    if (!sheet || !body) return;
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      sheet.style.width = "196mm"; sheet.style.height = "259mm";
      for (let size = 1; size >= 0.6; size -= 0.05) {
        sheet.style.setProperty("--ws-fit", size.toFixed(2));
        if (body.scrollHeight <= body.clientHeight + 1) break;
      }
      sheet.style.width = ""; sheet.style.height = "";
    };
    // Printing waits for the fonts and the logo, so the sheet never comes out without them. A logo that cannot load
    // is left out instead of printing a broken image; the business name is in the header as well.
    const logo = sheet.querySelector<HTMLImageElement>(".ws-logo");
    const logoReady = !logo || logo.complete ? Promise.resolve() : new Promise<void>((resolve) => { logo.addEventListener("load", () => resolve(), { once: true }); logo.addEventListener("error", () => resolve(), { once: true }); });
    const giveUp = new Promise<void>((resolve) => window.setTimeout(resolve, 6000));
    fit();
    void Promise.race([Promise.all([document.fonts?.ready, logoReady]), giveUp]).then(() => {
      if (cancelled) return;
      if (logo && !(logo.complete && logo.naturalWidth > 0)) logo.hidden = true;
      fit(); setReady(true);
    });
    return () => { cancelled = true; };
  }, [data]);

  useEffect(() => { if (ready) printButton.current?.focus(); }, [ready]);

  // Only the sticker is printed (window-sticker.css); the dashboard is hidden while the class is set.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("ws-printing");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const done = () => onClose();
    window.addEventListener("afterprint", done);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", escape);
    return () => { root.classList.remove("ws-printing"); document.body.style.overflow = overflow; window.removeEventListener("afterprint", done); window.removeEventListener("keydown", escape); };
  }, [onClose, ready]);

  // One print dialog per opening. Most desktop browsers pause here until the dialog is closed; then the sticker is
  // removed straight away. Browsers that return at once remove it on "afterprint" (above).
  const print = useCallback(() => {
    if (printed.current || !ready) return;
    printed.current = true; setPrintOpened(true);
    const started = Date.now();
    window.print();
    if (Date.now() - started > 400) onClose();
  }, [onClose, ready]);

  return createPortal(<div className="ws-print-root" role="dialog" aria-modal="true" aria-label="Raamsticker" lang="nl">
    {/* Only while the sticker is open: A4 without margins, also for browsers that ignore the named page rule. */}
    <style>{"@page { size: A4 portrait; margin: 0; }"}</style>
    <div className="ws-toolbar">
      <p>{printOpened ? "Sluit dit venster als het afdrukken klaar is." : <>Klik op <strong>Afdrukken</strong> en kies je printer of <strong>Opslaan als PDF</strong>. Papier: A4, staand.</>}</p>
      <div className="ws-toolbar-actions">
        {printOpened ? null : <button ref={printButton} className="button button-primary button-sm" type="button" onClick={print} disabled={!ready} aria-busy={!ready || undefined}>{ready ? <Printer size={15} aria-hidden="true" /> : <LoaderCircle size={15} className="spin" aria-hidden="true" />} {ready ? "Afdrukken" : "Voorbereiden…"}</button>}
        <button className="button button-ghost button-sm" type="button" onClick={onClose}><X size={15} aria-hidden="true" /> Sluiten</button>
      </div>
    </div>
    <div className="ws-stage" ref={stage}>
      <div className="ws-sheet" style={{ "--ws-scale": scale } as React.CSSProperties}><WindowSticker data={data} /></div>
    </div>
  </div>, document.body);
}
