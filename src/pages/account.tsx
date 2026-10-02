import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, ShoppingBag, MapPin, Heart, Gift, Package as PackageIcon, Ticket, Coins, Bell, Settings as SettingsIcon,
  LifeBuoy, LogOut, Plus, Trash2, Pencil, Check, Loader2, ChevronRight, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link, navigate, useRoute } from "@/src/lib/router";
import { useApp } from "@/src/state/app";
import { api, errorMessage } from "@/src/lib/api";
import { fcfa, dateTime, dateShort } from "@/src/lib/format";
import { PageTitle, EmptyState, StatusPill } from "@/src/components/shell";
import { ProductGrid, Loader } from "@/src/components/product-card";
import { TrackTimeline } from "@/src/pages/store-track";

const NAV = [
  { to: "/account", icon: LayoutDashboard, label: "Overview" },
  { to: "/account/orders", icon: ShoppingBag, label: "My orders" },
  { to: "/account/addresses", icon: MapPin, label: "Addresses" },
  { to: "/account/favorites", icon: Heart, label: "Favorites" },
  { to: "/account/gifts", icon: Gift, label: "Gift orders" },
  { to: "/account/packages", icon: PackageIcon, label: "Saved packages" },
  { to: "/account/coupons", icon: Ticket, label: "Coupons" },
  { to: "/account/rewards", icon: Coins, label: "Bonuses & rewards" },
  { to: "/account/notifications", icon: Bell, label: "Notifications" },
  { to: "/account/settings", icon: SettingsIcon, label: "Settings" },
  { to: "/account/support", icon: LifeBuoy, label: "Support" },
];

