import { hashPassword } from "../functions/lib/util.mjs";
import * as data from "./seed-data.mjs";

const BASE = "2026-10-01T09:00:00.000Z";
const SALT = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

const TABLE_HEX = {
  categories: "00000001", products: "00000002", product_variants: "00000003",
  delivery_zones: "00000004", coupons: "00000005", reward_campaigns: "00000006",
  delivery_staff: "00000007", users: "00000008", packages: "00000009",
  package_items: "0000000a", addresses: "0000000b",
};

const counters = {};
export function sid(table) {
  counters[table] = (counters[table] || 0) + 1;
  return `${TABLE_HEX[table]}-0000-4000-8000-9${String(counters[table]).padStart(11, "0")}`;
}

export async function buildSeed() {
  const db = {
    users: [], sessions: [], addresses: [], categories: [], products: [], product_variants: [],
    favorites: [], packages: [], package_items: [], orders: [], order_items: [], order_events: [],
    payments: [], coupons: [], bonus_transactions: [], reward_campaigns: [], notifications: [],
    delivery_zones: [], delivery_staff: [], settings: [],
  };

  for (const category of data.categories) {
    db.categories.push({ id: sid("categories"), slug: category.slug, name: category.name, description: category.description, icon: category.icon, sort: category.sort });
  }
  const categoryBySlug = new Map(db.categories.map((c) => [c.slug, c]));

  for (const product of data.products) {
    const productId = sid("products");
    db.products.push({
      id: productId, category_id: categoryBySlug.get(product.category).id, name: product.name,
      slug: product.slug, description: product.description, image_url: product.image,
      price: product.price, compare_price: product.compare ?? null, stock: product.stock,
      active: true, rating: 4.6, sold_count: 0, created_at: BASE,
    });
    for (const variant of product.variants || []) {
      db.product_variants.push({ id: sid("product_variants"), product_id: productId, kind: variant.kind, label: variant.label, price_delta: variant.price_delta, stock: variant.stock });
    }
  }
  const productBySlug = new Map(db.products.map((p) => [p.slug, p]));

  for (const zone of data.zones) {
    db.delivery_zones.push({ id: sid("delivery_zones"), slug: zone.slug, name: zone.name, fee: zone.fee, cod_enabled: zone.cod, lat: zone.lat, lng: zone.lng, radius_km: zone.radius, active: true });
  }

  for (const coupon of data.coupons) {
    db.coupons.push({
      id: sid("coupons"), code: coupon.code, kind: coupon.kind, value: coupon.value, min_order: coupon.min,
      expires_at: new Date(new Date(BASE).getTime() + coupon.days * 86400000).toISOString(),
      usage_limit: coupon.limit, used_count: 0, active: true,
      category_id: coupon.categorySlug ? categoryBySlug.get(coupon.categorySlug).id : null,
    });
  }

  for (const campaign of data.campaigns) {
    db.reward_campaigns.push({ id: sid("reward_campaigns"), name: campaign.name, kind: campaign.kind, value: campaign.value, threshold: campaign.threshold, active: campaign.active, created_at: BASE });
  }

  for (const member of data.staff) {
    db.delivery_staff.push({ id: sid("delivery_staff"), name: member.name, phone: member.phone, active: member.active });
  }

  for (const [key, value] of Object.entries(data.settings)) {
    db.settings.push({ key, value });
  }

  for (const account of data.accounts) {
    db.users.push({
      id: sid("users"), role: account.role, name: account.name, phone: account.phone, email: null,
      pass_hash: await hashPassword(account.password, SALT), pass_salt: SALT, created_at: BASE,
    });
  }
  const demo = db.users.find((u) => u.role === "customer");
  const plateau = db.delivery_zones.find((z) => z.slug === "plateau");
  db.addresses.push({
    id: sid("addresses"), user_id: demo.id, label: "Home", recipient_name: demo.name, phone: demo.phone,
    zone_id: plateau.id, address_text: "Rue 14 x Avenue Cheikh Anta Diop, Dakar", lat: 14.6937, lng: -17.4441, is_default: true, created_at: BASE,
  });

  for (const preset of data.presetPackages) {
    const packageId = sid("packages");
    db.packages.push({ id: packageId, user_id: null, name: preset.name, description: preset.description, discount_percent: 0, active: true, created_at: BASE });
    for (const item of preset.items) {
      db.package_items.push({ id: sid("package_items"), package_id: packageId, product_id: productBySlug.get(item.slug).id, variant_id: null, qty: item.qty });
    }
  }

  return db;
}
