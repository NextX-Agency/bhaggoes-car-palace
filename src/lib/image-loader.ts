import { STATIC_IMAGE_WIDTHS } from "./static-image-widths.mjs";
import { thumbWidthFor, vehicleThumbUrl } from "./vehicle-image-url";

// Every next/image goes through this loader instead of Vercel Image Optimization, whose free tier counts each
// photo, width and format as a paid transformation. Uploaded photos are resized by our own routes, which only
// render a few fixed widths; photos in /public/images use copies made at build time (scripts/static-image-variants.mjs).
const SITE_ASSET = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/site-assets\/(.+)$/;
const STATIC_PHOTO = /^\/images\/[^?#]+\.(webp|jpe?g)$/i;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const thumb = thumbWidthFor(width);
  if (src.startsWith("/api/vehicle-images/")) return thumb && !src.includes("?") ? `${src}?w=${thumb}` : src;
  if (src.startsWith("https://media.bhaggoescarpalace.com/vehicles/")) return thumb ? vehicleThumbUrl(src, thumb) : src;
  const asset = SITE_ASSET.exec(src);
  if (asset) return `/api/site-assets/${asset[1]}?w=${thumb ?? 1600}`;
  // The copies only exist after a build; `next dev` serves the originals.
  if (STATIC_PHOTO.test(src) && process.env.NODE_ENV !== "development") {
    const copy = STATIC_IMAGE_WIDTHS.find((allowed) => allowed >= width);
    if (copy) return `/_w/${copy}${src}`;
  }
  return src;
}
