// Canonical seed content. dev/seed.mjs builds the local JSON database from it and
// scripts/gen-migration-sql.mjs emits the cloud migration INSERTs from the same source.
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=60`;

export const categories = [
  { slug: "bakery", name: "Bakery", description: "Bread, cakes, pastries and fresh bakes from Dakar ovens.", icon: "croissant", sort: 1 },
  { slug: "milky", name: "Milky Products", description: "Milk, yogurt, cheese, butter and cream.", icon: "milk", sort: 2 },
  { slug: "electronics", name: "Electronics", description: "TVs, laptops, audio and computer equipment.", icon: "tv", sort: 3 },
  { slug: "phones", name: "Mobile Phones", description: "Smartphones, feature phones and accessories.", icon: "smartphone", sort: 4 },
  { slug: "clothes", name: "Clothes", description: "Men, women and children fashion and shoes.", icon: "shirt", sort: 5 },
];

export const products = [
  { slug: "baguette-tradition", category: "bakery", name: "Baguette Tradition", price: 300, stock: 120, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Baguette_mie.jpg/960px-Baguette_mie.jpg", description: "Crusty French-style baguette baked twice a day, the Dakar breakfast classic." },
  { slug: "whole-wheat-loaf", category: "bakery", name: "Whole Wheat Loaf 700g", price: 1500, stock: 60, image: img("photo-1509440159596-0249088772ff"), description: "Soft whole wheat sandwich loaf, sliced on request." },
  { slug: "chocolate-celebration-cake", category: "bakery", name: "Chocolate Celebration Cake", price: 8000, compare: 9500, stock: 15, image: img("photo-1578985545062-69928b1d9587"), description: "Three layers of moist chocolate sponge with rich ganache, serves 8.", variants: [{ kind: "size", label: "8 slices", price_delta: 0, stock: 10 }, { kind: "size", label: "12 slices", price_delta: 3000, stock: 5 }] },
  { slug: "butter-croissant", category: "bakery", name: "Butter Croissant", price: 500, stock: 90, image: img("photo-1555507036-ab1f4038808a"), description: "Flaky, golden croissant made with pure butter." },
  { slug: "pain-au-chocolat", category: "bakery", name: "Pain au Chocolat", price: 600, stock: 70, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Pain_au_chocolat_Luc_Viatour.jpg/960px-Pain_au_chocolat_Luc_Viatour.jpg", description: "Laminated pastry with two bars of dark chocolate." },
  { slug: "glazed-donut", category: "bakery", name: "Glazed Donut", price: 700, stock: 80, image: img("photo-1551024601-bec78aea704b"), description: "Pillowy donut with a shiny sugar glaze.", variants: [{ kind: "flavor", label: "Classic glaze", price_delta: 0, stock: 40 }, { kind: "flavor", label: "Chocolate sprinkle", price_delta: 100, stock: 40 }] },
  { slug: "chocolate-chip-cookies", category: "bakery", name: "Chocolate Chip Cookies (6)", price: 2500, stock: 45, image: img("photo-1499636136210-6f4ee915583e"), description: "Six crunchy-edged, chewy-centre cookies with dark chocolate chips." },
  { slug: "blueberry-muffin", category: "bakery", name: "Blueberry Muffin", price: 900, stock: 40, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Blueberry_muffin_-_GAIL%27s_2025-03-10.jpg/960px-Blueberry_muffin_-_GAIL%27s_2025-03-10.jpg", description: "Breakfast muffin loaded with wild blueberries." },
  { slug: "whole-milk-1l", category: "milky", name: "Whole Milk 1L", price: 1000, stock: 100, image: img("photo-1550583724-b2692b85b150"), description: "Pasteurised whole milk, kept cold from dairy to door." },
  { slug: "natural-yogurt-500g", category: "milky", name: "Natural Yogurt 500g", price: 1200, stock: 70, image: img("photo-1488477181946-6428a0291777"), description: "Thick set yogurt with live cultures, no added sugar.", variants: [{ kind: "flavor", label: "Natural", price_delta: 0, stock: 40 }, { kind: "flavor", label: "Strawberry", price_delta: 200, stock: 30 }] },
  { slug: "semi-soft-cheese-250g", category: "milky", name: "Semi-Soft Cheese 250g", price: 3500, stock: 35, image: img("photo-1486297678162-eb2a19b0a32d"), description: "Creamy table cheese for sandwiches and salads." },
  { slug: "churned-butter-250g", category: "milky", name: "Churned Butter 250g", price: 2000, stock: 50, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/2023_Mas%C5%82o_w_maselniczce.jpg/960px-2023_Mas%C5%82o_w_maselniczce.jpg", description: "Slow-churned butter with a clean, fresh finish." },
  { slug: "whipping-cream-250ml", category: "milky", name: "Whipping Cream 250ml", price: 2500, stock: 40, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/And_some_whipped_cream_%284315201282%29.jpg/960px-And_some_whipped_cream_%284315201282%29.jpg", description: "35% fat cream that whips up light for desserts and sauces." },
  { slug: "smart-tv-43", category: "electronics", name: 'Smart TV 43" 4K', price: 185000, compare: 210000, stock: 12, image: img("photo-1593359677879-a4bb92f829d1"), description: '43-inch 4K UHD smart TV with built-in streaming apps and 2 HDMI ports.' },
  { slug: "business-laptop-14", category: "electronics", name: 'Business Laptop 14"', price: 450000, stock: 8, image: img("photo-1496181133206-80ce9b88a853"), description: "Lightweight 14-inch laptop, 16GB RAM, 512GB SSD — work and study ready.", variants: [{ kind: "memory", label: "16GB / 512GB", price_delta: 0, stock: 5 }, { kind: "memory", label: "32GB / 1TB", price_delta: 90000, stock: 3 }] },
  { slug: "desktop-computer-set", category: "electronics", name: "Desktop Computer Set", price: 320000, stock: 6, image: img("photo-1593640408182-31c70c8268f5"), description: "Complete desktop set with tower, 24-inch monitor, keyboard and mouse." },
  { slug: "bluetooth-speaker", category: "electronics", name: "Portable Bluetooth Speaker", price: 25000, compare: 30000, stock: 30, image: img("photo-1608043152269-423dbba4e7e1"), description: "Water-resistant speaker with 12-hour battery and deep bass." },
  { slug: "over-ear-headphones", category: "electronics", name: "Over-Ear Headphones", price: 15000, stock: 40, image: img("photo-1505740420928-5e560c06d30e"), description: "Cushioned over-ear headphones with microphone for calls." },
  { slug: "wireless-mouse", category: "electronics", name: "Wireless Mouse", price: 7500, stock: 55, image: img("photo-1527864550417-7fd91fc51a46"), description: "Silent-click wireless mouse with USB receiver, 12-month battery." },
  { slug: "smartphone-x10", category: "phones", name: "Smartphone X10 128GB", price: 95000, stock: 20, image: img("photo-1511707171634-5f897ff02aa9"), description: "6.5-inch smartphone, 128GB storage, dual SIM, 5000mAh battery.", variants: [{ kind: "color", label: "Midnight", price_delta: 0, stock: 10 }, { kind: "color", label: "Ocean Blue", price_delta: 0, stock: 10 }] },
  { slug: "smartphone-pro-5g", category: "phones", name: "Smartphone Pro 5G 256GB", price: 245000, compare: 265000, stock: 10, image: img("photo-1598327105666-5b89351aff97"), description: "Flagship 5G phone with triple camera and 256GB storage." },
  { slug: "feature-phone-dual", category: "phones", name: "Feature Phone Dual SIM", price: 15000, stock: 35, image: img("photo-1512941937669-90a1b58e7e9c"), description: "Reliable dual-SIM feature phone with torch and 3-week standby." },
  { slug: "fast-charger-25w", category: "phones", name: "Fast Charger 25W USB-C", price: 5000, stock: 80, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/SAMSUNG_EP-T4510_45W_POWER_ADAPER_BLACK_%26_USB_C_TO_C_CABLE.jpg/960px-SAMSUNG_EP-T4510_45W_POWER_ADAPER_BLACK_%26_USB_C_TO_C_CABLE.jpg", description: "25W USB-C wall charger with 1m braided cable." },
  { slug: "silicone-phone-case", category: "phones", name: "Silicone Phone Case", price: 3500, stock: 100, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/Mobile_phone_case.jpg/960px-Mobile_phone_case.jpg", description: "Shock-absorbing silicone case with raised camera lip.", variants: [{ kind: "color", label: "Black", price_delta: 0, stock: 40 }, { kind: "color", label: "Green", price_delta: 0, stock: 30 }, { kind: "color", label: "Sand", price_delta: 0, stock: 30 }] },
  { slug: "earphones-buds", category: "phones", name: "Wireless Earphones", price: 9000, compare: 12000, stock: 60, image: img("photo-1572569511254-d8f925fe2cbb"), description: "True-wireless earbuds with charging case and touch controls." },
  { slug: "mens-cotton-tshirt", category: "clothes", name: "Men's Cotton T-Shirt", price: 5000, stock: 70, image: img("photo-1521572163474-6864f9cf17ab"), description: "Breathable 100% cotton tee, pre-shrunk.", variants: [{ kind: "size", label: "M", price_delta: 0, stock: 25 }, { kind: "size", label: "L", price_delta: 0, stock: 25 }, { kind: "size", label: "XL", price_delta: 0, stock: 20 }] },
  { slug: "womens-summer-dress", category: "clothes", name: "Women's Summer Dress", price: 12000, compare: 15000, stock: 40, image: img("photo-1595777457583-95e059d581b8"), description: "Light flowing dress in wax-inspired print, perfect for Dakar heat.", variants: [{ kind: "size", label: "S", price_delta: 0, stock: 15 }, { kind: "size", label: "M", price_delta: 0, stock: 15 }, { kind: "size", label: "L", price_delta: 0, stock: 10 }] },
  { slug: "mens-classic-shirt", category: "clothes", name: "Men's Classic Shirt", price: 9000, stock: 50, image: img("photo-1596755094514-f87e34085b2c"), description: "Smart-casual button shirt in crisp cotton blend." },
  { slug: "chino-trousers", category: "clothes", name: "Chino Trousers", price: 11000, stock: 45, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Trousers-colourisolated.jpg/960px-Trousers-colourisolated.jpg", description: "Slim-fit stretch chinos for office or weekend." },
  { slug: "urban-sneakers", category: "clothes", name: "Urban Sneakers", price: 25000, compare: 29000, stock: 30, image: img("photo-1542291026-7eec264c27ff"), description: "Cushioned everyday sneakers with grippy sole.", variants: [{ kind: "size", label: "41", price_delta: 0, stock: 10 }, { kind: "size", label: "43", price_delta: 0, stock: 10 }, { kind: "size", label: "45", price_delta: 0, stock: 10 }] },
  { slug: "leather-handbag", category: "clothes", name: "Leather Handbag", price: 15000, stock: 25, image: img("photo-1584917865442-de89df76afd3"), description: "Structured vegan-leather handbag with inner zip pocket." },
  { slug: "kids-printed-tshirt", category: "clothes", name: "Kids Printed T-Shirt", price: 3500, stock: 60, image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Kids_character_clothing_in_Colma_Target_store.jpg/960px-Kids_character_clothing_in_Colma_Target_store.jpg", description: "Soft kids tee with playful print, ages 4-10.", variants: [{ kind: "size", label: "4-6y", price_delta: 0, stock: 20 }, { kind: "size", label: "7-10y", price_delta: 0, stock: 40 }] },
];

export const zones = [
  { slug: "plateau", name: "Plateau", fee: 1000, cod: true, lat: 14.6728, lng: -17.438, radius: 3 },
  { slug: "medina", name: "Médina", fee: 1000, cod: true, lat: 14.6836, lng: -17.4478, radius: 3 },
  { slug: "mermoz", name: "Mermoz", fee: 1000, cod: true, lat: 14.7167, lng: -17.4677, radius: 3 },
  { slug: "point-e", name: "Point E", fee: 1000, cod: true, lat: 14.7069, lng: -17.4678, radius: 3 },
  { slug: "han-bel-air", name: "Hann Bel-Air", fee: 1500, cod: true, lat: 14.7, lng: -17.4167, radius: 4 },
  { slug: "sacre-coeur", name: "Sacré-Coeur", fee: 1500, cod: true, lat: 14.718, lng: -17.456, radius: 3 },
  { slug: "ouakam", name: "Ouakam", fee: 1500, cod: true, lat: 14.7367, lng: -17.4975, radius: 4 },
  { slug: "yoff", name: "Yoff", fee: 1500, cod: true, lat: 14.745, lng: -17.473, radius: 4 },
  { slug: "grand-yoff", name: "Grand Yoff", fee: 1500, cod: true, lat: 14.75, lng: -17.4667, radius: 4 },
  { slug: "almadies", name: "Almadies", fee: 2000, cod: true, lat: 14.7392, lng: -17.513, radius: 5 },
  { slug: "parcelles-assainies", name: "Parcelles Assainies", fee: 2000, cod: true, lat: 14.7833, lng: -17.4833, radius: 5 },
  { slug: "guediawaye", name: "Guédiawaye", fee: 2500, cod: true, lat: 14.7667, lng: -17.4167, radius: 5 },
  { slug: "pikine", name: "Pikine", fee: 2500, cod: true, lat: 14.7667, lng: -17.45, radius: 5 },
  { slug: "keur-massar", name: "Keur Massar", fee: 3000, cod: true, lat: 14.8, lng: -17.35, radius: 6 },
  { slug: "rufisque", name: "Rufisque", fee: 3500, cod: false, lat: 14.7167, lng: -17.25, radius: 6 },
];

export const coupons = [
  { code: "WELCOME10", kind: "percent", value: 10, min: 5000, days: 60, limit: 500, categorySlug: null },
  { code: "DAKAR500", kind: "fixed", value: 500, min: 10000, days: 45, limit: 300, categorySlug: null },
  { code: "SWEET15", kind: "percent", value: 15, min: 3000, days: 30, limit: 200, categorySlug: "bakery" },
];

export const campaigns = [
  { name: "2% back on every delivered order", kind: "order_completed_percent", value: 2, threshold: 0, active: true },
  { name: "50,000 FCFA spending milestone", kind: "milestone", value: 2500, threshold: 50000, active: true },
];

export const staff = [
  { name: "Moussa Diop", phone: "77 123 45 67", active: true },
  { name: "Awa Ndiaye", phone: "78 234 56 78", active: true },
];

export const settings = {
  storeName: "Dakar Shop",
  supportWhatsApp: "221775784158",
  codGlobal: true,
  bonusEarnPercent: 2,
  packageTiers: [{ minItems: 3, pct: 5 }, { minItems: 5, pct: 8 }, { minItems: 8, pct: 10 }],
};

export const presetPackages = [
  {
    name: "Dakar Breakfast Box",
    description: "Baguettes, croissants, milk and butter — a week of mornings sorted.",
    items: [
      { slug: "baguette-tradition", qty: 4 },
      { slug: "butter-croissant", qty: 4 },
      { slug: "whole-milk-1l", qty: 2 },
      { slug: "churned-butter-250g", qty: 1 },
    ],
  },
  {
    name: "Office Refresh Pack",
    description: "Earbuds, mouse and cookies for the team.",
    items: [
      { slug: "earphones-buds", qty: 1 },
      { slug: "wireless-mouse", qty: 1 },
      { slug: "chocolate-chip-cookies", qty: 2 },
    ],
  },
];

export const accounts = [
  { role: "admin", name: "Store Admin", phone: "775784158", password: "Admin@2026" },
  { role: "customer", name: "Aminata Fall", phone: "770001122", password: "Demo@2026" },
];
