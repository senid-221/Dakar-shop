import { fail, now, uid } from "./util.mjs";

// PostgREST needs `is.null` for null comparisons; `eq.null` casts the string "null" to the
// column type and fails on typed columns (e.g. uuid user_id), so route null filters through .is().
function applyFilters(q, filters) {
  for (const [column, value] of Object.entries(filters)) {
    q = value === null ? q.is(column, null) : q.eq(column, value);
  }
  return q;
}

export async function findOne(supabase, table, cols, filters) {
  let q = supabase.from(table).select(cols);
  q = applyFilters(q, filters);
  const result = await q.limit(1).maybeSingle();
  if (result.error) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.data;
}

export async function findMany(supabase, table, cols, { filters = {}, ilike, order, limit = 100, offset = 0, inFilters = {}, range = {} } = {}) {
  let q = supabase.from(table).select(cols);
  q = applyFilters(q, filters);
  for (const [column, values] of Object.entries(inFilters)) q = q.in(column, values);
  for (const [column, [from, to]] of Object.entries(range)) {
    if (from != null) q = q.gte(column, from);
    if (to != null) q = q.lte(column, to);
  }
  if (ilike) q = q.ilike(ilike.column, `%${ilike.value}%`);
  if (order) q = q.order(order.column, { ascending: order.ascending !== false });
  const result = await q.range(offset, offset + limit - 1);
  if (result.error) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.data || [];
}

export async function countRows(supabase, table, filters = {}) {
  let q = supabase.from(table).select("id", { count: "exact" }).limit(1);
  q = applyFilters(q, filters);
  const result = await q;
  if (result.error || !Number.isSafeInteger(result.count)) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.count;
}

export async function insertRow(supabase, table, row, cols = "id") {
  const result = await supabase.from(table).insert(row).select(cols).single();
  if (result.error) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.data;
}

export async function insertRows(supabase, table, rows, cols = "id") {
  if (!rows.length) return [];
  const result = await supabase.from(table).insert(rows).select(cols);
  if (result.error) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.data || [];
}

export async function updateRow(supabase, table, patch, filters, cols = "id") {
  let q = supabase.from(table).update(patch);
  q = applyFilters(q, filters);
  const result = await q.select(cols).maybeSingle();
  if (result.error) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.data;
}

export async function updateMany(supabase, table, patch, filters) {
  let q = supabase.from(table).update(patch);
  q = applyFilters(q, filters);
  const result = await q.select("id");
  if (result.error) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.data || [];
}

export async function deleteRow(supabase, table, filters) {
  let q = supabase.from(table).delete();
  q = applyFilters(q, filters);
  const result = await q.select("id").maybeSingle();
  if (result.error) throw Object.assign(new Error("db_error"), { status: 503 });
  return result.data;
}

// Application identity: session token issued by /auth/login, carried as Bearer.
export async function getSessionUser(supabase, request) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(header.trim());
  if (!match) return null;
  const session = await findOne(supabase, "sessions", "id,user_id,expires_at", { id: match[1].toLowerCase() });
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;
  const user = await findOne(supabase, "users", "id,role,name,phone,email,created_at", { id: session.user_id });
  return user;
}

export async function requireUser(ctx) {
  const user = await getSessionUser(ctx.supabase, ctx.request);
  if (!user) return { error: fail("login_required", 401) };
  return { user };
}

export async function requireAdmin(ctx) {
  const result = await requireUser(ctx);
  if (result.error) return result;
  if (result.user.role !== "admin") return { error: fail("forbidden", 403) };
  return result;
}

// settings.value is text in the cloud DB but objects in the local fake DB; normalize both ways.
export function decodeSetting(raw) {
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { return raw; }
}
export function encodeSetting(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export async function getSettings(supabase) {
  const rows = await findMany(supabase, "settings", "key,value", { limit: 20 });
  const out = {};
  for (const row of rows) out[row.key] = decodeSetting(row.value);
  return out;
}

export async function notify(supabase, userId, title, body, kind = "info") {
  await insertRow(supabase, "notifications", {
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    body,
    kind,
    read: false,
    created_at: now(),
  });
}

export async function addBonus(supabase, userId, amount, reason, orderId = null) {
  await insertRow(supabase, "bonus_transactions", {
    id: crypto.randomUUID(),
    user_id: userId,
    amount,
    reason,
    order_id: orderId,
    created_at: now(),
  });
}

export async function bonusBalance(supabase, userId) {
  const rows = await findMany(supabase, "bonus_transactions", "amount", { filters: { user_id: userId }, limit: 1000 });
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export function validId(value) {
  return uid(value);
}
