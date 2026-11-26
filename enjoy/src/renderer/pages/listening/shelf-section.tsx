// 绘本阅读区 / 听读陈列组件（可复用）
// 含桌面/移动书架与书籍详情页共享的按书汇总、章号排序、级别标签、进度状态与卡片组件
import React, { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, CheckCircle2 } from "lucide-react";
import type { BookMeta, CatalogEntry } from "./types";
import type { RecentListeningItem } from "@renderer/lib/desktop-data";
import {
  getFinishedLocal,
  getFavSentencesLocal,
  getFavWordsLocal,
  isChapterFinished,
} from "@renderer/lib/listening-sync";
import { useCardStagger } from "@renderer/lib/motion";

export const STORY_EXCLUDED_BOOKS = new Set(["world", "fables", "voa"]);

export interface ListeningProgressMaps {
  finished: Record<string, Record<string, boolean>>;
  favSentences: Record<string, Record<string, number[]>>;
  favWords: Record<string, Record<string, string[]>>;
}

export type ChapterListenStatus = "finished" | "in_progress" | "heard" | "unstarted";

export interface ChapterListenState {
  status: ChapterListenStatus;
  progressPercent: number | null;
}

export interface BookListenSummary {
  book: string;
  titleZh: string;
  titleEn: string;
  coverUrl: string;
  chapters: CatalogEntry[];
  totalChapters: number;
  finishedCount: number;
  levels: string[];
  hasRecord: boolean;
  lastListenedAt: number;
}

const PREFERRED_BOOK_ORDER = [
  "wizard_of_oz",
  "story_of_doctor_dolittle_librivox",
  "treasury_beatrixpotter_0910",
  "just_so_stories",
  "winniethepooh_2201_librivox",
  "childs_garden_verses_librivox",
  "velveteenduet_librivox",
];

const BOOK_ZH_FALLBACK: Record<string, string> = {
  treasury_beatrixpotter_0910: "彼得兔合集",
  velveteenduet_librivox: "绒布小兔",
  wizard_of_oz: "绿野仙踪",
  story_of_doctor_dolittle_librivox: "杜立特医生",
  just_so_stories: "原来如此",
  winniethepooh_2201_librivox: "小熊维尼",
  childs_garden_verses_librivox: "儿童诗园",
  world: "环球漫游",
};

const BOOK_EN_FALLBACK: Record<string, string> = {
  treasury_beatrixpotter_0910: "The Great Big Treasury of Beatrix Potter",
  velveteenduet_librivox: "The Velveteen Rabbit",
  wizard_of_oz: "The Wonderful Wizard of Oz",
  story_of_doctor_dolittle_librivox: "The Story of Doctor Dolittle",
  just_so_stories: "Just So Stories",
  winniethepooh_2201_librivox: "Winnie-the-Pooh",
  childs_garden_verses_librivox: "A Child's Garden of Verses",
  world: "Around the World",
};

const CANONICAL_LEVEL_ORDER = ["a1", "a2", "b1", "l1", "l2", "anna"];

export const LEVEL_DOT_CLASS: Record<string, string> = {
  a0: "bg-[#E8930C]",
  a1: "bg-[#4A90D9]",
  a2: "bg-[#3FA46A]",
  b1: "bg-[#7C6BD9]",
  l1: "bg-[#4A90D9]",
  l2: "bg-[#3FA46A]",
  anna: "bg-[#E8930C]",
};

export const LEVEL_LABEL: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  l1: "L1",
  l2: "L2",
  anna: "Anna",
};

