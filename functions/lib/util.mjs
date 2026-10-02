export const CORS = { "cache-control": "no-store" };

export function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export function fail(code, status = 400, extra) {
  return json({ ok: false, error: code, ...(extra || {}) }, status);
}

export function ok(payload) {
  return json({ ok: true, ...payload });
}

export async function readJson(request, maxBytes = 64 * 1024) {
  if (!request.body) return null;
  const buf = await request.arrayBuffer();
  if (buf.byteLength > maxBytes) throw Object.assign(new Error("payload_too_large"), { status: 413 });
  if (buf.byteLength === 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

export function str(value, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function int(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = typeof value === "number" ? value : parseInt(value, 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export function digits(value, max = 20) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, max) : "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uid(value) {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export function newId() {
  return crypto.randomUUID();
}

export function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const enc = new TextEncoder();

export async function hashPassword(password, saltHex) {
  const salt = hexToBytes(saltHex);
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

export function newSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function now() {
  return new Date().toISOString();
}

export function daysFromNow(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function orderCode() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `SM-${n}`;
}

export const ORDER_STATUSES = [
  "order_placed",
  "payment_confirmed",
  "preparing",
  "ready_for_delivery",
  "rider_assigned",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const STATUS_LABELS = {
  order_placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  preparing: "Preparing Order",
  ready_for_delivery: "Ready for Delivery",
  rider_assigned: "Rider Assigned",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
