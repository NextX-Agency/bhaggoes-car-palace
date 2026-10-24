// Refresh the supplemental model suggestions from the public NHTSA vPIC API.
// Run: node scripts/update-vpic-models.mjs
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/lib/vehicle-catalog.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context, { filename: "vehicle-catalog.ts" });
const makes = Array.from(context.exports.vehicleMakes);
// vPIC's make-name search is fuzzy for these short names (MAN and Ora match
// unrelated manufacturers), and mixes motorcycles into the three auto brands.
const excludeUnreliable = new Set(["MAN", "Ora", "Honda", "Suzuki", "BMW"]);
const target = path.join(root, "src/lib/vehicle-models-vpic.json");
const previous = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : null;

function key(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function fetchMakeIds() {
  const response = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json", { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GetAllMakes: HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.Results) || data.Results.length < 1000) throw new Error("GetAllMakes returned an incomplete response");
  const byName = new Map();
  for (const row of data.Results) {
    const normalized = key(row.Make_Name);
    if (!byName.has(normalized)) byName.set(normalized, []);
    byName.get(normalized).push(row.Make_ID);
  }
  return byName;
}

async function fetchModels(make, makeId) {
  if (makeId == null) return [];
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/${makeId}?format=json`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.Results)) throw new Error("Invalid vPIC response");
      return [...new Set(data.Results.map((row) => row.Model_Name?.trim()).filter(Boolean))]
        .filter((model) => !/[\x00-\x1f\x7f]/.test(model))
        .sort((a, b) => a.localeCompare(b, "en"));
    } catch (error) {
      if (attempt === 4) throw new Error(`${make}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }
}

async function main() {
  const makeIds = await fetchMakeIds();
  const models = {};
  // Small batches avoid overwhelming the public service.
  for (let i = 0; i < makes.length; i += 4) {
    const batch = makes.slice(i, i + 4);
    const results = await Promise.all(batch.map((make) => {
      const exactIds = makeIds.get(key(make)) ?? [];
      return excludeUnreliable.has(make) || exactIds.length !== 1
        ? Promise.resolve([])
        : fetchModels(make, exactIds[0]);
    }));
    batch.forEach((make, index) => {
      const earlier = previous?.models?.[make]?.length ?? 0;
      if (!excludeUnreliable.has(make) && (makeIds.get(key(make)) ?? []).length === 1 && earlier > 0 && results[index].length === 0) {
        throw new Error(`${make}: unexpected empty result (previous snapshot had ${earlier}); snapshot preserved`);
      }
      models[make] = results[index];
    });
    process.stdout.write(`Fetched ${Math.min(i + 4, makes.length)}/${makes.length} makes\r`);
  }
  const snapshot = {
    source: "https://vpic.nhtsa.dot.gov/api/vehicles/",
    retrievedAt: new Date().toISOString(),
    notes: "NHTSA vPIC GetAllMakes and exact GetModelsForMakeId results supplement the curated Suriname/Japan import list. US regulatory coverage is incomplete worldwide. Unmatched or ambiguous make names are left for editorial data. MAN, Ora, Honda, Suzuki and BMW are excluded because their results include unrelated vehicles or motorcycles.",
    models,
  };
  fs.writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`\nSaved ${Object.values(models).flat().length} models to ${target}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
