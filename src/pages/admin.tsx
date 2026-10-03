import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, ShoppingBag, Users, Package as PackageIcon, Ticket, MapPin, Bike, Wallet, BarChart3, Settings as SettingsIcon,
  Gift, Plus, Trash2, Check, X, Loader2, Search, ShieldCheck, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link, navigate, useRoute } from "@/src/lib/router";
import { useApp } from "@/src/state/app";
import { api, errorMessage } from "@/src/lib/api";
import { fcfa, dateTime, dateShort } from "@/src/lib/format";
import { Loader } from "@/src/components/product-card";
import { StatusPill, EmptyState } from "@/src/components/shell";

const NAV = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/payments", icon: Wallet, label: "Payments" },
  { to: "/admin/products", icon: PackageIcon, label: "Products" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/coupons", icon: Ticket, label: "Coupons" },
  { to: "/admin/packages", icon: Gift, label: "Packages" },
  { to: "/admin/campaigns", icon: TrendingUp, label: "Bonus campaigns" },
  { to: "/admin/zones", icon: MapPin, label: "Delivery zones" },
  { to: "/admin/staff", icon: Bike, label: "Delivery staff" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admin/settings", icon: SettingsIcon, label: "Settings" },
];

const STATUS_OPTIONS = ["order_placed", "payment_confirmed", "preparing", "ready_for_delivery", "rider_assigned", "out_for_delivery", "delivered", "cancelled"];

export function AdminPage() {
  const { pathname } = useRoute();
  const { user, authReady } = useApp();

  useEffect(() => {
    if (authReady && !user) navigate("/login?next=" + encodeURIComponent(pathname), { replace: true });
  }, [user, authReady, pathname]);

  if (!authReady || !user) return <Loader label="Checking your session…" />;
  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-3 text-xl font-extrabold">Admin access only</h1>
        <p className="mt-1 text-sm text-muted-foreground">This area is restricted to Citymarket Dakar staff. You are signed in as a customer.</p>
        <Button className="mt-4" onClick={() => navigate("/account")}>Go to my account</Button>
      </div>
    );
  }

  const section = NAV.map((n) => n.to).filter((t) => (t === "/admin" ? pathname === "/admin" : pathname === t || pathname.startsWith(t + "/"))).sort((a, b) => b.length - a.length)[0] || "/admin";

  return (
    <div className="min-h-[80dvh] bg-[#0b1220] text-slate-100">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-white/10 bg-[#101828] p-4 lg:block">
          <div className="mb-5 flex items-center gap-2 px-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-extrabold tracking-tight">Citymarket Admin</span>
          </div>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${section === item.to ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            ))}
          </nav>
          <Link to="/" className="mt-6 block px-3 text-xs text-slate-400 hover:text-white">← Back to store</Link>
        </aside>
        <div className="min-w-0 flex-1 p-4 lg:p-6">
          <div className="mb-4 flex gap-1 overflow-x-auto pb-2 lg:hidden">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ${section === item.to ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-300"}`}>
                {item.label}
              </Link>
            ))}
          </div>
          {section === "/admin" && <AdminOverview />}
          {section === "/admin/orders" && <AdminOrders />}
          {section === "/admin/payments" && <AdminPayments />}
          {section === "/admin/products" && <AdminProducts />}
          {section === "/admin/customers" && <AdminCustomers />}
          {section === "/admin/coupons" && <AdminCoupons />}
          {section === "/admin/packages" && <AdminPackages />}
          {section === "/admin/campaigns" && <AdminCampaigns />}
          {section === "/admin/zones" && <AdminZones />}
          {section === "/admin/staff" && <AdminStaff />}
          {section === "/admin/analytics" && <AdminAnalytics />}
          {section === "/admin/settings" && <AdminSettings />}
        </div>
      </div>
    </div>
  );
}

function AdminTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-white/10 bg-[#101828] p-4 ${className}`}>{children}</div>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</th>;
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-sm ${className}`}>{children}</td>;
}

function useLists() {
  const [lists, setLists] = useState<any>(null);
  const load = useCallback(() => api("/admin/lists").then((r) => setLists(r)).catch(() => setLists(null)), []);
  useEffect(() => { load(); }, [load]);
  return { lists, load };
}

function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  useEffect(() => {
    api("/admin/stats").then(setStats).catch(() => setStats(null));
    api("/admin/analytics").then(setAnalytics).catch(() => undefined);
  }, []);
  if (!stats) return <Loader />;
  const cards = [
    { label: "Sales (delivered)", value: fcfa(stats.salesTotal) },
    { label: "Sales today", value: fcfa(stats.salesToday) },
    { label: "Orders", value: String(stats.ordersTotal) },
    { label: "Pending", value: String(stats.pending) },
    { label: "Active deliveries", value: String(stats.activeDeliveries) },
    { label: "Customers", value: `${stats.customers} (+${stats.newCustomers} wk)` },
  ];
  return (
    <div>
      <AdminTitle title="Overview" subtitle="Live picture of the marketplace." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-xs text-slate-400">{c.label}</p>
            <p className="mt-1 text-lg font-extrabold text-white">{c.value}</p>
          </Card>
        ))}
      </div>
      {analytics && (
        <Card className="mt-4">
          <p className="mb-3 text-sm font-bold text-white">Revenue — last 14 days</p>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={analytics.days}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98133" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function AdminOrders() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { lists } = useLists();

  const load = useCallback(() => {
    api(`/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`).then((r) => setRows(r.orders)).catch(() => setRows([]));
  }, [status, q]);
  useEffect(load, [load]);

  return (
    <div>
      <AdminTitle title="Orders" subtitle="Update status, assign riders and review payments." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order code" className="w-48 border-white/10 bg-white/5 pl-8 text-slate-100" />
        </div>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="w-48 border-white/10 bg-white/5 text-slate-100">
          <NativeSelectOption value="">All statuses</NativeSelectOption>
          {STATUS_OPTIONS.map((s) => <NativeSelectOption key={s} value={s}>{s.replace(/_/g, " ")}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      {!rows ? <Loader /> : rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders match" body="Adjust the filters to see orders." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-white/10">
              <tr><Th>Code</Th><Th>Customer</Th><Th>Status</Th><Th>Payment</Th><Th>Total</Th><Th>Placed</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((o) => (
                <AdminOrderRow key={o.id} order={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} staff={lists?.staff || []} onChanged={load} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AdminOrderRow({ order, open, onToggle, staff, onChanged }: { order: any; open: boolean; onToggle: () => void; staff: any[]; onChanged: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [newStatus, setNewStatus] = useState(order.status);
  const [newStaff, setNewStaff] = useState(order.delivery_staff_id || "");

  useEffect(() => {
    if (open && !detail) api(`/admin/orders/${order.id}`).then(setDetail).catch(() => undefined);
  }, [open, order.id, detail]);

  useEffect(() => { setNewStatus(order.status); setNewStaff(order.delivery_staff_id || ""); }, [order.status, order.delivery_staff_id]);

  async function patch(body: any) {
    setBusy(true);
    try {
      await api(`/admin/orders/${order.id}/x`, { method: "PATCH", body });
      toast.success("Order updated.");
      onChanged();
      setDetail(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  }

  return (
    <>
      <tr className="hover:bg-white/5">
        <Td className="font-bold text-white">{order.code}</Td>
        <Td className="text-slate-300">{order.customer}</Td>
        <Td><StatusPill status={order.status} /></Td>
        <Td className="capitalize text-slate-300">{order.payment_method.replace(/_/g, " ")}</Td>
        <Td className="font-semibold text-white">{fcfa(order.total)}</Td>
        <Td className="text-slate-400">{dateShort(order.created_at)}</Td>
        <Td><Button size="sm" variant="ghost" className="text-emerald-400" onClick={onToggle}>{open ? "Close" : "Manage"}</Button></Td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="bg-[#0b1220] px-4 py-4">
            {!detail ? <Loader /> : (
              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Update status</p>
                  <div className="flex gap-2">
                    <NativeSelect value={newStatus} className="border-white/10 bg-white/5 text-slate-100" onChange={(e) => setNewStatus(e.target.value)}>
                      {STATUS_OPTIONS.map((s) => <NativeSelectOption key={s} value={s}>{s.replace(/_/g, " ")}</NativeSelectOption>)}
                    </NativeSelect>
                    <Button size="sm" disabled={busy || newStatus === order.status} onClick={() => patch({ status: newStatus })}>Apply</Button>
                  </div>
                  <p className="mb-1 mt-3 text-xs font-semibold uppercase text-slate-400">Assign rider</p>
                  <div className="flex gap-2">
                    <NativeSelect value={newStaff} className="border-white/10 bg-white/5 text-slate-100" onChange={(e) => setNewStaff(e.target.value)}>
                      <NativeSelectOption value="">Unassigned</NativeSelectOption>
                      {staff.filter((s: any) => s.active).map((s: any) => <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>)}
                    </NativeSelect>
                    <Button size="sm" disabled={busy || newStaff === (order.delivery_staff_id || "")} onClick={() => patch({ staffId: newStaff || null })}>Assign</Button>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Items</p>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {detail.items.map((it: any, i: number) => <li key={i}>{it.qty} × {it.name_snapshot}</li>)}
                  </ul>
                  <p className="mt-2 text-sm font-bold text-white">Total {fcfa(detail.order.total)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Delivery & payment</p>
                  <p className="text-sm text-slate-300">
                    {detail.order.address_snapshot?.recipient} · {detail.order.address_snapshot?.phone}
                    <span className="block text-slate-400">{detail.order.address_snapshot?.address} — {detail.order.address_snapshot?.zone}</span>
                  </p>
                  <p className="mt-2 text-sm capitalize text-slate-300">{detail.payment?.method.replace(/_/g, " ")} — {detail.payment?.status.replace(/_/g, " ")}</p>
                  {detail.order.gift && <p className="mt-2 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Gift → {detail.order.gift.recipient}</p>}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function AdminPayments() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api(`/admin/payments?status=${encodeURIComponent(status)}`).then((r) => setRows(r.payments)).catch(() => setRows([]));
  }, [status]);
  useEffect(load, [load]);

  async function confirm(id: string) {
    setBusy(id);
    try {
      await api(`/admin/payments/${id}/confirm`, { body: {} });
      toast.success("Payment confirmed and order advanced.");
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(null);
  }

  return (
    <div>
      <AdminTitle title="Payments" subtitle="Confirm Orange Money / Wave transfers and cash collection." />
      <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="mb-4 w-56 border-white/10 bg-white/5 text-slate-100">
        <NativeSelectOption value="">All statuses</NativeSelectOption>
        <NativeSelectOption value="awaiting_customer">Awaiting customer</NativeSelectOption>
        <NativeSelectOption value="submitted">Submitted</NativeSelectOption>
        <NativeSelectOption value="confirmed">Confirmed</NativeSelectOption>
        <NativeSelectOption value="cash_pending">Cash pending</NativeSelectOption>
        <NativeSelectOption value="cash_collected">Cash collected</NativeSelectOption>
      </NativeSelect>
      {!rows ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-white/10"><tr><Th>Order</Th><Th>Customer</Th><Th>Method</Th><Th>Status</Th><Th>Amount</Th><Th /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/5">
                  <Td className="font-bold text-white">{p.code}</Td>
                  <Td className="text-slate-300">{p.customer}</Td>
                  <Td className="capitalize text-slate-300">{p.method.replace(/_/g, " ")}</Td>
                  <Td><Badge variant="secondary" className={p.status === "confirmed" || p.status === "cash_collected" ? "border-0 bg-emerald-500/15 text-emerald-300" : "border-0 bg-amber-500/15 text-amber-300"}>{p.status.replace(/_/g, " ")}</Badge></Td>
                  <Td className="font-semibold text-white">{fcfa(p.total)}</Td>
                  <Td>
                    {p.status === "submitted" || p.status === "awaiting_customer" || p.status === "cash_pending" ? (
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" disabled={busy === p.id} onClick={() => confirm(p.id)}>
                        {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />} Confirm
                      </Button>
                    ) : <span className="text-xs text-slate-500">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AdminProducts() {
  const { lists, load: loadLists } = useLists();
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(() => {
    api(`/products?q=${encodeURIComponent(q)}&limit=60`, { auth: false }).then((r) => setRows(r.products)).catch(() => setRows([]));
  }, [q]);
  useEffect(load, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this product permanently?")) return;
    try {
      await api(`/admin/products/${id}`, { method: "DELETE" });
      toast.success("Product deleted.");
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div>
      <AdminTitle
        title="Products"
        subtitle="Create, price, stock and publish products."
        action={<Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => setEditing({ name: "", categoryId: "", price: 0, comparePrice: null, stock: 0, imageUrl: "", description: "", active: true })}><Plus className="mr-1 h-4 w-4" /> New product</Button>}
      />
      {editing && <ProductForm initial={editing} categories={lists?.categories || []} onDone={() => { setEditing(null); load(); loadLists(); }} />}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="mb-4 w-64 border-white/10 bg-white/5 text-slate-100" />
      {!rows ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-white/10"><tr><Th>Product</Th><Th>Category</Th><Th>Price</Th><Th>Stock</Th><Th>Active</Th><Th /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/5">
                  <Td>
                    <span className="flex items-center gap-2">
                      <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                      <span className="font-semibold text-white">{p.name}</span>
                    </span>
                  </Td>
                  <Td className="text-slate-300">{lists?.categories.find((c: any) => c.id === p.category_id)?.name || "—"}</Td>
                  <Td className="font-semibold text-white">{fcfa(p.price)}</Td>
                  <Td className={p.stock === 0 ? "font-bold text-red-400" : "text-slate-300"}>{p.stock}</Td>
                  <Td>
                    <Switch
                      checked={p.active}
                      onCheckedChange={async (v) => {
                        try {
                          await api(`/admin/products/${p.id}`, { method: "PATCH", body: { active: v === true } });
                          load();
                        } catch (error) {
                          toast.error(errorMessage(error));
                        }
                      }}
                    />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="text-slate-300" onClick={() => setEditing({ ...p, categoryId: p.category_id, comparePrice: p.compare_price, imageUrl: p.image_url })}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ProductForm({ initial, categories, onDone }: { initial: any; categories: any[]; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<any[] | null>(initial.id ? [] : null);

  useEffect(() => {
    if (initial.id) api(`/products/${initial.id}`, { auth: false }).then((r) => setVariants(r.variants)).catch(() => setVariants([]));
  }, [initial.id]);

  async function save() {
    if (!form.name.trim() || !form.categoryId) {
      toast.error("Name and category are required.");
      return;
    }
    setBusy(true);
    try {
      const body = { name: form.name, categoryId: form.categoryId, price: Number(form.price), comparePrice: form.comparePrice ? Number(form.comparePrice) : null, stock: Number(form.stock), imageUrl: form.imageUrl, description: form.description, active: form.active !== false };
      if (form.id) await api(`/admin/products/${form.id}`, { method: "PATCH", body });
      else await api("/admin/products", { body });
      toast.success("Product saved.");
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  }

  async function addVariant(label: string, kind: string, delta: number) {
    try {
      await api(`/admin/products/${form.id}/variants`, { body: { label, kind, priceDelta: delta } });
      toast.success("Variant added.");
      const r = await api(`/products/${form.id}`, { auth: false });
      setVariants(r.variants);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card className="mb-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-2"><Label className="text-slate-300">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
        <div className="space-y-1.5"><Label className="text-slate-300">Category</Label>
          <NativeSelect value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="border-white/10 bg-white/5 text-slate-100">
            <NativeSelectOption value="">Select…</NativeSelectOption>
            {categories.map((c: any) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5"><Label className="text-slate-300">Price (FCFA)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
        <div className="space-y-1.5"><Label className="text-slate-300">Compare price</Label><Input type="number" value={form.comparePrice ?? ""} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
        <div className="space-y-1.5"><Label className="text-slate-300">Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
        <div className="space-y-1.5 md:col-span-3"><Label className="text-slate-300">Image URL</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className="border-white/10 bg-white/5 text-slate-100" /></div>
        <div className="space-y-1.5 md:col-span-3"><Label className="text-slate-300">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
        <label className="flex items-center gap-2 text-sm text-slate-300"><Switch checked={form.active !== false} onCheckedChange={(v) => setForm({ ...form, active: v === true })} /> Available for sale</label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="bg-emerald-600 text-white hover:bg-emerald-500" disabled={busy} onClick={save}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save product</Button>
        <Button variant="ghost" className="text-slate-300" onClick={onDone}>Cancel</Button>
      </div>
      {form.id && variants && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Variants</p>
          <ul className="space-y-1 text-sm text-slate-300">
            {variants.map((v: any) => (
              <li key={v.id} className="flex items-center justify-between">
                <span>{v.label} <span className="text-slate-500">({v.kind}{v.price_delta ? `, +${fcfa(v.price_delta)}` : ""})</span></span>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={async () => { await api(`/admin/variants/${v.id}`, { method: "DELETE" }); const r = await api(`/products/${form.id}`, { auth: false }); setVariants(r.variants); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
          <VariantAdder onAdd={addVariant} />
        </div>
      )}
    </Card>
  );
}

function VariantAdder({ onAdd }: { onAdd: (label: string, kind: string, delta: number) => void }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("size");
  const [delta, setDelta] = useState(0);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Variant label (e.g. Large)" className="w-44 border-white/10 bg-white/5 text-slate-100" />
      <NativeSelect value={kind} onChange={(e) => setKind(e.target.value)} className="w-28 border-white/10 bg-white/5 text-slate-100">
        <NativeSelectOption value="size">size</NativeSelectOption>
        <NativeSelectOption value="color">color</NativeSelectOption>
        <NativeSelectOption value="flavor">flavor</NativeSelectOption>
        <NativeSelectOption value="option">option</NativeSelectOption>
      </NativeSelect>
      <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} placeholder="Price delta" className="w-28 border-white/10 bg-white/5 text-slate-100" />
      <Button size="sm" variant="outline" className="border-white/10 text-slate-200" onClick={() => { if (label.trim()) { onAdd(label.trim(), kind, delta); setLabel(""); } }}>Add variant</Button>
    </div>
  );
}

function AdminCustomers() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => {
    api("/admin/customers").then((r) => setRows(r.customers)).catch(() => setRows([]));
  }, []);
  useEffect(() => {
    if (open) api(`/admin/customers/${open}`).then(setDetail).catch(() => undefined);
    else setDetail(null);
  }, [open]);
  return (
    <div>
      <AdminTitle title="Customers" subtitle="Registered shoppers and their spend." />
      {!rows ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-white/10"><tr><Th>Name</Th><Th>Phone</Th><Th>Orders</Th><Th>Spent</Th><Th>Joined</Th><Th /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((c) => (
                <>
                  <tr key={c.id} className="hover:bg-white/5">
                    <Td className="font-semibold text-white">{c.name}</Td>
                    <Td className="text-slate-300">{c.phone}</Td>
                    <Td className="text-slate-300">{c.orders}</Td>
                    <Td className="font-semibold text-white">{fcfa(c.spent)}</Td>
                    <Td className="text-slate-400">{dateShort(c.created_at)}</Td>
                    <Td><Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? "Close" : "View"}</Button></Td>
                  </tr>
                  {open === c.id && detail && (
                    <tr key={c.id + "-d"}>
                      <td colSpan={6} className="bg-[#0b1220] px-4 py-3 text-sm text-slate-300">
                        <p>Bonus balance: <span className="font-bold text-white">{fcfa(detail.balance)}</span></p>
                        <ul className="mt-2 space-y-1">
                          {detail.orders.map((o: any) => <li key={o.id}>{o.code} — {fcfa(o.total)} — {o.status.replace(/_/g, " ")}</li>)}
                        </ul>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AdminCoupons() {
  const { lists, load } = useLists();
  const [form, setForm] = useState<any | null>(null);

  async function save() {
    try {
      if (form.id) await api(`/admin/coupons/${form.id}`, { method: "PATCH", body: form });
      else await api("/admin/coupons", { body: { ...form, expiresAt: form.expiresAt || undefined } });
      toast.success("Coupon saved.");
      setForm(null);
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  async function remove(id: string) {
    if (!confirm("Delete this coupon?")) return;
    await api(`/admin/coupons/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <AdminTitle title="Coupons" subtitle="Discount codes with limits and expiry." action={<Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => setForm({ code: "", kind: "percent", value: 10, minOrder: 0, usageLimit: null, active: true })}><Plus className="mr-1 h-4 w-4" /> New coupon</Button>} />
      {form && (
        <Card className="mb-4 grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5"><Label className="text-slate-300">Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="border-white/10 bg-white/5 text-slate-100" disabled={!!form.id} /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Type</Label>
            <NativeSelect value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" disabled={!!form.id}>
              <NativeSelectOption value="percent">percent</NativeSelectOption><NativeSelectOption value="fixed">fixed</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-1.5"><Label className="text-slate-300">Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Min order</Label><Input type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Usage limit</Label><Input type="number" value={form.usageLimit ?? ""} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
          <div className="md:col-span-5 flex gap-2">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={save}><Check className="mr-1 h-4 w-4" /> Save</Button>
            <Button variant="ghost" className="text-slate-300" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </Card>
      )}
      {!lists ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-white/10"><tr><Th>Code</Th><Th>Discount</Th><Th>Min</Th><Th>Used</Th><Th>Expires</Th><Th>Active</Th><Th /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {lists.coupons.map((c: any) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <Td className="font-bold text-white">{c.code}</Td>
                  <Td className="text-slate-300">{c.kind === "percent" ? `${c.value}%` : fcfa(c.value)}</Td>
                  <Td className="text-slate-300">{fcfa(c.min_order)}</Td>
                  <Td className="text-slate-300">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</Td>
                  <Td className="text-slate-400">{dateShort(c.expires_at)}</Td>
                  <Td><Switch checked={c.active} onCheckedChange={async (v) => { await api(`/admin/coupons/${c.id}`, { method: "PATCH", body: { active: v === true } }); load(); }} /></Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="text-slate-300" onClick={() => setForm({ id: c.id, code: c.code, kind: c.kind, value: c.value, minOrder: c.min_order, usageLimit: c.usage_limit, active: c.active })}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AdminPackages() {
  const { lists, load } = useLists();
  async function toggle(p: any, active: boolean) {
    await api(`/admin/packages/${p.id}`, { method: "PATCH", body: { active } });
    load();
  }
  return (
    <div>
      <AdminTitle title="Special packages" subtitle="Store-wide preset bundles shown on the home page." />
      {!lists ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px]">
            <thead className="border-b border-white/10"><tr><Th>Name</Th><Th>Description</Th><Th>Active</Th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {lists.packages.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/5">
                  <Td className="font-semibold text-white">{p.name}</Td>
                  <Td className="text-slate-400">{p.description}</Td>
                  <Td><Switch checked={p.active} onCheckedChange={(v) => toggle(p, v === true)} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-3 text-xs text-slate-500">Presets are curated bundles; their item lists are managed with the seed data. Toggle availability here.</p>
    </div>
  );
}

function AdminCampaigns() {
  const { lists, load } = useLists();
  const [form, setForm] = useState<any | null>(null);
  async function save() {
    try {
      if (form.id) await api(`/admin/campaigns/${form.id}`, { method: "PATCH", body: form });
      else await api("/admin/campaigns", { body: form });
      toast.success("Campaign saved.");
      setForm(null);
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  return (
    <div>
      <AdminTitle title="Bonus campaigns" subtitle="Reward rules that grant bonuses automatically." action={<Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => setForm({ name: "", kind: "order_completed_percent", value: 2, threshold: 0, active: true })}><Plus className="mr-1 h-4 w-4" /> New campaign</Button>} />
      {form && (
        <Card className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5"><Label className="text-slate-300">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Kind</Label>
            <NativeSelect value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="border-white/10 bg-white/5 text-slate-100">
              <NativeSelectOption value="order_completed_percent">% per delivered order</NativeSelectOption>
              <NativeSelectOption value="milestone">milestone bonus</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-1.5"><Label className="text-slate-300">Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Threshold</Label><Input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
          <div className="md:col-span-4 flex gap-2">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={save}><Check className="mr-1 h-4 w-4" /> Save</Button>
            <Button variant="ghost" className="text-slate-300" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </Card>
      )}
      {!lists ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[520px]">
            <thead className="border-b border-white/10"><tr><Th>Name</Th><Th>Kind</Th><Th>Value</Th><Th>Threshold</Th><Th>Active</Th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {lists.campaigns.map((c: any) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <Td className="font-semibold text-white">{c.name}</Td>
                  <Td className="text-slate-300">{c.kind.replace(/_/g, " ")}</Td>
                  <Td className="text-slate-300">{c.kind === "milestone" ? fcfa(c.value) : `${c.value}%`}</Td>
                  <Td className="text-slate-300">{fcfa(c.threshold)}</Td>
                  <Td><Switch checked={c.active} onCheckedChange={async (v) => { await api(`/admin/campaigns/${c.id}`, { method: "PATCH", body: { active: v === true } }); load(); }} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AdminZones() {
  const { lists, load } = useLists();
  const [form, setForm] = useState<any | null>(null);
  async function save() {
    try {
      if (form.id) await api(`/admin/zones/${form.id}`, { method: "PATCH", body: form });
      else await api("/admin/zones", { body: form });
      toast.success("Zone saved.");
      setForm(null);
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  return (
    <div>
      <AdminTitle title="Delivery zones" subtitle="Areas, fees and cash-on-delivery availability." action={<Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => setForm({ name: "", fee: 1000, codEnabled: true, active: true })}><Plus className="mr-1 h-4 w-4" /> New zone</Button>} />
      {form && (
        <Card className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5"><Label className="text-slate-300">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" disabled={!!form.id} /></div>
          <div className="space-y-1.5"><Label className="text-slate-300">Fee (FCFA)</Label><Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className="border-white/10 bg-white/5 text-slate-100" /></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300"><Switch checked={form.codEnabled !== false} onCheckedChange={(v) => setForm({ ...form, codEnabled: v === true })} /> COD allowed</label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300"><Switch checked={form.active !== false} onCheckedChange={(v) => setForm({ ...form, active: v === true })} /> Active</label>
          <div className="md:col-span-4 flex gap-2">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={save}><Check className="mr-1 h-4 w-4" /> Save</Button>
            <Button variant="ghost" className="text-slate-300" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </Card>
      )}
      {!lists ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px]">
            <thead className="border-b border-white/10"><tr><Th>Zone</Th><Th>Fee</Th><Th>COD</Th><Th>Active</Th><Th /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {lists.zones.map((z: any) => (
                <tr key={z.id} className="hover:bg-white/5">
                  <Td className="font-semibold text-white">{z.name}</Td>
                  <Td className="font-semibold text-white">{fcfa(z.fee)}</Td>
                  <Td>{z.cod_enabled ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-red-400" />}</Td>
                  <Td>{z.active ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-red-400" />}</Td>
                  <Td><Button size="sm" variant="ghost" className="text-slate-300" onClick={() => setForm({ id: z.id, name: z.name, fee: z.fee, codEnabled: z.cod_enabled, active: z.active })}>Edit</Button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AdminStaff() {
  const { lists, load } = useLists();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  async function add() {
    if (!name.trim()) return toast.error("Rider name required.");
    try {
      await api("/admin/staff", { body: { name: name.trim(), phone: phone.trim() } });
      toast.success("Rider added.");
      setName(""); setPhone("");
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  return (
    <div>
      <AdminTitle title="Delivery staff" subtitle="Riders available for assignment." />
      <Card className="mb-4 flex flex-wrap gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rider name" className="w-48 border-white/10 bg-white/5 text-slate-100" />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-40 border-white/10 bg-white/5 text-slate-100" />
        <Button className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={add}><Plus className="mr-1 h-4 w-4" /> Add rider</Button>
      </Card>
      {!lists ? <Loader /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[400px]">
            <thead className="border-b border-white/10"><tr><Th>Name</Th><Th>Phone</Th><Th>Active</Th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {lists.staff.map((s: any) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <Td className="font-semibold text-white">{s.name}</Td>
                  <Td className="text-slate-300">{s.phone}</Td>
                  <Td><Switch checked={s.active} onCheckedChange={async (v) => { await api(`/admin/staff/${s.id}`, { method: "PATCH", body: { active: v === true } }); load(); }} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

const CHART_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"];

function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api("/admin/analytics").then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <Loader />;
  return (
    <div>
      <AdminTitle title="Analytics" subtitle="Revenue, order mix, top products and category performance." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-bold text-white">Revenue & orders — 14 days</p>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.days}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis yAxisId="r" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis yAxisId="o" orientation="right" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="r" type="monotone" dataKey="revenue" stroke="#10b981" dot={false} />
                <Line yAxisId="o" type="monotone" dataKey="orders" stroke="#3b82f6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-bold text-white">Orders by status</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.byStatus}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-bold text-white">Top products by revenue</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.topProducts} layout="vertical">
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-bold text-white">Units sold by category</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.categories} dataKey="units" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.categories.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card><p className="text-xs text-slate-400">Discounts given</p><p className="mt-1 text-lg font-extrabold text-white">{fcfa(data.discounts)}</p></Card>
        <Card><p className="text-xs text-slate-400">Bonuses issued</p><p className="mt-1 text-lg font-extrabold text-emerald-400">{fcfa(data.rewardsIssued)}</p></Card>
        <Card><p className="text-xs text-slate-400">Bonuses redeemed</p><p className="mt-1 text-lg font-extrabold text-amber-400">{fcfa(data.rewardsRedeemed)}</p></Card>
      </div>
    </div>
  );
}

function AdminSettings() {
  const { lists, load } = useLists();
  const [codGlobal, setCodGlobal] = useState<boolean | null>(null);
  const [bonusPercent, setBonusPercent] = useState<number | null>(null);
  const [tiers, setTiers] = useState<any[] | null>(null);

  useEffect(() => {
    if (lists) {
      setCodGlobal(lists.settings.codGlobal !== false);
      setBonusPercent(lists.settings.bonusEarnPercent ?? 2);
      setTiers(lists.settings.packageTiers || []);
    }
  }, [lists]);

  async function save() {
    try {
      await api("/admin/settings", { method: "PATCH", body: { codGlobal, bonusEarnPercent: bonusPercent, packageTiers: tiers } });
      toast.success("Settings saved.");
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (!lists || codGlobal === null || tiers === null) return <Loader />;
  return (
    <div>
      <AdminTitle title="Settings" subtitle="Global commerce rules." />
      <Card className="max-w-2xl space-y-5">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-bold text-white">Cash on Delivery (global)</span>
            <span className="text-xs text-slate-400">When off, COD is disabled everywhere regardless of zone.</span>
          </span>
          <Switch checked={codGlobal} onCheckedChange={(v) => setCodGlobal(v === true)} />
        </label>
        <div className="space-y-1.5">
          <Label className="text-slate-300">Default bonus earn (%)</Label>
          <Input type="number" value={bonusPercent ?? 0} onChange={(e) => setBonusPercent(Number(e.target.value))} className="w-32 border-white/10 bg-white/5 text-slate-100" />
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-white">Package discount tiers</p>
          <ul className="space-y-2">
            {tiers.map((t, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <Input type="number" value={t.minItems} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, minItems: Number(e.target.value) } : x)))} className="w-24 border-white/10 bg-white/5 text-slate-100" /> items →
                <Input type="number" value={t.pct} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} className="w-24 border-white/10 bg-white/5 text-slate-100" /> % off
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="outline" className="mt-2 border-white/10 text-slate-200" onClick={() => setTiers([...tiers, { minItems: 3, pct: 5 }])}><Plus className="mr-1 h-3.5 w-3.5" /> Add tier</Button>
        </div>
        <Button className="bg-emerald-600 text-white hover:bg-emerald-500" onClick={save}><Check className="mr-1 h-4 w-4" /> Save settings</Button>
      </Card>
    </div>
  );
}
