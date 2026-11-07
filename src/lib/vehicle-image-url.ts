// Widths the image routes render on request (see app/api/vehicle-images and app/api/site-assets). Only these fixed
// widths exist, so nobody can make the server render arbitrary sizes.
export const VEHICLE_THUMB_WIDTHS = [160, 400, 800, 1200, 1600] as const;
export type VehicleThumbWidth = (typeof VEHICLE_THUMB_WIDTHS)[number];

/** Small version of a stored vehicle photo; local demo images and browser previews are returned unchanged. */
export function vehicleThumbUrl(url: string, width: VehicleThumbWidth) {
  return url.startsWith("/api/vehicle-images/") ? `${url}?w=${width}` : url;
}

/** Smallest rendered width that still covers the requested one, or null when only the full photo is big enough. */
export function thumbWidthFor(width: number): VehicleThumbWidth | null {
  return VEHICLE_THUMB_WIDTHS.find((allowed) => allowed >= width) ?? null;
}
