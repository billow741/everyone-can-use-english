import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircleIcon } from "lucide-react";
import { Progress } from "@renderer/components/ui";
import {
  PHONICS_ISLAND_39_ANCHORS,
  PHONICS_ISLAND_ZONES,
  PHONICS_ISLAND_BADGES,
} from "@renderer/lib/phoneme-anchors";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
} from "@renderer/lib/phoneme-data";

export default function ParentDashboardSection() {
  const navigate = useNavigate();
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());

  useEffect(() => {
    const unsub = subscribePhonemeMastery((state) => {
      setMasteryMap(state.masteryMap);
    });
    fetchPhonemesCloudProgress().then((state) => {
      setMasteryMap(state.masteryMap);
    });
    return () => unsub();
  }, []);

  const masteredCount = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (p) => masteryMap[p.id] || (p.ipaSlug && masteryMap[p.ipaSlug])
    ).length;
  }, [masteryMap]);

  const pendingList = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (a) => !masteryMap[a.id] && (!a.ipaSlug || !masteryMap[a.ipaSlug])
    );
  }, [masteryMap]);

  return (
    <div className="space-y-6 mt-10">
      {/* 家长学情指标（总进度页头已有，此处只留家长视角三项） */}
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
          <div className="text-[11px] font-bold text-muted-foreground">待巩固音素</div>
          <div className="text-xl font-black text-rose-500 font-mono mt-0.5">
            {pendingList.length}
          </div>
          <div className="text-[10px] text-muted-foreground">重点突破</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border text-center">
          <div className="text-[11px] font-bold text-muted-foreground">可解码词汇</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {Math.min(1236, masteredCount * 32)}+
          </div>
          <div className="text-[10px] text-muted-foreground">1,236 词储备</div>
        </div>
      </div>

      {/* 4 大岛区深入分析雷达网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PHONICS_ISLAND_ZONES.filter((z) => z.key !== "all").map((zone) => {
          const zoneItems = PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === zone.key);
          const zoneMastered = zoneItems.filter(
            (a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])
          ).length;
          const pct = Math.round((zoneMastered / zone.count) * 100);

          return (
            <div
              key={zone.key}
              className="p-4 rounded-3xl border-2 bg-card border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{zone.icon}</span>
                <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400">
                  {zoneMastered} / {zone.count}
                </span>
              </div>
              <h3 className="text-sm font-black text-foreground">{zone.name}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {zone.description}
              </p>
              <Progress value={pct} className="h-2 rounded-full mt-3" />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold mt-1.5">
                <span>掌握度 {pct}%</span>
                <span>{zoneMastered === zone.count ? "已圆满 🌟" : `待攻克 ${zone.count - zoneMastered}`}</span>
              </div>
            </div>
          );
        })}
      </div>

          {/* 待攻克重点关注音素清单 */}
          <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-300/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                <AlertCircleIcon className="size-4 text-amber-600" />
                <span>待攻克 / 重点关注清单 ({pendingList.length})</span>
              </div>
              <span className="text-[10px] text-muted-foreground">建议亲子练习</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {pendingList.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/phonemes/${item.ipaSlug}`)}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 text-xs font-black text-slate-800 dark:text-slate-200 hover:scale-105 transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <span>{item.letter}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">[{item.ipaSymbol}]</span>
                </button>
              ))}
              {pendingList.length === 0 && (
                <div className="text-xs text-emerald-600 font-black py-2">
                  🎉 哇！孩子已攻克全部 39 个发音音素！
                </div>
              )}
            </div>
          </div>
    </div>
  );
}
