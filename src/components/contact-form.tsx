"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ContactForm({ vehicleId, vehicleName }: { vehicleId?: string; vehicleName?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending"); setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/inquiries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, vehicleId }) });
      if (!response.ok) throw new Error("Please check the details and try again.");
      form.reset(); setState("sent"); setMessage("Your message has been sent. The team will be in touch.");
    } catch { setState("error"); setMessage("We couldn't send that just now. Please try again or use the phone and WhatsApp links."); }
  }
  return <form className="contact-form" onSubmit={submit}>
    {vehicleName ? <p className="form-context">Your message about <strong>{vehicleName}</strong></p> : null}
    <div className="form-grid"><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label><label>Email <span className="optional-label">optional</span><input name="email" type="email" autoComplete="email" maxLength={254} /></label><label>Phone <span className="optional-label">email or phone required</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label><label className="form-full">How can we help?<textarea name="message" rows={4} minLength={8} maxLength={5000} required placeholder="Tell us what you're looking for…" /></label><label className="honeypot" aria-hidden="true">Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <div className="form-submit-row"><button className="button button-dark" disabled={state === "sending"} type="submit">{state === "sending" ? "Sending…" : "Send inquiry"}<Send size={16} /></button><p className={`form-status ${state}`} role="status">{message}</p></div>
  </form>;
}
