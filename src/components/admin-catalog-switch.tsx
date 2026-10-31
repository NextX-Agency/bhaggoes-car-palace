"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { setCatalogHiddenAction } from "@/app/admin/actions";

/** Dashboard switch: takes every car off the public website (or puts them back) in one tap. */
export function AdminCatalogSwitch({ hidden }: { hidden: boolean }) {
  const [state, action, pending] = useActionState(setCatalogHiddenAction, {});
  return <section className={`catalog-switch${hidden ? " is-hidden" : ""}`} aria-labelledby="catalog-switch-title">
    <span className="catalog-switch-icon" aria-hidden="true">{hidden ? <EyeOff size={18} /> : <Eye size={18} />}</span>
    <div className="catalog-switch-text">
      <strong id="catalog-switch-title">{hidden ? "De catalogus is verborgen" : "De catalogus staat online"}</strong>
      <span>{hidden ? "Bezoekers zien geen auto’s, alleen de homepage met jullie contactgegevens, locaties, openingstijden en voordelen." : "Alle auto’s die op ‘zichtbaar’ staan, zijn te zien op de website."}</span>
    </div>
    <form action={action} onSubmit={(event) => { if (!hidden && !window.confirm("Alle auto’s van de website halen? Je voorraad blijft bewaard en je kunt ze met één klik weer tonen.")) event.preventDefault(); }}>
      <input type="hidden" name="hidden" value={String(!hidden)} />
      <Link className="text-link" href="/admin/settings#catalogus">Bericht aanpassen</Link>
      <button className={`button ${hidden ? "button-primary" : "button-outline"} button-sm`} type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : hidden ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
        {hidden ? "Catalogus weer tonen" : "Catalogus verbergen"}
      </button>
    </form>
    {state.error ? <p className="admin-feedback admin-error" role="alert">{state.error}</p> : null}
  </section>;
}
