import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  BotIcon,
  SparklesIcon,
  BookOpenIcon,
  BookMarkedIcon,
} from "lucide-react";

export const MobileTabBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // 对应少儿 4 大核心域的高频移动端底栏
  const tabs = [
    {
      to: "/",
      label: "今日探险",
      icon: HomeIcon,
      active: currentPath === "/",
    },
    {
      to: "/phonemes",
      label: "39音标",
      icon: SparklesIcon,
      active: currentPath.startsWith("/phonemes"),
    },
    {
      to: "/stories",
      label: "牛津绘本",
      icon: BookOpenIcon,
      active: currentPath.startsWith("/stories"),
    },
    {
      to: "/conversations",
      label: "敢敢AI",
      icon: BotIcon,
      active: currentPath.startsWith("/conversations"),
    },
    {
      to: "/vocabulary",
      label: "生词本",
      icon: BookMarkedIcon,
      active: currentPath.startsWith("/vocabulary"),
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
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
              tab.active
                ? "text-orange-600 dark:text-amber-400 font-black scale-105 bg-amber-500/15"
                : "text-muted-foreground hover:text-foreground font-bold"
            }`}
          >
            <Icon className={`size-5 ${tab.active ? "stroke-[2.5]" : ""}`} />
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
