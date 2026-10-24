import type { NextConfig } from "next";

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
    { source: "/about", destination: "/contact", permanent: true },
    { source: "/cars/demo-toyota-rav4", destination: "/cars/2021-toyota-rav4", permanent: true },
    { source: "/cars/demo-honda-fit", destination: "/cars/2018-honda-fit", permanent: true },
  ],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Vehicle photo paths contain a random UUID and are never overwritten, so optimized copies can be kept for a week.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    qualities: [30, 75],
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/site-assets/**" }],
  },
};

export default nextConfig;
