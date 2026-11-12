// One-time refresh of public vehicle copies using R2 as the source. This deliberately avoids
// downloading the photos from Supabase while its bandwidth quota is already exceeded.
// Run with: node --env-file=.env.local scripts/refresh-r2-image-quality.mjs
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { appendFile, mkdir, readFile } from "node:fs/promises";

const base = process.env.NEXT_PUBLIC_R2_IMAGE_BASE_URL?.replace(/\/$/, "");
if (!base || !process.env.R2_BUCKET || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error("R2 environment variables are missing.");
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } });
const r2 = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
const checkpoint = "tmp/r2-quality-refreshed-ids.txt";
const widths = [160, 400, 800, 1200, 1600];
await mkdir("tmp", { recursive: true });
const done = new Set((await readFile(checkpoint, "utf8").catch(() => "")).split("\n").filter(Boolean));

const published = new Set();
for (let from = 0; ; from += 500) {
  const { data, error } = await supabase.from("vehicles").select("id").eq("published", true).is("archived_at", null).range(from, from + 499);
  if (error) throw error;
  for (const vehicle of data) published.add(vehicle.id);
  if (data.length < 500) break;
}
const rows = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await supabase.from("vehicle_images").select("id,vehicle_id,storage_path,r2_ready").range(from, from + 499);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 500) break;
}
const allPending = rows.filter((row) => published.has(row.vehicle_id) && row.r2_ready && !done.has(row.id));
const limit = process.env.R2_REFRESH_LIMIT ? Number(process.env.R2_REFRESH_LIMIT) : allPending.length;
if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("R2_REFRESH_LIMIT must be a positive integer.");
const pending = allPending.slice(0, limit);
console.log(`Refreshing ${pending.length} published photos from R2; ${done.size} already completed.`);
let index = 0;
const failed = [];
async function worker() {
  while (index < pending.length) {
    const row = pending[index++];
    try {
      if (!/^[a-f\d-]{36}\/[a-f\d-]{36}\.(webp|jpe?g|png|avif)$/i.test(row.storage_path)) throw new Error("invalid path");
      const prefix = `vehicles/${row.storage_path}`;
      const response = await fetch(`${base}/${prefix}/1600.webp`);
      if (!response.ok) throw new Error(`R2 source returned ${response.status}`);
      const source = Buffer.from(await response.arrayBuffer());
      await sharp(source, { failOn: "error" }).metadata();
      // Write the largest variant last, so a retry still starts from the unmodified source.
      for (const width of widths) {
        const body = await sharp(source).resize({ width, withoutEnlargement: true })
          .sharpen({ sigma: width <= 400 ? 0.4 : 0.6 })
          .webp({ quality: width <= 400 ? 84 : 90, effort: 4 }).toBuffer();
        await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `${prefix}/${width}.webp`, Body: body,
          ContentType: "image/webp", CacheControl: "public, max-age=300, s-maxage=300" }));
      }
      await appendFile(checkpoint, `${row.id}\n`);
      done.add(row.id);
      if (done.size % 50 === 0) console.log(`Refreshed ${done.size} photos.`);
    } catch (error) {
      failed.push(row.id);
      console.error(`Failed ${row.id}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
try {
  await Promise.all(Array.from({ length: 8 }, () => worker()));
  console.log(`Finished: ${done.size} refreshed, ${failed.length} failed.`);
  if (failed.length) process.exitCode = 1;
} finally {
  r2.destroy();
}
