import React, { useState, useEffect, useContext, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  SearchIcon,
  MoonIcon,
  SunIcon,
  SparklesIcon,
  XIcon,
  BookOpenIcon,
  ClapperboardIcon,
  GlobeIcon,
  BotIcon,
  ArrowRightIcon,
  MicIcon,
  HomeIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Badge,
  Avatar,
  AvatarImage,
} from "@renderer/components/ui";
import { AppSettingsProviderContext } from "@renderer/context";
import { ThemeProviderContext } from "@renderer/context/theme-provider";
import { ALL_39_PHONEMES } from "@renderer/lib/phoneme-data";

export const PlatformHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const { user } = useContext(AppSettingsProviderContext);
  const { theme, setTheme } = useContext(ThemeProviderContext);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 快捷键 Cmd/Ctrl + K 唤醒全局搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 领域与页面面包屑映射
  const currentDomainInfo = useMemo(() => {
    if (pathname === "/") {
      return { domain: "🎯 学习主场", page: "今日主控台", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/courses")) {
      return { domain: "🎯 学习主场", page: "分级体系课", color: "text-amber-600 dark:text-amber-400" };
    }
    if (pathname.startsWith("/phonemes")) {
      return { domain: "🧩 拼读基石", page: "39 音标工坊", color: "text-amber-500" };
    }
    if (pathname.startsWith("/pronunciation_assessments")) {
      return { domain: "🧩 拼读基石", page: "语音精准纠音", color: "text-orange-500" };
    }
    if (pathname.startsWith("/stories")) {
      return { domain: "📖 沉浸语境", page: "牛津精选绘本", color: "text-purple-500" };
    }
    if (pathname.startsWith("/theater")) {
      return { domain: "📖 沉浸语境", page: "敢敢情景微剧场", color: "text-orange-500" };
    }
    if (pathname.startsWith("/world")) {
      return { domain: "📖 沉浸语境", page: "环球文化漫游", color: "text-indigo-500" };
    }
    if (pathname.startsWith("/conversations")) {
      return { domain: "📖 沉浸语境", page: "敢敢 AI 陪练舱", color: "text-emerald-500" };
    }
    if (pathname.startsWith("/vocabulary")) {
      return { domain: "🎒 我的成长", page: "智能拼读生词本", color: "text-rose-500" };
    }
    if (pathname.startsWith("/profile")) {
      return { domain: "🎒 我的成长", page: "学情成长中心", color: "text-blue-500" };
    }
    return { domain: "🌟 阳光桥少儿英语", page: "智能伴学", color: "text-amber-500" };
  }, [pathname]);

  // 全站资源索引搜索结果过滤
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: {
      category: string;
      title: string;
      subtitle: string;
      link: string;
      icon: any;
      badge?: string;
    }[] = [];

    // 1. 音标资源
    ALL_39_PHONEMES.forEach((p) => {
      if (
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.sampleWord.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      ) {
        results.push({
          category: "39 音标工坊",
          title: `[${p.id}] ${p.name}`,
          subtitle: `例词: ${p.sampleWord} · 口诀: ${p.steps[0]}`,
          link: `/phonemes/${p.slug}`,
          icon: SparklesIcon,
          badge: p.category,
        });
      }
    });

    // 2. 牛津经典绘本
    const oxfordBooks = [
      { id: "1", title: "The Magic Key (魔法钥匙)", level: "Level 1" },
      { id: "2", title: "Little Bear's Adventure (小熊探险)", level: "Level 2" },
      { id: "3", title: "The Friendly Dragon (善良喷火龙)", level: "Level 3" },
      { id: "4", title: "Roderick the Red (海盗船长)", level: "Level 2" },
      { id: "5", title: "Floppy Did That! (小狗闯祸了)", level: "Level 1" },
      { id: "6", title: "The Lost Teddy (丢失的玩具熊)", level: "Level 1" },
    ];
    oxfordBooks.forEach((b) => {
      if (b.title.toLowerCase().includes(q) || b.level.toLowerCase().includes(q)) {
        results.push({
          category: "牛津精选绘本",
          title: b.title,
          subtitle: `原版 ORT 分级点读 · ${b.level}`,
          link: `/stories`,
          icon: BookOpenIcon,
          badge: b.level,
        });
      }
    });

    // 3. 互动板块
    if ("情景剧场 theater 飙戏 配音 短剧".toLowerCase().includes(q)) {
      results.push({
        category: "沉浸语境",
        title: "敢敢情景微剧场",
        subtitle: "10 部生活实景生活短剧，角色扮演同台飙戏",
        link: "/theater",
        icon: ClapperboardIcon,
        badge: "实景短剧",
      });
    }
    if ("环球漫游 名胜 护照 world 旅行".toLowerCase().includes(q)) {
      results.push({
        category: "沉浸语境",
        title: "敢敢环球奇遇记",
        subtitle: "79 站名胜人文漫游，收集专属护照邮戳",
        link: "/world",
        icon: GlobeIcon,
        badge: "79站漫游",
      });
    }
    if ("ai 陪练 对话 外教 口语 conversation".toLowerCase().includes(q)) {
      results.push({
        category: "沉浸语境",
        title: "敢敢 AI 陪练舱",
        subtitle: "双语智能外教 24 小时随身对话纠错",
        link: "/conversations",
        icon: BotIcon,
        badge: "双语外教",
      });
    }

    return results.slice(0, 8);
  }, [searchQuery]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSelectResult = (link: string) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    navigate(link);
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full h-14 bg-background/80 backdrop-blur-md border-b border-border/70 px-4 lg:px-8 flex items-center justify-between transition-all select-none">
        {/* 左侧：当前核心领域面包屑定位 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 text-[11px]">
              {currentDomainInfo.domain}
            </span>
            <span className="text-muted-foreground/40 font-mono">/</span>
            <span className={`tracking-tight ${currentDomainInfo.color}`}>
              {currentDomainInfo.page}
            </span>
          </div>
        </div>

        {/* 中间：全站极速检索入口 (Omnisearch Trigger) */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex items-center justify-between w-64 md:w-80 h-8 px-3 rounded-xl bg-muted/60 hover:bg-muted border border-border/80 text-xs text-muted-foreground transition-all cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-2 truncate">
            <SearchIcon className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            <span className="truncate">快速搜索绘本、音标、短剧...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-background rounded-md border border-border text-muted-foreground shrink-0">
            <span>Ctrl</span>
            <span>K</span>
          </kbd>
        </button>

        {/* 右侧：主题切换 + 预约咨询 + 学员状态 */}
        <div className="flex items-center gap-2.5">
          {/* 移动端搜索图标按钮 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <SearchIcon className="size-4" />
          </Button>

          {/* 明暗主题切换 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleTheme}
            className="size-8 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            title={`切换为${theme === "dark" ? "明亮模式" : "暗色护眼模式"}`}
          >
            {theme === "dark" ? (
              <SunIcon className="size-4 text-amber-400 animate-spin-slow" />
            ) : (
              <MoonIcon className="size-4 text-slate-700" />
            )}
          </Button>

          {/* 预约试听快捷 CTA */}
          <a
            href="https://www.sunnybridge.qzz.io/apply.html"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1 h-7 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-2xs transition-transform active:scale-95 cursor-pointer"
          >
            <SparklesIcon className="size-3" />
            <span>外教试听</span>
          </a>

          {/* 用户快捷头像 */}
          {user && (
            <Link
              to="/profile"
              className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-xl hover:bg-muted/80 transition-colors"
              title="查看学情档案"
            >
              <Avatar className="size-6 border border-border">
                <AvatarImage src={user.avatarUrl} />
              </Avatar>
              <span className="hidden lg:inline text-xs font-semibold text-foreground max-w-[80px] truncate">
                {user.name || (user.isGuest ? "小探险家" : "学员")}
              </span>
            </Link>
          )}
        </div>
      </header>

      {/* 全站全局搜索弹窗 (Omnisearch Modal) */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
          <DialogTitle className="sr-only">全站极速全局搜索</DialogTitle>
          <div className="p-4 border-b border-border flex items-center gap-3">
            <SearchIcon className="size-5 text-amber-500 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索音标符号 (如 /θ/)、自然拼读词、牛津绘本、微剧场..."
              className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="size-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {!searchQuery.trim() ? (
              <div className="p-6 text-center space-y-2">
                <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto text-xl">
                  💡
                </div>
                <div className="text-sm font-bold text-foreground">快速探索全站学习资源</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  输入音标（如 <code>th</code>, <code>dr</code>, <code>p</code>）、绘本故事或功能模块即可直达！
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  {["咬舌音 θ", "双元音 eɪ", "The Magic Key", "情景微剧场", "AI 陪练"].map((term) => (
                    <button
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                未找到与 &ldquo;{searchQuery}&rdquo; 匹配的学习资源，换个关键词试试吧
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((res, i) => {
                  const Icon = res.icon;
                  return (
                    <div
                      key={i}
                      onClick={() => handleSelectResult(res.link)}
                      className="p-3 rounded-2xl hover:bg-muted/80 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="size-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="size-4" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground group-hover:text-amber-600 transition-colors truncate">
                              {res.title}
                            </span>
                            {res.badge && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                {res.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {res.subtitle}
                          </div>
                        </div>
                      </div>
                      <ArrowRightIcon className="size-4 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
