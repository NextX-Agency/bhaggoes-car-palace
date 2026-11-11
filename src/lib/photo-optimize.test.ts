import { afterEach, describe, expect, it, vi } from "vitest";
import { isHeicPhoto, isSupportedPhoto, maxPhotoBytes, preparePhoto } from "./photo-optimize";

const file = (name: string, type: string) => new File(["x"], name, { type });
afterEach(() => vi.unstubAllGlobals());

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
    expect(isSupportedPhoto(file("camera.JPG", ""))).toBe(true);
  });
  it("restores a missing MIME type before uploading a camera JPEG", async () => {
    expect((await preparePhoto(file("camera.JPG", ""))).type).toBe("image/jpeg");
  });
  it("retries compression and never returns an oversized upload", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({ width: 2400, height: 1600, close() {} }));
    const sizes = [600_000, 400_000];
    vi.stubGlobal("document", { createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({ drawImage() {} }),
      toBlob: (done: (blob: Blob) => void) => done(new Blob([new Uint8Array(sizes.shift() ?? 400_000)], { type: "image/webp" })),
    }) });
    const result = await preparePhoto(new File([new Uint8Array(1_000_000)], "large.jpg", { type: "image/jpeg" }));
    expect(result.type).toBe("image/webp");
    expect(result.size).toBeLessThanOrEqual(maxPhotoBytes);
    expect(result.size).toBe(400_000);
  });
});
