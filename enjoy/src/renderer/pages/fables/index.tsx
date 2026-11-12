// 阳光桥少儿英语 · 伊索寓言版块页 (/fables)
// 依据工单 G · IA 翻转：伊索寓言每天一则、四级之外
// 无数据时严格显示占位文案「筹备中」，不编造任何假内容

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ScrollIcon, SparklesIcon } from "lucide-react";
import { Button } from "@renderer/components/ui";
import { DailyFableCard } from "@renderer/components/levels/daily-fable-card";

export default function FablesIndex() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-7 pb-20">
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
    </div>
  );
}
