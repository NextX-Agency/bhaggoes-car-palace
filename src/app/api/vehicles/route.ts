import { NextResponse } from "next/server";
import { getVehiclesByIds } from "@/lib/data";

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").slice(0, 100).filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) ?? [];
  const vehicles = await getVehiclesByIds(ids);
  return NextResponse.json({ vehicles }, { headers: { "cache-control": "private, no-store" } });
}
