import { useState, useEffect } from "react";

/**
 * 桌面端视口断点检测 Hook（断点严格为 ≥1280px）
 * 视口 <1280px 保持现有移动端布局一字不动（零回归）
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1280;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1280px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    setIsDesktop(mql.matches);
    try {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } catch {
      // Fallback for older browsers
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, []);

  return isDesktop;
}
