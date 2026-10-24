"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";

// `logos` is rendered on the server (see brandLogoMap) so the brand icon set never ships in the client bundle.
export function MakeSelect({ makes, name, value = "", placeholder = "All makes", label = "Make", labelledBy, logos = {} }: { makes: string[]; name: string; value?: string; placeholder?: string; label?: string; labelledBy: string; logos?: Record<string, ReactNode> }) {
  const [selected, setSelected] = useState(value);
  const [search, setSearch] = useState("");
  const listId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const filteredMakes = useMemo(() => makes.filter((make) => make.toLowerCase().includes(search.trim().toLowerCase())), [makes, search]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const details = detailsRef.current;
      if (event.target instanceof Node && !details?.contains(event.target) && details?.open) {
        details.open = false;
        setSearch("");
      }
    }
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, []);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
    setSearch("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key === "Escape") close();
  }

  return <details className="make-select" ref={detailsRef} onKeyDown={handleKeyDown} onToggle={() => { if (!detailsRef.current?.open) setSearch(""); }}>
    <summary className="make-select-trigger" aria-label={`${label}: ${selected || placeholder}`} aria-controls={listId}>
      {selected ? <>{logos[selected]}<span>{selected}</span></> : <span className="make-select-placeholder">{placeholder}</span>}
      <ChevronDown size={16} aria-hidden="true" />
    </summary>
    <div className="make-select-popover" id={listId}>
      <div className="make-select-search"><Search size={16} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search makes" aria-label="Search makes" /></div>
      <div className="make-select-options" role="group" aria-labelledby={labelledBy}>
        <button type="button" aria-pressed={!selected} className={!selected ? "is-selected" : ""} onClick={() => { setSelected(""); close(); }}>{placeholder}</button>
        {filteredMakes.map((make) => <button type="button" aria-pressed={selected === make} className={selected === make ? "is-selected" : ""} key={make} onClick={() => { setSelected(make); close(); }}>{logos[make]}{make}</button>)}
        {filteredMakes.length === 0 ? <p className="make-select-empty">No makes found.</p> : null}
      </div>
    </div>
    <input type="hidden" name={name} value={selected} />
  </details>;
}
