import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { useRoute, navigate } from "@/src/lib/router";
import { AppProvider, useApp } from "@/src/state/app";
import { Header, Footer, MobileTabBar, WhatsAppFab, ChatWidget, EmptyState } from "@/src/components/shell";
import { HomePage } from "@/src/pages/store-home";
import { ShopPage, ProductPage } from "@/src/pages/store-shop";
import { PackagePage } from "@/src/pages/store-package";
import { CartPage, CheckoutPage } from "@/src/pages/store-cart";
import { TrackPage, DeliveryAreasPage } from "@/src/pages/store-track";
import { LoginPage } from "@/src/pages/auth";
import { AccountPage } from "@/src/pages/account";
import { AdminPage } from "@/src/pages/admin";
import { SearchX } from "lucide-react";

function Routes() {
  const { pathname } = useRoute();
  const { user } = useApp();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Citymarket Dakar — bakery & delivery in Dakar",
      "/shop": "Shop — Citymarket Dakar",
      "/package": "Build a Package — Citymarket Dakar",
      "/cart": "Your cart — Citymarket Dakar",
      "/checkout": "Checkout — Citymarket Dakar",
      "/track": "Track your order — Citymarket Dakar",
      "/login": "Sign in — Citymarket Dakar",
      "/delivery-areas": "Delivery areas — Citymarket Dakar",
    };
    document.title = pathname.startsWith("/admin")
      ? "Admin — Citymarket Dakar"
      : titles[pathname] || (pathname.startsWith("/product/") ? "Product — Citymarket Dakar" : "Citymarket Dakar");
  }, [pathname]);

  if (pathname === "/") return <HomePage />;
  if (pathname === "/shop") return <ShopPage />;
  if (pathname.startsWith("/product/")) return <ProductPage id={pathname.slice("/product/".length)} />;
  if (pathname === "/package") return <PackagePage />;
  if (pathname === "/cart") return <CartPage />;
  if (pathname === "/checkout") return <CheckoutPage />;
  if (pathname === "/track" || pathname.startsWith("/track/")) return <TrackPage />;
  if (pathname === "/login") return user ? null : <LoginPage />;
  if (pathname === "/delivery-areas") return <DeliveryAreasPage />;
  if (pathname === "/account" || pathname.startsWith("/account/")) return <AccountPage />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        body="The page you are looking for does not exist or has moved."
        action={<Button onClick={() => navigate("/")}>Back to home</Button>}
      />
    </div>
  );
}

function Shell() {
  const { user } = useApp();
  const { pathname } = useRoute();

  useEffect(() => {
    if (pathname === "/login" && user) navigate(user.role === "admin" ? "/admin" : "/account", { replace: true });
  }, [pathname, user]);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return (
      <>
        <AdminPage />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-[70dvh]">
        <Routes />
      </main>
      <Footer />
      <MobileTabBar />
      <WhatsAppFab />
      <ChatWidget />
      <Toaster position="top-center" richColors />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
