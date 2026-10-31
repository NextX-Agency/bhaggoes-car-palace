// Widths the image route renders on request (see app/api/vehicle-images). Dashboard thumbnails use these
// instead of downloading full-size photos.
export const VEHICLE_THUMB_WIDTHS = [160, 400, 800] as const;
export type VehicleThumbWidth = (typeof VEHICLE_THUMB_WIDTHS)[number];

/** Small version of a stored vehicle photo; local demo images and browser previews are returned unchanged. */
export function vehicleThumbUrl(url: string, width: VehicleThumbWidth) {
  return url.startsWith("/api/vehicle-images/") ? `${url}?w=${width}` : url;
}
