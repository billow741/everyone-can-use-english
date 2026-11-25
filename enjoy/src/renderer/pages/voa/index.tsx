// 阳光桥少儿英语 · VOA听力版块分级页 (/voa)
// 依据工单 G · IA 翻转：VOA 播的是慢速英语学习材料、不是新闻，不叫“听新闻”，保留“VOA听力”
// 依据工单 D-04b：原生三档全量真课上线（L1 52 / L2 29 / Anna 15，共 96 课），可点击进入通用播放器

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RadioIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  LayersIcon,
  ClockIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@renderer/components/ui";
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

interface VoaTier {
  id: "l1" | "l2" | "anna";
  code: string;
  name: string;
  subtitle: string;
  desc: string;
  badge: string;
  badgeBg: string;
}

const VOA_TIERS: VoaTier[] = [
  {
    id: "l1",
    code: "Level 1",
    name: "L1 初级慢速听力",
    subtitle: "基础句型 · 慢速语流 · 日常高频词汇",
    desc: "每分钟 100 词标准慢速英语，短句清晰，适合初级学员打牢泛听与听音辨义基石。",
    badge: "初级慢速",
    badgeBg: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200",
  },
  {
    id: "l2",
    code: "Level 2",
    name: "L2 进阶慢速听力",
    subtitle: "复合句型 · 丰富语汇 · 叙事与对话",
    desc: "每分钟 120 词适度慢速英语，涵盖趣味百科、生活故事与实用双语交流。",
    badge: "进阶慢速",
    badgeBg: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200",
  },
  {
    id: "anna",
    code: "Anna 专栏",
    name: "Anna 英语生活专栏",
    subtitle: "情景叙事 · 真实生活 · 欧美文化浸润",
    desc: "跟随主持人 Anna 的生活探险脚步，沉浸于真实生动的美语生活情景短剧。",
    badge: "情景专栏",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200",
  },
];

export default function VoaIndex() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [chapters, setChapters] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const tiersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCatalog().then((cat) => {
      if (cat) {
        const voaBook = cat.books.find((b) => b.book === "voa");
        if (voaBook) {
          setChapters(voaBook.chapters);
        }
      }
      setLoading(false);
    });
  }, []);

  const displayedTiers = VOA_TIERS.filter(
    (t) => selectedTier === "all" || t.id === selectedTier
  );

  useCardStagger(tiersRef, "div[data-testid^='voa-tier-']", [loading, displayedTiers.length]);

  return (
    <div
      data-testid="voa-index-page"
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

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-100/80 text-teal-900 border border-teal-300/50">
          慢速英语泛听 · 原生三档
        </span>
      </div>

      {/* 顶部 Hero 提示 */}
      <div className="relative overflow-hidden rounded-[20px] bg-warm-paper border border-sand-border text-ink p-6 sm:p-8 shadow-none">
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-sand-border text-xs font-black text-warm-muted">
            <RadioIcon className="size-3.5 text-teal-600 animate-pulse" />
            阳光桥少儿英语 · VOA 慢速英语
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
            VOA听力 · 原生三档慢速文库
          </h1>
          <p className="text-warm-muted/90 text-xs sm:text-sm leading-relaxed font-medium">
            VOA 播的是慢速英语学习材料（不是新闻报道）。纯正美式原声发音、标准语速与逐句精读，原生三档 96 课已全量上线！
          </p>
        </div>
      </div>

      {/* 三档切换 Pills */}
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
          全部档位 (3 档)
        </button>
        {VOA_TIERS.map((t) => (
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

      {/* 三档分组陈列 */}
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
              isChapterFinished("voa", c.chapter)
            ).length;

            return (
              <div
                key={tier.id}
                data-testid={`voa-tier-${tier.id}`}
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
                    已听完 {tierDoneCount}/{tierChapters.length} 课
                  </span>
                </div>

                {/* 档位卡 */}
                <div className="rounded-[14px] border border-sand-border dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-warm-paper dark:bg-slate-800 border border-sand-border text-teal-600 flex items-center justify-center shrink-0">
                      <RadioIcon className="size-6" />
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

                  {/* 课程列表 */}
                  <div className="divide-y divide-sand-border dark:divide-slate-800 border border-sand-border dark:border-slate-800 rounded-xl overflow-hidden bg-sand-paper/20 dark:bg-slate-900/60">
                    {tierChapters.map((ch) => {
                      const done = isChapterFinished("voa", ch.chapter);
                      return (
                        <Link
                          key={ch.chapter}
                          to={`/listening/voa/${ch.chapter}`}
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
                              {ch.title_en}
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
