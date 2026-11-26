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
import { getPhonemeUserId, getPhonemeAuthHeaders } from "@renderer/lib/phoneme-cloud-sync";
import {
  EVIDENCE_STAR_MIN_ATTEMPTS,
  EVIDENCE_STAR_MAX_ERROR_RATE,
} from "@renderer/lib/level-registry";

export default function ParentDashboardSection() {
  const navigate = useNavigate();
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());
  const [decodableCount, setDecodableCount] = useState<number | null>(null);
  const [evidenceStats, setEvidenceStats] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribePhonemeMastery((state) => {
      setMasteryMap(state.masteryMap);
    });
    fetchPhonemesCloudProgress().then((state) => {
      setMasteryMap(state.masteryMap);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let mounted = true;
    try {
      const uid = getPhonemeUserId();
      const apiBase =
        typeof window !== "undefined" && window.location.origin.includes("sunnybridge.qzz.io")
          ? ""
          : "https://app.sunnybridge.qzz.io";
      const headers = getPhonemeAuthHeaders(uid);
      fetch(`${apiBase}/api/v1/pronunciation/phoneme-stats?user_id=${encodeURIComponent(uid)}`, {
        headers,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (mounted && data?.phonemes && Array.isArray(data.phonemes)) {
            setEvidenceStats(data.phonemes);
          }
        })
        .catch(() => {});
    } catch {}
    return () => {
      mounted = false;
    };
  }, []);

  const evidenceMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of evidenceStats) {
      if (s && s.phoneme) {
        const raw = String(s.phoneme).toLowerCase().trim();
        m.set(raw, s);
        m.set(raw.replace(/[\/\[\]]/g, ""), s);
      }
    }
    return m;
  }, [evidenceStats]);

  const evidenceLitCount = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter((item) => {
      const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim();
      const slug = (item.ipaSlug || "").toLowerCase().trim();
      const id = (item.id || "").toLowerCase().trim();
      const stat = evidenceMap.get(cleanIpa) || evidenceMap.get(slug) || evidenceMap.get(id);
      const attempts = stat?.attempts ?? 0;
      const errorRate = stat?.error_rate ?? 0;
      return attempts >= EVIDENCE_STAR_MIN_ATTEMPTS && errorRate <= EVIDENCE_STAR_MAX_ERROR_RATE;
    }).length;
  }, [evidenceMap]);

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
    <div
      data-testid="parent-dashboard-section"
      className="mt-6 rounded-[20px] border border-trust-blue/20 bg-white dark:bg-card p-4 sm:p-5 space-y-4 shadow-none"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2.5 rounded-[12px] bg-trust-blue text-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white">学情报告摘要</span>
          <span className="text-[11px] text-white/85 font-normal">
            由系统跟读证据与孩子自评标记共同记录
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-white/15 text-white/95 whitespace-nowrap">
          学情速览
        </span>
      </div>

      {masteredCount === 0 && evidenceLitCount === 0 ? (
        <div className="p-5 rounded-[14px] bg-[#E7F2EF] border border-[#D3E4DE] text-center space-y-2.5 shadow-none">
          <p className="text-sm font-bold text-[#123B3C]">还没开始点读与跟读</p>
          <p className="text-xs text-[#4E6B69] font-normal">
            点任意一张音素卡听纯音并开口跟读——系统记录到足够次数的达标跟读后会点亮证据星，能拼出的词也会越来越多。
          </p>
          <button
            type="button"
            onClick={() => document.querySelector("[data-phoneme-card]")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="min-h-[44px] px-4 py-2.5 rounded-[12px] bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] text-xs font-bold shadow-none cursor-pointer"
          >
            去点第一张卡 ↑
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center">
              <div className="text-[11px] font-bold text-trust-blue">证据达标</div>
              <div className="text-lg font-bold text-[#123B3C] font-mono mt-0.5">
                {evidenceLitCount} / 39
              </div>
              <div className="text-[10px] text-[#4E6B69]">系统评测 ≥{EVIDENCE_STAR_MIN_ATTEMPTS} 次达标</div>
            </div>

            <div className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center">
              <div className="text-[11px] font-bold text-trust-blue">已点亮勋章</div>
              <div className="text-lg font-bold text-[#123B3C] font-mono mt-0.5">
                {PHONICS_ISLAND_BADGES.filter((b) => {
                  const zItems = b.zone === "all" ? PHONICS_ISLAND_39_ANCHORS : PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === b.zone);
                  return zItems.filter((a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])).length >= b.requiredCount;
                }).length} / 5
              </div>
              <div className="text-[10px] text-[#4E6B69]">自评里程碑</div>
            </div>

            <div className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center">
              <div className="text-[11px] font-bold text-trust-blue">待达标音素</div>
              <div className="text-lg font-bold text-[#123B3C] font-mono mt-0.5">
                {pendingList.length}
              </div>
              <div className="text-[10px] text-[#4E6B69]">待点亮练习</div>
            </div>

            <div className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center">
              <div className="text-[11px] font-bold text-trust-blue">可拼读词量</div>
              <div className="text-lg font-bold text-[#123B3C] font-mono mt-0.5">
                {decodableCount === null ? "…" : decodableCount}
              </div>
              <div className="text-[10px] text-[#4E6B69]">1,236 词库测算</div>
            </div>
          </div>

          <div className="p-3.5 rounded-[14px] bg-white border border-[#D3E4DE]">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="text-xs font-black text-[#123B3C] flex items-center gap-1.5">
                <AlertCircleIcon className="size-4 text-[#0F7B7A]" />
                <span>还没点亮自评的音素 ({pendingList.length})</span>
              </h3>
              <span className="text-[10px] text-[#4E6B69] font-semibold">
                点标签直达音素页 · 区分系统证据达标与孩子自评标记
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {pendingList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/phonemes/${item.ipaSlug}`)}
                  className="min-h-[44px] px-3.5 py-2 text-xs font-mono font-bold tabular-nums bg-[#F3FAF8] hover:bg-[#E7F2EF] text-[#123B3C] border border-[#D3E4DE] rounded-[10px] transition-all cursor-pointer shadow-none hover:border-[#0F7B7A]"
                >
                  {item.letter}{" "}
                  <span className="text-[#4E6B69] font-normal">
                    {item.ipaSymbol}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 敢敢圆形头像落款 */}
      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-[#D3E4DE] text-xs text-[#4E6B69]">
        <div className="flex items-center gap-2">
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-6 rounded-full object-cover border border-[#D3E4DE]"
          />
          <span className="font-bold text-trust-blue">SunnyBridge 家长伴学指南</span>
        </div>
        <span className="text-[11px]">坚持每日 8 分钟，拼读能力稳步积累</span>
      </div>
    </div>
  );
}
