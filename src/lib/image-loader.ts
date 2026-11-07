
import { thumbWidthFor } from "./vehicle-image-url";

// Every next/image goes through this loader instead of Vercel Image Optimization, whose free tier counts each
// photo, width and format as a paid transformation. Uploaded photos are resized by our own routes, which only
// render a few fixed widths; files in /public are already small WebP/PNG files and are served as they are.
const SITE_ASSET = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/site-assets\/(.+)$/;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const thumb = thumbWidthFor(width);
  if (src.startsWith("/api/vehicle-images/")) return thumb && !src.includes("?") ? `${src}?w=${thumb}` : src;
  const asset = SITE_ASSET.exec(src);
  if (asset) return `/api/site-assets/${asset[1]}?w=${thumb ?? 1600}`;
  return src;
}
