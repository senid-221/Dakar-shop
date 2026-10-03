import { fail, ok, readJson, str, int, uid, digits, newId, now, hashPassword, newSalt, ORDER_STATUSES, STATUS_LABELS } from "../lib/util.mjs";
import { findOne, findMany, countRows, insertRow, insertRows, updateRow, deleteRow, requireAdmin, getSettings, encodeSetting, notify, addBonus, bonusBalance } from "../lib/db.mjs";
import { resetCatalog } from "../lib/bootstrap.mjs";

export async function adminRoutes(ctx, segments) {
  const { supabase, request } = ctx;
  const auth = await requireAdmin(ctx);
  if (auth.error) return auth.error;
  const admin = auth.user;
  const [head, second, third] = segments;
  const url = new URL(request.url);

  if (head === "reset-catalog" && request.method === "POST" && !second) {
    await resetCatalog(supabase);
    return ok({ reset: true });
  }

  // Admin-gated account manager: create or update a login by phone. The password is
  // hashed server-side (PBKDF2 + fresh salt) and never persisted anywhere but the users row.
  if (head === "admin-account" && request.method === "POST" && !second) {
    const body = (await readJson(request)) || {};
    const phone = digits(body.phone, 15);
    const name = str(body.name, 80);
    const password = typeof body.password === "string" ? body.password : "";
    const role = body.role === "customer" ? "customer" : "admin";
    if (phone.length < 9) return fail("invalid_phone");
    if (name.length < 2) return fail("invalid_name");
    if (password.length < 6) return fail("weak_password");
    const salt = newSalt();
    const passHash = await hashPassword(password, salt);
    const existing = await findOne(supabase, "users", "id", { phone });
    if (existing) {
      const updated = await updateRow(supabase, "users", { name, role, pass_hash: passHash, pass_salt: salt }, { id: existing.id }, "id,name,phone,role");
      return ok({ user: updated, created: false });
    }
    const created = await insertRow(supabase, "users", {
      id: newId(), role, name, phone, email: null,
      pass_hash: passHash, pass_salt: salt, created_at: now(),
    }, "id,name,phone,role");
    return ok({ user: created, created: true });
  }

  if (head === "stats" && request.method === "GET") {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const orders = await findMany(supabase, "orders", "id,status,total,created_at", { limit: 500 });
    const delivered = orders.filter((o) => o.status === "delivered");
    const salesTotal = delivered.reduce((s, o) => s + o.total, 0);
    const salesToday = delivered.filter((o) => new Date(o.created_at).getTime() >= today.getTime()).reduce((s, o) => s + o.total, 0);
    const pending = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
    const customers = await countRows(supabase, "users", { role: "customer" });
    const weekAgo = Date.now() - 7 * 86400000;
    const users = await findMany(supabase, "users", "created_at", { filters: { role: "customer" }, limit: 500 });
    return ok({
      salesTotal, salesToday,
      ordersTotal: orders.length,
      pending,
      completed: delivered.length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      activeDeliveries: orders.filter((o) => ["ready_for_delivery", "rider_assigned", "out_for_delivery"].includes(o.status)).length,
      customers,
      newCustomers: users.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length,
    });
  }

  if (head === "orders" && !second) {
    const status = str(url.searchParams.get("status"), 30);
    const q = str(url.searchParams.get("q"), 40);
    const filters = status && ORDER_STATUSES.includes(status) ? { status } : {};
    const rows = await findMany(supabase, "orders", "id,code,status,total,payment_method,created_at,user_id", { filters, order: { column: "created_at", ascending: false }, limit: 60 });
    let out = rows;
    if (q) out = rows.filter((r) => r.code.toLowerCase().includes(q.toLowerCase()));
    const userIds = [...new Set(out.map((r) => r.user_id))];
    const users = userIds.length ? await findMany(supabase, "users", "id,name,phone", { inFilters: { id: userIds }, limit: 60 }) : [];
    const nameById = new Map(users.map((u) => [u.id, `${u.name} · ${u.phone}`]));
    return ok({ orders: out.map((r) => ({ ...r, customer: nameById.get(r.user_id) || "" })) });
  }

  if (head === "orders" && second && third && request.method === "PATCH") {
    const id = uid(second);
    if (!id) return fail("invalid_request");
    const body = (await readJson(request)) || {};
    const order = await findOne(supabase, "orders", "id,code,user_id,status,total", { id });
    if (!order) return fail("not_found", 404);
    const patch = {};
    let eventStatus = null;
    let note = "";
    if (body.status && ORDER_STATUSES.includes(body.status) && body.status !== order.status) {
      patch.status = body.status;
      patch.updated_at = now();
      eventStatus = body.status;
      note = str(body.note, 160) || STATUS_LABELS[body.status];
    }
    if (body.staffId !== undefined) {
      const staffId = uid(body.staffId);
      if (body.staffId && !staffId) return fail("invalid_staff");
      patch.delivery_staff_id = staffId;
      patch.updated_at = now();
      if (!eventStatus) { eventStatus = order.status; note = "Rider updated"; }
    }
    if (!Object.keys(patch).length) return fail("invalid_request");
    const updated = await updateRow(supabase, "orders", patch, { id }, "id,code,status");
    if (eventStatus) await insertRow(supabase, "order_events", { id: newId(), order_id: id, status: eventStatus, note, created_at: now() });
    if (eventStatus === "delivered") await onDelivered(supabase, order);
    if (eventStatus) await notify(supabase, order.user_id, `Order ${order.code}: ${STATUS_LABELS[eventStatus]}`, note || STATUS_LABELS[eventStatus], "order");
    return ok({ order: updated });
  }

  if (head === "orders" && second && !third) {
    const id = uid(second);
    if (!id) return fail("invalid_request");
    const order = await findOne(supabase, "orders", "id,code,status,subtotal,package_discount,coupon_discount,bonus_discount,delivery_fee,total,payment_method,address_snapshot,gift,created_at,user_id,delivery_staff_id", { id });
    if (!order) return fail("not_found", 404);
    const items = await findMany(supabase, "order_items", "name_snapshot,qty,unit_price", { filters: { order_id: id }, limit: 60 });
    const events = await findMany(supabase, "order_events", "status,note,created_at", { filters: { order_id: id }, order: { column: "created_at" }, limit: 40 });
    const payment = await findOne(supabase, "payments", "id,method,status,reference", { order_id: id });
    const customer = await findOne(supabase, "users", "id,name,phone,email", { id: order.user_id });
    const staff = await findMany(supabase, "delivery_staff", "id,name,phone,active", { limit: 30 });
    return ok({ order, items, events, payment, customer, staff });
  }

  if (head === "customers" && !second) {
    const rows = await findMany(supabase, "users", "id,name,phone,email,created_at", { filters: { role: "customer" }, order: { column: "created_at", ascending: false }, limit: 60 });
    const orders = await findMany(supabase, "orders", "user_id,total,status", { limit: 500 });
    const agg = new Map();
    for (const o of orders) {
      const entry = agg.get(o.user_id) || { count: 0, spent: 0 };
      entry.count += 1;
      if (o.status === "delivered") entry.spent += o.total;
      agg.set(o.user_id, entry);
    }
    return ok({ customers: rows.map((r) => ({ ...r, orders: agg.get(r.id)?.count || 0, spent: agg.get(r.id)?.spent || 0 })) });
  }

  if (head === "customers" && second) {
    const id = uid(second);
    if (!id) return fail("invalid_request");
    const customer = await findOne(supabase, "users", "id,name,phone,email,created_at", { id, role: "customer" });
    if (!customer) return fail("not_found", 404);
    const orders = await findMany(supabase, "orders", "id,code,status,total,created_at", { filters: { user_id: id }, order: { column: "created_at", ascending: false }, limit: 50 });
    const balance = await bonusBalance(supabase, id);
    return ok({ customer, orders, balance });
  }

  if (head === "products" && !second && request.method === "POST") {
    const body = (await readJson(request)) || {};
    const categoryId = uid(body.categoryId);
    const name = str(body.name, 90);
    const price = int(body.price, { min: 0, max: 100000000 });
    if (!categoryId || name.length < 2 || price == null) return fail("invalid_product");
    const created = await insertRow(supabase, "products", {
      id: newId(), category_id: categoryId, name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60),
      description: str(body.description, 600), image_url: str(body.imageUrl, 400),
      price, compare_price: int(body.comparePrice, { min: 0, max: 100000000 }),
      stock: int(body.stock, { min: 0, max: 1000000 }) ?? 0,
      active: body.active !== false, rating: 4.5, sold_count: 0, created_at: now(),
    }, "id,name");
    return ok({ product: created });
  }

  if (head === "products" && second && third === "variants" && request.method === "POST") {
    const productId = uid(second);
    const body = (await readJson(request)) || {};
    const label = str(body.label, 40);
    if (!productId || !label) return fail("invalid_variant");
    const created = await insertRow(supabase, "product_variants", {
      id: newId(), product_id: productId, kind: str(body.kind, 20) || "option", label,
      price_delta: int(body.priceDelta, { min: -10000000, max: 100000000 }) || 0,
      stock: body.stock == null ? null : int(body.stock, { min: 0, max: 1000000 }),
    }, "id,label");
    return ok({ variant: created });
  }

  if (head === "variants" && second && request.method === "DELETE") {
    const id = uid(second);
    if (!id) return fail("invalid_request");
    const removed = await deleteRow(supabase, "product_variants", { id });
    if (!removed) return fail("not_found", 404);
    return ok({});
  }

  if (head === "products" && second && request.method === "PATCH") {
    const id = uid(second);
    const body = (await readJson(request)) || {};
    const patch = {};
    if (body.name !== undefined) patch.name = str(body.name, 90);
    if (body.description !== undefined) patch.description = str(body.description, 600);
    if (body.imageUrl !== undefined) patch.image_url = str(body.imageUrl, 400);
    if (body.price !== undefined) patch.price = int(body.price, { min: 0, max: 100000000 });
    if (body.comparePrice !== undefined) patch.compare_price = int(body.comparePrice, { min: 0, max: 100000000 });
    if (body.stock !== undefined) patch.stock = int(body.stock, { min: 0, max: 1000000 });
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.categoryId !== undefined) patch.category_id = uid(body.categoryId);
    if (!id || !Object.keys(patch).length || Object.values(patch).some((v) => v === null && body.categoryId !== undefined)) return fail("invalid_product");
    const updated = await updateRow(supabase, "products", patch, { id }, "id,name");
    if (!updated) return fail("not_found", 404);
    return ok({ product: updated });
  }

  if (head === "products" && second && request.method === "DELETE") {
    const id = uid(second);
    if (!id) return fail("invalid_request");
    const removed = await deleteRow(supabase, "products", { id });
    if (!removed) return fail("not_found", 404);
    return ok({});
  }

  if (head === "coupons" && request.method === "POST" && !second) {
    const body = (await readJson(request)) || {};
    const code = str(body.code, 30).toUpperCase();
    const kind = body.kind === "fixed" ? "fixed" : "percent";
    const value = int(body.value, { min: 1, max: kind === "percent" ? 90 : 10000000 });
    if (!code || value == null) return fail("invalid_coupon");
    const created = await insertRow(supabase, "coupons", {
      id: newId(), code, kind, value,
      min_order: int(body.minOrder, { min: 0, max: 100000000 }) || 0,
      expires_at: str(body.expiresAt, 40) || new Date(Date.now() + 30 * 86400000).toISOString(),
      usage_limit: body.usageLimit == null ? null : int(body.usageLimit, { min: 1, max: 1000000 }),
      used_count: 0, active: body.active !== false,
      category_id: uid(body.categoryId),
    }, "id,code");
    return ok({ coupon: created });
  }

  if (head === "coupons" && second && request.method === "PATCH") {
    const id = uid(second);
    const body = (await readJson(request)) || {};
    const patch = {};
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.value !== undefined) patch.value = int(body.value, { min: 1, max: 10000000 });
    if (body.minOrder !== undefined) patch.min_order = int(body.minOrder, { min: 0, max: 100000000 });
    if (body.expiresAt !== undefined) patch.expires_at = str(body.expiresAt, 40);
    if (body.usageLimit !== undefined) patch.usage_limit = int(body.usageLimit, { min: 1, max: 1000000 });
    if (!id || !Object.keys(patch).length) return fail("invalid_coupon");
    const updated = await updateRow(supabase, "coupons", patch, { id }, "id,code");
    if (!updated) return fail("not_found", 404);
    return ok({ coupon: updated });
  }

  if (head === "coupons" && second && request.method === "DELETE") {
    const id = uid(second);
    if (!id) return fail("invalid_request");
    const removed = await deleteRow(supabase, "coupons", { id });
    if (!removed) return fail("not_found", 404);
    return ok({});
  }

  if (head === "zones" && request.method === "POST" && !second) {
    const body = (await readJson(request)) || {};
    const name = str(body.name, 60);
    const fee = int(body.fee, { min: 0, max: 1000000 });
    if (!name || fee == null) return fail("invalid_zone");
    const created = await insertRow(supabase, "delivery_zones", {
      id: newId(), slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
      name, fee, cod_enabled: body.codEnabled !== false,
      lat: typeof body.lat === "number" ? body.lat : 14.72, lng: typeof body.lng === "number" ? body.lng : -17.46,
      radius_km: int(body.radiusKm, { min: 1, max: 50 }) || 4, active: body.active !== false,
    }, "id,name");
    return ok({ zone: created });
  }

  if (head === "zones" && second && request.method === "PATCH") {
    const id = uid(second);
    const body = (await readJson(request)) || {};
    const patch = {};
    if (body.fee !== undefined) patch.fee = int(body.fee, { min: 0, max: 1000000 });
    if (body.codEnabled !== undefined) patch.cod_enabled = body.codEnabled === true;
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.name !== undefined) patch.name = str(body.name, 60);
    if (!id || !Object.keys(patch).length) return fail("invalid_zone");
    const updated = await updateRow(supabase, "delivery_zones", patch, { id }, "id,name,fee,cod_enabled");
    if (!updated) return fail("not_found", 404);
    return ok({ zone: updated });
  }

  if (head === "staff" && request.method === "POST" && !second) {
    const body = (await readJson(request)) || {};
    const name = str(body.name, 60);
    if (!name) return fail("invalid_staff");
    const created = await insertRow(supabase, "delivery_staff", { id: newId(), name, phone: str(body.phone, 20), active: body.active !== false }, "id,name");
    return ok({ staff: created });
  }

  if (head === "staff" && second && request.method === "PATCH") {
    const id = uid(second);
    const body = (await readJson(request)) || {};
    const patch = {};
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.name !== undefined) patch.name = str(body.name, 60);
    if (!id || !Object.keys(patch).length) return fail("invalid_staff");
    const updated = await updateRow(supabase, "delivery_staff", patch, { id }, "id,name,active");
    if (!updated) return fail("not_found", 404);
    return ok({ staff: updated });
  }

  if (head === "packages" && request.method === "POST" && !second) {
    const body = (await readJson(request)) || {};
    const name = str(body.name, 60);
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    if (!name || !items.length) return fail("invalid_package");
    const packageId = newId();
    await insertRow(supabase, "packages", {
      id: packageId, user_id: null, name, description: str(body.description, 160),
      discount_percent: int(body.discountPercent, { min: 0, max: 50 }) || 0,
      active: body.active !== false, created_at: now(),
    });
    await insertRows(supabase, "package_items", items.map((i) => ({
      id: newId(), package_id: packageId, product_id: uid(i.productId), variant_id: uid(i.variantId), qty: int(i.qty, { min: 1, max: 50 }) || 1,
    })).filter((i) => i.product_id));
    return ok({ id: packageId });
  }

  if (head === "packages" && second && request.method === "PATCH") {
    const id = uid(second);
    const body = (await readJson(request)) || {};
    const patch = {};
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.discountPercent !== undefined) patch.discount_percent = int(body.discountPercent, { min: 0, max: 50 });
    if (body.name !== undefined) patch.name = str(body.name, 60);
    if (!id || !Object.keys(patch).length) return fail("invalid_package");
    const updated = await updateRow(supabase, "packages", patch, { id }, "id,name");
    if (!updated) return fail("not_found", 404);
    return ok({});
  }

  if (head === "campaigns" && request.method === "POST" && !second) {
    const body = (await readJson(request)) || {};
    const name = str(body.name, 80);
    const kind = ["order_completed_percent", "milestone"].includes(body.kind) ? body.kind : null;
    const value = int(body.value, { min: 1, max: 10000000 });
    if (!name || !kind || value == null) return fail("invalid_campaign");
    const created = await insertRow(supabase, "reward_campaigns", {
      id: newId(), name, kind, value,
      threshold: int(body.threshold, { min: 0, max: 100000000 }) || 0,
      active: body.active !== false, created_at: now(),
    }, "id,name");
    return ok({ campaign: created });
  }

  if (head === "campaigns" && second && request.method === "PATCH") {
    const id = uid(second);
    const body = (await readJson(request)) || {};
    const patch = {};
    if (body.active !== undefined) patch.active = body.active === true;
    if (body.value !== undefined) patch.value = int(body.value, { min: 1, max: 10000000 });
    if (!id || !Object.keys(patch).length) return fail("invalid_campaign");
    const updated = await updateRow(supabase, "reward_campaigns", patch, { id }, "id,name");
    if (!updated) return fail("not_found", 404);
    return ok({});
  }

  if (head === "payments" && !second) {
    const status = str(url.searchParams.get("status"), 30);
    const rows = await findMany(supabase, "payments", "id,order_id,method,status,reference,created_at", { order: { column: "created_at", ascending: false }, limit: 60 });
    let out = rows;
    if (status) out = rows.filter((r) => r.status === status);
    const orderIds = [...new Set(out.map((r) => r.order_id))];
    const orders = orderIds.length ? await findMany(supabase, "orders", "id,code,total,user_id", { inFilters: { id: orderIds }, limit: 60 }) : [];
    const orderById = new Map(orders.map((o) => [o.id, o]));
    const userIds = [...new Set(orders.map((o) => o.user_id))];
    const users = userIds.length ? await findMany(supabase, "users", "id,name,phone", { inFilters: { id: userIds }, limit: 60 }) : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    return ok({
      payments: out.map((r) => {
        const order = orderById.get(r.order_id);
        const user = order ? userById.get(order.user_id) : null;
        return { ...r, code: order?.code || "", total: order?.total || 0, customer: user ? `${user.name} · ${user.phone}` : "" };
      }),
    });
  }

  if (head === "payments" && second && third === "confirm" && request.method === "POST") {
    const id = uid(second);
    const payment = await findOne(supabase, "payments", "id,order_id,status,method", { id });
    if (!payment) return fail("not_found", 404);
    if (payment.status === "confirmed" || payment.status === "cash_collected") return fail("already_confirmed");
    const newStatus = payment.method === "cod" ? "cash_collected" : "confirmed";
    await updateRow(supabase, "payments", { status: newStatus, confirmed_by: admin.id, updated_at: now() }, { id });
    const order = await findOne(supabase, "orders", "id,code,user_id,status", { id: payment.order_id });
    if (order && order.status === "order_placed") {
      await updateRow(supabase, "orders", { status: "payment_confirmed", updated_at: now() }, { id: order.id });
      await insertRow(supabase, "order_events", { id: newId(), order_id: order.id, status: "payment_confirmed", note: `Payment confirmed by admin (${payment.method})`, created_at: now() });
      await notify(supabase, order.user_id, `Payment confirmed for ${order.code}`, "We received your payment. Your order is moving to preparation.", "payment");
    }
    return ok({});
  }

  if (head === "analytics" && request.method === "GET") {
    const orders = await findMany(supabase, "orders", "id,status,total,created_at,coupon_code,delivery_fee", { limit: 500 });
    const items = await findMany(supabase, "order_items", "product_id,name_snapshot,qty,unit_price", { limit: 1000 });
    const products = await findMany(supabase, "products", "id,name,category_id,sold_count", { limit: 200 });
    const categories = await findMany(supabase, "categories", "id,name", { limit: 10 });
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400000);
      const key = day.toISOString().slice(0, 10);
      const dayOrders = orders.filter((o) => o.created_at.slice(0, 10) === key && o.status !== "cancelled");
      days.push({ day: key, revenue: dayOrders.reduce((s, o) => s + o.total, 0), orders: dayOrders.length });
    }
    const byStatus = ORDER_STATUSES.map((status) => ({ status, label: STATUS_LABELS[status], count: orders.filter((o) => o.status === status).length }));
    const productAgg = new Map();
    for (const item of items) {
      const entry = productAgg.get(item.name_snapshot) || { name: item.name_snapshot, qty: 0, revenue: 0 };
      entry.qty += item.qty; entry.revenue += item.qty * item.unit_price;
      productAgg.set(item.name_snapshot, entry);
    }
    const topProducts = [...productAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
    const catName = new Map(categories.map((c) => [c.id, c.name]));
    const catAgg = new Map();
    for (const p of products) {
      const entry = catAgg.get(catName.get(p.category_id) || "Other") || { category: catName.get(p.category_id) || "Other", units: 0 };
      entry.units += p.sold_count || 0;
      catAgg.set(entry.category, entry);
    }
    const coupons = await findMany(supabase, "coupons", "code,used_count,active", { limit: 30 });
    const rewards = await findMany(supabase, "bonus_transactions", "amount", { limit: 1000 });
    const discounts = orders.reduce((s, o) => s + (o.package_discount || 0) + (o.coupon_discount || 0) + (o.bonus_discount || 0), 0);
    return ok({
      days, byStatus, topProducts,
      categories: [...catAgg.values()],
      coupons: coupons.map((c) => ({ code: c.code, used: c.used_count, active: c.active })),
      rewardsIssued: rewards.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0),
      rewardsRedeemed: -rewards.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0),
      discounts,
    });
  }

  if (head === "lists" && request.method === "GET") {
    const [categories, zones, staff, campaigns, coupons, packages] = await Promise.all([
      findMany(supabase, "categories", "id,name,slug", { order: { column: "sort" }, limit: 20 }),
      findMany(supabase, "delivery_zones", "id,name,slug,fee,cod_enabled,active", { limit: 40 }),
      findMany(supabase, "delivery_staff", "id,name,phone,active", { limit: 40 }),
      findMany(supabase, "reward_campaigns", "id,name,kind,value,threshold,active", { limit: 20 }),
      findMany(supabase, "coupons", "id,code,kind,value,min_order,expires_at,usage_limit,used_count,active", { limit: 40 }),
      findMany(supabase, "packages", "id,name,description,discount_percent,active", { filters: { user_id: null }, limit: 30 }),
    ]);
    const settings = await getSettings(supabase);
    return ok({ categories, zones, staff, campaigns, coupons, packages, settings });
  }

  if (head === "settings" && request.method === "PATCH") {
    const body = (await readJson(request)) || {};
    const settings = await getSettings(supabase);
    if (body.storeName !== undefined) settings.storeName = str(body.storeName, 60) || settings.storeName;
    if (body.codGlobal !== undefined) settings.codGlobal = body.codGlobal === true;
    if (body.packageTiers !== undefined && Array.isArray(body.packageTiers)) {
      settings.packageTiers = body.packageTiers.slice(0, 5).map((t) => ({ minItems: int(t.minItems, { min: 2, max: 30 }) || 3, pct: int(t.pct, { min: 1, max: 50 }) || 5 }));
    }
    if (body.bonusEarnPercent !== undefined) settings.bonusEarnPercent = int(body.bonusEarnPercent, { min: 0, max: 20 });
    for (const [key, raw] of Object.entries(settings)) {
      const value = encodeSetting(raw);
      const existing = await findOne(supabase, "settings", "key", { key });
      if (existing) await updateRow(supabase, "settings", { value }, { key }, "key");
      else await insertRow(supabase, "settings", { key, value }, "key");
    }
    return ok({});
  }

  return null;
}

