import { fail, ok, readJson, int, str, uid, newId, now, orderCode, ORDER_STATUSES } from "../lib/util.mjs";
import { findOne, findMany, insertRow, insertRows, updateRow, requireUser, getSettings, notify, bonusBalance, addBonus } from "../lib/db.mjs";
import { packageDiscount } from "./public.mjs";

const CANCELABLE = ["order_placed", "payment_confirmed"];

export async function orderRoutes(ctx, segments) {
  const { supabase, request } = ctx;
  const [head, second, third] = segments;

  if (head === "orders" && !second && request.method === "POST") {
    const auth = await requireUser(ctx);
    if (auth.error) return auth.error;
    const user = auth.user;
    const body = (await readJson(request, 32 * 1024)) || {};
    const items = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
    if (!items.length) return fail("empty_cart");
    const paymentMethod = str(body.paymentMethod, 20);
    if (!["orange_money", "wave", "cod"].includes(paymentMethod)) return fail("invalid_payment_method");

    // Delivery target: saved address or one-off snapshot (gift recipient or guest-less checkout).
    let addressSnapshot = null;
    let zone = null;
    const addressId = uid(body.addressId);
    if (addressId) {
      const address = await findOne(supabase, "addresses", "id,label,recipient_name,phone,zone_id,address_text,lat,lng", { id: addressId, user_id: user.id });
      if (!address) return fail("address_not_found");
      zone = await findOne(supabase, "delivery_zones", "id,name,slug,fee,cod_enabled", { id: address.zone_id });
      addressSnapshot = { label: address.label, recipient: address.recipient_name, phone: address.phone, zone: zone?.name || "", address: address.address_text, lat: address.lat, lng: address.lng };
    } else if (body.address && typeof body.address === "object") {
      const a = body.address;
      const zoneSlug = str(a.zoneSlug, 40);
      zone = await findOne(supabase, "delivery_zones", "id,name,slug,fee,cod_enabled", { slug: zoneSlug, active: true });
      if (!zone) return fail("unknown_zone");
      addressSnapshot = {
        label: str(a.label, 40) || "Delivery location",
        recipient: str(a.recipient, 80),
        phone: str(a.phone, 20).replace(/\D/g, ""),
        zone: zone.name,
        address: str(a.address, 240),
        lat: typeof a.lat === "number" ? a.lat : null,
        lng: typeof a.lng === "number" ? a.lng : null,
      };
      if (!addressSnapshot.recipient || !addressSnapshot.phone || !addressSnapshot.address) return fail("incomplete_address");
    } else {
      return fail("address_required");
    }
    if (!zone) return fail("unknown_zone");

    // Gift option
    let gift = null;
    if (body.gift && typeof body.gift === "object" && body.gift.enabled) {
      gift = {
        recipient: str(body.gift.recipient, 80),
        phone: str(body.gift.phone, 20).replace(/\D/g, ""),
        address: str(body.gift.address, 240),
        message: str(body.gift.message, 300),
        notify: body.gift.notify !== false,
      };
      if (!gift.recipient || !gift.phone || !gift.address) return fail("incomplete_gift");
    }

    // Price the basket server-side.
    const productIds = [...new Set(items.map((i) => uid(i.productId)).filter(Boolean))];
    if (productIds.length !== items.length) return fail("invalid_items");
    const products = await findMany(supabase, "products", "id,name,price,stock,active", { inFilters: { id: productIds }, limit: 50 });
    const byId = new Map(products.map((p) => [p.id, p]));
    const variantIds = [...new Set(items.map((i) => uid(i.variantId)).filter(Boolean))];
    const variants = variantIds.length ? await findMany(supabase, "product_variants", "id,product_id,label,price_delta,stock", { inFilters: { id: variantIds }, limit: 80 }) : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const lines = [];
    const packageGroups = new Map();
    for (const item of items) {
      const product = byId.get(item.productId);
      const qty = int(item.qty, { min: 1, max: 50 });
      if (!product || !product.active || !qty) return fail("invalid_items");
      const variant = item.variantId ? variantById.get(item.variantId) : null;
      if (item.variantId && (!variant || variant.product_id !== product.id)) return fail("invalid_items");
      const available = variant ? variant.stock : product.stock;
      if (available != null && available < qty) return fail("insufficient_stock", 409, { product: product.name });
      const unit = product.price + (variant?.price_delta || 0);
      lines.push({ product, variant, qty, unit });
      const pkg = str(item.packageId, 40) || "__loose__";
      packageGroups.set(pkg, (packageGroups.get(pkg) || 0) + qty);
    }

    let subtotal = lines.reduce((sum, l) => sum + l.unit * l.qty, 0);

    // Package discount: each saved/builder package group qualifies on its own item count.
    const settings = await getSettings(supabase);
    let packageDiscountTotal = 0;
    let packageItemCount = 0;
    for (const [pkg, count] of packageGroups) {
      if (pkg === "__loose__") continue;
      packageItemCount += count;
      packageDiscountTotal += Math.round((subtotalOf(lines, items, pkg) * packageDiscount(settings, count)) / 100);
    }

    // Coupon
    let couponDiscount = 0;
    let couponCode = null;
    const code = str(body.couponCode, 40).toUpperCase();
    if (code) {
      const coupon = await findOne(supabase, "coupons", "id,code,kind,value,min_order,expires_at,usage_limit,used_count,active,category_id", { code });
      if (!coupon || !coupon.active) return fail("coupon_invalid");
      if (new Date(coupon.expires_at).getTime() < Date.now()) return fail("coupon_expired");
      if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) return fail("coupon_exhausted");
      const eligible = subtotal;
      if (eligible < coupon.min_order) return fail("coupon_min_order", 400, { minOrder: coupon.min_order });
      if (coupon.category_id) {
        const inCategory = lines.some((l) => l.product.category_id === coupon.category_id);
        if (!inCategory) return fail("coupon_category");
      }
      couponDiscount = coupon.kind === "percent" ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
      couponCode = coupon.code;
    }

    // Bonus wallet redemption
    let bonusUse = int(body.bonusUse, { min: 0, max: 1000000 }) || 0;
    if (bonusUse > 0) {
      const balance = await bonusBalance(supabase, user.id);
      const cap = Math.round((subtotal - packageDiscountTotal - couponDiscount) * 0.5);
      if (bonusUse > balance) return fail("bonus_insufficient");
      if (bonusUse > cap) return fail("bonus_cap", 400, { cap });
    }

    const codAllowed = zone.cod_enabled && settings.codGlobal !== false;
    if (paymentMethod === "cod" && !codAllowed) return fail("cod_unavailable_zone");

    const deliveryFee = zone.fee;
    const total = Math.max(0, subtotal - packageDiscountTotal - couponDiscount - bonusUse) + deliveryFee;

    const orderId = newId();
    const code2 = orderCode();
    const status = paymentMethod === "cod" ? "payment_confirmed" : "order_placed";
    const order = await insertRow(supabase, "orders", {
      id: orderId, code: code2, user_id: user.id, status,
      subtotal, package_discount: packageDiscountTotal, coupon_discount: couponDiscount,
      bonus_discount: bonusUse, delivery_fee: deliveryFee, total,
      coupon_code: couponCode, address_snapshot: addressSnapshot, gift,
      payment_method: paymentMethod, zone_id: zone.id, delivery_staff_id: null,
      created_at: now(), updated_at: now(),
    }, "id,code,status,total");

    await insertRows(supabase, "order_items", lines.map((l) => ({
      id: newId(), order_id: orderId, product_id: l.product.id, variant_id: l.variant?.id || null,
      name_snapshot: l.product.name + (l.variant ? ` (${l.variant.label})` : ""), qty: l.qty, unit_price: l.unit,
    })));
    await insertRow(supabase, "order_events", { id: newId(), order_id: orderId, status: "order_placed", note: "Order placed", created_at: now() });
    if (status === "payment_confirmed") {
      await insertRow(supabase, "order_events", { id: newId(), order_id: orderId, status: "payment_confirmed", note: "Cash on Delivery — pay the rider on arrival", created_at: now() });
    }
    await insertRow(supabase, "payments", {
      id: newId(), order_id: orderId, method: paymentMethod,
      status: paymentMethod === "cod" ? "cash_pending" : "awaiting_customer",
      reference: null, confirmed_by: null, created_at: now(), updated_at: now(),
    });

    // Stock decrement + coupon usage + bonus redemption ledger.
    for (const l of lines) {
      if (l.variant) await updateRow(supabase, "product_variants", { stock: (l.variant.stock ?? 0) - l.qty }, { id: l.variant.id });
      else await updateRow(supabase, "products", { stock: (l.product.stock ?? 0) - l.qty, sold_count: (l.product.sold_count || 0) + l.qty }, { id: l.product.id });
    }
    if (couponCode) {
      const coupon = await findOne(supabase, "coupons", "id,used_count", { code: couponCode });
      if (coupon) await updateRow(supabase, "coupons", { used_count: (coupon.used_count || 0) + 1 }, { id: coupon.id });
    }
    if (bonusUse > 0) await addBonus(supabase, user.id, -bonusUse, `Redeemed on order ${code2}`, orderId);

    return ok({ order: { id: order.id, code: order.code, status: order.status, total: order.total }, paymentMethod });
  }

  if (head === "orders" && second === "mine") {
    const auth = await requireUser(ctx);
    if (auth.error) return auth.error;
    const rows = await findMany(supabase, "orders", "id,code,status,total,created_at,payment_method,gift", { filters: { user_id: auth.user.id }, order: { column: "created_at", ascending: false }, limit: 50 });
    return ok({ orders: rows });
  }

  if (head === "orders" && second && !third) {
    const auth = await requireUser(ctx);
    if (auth.error) return auth.error;
    const id = uid(second);
    if (!id) return fail("not_found", 404);
    const order = await findOne(supabase, "orders", "id,code,status,subtotal,package_discount,coupon_discount,bonus_discount,delivery_fee,total,payment_method,address_snapshot,gift,created_at", { id, user_id: auth.user.id });
    if (!order) return fail("not_found", 404);
    const items = await findMany(supabase, "order_items", "name_snapshot,qty,unit_price", { filters: { order_id: id }, limit: 50 });
    const events = await findMany(supabase, "order_events", "status,note,created_at", { filters: { order_id: id }, order: { column: "created_at" }, limit: 30 });
    const payment = await findOne(supabase, "payments", "method,status,reference", { order_id: id });
    return ok({ order, items, events, payment });
  }

  if (head === "orders" && second && third === "payment-submitted" && request.method === "POST") {
    const auth = await requireUser(ctx);
    if (auth.error) return auth.error;
    const id = uid(second);
    const order = await findOne(supabase, "orders", "id,code,user_id,status", { id, user_id: auth.user.id });
    if (!order) return fail("not_found", 404);
    const payment = await findOne(supabase, "payments", "id,status,method", { order_id: id });
    if (!payment || payment.method === "cod") return fail("not_applicable");
    if (payment.status !== "awaiting_customer" && payment.status !== "submitted") return fail("not_applicable");
    await updateRow(supabase, "payments", { status: "submitted", updated_at: now() }, { id: payment.id });
    await notify(supabase, auth.user.id, "Payment submitted", `We received your ${payment.method === "wave" ? "Wave" : "Orange Money"} payment notice for ${order.code}. It will be confirmed shortly.`, "payment");
    return ok({});
  }

  if (head === "orders" && second && third === "cancel" && request.method === "POST") {
    const auth = await requireUser(ctx);
    if (auth.error) return auth.error;
    const id = uid(second);
    const order = await findOne(supabase, "orders", "id,code,user_id,status,bonus_discount", { id, user_id: auth.user.id });
    if (!order) return fail("not_found", 404);
    if (!CANCELABLE.includes(order.status)) return fail("too_late_to_cancel");
    await updateRow(supabase, "orders", { status: "cancelled", updated_at: now() }, { id });
    await insertRow(supabase, "order_events", { id: newId(), order_id: id, status: "cancelled", note: "Cancelled by customer", created_at: now() });
    const items = await findMany(supabase, "order_items", "product_id,variant_id,qty", { filters: { order_id: id }, limit: 50 });
    for (const item of items) {
      if (item.variant_id) {
        const variant = await findOne(supabase, "product_variants", "id,stock", { id: item.variant_id });
        if (variant) await updateRow(supabase, "product_variants", { stock: (variant.stock ?? 0) + item.qty }, { id: variant.id });
      } else {
        const product = await findOne(supabase, "products", "id,stock,sold_count", { id: item.product_id });
        if (product) await updateRow(supabase, "products", { stock: (product.stock ?? 0) + item.qty, sold_count: Math.max(0, (product.sold_count || 0) - item.qty) }, { id: product.id });
      }
    }
    if (order.bonus_discount > 0) await addBonus(supabase, auth.user.id, order.bonus_discount, `Refund of bonus used on ${order.code}`, id);
    return ok({});
  }

  return null;
}

function subtotalOf(lines, items, packageId) {
  let sum = 0;
  items.forEach((raw, index) => {
    if (str(raw.packageId, 40) === packageId && lines[index]) sum += lines[index].unit * lines[index].qty;
  });
  return sum;
}
