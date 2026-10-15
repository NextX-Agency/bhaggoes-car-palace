"use client";

import Image from "next/image";
import { useState } from "react";
import type { VehicleImage } from "@/lib/domain";
import { X } from "lucide-react";

export function VehicleGallery({ images, title }: { images: VehicleImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const usable = [...images].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order).filter((image) => image.url);
  if (!usable.length) return <div className="gallery-empty"><span className="car-mark" aria-hidden="true">B</span><p>Photos will be added soon</p></div>;
  const selected = usable[Math.min(active, usable.length - 1)];
  return <div className="vehicle-gallery">
    <button className="gallery-main" onClick={() => setFullscreen(true)} aria-label="Open image viewer"><Image src={selected.url!} alt={selected.alt_text ?? title} fill priority sizes="(max-width: 900px) 100vw, 65vw" /></button>
    {usable.length > 1 ? <div className="gallery-thumbs">{usable.map((image, index) => <button className={index === active ? "selected" : ""} key={image.id} onClick={() => setActive(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === active}><Image src={image.url!} alt={image.alt_text ?? `${title} photo ${index + 1}`} fill sizes="120px" /></button>)}</div> : null}
    {fullscreen ? <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`${title} photos`} onClick={() => setFullscreen(false)}><button className="lightbox-close" onClick={() => setFullscreen(false)} aria-label="Close image viewer"><X /></button><Image src={selected.url!} alt={selected.alt_text ?? title} fill sizes="100vw" onClick={(event) => event.stopPropagation()} /></div> : null}
  </div>;
}
