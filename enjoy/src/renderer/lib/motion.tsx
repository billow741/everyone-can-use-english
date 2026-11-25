// Motion Prompt References:
// Motion Prompt #002 · MIT License (c) 2026 Shohei Ohtaki · Stagger entrance
// Motion Prompt #074 · MIT License (c) 2026 Shohei Ohtaki · Fade-in on scroll / entrance
// Motion Prompt #081 · MIT License (c) 2026 Shohei Ohtaki · Hover lift
// Motion Prompt #057 · MIT License (c) 2026 Shohei Ohtaki · Tabs / Sliding indicator
// Motion Prompt #060 · MIT License (c) 2026 Shohei Ohtaki · Highlight follow / Sliding indicator
// Motion Prompt #092 · MIT License (c) 2026 Shohei Ohtaki · Page transition

import React, { useEffect, useRef, useLayoutEffect } from "react";
import gsap from "gsap";

/**
 * 检查当前环境是否偏好减弱动效 (prefers-reduced-motion)
 */
export function checkPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface PageTransitionOptions {
  duration?: number;
  y?: number;
}

/**
 * 页面切换进入动效 (Motion Prompt #092 / #074)
 * 约 200–250ms 淡入＋轻微向上滑入，不闪白、不阻塞导航
 * 遵循 prefers-reduced-motion (GSAP matchMedia 兜底)，减弱动效用户只保留淡入淡出
 */
export function animatePageTransition(
  element: HTMLElement | null,
  options?: PageTransitionOptions
) {
  if (!element) return;
  const duration = options?.duration ?? 0.22;
  const yOffset = options?.y ?? 8;

  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.fromTo(
      element,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.2,
        ease: "power1.out",
        clearProps: "all",
        overwrite: "auto",
      }
    );
  });
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    gsap.fromTo(
      element,
      { opacity: 0, y: yOffset },
      {
        opacity: 1,
        y: 0,
        duration,
        ease: "power2.out",
        clearProps: "transform",
        overwrite: "auto",
      }
    );
  });
}

export interface OutletTransitionProps {
  pathname: string;
  isLanding?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Outlet 路由切换动效包裹组件 (Motion Prompt #092)
 * 路由 pathname 变化时触发约 200–250ms 淡入滑入；登录/落地保持瞬切
 */
export const OutletTransition: React.FC<OutletTransitionProps> = ({
  pathname,
  isLanding = false,
  children,
  className = "w-full min-h-full",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef<string>(pathname);

  useLayoutEffect(() => {
    // 登录/落地分支保持瞬切，不加动效
    if (isLanding || pathname === "/landing") {
      prevPathRef.current = pathname;
      return;
    }

    if (containerRef.current) {
      animatePageTransition(containerRef.current);
    }
    prevPathRef.current = pathname;
  }, [pathname, isLanding]);

  return (
    <div ref={containerRef} className={className} data-transition-path={pathname}>
      {children}
    </div>
  );
};

export interface StaggerOptions {
  stagger?: number;
  duration?: number;
  y?: number;
  ease?: string;
}

/**
 * 列表卡片依次入场 Hook (Motion Prompt #002 Stagger)
 * 错开 30–50ms (默认 0.04s)，opacity + y 进入，挂载/进入时只播一次，重渲染不重播
 * 遵循 prefers-reduced-motion (GSAP matchMedia)，减弱动效用户只保留淡入淡出
 */
export function useCardStagger(
  containerRef: React.RefObject<HTMLElement | null>,
  itemSelector: string,
  dependencies: any[],
  options?: StaggerOptions
) {
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    if (hasAnimatedRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll(itemSelector);
    if (!elements || elements.length === 0) return;

    hasAnimatedRef.current = true;
    const duration = options?.duration ?? 0.38;
    const stagger = options?.stagger ?? 0.045;
    const yOffset = options?.y ?? 14;
    const ease = options?.ease ?? "power2.out";

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.fromTo(
        elements,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.35,
          stagger: 0.03,
          ease: "power1.out",
          clearProps: "all",
          overwrite: "auto",
        }
      );
    });
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        elements,
        { opacity: 0, y: yOffset },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease,
          clearProps: "transform",
          overwrite: "auto",
        }
      );
    });
  }, dependencies);

  return { hasAnimatedRef };
}

