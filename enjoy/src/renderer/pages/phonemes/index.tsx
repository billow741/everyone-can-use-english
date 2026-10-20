import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Volume2Icon,
  PlayIcon,
  PauseIcon,
  SparklesIcon,
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
  MapIcon,
  LayoutGridIcon,
  Gamepad2Icon,
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
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  syncLocalPhonemesToCloud,
  playPhonemeSound,
} from "@renderer/lib/phoneme-data";
import {
  CLASSIC_3D_FILES,
  cleanPhonemeKey,
} from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import { PhonemeCertificateModal } from "@renderer/components/pronunciation-assessments/phoneme-certificate-modal";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  PHONICS_ISLAND_ZONES,
  PHONICS_ISLAND_39_ANCHORS,
  PhonicsIslandZone,
  PhonicsAnchorItem,
  PHONICS_ISLAND_BADGES,
} from "@renderer/lib/phoneme-anchors";
import { PhonicsIslandLevelModal } from "@renderer/components/phonics/phonics-island-level-modal";
import { PhonicsIslandMap } from "@renderer/components/phonics/phonics-island-map";
import { speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";

export default function PhonemesIndex() {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<PhonicsIslandZone>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingAnchorId, setPlayingAnchorId] = useState<string | null>(null);
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());
  const [isGrandCertificateOpen, setIsGrandCertificateOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // 视图模式：卡片网格模式 (grid) vs 岛屿探险地图模式 (map)
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // 正在闯关的音素项 (模态框)
  const [activeLevelItem, setActiveLevelItem] = useState<PhonicsAnchorItem | null>(null);



  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

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
      stopAudio();
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

  // 播放音素原声与代表词
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

      audio.onended = () => {
        playStandardTts(item.anchorWord, {
          onEnd: () => {
            setPlayingAnchorId(null);
            currentAudioRef.current = null;
          },
        });
      };

      audio.onerror = () => {
        playStandardTts(item.anchorWord, {
          onEnd: () => setPlayingAnchorId(null),
        });
      };

      audio.play().catch(() => {
        playStandardTts(item.anchorWord, {
          onEnd: () => setPlayingAnchorId(null),
        });
      });
    } else {
      playPhonemeSound(item.ipaSymbol, {
        onEnd: () => {
          playStandardTts(item.anchorWord, {
            onEnd: () => setPlayingAnchorId(null),
          });
        },
      });
    }
  };

  // 切换掌握星标
  const handleToggleMastery = (e: React.MouseEvent, item: PhonicsAnchorItem) => {
    e.stopPropagation();
    const nextState = togglePhonemeMastery(item.id);
    if (item.ipaSlug && item.ipaSlug !== item.id) {
      togglePhonemeMastery(item.ipaSlug);
    }
    setMasteryMap((prev) => ({
      ...prev,
      [item.id]: nextState,
      ...(item.ipaSlug ? { [item.ipaSlug]: nextState } : {}),
    }));
  };

  // 闯关成功后同步印章与星标
  const handleLevelCompleted = (item: PhonicsAnchorItem) => {
    if (!masteryMap[item.id]) {
      togglePhonemeMastery(item.id);
      if (item.ipaSlug && item.ipaSlug !== item.id) {
        togglePhonemeMastery(item.ipaSlug);
      }
      setMasteryMap((prev) => ({
        ...prev,
        [item.id]: true,
        ...(item.ipaSlug ? { [item.ipaSlug]: true } : {}),
      }));
    }
  };

  // 敢敢大声打招呼
  const handleGanganGreet = () => {
    speakGanganPrompt(
      "嗨！我是敢敢小狮子！欢迎来到 39 自然拼读通关岛！4 座奇妙发音岛屿等你探索，快点击关卡，和我一起点亮发音星吧！"
    );
  };

  // 4 大岛区与搜索过滤
  const filteredAnchors = useMemo(() => {
    return PHONICS_ISLAND_39_ANCHORS.filter((item) => {
      // 岛区筛选
      if (selectedZone !== "all" && item.zone !== selectedZone) {
        return false;
      }
      // 搜索筛选 (字母、锚定词、中文、口诀)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchLetter = item.letter.toLowerCase().includes(q);
        const matchWord = item.anchorWord.toLowerCase().includes(q);
        const matchZh = item.anchorZh.toLowerCase().includes(q);
        const matchMnemonic = item.mnemonic.toLowerCase().includes(q);
        const matchIpa = item.ipaSymbol.toLowerCase().includes(q);
        return matchLetter || matchWord || matchZh || matchMnemonic || matchIpa;
      }
      return true;
    });
  }, [selectedZone, searchQuery]);

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
                <span>🦁 39 自然拼读通关岛 · Phonics Island</span>
              </div>

              {/* 👨‍👩‍👧 家长专属看板独立页入口 (含乘法防误触验证门) */}
              <Link to="/phonemes/parent">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer shadow-2xs bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-400/40 hover:bg-purple-500/25"
                  title="家长学情看板与学术解剖（防误触验证门）"
                >
                  <ShieldCheckIcon className="size-3.5 text-purple-600 dark:text-purple-300" />
                  <span>👨‍👩‍👧 家长专属看板</span>
                </button>
              </Link>

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
                  {isSyncing ? "云端同步中..." : isOnline ? "通关星已同步" : "本地缓存已保存"}
                </span>
                <RefreshCwIcon
                  className={`size-3 text-muted-foreground transition-transform ${
                    isSyncing ? "animate-spin text-amber-500" : ""
                  }`}
                />
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              探索 4 大发音岛屿 · 点亮 39 颗拼读通关星
            </h1>

            {/* 🦁 敢敢进驻口播伴学条 */}
            <div className="flex items-center gap-3 bg-white/85 dark:bg-slate-900/80 backdrop-blur-sm p-3 rounded-2xl border border-amber-300/50 shadow-2xs">
              <button
                type="button"
                onClick={handleGanganGreet}
                title="点击听敢敢说话"
                className="size-11 rounded-xl bg-amber-400 text-2xl flex items-center justify-center shrink-0 shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                🦁
              </button>
              <div className="flex-1 text-xs">
                <div className="font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span>敢敢小伴学:</span>
                  <span className="text-[10px] text-muted-foreground font-normal">点击头像听语音</span>
                </div>
                <p className="text-foreground/90 font-medium line-clamp-1">
                  欢迎来到通关岛！大字母配 3D 萌宠图，先听后读拼积木，一起赢取「辅音船长」勋章吧！
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGanganGreet}
                className="h-8 px-2.5 text-xs font-black text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded-xl"
              >
                <Volume2Icon className="size-3.5 mr-1" />
                <span>听敢敢说</span>
              </Button>
            </div>
          </div>

          {/* 掌握度统计卡片 */}
          <div className="bg-card/90 backdrop-blur-md border border-amber-300/40 dark:border-amber-500/20 rounded-3xl p-5 shadow-sm shrink-0 min-w-[270px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                <AwardIcon className="size-4 text-amber-500" />
                通关进度
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                {masteredCount} / 39 颗星
              </span>
            </div>
            <Progress value={masteryPercentage} className="h-3 mb-2 rounded-full" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
              <span>掌握率: {masteryPercentage}%</span>
              <span>26辅音 · 5短元音 · 5长元音 · 3r音</span>
            </div>

            <Button
              size="sm"
              onClick={() => setIsGrandCertificateOpen(true)}
              className="w-full mt-3 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm shadow-amber-500/25 cursor-pointer"
            >
              <AwardIcon className="size-4" />
              <span>生成 39 拼读通关荣誉证书</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 🚀 自然拼读 7 阶通关阶梯与 1236 练习词库超级入口 */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-amber-500/15 border-2 border-sky-300/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
            🧩
          </div>
          <div className="space-y-0.5 text-left">
            <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2 flex-wrap">
              <span>进阶特训 · 1,236 拼读练习词库</span>
              <Badge className="bg-sky-600 text-white text-[10px] font-black border-sky-400">
                7 阶阶梯 · 97 规则
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              掌握 39 音素后，进入纯净拼读积木工坊。火箭滑读（Blending）快速连读，专注字母声音拼合，无干扰轻松进阶！
            </p>
          </div>
        </div>

        <Link to="/phonics">
          <Button
            size="sm"
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-xs gap-1.5 shadow-sm shadow-sky-500/20 shrink-0 cursor-pointer"
          >
            <span>进入 7 阶拼读工坊</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </Link>
      </div>



      {/* 控制台：视图切换 (卡片网格 vs 探险地图) + 4 大岛区 Tabs + 实时搜索 */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* 4 大岛区 Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PHONICS_ISLAND_ZONES.map((zone) => {
              const isActive = selectedZone === zone.key;
              return (
                <button
                  key={zone.key}
                  onClick={() => setSelectedZone(zone.key)}
                  className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.03]"
                      : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  <span>{zone.icon}</span>
                  <span>{zone.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {zone.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 视图模式切换：🎴 卡片网格 vs 🗺️ 探险地图 */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGridIcon className="size-3.5" />
              <span>卡片网格</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "map"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="size-3.5" />
              <span>探险地图</span>
            </button>
          </div>
        </div>

        {/* 辅助状态条与搜索栏 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <CompassIcon className="size-4 text-amber-500" />
            <span>
              当前岛区：
              <strong className="text-foreground ml-1">
                {PHONICS_ISLAND_ZONES.find((z) => z.key === selectedZone)?.description}
              </strong>
            </span>
          </div>

          {/* 实时搜索框 */}
          <div className="relative sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索字母 / 锚定词 / 中文..."
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

      {/* 视图展现：🗺️ 探险地图模式 */}
      {viewMode === "map" && (
        <PhonicsIslandMap
          masteryMap={masteryMap}
          onSelectLevel={(item) => setActiveLevelItem(item)}
          selectedZone={selectedZone}
          onSelectZone={(zone) => setSelectedZone(zone)}
          onOpenGrandCertificate={() => setIsGrandCertificateOpen(true)}
        />
      )}

      {/* 视图展现：🎴 39 自然拼读代言锚定卡网格模式 */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4.5">
          {filteredAnchors.map((item) => {
            const isMastered =
              !!masteryMap[item.id] ||
              (item.ipaSlug && !!masteryMap[item.ipaSlug]);
            const isPlaying = playingAnchorId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setActiveLevelItem(item)}
                className={`group relative rounded-3xl border-2 transition-all duration-200 cursor-pointer p-4 flex flex-col justify-between overflow-hidden bg-card hover:shadow-xl hover:-translate-y-1 select-none ${
                  isMastered
                    ? "border-amber-400 bg-amber-500/5 shadow-amber-500/10"
                    : "border-border hover:border-amber-400 shadow-xs"
                } ${isPlaying ? "ring-4 ring-amber-400/50 scale-[1.02]" : ""}`}
              >
                {/* 卡片顶部：序号、大字母标签与通关星标 */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono text-muted-foreground font-black bg-muted/60 px-2 py-0.5 rounded-lg">
                      #{String(item.order).padStart(2, "0")}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0.5 px-2 font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30"
                    >
                      {item.zoneName}
                    </Badge>


                  </div>

                  {/* 掌握度切换小星星 (触控区域 ≥ 40px) */}
                  <button
                    type="button"
                    title={isMastered ? "已点亮通关星 (点击取消)" : "点击点亮通关星"}
                    onClick={(e) => handleToggleMastery(e, item)}
                    className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:scale-125 transition-all cursor-pointer"
                  >
                    <StarIcon
                      className={`size-5 ${
                        isMastered
                          ? "fill-amber-400 text-amber-500 filter drop-shadow-sm"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                </div>

                {/* 🌟 核心：高清 3D 萌趣锚定图 (3D Pixar Style) */}
                <div
                  className={`w-full h-32 sm:h-36 rounded-2xl bg-gradient-to-b ${item.colorBg} flex items-center justify-center p-2.5 relative my-1 shadow-inner border border-black/5 overflow-hidden group/pic`}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <img
                      src={item.imageUrl}
                      alt={`${item.anchorWord} ${item.anchorZh}`}
                      className={`w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 ${
                        isPlaying
                          ? "scale-115 animate-bounce"
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

                {/* 中间核心：儿童大字母与拟声口诀 (字母优先，0 抽象学术术语) */}
                <div className="my-2 text-center space-y-1">
                  <div className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-foreground group-hover:text-amber-500 transition-colors">
                    {item.letter}
                  </div>
                  <div
                    className="text-xs font-black text-amber-800 dark:text-amber-300 line-clamp-1"
                    title={item.mnemonic}
                  >
                    {item.mnemonic}
                  </div>


                </div>

                {/* 卡片底部操作栏：🎮 闯关通关大按钮 + 快速试听 */}
                <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLevelItem(item);
                    }}
                    className="h-10 flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Gamepad2Icon className="size-4" />
                    <span>{isMastered ? "⭐ 重温通关" : "🎮 去闯关"}</span>
                  </Button>

                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={(e) => handlePlayAnchor(e, item)}
                    title="快速听发音"
                    className="size-10 p-0 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                  >
                    <Volume2Icon className={`size-4 ${isPlaying ? "text-amber-500 animate-pulse" : ""}`} />
                  </Button>


                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 无匹配状态 */}
      {viewMode === "grid" && filteredAnchors.length === 0 && (
        <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm font-semibold">
            没有找到匹配的岛屿发音卡，尝试更换搜索关键词或筛选岛区
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

      {/* 🎮 关卡通关挑战舱模态弹窗 (P1 核心功能) */}
      <PhonicsIslandLevelModal
        item={activeLevelItem}
        isOpen={Boolean(activeLevelItem)}
        onClose={() => setActiveLevelItem(null)}
        onLevelCompleted={handleLevelCompleted}
        masteryMap={masteryMap}
      />

      {/* 荣誉证书弹窗 */}
      <PhonemeCertificateModal
        isOpen={isGrandCertificateOpen}
        onClose={() => setIsGrandCertificateOpen(false)}
        masteryMap={masteryMap}
        mode="grand"
      />
    </div>
  );
}
