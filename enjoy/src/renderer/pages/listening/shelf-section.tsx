// 绘本阅读区 / 听读陈列组件（可复用）
// 入参：level / label / desc / books（该级 BookMeta 列表）
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, CheckCircle2 } from "lucide-react";
import type { BookMeta, CatalogEntry } from "./types";
import { isChapterFinished } from "@renderer/lib/listening-sync";
import { useCardStagger } from "@renderer/lib/motion";

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

interface Props {
  level: string;
  label: string;
  desc: string;
  books: BookMeta[];
  unitLabel?: string;
}

export function ListeningShelfSection({ level, label, desc, books, unitLabel = "章" }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  // 只展示该级章节
  const booksFiltered = books.map((b) => ({
    ...b,
    chapters: b.chapters.filter((ch) => ch.level === level),
  })).filter((b) => b.chapters.length > 0);

  useCardStagger(sectionRef, "a[data-testid^='listening-book-']", [booksFiltered.length]);

  if (booksFiltered.length === 0) return null;

  return (
    <section ref={sectionRef} className="space-y-4">
      {/* 区标题 */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold text-foreground">{label}</h2>
        <span className="text-sm text-muted-foreground">{desc}</span>
      </div>

      {/* 书卡横排（允许换行） */}
      <div className="flex flex-wrap gap-4">
        {booksFiltered.map((book) => {
          const done = finishedCount(book.book, book.chapters);
          const total = book.chapters.length;
          const dur = totalDuration(book.chapters);
          const isWorld = book.book === "world";
          const unit = isWorld ? "站" : unitLabel;

          return (
            <Link
              key={book.book}
              to={`/listening/${book.book}`}
              data-testid={`listening-book-${book.book}-${level}`}
              className="group flex flex-col w-44 rounded-2xl border bg-card shadow-none hover:shadow-md transition-all overflow-hidden border-sand-border dark:border-slate-800 hover:border-sun-orange card-hover-lift"
            >
              {/* 封面 */}
              <div className="relative h-28 bg-muted flex items-center justify-center overflow-hidden">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title_zh}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-sun-orange/60" />
                  </div>
                )}
                {/* 进度角标 */}
                {done > 0 && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-slate-950 text-xs rounded-full px-2 py-0.5 font-bold shadow-xs">
                    {done}/{total}
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="p-3 space-y-1 flex-1">
                <p className="text-xs font-black leading-tight line-clamp-2 text-foreground group-hover:text-sun-orange transition-colors">
                  {book.title_zh}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{book.title_en}</p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(dur)}</span>
                  <span>·</span>
                  <span>{total} {unit}</span>
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
