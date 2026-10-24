"use client";

import { deleteInquiryAction } from "@/app/admin/actions";
import { PendingSubmit } from "@/components/admin-pending-button";

export function DeleteInquiryForm({ id }: { id: string }) { return <form action={deleteInquiryAction} onSubmit={(event) => { if (!window.confirm("Deze aanvraag verwijderen?")) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><PendingSubmit className="danger-button" pendingLabel="Verwijderen…">Verwijderen</PendingSubmit></form>; }
