import { fail, ok, readJson, str } from "../lib/util.mjs";
import { findOne, findMany, getSettings } from "../lib/db.mjs";
import { STATUS_LABELS } from "../lib/util.mjs";

// Brand facts. These mirror the footer credits and checkout, so the assistant
// always tells the truth about who runs the shop, who built it and how to pay.
const FOUNDER = "RWAMIGABO Innocent";
const DEVELOPER = "IRAGUHA Vincent";
const DEVELOPER_WHATSAPP = "250726969060";
const MERCHANT_NUMBER = "+221 77 578 41 58";

const HELP = "I know everything about Citymarket Dakar. Ask me about: our bakery products and prices, how to order, delivery areas and fees, payments (Orange Money, Wave, cash on delivery), packages and discounts, coupons, gift orders, order status, where we operate, who runs the shop, who built this app, or how to reach support on WhatsApp. What would you like to know?";

async function cheapestProducts(supabase) {
  return findMany(supabase, "products", "id,name,price,image_url", {
    filters: { active: true },
    order: { column: "price", ascending: true },
    limit: 100,
  });
}

async function productSearch(supabase, message) {
  const stopwords = /^(do|you|have|is|are|there|any|the|a|an|i|want|need|looking|for|to|buy|show|me|price|prices|of|in|stock|please|some|get|order|how|much|cost|does|what|your|the|money|fcfa)$/;
  const keywords = message.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stopwords.test(w));
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
  return null;
}

