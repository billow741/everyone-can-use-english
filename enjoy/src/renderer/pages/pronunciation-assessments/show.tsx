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
  toast,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@renderer/components/ui";
import {
  WavesurferPlayer,
  scoreColor,
} from "@renderer/components";
import { PronunciationAssessmentWordResult } from "@renderer/components/pronunciation-assessments/pronunciation-assessment-word-result";
import { ArticulatoryTongueVisualizer } from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import {
  getPhonemeCoach,
  getWordPhonetics,
  playStandardTts,
} from "@renderer/lib/phonetics-coach";
import {
  fetchWordIpa,
  getCachedWordIpa,
  WordIpaResult,
} from "@renderer/lib/ldoce-dictionary";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  Volume2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  RotateCcwIcon,
  Share2Icon,
  SparklesIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  InfoIcon,
  AwardIcon,
  XIcon,
  BookOpenIcon,
  FlameIcon,
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

  const [assessment, setAssessment] = useState<PronunciationAssessmentType | null>(null);
  const [allAssessments, setAllAssessments] = useState<PronunciationAssessmentType[]>([]);
  const [loading, setLoading] = useState(true);

  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [playingSlowWord, setPlayingSlowWord] = useState<string | null>(null);
  const [playingMyAudio, setPlayingMyAudio] = useState<string | null>(null);
  const [activeVisualizerPhoneme, setActiveVisualizerPhoneme] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAllZeroErrors, setShowAllZeroErrors] = useState(false);
  const [showChipsEvidence, setShowChipsEvidence] = useState(true);

  const [errorDisplay, setErrorDisplay] = useState({
    mispronunciation: true,
    omission: true,
    insertion: true,
    unexpectedBreak: true,
    missingBreak: true,
    monotone: true,
  });

  // 加载评测数据与足迹历史列表
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        let list: PronunciationAssessmentType[] = [];
        if (EnjoyApp?.pronunciationAssessments?.findAll) {
          list = await EnjoyApp.pronunciationAssessments.findAll({ limit: 100 });
        }
        if ((!list || list.length === 0) && typeof localStorage !== "undefined") {
          try {
            const raw = localStorage.getItem("sunnybridge_assessments");
            if (raw) list = JSON.parse(raw);
          } catch (e) {}
        }
        if (!isMounted) return;
        setAllAssessments(list || []);

        let current = list?.find((a) => a.id === id);
        if (!current && EnjoyApp?.pronunciationAssessments?.findOne) {
          current = await EnjoyApp.pronunciationAssessments.findOne({ id });
        }
        if (!current && typeof localStorage !== "undefined") {
          try {
            const raw = localStorage.getItem("sunnybridge_assessments");
            if (raw) {
              const parsed = JSON.parse(raw);
              current = parsed.find((a: any) => a.id === id);
            }
          } catch (e) {}
        }
        if (isMounted) {
          setAssessment(current || null);
        }
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
    return allAssessments.findIndex((a) => a.id === id);
  }, [allAssessments, id]);

  const prevAssessment = currentIndex > 0 ? allAssessments[currentIndex - 1] : null;
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

  const rawWords: any[] = useMemo(() => {
    return parsedResult?.words || [];
  }, [parsedResult]);

  // 词级细化分析
  const analyzedWords = useMemo(() => {
    return rawWords.map((item) => {
      const wordText = item.word || "";
      const cleanWord = wordText.replace(/[^a-zA-Z]/g, "").toLowerCase();
      const accuracy = item.pronunciationAssessment?.accuracyScore ?? 100;
      const errorType = item.pronunciationAssessment?.errorType || "None";
      const phonemes = (item.phonemes || []).map((p: any) => ({
        phoneme: p.phoneme,
        score: p.pronunciationAssessment?.accuracyScore ?? 100,
        isError: (p.pronunciationAssessment?.accuracyScore ?? 100) < 75,
      }));
      const wrongPhonemes = phonemes
        .filter((p: any) => p.isError)
        .map((p: any) => ({
          phoneme: p.phoneme,
          score: p.score,
          guide: getPhonemeCoach(p.phoneme),
        }));

      const hasIssue =
        accuracy < 80 || errorType !== "None" || wrongPhonemes.length > 0;

      return {
        ...item,
        word: wordText,
        cleanWord,
        accuracy,
        errorType,
        phonemes,
        wrongPhonemes,
        hasIssue,
      };
    });
  }, [rawWords]);

  const issueWords = useMemo(() => analyzedWords.filter((w) => w.hasIssue), [analyzedWords]);
  const excellentWords = useMemo(() => analyzedWords.filter((w) => !w.hasIssue), [analyzedWords]);

  // 按弱音素归并：同一弱音素只出一张指导卡，覆盖全部命中单词（think/thing 共享 /θ/ 时指导只讲一次，两词并列在卡头）
  const phonemeGroupedCards = useMemo(() => {
    const map: Record<
      string,
      {
        phoneme: string;
        words: typeof analyzedWords;
        guide: ReturnType<typeof getPhonemeCoach>;
        minScore: number;
      }
    > = {};

    issueWords.forEach((wordItem) => {
      if (wordItem.wrongPhonemes.length > 0) {
        wordItem.wrongPhonemes.forEach((wp: any) => {
          if (!map[wp.phoneme]) {
            map[wp.phoneme] = {
              phoneme: wp.phoneme,
              words: [wordItem],
              guide: wp.guide,
              minScore: wp.score,
            };
          } else {
            if (!map[wp.phoneme].words.some((w) => w.cleanWord === wordItem.cleanWord)) {
              map[wp.phoneme].words.push(wordItem);
            }
            if (wp.score < map[wp.phoneme].minScore) {
              map[wp.phoneme].minScore = wp.score;
            }
          }
        });
      } else {
        // 无细分音素错误但词级分数低于80
        const fakeKey = `word_${wordItem.cleanWord}`;
        if (!map[fakeKey]) {
          map[fakeKey] = {
            phoneme: wordItem.word,
            words: [wordItem],
            guide: {
              name: wordItem.word,
              tip: "注意听标准发音示范，发音时口型尽量张大，保持音素清晰饱满。",
              mouthShape: "双唇自然放松，声带震动饱满。",
              mistake: "容易吞音或语速过急。",
            } as any,
            minScore: wordItem.accuracy,
          };
        }
      }
    });

    return Object.values(map);
  }, [issueWords]);

  const issuePhonemes = useMemo(() => {
    const phs = new Set<string>();
    issueWords.forEach((w) => {
      w.wrongPhonemes.forEach((wp: any) => phs.add(wp.phoneme));
    });
    return Array.from(phs);
  }, [issueWords]);

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
      playStandardTts(word, { rate: "-25%" }).finally(() => setPlayingSlowWord(null));
    } else {
      setPlayingWord(word);
      playStandardTts(word).finally(() => setPlayingWord(null));
    }
  };

  // 播放录音指定片段
  const handlePlayMyRecording = (offsetMs = 0, durationMs = 0, wordClean = "") => {
    if (!recording.src) return;
    setPlayingMyAudio(wordClean);
    const audio = new Audio(recording.src);
    if (offsetMs > 0) {
      audio.currentTime = offsetMs / 1000;
    }
    if (durationMs > 0) {
      setTimeout(() => {
        audio.pause();
        setPlayingMyAudio(null);
      }, durationMs + 250);
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
        <h2 className="text-lg font-bold text-foreground">未找到该条评测记录</h2>
        <p className="text-xs text-muted-foreground">记录可能已被删除或尚未同步。</p>
        <Button
          onClick={() => navigate("/pronunciation_assessments")}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
        >
          返回发音纠错页
        </Button>
      </div>
    );
  }

  const totalScore = assessment.pronunciationScore ?? 0;
  const accuracyScore = assessment.accuracyScore ?? totalScore;
  const fluencyScore = assessment.fluencyScore ?? totalScore;
  const completenessScore = assessment.completenessScore ?? totalScore;
  const prosodyScore = assessment.prosodyScore ?? totalScore;

  // 定性与一句话结论
  let scoreVerdict = "读得很棒";
  if (totalScore < 60) {
    scoreVerdict = issuePhonemes.length
      ? `别灰心，先练这 ${issuePhonemes.length} 个音`
      : "别灰心，多听多练就能提高";
  } else if (totalScore < 80) {
    scoreVerdict = issuePhonemes.length
      ? `不错，${issuePhonemes.map((p) => `/${p}/`).join("、")} 要练`
      : "不错，发音已非常接近标准";
  }

  const conclusionText =
    issueWords.length > 0
      ? `这次读得不错，要练的是 ${issueWords.map((w) => w.word).join("、")} 的 ${
          issuePhonemes.length ? issuePhonemes.map((p) => `/${p}/`).join("、") : "发音细节"
        }`
      : "全句发音纯正地道，太棒了！继续保持！";

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
    <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* 顶部返回路径与上一条/下一条切换 */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/50 pb-3">
        <Link
          to={returnUrl}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 transition-colors shadow-2xs"
        >
          {bookId ? <BookOpenIcon className="size-3.5" /> : <ArrowLeftIcon className="size-3.5" />}
          <span>{returnLabel}</span>
        </Link>

        {/* 上一条 / 下一条切换 */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={!prevAssessment}
            onClick={() => prevAssessment && navigateToAdjacent(prevAssessment.id)}
            className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1 border-border/80"
          >
            <ChevronLeftIcon className="size-3" />
            <span>上一条</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!nextAssessment}
            onClick={() => nextAssessment && navigateToAdjacent(nextAssessment.id)}
            className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1 border-border/80"
          >
            <span>下一条</span>
            <ChevronRightIcon className="size-3" />
          </Button>
        </div>
      </div>

      {/* 标题带记录身份：句子 ＋ 总分 ＋ 日期 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            这次读得怎么样
          </h1>
          <span className="text-xs text-muted-foreground font-medium">
            发音评测综合诊断报告
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          &ldquo;{referenceText}&rdquo; · <span className="font-bold text-foreground">{totalScore}分</span> · {dayjs(assessment.createdAt).format("MM/DD")}
        </p>
      </div>

      {/* 若有音频则渲染波形播放器，无音频不留占位 */}
      {recording.src && (
        <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-bold">🎙️ 录音回听：</span>
            <span>{Math.round(recording.duration / 1000)} 秒</span>
          </div>
          <WavesurferPlayer id={recording.id} src={recording.src} />
        </div>
      )}

      {/* ① 一句话结论 ＋ 总分置顶（结论先行） */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-2 border-amber-500/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-black shadow-xs">
              <SparklesIcon className="size-3" />
              <span>综合诊断结论</span>
            </div>
            <p className="text-base sm:text-lg font-black text-foreground leading-snug">
              {conclusionText}
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="font-bold text-amber-700 dark:text-amber-300">定性反馈:</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 font-bold text-amber-800 dark:text-amber-200">
                {scoreVerdict}
              </span>
            </div>
          </div>

          {/* 圆环标注「总分」二字 */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative">
              <RadialProgress
                className="w-28 h-28 sm:w-32 sm:h-32"
                ringClassName={`${scoreColor(totalScore)}`}
                progress={totalScore}
                fontSize={28}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-muted-foreground mt-7">总分</span>
              </div>
            </div>
            {/* 色带含文字含义 */}
            <div className="flex items-center gap-2.5 mt-2 text-[10px] text-muted-foreground">
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
        </div>
      </div>

      {/* ② 读对的词（正向反馈，1 行） */}
      {excellentWords.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              <span>这 {excellentWords.length} 个词读得很好，发音纯正地道：</span>
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
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
                  playingWord === item.cleanWord ? "ring-2 ring-emerald-500 bg-emerald-500/20 font-bold" : ""
                }`}
                onClick={() => handlePlayTts(item.cleanWord, false)}
              >
                <span className="font-serif font-bold">{item.word}</span>
                <span className="text-[11px] text-emerald-600 font-extrabold">
                  {item.accuracy}分
                </span>
                <Volume2Icon className="size-3 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ③ 诊断卡（重点练的词＋发音指导，核心内容前置） */}
      <div className="space-y-4">
        {/* 敢敢横幅降权重：标题字号降一档、底色减淡、小徽章、措辞改进 */}
        <div className="p-3 sm:p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                敢敢帮你找到了要练的音
              </h3>
              <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-400">
                AI 逐音诊断
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {issueWords.length > 0
                ? `重点练 ${issueWords.map((w) => w.word).join("、")} 的 ${
                    issuePhonemes.length ? issuePhonemes.map((p) => `/${p}/`).join("、") : "发音"
                  }，多练几遍，就能听到变化！`
                : "全句发音优秀，未检测到明显发音偏差，继续保持！"}
            </p>
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

        {/* 诊断卡按弱音素归并：同一弱音素只出一张指导卡，两词并列在卡头 */}
        {phonemeGroupedCards.length > 0 ? (
          <div className="space-y-3">
            {/* 合格/需改进图例全页只出现一次 */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="font-bold text-foreground">需重点纠偏的错音及指导：</span>
              <span>🟢合格(≥75) · 🔴需改进(&lt;75)</span>
            </div>

            {phonemeGroupedCards.map((card, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-card border-2 border-amber-500/30 shadow-xs space-y-3"
              >
                {/* 卡头：并列展示命中的需练单词与重命名「这个词：XX分」 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-muted-foreground">需练单词:</span>
                    {card.words.map((w, wIdx) => (
                      <div key={wIdx} className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-xl">
                        <span className="font-serif font-bold text-base text-foreground">
                          {w.word}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                            w.accuracy >= 75
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-red-500/15 text-red-700 dark:text-red-300"
                          }`}
                        >
                          这个词: {w.accuracy}分
                        </span>
                        {w.errorType !== "None" && (
                          <span className="text-[10px] text-red-600 font-bold">
                            {w.errorType === "Mispronunciation" ? "音素发错" : w.errorType}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 示范按钮群 */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {card.words.map((w, wIdx) => (
                      <React.Fragment key={wIdx}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs rounded-lg gap-1 border-amber-500/40 text-amber-700 font-bold hover:bg-amber-500/10"
                          onClick={() => handlePlayTts(w.cleanWord, false)}
                        >
                          <Volume2Icon className="size-3 text-amber-600" />
                          <span>听{w.word}示范</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => handlePlayTts(w.cleanWord, true)}
                          title="慢速示范"
                        >
                          <span>🐢 慢速</span>
                        </Button>
                        {recording.src && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs rounded-lg gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              handlePlayMyRecording(w.offset, w.duration, w.cleanWord)
                            }
                          >
                            <PlayIcon className="size-3" />
                            <span>听我的</span>
                          </Button>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* 针对弱音素的拆解与口型发音要领 */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 font-bold text-amber-800 dark:text-amber-200">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 font-mono text-sm font-black text-amber-900 dark:text-amber-100">
                        /{card.phoneme}/
                      </span>
                      <span>{card.guide?.name ? `${card.guide.name} 发音指导：` : "发音要领："}</span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px] rounded-lg border-amber-400/80 bg-background hover:bg-amber-500 hover:text-white text-amber-800 dark:text-amber-200 font-bold gap-1 cursor-pointer"
                      onClick={() =>
                        setActiveVisualizerPhoneme(
                          activeVisualizerPhoneme === card.phoneme ? null : card.phoneme
                        )
                      }
                    >
                      <span>👄</span>
                      <span>
                        {activeVisualizerPhoneme === card.phoneme
                          ? "收起发音动画"
                          : "查看发音动画"}
                      </span>
                    </Button>
                  </div>

                  {activeVisualizerPhoneme === card.phoneme && (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <ArticulatoryTongueVisualizer
                        phoneme={card.phoneme}
                        word={card.words[0]?.cleanWord || ""}
                        compact
                        onClose={() => setActiveVisualizerPhoneme(null)}
                        onStartAssessment={() =>
                          navigate(
                            `/pronunciation_assessments/new?text=${encodeURIComponent(
                              referenceText
                            )}`
                          )
                        }
                      />
                    </div>
                  )}

                  <p className="leading-relaxed text-foreground/90 pl-1">
                    💡 <span className="font-bold">发音秘籍：</span>
                    {card.guide?.tip || "注意听标准发音示范，口型饱满并保持稳定气流。"}
                  </p>
                  {card.guide?.mouthShape && (
                    <p className="pl-1 text-muted-foreground">
                      👄 <span className="font-bold">口型要领：</span>
                      {card.guide.mouthShape}
                    </p>
                  )}
                  {card.guide?.mistake && (
                    <p className="pl-1 text-red-600 dark:text-red-400">
                      ⚠️ <span className="font-bold">常见误区：</span>
                      {card.guide.mistake}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ④ 四维分数（响应式 390 独立上下结构，3.3 修法） */}
      <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border/60 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-foreground">四维发音能力剖析</h3>

        {/* 响应式网格：窄屏 (390) 上下堆叠、宽屏左右并列 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* 圆环独占一行居中，尺寸 130px */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <RadialProgress
                className="w-32 h-32"
                ringClassName={`${scoreColor(totalScore)}`}
                progress={totalScore}
                fontSize={26}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-bold text-muted-foreground mt-7">总分</span>
              </div>
            </div>
            {/* 图例紧跟圆环正下方居中，与分数条拉开行距 */}
            <div className="flex items-center space-x-3 text-xs mt-3 text-muted-foreground">
              <div className="flex items-center space-x-1">
                <span className="size-2.5 rounded-full bg-red-600"></span>
                <span>0~59 加油</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="size-2.5 rounded-full bg-yellow-600"></span>
                <span>60~79 不错</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="size-2.5 rounded-full bg-green-600"></span>
                <span>80~100 很棒</span>
              </div>
            </div>
          </div>

          {/* 四条分数条全宽在下/右侧，每条标签＋分数＋条完整占一行 */}
          <div className="md:col-span-2 space-y-3.5 w-full">
            <ScoreBarRow
              label="准确度得分"
              childLabel="发音清晰"
              score={accuracyScore}
              explaination={t("models.pronunciationAssessment.explainations.accuracyScore")}
            />
            <ScoreBarRow
              label="流利度得分"
              childLabel="朗读流畅"
              score={fluencyScore}
              explaination={t("models.pronunciationAssessment.explainations.fluencyScore")}
            />
            <ScoreBarRow
              label="完整度得分"
              childLabel="没有漏读多读"
              score={completenessScore}
              explaination={t("models.pronunciationAssessment.explainations.completenessScore")}
            />
            <ScoreBarRow
              label="韵律感得分"
              childLabel="语调自然"
              score={prosodyScore}
              explaination={t("models.pronunciationAssessment.explainations.prosodyScore")}
            />
          </div>
        </div>
      </div>

      {/* ⑤ 逐词 chips（证据，可折叠）与 ⑥ 错误统计（只留非零项） */}
      <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border/60 shadow-xs space-y-4">
        {/* 顶部控制栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">逐词发音诊断证据</h3>
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
            {showChipsEvidence ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </Button>
        </div>

        {showChipsEvidence && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground sm:hidden">
              💡 点击下方每个单词，可查看音标拆解与标准示范
            </p>

            {/* 窄屏下上下堆叠结构：词 chips 在上，错误统计在下 (3.3 修法) */}
            <div className="flex flex-col gap-4">
              {/* 词 chips 区域 */}
              <div className="flex items-center flex-wrap gap-2 p-3 rounded-2xl bg-muted/30 border border-border/50">
                {rawWords.map((wordItem: any, index: number) => (
                  <PronunciationAssessmentWordResult
                    key={index}
                    result={wordItem}
                    errorDisplay={errorDisplay}
                    src={recording.src}
                  />
                ))}
              </div>

              <Separator />

              {/* ⑥ 错误统计：默认只显示非零项，其余 0 值折叠进「其他 0 项」，每个开关旁加说明 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">错误高亮开关：</span>
                  <span className="text-[11px] text-muted-foreground">
                    点开关可隐藏/显示该类错误高亮
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {/* 非零错误统计项 */}
                  {errorStats.mispronunciation > 0 && (
                    <ErrorSwitchItem
                      count={errorStats.mispronunciation}
                      badgeClass="bg-yellow-600 text-white"
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
                      title="漏读少字"
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
                      title="多读词"
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
                      title="停顿的地方不对"
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
                      badgeClass="bg-amber-600 text-white"
                      title="该停没停"
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
                      badgeClass="bg-purple-600 text-white"
                      title="语调太平"
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

                {/* 0 值错误折叠区 */}
                {(() => {
                  const zeroItems = [
                    { key: "mispronunciation", count: errorStats.mispronunciation, title: "音素发错", orig: "发音错误", exp: "发音音素与标准发音偏差较大", badge: "bg-yellow-600 text-white" },
                    { key: "omission", count: errorStats.omission, title: "漏读少字", orig: "遗漏", exp: "目标句中的词未被读出或被吞音", badge: "bg-gray-600 text-white" },
                    { key: "insertion", count: errorStats.insertion, title: "多读词", orig: "多读", exp: "读了句子里没有的额外词语", badge: "bg-red-600 text-white" },
                    { key: "unexpectedBreak", count: errorStats.unexpectedBreak, title: "停顿的地方不对", orig: "意外停顿", exp: "在不该停顿的词语之间出现了停顿", badge: "bg-pink-600 text-white" },
                    { key: "missingBreak", count: errorStats.missingBreak, title: "该停没停", orig: "缺少停顿", exp: "在标点或意群分界处语速过快未做停顿", badge: "bg-amber-600 text-white" },
                    { key: "monotone", count: errorStats.monotone, title: "语调太平", orig: "单调", exp: "整句读音缺乏起伏重音", badge: "bg-purple-600 text-white" },
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
                          {showAllZeroErrors ? "收起其余 0 项" : `其他 ${zeroItems.length} 项表现全优 (0 次错误)`}
                        </span>
                        {showAllZeroErrors ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
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

      {/* ⑦ 底部主操作区：再练一次主按钮 ＋ 打卡次按钮 */}
      <div className="p-4 rounded-3xl bg-card border border-border/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* 打卡次按钮 */}
        <Button
          size="lg"
          variant="outline"
          onClick={() => setShowShareModal(true)}
          className="w-full sm:w-auto h-12 rounded-2xl border-amber-400 text-amber-700 dark:text-amber-300 font-bold gap-2 text-sm order-2 sm:order-1"
        >
          <AwardIcon className="size-4 text-amber-500" />
          <span>今日打卡成果</span>
        </Button>

        {/* 主按钮（橙色实底，跳重录评估） */}
        <Button
          size="lg"
          className="w-full sm:flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-md gap-2 text-sm sm:text-base cursor-pointer order-1 sm:order-2 normal-case"
          onClick={() => {
            const queryParams: string[] = [];
            queryParams.push(`text=${encodeURIComponent(referenceText)}`);
            if (bookId) queryParams.push(`bookId=${encodeURIComponent(bookId)}`);
            if (bookTitle) queryParams.push(`bookTitle=${encodeURIComponent(bookTitle)}`);
            if (pageParam) queryParams.push(`page=${encodeURIComponent(pageParam)}`);
            if (sourceParam) queryParams.push(`source=${encodeURIComponent(sourceParam)}`);
            navigate(`/pronunciation_assessments/new?${queryParams.join("&")}`);
          }}
        >
          <RotateCcwIcon className="size-4" />
          <span>
            {issuePhonemes.length
              ? `再读一次，看看 /${issuePhonemes.join("/、/")}/ 有没有进步`
              : "再读一次，巩固完美发音"}
          </span>
        </Button>
      </div>

      {/* 今日打卡成果成就海报弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h3 className="font-bold text-base text-foreground">今日跟读小名师 · 成就卡</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => setShowShareModal(false)}
              >
                <XIcon className="size-4" />
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
                <div className="text-xs text-muted-foreground mb-1">今日挑战朗读英文：</div>
                <div className="text-sm font-bold font-serif text-foreground">
                  &ldquo;{referenceText}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[10px] text-muted-foreground">总评得分</div>
                  <div className="text-base font-black text-foreground">{totalScore} 分</div>
                </div>
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[10px] text-muted-foreground">达标单词</div>
                  <div className="text-base font-black text-emerald-600">{excellentWords.length} 词</div>
                </div>
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[10px] text-muted-foreground">发音清晰度</div>
                  <div className="text-base font-black text-orange-600">{accuracyScore} 分</div>
                </div>
              </div>

              {issueWords.length > 0 ? (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                  <SparklesIcon className="size-4 shrink-0 text-amber-500" />
                  <span>
                    特别突破重点音标：
                    {issueWords.map((w) => w.word).join("、")} 正在快速提升！
                  </span>
                </div>
              ) : (
                <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                  <span>恭喜！全句单词发音全部达标，地道纯正！</span>
                </div>
              )}
            </div>

            <Button
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl"
              onClick={() => {
                toast.success("成就卡已生成，可在微信朋友圈或学习群分享打卡！");
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
  score: number;
  explaination?: string;
}) {
  const { label, childLabel, score, explaination } = props;
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between text-xs sm:text-sm">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <span>{label}</span>
          <span className="text-xs text-muted-foreground font-normal">({childLabel})</span>
          {explaination && (
            <span title={explaination} className="text-muted-foreground cursor-pointer">
              <InfoIcon className="size-3 inline" />
            </span>
          )}
        </span>
        <span className={`font-black ${scoreColor(score)}`}>{score} 分</span>
      </div>
      <Progress
        className="h-2.5"
        indicatorClassName={scoreColor(score, "bg")}
        value={score}
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
  const { count, badgeClass, title, originalTerm, explaination, checked, onToggle } = props;
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${badgeClass}`}>
          {count}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-foreground truncate">{title}</span>
            <span title={`${originalTerm}: ${explaination}`} className="text-muted-foreground cursor-pointer">
              <InfoIcon className="size-2.5 inline" />
            </span>
          </div>
        </div>
      </div>
      <Switch checked={checked} onClick={onToggle} />
    </div>
  );
}
