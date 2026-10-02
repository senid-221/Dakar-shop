import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSeed } from "./seed-build.mjs";

const db = await buildSeed();
writeFileSync(resolve(process.cwd(), "dev/db.json"), JSON.stringify(db, null, 1));
console.log("seeded dev/db.json:", Object.entries(db).map(([k, v]) => `${k}=${v.length}`).join(" "));
