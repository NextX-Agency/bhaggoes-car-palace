import { describe, expect, it } from "vitest";
import { parseListingText } from "./listing-import";

describe("parseListingText", () => {
  it("extracts a vehicle and two prices from a dealership post without copying sales terms", () => {
    const result = parseListingText(`New stock
2018 - Toyota harrier | Panoramic sunroof | Jbl sound system | Fully loaded model | leather seats | 360° camera | and more option
Prijs: $26950,-
𝗚𝗜𝗥𝗔𝗔𝗟 𝗗𝗘𝗔𝗟: $𝟮𝟱𝟵𝟱𝟬,-
Interne financiering: 70% aanbetaling`);
    expect(result.fields).toEqual({ year: "2018", make: "Toyota", model: "harrier", price: "26950", cash_price: "25950" });
    expect(result.features).toEqual(["Panoramic sunroof", "Jbl sound system", "leather seats", "360° camera"]);
  });

  it("reads optional per-car specifications", () => {
    expect(parseListingText("2021 - Honda Fit\nBrandstof: Gasoline\nStocknummer: H-21\nZitplaatsen: 5\nTransmissie: Automatic\nCarrosserie: Hatchback").fields)
      .toEqual({ year: "2021", make: "Honda", model: "Fit", fuel_type: "Gasoline", stock_number: "H-21", seats: "5", transmission: "Automatic", body_type: "Hatchback" });
  });

  it("recognizes newer and multiword makes in pasted listings", () => {
    expect(parseListingText("2024 - Great Wall Poer | 4x4").fields).toMatchObject({ make: "Great Wall", model: "Poer" });
    expect(parseListingText("2025 - BYD Atto 3").fields).toMatchObject({ make: "BYD", model: "Atto 3" });
    expect(parseListingText("2022 - Mercedes Benz C 200").fields).toMatchObject({ make: "Mercedes-Benz", model: "C 200" });
    expect(parseListingText("2025 - Unlistedbrand Nova").fields).toMatchObject({ make: "Unlistedbrand", model: "Nova" });
  });
});