async function onDelivered(supabase, order) {
  const settings = await getSettings(supabase);
  const campaigns = await findMany(supabase, "reward_campaigns", "id,kind,value,threshold,active,name", { filters: { active: true }, limit: 10 });
  const percent = campaigns.find((c) => c.kind === "order_completed_percent")?.value ?? settings.bonusEarnPercent ?? 2;
  const earned = Math.max(10, Math.round((order.total * percent) / 100 / 10) * 10);
  await addBonus(supabase, order.user_id, earned, `Bonus for completed order ${order.code}`, order.id);
  const delivered = await findMany(supabase, "orders", "total", { filters: { user_id: order.user_id, status: "delivered" }, limit: 200 });
  const totalSpent = delivered.reduce((s, o) => s + o.total, 0);
  for (const campaign of campaigns.filter((c) => c.kind === "milestone")) {
    if (campaign.threshold > 0 && totalSpent >= campaign.threshold && totalSpent - order.total < campaign.threshold) {
      await addBonus(supabase, order.user_id, campaign.value, `Milestone reward: ${campaign.name}`, order.id);
      await notify(supabase, order.user_id, "Bonus unlocked", `Congratulations, your reward of ${campaign.value} FCFA is ready: ${campaign.name}.`, "reward");
    }
  }
  await notify(supabase, order.user_id, `You earned ${earned} FCFA`, `Order ${order.code} delivered. Your bonus balance is ready to use on your next order.`, "reward");
}
