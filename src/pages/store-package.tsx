import { useEffect, useMemo, useState } from "react";
import { Minus, Package, Plus, Save, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, navigate, useRoute } from "@/src/lib/router";
import { api, errorMessage } from "@/src/lib/api";
import { useApp, type CartLine } from "@/src/state/app";
import { Loader } from "@/src/components/product-card";
import { PageTitle, EmptyState } from "@/src/components/shell";
import { fcfa } from "@/src/lib/format";
import { toast } from "sonner";

type BuilderLine = { productId: string; variantId: string | null; qty: number; name: string; variantLabel: string | null; price: number; image: string };

export function PackagePage() {
  const { categories, settings, addToCart, user } = useApp();
  const { params } = useRoute();
  const [lines, setLines] = useState<BuilderLine[]>([]);
  const [quote, setQuote] = useState<any | null>(null);
  const [pickerCategory, setPickerCategory] = useState("");
  const [pickerResults, setPickerResults] = useState<any[] | null>(null);
  const [search, setSearch] = useState("");
  const [saveName, setSaveName] = useState("");
  const [myPackages, setMyPackages] = useState<any[]>([]);

  const tiers = settings.packageTiers || [{ minItems: 3, pct: 5 }, { minItems: 5, pct: 8 }, { minItems: 8, pct: 10 }];

  useEffect(() => {
    if (user) api("/packages/mine").then((res) => setMyPackages(res.packages)).catch(() => undefined);
    else setMyPackages([]);
  }, [user]);

  // Deep links: ?add=productId, ?preset=presetId or ?load=savedPackageId
  useEffect(() => {
    const add = params.get("add");
    const preset = params.get("preset");
    const load = params.get("load");
    if (add) {
      api(`/products/${add}`, { auth: false })
        .then((res) => {
          const variant = res.variants[0] || null;
          setLines((prev) => (prev.some((l) => l.productId === add) ? prev : [...prev, { productId: res.product.id, variantId: variant?.id || null, qty: 1, name: res.product.name, variantLabel: variant?.label || null, price: res.product.price + (variant?.price_delta || 0), image: res.product.image_url }]));
        })
        .catch(() => undefined);
    }
    if (load) {
      api("/packages/mine")
        .then(async (res) => {
          const found = res.packages.find((p: any) => p.id === load);
          if (!found) return;
          const loaded: BuilderLine[] = [];
          for (const item of found.items) {
            try {
              const detail = await api(`/products/${item.product_id}`, { auth: false });
              const variant = detail.variants.find((v: any) => v.id === item.variant_id) || null;
              loaded.push({ productId: detail.product.id, variantId: variant?.id || null, qty: item.qty, name: detail.product.name, variantLabel: variant?.label || null, price: detail.product.price + (variant?.price_delta || 0), image: detail.product.image_url });
            } catch {
              /* product removed */
            }
          }
          setLines(loaded);
          toast.info(`Loaded "${found.name}" into the builder.`);
        })
        .catch(() => undefined);
    }
    if (preset) {
      api("/packages/presets", { auth: false })
        .then(async (res) => {
          const found = res.packages.find((p: any) => p.id === preset);
          if (!found) return;
          const loaded: BuilderLine[] = [];
          for (const item of found.items) {
            try {
              const detail = await api(`/products/${item.product_id}`, { auth: false });
              const variant = detail.variants.find((v: any) => v.id === item.variant_id) || detail.variants[0] || null;
              loaded.push({ productId: detail.product.id, variantId: variant?.id || null, qty: item.qty, name: detail.product.name, variantLabel: variant?.label || null, price: detail.product.price + (variant?.price_delta || 0), image: detail.product.image_url });
            } catch {
              /* product removed */
            }
          }
          setLines(loaded);
          toast.info(`Loaded preset "${found.name}".`);
        })
        .catch(() => undefined);
    }
  }, [params]);

  useEffect(() => {
    let alive = true;
    if (!lines.length) {
      setQuote(null);
      return;
    }
    api("/package/quote", { body: { items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })) }, auth: false })
      .then((res) => alive && setQuote(res))
      .catch(() => alive && setQuote(null));
    return () => {
      alive = false;
    };
  }, [lines]);

  useEffect(() => {
    let alive = true;
    setPickerResults(null);
    api(`/products?category=${encodeURIComponent(pickerCategory)}&q=${encodeURIComponent(search)}&limit=8`, { auth: false })
      .then((res) => alive && setPickerResults(res.products))
      .catch(() => alive && setPickerResults([]));
    return () => {
      alive = false;
    };
  }, [pickerCategory, search]);

  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const nextTier = tiers.find((t: any) => t.minItems > itemCount);

  function addProduct(product: any) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id && !l.variantId);
      if (existing) return prev.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId: product.id, variantId: null, qty: 1, name: product.name, variantLabel: null, price: product.price, image: product.image_url }];
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageTitle title="Make Your Package" subtitle={`Your selection ${itemCount} of ${nextTier ? nextTier.minItems : itemCount || 0} — the discount applies automatically.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
            <h2 className="font-bold">Your package ({itemCount} items)</h2>
            {!lines.length && <p className="mt-2 text-sm text-muted-foreground">Add products from the picker below, or load one of your saved packages.</p>}
            <ul className="mt-3 space-y-2">
              {lines.map((line, index) => (
                <li key={`${line.productId}:${line.variantId || "-"}`} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-2">
                  <img src={line.image} alt="" className="h-12 w-12 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{line.name}{line.variantLabel ? ` · ${line.variantLabel}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{fcfa(line.price)} each</p>
                  </div>
                  <div className="flex items-center rounded-md border border-border">
                    <button type="button" className="p-1.5" aria-label="Decrease" onClick={() => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, qty: Math.max(1, l.qty - 1) } : l)))}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center text-xs font-bold">{line.qty}</span>
                    <button type="button" className="p-1.5" aria-label="Increase" onClick={() => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, qty: l.qty + 1 } : l)))}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button type="button" className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
            {nextTier && lines.length > 0 && (
              <p className="mt-3 rounded-2xl bg-gold/15 px-3 py-2 text-xs font-semibold text-[#8a6116]">
                Add {nextTier.minItems - itemCount} more item{nextTier.minItems - itemCount > 1 ? "s" : ""} to unlock {nextTier.pct}% off.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
            <h2 className="font-bold">Add products</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setPickerCategory("")} className={`rounded-full px-3 py-1 text-xs font-semibold ${!pickerCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>All</button>
              {categories.map((c: any) => (
                <button key={c.id} type="button" onClick={() => setPickerCategory(c.slug)} className={`rounded-full px-3 py-1 text-xs font-semibold ${pickerCategory === c.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{c.name}</button>
              ))}
            </div>
            <Input className="mt-3" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products for package" />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {pickerResults === null ? <div className="col-span-full"><Loader /></div> : pickerResults.map((product: any) => (
                <button key={product.id} type="button" onClick={() => addProduct(product)} className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white/70 text-left transition-colors hover:border-primary/60">
                  <img src={product.image_url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                  <span className="line-clamp-1 p-2 text-xs font-semibold">{product.name}</span>
                  <span className="px-2 pb-2 text-xs text-muted-foreground">{fcfa(product.price)}</span>
                </button>
              ))}
            </div>
          </div>

          {myPackages.length > 0 && (
            <div className="mt-6 rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur">
              <h2 className="font-bold">Saved packages</h2>
              <ul className="mt-2 space-y-2">
                {myPackages.map((pkg) => (
                  <li key={pkg.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-white/70 p-2 text-sm">
                    <span className="font-semibold">{pkg.name} <span className="text-xs text-muted-foreground">· {pkg.items.length} products</span></span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const loaded: BuilderLine[] = [];
                        for (const item of pkg.items) {
                          try {
                            const detail = await api(`/products/${item.product_id}`, { auth: false });
                            const variant = detail.variants.find((v: any) => v.id === item.variant_id) || null;
                            loaded.push({ productId: detail.product.id, variantId: variant?.id || null, qty: item.qty, name: detail.product.name, variantLabel: variant?.label || null, price: detail.product.price + (variant?.price_delta || 0), image: detail.product.image_url });
                          } catch {
                            /* product removed */
                          }
                        }
                        setLines(loaded);
                        toast.info(`Loaded "${pkg.name}" into the builder.`);
                      }}
                    >
                      Load
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-3xl border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur lg:sticky lg:top-20">
          <h2 className="font-bold">Package summary</h2>
          {!quote ? (
            <p className="mt-2 text-sm text-muted-foreground">Add at least one product to see pricing and your automatic discount.</p>
          ) : (
            <>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Individual total</dt><dd className="font-semibold">{fcfa(quote.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Package discount ({quote.discountPercent}%)</dt><dd className="font-semibold text-primary">−{fcfa(quote.discount)}</dd></div>
                <div className="flex justify-between border-t border-border pt-1.5 text-base"><dt className="font-bold">Package price</dt><dd className="font-extrabold">{fcfa(quote.total)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">You save</dt><dd className="font-bold text-terra">{fcfa(quote.discount)}</dd></div>
              </dl>
              <div className="mt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    const packageId = crypto.randomUUID();
                    for (const line of lines) {
                      const cartLine: CartLine = { productId: line.productId, variantId: line.variantId, qty: line.qty, packageId, name: line.name, variantLabel: line.variantLabel, price: line.price, image: line.image };
                      addToCart(cartLine);
                    }
                    toast.success(`Package added to cart with ${quote.discountPercent}% discount.`);
                    navigate("/cart");
                  }}
                >
                  <ShoppingCart className="mr-1 h-4 w-4" /> Add package to cart
                </Button>
                <div className="flex gap-2">
                  <Input placeholder="Name this package" value={saveName} onChange={(e) => setSaveName(e.target.value)} aria-label="Package name" />
                  <Button
                    variant="outline"
                    aria-label="Save package"
                    onClick={async () => {
                      if (!user) return toast.error("Sign in to save packages.");
                      if (saveName.trim().length < 2) return toast.error("Give the package a name.");
                      try {
                        await api("/packages", { body: { name: saveName.trim(), items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })) } });
                        toast.success("Package saved for future orders.");
                        setSaveName("");
                        const res = await api("/packages/mine");
                        setMyPackages(res.packages);
                      } catch (error) {
                        toast.error(errorMessage(error));
                      }
                    }}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
          <div className="mt-4 rounded-2xl bg-white/70 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-bold text-foreground">How package discounts work</p>
            <ul className="mt-1 space-y-0.5">
              {tiers.map((tier: any) => (
                <li key={tier.minItems}>{tier.minItems}+ items → {tier.pct}% off</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
