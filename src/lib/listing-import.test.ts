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
});
