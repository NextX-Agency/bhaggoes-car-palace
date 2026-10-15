import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional(),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(8).max(5000),
  vehicleId: z.string().uuid().optional().or(z.literal("")),
  website: z.string().max(0).optional(),
}).refine((values) => Boolean(values.email || values.phone), { message: "Add an email address or phone number." });

const requests = new Map<string, { count: number; expires: number }>();
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "Messages are unavailable right now. Please try again later." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  if (parsed.data.website !== undefined && parsed.data.website !== "") return NextResponse.json({ ok: true });
  const headers = request.headers;
  const clientKey = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const now = Date.now(); const existing = requests.get(clientKey);
  if (existing && existing.expires > now && existing.count >= 5) return NextResponse.json({ error: "Please wait a while before sending another message." }, { status: 429 });
  requests.set(clientKey, existing && existing.expires > now ? { count: existing.count + 1, expires: existing.expires } : { count: 1, expires: now + 60 * 60 * 1000 });
  for (const [key, value] of requests) if (value.expires <= now) requests.delete(key);
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_inquiry", { p_name: parsed.data.name, p_email: parsed.data.email || null, p_phone: parsed.data.phone || null, p_message: parsed.data.message, p_vehicle_id: parsed.data.vehicleId || null });
    if (error) {
      const limited = error.message.includes("Please wait");
      return NextResponse.json({ error: limited ? error.message : "We couldn't save your inquiry." }, { status: limited ? 429 : 400 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch { return NextResponse.json({ error: "Messages are unavailable right now. Please try again later." }, { status: 503 }); }
}
