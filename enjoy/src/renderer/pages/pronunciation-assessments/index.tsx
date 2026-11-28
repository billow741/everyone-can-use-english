import { useIsDesktop } from "@renderer/hooks";
import { DesktopPronunciation } from "@renderer/components";
import dayjs from "dayjs";
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
  toast,
} from "@renderer/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  TrophyIcon,
  FlameIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { t } from "i18next";
import {
  PronunciationAssessmentCard,
  SunnyBridgeDailySentence,
} from "@renderer/components";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { getWordPhonetics } from "@renderer/lib/phonetics-coach";
import { ALL_39_PHONEMES } from "@renderer/lib/phoneme-data";
import { usePronunciationCoach } from "@renderer/context";

const ROGER_SENTENCE_IPA_OVERRIDES: Record<string, string> = {
  of: "əv",
  course: "ˈkɔːrs",
};

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
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return <DesktopPronunciation />;
  }

  const { EnjoyApp, webApi } = useContext(AppSettingsProviderContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectId = searchParams.get("selectId");

  const { openAssessment } = usePronunciationCoach();

  const [assessments, setAssessments] = useState<PronunciationAssessmentType[]>([]);

  const [deleting, setDeleting] = useState<PronunciationAssessmentType | null>(null);
  const [sharing, setSharing] = useState<RecordingType | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<string>("createdAtDesc");
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);

  const { sentence: currentSentence } = useDailySentence();

  // 单词音标映射缓存
  const [wordIpaMap, setWordIpaMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    fetch("/assets/tmm-dialogues/word-ipa.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        if (alive && data) setWordIpaMap(data);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 练习句与音标：与桌面端口径一致
  const sentenceIpa = useMemo(() => {
    if (!currentSentence?.text) return "";
    const words = currentSentence.text.match(/[A-Za-z][A-Za-z']*/g) || [];
    const ipas: string[] = [];
    for (const w of words) {
      const lower = w.toLowerCase();
      let ipa = "";
      if (ROGER_SENTENCE_IPA_OVERRIDES[lower]) {
        ipa = ROGER_SENTENCE_IPA_OVERRIDES[lower];
      } else {
        const coachResult = getWordPhonetics(lower);
        if (coachResult && coachResult.ipa) {
          ipa = coachResult.ipa;
        } else if (wordIpaMap[lower]) {
          ipa = wordIpaMap[lower];
        } else {
          ipa = w;
        }
      }
      const cleaned = ipa
        .replace(/^\/+|\/+$/g, "")
        .replace(/ʊə/g, "ʊ")
        .replace(/ʊɹ/g, "ʊr");
      ipas.push(cleaned);
    }
    if (ipas.length === 0) return "";
    return `/${ipas.join(" ")}/`;
  }, [currentSentence, wordIpaMap]);

  // 今日目标练习数（与桌面端同数据源 sb_daily_assessments_YYYY-MM-DD）
  const todayKey = useMemo(() => "sb_daily_assessments_" + dayjs().format("YYYY-MM-DD"), []);
  const [todayPracticeCount, setTodayPracticeCount] = useState<number>(() => {
    try {
      const val = localStorage.getItem(todayKey);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const recordPracticeDone = () => {
    setTodayPracticeCount((prev) => {
      const nextCount = prev + 1;
      try {
        localStorage.setItem(todayKey, String(nextCount));
      } catch {}
      return nextCount;
    });
  };

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
      // 无真实评测记录：不展示硬编码四维分与预设音标，
      // 由下方空状态文案说明，网格仅显示 0 分占位
      return {
        dimensions: { accuracy: 0, fluency: 0, completeness: 0, prosody: 0 },
        weakPhonemes: [],
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

    const avgAccuracy = count > 0 ? Math.round(accSum / count) : 0;
    const avgFluency = count > 0 ? Math.round(fluSum / count) : 0;
    const avgCompleteness = count > 0 ? Math.round(compSum / count) : 0;
    const avgProsody = count > 0 ? Math.round(prosSum / count) : 0;

    // 档案反哺规则 3（沉默）：样本 < 5 的音素绝不出现在任何「薄弱」表述里；达标且失分率>50% 才列出
    const sortedPhonemes = Array.from(phonemeMap.entries())
      .filter(([_, data]) => data.totalCount >= 5 && (data.errorCount / data.totalCount) > 0.5)
      .sort((a, b) => b[1].errorCount - a[1].errorCount || (a[1].scoreSum / a[1].totalCount) - (b[1].scoreSum / b[1].totalCount))
      .slice(0, 5)
      .map(([sym, data]) => {
        const defaultMatch = DEFAULT_FOCUS_PHONEMES.find((df) => df.phoneme === sym);
        return {
          phoneme: sym,
          name: defaultMatch?.name || `音标 /${sym}/`,
          tip: defaultMatch?.tip || `建议多听标准发音并查看音素详情`,
          errorCount: data.errorCount,
          scoreSum: data.scoreSum,
          totalCount: data.totalCount,
        };
      });

    // 只展示真实评测记录算出的薄弱音标，不用预设音标垫补
    //（垫补项 totalCount 为 0，会连带产生无依据的 75% 掌握率）
    const topWeakPhonemes = sortedPhonemes.slice(0, 5);

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

  // 若 URL 带有 selectId 则导航至独立报告页
  useEffect(() => {
    if (selectId) {
      navigate(`/pronunciation_assessments/${selectId}`, { replace: true });
    }
  }, [selectId]);

  // 若 URL 带有 practice=true 则直接唤起全局纠错舱
  useEffect(() => {
    const isPractice = searchParams.get("practice") === "true";
    const textParam = searchParams.get("text");
    const audioParam = searchParams.get("audioUrl") || "";
    if (isPractice && textParam) {
      openAssessment({
        referenceText: textParam,
        audioUrl: audioParam,
        source: "correction",
        contextTitle: "跟读练习",
        archiveContext: {
          source: "correction",
          contextRef: `practice#${Date.now()}`,
        },
        onSuccess: () => {
          fetchAssessments();
          recordPracticeDone();
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

  // 今日目标环形进度 (周长 188.5)
  const goalFraction = Math.min(1, todayPracticeCount / 10);
  const dashOffset = 188.5 * (1 - goalFraction);
  const goalPct = Math.round(goalFraction * 100);

  return (
    <div className="min-h-full px-4 py-5 sm:py-6 lg:px-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-20">
      {/* 顶部标题与学习数据 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3.5">
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-12 rounded-full object-cover border-2 border-primary shadow-md shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                发音纠错
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                四维诊断
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              四维发音评估与逐音素诊断
            </p>
          </div>
        </div>

        {learningStats.totalCount > 0 && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#E7F2EF] border border-[#D3E4DE] text-xs shadow-2xs">
              <span className="text-muted-foreground text-[11px]">累计练习</span>
              <span className="font-black text-ink font-mono">
                {learningStats.totalCount} 次
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground text-[11px]">均分</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {learningStats.avgScore}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 核心板块 1：每日练习句（与桌面端共享组件 SunnyBridgeDailySentence） */}
      <div id="daily-sentence-studio">
        <SunnyBridgeDailySentence
          variant="pronunciation"
          ipa={sentenceIpa}
          onAssessmentSuccess={() => {
            fetchAssessments();
            recordPracticeDone();
          }}
        />
      </div>

      {/* 今日目标环形卡 */}
      <div className="rounded-[20px] bg-white dark:bg-slate-900 border border-[#D3E4DE] dark:border-slate-700 px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-[17px] font-extrabold text-[#123B3C] dark:text-foreground">
            今日目标
          </h2>
          <p className="mt-1 text-[13.5px] text-[#4E6B69] dark:text-muted-foreground">
            {todayPracticeCount} / 10 次练习
          </p>
        </div>
        <div className="relative w-[72px] h-[72px] shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="#D3E4DE"
              strokeWidth="7"
            />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="#0F7B7A"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="188.5"
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-[#0F7B7A]">
            {goalPct}%
          </div>
        </div>
      </div>

      {/* 核心板块 2：发音能力全维诊断看板 & 靶向薄弱音标攻克 */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#F3FAF8] border border-[#D3E4DE] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D3E4DE] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-xs">
              📊
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                <span>发音能力看板</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E7F2EF] text-[#0A5E5D] border border-[#0F7B7A]/25">
                  四维诊断
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                查看四维评分与重点待练音素，点击音素标签可针对性练习
              </p>
            </div>
          </div>
        </div>

        {assessments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#D3E4DE] bg-[#E7F2EF] px-4 py-3 text-xs font-bold text-primary">
            0 次练习 · 暂无评测数据：完成一次发音评测后，这里会显示由真实记录算出的四维分数与薄弱音标。
          </div>
        )}

        {/* 4 维语音宏观指标 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-blue-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
              <span>准确度</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.accuracy} 分</span>
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
              <span>流利度</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.fluency} 分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">连贯朗读无顿挫卡顿</p>
            <div className="w-full bg-emerald-100 dark:bg-emerald-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.fluency)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-[#D3E4DE] shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-ink font-bold">
              <span>完整度</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.completeness} 分</span>
            </div>
            <p className="text-[11px] text-muted-foreground">朗读完整无漏词少字</p>
            <div className="w-full bg-[#E7F2EF] dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, phonicsDiagnostics.dimensions.completeness)}%` }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-pink-300/40 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-pink-700 dark:text-pink-300 font-bold">
              <span>语调</span>
              <span className="text-sm font-black">{phonicsDiagnostics.dimensions.prosody} 分</span>
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
              <span>重点待练音素（点击标签可前往练习）：</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {phonicsDiagnostics.weakPhonemes.length === 0 ? (
              <span className="text-xs text-muted-foreground/80 py-1 font-medium">
                正在积累发音样本，同一音素练习满 5 次后会评估重点待练项。
              </span>
            ) : (
              phonicsDiagnostics.weakPhonemes.map((wp) => {
                const accuracyRate =
                  wp.totalCount > 0
                    ? Math.round(wp.scoreSum / wp.totalCount)
                    : null;
                const match = ALL_39_PHONEMES.find(
                  (p) =>
                    p.id === wp.phoneme ||
                    p.symbol.replace(/[\/\[\]]/g, "") === wp.phoneme
                );
                const phonemeTarget = match
                  ? match.id
                  : encodeURIComponent(wp.phoneme);

                return (
                  <button
                    key={wp.phoneme}
                    type="button"
                    onClick={() => {
                      navigate(`/phonemes/${phonemeTarget}`);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs bg-white/90 dark:bg-slate-900 border-amber-300/60 hover:border-amber-500 text-foreground hover:bg-amber-500/10"
                    title={`${wp.name} · ${wp.tip}（点击前往音素详情）`}
                  >
                  <span className="px-1.5 py-0.5 rounded-md font-mono text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    /{wp.phoneme}/
                  </span>
                  <span className="truncate max-w-[140px] text-[11px]">{wp.name.split(" ")[0]}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-300/40">
                    {wp.errorCount > 0 ? `失分 ${wp.errorCount} 次` : accuracyRate === null ? `暂无数据` : `掌握率 ${accuracyRate}%`}
                  </span>
                </button>
              );
            })
          )}
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
              还没有发音评测记录
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              完成一次发音评测后，即可生成诊断报告。
            </p>
            <Button
              size="sm"
              className="bg-[#F2A93B] hover:bg-[#E0992E] text-[#123B3C] font-bold rounded-xl text-xs cursor-pointer"
              onClick={() => {
                const todayDate = dayjs().format("YYYY-MM-DD");
                openAssessment({
                  referenceText: TODAY_CHALLENGE.text,
                  translation: TODAY_CHALLENGE.translation,
                  audioUrl: TODAY_CHALLENGE.audioUrl,
                  source: "quote",
                  contextTitle: "今日金句跟读挑战",
                  archiveContext: {
                    source: "quote",
                    contextRef: `today_challenge#${todayDate}`,
                  },
                  onSuccess: () => {
                    fetchAssessments();
                    recordPracticeDone();
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
                  onSelect={(assessment) => navigate(`/pronunciation_assessments/${assessment.id}`)}
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
