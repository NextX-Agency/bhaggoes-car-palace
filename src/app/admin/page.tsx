import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { getAdminInquiries, getAdminStats } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminDashboardPage() {
  const { user } = await requireAdmin();
  const [stats, inquiries] = await Promise.all([getAdminStats(), getAdminInquiries()]);
  return <AdminFrame active="/admin" email={user.email ?? "Administrator"}>
    <div className="admin-stats">
      {([["Vehicles", stats?.total ?? 0], ["Available", stats?.available ?? 0], ["New inquiries", stats?.newInquiries ?? 0]] as const).map(([label, value]) =>
        <article className="admin-stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}
    </div>
    <section className="admin-section">
      <div className="admin-section-head"><h2>Inventory</h2><Link className="text-link" href="/admin/inventory">Manage vehicles <ArrowUpRight size={15} /></Link></div>
      <Link className="button button-dark" href="/admin/inventory/new"><Plus size={16} /> Add Vehicle</Link>
    </section>
    <section className="admin-section">
      <div className="admin-section-head"><h2>Recent Inquiries</h2><Link className="text-link" href="/admin/inquiries">View all <ArrowUpRight size={15} /></Link></div>
      {inquiries.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>About</th><th>Received</th><th>Status</th></tr></thead><tbody>
        {inquiries.slice(0, 6).map((item) => <tr key={item.id}><td>{item.name}</td><td className="inquiry-message" title={item.message}>{item.vehicles?.title ?? item.message}</td><td>{new Date(item.submitted_at).toLocaleDateString()}</td><td>{item.status}</td></tr>)}
      </tbody></table></div> : <p className="table-empty">No inquiries yet.</p>}
    </section>
  </AdminFrame>;
}
