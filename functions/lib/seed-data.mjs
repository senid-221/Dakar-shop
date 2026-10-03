// Canonical seed content. dev/seed.mjs builds the local JSON database from it and
// scripts/gen-migration-sql.mjs emits the cloud migration INSERTs from the same source.
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=60`;

export const categories = [
  { slug: "bakery", name: "Bakery", description: "Bread, cakes, pastries and fresh bakes from Dakar ovens.", icon: "croissant", sort: 1 },
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
  storeName: "Citymarket Dakar",
  supportWhatsApp: "221775784158",
  codGlobal: true,
  bonusEarnPercent: 2,
  packageTiers: [{ minItems: 3, pct: 5 }, { minItems: 5, pct: 8 }, { minItems: 8, pct: 10 }],
};

export const presetPackages = [
  {
    name: "Dakar Breakfast Box",
    description: "Baguettes, croissants and pains au chocolat — a week of mornings sorted.",
    items: [
      { slug: "baguette-tradition", qty: 4 },
      { slug: "butter-croissant", qty: 4 },
      { slug: "pain-au-chocolat", qty: 2 },
    ],
  },
  {
    name: "Sweet Treats Pack",
    description: "Donuts, cookies and muffins for the whole team.",
    items: [
      { slug: "glazed-donut", qty: 3 },
      { slug: "chocolate-chip-cookies", qty: 2 },
      { slug: "blueberry-muffin", qty: 2 },
    ],
  },
];

export const accounts = [
  { role: "admin", name: "Store Admin", phone: "775784158", password: "Admin@2026" },
  { role: "customer", name: "Aminata Fall", phone: "770001122", password: "Demo@2026" },
];
