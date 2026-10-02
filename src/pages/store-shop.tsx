import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Heart, Minus, Plus, ShoppingCart, SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Link, navigate, useRoute } from "@/src/lib/router";
import { api, errorMessage } from "@/src/lib/api";
import { useApp, type CartLine } from "@/src/state/app";
import { ProductGrid, Loader } from "@/src/components/product-card";
import { PageTitle, EmptyState } from "@/src/components/shell";
import { fcfa } from "@/src/lib/format";
import { toast } from "sonner";

export function ShopPage() {
  const { categories } = useApp();
  const { params } = useRoute();
  const category = params.get("category") || "";
  const initialQuery = params.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(params.get("sort") || "popular");
  const [products, setProducts] = useState<any[] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  useEffect(() => {
    let alive = true;
    setProducts(null);
    api(`/products?category=${encodeURIComponent(category)}&sort=${sort}&limit=48`, { auth: false })
      .then((res) => alive && setProducts(res.products))
      .catch(() => alive && setProducts([]));
    return () => {
      alive = false;
    };
  }, [category, sort]);

  const visible = useMemo(() => {
    let list = products || [];
    if (query) list = list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));
    return list;
  }, [products, query, maxPrice]);

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageTitle
        title={activeCategory ? activeCategory.name : "All products"}
        subtitle={activeCategory ? activeCategory.description : "Fresh stock from Dakar shops, delivered to your area."}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in results" aria-label="Search in results" />
        </div>
        <NativeSelect value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products" className="w-auto">
          <option value="popular">Most popular</option>
          <option value="new">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </NativeSelect>
        <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          <SlidersHorizontal className="mr-1 h-4 w-4" /> Filters
        </Button>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button type="button" onClick={() => navigate("/shop")} className={`rounded-full px-3 py-1 text-xs font-semibold ${!category ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>All</button>
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => navigate(`/shop?category=${c.slug}`)} className={`rounded-full px-3 py-1 text-xs font-semibold ${category === c.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      {showFilters && (
        <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="maxprice">Max price (FCFA)</Label>
            <Input id="maxprice" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 20000" />
          </div>
        </div>
      )}
      {products === null ? <Loader /> : visible.length ? <ProductGrid products={visible} /> : <EmptyState icon={ShoppingCart} title="No products match" body="Try another search term, remove filters or browse another category." action={<Button variant="outline" onClick={() => { setQuery(""); setMaxPrice(""); navigate("/shop"); }}>Clear filters</Button>} />}
    </div>
  );
}

export function ProductPage({ id }: { id: string }) {
  const { addToCart, favorites, toggleFavorite, user } = useApp();
  const [data, setData] = useState<any | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let alive = true;
    setData(null);
    api(`/products/${id}`, { auth: false })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setVariantId(res.variants[0]?.id || null);
        setQty(1);
      })
      .catch(() => alive && setData({ missing: true }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (!data) return <Loader />;
  if (data.missing) return <div className="mx-auto max-w-3xl px-4 py-10"><EmptyState icon={ShoppingCart} title="Product not found" body="It may have been removed from the catalog." action={<Link to="/shop"><Button>Back to shop</Button></Link>} /></div>;

  const product = data.product;
  const variants = data.variants as any[];
  const variant = variants.find((v) => v.id === variantId) || null;
  const unit = product.price + (variant?.price_delta || 0);
  const favored = favorites.includes(product.id);
  const kinds = [...new Set(variants.map((v) => v.kind))];

  function add(packageId: string | null = null) {
    const line: CartLine = { productId: product.id, variantId: variant?.id || null, qty, packageId, name: product.name, variantLabel: variant?.label || null, price: unit, image: product.image_url };
    addToCart(line);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/shop" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Back to shop</Link>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="panel-blush relative overflow-hidden rounded-[2.5rem] p-5 shadow-[0_24px_60px_-30px_rgba(124,92,230,0.45)]">
          <span className="blob -right-8 -top-8 h-28 w-28 bg-[#f6b9d6]/70" />
          <span className="blob -left-6 bottom-10 h-20 w-20 bg-[#b9a5f0]/60" />
          <img src={product.image_url} alt={product.name} className="relative aspect-square w-full rounded-[2rem] object-cover shadow-md" />
          <button
            type="button"
            aria-label={favored ? "Remove from favorites" : "Save to favorites"}
            onClick={async () => {
              if (!user) return toast.error("Sign in to save favorites.");
              try {
                await toggleFavorite(product.id);
              } catch (error) {
                toast.error(errorMessage(error));
              }
            }}
            className="absolute right-8 top-8 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur transition-transform hover:scale-105"
          >
            <Heart className={`h-5 w-5 ${favored ? "fill-terra text-terra" : "text-muted-foreground"}`} />
          </button>
          <button
            type="button"
            disabled={product.stock === 0}
            aria-label={`Add ${product.name} to cart`}
            onClick={() => {
              add();
              toast.success(`${product.name} added to cart.`);
            }}
            className="btn-gradient absolute bottom-9 right-9 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-sm font-semibold text-terra">
            <Star className="mr-1 inline h-4 w-4 fill-terra" />
            {product.rating} · loved by Dakar shoppers
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          <dl className="mt-6 grid grid-cols-3 divide-x divide-border/70 border-y border-border/70 py-4 text-center">
            <div>
              <dt className="text-xs text-muted-foreground">Price</dt>
              <dd className="mt-1 font-display text-lg font-bold text-terra">{fcfa(unit)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">In stock</dt>
              <dd className="mt-1 font-display text-lg font-bold">{product.stock > 0 ? product.stock : "Out"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Rating</dt>
              <dd className="mt-1 font-display text-lg font-bold">{product.rating}</dd>
            </div>
          </dl>
          {product.compare_price > product.price && (
            <p className="mt-2 text-xs text-muted-foreground">Was <span className="line-through">{fcfa(product.compare_price)}</span> — you save {fcfa(product.compare_price - unit)}.</p>
          )}

          {kinds.map((kind) => (
            <div key={kind} className="mt-5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{kind}</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {variants.filter((v) => v.kind === kind).map((v) => (
                  <button key={v.id} type="button" onClick={() => setVariantId(v.id)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${variantId === v.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-white/70 text-muted-foreground"}`}>
                    {v.label}{v.price_delta ? ` (+${fcfa(v.price_delta)})` : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border bg-white/70">
              <button type="button" className="p-2.5" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center text-sm font-bold">{qty}</span>
              <button type="button" className="p-2.5" onClick={() => setQty((q) => Math.min(product.stock || 50, q + 1))} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
            <Button
              size="lg"
              disabled={product.stock === 0}
              onClick={() => {
                add();
                toast.success(`${product.name} added to cart.`);
              }}
            >
              <ShoppingCart className="mr-1 h-4 w-4" /> Add to cart
            </Button>
          </div>
          <div className="mt-3 flex gap-3">
            <Button
              variant="secondary"
              disabled={product.stock === 0}
              onClick={() => {
                add();
                navigate("/checkout");
              }}
            >
              Buy now
            </Button>
            <Button
              variant="ghost"
              disabled={product.stock === 0}
              onClick={() => navigate(`/package?add=${product.id}`)}
            >
              Add to a package
            </Button>
          </div>
          <p className="mt-6 rounded-2xl bg-white/70 p-3.5 text-xs leading-relaxed text-muted-foreground">
            Delivered across Dakar and suburbs. Combine 3+ items in a package for an automatic 5% discount — 8+ items save 10%.
          </p>
        </div>
      </div>
    </div>
  );
}
