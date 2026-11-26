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
    <div className="mt-6 rounded-[14px] border border-trust-blue/20 bg-white p-4 sm:p-5 space-y-4 shadow-none">
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-trust-blue text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">学情报告摘要</span>
          <span className="text-[11px] text-white/80 font-normal">进度由孩子点卡与标记自动记录</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-white/15 text-white/95">
          学情速览
        </span>
      </div>

      {masteredCount === 0 ? (
        <div className="p-5 rounded-[14px] bg-[#E7F2EF] border border-[#D3E4DE] text-center space-y-2.5 shadow-none">
          <p className="text-sm font-bold text-[#123B3C]">还没开始点读</p>
          <p className="text-xs text-[#4E6B69] font-normal">
            点任意一张音素卡，听听第一个音——学会的音会自动记到这里，能拼出的词也会越来越多。
          </p>
          <button
            type="button"
            onClick={() => document.querySelector("[data-phoneme-card]")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="px-4 py-2 rounded-lg bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] text-xs font-bold shadow-none cursor-pointer"
          >
            去点第一张卡 ↑
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-trust-blue/5 border border-trust-blue/20 text-center">
              <div className="text-[11px] font-bold text-trust-blue">已点亮勋章</div>
              <div className="text-lg font-bold text-ink font-mono mt-0.5">
                {PHONICS_ISLAND_BADGES.filter((b) => {
                  const zItems = b.zone === "all" ? PHONICS_ISLAND_39_ANCHORS : PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === b.zone);
                  return zItems.filter((a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])).length >= b.requiredCount;
                }).length} / 5
              </div>
              <div className="text-[10px] text-[#4E6B69]">全岛荣誉</div>
            </div>

            <div className="p-3 rounded-lg bg-trust-blue/5 border border-trust-blue/20 text-center">
              <div className="text-[11px] font-bold text-trust-blue">待掌握音素</div>
              <div className="text-lg font-bold text-ink font-mono mt-0.5">
                {pendingList.length}
              </div>
              <div className="text-[10px] text-[#4E6B69]">计划中</div>
            </div>

            <div className="p-3 rounded-lg bg-trust-blue/5 border border-trust-blue/20 text-center">
              <div className="text-[11px] font-bold text-trust-blue">可拼读词量</div>
              <div className="text-lg font-bold text-[#123B3C] font-mono mt-0.5">
                {decodableCount === null ? "…" : decodableCount}
              </div>
              <div className="text-[10px] text-[#4E6B69]">1,236 词库真实测算</div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-[#D3E4DE]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-foreground flex items-center gap-1.5">
                <AlertCircleIcon className="size-4 text-primary" />
                <span>还没点亮的音素 ({pendingList.length})</span>
              </h3>
              <span className="text-[10px] text-muted-foreground font-semibold">点标签直达音素页 · 掌握为孩子自评标记</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {pendingList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/phonemes/${item.ipaSlug}`)}
                  className="px-3 py-1.5 min-h-9 text-xs font-mono font-bold tabular-nums bg-card hover:bg-[#E7F2EF] text-foreground border border-border rounded-lg transition-all cursor-pointer shadow-none hover:border-primary"
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

      {/* 敢敢圆形头像落款 (仅圆形头像，不出现半身像) */}
      <div className="pt-2 flex items-center justify-between border-t border-[#D3E4DE] text-xs text-[#4E6B69]">
        <div className="flex items-center gap-2">
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-6 rounded-full object-cover border border-[#D3E4DE]"
          />
          <span className="font-bold text-trust-blue">SunnyBridge 家长伴学指南</span>
        </div>
        <span className="text-[11px]">坚持每日 8 分钟，拼读自然掌握</span>
      </div>
    </div>
  );
}