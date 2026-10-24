// Browser-side preparation of vehicle photos before upload: HEIC/HEIF (the iPad and iPhone camera format) is converted where the browser can decode it, and large photos are resized.
export const maxPhotoBytes = 15 * 1024 * 1024;
// Originals may be larger than the storage limit because they are shrunk before upload; anything beyond this is not worth decoding.
export const maxSourcePhotoBytes = 40 * 1024 * 1024;
export const photoAccept = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif";

export const isHeicPhoto = (file: File) => /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
export const isSupportedPhoto = (file: File) => /^image\/(jpeg|png|webp|avif)$/.test(file.type) || isHeicPhoto(file);

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns a photo that storage accepts (JPEG, PNG, WebP or AVIF, at most 2400px on the long side when it was re-encoded).
 * Throws an Error with a Dutch message for photos this browser cannot convert.
 */
export async function preparePhoto(file: File): Promise<File> {
  const heic = isHeicPhoto(file);
  if (!globalThis.createImageBitmap || (!heic && file.size < 450_000 && !/\.png$/i.test(file.name))) {
    if (heic) throw new Error("is een HEIC-foto en deze browser kan die niet omzetten. Open de beheerpagina in Safari of kies de foto als JPEG.");
    return file;
  }
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    if (!heic && scale === 1 && file.type === "image/webp" && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("canvas");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Not every browser can encode WebP (Safari may hand back a PNG instead), so check the type we actually got.
    let blob = await encode(canvas, "image/webp", 0.84);
    if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg", 0.86);
    if (!blob || !/^image\/(webp|jpeg)$/.test(blob.type)) throw new Error("encode");
    if (!heic && blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "vehicle-photo";
    return new File([blob], `${baseName}.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type, lastModified: file.lastModified });
  } catch {
    if (heic) throw new Error("is een HEIC-foto en kon niet worden omgezet. Kies de foto als JPEG, of probeer Safari.");
    return file;
  } finally {
    bitmap?.close();
  }
}
