import { fail, now, uid } from "./util.mjs";

// Dual backend: the Qoder deploy passes a supabase-js client (has .from); the self-hosted Node
// server passes a node-pg Pool (has .query). Every helper below branches on this so the routes,
// handler and bootstrap stay identical across both environments.
const isPg = (db) => !!db && typeof db.query === "function";
const dbError = () => Object.assign(new Error("db_error"), { status: 503 });

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}
function selectCols(cols) {
  const c = String(cols).trim();
  if (c === "*") return "*";
  return c.split(",").map((s) => quoteIdent(s.trim())).join(", ");
}
// Column list for INSERT/UPDATE from a row object; undefined becomes NULL (matching PostgREST).
function rowKeys(rows) {
  const keys = [];
  for (const row of rows) for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k);
  return keys;
}
const cellValue = (v) => (v === undefined ? null : v);

async function pgRun(db, sql, params) {
  try {
    return await db.query(sql, params);
  } catch {
    throw dbError();
  }
}
// Shared WHERE builder: filters (= / IS NULL), inFilters (IN), range (>= / <=), ilike (ILIKE %v%).
// Pushes values onto `params` and returns the SQL fragment (empty string when no conditions).
function buildWhere({ filters = {}, inFilters = {}, range = {}, ilike } = {}, params) {
  const clauses = [];
  for (const [column, value] of Object.entries(filters)) {
    if (value === null) clauses.push(`${quoteIdent(column)} IS NULL`);
    else { params.push(value); clauses.push(`${quoteIdent(column)} = $${params.length}`); }
  }
  for (const [column, values] of Object.entries(inFilters)) {
    const arr = Array.isArray(values) ? values : [values];
    if (!arr.length) { clauses.push("false"); continue; }
    const ph = arr.map((v) => { params.push(v); return `$${params.length}`; }).join(", ");
    clauses.push(`${quoteIdent(column)} IN (${ph})`);
  }
  for (const [column, bounds] of Object.entries(range)) {
    const [from, to] = bounds || [];
    if (from != null) { params.push(from); clauses.push(`${quoteIdent(column)} >= $${params.length}`); }
    if (to != null) { params.push(to); clauses.push(`${quoteIdent(column)} <= $${params.length}`); }
  }
  if (ilike) { params.push(`%${ilike.value}%`); clauses.push(`${quoteIdent(ilike.column)} ILIKE $${params.length}`); }
  return clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
}

// PostgREST needs `is.null` for null comparisons; `eq.null` casts the string "null" to the
// column type and fails on typed columns (e.g. uuid user_id), so route null filters through .is().
function applyFilters(q, filters) {
  for (const [column, value] of Object.entries(filters)) {
    q = value === null ? q.is(column, null) : q.eq(column, value);
  }
  return q;
}

export async function findOne(supabase, table, cols, filters) {
  if (isPg(supabase)) {
    const params = [];
    const where = buildWhere({ filters }, params);
    const res = await pgRun(supabase, `SELECT ${selectCols(cols)} FROM ${quoteIdent(table)}${where} LIMIT 1`, params);
    return res.rows[0] ?? null;
  }
  let q = supabase.from(table).select(cols);
  q = applyFilters(q, filters);
  const result = await q.limit(1).maybeSingle();
  if (result.error) throw dbError();
  return result.data;
}

export async function findMany(supabase, table, cols, { filters = {}, ilike, order, limit = 100, offset = 0, inFilters = {}, range = {} } = {}) {
  if (isPg(supabase)) {
    const params = [];
    const where = buildWhere({ filters, inFilters, range, ilike }, params);
    const orderBy = order ? ` ORDER BY ${quoteIdent(order.column)} ${order.ascending !== false ? "ASC" : "DESC"}` : "";
    params.push(limit);
    const limitSql = ` LIMIT $${params.length}`;
    params.push(offset);
    const offsetSql = ` OFFSET $${params.length}`;
    const res = await pgRun(supabase, `SELECT ${selectCols(cols)} FROM ${quoteIdent(table)}${where}${orderBy}${limitSql}${offsetSql}`, params);
    return res.rows || [];
  }
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
  if (result.error) throw dbError();
  return result.data || [];
}

