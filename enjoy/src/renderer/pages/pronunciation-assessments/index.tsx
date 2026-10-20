import { useEffect, useState, useContext, useRef, useMemo } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  toast,
} from "@renderer/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Volume2Icon,
  PauseIcon,
  SparklesIcon,
  MicIcon,
  TrophyIcon,
  FlameIcon,
  CheckCircle2Icon,
  GraduationCapIcon,
  RotateCwIcon,
  PlusIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { t } from "i18next";
import {
  PronunciationAssessmentCard,
  RecordingDetail,
} from "@renderer/components";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { ALL_39_PHONEMES } from "@renderer/lib/phoneme-data";
import { usePronunciationCoach } from "@renderer/context";

// 兜底今日挑战金句
const TODAY_CHALLENGE = {
  text: "The brave little lion always speaks English with confidence!",
  translation: "勇敢的小狮子总是自信满满地说英语！",
  topic: "自信口语 · 勇气爆发",
  phonicsFocus: "/br/ & /l/ 辅音连缀 · 双元音 /aɪ/",
  audioUrl: "/assets/audio/today_challenge.mp3",
};

// 预设默认易混淆高频音标（若用户尚无评测记录时展示）
const DEFAULT_FOCUS_PHONEMES = [
  { phoneme: "θ", name: "咬舌清音 (th)", tip: "舌尖伸在上下齿之间轻轻吐气，如 think, thank", errorCount: 0, scoreSum: 0, totalCount: 0 },
  { phoneme: "ð", name: "咬舌浊音 (th)", tip: "舌尖轻咬牙齿并振动声带，如 this, that, mother", errorCount: 0, scoreSum: 0, totalCount: 0 },
  { phoneme: "æ", name: "大开口梅花音", tip: "嘴巴张大两指宽，短促有力发音，如 cat, apple", errorCount: 0, scoreSum: 0, totalCount: 0 },
  { phoneme: "l", name: "舌尖清晰音/暗音", tip: "词首舌尖抵上齿龈，词尾舌尖上翘，如 lion, ball", errorCount: 0, scoreSum: 0, totalCount: 0 },
  { phoneme: "r", name: "卷舌音", tip: "舌尖向后卷起但不碰上膛，嘴唇微收圆，如 red, rabbit", errorCount: 0, scoreSum: 0, totalCount: 0 },
];

