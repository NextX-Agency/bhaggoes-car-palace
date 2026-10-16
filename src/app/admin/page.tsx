import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { getAdminInquiries, getAdminStats } from "@/lib/data";
import { websiteInquiriesEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/admin-auth";

const inquiryLabels: Record<string, string> = { new: "New", contacted: "Contacted", closed: "Closed" };

export default async function AdminDashboardPage() {
  const { user } = await requireAdmin();
  const [stats, inquiries] = await Promise.all([getAdminStats(), websiteInquiriesEnabled ? getAdminInquiries() : Promise.resolve([])]);
  const tiles = [["All listings", stats?.total ?? 0, "/admin/inventory"], ["Cars for sale", stats?.available ?? 0, "/admin/inventory"], ["Demo listings", stats?.demos ?? 0, "/admin/inventory"], ...(websiteInquiriesEnabled ? [["New inquiries", stats?.newInquiries ?? 0, "/admin/inquiries"] as const] : [])] as const;
  return <AdminFrame active="/admin" email={user.email ?? "Administrator"} actions={<Link className="button button-primary" href="/admin/inventory/new"><Plus size={17} /> Add car</Link>}>
    <div className="admin-stats">
      {tiles.map(([label, value, href]) => <Link className="admin-stat" href={href} key={label}><span>{label}</span><strong>{value}</strong></Link>)}
    </div>
    {!websiteInquiriesEnabled ? <p className="admin-whatsapp-note">Customer questions go to the dealership&apos;s WhatsApp account. WhatsApp chats do not appear in this dashboard.</p> : null}
    {websiteInquiriesEnabled ? <section className="admin-section">
      <div className="admin-section-head"><h2>Recent inquiries</h2>{inquiries.length ? <Link className="text-link" href="/admin/inquiries">View all <ArrowRight size={15} /></Link> : null}</div>
      {inquiries.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>About</th><th>Received</th><th>Status</th></tr></thead><tbody>
        {inquiries.slice(0, 6).map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td className="inquiry-message" title={item.message}>{item.vehicles?.title ?? "General question"}</td><td>{new Date(item.submitted_at).toLocaleDateString()}</td><td><span className={`admin-badge inquiry-${item.status}`}>{inquiryLabels[item.status] ?? item.status}</span></td></tr>)}
      </tbody></table></div> : <p className="table-empty">No inquiries yet.</p>}
    </section> : null}
  </AdminFrame>;
}