export async function countRows(supabase, table, filters = {}) {
  if (isPg(supabase)) {
    const params = [];
    const where = buildWhere({ filters }, params);
    const res = await pgRun(supabase, `SELECT count(*)::int AS count FROM ${quoteIdent(table)}${where}`, params);
    const count = Number(res.rows[0]?.count);
    if (!Number.isSafeInteger(count)) throw dbError();
    return count;
  }
  let q = supabase.from(table).select("id", { count: "exact" }).limit(1);
  q = applyFilters(q, filters);
  const result = await q;
  if (result.error || !Number.isSafeInteger(result.count)) throw dbError();
  return result.count;
}

export async function insertRow(supabase, table, row, cols = "id") {
  if (isPg(supabase)) {
    const keys = Object.keys(row);
    const params = keys.map((k) => cellValue(row[k]));
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(", ")}) VALUES (${placeholders}) RETURNING ${selectCols(cols)}`;
    const res = await pgRun(supabase, sql, params);
    return res.rows[0] ?? null;
  }
  const result = await supabase.from(table).insert(row).select(cols).single();
  if (result.error) throw dbError();
  return result.data;
}

export async function insertRows(supabase, table, rows, cols = "id") {
  if (!rows.length) return [];
  if (isPg(supabase)) {
    const keys = rowKeys(rows);
    const params = [];
    const tuples = rows.map((row) => {
      const ph = keys.map((k) => { params.push(cellValue(row[k])); return `$${params.length}`; }).join(", ");
      return `(${ph})`;
    }).join(", ");
    const sql = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(", ")}) VALUES ${tuples} RETURNING ${selectCols(cols)}`;
    const res = await pgRun(supabase, sql, params);
    return res.rows || [];
  }
  const result = await supabase.from(table).insert(rows).select(cols);
  if (result.error) throw dbError();
  return result.data || [];
}

export async function updateRow(supabase, table, patch, filters, cols = "id") {
  if (isPg(supabase)) {
    const keys = Object.keys(patch);
    if (!keys.length) return null;
    const params = [];
    const setSql = keys.map((k) => { params.push(cellValue(patch[k])); return `${quoteIdent(k)} = $${params.length}`; }).join(", ");
    const where = buildWhere({ filters }, params);
    const res = await pgRun(supabase, `UPDATE ${quoteIdent(table)} SET ${setSql}${where} RETURNING ${selectCols(cols)}`, params);
    return res.rows[0] ?? null;
  }
  let q = supabase.from(table).update(patch);
  q = applyFilters(q, filters);
  const result = await q.select(cols).maybeSingle();
  if (result.error) throw dbError();
  return result.data;
}

export async function updateMany(supabase, table, patch, filters) {
  if (isPg(supabase)) {
    const keys = Object.keys(patch);
    if (!keys.length) return [];
    const params = [];
    const setSql = keys.map((k) => { params.push(cellValue(patch[k])); return `${quoteIdent(k)} = $${params.length}`; }).join(", ");
    const where = buildWhere({ filters }, params);
    const res = await pgRun(supabase, `UPDATE ${quoteIdent(table)} SET ${setSql}${where} RETURNING ${quoteIdent("id")}`, params);
    return res.rows || [];
  }
  let q = supabase.from(table).update(patch);
  q = applyFilters(q, filters);
  const result = await q.select("id");
  if (result.error) throw dbError();
  return result.data || [];
}

export async function deleteRow(supabase, table, filters) {
  if (isPg(supabase)) {
    const params = [];
    const where = buildWhere({ filters }, params);
    const res = await pgRun(supabase, `DELETE FROM ${quoteIdent(table)}${where} RETURNING ${quoteIdent("id")}`, params);
    return res.rows[0] ?? null;
  }
  let q = supabase.from(table).delete();
  q = applyFilters(q, filters);
  const result = await q.select("id").maybeSingle();
  if (result.error) throw dbError();
  return result.data;
}

// PostgREST refuses an unfiltered delete, so collect the ids first and delete by id; raw SQL does not.
export async function clearTable(supabase, table) {
  if (isPg(supabase)) {
    await pgRun(supabase, `DELETE FROM ${quoteIdent(table)}`, []);
    return;
  }
  const rows = await findMany(supabase, table, "id", { limit: 2000 });
  const ids = rows.map((r) => r.id);
  if (!ids.length) return;
  const result = await supabase.from(table).delete().in("id", ids).select("id");
  if (result.error) throw dbError();
}

// Application identity: session token issued by /auth/login. Carried in x-sm-token, not
// Authorization, because the platform adapter strips Authorization (it carries the DB anon key).
export async function getSessionUser(supabase, request) {
  const header = request.headers.get("x-sm-token") || "";
  const match = /^([a-f0-9]{64})$/i.exec(header.trim());
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
