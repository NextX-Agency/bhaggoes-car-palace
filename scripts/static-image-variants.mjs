// Writes smaller copies of the photos in public/images to public/_w/<width>/images/..., so phones download an image
// that fits their screen. src/lib/image-loader.ts points next/image at these copies; Vercel Image Optimization is
// not used. next.config.ts runs this during every production build; the output is not committed.
// Run by hand with: node scripts/static-image-variants.mjs
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { STATIC_IMAGE_WIDTHS } from "../src/lib/static-image-widths.mjs";

const root = path.resolve(import.meta.dirname, "..", "public");
const source = path.join(root, "images");
const target = path.join(root, "_w");

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
  return nested.flat().filter((file) => /\.(webp|jpe?g)$/i.test(file));
}

export async function buildStaticImageVariants() {
  // Safe to run from several build workers at once: existing up-to-date copies are kept, new ones are written to a
  // temporary file and renamed into place.
  let written = 0;
  for (const file of await files(source)) {
    const relative = path.relative(root, file);
    const original = await stat(file);
    for (const width of STATIC_IMAGE_WIDTHS) {
      const out = path.join(target, String(width), relative);
      const existing = await stat(out).catch(() => null);
      if (existing && existing.mtimeMs >= original.mtimeMs) continue;
      await mkdir(path.dirname(out), { recursive: true });
      const temporary = `${out}.${process.pid}.${randomUUID()}.tmp`;
      const image = sharp(file).resize({ width, withoutEnlargement: true });
      await (/\.webp$/i.test(file) ? image.webp({ quality: 70, effort: 5 }) : image.jpeg({ quality: 75, mozjpeg: true })).toFile(temporary);
      // Never ship a "smaller" copy that is bigger than the original.
      if ((await stat(temporary)).size > original.size) await copyFile(file, temporary);
      await rename(temporary, out);
      written++;
    }
  }
  if (written) console.log(`static-image-variants: wrote ${written} files`);
}

if (import.meta.url === `file://${process.argv[1]}`) void buildStaticImageVariants();
