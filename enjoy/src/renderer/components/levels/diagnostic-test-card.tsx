// 阳光桥少儿英语 · 诊断测「筹备中」占位卡与弹窗组件
// 依据工单 G 规范：平移现有诊断测入口，入口挂各版块发音区第一位
// 文案与“只测不锁”口径严格不变，本单不做诊断测题库

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@renderer/components/ui";
import { StethoscopeIcon, ChevronRightIcon } from "lucide-react";

export interface DiagnosticTestCardProps {
  levelCode?: "A0" | "A1" | "A2" | "B1" | string;
  className?: string;
}

export const DiagnosticTestCard: React.FC<DiagnosticTestCardProps> = ({
  levelCode = "A0",
  className = "",
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="diagnostic-test-card"
        className={`group relative w-full text-left flex flex-col justify-between rounded-[20px] border border-dashed border-[#D3E4DE] bg-white dark:bg-slate-900/50 p-4 sm:p-5 transition-all hover:border-[#0F7B7A] shadow-none cursor-pointer card-hover-lift ${className}`}
      >
        <div className="w-full">
          <div className="flex items-center justify-between gap-1.5 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F2EF] dark:bg-slate-800 border border-[#D3E4DE] px-2.5 py-0.5 text-[10px] font-black text-[#123B3C] dark:text-slate-200 whitespace-nowrap shrink-0">
              <StethoscopeIcon className="size-3 text-[#0F7B7A] shrink-0" />
              <span>第 1 课 · 诊断</span>
            </span>
            <span
              data-testid="diagnostic-preparing-badge"
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F2A93B]/15 border border-[#F2A93B]/40 text-[10px] font-black text-[#96690A] dark:text-amber-300 whitespace-nowrap shrink-0"
            >
              筹备中
            </span>
          </div>

          <div className="flex items-center gap-3 my-2">
            <div className="size-10 sm:size-11 rounded-[8px] bg-[#E7F2EF] dark:bg-slate-800 border border-[#D3E4DE] flex items-center justify-center text-[#0F7B7A] shrink-0">
              <StethoscopeIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-[#123B3C] dark:text-slate-100 leading-snug">
                {levelCode} 级别诊断测
              </h3>
              <p className="text-xs text-[#4E6B69] dark:text-muted-foreground mt-0.5 leading-snug">
                专属发音与朗读能力诊断，只测不锁
              </p>
            </div>
          </div>
        </div>

        <div className="w-full mt-3 pt-2.5 border-t border-[#D3E4DE] dark:border-slate-800 flex items-center justify-between text-xs font-black text-[#96690A] dark:text-amber-300">
          <span className="whitespace-nowrap">内容分批上线</span>
          <ChevronRightIcon className="size-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StethoscopeIcon className="size-5 text-[#96690A] dark:text-amber-300" />
              <span>{levelCode} · 级别诊断测</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-center sm:text-left">
            <div className="size-14 rounded-[14px] bg-[#E7F2EF] dark:bg-slate-800 text-[#0F7B7A] border border-[#D3E4DE] flex items-center justify-center mx-auto sm:mx-0">
              <StethoscopeIcon className="size-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#123B3C] dark:text-slate-100">
                诊断测筹备中
              </h3>
              <p className="text-xs text-[#4E6B69] dark:text-muted-foreground mt-1.5 leading-relaxed">
                按照总体规划（决策 2），每级入口第一课为专属能力诊断测（只测不锁）。当前题库正在出题校准中，即将分批上线，敬请期待！
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setOpen(false)}
                className="min-h-[44px] px-5 rounded-[14px] font-bold bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white"
              >
                我知道了
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
