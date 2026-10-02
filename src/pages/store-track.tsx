import { useEffect, useState } from "react";
import { PackageSearch, Check, Clock, X, Truck, ChefHat, Wallet, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoute, navigate } from "@/src/lib/router";
import { useApp } from "@/src/state/app";
import { api, errorMessage } from "@/src/lib/api";
import { fcfa, dateTime } from "@/src/lib/format";
import { PageTitle, EmptyState, StatusPill } from "@/src/components/shell";
type TrackResult = {
  order: { code: string; status: string; statusLabel: string; total: number; created_at: string; isGift: boolean };
  events: { status: string; note: string; created_at: string; label: string }[];
  items: { name_snapshot: string; qty: number; unit_price: number }[];
};

const FLOW = ["order_placed", "payment_confirmed", "preparing", "ready_for_delivery", "rider_assigned", "out_for_delivery", "delivered"];
const STEP_ICON: Record<string, any> = {
  order_placed: ClipboardList,
  payment_confirmed: Wallet,
  preparing: ChefHat,
  ready_for_delivery: PackageSearch,
  rider_assigned: Check,
  out_for_delivery: Truck,
  delivered: Check,
};

export function TrackTimeline({ order }: { order: TrackResult["order"] & { events: TrackResult["events"] } }) {
  const cancelled = order.status === "cancelled";
  const reachedIndex = FLOW.indexOf(order.status);
  return (
    <div>
      {cancelled ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <X className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Order cancelled</p>
            <p className="text-muted-foreground">Any amount already paid is refunded to your bonus wallet or payment method.</p>
          </div>
        </div>
      ) : (
        <ol className="space-y-0">
          {FLOW.map((step, index) => {
            const event = order.events.filter((e) => e.status === step).pop();
            const done = index <= reachedIndex;
            const Icon = STEP_ICON[step] || Check;
            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {index < FLOW.length - 1 && <span className={`w-0.5 flex-1 ${index < reachedIndex ? "bg-primary" : "bg-border"}`} style={{ minHeight: 24 }} />}
                </div>
                <div className={`pb-5 ${done ? "" : "opacity-50"}`}>
                  <p className="text-sm font-semibold">{order.events.find((e) => e.status === step)?.label || step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  <p className="text-xs text-muted-foreground">
                    {event ? `${event.note} · ${dateTime(event.created_at)}` : done ? dateTime(order.created_at) : "Pending"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function TrackPage() {
  const { pathname } = useRoute();
  const { user } = useApp();
  const codeFromUrl = pathname.startsWith("/track/") ? pathname.slice("/track/".length) : "";
  const [code, setCode] = useState(codeFromUrl);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myOrders, setMyOrders] = useState<any[]>([]);

  async function lookup(value: string) {
    const clean = value.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError("");
    try {
      const res = await api(`/track/${encodeURIComponent(clean)}`, { auth: false });
      setResult(res);
      if (!codeFromUrl) navigate(`/track/${clean}`, { replace: true });
    } catch (e) {
      setResult(null);
      setError(errorMessage(e));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (codeFromUrl) lookup(codeFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  useEffect(() => {
    if (user) api("/orders/mine").then((res) => setMyOrders(res.orders)).catch(() => undefined);
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle title="Track your order" subtitle="Enter the order code from your confirmation (e.g. SM-123456)." />
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          lookup(code);
        }}
      >
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SM-000000" aria-label="Order code" className="max-w-56 uppercase" />
        <Button type="submit" disabled={loading}>Track</Button>
      </form>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="fade-up mt-6 grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_240px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold">{result.order.code}</h2>
              <StatusPill status={result.order.status} />
              {result.order.isGift && <span className="rounded-md bg-terra/10 px-2 py-0.5 text-xs font-semibold text-terra">Gift order</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Placed {dateTime(result.order.created_at)}</p>
            <div className="mt-4">
              <TrackTimeline order={{ ...result.order, events: result.events }} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold">Items</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {result.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">{item.qty} × {item.name_snapshot}</span>
                  <span className="shrink-0 font-semibold">{fcfa(item.unit_price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-extrabold">
              <span>Total</span>
              <span className="text-primary">{fcfa(result.order.total)}</span>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="mt-8 space-y-4">
          {user ? (
            myOrders.length ? (
              <div>
                <h2 className="flex items-center gap-2 font-bold"><Clock className="h-4 w-4" /> Your recent orders</h2>
                <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
                  {myOrders.slice(0, 8).map((order) => (
                    <li key={order.id}>
                      <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-secondary/50" onClick={() => { setCode(order.code); lookup(order.code); }}>
                        <span>
                          <span className="font-semibold">{order.code}</span>
                          <span className="block text-xs text-muted-foreground">{dateTime(order.created_at)} · {fcfa(order.total)}{order.gift ? " · Gift" : ""}</span>
                        </span>
                        <StatusPill status={order.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState icon={PackageSearch} title="No orders yet" body="Once you place an order it will appear here for quick tracking." action={<Button onClick={() => navigate("/shop")}>Start shopping</Button>} />
            )
          ) : (
            <EmptyState icon={PackageSearch} title="Looking for an order?" body="Enter your order code above, or sign in to see all your orders and track them in one place." action={<Button variant="outline" onClick={() => navigate("/login?next=/track")}>Sign in</Button>} />
          )}
        </div>
      )}
    </div>
  );
}

export function DeliveryAreasPage() {
  const { zones } = useApp();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle title="Delivery areas & fees" subtitle="We deliver across Dakar and its suburbs. Fees are fixed per area and shown before you pay." />
      {zones.length === 0 ? (
        <EmptyState icon={Truck} title="Loading areas…" body="Delivery areas are being fetched." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {zones.map((zone) => (
            <li key={zone.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{zone.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {zone.cod_enabled ? "Cash on Delivery available" : "Prepaid only (Orange Money / Wave)"}
                </span>
              </span>
              <span className="shrink-0 font-bold text-primary">{fcfa(zone.fee)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
