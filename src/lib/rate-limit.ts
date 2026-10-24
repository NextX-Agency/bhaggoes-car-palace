import { headers } from "next/headers";

// Best-effort, per-server-instance throttle. It slows down password guessing and keeps one noisy client from exhausting the shared auth rate limit; it is not a distributed limiter.
type Bucket = { count: number; expires: number };
const buckets = new Map<string, Bucket>();

export async function clientAddress() {
  const store = await headers();
  return store.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || store.get("x-real-ip") || store.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function live(key: string, now: number) {
  const bucket = buckets.get(key);
  if (bucket && bucket.expires > now) return bucket;
  buckets.delete(key);
  return undefined;
}

export function isThrottled(key: string, limit: number) {
  return (live(key, Date.now())?.count ?? 0) >= limit;
}

export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  const bucket = live(key, now);
  buckets.set(key, { count: (bucket?.count ?? 0) + 1, expires: bucket?.expires ?? now + windowMs });
  if (buckets.size > 5000) for (const [name, value] of buckets) if (value.expires <= now) buckets.delete(name);
}

export function clearFailures(key: string) {
  buckets.delete(key);
}
