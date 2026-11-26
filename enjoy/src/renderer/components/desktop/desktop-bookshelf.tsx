import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Play,
  Check,
  Headphones,
} from "lucide-react";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import { getRecentListening, RecentListeningItem } from "@renderer/lib/desktop-data";
import { loadCatalog, isChapterFinished } from "@renderer/lib/listening-sync";
import type { CatalogEntry } from "@renderer/pages/listening/types";
import { useCardStagger } from "@renderer/lib/motion";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatChapterLabel(chapter: string): string {
  const trimmed = String(chapter || "").trim();
  if (/^\d+$/.test(trimmed)) {
    return `第 ${parseInt(trimmed, 10)} 章`;
  }
  return trimmed;
}

const STORY_EXCLUDED_BOOKS = new Set(["world", "fables", "voa"]);

export const DesktopBookshelf: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [chapters, setChapters] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const shelfStackRef = useRef<HTMLDivElement>(null);
  useCardStagger(shelfStackRef, ".sb-story-card", [loading, chapters.length]);

  const recentListening = useMemo<RecentListeningItem | null>(() => {
    return getRecentListening();
  }, []);

  useEffect(() => {
    loadCatalog().then((cat) => {
      if (cat?.chapters) {
        // 过滤出听故事 16 单元（排除 world、fables 与 voa）
        const storyChapters = cat.chapters.filter((ch) => !STORY_EXCLUDED_BOOKS.has(ch.book));
        setChapters(storyChapters);
      }
      setLoading(false);
    });
  }, []);

  // 搜索过滤
  const filteredChapters = useMemo(() => {
    if (!searchTerm.trim()) return chapters;
    const term = searchTerm.trim().toLowerCase();
    return chapters.filter(
      (c) =>
        c.title_en.toLowerCase().includes(term) ||
        (c.title_zh && c.title_zh.toLowerCase().includes(term)) ||
        c.level.toLowerCase().includes(term)
    );
  }, [chapters, searchTerm]);

  // 分组 A1 / A2 / B1
  const a1Chapters = useMemo(
    () => filteredChapters.filter((c) => c.level.toLowerCase() === "a1"),
    [filteredChapters]
  );
  const a2Chapters = useMemo(
    () => filteredChapters.filter((c) => c.level.toLowerCase() === "a2"),
    [filteredChapters]
  );
  const b1Chapters = useMemo(
    () => filteredChapters.filter((c) => c.level.toLowerCase() === "b1"),
    [filteredChapters]
  );

  const getCoverUrl = (book: string) => {
    if (book === "velveteenduet_librivox") {
      return "/assets/covers/velveteen-cover.jpg";
    }
    return "/assets/covers/treasury-cover.jpg";
  };

  const getBookLabel = (book: string) => {
    if (book === "velveteenduet_librivox") {
      return "绒布小兔";
    }
    return "彼得兔合集";
  };

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
              aria-label="搜索故事篇名或级别"
              placeholder="搜索故事篇名或级别…"
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
          {/* 最近收听卡 */}
          {recentListening ? (
            <div className="sb-card sb-recent">
              <div
                className="thumb"
                style={{
                  backgroundImage: `url(${getCoverUrl(recentListening.book)})`,
                }}
              />
              <div className="body">
                <div className="sb-eyebrow text-sun-orange">最近收听</div>
                <h2>{recentListening.title}</h2>
                <div className="sub">
                  第 {recentListening.chapter} 章 · {recentListening.sentenceCount} 句 · {fmt(recentListening.duration)}
                </div>
                <div className="sb-progress-row">
                  <span>
                    进度 {fmt(recentListening.currentTime)} / {fmt(recentListening.duration)}
                  </span>
                  <b>{recentListening.progressPercent}%</b>
                </div>
                <div className="sb-bar">
                  <i style={{ width: `${recentListening.progressPercent}%` }} />
                </div>
              </div>
              <Link
                to={`/listening/${recentListening.book}/${recentListening.chapter}`}
                className="sb-btn-continue"
              >
                <span>继续收听</span>
                <Play className="size-4 fill-white" />
              </Link>
            </div>
          ) : (
            <div className="sb-card sb-recent">
              <div className="body">
                <div className="sb-eyebrow text-sun-orange">最近收听</div>
                <h2 className="text-lg text-warm-muted mt-1">
                  暂无收听记录，从下方挑选一个故事开启听力之旅吧！
                </h2>
              </div>
            </div>
          )}

          {/* 分组列表 */}
          {loading ? (
            <div className="py-12 text-center text-sm text-warm-muted">
              故事书目加载中…
            </div>
          ) : filteredChapters.length === 0 ? (
            <div className="sb-card p-12 text-center">
              <Headphones className="size-10 text-warm-muted mx-auto mb-3" />
              <p className="text-base font-bold text-warm-muted">
                未找到与 “{searchTerm}” 相关的故事
              </p>
            </div>
          ) : (
            <>
              {/* Level A1 */}
              {a1Chapters.length > 0 && (
                <div>
                  <div className="sb-group-head">
                    <h2>
                      <span className="sb-dot sb-dot-a1" />
                      Level A1
                    </h2>
                    <span>{a1Chapters.length} 个故事</span>
                  </div>
                  <div className="sb-grid-4">
                    {a1Chapters.map((ch) => {
                      const finished = isChapterFinished(ch.book, ch.chapter);
                      return (
                        <Link
                          key={`${ch.book}-${ch.chapter}`}
                          to={`/listening/${ch.book}/${ch.chapter}`}
                          className="sb-card sb-story-card"
                        >
                          <div
                            className="cover"
                            style={{ backgroundImage: `url(${getCoverUrl(ch.book)})` }}
                          >
                            <span className="book-tag">{getBookLabel(ch.book)}</span>
                            {finished && <span className="done-tag">已听完</span>}
                          </div>
                          <div className="body">
                            <div className="ch">{formatChapterLabel(ch.chapter)}</div>
                            <h3>{ch.title_en}</h3>
                            <div className="meta">
                              <span className="sb-dot sb-dot-a1" />
                              <b className="sb-lv-a1">A1</b>
                              <span>· {fmt(ch.duration)} · {ch.sentence_count}句</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Level A2 */}
              {a2Chapters.length > 0 && (
                <div>
                  <div className="sb-group-head">
                    <h2>
                      <span className="sb-dot sb-dot-a2" />
                      Level A2
                    </h2>
                    <span>{a2Chapters.length} 个故事</span>
                  </div>
                  <div className="sb-grid-4">
                    {a2Chapters.map((ch) => {
                      const finished = isChapterFinished(ch.book, ch.chapter);
                      return (
                        <Link
                          key={`${ch.book}-${ch.chapter}`}
                          to={`/listening/${ch.book}/${ch.chapter}`}
                          className="sb-card sb-story-card"
                        >
                          <div
                            className="cover"
                            style={{ backgroundImage: `url(${getCoverUrl(ch.book)})` }}
                          >
                            <span className="book-tag">{getBookLabel(ch.book)}</span>
                            {finished && <span className="done-tag">已听完</span>}
                          </div>
                          <div className="body">
                            <div className="ch">{formatChapterLabel(ch.chapter)}</div>
                            <h3>{ch.title_en}</h3>
                            <div className="meta">
                              <span className="sb-dot sb-dot-a2" />
                              <b className="sb-lv-a2">A2</b>
                              <span>· {fmt(ch.duration)} · {ch.sentence_count}句</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Level B1 */}
              {b1Chapters.length > 0 && (
                <div>
                  <div className="sb-group-head">
                    <h2>
                      <span className="sb-dot sb-dot-b1" />
                      Level B1
                    </h2>
                    <span>{b1Chapters.length} 个故事</span>
                  </div>
                  <div className="sb-grid-4">
                    {b1Chapters.map((ch) => {
                      const finished = isChapterFinished(ch.book, ch.chapter);
                      return (
                        <Link
                          key={`${ch.book}-${ch.chapter}`}
                          to={`/listening/${ch.book}/${ch.chapter}`}
                          className="sb-card sb-story-card"
                        >
                          <div
                            className="cover"
                            style={{ backgroundImage: `url(${getCoverUrl(ch.book)})` }}
                          >
                            <span className="book-tag">{getBookLabel(ch.book)}</span>
                            {finished && <span className="done-tag">已听完</span>}
                          </div>
                          <div className="body">
                            <div className="ch">{formatChapterLabel(ch.chapter)}</div>
                            <h3>{ch.title_en}</h3>
                            <div className="meta">
                              <span className="sb-dot sb-dot-b1" />
                              <b className="sb-lv-b1">B1</b>
                              <span>· {fmt(ch.duration)} · {ch.sentence_count}句</span>
                            </div>
                            <div className="nozh">无逐句译文 · 英文原版</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
