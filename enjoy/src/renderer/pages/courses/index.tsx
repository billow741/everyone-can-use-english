// 阳光桥少儿英语 · 课程总览页 (Courses Index)
// 依据工单 C 规范：内容＝四级入口列表，与主页四卡复用同一组件 (LevelEntryCards)
// 依据工单 C 修订轮 R6：底部追加发音纠错舱常驻卡（自由测一测、专项练完复测）

import React from "react";
import { Link } from "react-router-dom";
import { LevelEntryCards } from "@renderer/components/levels/level-entry-cards";
import { SparklesIcon,
  MicIcon, ChevronRightIcon } from "lucide-react";

export default function CoursesIndex() {
  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-16">
      {/* 顶部 Hero 提示 */}
      <div className="relative overflow-hidden rounded-[20px] bg-[#FFF9EF] border border-[#F0DFC0] text-[#2E211A] p-6 sm:p-8 shadow-none">
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#F0DFC0] text-xs font-black text-[#8A7A68]">
            <SparklesIcon className="size-3.5 text-yellow-300 animate-pulse" />
            阳光桥少儿英语 · 分级进阶体系课
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2E211A]">
            四大进阶阶梯 · 级别先行
          </h1>
          <p className="text-[#8A7A68]/90 text-xs sm:text-sm leading-relaxed font-medium">
            从自然拼读启蒙到高级长篇思辨，每级设立清晰出口标准与沉浸式资源闭环，点进哪级学哪级！
          </p>
        </div>
      </div>

      {/* 四级入口卡列表：与主页四卡复用同一组件 */}
      <div className="pt-2">
        <LevelEntryCards />
      </div>

      {/* 底部开口工具常驻卡：AI 发音纠错舱（R6 追加） */}
      <div className="pt-2">
        <Link
          to="/pronunciation_assessments"
          className="group block rounded-[14px] border border-[#F0DFC0] dark:border-orange-950 bg-white dark:bg-slate-900 p-5 sm:p-6 transition-all hover:border-[#F5820B] shadow-none"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-[#FFF9EF] dark:bg-orange-900/40 text-[#F5820B] border border-[#F0DFC0] flex items-center justify-center shrink-0">
                <MicIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                    开口工具
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors">
                    AI 发音纠错舱
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
