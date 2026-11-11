"use client";

import { refreshPublicInventoryAction } from "@/app/admin/actions";
import { maxPhotosPerVehicle } from "@/lib/vehicle-photo-upload";

/** Mirrors a newly published car in small serverless batches; failed copies keep the old image route. */
export async function syncPublishedVehicleImages(vehicleId: string) {
  for (let batch = 0; batch <= Math.ceil(maxPhotosPerVehicle / 4); batch++) {
    try {
      const result = await refreshPublicInventoryAction(vehicleId);
      if (!result.ok || !result.remaining) return;
    } catch { return; }
  }
}
