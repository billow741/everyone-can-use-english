// 阳光桥少儿英语 · 七大资源版块卡陈列组件 (Section Entry Cards)
// 复用于主页 (home.tsx) 与 课程页 (courses/index.tsx)
// 依据工单 G · IA 翻转：资源先行七版块（Roger 2026-11-12 亲批）

import React, { useRef } from "react";
import { Link } from "react-router-dom";
import {
  ORDERED_SECTIONS,
  SECTION_METAS,
  SectionKey,
  useSectionStats,
} from "@renderer/lib/section-registry";
import { useCardStagger } from "@renderer/lib/motion";
import {
  SparklesIcon,
  HeadphonesIcon,
  CompassIcon,
  MessageCircleIcon,
  RadioIcon,
  ScrollIcon,
  BookOpenIcon,
  ChevronRightIcon,
  LayersIcon,
} from "lucide-react";

const ICON_MAP = {
  Sparkles: SparklesIcon,
  Headphones: HeadphonesIcon,
  Compass: CompassIcon,
  MessageCircle: MessageCircleIcon,
  Radio: RadioIcon,
  Scroll: ScrollIcon,
  BookOpen: BookOpenIcon,
};

export interface SectionEntryCardsProps {
  className?: string;
}

export const SectionEntryCards: React.FC<SectionEntryCardsProps> = ({
  className = "",
}) => {
  const stats = useSectionStats();
  const cardsRef = useRef<HTMLDivElement>(null);
  useCardStagger(cardsRef, "a[data-testid^='section-card-']", []);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="size-3 rounded-full bg-amber-500 shadow-xs" />
          <h2 className="text-base font-black tracking-wide text-foreground">
            阳光英语核心资源版块
          </h2>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          资源先行 · 版块内自主进阶
        </span>
      </div>

      <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ORDERED_SECTIONS.map((key) => {
          const meta = SECTION_METAS[key];
          const IconComponent = ICON_MAP[meta.iconName] || BookOpenIcon;
          const stat = stats[key];
          const isPreparing = meta.status === "preparing";

          return (
            <Link
              key={key}
              to={meta.route}
              data-testid={`section-card-${key}`}
              className={`group relative flex flex-col justify-between rounded-[14px] border p-5 sm:p-6 transition-all duration-200 bg-white dark:bg-slate-900 shadow-none card-hover-lift border-sand-border dark:border-slate-800 hover:border-sun-orange`}
            >
              <div>
                {/* 顶部标签行：版块名 + 专属标签 + 状态 */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-warm-paper dark:bg-slate-800 border border-sand-border flex items-center justify-center text-sun-orange shrink-0">
                      <IconComponent className="size-4" />
                    </div>
                    <span className="text-base font-black text-foreground group-hover:text-sun-orange transition-colors">
                      {meta.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${meta.badgeBg}`}
                    >
                      {meta.badge}
                    </span>
                    {isPreparing && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                        {meta.statusLabel || "筹备中"}
                      </span>
                    )}
                  </div>
                </div>

                {/* 版块练什么一句话（孩子在这里练什么） */}
                <div className="my-2.5 rounded-lg bg-warm-paper/80 dark:bg-slate-800/60 p-3 border border-sand-border dark:border-slate-700/60">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-relaxed">
                    {meta.dimension}
                  </p>
                </div>

                {/* 版块内部分级说明 */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                  <LayersIcon className="size-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{meta.levelStructure}</span>
                </div>
              </div>

              {/* 底部资源状态与进入按钮 */}
              <div className="mt-4 pt-3 border-t border-sand-border dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-muted-foreground truncate max-w-[160px]">
                  {stat?.label || meta.summary}
                </span>

                <span className="inline-flex items-center gap-0.5 font-black text-sun-orange group-hover:translate-x-1 transition-transform shrink-0">
                  <span>进入{meta.name}</span>
                  <ChevronRightIcon className="size-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
