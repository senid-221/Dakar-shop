import { fail, ok } from "./lib/util.mjs";
import { ensureSeeded } from "./lib/bootstrap.mjs";
import { authRoutes } from "./routes/auth.mjs";
import { publicRoutes } from "./routes/public.mjs";
import { orderRoutes } from "./routes/orders.mjs";
import { accountRoutes } from "./routes/account.mjs";
import { adminRoutes } from "./routes/admin.mjs";
import { chatRoutes } from "./routes/chat.mjs";

// The Sites gateway forwards requests under a physical mount prefix and replaces the logical
// "app" segment with the upstream function name, so the pathname this handler receives varies by
// environment: /functions/v1/<upstream>/<route> in production, /functions/v1/app/<route> in the dev
// harness, or /<route> if the prefix is stripped. Drop the leading mount tokens, then drop the
// function-name segment unless the next segment is already a known top-level route.
const TOP_LEVEL_ROUTES = new Set([
  "auth", "chat", "categories", "products", "zones", "settings", "coupons",
  "packages", "package", "track", "delivery", "orders", "addresses",
  "favorites", "notifications", "rewards", "admin",
]);

function routeSegments(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  while (segments.length && (segments[0] === "functions" || segments[0] === "v1")) segments.shift();
  if (segments.length && !TOP_LEVEL_ROUTES.has(segments[0])) segments.shift();
  return segments;
}

export async function handle({ request, supabase }) {
  const url = new URL(request.url);
  const segments = routeSegments(url.pathname);
  const ctx = { request, supabase, url };

  try {
    await ensureSeeded(supabase);

    if (request.method === "GET" && segments.length === 0) return ok({ service: "sunu-market", version: 1 });

    if (segments[0] === "auth") return await authRoutes(ctx, segments.slice(1));
    if (segments[0] === "chat") return await chatRoutes(ctx, segments);

    const pub = await publicRoutes(ctx, segments, url);
    if (pub) return pub;

    if (segments[0] === "orders") {
      const res = await orderRoutes(ctx, segments);
      if (res) return res;
    }
    if (["addresses", "favorites", "packages", "notifications", "rewards"].includes(segments[0])) {
      const res = await accountRoutes(ctx, segments);
      if (res) return res;
    }
    if (segments[0] === "admin") {
      const res = await adminRoutes(ctx, segments.slice(1));
      if (res) return res;
    }

    return fail("not_found", 404);
  } catch (error) {
    if (error && error.status) return fail(error.message || "request_error", error.status);
    return fail("service_error", 503);
  }
}
