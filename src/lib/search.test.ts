import { describe, expect, it } from "vitest";
import { matchesSearch, searchTermGroups } from "./search";

describe("searchTermGroups", () => {
  it("splits words, removes duplicates and adds synonyms", () => {
    expect(searchTermGroups("  Toyota toyota ZWART ")).toEqual([["toyota"], ["black", "zwart"]]);
  });
  it("drops characters that mean something in SQL patterns or PostgREST filters", () => {
    expect(searchTermGroups("100%_ a,b (c) \"d\"")).toEqual([["100"], ["ab"], ["c"], ["d"]]);
  });
  it("keeps at most eight words", () => {
    expect(searchTermGroups("a b c d e f g h i j")).toHaveLength(8);
  });
});

describe("matchesSearch", () => {
  const car = ["2018 Toyota Harrier", "Toyota", "Harrier", 2018, "BCP-000123", "Black", "Automatic", "Panoramic sunroof", 26950];
  it("matches every word anywhere", () => {
    expect(matchesSearch("harrier 2018", car)).toBe(true);
    expect(matchesSearch("harrier 2019", car)).toBe(false);
  });
  it("finds stock numbers with or without punctuation", () => {
    expect(matchesSearch("BCP-000123", car)).toBe(true);
    expect(matchesSearch("bcp000123", car)).toBe(true);
    expect(matchesSearch("123", car)).toBe(true);
  });
  it("understands Dutch words", () => {
    expect(matchesSearch("zwart automaat", car)).toBe(true);
    expect(matchesSearch("schuifdak", car)).toBe(true);
  });
  it("matches partial words and prices", () => {
    expect(matchesSearch("harr", car)).toBe(true);
    expect(matchesSearch("26950", car)).toBe(true);
  });
  it("matches everything for an empty query", () => {
    expect(matchesSearch("   ", car)).toBe(true);
  });
});
