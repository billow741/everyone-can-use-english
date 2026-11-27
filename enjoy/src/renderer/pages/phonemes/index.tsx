import { DiagnosticTestCard } from "@renderer/components/levels/diagnostic-test-card";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import {
  PlayIcon,
  PauseIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  SearchIcon,
  FlameIcon,
  StarIcon,
  BookOpenIcon,
  MicIcon,
  AwardIcon,
  LayersIcon,
  CloudIcon,
  RefreshCwIcon,
  CheckIcon,
  CompassIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Input,
} from "@renderer/components/ui";
import {
  ALL_39_PHONEMES,
  getPhonemeMasteryMap,
  togglePhonemeMastery,
  toggleAnchorMastery,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  playPhonemeSound,
} from "@renderer/lib/phoneme-data";
import {
  CLASSIC_3D_FILES,
  cleanPhonemeKey,
} from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import ParentDashboardSection from "@renderer/components/phonics/parent-dashboard-section";
import { getPhonemeUserId, getPhonemeAuthHeaders } from "@renderer/lib/phoneme-cloud-sync";
import {
  EVIDENCE_STAR_MIN_ATTEMPTS,
  EVIDENCE_STAR_MAX_ERROR_RATE,
} from "@renderer/lib/level-registry";
import {
  getRecommendedNextPhoneme,
  RECOMMENDED_PHONEME_ORDER_RATIONALE,
} from "@renderer/lib/phonics-route-config";
import {
  PHONICS_ISLAND_ZONES,
  PHONICS_ISLAND_39_ANCHORS,
  PhonicsIslandZone,
  PhonicsAnchorItem,
} from "@renderer/lib/phoneme-anchors";
import {
  CLEAR_COUNTS_EVENT,
  getClearCounts,
  medalTierFor,
  MEDAL_EMOJI,
} from "@renderer/lib/clear-counts";

// 一框三查搜索索引：锚点（字母/锚点词/中文/音标）＋ 对应条目的示范词与例词（词与中文义）＋ 别名
const SEARCH_ALIASES: Record<string, string[]> = {
  a: ["短a", "短元音", "ae"],
  a_long: ["长a", "ey", "长元音"],
  e: ["短e", "eh"],
  e_long: ["长e", "长元音"],
  i: ["短i", "ih"],
  i_long: ["长i", "长元音"],
  o: ["短o", "aw"],
  o_long: ["长o", "ow", "长元音"],
  u: ["短u", "wedge"],
  u_long: ["长u", "长元音"],
  ar: ["ar", "r控", "卷舌"],
  or: ["or", "r控", "卷舌"],
  er: ["er", "卷舌"],
  qu: ["kw", "qu"],
  x: ["ks", "x"],
  wh: ["wh"],
  ng: ["ng", "后鼻音"],
  sh: ["sh"],
  ch: ["ch"],
  th_unvoiced: ["th", "齿间", "清辅音"],
  th_voiced: ["th", "齿间", "浊辅音"],
};

const ANCHOR_SEARCH_HAYSTACK: Record<string, string> = (() => {
  const bySlug = new Map(ALL_39_PHONEMES.map((p) => [p.slug, p]));
  const map: Record<string, string> = {};
  for (const a of PHONICS_ISLAND_39_ANCHORS) {
    const parts: string[] = [
      a.letter,
      a.anchorWord,
      a.anchorZh,
      a.mnemonic,
      a.ipaSymbol,
      a.ipaSymbol.replace(/[/ː]/g, ""),
      ...(SEARCH_ALIASES[a.id] || []),
    ];
    const entry = bySlug.get(a.ipaSlug);
    if (entry) {
      parts.push(entry.sampleWord);
      for (const w of entry.practiceWords || []) parts.push(w.word, w.translation);
      for (const w of entry.benchmarkWords || []) parts.push(w.word, w.translation);
    }
    map[a.id] = parts.join(" ").toLowerCase();
  }
  return map;
})();

