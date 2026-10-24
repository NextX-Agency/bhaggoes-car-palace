"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Camera, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { VehicleImage } from "@/lib/domain";
import { sortedImages } from "@/lib/domain";

function useSwipe(onSwipe: (direction: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  return {
    consumeSwipe: () => { const swiped = moved.current; moved.current = false; return swiped; },
    handlers: {
      onPointerDown: (event: PointerEvent) => { if (event.pointerType !== "mouse") { start.current = { x: event.clientX, y: event.clientY }; moved.current = false; } },
      onPointerUp: (event: PointerEvent) => {
        const origin = start.current; start.current = null;
        if (!origin) return;
        const dx = event.clientX - origin.x; const dy = event.clientY - origin.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { moved.current = true; onSwipe(dx < 0 ? 1 : -1); }
      },
      onPointerCancel: () => { start.current = null; },
    },
  };
}

export function VehicleGallery({ images, title }: { images: VehicleImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const hasSelectedThumbnail = useRef(false);
  const usable = sortedImages(images);
  const count = usable.length;
  const move = (direction: -1 | 1) => setActive((current) => (current + direction + count) % count);
  const stageSwipe = useSwipe(move);
  const viewerSwipe = useSwipe(move);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (fullscreen && dialog && !dialog.open) dialog.showModal();
  }, [fullscreen]);

  useEffect(() => {
    if (!hasSelectedThumbnail.current) { hasSelectedThumbnail.current = true; return; }
    const thumb = thumbsRef.current?.children[active] as HTMLElement | undefined;
    thumb?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  if (!count) return <div className="gallery-empty"><Camera size={30} aria-hidden="true" /><p>No photos yet</p></div>;
  const selected = usable[Math.min(active, count - 1)];
  const onKeys = (event: KeyboardEvent) => {
    if (count < 2) return;
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  };

  return <div className="vehicle-gallery" onKeyDown={onKeys}>
    <div className="gallery-stage" {...stageSwipe.handlers}>
      <button className="gallery-main" type="button" onClick={() => { if (!stageSwipe.consumeSwipe()) setFullscreen(true); }} aria-label={`Open full-screen photos of ${title}`}>
        <Image key={selected.id} src={selected.url!} alt={selected.alt_text ?? title} fill loading="eager" fetchPriority="high" sizes="(max-width: 960px) 100vw, 820px" />
      </button>
      {count > 1 ? <>
        <button className="gallery-arrow prev" type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft size={22} /></button>
        <button className="gallery-arrow next" type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight size={22} /></button>
        <span className="gallery-count" aria-live="polite">{active + 1} / {count}</span>
      </> : null}
      <button className="gallery-expand" type="button" onClick={() => setFullscreen(true)}><Expand size={14} aria-hidden="true" /> Full screen</button>
    </div>
    {count > 1 ? <div className="gallery-thumbs" ref={thumbsRef} aria-label="Choose a photo">
      {usable.map((image, index) => <button type="button" className={index === active ? "selected" : ""} key={image.id} onClick={() => setActive(index)} aria-label={`Show photo ${index + 1} of ${count}`} aria-current={index === active ? "true" : undefined}>
        <Image src={image.url!} alt="" fill sizes="140px" />
      </button>)}
    </div> : null}
    {fullscreen ? <dialog ref={dialogRef} className="image-lightbox" aria-label={`${title} photos`} onClose={() => setFullscreen(false)}>
      <div className="lightbox-topline"><strong>{title}</strong><span aria-live="polite">{active + 1} / {count}</span><button className="lightbox-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close photo viewer"><X size={22} /></button></div>
      <div className="lightbox-image" {...viewerSwipe.handlers}><Image key={selected.id} src={selected.url!} alt={selected.alt_text ?? title} fill sizes="100vw" /></div>
      {count > 1 ? <><button className="lightbox-nav lightbox-prev" type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft /></button><button className="lightbox-nav lightbox-next" type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight /></button></> : null}
    </dialog> : null}
  </div>;
}
