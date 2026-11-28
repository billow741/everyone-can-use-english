// 阳光桥少儿英语 · 伊索「每日一则」常驻位组件 (Daily Fable Section)
// 依据工单 C（决策 5）：落 UI 位与轮播壳，对接按日期取则的数据源接口壳
// 无数据时严格显示占位文案「筹备中」，不编造任何伊索内容

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpenIcon, SparklesIcon, CalendarIcon, HeadphonesIcon, ChevronRightIcon } from "lucide-react";
import { loadCatalog, loadChapterData } from "@renderer/lib/listening-sync";

export interface DailyFableItem {
  id: string;
  dateKey: string; // 'YYYY-MM-DD'
  titleEn: string;
  titleZh: string;
  moralZh?: string;
  audioUrl?: string;
  coverUrl?: string;
  duration?: number;
}

export interface DailyFableDataSource {
  getFableByDate: (date: Date) => Promise<DailyFableItem | null>;
}

/**
 * 缺省伊索数据源实现：对接 catalog 与 fable JSON
 * 每日选则以本地日期为准：当年 1 月 1 日为第 1 天，index = (dayOfYear - 1) % 143
 * 无数据时严格返回 null，触发规范的「筹备中」占位态
 */
export const defaultDailyFableDataSource: DailyFableDataSource = {
  getFableByDate: async (date: Date): Promise<DailyFableItem | null> => {
    try {
      const catalog = await loadCatalog();
      if (!catalog || !catalog.books) return null;
      const fablesBook = catalog.books.find((b) => b.book === "fables");
      if (!fablesBook || !fablesBook.chapters || fablesBook.chapters.length === 0) {
        return null;
      }

      // 选则（写死，不可改）：当年 1 月 1 日为第 1 天，index = (dayOfYear - 1) % 143
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const diffMs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diffMs / 86400000) + 1;
      const index = ((dayOfYear - 1) % 143 + 143) % 143;
      const targetChapter = fablesBook.chapters[index];
      if (!targetChapter) return null;

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const dateKey = `${y}-${m}-${d}`;

      let moralZh: string | undefined = undefined;
      try {
        const fableJson = await loadChapterData("fables", targetChapter.chapter);
        if (fableJson && (fableJson as any).moral_zh) {
          moralZh = (fableJson as any).moral_zh;
        }
      } catch (_) {}

      return {
        id: targetChapter.chapter,
        dateKey,
        titleEn: targetChapter.title_en,
        titleZh: targetChapter.title_zh,
        moralZh,
        audioUrl: targetChapter.audio_url,
        duration: targetChapter.duration,
      };
    } catch (_) {
      return null;
    }
  },
};

export interface DailyFableCardProps {
  className?: string;
  dataSource?: DailyFableDataSource;
}

export const DailyFableCard: React.FC<DailyFableCardProps> = ({
  className = "",
  dataSource = defaultDailyFableDataSource,
}) => {
  const [fable, setFable] = useState<DailyFableItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    dataSource
      .getFableByDate(new Date())
      .then((data) => {
        if (mounted) {
          setFable(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setFable(null);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [dataSource]);

  const todayStr = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="size-3 rounded-full bg-amber-500 shadow-xs" />
          <h2 className="text-base font-black tracking-wide text-foreground">
            伊索寓言 · 每日一则
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <CalendarIcon className="size-3.5 text-amber-500" />
          <span>{todayStr}</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[14px] border border-dashed border-sand-border dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-none card-hover-lift">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground font-bold">
            <span>加载每日寓言中…</span>
          </div>
        ) : fable ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                今日故事
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                {fable.titleZh} ({fable.titleEn})
              </h3>
              {fable.moralZh && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  💡 寓意：{fable.moralZh}
                </p>
              )}
            </div>
            <Link
              to={`/listening/fables/${fable.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs shrink-0 self-start sm:self-center"
            >
              <HeadphonesIcon className="size-3.5" />
              <span>去听今日寓言</span>
              <ChevronRightIcon className="size-3.5" />
            </Link>
          </div>
        ) : (
          /* 严格执行工单规范：无数据时显示占位文案「筹备中」，不编造任何假内容 */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="size-12 rounded-lg bg-warm-paper dark:bg-slate-800 border border-sand-border text-sun-orange flex items-center justify-center shrink-0 card-img-lift">
                <BookOpenIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                    伊索寓言 · 每日一则
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                    筹备中
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  原版双语伊索寓言正在整理上线中。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400 bg-white/80 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-amber-200 dark:border-slate-700 shadow-2xs">
              <SparklesIcon className="size-3.5 text-amber-500" />
              <span>敬请期待</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