export function formatMmSs(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatChapterLabel(chapter: string): string {
  const trimmed = String(chapter || "").trim();
  if (/^\d+$/.test(trimmed)) {
    return `第 ${parseInt(trimmed, 10)} 章`;
  }
  return trimmed;
}

export function getStoryCoverUrl(book: string, cover?: string): string {
  if (cover) return cover;
  if (book === "velveteenduet_librivox") {
    return "/assets/covers/velveteen-cover.jpg";
  }
  return "/assets/covers/treasury-cover.jpg";
}

export function getBookCoverUrl(
  book: string,
  chapters: CatalogEntry[],
  explicitCoverUrl?: string
): string {
  if (explicitCoverUrl?.trim()) return explicitCoverUrl.trim();
  const sorted = [...chapters].sort(compareChaptersByNumber);
  const firstCover = sorted.find((ch) => ch.cover?.trim())?.cover?.trim();
  return getStoryCoverUrl(book, firstCover);
}

export function resolveBookTitleZh(
  book: string,
  chapterTitleZh?: string,
  bookTitleMap?: Record<string, string>
): string {
  const fromMap = bookTitleMap?.[book]?.trim();
  if (fromMap) return fromMap;
  const fromChapter = chapterTitleZh?.trim();
  if (fromChapter) return fromChapter;
  return BOOK_ZH_FALLBACK[book] || book;
}

function parseChapterNumber(chapter: string): number {
  const trimmed = String(chapter || "").trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  const m = trimmed.match(/\d+/);
  return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

export function compareChaptersByNumber(a: CatalogEntry, b: CatalogEntry): number {
  const na = parseChapterNumber(a.chapter);
  const nb = parseChapterNumber(b.chapter);
  if (na !== nb) return na - nb;
  return String(a.chapter).localeCompare(String(b.chapter));
}

export interface BookChapterNavInfo {
  chapterPosition: number | null;
  totalChapters: number;
  nextChapter: CatalogEntry | null;
}

/**
 * 解析当前章节在所属书目中的序号位置（1-based）及按章号排序的下一章
 */
export function resolveBookChapterNav(
  catalog: { books?: BookMeta[]; chapters?: CatalogEntry[] } | null,
  book: string,
  chapter: string
): BookChapterNavInfo {
  if (!catalog || !book || !chapter) {
    return { chapterPosition: null, totalChapters: 0, nextChapter: null };
  }
  const bookObj = catalog.books?.find((b) => b.book === book);
  const rawChapters =
    bookObj?.chapters && bookObj.chapters.length > 0
      ? bookObj.chapters
      : (catalog.chapters || []).filter((c) => c.book === book);
  if (rawChapters.length === 0) {
    return { chapterPosition: null, totalChapters: 0, nextChapter: null };
  }
  const sorted = [...rawChapters].sort(compareChaptersByNumber);
  const idx = sorted.findIndex((c) => c.chapter === chapter);
  return {
    chapterPosition: idx >= 0 ? idx + 1 : null,
    totalChapters: sorted.length,
    nextChapter: idx >= 0 && idx + 1 < sorted.length ? sorted[idx + 1] : null,
  };
}

export function normalizeLevelCode(level: string): string {
  const lower = String(level || "").trim().toLowerCase();
  return LEVEL_LABEL[lower] ?? lower.toUpperCase();
}

export function getBookLevels(chapters: CatalogEntry[]): string[] {
  const found = new Set<string>();
  for (const ch of chapters) {
    const lv = String(ch.level || "").trim().toLowerCase();
    if (lv) found.add(lv);
  }
  const ordered: string[] = [];
  for (const lv of CANONICAL_LEVEL_ORDER) {
    if (found.has(lv)) {
      ordered.push(LEVEL_LABEL[lv] ?? lv.toUpperCase());
      found.delete(lv);
    }
  }
  for (const lv of Array.from(found).sort()) {
    ordered.push(LEVEL_LABEL[lv] ?? lv.toUpperCase());
  }
  return ordered;
}

export function readListeningProgressMaps(): ListeningProgressMaps {
  return {
    finished: getFinishedLocal(),
    favSentences: getFavSentencesLocal(),
    favWords: getFavWordsLocal(),
  };
}

export function getChapterListenState(
  book: string,
  chapter: string,
  maps: ListeningProgressMaps,
  recentListening: RecentListeningItem | null
): ChapterListenState {
  const bookFinished = maps.finished[book];
  if (bookFinished?.[chapter] === true) {
    return { status: "finished", progressPercent: 100 };
  }
  if (
    recentListening &&
    recentListening.book === book &&
    recentListening.chapter === chapter &&
    recentListening.currentTime > 0
  ) {
    return { status: "in_progress", progressPercent: recentListening.progressPercent };
  }
  const hasExplicitEntry =
    bookFinished != null && Object.prototype.hasOwnProperty.call(bookFinished, chapter);
  const hasFav =
    (maps.favSentences[book]?.[chapter]?.length ?? 0) > 0 ||
    (maps.favWords[book]?.[chapter]?.length ?? 0) > 0;
  if (hasExplicitEntry || hasFav) {
    return { status: "heard", progressPercent: null };
  }
  return { status: "unstarted", progressPercent: null };
}

function hasBookActivity(
  book: string,
  maps: ListeningProgressMaps,
  recentListening: RecentListeningItem | null,
  bookTimes: Record<string, number>
): { hasRecord: boolean; lastListenedAt: number } {
  const tsFromMap = bookTimes[book] || 0;
  if (recentListening?.book === book) {
    return { hasRecord: true, lastListenedAt: Math.max(tsFromMap, Date.now()) };
  }
  if (tsFromMap > 0) {
    return { hasRecord: true, lastListenedAt: tsFromMap };
  }
  const finBook = maps.finished[book];
  const hasFin =
    finBook != null && Object.keys(finBook).length > 0;
  const favS = maps.favSentences[book];
  const hasFavS =
    favS != null && Object.values(favS).some((arr) => Array.isArray(arr) && arr.length > 0);
  const favW = maps.favWords[book];
  const hasFavW =
    favW != null && Object.values(favW).some((arr) => Array.isArray(arr) && arr.length > 0);
  if (hasFin || hasFavS || hasFavW) {
    return { hasRecord: true, lastListenedAt: 1 };
  }
  return { hasRecord: false, lastListenedAt: 0 };
}

/**
 * 构建听故事首页的按书汇总列表：
 * - 排除 world / fables / voa
 * - 有收听记录的书排在前面（按最近收听时间倒序）
 * - 其余按章节数降序（同章数按固定顺序）
 */
export function buildStoryBookSummaries(
  books: BookMeta[],
  chapters: CatalogEntry[],
  maps: ListeningProgressMaps,
  recentListening: RecentListeningItem | null,
  bookTimes: Record<string, number>
): BookListenSummary[] {
  const byBook = new Map<string, BookMeta>();

  for (const b of books) {
    if (STORY_EXCLUDED_BOOKS.has(b.book)) continue;
    byBook.set(b.book, {
      ...b,
      chapters: Array.isArray(b.chapters) ? [...b.chapters] : [],
    });
  }

  for (const ch of chapters) {
    if (STORY_EXCLUDED_BOOKS.has(ch.book)) continue;
    const existing = byBook.get(ch.book);
    if (!existing) {
      byBook.set(ch.book, {
        book: ch.book,
        title_zh: resolveBookTitleZh(ch.book, ch.title_zh),
        title_en: BOOK_EN_FALLBACK[ch.book] || ch.title_en || ch.book,
        chapters: [ch],
      });
    } else if (!existing.chapters.some((c) => c.chapter === ch.chapter)) {
      existing.chapters.push(ch);
    }
  }

  const rankMap = new Map<string, number>(
    PREFERRED_BOOK_ORDER.map((id, idx) => [id, idx])
  );

  const summaries: BookListenSummary[] = [];
  for (const meta of byBook.values()) {
    const sortedChapters = [...meta.chapters].sort(compareChaptersByNumber);
    if (sortedChapters.length === 0) continue;

    const finBook = maps.finished[meta.book] || {};
    const finishedCountVal = sortedChapters.filter((ch) => finBook[ch.chapter] === true).length;
    const { hasRecord, lastListenedAt } = hasBookActivity(
      meta.book,
      maps,
      recentListening,
      bookTimes
    );

    summaries.push({
      book: meta.book,
      titleZh: resolveBookTitleZh(meta.book, meta.title_zh),
      titleEn: meta.title_en?.trim() || BOOK_EN_FALLBACK[meta.book] || meta.book,
      coverUrl: getBookCoverUrl(meta.book, sortedChapters, meta.cover_url),
      chapters: sortedChapters,
      totalChapters: sortedChapters.length,
      finishedCount: finishedCountVal,
      levels: getBookLevels(sortedChapters),
      hasRecord,
      lastListenedAt,
    });
  }

  summaries.sort((a, b) => {
    if (a.hasRecord !== b.hasRecord) return a.hasRecord ? -1 : 1;
    if (a.hasRecord && b.hasRecord) {
      if (b.lastListenedAt !== a.lastListenedAt) {
        return b.lastListenedAt - a.lastListenedAt;
      }
      if (b.finishedCount !== a.finishedCount) {
        return b.finishedCount - a.finishedCount;
      }
    }
    if (b.totalChapters !== a.totalChapters) {
      return b.totalChapters - a.totalChapters;
    }
    const ra = rankMap.get(a.book) ?? Number.MAX_SAFE_INTEGER;
    const rb = rankMap.get(b.book) ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.titleZh.localeCompare(b.titleZh, "zh-CN");
  });

  return summaries;
}

export function filterBookSummariesBySearch(
  list: BookListenSummary[],
  searchTerm: string
): BookListenSummary[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return list;
  return list.filter((b) => {
    if (
      b.titleZh.toLowerCase().includes(term) ||
      b.titleEn.toLowerCase().includes(term) ||
      b.levels.some((lv) => lv.toLowerCase().includes(term))
    ) {
      return true;
    }
    return b.chapters.some(
      (c) =>
        c.title_en.toLowerCase().includes(term) ||
        (c.title_zh && c.title_zh.toLowerCase().includes(term)) ||
        c.level.toLowerCase().includes(term)
    );
  });
}

function handleCoverFallback(book: string, e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = "1";
  img.src = getStoryCoverUrl(book);
}

interface StoryBookCardProps {
  summary: BookListenSummary;
  layout?: "desktop" | "mobile";
}

/**
 * 书架首页大书卡（7 本书之一）：
 * 封面图、中文书名、英文书名、「共 N 章」、已听完进度（x/N 章＋细进度条，无记录不显示进度）、级别构成小字
 */
export const StoryBookCard: React.FC<StoryBookCardProps> = ({
  summary,
  layout = "desktop",
}) => {
  const progressPct =
    summary.totalChapters > 0
      ? Math.min(100, Math.round((summary.finishedCount / summary.totalChapters) * 100))
      : 0;
  const isCompleted = summary.totalChapters > 0 && summary.finishedCount >= summary.totalChapters;

  if (layout === "mobile") {
    return (
      <Link
        to={`/listening/${summary.book}`}
        data-testid={`listening-book-card-${summary.book}`}
        className="group block rounded-2xl border border-[#D3E4DE] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#0F7B7A] overflow-hidden transition-colors"
      >
        <article className="flex items-stretch gap-3 p-3">
          <div className="relative w-28 shrink-0 aspect-[4/3] rounded-xl overflow-hidden bg-[#E7F2EF]">
            <img
              src={summary.coverUrl}
              alt=""
              onError={(e) => handleCoverFallback(summary.book, e)}
              className="w-full h-full object-cover"
            />
            {isCompleted && (
              <span className="absolute right-1.5 top-1.5 px-1.5 py-0.5 rounded-full bg-[#3FA46A] text-white text-[10px] font-bold leading-none">
                已听完
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <h3 className="text-[15px] font-extrabold text-[#123B3C] dark:text-foreground leading-snug truncate group-hover:text-[#0F7B7A] transition-colors">
                {summary.titleZh}
              </h3>
              <p className="mt-0.5 font-serif text-[12px] text-[#4E6B69] dark:text-muted-foreground leading-snug truncate">
                {summary.titleEn}
              </p>
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#4E6B69] dark:text-muted-foreground">
                <span className="font-semibold text-[#123B3C] dark:text-foreground shrink-0">
                  共 {summary.totalChapters} 章
                </span>
                <span
                  className="inline-flex items-center gap-1 font-semibold text-[#4E6B69] dark:text-muted-foreground truncate"
                  data-testid={`book-levels-${summary.book}`}
                >
                  {summary.levels.map((lv) => (
                    <span
                      key={lv}
                      className={`size-1.5 rounded-full shrink-0 ${LEVEL_DOT_CLASS[lv.toLowerCase()] ?? "bg-[#4E6B69]"}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span>{summary.levels.join("·")}</span>
                </span>
              </div>

              {summary.hasRecord && (
                <div data-testid={`book-progress-${summary.book}`}>
                  <div className="flex items-center justify-between text-[11px] text-[#4E6B69] dark:text-muted-foreground">
                    <span>
                      已听完 {summary.finishedCount}/{summary.totalChapters} 章
                    </span>
                    <span className="font-bold text-[#0F7B7A]">{progressPct}%</span>
                  </div>
                  <div
                    className="h-1 mt-1 rounded-full bg-[#E7F2EF] dark:bg-slate-800 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${summary.titleZh} 已听完 ${summary.finishedCount}/${summary.totalChapters} 章`}
                  >
                    <span
                      className={`block h-full rounded-full ${isCompleted ? "bg-[#3FA46A]" : "bg-[#0F7B7A]"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link
      to={`/listening/${summary.book}`}
      data-testid={`listening-book-card-${summary.book}`}
      className="sb-card sb-book-card group"
    >
      <article className="contents">
        <div className="cover">
          <img
            src={summary.coverUrl}
            alt=""
            onError={(e) => handleCoverFallback(summary.book, e)}
          />
          {isCompleted && <span className="done-tag">已听完</span>}
        </div>

        <div className="body">
          <h3 title={summary.titleZh}>{summary.titleZh}</h3>
          <p className="en-title" title={summary.titleEn}>
            {summary.titleEn}
          </p>

          <div className="book-meta">
            <span className="chapter-count">共 {summary.totalChapters} 章</span>
            <span
              className="levels"
              data-testid={`book-levels-${summary.book}`}
            >
              {summary.levels.map((lv) => (
                <span
                  key={lv}
                  className={`sb-dot ${
                    lv === "A1" ? "sb-dot-a1" : lv === "A2" ? "sb-dot-a2" : "sb-dot-b1"
                  }`}
                  aria-hidden="true"
                />
              ))}
              <span>{summary.levels.join("·")}</span>
            </span>
          </div>

          {summary.hasRecord && (
            <div className="book-progress" data-testid={`book-progress-${summary.book}`}>
              <div className="book-progress-label">
                <span>
                  已听完 {summary.finishedCount}/{summary.totalChapters} 章
                </span>
                <b>{progressPct}%</b>
              </div>
              <div
                className="book-progress-bar"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${summary.titleZh} 已听完 ${summary.finishedCount}/${summary.totalChapters} 章`}
              >
                <i
                  className={isCompleted ? "done" : ""}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
};

interface ListeningChapterCardProps {
  chapter: CatalogEntry;
  bookTitleZh: string;
  listenState: ChapterListenState;
}

/**
 * 书籍详情页 (/listening/:book) 章节卡：
 * 保留 B 单口径——级别小标签、已听完标记、进行中真实百分比进度条、已听过弱标记
 */
export const ListeningChapterCard: React.FC<ListeningChapterCardProps> = ({
  chapter,
  bookTitleZh,
  listenState,
}) => {
  const chTitleZh = chapter.title_zh?.trim() || bookTitleZh;
  const rawLevel = String(chapter.level || "").trim().toLowerCase();
  const levelLabel = LEVEL_LABEL[rawLevel] ?? rawLevel.toUpperCase();
  const dotClass = LEVEL_DOT_CLASS[rawLevel] ?? "bg-[#4E6B69]";

  return (
    <Link
      to={`/listening/${chapter.book}/${chapter.chapter}`}
      data-testid={`listening-chapter-${chapter.book}-${chapter.chapter}`}
      className="group flex flex-col h-full rounded-[16px] min-[1280px]:rounded-[20px] border border-[#D3E4DE] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:border-[#0F7B7A] hover:-translate-y-0.5 hover:shadow-md transition-all"
    >
      <article className="contents">
        <div className="relative aspect-[4/3] shrink-0 bg-[#E7F2EF] overflow-hidden">
          <img
            src={getStoryCoverUrl(chapter.book, chapter.cover)}
            alt=""
            loading="lazy"
            onError={(e) => handleCoverFallback(chapter.book, e)}
            className="w-full h-full object-cover"
          />

          {listenState.status === "finished" && (
            <span className="absolute right-2 top-2 px-2 py-0.5 rounded-full bg-[#3FA46A] text-white text-[10.5px] min-[1280px]:text-[11.5px] font-bold leading-tight">
              已听完
            </span>
          )}
          {listenState.status === "in_progress" && (
            <span className="absolute right-2 top-2 px-2 py-0.5 rounded-full bg-[#0F7B7A] text-white text-[10.5px] min-[1280px]:text-[11.5px] font-bold leading-tight">
              进行中
            </span>
          )}
          {listenState.status === "heard" && (
            <span className="absolute right-2 top-2 px-2 py-0.5 rounded-full bg-white/92 border border-[#D3E4DE] text-[#4E6B69] text-[10.5px] min-[1280px]:text-[11.5px] font-semibold leading-tight">
              已听过
            </span>
          )}

          {listenState.status === "in_progress" && listenState.progressPercent !== null && (
            <div
              className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/55 overflow-hidden"
              role="progressbar"
              aria-valuenow={listenState.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`收听进度 ${listenState.progressPercent}%`}
            >
              <span
                className="block h-full bg-[#0F7B7A]"
                style={{ width: `${listenState.progressPercent}%` }}
              />
            </div>
          )}
        </div>

        <div className="p-2.5 sm:p-3 min-[1280px]:px-4 min-[1280px]:pt-3.5 min-[1280px]:pb-4 flex flex-col flex-1">
          <div className="text-[11px] min-[1280px]:text-[12px] font-semibold text-[#4E6B69] dark:text-muted-foreground">
            {formatChapterLabel(chapter.chapter)}
          </div>
          <h3
            title={chapter.title_en}
            className="mt-1 font-serif text-[13.5px] sm:text-[14.5px] min-[1280px]:text-[16.5px] font-bold leading-[1.3] min-h-[2.6em] text-[#123B3C] dark:text-foreground line-clamp-2 group-hover:text-[#0F7B7A] transition-colors"
          >
            {chapter.title_en}
          </h3>
          <p
            title={chTitleZh}
            className="mt-1 text-[11.5px] min-[1280px]:text-[12.5px] font-medium text-[#4E6B69] dark:text-muted-foreground truncate"
          >
            {chTitleZh}
          </p>
          {!chapter.has_zh && (
            <div className="mt-1 text-[10.5px] min-[1280px]:text-[12px] text-[#4E6B69] dark:text-muted-foreground">
              无逐句译文 · 英文原版
            </div>
          )}
          <div className="mt-auto pt-2 flex items-center gap-1 text-[11.5px] min-[1280px]:text-[13px] text-[#4E6B69] dark:text-muted-foreground">
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E7F2EF] dark:bg-slate-800 text-[#123B3C] dark:text-foreground text-[11px] font-bold leading-none shrink-0"
              data-testid={`chapter-level-tag-${chapter.chapter}`}
            >
              <span className={`size-1.5 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
              <span>{levelLabel}</span>
            </span>
            <span className="truncate">
              · {formatMmSs(chapter.duration)} · {chapter.sentence_count}句
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

interface LevelFilterChipsProps {
  levels: string[];
  selectedLevel: string;
  onSelect: (level: string) => void;
  counts: Record<string, number>;
  totalCount: number;
}

/**
 * 书籍详情页顶部级别筛选 chips（全部 + 仅生成该书实际有的级别）
 */
export const LevelFilterChips: React.FC<LevelFilterChipsProps> = ({
  levels,
  selectedLevel,
  onSelect,
  counts,
  totalCount,
}) => {
  return (
    <div
      role="group"
      aria-label="级别筛选"
      className="flex flex-wrap gap-2"
      data-testid="book-level-filter-chips"
    >
      <button
        type="button"
        aria-pressed={selectedLevel === "all"}
        onClick={() => onSelect("all")}
        data-testid="level-chip-all"
        className={`h-8 px-3 rounded-full text-[13px] leading-none inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
          selectedLevel === "all"
            ? "bg-[#0F7B7A] border-[#0F7B7A] text-white font-bold"
            : "bg-white dark:bg-slate-900 border-[#D3E4DE] dark:border-slate-700 text-[#123B3C] dark:text-foreground font-semibold hover:bg-[#E7F2EF]"
        }`}
      >
        <span>全部</span>
        <span className={selectedLevel === "all" ? "text-white/85" : "text-[#4E6B69]"}>
          {totalCount}
        </span>
      </button>

      {levels.map((lv) => {
        const key = lv.toLowerCase();
        const active = selectedLevel === key;
        const dotClass = LEVEL_DOT_CLASS[key] ?? "bg-[#4E6B69]";
        return (
          <button
            key={lv}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(key)}
            data-testid={`level-chip-${key}`}
            className={`h-8 px-3 rounded-full text-[13px] leading-none inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
              active
                ? "bg-[#0F7B7A] border-[#0F7B7A] text-white font-bold"
                : "bg-white dark:bg-slate-900 border-[#D3E4DE] dark:border-slate-700 text-[#123B3C] dark:text-foreground font-semibold hover:bg-[#E7F2EF]"
            }`}
          >
            <span
              className={`size-2 rounded-full shrink-0 ${active ? "bg-white" : dotClass}`}
              aria-hidden="true"
            />
            <span>{lv}</span>
            <span className={active ? "text-white/85" : "text-[#4E6B69]"}>
              {counts[key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60}m`;
  return `${m}m`;
}

function totalDuration(chapters: CatalogEntry[]): number {
  return chapters.reduce((s, ch) => s + (ch.duration || 0), 0);
}

function finishedCount(book: string, chapters: CatalogEntry[]): number {
  return chapters.filter((ch) => isChapterFinished(book, ch.chapter)).length;
}

interface WorldShelfSectionProps {
  level: string;
  label: string;
  desc: string;
  books: BookMeta[];
  unitLabel?: string;
}

/**
 * 环球漫游按书分组卡片区（保留给移动端 /listening?tab=world 复用）
 */
export function ListeningShelfSection({
  level,
  label,
  desc,
  books,
  unitLabel = "站",
}: WorldShelfSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const booksFiltered = useMemo(
    () =>
      books
        .map((b) => ({
          ...b,
          chapters: b.chapters.filter((ch) => (ch.level || "").toLowerCase() === level),
        }))
        .filter((b) => b.chapters.length > 0),
    [books, level]
  );

  const totalUnits = useMemo(
    () => booksFiltered.reduce((sum, b) => sum + b.chapters.length, 0),
    [booksFiltered]
  );

  useCardStagger(sectionRef, "a[data-testid^='listening-book-']", [
    booksFiltered.length,
    totalUnits,
  ]);

  if (booksFiltered.length === 0) return null;

  const dotClass = LEVEL_DOT_CLASS[level] ?? "bg-[#4E6B69]";

  return (
    <section ref={sectionRef} className="space-y-3" data-testid={`listening-level-${level}`}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`size-2 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
          <h2 className="text-base sm:text-lg font-bold text-[#123B3C] dark:text-foreground leading-snug whitespace-nowrap">
            {label}
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E7F2EF] dark:bg-slate-800 text-[#0F7B7A] dark:text-teal-300 text-xs font-bold leading-none whitespace-nowrap shrink-0">
            {totalUnits} {unitLabel}
          </span>
        </div>
        {desc && (
          <p className="text-xs sm:text-sm text-[#4E6B69] dark:text-muted-foreground leading-relaxed">
            {desc}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {booksFiltered.map((book) => {
          const done = finishedCount(book.book, book.chapters);
          const total = book.chapters.length;
          const dur = totalDuration(book.chapters);

          return (
            <Link
              key={book.book}
              to={`/listening/${book.book}`}
              data-testid={`listening-book-${book.book}-${level}`}
              className="group flex flex-col w-44 rounded-2xl border bg-card shadow-none hover:shadow-md transition-all overflow-hidden border-sand-border dark:border-slate-800 hover:border-sun-orange card-hover-lift"
            >
              <div className="relative h-28 bg-muted flex items-center justify-center overflow-hidden">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-sun-orange/60" />
                  </div>
                )}
                {done > 0 && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 text-xs rounded-full px-2 py-0.5 font-bold shadow-xs">
                    {done}/{total}
                  </div>
                )}
              </div>

              <div className="p-3 space-y-1 flex-1">
                <p className="text-xs font-black leading-tight line-clamp-2 text-foreground group-hover:text-sun-orange transition-colors">
                  {book.title_zh}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{book.title_en}</p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(dur)}</span>
                  <span>·</span>
                  <span>
                    {total} {unitLabel}
                  </span>
                </div>
                {done === total && total > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold pt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>已完成</span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
