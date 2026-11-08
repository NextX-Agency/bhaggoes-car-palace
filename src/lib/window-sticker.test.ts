import { describe, expect, it } from "vitest";
import { defaultSettings, type Vehicle } from "./domain";
import { buildWindowSticker, STICKER_MAX_FEATURES } from "./window-sticker";

const base: Vehicle = {
  id: "00000000-0000-4000-8000-000000000001", slug: "2018-toyota-harrier", title: "Toyota Harrier", make: "Toyota", model: "Harrier", variant: "Premium",
  year: 2018, price: 30000, cash_price: 28500, currency: "USD", mileage: 54000, engine_capacity: "2.0L", fuel_type: "Gasoline", transmission: "Automatic",
  drive_type: "AWD", body_type: "SUV", exterior_color: "White", interior_color: "Black", seats: 5, doors: 5, description: "Long text", condition: "used",
  availability: "available", stock_number: "BCP-0012", featured: false, published: true, archived_at: null, created_at: "", updated_at: "", images: [],
  features: ["Reverse camera", "Sunroof"],
};
const settings = { ...defaultSettings, phone: "+597 866-8777", whatsapp: "+597 866-8777", address: "Kwattaweg: Kwattaweg-Tomaatstraat 495, Suriname" };

describe("window sticker content", () => {
  it("shows name, year, model, specifications and both prices with the saving", () => {
    const sticker = buildWindowSticker(base, settings, "https://www.bhaggoescarpalace.com");
    expect(sticker.heading).toBe("Toyota Harrier Premium");
    expect(sticker.year).toBe(2018);
    expect(sticker.condition).toBe("Used");
    expect(sticker.price).toBe("USD 30,000");
    expect(sticker.cashPrice).toBe("USD 28,500");
    expect(sticker.savings).toBe("USD 1,500");
    expect(Object.fromEntries(sticker.specifications)).toMatchObject({ Engine: "2.0L", Transmission: "Automatic", Fuel: "Gasoline", Mileage: "54,000 km", Exterior: "White", "Stock number": "BCP-0012" });
    expect(sticker.specifications.some(([label]) => label === "Year")).toBe(false);
    expect(sticker.business.website).toBe("www.bhaggoescarpalace.com");
    expect(sticker.business.whatsapp).toBeNull(); // same number as the phone, shown once
    expect(sticker.business.locations).toEqual(["Kwattaweg: Kwattaweg-Tomaatstraat 495, Suriname"]);
  });

  it("only highlights a discount when the cash price is lower than the regular price", () => {
    expect(buildWindowSticker({ ...base, cash_price: 30000 }, settings, "x").savings).toBeNull();
    expect(buildWindowSticker({ ...base, cash_price: 31000 }, settings, "x").savings).toBeNull();
    const cashOnly = buildWindowSticker({ ...base, price: null }, settings, "x");
    expect([cashOnly.price, cashOnly.cashPrice, cashOnly.savings]).toEqual([null, "USD 28,500", null]);
    const regularOnly = buildWindowSticker({ ...base, cash_price: null }, settings, "x");
    expect([regularOnly.price, regularOnly.cashPrice, regularOnly.savings]).toEqual(["USD 30,000", null, null]);
  });

  it("leaves out everything that is not filled in", () => {
    const bare = buildWindowSticker({ ...base, make: null, model: null, variant: null, year: null, price: null, cash_price: null, mileage: null, engine_capacity: null, fuel_type: null, transmission: null, drive_type: null, body_type: null, exterior_color: null, interior_color: null, seats: null, doors: null, stock_number: null, features: [] }, { ...settings, sales_terms: { ...settings.sales_terms, benefits: [] } }, "x");
    expect(bare.heading).toBe("Toyota Harrier"); // falls back to the listing title
    expect(bare.specifications).toEqual([]);
    expect(bare.features).toEqual([]);
    expect(bare.benefits).toEqual([]);
    expect(bare.price).toBeNull();
  });

  it("uses the settings currency when the car has none, and caps long option lists to fit one page", () => {
    const sticker = buildWindowSticker({ ...base, currency: null, features: Array.from({ length: 60 }, (_, index) => `Option ${index}`) }, { ...settings, currency: "SRD" }, "x");
    expect(sticker.price).toBe("SRD 30,000");
    expect(sticker.features).toHaveLength(STICKER_MAX_FEATURES);
  });

  it("never prints staff-only data", () => {
    const text = JSON.stringify(buildWindowSticker({ ...base, description: "secret" } as Vehicle & { vin: string }, settings, "x"));
    expect(text).not.toContain("secret");
  });
});
