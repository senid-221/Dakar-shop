import { fail, ok, int, str, uid, ORDER_STATUSES, STATUS_LABELS } from "../lib/util.mjs";
import { findOne, findMany, getSettings } from "../lib/db.mjs";

const PRODUCT_COLS = "id,category_id,name,slug,description,image_url,price,compare_price,stock,active,rating,sold_count,created_at";

export function packageDiscount(settings, itemCount) {
  const tiers = settings.packageTiers || [{ minItems: 3, pct: 5 }, { minItems: 5, pct: 8 }, { minItems: 8, pct: 10 }];
  let pct = 0;
  for (const tier of tiers) if (itemCount >= tier.minItems && tier.pct > pct) pct = tier.pct;
  return pct;
}

export async function publicRoutes(ctx, segments, url) {
  const { supabase } = ctx;
  const [head, second] = segments;

  if (head === "categories") {
    const rows = await findMany(supabase, "categories", "id,slug,name,description,icon,sort", { order: { column: "sort" }, limit: 20 });
    return ok({ categories: rows });
  }

  if (head === "products" && !second) {
    const category = str(url.searchParams.get("category"), 40);
    const q = str(url.searchParams.get("q"), 60);
    const sort = str(url.searchParams.get("sort"), 20) || "popular";
    const limit = int(url.searchParams.get("limit"), { min: 1, max: 48 }) || 12;
    const offset = int(url.searchParams.get("offset"), { min: 0, max: 500 }) || 0;
    const filters = { active: true };
    if (category) {
      const cat = await findOne(supabase, "categories", "id", { slug: category });
      if (!cat) return ok({ products: [], total: 0 });
      filters.category_id = cat.id;
    }
    const order = sort === "price_asc" ? { column: "price", ascending: true }
      : sort === "price_desc" ? { column: "price", ascending: false }
      : sort === "new" ? { column: "created_at", ascending: false }
      : { column: "sold_count", ascending: false };
    const rows = await findMany(supabase, "products", PRODUCT_COLS, {
      filters, ilike: q ? { column: "name", value: q } : undefined, order, limit, offset,
    });
    return ok({ products: rows });
  }

  if (head === "products" && second) {
    const id = uid(second);
    if (!id) return fail("not_found", 404);
    const product = await findOne(supabase, "products", PRODUCT_COLS, { id, active: true });
    if (!product) return fail("not_found", 404);
    const variants = await findMany(supabase, "product_variants", "id,product_id,kind,label,price_delta,stock", { filters: { product_id: id }, limit: 40 });
    return ok({ product, variants });
  }

  if (head === "zones") {
    const rows = await findMany(supabase, "delivery_zones", "id,slug,name,fee,cod_enabled,lat,lng,radius_km", { filters: { active: true }, limit: 40 });
    return ok({ zones: rows });
  }

  if (head === "settings") {
    const settings = await getSettings(supabase);
    return ok({
      settings: {
        packageTiers: settings.packageTiers || [],
        codGlobal: settings.codGlobal !== false,
        bonusEarnPercent: settings.bonusEarnPercent ?? 2,
        supportWhatsApp: settings.supportWhatsApp || "",
        storeName: settings.storeName || "Citymarket Dakar",
      },
    });
  }

  if (head === "coupons" && second === "available") {
    const rows = await findMany(supabase, "coupons", "code,kind,value,min_order,expires_at,active", { filters: { active: true }, limit: 20 });
    const live = rows.filter((row) => new Date(row.expires_at).getTime() > Date.now());
    return ok({ coupons: live });
  }

  if (head === "packages" && second === "presets") {
    const rows = await findMany(supabase, "packages", "id,name,description,discount_percent", { filters: { user_id: null, active: true }, limit: 12 });
    const items = rows.length
      ? await findMany(supabase, "package_items", "id,package_id,product_id,variant_id,qty", { inFilters: { package_id: rows.map((r) => r.id) }, limit: 100 })
      : [];
    return ok({ packages: rows.map((row) => ({ ...row, items: items.filter((i) => i.package_id === row.id) })) });
  }

  if (head === "package" && second === "quote" && ctx.request.method === "POST") {
    const body = await ctx.request.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items.slice(0, 30) : [];
    return quoteItems(supabase, items);
  }

  if (head === "track" && second) {
    const code = str(second, 20).toUpperCase();
    const order = await findOne(supabase, "orders", "id,code,status,delivery_fee,total,created_at,gift", { code });
    if (!order) return fail("not_found", 404);
    const events = await findMany(supabase, "order_events", "status,note,created_at", { filters: { order_id: order.id }, order: { column: "created_at" }, limit: 30 });
    const items = await findMany(supabase, "order_items", "name_snapshot,qty,unit_price", { filters: { order_id: order.id }, limit: 40 });
    return ok({
      order: {
        code: order.code,
        status: order.status,
        statusLabel: STATUS_LABELS[order.status] || order.status,
        total: order.total,
        created_at: order.created_at,
        isGift: !!order.gift,
      },
      events: events.map((e) => ({ ...e, label: STATUS_LABELS[e.status] || e.status })),
      items,
    });
  }

  if (head === "delivery" && second === "fee") {
    const zoneSlug = str(url.searchParams.get("zone"), 40);
    const zone = await findOne(supabase, "delivery_zones", "name,fee,cod_enabled", { slug: zoneSlug, active: true });
    if (!zone) return fail("unknown_zone");
    const settings = await getSettings(supabase);
    return ok({ fee: zone.fee, codEnabled: zone.cod_enabled && settings.codGlobal !== false });
  }

  return null;
}

export async function quoteItems(supabase, items) {
  const clean = [];
  for (const item of items) {
    const productId = uid(item.productId);
    const qty = int(item.qty, { min: 1, max: 50 });
    if (!productId || !qty) continue;
    const variantId = item.variantId ? uid(item.variantId) : null;
    clean.push({ productId, variantId, qty });
  }
  if (!clean.length) return fail("empty_package");
  const productIds = [...new Set(clean.map((i) => i.productId))];
  const products = await findMany(supabase, "products", "id,name,price,image_url", { inFilters: { id: productIds }, limit: 40 });
  const byId = new Map(products.map((p) => [p.id, p]));
  const variantIds = clean.filter((i) => i.variantId).map((i) => i.variantId);
  const variants = variantIds.length
    ? await findMany(supabase, "product_variants", "id,label,price_delta", { inFilters: { id: variantIds }, limit: 60 })
    : [];
  const variantById = new Map(variants.map((v) => [v.id, v]));
  let subtotal = 0;
  const lines = [];
  for (const item of clean) {
    const product = byId.get(item.productId);
    if (!product) continue;
    const variant = item.variantId ? variantById.get(item.variantId) : null;
    const unit = product.price + (variant?.price_delta || 0);
    subtotal += unit * item.qty;
    lines.push({ productId: item.productId, variantId: item.variantId, qty: item.qty, name: product.name, variantLabel: variant?.label || null, unitPrice: unit, image: product.image_url });
  }
  const settings = await getSettings(supabase);
  const totalItems = clean.reduce((sum, i) => sum + i.qty, 0);
  const pct = packageDiscount(settings, totalItems);
  const discount = Math.round((subtotal * pct) / 100);
  return ok({ lines, subtotal, discountPercent: pct, discount, total: subtotal - discount, itemCount: totalItems });
}
