import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Play, Headphones } from "lucide-react";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import {
  getBookListeningTimes,
  getRecentListening,
  RecentListeningItem,
} from "@renderer/lib/desktop-data";
import { loadCatalog } from "@renderer/lib/listening-sync";
import type { BookMeta, CatalogEntry } from "@renderer/pages/listening/types";
import { useCardStagger } from "@renderer/lib/motion";
import {
  STORY_EXCLUDED_BOOKS,
  StoryBookCard,
  buildStoryBookSummaries,
  filterBookSummariesBySearch,
  formatChapterLabel,
  formatMmSs,
  getStoryCoverUrl,
  readListeningProgressMaps,
  resolveBookTitleZh,
} from "@renderer/pages/listening/shelf-section";

export const DesktopBookshelf: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [chapters, setChapters] = useState<CatalogEntry[]>([]);
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const shelfStackRef = useRef<HTMLDivElement>(null);

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
    return chapters.find(
      (c) => c.book === recentListening.book && c.chapter === recentListening.chapter
    )?.cover;
  }, [chapters, recentListening]);

  const recentBookTitle = useMemo(() => {
    if (!recentListening) return "";
    return resolveBookTitleZh(recentListening.book, undefined, bookTitleMap);
  }, [recentListening, bookTitleMap]);

  useEffect(() => {
    loadCatalog().then((cat) => {
      if (cat?.books) {
        setBooks(cat.books.filter((b) => !STORY_EXCLUDED_BOOKS.has(b.book)));
      }
      if (cat?.chapters) {
        setChapters(cat.chapters.filter((ch) => !STORY_EXCLUDED_BOOKS.has(ch.book)));
      }
      setLoading(false);
    });
  }, []);

  const progressMaps = useMemo(() => readListeningProgressMaps(), [chapters.length, books.length]);

  const allBookSummaries = useMemo(
    () => buildStoryBookSummaries(books, chapters, progressMaps, recentListening, bookTimes),
    [books, chapters, progressMaps, recentListening, bookTimes]
  );

  const filteredBooks = useMemo(
    () => filterBookSummariesBySearch(allBookSummaries, searchTerm),
    [allBookSummaries, searchTerm]
  );

  const totalChaptersCount = useMemo(
    () => allBookSummaries.reduce((sum, b) => sum + b.totalChapters, 0),
    [allBookSummaries]
  );

  useCardStagger(shelfStackRef, ".sb-book-card", [loading, allBookSummaries.length]);

  return (
    <div className="desktop-shell">
      <DesktopSidebar activeTab="listening" />

      <main className="sb-main">
        {/* 顶栏 */}
        <div className="sb-topbar">
          <div className="sb-search">
            <Search className="size-4.5 text-warm-muted shrink-0" aria-hidden="true" />
            <input
              type="text"
              aria-label="搜索故事书名、篇名或级别"
              placeholder="搜索书名、故事或级别…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sb-topbar right">
            <div className="sb-avatar-mini">
              <img src="/assets/gangan/gangan_avatar240.png" alt="敢敢" />
            </div>
          </div>
        </div>

        {/* 堆叠内容 */}
        <div ref={shelfStackRef} className="sb-stack">
          {/* 最近收听——无记录时不渲染；有记录时整卡可点，显示「继续听《书名》第 N 章」 */}
          {recentListening && (
            <Link
              to={`/listening/${recentListening.book}/${recentListening.chapter}`}
              className="sb-card sb-recent"
              data-testid="recent-listening-card"
            >
              <div
                className="thumb"
                style={{
                  backgroundImage: `url(${getStoryCoverUrl(recentListening.book, recentCover)})`,
                }}
              />
              <div className="body">
                <div className="sb-eyebrow text-sun-orange">最近收听</div>
                <h2>
                  继续听《{recentBookTitle}》{formatChapterLabel(recentListening.chapter)}
                </h2>
                <div className="sub">
                  {recentListening.title} · {recentListening.sentenceCount} 句 ·{" "}
                  {formatMmSs(recentListening.duration)}
                </div>
                <div className="sb-progress-row">
                  <span>
                    进度 {formatMmSs(recentListening.currentTime)} /{" "}
                    {formatMmSs(recentListening.duration)}
                  </span>
                  <b>{recentListening.progressPercent}%</b>
                </div>
                <div className="sb-bar">
                  <i style={{ width: `${recentListening.progressPercent}%` }} />
                </div>
              </div>
              <span className="sb-btn-continue">
                <span>继续收听</span>
                <Play className="size-4 fill-[#123B3C]" aria-hidden="true" />
              </span>
            </Link>
          )}

          {/* 按书组织的书架首页 */}
          {loading ? (
            <div className="py-12 text-center text-sm text-warm-muted">
              故事书目加载中…
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="sb-card p-12 text-center">
              <Headphones className="size-10 text-warm-muted mx-auto mb-3" />
              <p className="text-base font-bold text-warm-muted">
                未找到与 “{searchTerm}” 相关的故事书
              </p>
            </div>
          ) : (
            <section data-testid="desktop-books-section">
              <div className="sb-group-head">
                <h1>听故事书架</h1>
                <span>
                  共 {allBookSummaries.length} 本原版有声书 · {totalChaptersCount} 章
                </span>
              </div>
              <p
                className="mt-1 text-xs text-[#4E6B69]"
                data-testid="bookshelf-parent-note"
              >
                按书收听，级别标签 A1–B1 供选书参考
              </p>

              <div className="sb-book-grid" data-testid="desktop-books-grid">
                {filteredBooks.map((summary) => (
                  <StoryBookCard
                    key={summary.book}
                    summary={summary}
                    layout="desktop"
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
