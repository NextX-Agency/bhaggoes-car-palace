import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!hasSupabaseEnv()) return new NextResponse(null, { status: 404 });
  const { path: parts } = await params;
  const path = parts.join("/");
  if (!path || path.split("/").some((part) => !part || part === "." || part === "..") || path.length > 500) return new NextResponse(null, { status: 400 });
  try {
    const supabase = await createClient();
    const { data: image } = await supabase.from("vehicle_images").select("id").eq("storage_path", path).maybeSingle();
    if (!image) return new NextResponse(null, { status: 404 });
    const { data, error } = await supabase.storage.from("vehicle-images").download(path);
    if (error || !data) return new NextResponse(null, { status: 404 });
    const { data: { user } } = await supabase.auth.getUser();
    const headers = new Headers({ "content-type": data.type || "application/octet-stream", "x-content-type-options": "nosniff", "content-disposition": "inline" });
    headers.set("cache-control", user ? "private, no-store" : "public, max-age=300, stale-while-revalidate=3600");
    return new Response(data.stream(), { status: 200, headers });
  } catch { return new NextResponse(null, { status: 404 }); }
}
