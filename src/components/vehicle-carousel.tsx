"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { VehicleCard } from "@/components/vehicle-card";

const AUTOPLAY_MS = 4500;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function VehicleCarousel({ vehicles, defaultCurrency, label }: { vehicles: Vehicle[]; defaultCurrency?: string | null; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const readEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setAtStart(track.scrollLeft <= 4);
    setAtEnd(track.scrollLeft >= max - 4);
  }, []);

  const step = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.firstElementChild as HTMLElement | null;
    const distance = item ? item.offsetWidth + 24 : track.clientWidth;
    const max = track.scrollWidth - track.clientWidth;
    const target = track.scrollLeft + distance * direction;
    const left = direction === 1 && track.scrollLeft >= max - 4 ? 0 : direction === -1 && track.scrollLeft <= 4 ? max : target;
    track.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    readEdges();
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => readEdges();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", readEdges);
    return () => { track.removeEventListener("scroll", onScroll); window.removeEventListener("resize", readEdges); };
  }, [readEdges]);

  useEffect(() => {
    if (vehicles.length < 2 || prefersReducedMotion()) return;
    const timer = window.setInterval(() => { if (!paused.current && !document.hidden) step(1); }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [step, vehicles.length]);

  const pause = useCallback(() => { paused.current = true; }, []);
  const resume = useCallback(() => { paused.current = false; }, []);

  return <div className="vehicle-carousel" onMouseEnter={pause} onMouseLeave={resume} onFocusCapture={pause} onBlurCapture={resume} onPointerDown={pause}>
    <div className="carousel-track" ref={trackRef} role="group" aria-roledescription="carousel" aria-label={label} tabIndex={0}>
      {vehicles.map((vehicle, index) => <div className="carousel-item" key={vehicle.id}>
        <VehicleCard vehicle={vehicle} priority={index < 2} defaultCurrency={defaultCurrency} />
      </div>)}
    </div>
    {vehicles.length > 1 ? <>
      <button className="carousel-arrow prev" type="button" onClick={() => step(-1)} aria-label="Previous cars" aria-disabled={atStart ? "true" : undefined}><ChevronLeft size={22} aria-hidden="true" /></button>
      <button className="carousel-arrow next" type="button" onClick={() => step(1)} aria-label="Next cars" aria-disabled={atEnd ? "true" : undefined}><ChevronRight size={22} aria-hidden="true" /></button>
    </> : null}
  </div>;
}
