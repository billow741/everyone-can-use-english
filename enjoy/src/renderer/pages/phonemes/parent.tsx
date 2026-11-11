import React from "react";
import { Link } from "react-router-dom";
import ParentDashboardSection from "@renderer/components/phonics/parent-dashboard-section";
import { Button } from "@renderer/components/ui";
import { ChevronLeftIcon, HeartHandshakeIcon, ShieldCheckIcon } from "lucide-react";

export default function PhonemesParentPage() {
  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-16">
      {/* 顶部家长信任锚深蓝标题栏 */}
      <div className="rounded-[14px] bg-[#2C4A63] text-white p-5 sm:p-6 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link to="/phonemes">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-lg gap-1 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none cursor-pointer"
            >
              <ChevronLeftIcon className="size-4" />
              <span>返回音素岛</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-white/15 text-white flex items-center justify-center shrink-0">
              <HeartHandshakeIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                家长看板
              </h1>
              <p className="text-xs text-white/80 font-normal">
                39 音素掌握全景、可拼读词量测算与家庭辅导提示
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 self-start sm:self-auto">
          <ShieldCheckIcon className="size-4 text-emerald-400" />
          <span>本地与云端实时同步</span>
        </div>
      </div>

      {/* 复用现有 ParentDashboardSection 组件 */}
      <ParentDashboardSection />
    </div>
  );
}
