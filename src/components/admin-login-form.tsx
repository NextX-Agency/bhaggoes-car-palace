"use client";

import Image from "next/image";
import { useActionState } from "react";
import { signInAction } from "@/app/admin/actions";
import { keepFormValues } from "@/components/admin-submit";

export function AdminLoginForm({ setup = false, unauthorized = false }: { setup?: boolean; unauthorized?: boolean }) {
  const [state, action, pending] = useActionState(signInAction, {});
  return <div className="admin-login-wrap"><section className="admin-login"><Image src="/images/bhaggoes-logo-approved.png" alt="Bhaggoes Car Palace" width={220} height={76} loading="eager" /><h1>Inloggen voor medewerkers</h1>{setup ? <p className="callout">Supabase is nog niet gekoppeld. Voeg de project-URL en de publieke sleutel toe om inloggen mogelijk te maken.</p> : null}{unauthorized ? <p className="admin-error" role="alert">Dit account heeft geen beheerderstoegang.</p> : null}<form onSubmit={keepFormValues(action)}><label className="admin-field">E-mailadres<input name="email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required /></label><label className="admin-field">Wachtwoord<input name="password" type="password" autoComplete="current-password" required /></label>{state.error ? <p className="admin-error" role="alert">{state.error}</p> : null}<button className="button button-primary" type="submit" disabled={pending}>{pending ? "Bezig met inloggen…" : "Inloggen"}</button></form></section></div>;
}
