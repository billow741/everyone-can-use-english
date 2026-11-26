import { Link, useLocation } from "react-router-dom";
import { useRef, useLayoutEffect } from "react";
import {
  HomeIcon,
  GraduationCapIcon,
  BookMarkedIcon,
  UserIcon,
} from "lucide-react";
import { useVocabBadge } from "@renderer/lib/vocab-count";
import { animateSlidingIndicator } from "@renderer/lib/motion";

export const MobileTabBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { count: vocabCount } = useVocabBadge();
  const barRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // 依据工单 C 规范：收编为 主页 ｜ 课程 ｜ 生词本 ｜ 我的
  const tabs = [
    {
      to: "/",
      label: "主页",
      icon: HomeIcon,
      active: currentPath === "/",
      badge: 0,
    },
    {
      to: "/courses",
      label: "课程",
      icon: GraduationCapIcon,
      active: currentPath.startsWith("/courses"),
      badge: 0,
    },
    {
      to: "/vocabulary",
      label: "生词本",
      icon: BookMarkedIcon,
      active: currentPath.startsWith("/vocabulary"),
      badge: vocabCount,
    },
    {
      to: "/profile",
      label: "我的",
      icon: UserIcon,
      active: currentPath.startsWith("/profile"),
      badge: 0,
    },
  ];

  useLayoutEffect(() => {
    if (!barRef.current || !indicatorRef.current) return;
    const activeEl = barRef.current.querySelector<HTMLElement>(".mobile-tab-item.active");
    animateSlidingIndicator(indicatorRef.current, activeEl, { duration: 0.22 });
  }, [currentPath]);

  return (
    <div
      ref={barRef}
      className="min-[1280px]:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper-soft/95 dark:bg-slate-900/95 backdrop-blur-md border-t-2 border-amber-200/60 dark:border-slate-800 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg"
    >
      {/* 底部导航当前项滑动跟随指示器 (Motion Prompt #057) */}
      <div
        ref={indicatorRef}
        className="pointer-events-none absolute rounded-2xl bg-amber-500/15 z-0"
        aria-hidden="true"
        style={{ opacity: 0 }}
      />
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`mobile-tab-item relative z-10 flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              tab.active
                ? "active text-orange-700 dark:text-amber-400 font-black scale-105"
                : "text-muted-foreground hover:text-foreground font-bold"
            }`}
          >
            <span className="relative">
              <Icon className={`size-5 ${tab.active ? "stroke-[2.5]" : ""}`} />
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-0.5 rounded-full bg-rose-700 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
