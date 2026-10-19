import React, { useState, useEffect, useMemo, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppSettingsProviderContext } from "@renderer/context";
import { toast } from "sonner";
import {
  getOpenPhonicsCatalog,
  PHONICS_PHASES_META,
  PhonicsPhaseMeta,
  PhonicsSound,
  PhonicsWord,
  getPhonicsWords,
  getSoundsByPhase,
  playPhonicsSound,
  playPhonicsTokenSound,
  playPhonicsWordSound,
  getPhonicsTokenIpa,
  isPhonicsVowel,
  isDigraphOrMultiLetter,
} from "@renderer/lib/open-phonics-service";
import { getPhonicsWordVisual } from "@renderer/lib/phonics-child-visuals";
import { LoaderSpin } from "@renderer/components";
import {
  Button,
  Input,
  Badge,
} from "@renderer/components/ui";
import { PhonicsWordBlendingModal } from "@renderer/components/phonics/phonics-word-blending-modal";
import {
  SparklesIcon,
  SearchIcon,
  Volume2Icon,
  MicIcon,
  LayersIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  BookOpenIcon,
  FlameIcon,
  StarIcon,
  CheckCircle2Icon,
  XIcon,
  PlayIcon,
  FilterIcon,
  RotateCcwIcon,
} from "lucide-react";

// 全局 Phase 0 元数据 (用于汇总全景 1,236 词)
const ALL_PHASES_META: PhonicsPhaseMeta = {
  id: 0,
  title: "All 7 Phases",
  titleZh: "全景 7 阶自然拼读阶梯",
  subtitle: "Lessons 1-150 · 1,236 个分级解码词库全景",
  lessonRange: "1-150",
  description: "Complete synthetic phonics ladder covering all 97 rules, from single letters to multi-syllables.",
  descriptionZh: "自然拼读完整进阶地图：从字母发音、短元音、二合字母、卷舌音、双元音战队到复合辅音与词根词缀，循序渐进夯实自主阅读能力！",
  emoji: "🌈",
  color: "from-amber-500/20 via-orange-500/15 to-purple-500/20",
  accentBorder: "border-amber-400/60",
  badgeBg: "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-400/50",
  ageBadge: "适合 3~12 岁少儿",
};

