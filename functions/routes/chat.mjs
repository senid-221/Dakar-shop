import { fail, ok, readJson, str } from "../lib/util.mjs";
import { findOne, findMany, getSettings } from "../lib/db.mjs";
import { STATUS_LABELS } from "../lib/util.mjs";

const HELP = "I can help with: finding products, order status, delivery areas and fees, payments (Orange Money, Wave, cash on delivery), packages and discounts, coupons, gift orders, or reaching our support team on WhatsApp. What would you like to do?";

export async function chatRoutes(ctx, segments) {
  const { supabase, request } = ctx;
  if (segments[0] !== "chat" || request.method !== "POST") return null;
  const body = (await readJson(request)) || {};
  const message = str(body.message, 300).toLowerCase();
  if (!message) return fail("empty_message");
  const settings = await getSettings(supabase);
  const whatsapp = settings.supportWhatsApp || "221775784158";

  const codeMatch = /sm-\d{4,}/i.exec(message);
  if (codeMatch) {
    const order = await findOne(supabase, "orders", "id,code,status,total", { code: codeMatch[0].toUpperCase() });
    if (!order) return ok({ reply: `I could not find an order with code ${codeMatch[0].toUpperCase()}. Please check the code in your Orders page, or ask me anything else.`, actions: [] });
    const events = await findMany(supabase, "order_events", "status,created_at", { filters: { order_id: order.id }, order: { column: "created_at", ascending: false }, limit: 1 });
    return ok({
      reply: `Order ${order.code} is currently "${STATUS_LABELS[order.status]}". Last update: ${events[0] ? new Date(events[0].created_at).toLocaleString() : "just placed"}. You can follow every step on the Track Order page.`,
      actions: [{ label: "Track order", href: `/track/${order.code}` }],
    });
  }

  if (/(hello|hi|salam|good (morning|afternoon|evening))/.test(message)) {
    return ok({ reply: `Hello! Welcome to Citymarket Dakar. ${HELP}`, actions: [] });
  }

  if (/(coupon|promo|discount code)/.test(message)) {
    const coupons = await findMany(supabase, "coupons", "code,kind,value,min_order,expires_at", { filters: { active: true }, limit: 10 });
    const live = coupons.filter((c) => new Date(c.expires_at).getTime() > Date.now());
    if (!live.length) return ok({ reply: "There are no active coupons right now. New coupons appear on the homepage and in your account.", actions: [] });
    const list = live.map((c) => `${c.code} — ${c.kind === "percent" ? c.value + "% off" : c.value + " FCFA off"} (min. ${c.min_order} FCFA)`).join(" · ");
    return ok({ reply: `Available coupons: ${list}. Enter the code at checkout.`, actions: [{ label: "Go to checkout", href: "/checkout" }] });
  }

  if (/(deliver|delivery|fee|fees|zone|area|arrive|shipping)/.test(message)) {
    const zones = await findMany(supabase, "delivery_zones", "name,fee", { filters: { active: true }, order: { column: "fee" }, limit: 20 });
    const min = zones.length ? Math.min(...zones.map((z) => z.fee)) : 0;
    const max = zones.length ? Math.max(...zones.map((z) => z.fee)) : 0;
    return ok({
      reply: `We deliver across Dakar and suburbs. Delivery fees range from ${min} to ${max} FCFA depending on your area (for example ${zones.slice(0, 3).map((z) => `${z.name} ${z.fee}`).join(", ")}). At checkout you can share your GPS pin or type your address manually — no GPS permission required.`,
      actions: [{ label: "See delivery areas", href: "/delivery-areas" }],
    });
  }

  if (/(pay|payment|wave|orange money|cash|cod|pay on delivery)/.test(message)) {
    return ok({
      reply: "We accept Orange Money, Wave and Cash on Delivery (in eligible areas). For Orange Money and Wave you send the exact total to our merchant number at checkout and we confirm it within minutes; with Cash on Delivery you pay the rider when your order arrives.",
      actions: [{ label: "Start an order", href: "/shop" }],
    });
  }

  if (/(gift|present|send to someone|recipient)/.test(message)) {
    return ok({
      reply: "Any order can be sent as a gift: at checkout enable the gift option, enter the recipient's name, phone number and Dakar address, and add a personal message if you like. You pay, they receive — and you can still track the delivery from your account.",
      actions: [{ label: "How checkout works", href: "/checkout" }],
    });
  }

  if (/(package|bundle|combine|box)/.test(message)) {
    return ok({
      reply: "With Build Your Package you combine products from any categories into one package and get an automatic discount: 3+ items 5% off, 5+ items 8% off, 8+ items 10% off. You can save a package and reorder it anytime.",
      actions: [{ label: "Build a package", href: "/package" }],
    });
  }

  if (/(bonus|reward|points|wallet)/.test(message)) {
    return ok({
      reply: "You earn a bonus on every delivered order (a percentage of the order total) plus milestone rewards from active campaigns. Your bonus balance can be used to pay part of your next order at checkout.",
      actions: [{ label: "My rewards", href: "/account/rewards" }],
    });
  }

  if (/(agent|human|whatsapp|contact|support|complain|problem)/.test(message)) {
    return ok({
      reply: "Our support team replies on WhatsApp every day. Tap the button below to chat with us directly, or use the WhatsApp button at the bottom-right of the screen.",
      actions: [{ label: "Chat on WhatsApp", href: `https://wa.me/${whatsapp}` }],
    });
  }

  // Product discovery fallback: search the catalog with the customer's words.
  const stopwords = /^(do|you|have|is|are|there|any|the|a|an|i|want|need|looking|for|to|buy|show|me|price|of|in|stock|please|some|get|order)$/;
  const keywords = message.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stopwords.test(w));
  if (keywords.length) {
    for (const keyword of keywords.slice(0, 3)) {
      const products = await findMany(supabase, "products", "id,name,price,image_url", { filters: { active: true }, ilike: { column: "name", value: keyword }, limit: 3 });
      if (products.length) {
        const list = products.map((p) => `${p.name} — ${p.price} FCFA`).join(" · ");
        return ok({ reply: `We have these for "${keyword}": ${list}. Tap a product below to see details and variations.`, actions: products.map((p) => ({ label: p.name, href: `/product/${p.id}` })) });
      }
    }
    const categories = await findMany(supabase, "categories", "slug,name", { limit: 10 });
    const category = categories.find((c) => keywords.includes(c.slug) || keywords.some((k) => c.name.toLowerCase().includes(k)));
    if (category) {
      return ok({ reply: `Browse our ${category.name} selection — fresh stock delivered across Dakar.`, actions: [{ label: category.name, href: `/shop?category=${category.slug}` }] });
    }
  }

  return ok({ reply: `I did not find a direct answer for that. ${HELP}`, actions: [{ label: "WhatsApp support", href: `https://wa.me/${whatsapp}` }] });
}
