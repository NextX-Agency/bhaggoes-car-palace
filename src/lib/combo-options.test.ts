import { describe, expect, it } from "vitest";
import { comboKey, filterComboOptions } from "./combo-options";

const options = ["Land Cruiser", "Land Cruiser Prado", "Corolla", "Coaster", "Hiace"];

describe("filterComboOptions", () => {
  it("returns every option for empty text", () => {
    expect(filterComboOptions(options, "")).toEqual(options);
    expect(filterComboOptions(options, "  ")).toEqual(options);
  });

  it("matches case-insensitively, prefix matches first", () => {
    expect(filterComboOptions(options, "co")).toEqual(["Corolla", "Coaster"]);
    expect(filterComboOptions(options, "PRADO")).toEqual(["Land Cruiser Prado"]);
    expect(filterComboOptions(options, "cruiser")).toEqual(["Land Cruiser", "Land Cruiser Prado"]);
  });

  it("ignores spaces, punctuation and accents", () => {
    expect(comboKey("Škoda")).toBe("skoda");
    expect(filterComboOptions(["Mercedes-Benz"], "mercedes benz")).toEqual(["Mercedes-Benz"]);
  });

  it("returns an empty list when nothing matches so typed values stay free-form", () => {
    expect(filterComboOptions(options, "zzz")).toEqual([]);
  });
});
