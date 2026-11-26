import React, { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import dayjs from "dayjs";
import { t } from "i18next";
import {
  Button,
  Badge,
  RadialProgress,
  Progress,
  Separator,
  Switch,
  Popover,
  PopoverTrigger,
  PopoverContent,
  toast,
} from "@renderer/components/ui";
import { WavesurferPlayer, scoreColor } from "@renderer/components";
import { PronunciationAssessmentWordResult } from "@renderer/components/pronunciation-assessments/pronunciation-assessment-word-result";
import { ArticulatoryTongueVisualizer } from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  fetchWordIpa,
  getCachedWordIpa,
  WordIpaResult,
} from "@renderer/lib/ldoce-dictionary";
import {
  analyzeAssessmentWords,
  buildAssessmentConclusion,
  WORD_PASS_THRESHOLD,
} from "@renderer/lib/assessment-analysis";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  getPhonemeUserId,
  getPhonemeAuthHeaders,
  getApiBase,
} from "@renderer/lib/phoneme-cloud-sync";
import {
  adaptBackendAssessmentToLocal,
  BackendPronunciationHistoryResponse,
} from "@renderer/lib/pronunciation-history-adapter";
import {
  Volume2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  RotateCcwIcon,
  SparklesIcon,
  CheckCircle2Icon,
  InfoIcon,
  AwardIcon,
  XIcon,
  BookOpenIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

export default function PronunciationAssessmentShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { EnjoyApp } = useContext(AppSettingsProviderContext);

  const bookId = searchParams.get("bookId");
  const bookTitle = searchParams.get("bookTitle");
  const pageParam = searchParams.get("page");
  const sourceParam = searchParams.get("source");

  const [assessment, setAssessment] =
    useState<PronunciationAssessmentType | null>(null);
  const [allAssessments, setAllAssessments] = useState<
    PronunciationAssessmentType[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [playingSlowWord, setPlayingSlowWord] = useState<string | null>(null);
  const [playingMyAudio, setPlayingMyAudio] = useState<string | null>(null);
  const [activeVisualizerKey, setActiveVisualizerKey] = useState<string | null>(
    null
  );
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAllZeroErrors, setShowAllZeroErrors] = useState(false);
  const [showChipsEvidence, setShowChipsEvidence] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({
    0: true,
  });
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  const [errorDisplay, setErrorDisplay] = useState({
    mispronunciation: true,
    omission: true,
    insertion: true,
    unexpectedBreak: true,
    missingBreak: true,
    monotone: true,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = () => setIsNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 加载评测数据与足迹历史列表
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        let list: PronunciationAssessmentType[] = [];
        if (EnjoyApp?.pronunciationAssessments?.findAll) {
          list = await EnjoyApp.pronunciationAssessments.findAll({
            limit: 100,
          });
        }
        if (
          (!list || list.length === 0) &&
          typeof localStorage !== "undefined"
        ) {
          try {
            const raw = localStorage.getItem("sunnybridge_assessments");
            if (raw) list = JSON.parse(raw);
          } catch (e) {}
        }

        let current = list?.find((a) => String(a.id) === String(id));
        if (!current && EnjoyApp?.pronunciationAssessments?.findOne) {
          current = await EnjoyApp.pronunciationAssessments.findOne({ id });
        }
        if (!current && typeof localStorage !== "undefined") {
          try {
            const raw = localStorage.getItem("sunnybridge_assessments");
            if (raw) {
              const parsed = JSON.parse(raw);
              current = parsed.find((a: any) => String(a.id) === String(id));
            }
          } catch (e) {}
        }

        const foundLocally = Boolean(current);

        // 本地查找不到记录或列表为空时，用同一 GET 接口 (limit=100) 拉取后端列表
        if (!current || !list || list.length === 0) {
          try {
            const userId = getPhonemeUserId();
            const authHeaders = getPhonemeAuthHeaders(userId);
            const apiBase = getApiBase();
            const res = await fetch(
              `${apiBase}/api/v1/pronunciation/assessments?user_id=${encodeURIComponent(
                userId
              )}&limit=100`,
              {
                headers: {
                  Accept: "application/json",
                  ...authHeaders,
                },
              }
            );
            if (res.ok) {
              const data: BackendPronunciationHistoryResponse =
                await res.json();
              if (data && data.assessments) {
                const remoteList = data.assessments.map(
                  adaptBackendAssessmentToLocal
                );
                if (!foundLocally) {
                  const remoteMatch = remoteList.find(
                    (a: any) => String(a.id) === String(id)
                  );
                  if (remoteMatch) {
                    current = remoteMatch;
                    list = remoteList;
                  } else if (!list || list.length === 0) {
                    list = remoteList;
                  }
                }
              }
            }
          } catch (fetchErr) {
            console.warn(
              "Fetch remote assessments in show page failed:",
              fetchErr
            );
          }
        }

        if (!isMounted) return;
        setAllAssessments(list || []);
        setAssessment(current || null);
      } catch (err: any) {
        console.warn("Load assessment error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, EnjoyApp]);

  // 相邻足迹记录切换（上一条 / 下一条）
  const currentIndex = useMemo(() => {
    if (!allAssessments.length || !id) return -1;
    return allAssessments.findIndex((a) => String(a.id) === String(id));
  }, [allAssessments, id]);

  const prevAssessment =
    currentIndex > 0 ? allAssessments[currentIndex - 1] : null;
  const nextAssessment =
    currentIndex >= 0 && currentIndex < allAssessments.length - 1
      ? allAssessments[currentIndex + 1]
      : null;

  const navigateToAdjacent = (targetId: string) => {
    const qs = searchParams.toString();
    navigate(`/pronunciation_assessments/${targetId}${qs ? `?${qs}` : ""}`);
  };

  // 保证 referenceText 与 recording 完整
  const referenceText =
    assessment?.referenceText ||
    assessment?.target?.referenceText ||
    assessment?.result?.display ||
    "";

  const recording: RecordingType = useMemo(() => {
    const effectiveSrc =
      (assessment as any)?.recordingSrc ||
      (assessment as any)?.audioUrl ||
      assessment?.recording?.src ||
      assessment?.target?.src ||
      "";
    return {
      id: assessment?.targetId || assessment?.id || `rec_${Date.now()}`,
      referenceText,
      src: effectiveSrc,
      duration: (assessment?.result as any)?.duration || 5000,
      language: assessment?.language || "en-US",
    } as any;
  }, [assessment, referenceText]);

  // 解析 Azure 评测词级与音素级结果
  const parsedResult = useMemo(() => {
    const res = assessment?.result;
    if (!res) return null;
    if (typeof res === "string") {
      try {
        return JSON.parse(res);
      } catch {
        return null;
      }
    }
    return res;
  }, [assessment]);

  const isSimulatedFallback =
    parsedResult?.evaluationSource === "simulated-fallback";

  const rawWords: any[] = useMemo(() => {
    return parsedResult?.words || [];
  }, [parsedResult]);

  const [ldoceMap, setLdoceMap] = useState<Record<string, WordIpaResult>>({});

  useEffect(() => {
    let isMounted = true;
    const cleanWords = Array.from(
      new Set(
        rawWords
          .map((item) =>
            (item.word || "").replace(/[^a-zA-Z]/g, "").toLowerCase()
          )
          .filter(Boolean)
      )
    );
    const cachedInit: Record<string, WordIpaResult> = {};
    cleanWords.forEach((clean) => {
      const cached = getCachedWordIpa(clean);
      if (cached) cachedInit[clean] = cached;
    });
    if (Object.keys(cachedInit).length > 0) {
      setLdoceMap((prev) => ({ ...cachedInit, ...prev }));
    }

    cleanWords.forEach((clean) => {
      fetchWordIpa(clean, referenceText).then((res) => {
        if (isMounted && res) {
          setLdoceMap((prev) => {
            if (prev[clean] === res) return prev;
            return { ...prev, [clean]: res };
          });
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [rawWords, referenceText]);

  // 共享词级/音素级分析逻辑（缺失分保持 null，不回落 100 或 85）
  const analyzedWords = useMemo(
    () => analyzeAssessmentWords(rawWords, { ldoceMap }),
    [rawWords, ldoceMap]
  );

  const issueWords = useMemo(
    () => analyzedWords.filter((w) => w.hasIssue),
    [analyzedWords]
  );
  const excellentWords = useMemo(
    () => analyzedWords.filter((w) => !w.hasIssue),
    [analyzedWords]
  );

  // 默认只展开第一张词卡，其余折叠为一行摘要
  useEffect(() => {
    setExpandedCards({ 0: true });
    setActiveVisualizerKey(null);
  }, [id, issueWords.length]);

  const toggleCard = (idx: number) => {
    setExpandedCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 错误类型统计
  const errorStats = useMemo(() => {
    return {
      mispronunciation: rawWords.filter(
        (w) => w.pronunciationAssessment?.errorType === "Mispronunciation"
      ).length,
      omission: rawWords.filter(
        (w) => w.pronunciationAssessment?.errorType === "Omission"
      ).length,
      insertion: rawWords.filter(
        (w) => w.pronunciationAssessment?.errorType === "Insertion"
      ).length,
      unexpectedBreak: rawWords.filter(
        (w) => w.pronunciationAssessment?.errorType === "UnexpectedBreak"
      ).length,
      missingBreak: rawWords.filter(
        (w) => w.pronunciationAssessment?.errorType === "MissingBreak"
      ).length,
      monotone: rawWords.filter(
        (w) => w.pronunciationAssessment?.errorType === "Monotone"
      ).length,
    };
  }, [rawWords]);

  // 播放 TTS 示范
  const handlePlayTts = (word: string, slow = false) => {
    if (slow) {
      setPlayingSlowWord(word);
      playStandardTts(word, { rate: "-25%" }).finally(() =>
        setPlayingSlowWord(null)
      );
    } else {
      setPlayingWord(word);
      playStandardTts(word).finally(() => setPlayingWord(null));
    }
  };

  // 播放录音指定片段（Azure offset/duration 为 100ns 单位；无 offset 时不触发）
  const handlePlayMyRecording = (
    offset = 0,
    duration = 0,
    wordClean = ""
  ) => {
    if (!recording.src || !offset || offset <= 0) return;
    setPlayingMyAudio(wordClean);
    const audio = new Audio(recording.src);
    const startTime = offset / 1e7;
    const endTime = duration > 0 ? (offset + duration) / 1e7 : 0;
    audio.currentTime = startTime;
    if (endTime > startTime) {
      const onTimeUpdate = () => {
        if (audio.currentTime >= endTime) {
          audio.pause();
          audio.removeEventListener("timeupdate", onTimeUpdate);
          setPlayingMyAudio(null);
        }
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
    }
    audio.onended = () => setPlayingMyAudio(null);
    audio.onerror = () => setPlayingMyAudio(null);
    audio.play().catch(() => setPlayingMyAudio(null));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold">
          <span>正在加载发音诊断报告...</span>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-4xl">🔍</div>
        <h2 className="text-lg font-bold text-foreground">
          未找到该条评测记录
        </h2>
        <p className="text-xs text-muted-foreground">
          记录可能已被删除或尚未同步。
        </p>
        <Button
          onClick={() => navigate("/pronunciation_assessments")}
          className="rounded-xl bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-bold cursor-pointer"
        >
          返回发音纠错页
        </Button>
      </div>
    );
  }

  // 五维分：仅保留真实数字，缺失或 NaN 一律落 null（不回落至 totalScore，避免缺失变 0 或冒充高分）
  const toScoreOrNull = (val: unknown): number | null =>
    typeof val === "number" && !isNaN(val) ? val : null;

  const totalScore = toScoreOrNull(assessment.pronunciationScore);
  const accuracyScore = toScoreOrNull(assessment.accuracyScore);
  const fluencyScore = toScoreOrNull(assessment.fluencyScore);
  const completenessScore = toScoreOrNull(assessment.completenessScore);
  const prosodyScore = toScoreOrNull(assessment.prosodyScore);

  const conclusion = buildAssessmentConclusion({
    totalScore,
    analyzedWords,
    issueWords,
  });

  // 返回原课路径
  const returnUrl =
    bookId && pageParam
      ? `/stories?bookId=${encodeURIComponent(bookId)}&page=${pageParam}`
      : bookId
      ? `/stories?bookId=${encodeURIComponent(bookId)}`
      : sourceParam === "phonics"
      ? "/phonemes"
      : "/pronunciation_assessments";

  const returnLabel =
    bookId
      ? bookTitle
        ? `返回《${bookTitle}》第 ${pageParam || 1} 页 ➔`
        : "返回绘本页面 ➔"
      : sourceParam === "phonics"
      ? "返回自然拼读阶梯 ➔"
      : "返回发音能力纠错 ➔";

  return (
    <div className="min-h-full px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 max-w-4xl mx-auto space-y-5 sm:space-y-6">
      {/* 顶部返回路径与上一条/下一条切换 */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/50 pb-3">
        <Link
          to={returnUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E7F2EF] hover:bg-[#D3E4DE] text-[#0F7B7A] border border-[#D3E4DE] transition-colors shadow-2xs"
        >
          {bookId ? (
            <BookOpenIcon className="size-3.5" />
          ) : (
            <ArrowLeftIcon className="size-3.5" />
          )}
          <span>{returnLabel}</span>
        </Link>

        {/* 上一条 / 下一条切换 */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            disabled={!prevAssessment}
            onClick={() =>
              prevAssessment && navigateToAdjacent(prevAssessment.id)
            }
            className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1 border-border/80"
          >
            <ChevronLeftIcon className="size-3" size={12} absoluteStrokeWidth />
            <span>上一条</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!nextAssessment}
            onClick={() =>
              nextAssessment && navigateToAdjacent(nextAssessment.id)
            }
            className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1 border-border/80"
          >
            <span>下一条</span>
            <ChevronRightIcon className="size-3" size={12} absoluteStrokeWidth />
          </Button>
        </div>
      </div>

      {/* 标题带记录身份：句子 ＋ 总分 ＋ 日期 ＋ 模拟评测标识 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            这次读得怎么样
          </h1>
          <span className="text-xs text-muted-foreground font-medium">
            发音评测综合诊断报告
          </span>
          {isSimulatedFallback && (
            <Badge
              variant="outline"
              className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/60 text-xs font-bold"
            >
              本次为模拟评测，仅供参考
            </Badge>
          )}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          &ldquo;{referenceText}&rdquo; ·{" "}
          <span className="font-bold text-foreground">
            {totalScore !== null ? `${totalScore}分` : "—"}
          </span>{" "}
          · {dayjs(assessment.createdAt).format("MM/DD")}
        </p>
      </div>

      {/* 若有音频则渲染波形播放器：统一度量由播放器展示实际时长，外层加 overflow-hidden 防音调线溢出 */}
      {recording.src && (
        <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/60 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-bold">🎙️ 录音回听</span>
          </div>
          <WavesurferPlayer
            id={recording.id}
            src={recording.src}
            height={isNarrow ? 40 : 80}
            className="h-[40px] sm:h-[80px] overflow-hidden"
          />
        </div>
      )}

      {/* ① 一句话结论 ＋ 总分置顶（全页唯一环图，中心含 /100，390 窄屏紧凑排布） */}
      <div className="p-3.5 sm:p-6 rounded-3xl bg-[#E7F2EF] border border-[#D3E4DE] shadow-xs space-y-3">
        {isSimulatedFallback && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-xs font-bold text-amber-900 dark:text-amber-200">
            ⚠️ 本次为模拟评测，仅供参考
          </div>
        )}

        <div className="flex items-center justify-between gap-3 sm:gap-5">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0F7B7A] text-white text-xs font-black shadow-xs">
              <SparklesIcon className="size-3" size={12} absoluteStrokeWidth />
              <span>综合诊断结论</span>
            </div>
            <p className="text-sm sm:text-lg font-black text-foreground leading-snug break-words">
              {conclusion.conclusionText}
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 text-xs flex-wrap">
              <span className="font-bold text-[#123B3C]">定性反馈:</span>
              <span className="px-2 py-0.5 rounded-md bg-[#E7F2EF] border border-[#0F7B7A]/25 font-bold text-[#0A5E5D]">
                {conclusion.scoreVerdict}
              </span>
            </div>
          </div>

          {/* 圆环（唯一出现），中心加 /100 */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative">
              <RadialProgress
                className="w-24 h-24 sm:w-32 sm:h-32"
                ringClassName={`${scoreColor(totalScore ?? 0)}`}
                progress={totalScore ?? 0}
                label={totalScore !== null ? String(totalScore) : "—"}
                fontSize={24}
              />
              <div className="absolute inset-x-0 top-[63%] flex justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-muted-foreground leading-none">
                  /100
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground mt-0.5">
              总分
            </span>
          </div>
        </div>

        {/* 色带含文字含义 */}
        <div className="flex items-center justify-end gap-3 text-[11px] text-muted-foreground pt-1 border-t border-[#D3E4DE]/80">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-red-600"></span>
            <span>0~59 加油</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-yellow-600"></span>
            <span>60~79 不错</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-green-600"></span>
            <span>80~100 很棒</span>
          </div>
        </div>
      </div>

      {/* ② 读对的词（正向反馈） */}
      {excellentWords.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2Icon className="size-4 text-emerald-700" />
              <span>这 {excellentWords.length} 个词读得很好：</span>
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              点击词可听纯正示范
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {excellentWords.map((item, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                className={`h-8 px-3 rounded-xl text-xs gap-1.5 bg-background border-emerald-400/40 text-foreground hover:bg-emerald-500/10 ${
                  playingWord === item.cleanWord
                    ? "ring-2 ring-emerald-500 bg-emerald-500/20 font-bold"
                    : ""
                }`}
                onClick={() => handlePlayTts(item.cleanWord, false)}
              >
                <span className="font-serif font-bold">{item.word}</span>
                <span className="text-[11px] text-emerald-700 font-extrabold tabular-nums">
                  {typeof item.accuracy === "number" ? `${item.accuracy}分` : "—"}
                </span>
                <Volume2Icon className="size-3 text-muted-foreground" size={12} absoluteStrokeWidth />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ③ 敢敢横幅（仅保留标题 ＋ 听整句标准示范按钮，删去音素清单） */}
      <div className="p-3 sm:p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            敢敢帮你找到了要练的音
          </h3>
          <Badge
            variant="outline"
            className="text-[11px] text-amber-700 border-amber-400"
          >
            AI 逐音诊断
          </Badge>
        </div>

        {referenceText && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs rounded-xl gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold shrink-0 self-start sm:self-auto"
            onClick={() => playStandardTts(referenceText)}
          >
            <Volume2Icon className="size-3.5 text-amber-600" />
            <span>听整句标准示范</span>
          </Button>
        )}
      </div>

      {/* ④ 逐词发音诊断证据（移至横幅之后、诊断卡之前） */}
      <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border/60 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">
              逐词发音诊断证据
            </h3>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (点击单词可看音标拆解与示范纠音)
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowChipsEvidence(!showChipsEvidence)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <span>{showChipsEvidence ? "收起证据" : "展开证据"}</span>
            {showChipsEvidence ? (
              <ChevronUpIcon className="size-3.5" />
            ) : (
              <ChevronDownIcon className="size-3.5" />
            )}
          </Button>
        </div>

        {showChipsEvidence && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground sm:hidden">
              💡 点击下方每个单词，可查看音标拆解与标准示范
            </p>

            <div className="flex flex-col gap-4">
              {/* 词 chips 区域 */}
              <div className="flex items-center flex-wrap gap-2 p-3 rounded-2xl bg-muted/30 border border-border/50">
                {rawWords.length > 0 ? (
                  rawWords.map((wordItem: any, index: number) => (
                    <PronunciationAssessmentWordResult
                      key={index}
                      result={wordItem}
                      errorDisplay={errorDisplay}
                      src={recording.src}
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    暂无逐词证据数据
                  </span>
                )}
              </div>

              <Separator />

              {/* 错误统计开关 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">
                    错误高亮开关：
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    点开关可隐藏/显示该类错误高亮
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {errorStats.mispronunciation > 0 && (
                    <ErrorSwitchItem
                      count={errorStats.mispronunciation}
                      badgeClass="bg-[#F2A93B] text-[#123B3C]"
                      title="音素发错"
                      originalTerm="发音错误"
                      explaination="发音音素与标准发音偏差较大"
                      checked={errorDisplay.mispronunciation}
                      onToggle={() =>
                        setErrorDisplay({
                          ...errorDisplay,
                          mispronunciation: !errorDisplay.mispronunciation,
                        })
                      }
                    />
                  )}
                  {errorStats.omission > 0 && (
                    <ErrorSwitchItem
                      count={errorStats.omission}
                      badgeClass="bg-gray-600 text-white"
                      title="漏读了"
                      originalTerm="遗漏"
                      explaination="目标句中的词未被读出或被吞音"
                      checked={errorDisplay.omission}
                      onToggle={() =>
                        setErrorDisplay({
                          ...errorDisplay,
                          omission: !errorDisplay.omission,
                        })
                      }
                    />
                  )}
                  {errorStats.insertion > 0 && (
                    <ErrorSwitchItem
                      count={errorStats.insertion}
                      badgeClass="bg-red-600 text-white"
                      title="多读了音"
                      originalTerm="多读"
                      explaination="读了句子里没有的额外词语"
                      checked={errorDisplay.insertion}
                      onToggle={() =>
                        setErrorDisplay({
                          ...errorDisplay,
                          insertion: !errorDisplay.insertion,
                        })
                      }
                    />
                  )}
                  {errorStats.unexpectedBreak > 0 && (
                    <ErrorSwitchItem
                      count={errorStats.unexpectedBreak}
                      badgeClass="bg-pink-600 text-white"
                      title="停顿太多"
                      originalTerm="意外停顿"
                      explaination="在不该停顿的词语之间出现了停顿"
                      checked={errorDisplay.unexpectedBreak}
                      onToggle={() =>
                        setErrorDisplay({
                          ...errorDisplay,
                          unexpectedBreak: !errorDisplay.unexpectedBreak,
                        })
                      }
                    />
                  )}
                  {errorStats.missingBreak > 0 && (
                    <ErrorSwitchItem
                      count={errorStats.missingBreak}
                      badgeClass="bg-[#F2A93B] text-[#123B3C]"
                      title="缺少停顿"
                      originalTerm="缺少停顿"
                      explaination="在标点或意群分界处语速过快未做停顿"
                      checked={errorDisplay.missingBreak}
                      onToggle={() =>
                        setErrorDisplay({
                          ...errorDisplay,
                          missingBreak: !errorDisplay.missingBreak,
                        })
                      }
                    />
                  )}
                  {errorStats.monotone > 0 && (
                    <ErrorSwitchItem
                      count={errorStats.monotone}
                      badgeClass="bg-primary text-white"
                      title="语调太单调"
                      originalTerm="单调"
                      explaination="整句读音缺乏起伏重音"
                      checked={errorDisplay.monotone}
                      onToggle={() =>
                        setErrorDisplay({
                          ...errorDisplay,
                          monotone: !errorDisplay.monotone,
                        })
                      }
                    />
                  )}
                </div>

                {(() => {
                  const zeroItems = [
                    {
                      key: "mispronunciation",
                      count: errorStats.mispronunciation,
                      title: "音素发错",
                      orig: "发音错误",
                      exp: "发音音素与标准发音偏差较大",
                      badge: "bg-[#F2A93B] text-[#123B3C]",
                    },
                    {
                      key: "omission",
                      count: errorStats.omission,
                      title: "漏读了",
                      orig: "遗漏",
                      exp: "目标句中的词未被读出或被吞音",
                      badge: "bg-gray-600 text-white",
                    },
                    {
                      key: "insertion",
                      count: errorStats.insertion,
                      title: "多读了音",
                      orig: "多读",
                      exp: "读了句子里没有的额外词语",
                      badge: "bg-red-600 text-white",
                    },
                    {
                      key: "unexpectedBreak",
                      count: errorStats.unexpectedBreak,
                      title: "停顿太多",
                      orig: "意外停顿",
                      exp: "在不该停顿的词语之间出现了停顿",
                      badge: "bg-pink-600 text-white",
                    },
                    {
                      key: "missingBreak",
                      count: errorStats.missingBreak,
                      title: "缺少停顿",
                      orig: "缺少停顿",
                      exp: "在标点或意群分界处语速过快未做停顿",
                      badge: "bg-[#F2A93B] text-[#123B3C]",
                    },
                    {
                      key: "monotone",
                      count: errorStats.monotone,
                      title: "语调太单调",
                      orig: "单调",
                      exp: "整句读音缺乏起伏重音",
                      badge: "bg-primary text-white",
                    },
                  ].filter((it) => it.count === 0);

                  if (zeroItems.length === 0) return null;

                  return (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAllZeroErrors(!showAllZeroErrors)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <span>
                          {showAllZeroErrors
                            ? "收起其余 0 项"
                            : `其他 ${zeroItems.length} 项表现全优 (0 次错误)`}
                        </span>
                        {showAllZeroErrors ? (
                          <ChevronUpIcon className="size-3" size={12} absoluteStrokeWidth />
                        ) : (
                          <ChevronDownIcon className="size-3" size={12} absoluteStrokeWidth />
                        )}
                      </Button>

                      {showAllZeroErrors && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2 animate-in fade-in duration-200">
                          {zeroItems.map((item) => (
                            <ErrorSwitchItem
                              key={item.key}
                              count={0}
                              badgeClass={item.badge}
                              title={item.title}
                              originalTerm={item.orig}
                              explaination={item.exp}
                              checked={(errorDisplay as any)[item.key]}
                              onToggle={() =>
                                setErrorDisplay({
                                  ...errorDisplay,
                                  [item.key]: !(errorDisplay as any)[item.key],
                                })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ⑤ 诊断卡（按单词归并：一词一卡，默认展开第 1 张，其余折叠为摘要） */}
      <div className="space-y-3">
        {issueWords.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="font-bold text-foreground">
                需重点练的单词（共 {issueWords.length} 张词卡）：
              </span>
              <span>🟢合格(≥80) · 🔴需改进(&lt;80)</span>
            </div>

            {issueWords.map((wordItem, idx) => {
              const isExpanded = Boolean(expandedCards[idx]);
              const weakestPhoneme =
                wordItem.wrongPhonemes.length > 0
                  ? [...wordItem.wrongPhonemes].sort(
                      (a, b) => a.score - b.score
                    )[0]
                  : null;
              const isOmission = wordItem.errorType === "Omission";
              const scoreText =
                isOmission || typeof wordItem.accuracy !== "number"
                  ? "没读出来"
                  : `${wordItem.accuracy}分`;

              if (!isExpanded) {
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-expanded={false}
                    onClick={() => toggleCard(idx)}
                    className="w-full px-4 py-3 rounded-2xl bg-card border border-amber-500/30 hover:border-amber-500/60 shadow-2xs flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-serif font-bold text-base text-foreground">
                        {wordItem.word}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-200 font-medium">
                        {isOmission
                          ? "漏读了"
                          : weakestPhoneme
                          ? `最弱音 /${weakestPhoneme.phoneme}/`
                          : "整词待练"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                          isOmission || typeof wordItem.accuracy !== "number"
                            ? "bg-muted text-muted-foreground"
                            : wordItem.accuracy >= WORD_PASS_THRESHOLD
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/15 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {scoreText}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground shrink-0">
                      <span>展开</span>
                      <ChevronDownIcon className="size-4" />
                    </span>
                  </button>
                );
              }

              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-card border-2 border-amber-500/30 shadow-xs space-y-3"
                >
                  {/* 卡头：一词一卡头 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-muted-foreground">
                        需练单词:
                      </span>
                      <span className="font-serif font-bold text-lg text-foreground">
                        {wordItem.word}
                      </span>
                      {wordItem.ipa && !isOmission && (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {wordItem.ipa}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                          isOmission || typeof wordItem.accuracy !== "number"
                            ? "bg-muted text-muted-foreground"
                            : wordItem.accuracy >= WORD_PASS_THRESHOLD
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/15 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {isOmission || typeof wordItem.accuracy !== "number"
                          ? "没读出来"
                          : `这个词：${wordItem.accuracy}分`}
                      </span>
                      {wordItem.errorType !== "None" &&
                        wordItem.errorTypeLabel && (
                          <Badge
                            variant="outline"
                            className="text-[11px] text-red-600 border-red-300"
                          >
                            {wordItem.errorTypeLabel}
                          </Badge>
                        )}
                    </div>

                    {/* 示范按钮群：听示范主按钮，慢速/听我的次按钮，无 offset 隐藏听我的 */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        className={`h-7 px-3 text-xs rounded-lg gap-1 bg-[#0F7B7A] hover:bg-[#0c6665] text-white font-bold ${
                          playingWord === wordItem.cleanWord
                            ? "ring-2 ring-[#0F7B7A]/50"
                            : ""
                        }`}
                        onClick={() => handlePlayTts(wordItem.cleanWord, false)}
                      >
                        <Volume2Icon className="size-3" size={12} absoluteStrokeWidth />
                        <span>
                          {playingWord === wordItem.cleanWord
                            ? "播放中..."
                            : "听示范"}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2.5 text-xs rounded-lg text-muted-foreground hover:text-foreground ${
                          playingSlowWord === wordItem.cleanWord
                            ? "bg-muted font-bold text-foreground"
                            : ""
                        }`}
                        onClick={() => handlePlayTts(wordItem.cleanWord, true)}
                        title="慢速示范"
                      >
                        <span>🐢 慢速</span>
                      </Button>

                      {recording.src && wordItem.offset > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 px-2.5 text-xs rounded-lg gap-1 text-muted-foreground hover:text-foreground ${
                            playingMyAudio === wordItem.cleanWord
                              ? "bg-muted font-bold text-foreground"
                              : ""
                          }`}
                          onClick={() =>
                            handlePlayMyRecording(
                              wordItem.offset,
                              wordItem.duration,
                              wordItem.cleanWord
                            )
                          }
                        >
                          <PlayIcon className="size-3" size={12} absoluteStrokeWidth />
                          <span>听我的</span>
                        </Button>
                      )}

                      {issueWords.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-expanded={true}
                          onClick={() => toggleCard(idx)}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-0.5"
                        >
                          <span>收起</span>
                          <ChevronUpIcon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 卡内指导区：按 Omission / 音素级错误 / 无音素级证据低分词 分支 */}
                  {isOmission ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground/90 font-medium leading-relaxed">
                      这个词没读出来。先听示范，跟着慢慢读一遍，把每个词都读完整
                    </div>
                  ) : wordItem.wrongPhonemes.length > 0 ? (
                    <div className="space-y-2.5">
                      {wordItem.wrongPhonemes.map((wp, wIdx) => {
                        const visKey = `${idx}_${wp.phoneme}`;
                        return (
                          <div
                            key={wIdx}
                            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2 font-bold text-amber-800 dark:text-amber-200 flex-wrap">
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 font-mono text-sm font-black text-amber-900 dark:text-amber-100 shrink-0">
                                  /{wp.phoneme}/
                                </span>
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 font-bold shrink-0">
                                  {wp.score}分
                                </span>
                                <span className="break-words">
                                  {wp.guide?.name
                                    ? `${wp.guide.name} 发音指导：`
                                    : "发音要领："}
                                </span>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[11px] rounded-sm border-amber-400/80 bg-background hover:bg-[#F2A93B] hover:text-[#123B3C] text-amber-800 dark:text-amber-200 font-bold gap-1 cursor-pointer shrink-0"
                                onClick={() =>
                                  setActiveVisualizerKey(
                                    activeVisualizerKey === visKey
                                      ? null
                                      : visKey
                                  )
                                }
                              >
                                <span>👄</span>
                                <span>
                                  {activeVisualizerKey === visKey
                                    ? "收起发音动画"
                                    : "查看发音动画"}
                                </span>
                              </Button>
                            </div>

                            {activeVisualizerKey === visKey && (
                              <div className="pt-2 animate-in fade-in duration-200">
                                <ArticulatoryTongueVisualizer
                                  phoneme={wp.phoneme}
                                  word={wordItem.cleanWord}
                                  compact
                                  onClose={() => setActiveVisualizerKey(null)}
                                  onStartAssessment={() =>
                                    navigate(
                                      `/pronunciation_assessments/new?text=${encodeURIComponent(
                                        wordItem.cleanWord || referenceText
                                      )}`
                                    )
                                  }
                                />
                              </div>
                            )}

                            <p className="leading-relaxed text-foreground/90 pl-1">
                              💡 <span className="font-bold">发音秘籍：</span>
                              {wp.guide?.tip ||
                                "注意听标准发音示范，口型饱满并保持稳定气流。"}
                            </p>
                            {wp.guide?.mouthShape && (
                              <p className="pl-1 text-muted-foreground">
                                👄 <span className="font-bold">口型要领：</span>
                                {wp.guide.mouthShape}
                              </p>
                            )}
                            {wp.guide?.mistake && (
                              <p className="pl-1 text-red-600 dark:text-red-400">
                                ⚠️ <span className="font-bold">常见误区：</span>
                                {wp.guide.mistake}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
                      <div className="font-bold text-amber-800 dark:text-amber-200">
                        整词再练一遍
                      </div>
                      <p className="leading-relaxed text-foreground/90">
                        {wordItem.coachingHint ||
                          "先听听上面的标准示范，注意重音和节奏，跟着完整读出来。"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : !conclusion.hasValidWordData ? (
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <p className="text-sm font-bold text-foreground">
              这次没测到有效数据，重新读一遍
            </p>
            <p className="text-xs text-muted-foreground">
              请靠近麦克风清晰朗读整句，再试一次。
            </p>
          </div>
        ) : conclusion.emptyPraiseAllowed ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              {totalScore !== null && totalScore >= 80
                ? "全句发音纯正地道，太棒了！继续保持！"
                : "这次读得不错，全句单词已达到合格线！"}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              这句有点难，没关系，先听一遍示范再跟着慢慢读
            </p>
          </div>
        )}
      </div>

      {/* ⑥ 四维发音能力剖析（环图已去重，仅保留四条维度条；prosody 为 null 显示「未测评」灰字） */}
      <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border/60 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-foreground">四维发音能力剖析</h3>

        <div className="space-y-3.5 w-full">
          <ScoreBarRow
            label="准确度得分"
            childLabel="发音清晰"
            score={accuracyScore}
            explaination={t(
              "models.pronunciationAssessment.explainations.accuracyScore"
            )}
          />
          <ScoreBarRow
            label="流利度得分"
            childLabel="朗读流畅"
            score={fluencyScore}
            explaination={t(
              "models.pronunciationAssessment.explainations.fluencyScore"
            )}
          />
          <ScoreBarRow
            label="完整度得分"
            childLabel="漏读多读情况"
            score={completenessScore}
            explaination={t(
              "models.pronunciationAssessment.explainations.completenessScore"
            )}
          />
          <ScoreBarRow
            label="韵律感得分"
            childLabel="语调自然"
            score={prosodyScore}
            explaination={t(
              "models.pronunciationAssessment.explainations.prosodyScore"
            )}
          />
        </div>
      </div>

      {/* ⑦ 底部主操作区：再练一次主按钮 ＋ 打卡次按钮 */}
      <div className="p-4 rounded-3xl bg-card border border-border/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button
          size="lg"
          variant="outline"
          onClick={() => setShowShareModal(true)}
          className="w-full sm:w-auto h-12 rounded-2xl border-[#D3E4DE] text-primary font-bold gap-2 text-sm order-2 sm:order-1 cursor-pointer"
        >
          <AwardIcon className="size-4 text-primary" />
          <span>今日打卡成果</span>
        </Button>

        <Button
          size="lg"
          className="w-full sm:flex-1 h-12 bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-bold rounded-2xl shadow-md gap-2 text-sm sm:text-base cursor-pointer order-1 sm:order-2 normal-case"
          onClick={() => {
            const queryParams: string[] = [];
            queryParams.push(`text=${encodeURIComponent(referenceText)}`);
            if (bookId) queryParams.push(`bookId=${encodeURIComponent(bookId)}`);
            if (bookTitle)
              queryParams.push(`bookTitle=${encodeURIComponent(bookTitle)}`);
            if (pageParam)
              queryParams.push(`page=${encodeURIComponent(pageParam)}`);
            if (sourceParam)
              queryParams.push(`source=${encodeURIComponent(sourceParam)}`);
            navigate(
              `/pronunciation_assessments/new?${queryParams.join("&")}`
            );
          }}
        >
          <RotateCcwIcon className="size-4" />
          <span>再读一次，看看有没有进步</span>
        </Button>
      </div>

      {/* 今日打卡成果成就海报弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden overscroll-contain">
          <div className="bg-card border border-border w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h3 className="font-bold text-base text-foreground">
                  今日跟读小名师 · 成就卡
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭成就卡弹窗"
                className="size-8 rounded-full"
                onClick={() => setShowShareModal(false)}
              >
                <XIcon className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/40 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/qiaobao_sunny240.png"
                  alt="敢敢"
                  className="size-12 rounded-2xl border border-amber-300 bg-white p-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    SunnyBridge 阳光桥少儿英语
                  </div>
                  <div className="text-sm font-black text-foreground">
                    口型与音标精准纠音认证
                  </div>
                </div>
              </div>

              <div className="bg-background/80 p-3 rounded-xl border border-border/70">
                <div className="text-xs text-muted-foreground mb-1">
                  今日挑战朗读英文：
                </div>
                <div className="text-sm font-bold font-serif text-foreground">
                  &ldquo;{referenceText}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground">
                    总评得分
                  </div>
                  <div className="text-base font-black text-foreground tabular-nums">
                    {totalScore !== null ? `${totalScore} 分` : "—"}
                  </div>
                </div>
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground">
                    达标单词
                  </div>
                  <div className="text-base font-black text-emerald-700 tabular-nums">
                    {excellentWords.length} 词
                  </div>
                </div>
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[11px] text-muted-foreground">
                    发音清晰度
                  </div>
                  <div className="text-base font-black text-orange-700 tabular-nums">
                    {accuracyScore !== null ? `${accuracyScore} 分` : "—"}
                  </div>
                </div>
              </div>

              {issueWords.length > 0 ? (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                  <SparklesIcon className="size-4 shrink-0 text-amber-500" />
                  <span>
                    今天重点练了 {issueWords.map((w) => w.word).join("、")}
                  </span>
                </div>
              ) : conclusion.emptyPraiseAllowed ? (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                  <span>全句单词发音均已达标！</span>
                </div>
              ) : (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                  <SparklesIcon className="size-4 shrink-0 text-amber-500" />
                  <span>今天完成了这句的跟读练习</span>
                </div>
              )}
            </div>

            <Button
              className="w-full h-11 bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-bold rounded-xl cursor-pointer"
              onClick={() => {
                toast.success(
                  "成就卡已生成，可在微信朋友圈或学习群分享打卡！"
                );
                setShowShareModal(false);
              }}
            >
              一键打卡保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 四维分数单行组件
function ScoreBarRow(props: {
  label: string;
  childLabel: string;
  score: number | null;
  explaination?: string;
}) {
  const { label, childLabel, score, explaination } = props;
  const isNull = score === null || score === undefined;
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <span>{label}</span>
          <span className="text-xs text-muted-foreground font-normal">
            ({childLabel})
          </span>
          {explaination && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`${label}说明`}
                  className="inline-flex items-center justify-center rounded-full size-6 min-w-6 min-h-6 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                >
                  <InfoIcon className="size-3.5" size={14} absoluteStrokeWidth />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-64 p-2.5 text-xs leading-relaxed rounded-xl"
              >
                {explaination}
              </PopoverContent>
            </Popover>
          )}
        </span>
        {isNull ? (
          <span className="font-medium text-muted-foreground">未测评</span>
        ) : (
          <span className={`font-black tabular-nums ${scoreColor(score)}`}>{score} 分</span>
        )}
      </div>
      <Progress
        className="h-2.5"
        indicatorClassName={isNull ? "bg-transparent" : scoreColor(score, "bg")}
        value={isNull ? 0 : score}
      />
    </div>
  );
}

// 错误开关单项组件
function ErrorSwitchItem(props: {
  count: number;
  badgeClass: string;
  title: string;
  originalTerm: string;
  explaination: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const {
    count,
    badgeClass,
    title,
    originalTerm,
    explaination,
    checked,
    onToggle,
  } = props;
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-[11px] font-black px-1.5 py-0.2 rounded ${badgeClass}`}
        >
          {count}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-foreground truncate">
              {title}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`${title}说明`}
                  className="inline-flex items-center justify-center rounded-full size-6 min-w-6 min-h-6 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer shrink-0"
                >
                  <InfoIcon className="size-3" size={12} absoluteStrokeWidth />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-64 p-2.5 text-xs leading-relaxed rounded-xl"
              >
                {`${originalTerm}: ${explaination}`}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      <Switch
        aria-label={`显示${title}高亮`}
        checked={checked}
        onClick={onToggle}
      />
    </div>
  );
}
