import { describe, expect, it } from "vitest";
import { comboKey } from "./combo-options";
import { modelsForMake, vehicleModels } from "./vehicle-models";
import { vehicleMakes } from "./vehicle-catalog";

describe("vehicleModels", () => {
  it("has no duplicate models within a make (ignoring case and punctuation)", () => {
    for (const [make, models] of Object.entries(vehicleModels)) {
      const keys = models.map(comboKey);
      expect(new Set(keys).size, `${make} has duplicates`).toBe(keys.length);
      expect(models.every((model) => model.trim() === model && model.length > 0), `${make} has untrimmed entries`).toBe(true);
    }
  });

  it("only lists makes that exist in the make catalog", () => {
    const catalog = new Set(vehicleMakes.map(comboKey));
    for (const make of Object.keys(vehicleModels)) expect(catalog.has(comboKey(make)), make).toBe(true);
  });

  it("looks up makes case-insensitively and through common aliases", () => {
    expect(modelsForMake("toyota")).toContain("Coaster");
    expect(modelsForMake("  TOYOTA ")).toContain("Passo Moda");
    expect(modelsForMake("mercedes benz")).toContain("C-Class");
    expect(modelsForMake("Benz")).toContain("Sprinter");
    expect(modelsForMake("VW")).toContain("Golf");
    expect(modelsForMake("skoda")).toContain("Octavia");
  });

  it("returns no suggestions for an unknown or empty make", () => {
    expect(modelsForMake("")).toEqual([]);
    expect(modelsForMake("Unknown Motors")).toEqual([]);
  });

  it("covers the Japanese import staples", () => {
    const toyota = modelsForMake("Toyota");
    for (const model of ["Hiace", "Harrier", "Land Cruiser", "Alphard", "Vellfire", "Dyna", "ToyoAce", "Corolla Cross", "CH-R".replace("CH-R", "C-HR")]) expect(toyota).toContain(model);
  });
});
