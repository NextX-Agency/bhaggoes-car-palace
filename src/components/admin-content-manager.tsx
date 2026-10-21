"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { deleteFaqAction, saveContentPageAction, saveFaqAction } from "@/app/admin/actions";

type Faq = { id: string; question: string; answer: string; sort_order: number; published: boolean };
type Page = { slug: string; title: string; body: string; published: boolean; seo_title: string | null; seo_description: string | null };

export function AdminContentManager({ faqs, pages }: { faqs: Faq[]; pages: Page[] }) {
  const [showNew, setShowNew] = useState(false);
  return <div className="admin-content-manager">
    <section className="admin-section"><div className="admin-section-head"><h2>FAQs</h2><button className="button button-outline" onClick={() => setShowNew((value) => !value)}><Plus size={15} /> Add question</button></div>{showNew ? <FaqForm onDone={() => setShowNew(false)} /> : null}{faqs.length ? <div className="faq-admin-list">{faqs.map((faq) => <FaqRow key={faq.id} faq={faq} />)}</div> : <p className="table-empty">No questions yet.</p>}</section>
    <section className="admin-section"><div className="admin-section-head"><h2>Policy pages</h2></div><div className="policy-admin-grid">{(["privacy", "terms"] as const).map((slug) => <PageEditor key={slug} slug={slug} page={pages.find((page) => page.slug === slug)} />)}</div></section>
  </div>;
}

function FaqForm({ faq, onDone }: { faq?: Faq; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveFaqAction, {});
  useEffect(() => { if (state.ok) onDone?.(); }, [state.ok, onDone]);
  function submit(event: FormEvent<HTMLFormElement>) { if (!event.currentTarget.reportValidity()) event.preventDefault(); }
  return <form className="admin-faq-form" action={action} onSubmit={submit}>
    {faq ? <input type="hidden" name="id" value={faq.id} /> : null}<div className="admin-form-grid"><label className="admin-field span-2">Question<input name="question" defaultValue={faq?.question ?? ""} required minLength={4} /></label><label className="admin-field">Display order<input name="sort_order" type="number" min="0" defaultValue={faq?.sort_order ?? 0} /></label><label className="admin-field span-all">Answer<textarea name="answer" defaultValue={faq?.answer ?? ""} required rows={3} /></label></div><div className="admin-form-footer"><label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={faq?.published ?? true} />Publish on website</label><div className="admin-row-actions">{state.error ? <p className="admin-error">{state.error}</p> : state.ok ? <p className="admin-feedback"><Check size={14} /> Saved</p> : null}<button className="button button-primary" disabled={pending}>{pending ? "Saving…" : faq ? "Save question" : "Add question"}</button></div></div>
  </form>;
}

function FaqRow({ faq }: { faq: Faq }) {
  const [editing, setEditing] = useState(false);
  return <article className="faq-admin-row"><div><strong>{faq.question}</strong><p>{faq.answer}</p><span className={`admin-badge ${faq.published ? "" : "draft"}`}>{faq.published ? "Published" : "Draft"}</span></div><div className="admin-row-actions"><button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Close" : "Edit"}</button><form action={deleteFaqAction} onSubmit={(event) => { if (!window.confirm("Delete this FAQ item?")) event.preventDefault(); }}><input type="hidden" name="id" value={faq.id} /><button className="danger-button" type="submit">Delete</button></form></div>{editing ? <FaqForm faq={faq} onDone={() => setEditing(false)} /> : null}</article>;
}

function PageEditor({ slug, page }: { slug: "privacy" | "terms"; page?: Page }) {
  const [state, action, pending] = useActionState(saveContentPageAction, {});
  return <form action={action} className="legal-page-editor">
    <input type="hidden" name="slug" value={slug} />
    <h3>{slug === "privacy" ? "Privacy policy" : "Terms and conditions"}</h3>
    <label className="admin-field">Page title<input name="title" defaultValue={page?.title ?? (slug === "privacy" ? "Privacy policy" : "Terms and conditions")} /></label>
    <label className="admin-field">Page content<textarea name="body" rows={8} defaultValue={page?.body ?? ""} /></label>
    <p className="legal-page-hint">Separate paragraphs with a blank line. Start a heading with ## followed by a space.</p>
    <label className="admin-field">Search description<input name="seo_description" defaultValue={page?.seo_description ?? ""} maxLength={350} /></label>
    <label className="admin-checkbox"><input type="checkbox" name="published" defaultChecked={page?.published ?? false} />Publish this page content</label>
    {state.error ? <p className="admin-error">{state.error}</p> : state.ok ? <p className="admin-feedback"><Check size={14} /> Saved</p> : null}
    <button className="button button-outline" disabled={pending}>{pending ? "Saving…" : "Save page"}</button>
  </form>;
}
