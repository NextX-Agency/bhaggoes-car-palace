import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Public pages are prerendered, so scripts cannot carry a per-request nonce; inline scripts stay allowed and everything else is pinned to our own origin, Supabase and the Google Maps embed.
const supabase = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin; } catch { return "https://*.supabase.co"; } })();
const supabaseSocket = supabase.replace("https://", "wss://");
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseSocket}${process.env.NODE_ENV === "development" ? " ws://localhost:* ws://127.0.0.1:* ws://0.0.0.0:*" : ""}`,
  "frame-src https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(process.env.NODE_ENV === "production" && process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      ],
    },
  ],
  redirects: async () => [
    { source: "/:path*", has: [{ type: "host", value: "bhaggoescarpalace.com" }], destination: "https://www.bhaggoescarpalace.com/:path*", permanent: true },
    { source: "/:path*", has: [{ type: "host", value: "bhaggoes-car-palace.vercel.app" }], destination: "https://www.bhaggoescarpalace.com/:path*", permanent: true },
    { source: "/about", destination: "/contact", permanent: true },
    { source: "/cars/demo-toyota-rav4", destination: "/cars/2021-toyota-rav4", permanent: true },
    { source: "/cars/demo-honda-fit", destination: "/cars/2018-honda-fit", permanent: true },
  ],
  poweredByHeader: false,
  compress: true,
  images: {
    // All images use our own loader (src/lib/image-loader.ts) instead of Vercel Image Optimization, so the site never
    // spends the plan's image transformation quota and photos keep loading if that quota would run out.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
};

// Smaller copies of public/images for the image loader, made on every production build whatever command runs it.
export default async function config(phase: string): Promise<NextConfig> {
  if (phase === PHASE_PRODUCTION_BUILD) await (await import("./scripts/static-image-variants.mjs")).buildStaticImageVariants();
  return nextConfig;
}
