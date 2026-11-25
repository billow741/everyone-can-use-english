import { DiagnosticTestCard } from "@renderer/components/levels/diagnostic-test-card";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import {
  Volume2Icon,
  PlayIcon,
  PauseIcon,
  SparklesIcon,
  MusicIcon,
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
  Progress,
} from "@renderer/components/ui";
import {
  ALL_39_PHONEMES,
  getPhonemeMasteryMap,
  togglePhonemeMastery,
  toggleAnchorMastery,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  syncLocalPhonemesToCloud,
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
import { speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

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
      if (typeof state.isSyncing === "boolean") setIsSyncing(state.isSyncing);
      if (typeof state.isOnline === "boolean") setIsOnline(state.isOnline);
    });

    // 2. 组件挂载时自动拉取云端数据库
    setIsSyncing(true);
    fetchPhonemesCloudProgress().then((state) => {
      setMasteryMap(state.masteryMap);
      setIsOnline(state.isOnline);
      setIsSyncing(false);
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

  // 手动触发云端双向合流同步
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncLocalPhonemesToCloud();
      setMasteryMap(res.masteryMap);
      setIsOnline(res.isOnline);
    } finally {
      setIsSyncing(false);
    }
  };

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

  // 敢敢大声打招呼
  const handleGanganGreet = () => {
    speakGanganPrompt(
      "嗨！我是敢敢小狮子！这里是 39 音素卡！点一张卡，听听这个音怎么读，点进去还能看口型、练拼读！"
    );
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

  // 掌握进度统计 (39 个代言音素)
  const masteredCount = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter(
      (p) => masteryMap[p.id] || (p.ipaSlug && masteryMap[p.ipaSlug])
    ).length;
  }, [masteryMap]);

  
  const masteryPercentage = Math.round((masteredCount / PHONICS_ISLAND_39_ANCHORS.length) * 100);

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 顶部 Hero 横幅：39 自然拼读通关岛 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-emerald-500/15 border-2 border-amber-400/40 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-400/40 shadow-2xs">
                <SparklesIcon className="size-3.5 text-amber-600 dark:text-amber-300" />
                <span>🦁 自然拼读 · Phonics</span>
              </div>

              {/* ☁️ 云端数据库实时同步指示器 */}
              <button
                onClick={handleManualSync}
                title="点击立即与云端双向合流同步"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                  isSyncing
                    ? "bg-amber-500/10 text-amber-600 border-amber-400/30 dark:text-amber-400"
                    : isOnline
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-400/30 dark:text-emerald-400 hover:bg-emerald-500/20"
                    : "bg-slate-500/10 text-slate-600 border-slate-400/30 dark:text-slate-400 hover:bg-slate-500/20"
                }`}
              >
                <CloudIcon className="size-3.5 shrink-0" />
                <span>
                  {isSyncing ? "云端同步中..." : isOnline ? "进度已同步" : "仅保存在本机"}
                </span>
                <RefreshCwIcon
                  className={`size-3 text-muted-foreground transition-transform ${
                    isSyncing ? "animate-spin text-amber-500" : ""
                  }`}
                />
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              39 音素卡 · 随点随查
            </h1>

            <div className="flex items-center gap-3 max-w-xl">
              <Progress value={masteryPercentage} indicatorClassName="bg-level-a0" className="h-2 flex-1 rounded-full bg-[#E7F2EF] dark:bg-slate-800 border border-[#D3E4DE]/50" />
              <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                已掌握 {masteredCount}/39 · {masteryPercentage}%
              </span>
            </div>

            {/* 敢敢进驻口播伴学条 */}
            <div className="flex items-center gap-3 bg-[#E7F2EF] dark:bg-slate-900 p-3 rounded-[14px] border border-[#D3E4DE] shadow-none">
              <button
                type="button"
                onClick={handleGanganGreet}
                title="点击听敢敢说话"
                className="size-10 rounded-full overflow-hidden border border-[#D3E4DE] bg-white p-0.5 flex items-center justify-center shrink-0 shadow-none hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                <img
                  src="/assets/qiaobao_sunny240.png"
                  alt="敢敢"
                  className="size-full rounded-full object-cover"
                />
              </button>
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-bold text-ink dark:text-emerald-300 flex items-center gap-1.5">
                  <span>敢敢小伴学:</span>
                  <span className="text-[10px] text-muted-foreground font-normal">点击头像听语音</span>
                </div>
                <p className="text-muted-foreground dark:text-foreground/90 font-normal leading-relaxed">
                  这里是 39 音素卡！点一张卡听发音，点进去看口型、练拼读，39 个音随点随查。
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGanganGreet}
                className="h-8 px-2.5 text-xs font-bold text-primary hover:bg-white rounded-lg shrink-0"
              >
                <Volume2Icon className="size-3.5 mr-1" />
                <span>听敢敢说</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

            {/* A0 热身歌入口卡片：字母歌 · 26 个字母唱一遍 */}
      <div className="rounded-[20px] bg-white border border-[#D3E4DE] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_1px_3px_rgba(18,59,60,0.04),0_4px_12px_rgba(18,59,60,0.05)]">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-[#E7F2EF] border border-[#0F7B7A]/30 flex items-center justify-center shrink-0">
            <MusicIcon className="size-6 text-[#0F7B7A]" />
          </div>
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#123B3C]">
              <span className="size-1.5 rounded-full bg-[#E8930C]" />
              <span>A0 · 热身启蒙</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#123B3C]">
              字母歌 · 26 个字母唱一遍
            </h3>
            <p className="text-xs sm:text-sm text-[#4E6B69]">
              一首歌唱会 26 个字母音，支持单字母点读与发音纠错
            </p>
          </div>
        </div>
        <Link
          to="/phonics/alphabet-song"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.97] shrink-0"
        >
          <span>去唱字母歌</span>
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      {/* 控制台：音素分组 Tabs + 实时搜索（39 音素卡查询参考） */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* 4 大岛区 Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
                  onClick={() => setSelectedZone(zone.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shadow-none ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-white hover:bg-[#E7F2EF] text-ink border border-[#D3E4DE]"
                  }`}
                >
                  <span className={`size-2 rounded-full shrink-0 ${isActive ? "bg-white" : "bg-primary"}`} />
                  <span>{zone.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#E7F2EF] text-muted-foreground"
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[14px] border border-[#D3E4DE] shadow-none">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CompassIcon className="size-4 text-primary" />
            <span>
              当前分组：
              <strong className="text-foreground ml-1">
                {PHONICS_ISLAND_ZONES.find((z) => z.key === selectedZone)?.name} · 共 {filteredAnchors.length} 个音素
              </strong>
            </span>
          </div>

          {/* 实时搜索框 */}
          <div className="relative sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜字母、单词、音标或中文，如 cake / 短a / θ…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl bg-background border-border/80"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🎴 39 音素卡网格（发音区第一位：A0 诊断测入口；其后为字母音音素卡） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4.5">
          <DiagnosticTestCard levelCode="A0" />
          {displayAnchors.map((item) => {
            const isMastered =
              !!masteryMap[item.id] ||
              (item.ipaSlug && !!masteryMap[item.ipaSlug]);
            const isPlaying = playingAnchorId === item.id;

            return (
              <div
                key={item.id}
                data-phoneme-card={item.id}
                  onClick={(e) => handleEnterAnchor(e, item)}
                className={`group relative rounded-[14px] border transition-all duration-150 cursor-pointer p-4 flex flex-col overflow-hidden bg-white select-none shadow-none ${
                  isMastered
                    ? "border-level-a0 bg-[#E7F2EF]/40"
                    : "border-[#D3E4DE] hover:border-primary"
                } ${isPlaying ? "ring-2 ring-primary" : ""}`}
              >
                {/* 🌟 核心：高清 3D 萌趣锚定图 (3D Pixar Style) */}
                <div
                  className={`w-full h-32 sm:h-36 rounded-lg bg-gradient-to-b ${item.colorBg} flex items-center justify-center p-2.5 relative my-1 shadow-inner border border-black/5 overflow-hidden group/pic`}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    {(() => {
                      const ccount = clearCounts.phonemes[item.ipaSlug || item.id] || 0;
                      const ctier = medalTierFor(ccount);
                      return ctier !== "none" ? (
                        <span
                          title={`已通关 ${ccount} 次`}
                          className="absolute left-2 top-2 z-10 flex size-7 items-center justify-center rounded-full border-2 border-wood-ink text-[13px] shadow-[2px_2px_0_var(--wood-ink)]"
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
                    {/* 锚定词图底胶囊：ship 轮船 */}
                    <div className="absolute bottom-1 px-3 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-[11px] font-black text-slate-800 dark:text-slate-100 backdrop-blur-xs shadow-2xs font-mono border border-black/5">
                      {item.anchorWord} · {item.anchorZh}
                    </div>
                  </div>
                </div>

                {/* 双轨星展示层：证据星（系统）＋ 自评星（手动），两轨并排独立 */}
                <div
                  className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/95 dark:bg-slate-900/95 py-1 px-2 shadow-xs border border-black/5 backdrop-blur-xs select-none whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 1. 证据星（系统端点实时聚合：≥5 次且错误率≤50% 点亮；样本<5 为「积累中」中性态，不显示灰色星） */}
                  {(() => {
                    const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim();
                    const slug = (item.ipaSlug || "").toLowerCase().trim();
                    const id = (item.id || "").toLowerCase().trim();
                    const stat = evidenceMap.get(cleanIpa) || evidenceMap.get(slug) || evidenceMap.get(id);
                    const attempts = stat?.attempts ?? 0;
                    const errorRate = stat?.error_rate ?? 0;
                    const isBelowThreshold = attempts < EVIDENCE_STAR_MIN_ATTEMPTS;
                    const isLit = !isBelowThreshold && errorRate <= EVIDENCE_STAR_MAX_ERROR_RATE;

                    if (isLit) {
                      return (
                        <span
                          title={`证据星（系统已点亮）：评测 ${attempts} 次，错误率 ${Math.round(errorRate * 100)}%`}
                          className="flex items-center gap-0.5 text-[10px] font-bold cursor-help"
                        >
                          <StarIcon className="size-3.5 fill-sky-400 text-sky-500 filter drop-shadow-xs animate-pulse" />
                          <span className="text-[9px] text-sky-700 dark:text-sky-300 font-black">
                            证据
                          </span>
                        </span>
                      );
                    }

                    if (isBelowThreshold) {
                      // 样本 < 5：中性态「积累中」，不显示灰色未点亮星，带口径短文案
                      return (
                        <span
                          title="证据星积累中：系统听过他读满 5 次以上才点亮"
                          className="flex items-center gap-1 text-[10px] font-bold cursor-help text-amber-700 dark:text-amber-300"
                        >
                          <span className="inline-block size-1.5 rounded-full bg-amber-400/80 animate-pulse" />
                          <span className="text-[9px] font-black">
                            积累中
                          </span>
                        </span>
                      );
                    }

                    // attempts >= 5 且失分率高（待复测）
                    return (
                      <span
                        title={`证据星（待复测）：评测 ${attempts} 次，错误率 ${Math.round(errorRate * 100)}%（需 ≤50%）`}
                        className="flex items-center gap-0.5 text-[10px] font-bold cursor-help text-rose-600 dark:text-rose-400"
                      >
                        <span className="text-[9px] font-black">
                          待复测
                        </span>
                      </span>
                    );
                  })()}

                  {/* 细分割线 */}
                  <span className="h-3 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

                  {/* 2. 自评星（现有手动星标，数据与点亮逻辑原样不动，只改称谓与并排渲染） */}
                  <button
                    type="button"
                    data-star-btn={item.id}
                    title={isMastered ? "自评星（手动已点亮，点击取消）" : "自评星（手动未点亮，点击标记）"}
                    onClick={(e) => handleToggleMastery(e, item)}
                    className="relative flex items-center gap-0.5 text-[10px] font-bold cursor-pointer"
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
                          className="absolute size-4 rounded-full border border-amber-400 opacity-0 pointer-events-none scale-50"
                        />
                        <span data-star-dot="0" className="absolute size-1 rounded-full bg-amber-400 opacity-0 pointer-events-none" />
                        <span data-star-dot="1" className="absolute size-1 rounded-full bg-orange-400 opacity-0 pointer-events-none" />
                        <span data-star-dot="2" className="absolute size-1 rounded-full bg-yellow-400 opacity-0 pointer-events-none" />
                        <span data-star-dot="3" className="absolute size-1 rounded-full bg-amber-500 opacity-0 pointer-events-none" />
                        <span data-star-dot="4" className="absolute size-1 rounded-full bg-orange-300 opacity-0 pointer-events-none" />
                        <span data-star-dot="5" className="absolute size-1 rounded-full bg-yellow-300 opacity-0 pointer-events-none" />
                      </span>
                      <span data-star-target={item.id} className="inline-flex items-center justify-center">
                        <StarIcon
                          data-star-icon={item.id}
                          className={`size-3.5 transition-colors ${
                            isMastered
                              ? "fill-amber-400 text-amber-500 filter drop-shadow-xs"
                              : "fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-600"
                          }`}
                        />
                      </span>
                    </span>
                    <span
                      className={`text-[9px] ${
                        isMastered ? "text-amber-700 dark:text-amber-300 font-black" : "text-slate-400"
                      }`}
                    >
                      自评
                    </span>
                  </button>
                </div>

                {/* 大字母 + 音标（一行） */}
                <div className="mt-3 flex items-baseline justify-center gap-2.5">
                  <span className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-foreground group-hover:text-amber-500 transition-colors">
                    {item.letter}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400">
                    [{item.ipaSymbol}]
                  </span>
                </div>

                {/* 证据星口径说明或达标状态（中性态：样本<5 显示「积累中」与口径文案） */}
                <div className="mt-1 text-center select-none text-[10px]">
                  {(() => {
                    const cleanIpa = item.ipaSymbol.replace(/[\/\[\]]/g, "").toLowerCase().trim();
                    const slug = (item.ipaSlug || "").toLowerCase().trim();
                    const id = (item.id || "").toLowerCase().trim();
                    const stat = evidenceMap.get(cleanIpa) || evidenceMap.get(slug) || evidenceMap.get(id);
                    const attempts = stat?.attempts ?? 0;
                    const errorRate = stat?.error_rate ?? 0;
                    const isBelowThreshold = attempts < EVIDENCE_STAR_MIN_ATTEMPTS;
                    const isLit = !isBelowThreshold && errorRate <= EVIDENCE_STAR_MAX_ERROR_RATE;

                    if (isLit) {
                      return (
                        <span className="font-bold text-sky-600 dark:text-sky-400 inline-flex items-center gap-1">
                          <StarIcon className="size-3 fill-sky-500 text-sky-500" />
                          <span>证据星已点亮 ({attempts}次)</span>
                        </span>
                      );
                    }
                    if (isBelowThreshold) {
                      return (
                        <span
                          title="系统听过他读满 5 次以上才点亮"
                          className="font-medium text-slate-400 dark:text-slate-500 inline-flex items-center gap-1"
                        >
                          <span>积累中</span>
                        </span>
                      );
                    }
                    return (
                      <span className="font-medium text-rose-600/90 dark:text-rose-400/90 inline-flex items-center gap-1">
                        <span>待复测点亮 · 评测 {attempts} 次</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

      {/* 无匹配状态 */}
      {filteredAnchors.length === 0 && (
        <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm font-semibold">
            没有找到匹配的发音卡，尝试更换搜索关键词或筛选分组
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedZone("all");
              setSearchQuery("");
            }}
            className="mt-3 text-xs rounded-xl font-black"
          >
            重置所有筛选
          </Button>
        </div>
      )}


      {/* 家长学情看板（已并入本页，与 39 音素卡同一部分） */}
      {/* 互链横幅：学拼读主线 -> 词族乐园 */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 border-2 border-amber-300/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
            🦁
          </div>
          <div className="space-y-0.5 text-left">
            <h3 className="text-sm sm:text-base font-black text-foreground">
              学拼读主线在这里 → 词族乐园：五步学词族
            </h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              五步学一个词族：学韵脚 → 拼词 → 听辨 → 跟读 → 复习，短元音核心主线循序渐进！
            </p>
          </div>
        </div>
        <Link to="/families">
          <Button
            size="sm"
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <span>进入词族乐园</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </Link>
      </div>

      <ParentDashboardSection />

    </div>
  );
}
