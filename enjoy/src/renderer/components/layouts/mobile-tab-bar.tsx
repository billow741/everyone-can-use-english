import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  BotIcon,
  MicIcon,
  BookOpenIcon,
  BookMarkedIcon,
} from "lucide-react";

export const MobileTabBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    {
      to: "/",
      label: "伴学主页",
      icon: HomeIcon,
      active: currentPath === "/",
    },
    {
      to: "/conversations",
      label: "敢敢 AI",
      icon: BotIcon,
      active: currentPath.startsWith("/conversations"),
    },
    {
      to: "/pronunciation_assessments",
      label: "语音纠音",
      icon: MicIcon,
      active: currentPath.startsWith("/pronunciation_assessments"),
    },
    {
      to: "/stories",
      label: "精选绘本",
      icon: BookOpenIcon,
      active: currentPath.startsWith("/stories"),
    },
    {
      to: "/vocabulary",
      label: "生词本",
      icon: BookMarkedIcon,
      active: currentPath.startsWith("/vocabulary"),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              tab.active
                ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                : "text-muted-foreground hover:text-foreground font-medium"
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