export default function PhonemesIndex() {
  // P0 奖牌：通关次数（渲染时读最新值；完成事件会触发本页重渲染）
  const clearCounts = getClearCounts();
  const [, setClearVersion] = useState(0);
  useEffect(() => {
    const f = () => setClearVersion((v) => v + 1);
    window.addEventListener(CLEAR_COUNTS_EVENT, f);
    return () => window.removeEventListener(CLEAR_COUNTS_EVENT, f);
  }, []);
  const [selectedZone, setSelectedZone] = useState<PhonicsIslandZone>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingAnchorId, setPlayingAnchorId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());

  // 双轨星展示层（工单 C · 决策 1）：证据星聚合端点数据
  const [evidenceStats, setEvidenceStats] = useState<any[]>([]);

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
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (mounted && data?.phonemes && Array.isArray(data.phonemes)) {
            setEvidenceStats(data.phonemes);
          }
        })
        .catch(() => {
          // 接口失败/无数据/未登录：静默吞掉，显示未点亮空态，不报错
        });
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




  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const entryAudioRef = useRef<HTMLAudioElement | null>(null); // 进场音元素：跨页播放，卸载时不掐断

  // 停止当前正在播放的音频
  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setPlayingAnchorId(null);
  };

  useEffect(() => {
    // 1. 订阅全局掌握度变更事件
    const unsubscribe = subscribePhonemeMastery((state) => {
      setMasteryMap(state.masteryMap);
    });

    // 2. 组件挂载时自动拉取云端数据库
    fetchPhonemesCloudProgress().then((state) => {
      setMasteryMap(state.masteryMap);
    });

    return () => {
      unsubscribe();
      if (entryAudioRef.current) {
        // 进场音是故意跨页播放的：只放手（解除引用），不暂停，让它在详情页播完
        currentAudioRef.current = null;
      } else {
        stopAudio();
      }
    };
  }, []);

  // 播放音素原声（只播纯音素，不接整词）
  const handleEnterAnchor = (e: React.MouseEvent, item: PhonicsAnchorItem) => {
    handlePlayAnchor(e, item);
    try {
      sessionStorage.setItem(
        "phonemes_list_state",
        JSON.stringify({ zone: selectedZone, q: searchQuery, id: item.id })
      );
    } catch {}
    navigate(`/phonemes/${item.ipaSlug}?anchor=${item.id}`);
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("phonemes_list_state");
      if (!raw) return;
      sessionStorage.removeItem("phonemes_list_state");
      const st = JSON.parse(raw);
      if (st.zone) setSelectedZone(st.zone);
      if (st.q) setSearchQuery(st.q);
      if (st.id) {
        setTimeout(() => {
          document
            .querySelector(`[data-phoneme-card="${st.id}"]`)
            ?.scrollIntoView({ block: "center" });
        }, 400);
      }
    } catch {}
  }, []);

  const handlePlayAnchor = (e: React.MouseEvent, item: PhonicsAnchorItem) => {
    e.stopPropagation();

    if (playingAnchorId === item.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setPlayingAnchorId(item.id);

    // 1. 尝试播放原声纯音轨
    const cleanKey = cleanPhonemeKey(item.ipaSymbol);
    const audioFile =
      CLASSIC_3D_FILES[cleanKey] ||
      CLASSIC_3D_FILES[item.id] ||
      CLASSIC_3D_FILES[item.ipaSlug];

    if (audioFile) {
      const audio = new Audio(`/assets/phonetics-3d/audio/${audioFile}.mp3`);
      currentAudioRef.current = audio;
      entryAudioRef.current = audio;

      audio.onended = () => {
        entryAudioRef.current = null;
        setPlayingAnchorId(null);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingAnchorId(null);
      };

      audio.play().catch(() => {
        setPlayingAnchorId(null);
      });
    } else {
      playPhonemeSound(item.ipaSymbol, {
        onEnd: () => setPlayingAnchorId(null),
      });
    }
  };

  // 切换掌握星标
  const handleToggleMastery = (e: React.MouseEvent, item: PhonicsAnchorItem) => {
    e.stopPropagation();
    // 锚点键 + 音素键成对切换（内部按两键 OR 读当前态、双写同值），不再各翻一次
    const nextState = toggleAnchorMastery(item.id, item.ipaSlug);
    setMasteryMap((prev) => ({
      ...prev,
      [item.id]: nextState,
      ...(item.ipaSlug ? { [item.ipaSlug]: nextState } : {}),
    }));

    // GSAP 动效编排（Motion Prompt #166 Like button + #003 Burst）
    const btn = e.currentTarget as HTMLElement;
    const starTarget = btn.querySelector<HTMLElement>(`[data-star-target="${item.id}"]`);
    const ring = btn.querySelector<HTMLElement>(`[data-star-ring="${item.id}"]`);
    const dots = btn.querySelectorAll<HTMLElement>(`[data-star-burst="${item.id}"] [data-star-dot]`);
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (nextState) {
      // 点亮爆发动效：星星缩放＋光晕/粒子
      if (isReduced) {
        if (starTarget) gsap.fromTo(starTarget, { opacity: 0.5 }, { opacity: 1, duration: 0.25 });
      } else {
        if (starTarget) {
          gsap.timeline({ overwrite: "auto" })
            .to(starTarget, { scale: 0.76, duration: 0.08, ease: "power1.in" })
            .to(starTarget, { scale: 1.45, duration: 0.14, ease: "back.out(3)" })
            .to(starTarget, { scale: 1, duration: 0.2, ease: "power2.out" });
        }
        if (ring) {
          gsap.fromTo(
            ring,
            { scale: 0.5, opacity: 0.85 },
            { scale: 2.4, opacity: 0, duration: 0.45, ease: "power2.out", overwrite: "auto" }
          );
        }
        if (dots && dots.length > 0) {
          dots.forEach((dot, idx) => {
            const angle = (idx * 60 * Math.PI) / 180;
            const dist = 14;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            gsap.fromTo(
              dot,
              { x: 0, y: 0, scale: 1, opacity: 1 },
              { x: tx, y: ty, scale: 0.3, opacity: 0, duration: 0.42, ease: "power2.out", overwrite: "auto" }
            );
          });
        }
      }
    } else {
      // 取消点亮收回反馈（Motion Prompt #166 Undo）
      if (isReduced) {
        if (starTarget) gsap.fromTo(starTarget, { opacity: 0.5 }, { opacity: 1, duration: 0.2 });
      } else {
        if (starTarget) {
          gsap.timeline({ overwrite: "auto" })
            .to(starTarget, { scale: 0.82, duration: 0.12, ease: "power1.in" })
            .to(starTarget, { scale: 1, duration: 0.18, ease: "power1.out" });
        }
      }
    }
  };

  // 4 大岛区与搜索过滤
  const filteredAnchors = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter((item) => {
      // 岛区筛选
      if (selectedZone !== "all" && item.zone !== selectedZone) {
        return false;
      }
      // 一框三查：字母组合 / 音标与别名 / 例词反查（含中文义）
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (ANCHOR_SEARCH_HAYSTACK[item.id] || "").includes(q);
      }
      return true;
    });
  }, [selectedZone, searchQuery]);

  // 搜索时按命中强度排序：锚点词或字母精确命中在前，示范词精确命中次之，其余保持字母序
  const displayAnchors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredAnchors;
    const score = (item: PhonicsAnchorItem) => {
      if (item.anchorWord.toLowerCase() === q || item.letter.toLowerCase() === q) return 0;
      const entry = ALL_39_PHONEMES.find((p) => p.slug === item.ipaSlug);
      if (entry && entry.sampleWord.toLowerCase() === q) return 1;
      return 2;
    };
    return [...filteredAnchors]
      .map((item, i) => ({ item, i, s: score(item) }))
      .sort((x, y) => x.s - y.s || x.i - y.i)
      .map((r) => r.item);
  }, [filteredAnchors, searchQuery]);

  // 证据星已达标集合（供推荐路径条判断未学优先，只引导不锁卡）
  const evidenceLitIds = useMemo(() => {
    const lit = new Set<string>();
    for (const item of PHONICS_ISLAND_39_ANCHORS) {
      const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim();
      const slug = (item.ipaSlug || "").toLowerCase().trim();
      const id = (item.id || "").toLowerCase().trim();
      const stat = evidenceMap.get(cleanIpa) || evidenceMap.get(slug) || evidenceMap.get(id);
      const attempts = stat?.attempts ?? 0;
      const errorRate = stat?.error_rate ?? 0;
      if (attempts >= EVIDENCE_STAR_MIN_ATTEMPTS && errorRate <= EVIDENCE_STAR_MAX_ERROR_RATE) {
        lit.add(id);
        if (slug) lit.add(slug);
        if (cleanIpa) lit.add(cleanIpa);
      }
    }
    return lit;
  }, [evidenceMap]);

  const recommendedNextAnchor = useMemo(() => {
    return getRecommendedNextPhoneme(masteryMap, evidenceLitIds);
  }, [masteryMap, evidenceLitIds]);

  return (
    <div className="min-h-full px-3 sm:px-4 pt-3 sm:pt-6 pb-44 min-[1280px]:pb-8 lg:px-8 max-w-7xl mx-auto space-y-3 sm:space-y-5">
      {/* 控制台：音素分组 Tabs + 实时搜索（39 音素卡查询参考） */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* 4 大岛区 Tabs（触控热区 ≥44px） */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" data-testid="zone-chips-bar">
            {PHONICS_ISLAND_ZONES.map((zone) => {
              const isActive = selectedZone === zone.key;
              const zoneMastered = PHONICS_ISLAND_39_ANCHORS.filter(
                (a) =>
                  (zone.key === "all" || a.zone === zone.key) &&
                  (masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug]))
              ).length;
              return (
                <button
                  key={zone.key}
                  type="button"
                  data-testid={`zone-chip-${zone.key}`}
                  onClick={() => setSelectedZone(zone.key)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shadow-none shrink-0 ${
                    isActive
                      ? "bg-[#0F7B7A] text-white"
                      : "bg-white hover:bg-[#E7F2EF] text-[#123B3C] border border-[#D3E4DE]"
                  }`}
                >
                  <span className={`size-2 rounded-full shrink-0 ${isActive ? "bg-white" : "bg-[#0F7B7A]"}`} />
                  <span>{zone.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold tabular-nums ${
                      isActive
                        ? "bg-white text-[#0A5E5D]"
                        : "bg-[#E7F2EF] text-[#123B3C]"
                    }`}
                  >
                    {zoneMastered}/{zone.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 辅助状态条与搜索栏 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-card p-2.5 sm:p-3 rounded-[14px] border border-[#D3E4DE] shadow-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4E6B69] dark:text-muted-foreground">
            <CompassIcon className="size-4 text-[#0F7B7A] shrink-0" />
            <span>
              当前分组：
              <strong className="text-[#123B3C] dark:text-foreground ml-1">
                {PHONICS_ISLAND_ZONES.find((z) => z.key === selectedZone)?.name} · 共 {filteredAnchors.length} 个音素
              </strong>
            </span>
          </div>

          {/* 实时搜索框 */}
          <div className="relative sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#4E6B69]" aria-hidden="true" />
            <Input
              type="text"
              aria-label="搜索音素、字母、单词或音标"
              placeholder="搜字母、单词、音标或中文，如 cake / 短a / θ…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-11 h-11 text-base sm:text-xs rounded-[12px] bg-[#F3FAF8] dark:bg-background border-[#D3E4DE]"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => setSearchQuery("")}
                className="absolute right-0 top-1/2 -translate-y-1/2 size-11 inline-flex items-center justify-center text-xs text-[#4E6B69] hover:text-[#123B3C]"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 推荐路径引导条：在字母序网格上叠加「推荐顺序」引导（只引导不锁卡） */}
      <div
        data-testid="recommended-path-bar"
        className="rounded-[16px] bg-white dark:bg-card border border-[#D3E4DE] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-[0_1px_3px_rgba(18,59,60,0.03)]"
      >
        {recommendedNextAnchor ? (
          <>
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E7F2EF] border border-[#D3E4DE] text-[#0A5E5D] text-[11px] font-black whitespace-nowrap shrink-0">
                <CompassIcon className="size-3.5 text-[#0F7B7A]" />
                <span>推荐顺序</span>
              </span>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#123B3C] dark:text-foreground">
                  <span>建议先练：</span>
                  <span className="font-black text-[#0A5E5D] dark:text-emerald-300 mx-1">
                    {recommendedNextAnchor.letter} {recommendedNextAnchor.ipaSymbol}
                  </span>
                  <span className="text-[#4E6B69] font-medium">
                    · {recommendedNextAnchor.anchorWord} ({recommendedNextAnchor.anchorZh})
                  </span>
                </div>
                <p className="text-[11px] text-[#4E6B69] mt-0.5 leading-snug">
                  {RECOMMENDED_PHONEME_ORDER_RATIONALE} · 下方保持字母序，可任意点选
                </p>
              </div>
            </div>
            <Link
              to={`/phonemes/${recommendedNextAnchor.ipaSlug}?anchor=${recommendedNextAnchor.id}`}
              data-testid="recommended-next-link"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-[12px] bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] text-xs font-black transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <span>直达 {recommendedNextAnchor.letter} 详情</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DFF5E9] border border-[#0F7B7A]/30 text-[#0A5E5D] text-[11px] font-black shrink-0">
                <CheckCircle2Icon className="size-3.5 text-[#0F7B7A]" />
                <span>推荐顺序</span>
              </span>
              <p className="text-xs sm:text-sm font-bold text-[#123B3C] dark:text-foreground">
                39 个音素已全部标记或达标，可继续去词族乐园拼读巩固！
              </p>
            </div>
            <Link
              to="/families"
              data-testid="recommended-next-link"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-[12px] bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white text-xs font-black transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <span>去词族拼读</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </>
        )}
      </div>

      {/* 🎴 39 音素卡网格（发音区第一位：A0 诊断测入口；其后为字母音音素卡） */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4.5">
          <DiagnosticTestCard levelCode="A0" />
          {displayAnchors.map((item) => {
            const isMastered =
              !!masteryMap[item.id] ||
              (item.ipaSlug && !!masteryMap[item.ipaSlug]);
            const isPlaying = playingAnchorId === item.id;
            const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim();
            const slug = (item.ipaSlug || "").toLowerCase().trim();
            const id = (item.id || "").toLowerCase().trim();
            const stat = evidenceMap.get(cleanIpa) || evidenceMap.get(slug) || evidenceMap.get(id);
            const attempts = stat?.attempts ?? 0;
            const errorRate = stat?.error_rate ?? 0;
            const isBelowThreshold = attempts < EVIDENCE_STAR_MIN_ATTEMPTS;
            const isLit = !isBelowThreshold && errorRate <= EVIDENCE_STAR_MAX_ERROR_RATE;
            const remaining = Math.max(1, EVIDENCE_STAR_MIN_ATTEMPTS - attempts);
            const isRecommendedNext = recommendedNextAnchor?.id === item.id;
            const hasProgress = Boolean(isMastered || attempts > 0);

            return (
              <div key={item.id} className="relative group">
                <div
                  data-phoneme-card={item.id}
                  className={`w-full text-left relative rounded-[20px] border transition-all duration-150 cursor-pointer px-3 pb-3 pt-9 sm:pt-10 flex flex-col overflow-hidden bg-white dark:bg-card select-none shadow-none ${
                    isMastered
                      ? "border-[#0F7B7A] bg-[#E7F2EF]/40"
                      : isRecommendedNext
                      ? "border-[#0F7B7A]/60 bg-[#F3FAF8]/70 hover:border-[#0F7B7A]"
                      : "border-[#D3E4DE] hover:border-[#0F7B7A]"
                  } ${isPlaying ? "ring-2 ring-[#0F7B7A]" : ""}`}
                >
                  {/* 🌟 核心：高清 3D 萌趣锚定图（点击进入音素详情） */}
                  <button
                    type="button"
                    data-testid={`card-image-btn-${item.id}`}
                    onClick={(e) => handleEnterAnchor(e, item)}
                    aria-label={`进入音素详情：${item.letter} ${item.ipaSymbol} (${item.anchorWord} ${item.anchorZh})${isRecommendedNext ? "，下一个建议" : ""}`}
                    className={`w-full h-24 sm:h-32 rounded-[8px] bg-gradient-to-b ${item.colorBg} flex items-center justify-center p-2 relative shadow-inner border border-black dark:border-white overflow-hidden group/pic cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0F7B7A] focus-visible:outline-offset-2`}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                      {(() => {
                        const ccount = clearCounts.phonemes[item.ipaSlug || item.id] || 0;
                        const ctier = medalTierFor(ccount);
                        return ctier !== "none" ? (
                          <span
                            title={`已通关 ${ccount} 次`}
                            className="absolute left-1 top-1 z-10 flex size-6 sm:size-7 items-center justify-center rounded-full border-2 border-[#123B3C] text-[12px] shadow-[2px_2px_0_#123B3C]"
                            style={{
                              backgroundColor:
                                ctier === "gold" ? "var(--medal-gold)" : ctier === "silver" ? "var(--medal-silver)" : "var(--medal-bronze)",
                            }}
                          >
                            {MEDAL_EMOJI[ctier]}
                          </span>
                        ) : null;
                      })()}
                      <img
                        src={item.imageUrl}
                        alt={`${item.anchorWord} ${item.anchorZh}`}
                        className={`w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 ${
                          isPlaying
                            ? "scale-115"
                            : "group-hover:scale-110"
                        }`}
                        loading="lazy"
                      />
                    </div>
                  </button>

                  {/* 推荐顺序弱标记（仅「下一个建议」卡片，置于图下避免与右上角双轨星胶囊在小屏重叠） */}
                  {isRecommendedNext && (
                    <div className="mt-2 flex justify-center">
                      <span
                        data-testid="recommended-next-badge"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F2EF] border border-[#0F7B7A]/35 text-[10px] font-bold text-[#0A5E5D] whitespace-nowrap"
                      >
                        下一个建议
                      </span>
                    </div>
                  )}

                  {/* 音素文字区：点击只播纯音，不跳转 */}
                  <button
                    type="button"
                    data-testid={`card-sound-btn-${item.id}`}
                    onClick={(e) => handlePlayAnchor(e, item)}
                    aria-label={`播放音素发音：${item.letter} ${item.ipaSymbol} (${item.anchorWord} ${item.anchorZh})`}
                    className="w-full mt-2.5 flex flex-col items-center text-center cursor-pointer rounded-[12px] py-1 px-1 hover:bg-[#E7F2EF]/60 dark:hover:bg-slate-800/50 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F7B7A] focus-visible:outline-offset-2"
                  >
                    {/* 大字母 + 音素符号（清晰按音扫卡：如 a /æ/） */}
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-[#123B3C] dark:text-foreground group-hover:text-[#96690A] transition-colors leading-none">
                        {item.letter}
                      </span>
                      <span
                        data-testid="card-phoneme-symbol"
                        className="px-2 py-0.5 rounded-[8px] bg-[#E7F2EF] dark:bg-slate-800 border border-[#D3E4DE] font-mono text-xs sm:text-sm font-black text-[#0A5E5D] dark:text-emerald-300 leading-tight"
                      >
                        {item.ipaSymbol}
                      </span>
                    </div>

                    {/* 锚点词 + 中文释义 */}
                    <div
                      data-testid="card-anchor-label"
                      className="w-full mt-1.5 text-center text-xs sm:text-sm font-bold text-[#123B3C] dark:text-slate-100 truncate"
                    >
                      <span className="font-mono">{item.anchorWord}</span>
                      <span className="text-[#4E6B69] dark:text-slate-400 font-medium"> · {item.anchorZh}</span>
                    </div>
                  </button>

                  {/* 证据星进度口径（只在有进度时显示，避免无进度空标签噪声；未达标显示 x/5 小字） */}
                  {hasProgress && (
                    <div className="mt-1 text-center select-none text-[10px] sm:text-[11px]">
                      {isLit ? (
                        <span className="font-bold text-[#0F7B7A] dark:text-sky-400 inline-flex items-center gap-1">
                          <StarIcon className="size-3 fill-[#0F7B7A] text-[#0F7B7A]" />
                          <span>证据达标 ({attempts}次)</span>
                        </span>
                      ) : isBelowThreshold ? (
                        attempts > 0 ? (
                          <span
                            title={`系统听过读满 ${EVIDENCE_STAR_MIN_ATTEMPTS} 次且错误率 ≤50% 点亮，当前 ${attempts}/${EVIDENCE_STAR_MIN_ATTEMPTS} 次`}
                            className="font-mono font-semibold text-[#4E6B69] dark:text-slate-400 inline-flex items-center gap-1"
                          >
                            <span>证据 {attempts}/{EVIDENCE_STAR_MIN_ATTEMPTS}</span>
                          </span>
                        ) : null
                      ) : (
                        <span className="font-semibold text-[#D9553F] dark:text-rose-400/90 inline-flex items-center gap-1">
                          <span>待复测 · 已练 {attempts} 次</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 双轨星展示层：只在有进度时显示（无进度不显示空标签）；证据星未达标显示 x/5 小字 */}
                {hasProgress && (
                  <div
                    data-testid={`dual-star-pill-${item.id}`}
                    className="absolute right-2.5 sm:right-3 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-900/95 py-0.5 px-2 shadow-xs border border-[#D3E4DE] backdrop-blur-xs select-none whitespace-nowrap"
                  >
                    {/* 1. 证据星（系统端点实时聚合：≥5 次且错误率≤50% 点亮；样本<5 显示 x/5） */}
                    {isLit ? (
                      <span
                        title={`证据星（系统已点亮）：评测 ${attempts} 次，错误率 ${Math.round(errorRate * 100)}%`}
                        className="flex items-center gap-0.5 text-[10px] font-bold cursor-help"
                      >
                        <StarIcon className="size-3.5 fill-[#0F7B7A] text-[#0F7B7A]" />
                        <span className="text-[9px] text-[#0A5E5D] dark:text-emerald-300 font-black">
                          证据
                        </span>
                      </span>
                    ) : isBelowThreshold ? (
                      <span
                        title={`还需跟读评测 ${remaining} 次（当前 ${attempts}/${EVIDENCE_STAR_MIN_ATTEMPTS} 次）且错误率 ≤50% 点亮证据星`}
                        className="flex items-center gap-1 text-[10px] font-bold cursor-help text-[#96690A] dark:text-amber-300"
                      >
                        <span className="inline-block size-1.5 rounded-full bg-[#F2A93B]" />
                        <span className="text-[9px] font-mono font-black tabular-nums">
                          {attempts}/{EVIDENCE_STAR_MIN_ATTEMPTS}
                        </span>
                      </span>
                    ) : (
                      <span
                        title={`证据星（待复测）：评测 ${attempts} 次，错误率 ${Math.round(errorRate * 100)}%（需 ≤50%）`}
                        className="flex items-center gap-0.5 text-[10px] font-bold cursor-help text-[#D9553F] dark:text-rose-400"
                      >
                        <span className="text-[9px] font-black">
                          待复测
                        </span>
                      </span>
                    )}

                    {/* 细分割线 */}
                    <span className="h-3 w-px bg-[#D3E4DE] dark:bg-slate-700 mx-0.5" />

                    {/* 2. 自评星（现有手动星标，数据与点亮逻辑原样不动，扩大触控热区 >=24px 高） */}
                    <button
                      type="button"
                      data-star-btn={item.id}
                      aria-label={isMastered ? `取消标记 ${item.letter} 自评星` : `标记 ${item.letter} 自评星`}
                      title={isMastered ? "自评星（手动已点亮，点击取消）" : "自评星（手动未点亮，点击标记）"}
                      onClick={(e) => handleToggleMastery(e, item)}
                      className="relative flex items-center gap-0.5 min-h-6 py-1 px-1 text-[10px] font-bold cursor-pointer"
                    >
                      <span className="relative inline-flex items-center justify-center">
                        {/* 光晕与粒子层（Motion Prompt #166 & #003） */}
                        <span
                          data-star-burst={item.id}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
                          aria-hidden="true"
                        >
                          <span
                            data-star-ring={item.id}
                            className="absolute size-4 rounded-full border border-[#F2A93B] opacity-0 pointer-events-none scale-50"
                          />
                          <span data-star-dot="0" className="absolute size-1 rounded-full bg-[#F2A93B] opacity-0 pointer-events-none" />
                          <span data-star-dot="1" className="absolute size-1 rounded-full bg-[#E8930C] opacity-0 pointer-events-none" />
                          <span data-star-dot="2" className="absolute size-1 rounded-full bg-[#F2A93B] opacity-0 pointer-events-none" />
                          <span data-star-dot="3" className="absolute size-1 rounded-full bg-[#96690A] opacity-0 pointer-events-none" />
                          <span data-star-dot="4" className="absolute size-1 rounded-full bg-[#F2A93B] opacity-0 pointer-events-none" />
                          <span data-star-dot="5" className="absolute size-1 rounded-full bg-[#E8930C] opacity-0 pointer-events-none" />
                        </span>
                        <span data-star-target={item.id} className="inline-flex items-center justify-center">
                          <StarIcon
                            data-star-icon={item.id}
                            className={`size-3.5 transition-colors ${
                              isMastered
                                ? "fill-[#F2A93B] text-[#96690A] filter drop-shadow-xs"
                                : "fill-slate-100 text-slate-400 dark:fill-slate-800 dark:text-slate-600"
                            }`}
                          />
                        </span>
                      </span>
                      <span
                        className={`text-[9px] ${
                          isMastered ? "text-[#96690A] dark:text-amber-300 font-black" : "text-[#4E6B69]"
                        }`}
                      >
                        自评
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      {/* 无匹配状态 */}
      {filteredAnchors.length === 0 && (
        <div className="text-center py-16 bg-[#E7F2EF]/50 rounded-[20px] border border-dashed border-[#D3E4DE]">
          <p className="text-[#4E6B69] text-sm font-semibold">
            没有找到匹配的发音卡，尝试更换搜索关键词或筛选分组
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedZone("all");
              setSearchQuery("");
            }}
            className="mt-3 min-h-[44px] px-4 text-xs rounded-[14px] font-black border-[#D3E4DE]"
          >
            重置所有筛选
          </Button>
        </div>
      )}


      {/* 家长学情看板（已并入本页，与 39 音素卡同一部分） */}
      <ParentDashboardSection />

    </div>
  );
}
