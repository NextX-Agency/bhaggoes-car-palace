"use client";

import Image from "next/image";
import { useActionState } from "react";
import { signInAction } from "@/app/admin/actions";

export function AdminLoginForm({ setup = false, unauthorized = false }: { setup?: boolean; unauthorized?: boolean }) {
  const [state, action, pending] = useActionState(signInAction, {});
  return <div className="admin-login-wrap"><section className="admin-login"><Image src="/images/bhaggoes-logo-source.png" alt="Bhaggoes Car Palace" width={220} height={88} loading="eager" /><h1>Staff Sign In</h1>{setup ? <p className="callout">Supabase is not connected yet. Add the project URL and publishable key to enable sign in.</p> : null}{unauthorized ? <p className="admin-error" role="alert">This account does not have administrator access.</p> : null}<form action={action}><label className="admin-field">Email<input name="email" type="email" autoComplete="username" required /></label><label className="admin-field">Password<input name="password" type="password" autoComplete="current-password" required /></label>{state.error ? <p className="admin-error" role="alert">{state.error}</p> : null}<button className="button button-dark" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form></section></div>;
}
