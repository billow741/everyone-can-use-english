import React, { useState, useEffect, useContext, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  MoonIcon,
  SunIcon,
  SparklesIcon,
  AwardIcon,
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
    const unsub = subscribePhonemeMastery((state) => {
      if (state?.masteryMap) {
        setMasteryMap(state.masteryMap);
      }
    });
    return () => unsub();
  }, []);

  const masteredCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => !!masteryMap[p.slug]).length;
  }, [masteryMap]);

  // 领域与页面少儿化面包屑定位
  const currentDomainInfo = useMemo(() => {
    if (pathname === "/") {
      return { domain: "🎯 学习主场", page: "学习主场", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/courses")) {
      return { domain: "🎯 学习主场", page: "牛津阶梯体系课", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/phonics")) {
      return { domain: "🧩 拼读基石", page: "7阶自然拼读阶梯", color: "text-amber-500" };
    }
    if (pathname.startsWith("/families")) {
      return { domain: "🧩 拼读基石", page: "词族乐园", color: "text-amber-500" };
    }
    if (pathname.startsWith("/phonemes")) {
      return { domain: "🧩 拼读基石", page: "39 音素卡", color: "text-amber-500" };
    }
    if (pathname.startsWith("/pronunciation_assessments")) {
      return { domain: "🧩 拼读基石", page: "AI 发音纠错", color: "text-orange-500" };
    }
    if (pathname.startsWith("/stories")) {
      return { domain: "📖 沉浸语境", page: "牛津精选绘本馆", color: "text-purple-500" };
    }
    if (pathname.startsWith("/theater") || pathname.startsWith("/world")) {
      return { domain: "📖 沉浸语境", page: "环球漫游", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/dialogues")) {
      return { domain: "📖 沉浸语境", page: "情景对话课", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/conversations")) {
      return { domain: "📖 沉浸语境", page: "敢敢 AI 随身外教", color: "text-emerald-500" };
    }
    if (pathname.startsWith("/vocabulary")) {
      return { domain: "🎒 我的背包", page: "生词库", color: "text-rose-500" };
    }
    if (pathname.startsWith("/profile")) {
      return { domain: "🎒 我的背包", page: "我的成就", color: "text-blue-500" };
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
    <header className="sticky top-0 z-30 w-full min-h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b-2 border-amber-200/60 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2 transition-all select-none shadow-xs">
      {/* 左侧：品牌徽标 + 当前探索域 */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Link to="/" className="flex items-center gap-2 group min-w-0 max-w-full sm:shrink-0">
          <img
            src="/assets/logo-horizontal-teal.png"
            alt="SunnyBridge"
            className="h-5 sm:h-7 w-auto max-w-full object-contain object-left group-hover:scale-105 transition-transform"
          />
        </Link>

        <span className="text-amber-300 dark:text-slate-700 font-bold hidden sm:inline">|</span>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold min-w-0">
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/30 text-[11px] shadow-2xs shrink-0">
            {currentDomainInfo.domain}
          </span>
          <span className="text-muted-foreground/40 font-mono">/</span>
          <span className={`tracking-tight font-black text-xs truncate ${currentDomainInfo.color}`}>
            {currentDomainInfo.page}
          </span>
        </div>
      </div>

      {/* 中间：少儿成就徽章岛 (只展示真实可计算的 39 拼读通关进度) */}
      <div className="hidden lg:flex items-center gap-2.5">
        {/* 39拼读通关星 */}
        <Link
          to="/phonemes"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-800 dark:text-amber-200 text-xs font-black shadow-2xs transition-transform active:scale-95"
          title="点击查看 39 音素卡"
        >
          <AwardIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
          <span>已掌握 {masteredCount}/39</span>
        </Link>
      </div>

      {/* 右侧：护眼模式 + 外教试听 + 学员名牌 */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* 护眼模式切换按钮 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleTheme}
          className="size-9 p-0 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-amber-200/60 dark:border-slate-700 text-slate-700 dark:text-amber-300 cursor-pointer shadow-2xs transition-transform active:scale-90 shrink-0"
          title={`切换为${theme === "dark" ? "明亮模式" : "护眼暗色模式"}`}
          aria-label={`切换为${theme === "dark" ? "明亮模式" : "护眼暗色模式"}`}
        >
          {theme === "dark" ? (
            <SunIcon className="size-4 text-amber-400" aria-hidden="true" />
          ) : (
            <MoonIcon className="size-4 text-slate-700" aria-hidden="true" />
          )}
        </Button>

        {/* 预约欧美外教 CTA */}
        <button
          onClick={handleOpenConsultation}
          className="inline-flex items-center gap-1.5 min-h-8 h-auto py-1 px-2.5 sm:px-3.5 text-xs font-black whitespace-nowrap shrink-0 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-slate-950 shadow-xs border border-amber-300/80 transition-all hover:scale-102 active:scale-95 cursor-pointer"
        >
          <SparklesIcon className="size-3.5 fill-slate-950/20 shrink-0" />
          <span>预约外教试听</span>
        </button>

        {/* 学员萌趣名牌 */}
        {user && (
          <Link
            to="/profile"
            aria-label="个人中心"
            className="flex items-center gap-1.5 pl-1 pr-1 sm:pl-1.5 sm:pr-2.5 py-1 rounded-2xl bg-amber-50/80 hover:bg-amber-100/80 dark:bg-slate-800 border border-amber-300/40 dark:border-slate-700 transition-all shadow-2xs shrink-0"
            title="查看小勇士成长中心"
          >
            <Avatar className="size-6 border-2 border-amber-400">
              <AvatarImage src={user.avatarUrl} alt="" />
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
