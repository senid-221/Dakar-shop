import { useSyncExternalStore, type ReactNode, type MouseEvent } from "react";

let currentPath = window.location.pathname + window.location.search;
const listeners = new Set<() => void>();

window.addEventListener("popstate", () => {
  currentPath = window.location.pathname + window.location.search;
  listeners.forEach((listener) => listener());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRoute() {
  const path = useSyncExternalStore(subscribe, () => currentPath);
  const [pathname, search = ""] = path.split("?");
  return { pathname: pathname === "/" ? "/" : pathname.replace(/\/$/, "") || "/", params: new URLSearchParams(search) };
}

export function navigate(to: string, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, "", to);
  else window.history.pushState({}, "", to);
  currentPath = window.location.pathname + window.location.search;
  listeners.forEach((listener) => listener());
  window.scrollTo({ top: 0 });
}

export function Link({ to, children, className, onClick, ariaLabel }: { to: string; children: ReactNode; className?: string; onClick?: () => void; ariaLabel?: string }) {
  function handle(event: MouseEvent) {
    if (event.metaKey || event.ctrlKey || event.button !== 0) return;
    event.preventDefault();
    onClick?.();
    navigate(to);
  }
  return (
    <a href={to} onClick={handle} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
