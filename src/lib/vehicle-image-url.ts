// Widths the image routes render on request (see app/api/vehicle-images and app/api/site-assets). Only these fixed
// widths exist, so nobody can make the server render arbitrary sizes.
export const VEHICLE_THUMB_WIDTHS = [160, 400, 800, 1200, 1600] as const;
export type VehicleThumbWidth = (typeof VEHICLE_THUMB_WIDTHS)[number];

/** Small version of a stored vehicle photo; local demo images and browser previews are returned unchanged. */
export function vehicleThumbUrl(url: string, width: VehicleThumbWidth) {
  if (/^https:\/\/media\.bhaggoescarpalace\.com\/vehicles\/.+\/1600\.webp$/.test(url)) return url.replace(/1600\.webp$/, `${width}.webp`);
  return url.startsWith("/api/vehicle-images/") ? `${url}?w=${width}` : url;
}

/** Public copies use the Cloudflare custom domain and bypass both application hosts. */
export function r2VehicleImageUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_R2_IMAGE_BASE_URL;
  if (!base || !/^https:\/\/media\.bhaggoescarpalace\.com\/?$/.test(base)) return null;
  return `${base.replace(/\/$/, "")}/vehicles/${path.split("/").map(encodeURIComponent).join("/")}/1600.webp`;
}

/** Smallest rendered width that still covers the requested one, or null when only the full photo is big enough. */
export function thumbWidthFor(width: number): VehicleThumbWidth | null {
  return VEHICLE_THUMB_WIDTHS.find((allowed) => allowed >= width) ?? null;
}
