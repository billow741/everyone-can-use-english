// 阳光桥少儿英语 · 四级入口卡陈列组件 (Level Entry Cards)
// 复用于主页 (home.tsx) 与 体系课程页 (courses/index.tsx)
// 依据工单 C 规范：一字不改照抄出口标准，动态汇总资源构成，展示真实进度

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ORDERED_LEVELS,
  LEVEL_METAS,
  LevelKey,
  useLevelRegistry,
  getLevelResourceSummary,
  calculateLevelProgress,
  determineCurrentLevel,
  LevelProgressInfo,
} from "@renderer/lib/level-registry";
import { Progress, Badge } from "@renderer/components/ui";
import {
  SparklesIcon,
  ChevronRightIcon,
  CheckCircle2Icon,
  BookOpenIcon,
  LayersIcon,
} from "lucide-react";

export interface LevelEntryCardsProps {
  className?: string;
  currentLevelOverride?: LevelKey;
}

export const LevelEntryCards: React.FC<LevelEntryCardsProps> = ({
  className = "",
  currentLevelOverride,
}) => {
  const { resources, loading } = useLevelRegistry();

  // 计算四级各自进度
  const progressMap = useMemo(() => {
    const map: Record<LevelKey, LevelProgressInfo> = {
      a0: calculateLevelProgress("a0", resources),
      a1: calculateLevelProgress("a1", resources),
      a2: calculateLevelProgress("a2", resources),
      b1: calculateLevelProgress("b1", resources),
    };
    return map;
  }, [resources]);

  // 推导当前正在学级别
  const currentLevel = useMemo(() => {
    if (currentLevelOverride) return currentLevelOverride;
    return determineCurrentLevel(progressMap);
  }, [currentLevelOverride, progressMap]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="size-3 rounded-full bg-amber-500 shadow-xs" />
          <h2 className="text-base font-black tracking-wide text-foreground">
            🎯 阳光英语四级进阶阶梯
          </h2>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          级别先行 · 每级专属出口标准
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ORDERED_LEVELS.map((key) => {
          const meta = LEVEL_METAS[key];
          const summary = getLevelResourceSummary(key, resources);
          const prog = progressMap[key];
          const isCurrent = key === currentLevel;
          const isFinished = prog.percentage === 100 && prog.total > 0;

          return (
            <Link
              key={key}
              to={`/levels/${key}`}
              className={`group relative flex flex-col justify-between rounded-3xl border-2 p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl bg-white dark:bg-slate-900 ${
                isCurrent
                  ? `${meta.borderColor} ring-2 ring-amber-400/40 shadow-md`
                  : "border-amber-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400"
              }`}
            >
              <div>
                {/* 顶部标签行：级别标识 + CEFR + 当前级/已通关标记 */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${meta.badgeBg}`}
                    >
                      {meta.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {meta.cefr}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                        <SparklesIcon className="size-3 fill-slate-950" />
                        正在学
                      </span>
                    )}
                    {isFinished && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2Icon className="size-3 text-emerald-600" />
                        已过关
                      </span>
                    )}
                  </div>
                </div>

                {/* 出口标准一句话（附录文案，一字不改） */}
                <div className="my-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-700/60">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-relaxed">
                    🎯 出口标准：{meta.outcome}
                  </p>
                </div>

                {/* 资源构成一行（注册表按级汇总，不手写数字） */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                  <BookOpenIcon className="size-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{summary}</span>
                </div>
              </div>

              {/* 底部进度条与直达按钮 */}
              <div className="mt-5 pt-3.5 border-t border-amber-100/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>{prog.label}</span>
                  <span className="font-black text-slate-700 dark:text-slate-200">
                    {prog.percentage}%
                  </span>
                </div>

                <Progress
                  value={prog.percentage}
                  className="h-2 rounded-full bg-amber-100 dark:bg-slate-800"
                />

                <div className="flex items-center justify-end pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>进入{meta.name}</span>
                    <ChevronRightIcon className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
