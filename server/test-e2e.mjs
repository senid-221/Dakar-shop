// End-to-end regression check for the Node + pg + Neon backend through the real HTTP server.
// Secrets come from the environment so nothing sensitive is committed.
//
//   BASE=http://127.0.0.1:8123/functions/v1/app \
//   ADMIN_PASSWORD='...' \
//   node test-e2e.mjs
//
// CUSTOMER_* default to the seeded demo account (placeholder password from seed-data.mjs).
// ADMIN_PASSWORD has no default: without it the admin-only checks are skipped.
const BASE = process.env.BASE || "http://127.0.0.1:8123/functions/v1/app";
const CUSTOMER_PHONE = process.env.CUSTOMER_PHONE || "770001122";
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || "Demo@2026";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "775784158";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

let pass = 0, fail = 0, skip = 0;
const log = (name, cond, extra = "") => { cond ? (pass++, console.log("PASS", name, extra)) : (fail++, console.log("FAIL", name, extra)); };
const skipped = (name) => { skip++; console.log("SKIP", name); };

async function call(path, { method, body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers["x-sm-token"] = token;
  const res = await fetch(`${BASE}${path}`, { method: method || (body !== undefined ? "POST" : "GET"), headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// 1. Customer login (seeded demo account)
const cust = await call("/auth/login", { body: { phone: CUSTOMER_PHONE, password: CUSTOMER_PASSWORD } });
log("customer login", cust.json?.ok === true && !!cust.json?.token, cust.json?.error || "");
const ct = cust.json?.token;

// 2. Catalog
const prods = await call("/products");
const baguette = (prods.json?.products || []).find((p) => /baguette/i.test(p.name));
log("products list", prods.json?.ok === true && (prods.json?.products || []).length === 8, `n=${prods.json?.products?.length}`);
log("baguette found", !!baguette, baguette?.name || "");

// 3. Create a saved address (jsonb lat/lng write)
const zones = await call("/zones");
const plateau = (zones.json?.zones || []).find((z) => z.slug === "plateau");
const addr = await call("/addresses", { token: ct, body: { zoneId: plateau?.id, label: "Home", recipientName: "Aminata Fall", phone: CUSTOMER_PHONE, addressText: "Rue 1 x Corniche, Dakar", lat: 14.6728, lng: -17.438, isDefault: true } });
log("create address", addr.json?.ok === true && !!addr.json?.address?.id, addr.json?.error || "");
const addrList = await call("/addresses", { token: ct });
log("address lat round-trips (jsonb)", addrList.json?.addresses?.[0]?.lat === 14.6728, `lat=${JSON.stringify(addrList.json?.addresses?.[0]?.lat)}`);

// 4. Favorite a product
const fav = await call("/favorites", { token: ct, body: { productId: baguette?.id } });
log("add favorite", fav.json?.ok === true, fav.json?.error || "");
const favList = await call("/favorites", { token: ct });
log("favorite listed", (favList.json?.favorites || []).some((f) => f.product_id === baguette?.id));

// 5. Place a COD order (insertRows order_items, jsonb snapshot, stock decrement)
const order = await call("/orders", { token: ct, body: { items: [{ productId: baguette?.id, qty: 3 }], paymentMethod: "cod", addressId: addr.json?.address?.id } });
log("place COD order", order.json?.ok === true && !!order.json?.order?.code, JSON.stringify(order.json?.order || order.json?.error));
const oid = order.json?.order?.id;
const ocode = order.json?.order?.code;
log("COD order auto-confirmed", order.json?.order?.status === "payment_confirmed", order.json?.order?.status);

// 6. Stock decremented by 3
const p2 = await call("/products");
const bag2 = (p2.json?.products || []).find((p) => p.id === baguette?.id);
log("stock decremented", bag2?.stock === baguette?.stock - 3, `${baguette?.stock} -> ${bag2?.stock}`);

// 7. Order detail + mine
const detail = await call(`/orders/${oid}`, { token: ct });
log("order detail", detail.json?.ok === true && detail.json?.items?.length === 1 && detail.json?.order?.address_snapshot?.recipient === "Aminata Fall", detail.json?.error || "");
const mine = await call("/orders/mine", { token: ct });
log("orders/mine", (mine.json?.orders || []).some((o) => o.id === oid));

// 8. Chat knows the order status (order-code intent)
const chatOrder = await call("/chat", { body: { message: `status of ${ocode}` } });
log("chat order status", chatOrder.json?.ok === true && /payment confirmed|preparing|order placed/i.test(chatOrder.json?.reply || ""), (chatOrder.json?.reply || "").slice(0, 60));

// 9-11. Admin flow (requires ADMIN_PASSWORD)
let at = null;
if (ADMIN_PASSWORD) {
  const adm = await call("/auth/login", { body: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD } });
  log("admin login", adm.json?.ok === true && adm.json?.user?.role === "admin", adm.json?.error || "");
  at = adm.json?.token;
  const admOrders = await call("/admin/orders", { token: at });
  log("admin orders list", (admOrders.json?.orders || []).some((o) => o.id === oid));
  const patch1 = await call(`/admin/orders/${oid}/status`, { method: "PATCH", token: at, body: { status: "delivered", note: "Handed to customer" } });
  log("admin mark delivered", patch1.json?.ok === true, patch1.json?.error || JSON.stringify(patch1.json?.order || ""));

  const rewards = await call("/rewards", { token: ct });
  log("bonus earned on delivery", (rewards.json?.balance || 0) > 0, `balance=${rewards.json?.balance}`);
  const notif = await call("/notifications", { token: ct });
  log("delivery notification", (notif.json?.notifications || []).some((n) => /delivered/i.test(n.title || "")), `n=${notif.json?.notifications?.length}`);
  const stats = await call("/admin/stats", { token: at });
  log("admin stats sales", stats.json?.ok === true && stats.json?.salesTotal > 0 && stats.json?.completed >= 1, JSON.stringify({ salesTotal: stats.json?.salesTotal, completed: stats.json?.completed }));
} else {
  for (const n of ["admin login", "admin orders list", "admin mark delivered", "bonus earned on delivery", "delivery notification", "admin stats sales"]) skipped(n);
}

// 12. Auth guard: no token -> 401
const guard = await call("/orders/mine");
log("auth guard 401", guard.status === 401, `status=${guard.status}`);
// 13. Admin guard: customer token -> 403
const forbidden = await call("/admin/stats", { token: ct });
log("admin guard 403", forbidden.status === 403, `status=${forbidden.status}`);

// 14. Cleanup: delete address + favorite (deleteRow)
const delFav = await call(`/favorites/${baguette?.id}`, { method: "DELETE", token: ct });
log("delete favorite", delFav.json?.ok === true, delFav.json?.error || "");
const delAddr = await call(`/addresses/${addr.json?.address?.id}`, { method: "DELETE", token: ct });
log("delete address", delAddr.json?.ok === true, delAddr.json?.error || "");
// Cancel the test order so it does not linger (only possible while still cancelable).
if (oid && order.json?.order?.status !== "delivered") await call(`/orders/${oid}/cancel`, { token: ct });

console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
