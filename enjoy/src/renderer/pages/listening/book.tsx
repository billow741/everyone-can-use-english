// /listening/:book — 单本书章节列表页（桌面与移动共口径）
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { loadCatalog } from "@renderer/lib/listening-sync";
import { getRecentListening, RecentListeningItem } from "@renderer/lib/desktop-data";
import { useIsDesktop } from "@renderer/hooks";
import { DesktopFooter } from "@renderer/components/desktop/desktop-footer";
import { useCardStagger } from "@renderer/lib/motion";
import type { BookMeta } from "./types";
import {
  LEVEL_DOT_CLASS,
  LevelFilterChips,
  ListeningChapterCard,
  compareChaptersByNumber,
  getBookCoverUrl,
  getBookLevels,
  getChapterListenState,
  getStoryCoverUrl,
  readListeningProgressMaps,
  resolveBookTitleZh,
} from "./shelf-section";

export default function ListeningBook() {
  const { book } = useParams<{ book: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedLevel("all");
  }, [book]);

  useEffect(() => {
    if (!book) return;
    setLoading(true);
    setError(null);
    loadCatalog().then((cat) => {
      if (!cat) {
        setError("无法加载书目，请检查网络连接后重试。");
      } else {
        const found = cat.books.find((b) => b.book === book);
        if (found) {
          setBookMeta(found);
        } else {
          const fallbackChapters = (cat.chapters || []).filter((c) => c.book === book);
          if (fallbackChapters.length > 0) {
            setBookMeta({
              book,
              title_zh: resolveBookTitleZh(book, fallbackChapters[0].title_zh),
              title_en: fallbackChapters[0].title_en || book,
              chapters: fallbackChapters,
            });
          } else {
            setError(`未找到书目：${book}`);
          }
        }
      }
      setLoading(false);
    });
  }, [book]);

  const sortedChapters = useMemo(() => {
    if (!bookMeta?.chapters) return [];
    return [...bookMeta.chapters].sort(compareChaptersByNumber);
  }, [bookMeta]);

  const bookLevels = useMemo(() => getBookLevels(sortedChapters), [sortedChapters]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ch of sortedChapters) {
      const key = String(ch.level || "").trim().toLowerCase();
      if (key) counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [sortedChapters]);

  const effectiveSelectedLevel = useMemo(() => {
    if (selectedLevel === "all") return "all";
    return bookLevels.some((lv) => lv.toLowerCase() === selectedLevel) ? selectedLevel : "all";
  }, [selectedLevel, bookLevels]);

  const visibleChapters = useMemo(() => {
    if (effectiveSelectedLevel === "all") return sortedChapters;
    return sortedChapters.filter(
      (ch) => String(ch.level || "").trim().toLowerCase() === effectiveSelectedLevel
    );
  }, [sortedChapters, effectiveSelectedLevel]);

  const progressMaps = useMemo(
    () => readListeningProgressMaps(),
    [bookMeta?.book, sortedChapters.length]
  );

  const recentListening = useMemo<RecentListeningItem | null>(
    () => getRecentListening(),
    [bookMeta?.book]
  );

  useCardStagger(
    listRef,
    "a[data-testid^='listening-chapter-']",
    [loading, bookMeta?.book, sortedChapters.length]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F7B7A]" />
        <span className="text-muted-foreground text-sm">加载中…</span>
      </div>
    );
  }

  if (error || !bookMeta) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-destructive">
        <AlertCircle className="w-7 h-7" />
        <p className="text-sm">{error ?? "未知错误"}</p>
        <button
          type="button"
          className="text-sm text-[#0F7B7A] font-semibold underline cursor-pointer"
          onClick={() => navigate("/listening")}
        >
          返回书架
        </button>
      </div>
    );
  }

  const titleZh = resolveBookTitleZh(bookMeta.book, bookMeta.title_zh);
  const titleEn = bookMeta.title_en?.trim() || titleZh;
  const coverUrl = getBookCoverUrl(bookMeta.book, sortedChapters, bookMeta.cover_url);
  const totalCount = sortedChapters.length;
  const finishedCount = sortedChapters.filter(
    (ch) => progressMaps.finished[bookMeta.book]?.[ch.chapter] === true
  ).length;
  const hasBookProgress =
    finishedCount > 0 ||
    recentListening?.book === bookMeta.book ||
    Object.keys(progressMaps.finished[bookMeta.book] || {}).length > 0;
  const progressPct =
    totalCount > 0 ? Math.min(100, Math.round((finishedCount / totalCount) * 100)) : 0;

  return (
    <div className="max-w-4xl min-[1280px]:max-w-none mx-auto px-4 pt-3 pb-20 min-[1280px]:px-0 min-[1280px]:pt-0 min-[1280px]:pb-4 space-y-4 min-[1280px]:space-y-5">
      {/* 顶栏面包屑 */}
      <nav
        aria-label="面包屑导航"
        className="flex items-center gap-2 text-sm text-[#4E6B69] dark:text-muted-foreground"
      >
        <Link
          to="/listening"
          data-testid="back-to-bookshelf"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-[#D3E4DE] dark:border-slate-700 text-[#123B3C] dark:text-foreground font-semibold hover:border-[#0F7B7A] hover:text-[#0F7B7A] transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>书架</span>
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#123B3C] dark:text-foreground font-bold truncate">
          {titleZh}
        </span>
      </nav>

      {/* 书头信息卡 */}
      <section
        className="rounded-2xl min-[1280px]:rounded-[20px] bg-white dark:bg-slate-900 border border-[#D3E4DE] dark:border-slate-800 p-4 sm:p-5 flex gap-4 sm:gap-5 items-start"
        data-testid="book-detail-header"
      >
        <div className="w-24 sm:w-32 min-[1280px]:w-40 shrink-0 aspect-[4/3] rounded-xl overflow-hidden bg-[#E7F2EF]">
          <img
            src={coverUrl}
            alt=""
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied) return;
              img.dataset.fallbackApplied = "1";
              img.src = getStoryCoverUrl(bookMeta.book);
            }}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <h1 className="text-lg sm:text-2xl font-extrabold text-[#123B3C] dark:text-foreground leading-snug">
            {titleZh}
          </h1>
          <p className="font-serif text-xs sm:text-sm text-[#4E6B69] dark:text-muted-foreground">
            {titleEn}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs sm:text-sm text-[#4E6B69] dark:text-muted-foreground">
            <span className="font-bold text-[#123B3C] dark:text-foreground">
              共 {totalCount} 章
            </span>
            {bookLevels.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                {bookLevels.map((lv) => (
                  <span
                    key={lv}
                    className={`size-1.5 rounded-full shrink-0 ${LEVEL_DOT_CLASS[lv.toLowerCase()] ?? "bg-[#4E6B69]"}`}
                    aria-hidden="true"
                  />
                ))}
                <span className="font-semibold">{bookLevels.join("·")}</span>
              </span>
            )}
          </div>

          {hasBookProgress && (
            <div className="pt-1.5 max-w-sm">
              <div className="flex items-center justify-between text-xs text-[#4E6B69] dark:text-muted-foreground">
                <span>
                  已听完 {finishedCount}/{totalCount} 章
                </span>
                <span className="font-bold text-[#0F7B7A]">{progressPct}%</span>
              </div>
              <div
                className="h-1.5 mt-1 rounded-full bg-[#E7F2EF] dark:bg-slate-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${titleZh} 已听完 ${finishedCount}/${totalCount} 章`}
              >
                <span
                  className="block h-full rounded-full bg-[#0F7B7A]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 顶部级别筛选 chips（全部 + 仅该书实际有的级别） */}
      <LevelFilterChips
        levels={bookLevels}
        selectedLevel={effectiveSelectedLevel}
        onSelect={setSelectedLevel}
        counts={levelCounts}
        totalCount={totalCount}
      />

      {/* 整本书章节列表（按章号顺序） */}
      <div
        ref={listRef}
        className="grid grid-cols-2 sm:grid-cols-3 min-[1280px]:grid-cols-4 gap-3 sm:gap-4 min-[1280px]:gap-5"
        data-testid="book-chapters-grid"
      >
        {visibleChapters.map((ch) => {
          const state = getChapterListenState(
            ch.book,
            ch.chapter,
            progressMaps,
            recentListening
          );
          return (
            <ListeningChapterCard
              key={`${ch.book}-${ch.chapter}`}
              chapter={ch}
              bookTitleZh={titleZh}
              listenState={state}
            />
          );
        })}
      </div>

      {isDesktop && <DesktopFooter />}
    </div>
  );
}
