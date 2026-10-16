import React, { useState, useEffect, useContext, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  MoonIcon,
  SunIcon,
  SparklesIcon,
  FlameIcon,
  AwardIcon,
  StarIcon,
} from "lucide-react";
import {
  Button,
  Avatar,
  AvatarImage,
} from "@renderer/components/ui";
import { AppSettingsProviderContext } from "@renderer/context";
import { ThemeProviderContext } from "@renderer/context/theme-provider";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  ALL_39_PHONEMES,
} from "@renderer/lib/phoneme-data";

export const PlatformHeader = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const { user, EnjoyApp } = useContext(AppSettingsProviderContext);
  const { theme, setTheme } = useContext(ThemeProviderContext);
  
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );

  useEffect(() => {
    const unsub = subscribePhonemeMastery((newMap) => {
      setMasteryMap(newMap);
    });
    return () => unsub();
  }, []);

  const masteredCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => !!masteryMap[p.slug]).length;
  }, [masteryMap]);

  // 领域与页面少儿化面包屑定位
  const currentDomainInfo = useMemo(() => {
    if (pathname === "/") {
      return { domain: "🎯 学习主场", page: "今日探险主控台", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/courses")) {
      return { domain: "🎯 学习主场", page: "牛津阶梯体系课", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/phonemes")) {
      return { domain: "🧩 拼读基石", page: "39 音标宝藏库", color: "text-orange-500" };
    }
    if (pathname.startsWith("/pronunciation_assessments")) {
      return { domain: "🧩 拼读基石", page: "发音魔法纠错舱", color: "text-orange-500" };
    }
    if (pathname.startsWith("/stories")) {
      return { domain: "📖 沉浸语境", page: "牛津精选绘本馆", color: "text-purple-500" };
    }
    if (pathname.startsWith("/theater")) {
      return { domain: "📖 沉浸语境", page: "生活奇遇微剧场", color: "text-rose-500" };
    }
    if (pathname.startsWith("/world")) {
      return { domain: "📖 沉浸语境", page: "敢敢环球奇遇记", color: "text-indigo-500" };
    }
    if (pathname.startsWith("/conversations")) {
      return { domain: "📖 沉浸语境", page: "敢敢 AI 随身外教", color: "text-emerald-500" };
    }
    if (pathname.startsWith("/vocabulary")) {
      return { domain: "🎒 我的背包", page: "魔法发音生词本", color: "text-rose-500" };
    }
    if (pathname.startsWith("/profile")) {
      return { domain: "🎒 我的背包", page: "小勇士学情荣誉", color: "text-blue-500" };
    }
    return { domain: "🌟 阳光桥英语乐园", page: "快乐伴学", color: "text-amber-500" };
  }, [pathname]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleOpenConsultation = () => {
    const url = "https://www.sunnybridge.qzz.io/apply.html";
    if (EnjoyApp?.shell?.openExternal) {
      EnjoyApp.shell.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full h-15 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b-2 border-amber-200/60 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between transition-all select-none shadow-xs">
      {/* 左侧：萌趣品牌徽标 + 当前探索域 */}
      <div className="flex items-center gap-2.5">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <img
              src="/assets/sunnybridge-logo.webp"
              alt="SunnyBridge"
              className="size-8 rounded-xl object-contain bg-white shadow-xs p-0.5 border border-amber-300 group-hover:scale-105 transition-transform"
            />
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-500 border border-white animate-pulse" />
          </div>
          <span className="hidden md:inline font-black text-xs text-amber-900 dark:text-amber-200 tracking-tight">
            阳光桥少儿英语
          </span>
        </Link>

        <span className="text-amber-300 dark:text-slate-700 font-bold hidden sm:inline">|</span>

        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30 text-[11px] shadow-2xs">
            {currentDomainInfo.domain}
          </span>
          <span className="text-muted-foreground/40 font-mono">/</span>
          <span className={`tracking-tight font-black text-xs ${currentDomainInfo.color}`}>
            {currentDomainInfo.page}
          </span>
        </div>
      </div>

      {/* 中间：少儿成就徽章岛 (打卡天数 + 探险星星 + 音标进度) */}
      <div className="hidden lg:flex items-center gap-2.5">
        {/* 打卡天数 */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-400/30 text-orange-600 dark:text-orange-400 text-xs font-black shadow-2xs">
          <FlameIcon className="size-3.5 fill-orange-500 text-orange-500 animate-bounce" />
          <span>连续坚持 3 天</span>
        </div>

        {/* 探险星星 */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-xs font-black shadow-2xs">
          <StarIcon className="size-3.5 fill-amber-400 text-amber-500" />
          <span>能量星 120 颗</span>
        </div>

        {/* 39音标通关宝藏 */}
        <Link
          to="/phonemes"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/30 text-purple-700 dark:text-purple-300 text-xs font-black shadow-2xs transition-transform active:scale-95"
          title="点击查看39音标宝藏图"
        >
          <AwardIcon className="size-3.5 text-purple-600 dark:text-purple-400" />
          <span>音标宝藏 {masteredCount}/39</span>
        </Link>
      </div>

      {/* 右侧：护眼模式 + 外教试听 + 学员名牌 */}
      <div className="flex items-center gap-2">
        {/* 护眼模式切换按钮 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleTheme}
          className="size-9 p-0 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-amber-200/60 dark:border-slate-700 text-slate-700 dark:text-amber-300 cursor-pointer shadow-2xs transition-transform active:scale-90"
          title={`切换为${theme === "dark" ? "明亮模式" : "护眼暗色模式"}`}
        >
          {theme === "dark" ? (
            <SunIcon className="size-4 text-amber-400" />
          ) : (
            <MoonIcon className="size-4 text-slate-700" />
          )}
        </Button>

        {/* 预约欧美外教 CTA */}
        <button
          onClick={handleOpenConsultation}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-black rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 shadow-xs border border-amber-300/80 transition-all hover:scale-102 active:scale-95 cursor-pointer"
        >
          <SparklesIcon className="size-3.5 fill-slate-950/20" />
          <span>预约外教试听</span>
        </button>

        {/* 学员萌趣名牌 */}
        {user && (
          <Link
            to="/profile"
            className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 dark:bg-slate-800 border border-amber-300/40 dark:border-slate-700 transition-all shadow-2xs"
            title="查看小勇士成长中心"
          >
            <Avatar className="size-6 border-2 border-amber-400">
              <AvatarImage src={user.avatarUrl} />
            </Avatar>
            <span className="hidden sm:inline text-xs font-black text-amber-900 dark:text-amber-200 max-w-[90px] truncate">
              {user.name || (user.isGuest ? "小探险家" : "阳光学员")}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
};
