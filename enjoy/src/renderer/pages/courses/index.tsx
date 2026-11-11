// 阳光桥少儿英语 · 课程总览页 (Courses Index)
// 依据工单 C 规范：内容＝四级入口列表，与主页四卡复用同一组件 (LevelEntryCards)

import React from "react";
import { LevelEntryCards } from "@renderer/components/levels/level-entry-cards";
import { SparklesIcon, LayersIcon } from "lucide-react";

export default function CoursesIndex() {
  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* 顶部 Hero 提示 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 sm:p-8 shadow-xl shadow-orange-500/10">
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black text-amber-100">
            <SparklesIcon className="size-3.5 text-yellow-300 animate-pulse" />
            阳光桥少儿英语 · 分级进阶体系课
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
            四大进阶阶梯 · 级别先行
          </h1>
          <p className="text-amber-100/90 text-xs sm:text-sm leading-relaxed font-medium">
            从自然拼读启蒙到高级长篇思辨，每级设立清晰出口标准与沉浸式资源闭环，点进哪级学哪级！
          </p>
        </div>
      </div>

      {/* 四级入口卡列表：与主页四卡复用同一组件 */}
      <div className="pt-2">
        <LevelEntryCards />
      </div>
    </div>
  );
}
