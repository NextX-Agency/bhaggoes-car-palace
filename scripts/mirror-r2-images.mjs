// One-time local backfill. Run with: node --env-file=.env.local scripts/mirror-r2-images.mjs
// The checkpoint in tmp/ lets the job resume without fetching an image twice.
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { mkdir, readFile, appendFile } from "node:fs/promises";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } });
const r2 = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
const checkpoint = "tmp/r2-mirrored-ids.txt";
const widths = [160, 400, 800, 1200, 1600];
await mkdir("tmp", { recursive: true });
const done = new Set((await readFile(checkpoint, "utf8").catch(() => "")).split("\n").filter(Boolean));

const vehicles = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await supabase.from("vehicles").select("id").eq("published", true).is("archived_at", null).range(from, from + 499);
  if (error) throw error;
  vehicles.push(...data);
  if (data.length < 500) break;
}
const rows = [];
for (let from = 0; ; from += 500) {
  const { data, error } = await supabase.from("vehicle_images").select("id,vehicle_id,storage_path,r2_ready").range(from, from + 499);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 500) break;
}
const published = new Set(vehicles.map((vehicle) => vehicle.id));
const pending = rows.filter((row) => published.has(row.vehicle_id) && !row.r2_ready && !done.has(row.id));
console.log(`Found ${pending.length} published photos to copy; ${done.size} already copied in this run.`);
let index = 0; let failed = 0;
async function worker() {
  while (index < pending.length) {
    const row = pending[index++];
    try {
      if (!/^[a-f\d-]{36}\/[a-f\d-]{36}\.(webp|jpe?g|png|avif)$/i.test(row.storage_path)) throw new Error("path");
      const { data, error } = await supabase.storage.from("vehicle-images").download(row.storage_path);
      if (error || !data) throw error ?? new Error("download");
      const source = Buffer.from(await data.arrayBuffer());
      for (const width of widths) {
        const body = await sharp(source, { failOn: "error" }).rotate().resize({ width, withoutEnlargement: true })
          .webp({ quality: width <= 400 ? 78 : 84, effort: 4 }).toBuffer();
        await r2.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `vehicles/${row.storage_path}/${width}.webp`,
          Body: body, ContentType: "image/webp", CacheControl: "public, max-age=300, s-maxage=300" }));
      }
      await appendFile(checkpoint, `${row.id}\n`);
      done.add(row.id);
      if (done.size % 25 === 0) console.log(`Copied ${done.size} photos.`);
    } catch (error) { failed++; console.error(`Could not copy ${row.id}: ${error instanceof Error ? error.message : error}`); }
  }
}
await Promise.all(Array.from({ length: 12 }, () => worker()));
r2.destroy();
console.log(`Finished: ${done.size} copied, ${failed} failed.`);
