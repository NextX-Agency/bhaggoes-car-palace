import { NextResponse } from "next/server";
import sharp from "sharp";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { VEHICLE_THUMB_WIDTHS } from "@/lib/vehicle-image-url";

// Resizes the logo and lot photos staff upload (public site-assets bucket, up to 5 MB) so visitors get a small
// WebP instead of the original, without using Vercel Image Optimization.
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!hasSupabaseEnv()) return new NextResponse(null, { status: 404 });
  const { path: parts } = await params;
  const path = parts.join("/");
  if (!path || path.split("/").some((part) => !part || part === "." || part === "..") || path.length > 500 || /[\u0000-\u001f\\]/.test(path)) return new NextResponse(null, { status: 400 });
  const requested = Number(new URL(request.url).searchParams.get("w"));
  const width = VEHICLE_THUMB_WIDTHS.find((allowed) => allowed === requested);
  if (!width) return new NextResponse(null, { status: 400 });
  try {
    const supabase = createPublicClient();
    if (!supabase) return new NextResponse(null, { status: 404 });
    const { data, error } = await supabase.storage.from("site-assets").download(path);
    if (error || !data || !IMAGE_TYPES.has(data.type)) return new NextResponse(null, { status: 404 });
    const body = await sharp(Buffer.from(await data.arrayBuffer()), { failOn: "none" }).rotate()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    // Uploads get a new random path and are never overwritten, so the CDN and browsers may keep the result.
    return new Response(new Uint8Array(body), { status: 200, headers: {
      "content-type": "image/webp", "x-content-type-options": "nosniff", "content-disposition": "inline", "content-security-policy": "default-src 'none'; sandbox",
      "cache-control": "public, max-age=604800, s-maxage=31536000, immutable",
    } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