export default function PhonicsIndex() {
  const navigate = useNavigate();
  const { webApi } = useContext(AppSettingsProviderContext);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<number>(1); // 0 为全部，1~7 为各分阶
  const [selectedSound, setSelectedSound] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayCount, setDisplayCount] = useState<number>(48);
  const [words, setWords] = useState<PhonicsWord[]>([]);
  const [phaseSounds, setPhaseSounds] = useState<PhonicsSound[]>([]);
  const [activeModalWord, setActiveModalWord] = useState<PhonicsWord | null>(null);
  const [activePlayingSound, setActivePlayingSound] = useState<string | null>(null);
  const [bookmarkedWords, setBookmarkedWords] = useState<Record<string, boolean>>({});

  // 收藏单词至生词本
  const handleBookmarkWord = async (item: PhonicsWord) => {
    try {
      if (webApi?.lookup) {
        await webApi.lookup({
          word: item.word,
          context: item.note
            ? `[Phonics Phase ${item.phase}] ${item.note}`
            : `Phonics Phase ${item.phase} Lesson ${item.lesson}`,
          sourceType: "phonics",
        });
      }
      setBookmarkedWords((prev) => ({ ...prev, [item.word]: true }));
      toast.success(`单词 "${item.word}" 已成功收录至生词本！`);
    } catch (e: any) {
      toast.error(e?.message || "收录失败，请重试");
    }
  };

  // 初始化加载与阶段切换
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      getPhonicsWords({ phaseId: selectedPhase }),
      getSoundsByPhase(selectedPhase),
    ]).then(([phaseWords, sounds]) => {
      if (!mounted) return;
      setWords(phaseWords);
      setPhaseSounds(sounds);
      setSelectedSound("all");
      setDisplayCount(48);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [selectedPhase]);

  // 当音素或搜索词改变时，重置分页展示量
  useEffect(() => {
    setDisplayCount(48);
  }, [selectedSound, searchQuery]);

  // 根据音素和搜索词筛选词库
  const filteredWords = useMemo(() => {
    let list = words;

    if (selectedSound !== "all") {
      const sym = selectedSound.toLowerCase();
      list = list.filter((w) =>
        w.sounds.some((s) => s.toLowerCase() === sym)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.sounds.some((s) => s.toLowerCase().includes(q)) ||
          `l${w.lesson}`.includes(q) ||
          `lesson ${w.lesson}`.includes(q) ||
          (w.note && w.note.toLowerCase().includes(q))
      );
    }

    return list;
  }, [words, selectedSound, searchQuery]);

  const currentPhaseMeta =
    selectedPhase === 0
      ? ALL_PHASES_META
      : PHONICS_PHASES_META.find((p) => p.id === selectedPhase) || PHONICS_PHASES_META[0];

  // 播放音素预览声音
  const handlePreviewSound = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setActivePlayingSound(symbol);
    await playPhonicsTokenSound(symbol);
    setTimeout(() => setActivePlayingSound(null), 300);
  };

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-7 pb-24">
      {/* 1. 顶部 Header 拼读阶梯全景横幅 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-6 sm:p-8 text-slate-950 shadow-xl shadow-amber-500/15 border-2 border-amber-300">
        <div className="absolute -right-6 -bottom-6 text-9xl opacity-15 select-none pointer-events-none">
          🧩
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/35 backdrop-blur-md text-xs font-black text-slate-950 border border-white/50">
            <SparklesIcon className="size-3.5 fill-slate-950" />
            <span>SunnyBridge 阳光桥 · 合成自然拼读分级阶梯</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950 flex items-center gap-2">
            <span>🦁 敢敢拼读魔法岛</span>
            <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-950 text-amber-300 shadow-sm">
              7 阶大通关
            </span>
          </h1>

          <p className="text-xs sm:text-sm font-bold text-slate-900/90 leading-relaxed">
            玩积木，学拼读！从前 10 个声音出发，跟着敢敢把字母拼起来，点亮 1,236 颗发音能量星！
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-2.5 text-xs font-black">
            <div className="flex items-center gap-1.5 bg-white/80 px-3.5 py-1.5 rounded-xl border border-white/60 shadow-2xs">
              <span>🌟 闯关点亮能量星</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 px-3.5 py-1.5 rounded-xl border border-white/60 shadow-2xs">
              <span>🚀 火箭滑读大合体</span>
            </div>
            <Link
              to="/phonemes"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 px-3.5 py-1.5 rounded-xl border border-amber-400/50 shadow-md transition-all hover:scale-105 cursor-pointer ml-auto font-black"
              title="前往 39 自然拼读通关岛"
            >
              <SparklesIcon className="size-3.5 fill-current" />
              <span>39 自然拼读通关岛 ➔</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 7 阶段选择器 Tabs (包含全景 1236 词汇汇聚 Tab) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {/* 全部阶梯汇聚 Tab */}
        <button
          type="button"
          onClick={() => setSelectedPhase(0)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
            selectedPhase === 0
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
              : "bg-card text-foreground hover:bg-muted border border-border"
          }`}
        >
          <span>🌈</span>
          <span>全部阶梯</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              selectedPhase === 0
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            1236词
          </span>
        </button>

        {/* Phase 1 ~ 7 单阶 Tabs */}
        {PHONICS_PHASES_META.map((phase) => {
          const active = selectedPhase === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setSelectedPhase(phase.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all shrink-0 cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
                  : "bg-card text-foreground hover:bg-muted border border-border"
              }`}
            >
              <span>{phase.emoji}</span>
              <span>Phase {phase.id}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {phase.lessonRange}课
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. 当前阶段目标与教学法说明横幅 */}
      <div
        className={`p-5 sm:p-6 rounded-3xl bg-gradient-to-r ${currentPhaseMeta.color} border-2 ${currentPhaseMeta.accentBorder} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm`}
      >
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{currentPhaseMeta.emoji}</span>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              {currentPhaseMeta.titleZh}
            </h2>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentPhaseMeta.badgeBg}`}
            >
              {currentPhaseMeta.ageBadge}
            </span>
            <span className="text-xs font-mono font-bold text-muted-foreground">
              {currentPhaseMeta.subtitle}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/80 font-medium leading-relaxed">
            {currentPhaseMeta.descriptionZh}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <div className="text-xs font-black px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900 border border-border text-foreground shadow-2xs">
            本阶共 <span className="text-amber-600 font-mono text-sm">{words.length}</span> 个可解码词
          </div>
        </div>
      </div>

      {/* 4. 音素筛选 Chips 与 即时搜索框 */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* 即时搜索框 */}
          <div className="relative w-full sm:w-80 shrink-0">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索单词、音素 (如 sh, ea)、课时 (如 L14)..."
              className="pl-9 pr-8 h-10 rounded-2xl bg-card text-xs font-bold shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="清空搜索"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* 筛选统计提示 */}
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span>
              已筛选出 <strong className="text-amber-600 font-mono text-sm">{filteredWords.length}</strong> 个词
            </span>
            {searchQuery && (
              <Badge variant="outline" className="text-[11px] font-bold text-amber-600">
                关键字: {searchQuery}
              </Badge>
            )}
            {selectedSound !== "all" && (
              <Badge variant="outline" className="text-[11px] font-bold text-orange-600">
                音素: /{selectedSound}/
              </Badge>
            )}
          </div>
        </div>

        {/* 音素快速筛选 Chips 滚动栏 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSound("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              selectedSound === "all"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            全部音素 ({words.length})
          </button>

          {phaseSounds.map((snd) => {
            const count = words.filter((w) =>
              w.sounds.some((s) => s.toLowerCase() === snd.symbol.toLowerCase())
            ).length;
            const active = selectedSound === snd.symbol;
            const ipa = getPhonicsTokenIpa(snd.symbol);
            const isPlaying = activePlayingSound === snd.symbol;

            return (
              <div
                key={snd.symbol}
                onClick={() => setSelectedSound(snd.symbol)}
                className={`group px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  active
                    ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs scale-105"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border-border/70"
                }`}
                title={`音素 /${snd.symbol}/ (${snd.pronounced}) · 单击筛选，点击小喇叭试听`}
              >
                <span>{snd.symbol}</span>
                <span className={`text-[10px] font-sans font-normal ${active ? "text-slate-950/80" : "opacity-60"}`}>
                  {ipa}
                </span>
                <span className={`text-[10px] font-sans ${active ? "text-slate-950/70" : "opacity-50"}`}>
                  ({count})
                </span>
                <button
                  type="button"
                  onClick={(e) => handlePreviewSound(e, snd.symbol)}
                  className={`size-4 rounded-md flex items-center justify-center transition-colors ${
                    active ? "hover:bg-slate-950/15 text-slate-950" : "hover:bg-amber-500/20 text-amber-600"
                  }`}
                  title="试听纯音素"
                >
                  <Volume2Icon className={`size-3 ${isPlaying ? "animate-ping" : ""}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 分级可解码词汇卡片网格 */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <LoaderSpin />
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-muted/20 border-2 border-dashed border-border p-6 space-y-3">
          <p className="text-base font-black text-foreground">没有找到匹配的拼读词</p>
          <p className="text-xs text-muted-foreground">
            试试点击“全部音素”或清空搜索关键字
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedSound("all");
              setSearchQuery("");
            }}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <RotateCcwIcon className="size-3.5" />
            <span>重置筛选条件</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredWords.slice(0, displayCount).map((item, idx) => {
              const isTrick = Boolean(item.note);

              return (
                <div
                  key={`${item.word}-${item.lesson}-${idx}`}
                  onClick={() => {
                    playPhonicsWordSound(item.word, { voice: "en-GB-SoniaNeural", rate: "-5%" });
                  }}
                  className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-3xl bg-card hover:bg-amber-50/40 dark:hover:bg-slate-800/60 border-2 border-border/70 hover:border-amber-400 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer select-none"
                  title="点击卡片听读发音"
                >
                  <div>
                    {/* 顶部探险站台与收藏星星 */}
                    <div className="flex items-center justify-between text-[11px] font-black text-muted-foreground mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-200 font-mono text-[11px]">
                          第 {item.lesson} 站
                        </span>
                        {isTrick && (
                          <span
                            className="size-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] shadow-2xs font-sans"
                            title="淘气魔法词"
                          >
                            ⭐
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookmarkWord(item);
                          }}
                          className={`size-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            bookmarkedWords[item.word]
                              ? "text-amber-500 bg-amber-500/20 shadow-2xs"
                              : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                          }`}
                          title={bookmarkedWords[item.word] ? "已收录" : "装进魔法生词本"}
                        >
                          <StarIcon className={`size-4 ${bookmarkedWords[item.word] ? "fill-current" : ""}`} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playPhonicsWordSound(item.word, { voice: "en-GB-SoniaNeural", rate: "-5%" });
                          }}
                          className="size-8 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="听发音"
                        >
                          <Volume2Icon className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* 核心单词大字 (拼读纯净卡：聚焦字母形，坚决避免看图猜词) */}
                    <div className="text-center py-4 my-1.5 rounded-2xl bg-muted/20 border border-border/40 group-hover:bg-amber-500/10 group-hover:border-amber-300/60 transition-colors">
                      <h3 className="font-mono text-3xl sm:text-4xl font-black text-foreground group-hover:text-amber-600 transition-colors tracking-wide">
                        {item.word}
                      </h3>
                      {isTrick && (
                        <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-1 flex items-center justify-center gap-1">
                          <span>⭐</span>
                          <span>淘气词 · 整体认读</span>
                        </div>
                      )}
                    </div>

                    {/* 拼读积木音素切分 */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                      {item.sounds.map((s, sIdx) => {
                        const ipa = getPhonicsTokenIpa(s);
                        const isVowel = isPhonicsVowel(s);
                        const isBar = isDigraphOrMultiLetter(s);
                        return (
                          <div
                            key={`${s}-${sIdx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playPhonicsTokenSound(s);
                            }}
                            className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-0.5 shadow-2xs hover:scale-110 active:scale-95 ${
                              isVowel
                                ? "bg-amber-100/90 text-amber-950 border-amber-300 hover:bg-amber-200"
                                : "bg-sky-50 text-sky-950 border-sky-200 hover:bg-sky-100"
                            }`}
                            title={`音素 ${ipa} - 点我听发音`}
                          >
                            <div className="flex items-center gap-0.5">
                              <span>{s}</span>
                              <span className="text-[9px] opacity-70 font-sans">{ipa}</span>
                            </div>
                            <div className="h-1 flex items-center justify-center">
                              {isBar ? (
                                <span className="h-0.5 w-3.5 rounded-full bg-orange-500/80" />
                              ) : (
                                <span className="size-1 rounded-full bg-orange-500/80" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 卡片底部操作：大触控区（>=44px 高度）符合少儿操作习惯 */}
                  <div className="mt-3.5 pt-2.5 border-t border-border/50 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalWord(item);
                      }}
                      className="h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <span>🧩</span>
                      <span>拼一拼</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/pronunciation_assessments?text=${encodeURIComponent(
                            item.word
                          )}&source=phonics`
                        );
                      }}
                      className="h-10 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-1 cursor-pointer border border-emerald-400/40 active:scale-95 transition-all"
                      title="大声跟读"
                    >
                      <MicIcon className="size-3.5" />
                      <span>读一读</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. 查看更多按钮 (分批流畅加载) */}
          {filteredWords.length > displayCount && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => setDisplayCount((prev) => prev + 48)}
                className="h-11 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-2 shadow-sm cursor-pointer"
              >
                <span>加载更多拼读词</span>
                <span className="text-[11px] opacity-75 font-mono">
                  (已看 {displayCount} / 剩 {filteredWords.length - displayCount} 个)
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setDisplayCount(filteredWords.length)}
                className="h-11 px-5 rounded-2xl text-xs font-bold cursor-pointer"
              >
                全部展开 ({filteredWords.length} 个)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 7. 底部联动横幅：直通 39 国际音标工坊 */}
      <div className="mt-10 p-5 rounded-3xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-orange-500/10 border-2 border-purple-300/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
            💎
          </div>
          <div>
            <h4 className="text-sm font-black text-foreground">
              想深入探索发音机理？查看 3D 发音魔法镜与舌位解剖图
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              39 国际音标宝藏库提供 3D 矢状面口型、声带振动感应与最小对立体（Minimal Pairs）精细特训！
            </p>
          </div>
        </div>

        <Link to="/phonemes">
          <Button
            size="sm"
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <span>进入 39 自然拼读通关岛</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* 🧩 拼读积木动态滑读弹窗 (严格 await 结束，锁定 Sonia 牛津英音) */}
      <PhonicsWordBlendingModal
        word={activeModalWord}
        open={Boolean(activeModalWord)}
        onOpenChange={(open) => {
          if (!open) setActiveModalWord(null);
        }}
      />
    </div>
  );
}
