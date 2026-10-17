import Link from "next/link";
import { ArrowRight, CircleAlert, ClipboardList, Files, Globe2, Plus, Settings2, CarFront } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { getAdminInquiries, getAdminVehicles } from "@/lib/data";
import { websiteInquiriesEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/admin-auth";
import type { Vehicle } from "@/lib/domain";

const statusLabels: Record<string, string> = { available: "Beschikbaar", on_the_way: "Onderweg", reserved: "Gereserveerd", sold: "Verkocht", rental: "Verhuur" };

function needsAttention(vehicle: Vehicle) {
  const issues: string[] = [];
  if (!vehicle.published) issues.push("Nog niet gepubliceerd");
  if (!vehicle.images.length) issues.push("Foto’s ontbreken");
  if (vehicle.price == null) issues.push("Interne prijs ontbreekt");
  if (vehicle.cash_price == null) issues.push("Cashprijs ontbreekt");
  if (!vehicle.year || !vehicle.fuel_type || !vehicle.transmission || !vehicle.body_type || !vehicle.seats) issues.push("Specificaties aanvullen");
  return issues;
}

export default async function AdminDashboardPage() {
  const { user } = await requireAdmin();
  const [allVehicles, inquiries] = await Promise.all([getAdminVehicles(), websiteInquiriesEnabled ? getAdminInquiries() : Promise.resolve([])]);
  const vehicles = allVehicles.filter((vehicle) => !vehicle.archived_at);
  const active = vehicles.filter((vehicle) => vehicle.published && vehicle.availability !== "sold");
  const queue = vehicles.filter((vehicle) => vehicle.availability !== "sold").map((vehicle) => ({ vehicle, issues: needsAttention(vehicle) })).filter((item) => item.issues.length);
  const recent = vehicles.slice(0, 5);

  return <AdminFrame active="/admin" email={user.email ?? "Administrator"} actions={<Link className="button button-primary" href="/admin/inventory/new"><Plus size={17} /> Nieuwe auto</Link>}>
    <div className="dashboard-metrics" aria-label="Voorraadoverzicht">
      <Link href="/admin/inventory" className="dashboard-metric"><span><CarFront size={18} aria-hidden="true" /> Voorraad</span><strong>{vehicles.length}</strong></Link>
      <Link href="/admin/inventory" className="dashboard-metric"><span><Globe2 size={18} aria-hidden="true" /> Online</span><strong>{active.length}</strong></Link>
      <a href="#dashboard-attention" className="dashboard-metric dashboard-metric-attention"><span><CircleAlert size={18} aria-hidden="true" /> Aandacht nodig</span><strong>{queue.length}</strong></a>
    </div>
    <div className="dashboard-grid">
      <section className="admin-section dashboard-panel" id="dashboard-attention">
        <div className="admin-section-head"><h2>Nu afmaken</h2></div>
        {queue.length ? <ul className="dashboard-vehicle-list">{queue.slice(0, 6).map(({ vehicle, issues }) => <li key={vehicle.id}><Link href={`/admin/inventory/${vehicle.id}`}><span className="dashboard-vehicle-main"><strong>{vehicle.title}</strong></span><span className="dashboard-issues">{issues.map((issue) => <span key={issue}>{issue}</span>)}</span><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul> : <p className="dashboard-empty">Geen openstaande punten.</p>}
        {queue.length > 6 ? <Link className="text-link dashboard-more" href="/admin/inventory">Bekijk alle auto’s <ArrowRight size={15} /></Link> : null}
      </section>
      <section className="admin-section dashboard-panel dashboard-shortcuts"><div className="admin-section-head"><h2>Snelle acties</h2></div>
        <Link href="/admin/inventory"><ClipboardList size={19} /><strong>Voorraad beheren</strong><ArrowRight size={17} /></Link>
        <Link href="/admin/settings"><Settings2 size={19} /><strong>Verkoopinformatie</strong><ArrowRight size={17} /></Link>
        <Link href="/admin/content"><Files size={19} /><strong>Pagina’s & FAQ</strong><ArrowRight size={17} /></Link>
      </section>
    </div>
    <section className="admin-section dashboard-panel"><div className="admin-section-head"><h2>Recent gewijzigd</h2><Link className="text-link" href="/admin/inventory">Alle auto’s <ArrowRight size={15} /></Link></div>
      {recent.length ? <ul className="dashboard-vehicle-list dashboard-recent-list">{recent.map((vehicle) => <li key={vehicle.id}><Link href={`/admin/inventory/${vehicle.id}`}><span className="dashboard-vehicle-main"><strong>{vehicle.title}</strong></span><span className="dashboard-publication">{vehicle.published ? statusLabels[vehicle.availability] ?? vehicle.availability : "Concept"}</span><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul> : <p className="dashboard-empty">Nog geen auto’s toegevoegd. <Link href="/admin/inventory/new">Plaats de eerste auto</Link>.</p>}
    </section>
    {websiteInquiriesEnabled && inquiries.length ? <section className="admin-section dashboard-panel"><div className="admin-section-head"><h2>Nieuwe aanvragen ({inquiries.filter((item) => item.status === "new").length})</h2><Link className="text-link" href="/admin/inquiries">Bekijk aanvragen <ArrowRight size={15} /></Link></div></section> : null}
  </AdminFrame>;
}
