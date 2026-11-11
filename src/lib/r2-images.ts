import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { VEHICLE_THUMB_WIDTHS } from "@/lib/vehicle-image-url";

const account = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET;
const accessKey = process.env.R2_ACCESS_KEY_ID;
const secretKey = process.env.R2_SECRET_ACCESS_KEY;

export const r2Configured = Boolean(account && bucket && accessKey && secretKey);

function client() {
  if (!r2Configured) throw new Error("R2 image storage is not configured.");
  return new S3Client({ region: "auto", endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId: accessKey!, secretAccessKey: secretKey! } });
}

/** All copies must finish before the database marks a photo ready for public use. */
export async function mirrorVehicleImage(path: string, source: Buffer) {
  if (!/^[a-f\d-]{36}\/[a-f\d-]{36}\.(webp|jpe?g|png|avif)$/i.test(path)) throw new Error("Invalid vehicle image path.");
  const r2 = client();
  try {
    for (const width of VEHICLE_THUMB_WIDTHS) {
      const body = await sharp(source, { failOn: "error" }).rotate()
        .resize({ width, withoutEnlargement: true }).webp({ quality: width <= 400 ? 70 : 75, effort: 4 }).toBuffer();
      await r2.send(new PutObjectCommand({ Bucket: bucket!, Key: `vehicles/${path}/${width}.webp`, Body: body,
        ContentType: "image/webp", CacheControl: "public, max-age=300, s-maxage=300" }));
    }
  } finally { r2.destroy(); }
}

export async function mirrorSiteAsset(path: string, source: Buffer) {
  if (!/^(catalog|brand)\/[a-f\d-]{36}\.(webp|jpe?g|png|avif)$/i.test(path)) throw new Error("Invalid site image path.");
  const r2 = client();
  try {
    const body = await sharp(source, { failOn: "error" }).rotate()
      .resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 75, effort: 4 }).toBuffer();
    const key = `site-assets/${path}.webp`;
    await r2.send(new PutObjectCommand({ Bucket: bucket!, Key: key, Body: body,
      ContentType: "image/webp", CacheControl: "public, max-age=300, s-maxage=300" }));
    const base = process.env.NEXT_PUBLIC_R2_IMAGE_BASE_URL;
    return base ? `${base.replace(/\/$/, "")}/${key}` : null;
  } finally { r2.destroy(); }
}
