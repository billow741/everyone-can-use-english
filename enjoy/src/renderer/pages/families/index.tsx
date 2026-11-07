import React from "react";
import { Link } from "react-router-dom";
import { SparklesIcon } from "lucide-react";
import { FamilySampleSection } from "@renderer/components/phonics/family-sample";

export default function FamiliesIndex() {
  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 轻量页头 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-emerald-500/15 border-2 border-amber-400/40 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-400/40 shadow-2xs">
              <SparklesIcon className="size-3.5 text-amber-600 dark:text-amber-300" />
              <span>🦁 词族乐园 · Word Families</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              词族乐园 · 自然拼读
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">
              五步学一个词族：学韵脚 → 拼词 → 听辨 → 跟读 → 复习
            </p>
          </div>

          <Link
            to="/phonemes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300/60 shadow-xs font-black text-xs sm:text-sm transition-all hover:scale-102 active:scale-95 shrink-0 self-start md:self-auto"
          >
            <span>先去 39 音素卡热身 →</span>
          </Link>
        </div>
      </div>

      {/* 页头之下渲染 FamilySampleSection */}
      <FamilySampleSection />
    </div>
  );
}