/**
 * 侧边栏/导航当前项指示滑动跟随 (Motion Prompt #057 / #060)
 * 遵循 prefers-reduced-motion (GSAP matchMedia)，减弱动效用户直接对齐无位移动画
 */
export function animateSlidingIndicator(
  indicatorEl: HTMLElement | null,
  targetEl: HTMLElement | null,
  options?: { duration?: number; isVertical?: boolean }
) {
  if (!indicatorEl || !targetEl) {
    if (indicatorEl) {
      gsap.to(indicatorEl, { opacity: 0, duration: 0.15 });
    }
    return;
  }

  const top = targetEl.offsetTop;
  const left = targetEl.offsetLeft;
  const width = targetEl.offsetWidth;
  const height = targetEl.offsetHeight;

  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set(indicatorEl, {
      top,
      left,
      width,
      height,
      opacity: 1,
      overwrite: "auto",
    });
  });
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    gsap.to(indicatorEl, {
      top,
      left,
      width,
      height,
      opacity: 1,
      duration: options?.duration ?? 0.24,
      ease: "power2.out",
      overwrite: "auto",
    });
  });
}

export interface HighlightFollowOptions {
  duration?: number;
  popLine?: boolean;
}

/**
 * 播放中文稿高亮底衬跟随当前句滑动 (复用 Motion Prompt #057 / #060 模式)
 * 约 0.24s power2.out，行切换轻微 pop (opacity/微缩放，约 200ms，power1.out)
 * 遵循 prefers-reduced-motion (GSAP matchMedia)，减弱动效用户直接对齐无 tween、不 pop
 */
export function animateHighlightFollow(
  indicatorEl: HTMLElement | null,
  targetLineEl: HTMLElement | null,
  options?: HighlightFollowOptions
) {
  if (!indicatorEl || !targetLineEl) {
    if (indicatorEl) {
      gsap.to(indicatorEl, { opacity: 0, duration: 0.15 });
    }
    return;
  }

  const top = targetLineEl.offsetTop;
  const height = targetLineEl.offsetHeight;
  const duration = options?.duration ?? 0.24;

  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set(indicatorEl, {
      top,
      height,
      opacity: 1,
      overwrite: "auto",
    });
  });
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    if (duration === 0) {
      gsap.set(indicatorEl, {
        top,
        height,
        opacity: 1,
        overwrite: "auto",
      });
    } else {
      gsap.to(indicatorEl, {
        top,
        height,
        opacity: 1,
        duration,
        ease: "power2.out",
        overwrite: "auto",
      });
    }

    if (options?.popLine !== false && duration > 0) {
      // 当前行切换时给行本身一个轻微入场 pop（opacity / 微缩放，约 200ms，power1.out，克制）
      gsap.fromTo(
        targetLineEl,
        { scale: 0.992, opacity: 0.88 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.2,
          ease: "power1.out",
          clearProps: "transform,opacity",
          overwrite: "auto",
        }
      );
    }
  });
}

export interface ChapterCelebrationProps {
  onComplete?: () => void;
}

// 海洋青配色：深青 #0F7B7A、中青 #149694、琥珀 #F2A93B、绿 #3FA46A
const CELEBRATION_COLORS = ["#0F7B7A", "#149694", "#F2A93B", "#3FA46A"];

// 预计算 20 颗向外飞散的星星参数
const CELEBRATION_STARS = Array.from({ length: 20 }, (_, i) => {
  const angle = (i * (360 / 20) + (i % 2 === 0 ? 8 : -8)) * (Math.PI / 180);
  const distance = 90 + ((i * 37) % 110); // 90px ~ 200px
  const targetX = Math.cos(angle) * distance;
  // 向上发散微偏向与重力轻微下坠
  const targetY = Math.sin(angle) * distance * 0.85 + 28;
  const rot = ((i * 71) % 400) - 200;
  const color = CELEBRATION_COLORS[i % CELEBRATION_COLORS.length];
  const size = 14 + ((i * 7) % 10); // 14px ~ 24px
  const isSparkle = i % 2 === 0;
  return { id: i, targetX, targetY, rot, color, size, isSparkle };
});

