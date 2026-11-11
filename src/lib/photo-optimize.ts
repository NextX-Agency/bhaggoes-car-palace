// Browser-side preparation of vehicle photos before upload: HEIC/HEIF (the iPad and iPhone camera format) is converted where the browser can decode it, and large photos are resized.
export const maxPhotoBytes = 450 * 1024;
// Originals may be larger than the storage limit because they are shrunk before upload; anything beyond this is not worth decoding.
export const maxSourcePhotoBytes = 40 * 1024 * 1024;
const MAX_EDGE = 1600;
type PhotoOptions = { maxBytes?: number; maxEdge?: number };
export const photoAccept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif";

export const isHeicPhoto = (file: File) => /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
const mimeFromName = (name: string) => /\.jpe?g$/i.test(name) ? "image/jpeg" : /\.png$/i.test(name) ? "image/png" : /\.webp$/i.test(name) ? "image/webp" : /\.avif$/i.test(name) ? "image/avif" : "";
export const isSupportedPhoto = (file: File) => /^image\/(jpeg|png|webp|avif)$/.test(file.type) || isHeicPhoto(file) || (!file.type && Boolean(mimeFromName(file.name)));

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Compresses in the browser before any upload. Already-small images are kept unchanged;
 * larger images are resized and encoded until they fit the requested byte limit.
 * Throws an Error with a Dutch message for photos this browser cannot convert.
 */
type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

// createImageBitmap is fastest, but some iPhone/iPad browsers reject large camera photos with it; an <img>
// element decodes those fine. Without this fallback such photos used to be uploaded at full size (2–5 MB).
async function decode(file: File): Promise<Decoded> {
  if (typeof globalThis.createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* fall through to the <img> decoder */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

export async function preparePhoto(file: File, { maxBytes = maxPhotoBytes, maxEdge = MAX_EDGE }: PhotoOptions = {}): Promise<File> {
  if (!file.type) {
    const inferred = mimeFromName(file.name);
    if (inferred) file = new File([file], file.name, { type: inferred, lastModified: file.lastModified });
  }
  const heic = isHeicPhoto(file);
  if (!heic && file.size <= maxBytes) return file;
  let decoded: Decoded | null = null;
  try {
    decoded = await decode(file);
    if (!decoded.width || !decoded.height) throw new Error("decode");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    for (const [edge, quality] of [[maxEdge, 0.76], [maxEdge, 0.64], [Math.min(maxEdge, 1280), 0.68], [Math.min(maxEdge, 1024), 0.58]]) {
      const scale = Math.min(1, edge / Math.max(decoded.width, decoded.height));
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
      // Safari may not encode WebP; use JPEG only if its encoder really returns JPEG.
      let blob = await encode(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", quality);
      if (!blob || !/^image\/(webp|jpeg)$/.test(blob.type)) throw new Error("encode");
      if (blob.size > maxBytes) continue;
      const baseName = file.name.replace(/\.[^.]+$/, "") || "vehicle-photo";
      return new File([blob], `${baseName}.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type, lastModified: file.lastModified });
    }
    throw new Error("too large");
  } catch {
    if (heic) throw new Error("is een HEIC-foto en kon niet worden omgezet. Kies de foto als JPEG, of probeer Safari.");
    throw new Error("kon niet klein genoeg worden gemaakt. Probeer een kleinere JPEG- of WebP-foto.");
  } finally {
    decoded?.close();
  }
}
