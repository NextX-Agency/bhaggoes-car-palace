// Import missing catalog logos from the VehicleSpecs brand-logos collection.
// Run manually: node scripts/import-brand-logos.mjs
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = await fs.readFile(path.join(root, "src/lib/vehicle-catalog.ts"), "utf8");
const current = await fs.readFile(path.join(root, "src/components/brand-logo.tsx"), "utf8");
const list = catalog.match(/export const vehicleMakes = \[([\s\S]*?)\] as const/)?.[1];
if (!list) throw new Error("Could not read vehicleMakes");
const makes = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const existing = new Set([...current.matchAll(/^  ([a-z0-9]+): (?:si|"\/brands\/)/gm)].map((match) => match[1]));
const key = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const response = await fetch("https://raw.githubusercontent.com/vehiclespecs/brand-logos/main/brands.json");
if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
const manifest = await response.json();
const manifestByName = new Map(Object.entries(manifest).map(([name, filename]) => [key(name), filename]));
const aliases = { "Citroën": "Citroen", "DS Automobiles": "DS", "Škoda": "Skoda" };
const target = path.join(root, "src/lib/vehicle-brand-assets.json");
const output = JSON.parse(await fs.readFile(target, "utf8"));
let imported = 0;

for (const make of makes) {
  if (existing.has(key(make)) || output[make]) continue;
  const filename = manifestByName.get(key(aliases[make] ?? make));
  if (!filename || !/^[a-z0-9-]+-logo\.(svg|png)$/i.test(filename)) continue;
  const url = `https://raw.githubusercontent.com/vehiclespecs/brand-logos/main/${filename}`;
  const asset = await fetch(url);
  if (!asset.ok) throw new Error(`${make}: HTTP ${asset.status}`);
  const bytes = Buffer.from(await asset.arrayBuffer());
  if (filename.endsWith(".svg")) {
    const svg = bytes.toString("utf8");
    if (!svg.includes("<svg") || /<script|<foreignObject|\bon\w+\s*=|javascript:|<iframe/i.test(svg)) throw new Error(`${make}: unsafe SVG`);
  } else if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${make}: invalid PNG`);
  const localName = `vs-${filename}`;
  await fs.writeFile(path.join(root, "public/brands", localName), bytes);
  output[make] = `/brands/${localName}`;
  imported++;
  console.log(`${make}: ${localName}`);
}

await fs.writeFile(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${imported} logos`);
