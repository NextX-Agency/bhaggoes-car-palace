import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    // Vehicle and uploaded site photos are served by the resize routes, so those stay crawlable; other API routes stay closed.
    rules: [{ userAgent: "*", allow: ["/", "/api/vehicle-images/", "/api/site-assets/"], disallow: ["/admin", "/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
