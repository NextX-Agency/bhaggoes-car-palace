"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { VehicleImage } from "@/lib/domain";

export function VehicleGallery({ images, title }: { images: VehicleImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const usable = [...images].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order).filter((image) => image.url);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (fullscreen && dialog && !dialog.open) dialog.showModal();
  }, [fullscreen]);

  if (!usable.length) return <div className="gallery-empty"><span className="car-mark" aria-hidden="true">B</span><p>Photos will be added soon</p></div>;
  const selected = usable[Math.min(active, usable.length - 1)];
  const closeViewer = () => dialogRef.current?.close();
  const moveViewer = (direction: -1 | 1) => setActive((current) => (current + direction + usable.length) % usable.length);

  return <div className="vehicle-gallery">
    <button className="gallery-main" type="button" onClick={() => setFullscreen(true)} aria-label={`Open photo viewer for ${title}`}>
      <Image src={selected.url!} alt={selected.alt_text ?? title} fill priority sizes="(max-width: 900px) 100vw, 65vw" />
      <span className="gallery-open-label">View photos</span>
    </button>
    {usable.length > 1 ? <div className="gallery-thumbs" aria-label="Vehicle photos">{usable.map((image, index) => <button className={index === active ? "selected" : ""} key={image.id} onClick={() => setActive(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === active}><Image src={image.url!} alt={image.alt_text ?? `${title} photo ${index + 1}`} fill sizes="120px" /></button>)}</div> : null}
    {fullscreen ? <dialog ref={dialogRef} className="image-lightbox" aria-label={`${title} photos`} onClose={() => setFullscreen(false)} onClick={(event) => { if (event.target === dialogRef.current) closeViewer(); }}>
      <div className="lightbox-topline"><span aria-live="polite">Photo {active + 1} of {usable.length}</span><button className="lightbox-close" type="button" onClick={closeViewer} aria-label="Close image viewer"><X /></button></div>
      <div className="lightbox-image"><Image src={selected.url!} alt={selected.alt_text ?? title} fill sizes="100vw" /></div>
      {usable.length > 1 ? <><button className="lightbox-nav lightbox-prev" type="button" onClick={() => moveViewer(-1)} aria-label="Previous photo"><ChevronLeft /></button><button className="lightbox-nav lightbox-next" type="button" onClick={() => moveViewer(1)} aria-label="Next photo"><ChevronRight /></button></> : null}
    </dialog> : null}
  </div>;
}
