import http from "node:http";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { handle } from "../functions/handler.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_BODY = 1024 * 1024;

// --- Postgres (Neon) -------------------------------------------------------
// node-pg does not implement SCRAM channel binding, so drop that URL flag; and
// normalize sslmode to verify-full so the driver does not print its deprecation
// warning and always validates Neon's certificate.
function normalizeDbUrl(raw) {
  let u = String(raw).replace(/[&?]channel_binding=require/, "");
  u = u.replace(/([?&])sslmode=(?:require|prefer|verify-ca)/, "$1sslmode=verify-full");
  return u;
}

// PostgREST (the Qoder runtime) returns timestamps as ISO strings and the routes
// rely on that (e.g. String.slice on created_at). node-pg returns Date objects by
// default, so reuse its parser and re-serialize to the same ISO-8601 UTC string.
const { types } = pg;
for (const oid of [1184, 1114]) {
  const base = types.getTypeParser(oid);
  types.setTypeParser(oid, (v) => {
    if (v == null) return v;
    const d = base(v);
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : v;
  });
}

if (!process.env.DATABASE_URL) {
  console.error("[server] DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString: normalizeDbUrl(process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: true },
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});
pool.on("error", (err) => console.error("[pg] idle client error", err.message));

// --- Static assets ---------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
  ".ttf": "font/ttf", ".map": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8",
};

function resolveStatic(pathname) {
  const rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  const full = path.resolve(DIST, rel);
  if (full !== DIST && !full.startsWith(DIST + path.sep)) return null; // traversal guard
  return full;
}

async function serveStatic(req, res, pathname) {
  let file = resolveStatic(pathname);
  if (!file) { res.writeHead(403).end("Forbidden"); return; }
  let s = await stat(file).catch(() => null);
  if (s && s.isDirectory()) { file = path.join(file, "index.html"); s = await stat(file).catch(() => null); }
  if (!s) { // SPA fallback: unknown route -> index.html (client router handles it)
    file = path.join(DIST, "index.html");
    s = await stat(file).catch(() => null);
    if (!s) { res.writeHead(404).end("Not found"); return; }
  }
  const ext = path.extname(file).toLowerCase();
  const isAsset = file.includes(`${path.sep}assets${path.sep}`);
  const headers = {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : isAsset ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  };
  const body = await readFile(file);
  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}

// --- HTTP <-> Web bridge ---------------------------------------------------
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error("payload_too_large"), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

async function handleApi(req, res) {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `http://${host}${req.url}`;
  const raw = await readBody(req);
  const hasBody = raw.length > 0 && !["GET", "HEAD"].includes(req.method);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) for (const item of v) headers.append(k, item);
  }
  const request = new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? new Uint8Array(raw) : undefined,
  });
  const response = await handle({ request, supabase: pool });
  const buf = Buffer.from(await response.arrayBuffer());
  const out = {};
  response.headers.forEach((v, k) => { out[k] = v; });
  res.writeHead(response.status, out);
  res.end(req.method === "HEAD" ? undefined : buf);
}

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || "/").split("?")[0];
  try {
    if (pathname.startsWith("/functions/")) {
      if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res, pathname);
  } catch (err) {
    const status = err && err.status ? err.status : 503;
    if (!res.headersSent) {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: status === 503 ? "service_error" : "request_error" }));
    } else {
      res.end();
    }
    if (status >= 500) console.error("[server]", err && err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[server] Citymarket Dakar listening on http://${HOST}:${PORT} (dist: ${DIST})`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, closing`);
  server.close(() => pool.end().then(() => process.exit(0)).catch(() => process.exit(0)));
  setTimeout(() => process.exit(0), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
