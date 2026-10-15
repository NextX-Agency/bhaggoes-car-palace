import Link from "next/link";
import { Search } from "lucide-react";
import type { Vehicle } from "@/lib/domain";
import { VehicleCard } from "@/components/vehicle-card";

export function VehicleGrid({ vehicles, emptyTitle = "No cars match those filters", emptyText = "Try a broader search or reset the filters.", emptyHref = "/cars", emptyAction = "Clear filters" }: { vehicles: Vehicle[]; emptyTitle?: string; emptyText?: string; emptyHref?: string; emptyAction?: string }) {
  if (!vehicles.length) return <div className="empty-state"><span className="empty-icon" aria-hidden="true"><Search size={20} /></span><h3>{emptyTitle}</h3><p>{emptyText}</p><Link className="button button-outline" href={emptyHref}>{emptyAction}</Link></div>;
  return <div className="vehicle-grid">{vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div>;
}