export async function chatRoutes(ctx, segments) {
  const { supabase, request } = ctx;
  if (segments[0] !== "chat" || request.method !== "POST") return null;
  const body = (await readJson(request)) || {};
  const message = str(body.message, 300).toLowerCase();
  if (!message) return fail("empty_message");
  const settings = await getSettings(supabase);
  const storeName = settings.storeName || "Citymarket Dakar";
  const whatsapp = settings.supportWhatsApp || "221775784158";
  const tiers = Array.isArray(settings.packageTiers) ? settings.packageTiers : [];
  const tiersText = tiers.length
    ? tiers.map((t) => `${t.minItems}+ items ${t.pct}% off`).join(", ")
    : "3+ items 5% off, 5+ items 8% off, 8+ items 10% off";

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

  if (/\b(hello|hi|hey|salam|good (morning|afternoon|evening))\b/.test(message)) {
    return ok({ reply: `Hello! Welcome to ${storeName}. ${HELP}`, actions: [] });
  }

  // Who built this app / website
  if (/(who (built|made|developed|created|designed|coded)|(web|app|software)? ?developer|programmer|engineer|built this|made this|created this|who did the (website|app|design)|uyubatse|uwakoze)/.test(message)) {
    return ok({
      reply: `${storeName} was designed and built by web developer ${DEVELOPER}. You can reach ${DEVELOPER} on WhatsApp at +250 72 696 90 60 for anything about the website or the app.`,
      actions: [{ label: `WhatsApp ${DEVELOPER}`, href: `https://wa.me/${DEVELOPER_WHATSAPP}` }],
    });
  }

  // Who runs / represents the shop
  if (/(founder|owner|who (runs|owns|manages|represents|started)|represent|manager|behind (this|citymarket|the shop)|ceo|director|uyihagarariye|nyirayo|boss)/.test(message)) {
    return ok({
      reply: `${storeName} is owned and represented by its founder, ${FOUNDER}. Our support team answers every day on WhatsApp at +221 77 578 41 58.`,
      actions: [{ label: "Chat on WhatsApp", href: `https://wa.me/${whatsapp}` }],
    });
  }

  // How to order (steps)
  if (/(how (do i|to|can i) (order|buy|purchase|place|get)|order process|steps to order|how to order|place an order|how ordering works|how does (ordering|it) work|start an order|how can i buy|gutumiza|commander|ntumiza)/.test(message)) {
    return ok({
      reply: `Ordering from ${storeName} takes four steps:\n1. Browse the shop and add products to your cart — or tap "Build a Package" to combine items and save up to 10%.\n2. At checkout choose your delivery area (share a GPS pin or type the address manually — no GPS permission needed) and enter the recipient's name and phone.\n3. Pay with Orange Money, Wave, or Cash on Delivery where available.\n4. Follow your rider live on the Track Order page until it arrives.\nYou can also send any order as a gift to someone else.`,
      actions: [{ label: "Start an order", href: "/shop" }, { label: "Build a package", href: "/package" }],
    });
  }

  if (/(coupon|promo|discount code|code)/.test(message)) {
    const coupons = await findMany(supabase, "coupons", "code,kind,value,min_order,expires_at", { filters: { active: true }, limit: 10 });
    const live = coupons.filter((c) => new Date(c.expires_at).getTime() > Date.now());
    if (!live.length) return ok({ reply: "There are no active coupons right now. New coupons appear on the homepage and in your account.", actions: [] });
    const list = live.map((c) => `${c.code} — ${c.kind === "percent" ? c.value + "% off" : c.value + " FCFA off"} (min. ${c.min_order} FCFA)`).join(" · ");
    return ok({ reply: `Available coupons: ${list}. Enter the code at checkout.`, actions: [{ label: "Go to checkout", href: "/checkout" }] });
  }

  if (/(deliver|delivery|fee|fees|zone|area|arrive|shipping|how long|delivery time)/.test(message)) {
    const zones = await findMany(supabase, "delivery_zones", "name,fee", { filters: { active: true }, order: { column: "fee" }, limit: 50 });
    const min = zones.length ? Math.min(...zones.map((z) => z.fee)) : 0;
    const max = zones.length ? Math.max(...zones.map((z) => z.fee)) : 0;
    return ok({
      reply: `We deliver across Dakar and its suburbs — ${zones.length} areas in total. Delivery fees range from ${min} to ${max} FCFA depending on your area (for example ${zones.slice(0, 3).map((z) => `${z.name} ${z.fee} FCFA`).join(", ")}). At checkout you can share your GPS pin or type your address manually — no GPS permission required.`,
      actions: [{ label: "See delivery areas", href: "/delivery-areas" }],
    });
  }

  // Where the shop operates / is located
  if (/(where (are you|is (the )?(shop|store|citymarket)|do you (operate|work))|located|location|based|which (city|country|area)|your (shop|store)|operate|working hours|address of|aho (ikorera|mukorera)|muhe)/.test(message)) {
    const zones = await findMany(supabase, "delivery_zones", "name", { filters: { active: true }, limit: 50 });
    const examples = zones.slice(0, 6).map((z) => z.name).join(", ");
    return ok({
      reply: `${storeName} is based in Dakar, Senegal, and delivers across Dakar and its suburbs${zones.length ? ` — ${zones.length} areas including ${examples}` : ""}. You order online and our riders bring it to your door; there is no walk-in counter. For help reaching us, tap WhatsApp below.`,
      actions: [{ label: "See delivery areas", href: "/delivery-areas" }, { label: "Chat on WhatsApp", href: `https://wa.me/${whatsapp}` }],
    });
  }

  // Prices (a specific product wins; otherwise a price summary)
  if (/(price|prices|pricing|how much|cost|expensive|cheap|tariff|ibiciro|igiciro|bingana)/.test(message)) {
    const specific = await productSearch(supabase, message);
    if (specific) return specific;
    const products = await cheapestProducts(supabase);
    if (!products.length) return ok({ reply: `Ask me about any product and I will tell you its price. ${HELP}`, actions: [{ label: "Browse the shop", href: "/shop" }] });
    const min = products[0].price;
    const max = products[products.length - 1].price;
    const examples = products.slice(0, 4).map((p) => `${p.name} ${p.price} FCFA`).join(" · ");
    return ok({
      reply: `Our bakery prices run from ${min} to ${max} FCFA. For example: ${examples}. Delivery is charged separately and depends on your area, and Build Your Package gives automatic discounts (${tiersText}). Ask me for any product by name to get its exact price.`,
      actions: [{ label: "Browse the shop", href: "/shop" }, { label: "Build a package", href: "/package" }],
    });
  }

  if (/(pay|payment|wave|orange money|cash|cod|pay on delivery|kwishyura|wishyura|merchant)/.test(message)) {
    return ok({
      reply: `We accept Orange Money, Wave and Cash on Delivery (in eligible areas).\n• Orange Money / Wave: send the exact total to our merchant number ${MERCHANT_NUMBER} after placing the order, then tap "I have sent the payment" — we confirm within minutes.\n• Cash on Delivery: pay the rider when your order arrives (only where your zone allows it).`,
      actions: [{ label: "Start an order", href: "/shop" }, { label: "Chat on WhatsApp", href: `https://wa.me/${whatsapp}` }],
    });
  }

  if (/(gift|present|send to someone|recipient|impano)/.test(message)) {
    return ok({
      reply: "Any order can be sent as a gift: at checkout enable the gift option, enter the recipient's name, phone number and Dakar address, and add a personal message if you like. You pay, they receive — and you can still track the delivery from your account.",
      actions: [{ label: "How checkout works", href: "/checkout" }],
    });
  }

  if (/(package|bundle|combine|box|package discount)/.test(message)) {
    return ok({
      reply: `With Build Your Package you combine products from any categories into one package and get an automatic discount: ${tiersText}. You can save a package and reorder it anytime.`,
      actions: [{ label: "Build a package", href: "/package" }],
    });
  }

  if (/(bonus|reward|points|wallet|cashback)/.test(message)) {
    return ok({
      reply: "You earn a bonus on every delivered order (a percentage of the order total) plus milestone rewards from active campaigns. Your bonus balance can be used to pay part of your next order at checkout.",
      actions: [{ label: "My rewards", href: "/account/rewards" }],
    });
  }

  if (/(agent|human|whatsapp|contact|support|complain|problem|help me|reach)/.test(message)) {
    return ok({
      reply: "Our support team replies on WhatsApp every day. Tap the button below to chat with us directly, or use the WhatsApp button at the bottom-right of the screen.",
      actions: [{ label: "Chat on WhatsApp", href: `https://wa.me/${whatsapp}` }],
    });
  }

  // Product discovery fallback: search the catalog with the customer's words.
  const found = await productSearch(supabase, message);
  if (found) return found;

  return ok({ reply: `I did not find a direct answer for that. ${HELP}`, actions: [{ label: "WhatsApp support", href: `https://wa.me/${whatsapp}` }] });
}
