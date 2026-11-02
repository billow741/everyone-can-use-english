import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  SparklesIcon,
  MessageCircleIcon,
  BookMarkedIcon,
  TrophyIcon,
} from "lucide-react";
import { useVocabBadge } from "@renderer/lib/vocab-count";

export const MobileTabBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { count: vocabCount } = useVocabBadge();

  // 功能型底栏：按学习动作组织（学新课 / 拼读 / 对话 / 生词 / 进度）
  const tabs = [
    {
      to: "/",
      label: "学习主场",
      icon: HomeIcon,
      active: currentPath === "/",
      badge: 0,
    },
    {
      to: "/phonemes",
      label: "39通关岛",
      icon: SparklesIcon,
      active: currentPath.startsWith("/phonemes"),
      badge: 0,
    },
    {
      to: "/dialogues",
      label: "情景对话课",
      icon: MessageCircleIcon,
      active: currentPath.startsWith("/dialogues"),
      badge: 0,
    },
    {
      to: "/vocabulary",
      label: "生词库",
      icon: BookMarkedIcon,
      active: currentPath.startsWith("/vocabulary"),
      badge: vocabCount,
    },
    {
      to: "/profile",
      label: "我的成就",
      icon: TrophyIcon,
      active: currentPath.startsWith("/profile"),
      badge: 0,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF7]/95 dark:bg-slate-900/95 backdrop-blur-md border-t-2 border-amber-200/60 dark:border-slate-800 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              tab.active
                ? "text-orange-600 dark:text-amber-400 font-black scale-105 bg-amber-500/15"
                : "text-muted-foreground hover:text-foreground font-bold"
            }`}
          >
            <span className="relative">
              <Icon className={`size-5 ${tab.active ? "stroke-[2.5]" : ""}`} />
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
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
