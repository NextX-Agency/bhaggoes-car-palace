"use client";

import { deleteInquiryAction } from "@/app/admin/actions";
export function DeleteInquiryForm({ id }: { id: string }) { return <form action={deleteInquiryAction} onSubmit={(event) => { if (!window.confirm("Deze aanvraag verwijderen?")) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><button className="danger-button" type="submit">Verwijderen</button></form>; }
