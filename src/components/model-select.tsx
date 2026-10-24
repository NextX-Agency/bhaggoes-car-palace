"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export function ModelSelect({ models, value, onChange, placeholder = "Any model", name = "model" }: {
  models: readonly string[]; value: string; onChange: (value: string) => void; placeholder?: string; name?: string;
}) {
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const listId = useId();
  const matches = models.filter((model) => model.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const visible = matches.slice(0, 100);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target) && detailsRef.current?.open) detailsRef.current.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function choose(model: string) {
    onChange(model);
    setCustom(false);
    setSearch("");
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return <div className="model-select-wrap">
    <details className="model-select" ref={detailsRef} onKeyDown={(event) => { if (event.key === "Escape") detailsRef.current!.open = false; }}>
      <summary className="model-select-trigger" aria-label={`Model: ${value || placeholder}`} aria-controls={listId}>
        <span className={value ? "" : "model-select-placeholder"}>{value || placeholder}</span><ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="model-select-popover" id={listId}>
        {models.length ? <>
          <div className="model-select-search"><Search size={16} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search listed models" aria-label="Search listed models" /></div>
          <div className="model-select-options" role="group" aria-label="Models currently listed">
            <button type="button" onClick={() => choose("")}>{placeholder}</button>
            {visible.map((model) => <button type="button" key={model} onClick={() => choose(model)}>{model}{value === model ? <Check size={16} aria-hidden="true" /> : null}</button>)}
            {!matches.length ? <p>No listed model found.</p> : null}
            {matches.length > visible.length ? <p>Type more to narrow the list.</p> : null}
          </div>
        </> : <p className="model-select-note">No models are currently listed for this make.</p>}
        <button className="model-select-custom-button" type="button" onClick={() => { setCustom(true); detailsRef.current!.open = false; }}>Type another model</button>
      </div>
    </details>
    {custom ? <div className="model-select-custom"><input aria-label="Type another model" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Type a model" autoComplete="off" /><button type="button" onClick={() => setCustom(false)}>Done</button></div> : null}
    <input type="hidden" name={name} value={value} />
  </div>;
}
