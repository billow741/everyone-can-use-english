import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ParentDashboardSection from "@renderer/components/phonics/parent-dashboard-section";
import { PhonemeSyncPill } from "@renderer/components/phonics/phoneme-sync-pill";
import { Button } from "@renderer/components/ui";
import { ChevronLeftIcon, HeartHandshakeIcon } from "lucide-react";
import {
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  syncLocalPhonemesToCloud,
} from "@renderer/lib/phoneme-data";

export default function PhonemesParentPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribePhonemeMastery((state) => {
      if (typeof state.isSyncing === "boolean") setIsSyncing(state.isSyncing);
      if (typeof state.isOnline === "boolean") setIsOnline(state.isOnline);
    });

    setIsSyncing(true);
    fetchPhonemesCloudProgress().then((state) => {
      setIsOnline(state.isOnline);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncLocalPhonemesToCloud();
      setIsOnline(res.isOnline);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 pt-4 sm:py-6 sm:px-6 lg:px-8 space-y-6 pb-44 min-[1280px]:pb-16">
      {/* 顶部家长信任锚深蓝标题栏 */}
      <div className="rounded-[20px] bg-trust-blue text-white p-5 sm:p-6 shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
          <Link to="/phonemes">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] px-3.5 rounded-[12px] gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none cursor-pointer"
            >
              <ChevronLeftIcon className="size-4" />
              <span>返回音素卡</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-[10px] bg-white/15 text-white flex items-center justify-center shrink-0">
              <HeartHandshakeIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                家长看板
              </h1>
              <p className="text-xs text-white/85 font-normal">
                39 音素练习进度、证据达标情况、可拼读词量与家庭辅导提示
              </p>
            </div>
          </div>
        </div>

        <PhonemeSyncPill
          variant="trust"
          isSyncing={isSyncing}
          isOnline={isOnline}
          onClick={handleManualSync}
          className="self-start sm:self-auto"
        />
      </div>

      {/* 复用 ParentDashboardSection 组件 */}
      <ParentDashboardSection />
    </div>
  );
}
