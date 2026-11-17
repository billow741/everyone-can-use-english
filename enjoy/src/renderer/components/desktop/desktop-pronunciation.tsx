import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { SunnyBridgeDailySentence } from "../sunnybridge-daily-sentence";
import {
  Star,
  Volume2,
  Mic,
  Flame,
  Trophy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { t } from "i18next";
import {
  AppSettingsProviderContext,
  usePronunciationCoach,
} from "@renderer/context";
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
  SheetContent,
  SheetHeader,
  SheetTitle,
  toast,
} from "@renderer/components/ui";
import {
  PronunciationAssessmentCard,
  RecordingDetail,
} from "@renderer/components";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import { useUserStars } from "@renderer/lib/desktop-data";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { playStandardTts, getWordPhonetics } from "@renderer/lib/phonetics-coach";
import { ALL_39_PHONEMES } from "@renderer/lib/phoneme-data";

// 预设默认易混淆高频音标（若用户尚无评测记录时展示）
const DEFAULT_FOCUS_PHONEMES = [
  {
    phoneme: "θ",
    name: "咬舌清音 (th)",
    tip: "舌尖伸在上下齿之间轻轻吐气，如 think, thank",
    errorCount: 0,
    scoreSum: 0,
    totalCount: 0,
  },
  {
    phoneme: "ð",
    name: "咬舌浊音 (th)",
    tip: "舌尖轻咬牙齿并振动声带，如 this, that, mother",
    errorCount: 0,
    scoreSum: 0,
    totalCount: 0,
  },
  {
    phoneme: "æ",
    name: "大开口梅花音",
    tip: "嘴巴张大两指宽，短促有力发音，如 cat, apple",
    errorCount: 0,
    scoreSum: 0,
    totalCount: 0,
  },
  {
    phoneme: "l",
    name: "舌尖清晰音/暗音",
    tip: "词首舌尖抵上齿龈，词尾舌尖上翘，如 lion, ball",
    errorCount: 0,
    scoreSum: 0,
    totalCount: 0,
  },
  {
    phoneme: "r",
    name: "卷舌音",
    tip: "舌尖向后卷起但不碰上膛，嘴唇微收圆，如 red, rabbit",
    errorCount: 0,
    scoreSum: 0,
    totalCount: 0,
  },
];

// Roger 批复定值（2026-11-16 18:34）：
// - of → /əv/（句中虚词弱读，去重音）
// - course → /ˈkɔːrs/（补 ː）
// - 句子重音保持逐词重音（现有 word-ipa.json 风格），不扩大到句子重音、不扩大修正范围到其他词
const ROGER_SENTENCE_IPA_OVERRIDES: Record<string, string> = {
  of: "əv",
  course: "ˈkɔːrs",
};

