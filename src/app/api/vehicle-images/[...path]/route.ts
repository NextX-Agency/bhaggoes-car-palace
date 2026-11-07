import { NextResponse } from "next/server";
import sharp from "sharp";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { VEHICLE_THUMB_WIDTHS } from "@/lib/vehicle-image-url";

export const dynamic = "force-dynamic";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
// Vercel refuses function responses above 4.5 MB, so anything near that is shrunk instead of failing.
const MAX_PASSTHROUGH_BYTES = 3.5 * 1024 * 1024;

async function resize(input: ArrayBuffer, width: number, quality: number) {
  return sharp(Buffer.from(input), { failOn: "none" }).rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .webp({ quality }).toBuffer();
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!hasSupabaseEnv()) return new NextResponse(null, { status: 404 });
  const { path: parts } = await params;
  const path = parts.join("/");
  if (!path || path.split("/").some((part) => !part || part === "." || part === "..") || path.length > 500 || /[\u0000-\u001f\\]/.test(path)) return new NextResponse(null, { status: 400 });
  // ?w= asks for a smaller version (thumbnails and the next/image loader); only a few fixed widths, so nobody can make the server render arbitrary sizes.
  const requested = Number(new URL(request.url).searchParams.get("w"));
  const width = VEHICLE_THUMB_WIDTHS.find((allowed) => allowed === requested);
  try {
    const signedIn = /(?:^|;\s*)sb-[^=]*-auth-token/.test(request.headers.get("cookie") ?? "");
    const supabase = signedIn ? await createClient() : createPublicClient();
    if (!supabase) return new NextResponse(null, { status: 404 });
    // Storage's vehicle_images_visible_select policy checks the linked car's publication,
    // archive state and catalog switch. A second vehicle_images query added a network hop per photo.
    const { data, error } = await supabase.storage.from("vehicle-images").download(path);
    if (error || !data || !IMAGE_TYPES.has(data.type)) return new NextResponse(null, { status: 404 });
    // The session cookie only decides who may cache this response.
    let body: BodyInit = data.stream();
    let type = data.type;
    if (width) { body = new Uint8Array(await resize(await data.arrayBuffer(), width, 72)); type = "image/webp"; }
    else if (data.size > MAX_PASSTHROUGH_BYTES) { body = new Uint8Array(await resize(await data.arrayBuffer(), 2000, 80)); type = "image/webp"; }
    const headers = new Headers({ "content-type": type, "x-content-type-options": "nosniff", "content-disposition": "inline", "content-security-policy": "default-src 'none'; sandbox" });
    // A photo's path holds a random id and is never reused, so staff browsers may keep it; the public copy stays
    // short-lived because the catalog switch or a status change can hide the car at any moment.
    headers.set("cache-control", signedIn ? "private, max-age=86400, immutable" : "public, max-age=300, s-maxage=300, stale-while-revalidate=3600");
    return new Response(body, { status: 200, headers });
  } catch { return new NextResponse(null, { status: 404 }); }
}
