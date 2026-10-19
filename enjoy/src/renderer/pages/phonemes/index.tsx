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
} from "lucide-react";
import {
  Badge,
  Button,
  Input,
  Progress,
} from "@renderer/components/ui";
import {
  ALL_39_PHONEMES,
  PHONEME_GROUPS,
  PhonemeGroupKey,
  PhonemeItem,
  getPhonemeMasteryMap,
  togglePhonemeMastery,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  syncLocalPhonemesToCloud,
} from "@renderer/lib/phoneme-data";
import {
  CLASSIC_3D_FILES,
  cleanPhonemeKey,
} from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import { PhonemeBadgesWall } from "@renderer/components/pronunciation-assessments/phoneme-badges-wall";
import { PhonemeCertificateModal } from "@renderer/components/pronunciation-assessments/phoneme-certificate-modal";
import { CustomPhonemePractice } from "@renderer/components/pronunciation-assessments/custom-phoneme-practice";
import { playStandardTts } from "@renderer/lib/phonetics-coach";

export default function PhonemesIndex() {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<PhonemeGroupKey>("all");
  const [voicingFilter, setVoicingFilter] = useState<"all" | "voiced" | "unvoiced">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [playingPhonemeId, setPlayingPhonemeId] = useState<string | null>(null);
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());
  const [isGrandCertificateOpen, setIsGrandCertificateOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // 停止当前正在播放的音频
  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setPlayingPhonemeId(null);
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

  // 试听音标原厂纯音轨或 TTS
  const handlePlayPreview = (e: React.MouseEvent, item: PhonemeItem) => {
    e.stopPropagation();

    if (playingPhonemeId === item.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setPlayingPhonemeId(item.id);

    const cleanKey = cleanPhonemeKey(item.id);
    const audioFile = CLASSIC_3D_FILES[cleanKey] || CLASSIC_3D_FILES[item.id];

    if (audioFile) {
      const audio = new Audio(`/assets/phonetics-3d/audio/${audioFile}.mp3`);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingPhonemeId(null);
        currentAudioRef.current = null;
      };

      audio.onerror = () => {
        // Fallback to sample word TTS
        playStandardTts(item.sampleWord, {
          onEnd: () => setPlayingPhonemeId(null),
        });
      };

      audio.play().catch(() => {
        playStandardTts(item.sampleWord, {
          onEnd: () => setPlayingPhonemeId(null),
        });
      });
    } else {
      playStandardTts(item.sampleWord, {
        onEnd: () => setPlayingPhonemeId(null),
      });
    }
  };

  // 切换掌握星标
  const handleToggleMastery = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const nextState = togglePhonemeMastery(id);
    setMasteryMap((prev) => ({
      ...prev,
      [id]: nextState,
    }));
  };

  // 过滤音标列表
  const filteredPhonemes = useMemo(() => {
    return ALL_39_PHONEMES.filter((item) => {
      // 分类筛选
      if (selectedGroup !== "all" && item.group !== selectedGroup) {
        return false;
      }
      // 清浊音筛选
      if (voicingFilter === "voiced" && !item.voiced) {
        return false;
      }
      if (voicingFilter === "unvoiced" && item.voiced) {
        return false;
      }
      // 搜索筛选 (音标符号、中文名称、例词)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchSymbol = item.id.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        const matchWord = item.sampleWord.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        return matchSymbol || matchName || matchWord || matchCategory;
      }
      return true;
    });
  }, [selectedGroup, voicingFilter, searchQuery]);

  // 掌握进度统计
  const masteredCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => masteryMap[p.id]).length;
  }, [masteryMap]);

  const masteryPercentage = Math.round((masteredCount / ALL_39_PHONEMES.length) * 100);

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 顶部 Hero 横幅 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-purple-500/15 border border-amber-500/20 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                <SparklesIcon className="size-3.5" />
                <span>39 国际音标通关工坊 · IPA Master Island</span>
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
                  {isSyncing ? "云端同步中..." : isOnline ? "云端数据库已同步" : "本地缓存已保存"}
                </span>
                <RefreshCwIcon
                  className={`size-3 text-muted-foreground transition-transform ${
                    isSyncing ? "animate-spin text-amber-500" : ""
                  }`}
                />
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              英语底层发音地基 · 39 音沉浸式通关
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              覆盖美式与国际音标核心 39 音，配套原厂 3D 解剖动效、三步黄金通关口诀与最小对立体（Minimal Pairs）辨析，告别中式发音。
            </p>
          </div>

          {/* 掌握度统计卡片 */}
          <div className="bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs shrink-0 min-w-[260px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <AwardIcon className="size-4 text-amber-500" />
                通关进度
              </span>
              <span className="text-xs font-bold text-amber-500 font-mono">
                {masteredCount} / 39 音标
              </span>
            </div>
            <Progress value={masteryPercentage} className="h-2.5 mb-2" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>掌握率: {masteryPercentage}%</span>
              <span>11单元音 · 5双元音 · 23辅音</span>
            </div>

            <Button
              size="sm"
              onClick={() => setIsGrandCertificateOpen(true)}
              className="w-full mt-3 h-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm shadow-amber-500/20 cursor-pointer"
            >
              <AwardIcon className="size-3.5" />
              <span>生成 39 音标荣誉证书</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 🚀 自然拼读 7 阶阶梯与 1236 词库超级入口 */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-300/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
            🧩
          </div>
          <div className="space-y-0.5 text-left">
            <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2 flex-wrap">
              <span>全新上线 · 自然拼读 7 阶通关阶梯</span>
              <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black border-amber-400">
                1,236 分级词 · 97 规则
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              从字母音启蒙到高阶辅音连缀，包含 150 节循序递进课程。提供拼读积木动态拆解与连贯滑读（Blending）工坊！
            </p>
          </div>
        </div>

        <Link to="/phonics">
          <Button
            size="sm"
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs gap-1.5 shadow-sm shadow-orange-500/20 shrink-0 cursor-pointer"
          >
            <span>进入 7 阶拼读工坊</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* 🏆 音标通关成就勋章殿堂 */}
      <PhonemeBadgesWall masteryMap={masteryMap} />

      {/* 🎯 自定义发音与连音特训工坊 (tr, dr, ts, dz, th...) */}
      <CustomPhonemePractice defaultSound="tr" />

      {/* 控制台：分类 Tab 栏 + 筛选搜索栏 */}
      <div className="space-y-4">
        {/* 分类 Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {PHONEME_GROUPS.map((group) => {
            const isActive = selectedGroup === group.key;
            return (
              <button
                key={group.key}
                onClick={() => setSelectedGroup(group.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]"
                    : "bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                <span>{group.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-slate-950/20 text-slate-950" : "bg-background/80 text-muted-foreground"
                  }`}
                >
                  {group.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 筛选与搜索辅助条 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border">
          {/* 声带振动筛选 */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground text-xs font-semibold mr-1 shrink-0">声带状态:</span>
            <Button
              size="sm"
              variant={voicingFilter === "all" ? "default" : "ghost"}
              onClick={() => setVoicingFilter("all")}
              className="h-8 rounded-lg text-xs"
            >
              全部
            </Button>
            <Button
              size="sm"
              variant={voicingFilter === "unvoiced" ? "default" : "ghost"}
              onClick={() => setVoicingFilter("unvoiced")}
              className="h-8 rounded-lg text-xs"
            >
              清辅音 (11)
            </Button>
            <Button
              size="sm"
              variant={voicingFilter === "voiced" ? "default" : "ghost"}
              onClick={() => setVoicingFilter("voiced")}
              className="h-8 rounded-lg text-xs"
            >
              浊辅音与元音 (28)
            </Button>
          </div>

          {/* 实时搜索框 */}
          <div className="relative sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索音标 / 词汇 / 分类..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 39 音标卡片展示网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredPhonemes.map((item) => {
          const isMastered = !!masteryMap[item.id];
          const isPlaying = playingPhonemeId === item.id;
          const isVowel = item.group === "monophthongs" || item.group === "diphthongs";

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/phonemes/${item.slug}`)}
              className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer p-4 flex flex-col justify-between overflow-hidden bg-card hover:shadow-xl hover:-translate-y-0.5 ${
                isMastered
                  ? "border-emerald-500/40 dark:border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500"
                  : "border-border hover:border-amber-500/70"
              }`}
            >
              {/* 卡片顶部：序号、分类徽章与掌握星标 */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                    #{String(item.order).padStart(2, "0")}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] py-0 px-1.5 font-bold ${
                      isVowel
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20"
                    }`}
                  >
                    {item.category}
                  </Badge>
                  {item.voiced ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded">
                      浊音
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-muted px-1 py-0.2 rounded">
                      清音
                    </span>
                  )}
                </div>

                {/* 掌握度切换小星星 */}
                <button
                  type="button"
                  title={isMastered ? "已掌握 (点击取消)" : "点击标记为已掌握"}
                  onClick={(e) => handleToggleMastery(e, item.id)}
                  className="p-1 rounded-full text-muted-foreground hover:text-amber-500 hover:scale-110 transition-transform"
                >
                  <StarIcon
                    className={`size-4 ${
                      isMastered ? "fill-amber-400 text-amber-500" : "text-muted-foreground/60"
                    }`}
                  />
                </button>
              </div>

              {/* 中间核心：大字号音标符号与中文名称 */}
              <div className="my-2 text-center py-2">
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground group-hover:text-amber-500 transition-colors flex items-center justify-center gap-1">
                  <span>[</span>
                  <span className="text-amber-500 dark:text-amber-400">{item.id}</span>
                  <span>]</span>
                </div>
                <div className="text-xs font-bold text-foreground/80 mt-1.5 line-clamp-1" title={item.name}>
                  {item.name.replace(/\(.*\)/, "").trim()}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                  <span>例词:</span>
                  <span className="font-semibold text-foreground font-mono">{item.sampleWord}</span>
                  <span className="text-muted-foreground/80">({item.phonicsSpell})</span>
                </div>
              </div>

              {/* 卡片底部操作栏 */}
              <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                {/* 快速试听按钮 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handlePlayPreview(e, item)}
                  className={`h-7 px-2 text-[11px] rounded-lg gap-1 transition-all ${
                    isPlaying
                      ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                      : "hover:bg-amber-500/10 hover:text-amber-600"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <PauseIcon className="size-3 fill-current" />
                      <span>播放中</span>
                    </>
                  ) : (
                    <>
                      <Volume2Icon className="size-3" />
                      <span>试听</span>
                    </>
                  )}
                </Button>

                {/* 进入工坊按钮 */}
                <div className="text-[11px] font-bold text-amber-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-0.5">
                  <span>3D解剖</span>
                  <ArrowRightIcon className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPhonemes.length === 0 && (
        <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm">没有找到匹配的音标，尝试更换搜索关键词或筛选分类</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedGroup("all");
              setVoicingFilter("all");
              setSearchQuery("");
            }}
            className="mt-3 text-xs rounded-xl"
          >
            重置所有筛选
          </Button>
        </div>
      )}

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
