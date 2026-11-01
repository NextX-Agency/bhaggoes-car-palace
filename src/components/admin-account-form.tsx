"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Check, CircleAlert, ShieldAlert } from "lucide-react";
import { updateOwnAccountAction } from "@/app/admin/actions";
import { keepFormValues } from "@/components/admin-submit";

export function AdminAccountForm({ email, name, mustChange }: { email: string; name: string; mustChange: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateOwnAccountAction, {});
  // After a temporary password is replaced, the rest of the dashboard opens up.
  useEffect(() => { if (state.ok && mustChange) router.replace("/admin"); }, [state.ok, mustChange, router]);
  return <form className="admin-form account-form" onSubmit={keepFormValues(action)}>
    {mustChange ? <p className="catalog-switch is-hidden"><span className="catalog-switch-icon" aria-hidden="true"><ShieldAlert size={18} /></span><span className="catalog-switch-text"><strong>Kies eerst een eigen wachtwoord</strong><span>Je bent ingelogd met een tijdelijk wachtwoord. Kies een nieuw wachtwoord om verder te gaan.</span></span></p> : null}
    <section className="admin-form-section"><h2>Gegevens</h2><div className="admin-form-grid">
      <label className="admin-field">E-mailadres<input value={email} readOnly disabled /></label>
      <label className="admin-field span-2">Naam<input name="name" defaultValue={name} maxLength={80} placeholder="Hoe je collega’s je zien" /></label>
    </div></section>
    <section className="admin-form-section"><h2>{mustChange ? "Nieuw wachtwoord" : "Wachtwoord wijzigen"}</h2><div className="admin-form-grid">
      <label className="admin-field">Nieuw wachtwoord<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required={mustChange} /><span className="help-text">Minstens 12 tekens. {mustChange ? "" : "Leeg laten houdt je huidige wachtwoord."}</span></label>
      <label className="admin-field">Herhaal nieuw wachtwoord<input name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={72} required={mustChange} /></label>
    </div></section>
    <div className="admin-form-footer"><div>{state.error ? <p className="admin-feedback admin-error" role="alert"><CircleAlert size={14} aria-hidden="true" /> {state.error}</p> : state.ok ? <p className="admin-feedback" role="status"><Check size={14} aria-hidden="true" /> Opgeslagen.</p> : null}</div><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Opslaan…" : "Opslaan"}</button></div>
  </form>;
}
