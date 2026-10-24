"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { comboKey, filterComboOptions } from "../lib/combo-options";

type ComboFieldProps = {
  /** Form field name. The visible text input carries it, so FormData and `form.elements.namedItem(name)` work as for a plain input. */
  name: string;
  /** Accessible name for the input and its list (the visible label usually wraps this component). */
  label: string;
  options: readonly string[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  autoCapitalize?: "off" | "words" | "characters" | "sentences";
  /** Runs for typing and for picking an option (the native input event is fired in both cases). */
  onInput?: (event: FormEvent<HTMLInputElement>) => void;
  /** Optional leading visual per option, for example a brand logo. */
  renderOption?: (option: string) => ReactNode;
  /** Shown when the chevron is tapped but there are no options to offer. */
  emptyText?: string;
};

type Placement = { up: boolean; maxHeight: number };

const defaultPlacement: Placement = { up: false, maxHeight: 288 };

/**
 * Touch-friendly combobox. Tapping the field or its chevron opens a scrollable list of every option; typing filters it;
 * any typed text is still accepted, so options are suggestions rather than a closed list.
 */
export function ComboField({ name, label, options, defaultValue = "", placeholder, required, maxLength, autoCapitalize = "words", onInput, renderOption, emptyText = "No suggestions. Type any value." }: ComboFieldProps) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [current, setCurrent] = useState(defaultValue);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState<Placement>(defaultPlacement);

  const visible = filtering ? filterComboOptions(options, current) : [...options];
  const currentKey = comboKey(current);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const below = viewportHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < 220 && above > below;
    setPlacement({ up, maxHeight: Math.max(160, Math.min(320, Math.floor(up ? above : below))) });
  }, []);

  const openMenu = (force = false) => {
    if (!force && !options.length) return;
    setCurrent(inputRef.current?.value ?? "");
    setFiltering(false);
    setActive(-1);
    measure();
    setOpen(true);
  };

  const closeMenu = () => { setOpen(false); setActive(-1); };

  // Close on a tap/click anywhere outside, and keep the list placed correctly when the on-screen keyboard resizes the viewport.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
      setActive(-1);
    };
    const viewport = window.visualViewport;
    document.addEventListener("pointerdown", onPointerDown);
    viewport?.addEventListener("resize", measure);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      viewport?.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  // Bring the current selection (on open) or the keyboard-highlighted option into view.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const target = active >= 0
      ? list.querySelector<HTMLElement>(`[data-index="${active}"]`)
      : list.querySelector<HTMLElement>('[aria-selected="true"]');
    target?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const setNativeValue = (value: string) => {
    const input = inputRef.current;
    if (!input) return;
    // Use the native setter then dispatch a real `input` event so React handlers (title generation, logo preview) run exactly as for typing.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const choose = (option: string) => {
    setNativeValue(option);
    setCurrent(option);
    setFiltering(false);
    closeMenu();
  };

  const handleInput = (event: FormEvent<HTMLInputElement>) => {
    setCurrent(event.currentTarget.value);
    setFiltering(true);
    setActive(-1);
    if (!open && options.length) { measure(); setOpen(true); }
    onInput?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { openMenu(); return; }
      if (!visible.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index < 0 ? (step === 1 ? 0 : visible.length - 1) : (index + step + visible.length) % visible.length));
    } else if (event.key === "Enter") {
      if (!open) return; // closed: normal form behaviour
      event.preventDefault();
      const option = active >= 0 ? visible[active] : undefined;
      if (option) choose(option); else closeMenu();
    } else if (event.key === "Escape") {
      if (open) { event.preventDefault(); event.stopPropagation(); closeMenu(); }
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  const showPanel = open && (visible.length > 0 || filtering || !options.length);
  const hasOptions = options.length > 0;

  return <div ref={rootRef} className={`combo-field${open ? " is-open" : ""}`} onBlur={(event) => { const next = event.relatedTarget; if (next instanceof Node && !event.currentTarget.contains(next)) closeMenu(); }}>
    <input
      ref={inputRef}
      className="combo-input"
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      role="combobox"
      aria-label={label}
      aria-autocomplete="list"
      aria-expanded={showPanel && visible.length > 0}
      aria-controls={listId}
      aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize={autoCapitalize}
      spellCheck={false}
      onFocus={() => openMenu()}
      onClick={() => { if (!open) openMenu(); }}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
    />
    <button
      className="combo-toggle"
      type="button"
      tabIndex={-1}
      aria-label={`Show ${label.toLowerCase()} options`}
      aria-expanded={open}
      aria-controls={listId}
      aria-haspopup="listbox"
      onClick={(event) => { event.preventDefault(); if (open) closeMenu(); else openMenu(true); }}
    ><ChevronDown size={18} aria-hidden="true" /></button>
    {showPanel ? <div className={`combo-panel${placement.up ? " is-up" : ""}`} style={{ maxHeight: placement.maxHeight }} onMouseDown={(event) => event.preventDefault()}>
      <ul ref={listRef} id={listId} className="combo-list" role="listbox" aria-label={label} hidden={!visible.length}>
        {visible.map((option, index) => {
          const selected = comboKey(option) === currentKey;
          return <li
            key={option}
            id={optionId(index)}
            data-index={index}
            role="option"
            aria-selected={selected}
            className={`combo-option${index === active ? " is-active" : ""}`}
            onClick={(event) => { event.preventDefault(); choose(option); }}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") setActive(index); }}
          >{renderOption ? <span className="combo-option-lead">{renderOption(option)}</span> : null}<span className="combo-option-text">{option}</span>{selected ? <Check size={16} aria-hidden="true" /> : null}</li>;
        })}
      </ul>
      {!visible.length ? <p className="combo-empty" role="status">{hasOptions ? "No match. Your text will be used as typed." : emptyText}</p> : null}
    </div> : null}
  </div>;
}
