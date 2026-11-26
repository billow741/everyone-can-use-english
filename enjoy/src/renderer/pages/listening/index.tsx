import { useIsDesktop } from "@renderer/hooks";
import { DesktopBookshelf } from "@renderer/components";
// 阳光桥少儿英语 · 听故事与环球漫游入口页 (/listening)
// 书架首页按书组织（7 本大卡），点进 /listening/:book 查看整本书章节与级别筛选

import React, { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Headphones,
  Compass,
  Loader2,
  AlertCircle,
  Search,
  Play,
} from "lucide-react";
import { loadCatalog } from "@renderer/lib/listening-sync";
import {
  getBookListeningTimes,
  getRecentListening,
  RecentListeningItem,
} from "@renderer/lib/desktop-data";
import type { BookMeta, CatalogEntry } from "./types";
import {
  ListeningShelfSection,
  STORY_EXCLUDED_BOOKS,
  StoryBookCard,
  buildStoryBookSummaries,
  filterBookSummariesBySearch,
  formatChapterLabel,
  formatMmSs,
  getStoryCoverUrl,
  readListeningProgressMaps,
  resolveBookTitleZh,
} from "./shelf-section";

export default function ListeningIndex() {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return <DesktopBookshelf />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"stories" | "world">(() =>
    tabParam === "world" ? "world" : "stories"
  );

  const [books, setBooks] = useState<BookMeta[]>([]);
  const [chapters, setChapters] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const recentListening = useMemo<RecentListeningItem | null>(() => {
    return getRecentListening();
  }, []);

  const bookTimes = useMemo<Record<string, number>>(() => {
    return getBookListeningTimes();
  }, []);

  const bookTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of books) {
      if (b.title_zh?.trim()) {
        map[b.book] = b.title_zh.trim();
      }
    }
    return map;
  }, [books]);

  const recentCover = useMemo(() => {
    if (!recentListening) return undefined;
    for (const b of books) {
      if (b.book !== recentListening.book) continue;
      const ch = b.chapters.find((c) => c.chapter === recentListening.chapter);
      if (ch?.cover) return ch.cover;
    }
    return chapters.find(
      (c) => c.book === recentListening.book && c.chapter === recentListening.chapter
    )?.cover;
  }, [books, chapters, recentListening]);

  const recentBookTitle = useMemo(() => {
    if (!recentListening) return "";
    return resolveBookTitleZh(recentListening.book, undefined, bookTitleMap);
  }, [recentListening, bookTitleMap]);

  useEffect(() => {
    if (tabParam === "world" && activeTab !== "world") {
      setActiveTab("world");
    } else if (tabParam === "stories" && activeTab !== "stories") {
      setActiveTab("stories");
    }
  }, [tabParam]);

  useEffect(() => {
    loadCatalog().then((cat) => {
      if (!cat || !cat.books || cat.books.length === 0) {
        setError("暂时无法加载书目，请检查网络连接后重试。");
      } else {
        setBooks(cat.books);
        setChapters(cat.chapters || []);
      }
      setLoading(false);
    });
  }, []);

  const handleTabChange = (tab: "stories" | "world") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const progressMaps = useMemo(() => readListeningProgressMaps(), [books.length, chapters.length]);

  const allStorySummaries = useMemo(
    () =>
      buildStoryBookSummaries(
        books.filter((b) => !STORY_EXCLUDED_BOOKS.has(b.book)),
        chapters.filter((ch) => !STORY_EXCLUDED_BOOKS.has(ch.book)),
        progressMaps,
        recentListening,
        bookTimes
      ),
    [books, chapters, progressMaps, recentListening, bookTimes]
  );

  const filteredStoryBooks = useMemo(
    () => filterBookSummariesBySearch(allStorySummaries, searchTerm),
    [allStorySummaries, searchTerm]
  );

  const totalStoryChapters = useMemo(
    () => allStorySummaries.reduce((sum, b) => sum + b.totalChapters, 0),
    [allStorySummaries]
  );

  // 环球漫游（book === "world"，79 站）
  const worldBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = books.filter((b) => b.book === "world");
    if (!term) return list;
    return list
      .map((b) => {
        const bookMatches =
          b.title_en.toLowerCase().includes(term) ||
          (b.title_zh && b.title_zh.toLowerCase().includes(term));
        const matchedChapters = bookMatches
          ? b.chapters
          : b.chapters.filter(
              (c) =>
                c.title_en.toLowerCase().includes(term) ||
                (c.title_zh && c.title_zh.toLowerCase().includes(term)) ||
                c.level.toLowerCase().includes(term)
            );
        return { ...b, chapters: matchedChapters };
      })
      .filter((b) => b.chapters.length > 0);
  }, [books, searchTerm]);

  const worldLevels: Array<{ id: string; label: string; desc: string }> = [
    { id: "a2", label: "A2 进阶漫游", desc: "英美名胜风光、城市地标与日常生活漫游" },
    { id: "b1", label: "B1 高级漫游", desc: "历史古迹、传奇人物与深度人文百科" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sun-orange" />
        <p className="text-muted-foreground text-sm">正在加载书目与漫游站点…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-3 pb-16 space-y-3.5 sm:py-5 sm:space-y-5">
      {/* 顶栏搜索框 */}
      <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-full bg-white dark:bg-slate-900 border border-[#D3E4DE] dark:border-slate-700 text-[#4E6B69]">
        <Search className="size-4 text-[#4E6B69] shrink-0" aria-hidden="true" />
        <input
          type="text"
          aria-label="搜索故事书名、篇名或级别"
          placeholder="搜索书名、故事或级别…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-base sm:text-sm text-[#123B3C] dark:text-foreground placeholder:text-[#4E6B69]/70"
        />
      </div>

      {/* 移动横幅压缩（同 B 单口径）：标题行 ≤64px，去掉冗余描述与 eyebrow */}
      <div
        className="rounded-2xl bg-warm-paper border border-sand-border px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-slate-900"
        data-testid="listening-mobile-banner"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center min-h-0">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-[#123B3C] dark:text-foreground leading-snug">
              {activeTab === "stories" ? "听故事 · 原声伴读" : "环球漫游 · 79 站探索"}
            </h1>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-sand-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleTabChange("stories")}
              data-testid="tab-listening-stories"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "stories"
                  ? "bg-[#0F7B7A] text-white"
                  : "text-[#4E6B69] hover:text-[#123B3C] hover:bg-[#E7F2EF]"
              }`}
            >
              <Headphones className="size-3.5" aria-hidden="true" />
              <span>听故事 ({totalStoryChapters} 章)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("world")}
              data-testid="tab-listening-world"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "world"
                  ? "bg-[#0F7B7A] text-white"
                  : "text-[#4E6B69] hover:text-[#123B3C] hover:bg-[#E7F2EF]"
              }`}
            >
              <Compass className="size-3.5" aria-hidden="true" />
              <span>环球漫游 (79 站)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 「最近收听」无记录时不渲染；有记录时做成整卡可点的「继续听《书名》第 N 章」 */}
      {recentListening && (
        <Link
          to={`/listening/${recentListening.book}/${recentListening.chapter}`}
          data-testid="recent-listening-card"
          className="group rounded-2xl bg-white dark:bg-slate-900 border border-[#D3E4DE] dark:border-slate-700 hover:border-[#0F7B7A] p-3.5 sm:p-4 flex items-center gap-3.5 transition-colors"
        >
          <div
            className="w-16 h-12 sm:w-24 sm:h-16 shrink-0 rounded-xl bg-cover bg-center border border-[#D3E4DE]/60"
            style={{
              backgroundImage: `url(${getStoryCoverUrl(recentListening.book, recentCover)})`,
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold tracking-wide text-[#0F7B7A]">
              最近收听
            </div>
            <h2 className="mt-0.5 text-sm sm:text-base font-bold text-[#123B3C] dark:text-foreground truncate group-hover:text-[#0F7B7A] transition-colors">
              继续听《{recentBookTitle}》{formatChapterLabel(recentListening.chapter)}
            </h2>
            <div className="mt-0.5 text-[11.5px] text-[#4E6B69] dark:text-muted-foreground truncate">
              {recentListening.title} · {formatMmSs(recentListening.currentTime)} /{" "}
              {formatMmSs(recentListening.duration)} · {recentListening.progressPercent}%
            </div>
            <div className="h-1.5 mt-1.5 rounded-full bg-[#E7F2EF] dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0F7B7A]"
                style={{ width: `${recentListening.progressPercent}%` }}
              />
            </div>
          </div>
          <span className="h-9 px-3 sm:px-4 rounded-xl bg-[#F2A93B] group-hover:bg-[#D69128] text-[#123B3C] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors">
            <Play className="size-3.5 fill-[#123B3C]" aria-hidden="true" />
            <span className="hidden sm:inline">继续收听</span>
          </span>
        </Link>
      )}

      {/* A. 听故事视图：7 本书卡片纵向排列 */}
      {activeTab === "stories" && (
        <div className="space-y-3.5" data-testid="listening-stories-container">
          <div className="px-0.5 border-b border-sand-border pb-2 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm sm:text-base font-black text-[#123B3C] dark:text-foreground shrink-0">
                听故事书架（{allStorySummaries.length} 本）
              </h2>
              <span className="text-xs text-[#4E6B69] dark:text-muted-foreground truncate">
                共 {totalStoryChapters} 章 · 逐句对照伴读
              </span>
            </div>
            <p
              className="text-xs text-[#4E6B69] dark:text-muted-foreground"
              data-testid="bookshelf-parent-note"
            >
              按书收听，级别标签 A1–B1 供选书参考
            </p>
          </div>

          {filteredStoryBooks.length > 0 ? (
            <div
              className="flex flex-col gap-3"
              data-testid="mobile-books-list"
            >
              {filteredStoryBooks.map((summary) => (
                <StoryBookCard
                  key={summary.book}
                  summary={summary}
                  layout="mobile"
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              {searchTerm.trim() ? (
                <div className="space-y-2">
                  <Headphones className="size-8 text-[#4E6B69] mx-auto" aria-hidden="true" />
                  <p className="text-sm font-bold text-[#4E6B69]">
                    未找到与 “{searchTerm}” 相关的故事书
                  </p>
                </div>
              ) : (
                "暂无故事数据"
              )}
            </div>
          )}
        </div>
      )}

      {/* B. 环球漫游独立分组：A2 (34 站) / B1 (45 站，无 A1) */}
      {activeTab === "world" && (
        <div className="space-y-6" data-testid="listening-world-container">
          <div className="flex items-baseline justify-between gap-2 px-0.5 border-b border-sand-border pb-2">
            <h2 className="text-sm sm:text-base font-black text-[#123B3C] dark:text-foreground shrink-0">
              环球漫游独立分组
            </h2>
            <p className="text-xs text-[#4E6B69] dark:text-muted-foreground truncate">
              英美名胜风光与人文百科 · A2 34 站 · B1 45 站
            </p>
          </div>

          {worldLevels.map(({ id, label, desc }) => (
            <ListeningShelfSection
              key={id}
              level={id}
              label={label}
              desc={desc}
              books={worldBooks}
              unitLabel="站"
            />
          ))}

          {worldBooks.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              {searchTerm.trim() ? (
                <div className="space-y-2">
                  <Headphones className="size-8 text-[#4E6B69] mx-auto" aria-hidden="true" />
                  <p className="text-sm font-bold text-[#4E6B69]">
                    未找到与 “{searchTerm}” 相关的漫游站点
                  </p>
                </div>
              ) : (
                "暂无漫游数据"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
