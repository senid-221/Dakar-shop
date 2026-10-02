import { useEffect, useRef, useState } from "react";
import lottie, { type AnimationItem } from "lottie-web";

export function LottieLoader({
  src = "/lottie/loading.json",
  label,
  size = 84,
  className = "",
}: {
  src?: string;
  label?: string;
  size?: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let anim: AnimationItem | null = null;
    let alive = true;
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("lottie_fetch_failed");
        return res.json();
      })
      .then((data) => {
        if (!alive || !hostRef.current) return;
        anim = lottie.loadAnimation({
          container: hostRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data,
        });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      anim?.destroy();
    };
  }, [src]);

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status" aria-label={label || "Loading"}>
      {failed ? (
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      ) : (
        <div ref={hostRef} style={{ width: size, height: size }} aria-hidden="true" />
      )}
      {label && <span className="text-sm font-semibold text-muted-foreground">{label}</span>}
    </div>
  );
}
