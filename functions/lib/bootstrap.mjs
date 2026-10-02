import { hashPassword } from "./util.mjs";
import { findMany, insertRows, encodeSetting } from "./db.mjs";
import * as data from "./seed-data.mjs";

// First-run catalog bootstrap: the cloud migration API is DDL-only, so seed rows
// are inserted here the first time the Function sees an empty database.
const BASE = "2026-10-01T09:00:00.000Z";
const SALT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

const TABLE_HEX = {
  categories: "00000001", products: "00000002", product_variants: "00000003",
  delivery_zones: "00000004", coupons: "00000005", reward_campaigns: "00000006",
  delivery_staff: "00000007", users: "00000008", packages: "00000009",
  package_items: "0000000a",
};
const counters = {};
function sid(table) {
  counters[table] = (counters[table] || 0) + 1;
  return `${TABLE_HEX[table]}-0000-4000-8000-9${String(counters[table]).padStart(11, "0")}`;
}

let seedPromise = null;
export function ensureSeeded(supabase) {
  if (!seedPromise) {
    seedPromise = seed(supabase).catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function seed(supabase) {
  const existing = await findMany(supabase, "categories", "id", { limit: 1 });
  if (existing.length) return;

  const categories = data.categories.map((c) => ({ id: sid("categories"), slug: c.slug, name: c.name, description: c.description, icon: c.icon, sort: c.sort }));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const products = [];
  const variants = [];
  for (const p of data.products) {
    const productId = sid("products");
    products.push({
      id: productId, category_id: categoryBySlug.get(p.category).id, name: p.name,
      slug: p.slug, description: p.description, image_url: p.image,
      price: p.price, compare_price: p.compare ?? null, stock: p.stock,
      active: true, rating: 4.6, sold_count: 0, created_at: BASE,
    });
    for (const v of p.variants || []) {
      variants.push({ id: sid("product_variants"), product_id: productId, kind: v.kind, label: v.label, price_delta: v.price_delta, stock: v.stock });
    }
  }
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  const zones = data.zones.map((z) => ({ id: sid("delivery_zones"), slug: z.slug, name: z.name, fee: z.fee, cod_enabled: z.cod, lat: z.lat, lng: z.lng, radius_km: z.radius, active: true }));

  const coupons = data.coupons.map((c) => ({
    id: sid("coupons"), code: c.code, kind: c.kind, value: c.value, min_order: c.min,
    expires_at: new Date(new Date(BASE).getTime() + c.days * 86400000).toISOString(),
    usage_limit: c.limit, used_count: 0, active: true,
    category_id: c.categorySlug ? categoryBySlug.get(c.categorySlug).id : null,
  }));

  const campaigns = data.campaigns.map((c) => ({ id: sid("reward_campaigns"), name: c.name, kind: c.kind, value: c.value, threshold: c.threshold, active: c.active, created_at: BASE }));
  const staff = data.staff.map((m) => ({ id: sid("delivery_staff"), name: m.name, phone: m.phone, active: m.active }));
  const settings = Object.entries(data.settings).map(([key, value]) => ({ key, value: encodeSetting(value) }));

  const users = [];
  for (const account of data.accounts) {
    users.push({
      id: sid("users"), role: account.role, name: account.name, phone: account.phone, email: null,
      pass_hash: await hashPassword(account.password, SALT), pass_salt: SALT, created_at: BASE,
    });
  }

  const packages = [];
  const packageItems = [];
  for (const preset of data.presetPackages) {
    const packageId = sid("packages");
    packages.push({ id: packageId, user_id: null, name: preset.name, description: preset.description, discount_percent: 0, active: true, created_at: BASE });
    for (const item of preset.items) {
      packageItems.push({ id: sid("package_items"), package_id: packageId, product_id: productBySlug.get(item.slug).id, variant_id: null, qty: item.qty });
    }
  }

  await insertRows(supabase, "users", users);
  await insertRows(supabase, "categories", categories);
  await insertRows(supabase, "products", products);
  await insertRows(supabase, "product_variants", variants);
  await insertRows(supabase, "delivery_zones", zones);
  await insertRows(supabase, "coupons", coupons);
  await insertRows(supabase, "reward_campaigns", campaigns);
  await insertRows(supabase, "delivery_staff", staff);
  await insertRows(supabase, "settings", settings, "key");
  await insertRows(supabase, "packages", packages);
  await insertRows(supabase, "package_items", packageItems);
}
