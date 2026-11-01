"use client";

import { useActionState, useState } from "react";
import { Check, CircleAlert, Copy, KeyRound, LoaderCircle, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { createUserAction, deleteUserAction, resetUserPasswordAction, updateUserAction } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/data";
import { generateTemporaryPassword } from "@/lib/temp-password";

const monthNames = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
// Fixed Suriname time (UTC-3) and our own month names, so server and browser print the same text.
const dateLabel = (iso: string | null) => { if (!iso) return "Nog nooit"; const time = Date.parse(iso); if (Number.isNaN(time)) return ""; const date = new Date(time - 3 * 3600 * 1000); return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`; };

/** The text to send a colleague, e.g. over WhatsApp, after creating their account or resetting their password. */
function loginMessage(siteUrl: string, email: string, password: string) {
  return `Je account voor het beheer van Bhaggoes Car Palace:\n${siteUrl}/admin/login\nE-mail: ${email}\nTijdelijk wachtwoord: ${password}\nNa het inloggen kies je zelf een nieuw wachtwoord.`;
}

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="user-copy-box">
    <pre>{text}</pre>
    <button type="button" className="button button-primary button-sm" onClick={() => { void navigator.clipboard?.writeText(text).then(() => setCopied(true)); }}>{copied ? <><Check size={15} aria-hidden="true" /> Gekopieerd</> : <><Copy size={15} aria-hidden="true" /> Kopieer bericht</>}</button>
    <p className="help-text">Stuur dit bericht naar je collega (bijvoorbeeld via WhatsApp). Het wachtwoord wordt hierna niet meer getoond.</p>
  </div>;
}

function PasswordField({ name = "password", label, initial }: { name?: string; label: string; initial: string }) {
  const [value, setValue] = useState(initial);
  return <label className="admin-field">{label}
    <span className="user-password-row"><input name={name} value={value} onChange={(event) => setValue(event.target.value)} minLength={12} maxLength={72} required autoComplete="off" spellCheck={false} /><button type="button" className="row-action" onClick={() => setValue(generateTemporaryPassword())} aria-label="Nieuw wachtwoord maken" title="Nieuw wachtwoord maken"><RefreshCw size={15} aria-hidden="true" /></button></span>
    <span className="help-text">Automatisch gemaakt. Je collega kiest na het inloggen zelf een nieuw wachtwoord.</span>
  </label>;
}

function Feedback({ state }: { state: { error?: string; ok?: boolean } }) {
  return state.error ? <p className="admin-feedback admin-error" role="alert"><CircleAlert size={14} aria-hidden="true" /> {state.error}</p> : null;
}

function CreateUser({ siteUrl, initialPassword }: { siteUrl: string; initialPassword: string }) {
  const [state, action, pending] = useActionState(createUserAction, {});
  const [formKey, setFormKey] = useState(0);
  return <section className="admin-form-section user-create" aria-labelledby="user-create-heading">
    <h2 id="user-create-heading"><UserPlus size={18} aria-hidden="true" /> Gebruiker toevoegen</h2>
    {state.created ? <>
      <p className="admin-feedback"><Check size={14} aria-hidden="true" /> Account aangemaakt voor {state.created.email}.</p>
      <CopyBox text={loginMessage(siteUrl, state.created.email, state.created.password)} />
      {!formKey ? <button type="button" className="button button-ghost button-sm" onClick={() => setFormKey((key) => key + 1)}>Nog iemand toevoegen</button> : null}
    </> : null}
    {!state.created || formKey ? <form key={formKey} action={action} className="admin-form-grid user-create-grid">
      <label className="admin-field">Naam<input name="name" maxLength={80} placeholder="Bijv. Ravi" autoComplete="off" /></label>
      <label className="admin-field">E-mailadres<input name="email" type="email" required maxLength={254} autoCapitalize="none" autoComplete="off" spellCheck={false} /></label>
      <PasswordField label="Tijdelijk wachtwoord" initial={formKey ? generateTemporaryPassword() : initialPassword} />
      <input type="hidden" name="role" value="admin" />
      <div className="user-create-actions"><button className="button button-primary" type="submit" disabled={pending}>{pending ? <><LoaderCircle size={16} className="spin" aria-hidden="true" /> Aanmaken…</> : "Account aanmaken"}</button><Feedback state={state} /></div>
    </form> : null}
  </section>;
}

function UserRow({ user, self, siteUrl }: { user: AdminUser; self: boolean; siteUrl: string }) {
  const [updateState, updateAction, updating] = useActionState(updateUserAction, {});
  const [resetState, resetAction, resetting] = useActionState(resetUserPasswordAction, {});
  const [deleteState, deleteAction, deleting] = useActionState(deleteUserAction, {});
  const [resetPassword, setResetPassword] = useState("");
  const access = user.role === "admin";
  return <li className={`user-row${access ? "" : " is-blocked"}`}>
    <div className="user-main">
      <span className="user-avatar" aria-hidden="true">{(user.display_name || user.email).slice(0, 1).toUpperCase()}</span>
      <div className="user-text">
        <strong>{user.display_name || user.email.split("@")[0]}{self ? <span className="user-tag">Jij</span> : null}{!access ? <span className="user-tag is-blocked">Geen toegang</span> : null}{user.must_change_password ? <span className="user-tag is-pending">Tijdelijk wachtwoord</span> : null}</strong>
        <span>{user.email}</span>
        <small>Laatst ingelogd: {dateLabel(user.last_sign_in_at)}</small>
      </div>
    </div>
    {self ? <p className="user-self-note">Je eigen naam en wachtwoord wijzig je via <a href="/admin/account">Mijn account</a>.</p> : <div className="user-actions">
      <form action={updateAction} className="user-inline-form">
        <input type="hidden" name="id" value={user.id} />
        <label className="admin-field">Naam<input name="name" defaultValue={user.display_name ?? ""} maxLength={80} /></label>
        <label className="admin-field">Toegang<select name="role" defaultValue={user.role}><option value="admin">Beheerder (alles)</option><option value="staff">Geen toegang (geblokkeerd)</option></select></label>
        <button className="button button-outline button-sm" type="submit" disabled={updating}>{updating ? "Opslaan…" : updateState.ok ? <><Check size={15} aria-hidden="true" /> Opgeslagen</> : "Opslaan"}</button>
      </form>
      <div className="user-buttons">
        <button type="button" className="button button-ghost button-sm" onClick={() => setResetPassword((current) => current ? "" : generateTemporaryPassword())} aria-expanded={Boolean(resetPassword)}><KeyRound size={15} aria-hidden="true" /> Nieuw wachtwoord</button>
        <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Het account van ${user.email} definitief verwijderen? Deze persoon kan daarna niet meer inloggen.`)) event.preventDefault(); }}>
          <input type="hidden" name="id" value={user.id} />
          <button type="submit" className="danger-button" disabled={deleting}><Trash2 size={15} aria-hidden="true" /> {deleting ? "Verwijderen…" : "Verwijderen"}</button>
        </form>
      </div>
      {resetPassword ? resetState.password ? <CopyBox text={loginMessage(siteUrl, user.email, resetState.password)} /> : <form action={resetAction} className="user-reset-form">
        <input type="hidden" name="id" value={user.id} />
        <PasswordField label="Nieuw tijdelijk wachtwoord" initial={resetPassword} />
        <button className="button button-primary button-sm" type="submit" disabled={resetting}>{resetting ? "Instellen…" : "Wachtwoord instellen"}</button>
        <p className="help-text">De persoon wordt overal uitgelogd en moet na het inloggen zelf een nieuw wachtwoord kiezen.</p>
      </form> : null}
      <Feedback state={updateState} /><Feedback state={resetState} /><Feedback state={deleteState} />
    </div>}
  </li>;
}

export function AdminUsers({ users, currentUserId, siteUrl, initialPassword }: { users: AdminUser[]; currentUserId: string; siteUrl: string; initialPassword: string }) {
  const admins = users.filter((user) => user.role === "admin").length;
  return <div className="admin-users">
    <CreateUser siteUrl={siteUrl} initialPassword={initialPassword} />
    <section className="admin-form-section" aria-labelledby="user-list-heading">
      <div className="admin-section-head"><div><h2 id="user-list-heading">Accounts</h2><p className="muted">{users.length} {users.length === 1 ? "account" : "accounts"}, waarvan {admins} met toegang. Iedere beheerder kan auto’s, instellingen en gebruikers beheren.</p></div></div>
      <ul className="user-list">{users.map((user) => <UserRow key={user.id} user={user} self={user.id === currentUserId} siteUrl={siteUrl} />)}</ul>
    </section>
  </div>;
}