export default function PronunciationAssessmentsIndex() {
  const { EnjoyApp, webApi } = useContext(AppSettingsProviderContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectId = searchParams.get("selectId");

  const { openAssessment } = usePronunciationCoach();

  const [assessments, setAssessments] = useState<PronunciationAssessmentType[]>([]);
  const [selecting, setSelecting] = useState<PronunciationAssessmentType | null>(null);
  const [deleting, setDeleting] = useState<PronunciationAssessmentType | null>(null);
  const [sharing, setSharing] = useState<RecordingType | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<string>("createdAtDesc");
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);

  const {
    index: dailyIndex,
    sentence: dailySentence,
    nextSentence: nextDailySentence,
    totalCount: dailyTotal,
  } = useDailySentence();

  // 发音成长足迹分页状态与容器引用
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(5);
  const historySectionRef = useRef<HTMLDivElement | null>(null);

  // 学习统计概览
  const learningStats = useMemo(() => {
    if (assessments.length === 0) return { totalCount: 0, avgScore: 0 };
    const validScores = assessments
      .map((a) => a.pronunciationScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    const avgScore = validScores.length > 0
      ? Math.round(validScores.reduce((acc, cur) => acc + cur, 0) / validScores.length)
      : 0;
    return {
      totalCount: assessments.length,
      avgScore,
    };
  }, [assessments]);

  // 全维发音诊断大数据分析 (4 维指标 + 薄弱音标统计)
  const phonicsDiagnostics = useMemo(() => {
    if (assessments.length === 0) {
      return {
        dimensions: { accuracy: 88, fluency: 85, completeness: 90, prosody: 82 },
        weakPhonemes: DEFAULT_FOCUS_PHONEMES,
      };
    }

    let accSum = 0, fluSum = 0, compSum = 0, prosSum = 0, count = 0;
    const phonemeMap = new Map<string, { errorCount: number; scoreSum: number; totalCount: number }>();

    assessments.forEach((a) => {
      if (typeof a.accuracyScore === "number" && a.accuracyScore > 0) {
        accSum += a.accuracyScore;
        fluSum += a.fluencyScore || a.accuracyScore;
        compSum += a.completenessScore || 100;
        prosSum += a.prosodyScore || a.accuracyScore;
        count++;
      }

      const words = a.result?.words || [];
      words.forEach((w: any) => {
        const phs = w.phonemes || [];
        phs.forEach((ph: any) => {
          const sym = ph.phoneme;
          if (!sym) return;
          const score = ph.pronunciationAssessment?.accuracyScore ?? 100;
          const existing = phonemeMap.get(sym) || { errorCount: 0, scoreSum: 0, totalCount: 0 };
          existing.totalCount += 1;
          existing.scoreSum += score;
          if (score < 80) {
            existing.errorCount += 1;
          }
          phonemeMap.set(sym, existing);
        });
      });
    });

    const avgAccuracy = count > 0 ? Math.round(accSum / count) : 88;
    const avgFluency = count > 0 ? Math.round(fluSum / count) : 85;
    const avgCompleteness = count > 0 ? Math.round(compSum / count) : 90;
    const avgProsody = count > 0 ? Math.round(prosSum / count) : 82;

    const sortedPhonemes = Array.from(phonemeMap.entries())
      .filter(([_, data]) => data.totalCount >= 1)
      .sort((a, b) => b[1].errorCount - a[1].errorCount || (a[1].scoreSum / a[1].totalCount) - (b[1].scoreSum / b[1].totalCount))
      .slice(0, 5)
      .map(([sym, data]) => {
        const defaultMatch = DEFAULT_FOCUS_PHONEMES.find((df) => df.phoneme === sym);
        return {
          phoneme: sym,
          name: defaultMatch?.name || `音标 /${sym}/`,
          tip: defaultMatch?.tip || `建议多听标准发音并观察 3D 舌位`,
          errorCount: data.errorCount,
          scoreSum: data.scoreSum,
          totalCount: data.totalCount,
        };
      });

    const topWeakPhonemes =
      sortedPhonemes.length >= 3
        ? sortedPhonemes.slice(0, 5)
        : [
            ...sortedPhonemes,
            ...DEFAULT_FOCUS_PHONEMES.filter((df) => !sortedPhonemes.some((sp) => sp.phoneme === df.phoneme)),
          ].slice(0, 5);

    return {
      dimensions: {
        accuracy: avgAccuracy,
        fluency: avgFluency,
        completeness: avgCompleteness,
        prosody: avgProsody,
      },
      weakPhonemes: topWeakPhonemes,
    };
  }, [assessments]);

  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSampleAudio = (text: string, audioUrl?: string) => {
    const effectiveUrl =
      audioUrl ||
      `/api/ai/tts?text=${encodeURIComponent(text)}&voice=en-GB-SoniaNeural&rate=-5%`;

    if (playingUrl === effectiveUrl) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current = null;
      }
      setPlayingUrl(null);
      return;
    }

    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }

    const audio = new Audio(effectiveUrl);
    sampleAudioRef.current = audio;
    setPlayingUrl(effectiveUrl);
    audio.onended = () => {
      setPlayingUrl(null);
      sampleAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingUrl(null);
      sampleAudioRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingUrl(null);
      sampleAudioRef.current = null;
    });
  };

  const fetchAssessments = (params?: { offset: number; limit?: number }) => {
    const { offset = 0, limit = 50 } = params || {};
    if (offset > 0 && !hasMore) return;

    let order = ["createdAt", "DESC"];
    switch (orderBy) {
      case "createdAtDesc":
        order = ["createdAt", "DESC"];
        break;
      case "createdAtAsc":
        order = ["createdAt", "ASC"];
        break;
      case "scoreDesc":
        order = ["pronunciationScore", "DESC"];
        break;
      case "scoreAsc":
        order = ["pronunciationScore", "ASC"];
        break;
    }

    EnjoyApp.pronunciationAssessments
      .findAll({
        limit,
        offset,
        order: [order],
      })
      .then((fetchedAssessments) => {
        if (offset === 0) {
          setAssessments(fetchedAssessments);
        } else {
          setAssessments([...assessments, ...fetchedAssessments]);
        }
        setHasMore(fetchedAssessments.length === limit);
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  useEffect(() => {
    fetchAssessments();
  }, [orderBy]);

  // 若 URL 带有 selectId 则自动打开该评测详情
  useEffect(() => {
    if (selectId && assessments.length > 0) {
      const found = assessments.find((a) => a.id === selectId);
      if (found) {
        setSelecting(found);
      }
    }
  }, [selectId, assessments]);

  // 若 URL 带有 practice=true 则直接唤起全局纠错舱
  useEffect(() => {
    const isPractice = searchParams.get("practice") === "true";
    const textParam = searchParams.get("text");
    const audioParam = searchParams.get("audioUrl") || "";
    if (isPractice && textParam) {
      openAssessment({
        referenceText: textParam,
        audioUrl: audioParam,
        source: "custom",
        contextTitle: "跟读练习",
        onSuccess: () => {
          fetchAssessments();
        },
      });
    }
  }, [searchParams]);

  const handleDelete = async (assessment: PronunciationAssessmentType) => {
    try {
      await EnjoyApp.pronunciationAssessments.destroy(assessment.id);
      setAssessments(assessments.filter((a) => a.id !== assessment.id));
      setDeleting(null);
      toast.success("评测记录已删除");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 分页计算
  const totalHistoryCount = assessments.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryCount / historyPageSize));
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);

  const pagedAssessments = useMemo(() => {
    const start = (currentHistoryPage - 1) * historyPageSize;
    return assessments.slice(start, start + historyPageSize);
  }, [assessments, currentHistoryPage, historyPageSize]);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalHistoryPages <= 5) {
      for (let i = 1; i <= totalHistoryPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentHistoryPage > 3) pages.push("...");
      const start = Math.max(2, currentHistoryPage - 1);
      const end = Math.min(totalHistoryPages - 1, currentHistoryPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentHistoryPage < totalHistoryPages - 2) pages.push("...");
      pages.push(totalHistoryPages);
    }
    return pages;
  }, [totalHistoryPages, currentHistoryPage]);

  // 唤起今日挑战
  const activeChallenge = dailySentence || TODAY_CHALLENGE;
  const effectiveChallengeUrl =
    activeChallenge.audioUrl ||
    `/api/ai/tts?text=${encodeURIComponent(activeChallenge.text)}&voice=en-GB-SoniaNeural&rate=-5%`;
  const isTodayPlaying = playingUrl === effectiveChallengeUrl;

  return (
    <div className="min-h-full px-4 py-5 sm:py-6 lg:px-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-20">
      {/* 顶部标题、学习数据与自由纠音大按钮 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3.5">
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-12 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                AI 发音魔法纠错舱
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                声学级音素诊断中枢
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              全域音素诊断与发音体检大数据 · 练就纯正地道少儿原版口语
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {learningStats.totalCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs shadow-2xs">
              <span className="text-muted-foreground text-[11px]">累计体检</span>
              <span className="font-black text-amber-700 dark:text-amber-300 font-mono">
                {learningStats.totalCount} 次
              </span>
              <span className="text-amber-400">·</span>
              <span className="text-muted-foreground text-[11px]">均分</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {learningStats.avgScore}
              </span>
            </div>
          )}

          {/* 自由输入发音评测 */}
          <Button
            size="sm"
            onClick={() => {
              openAssessment({
                referenceText: "",
                source: "custom",
                contextTitle: "自由自定义文本发音评测",
                onSuccess: () => {
                  fetchAssessments();
                },
              });
            }}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm shadow-amber-500/25 cursor-pointer"
          >
            <PlusIcon className="size-4" />
            <span>开启自由发音评测</span>
          </Button>
        </div>
      </div>

      {/* 核心板块 1：今日敢敢推荐精读金句 (Hero Card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-5 sm:p-7 border border-amber-400/35 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs">
                <FlameIcon className="size-3.5 fill-white" />
                <span>今日推荐金句 · 影子跟读打卡</span>
              </div>
              {activeChallenge.topic && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-300/40">
                  {activeChallenge.topic}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={nextDailySentence}
                className="h-6 text-[11px] text-muted-foreground hover:text-foreground rounded-full px-2 gap-1 cursor-pointer"
                title="切换下一条金句"
              >
                <RotateCwIcon className="size-3" />
                <span>换一句 ({dailyIndex + 1}/{dailyTotal})</span>
              </Button>
            </div>

            <div>
              <p className="text-lg sm:text-2xl font-extrabold text-foreground tracking-wide font-sans leading-snug">
                "{activeChallenge.text}"
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                {activeChallenge.translation}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium flex-wrap">
              <span className="bg-white/80 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-amber-400/30">
                🎯 发音重点：{activeChallenge.phonicsFocus}
              </span>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="lg"
              className={`rounded-2xl gap-2 border-amber-400/60 bg-white/85 dark:bg-black/20 hover:bg-amber-500/20 text-xs sm:text-sm font-bold shadow-xs cursor-pointer ${
                isTodayPlaying ? "ring-2 ring-amber-500 bg-amber-500/20 text-amber-700" : ""
              }`}
              onClick={() => playSampleAudio(activeChallenge.text, activeChallenge.audioUrl)}
            >
              {isTodayPlaying ? (
                <>
                  <PauseIcon className="size-4 text-amber-600 fill-amber-600" />
                  <span>暂停示范</span>
                </>
              ) : (
                <>
                  <Volume2Icon className="size-4 text-amber-600" />
                  <span>试听示范音</span>
                </>
              )}
            </Button>

            <Button
              size="lg"
              className="rounded-2xl gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-orange-500/25 cursor-pointer transition-transform active:scale-95"
              onClick={() => {
                openAssessment({
                  referenceText: activeChallenge.text,
                  translation: activeChallenge.translation,
                  audioUrl: activeChallenge.audioUrl,
                  phonicsFocus: activeChallenge.phonicsFocus,
                  source: "home",
                  contextTitle: "今日推荐金句",
                  onSuccess: () => {
                    fetchAssessments();
                  },
                });
              }}
            >
              <MicIcon className="size-4.5" />
              <span>立即大声跟读（领能量星）</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 核心板块 2：发音能力全维诊断看板 & 靶向薄弱音标攻克 */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-background to-amber-500/10 border border-indigo-400/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/40 dark:border-indigo-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-bold text-base shadow-xs">
              📊
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                <span>发音综合能力看板 · 靶向音标攻克室</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
                  声学 4 维诊断
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                全维评估发音全貌；点击待攻克音标，一键发起靶向纠音或直达 39 通关岛
              </p>
            </div>
          </div>
        </div>

        {/* 4 维语音宏观指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-blue-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
              <span>🎯 准确度 (Accuracy)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.accuracy}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">音位对齐与发音清晰度</p>
            <div className="w-full bg-blue-100 dark:bg-blue-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.accuracy)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-emerald-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              <span>🌊 流利度 (Fluency)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.fluency}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">连贯朗读无顿挫卡顿</p>
            <div className="w-full bg-emerald-100 dark:bg-emerald-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.fluency)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-amber-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
              <span>🧩 完整度 (Completeness)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.completeness}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">朗读完整无漏词少字</p>
            <div className="w-full bg-amber-100 dark:bg-amber-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.completeness)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-pink-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-pink-700 dark:text-pink-300 font-bold">
              <span>🎵 韵律感 (Prosody)</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.prosody}分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">抑扬顿挫与意群重音</p>
            <div className="w-full bg-pink-100 dark:bg-pink-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-pink-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.prosody)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 待攻克薄弱音标 */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
              <FlameIcon className="size-3.5 text-orange-500" />
              <span>待攻克重点音标排行榜（点击标签，直达 39 通关岛进行 3D 舌位专项训练）：</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {phonicsDiagnostics.weakPhonemes.map((wp) => {
              const accuracyRate = wp.totalCount > 0 ? Math.round((wp.scoreSum / wp.totalCount)) : 75;

              return (
                <button
                  key={wp.phoneme}
                  type="button"
                  onClick={() => {
                    navigate("/phonemes");
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs bg-white/90 dark:bg-slate-900 border-amber-300/60 hover:border-amber-500 text-foreground hover:bg-amber-500/10"
                  title={`${wp.name} · ${wp.tip}（点击前往 39 自然拼读通关岛）`}
                >
                  <span className="px-1.5 py-0.5 rounded-md font-mono text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    /{wp.phoneme}/
                  </span>
                  <span className="truncate max-w-[140px] text-[11px]">{wp.name.split(" ")[0]}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-300/40">
                    {wp.errorCount > 0 ? `失分 ${wp.errorCount} 次` : `掌握率 ${accuracyRate}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 核心板块 3：发音成长足迹 (真实评测历史记录) */}
      <div
        id="pronunciation-growth-footprint"
        ref={historySectionRef}
        className="space-y-4 pt-4 border-t border-border/40 scroll-mt-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-amber-600" />
            <h2 className="text-base md:text-lg font-bold text-foreground">
              我的发音成长足迹
            </h2>
            <span className="text-xs text-muted-foreground font-semibold">
              ({totalHistoryCount} 次练习)
            </span>
          </div>

          {assessments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>每页:</span>
                <Select
                  value={String(historyPageSize)}
                  onValueChange={(val) => {
                    setHistoryPageSize(Number(val));
                    setHistoryPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl w-24 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="5">5 条/页</SelectItem>
                      <SelectItem value="10">10 条/页</SelectItem>
                      <SelectItem value="20">20 条/页</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">{t("sortBy")}:</Label>
                <Select
                  value={orderBy}
                  onValueChange={(val) => {
                    setOrderBy(val);
                    setHistoryPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl w-32 bg-background">
                    <SelectValue placeholder={t("select_sort_order")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="createdAtDesc">{t("createdAtDesc")}</SelectItem>
                      <SelectItem value="createdAtAsc">{t("createdAtAsc")}</SelectItem>
                      <SelectItem value="scoreDesc">{t("scoreDesc")}</SelectItem>
                      <SelectItem value="scoreAsc">{t("scoreAsc")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {assessments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-muted/20 border border-dashed border-border/80">
            <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <SparklesIcon className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              还没有发音评测记录哦
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              在绘本馆、拼读工坊或今日挑战中，点击【🦁 敢敢纠音】大声朗读，即可生成第一张专属声学诊断报告！
            </p>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              onClick={() => {
                openAssessment({
                  referenceText: TODAY_CHALLENGE.text,
                  translation: TODAY_CHALLENGE.translation,
                  audioUrl: TODAY_CHALLENGE.audioUrl,
                  source: "home",
                  contextTitle: "今日金句跟读挑战",
                  onSuccess: () => {
                    fetchAssessments();
                  },
                });
              }}
            >
              立即跟读今日推荐金句
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {pagedAssessments.map((assessment) => (
                <PronunciationAssessmentCard
                  key={assessment.id}
                  pronunciationAssessment={assessment}
                  onSelect={setSelecting}
                  onDelete={setDeleting}
                  onSharing={setSharing}
                />
              ))}
            </div>

            {/* 分页控制栏 */}
            {totalHistoryPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
                <span>
                  第 {currentHistoryPage} / {totalHistoryPages} 页 (共 {totalHistoryCount} 条记录)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentHistoryPage <= 1}
                    onClick={() => {
                      setHistoryPage((p) => Math.max(1, p - 1));
                      historySectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="h-8 px-2.5 rounded-xl text-xs gap-1"
                  >
                    <ChevronLeftIcon className="size-3.5" />
                    <span>上一页</span>
                  </Button>

                  {pageNumbers.map((pg, idx) =>
                    typeof pg === "number" ? (
                      <Button
                        key={idx}
                        size="sm"
                        variant={currentHistoryPage === pg ? "default" : "outline"}
                        onClick={() => {
                          setHistoryPage(pg);
                          historySectionRef.current?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className={`size-8 p-0 rounded-xl text-xs font-bold ${
                          currentHistoryPage === pg
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : ""
                        }`}
                      >
                        {pg}
                      </Button>
                    ) : (
                      <span key={idx} className="px-1 text-muted-foreground font-mono">
                        ...
                      </span>
                    )
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentHistoryPage >= totalHistoryPages}
                    onClick={() => {
                      setHistoryPage((p) => Math.min(totalHistoryPages, p + 1));
                      historySectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="h-8 px-2.5 rounded-xl text-xs gap-1"
                  >
                    <span>下一页</span>
                    <ChevronRightIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 评测历史详情抽屉 */}
      <Sheet
        open={Boolean(selecting)}
        onOpenChange={(value) => {
          if (!value) setSelecting(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6"
          aria-describedby={undefined}
        >
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-base sm:text-lg font-bold">
              发音评测综合诊断报告
            </SheetTitle>
          </SheetHeader>
          {selecting && (
            <RecordingDetail
              recording={
                selecting.recording ||
                ({
                  id: selecting.id,
                  src: (selecting as any).audioUrl || "",
                  language: selecting.language || "en-US",
                } as any)
              }
              pronunciationAssessment={selecting}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAssessment")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAssessmentConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
