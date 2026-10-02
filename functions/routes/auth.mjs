import { fail, ok, readJson, str, digits, newId, token, now, daysFromNow, hashPassword, newSalt } from "../lib/util.mjs";
import { findOne, insertRow, getSessionUser } from "../lib/db.mjs";

export async function authRoutes(ctx, segments) {
  const { supabase, request } = ctx;
  const action = segments[0];

  if (request.method === "POST" && action === "register") {
    const body = (await readJson(request)) || {};
    const name = str(body.name, 80);
    const phone = digits(body.phone, 15);
    const password = typeof body.password === "string" ? body.password : "";
    const email = str(body.email, 120).toLowerCase();
    if (name.length < 2) return fail("invalid_name");
    if (phone.length < 9) return fail("invalid_phone");
    if (password.length < 6) return fail("weak_password");
    const existing = await findOne(supabase, "users", "id", { phone });
    if (existing) return fail("phone_taken", 409);
    const salt = newSalt();
    const passHash = await hashPassword(password, salt);
    const user = await insertRow(supabase, "users", {
      id: newId(), role: "customer", name, phone, email: email || null,
      pass_hash: passHash, pass_salt: salt, created_at: now(),
    }, "id,name,phone,role");
    const sessionId = token();
    await insertRow(supabase, "sessions", { id: sessionId, user_id: user.id, created_at: now(), expires_at: daysFromNow(30) });
    return ok({ token: sessionId, user });
  }

  if (request.method === "POST" && action === "login") {
    const body = (await readJson(request)) || {};
    const phone = digits(body.phone, 15);
    const password = typeof body.password === "string" ? body.password : "";
    const user = await findOne(supabase, "users", "id,role,name,phone,email,pass_hash,pass_salt", { phone });
    if (!user) return fail("invalid_credentials", 401);
    const hash = await hashPassword(password, user.pass_salt);
    if (hash !== user.pass_hash) return fail("invalid_credentials", 401);
    const sessionId = token();
    await insertRow(supabase, "sessions", { id: sessionId, user_id: user.id, created_at: now(), expires_at: daysFromNow(30) });
    return ok({ token: sessionId, user: { id: user.id, role: user.role, name: user.name, phone: user.phone } });
  }

  if (request.method === "POST" && action === "logout") {
    const header = request.headers.get("authorization") || "";
    const match = /^Bearer ([a-f0-9]{64})$/i.exec(header.trim());
    if (match) {
      const { deleteRow } = await import("../lib/db.mjs");
      await deleteRow(supabase, "sessions", { id: match[1].toLowerCase() });
    }
    return ok({});
  }

  if (request.method === "GET" && action === "me") {
    const user = await getSessionUser(supabase, request);
    if (!user) return fail("login_required", 401);
    return ok({ user });
  }

  return fail("not_found", 404);
}
