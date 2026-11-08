import { afterEach, describe, expect, it, vi } from "vitest";
import { claimStickerUse, STICKER_FOLDER, STICKER_LIMIT, stickerUsesLeft, type StickerStorage } from "./window-sticker-quota";

/** In-memory stand-in for Supabase Storage: like the real bucket, it refuses to create a file that already exists. */
function fakeStorage(options: { failUploads?: boolean; failList?: boolean; delay?: boolean } = {}) {
  const files = new Map<string, Uint8Array>();
  const wait = () => options.delay ? new Promise((resolve) => setTimeout(resolve, Math.random() * 5)) : Promise.resolve();
  const storage: StickerStorage & { files: typeof files } = {
    files,
    async upload(path, body, { upsert }) {
      await wait();
      if (options.failUploads) return { error: { message: "fetch failed" } };
      if (files.has(path) && !upsert) return { error: { statusCode: "409", error: "Duplicate", message: "The resource already exists" } };
      files.set(path, body);
      return { error: null };
    },
    async list(folder) {
      await wait();
      if (options.failList) return { data: null, error: { message: "fetch failed" } };
      return { data: [...files.keys()].filter((path) => path.startsWith(`${folder}/`)).map((path) => ({ name: path.slice(folder.length + 1) })), error: null };
    },
  };
  return storage;
}

afterEach(() => { vi.unstubAllEnvs(); });

describe("window sticker uses", () => {
  it("allows exactly three openings in total, then locks", async () => {
    const storage = fakeStorage();
    expect(STICKER_LIMIT).toBe(3);
    expect(await stickerUsesLeft(storage)).toBe(3);
    expect(await claimStickerUse(storage)).toBe("claimed");
    expect(await stickerUsesLeft(storage)).toBe(2);
    expect(await claimStickerUse(storage)).toBe("claimed");
    expect(await claimStickerUse(storage)).toBe("claimed");
    expect(await stickerUsesLeft(storage)).toBe(0);
    expect(await claimStickerUse(storage)).toBe("exhausted");
    expect(await claimStickerUse(storage)).toBe("exhausted");
    expect(await stickerUsesLeft(storage)).toBe(0);
  });

  it("never gives out more than three uses when many people click at the same moment", async () => {
    for (let round = 0; round < 25; round++) {
      const storage = fakeStorage({ delay: true });
      const results = await Promise.all(Array.from({ length: 12 }, () => claimStickerUse(storage)));
      expect(results.filter((result) => result === "claimed")).toHaveLength(3);
      expect(results.filter((result) => result === "exhausted")).toHaveLength(9);
    }
  });

  it("does not use anything when storage cannot be reached, and shows nothing", async () => {
    const storage = fakeStorage({ failUploads: true });
    expect(await claimStickerUse(storage)).toBe("error");
    expect(storage.files.size).toBe(0);
  });

  it("reports an unknown count instead of guessing when the list fails", async () => {
    expect(await stickerUsesLeft(fakeStorage({ failList: true }))).toBeNull();
  });

  it("only counts its own three slot files", async () => {
    const storage = fakeStorage();
    storage.files.set(`${STICKER_FOLDER}/use-9.png`, new Uint8Array());
    storage.files.set(`${STICKER_FOLDER}/other.png`, new Uint8Array());
    storage.files.set("some-car/photo.webp", new Uint8Array());
    expect(await stickerUsesLeft(storage)).toBe(3);
    await claimStickerUse(storage); await claimStickerUse(storage); await claimStickerUse(storage);
    expect(await claimStickerUse(storage)).toBe("exhausted");
  });

  it("writes a small PNG with upsert off, so an existing slot is never overwritten", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    await claimStickerUse({ upload, list: async () => ({ data: [], error: null }) });
    expect(upload).toHaveBeenCalledWith(`${STICKER_FOLDER}/use-1.png`, expect.any(Uint8Array), { contentType: "image/png", upsert: false });
    const body = (upload.mock.calls[0] as unknown[])[1] as Uint8Array;
    expect(Array.from(body.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("recognises the duplicate error in its other forms", async () => {
    for (const error of [{ status: 409 }, { statusCode: 409 }, { message: "The resource already exists" }]) {
      const upload = vi.fn(async (path: string) => ({ error: path.endsWith("use-3.png") ? null : error }));
      expect(await claimStickerUse({ upload, list: async () => ({ data: [], error: null }) })).toBe("claimed");
    }
  });

  it("is unlimited only when NextX sets WINDOW_STICKER_UNLOCKED=true", async () => {
    const storage = fakeStorage();
    for (const value of ["1", "yes", "TRUE", ""]) {
      vi.stubEnv("WINDOW_STICKER_UNLOCKED", value);
      expect(await stickerUsesLeft(storage)).not.toBe(Infinity);
    }
    vi.stubEnv("WINDOW_STICKER_UNLOCKED", "true");
    expect(await stickerUsesLeft(storage)).toBe(Infinity);
    for (let index = 0; index < 10; index++) expect(await claimStickerUse(storage)).toBe("claimed");
    expect(storage.files.size).toBe(0);
  });
});
