import { startTransition, type FormEvent } from "react";

// React clears uncontrolled fields after a form `action`, even when the server rejected the input, so staff would lose
// everything they typed. Submitting through a transition keeps the fields as they are and still reports pending state.
export function keepFormValues(dispatch: (payload: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isControl = (target: EventTarget): target is Control => target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

// The name staff see for a field: its aria-label, else the first piece of text in its <label>.
function controlName(control: Control) {
  const named = control.getAttribute("aria-label");
  if (named) return named;
  for (const node of Array.from(control.labels?.[0]?.childNodes ?? [])) if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return node.textContent.trim();
  return "";
}

// Browsers word their validation bubbles in the device language (English on most iPads), so the dashboard words them itself.
function dutchValidationMessage(control: Control) {
  const { validity } = control;
  const name = controlName(control);
  const quoted = name ? `“${name}”` : "dit veld";
  if (validity.valueMissing) return control instanceof HTMLSelectElement ? `Kies een waarde voor ${quoted}.` : control instanceof HTMLInputElement && control.type === "checkbox" ? "Vink dit vakje aan om door te gaan." : `Vul ${quoted} in.`;
  if (validity.typeMismatch) return control instanceof HTMLInputElement && control.type === "email" ? "Vul een geldig e-mailadres in." : control instanceof HTMLInputElement && control.type === "url" ? "Vul een geldige link in die met https:// begint." : `Vul een geldige waarde in voor ${quoted}.`;
  if (validity.rangeUnderflow && control instanceof HTMLInputElement) return `${name || "Deze waarde"} moet ${control.min} of hoger zijn.`;
  if (validity.rangeOverflow && control instanceof HTMLInputElement) return `${name || "Deze waarde"} mag niet hoger zijn dan ${control.max}.`;
  if (validity.badInput || validity.stepMismatch) return `Vul een geldig getal in voor ${quoted}.`;
  if (validity.tooShort && !(control instanceof HTMLSelectElement)) return `Gebruik minstens ${control.minLength} tekens voor ${quoted}.`;
  if (validity.tooLong && !(control instanceof HTMLSelectElement)) return `${name || "Deze tekst"} mag niet langer zijn dan ${control.maxLength} tekens.`;
  if (validity.patternMismatch) return `Controleer de notatie van ${quoted}.`;
  return control.validationMessage;
}

/** Spread onto a <form>: validation bubbles appear in Dutch, and a field is valid again as soon as it is edited. */
export const dutchValidation = {
  onInvalidCapture: (event: FormEvent<HTMLFormElement>) => {
    if (!isControl(event.target)) return;
    event.target.setCustomValidity("");
    event.target.setCustomValidity(dutchValidationMessage(event.target));
  },
  onInput: (event: FormEvent<HTMLFormElement>) => { if (isControl(event.target)) event.target.setCustomValidity(""); },
  onChange: (event: FormEvent<HTMLFormElement>) => { if (isControl(event.target)) event.target.setCustomValidity(""); },
};
