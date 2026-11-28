import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ParentDashboardSection from "@renderer/components/phonics/parent-dashboard-section";
import { PhonemeSyncPill } from "@renderer/components/phonics/phoneme-sync-pill";
import { Button } from "@renderer/components/ui";
import {
  ArrowRightIcon,
  BookOpenIcon,
  ChevronLeftIcon,
  HeartHandshakeIcon,
} from "lucide-react";
import {
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  syncLocalPhonemesToCloud,
} from "@renderer/lib/phoneme-data";
import {
  getSrsStore,
  SRS_EVENT,
  SrsEntry,
  syncSrsFromCloud,
} from "@renderer/lib/vocab-srs";

interface VocabReviewOverview {
  hasRecords: boolean;
  weeklyReviewedCount: number;
  weeklyGradedCount: number;
  goodOrEasyCount: number;
  retentionRate: number | null;
  totalLearnedCount: number;
}

function getLocalWeekStartMs(now: number = Date.now()): number {
  const d = new Date(now);
  const day = d.getDay(); // 0=周日, 1=周一...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + mondayOffset,
    0,
    0,
    0,
    0
  ).getTime();
}

function computeVocabReviewOverview(
  store: Record<string, SrsEntry>,
  now: number = Date.now()
): VocabReviewOverview {
  const allEntries = Object.values(store || {}).filter(
    (entry): entry is SrsEntry => Boolean(entry && typeof entry === "object")
  );
  const reviewedEntries = allEntries.filter(
    (entry) =>
      (typeof entry.reps === "number" && entry.reps > 0) ||
      (typeof entry.lapses === "number" && entry.lapses > 0) ||
      (entry.lastGrade !== null && entry.lastGrade !== undefined)
  );

  if (reviewedEntries.length === 0) {
    return {
      hasRecords: false,
      weeklyReviewedCount: 0,
      weeklyGradedCount: 0,
      goodOrEasyCount: 0,
      retentionRate: null,
      totalLearnedCount: 0,
    };
  }

  const weekStartMs = getLocalWeekStartMs(now);
  const weeklyEntries = reviewedEntries.filter((entry) => {
    const ts = Date.parse(entry.updatedAt || "");
    return Number.isFinite(ts) && ts >= weekStartMs;
  });

  const weeklyGraded = weeklyEntries.filter(
    (entry) =>
      entry.lastGrade === "again" ||
      entry.lastGrade === "hard" ||
      entry.lastGrade === "good" ||
      entry.lastGrade === "easy"
  );
  const goodOrEasyCount = weeklyGraded.filter(
    (entry) => entry.lastGrade === "good" || entry.lastGrade === "easy"
  ).length;
  const retentionRate =
    weeklyGraded.length > 0
      ? Math.round((goodOrEasyCount / weeklyGraded.length) * 100)
      : null;

  return {
    hasRecords: true,
    weeklyReviewedCount: weeklyEntries.length,
    weeklyGradedCount: weeklyGraded.length,
    goodOrEasyCount,
    retentionRate,
    totalLearnedCount: reviewedEntries.length,
  };
}

export default function PhonemesParentPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [srsStore, setSrsStore] = useState<Record<string, SrsEntry>>(() =>
    getSrsStore()
  );

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

  useEffect(() => {
    const refreshSrs = () => setSrsStore(getSrsStore());
    window.addEventListener(SRS_EVENT, refreshSrs);
    window.addEventListener("storage", refreshSrs);
    syncSrsFromCloud()
      .then((merged) => {
        if (merged) setSrsStore(merged);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener(SRS_EVENT, refreshSrs);
      window.removeEventListener("storage", refreshSrs);
    };
  }, []);

  const vocabOverview = useMemo(
    () => computeVocabReviewOverview(srsStore),
    [srsStore]
  );

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

      {/* 独立成块：生词 SRS 复习概览（不混入音素三轨） */}
      <section
        data-testid="parent-vocab-review-section"
        aria-labelledby="parent-vocab-review-heading"
        className="rounded-[20px] border border-trust-blue/20 bg-white dark:bg-card p-4 sm:p-5 space-y-3.5 shadow-none"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-[10px] bg-trust-blue/10 text-trust-blue flex items-center justify-center shrink-0">
              <BookOpenIcon className="size-4" />
            </div>
            <div>
              <h2
                id="parent-vocab-review-heading"
                className="text-sm font-bold text-[#123B3C]"
              >
                生词间隔复习概览
              </h2>
              <p className="text-[11px] text-[#4E6B69]">
                独立于音素三轨，基于本地生词最近打分与更新时间统计
              </p>
            </div>
          </div>
          <Link
            to="/vocabulary"
            className="min-h-[36px] px-3 py-1.5 rounded-[10px] border border-[#D3E4DE] bg-[#F3FAF8] hover:bg-[#E7F2EF] text-xs font-bold text-[#123B3C] inline-flex items-center gap-1 transition-colors"
          >
            <span>查看生词本</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        {!vocabOverview.hasRecords ? (
          <div
            data-testid="parent-vocab-review-empty"
            className="rounded-[12px] border border-[#D3E4DE] bg-[#F3FAF8]/70 px-4 py-3.5 text-xs text-[#4E6B69] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <span className="font-bold text-[#123B3C]">暂无复习记录</span>
            <span>孩子在生词本完成翻卡复习后，这里将自动统计本周复习词数与留存率。</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              data-testid="parent-vocab-weekly-count"
              className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center"
            >
              <div className="text-[11px] font-bold text-trust-blue">
                本周复习词数
              </div>
              <div className="text-lg font-bold text-[#123B3C] font-mono tabular-nums mt-0.5">
                {vocabOverview.weeklyReviewedCount} 词
              </div>
              <div className="text-[10px] text-[#4E6B69]">
                本周一至今有复习记录的词
              </div>
            </div>

            <div
              data-testid="parent-vocab-retention"
              className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center"
            >
              <div className="text-[11px] font-bold text-trust-blue">
                记忆留存率
              </div>
              <div className="text-lg font-bold text-[#123B3C] font-mono tabular-nums mt-0.5">
                {vocabOverview.retentionRate !== null
                  ? `${vocabOverview.retentionRate}%`
                  : "—"}
              </div>
              <div className="text-[10px] text-[#4E6B69]">
                {vocabOverview.weeklyGradedCount > 0
                  ? `${vocabOverview.goodOrEasyCount} / ${vocabOverview.weeklyGradedCount} 词选「记得」或「太简单」`
                  : "本周暂无打分记录"}
              </div>
            </div>

            <div
              data-testid="parent-vocab-total-learned"
              className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center"
            >
              <div className="text-[11px] font-bold text-trust-blue">
                累计已复习词库
              </div>
              <div className="text-lg font-bold text-[#123B3C] font-mono tabular-nums mt-0.5">
                {vocabOverview.totalLearnedCount} 词
              </div>
              <div className="text-[10px] text-[#4E6B69]">
                已纳入复习词数
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
