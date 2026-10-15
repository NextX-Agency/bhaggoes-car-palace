import type { Availability } from "@/lib/domain";
import { availabilityLabels } from "@/lib/domain";

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return <span className={`status status-${availability}`}>{availabilityLabels[availability]}</span>;
}
