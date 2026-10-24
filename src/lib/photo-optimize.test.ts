import { describe, expect, it } from "vitest";
import { isHeicPhoto, isSupportedPhoto } from "./photo-optimize";

const file = (name: string, type: string) => new File(["x"], name, { type });

describe("photo type checks", () => {
  it("recognises HEIC/HEIF by type or by extension (iPad files often have no type)", () => {
    expect(isHeicPhoto(file("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeicPhoto(file("photo", "image/heif"))).toBe(true);
    expect(isHeicPhoto(file("photo.jpg", "image/jpeg"))).toBe(false);
  });

  it("accepts the storage formats and HEIC, and rejects everything else", () => {
    for (const [name, type] of [["a.jpg", "image/jpeg"], ["a.png", "image/png"], ["a.webp", "image/webp"], ["a.avif", "image/avif"], ["a.heic", "image/heic"]]) expect(isSupportedPhoto(file(name, type))).toBe(true);
    expect(isSupportedPhoto(file("a.gif", "image/gif"))).toBe(false);
    expect(isSupportedPhoto(file("a.pdf", "application/pdf"))).toBe(false);
  });
});
