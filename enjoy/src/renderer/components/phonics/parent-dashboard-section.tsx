import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircleIcon } from "lucide-react";
import {
  PHONICS_ISLAND_39_ANCHORS,
  PHONICS_ISLAND_BADGES,
} from "@renderer/lib/phoneme-anchors";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
} from "@renderer/lib/phoneme-data";
import { countDecodableWithMastered } from "@renderer/lib/open-phonics-service";

export default function ParentDashboardSection() {
  const navigate = useNavigate();
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());
  const [decodableCount, setDecodableCount] = useState<number | null>(null);

  useEffect(() => {
    const unsub = subscribePhonemeMastery((state) => {
      setMasteryMap(state.masteryMap);
    });
    fetchPhonemesCloudProgress().then((state) => {
      setMasteryMap(state.masteryMap);
    });
    return () => unsub();
  }, []);

  const masteredAnchors = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (p) => masteryMap[p.id] || (p.ipaSlug && masteryMap[p.ipaSlug])
    );
  }, [masteryMap]);

  const masteredCount = masteredAnchors.length;

  const pendingList = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (a) => !masteryMap[a.id] && (!a.ipaSlug || !masteryMap[a.ipaSlug])
    );
  }, [masteryMap]);

  useEffect(() => {
    let mounted = true;
    const slugs = new Set(masteredAnchors.map((a) => a.ipaSlug));
    countDecodableWithMastered(slugs).then((n) => {
      if (mounted) setDecodableCount(n);
    });
    return () => {
      mounted = false;
    };
  }, [masteredAnchors]);

  return (
    <div className="mt-10 rounded-3xl border-2 border-purple-400/25 bg-purple-500/5 p-4 sm:p-5 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-base">👨‍👩‍👧</span>
        <h2 className="text-sm font-black text-foreground">给家长 · 学习小结</h2>
        <span className="text-[11px] text-muted-foreground font-medium">进度由孩子点卡与标记自动记录</span>
      </div>

      {masteredCount === 0 ? (
        <div className="p-5 rounded-2xl bg-card border border-border text-center space-y-2.5">
          <div className="text-2xl">🌱</div>
          <p className="text-sm font-black text-foreground">还没开始点读</p>
          <p className="text-xs text-muted-foreground font-medium">
            点任意一张音素卡，听听第一个音——学会的音会自动记到这里，能拼出的词也会越来越多。
          </p>
          <button
            type="button"
            onClick={() => document.querySelector("[data-phoneme-card]")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black shadow-xs cursor-pointer"
          >
            去点第一张卡 ↑
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-card border border-border text-center">
              <div className="text-[11px] font-bold text-muted-foreground">已点亮勋章</div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {PHONICS_ISLAND_BADGES.filter((b) => {
                  const zItems = b.zone === "all" ? PHONICS_ISLAND_39_ANCHORS : PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === b.zone);
                  return zItems.filter((a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])).length >= b.requiredCount;
                }).length} / 5
              </div>
              <div className="text-[10px] text-muted-foreground">全岛荣誉</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border text-center">
              <div className="text-[11px] font-bold text-muted-foreground">还没点亮</div>
              <div className="text-xl font-black text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                {pendingList.length}
              </div>
              <div className="text-[10px] text-muted-foreground">慢慢来</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border text-center">
              <div className="text-[11px] font-bold text-muted-foreground">能拼出的词</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {decodableCount === null ? "…" : decodableCount}
              </div>
              <div className="text-[10px] text-muted-foreground">1,236 词库真实计数</div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/5 border border-amber-400/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                <AlertCircleIcon className="size-4 text-amber-500" />
                <span>还没点亮的音素 ({pendingList.length})</span>
              </h4>
              <span className="text-[10px] text-muted-foreground font-semibold">点标签直达音素页 · 掌握为孩子自评标记</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {pendingList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/phonemes/${item.ipaSlug}`)}
                  className="px-2.5 py-1 text-[11px] font-mono font-bold bg-card hover:bg-amber-500/10 text-foreground border border-border rounded-full transition-all cursor-pointer shadow-3xs"
                >
                  {item.letter}{" "}
                  <span className="text-muted-foreground font-normal">
                    [{item.ipaSymbol}]
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
