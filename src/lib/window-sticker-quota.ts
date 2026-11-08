// Limit on window stickers: STICKER_LIMIT openings in total for the whole dashboard, until NextX unlocks the feature.
//
// No database table is used. Each use claims one fixed slot file in the private vehicle-images bucket. Storage
// refuses to create a file that already exists (upsert: false), so a slot can be claimed only once, even when two
// people click at the same moment, and every account and browser shares the same count. The sticker data is only
// sent after a slot is claimed. NextX unlocks unlimited use by setting WINDOW_STICKER_UNLOCKED=true in Vercel.

export const STICKER_LIMIT = 3;
export const STICKER_BUCKET = "vehicle-images";
export const STICKER_FOLDER = "_system/window-sticker";
const slotName = (slot: number) => `use-${slot}.png`;

// A 1x1 transparent PNG: the bucket only accepts images, the file's existence is what counts.
const MARKER = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="), (char) => char.charCodeAt(0));

type StorageError = { message?: string; status?: number; statusCode?: string | number; error?: string } | null;
export interface StickerStorage {
  upload(path: string, body: Uint8Array, options: { contentType: string; upsert: false }): Promise<{ error: StorageError }>;
  list(folder: string, options: { limit: number }): Promise<{ data: { name: string }[] | null; error: StorageError }>;
}

export function stickerUnlocked() {
  return process.env.WINDOW_STICKER_UNLOCKED === "true";
}

function isDuplicate(error: NonNullable<StorageError>) {
  return error.status === 409 || String(error.statusCode) === "409" || /duplicate|already exists/i.test(`${error.error ?? ""} ${error.message ?? ""}`);
}

/** Uses left, or null when the count could not be read (the claim below still decides). */
export async function stickerUsesLeft(storage: StickerStorage): Promise<number | null> {
  if (stickerUnlocked()) return Infinity;
  const { data, error } = await storage.list(STICKER_FOLDER, { limit: 100 });
  if (error || !data) return null;
  const valid = new Set(Array.from({ length: STICKER_LIMIT }, (_, index) => slotName(index + 1)));
  const used = data.filter((file) => valid.has(file.name)).length;
  return Math.max(0, STICKER_LIMIT - used);
}

/** Claims one use. "error" means storage could not be reached; nothing was used and nothing may be shown. */
export async function claimStickerUse(storage: StickerStorage): Promise<"claimed" | "exhausted" | "error"> {
  if (stickerUnlocked()) return "claimed";
  for (let slot = 1; slot <= STICKER_LIMIT; slot++) {
    const { error } = await storage.upload(`${STICKER_FOLDER}/${slotName(slot)}`, MARKER, { contentType: "image/png", upsert: false });
    if (!error) return "claimed";
    if (!isDuplicate(error)) return "error";
  }
  return "exhausted";
}
