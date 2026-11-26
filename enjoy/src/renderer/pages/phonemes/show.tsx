import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import {
  ArrowLeftIcon,
  Volume2Icon,
  StarIcon,
  ArrowRightIcon,
  MicIcon,
  EarIcon,
  EyeIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@renderer/components/ui";
import {
  getPhonemeById,
  getAdjacentPhonemes,
  ALL_39_PHONEMES,
  getPhonemeMasteryMap,
  toggleAnchorMastery,
  playPhonemeSound,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  syncLocalPhonemesToCloud,
} from "@renderer/lib/phoneme-data";
import { ArticulatoryTongueVisualizer } from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import { MinimalPairsChallenge } from "@renderer/components/pronunciation-assessments/minimal-pairs-challenge";
import { PhonemeRecordingStation } from "@renderer/components/pronunciation-assessments/phoneme-recording-station";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { PHONICS_ISLAND_39_ANCHORS } from "@renderer/lib/phoneme-anchors";
import { PhonemeLinkageCard } from "@renderer/components/phonics/phoneme-guide-section";
import { PhonemeSyncPill } from "@renderer/components/phonics/phoneme-sync-pill";
import {
  PhonemeSpellingPartnersSection,
  HighlightTargetLetters,
} from "@renderer/components/phonics/phoneme-spelling-partners";

export default function PhonemeShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentPhoneme = getPhonemeById(id || "p") || ALL_39_PHONEMES[0];
  const guideAnchor = PHONICS_ISLAND_39_ANCHORS.find(
    (a) => a.ipaSlug === currentPhoneme.slug || a.id === currentPhoneme.id
  );
  const [searchParams] = useSearchParams();
  const srcAnchorId = searchParams.get("anchor");
  const srcAnchor = srcAnchorId
    ? PHONICS_ISLAND_39_ANCHORS.find((a) => a.id === srcAnchorId)
    : undefined;
  const displayAnchor =
    srcAnchor && getPhonemeById(srcAnchor.ipaSlug)?.id === currentPhoneme.id
      ? srcAnchor
      : guideAnchor;

  // 切换器跟随卡片字母序（与列表页同一套顺序），无对应卡时回落旧逻辑
  const anchorIdx = guideAnchor ? PHONICS_ISLAND_39_ANCHORS.indexOf(guideAnchor) : -1;
  const fallbackAdj = getAdjacentPhonemes(currentPhoneme.id);
  const prev =
    anchorIdx >= 0
      ? (() => {
          const a =
            PHONICS_ISLAND_39_ANCHORS[
              (anchorIdx - 1 + PHONICS_ISLAND_39_ANCHORS.length) %
                PHONICS_ISLAND_39_ANCHORS.length
            ];
          return { slug: a.ipaSlug, symbol: a.ipaSymbol, sampleWord: a.anchorWord };
        })()
      : fallbackAdj.prev;
  const next =
    anchorIdx >= 0
      ? (() => {
          const a =
            PHONICS_ISLAND_39_ANCHORS[
              (anchorIdx + 1) % PHONICS_ISLAND_39_ANCHORS.length
            ];
          return { slug: a.ipaSlug, symbol: a.ipaSymbol, sampleWord: a.anchorWord };
        })()
      : fallbackAdj.next;

  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );
  const [playingPureSound, setPlayingPureSound] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [playingBlock, setPlayingBlock] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribePhonemeMastery((state) => {
      setMasteryMap(state.masteryMap);
      if (typeof state.isSyncing === "boolean") setIsSyncing(state.isSyncing);
      if (typeof state.isOnline === "boolean") setIsOnline(state.isOnline);
    });

    fetchPhonemesCloudProgress().then((state) => {
      setMasteryMap(state.masteryMap);
      setIsOnline(state.isOnline);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, []);

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

  const isMastered =
    !!masteryMap[currentPhoneme.id] ||
    !!masteryMap[currentPhoneme.slug] ||
    (!!displayAnchor && !!masteryMap[displayAnchor.id]);

  // 播放纯音素（严格纯音素单音）
  const handlePlayPure = () => {
    if (playingPureSound) return;
    setPlayingPureSound(true);
    playPhonemeSound(currentPhoneme.id, {
      onEnd: () => setPlayingPureSound(false),
    });
  };

  // 播放拼读音素积木 (纯正音素发音，绝不念字母名称)
  const handlePlayBlock = (letters: string, phoneme: string) => {
    const key = `${letters}-${phoneme}`;
    if (playingBlock === key) return;
    setPlayingBlock(key);
    playPhonemeSound(phoneme, {
      onEnd: () => setPlayingBlock(null),
    });
  };

  // 键盘快捷键监听：左右箭头键切换上一个/下一个音标
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowLeft") {
        navigate(`/phonemes/${prev.slug}`);
      } else if (e.key === "ArrowRight") {
        navigate(`/phonemes/${next.slug}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prev.slug, next.slug, navigate]);

  // 切换自评星标状态（音素键 + 锚点键成对切换）
  const handleToggleMastery = (e?: React.MouseEvent) => {
    const anchorKey = guideAnchor && guideAnchor.id !== currentPhoneme.id ? guideAnchor.id : null;
    const nextState = toggleAnchorMastery(currentPhoneme.id, anchorKey);
    setMasteryMap((prevMap) => ({
      ...prevMap,
      [currentPhoneme.id]: nextState,
      ...(anchorKey ? { [anchorKey]: nextState } : {}),
    }));
    if (nextState) {
      toast.success(`已点亮 [${currentPhoneme.symbol}] 自评星！`);
    }

    if (e?.currentTarget) {
      const btn = e.currentTarget as HTMLElement;
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (nextState) {
        if (isReduced) {
          gsap.fromTo(btn, { opacity: 0.6 }, { opacity: 1, duration: 0.25 });
        } else {
          gsap.timeline({ overwrite: "auto" })
            .to(btn, { scale: 0.9, duration: 0.08, ease: "power1.in" })
            .to(btn, { scale: 1.12, duration: 0.14, ease: "back.out(2)" })
            .to(btn, { scale: 1, duration: 0.18, ease: "power2.out" });
        }
      } else {
        if (isReduced) {
          gsap.fromTo(btn, { opacity: 0.6 }, { opacity: 1, duration: 0.2 });
        } else {
          gsap.timeline({ overwrite: "auto" })
            .to(btn, { scale: 0.92, duration: 0.1, ease: "power1.in" })
            .to(btn, { scale: 1, duration: 0.16, ease: "power1.out" });
        }
      }
    }
  };

  // 播放例词读音
  const handlePlayWord = (word: string) => {
    if (playingWord === word) return;
    setPlayingWord(word);
    playStandardTts(word, {
      onEnd: () => setPlayingWord(null),
    });
  };

  const recordingCandidates = [
    ...(currentPhoneme.practiceWords || []).map((w) => ({
      label: w.word,
      word: w.word,
      ipa: w.ipa,
      translation: w.translation,
      isPhoneme: false,
    })),
  ];

  return (
    <div className="min-h-full px-3 sm:px-4 pt-3 sm:pt-6 pb-44 min-[1280px]:pb-8 lg:px-8 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* 顶部导航与快捷切换条 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card border border-[#D3E4DE] p-3 sm:p-3.5 rounded-[14px] shadow-none">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/phonemes"
                    className="inline-flex items-center gap-1 min-h-[44px] px-2 font-semibold text-[#4E6B69] hover:text-[#123B3C]"
                  >
                    <ArrowLeftIcon className="size-3.5" />
                    <span>39 音素卡</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="font-bold text-[#96690A] dark:text-amber-300 font-mono">
                  {currentPhoneme.symbol}
                </span>
                <span className="text-[#4E6B69] ml-1">({currentPhoneme.category})</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-1.5 sm:hidden">
            <Link
              to={`/phonemes/${prev.slug}`}
              aria-label={`上一个音素 ${prev.symbol}`}
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-[10px] border border-[#D3E4DE] bg-[#F3FAF8] text-[#123B3C] text-xs font-bold inline-flex items-center justify-center"
            >
              <ArrowLeftIcon className="size-3.5" />
            </Link>
            <Link
              to={`/phonemes/${next.slug}`}
              aria-label={`下一个音素 ${next.symbol}`}
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-[10px] border border-[#D3E4DE] bg-[#F3FAF8] text-[#123B3C] text-xs font-bold inline-flex items-center justify-center"
            >
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            <Link
              to={`/phonemes/${prev.slug}`}
              className="min-h-[44px] px-3 rounded-[10px] border border-[#D3E4DE] bg-[#F3FAF8] hover:bg-[#E7F2EF] text-[#123B3C] text-xs font-bold inline-flex items-center gap-1"
            >
              <ArrowLeftIcon className="size-3.5" />
              <span>{prev.symbol}</span>
            </Link>
            <Link
              to={`/phonemes/${next.slug}`}
              className="min-h-[44px] px-3 rounded-[10px] border border-[#D3E4DE] bg-[#F3FAF8] hover:bg-[#E7F2EF] text-[#123B3C] text-xs font-bold inline-flex items-center gap-1"
            >
              <span>{next.symbol}</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>

          <PhonemeSyncPill
            isSyncing={isSyncing}
            isOnline={isOnline}
            onClick={handleManualSync}
          />

          <Button
            size="sm"
            variant={isMastered ? "default" : "outline"}
            onClick={(e) => handleToggleMastery(e)}
            className={`min-h-[44px] px-3.5 text-xs rounded-[12px] gap-1.5 transition-colors font-bold ${
              isMastered
                ? "bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white shadow-none"
                : "border-[#D3E4DE] text-[#123B3C] hover:border-[#0F7B7A] hover:bg-[#E7F2EF]"
            }`}
          >
            <StarIcon className={`size-3.5 ${isMastered ? "fill-[#F2A93B] text-[#F2A93B]" : ""}`} />
            <span>{isMastered ? "自评已标" : "标记自评"}</span>
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 首屏任务 1 · 听（纯音 ＋ 示范词目标字母高亮 ＋ 常用例词）          */}
      {/* ================================================================ */}
      <section
        data-testid="phoneme-step-listen"
        className="relative overflow-hidden rounded-[20px] bg-white dark:bg-card border border-[#D3E4DE] p-4 sm:p-6 shadow-[0_1px_3px_rgba(18,59,60,0.04),0_4px_12px_rgba(18,59,60,0.05)] space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            {/* 音素符号徽标 / 锚定图（同心圆角 + 主题 1px 黑/白描边） */}
            {displayAnchor?.imageUrl ? (
              <div className="p-2 rounded-[20px] bg-[#F3FAF8] dark:bg-slate-900 border border-[#D3E4DE] shrink-0">
                <div
                  className={`size-16 sm:size-20 rounded-[12px] bg-gradient-to-b ${displayAnchor.colorBg} border border-black dark:border-white flex items-center justify-center p-1.5 overflow-hidden`}
                >
                  <img
                    src={displayAnchor.imageUrl}
                    alt={`${displayAnchor.anchorWord} ${displayAnchor.anchorZh}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="size-16 sm:size-20 rounded-[14px] bg-[#E7F2EF] border border-[#D3E4DE] flex items-center justify-center font-mono font-black text-2xl sm:text-3xl text-[#0A5E5D] shrink-0">
                {currentPhoneme.symbol}
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E7F2EF] border border-[#D3E4DE] text-[#0A5E5D] text-xs font-black">
                  <EarIcon className="size-3.5" />
                  <span>第 1 步 · 听纯音与例词</span>
                </span>
                <Badge
                  variant="outline"
                  className="text-xs font-bold bg-[#E7F2EF] text-[#0A5E5D] border-[#D3E4DE] dark:bg-slate-800 dark:text-emerald-300"
                >
                  {currentPhoneme.groupName.includes(currentPhoneme.category)
                    ? currentPhoneme.groupName
                    : `${currentPhoneme.groupName} · ${currentPhoneme.category}`}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs font-semibold bg-[#F3FAF8] text-[#123B3C] border-[#D3E4DE] dark:bg-slate-800 dark:text-slate-200"
                >
                  {currentPhoneme.voiced ? "声带振动 (浊音)" : "声带不振 (清音)"}
                </Badge>
              </div>

              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-[#123B3C] dark:text-foreground font-mono">
                  {currentPhoneme.symbol}
                </h1>
                {displayAnchor && (
                  <span className="text-sm sm:text-base font-bold text-[#4E6B69]">
                    代表字母 <strong className="text-[#123B3C] dark:text-foreground font-sans">{displayAnchor.letter}</strong>
                    {" · "}
                    {displayAnchor.anchorWord} ({displayAnchor.anchorZh})
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#4E6B69] dark:text-muted-foreground leading-relaxed">
                {currentPhoneme.chineseExplanation}
              </p>
            </div>
          </div>

          {/* 听纯音主行动按钮 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="btn-play-pure-phoneme"
              onClick={handlePlayPure}
              className={`min-h-[48px] px-5 py-3 rounded-[14px] font-black text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                playingPureSound
                  ? "bg-[#0F7B7A] text-white"
                  : "bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C]"
              }`}
            >
              <Volume2Icon className={`size-4 ${playingPureSound ? "animate-pulse" : ""}`} />
              <span>{playingPureSound ? "正在示范纯音..." : `听纯音 ${currentPhoneme.symbol}`}</span>
            </button>
          </div>
        </div>

        {/* 核心示范词（目标字母高亮）＋ 常用例词快听 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-2 border-t border-[#D3E4DE]">
          {/* 核心示范词 */}
          <div className="lg:col-span-5 rounded-[14px] bg-[#F3FAF8] dark:bg-slate-900/60 border border-[#D3E4DE] p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#4E6B69] uppercase tracking-wide">
                核心示范词（目标字母已高亮）
              </div>
              <div className="flex items-baseline gap-2 flex-wrap mt-1">
                <HighlightTargetLetters
                  word={currentPhoneme.sampleWord}
                  slug={currentPhoneme.slug}
                  benchmarkWords={currentPhoneme.benchmarkWords}
                  className="text-2xl font-black font-mono text-[#123B3C] dark:text-foreground"
                />
                {displayAnchor &&
                  displayAnchor.anchorWord.toLowerCase() ===
                    currentPhoneme.sampleWord.toLowerCase() && (
                    <span className="text-xs font-semibold text-[#4E6B69]">
                      · {displayAnchor.anchorZh}
                    </span>
                  )}
                <span className="text-xs text-[#96690A] dark:text-amber-300 font-mono font-bold">
                  {currentPhoneme.wordIpa}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handlePlayWord(currentPhoneme.sampleWord)}
              aria-label={`播放示范词 ${currentPhoneme.sampleWord}`}
              className={`min-h-[44px] min-w-[44px] px-3 rounded-[12px] border font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                playingWord === currentPhoneme.sampleWord
                  ? "bg-[#0F7B7A] text-white border-[#0A5E5D]"
                  : "bg-white dark:bg-slate-800 text-[#0F7B7A] border-[#D3E4DE] hover:bg-[#E7F2EF]"
              }`}
            >
              <Volume2Icon className="size-4" />
              <span>听示范词</span>
            </button>
          </div>

          {/* 常用例词快听条 */}
          <div className="lg:col-span-7 rounded-[14px] bg-[#F3FAF8] dark:bg-slate-900/60 border border-[#D3E4DE] p-3.5">
            <div className="text-[11px] font-bold text-[#4E6B69] mb-2">
              常用例词快听（点词听发音）
            </div>
            <div className="flex flex-wrap gap-2">
              {(currentPhoneme.practiceWords || []).map((pw) => {
                const isPwPlaying = playingWord === pw.word;
                return (
                  <button
                    key={pw.word}
                    type="button"
                    onClick={() => handlePlayWord(pw.word)}
                    className={`min-h-[44px] px-3 py-2 rounded-[12px] border text-left transition-all cursor-pointer inline-flex items-center gap-2 ${
                      isPwPlaying
                        ? "bg-[#0F7B7A] text-white border-[#0A5E5D]"
                        : "bg-white dark:bg-slate-800 text-[#123B3C] dark:text-foreground border-[#D3E4DE] hover:border-[#0F7B7A]"
                    }`}
                  >
                    <Volume2Icon className="size-3.5 shrink-0 opacity-80" />
                    <HighlightTargetLetters
                      word={pw.word}
                      slug={currentPhoneme.slug}
                      benchmarkWords={currentPhoneme.benchmarkWords}
                      className="font-mono font-black text-sm"
                    />
                    <span
                      className={`text-[11px] ${
                        isPwPlaying ? "text-white/90" : "text-[#4E6B69] dark:text-muted-foreground"
                      }`}
                    >
                      {pw.translation}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 首屏任务 2 · 跟（录音反馈入口，紧跟「听」之后）                   */}
      {/* ================================================================ */}
      <section data-testid="phoneme-step-speak" className="space-y-2.5">
        <PhonemeRecordingStation
          phoneme={currentPhoneme.id}
          sampleWord={currentPhoneme.sampleWord}
          candidateTargets={recordingCandidates}
          chineseExplanation={currentPhoneme.chineseExplanation}
        />
        <div className="flex justify-end">
          <Link
            to={`/pronunciation_assessments/new?text=${encodeURIComponent(
              currentPhoneme.sampleWord
            )}&source=phonics`}
            className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#E7F2EF] hover:bg-[#D3E4DE] text-[#0A5E5D] border border-[#D3E4DE] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <MicIcon className="size-3.5" />
            <span>去完整纠错舱深度精练</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 新增「拼写搭档」区（该音素常见拼写字母组合 ＋ 高亮示范词）         */}
      {/* ================================================================ */}
      <PhonemeSpellingPartnersSection
        phonemeId={currentPhoneme.id}
        phonemeSlug={currentPhoneme.slug}
        phonemeSymbol={currentPhoneme.symbol}
      />

      {/* ================================================================ */}
      {/* 次级区块 · 看（发音动画工作台降为次级，工程术语收进内部展开层）     */}
      {/* ================================================================ */}
      <section data-testid="phoneme-step-watch" className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E7F2EF] border border-[#D3E4DE] text-[#0A5E5D] text-xs font-black">
            <EyeIcon className="size-3.5" />
            <span>第 3 步 · 看口型示范（辅助观察）</span>
          </span>
          <span className="text-xs text-[#4E6B69]">
            想看嘴型与舌头位置怎么摆？点开看一看
          </span>
        </div>
        <ArticulatoryTongueVisualizer
          phoneme={currentPhoneme.id}
          word={currentPhoneme.sampleWord}
          compact={false}
          variant="workshop"
          onStartAssessment={() => {
            navigate(
              `/pronunciation_assessments/new?text=${encodeURIComponent(
                currentPhoneme.sampleWord
              )}&source=phonics`
            );
          }}
        />
      </section>

      {/* 🧩 自然拼读 3 大核心代表词与拆解拼读 */}
      {currentPhoneme.benchmarkWords && currentPhoneme.benchmarkWords.length > 0 && (
        <Card className="rounded-[20px] border-[#D3E4DE] bg-white dark:bg-card shadow-none overflow-hidden">
          <CardHeader className="bg-[#E7F2EF]/60 dark:bg-slate-900/50 pb-3.5 border-b border-[#D3E4DE]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="size-8 rounded-[10px] bg-[#F2A93B] text-[#123B3C] flex items-center justify-center text-sm font-black shadow-xs">
                  🧩
                </span>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-[#123B3C] dark:text-foreground">
                    3 个代表词与拼读拆解
                  </CardTitle>
                  <p className="text-xs text-[#4E6B69] mt-0.5">
                    点每个字母积木听纯音，点「整词」听连读
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-mono border-[#D3E4DE] bg-white text-[#96690A] dark:text-amber-300 self-start sm:self-auto"
              >
                代表词拼读
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentPhoneme.benchmarkWords.map((bm, bIdx) => (
                <div
                  key={bIdx}
                  className="rounded-[14px] border border-[#D3E4DE] bg-[#F3FAF8]/70 dark:bg-muted/20 p-4 flex flex-col justify-between space-y-4 shadow-none"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <HighlightTargetLetters
                          word={bm.word}
                          slug={currentPhoneme.slug}
                          benchmarkWords={currentPhoneme.benchmarkWords}
                          className="text-lg font-black font-mono text-[#123B3C] dark:text-foreground"
                        />
                        <span className="text-xs text-[#96690A] dark:text-amber-300 font-mono font-bold">
                          {bm.ipa}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-medium bg-white border border-[#D3E4DE] text-[#123B3C]">
                        {bm.translation}
                      </Badge>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-[#D3E4DE]">
                      <div className="text-[11px] font-semibold text-[#4E6B69] mb-2 flex items-center justify-between">
                        <span>音素拆解连读</span>
                        <span className="text-[10px] text-[#96690A] font-mono font-bold">
                          点击积木试听
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {bm.blocks.map((blk, kIdx) => {
                          const isTarget = blk.isTarget;
                          const blockKey = `${blk.letters}-${blk.phoneme}`;
                          const isPlayingThisBlock = playingBlock === blockKey;
                          return (
                            <React.Fragment key={kIdx}>
                              <button
                                type="button"
                                onClick={() => handlePlayBlock(blk.letters, blk.phoneme)}
                                className={`group min-h-[44px] px-3 py-1.5 rounded-[10px] text-center border transition-all cursor-pointer ${
                                  isPlayingThisBlock
                                    ? "bg-[#0F7B7A] text-white border-[#0A5E5D]"
                                    : isTarget
                                    ? "bg-[#F2A93B]/20 border-[#96690A]/50 hover:bg-[#F2A93B]/30"
                                    : "bg-white dark:bg-background hover:bg-[#E7F2EF] border-[#D3E4DE]"
                                }`}
                                title={`点击试听 [${blk.letters}] -> ${blk.phoneme}`}
                              >
                                <div
                                  className={`font-mono font-black text-sm ${
                                    isPlayingThisBlock
                                      ? "text-white"
                                      : isTarget
                                      ? "text-[#96690A] dark:text-amber-300"
                                      : "text-[#123B3C] dark:text-foreground"
                                  }`}
                                >
                                  {blk.letters}
                                </div>
                                <div
                                  className={`text-[10px] font-mono mt-0.5 ${
                                    isPlayingThisBlock
                                      ? "text-white/90"
                                      : isTarget
                                      ? "text-[#0A5E5D] dark:text-amber-200 font-bold"
                                      : "text-[#4E6B69]"
                                  }`}
                                >
                                  {blk.phoneme}
                                </div>
                              </button>
                              {kIdx < bm.blocks.length - 1 && (
                                <span className="text-[#4E6B69] font-bold text-xs select-none">
                                  +
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                        <span className="text-[#4E6B69] font-bold text-xs select-none">=</span>
                        <button
                          type="button"
                          onClick={() => handlePlayWord(bm.word)}
                          className={`min-h-[44px] px-3 py-2 rounded-[10px] border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                            playingWord === bm.word
                              ? "bg-[#0F7B7A] text-white border-[#0A5E5D]"
                              : "border-[#D3E4DE] bg-white hover:bg-[#E7F2EF] text-[#0A5E5D]"
                          }`}
                          title="听整词自然拼读连读"
                        >
                          <Volume2Icon className="size-3.5" />
                          <span>整词</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="p-2.5 rounded-[10px] bg-white dark:bg-slate-900/50 border border-[#D3E4DE] text-[11px] text-[#4E6B69] leading-relaxed">
                      <span className="font-bold text-[#96690A] dark:text-amber-300 mr-1">
                        拼读小贴士:
                      </span>
                      {bm.rule}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1,236 词库联动（可解码词练习） */}
      {displayAnchor && <PhonemeLinkageCard anchor={displayAnchor} />}

      {/* 最小对立体实战辨析 */}
      <MinimalPairsChallenge key={`mp-${currentPhoneme.id}`} phoneme={currentPhoneme} />
    </div>
  );
}
