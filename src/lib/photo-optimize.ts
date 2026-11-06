// Browser-side preparation of vehicle photos before upload: HEIC/HEIF (the iPad and iPhone camera format) is converted where the browser can decode it, and large photos are resized.
export const maxPhotoBytes = 15 * 1024 * 1024;
// Originals may be larger than the storage limit because they are shrunk before upload; anything beyond this is not worth decoding.
export const maxSourcePhotoBytes = 40 * 1024 * 1024;
const MAX_EDGE = 2000;
export const photoAccept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif";

export const isHeicPhoto = (file: File) => /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
const mimeFromName = (name: string) => /\.jpe?g$/i.test(name) ? "image/jpeg" : /\.png$/i.test(name) ? "image/png" : /\.webp$/i.test(name) ? "image/webp" : /\.avif$/i.test(name) ? "image/avif" : "";
export const isSupportedPhoto = (file: File) => /^image\/(jpeg|png|webp|avif)$/.test(file.type) || isHeicPhoto(file) || (!file.type && Boolean(mimeFromName(file.name)));

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns a photo that storage accepts (JPEG, PNG, WebP or AVIF, at most 2000px on the long side when it was re-encoded).
 * 2000px is still sharp in the full-screen gallery and keeps uploads small on a phone connection.
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

export async function preparePhoto(file: File): Promise<File> {
  if (!file.type) {
    const inferred = mimeFromName(file.name);
    if (inferred) file = new File([file], file.name, { type: inferred, lastModified: file.lastModified });
  }
  const heic = isHeicPhoto(file);
  if (!heic && file.size < 450_000 && !/\.png$/i.test(file.name)) return file;
  let decoded: Decoded | null = null;
  try {
    decoded = await decode(file);
    if (!decoded.width || !decoded.height) throw new Error("decode");
    const scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height));
    if (!heic && scale === 1 && file.type === "image/webp" && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    // Not every browser can encode WebP (Safari may hand back a PNG instead), so check the type we actually got.
    let blob = await encode(canvas, "image/webp", 0.82);
    if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", 0.84);
    if (!blob || !/^image\/(webp|jpeg)$/.test(blob.type)) throw new Error("encode");
    if (!heic && blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "vehicle-photo";
    return new File([blob], `${baseName}.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type, lastModified: file.lastModified });
  } catch {
    if (heic) throw new Error("is een HEIC-foto en kon niet worden omgezet. Kies de foto als JPEG, of probeer Safari.");
    return file;
  } finally {
    decoded?.close();
  }
}
