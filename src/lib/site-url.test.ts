import { describe, expect, it } from "vitest";
import { shareImageUrl } from "./site-url";

describe("shareImageUrl", () => {
  it("uses the vehicle photo resize route instead of /_next/image", () => {
    expect(shareImageUrl("/api/vehicle-images/abc/photo.webp")).toMatch(/\/api\/vehicle-images\/abc\/photo\.webp\?w=1200$/);
  });
  it("resizes uploaded site assets through our own route", () => {
    expect(shareImageUrl("https://xyz.supabase.co/storage/v1/object/public/site-assets/catalog/a.jpg")).toMatch(/\/api\/site-assets\/catalog\/a\.jpg\?w=1200$/);
  });
  it("links static files directly", () => {
    expect(shareImageUrl("/images/demo-fit.webp")).toMatch(/\/images\/demo-fit\.webp$/);
  });
});