/**
 * 听力章节听完完成庆祝组件
 * 16–24 颗暖阳配色星星从播放器中央飞散约 1.2s ＋「听完啦」小条淡入淡出（约 1.5s）
 * pointer-events: none，绝不拦截点按，动画完成后从 DOM 移除
 * prefers-reduced-motion 兜底：减弱动效用户无飞散星星，仅「听完啦」淡入淡出
 */
export const ChapterCelebration: React.FC<ChapterCelebrationProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const badge = badgeRef.current;
    if (!container || !badge) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: reduce)", () => {
      // 减弱动效的用户：无飞散星星，只有「听完啦」淡入淡出（约 1.5s）
      const tl = gsap.timeline({
        onComplete: () => {
          onCompleteRef.current?.();
        },
      });

      tl.fromTo(
        badge,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power1.out" }
      )
        .to(badge, { opacity: 1, duration: 0.75 })
        .to(badge, { opacity: 0, duration: 0.4, ease: "power1.in" });
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const starEls = container.querySelectorAll(".celebration-star");
      const tl = gsap.timeline({
        onComplete: () => {
          onCompleteRef.current?.();
        },
      });

      // 20 颗星星向外飞散（带轻微重力感、旋转、淡出，约 1.2s）
      starEls.forEach((el, idx) => {
        const star = CELEBRATION_STARS[idx];
        if (!star) return;
        gsap.fromTo(
          el,
          {
            x: 0,
            y: 0,
            scale: 0.2,
            rotation: 0,
            opacity: 1,
          },
          {
            x: star.targetX,
            y: star.targetY,
            scale: 0.8,
            rotation: star.rot,
            opacity: 0,
            duration: 1.15 + (idx % 3) * 0.08,
            ease: "power2.out",
          }
        );
      });

      // 「听完啦」小条淡入淡出（约 1.5s）
      tl.fromTo(
        badge,
        { opacity: 0, scale: 0.86, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: "back.out(1.5)" }
      )
        .to(badge, { opacity: 1, duration: 0.78 })
        .to(badge, { opacity: 0, scale: 0.92, y: -8, duration: 0.4, ease: "power2.in" });
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      {/* 飞散星星粒子层 */}
      <div className="relative flex items-center justify-center">
        {CELEBRATION_STARS.map((s) => (
          <div
            key={s.id}
            className="celebration-star absolute pointer-events-none"
            style={{
              width: s.size,
              height: s.size,
              color: s.color,
              opacity: 0,
            }}
          >
            {s.isSparkle ? (
              // 4角星 sparkle
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            ) : (
              // 5角星 star
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full drop-shadow-sm">
                <path d="M12 2l2.9 6.9 7.1.6-5.3 4.6 1.6 7-6.3-3.8-6.3 3.8 1.6-7L2 9.5l7.1-.6L12 2z" />
              </svg>
            )}
          </div>
        ))}

        {/* 「听完啦」小条 */}
        <div
          ref={badgeRef}
          className="celebration-badge flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/95 border-2 border-[#0F7B7A] shadow-[0_8px_30px_rgba(15,123,122,0.25)] select-none pointer-events-none"
          style={{ opacity: 0 }}
        >
          <svg className="size-4.5 text-[#0F7B7A]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.9 7.1.6-5.3 4.6 1.6 7-6.3-3.8-6.3 3.8 1.6-7L2 9.5l7.1-.6L12 2z" />
          </svg>
          <span className="font-extrabold text-sm md:text-base text-[#123B3C] tracking-wider">
            听完啦
          </span>
        </div>
      </div>
    </div>
  );
};
