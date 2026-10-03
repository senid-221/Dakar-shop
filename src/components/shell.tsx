import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Package, Home, Store, User, Search, Heart, LogOut, Bell, MessageCircle, X, Send, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, navigate, useRoute } from "@/src/lib/router";
import { useApp } from "@/src/state/app";
import { api } from "@/src/lib/api";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="#F3A7C7" />
        <circle cx="16" cy="16" r="14" fill="url(#dkg)" opacity="0.55" />
        <defs>
          <linearGradient id="dkg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9B8CF2" />
            <stop offset="1" stopColor="#E86FA8" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="5" fill="#FFF6FA" />
        <rect x="10" y="8" width="3" height="1.6" rx="0.8" fill="#fff" transform="rotate(24 11.5 8.8)" />
        <rect x="19" y="9" width="3" height="1.6" rx="0.8" fill="#fff" transform="rotate(-18 20.5 9.8)" />
        <rect x="8" y="16" width="3" height="1.6" rx="0.8" fill="#fff" transform="rotate(-30 9.5 16.8)" />
        <rect x="21" y="18" width="3" height="1.6" rx="0.8" fill="#fff" transform="rotate(40 22.5 18.8)" />
        <rect x="12" y="22" width="3" height="1.6" rx="0.8" fill="#fff" transform="rotate(12 13.5 22.8)" />
      </svg>
      {!compact && (
        <span className="font-display text-[19px] font-bold tracking-tight text-foreground">
          Citymarket<span className="text-primary"> Dakar</span>
        </span>
      )}
    </span>
  );
}

export function Header() {
  const { cartCount, user, logout } = useApp();
  const { pathname } = useRoute();
  const [query, setQuery] = useState("");

  const nav = [
    { to: "/shop", label: "Shop" },
    { to: "/package", label: "Build a Package" },
    { to: "/track", label: "Track Order" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-[#fbeaf2]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" ariaLabel="Citymarket Dakar home">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${pathname.startsWith(item.to) ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          className="ml-auto hidden min-w-0 flex-1 max-w-xs sm:block"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/shop?q=${encodeURIComponent(query)}`);
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className="pl-8" aria-label="Search products" />
          </div>
        </form>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Link to="/account/favorites" className="rounded-md p-2 text-muted-foreground hover:text-foreground" ariaLabel="Favorites">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to="/cart" className="relative rounded-md p-2 text-muted-foreground hover:text-foreground" ariaLabel="Cart">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{cartCount}</span>}
          </Link>
          {user ? (
            <div className="flex items-center gap-1">
              <Link to={user.role === "admin" ? "/admin" : "/account"} className="rounded-md p-2 text-muted-foreground hover:text-foreground" ariaLabel="Account">
                <User className="h-5 w-5" />
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="ml-1">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileTabBar() {
  const { pathname } = useRoute();
  const { cartCount, user } = useApp();
  const tabs = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/shop", icon: Store, label: "Shop" },
    { to: "/package", icon: Package, label: "Package" },
    { to: "/cart", icon: ShoppingCart, label: "Cart" },
    { to: user ? (user.role === "admin" ? "/admin" : "/account") : "/login", icon: User, label: "Account" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-[#fbeaf2]/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          return (
            <Link key={tab.label} to={tab.to} className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>
              <tab.icon className="h-5 w-5" />
              {tab.label}
              {tab.label === "Cart" && cartCount > 0 && <span className="absolute right-1/2 top-0.5 translate-x-4 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{cartCount}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border/70 bg-white/55 pb-20 backdrop-blur md:pb-8">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted-foreground">Dakar's online bakery and delivery platform. Order today, delivered to your door.</p>
        </div>
        <div className="text-sm">
          <h3 className="font-bold">WhatsApp / Admin</h3>
          <a className="mt-1 block text-primary underline-offset-2 hover:underline" href="https://wa.me/221775784158">+221 77 578 41 58</a>
          <h3 className="mt-3 font-bold">Location</h3>
          <p className="mt-1 flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Dakar, Senegal</p>
        </div>
        <div className="text-sm">
          <h3 className="font-bold">Founder</h3>
          <p className="mt-1 text-muted-foreground">RWAMIGABO Innocent</p>
        </div>
        <div className="text-sm">
          <h3 className="font-bold">Web Developer</h3>
          <p className="mt-1 text-muted-foreground">IRAGUHA Vincent</p>
          <a className="mt-1 block text-primary underline-offset-2 hover:underline" href="https://wa.me/250726969060">WhatsApp: +250 72 696 90 60</a>
        </div>
      </div>
      <p className="pb-4 text-center text-xs text-muted-foreground">© 2026 Citymarket Dakar — Dakar, Senegal</p>
    </footer>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href="https://wa.me/221775784158"
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with support on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-105 md:bottom-6"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2m0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.24-8.24 8.24m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28" />
      </svg>
    </a>
  );
}

type ChatMessage = { role: "user" | "bot"; text: string; actions?: { label: string; href: string }[] };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "Hello! I am the Citymarket Dakar assistant. I can help with products, orders, delivery, payments, packages, coupons and gifts. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    setInput("");
    try {
      const res = await api("/chat", { body: { message: clean }, auth: false });
      setMessages((prev) => [...prev, { role: "bot", text: res.reply, actions: res.actions }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "I could not reach the service. Please try again or contact us on WhatsApp." }]);
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat assistant"}
        className="fixed bottom-36 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-24"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fade-up fixed bottom-52 right-4 z-40 flex h-[420px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl md:bottom-40">
          <div className="border-b border-border px-4 py-3 font-display text-sm font-bold">Citymarket Dakar Assistant</div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" : "mr-4 rounded-lg bg-secondary px-3 py-2 text-sm"}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.actions?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.actions.map((action) =>
                      action.href.startsWith("http") ? (
                        <a key={action.label} href={action.href} target="_blank" rel="noreferrer" className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{action.label}</a>
                      ) : (
                        <button key={action.label} type="button" onClick={() => { setOpen(false); navigate(action.href); }} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          {action.label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about products, orders…" aria-label="Chat message" />
            <Button type="submit" size="icon" disabled={busy} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: any; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/80 px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-display font-bold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === "delivered" ? "bg-primary/10 text-primary" : status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-blush/15 text-[#c2417f]";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant="secondary" className={`border-0 ${tone}`}>{label}</Badge>;
}
