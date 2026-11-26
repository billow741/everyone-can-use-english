import React from "react";
import { Link } from "react-router-dom";
import { SparklesIcon } from "lucide-react";
import { FamilySampleSection } from "@renderer/components/phonics/family-sample";

export default function FamiliesIndex() {
  return (
    <div className="min-h-full px-4 pt-4 sm:py-6 pb-44 min-[1280px]:pb-8 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 轻量页头 */}
      <div className="relative overflow-hidden rounded-[20px] bg-white dark:bg-card border border-[#D3E4DE] p-5 sm:p-8 shadow-none">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#E7F2EF] text-[#123B3C] border border-[#D3E4DE]">
              <SparklesIcon className="size-3.5 text-[#96690A]" />
              <span>词族乐园 · Word Families</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#123B3C] dark:text-foreground">
              词族乐园 · 自然拼读
            </h1>
            <p className="text-sm sm:text-base text-[#4E6B69] dark:text-muted-foreground font-medium">
              五步学一个词族：学韵脚 → 拼词 → 听辨 → 跟读 → 复习
            </p>
          </div>

          <Link
            to="/phonemes"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-[14px] bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white shadow-none font-bold text-xs sm:text-sm transition-all shrink-0 self-start md:self-auto"
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
