// Generates the cloud database schema SQL (restricted DDL subset) matching the app's tables.
// Seed data is NOT part of the migration — it is inserted by functions/lib/bootstrap.mjs on first run.
// Usage: node scripts/gen-migration-sql.mjs [outFile]   (default: scripts/migration.sql)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : join(root, "scripts/migration.sql");

// Cloud-supported types only: boolean, integer, bigint, text, uuid, timestamptz, jsonb.
// Floating-point values (lat, lng, rating) are stored as jsonb numbers.
const T = {
  users: { id: "uuid PK", role: "text NOT NULL", name: "text NOT NULL", phone: "text NOT NULL", email: "text", pass_hash: "text NOT NULL", pass_salt: "text NOT NULL", created_at: "timestamptz NOT NULL" },
  sessions: { id: "text PK", user_id: "uuid NOT NULL", created_at: "timestamptz NOT NULL", expires_at: "timestamptz NOT NULL" },
  addresses: { id: "uuid PK", user_id: "uuid NOT NULL", label: "text", recipient_name: "text", phone: "text", zone_id: "uuid", address_text: "text", lat: "jsonb", lng: "jsonb", is_default: "boolean", created_at: "timestamptz" },
  categories: { id: "uuid PK", slug: "text UNIQUE", name: "text NOT NULL", description: "text", icon: "text", sort: "integer" },
  products: { id: "uuid PK", category_id: "uuid NOT NULL", name: "text NOT NULL", slug: "text", description: "text", image_url: "text", price: "integer NOT NULL", compare_price: "integer", stock: "integer", active: "boolean", rating: "jsonb", sold_count: "integer", created_at: "timestamptz" },
  product_variants: { id: "uuid PK", product_id: "uuid NOT NULL", kind: "text", label: "text NOT NULL", price_delta: "integer", stock: "integer" },
  favorites: { id: "uuid PK", user_id: "uuid NOT NULL", product_id: "uuid NOT NULL", created_at: "timestamptz" },
  packages: { id: "uuid PK", user_id: "uuid", name: "text NOT NULL", description: "text", discount_percent: "integer", active: "boolean", created_at: "timestamptz" },
  package_items: { id: "uuid PK", package_id: "uuid NOT NULL", product_id: "uuid NOT NULL", variant_id: "uuid", qty: "integer" },
  orders: { id: "uuid PK", code: "text UNIQUE", user_id: "uuid NOT NULL", status: "text NOT NULL", subtotal: "integer", package_discount: "integer", coupon_discount: "integer", bonus_discount: "integer", delivery_fee: "integer", total: "integer", coupon_code: "text", address_snapshot: "jsonb", gift: "jsonb", payment_method: "text", zone_id: "uuid", delivery_staff_id: "uuid", created_at: "timestamptz", updated_at: "timestamptz" },
  order_items: { id: "uuid PK", order_id: "uuid NOT NULL", product_id: "uuid", variant_id: "uuid", name_snapshot: "text", qty: "integer", unit_price: "integer" },
  order_events: { id: "uuid PK", order_id: "uuid NOT NULL", status: "text", note: "text", created_at: "timestamptz" },
  payments: { id: "uuid PK", order_id: "uuid NOT NULL", method: "text", status: "text", reference: "text", confirmed_by: "uuid", created_at: "timestamptz", updated_at: "timestamptz" },
  coupons: { id: "uuid PK", code: "text UNIQUE", kind: "text", value: "integer", min_order: "integer", expires_at: "text", usage_limit: "integer", used_count: "integer", active: "boolean", category_id: "uuid" },
  bonus_transactions: { id: "uuid PK", user_id: "uuid NOT NULL", amount: "integer", reason: "text", created_at: "timestamptz" },
  reward_campaigns: { id: "uuid PK", name: "text", kind: "text", value: "integer", threshold: "integer", active: "boolean", created_at: "timestamptz" },
  notifications: { id: "uuid PK", user_id: "uuid NOT NULL", title: "text", body: "text", kind: "text", read: "boolean", created_at: "timestamptz" },
  delivery_zones: { id: "uuid PK", slug: "text", name: "text NOT NULL", fee: "integer", cod_enabled: "boolean", lat: "jsonb", lng: "jsonb", radius_km: "integer", active: "boolean" },
  delivery_staff: { id: "uuid PK", name: "text NOT NULL", phone: "text", active: "boolean" },
  settings: { key: "text PK", value: "text" },
};

const INDEXES = [
  ["sessions", "user_id"], ["addresses", "user_id"], ["products", "category_id"], ["product_variants", "product_id"],
  ["package_items", "package_id"], ["favorites", "user_id"], ["favorites", "product_id"], ["orders", "user_id"], ["order_items", "order_id"],
  ["order_events", "order_id"], ["payments", "order_id"], ["notifications", "user_id"], ["bonus_transactions", "user_id"],
];

const out = [];
for (const [table, cols] of Object.entries(T)) {
  const defs = Object.entries(cols).map(([c, t]) => {
    const pk = /PK/.test(t) ? " PRIMARY KEY" : "";
    const unique = t.includes("UNIQUE") ? " UNIQUE" : "";
    const clean = t.replace(/ ?PK[12]?/, "").replace(/ ?UNIQUE/, "").trim();
    return `  ${c} ${clean}${unique}${pk}`;
  });
  out.push(`CREATE TABLE app.${table} (\n${defs.join(",\n")}\n);`);
}
out.push("");
for (const [table, col] of INDEXES) out.push(`CREATE INDEX ${table}_${col}_idx ON app.${table} (${col});`);

writeFileSync(outFile, out.join("\n") + "\n", "utf8");
console.log(`Wrote ${outFile} (${Object.keys(T).length} tables, ${INDEXES.length} indexes)`);
