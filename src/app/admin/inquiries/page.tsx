import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminFrame } from "@/components/admin-frame";
import { updateInquiryAction } from "@/app/admin/actions";
import { PendingSubmit } from "@/components/admin-pending-button";
import { DeleteInquiryForm } from "@/components/delete-inquiry-form";
import { getAdminInquiries } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { websiteInquiriesEnabled } from "@/lib/features";

export const metadata = { title: "Aanvragen" };

const receivedFormatter = new Intl.DateTimeFormat("nl-SR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Paramaribo" });

export default async function AdminInquiriesPage() {
  if (!websiteInquiriesEnabled) redirect("/admin");
  const { user } = await requireAdmin(); const inquiries = await getAdminInquiries();
  return <AdminFrame active="/admin/inquiries" email={user.email ?? "Beheerder"}><section className="admin-section">{inquiries.length ? <div className="admin-table-wrap"><table className="admin-table inquiry-table"><thead><tr><th>Klant</th><th>Contact</th><th>Auto / bericht</th><th>Ontvangen</th><th>Status</th><th>Acties</th></tr></thead><tbody>{inquiries.map((item: { id: string; name: string; email: string | null; phone: string | null; message: string; submitted_at: string; status: string; vehicle_id: string | null; vehicles?: { title: string; slug: string } | null }) => <tr key={item.id}><td><strong>{item.name}</strong></td><td><div className="stacked">{item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : null}{item.phone ? <a href={`tel:${item.phone}`}>{item.phone}</a> : null}</div></td><td><div className="inquiry-related">{item.vehicles ? <Link href={`/cars/${item.vehicles.slug}`} target="_blank" rel="noopener noreferrer">{item.vehicles.title}</Link> : <span>Algemene vraag</span>}<details><summary>Bericht lezen</summary><p>{item.message}</p></details></div></td><td>{receivedFormatter.format(new Date(item.submitted_at))}</td><td><form className="inline-form" action={updateInquiryAction}><input type="hidden" name="id" value={item.id} /><select className="status-select" name="status" aria-label={`Status van aanvraag van ${item.name}`} defaultValue={item.status}><option value="new">Nieuw</option><option value="contacted">Gecontacteerd</option><option value="closed">Afgehandeld</option></select><PendingSubmit className="button button-outline button-sm" pendingLabel="Opslaan…">Opslaan</PendingSubmit></form></td><td><DeleteInquiryForm id={item.id} /></td></tr>)}</tbody></table></div> : <p className="table-empty">Nog geen aanvragen.</p>}</section></AdminFrame>;
}
