// 阳光桥少儿英语 · 伊索「每日一则」常驻位组件 (Daily Fable Section)
// 依据工单 C（决策 5）：落 UI 位与轮播壳，对接按日期取则的数据源接口壳
// 无数据时严格显示占位文案「筹备中」，不编造任何伊索内容

import React, { useState, useEffect } from "react";
import { BookOpenIcon, SparklesIcon, CalendarIcon } from "lucide-react";

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
 * 缺省伊索数据源实现壳
 * 当前生产线尚无伊索册，直接返回 null，触发规范的「筹备中」占位态
 */
export const defaultDailyFableDataSource: DailyFableDataSource = {
  getFableByDate: async (_date: Date): Promise<DailyFableItem | null> => {
    // 接口预留位：后续工单接入生产数据
    return null;
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

      <div className="relative overflow-hidden rounded-[14px] border border-dashed border-[#F0DFC0] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-none">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground font-bold">
            <span>加载每日寓言中…</span>
          </div>
        ) : fable ? (
          <div className="flex items-center justify-between gap-4">
            <div>
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
          </div>
        ) : (
          /* 严格执行工单规范：无数据时显示占位文案「筹备中」，不编造任何假内容 */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="size-12 rounded-lg bg-[#FFF9EF] dark:bg-slate-800 border border-[#F0DFC0] text-[#F5820B] flex items-center justify-center shrink-0">
                <BookOpenIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                    伊索经典双语微剧场
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                    筹备中
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  精选原版伊索寓言、逐句跟读与童趣动画正在音频化生产，即将常驻上线！
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
