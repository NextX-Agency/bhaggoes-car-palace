import { describe, expect, it } from "vitest";
import imageLoader from "./image-loader";
import { vehicleThumbUrl } from "./vehicle-image-url";

describe("imageLoader", () => {
  it("picks the smallest pre-built copy that covers the requested width", () => {
    expect(imageLoader({ src: "/images/hero-mobile-illustrative.webp", width: 750 })).toBe("/_w/828/images/hero-mobile-illustrative.webp");
    expect(imageLoader({ src: "/images/bhaggoes-logo.webp", width: 320 })).toBe("/_w/384/images/bhaggoes-logo.webp");
  });
  it("serves the original above the largest copy and for files without copies", () => {
    expect(imageLoader({ src: "/images/hero-suv.webp", width: 3840 })).toBe("/images/hero-suv.webp");
    expect(imageLoader({ src: "/brands/toyota.svg", width: 64 })).toBe("/brands/toyota.svg");
  });
  it("uses the resize route for vehicle photos", () => {
    expect(imageLoader({ src: "/api/vehicle-images/a/b.webp", width: 750 })).toBe("/api/vehicle-images/a/b.webp?w=800");
  });
  it("selects a prebuilt Cloudflare copy without a Vercel or Supabase request", () => {
    const full = "https://media.bhaggoescarpalace.com/vehicles/a/b.webp/1600.webp";
    expect(imageLoader({ src: full, width: 750 })).toBe("https://media.bhaggoescarpalace.com/vehicles/a/b.webp/800.webp");
    expect(imageLoader({ src: full, width: 384 })).toBe("https://media.bhaggoescarpalace.com/vehicles/a/b.webp/400.webp");
    expect(imageLoader({ src: full, width: 1920 })).toBe(full);
    expect(vehicleThumbUrl(full, 160)).toBe("https://media.bhaggoescarpalace.com/vehicles/a/b.webp/160.webp");
  });
});
