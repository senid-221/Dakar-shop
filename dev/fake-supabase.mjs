import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = resolve(process.cwd(), "dev/db.json");

function load() {
  if (!existsSync(DB_PATH)) return {};
  return JSON.parse(readFileSync(DB_PATH, "utf8"));
}

let db = load();

export function resetDb(fresh) {
  db = fresh;
  save();
}

function save() {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 1));
}

function matches(row, query) {
  for (const [column, value] of query.eq) {
    if (row[column] !== value) return false;
  }
  for (const [column, values] of query.ins) {
    if (!values.includes(row[column])) return false;
  }
  for (const [column, pattern] of query.ilikes) {
    const needle = pattern.replace(/%/g, "").toLowerCase();
    const hay = String(row[column] ?? "").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  for (const [column, value] of query.gtes) {
    if (!(row[column] >= value)) return false;
  }
  for (const [column, value] of query.ltes) {
    if (!(row[column] <= value)) return false;
  }
  return true;
}

function pick(row, cols) {
  if (!cols || cols === "*") return { ...row };
  const out = {};
  for (const column of cols.split(",").map((c) => c.trim())) {
    if (column in row) out[column] = row[column];
  }
  return out;
}

class Builder {
  constructor(table, mode) {
    this.table = table;
    this.mode = mode;
    this.cols = "*";
    this.countMode = null;
    this.query = { eq: [], ins: [], ilikes: [], gtes: [], ltes: [] };
    this.orders = [];
    this.limitN = null;
    this.offsetN = 0;
    this.patch = null;
    this.payload = null;
  }

  select(cols, opts) {
    this.cols = cols || "*";
    if (opts && opts.count) this.countMode = opts.count;
    return this;
  }

  eq(column, value) { this.query.eq.push([column, value]); return this; }
  is(column, value) { this.query.eq.push([column, value]); return this; }
  in(column, values) { this.query.ins.push([column, values]); return this; }
  ilike(column, pattern) { this.query.ilikes.push([column, pattern]); return this; }
  gte(column, value) { this.query.gtes.push([column, value]); return this; }
  lte(column, value) { this.query.ltes.push([column, value]); return this; }
  order(column, { ascending = true } = {}) { this.orders.push([column, ascending]); return this; }
  limit(n) { this.limitN = n; return this; }
  range(a, b) { this.offsetN = a; this.limitN = b - a + 1; return this; }

  insert(payload) { this.mode = "insert"; this.payload = payload; return this; }
  update(patch) { this.mode = "update"; this.patch = patch; return this; }
  delete() { this.mode = "delete"; return this; }

  run() {
    const rows = db[this.table] || (db[this.table] = []);
    if (this.mode === "insert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = list.map((row) => ({ ...row }));
      rows.push(...inserted);
      save();
      const data = inserted.map((row) => pick(row, this.cols));
      return { data: Array.isArray(this.payload) ? data : data, error: null, insertedMany: Array.isArray(this.payload) };
    }
    const matched = rows.filter((row) => matches(row, this.query));
    for (const [column, ascending] of this.orders) {
      matched.sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (ascending ? 1 : -1));
    }
    const total = matched.length;
    if (this.mode === "update") {
      for (const row of matched) Object.assign(row, this.patch);
      save();
    }
    if (this.mode === "delete") {
      const ids = new Set(matched.map((r) => r.id));
      db[this.table] = rows.filter((r) => !ids.has(r.id));
      save();
    }
    let window = matched.slice(this.offsetN, this.limitN == null ? undefined : this.offsetN + this.limitN);
    const data = window.map((row) => pick(row, this.cols));
    return { data, error: null, count: this.countMode ? total : undefined, deletedOrUpdated: matched.length };
  }

  async maybeSingle() {
    const result = this.run();
    if (result.data.length > 1) return { data: null, error: { message: "multiple_rows" } };
    return { data: result.data[0] ?? null, error: null };
  }

  async single() {
    const result = this.run();
    if (result.data.length !== 1) return { data: null, error: { message: result.data.length ? "multiple_rows" : "no_rows" } };
    return { data: result.data[0], error: null };
  }

  then(resolve, reject) {
    try {
      const result = this.run();
      resolve({ data: result.data, error: null, count: result.count });
    } catch (error) {
      reject(error);
    }
  }
}

export function createFakeSupabase() {
  return { from: (table) => new Builder(table, "select") };
}
