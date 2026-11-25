// 阳光桥少儿英语 · 伊索寓言版块页 (/fables)
// 依据工单 G · IA 翻转：伊索寓言每天一则、四级之外
// 依据工单 D-04d：全量 143 则接线（A1 73 / A2 70），仿 VOA 档位结构，点则进通用播放器

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ScrollIcon,
  ChevronRightIcon,
  LayersIcon,
  ClockIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@renderer/components/ui";
import { DailyFableCard } from "@renderer/components/levels/daily-fable-card";
import { loadCatalog, isChapterFinished } from "@renderer/lib/listening-sync";
import type { CatalogEntry } from "@renderer/pages/listening/types";
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

interface FableTier {
  id: "a1" | "a2";
  code: string;
  name: string;
  subtitle: string;
  desc: string;
  badge: string;
  badgeBg: string;
}

const FABLE_TIERS: FableTier[] = [
  {
    id: "a1",
    code: "Level A1",
    name: "A1 基础寓言",
    subtitle: "经典短篇 · 基础句型 · 生动寓意",
    desc: "篇幅简短、句式明晰的经典寓言，适合低阶泛听与语感启蒙（73 则）。",
    badge: "A1 基础",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200",
  },
  {
    id: "a2",
    code: "Level A2",
    name: "A2 进阶寓言",
    subtitle: "情节丰富 · 复合语汇 · 哲理深长",
    desc: "涵盖多角色对话与稍长篇幅的精彩故事，拓展高频词汇与思维表达（70 则）。",
    badge: "A2 进阶",
    badgeBg: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200",
  },
];

export default function FablesIndex() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [chapters, setChapters] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const tiersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCatalog().then((cat) => {
      if (cat) {
        const fablesBook = cat.books.find((b) => b.book === "fables");
        if (fablesBook) {
          setChapters(fablesBook.chapters);
        }
      }
      setLoading(false);
    });
  }, []);

  const displayedTiers = FABLE_TIERS.filter(
    (t) => selectedTier === "all" || t.id === selectedTier
  );

  useCardStagger(tiersRef, "div[data-testid^='fables-tier-']", [loading, displayedTiers.length]);

  return (
    <div
      data-testid="fables-index-page"
      className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-7 pb-20"
    >
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 font-bold text-slate-600 hover:bg-amber-100/60 hover:text-slate-900"
        >
          <ArrowLeftIcon className="size-4" />
          <span>返回主页</span>
        </Button>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100/80 text-purple-900 border border-purple-300/50">
          每日一则 · 四级之外
        </span>
      </div>

      {/* 顶部 Hero 提示 */}
      <div className="relative overflow-hidden rounded-[20px] bg-warm-paper border border-sand-border text-ink p-6 sm:p-8 shadow-none">
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-sand-border text-xs font-black text-warm-muted">
            <ScrollIcon className="size-3.5 text-purple-600 animate-pulse" />
            阳光桥少儿英语 · 伊索寓言微剧场
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
            伊索寓言 · 每日一则哲理微剧场
          </h1>
          <p className="text-warm-muted/90 text-xs sm:text-sm leading-relaxed font-medium">
            精选原版双语伊索寓言，配纯正原声与童趣动画。每天一则独立短篇，不受等级限制，寓教于乐、点亮智慧！
          </p>
        </div>
      </div>

      {/* 每日一则常驻卡与展示位 */}
      <div className="space-y-4">
        <DailyFableCard />
      </div>

      {/* 两档切换 Pills */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-sand-border">
        <span className="text-xs font-black text-muted-foreground mr-1 flex items-center gap-1">
          <LayersIcon className="size-3.5 text-sun-orange" />
          档位筛选：
        </span>
        <button
          onClick={() => setSelectedTier("all")}
          className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
            selectedTier === "all"
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "text-slate-600 hover:text-slate-950 hover:bg-amber-100/50"
          }`}
        >
          全部档位 (2 档)
        </button>
        {FABLE_TIERS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTier(t.id)}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
              selectedTier === t.id
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-950 hover:bg-amber-100/50"
            }`}
          >
            {t.code}
          </button>
        ))}
      </div>

      {/* 两档分组陈列 */}
      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3">
          <Loader2Icon className="size-6 animate-spin text-sun-orange" />
          <span className="text-muted-foreground text-sm font-medium">加载课程中…</span>
        </div>
      ) : (
        <div ref={tiersRef} className="space-y-6">
          {displayedTiers.map((tier) => {
            const tierChapters = chapters.filter((c) => c.level === tier.id);
            const tierDoneCount = tierChapters.filter((c) =>
              isChapterFinished("fables", c.chapter)
            ).length;

            return (
              <div
                key={tier.id}
                data-testid={`fables-tier-${tier.id}`}
                className="space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-foreground">
                      {tier.name}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${tier.badgeBg}`}
                    >
                      {tier.badge}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-warm-paper dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-sand-border">
                    已听完 {tierDoneCount}/{tierChapters.length} 则
                  </span>
                </div>

                {/* 档位卡 */}
                <div className="rounded-[14px] border border-sand-border dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-warm-paper dark:bg-slate-800 border border-sand-border text-purple-600 flex items-center justify-center shrink-0">
                      <ScrollIcon className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                        {tier.subtitle}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-medium">
                        {tier.desc}
                      </p>
                    </div>
                  </div>

                  {/* 寓言列表 */}
                  <div className="divide-y divide-sand-border dark:divide-slate-800 border border-sand-border dark:border-slate-800 rounded-xl overflow-hidden bg-sand-paper/20 dark:bg-slate-900/60">
                    {tierChapters.map((ch) => {
                      const done = isChapterFinished("fables", ch.chapter);
                      return (
                        <Link
                          key={ch.chapter}
                          to={`/listening/fables/${ch.chapter}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50/60 dark:hover:bg-slate-800/60 transition-colors group card-hover-lift"
                        >
                          {/* 听完状态 */}
                          {done ? (
                            <CheckCircle2Icon className="size-5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="size-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                          )}

                          {/* 章节信息 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold line-clamp-1 text-slate-900 dark:text-slate-100 group-hover:text-sun-orange transition-colors">
                              {ch.title_zh ? `${ch.title_zh} · ${ch.title_en}` : ch.title_en}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-medium">
                              <ClockIcon className="size-3" />
                              <span>{formatDuration(ch.duration)}</span>
                              <span>·</span>
                              <span>{ch.sentence_count} 句</span>
                            </div>
                          </div>

                          <ChevronRightIcon className="size-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
