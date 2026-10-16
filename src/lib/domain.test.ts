import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, calculateFinance, formatAmount, parseLocations, safeExternalUrl, slugify } from "./domain";

describe("dealership helpers", () => {
  it("calculates a zero-interest loan without adding interest", () => {
    expect(calculateFinance(30_000, 5_000, 0, 50)).toEqual({ monthlyPayment: 500, totalInterest: 0, totalRepayment: 25_000 });
  });

  it("uses the amortization formula for an interest-bearing loan", () => {
    const result = calculateFinance(12_000, 2_000, 12, 12);
    expect(result?.monthlyPayment).toBeCloseTo(888.49, 2);
    expect(result?.totalInterest).toBeCloseTo(661.85, 1);
    expect(result?.totalRepayment).toBeCloseTo(10_661.85, 1);
  });

  it("rejects impossible calculator inputs", () => {
    expect(calculateFinance(10_000, 10_001, 6, 60)).toBeNull();
    expect(calculateFinance(10_000, 0, -1, 60)).toBeNull();
  });

  it("creates stable readable slugs", () => {
    expect(slugify("Toyota RAV4 — Limited Edition")).toBe("toyota-rav4-limited-edition");
  });

  it("creates WhatsApp links only when a number is configured", () => {
    expect(buildWhatsAppLink("+597 123-4567", "Interested in the RAV4")).toBe("https://wa.me/5971234567?text=Interested%20in%20the%20RAV4");
    expect(buildWhatsAppLink(null, "Hello")).toBeNull();
  });

  it("allows only HTTP social URLs", () => {
    expect(safeExternalUrl("https://instagram.com/bhaggoes")).toBe("https://instagram.com/bhaggoes");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("mailto:hello@example.com")).toBeNull();
  });

  it("formats missing prices without inventing a value", () => {
    expect(formatAmount(null)).toBe("Price on request");
    expect(formatAmount(1234, "SRD")).toBe(`SRD ${new Intl.NumberFormat().format(1234)}`);
  });

  it("reads one dealership location per line with an optional name", () => {
    const locations = parseLocations("Showroom: Kwattaweg 1, Paramaribo\n\nLelydorp 22");
    expect(locations.map(({ name, address }) => ({ name, address }))).toEqual([
      { name: "Showroom", address: "Kwattaweg 1, Paramaribo" },
      { name: null, address: "Lelydorp 22" },
    ]);
    expect(locations[0].mapUrl).toContain(encodeURIComponent("Kwattaweg 1, Paramaribo"));
    expect(parseLocations(null)).toEqual([]);
    expect(parseLocations("Kwattaweg 407, Paramaribo, Suriname")[0].mapUrl).toBe("https://maps.app.goo.gl/UgiPvc2SsBrTQYG79");
  });
});
