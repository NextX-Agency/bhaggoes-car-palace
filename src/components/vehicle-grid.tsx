import type { Vehicle } from "@/lib/domain";
import { VehicleCard } from "@/components/vehicle-card";

export function VehicleGrid({ vehicles, priorityCount = 0 }: { vehicles: Vehicle[]; priorityCount?: number }) {
  return <div className="vehicle-grid">{vehicles.map((vehicle, index) => <VehicleCard key={vehicle.id} vehicle={vehicle} priority={index < priorityCount} />)}</div>;
}
