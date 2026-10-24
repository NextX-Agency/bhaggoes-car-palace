import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, CheckCircle2, CircleAlert, ClipboardList, Files, Globe2, Plus, Settings2, CarFront, EyeOff, ExternalLink } from "lucide-react";
import { AdminFrame } from "@/components/admin-frame";
import { getAdminDashboardNewInquiryCount, getAdminDashboardVehicles } from "@/lib/data";
import { formatAmount } from "@/lib/domain";
import { websiteInquiriesEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/admin-auth";

type DashboardVehicle = Awaited<ReturnType<typeof getAdminDashboardVehicles>>[number];
const statusLabels: Record<string, string> = { available: "Beschikbaar", on_the_way: "Onderweg", reserved: "Gereserveerd", sold: "Verkocht", rental: "Verhuur" };
const updatedFormatter = new Intl.DateTimeFormat("nl-SR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Paramaribo" });

function needsAttention(vehicle: DashboardVehicle) {
  const issues: string[] = [];
  if (!vehicle.published) issues.push("Niet online");
  if (!vehicle.vehicle_images.length) issues.push("Foto’s ontbreken");
  if (vehicle.price == null) issues.push("Interne prijs ontbreekt");
  if (vehicle.cash_price == null) issues.push("Cashprijs ontbreekt");
  if (!vehicle.year || !vehicle.fuel_type || !vehicle.transmission || !vehicle.body_type || !vehicle.seats) issues.push("Specificaties aanvullen");
  return issues;
}

function coverUrl(vehicle: DashboardVehicle) {
  const image = [...vehicle.vehicle_images].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)[0];
  if (!image?.storage_path) return null;
  return image.storage_path.startsWith("/images/") ? image.storage_path : `/api/vehicle-images/${image.storage_path.split("/").map(encodeURIComponent).join("/")}`;
}

