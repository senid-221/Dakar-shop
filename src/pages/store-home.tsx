import { useEffect, useState } from "react";
import { ArrowRight, Bike, Croissant, Gift, MapPin, Milk, Package, Percent, Shirt, Smartphone, Sparkles, Star, Tv, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/src/lib/router";
import { api } from "@/src/lib/api";
import { useApp } from "@/src/state/app";
import { ProductGrid, Loader } from "@/src/components/product-card";
import { fcfa } from "@/src/lib/format";

const CATEGORY_ICONS: Record<string, any> = { croissant: Croissant, milk: Milk, tv: Tv, smartphone: Smartphone, shirt: Shirt };

export function HomePage() {
  const { categories, zones, settings } = useApp();
  const [featured, setFeatured] = useState<any[] | null>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api("/products?sort=popular&limit=8", { auth: false }),
      api("/packages/presets", { auth: false }),
      api("/coupons/available", { auth: false }),
    ])
      .then(([products, packages, couponRes]) => {
        if (!alive) return;
        setFeatured(products.products);
        setPresets(packages.packages);
        setCoupons(couponRes.coupons);
      })
      .catch(() => alive && setFeatured([]));
    return () => {
      alive = false;
    };
  }, []);

  const minFee = zones.length ? Math.min(...zones.map((z) => z.fee)) : 1000;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm">
            <MapPin className="h-3.5 w-3.5" /> Delivery across Dakar &amp; suburbs
          </p>
          <h1 className="font-display mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Dakar's market, <span className="text-terra">delivered to your door</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Fresh bakery and dairy, phones, electronics and fashion from trusted shops. Build your own package, send it as a gift, pay with Orange Money, Wave or cash on delivery.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/shop"><Button size="lg">Start to Order <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
            <Link to="/package"><Button size="lg" variant="outline" className="border-white/70 bg-white/70">Build a Package</Button></Link>
          </div>
          <dl className="mt-9 grid max-w-md grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-border/60 bg-white/75 p-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Delivery from</dt>
              <dd className="mt-1 text-sm font-extrabold">{fcfa(minFee)}</dd>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/75 p-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Zones</dt>
              <dd className="mt-1 text-sm font-extrabold">{zones.length || 15} areas</dd>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/75 p-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Package save</dt>
              <dd className="mt-1 text-sm font-extrabold">up to 10%</dd>
            </div>
          </dl>
        </div>
        <div className="panel-blush relative overflow-hidden rounded-[2.5rem] p-5 shadow-[0_24px_60px_-30px_rgba(124,92,230,0.5)] md:p-7">
          <span className="blob -left-8 -top-8 h-28 w-28 bg-[#f6b9d6]/70" />
          <span className="blob -right-6 top-16 h-20 w-20 bg-[#b9a5f0]/60" />
          <img
            src="https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/DakarGueuleTap%C3%A9e2.jpg/960px-DakarGueuleTap%C3%A9e2.jpg"
            alt="Assorted market products: bread, fruit and groceries"
            className="relative aspect-[4/3] w-full rounded-[2rem] object-cover shadow-md"
          />
          <div className="relative mt-5 rounded-[1.75rem] bg-white/85 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">Fresh every morning</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-terra"><Star className="h-3.5 w-3.5 fill-terra" /> 4.8 · loved across Dakar</p>
              </div>
              <Bike className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Riders across Dakar track your order live, from basket to doorstep.</p>
            <Link to="/shop" className="mt-4 block"><Button className="w-full" size="lg">Start to Order</Button></Link>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">Shop by category</h2>
          <Link to="/shop" className="text-sm font-semibold text-primary hover:underline">All products</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon] || Package;
            return (
              <Link key={category.id} to={`/shop?category=${category.slug}`} className="group flex flex-col gap-2 rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur transition-colors hover:border-primary/50">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <span className="font-bold leading-tight">{category.name}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{category.description}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="py-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">Featured products</h2>
          <Link to="/shop?sort=popular" className="text-sm font-semibold text-primary hover:underline">See more</Link>
        </div>
        {featured ? <ProductGrid products={featured} /> : <Loader />}
      </section>

      <section className="py-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">Special packages</h2>
          <Link to="/package" className="text-sm font-semibold text-primary hover:underline">Build your own</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {presets.map((preset) => (
            <div key={preset.id} className="flex flex-col rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="font-bold">{preset.name}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{preset.description}</p>
              <p className="mt-2 text-xs font-semibold text-primary">{preset.items.length} products · automatic package discount</p>
              <Link to={`/package?preset=${preset.id}`} className="mt-3"><Button variant="outline" size="sm">View package</Button></Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 py-8 md:grid-cols-3">
        <div className="rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
          <Percent className="h-5 w-5 text-terra" />
          <h3 className="mt-2 font-bold">Active coupons</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {coupons.slice(0, 3).map((coupon) => (
              <li key={coupon.code}><span className="font-mono font-bold text-foreground">{coupon.code}</span> — {coupon.kind === "percent" ? `${coupon.value}% off` : fcfa(coupon.value)} · min {fcfa(coupon.min_order)}</li>
            ))}
            {!coupons.length && <li>No active coupons right now.</li>}
          </ul>
        </div>
        <div className="rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
          <Wallet className="h-5 w-5 text-gold" />
          <h3 className="mt-2 font-bold">Bonuses on every order</h3>
          <p className="mt-2 text-sm text-muted-foreground">Earn {settings.bonusEarnPercent ?? 2}% back on delivered orders, plus milestone rewards. Use your balance to pay part of the next order.</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
          <Gift className="h-5 w-5 text-primary" />
          <h3 className="mt-2 font-bold">Send it as a gift</h3>
          <p className="mt-2 text-sm text-muted-foreground">Choose a recipient in Dakar, add a personal message, pay yourself and track the delivery until it reaches them.</p>
        </div>
      </section>

      <section className="py-8">
        <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">How ordering works</h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {[
            { icon: Sparkles, title: "Browse & choose", body: "Search products, pick variations, save favorites." },
            { icon: Package, title: "Cart or package", body: "Add items or combine them into a discounted package." },
            { icon: MapPin, title: "Pick delivery", body: "GPS pin or typed address — your choice, always." },
            { icon: Bike, title: "Pay & track", body: "Orange Money, Wave or cash. Follow every step." },
          ].map((step, index) => (
            <li key={step.title} className="rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">{index + 1}</span>
              <h3 className="mt-2 flex items-center gap-1.5 font-bold"><step.icon className="h-4 w-4 text-primary" /> {step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
