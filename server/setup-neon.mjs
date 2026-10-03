// One-time setup for a fresh Postgres (Neon) database: create the schema, seed the
// catalog/settings/demo users via the app's own bootstrap, then set the founder admin
// credentials from environment variables (the real password is never stored in source).
//
//   DATABASE_URL=postgresql://.../dbname?sslmode=require \
//   ADMIN_PHONE=775784158 ADMIN_NAME="RWAMIGABO Innocent" ADMIN_PASSWORD='...' \
//   node setup-neon.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { ensureSeeded } from "../functions/lib/bootstrap.mjs";
import { findOne, insertRow, updateRow } from "../functions/lib/db.mjs";
import { hashPassword, newSalt, newId, now, digits } from "../functions/lib/util.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeDbUrl(raw) {
  let u = String(raw).replace(/[&?]channel_binding=require/, "");
  u = u.replace(/([?&])sslmode=(?:require|prefer|verify-ca)/, "$1sslmode=verify-full");
  return u;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// Keep timestamp handling identical to the runtime server.
const { types } = pg;
for (const oid of [1184, 1114]) {
  const base = types.getTypeParser(oid);
  types.setTypeParser(oid, (v) => {
    if (v == null) return v;
    const d = base(v);
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : v;
  });
}

const pool = new pg.Pool({ connectionString: normalizeDbUrl(process.env.DATABASE_URL), ssl: { rejectUnauthorized: true }, max: 5 });

try {
  console.log("[setup] applying schema.sql ...");
  const schema = await readFile(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  console.log("[setup] seeding catalog, settings and demo users (skipped if already present) ...");
  await ensureSeeded(pool);

  const phone = digits(process.env.ADMIN_PHONE || "775784158", 15);
  const name = (process.env.ADMIN_NAME || "RWAMIGABO Innocent").trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (password.length < 6) {
    console.warn("[setup] ADMIN_PASSWORD not provided (or < 6 chars) — skipping founder admin.");
    console.warn("[setup] The seeded admin still uses the placeholder password from seed-data.mjs.");
    console.warn("[setup] Re-run with ADMIN_PASSWORD set to change it.");
  } else {
    const salt = newSalt();
    const passHash = await hashPassword(password, salt);
    const existing = await findOne(pool, "users", "id", { phone });
    if (existing) {
      await updateRow(pool, "users", { name, role: "admin", pass_hash: passHash, pass_salt: salt }, { id: existing.id }, "id");
      console.log(`[setup] updated founder admin ${phone} (${name}).`);
    } else {
      await insertRow(pool, "users", {
        id: newId(), role: "admin", name, phone, email: null,
        pass_hash: passHash, pass_salt: salt, created_at: now(),
      }, "id");
      console.log(`[setup] created founder admin ${phone} (${name}).`);
    }
  }

  const counts = {};
  for (const t of ["users", "categories", "products", "delivery_zones", "coupons", "settings"]) {
    const r = await pool.query(`SELECT count(*)::int AS n FROM ${'"' + t + '"'}`);
    counts[t] = r.rows[0].n;
  }
  console.log("[setup] done. row counts:", JSON.stringify(counts));
} catch (err) {
  console.error("[setup] FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
