// /listening/:book — 篇目列表页
import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, BookOpen, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { loadCatalog } from "@renderer/lib/listening-sync";
import { isChapterFinished } from "@renderer/lib/listening-sync";
import type { BookMeta, CatalogEntry } from "./types";
import { useCardStagger } from "@renderer/lib/motion";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

const LEVEL_LABEL: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  l1: "L1",
  l2: "L2",
  anna: "Anna",
};

const LEVEL_DOT_COLOR: Record<string, string> = {
  a0: "bg-[#E8930C]",
  a1: "bg-[#4A90D9]",
  a2: "bg-[#3FA46A]",
  b1: "bg-[#7C6BD9]",
  l1: "bg-[#4A90D9]",
  l2: "bg-[#3FA46A]",
  anna: "bg-[#E8930C]",
};

export default function ListeningBook() {
  const { book } = useParams<{ book: string }>();
  const navigate = useNavigate();
  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useCardStagger(listRef, "a.listening-chapter-item", [loading, bookMeta?.chapters?.length]);

  useEffect(() => {
    if (!book) return;
    loadCatalog().then((cat) => {
      if (!cat) {
        setError("无法加载书目，请检查网络连接后重试。");
      } else {
        const found = cat.books.find((b) => b.book === book);
        if (!found) {
          setError(`未找到书目：${book}`);
        } else {
          setBookMeta(found);
        }
      }
      setLoading(false);
    });
  }, [book]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
          className="text-sm text-primary underline"
          onClick={() => navigate("/listening")}
        >
          返回书架
        </button>
      </div>
    );
  }

  const finishedCount = bookMeta.chapters.filter((ch) =>
    isChapterFinished(bookMeta.book, ch.chapter)
  ).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/listening" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          <span>书架</span>
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{bookMeta.title_zh}</span>
      </div>

      {/* 书头 */}
      <div className="flex gap-4 items-start">
        {bookMeta.cover_url ? (
          <img
            src={bookMeta.cover_url}
            alt={bookMeta.title_zh}
            className="w-20 h-28 object-cover rounded-lg shadow"
          />
        ) : (
          <div className="w-20 h-28 bg-muted rounded-lg flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 space-y-1">
          <h1 className="text-xl font-bold">{bookMeta.title_zh}</h1>
          <p className="text-sm text-muted-foreground">{bookMeta.title_en}</p>
          <p className="text-sm text-muted-foreground">
            共 {bookMeta.chapters.length} 章 · 已听完 {finishedCount} 章
          </p>
        </div>
      </div>

      {/* 章节列表 */}
      <div ref={listRef} className="divide-y border rounded-xl overflow-hidden">
        {bookMeta.chapters.map((ch) => {
          const done = isChapterFinished(bookMeta.book, ch.chapter);
          return (
            <Link
              key={ch.chapter}
              to={`/listening/${bookMeta.book}/${ch.chapter}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group card-hover-lift listening-chapter-item"
              onClick={() => forceUpdate((n) => n + 1)}
            >
              {/* 听完状态 */}
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
              )}

              {/* 章节信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                  {ch.title_en}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(ch.duration)}</span>
                  <span>·</span>
                  <span>{ch.sentence_count} 句</span>
                </div>
              </div>

              {/* 级别标签：圆点＋墨字 */}
              <span
                className="text-xs px-2 py-0.5 rounded-full border border-[#D3E4DE] bg-white text-[#123B3C] font-medium flex-shrink-0 inline-flex items-center gap-1.5"
              >
                <span className={`size-1.5 rounded-full ${LEVEL_DOT_COLOR[ch.level] ?? "bg-[#4E6B69]"}`} />
                <span>{LEVEL_LABEL[ch.level] ?? ch.level.toUpperCase()}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
