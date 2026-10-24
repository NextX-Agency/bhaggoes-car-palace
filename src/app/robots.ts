import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    // Vehicle photos are crawled through /_next/image, so the raw API routes can stay closed.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
