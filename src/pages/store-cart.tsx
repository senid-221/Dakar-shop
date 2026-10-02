import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart, Trash2, Plus, Minus, Gift, MapPin, Crosshair, Ticket, Coins, Check, Loader2, Package as PackageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link, navigate } from "@/src/lib/router";
import { useApp, lineKey } from "@/src/state/app";
import { api, errorMessage } from "@/src/lib/api";
import { fcfa } from "@/src/lib/format";
import { PageTitle, EmptyState } from "@/src/components/shell";

const MERCHANT_NUMBER = "+221 77 578 41 58";

export function CartPage() {
  const { cart, setQty, removeLine, clearCart } = useApp();

  const groups = useMemo(() => {
    const map = new Map<string, typeof cart>();
    for (const line of cart) {
      const key = line.packageId || "__loose__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(line);
    }
    return [...map.entries()];
  }, [cart]);

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageTitle title="Your cart" />
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          body="Browse the shop or build a package to get started."
          action={
            <div className="flex gap-2">
              <Button onClick={() => navigate("/shop")}>Start shopping</Button>
              <Button variant="outline" onClick={() => navigate("/package")}>Build a package</Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageTitle
        title="Your cart"
        subtitle={`${cart.reduce((s, l) => s + l.qty, 0)} item(s)`}
        action={
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearCart}>
            <Trash2 className="mr-1 h-4 w-4" /> Clear cart
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {groups.map(([pkgId, lines]) => (
            <div key={pkgId} className="rounded-xl border border-border bg-card">
              {pkgId !== "__loose__" && (
                <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold text-primary">
                  <PackageIcon className="h-4 w-4" /> Custom package — discount applied at checkout
                </div>
              )}
              <ul className="divide-y divide-border">
                {lines.map((line) => {
                  const key = lineKey(line);
                  return (
                    <li key={key} className="flex gap-3 p-4">
                      <img src={line.image} alt={line.name} className="h-20 w-20 rounded-lg object-cover" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{line.name}</p>
                        {line.variantLabel && <p className="text-xs text-muted-foreground">{line.variantLabel}</p>}
                        <p className="mt-1 text-sm font-bold text-primary">{fcfa(line.price)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center rounded-md border border-border">
                            <button type="button" aria-label="Decrease quantity" className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => setQty(key, line.qty - 1)}>
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{line.qty}</span>
                            <button type="button" aria-label="Increase quantity" className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => setQty(key, line.qty + 1)}>
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button type="button" aria-label={`Remove ${line.name}`} className="p-1.5 text-muted-foreground hover:text-destructive" onClick={() => removeLine(key)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-bold">{fcfa(line.price * line.qty)}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <aside className="h-fit rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur">
          <h2 className="font-bold">Summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items total</dt>
              <dd className="font-semibold">{fcfa(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Delivery & discounts</dt>
              <dd>at checkout</dd>
            </div>
          </dl>
          <Separator className="my-4" />
          <Button className="w-full" onClick={() => navigate("/checkout")}>Proceed to checkout</Button>
          <Link to="/shop" className="mt-3 block text-center text-sm text-primary underline-offset-2 hover:underline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}

type SavedAddress = { id: string; label: string; recipient_name: string; phone: string; zone_id: string; zone_name: string; address_text: string; lat: number | null; lng: number | null; is_default?: boolean };

let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if ((window as any).L) return resolve((window as any).L);
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("map_unavailable"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

function PinMap({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef<{ map: any; marker: any } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !ref.current || state.current) return;
        const map = L.map(ref.current).setView([lat, lng], 13);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onPick(p.lat, p.lng);
        });
        map.on("click", (e: any) => {
          marker.setLatLng(e.latlng);
          onPick(e.latlng.lat, e.latlng.lng);
        });
        state.current = { map, marker };
      })
      .catch(() => toast.error("Map could not load. You can still type your address manually."));
    return () => {
      cancelled = true;
      state.current?.map.remove();
      state.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.current) state.current.marker.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={ref} className="h-56 w-full rounded-lg border border-border" role="application" aria-label="Delivery location map — click or drag the pin" />;
}

function nearestZone(zones: any[], lat: number, lng: number) {
  let best: any = null;
  let bestKm = Infinity;
  for (const z of zones) {
    if (typeof z.lat !== "number" || typeof z.lng !== "number") continue;
    const km = Math.hypot((z.lat - lat) * 111, (z.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180));
    if (km < bestKm) {
      bestKm = km;
      best = z;
    }
  }
  return best ? { zone: best, km: bestKm } : null;
}

export function CheckoutPage() {
  const { user, cart, clearCart, zones, settings } = useApp();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressMode, setAddressMode] = useState<"saved" | "new">(zones.length ? "new" : "new");
  const [savedId, setSavedId] = useState("");
  const [locating, setLocating] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [zoneSlug, setZoneSlug] = useState("");
  const [form, setForm] = useState({ recipient: "", phone: "", address: "", label: "Home" });
  const [saveAddress, setSaveAddress] = useState(false);

  const [giftEnabled, setGiftEnabled] = useState(false);
  const [gift, setGift] = useState({ recipient: "", phone: "", address: "", message: "", notify: true });

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; kind: string; value: number; min_order: number } | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  const [bonusBalance, setBonusBalance] = useState(0);
  const [bonusUse, setBonusUse] = useState(0);

  const [payment, setPayment] = useState<"orange_money" | "wave" | "cod">("orange_money");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: string; code: string; total: number; method: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    api("/addresses").then((res) => {
      setAddresses(res.addresses);
      const def = res.addresses.find((a: SavedAddress) => a.is_default) || res.addresses[0];
      if (def) {
        setAddressMode("saved");
        setSavedId(def.id);
      }
    }).catch(() => undefined);
    api("/rewards").then((res) => setBonusBalance(res.balance || 0)).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    api("/coupons/available", { auth: false }).then((res) => setAvailableCoupons(res.coupons)).catch(() => undefined);
  }, []);

  const selectedZone = useMemo(() => {
    if (addressMode === "saved") {
      const addr = addresses.find((a) => a.id === savedId);
      return zones.find((z) => z.name === addr?.zone_name) || null;
    }
    return zones.find((z) => z.slug === zoneSlug) || null;
  }, [addressMode, savedId, addresses, zoneSlug, zones]);

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);

  const packageDiscount = useMemo(() => {
    const tiers: { minItems: number; pct: number }[] = settings.packageTiers || [];
    const groups = new Map<string, { count: number; sum: number }>();
    for (const line of cart) {
      if (!line.packageId) continue;
      const g = groups.get(line.packageId) || { count: 0, sum: 0 };
      g.count += line.qty;
      g.sum += line.price * line.qty;
      groups.set(line.packageId, g);
    }
    let total = 0;
    for (const g of groups.values()) {
      const tier = [...tiers].sort((a, b) => b.minItems - a.minItems).find((t) => g.count >= t.minItems);
      if (tier) total += Math.round((g.sum * tier.pct) / 100);
    }
    return total;
  }, [cart, settings]);

  const couponDiscount = couponApplied ? (couponApplied.kind === "percent" ? Math.round((subtotal * couponApplied.value) / 100) : Math.min(couponApplied.value, subtotal)) : 0;
  const bonusCap = Math.max(0, Math.round((subtotal - packageDiscount - couponDiscount) * 0.5));
  const effectiveBonus = Math.min(bonusUse, bonusBalance, bonusCap);
  const deliveryFee = selectedZone?.fee ?? 0;
  const total = Math.max(0, subtotal - packageDiscount - couponDiscount - effectiveBonus) + deliveryFee;
  const codEnabled = !!selectedZone && selectedZone.cod_enabled && settings.codGlobal !== false;

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device. Please choose your area manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setPin({ lat: latitude, lng: longitude });
        const match = nearestZone(zones, latitude, longitude);
        if (match) {
          setZoneSlug(match.zone.slug);
          toast.success(`Delivery area detected: ${match.zone.name} (about ${Math.max(1, Math.round(match.km))} km away)`);
        }
      },
      () => {
        setLocating(false);
        toast.error("We could not get your location. Please select your area and type your address — GPS is never required.");
      },
      { timeout: 10000 },
    );
  }

  function usePinAsLocation() {
    if (!pin) return;
    const match = nearestZone(zones, pin.lat, pin.lng);
    if (match) {
      setZoneSlug(match.zone.slug);
      toast.success(`Delivery area set from the pin: ${match.zone.name}`);
    }
  }

  async function applyCoupon(code: string) {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    const found = availableCoupons.find((c) => c.code === clean);
    if (!found) {
      toast.error("This coupon code is not valid.");
      return;
    }
    if (subtotal < found.min_order) {
      toast.error(`This coupon needs a minimum order of ${fcfa(found.min_order)}.`);
      return;
    }
    setCouponApplied(found);
    toast.success(`Coupon ${found.code} applied`);
  }

  async function placeOrder() {
    if (!user) {
      navigate("/login?next=/checkout");
      return;
    }
    if (!cart.length) {
      toast.error("Your cart is empty.");
      return;
    }
    if (addressMode === "new" && !selectedZone) {
      toast.error("Select a delivery area to continue.");
      return;
    }
    if (addressMode === "new" && (!form.recipient.trim() || !form.phone.trim() || !form.address.trim())) {
      toast.error("Complete the recipient name, phone and address.");
      return;
    }
    if (giftEnabled && (!gift.recipient.trim() || !gift.phone.trim() || !gift.address.trim())) {
      toast.error("Complete the gift recipient name, phone and address.");
      return;
    }
    if (payment === "cod" && !codEnabled) {
      toast.error("Cash on Delivery is not available in this delivery area.");
      return;
    }
    setPlacing(true);
    try {
      const body: any = {
        items: cart.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty, packageId: l.packageId || null })),
        paymentMethod: payment,
        couponCode: couponApplied?.code || null,
        bonusUse: effectiveBonus > 0 ? effectiveBonus : 0,
        gift: giftEnabled ? gift : null,
      };
      if (addressMode === "saved") {
        body.addressId = savedId;
      } else {
        body.address = {
          label: form.label,
          recipient: form.recipient.trim(),
          phone: form.phone.trim(),
          zoneSlug: selectedZone!.slug,
          address: form.address.trim(),
          lat: pin?.lat ?? null,
          lng: pin?.lng ?? null,
        };
        if (saveAddress) {
          api("/addresses", {
            body: {
              label: form.label,
              recipientName: form.recipient.trim(),
              phone: form.phone.trim(),
              zoneId: selectedZone!.id,
              addressText: form.address.trim(),
              lat: pin?.lat ?? null,
              lng: pin?.lng ?? null,
            },
          }).catch(() => undefined);
        }
      }
      const res = await api("/orders", { body });
      clearCart();
      setPlaced({ id: res.order.id, code: res.order.code, total: res.order.total, method: payment });
      window.scrollTo({ top: 0 });
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setPlacing(false);
  }

  if (placed) return <OrderPlaced order={placed} />;

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageTitle title="Checkout" />
        <EmptyState icon={ShoppingCart} title="Nothing to check out" body="Your cart is empty." action={<Button onClick={() => navigate("/shop")}>Start shopping</Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageTitle title="Checkout" subtitle="Delivery, gift, coupon and payment in a few steps." />
      {!user && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
          <span className="font-semibold">Sign in to place your order and track it.</span>
          <Button size="sm" onClick={() => navigate("/login?next=/checkout")}>Sign in</Button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Step 1 — Delivery location */}
          <section className="rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="flex items-center gap-2 font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              Delivery location
            </h2>
            {user && addresses.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant={addressMode === "saved" ? "default" : "outline"} onClick={() => setAddressMode("saved")}>Saved address</Button>
                <Button size="sm" variant={addressMode === "new" ? "default" : "outline"} onClick={() => setAddressMode("new")}>New address</Button>
              </div>
            )}
            {addressMode === "saved" && addresses.length > 0 ? (
              <div className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-white/70 p-3 text-sm ${savedId === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="saved-address" className="mt-1 accent-[#7C5CE6]" checked={savedId === a.id} onChange={() => setSavedId(a.id)} />
                    <span>
                      <span className="font-semibold">{a.label}</span> — {a.recipient_name}, {a.phone}
                      <span className="block text-muted-foreground">{a.address_text} · {a.zone_name}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={locating}>
                    {locating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crosshair className="mr-1 h-4 w-4" />}
                    Detect my location
                  </Button>
                  <span className="text-xs text-muted-foreground">GPS is optional — you can always choose your area manually.</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="zone">Delivery area</Label>
                    <NativeSelect id="zone" value={zoneSlug} onChange={(e) => setZoneSlug(e.target.value)}>
                      <NativeSelectOption value="">Select an area…</NativeSelectOption>
                      {zones.map((z) => (
                        <NativeSelectOption key={z.id} value={z.slug}>{z.name} — {fcfa(z.fee)}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="addr-label">Address label</Label>
                    <NativeSelect id="addr-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>
                      <NativeSelectOption value="Home">Home</NativeSelectOption>
                      <NativeSelectOption value="Work">Work</NativeSelectOption>
                      <NativeSelectOption value="Other">Other</NativeSelectOption>
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient">Recipient name</Label>
                    <Input id="recipient" value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Full name" autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Recipient phone</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="77 000 00 00" autoComplete="tel" inputMode="tel" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address-text">Street address</Label>
                  <Textarea id="address-text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, building, landmarks…" rows={2} autoComplete="street-address" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Pin your exact location (optional)</p>
                    {pin && <Button type="button" size="sm" variant="outline" onClick={usePinAsLocation}>Use pin to set area</Button>}
                  </div>
                  {pin ? (
                    <PinMap lat={pin.lat} lng={pin.lng} onPick={(lat, lng) => setPin({ lat, lng })} />
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setPin({ lat: 14.7167, lng: -17.4677 })}>
                      <MapPin className="mr-1 h-4 w-4" /> Open map to drop a pin
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">Click the map or drag the pin to mark where the rider should come.</p>
                </div>
                {user && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={saveAddress} onCheckedChange={(v) => setSaveAddress(v === true)} />
                    Save this address for next time
                  </label>
                )}
              </div>
            )}
          </section>

          {/* Step 2 — Gift */}
          <section className="rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="flex items-center gap-2 font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
              Deliver the Order
            </h2>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <Checkbox checked={giftEnabled} onCheckedChange={(v) => setGiftEnabled(v === true)} />
              <Gift className="h-4 w-4 text-terra" /> This order is a gift for someone else
            </label>
            {giftEnabled && (
              <div className="fade-up mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gift-name">Recipient name</Label>
                  <Input id="gift-name" value={gift.recipient} onChange={(e) => setGift({ ...gift, recipient: e.target.value })} placeholder="Who is this gift for?" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gift-phone">Recipient phone</Label>
                  <Input id="gift-phone" value={gift.phone} onChange={(e) => setGift({ ...gift, phone: e.target.value })} placeholder="77 000 00 00" inputMode="tel" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="gift-address">Delivery address for the gift</Label>
                  <Textarea id="gift-address" value={gift.address} onChange={(e) => setGift({ ...gift, address: e.target.value })} rows={2} placeholder="Street, neighbourhood, city…" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="gift-message">Gift message (optional)</Label>
                  <Textarea id="gift-message" value={gift.message} onChange={(e) => setGift({ ...gift, message: e.target.value })} rows={2} maxLength={300} placeholder="Write a short message we will pass to the recipient…" />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox checked={gift.notify} onCheckedChange={(v) => setGift({ ...gift, notify: v === true })} />
                  Notify the recipient about this gift
                </label>
              </div>
            )}
          </section>

          {/* Step 3 — Coupon & bonus */}
          <section className="rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="flex items-center gap-2 font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
              Coupon & bonus
            </h2>
            <div className="mt-3 flex gap-2">
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon code (e.g. WELCOME10)" aria-label="Coupon code" className="uppercase" />
              <Button type="button" variant="outline" onClick={() => applyCoupon(couponCode)}>
                <Ticket className="mr-1 h-4 w-4" /> Apply
              </Button>
            </div>
            {couponApplied && (
              <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                <Check className="h-4 w-4" /> {couponApplied.code} applied — you save {fcfa(couponDiscount)}
              </p>
            )}
            {availableCoupons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {availableCoupons.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCouponCode(c.code); applyCoupon(c.code); }}
                    className="rounded-md border border-dashed border-gold bg-gold/10 px-2 py-1 text-xs font-semibold text-[#8a6116]"
                    title={c.kind === "percent" ? `${c.value}% off` : `${fcfa(c.value)} off`}
                  >
                    {c.code} · {c.kind === "percent" ? `${c.value}%` : fcfa(c.value)}
                  </button>
                ))}
              </div>
            )}
            {user && bonusBalance > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Coins className="h-4 w-4 text-gold" /> Bonus wallet: {fcfa(bonusBalance)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={Math.min(bonusBalance, bonusCap)}
                    value={bonusUse || ""}
                    onChange={(e) => setBonusUse(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Amount to use"
                    aria-label="Bonus amount to use"
                    className="max-w-40"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => setBonusUse(Math.min(bonusBalance, bonusCap))}>Use max</Button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">You can pay up to 50% of the order with bonuses (max {fcfa(bonusCap)} here).</p>
              </div>
            )}
          </section>

          {/* Step 4 — Payment */}
          <section className="rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h2 className="flex items-center gap-2 font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
              Payment method
            </h2>
            <div className="mt-3 space-y-2">
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-3 ${payment === "orange_money" ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="payment" className="accent-[#7C5CE6]" checked={payment === "orange_money"} onChange={() => setPayment("orange_money")} />
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#FF6600] text-[10px] font-extrabold text-white">OM</span>
                <span className="text-sm">
                  <span className="font-semibold">Orange Money</span>
                  <span className="block text-muted-foreground">Send to {MERCHANT_NUMBER}, then confirm below</span>
                </span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-3 ${payment === "wave" ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="payment" className="accent-[#7C5CE6]" checked={payment === "wave"} onChange={() => setPayment("wave")} />
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0057FF] text-xs font-extrabold text-white">W</span>
                <span className="text-sm">
                  <span className="font-semibold">Wave</span>
                  <span className="block text-muted-foreground">Send to {MERCHANT_NUMBER}, then confirm below</span>
                </span>
              </label>
              <label className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-white/70 p-3 ${codEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${payment === "cod" ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="payment" className="accent-[#7C5CE6]" disabled={!codEnabled} checked={payment === "cod"} onChange={() => setPayment("cod")} />
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                </span>
                <span className="text-sm">
                  <span className="font-semibold">Cash on Delivery</span>
                  <span className="block text-muted-foreground">{codEnabled ? "Pay the rider when your order arrives" : selectedZone ? "Not available in this area" : "Select a delivery area first"}</span>
                </span>
              </label>
            </div>
            {payment !== "cod" && (
              <p className="mt-3 text-xs text-muted-foreground">
                After placing the order you will see the exact amount and the merchant number. Send the payment with {payment === "wave" ? "Wave" : "Orange Money"}, then tap “I have sent the payment” so we can confirm it.
              </p>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit space-y-4 rounded-3xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur lg:sticky lg:top-20">
          <h2 className="font-bold">Order summary</h2>
          <ul className="max-h-52 space-y-2 overflow-y-auto text-sm">
            {cart.map((line) => (
              <li key={lineKey(line)} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-muted-foreground">
                  {line.qty} × {line.name}
                  {line.variantLabel ? ` (${line.variantLabel})` : ""}
                </span>
                <span className="shrink-0 font-semibold">{fcfa(line.price * line.qty)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{fcfa(subtotal)}</dd>
            </div>
            {packageDiscount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Package discount</dt>
                <dd className="font-semibold">− {fcfa(packageDiscount)}</dd>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Coupon ({couponApplied!.code})</dt>
                <dd className="font-semibold">− {fcfa(couponDiscount)}</dd>
              </div>
            )}
            {effectiveBonus > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Bonus used</dt>
                <dd className="font-semibold">− {fcfa(effectiveBonus)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery {selectedZone ? `· ${selectedZone.name}` : ""}</dt>
              <dd className="font-semibold">{selectedZone ? fcfa(deliveryFee) : "—"}</dd>
            </div>
          </dl>
          <Separator />
          <div className="flex justify-between text-base font-extrabold">
            <span>Total</span>
            <span className="text-primary">{fcfa(total)}</span>
          </div>
          <Button className="w-full" size="lg" disabled={placing} onClick={placeOrder}>
            {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {user ? "Place order" : "Sign in to order"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">By ordering you accept our delivery terms for Dakar.</p>
        </aside>
      </div>
    </div>
  );
}

function OrderPlaced({ order }: { order: { id: string; code: string; total: number; method: string } }) {
  const [sent, setSent] = useState(order.method === "cod");
  const [busy, setBusy] = useState(false);
  const label = order.method === "wave" ? "Wave" : order.method === "orange_money" ? "Orange Money" : "Cash on Delivery";

  async function markSent() {
    setBusy(true);
    try {
      await api(`/orders/${order.id}/payment-submitted`, { body: {} });
      setSent(true);
      toast.success("Thanks! We will confirm your payment shortly.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="reward-pop rounded-[2rem] border border-border/60 bg-white/85 p-6 text-center shadow-[0_24px_60px_-30px_rgba(124,92,230,0.5)] backdrop-blur">
        <span className="btn-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white">
          <Check className="h-7 w-7" />
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold">Your order is placed.</h1>
        <p className="mt-1 text-sm text-muted-foreground">It may take 1-2 days to deliver. Order <span className="font-bold text-foreground">{order.code}</span></p>
        <p className="mt-1 text-sm text-muted-foreground">Total to pay: <span className="font-bold text-foreground">{fcfa(order.total)}</span> via {label}</p>
        {order.method !== "cod" ? (
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4 text-left text-sm">
            <p className="font-semibold">Send your payment</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Open {label} and send <span className="font-semibold text-foreground">{fcfa(order.total)}</span> to{" "}
                <span className="font-semibold text-foreground">{MERCHANT_NUMBER}</span> (Dakar Shop).
              </li>
              <li>Reference: order {order.code}.</li>
              <li>Tap the button below so we know to look for it.</li>
            </ol>
            {!sent ? (
              <Button className="mt-3 w-full" disabled={busy} onClick={markSent}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                I have sent the payment
              </Button>
            ) : (
              <p className="mt-3 flex items-center justify-center gap-1 font-semibold text-primary"><Check className="h-4 w-4" /> Payment notice received — awaiting confirmation</p>
            )}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">Have {fcfa(order.total)} ready — you pay the rider on arrival.</p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/track/${order.code}`)}>Track this order</Button>
          <Button onClick={() => navigate("/shop")}>Continue shopping</Button>
        </div>
      </div>
    </div>
  );
}
