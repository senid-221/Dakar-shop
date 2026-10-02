import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LottieLoader } from "@/src/components/lottie";
import { Link, navigate } from "@/src/lib/router";
import { useApp, lineKey, type CartLine } from "@/src/state/app";
import { fcfa } from "@/src/lib/format";
import { toast } from "sonner";
import { errorMessage } from "@/src/lib/api";

export function ProductCard({ product, onQuickAdd = true }: { product: any; onQuickAdd?: boolean }) {
  const { addToCart, favorites, toggleFavorite, user } = useApp();
  const favored = favorites.includes(product.id);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-white/85 shadow-[0_10px_30px_-18px_rgba(124,92,230,0.35)] backdrop-blur">
      <Link to={`/product/${product.id}`} className="relative block aspect-square overflow-hidden bg-secondary">
        <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        {product.compare_price > product.price && (
          <span className="absolute left-2 top-2 rounded-full bg-terra px-2 py-0.5 text-[11px] font-bold text-white">
            -{Math.round((1 - product.price / product.compare_price) * 100)}%
          </span>
        )}
        {product.stock === 0 && <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-bold text-muted-foreground">Out of stock</span>}
      </Link>
      <button
        type="button"
        aria-label={favored ? "Remove from favorites" : "Save to favorites"}
        onClick={async () => {
          if (!user) {
            toast.error("Sign in to save favorites.");
            return;
          }
          try {
            await toggleFavorite(product.id);
          } catch (error) {
            toast.error(errorMessage(error));
          }
        }}
        className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 shadow-sm"
      >
        <Heart className={`h-4 w-4 ${favored ? "fill-terra text-terra" : "text-muted-foreground"}`} />
      </button>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to={`/product/${product.id}`} className="font-display line-clamp-2 text-[15px] font-bold leading-snug hover:underline">{product.name}</Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-gold text-gold" /> {product.rating?.toFixed?.(1) || product.rating}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-[15px] font-extrabold text-terra">{fcfa(product.price)}</p>
            {product.compare_price > product.price && <p className="text-xs text-muted-foreground line-through">{fcfa(product.compare_price)}</p>}
          </div>
          {onQuickAdd && product.stock > 0 && (
            <Button
              size="sm"
              aria-label={`Add ${product.name} to cart`}
              onClick={() => {
                const line: CartLine = { productId: product.id, variantId: null, qty: 1, packageId: null, name: product.name, variantLabel: null, price: product.price, image: product.image_url };
                addToCart(line);
                toast.success(`${product.name} added to cart.`, { action: { label: "View cart", onClick: () => navigate("/cart") } });
              }}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function Loader({ label = "Loading…" }: { label?: string }) {
  return <LottieLoader label={label} className="py-14" />;
}
