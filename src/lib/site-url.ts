// Canonical origin used for metadata, sitemap, robots and JSON-LD. Set NEXT_PUBLIC_SITE_URL to the public domain in production.
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return configured.replace(/\/+$/, "");
}

export function absoluteUrl(path: string) {
  return /^https?:\/\//i.test(path) ? path : `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

// Optimized (resized, WebP/AVIF) variant of a site or vehicle image, for social previews and structured data.
// Raw vehicle photos can be several MB; link previews such as WhatsApp drop images that are too large.
export function shareImageUrl(path: string, width = 1200) {
  return absoluteUrl(`/_next/image?url=${encodeURIComponent(path)}&w=${width}&q=75`);
}
