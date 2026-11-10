// 绘本阅读区陈列组件（可复用）
// 入参：level / label / desc / books（该级 BookMeta 列表）
import React from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { Badge } from "@renderer/components/ui";
import type { BookMeta, CatalogEntry } from "./types";
import { isChapterFinished } from "@renderer/lib/listening-sync";

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

const LEVEL_COLORS: Record<string, string> = {
  a1: "bg-green-100 text-green-800 border-green-200",
  a2: "bg-blue-100 text-blue-800 border-blue-200",
  b1: "bg-purple-100 text-purple-800 border-purple-200",
};

interface Props {
  level: string;
  label: string;
  desc: string;
  books: BookMeta[];
}

export function ListeningShelfSection({ level, label, desc, books }: Props) {
  // 只展示该级章节
  const booksFiltered = books.map((b) => ({
    ...b,
    chapters: b.chapters.filter((ch) => ch.level === level),
  })).filter((b) => b.chapters.length > 0);

  if (booksFiltered.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* 区标题 */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold">{label}</h2>
        <span className="text-sm text-muted-foreground">{desc}</span>
      </div>

      {/* 书卡横排（允许换行） */}
      <div className="flex flex-wrap gap-4">
        {booksFiltered.map((book) => {
          const done = finishedCount(book.book, book.chapters);
          const total = book.chapters.length;
          const dur = totalDuration(book.chapters);

          return (
            <Link
              key={book.book}
              to={`/listening/${book.book}`}
              className="group flex flex-col w-40 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* 封面 */}
              <div className="relative h-28 bg-muted flex items-center justify-center overflow-hidden">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title_zh}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                )}
                {/* 进度角标 */}
                {done > 0 && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">
                    {done}/{total}
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="p-2 space-y-1 flex-1">
                <p className="text-xs font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {book.title_zh}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">{book.title_en}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(dur)}</span>
                  <span>·</span>
                  <span>{total} 章</span>
                </div>
                {done === total && total > 0 && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>已读完</span>
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
