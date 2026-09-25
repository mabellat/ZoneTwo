import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const imageryPath = join(dirname(fileURLToPath(import.meta.url)), "../lib/imagery.ts");
const text = readFileSync(imageryPath, "utf8");
const ids = [...new Set(text.matchAll(/photo-\d+-[a-f0-9]+/g).map((m) => m[0]))];

let failed = 0;
for (const id of ids) {
  const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=80`;
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  const ok = res.status === 200;
  console.log(ok ? "OK" : `FAIL ${res.status}`, id);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} photo id(s) return non-200 — update lib/imagery.ts`);
  process.exit(1);
}

console.log(`\n${ids.length} unique photo id(s) OK`);
