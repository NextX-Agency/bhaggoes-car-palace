"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function StaffSetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function checkInvitation() {
      try {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        if (accessToken && refreshToken) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          const { error: sessionError } = await createClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionError) throw sessionError;
        }
        const result = await createClient().auth.getUser();
        if (active) setAuthorized(Boolean(result.data.user));
      } catch {
        if (active) setAuthorized(false);
      }
      if (active) setReady(true);
    }
    void checkInvitation();
    return () => { active = false; };
  }, []);

  async function setPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 12) return setError("Use at least 12 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setPending(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError("Your password could not be saved. Try again or request a new invitation.");
      setPending(false);
      return;
    }
    router.replace("/admin");
  }

  return <div className="admin-login-wrap"><section className="admin-login">
    <Image src="/images/bhaggoes-logo-approved.png" alt="Bhaggoes Car Palace" width={220} height={76} loading="eager" />
    <h1>Set your password</h1>
    {!ready ? <p>Checking your invitation…</p> : authorized ? <form onSubmit={setPassword}>
      <label className="admin-field">Password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
      <label className="admin-field">Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={12} required /></label>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
    </form> : <p className="admin-error" role="alert">This invitation link is invalid or has expired. <Link href="/admin/login">Go to staff sign in</Link>.</p>}
  </section></div>;
}
