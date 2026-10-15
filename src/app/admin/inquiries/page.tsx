import Link from "next/link";
import { AdminFrame } from "@/components/admin-frame";
import { updateInquiryAction } from "@/app/admin/actions";
import { DeleteInquiryForm } from "@/components/delete-inquiry-form";
import { getAdminInquiries } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminInquiriesPage() {
  const { user } = await requireAdmin(); const inquiries = await getAdminInquiries();
  return <AdminFrame active="/admin/inquiries" email={user.email ?? "Administrator"}><section className="admin-section">{inquiries.length ? <div className="admin-table-wrap"><table className="admin-table inquiry-table"><thead><tr><th>Customer</th><th>Contact</th><th>Vehicle / message</th><th>Received</th><th>Status</th><th>Actions</th></tr></thead><tbody>{inquiries.map((item: { id: string; name: string; email: string | null; phone: string | null; message: string; submitted_at: string; status: string; vehicle_id: string | null; vehicles?: { title: string; slug: string } | null }) => <tr key={item.id}><td><strong>{item.name}</strong></td><td><div className="stacked">{item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : null}{item.phone ? <a href={`tel:${item.phone}`}>{item.phone}</a> : null}</div></td><td><div className="inquiry-related">{item.vehicles ? <Link href={`/cars/${item.vehicles.slug}`} target="_blank">{item.vehicles.title}</Link> : <span>General question</span>}<details><summary>Read message</summary><p>{item.message}</p></details></div></td><td>{new Date(item.submitted_at).toLocaleString()}</td><td><form className="inline-form" action={updateInquiryAction}><input type="hidden" name="id" value={item.id} /><select className="status-select" name="status" aria-label={`Change inquiry status for ${item.name}`} defaultValue={item.status}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select><button type="submit" className="button button-outline button-sm">Save</button></form></td><td><DeleteInquiryForm id={item.id} /></td></tr>)}</tbody></table></div> : <p className="table-empty">No inquiries yet.</p>}</section></AdminFrame>;
}
