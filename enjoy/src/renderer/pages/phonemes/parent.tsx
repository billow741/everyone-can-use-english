import React from "react";
import { Link } from "react-router-dom";
import ParentDashboardSection from "@renderer/components/phonics/parent-dashboard-section";
import { Button } from "@renderer/components/ui";
import { ChevronLeftIcon, HeartHandshakeIcon, ShieldCheckIcon } from "lucide-react";

export default function PhonemesParentPage() {
  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-16">
      {/* 顶部导航与页标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/phonemes">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl gap-1 text-xs font-bold"
            >
              <ChevronLeftIcon className="size-4" />
              <span>返回音素岛</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-2xs">
              <HeartHandshakeIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">
                家长看板
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                39 音素掌握全景、可拼读词量测算与家庭辅导提示
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-400/30 self-start sm:self-auto">
          <ShieldCheckIcon className="size-4" />
          <span>本地与云端实时同步</span>
        </div>
      </div>

      {/* 复用现有 ParentDashboardSection 组件 */}
      <ParentDashboardSection />
    </div>
  );
}
