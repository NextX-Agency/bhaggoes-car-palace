// Checks the current database paths against every R2 variant before the SQL cutover.
// Run with: node --env-file=.env.local scripts/verify-r2-images.mjs
import { createClient } from "@supabase/supabase-js";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } });
const r2 = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
const keys = new Set();
let bytes = 0;
let token;
do {
  const page = await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET, Prefix: "vehicles/", ContinuationToken: token }));
  for (const object of page.Contents ?? []) if (object.Key) { keys.add(object.Key); bytes += object.Size ?? 0; }
  token = page.NextContinuationToken;
} while (token);
r2.destroy();

async function allRows(table, columns, filters = (query) => query) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await filters(supabase.from(table).select(columns)).range(from, from + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
const vehicles = new Set((await allRows("vehicles", "id", (q) => q.eq("published", true).is("archived_at", null))).map((v) => v.id));
const images = await allRows("vehicle_images", "id,vehicle_id,storage_path,r2_ready");
const expected = images.filter((row) => vehicles.has(row.vehicle_id) && !row.r2_ready && !row.storage_path.startsWith("/images/"));
const verified = expected.filter((row) => [160, 400, 800, 1200, 1600].every((width) => keys.has(`vehicles/${row.storage_path}/${width}.webp`)));
await mkdir("tmp", { recursive: true });
await writeFile("tmp/r2-verified-ids.txt", verified.map((row) => `${row.id}\t${row.storage_path}`).join("\n") + "\n");
console.log(`Verified ${verified.length} of ${expected.length} current published photos against ${keys.size} R2 objects (${(bytes / 1024 ** 3).toFixed(2)} GiB).`);
