import { useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoute, navigate } from "@/src/lib/router";
import { useApp } from "@/src/state/app";
import { api, setToken, errorMessage } from "@/src/lib/api";
import { Logo } from "@/src/components/shell";

export function LoginPage() {
  const { params } = useRoute();
  const { setUser } = useApp();
  const next = params.get("next") || "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    const phone = form.phone.replace(/\D/g, "");
    if (phone.length < 9) {
      toast.error("Enter a valid phone number.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (mode === "register" && !form.name.trim()) {
      toast.error("Enter your full name.");
      return;
    }
    setBusy(true);
    try {
      const res = mode === "login" ? await api("/auth/login", { body: { phone, password: form.password }, auth: false }) : await api("/auth/register", { body: { name: form.name.trim(), phone, password: form.password }, auth: false });
      setToken(res.token);
      setUser(res.user);
      toast.success(mode === "login" ? `Welcome back, ${res.user.name.split(" ")[0]}!` : "Account created — welcome to Dakar Shop!");
      navigate(res.user.role === "admin" && next === "/" ? "/admin" : next);
    } catch (error) {
      toast.error(errorMessage(error));
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 grid grid-cols-2 rounded-lg bg-secondary p-1 text-sm font-semibold">
          <button type="button" className={`rounded-md py-1.5 ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`} onClick={() => setMode("login")}>
            Sign in
          </button>
          <button type="button" className={`rounded-md py-1.5 ${mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground"}`} onClick={() => setMode("register")}>
            Create account
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Awa Diop" autoComplete="name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="77 000 00 00" autoComplete="tel" inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your phone number is your account ID. We never share it.
        </p>
      </div>
    </div>
  );
}
