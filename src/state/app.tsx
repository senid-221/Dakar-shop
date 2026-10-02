import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "@/src/lib/api";

export type CartLine = {
  productId: string;
  variantId: string | null;
  qty: number;
  packageId?: string | null;
  name: string;
  variantLabel?: string | null;
  price: number;
  image: string;
};

type User = { id: string; role: string; name: string; phone: string } | null;

type AppState = {
  user: User;
  authReady: boolean;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  cart: CartLine[];
  addToCart: (line: CartLine) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  cartCount: number;
  favorites: string[];
  toggleFavorite: (productId: string) => Promise<void>;
  settings: any;
  zones: any[];
  categories: any[];
  reloadMeta: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function lineKey(line: { productId: string; variantId: string | null; packageId?: string | null }) {
  return `${line.productId}:${line.variantId || "-"}:${line.packageId || "-"}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sm_cart") || "[]");
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>({ packageTiers: [{ minItems: 3, pct: 5 }, { minItems: 5, pct: 8 }, { minItems: 8, pct: 10 }] });
  const [zones, setZones] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    localStorage.setItem("sm_cart", JSON.stringify(cart));
  }, [cart]);

  const reloadMeta = useCallback(async () => {
    const [settingsRes, zonesRes, categoriesRes] = await Promise.all([
      api("/settings", { auth: false }),
      api("/zones", { auth: false }),
      api("/categories", { auth: false }),
    ]);
    setSettings(settingsRes.settings);
    setZones(zonesRes.zones);
    setCategories(categoriesRes.categories);
  }, []);

  useEffect(() => {
    reloadMeta().catch(() => undefined);
  }, [reloadMeta]);

  useEffect(() => {
    let alive = true;
    async function boot() {
      if (getToken()) {
        try {
          const res = await api("/auth/me");
          if (alive) setUser(res.user);
        } catch {
          if (alive) setUser(null);
        }
      }
      if (alive) setAuthReady(true);
    }
    boot();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadFavorites() {
      if (!user) {
        if (alive) setFavorites([]);
        return;
      }
      try {
        const res = await api("/favorites");
        if (alive) setFavorites(res.favorites.map((f: any) => f.product_id));
      } catch {
        /* favorites need a fresh login */
      }
    }
    loadFavorites();
    return () => {
      alive = false;
    };
  }, [user]);

  const addToCart = useCallback((line: CartLine) => {
    setCart((prev) => {
      const key = lineKey(line);
      const existing = prev.find((l) => lineKey(l) === key);
      if (existing) return prev.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(50, l.qty + line.qty) } : l));
      return [...prev, line];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) => (qty <= 0 ? prev.filter((l) => lineKey(l) !== key) : prev.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(50, qty) } : l))));
  }, []);

  const removeLine = useCallback((key: string) => {
    setCart((prev) => prev.filter((l) => lineKey(l) !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!user) throw new Error("login_required");
      const has = favorites.includes(productId);
      if (has) {
        await api(`/favorites/${productId}`, { method: "DELETE" });
        setFavorites((prev) => prev.filter((id) => id !== productId));
      } else {
        await api("/favorites", { body: { productId } });
        setFavorites((prev) => [...prev, productId]);
      }
    },
    [favorites, user],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { body: {} });
    } catch {
      /* session expires anyway */
    }
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo<AppState>(
    () => ({ user, authReady, setUser, logout, cart, addToCart, setQty, removeLine, clearCart, cartCount: cart.reduce((s, l) => s + l.qty, 0), favorites, toggleFavorite, settings, zones, categories, reloadMeta }),
    [user, authReady, logout, cart, addToCart, setQty, removeLine, clearCart, favorites, toggleFavorite, settings, zones, categories, reloadMeta],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