export function AccountPage() {
  const { pathname } = useRoute();
  const { user, authReady } = useApp();

  useEffect(() => {
    if (authReady && !user) navigate("/login?next=" + encodeURIComponent(pathname), { replace: true });
  }, [user, authReady, pathname]);

  if (!authReady || !user) return <Loader label="Checking your session…" />;

  const section = pathname === "/account" ? "/account" : NAV.map((n) => n.to).filter((t) => t !== "/account" && pathname.startsWith(t)).sort((a, b) => b.length - a.length)[0] || "/account";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.phone}</p>
            </div>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:pb-0">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold lg:shrink ${section === item.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          {section === "/account" && <Overview />}
          {section === "/account/orders" && (pathname === "/account/orders" ? <OrdersList /> : <OrderDetail id={pathname.split("/").pop() || ""} />)}
          {section === "/account/addresses" && <Addresses />}
          {section === "/account/favorites" && <Favorites />}
          {section === "/account/gifts" && <Gifts />}
          {section === "/account/packages" && <SavedPackages />}
          {section === "/account/coupons" && <Coupons />}
          {section === "/account/rewards" && <Rewards />}
          {section === "/account/notifications" && <Notifications />}
          {section === "/account/settings" && <SettingsSection />}
          {section === "/account/support" && <Support />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone || "text-primary"}`} />
      </div>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function Overview() {
  const { user } = useApp();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [rewards, setRewards] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    api("/orders/mine").then((r) => setOrders(r.orders)).catch(() => setOrders([]));
    api("/rewards").then((r) => setRewards(r)).catch(() => setRewards({ balance: 0, totalSpent: 0 }));
    api("/coupons/available", { auth: false }).then((r) => setCoupons(r.coupons)).catch(() => undefined);
  }, []);

  const completed = orders?.filter((o) => o.status === "delivered").length ?? 0;
  const active = orders?.filter((o) => !["delivered", "cancelled"].includes(o.status)).length ?? 0;

  return (
    <div>
      <PageTitle title={`Hello, ${user!.name.split(" ")[0]}`} subtitle="Here is what is happening with your account." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total orders" value={String(orders?.length ?? 0)} icon={ShoppingBag} />
        <StatCard label="Completed" value={String(completed)} icon={Check} />
        <StatCard label="Active" value={String(active)} icon={Loader2} tone="text-gold" />
        <StatCard label="Bonus balance" value={fcfa(rewards?.balance ?? 0)} icon={Coins} tone="text-gold" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link to="/account/orders" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {!orders ? <Loader /> : orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {orders.slice(0, 4).map((o) => (
                <li key={o.id}>
                  <Link to={`/account/orders/${o.id}`} className="flex items-center justify-between gap-2 py-2.5 text-sm hover:bg-secondary/40">
                    <span>
                      <span className="font-semibold">{o.code}</span>
                      <span className="block text-xs text-muted-foreground">{dateShort(o.created_at)} · {fcfa(o.total)}</span>
                    </span>
                    <StatusPill status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-bold">Your coupons</h2>
          {coupons.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No active coupons right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {coupons.slice(0, 4).map((c) => (
                <li key={c.code} className="flex items-center justify-between rounded-lg border border-dashed border-gold bg-gold/10 px-3 py-2 text-sm">
                  <span className="font-bold text-[#8a6116]">{c.code}</span>
                  <span className="text-xs text-muted-foreground">{c.kind === "percent" ? `${c.value}% off` : `${fcfa(c.value)} off`} · min {fcfa(c.min_order)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/account/coupons" className="mt-3 inline-block text-sm text-primary hover:underline">See all coupons</Link>
        </div>
      </div>
    </div>
  );
}

function OrdersList() {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    api("/orders/mine").then((r) => setOrders(r.orders)).catch(() => setOrders([]));
  }, []);
  useEffect(load, [load]);

  const shown = useMemo(() => (orders || []).filter((o) => filter === "all" || o.status === filter), [orders, filter]);

  return (
    <div>
      <PageTitle title="My orders" subtitle="Track, review or cancel your orders." />
      <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter orders by status" className="mb-4 max-w-56">
        <NativeSelectOption value="all">All statuses</NativeSelectOption>
        <NativeSelectOption value="order_placed">Order placed</NativeSelectOption>
        <NativeSelectOption value="payment_confirmed">Payment confirmed</NativeSelectOption>
        <NativeSelectOption value="preparing">Preparing</NativeSelectOption>
        <NativeSelectOption value="out_for_delivery">Out for delivery</NativeSelectOption>
        <NativeSelectOption value="delivered">Delivered</NativeSelectOption>
        <NativeSelectOption value="cancelled">Cancelled</NativeSelectOption>
      </NativeSelect>
      {!orders ? <Loader /> : shown.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders here" body="Orders you place will show up in this list." action={<Button onClick={() => navigate("/shop")}>Start shopping</Button>} />
      ) : (
        <ul className="space-y-3">
          {shown.map((o) => (
            <li key={o.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{o.code}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(o.created_at)} · {o.items_count ?? ""}{o.gift ? " · Gift" : ""}</p>
                </div>
                <StatusPill status={o.status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-extrabold text-primary">{fcfa(o.total)}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/track/${o.code}`)}>Track</Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/account/orders/${o.id}`)}>
                    Details <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderDetail({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/orders/${id}`).then((r) => setData(r)).catch(() => setData(null));
  }, [id]);
  useEffect(load, [load]);

  async function cancel() {
    setBusy(true);
    try {
      await api(`/orders/${id}/cancel`, { body: {} });
      toast.success("Order cancelled.");
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  }

  if (!data) return <Loader />;
  const { order, items, events, payment } = data;
  const cancelable = ["order_placed", "payment_confirmed"].includes(order.status);

  return (
    <div>
      <PageTitle
        title={`Order ${order.code}`}
        subtitle={`Placed ${dateTime(order.created_at)}`}
        action={<Button variant="outline" size="sm" onClick={() => navigate("/account/orders")}>Back to orders</Button>}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <StatusPill status={order.status} />
            {order.gift && <Badge variant="secondary" className="border-0 bg-terra/10 text-terra">Gift order</Badge>}
          </div>
          <TrackTimeline order={{ ...order, events }} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold">Items</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {items.map((it: any, i: number) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">{it.qty} × {it.name_snapshot}</span>
                  <span className="shrink-0 font-semibold">{fcfa(it.unit_price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{fcfa(order.subtotal)}</dd></div>
              {order.package_discount > 0 && <div className="flex justify-between text-primary"><dt>Package discount</dt><dd>− {fcfa(order.package_discount)}</dd></div>}
              {order.coupon_discount > 0 && <div className="flex justify-between text-primary"><dt>Coupon</dt><dd>− {fcfa(order.coupon_discount)}</dd></div>}
              {order.bonus_discount > 0 && <div className="flex justify-between text-primary"><dt>Bonus used</dt><dd>− {fcfa(order.bonus_discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{fcfa(order.delivery_fee)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><dt>Total</dt><dd className="text-primary">{fcfa(order.total)}</dd></div>
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <h3 className="font-bold">Delivery to</h3>
            <p className="mt-1 text-muted-foreground">
              {order.address_snapshot?.recipient} · {order.address_snapshot?.phone}
              <span className="block">{order.address_snapshot?.address}</span>
              <span className="block">{order.address_snapshot?.zone}</span>
            </p>
            <h3 className="mt-3 font-bold">Payment</h3>
            <p className="mt-1 capitalize text-muted-foreground">{(payment?.method || order.payment_method).replace(/_/g, " ")} — {payment?.status.replace(/_/g, " ")}</p>
          </div>
          {cancelable && (
            <Button variant="outline" className="w-full text-destructive" disabled={busy} onClick={cancel}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Cancel order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Addresses() {
  const { zones } = useApp();
  const [rows, setRows] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(() => {
    api("/addresses").then((r) => setRows(r.addresses)).catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  async function remove(id: string) {
    try {
      await api(`/addresses/${id}`, { method: "DELETE" });
      toast.success("Address removed.");
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div>
      <PageTitle
        title="Addresses"
        subtitle="Saved delivery locations for faster checkout."
        action={<Button size="sm" onClick={() => setEditing({ label: "Home", recipientName: "", phone: "", zoneId: "", addressText: "", lat: null, lng: null })}><Plus className="mr-1 h-4 w-4" /> Add address</Button>}
      />
      {editing && <AddressForm initial={editing} zones={zones} onDone={() => { setEditing(null); load(); }} />}
      {!rows ? <Loader /> : rows.length === 0 && !editing ? (
        <EmptyState icon={MapPin} title="No saved addresses" body="Add an address to check out faster next time." />
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div>
                <p className="flex items-center gap-2 font-bold">
                  {a.label}
                  {a.is_default && <Badge variant="secondary" className="border-0 bg-primary/10 text-primary">Default</Badge>}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.recipient_name} · {a.phone}
                  <span className="block">{a.address_text}</span>
                  <span className="block">{a.zone_name}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" aria-label="Edit address" onClick={() => setEditing({ id: a.id, label: a.label, recipientName: a.recipient_name, phone: a.phone, zoneId: a.zone_id, addressText: a.address_text, lat: a.lat, lng: a.lng })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Delete address" className="text-destructive" onClick={() => remove(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddressForm({ initial, zones, onDone }: { initial: any; zones: any[]; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.recipientName.trim() || !form.phone.trim() || !form.addressText.trim() || !form.zoneId) {
      toast.error("Complete recipient, phone, area and address.");
      return;
    }
    setBusy(true);
    try {
      if (form.id) await api(`/addresses/${form.id}`, { method: "PATCH", body: form });
      else await api("/addresses", { body: form });
      toast.success("Address saved.");
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  }

  return (
    <div className="mb-5 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <NativeSelect value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}>
            <NativeSelectOption value="Home">Home</NativeSelectOption>
            <NativeSelectOption value="Work">Work</NativeSelectOption>
            <NativeSelectOption value="Other">Other</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Delivery area</Label>
          <NativeSelect value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
            <NativeSelectOption value="">Select…</NativeSelectOption>
            {zones.map((z) => <NativeSelectOption key={z.id} value={z.id}>{z.name}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Recipient name</Label>
          <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Street address</Label>
          <Textarea rows={2} value={form.addressText} onChange={(e) => setForm({ ...form, addressText: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button disabled={busy} onClick={save}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save address</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function Favorites() {
  const { favorites } = useApp();
  const [products, setProducts] = useState<any[] | null>(null);

  useEffect(() => {
    if (!favorites.length) {
      setProducts([]);
      return;
    }
    Promise.all(favorites.map((id) => api(`/products/${id}`, { auth: false }).then((r) => r.product).catch(() => null)))
      .then((list) => setProducts(list.filter(Boolean)));
  }, [favorites]);

  return (
    <div>
      <PageTitle title="Favorites" subtitle="Products you saved for later." />
      {!products ? <Loader /> : products.length === 0 ? (
        <EmptyState icon={Heart} title="No favorites yet" body="Tap the heart on any product to save it here." action={<Button onClick={() => navigate("/shop")}>Browse products</Button>} />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}

function Gifts() {
  const [orders, setOrders] = useState<any[] | null>(null);
  useEffect(() => {
    api("/orders/mine").then((r) => setOrders(r.orders.filter((o: any) => o.gift))).catch(() => setOrders([]));
  }, []);
  return (
    <div>
      <PageTitle title="Gift orders" subtitle="Orders you sent as gifts to someone else." />
      {!orders ? <Loader /> : orders.length === 0 ? (
        <EmptyState icon={Gift} title="No gift orders yet" body="At checkout, tick “This order is a gift” to send a surprise to a friend or family member." action={<Button onClick={() => navigate("/shop")}>Send a gift</Button>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{o.code} <span className="ml-1 text-sm font-semibold text-terra">→ {o.gift.recipient}</span></p>
                  <p className="text-xs text-muted-foreground">{dateTime(o.created_at)} · {o.gift.notify ? "Recipient notified" : "Kept secret"}</p>
                  {o.gift.message && <p className="mt-1 rounded-md bg-secondary/60 px-2 py-1 text-sm italic text-muted-foreground">“{o.gift.message}”</p>}
                </div>
                <StatusPill status={o.status} />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">{fcfa(o.total)}</span>
                <Button size="sm" variant="outline" onClick={() => navigate(`/track/${o.code}`)}>Track</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SavedPackages() {
  const [rows, setRows] = useState<any[] | null>(null);

  const load = useCallback(() => {
    api("/packages/mine").then((r) => setRows(r.packages)).catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  async function remove(id: string) {
    try {
      await api(`/packages/${id}`, { method: "DELETE" });
      toast.success("Package deleted.");
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div>
      <PageTitle title="Saved packages" subtitle="Reuse your custom bundles with their package discount." />
      {!rows ? <Loader /> : rows.length === 0 ? (
        <EmptyState icon={PackageIcon} title="No saved packages" body="Build a package in the builder and save it to reorder in one tap." action={<Button onClick={() => navigate("/package")}>Build a package</Button>} />
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.items.length} item(s) · saved {dateShort(p.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate(`/package?load=${p.id}`)}>Load in builder</Button>
                  <Button size="icon" variant="ghost" aria-label="Delete package" className="text-destructive" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Coupons() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    api("/coupons/available", { auth: false }).then((r) => setRows(r.coupons)).catch(() => setRows([]));
  }, []);
  return (
    <div>
      <PageTitle title="Coupons" subtitle="Enter these codes at checkout to save." />
      {!rows ? <Loader /> : rows.length === 0 ? (
        <EmptyState icon={Ticket} title="No active coupons" body="Check back soon — new coupons are added regularly." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((c) => (
            <li key={c.code} className="rounded-xl border border-dashed border-gold bg-gold/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-extrabold text-[#8a6116]">{c.code}</p>
                <Badge variant="secondary" className="border-0 bg-card">{c.kind === "percent" ? `${c.value}% off` : `${fcfa(c.value)} off`}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Minimum order {fcfa(c.min_order)} · expires {dateShort(c.expires_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Rewards() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api("/rewards").then((r) => setData(r)).catch(() => setData({ balance: 0, transactions: [], totalSpent: 0 }));
  }, []);
  if (!data) return <Loader />;
  const progress = data.nextMilestone ? Math.min(100, Math.round((data.totalSpent / data.nextMilestone) * 100)) : 100;
  return (
    <div>
      <PageTitle title="Bonuses & rewards" subtitle="Earn bonuses on delivered orders and spend them at checkout." />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bonus balance</p>
          <p className="mt-1 text-3xl font-extrabold text-gold">{fcfa(data.balance)}</p>
          <p className="mt-2 text-xs text-muted-foreground">You earn {data.earnPercent}% back on every delivered order.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total spent (delivered)</p>
          <p className="mt-1 text-3xl font-extrabold">{fcfa(data.totalSpent)}</p>
          {data.nextMilestone ? (
            <>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{progress}% toward the {fcfa(data.nextMilestone)} milestone</p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Top milestone reached — thank you!</p>
          )}
        </div>
      </div>
      <h2 className="mt-6 font-bold">Recent bonus activity</h2>
      {data.transactions.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">No bonus activity yet. Place an order to start earning.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
          {data.transactions.map((t: any) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="block">{t.reason}</span>
                <span className="text-xs text-muted-foreground">{dateTime(t.created_at)}</span>
              </span>
              <span className={`shrink-0 font-bold ${t.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                {t.amount >= 0 ? "+" : "−"} {fcfa(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Notifications() {
  const [rows, setRows] = useState<any[] | null>(null);

  const load = useCallback(() => {
    api("/notifications").then((r) => setRows(r.notifications)).catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  async function markRead() {
    try {
      await api("/notifications/read", { body: {} });
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div>
      <PageTitle
        title="Notifications"
        subtitle="Order updates, payments and rewards."
        action={rows?.some((r) => !r.read) ? <Button size="sm" variant="outline" onClick={markRead}>Mark all read</Button> : undefined}
      />
      {!rows ? <Loader /> : rows.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" body="Updates about your orders and rewards will appear here." />
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id} className={`rounded-xl border p-4 ${n.read ? "border-border bg-card" : "border-primary/40 bg-primary/5"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{dateTime(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsSection() {
  const { user, logout } = useApp();
  return (
    <div>
      <PageTitle title="Settings" subtitle="Your profile and session." />
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Full name</dt><dd className="font-semibold">{user!.name}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Phone (account ID)</dt><dd className="font-semibold">{user!.phone}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Role</dt><dd className="font-semibold capitalize">{user!.role}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">To change your name or phone, contact support on WhatsApp for verification.</p>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign out of this device.</p>
        <Button
          variant="outline"
          className="mt-3 text-destructive"
          onClick={async () => {
            await logout();
            navigate("/");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function Support() {
  return (
    <div>
      <PageTitle title="Support" subtitle="We are here to help, every day." />
      <div className="grid gap-4 sm:grid-cols-2">
        <a href="https://wa.me/221775784158" target="_blank" rel="noreferrer" className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary">
          <p className="flex items-center gap-2 font-bold">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2m0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24" /></svg>
            WhatsApp support
          </p>
          <p className="mt-1 text-sm text-muted-foreground">+221 77 578 41 58 — fastest way to reach the team.</p>
        </a>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="font-bold">Chat assistant</p>
          <p className="mt-1 text-sm text-muted-foreground">Ask about products, orders, delivery, payments and coupons.</p>
          <p className="mt-2 text-xs text-muted-foreground">Use the chat bubble at the bottom right of any page.</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-bold">Frequently asked</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-semibold">How do I pay?</dt><dd className="text-muted-foreground">Orange Money, Wave, or Cash on Delivery where available. Mobile payments are confirmed by our team shortly after you send.</dd></div>
          <div><dt className="font-semibold">How fast is delivery?</dt><dd className="text-muted-foreground">Most Dakar orders arrive the same day. You can follow every step from Order Placed to Delivered on the tracking page.</dd></div>
          <div><dt className="font-semibold">Can I send a gift?</dt><dd className="text-muted-foreground">Yes — tick the gift option at checkout, add a message, and we deliver it to your recipient.</dd></div>
        </dl>
      </div>
    </div>
  );
}
