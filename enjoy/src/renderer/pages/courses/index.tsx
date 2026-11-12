// 阳光桥少儿英语 · 课程总览页 (Courses Index)
// 依据工单 G 规范：按七大核心资源版块分组，与主页复用同一组件 (SectionEntryCards)
// 底部追加开口工具常驻卡（AI 发音纠错：自由测一测、专项练完复测）

import React from "react";
import { Link } from "react-router-dom";
import { SectionEntryCards } from "@renderer/components/sections";
import { SparklesIcon, MicIcon, ChevronRightIcon } from "lucide-react";

export default function CoursesIndex() {
  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-16">
      {/* 顶部 Hero 提示 */}
      <div className="relative overflow-hidden rounded-[20px] bg-warm-paper border border-sand-border text-ink p-6 sm:p-8 shadow-none">
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-sand-border text-xs font-black text-warm-muted">
            <SparklesIcon className="size-3.5 text-yellow-500 animate-pulse" />
            阳光桥少儿英语 · 资源先行体系
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
            七大核心版块 · 资源先行
          </h1>
          <p className="text-warm-muted/90 text-xs sm:text-sm leading-relaxed font-medium">
            先按资源分版块，每版块内再分等级学习。自然拼读、听故事、环球漫游、情景对话、VOA听力、伊索寓言与绘本全闭环！
          </p>
        </div>
      </div>

      {/* 七大版块入口卡列表：与主页复用同一注册表组件 */}
      <div className="pt-2">
        <SectionEntryCards />
      </div>

      {/* 底部开口工具常驻卡：AI 发音纠错 */}
      <div className="pt-2">
        <Link
          to="/pronunciation_assessments"
          data-testid="courses-tool-pronunciation"
          className="group block rounded-[14px] border border-sand-border dark:border-orange-950 bg-white dark:bg-slate-900 p-5 sm:p-6 transition-all hover:border-sun-orange shadow-none card-hover-lift"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-warm-paper dark:bg-orange-900/40 text-sun-orange border border-sand-border flex items-center justify-center shrink-0">
                <MicIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                    开口工具
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors">
                    AI 发音纠错
                  </h3>
                </div>
                <p className="text-xs font-bold text-orange-800/90 dark:text-orange-300">
                  自由测一测 · 专项练完复测
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  随时随地录入单词或整句，多维度声学音素纠偏，专项练习后复测验证发音进步。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-black text-orange-700 dark:text-orange-400 shrink-0 self-end sm:self-center">
              <span>立即测一测</span>
              <ChevronRightIcon className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
