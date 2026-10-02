import { fail, ok, readJson, str, int, uid, newId, now } from "../lib/util.mjs";
import { findOne, findMany, insertRow, insertRows, updateRow, updateMany, deleteRow, requireUser, bonusBalance, getSettings } from "../lib/db.mjs";

export async function accountRoutes(ctx, segments) {
  const { supabase, request } = ctx;
  const auth = await requireUser(ctx);
  if (auth.error) return auth.error;
  const user = auth.user;
  const [head, second] = segments;

  if (head === "addresses") {
    if (request.method === "GET") {
      const rows = await findMany(supabase, "addresses", "id,label,recipient_name,phone,zone_id,address_text,lat,lng,is_default,created_at", { filters: { user_id: user.id }, order: { column: "created_at" }, limit: 20 });
      const zones = await findMany(supabase, "delivery_zones", "id,name", { limit: 40 });
      const zoneName = new Map(zones.map((z) => [z.id, z.name]));
      return ok({ addresses: rows.map((r) => ({ ...r, zone_name: zoneName.get(r.zone_id) || "" })) });
    }
    if (request.method === "POST") {
      const body = (await readJson(request)) || {};
      const zoneId = uid(body.zoneId);
      const zone = zoneId ? await findOne(supabase, "delivery_zones", "id", { id: zoneId, active: true }) : null;
      if (!zone) return fail("unknown_zone");
      const row = {
        id: newId(), user_id: user.id,
        label: str(body.label, 40) || "Home",
        recipient_name: str(body.recipientName, 80),
        phone: str(body.phone, 20).replace(/\D/g, ""),
        zone_id: zoneId,
        address_text: str(body.addressText, 240),
        lat: typeof body.lat === "number" ? body.lat : null,
        lng: typeof body.lng === "number" ? body.lng : null,
        is_default: body.isDefault === true,
        created_at: now(),
      };
      if (!row.recipient_name || !row.phone || !row.address_text) return fail("incomplete_address");
      if (row.is_default) await updateMany(supabase, "addresses", { is_default: false }, { user_id: user.id, is_default: true });
      const created = await insertRow(supabase, "addresses", row, "id,label,recipient_name,phone,zone_id,address_text,lat,lng,is_default");
      return ok({ address: created });
    }
    if (request.method === "PATCH" && second) {
      const id = uid(second);
      const body = (await readJson(request)) || {};
      const patch = {};
      if (body.label !== undefined) patch.label = str(body.label, 40);
      if (body.recipientName !== undefined) patch.recipient_name = str(body.recipientName, 80);
      if (body.phone !== undefined) patch.phone = str(body.phone, 20).replace(/\D/g, "");
      if (body.addressText !== undefined) patch.address_text = str(body.addressText, 240);
      if (body.lat !== undefined) patch.lat = typeof body.lat === "number" ? body.lat : null;
      if (body.lng !== undefined) patch.lng = typeof body.lng === "number" ? body.lng : null;
      if (!id || !Object.keys(patch).length) return fail("invalid_request");
      const updated = await updateRow(supabase, "addresses", patch, { id, user_id: user.id }, "id,label");
      if (!updated) return fail("not_found", 404);
      return ok({ address: updated });
    }
    if (request.method === "DELETE" && second) {
      const id = uid(second);
      if (!id) return fail("invalid_request");
      const removed = await deleteRow(supabase, "addresses", { id, user_id: user.id });
      if (!removed) return fail("not_found", 404);
      return ok({});
    }
  }

  if (head === "favorites") {
    if (request.method === "GET") {
      const rows = await findMany(supabase, "favorites", "product_id,created_at", { filters: { user_id: user.id }, limit: 100 });
      return ok({ favorites: rows });
    }
    if (request.method === "POST") {
      const body = (await readJson(request)) || {};
      const productId = uid(body.productId);
      if (!productId) return fail("invalid_request");
      const product = await findOne(supabase, "products", "id", { id: productId });
      if (!product) return fail("not_found", 404);
      const existing = await findOne(supabase, "favorites", "product_id", { user_id: user.id, product_id: productId });
      if (!existing) await insertRow(supabase, "favorites", { id: newId(), user_id: user.id, product_id: productId, created_at: now() });
      return ok({});
    }
    if (request.method === "DELETE" && second) {
      const productId = uid(second);
      if (!productId) return fail("invalid_request");
      await deleteRow(supabase, "favorites", { user_id: user.id, product_id: productId });
      return ok({});
    }
  }

  if (head === "packages" && second === "mine") {
    const rows = await findMany(supabase, "packages", "id,name,description,discount_percent,created_at", { filters: { user_id: user.id, active: true }, order: { column: "created_at", ascending: false }, limit: 20 });
    const items = rows.length ? await findMany(supabase, "package_items", "package_id,product_id,variant_id,qty", { inFilters: { package_id: rows.map((r) => r.id) }, limit: 200 }) : [];
    return ok({ packages: rows.map((r) => ({ ...r, items: items.filter((i) => i.package_id === r.id) })) });
  }

  if (head === "packages" && !second && request.method === "POST") {
    const body = (await readJson(request)) || {};
    const name = str(body.name, 60);
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    if (name.length < 2 || !items.length) return fail("invalid_request");
    const packageId = newId();
    await insertRow(supabase, "packages", {
      id: packageId, user_id: user.id, name, description: str(body.description, 160),
      discount_percent: 0, active: true, created_at: now(),
    });
    const clean = items.map((i) => ({
      id: newId(), package_id: packageId, product_id: uid(i.productId), variant_id: uid(i.variantId), qty: int(i.qty, { min: 1, max: 50 }) || 1,
    })).filter((i) => i.product_id);
    if (!clean.length) return fail("invalid_request");
    await insertRows(supabase, "package_items", clean);
    return ok({ id: packageId });
  }

  if (head === "packages" && second && request.method === "DELETE") {
    const id = uid(second);
    if (!id) return fail("invalid_request");
    const removed = await deleteRow(supabase, "packages", { id, user_id: user.id });
    if (!removed) return fail("not_found", 404);
    return ok({});
  }

  if (head === "notifications") {
    if (request.method === "GET") {
      const rows = await findMany(supabase, "notifications", "id,title,body,kind,read,created_at", { filters: { user_id: user.id }, order: { column: "created_at", ascending: false }, limit: 30 });
      return ok({ notifications: rows });
    }
    if (request.method === "POST" && second === "read") {
      await updateMany(supabase, "notifications", { read: true }, { user_id: user.id, read: false });
      return ok({});
    }
  }

  if (head === "rewards") {
    const balance = await bonusBalance(supabase, user.id);
    const rows = await findMany(supabase, "bonus_transactions", "id,amount,reason,created_at", { filters: { user_id: user.id }, order: { column: "created_at", ascending: false }, limit: 30 });
    const spent = await findMany(supabase, "orders", "total", { filters: { user_id: user.id, status: "delivered" }, limit: 200 });
    const totalSpent = spent.reduce((sum, o) => sum + o.total, 0);
    const settings = await getSettings(supabase);
    const nextMilestone = [25000, 50000, 100000, 250000].find((m) => totalSpent < m) || null;
    return ok({ balance, transactions: rows, totalSpent, earnPercent: settings.bonusEarnPercent ?? 2, nextMilestone });
  }

  return null;
}
