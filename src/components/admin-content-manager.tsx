"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { deleteFaqAction, saveContentPageAction, saveFaqAction } from "@/app/admin/actions";
import { keepFormValues } from "@/components/admin-submit";

type Faq = { id: string; question: string; answer: string; sort_order: number; published: boolean };
type Page = { slug: string; title: string; body: string; published: boolean; seo_title: string | null; seo_description: string | null };

export function AdminContentManager({ faqs, pages }: { faqs: Faq[]; pages: Page[] }) {
  const [showNew, setShowNew] = useState(false);
  return <div className="admin-content-manager">
    <section className="admin-section"><div className="admin-section-head"><h2>Veelgestelde vragen</h2><button type="button" className="button button-outline" aria-expanded={showNew} onClick={() => setShowNew((value) => !value)}><Plus size={15} aria-hidden="true" /> Vraag toevoegen</button></div>{showNew ? <FaqForm onDone={() => setShowNew(false)} /> : null}{faqs.length ? <div className="faq-admin-list">{faqs.map((faq) => <FaqRow key={faq.id} faq={faq} />)}</div> : <p className="table-empty">Nog geen vragen.</p>}</section>
    <section className="admin-section"><div className="admin-section-head"><h2>Beleidspagina’s</h2></div><div className="policy-admin-grid">{(["privacy", "terms"] as const).map((slug) => <PageEditor key={slug} slug={slug} page={pages.find((page) => page.slug === slug)} />)}</div></section>
  </div>;
}

function FaqForm({ faq, onDone }: { faq?: Faq; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveFaqAction, {});
  useEffect(() => { if (state.ok) onDone?.(); }, [state.ok, onDone]);
  return <form className="admin-faq-form" onSubmit={keepFormValues(action)}>
    {faq ? <input type="hidden" name="id" value={faq.id} /> : null}<div className="admin-form-grid"><label className="admin-field span-2">Vraag<input name="question" defaultValue={faq?.question ?? ""} required minLength={4} maxLength={300} /></label><label className="admin-field">Volgorde<input name="sort_order" type="number" inputMode="numeric" min="0" max="10000" defaultValue={faq?.sort_order ?? 0} /></label><label className="admin-field span-all">Antwoord<textarea name="answer" defaultValue={faq?.answer ?? ""} required minLength={5} maxLength={5000} rows={3} /></label></div><div className="admin-form-footer"><label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={faq?.published ?? true} />Tonen op de website</label><div className="admin-row-actions">{state.error ? <p className="admin-error" role="alert">{state.error}</p> : state.ok ? <p className="admin-feedback" role="status"><Check size={14} aria-hidden="true" /> Opgeslagen</p> : null}<button className="button button-primary" type="submit" disabled={pending}>{pending ? "Opslaan…" : faq ? "Vraag opslaan" : "Vraag toevoegen"}</button></div></div>
  </form>;
}

function FaqRow({ faq }: { faq: Faq }) {
  const [editing, setEditing] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState(deleteFaqAction, {});
  return <article className="faq-admin-row"><div><strong>{faq.question}</strong><p>{faq.answer}</p><span className={`admin-badge ${faq.published ? "" : "draft"}`}>{faq.published ? "Zichtbaar" : "Verborgen"}</span></div><div className="admin-row-actions"><button type="button" aria-expanded={editing} aria-label={`${editing ? "Sluit bewerken van" : "Bewerk"} vraag: ${faq.question}`} onClick={() => setEditing((value) => !value)}>{editing ? "Sluiten" : "Bewerken"}</button><form onSubmit={(event) => { event.preventDefault(); if (!window.confirm("Deze vraag verwijderen?")) return; const data = new FormData(event.currentTarget); startTransition(() => deleteAction(data)); }}><input type="hidden" name="id" value={faq.id} /><button className="danger-button" type="submit" disabled={deleting} aria-label={`Verwijder vraag: ${faq.question}`}>{deleting ? "Verwijderen…" : "Verwijderen"}</button></form></div>{deleteState.error ? <p className="admin-error faq-admin-error" role="alert">{deleteState.error}</p> : null}{editing ? <FaqForm faq={faq} onDone={() => setEditing(false)} /> : null}</article>;
}

function PageEditor({ slug, page }: { slug: "privacy" | "terms"; page?: Page }) {
  const [state, action, pending] = useActionState(saveContentPageAction, {});
  const name = slug === "privacy" ? "Privacybeleid" : "Algemene voorwaarden";
  return <form onSubmit={keepFormValues(action)} className="legal-page-editor">
    <input type="hidden" name="slug" value={slug} />
    <h3>{name}</h3>
    <label className="admin-field">Paginatitel<input name="title" defaultValue={page?.title ?? name} required minLength={2} maxLength={180} /></label>
    <label className="admin-field">Inhoud van de pagina<textarea name="body" rows={8} maxLength={15000} defaultValue={page?.body ?? ""} /></label>
    <p className="legal-page-hint">Scheid alinea’s met een lege regel. Begin een kop met ## gevolgd door een spatie. Zolang je niets publiceert, toont de website de standaardtekst.</p>
    <label className="admin-field">Zoekbeschrijving<input name="seo_description" defaultValue={page?.seo_description ?? ""} maxLength={350} /></label>
    <label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={page?.published ?? false} />Deze tekst publiceren op de website</label>
    {state.error ? <p className="admin-error" role="alert">{state.error}</p> : state.ok ? <p className="admin-feedback" role="status"><Check size={14} aria-hidden="true" /> Opgeslagen</p> : null}
    <button className="button button-outline" type="submit" disabled={pending}>{pending ? "Opslaan…" : "Pagina opslaan"}</button>
  </form>;
}
