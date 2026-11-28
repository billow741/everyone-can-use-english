import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CompassIcon,
  MusicIcon,
  LayersIcon,
} from "lucide-react";
import { PHONICS_ISLAND_39_ANCHORS } from "@renderer/lib/phoneme-anchors";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
} from "@renderer/lib/phoneme-data";
import { countDecodableWithMastered } from "@renderer/lib/open-phonics-service";
import {
  getPhonemeUserId,
  getPhonemeAuthHeaders,
  getScopedKey,
} from "@renderer/lib/phoneme-cloud-sync";
import {
  EVIDENCE_STAR_MIN_ATTEMPTS,
  EVIDENCE_STAR_MAX_ERROR_RATE,
} from "@renderer/lib/level-registry";
import {
  RECOMMENDED_PHONEME_ORDER,
  getTopRecommendedPhonemes,
  isPhonemeLearnedOrLit,
} from "@renderer/lib/phonics-route-config";
import {
  getEvents,
  WORD_EXPOSURE_STORAGE_KEY,
} from "@renderer/lib/learning-events";
import { getClearCounts } from "@renderer/lib/clear-counts";
import { PHONEME_COACHING_GUIDES } from "@renderer/lib/phonetics-coach";

export default function ParentDashboardSection() {
  const navigate = useNavigate();
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );
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

  // 轨 1：自评计数（孩子/家长手动点亮，不与证据/曝光混算）
  const selfRatedAnchors = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (p) => masteryMap[p.id] || (p.ipaSlug && masteryMap[p.ipaSlug])
    );
  }, [masteryMap]);
  const selfRatedCount = selfRatedAnchors.length;

  // 轨 2：证据计数（系统评测 ≥5 次且错误率 ≤50%）
  const { evidenceLitCount, evidenceLitIds, evidenceInProgressCount } = useMemo(() => {
    let lit = 0;
    let inProg = 0;
    const litSet = new Set<string>();
    for (const item of PHONICS_ISLAND_39_ANCHORS) {
      const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim();
      const slug = (item.ipaSlug || "").toLowerCase().trim();
      const id = (item.id || "").toLowerCase().trim();
      const stat = evidenceMap.get(cleanIpa) || evidenceMap.get(slug) || evidenceMap.get(id);
      const attempts = stat?.attempts ?? 0;
      const errorRate = stat?.error_rate ?? 0;
      if (attempts >= EVIDENCE_STAR_MIN_ATTEMPTS && errorRate <= EVIDENCE_STAR_MAX_ERROR_RATE) {
        lit++;
        litSet.add(id);
        if (slug) litSet.add(slug);
        if (cleanIpa) litSet.add(cleanIpa);
      } else if (attempts > 0) {
        inProg++;
      }
    }
    return {
      evidenceLitCount: lit,
      evidenceLitIds: litSet,
      evidenceInProgressCount: inProg,
    };
  }, [evidenceMap]);

  // 轨 3：曝光计数（学习事件 / 评测尝试 / 通关练习 / 词级曝光，严格读现有真实数据，无数据即为 0）
  const { exposedPhonemeCount, totalExposureInteractions, exposedWordsCount } = useMemo(() => {
    const events = getEvents();
    const clearCounts = getClearCounts();
    let wordExpCount = 0;
    try {
      const raw = localStorage.getItem(getScopedKey(WORD_EXPOSURE_STORAGE_KEY));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          wordExpCount = Object.values(parsed).filter(
            (r: any) => r && Number(r.exposures || r.seen || 0) > 0
          ).length;
        }
      }
    } catch {}

    const eventPhonemes = new Set<string>();
    for (const e of events) {
      if (e.phoneme) eventPhonemes.add(e.phoneme.toLowerCase().trim());
    }

    let exposedAnchors = 0;
    let apiAttemptsTotal = 0;
    let clearTotal = 0;
    for (const item of PHONICS_ISLAND_39_ANCHORS) {
      const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim();
      const slug = (item.ipaSlug || "").toLowerCase().trim();
      const id = (item.id || "").toLowerCase().trim();
      const stat = evidenceMap.get(cleanIpa) || evidenceMap.get(slug) || evidenceMap.get(id);
      const attempts = stat?.attempts ?? 0;
      const clearN = clearCounts.phonemes[item.ipaSlug || item.id] || 0;
      apiAttemptsTotal += attempts;
      clearTotal += clearN;
      const hasEvent =
        eventPhonemes.has(id) || eventPhonemes.has(slug) || eventPhonemes.has(cleanIpa);
      if (attempts > 0 || clearN > 0 || hasEvent) {
        exposedAnchors++;
      }
    }

    return {
      exposedPhonemeCount: exposedAnchors,
      totalExposureInteractions: events.length + apiAttemptsTotal + clearTotal,
      exposedWordsCount: wordExpCount,
    };
  }, [evidenceMap]);

  // 按推荐顺序排列尚未学习（未自评且未证据达标）的音素
  const pendingList = useMemo(() => {
    const byId = new Map(PHONICS_ISLAND_39_ANCHORS.map((a) => [a.id, a]));
    const ordered = RECOMMENDED_PHONEME_ORDER.map((id) => byId.get(id)).filter(
      (a): a is NonNullable<typeof a> =>
        Boolean(a) && !isPhonemeLearnedOrLit(a, masteryMap, evidenceLitIds)
    );
    return ordered;
  }, [masteryMap, evidenceLitIds]);

  const starterThree = useMemo(
    () => getTopRecommendedPhonemes(3, masteryMap, evidenceLitIds),
    [masteryMap, evidenceLitIds]
  );

  useEffect(() => {
    let mounted = true;
    const slugs = new Set(selfRatedAnchors.map((a) => a.ipaSlug));
    countDecodableWithMastered(slugs).then((n) => {
      if (mounted) setDecodableCount(n);
    });
    return () => {
      mounted = false;
    };
  }, [selfRatedAnchors]);

  const isEmptyState =
    selfRatedCount === 0 &&
    evidenceLitCount === 0 &&
    exposedPhonemeCount === 0;

  return (
    <div
      data-testid="parent-dashboard-section"
      className="mt-6 rounded-[20px] border border-trust-blue/20 bg-white dark:bg-card p-4 sm:p-5 space-y-4 shadow-none"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2.5 rounded-[12px] bg-trust-blue text-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-white">学情报告摘要</span>
          <span className="text-[11px] text-white/85 font-normal">
            自评、证据、接触三轨分计，客观反映真实掌握度。
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-white/15 text-white/95 whitespace-nowrap">
          三轨分计
        </span>
      </div>

      {/* 三轨分开计数 + 可拼读词量（空态/有数据均分轨透明展示） */}
      <div
        data-testid="parent-three-tracks-grid"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
      >
        <div
          data-testid="track-card-self"
          className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center"
        >
          <div className="text-[11px] font-bold text-trust-blue">自评星（手动）</div>
          <div className="text-lg font-bold text-[#123B3C] font-mono tabular-nums mt-0.5">
            {selfRatedCount} / 39
          </div>
          <div className="text-[10px] text-[#4E6B69]">孩子或家长手动点亮</div>
        </div>

        <div
          data-testid="track-card-evidence"
          className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center"
        >
          <div className="text-[11px] font-bold text-trust-blue">证据星（系统）</div>
          <div className="text-lg font-bold text-[#123B3C] font-mono tabular-nums mt-0.5">
            {evidenceLitCount} / 39
          </div>
          <div className="text-[10px] text-[#4E6B69]">
            ≥{EVIDENCE_STAR_MIN_ATTEMPTS}次且错误率≤50%
            {evidenceInProgressCount > 0 ? ` · ${evidenceInProgressCount}音在练` : ""}
          </div>
        </div>

        <div
          data-testid="track-card-exposure"
          className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center"
        >
          <div className="text-[11px] font-bold text-trust-blue">学习曝光（接触）</div>
          <div className="text-lg font-bold text-[#123B3C] font-mono tabular-nums mt-0.5">
            {exposedPhonemeCount} / 39
          </div>
          <div className="text-[10px] text-[#4E6B69]">
            互动 {totalExposureInteractions} 次 · {exposedWordsCount} 词
          </div>
        </div>

        <div
          data-testid="track-card-decodable"
          className="p-3 rounded-[12px] bg-trust-blue/5 border border-trust-blue/20 text-center"
        >
          <div className="text-[11px] font-bold text-trust-blue">可拼读词量</div>
          <div className="text-lg font-bold text-[#123B3C] font-mono tabular-nums mt-0.5">
            {decodableCount === null ? "…" : decodableCount}
          </div>
          <div className="text-[10px] text-[#4E6B69]">按自评音素从 1,236 词库测算</div>
        </div>
      </div>

      {isEmptyState ? (
        <div
          data-testid="parent-empty-coaching"
          className="p-4 sm:p-5 rounded-[16px] bg-[#E7F2EF]/60 border border-[#D3E4DE] space-y-4 shadow-none"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#123B3C] flex items-center gap-1.5">
                <CompassIcon className="size-4 text-[#0F7B7A] shrink-0" />
                <span>建议先练这 3 个音</span>
              </h3>
              <p className="text-xs text-[#4E6B69] mt-1 leading-relaxed">
                当前暂无练习记录。按「短元音先行 + 高频起手音」带孩子先练熟这 3 个音，马上能拼出 at / sat 等真词：
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#0A5E5D] bg-white px-2.5 py-1 rounded-full border border-[#D3E4DE] self-start sm:self-auto whitespace-nowrap">
              每日 8 分钟起步
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {starterThree.map((item, idx) => {
              const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "");
              const guide =
                PHONEME_COACHING_GUIDES[cleanIpa] ||
                PHONEME_COACHING_GUIDES[item.ipaSlug] ||
                PHONEME_COACHING_GUIDES[item.id];
              const tip = guide?.tip || item.mnemonic;

              return (
                <Link
                  key={item.id}
                  to={`/phonemes/${item.ipaSlug}?anchor=${item.id}`}
                  data-testid={`parent-starter-phoneme-${item.id}`}
                  className="group rounded-[14px] bg-white border border-[#D3E4DE] hover:border-[#0F7B7A] p-3.5 flex flex-col justify-between gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F7B7A]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E7F2EF] text-[#0A5E5D] border border-[#D3E4DE]">
                        第 {idx + 1} 音
                      </span>
                      <span className="text-[11px] font-mono font-bold text-[#4E6B69]">
                        {item.zoneName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`size-12 rounded-[10px] bg-gradient-to-b ${item.colorBg} border border-[#D3E4DE] p-1 flex items-center justify-center shrink-0`}
                      >
                        <img
                          src={item.imageUrl}
                          alt={`${item.anchorWord} ${item.anchorZh}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xl font-black text-[#123B3C] leading-none">
                            {item.letter}
                          </span>
                          <span className="text-xs font-mono font-black text-[#0A5E5D] bg-[#E7F2EF] px-1.5 py-0.5 rounded">
                            {item.ipaSymbol}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#4E6B69] truncate mt-1">
                          {item.anchorWord} · {item.anchorZh}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#4E6B69] leading-relaxed line-clamp-2">
                      陪练要点：{tip}
                    </p>
                  </div>

                  <div className="min-h-[44px] w-full px-3 py-2 rounded-[10px] bg-[#F2A93B] group-hover:bg-[#D69128] text-[#123B3C] text-xs font-black inline-flex items-center justify-center gap-1.5 transition-colors">
                    <span>带孩子练 {item.letter}</span>
                    <ArrowRightIcon className="size-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#D3E4DE] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="text-[#4E6B69] leading-relaxed">
              <strong className="text-[#123B3C]">练习 3 步：</strong>
              听纯音模仿口型 → 跟读满 5 次达成证据星 → 去词族练习拼读巩固
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to="/phonics/alphabet-song"
                className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-[10px] bg-white hover:bg-[#F3FAF8] text-[#123B3C] border border-[#D3E4DE] font-bold text-xs"
              >
                <MusicIcon className="size-3.5 text-[#0F7B7A]" />
                <span>先唱字母歌热身</span>
              </Link>
              <Link
                to="/families"
                className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-[10px] bg-white hover:bg-[#F3FAF8] text-[#123B3C] border border-[#D3E4DE] font-bold text-xs"
              >
                <LayersIcon className="size-3.5 text-[#0F7B7A]" />
                <span>去词族练习</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-[14px] bg-white border border-[#D3E4DE]">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h3 className="text-xs font-black text-[#123B3C] flex items-center gap-1.5">
              <AlertCircleIcon className="size-4 text-[#0F7B7A]" />
              <span>
                按推荐顺序待巩固音素 ({pendingList.length})
              </span>
            </h3>
            <span className="text-[10px] text-[#4E6B69] font-semibold">
              点标签直达音素详情 · 短元音与高频起手音排在前面
            </span>
          </div>

          {pendingList.length === 0 ? (
            <div className="p-4 rounded-[12px] bg-[#E7F2EF]/60 border border-[#D3E4DE] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#0A5E5D]">
                39 个音素已全部完成自评或达标，可前往词族练习拼读巩固。
              </span>
              <Link
                to="/families"
                className="min-h-[44px] px-4 py-2 rounded-[10px] bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
              >
                <span>去词族练习</span>
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pendingList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/phonemes/${item.ipaSlug}?anchor=${item.id}`)}
                  className="min-h-[44px] px-3.5 py-2 text-xs font-mono font-bold tabular-nums bg-[#F3FAF8] hover:bg-[#E7F2EF] text-[#123B3C] border border-[#D3E4DE] rounded-[10px] transition-all cursor-pointer shadow-none hover:border-[#0F7B7A]"
                >
                  {item.letter}{" "}
                  <span className="text-[#4E6B69] font-normal">
                    {item.ipaSymbol}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
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