export default async function AdminDashboardPage() {
  const { user } = await requireAdmin();
  const [vehicles, newInquiryCount] = await Promise.all([getAdminDashboardVehicles(), websiteInquiriesEnabled ? getAdminDashboardNewInquiryCount() : Promise.resolve(0)]);
  const inventory = vehicles.filter((vehicle) => vehicle.availability !== "sold");
  const online = inventory.filter((vehicle) => vehicle.published);
  const drafts = inventory.filter((vehicle) => !vehicle.published);
  const queue = inventory.map((vehicle) => ({ vehicle, issues: needsAttention(vehicle) })).filter((item) => item.issues.length);
  const recent = vehicles.slice(0, 5);

  return <AdminFrame active="/admin" email={user.email ?? "Beheerder"} actions={<Link className="button button-primary" href="/admin/inventory/new"><Plus size={17} /> Nieuwe auto</Link>}>
    <div className="dashboard-intro"><div><p className="dashboard-eyebrow">BEHEER IN ÉÉN OOGOPSLAG</p><p>Houd je voorraad actueel en zie direct wat nog aandacht nodig heeft.</p></div><Link href="/" target="_blank" rel="noopener noreferrer">Bekijk website <ExternalLink size={15} aria-hidden="true" /></Link></div>
    <div className="dashboard-metrics" role="group" aria-label="Voorraadoverzicht">
      <Link href="/admin/inventory" className="dashboard-metric"><span><CarFront size={18} aria-hidden="true" /> Voorraad</span><strong>{inventory.length}</strong><small>Auto’s in beheer <ArrowRight size={15} aria-hidden="true" /></small></Link>
      <Link href="/admin/inventory" className="dashboard-metric"><span><Globe2 size={18} aria-hidden="true" /> Online</span><strong>{online.length}</strong><small>Zichtbaar op de website <ArrowRight size={15} aria-hidden="true" /></small></Link>
      <Link href="/admin/inventory" className="dashboard-metric"><span><EyeOff size={18} aria-hidden="true" /> Niet online</span><strong>{drafts.length}</strong><small>Verborgen of in concept <ArrowRight size={15} aria-hidden="true" /></small></Link>
      <a href="#dashboard-attention" className={`dashboard-metric ${queue.length ? "dashboard-metric-attention" : "dashboard-metric-ready"}`}><span>{queue.length ? <CircleAlert size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />} Aandacht nodig</span><strong>{queue.length}</strong><small>{queue.length ? "Bekijk openstaande punten" : "Alles is bijgewerkt"} <ArrowRight size={15} aria-hidden="true" /></small></a>
    </div>
    <div className="dashboard-workspace">
      <section className="admin-section dashboard-panel dashboard-recent"><div className="admin-section-head"><div><p className="dashboard-section-kicker">VOORRAAD</p><h2>Recent gewijzigd</h2></div><Link className="text-link" href="/admin/inventory">Alle auto’s <ArrowRight size={15} /></Link></div>
        {recent.length ? <ul className="dashboard-vehicle-list dashboard-recent-list">{recent.map((vehicle) => { const image = coverUrl(vehicle); return <li key={vehicle.id}><Link href={`/admin/inventory/${vehicle.id}`}><span className="dashboard-thumb">{image ? <Image src={image} alt="" fill sizes="68px" unoptimized /> : <Camera size={22} aria-hidden="true" />}</span><span className="dashboard-vehicle-main"><strong>{vehicle.title}</strong><span>Bijgewerkt {updatedFormatter.format(new Date(vehicle.updated_at))}</span></span><span className="dashboard-vehicle-detail"><strong>{vehicle.cash_price == null && vehicle.price == null ? "Prijs ontbreekt" : formatAmount(vehicle.cash_price ?? vehicle.price, vehicle.currency)}</strong><span className={`dashboard-publication ${vehicle.published ? "is-online" : "is-draft"}`}>{vehicle.published ? statusLabels[vehicle.availability] ?? vehicle.availability : "Niet online"}</span></span><ArrowRight size={17} aria-hidden="true" /></Link></li>; })}</ul> : <div className="dashboard-empty-state"><CarFront size={24} aria-hidden="true" /><strong>Je voorraad begint hier</strong><p>Voeg de eerste auto toe om je overzicht te vullen.</p><Link className="text-link" href="/admin/inventory/new">Nieuwe auto toevoegen <ArrowRight size={15} /></Link></div>}
      </section>
      <div className="dashboard-side">
        <section className="admin-section dashboard-panel" id="dashboard-attention"><div className="admin-section-head"><div><p className="dashboard-section-kicker">ACTIEPUNTEN</p><h2>Nu afmaken</h2></div>{queue.length ? <span className="dashboard-count">{queue.length}</span> : null}</div>
          {queue.length ? <ul className="dashboard-attention-list">{queue.slice(0, 4).map(({ vehicle, issues }) => <li key={vehicle.id}><Link href={`/admin/inventory/${vehicle.id}`}><span><strong>{vehicle.title}</strong><small>{issues.slice(0, 2).join(" · ")}{issues.length > 2 ? ` · +${issues.length - 2}` : ""}</small></span><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul> : <div className="dashboard-clear"><CheckCircle2 size={22} aria-hidden="true" /><div><strong>Alles bijgewerkt</strong><p>Er zijn geen openstaande punten voor je huidige voorraad.</p></div></div>}
          {queue.length > 4 ? <Link className="text-link dashboard-more" href="/admin/inventory">Bekijk de volledige voorraad <ArrowRight size={15} /></Link> : null}
        </section>
        <section className="admin-section dashboard-panel dashboard-shortcuts"><div className="admin-section-head"><div><p className="dashboard-section-kicker">DIRECT NAAR</p><h2>Snelle acties</h2></div></div>
          <Link href="/admin/inventory"><ClipboardList size={19} /><span><strong>Voorraad beheren</strong><small>Auto’s aanpassen en publiceren</small></span><ArrowRight size={17} /></Link>
          <Link href="/admin/settings"><Settings2 size={19} /><span><strong>Website-instellingen</strong><small>Contact en verkoopinformatie</small></span><ArrowRight size={17} /></Link>
          <Link href="/admin/content"><Files size={19} /><span><strong>Pagina’s & FAQ</strong><small>Inhoud van je website bijwerken</small></span><ArrowRight size={17} /></Link>
        </section>
        {websiteInquiriesEnabled && newInquiryCount > 0 ? <Link className="dashboard-inquiry" href="/admin/inquiries"><CircleAlert size={20} /><span><strong>{newInquiryCount} nieuwe {newInquiryCount === 1 ? "aanvraag" : "aanvragen"}</strong><small>Bekijk en beantwoord de aanvragen</small></span><ArrowRight size={17} /></Link> : null}
      </div>
    </div>
  </AdminFrame>;
}