export const DesktopPronunciation: React.FC = () => {
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const { openAssessment } = usePronunciationCoach();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectId = searchParams.get("selectId");

  const stars = useUserStars();
  const { sentence: currentSentence } = useDailySentence();

  // 本地评测记录状态
  const [assessments, setAssessments] = useState<PronunciationAssessmentType[]>([]);
  const [selecting, setSelecting] = useState<PronunciationAssessmentType | null>(null);
  const [deleting, setDeleting] = useState<PronunciationAssessmentType | null>(null);
  const [sharing, setSharing] = useState<any | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<string>("createdAtDesc");

  // 发音成长足迹分页状态与容器引用
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(5);
  const historySectionRef = useRef<HTMLDivElement | null>(null);

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

  // 练习句与音标：按统一口径（coach getWordPhonetics 优先 → word-ipa.json → 仍无则显示该词原文）
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
      // 去掉首尾斜杠，并消除 ʊɹ/ʊə 非美音杂音
      const cleaned = ipa
        .replace(/^\/+|\/+$/g, "")
        .replace(/ʊə/g, "ʊ")
        .replace(/ʊɹ/g, "ʊr");
      ipas.push(cleaned);
    }
    if (ipas.length === 0) return "";
    return `/${ipas.join(" ")}/`;
  }, [currentSentence, wordIpaMap]);

  // 今日目标练习数
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
    const nextCount = todayPracticeCount + 1;
    setTodayPracticeCount(nextCount);
    try {
      localStorage.setItem(todayKey, String(nextCount));
    } catch {}
  };

  const [isPlayingTts, setIsPlayingTts] = useState(false);

  // 示范音频 URL（与「听示范」按钮同款参数）
  const teacherAudioUrl = useMemo(() => {
    if (!currentSentence?.text) return "";
    return `/api/ai/tts?text=${encodeURIComponent(
      currentSentence.text
    )}&voice=en-GB-SoniaNeural&rate=-15%`;
  }, [currentSentence?.text]);

  // 拉取本地评测记录
  const fetchAssessments = (params?: { offset?: number; limit?: number }) => {
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

    EnjoyApp?.pronunciationAssessments
      ?.findAll({
        limit,
        offset,
        order: [order],
      })
      .then((fetchedAssessments: PronunciationAssessmentType[]) => {
        if (offset === 0) {
          setAssessments(fetchedAssessments || []);
        } else {
          setAssessments((prev) => [...prev, ...(fetchedAssessments || [])]);
        }
        setHasMore((fetchedAssessments || []).length === limit);
      })
      .catch((err: any) => {
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

  const handleDelete = async (assessment: PronunciationAssessmentType) => {
    try {
      await EnjoyApp?.pronunciationAssessments?.destroy(assessment.id);
      setAssessments((prev) => prev.filter((a) => a.id !== assessment.id));
      setDeleting(null);
      toast.success("评测记录已删除");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // 学习统计概览 (G-PRON-06)
  const learningStats = useMemo(() => {
    if (assessments.length === 0) return { totalCount: 0, avgScore: 0 };
    const validScores = assessments
      .map((a) => a.pronunciationScore)
      .filter((s): s is number => typeof s === "number" && s > 0);
    const avgScore =
      validScores.length > 0
        ? Math.round(
            validScores.reduce((acc, cur) => acc + cur, 0) / validScores.length
          )
        : 0;
    return {
      totalCount: assessments.length,
      avgScore,
    };
  }, [assessments]);

  // 全维发音诊断大数据分析 (4 维指标 + 薄弱音标统计 G-PRON-03)
  const phonicsDiagnostics = useMemo(() => {
    if (assessments.length === 0) {
      return {
        dimensions: { accuracy: 0, fluency: 0, completeness: 0, prosody: 0 },
        weakPhonemes: [],
      };
    }

    let accSum = 0,
      fluSum = 0,
      compSum = 0,
      prosSum = 0,
      count = 0;
    const phonemeMap = new Map<
      string,
      { errorCount: number; scoreSum: number; totalCount: number }
    >();

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
          const existing = phonemeMap.get(sym) || {
            errorCount: 0,
            scoreSum: 0,
            totalCount: 0,
          };
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
      .filter(
        ([_, data]) => data.totalCount >= 5 && data.errorCount / data.totalCount > 0.5
      )
      .sort(
        (a, b) =>
          b[1].errorCount - a[1].errorCount ||
          a[1].scoreSum / a[1].totalCount - b[1].scoreSum / b[1].totalCount
      )
      .slice(0, 5)
      .map(([sym, data]) => {
        const defaultMatch = DEFAULT_FOCUS_PHONEMES.find(
          (df) => df.phoneme === sym
        );
        return {
          phoneme: sym,
          name: defaultMatch?.name || `音标 /${sym}/`,
          tip: defaultMatch?.tip || `建议多听标准发音并查看音素详情`,
          errorCount: data.errorCount,
          scoreSum: data.scoreSum,
          totalCount: data.totalCount,
        };
      });

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

  // 分页计算 (G-PRON-04)
  const totalHistoryCount = assessments.length;
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(totalHistoryCount / historyPageSize)
  );
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

  // 听示范
  const handlePlayDemo = async () => {
    if (!currentSentence?.text || isPlayingTts) return;
    setIsPlayingTts(true);
    try {
      await playStandardTts(currentSentence.text, {
        rate: "-15%",
        onEnd: () => setIsPlayingTts(false),
      });
    } catch {
      setIsPlayingTts(false);
    }
  };

  // 今日目标环形进度 (周长 188.5)
  const goalFraction = Math.min(1, todayPracticeCount / 10);
  const dashOffset = 188.5 * (1 - goalFraction);
  const goalPct = Math.round(goalFraction * 100);

  // 波形假柱（录音时激活波浪动画）
  const waveBars = [
    28, 42, 60, 35, 52, 78, 44, 30, 58, 70, 38, 48, 84, 62, 40, 55, 72, 46,
    34, 66, 80, 50, 36, 58, 74, 42, 60, 88, 54, 38, 64, 76, 44, 52, 68, 40,
    58, 82, 48, 36, 62, 70, 44, 56, 74, 40,
  ];

  return (
    <div className="desktop-shell">
      <DesktopSidebar activeTab="pronunciation" />

      <main className="sb-main">
        {/* 顶栏：标题 + 星星（无头像、无吉祥物） */}
        <div className="sb-topbar">
          <h1 className="text-[22px] font-extrabold text-ink">发音纠错</h1>
          <div className="sb-stars">
            <Star className="size-4 fill-sun-orange text-sun-orange" />
            <span>{stars}</span>
          </div>
        </div>

        {/* 主区左右分栏 */}
        <div className="sb-content">
          {/* 左栏：练习卡 + 4维诊断看板 */}
          <div className="sb-col-mid">
            <div className="sb-stack">
              {/* 每日练习句 (金句 Hero 卡 G-PRON-02, G-PRON-05) */}
              <div id="daily-sentence-studio">
                <SunnyBridgeDailySentence
                  onAssessmentSuccess={() => {
                    fetchAssessments();
                    recordPracticeDone();
                  }}
                />
              </div>

              {/* 练习卡 */}
              <div className="sb-card sb-practice">
                <h2>{currentSentence.text}</h2>
                <div className="ipa">{sentenceIpa}</div>

                {/* 听示范按钮 */}
                <div className="sb-demo" onClick={handlePlayDemo}>
                  <div className="btn">
                    <Volume2
                      className={`size-6 text-sun-orange ${
                        isPlayingTts ? "animate-pulse" : ""
                      }`}
                    />
                  </div>
                  <span>{isPlayingTts ? "正在示范…" : "听示范"}</span>
                </div>

                <div className="sb-divider" />

                {/* 波形条 */}
                <div className="sb-wave-wrap">
                  <div className="sb-wave-live">
                    {waveBars.map((h, i) => {
                      const isStrong = h > 70;
                      return (
                        <i
                          key={i}
                          style={{ height: `${h}%` }}
                          className={isStrong ? "strong" : ""}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 大圆录音钮：点按开弹窗 */}
                <div
                  className="sb-record"
                  onClick={() => {
                    const todayDate = dayjs().format("YYYY-MM-DD");
                    const quoteRef = currentSentence.id
                      ? `${currentSentence.id}#${todayDate}`
                      : `quote#${todayDate}`;
                    openAssessment({
                      referenceText: currentSentence.text,
                      translation: currentSentence.translation,
                      audioUrl: currentSentence.audioUrl,
                      phonicsFocus: currentSentence.phonicsFocus,
                      source: "quote",
                      contextTitle: "今日每日精读金句",
                      archiveContext: {
                        source: "quote",
                        contextRef: quoteRef,
                      },
                      onSuccess: () => {
                        fetchAssessments();
                        recordPracticeDone();
                      },
                    });
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    title="开始跟读"
                  >
                    <Mic className="size-8 text-white stroke-[2.2]" />
                  </button>
                  <span>开始跟读</span>
                </div>
              </div>

              {/* 核心板块 2：发音能力全维诊断看板 & 靶向薄弱音标攻克 (G-PRON-03) */}
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
                        全维评估发音全貌；点击待攻克音标，一键发起靶向纠音或查看音素详情
                      </p>
                    </div>
                  </div>

                  {/* 累计统计概览 (G-PRON-06) */}
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs shadow-2xs self-start sm:self-auto">
                    <span className="text-muted-foreground text-[11px]">累计练习</span>
                    <span className="font-black text-amber-700 dark:text-amber-300 font-mono">
                      {learningStats.totalCount} 次
                    </span>
                    <span className="text-amber-400">·</span>
                    <span className="text-muted-foreground text-[11px]">均分</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {learningStats.avgScore} 分
                    </span>
                  </div>
                </div>

                {assessments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-indigo-300/60 bg-indigo-500/5 px-4 py-3 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    0 次练习 · 暂无评测数据：完成一次发音评测后，这里会显示由真实记录算出的四维分数与薄弱音标。
                  </div>
                )}

                {/* 4 维语音宏观指标 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-blue-300/40 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold">
                      <span>🎯 准确度 (Accuracy)</span>
                      <span className="text-sm font-black">
                        {phonicsDiagnostics.dimensions.accuracy}分
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      音位对齐与发音清晰度
                    </p>
                    <div className="w-full bg-blue-100 dark:bg-blue-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            phonicsDiagnostics.dimensions.accuracy
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-emerald-300/40 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                      <span>🌊 流利度 (Fluency)</span>
                      <span className="text-sm font-black">
                        {phonicsDiagnostics.dimensions.fluency}分
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      连贯朗读无顿挫卡顿
                    </p>
                    <div className="w-full bg-emerald-100 dark:bg-emerald-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            phonicsDiagnostics.dimensions.fluency
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-amber-300/40 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
                      <span>🧩 完整度 (Completeness)</span>
                      <span className="text-sm font-black">
                        {phonicsDiagnostics.dimensions.completeness}分
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      朗读完整无漏词少字
                    </p>
                    <div className="w-full bg-amber-100 dark:bg-amber-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            phonicsDiagnostics.dimensions.completeness
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-pink-300/40 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-pink-700 dark:text-pink-300 font-bold">
                      <span>🎵 韵律感 (Prosody)</span>
                      <span className="text-sm font-black">
                        {phonicsDiagnostics.dimensions.prosody}分
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      抑扬顿挫与意群重音
                    </p>
                    <div className="w-full bg-pink-100 dark:bg-pink-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-pink-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            phonicsDiagnostics.dimensions.prosody
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 待攻克薄弱音标 */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                      <Flame className="size-3.5 text-orange-500" />
                      <span>
                        待攻克重点音标排行榜（点击标签，前往音素详情进行专项练习）：
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {phonicsDiagnostics.weakPhonemes.length === 0 ? (
                      <span className="text-xs text-muted-foreground/80 py-1 font-medium">
                        发音数据积累中（系统听过他读满 5 次以上才评估重点音标，样本不足不结论）
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
                            <span className="truncate max-w-[140px] text-[11px]">
                              {wp.name.split(" ")[0]}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-300/40">
                              {wp.errorCount > 0
                                ? `失分 ${wp.errorCount} 次`
                                : accuracyRate === null
                                ? `暂无数据`
                                : `掌握率 ${accuracyRate}%`}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右栏 400px：今日目标 + 评分卡 + 我的发音成长足迹 */}
          <div className="sb-col-right">
            <div className="sb-stack">
              {/* 今日目标卡 */}
              <div className="sb-card sb-goal">
                <div>
                  <h3>今日目标</h3>
                  <p>{todayPracticeCount} / 10 次练习</p>
                </div>
                <div className="sb-ring">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle
                      cx="36"
                      cy="36"
                      r="30"
                      fill="none"
                      stroke="#F6EAD0"
                      strokeWidth="7"
                    />
                    <circle
                      cx="36"
                      cy="36"
                      r="30"
                      fill="none"
                      stroke="#F5820B"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray="188.5"
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="pct">{goalPct}%</div>
                </div>
              </div>



              {/* 核心板块 3：发音成长足迹 (真实评测历史记录 G-PRON-04) */}
              <div
                id="pronunciation-growth-footprint"
                ref={historySectionRef}
                className="space-y-4 pt-4 border-t border-border/40 scroll-mt-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-amber-600" />
                    <h2 className="text-base md:text-lg font-bold text-foreground">
                      我的发音成长足迹
                    </h2>
                    <span className="text-xs text-muted-foreground font-semibold">
                      ({totalHistoryCount} 次练习)
                    </span>
                  </div>

                  {assessments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap justify-between">
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
                        <Label className="text-xs text-muted-foreground">
                          {t("sortBy")}:
                        </Label>
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
                              <SelectItem value="createdAtDesc">
                                {t("createdAtDesc")}
                              </SelectItem>
                              <SelectItem value="createdAtAsc">
                                {t("createdAtAsc")}
                              </SelectItem>
                              <SelectItem value="scoreDesc">
                                {t("scoreDesc")}
                              </SelectItem>
                              <SelectItem value="scoreAsc">
                                {t("scoreAsc")}
                              </SelectItem>
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
                      <Sparkles className="size-7" />
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
                          referenceText: currentSentence.text,
                          audioUrl: teacherAudioUrl,
                          source: "quote",
                          contextTitle: "今日金句跟读挑战",
                          archiveContext: {
                            source: "quote",
                            contextRef: `today_challenge#${dayjs().format("YYYY-MM-DD")}`,
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
                          onSelect={setSelecting}
                          onDelete={setDeleting}
                          onSharing={setSharing}
                        />
                      ))}
                    </div>

                    {/* 分页控制栏 */}
                    {totalHistoryPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground flex-wrap gap-2">
                        <span>
                          第 {currentHistoryPage} / {totalHistoryPages} 页 (共{" "}
                          {totalHistoryCount} 条记录)
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={currentHistoryPage <= 1}
                            onClick={() => {
                              setHistoryPage((p) => Math.max(1, p - 1));
                              historySectionRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }}
                            className="h-8 px-2.5 rounded-xl text-xs gap-1"
                          >
                            <ChevronLeft className="size-3.5" />
                            <span>上一页</span>
                          </Button>

                          {pageNumbers.map((pg, idx) =>
                            typeof pg === "number" ? (
                              <Button
                                key={idx}
                                size="sm"
                                variant={
                                  currentHistoryPage === pg
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => {
                                  setHistoryPage(pg);
                                  historySectionRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                  });
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
                              <span
                                key={idx}
                                className="px-1 text-muted-foreground font-mono"
                              >
                                ...
                              </span>
                            )
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={currentHistoryPage >= totalHistoryPages}
                            onClick={() => {
                              setHistoryPage((p) =>
                                Math.min(totalHistoryPages, p + 1)
                              );
                              historySectionRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }}
                            className="h-8 px-2.5 rounded-xl text-xs gap-1"
                          >
                            <span>下一页</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <DesktopFooter />
      </main>

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
};
