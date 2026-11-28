import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { SunnyBridgeDailySentence } from "../sunnybridge-daily-sentence";
import {
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
  Button,
  toast,
} from "@renderer/components/ui";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
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
  PronunciationAssessmentCard,
} from "@renderer/components";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { getWordPhonetics } from "@renderer/lib/phonetics-coach";
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

  const { sentence: currentSentence } = useDailySentence();

  // 发音评测历史后端记录状态
  const [assessments, setAssessments] = useState<PronunciationAssessmentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<{
    beforeTsMs: number;
    beforeId: number | string;
  } | null>(null);
  const [sharing, setSharing] = useState<any | null>(null);
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

  // 示范音频 URL（与「听示范」按钮同款参数）
  const teacherAudioUrl = useMemo(() => {
    if (!currentSentence?.text) return "";
    return `/api/ai/tts?text=${encodeURIComponent(
      currentSentence.text
    )}&voice=en-GB-SoniaNeural&rate=-15%`;
  }, [currentSentence?.text]);

  // 拉取后端历史评测记录
  const fetchBackendHistory = async (isLoadMore = false) => {
    if (isLoadMore) {
      if (!nextCursor) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const userId = getPhonemeUserId();
      const authHeaders = getPhonemeAuthHeaders(userId);
      const apiBase = getApiBase();

      let url = `${apiBase}/api/v1/pronunciation/assessments?user_id=${encodeURIComponent(
        userId
      )}&limit=20`;

      if (isLoadMore && nextCursor?.beforeTsMs && nextCursor?.beforeId) {
        url += `&before_ts_ms=${nextCursor.beforeTsMs}&before_id=${nextCursor.beforeId}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...authHeaders,
        },
      });

      if (!res.ok) {
        throw new Error(`获取历史记录失败 (${res.status})`);
      }

      const data: BackendPronunciationHistoryResponse = await res.json();
      if (data.status !== "ok" && (data.error || data.message)) {
        throw new Error(data.message || data.error || "获取历史记录失败");
      }

      const list = (data.assessments || []).map(adaptBackendAssessmentToLocal);

      if (isLoadMore) {
        setAssessments((prev) => [...prev, ...list]);
      } else {
        setAssessments(list);
      }

      if (data.next_before_ts_ms && data.next_before_id) {
        setNextCursor({
          beforeTsMs: data.next_before_ts_ms,
          beforeId: data.next_before_id,
        });
      } else {
        setNextCursor(null);
      }
    } catch (err: any) {
      console.error("fetchBackendHistory error:", err);
      if (!isLoadMore) {
        setError(err?.message || "网络请求异常，请点击重试");
      } else {
        toast.error(err?.message || "加载更多失败");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchBackendHistory(false);
  }, []);

  // 若 URL 带有 selectId 则导航至独立报告页
  useEffect(() => {
    if (selectId) {
      navigate(`/pronunciation_assessments/${selectId}`, { replace: true });
    }
  }, [selectId]);

  // 学习统计概览 (只对已加载记录算，null 维度不计入均值)
  const learningStats = useMemo(() => {
    if (assessments.length === 0) return { totalCount: 0, avgScore: 0 };
    const validScores = assessments
      .map((a) => a.pronunciationScore)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
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

  // 全维发音诊断分析 (4 维指标 + 薄弱音标统计：null 维度不计入均值、不当 0 算)
  const phonicsDiagnostics = useMemo(() => {
    if (assessments.length === 0) {
      return {
        dimensions: { accuracy: null, fluency: null, completeness: null, prosody: null },
        weakPhonemes: [],
      };
    }

    let accSum = 0, accCount = 0;
    let fluSum = 0, fluCount = 0;
    let compSum = 0, compCount = 0;
    let prosSum = 0, prosCount = 0;

    const phonemeMap = new Map<
      string,
      { errorCount: number; scoreSum: number; totalCount: number }
    >();

    assessments.forEach((a) => {
      if (typeof a.accuracyScore === "number" && !isNaN(a.accuracyScore)) {
        accSum += a.accuracyScore;
        accCount++;
      }
      if (typeof a.fluencyScore === "number" && !isNaN(a.fluencyScore)) {
        fluSum += a.fluencyScore;
        fluCount++;
      }
      if (typeof a.completenessScore === "number" && !isNaN(a.completenessScore)) {
        compSum += a.completenessScore;
        compCount++;
      }
      if (typeof a.prosodyScore === "number" && !isNaN(a.prosodyScore)) {
        prosSum += a.prosodyScore;
        prosCount++;
      }

      const words = a.result?.words || [];
      words.forEach((w: any) => {
        const phs = w.phonemes || [];
        phs.forEach((ph: any) => {
          const sym = ph.phoneme;
          if (!sym) return;
          const score = ph.pronunciationAssessment?.accuracyScore;
          if (typeof score !== "number" || isNaN(score)) return;
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

    const avgAccuracy = accCount > 0 ? Math.round(accSum / accCount) : null;
    const avgFluency = fluCount > 0 ? Math.round(fluSum / fluCount) : null;
    const avgCompleteness = compCount > 0 ? Math.round(compSum / compCount) : null;
    const avgProsody = prosCount > 0 ? Math.round(prosSum / prosCount) : null;

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

  // 游标与标题口径 (失败态不显示 (0 次练习)，显示 —)
  const isFailedInitialLoad = Boolean(error && assessments.length === 0);
  const hasMoreHistory = Boolean(nextCursor);
  const historyCountLabel = isFailedInitialLoad
    ? "—"
    : hasMoreHistory
    ? `(已加载 ${assessments.length} 条)`
    : `(${assessments.length} 次练习)`;

  // 今日目标环形进度 (周长 188.5)
  const goalFraction = Math.min(1, todayPracticeCount / 10);
  const dashOffset = 188.5 * (1 - goalFraction);
  const goalPct = Math.round(goalFraction * 100);

  return (
    <div className="desktop-shell">
      <DesktopSidebar activeTab="pronunciation" />

      <main className="sb-main">
        {/* 顶栏：标题（无头像、无吉祥物） */}
        <div className="sb-topbar">
          <h1 className="text-[22px] font-extrabold text-ink">发音纠错</h1>
        </div>

        {/* 主区左右分栏 */}
        <div className="sb-content">
          {/* 左栏：练习卡 + 4维诊断看板 */}
          <div className="sb-col-mid">
            <div className="sb-stack">
              {/* 每日练习句 (Hero卡与练习卡合一 G-PRON-02, G-PRON-05) */}
              <div id="daily-sentence-studio">
                <SunnyBridgeDailySentence
                  variant="pronunciation"
                  ipa={sentenceIpa}
                  onAssessmentSuccess={() => {
                    fetchBackendHistory(false);
                    recordPracticeDone();
                  }}
                />
              </div>

              {/* 核心板块 3：发音成长足迹 (真实评测历史记录) */}
              <div
                id="pronunciation-growth-footprint"
                ref={historySectionRef}
                className="space-y-4 pt-4 border-t border-border/40 scroll-mt-6"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-primary" />
                    <h2 className="text-base md:text-lg font-bold text-foreground">
                      我的发音成长足迹
                    </h2>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {historyCountLabel}
                    </span>
                  </div>
                </div>

                {loading && assessments.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-dashed border-[#D3E4DE] bg-[#E7F2EF] text-center">
                    <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">
                      正在加载发音评测历史...
                    </p>
                  </div>
                ) : error && assessments.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-dashed border-red-300/80 bg-red-50/50 dark:bg-red-950/20 text-center space-y-3">
                    <div className="size-12 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center mx-auto">
                      <AlertCircle className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">
                        历史记录获取失败
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {error}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchBackendHistory(false)}
                      className="rounded-xl text-xs font-bold gap-1.5 border-red-300 hover:bg-red-50 text-red-700 dark:text-red-300 cursor-pointer"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>重试</span>
                    </Button>
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-dashed border-[#D3E4DE] bg-[#E7F2EF] text-center border-border/80">
                    <div className="size-14 rounded-2xl bg-[#D3E4DE]/60 flex items-center justify-center mx-auto mb-3 text-primary">
                      <Sparkles className="size-7" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      还没有发音评测记录
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                      完成一次发音评测后，即可生成诊断报告。
                    </p>
                    <Button
                      size="sm"
                      className="bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-bold rounded-xl text-xs cursor-pointer shadow-sm"
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
                            fetchBackendHistory(false);
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
                      {assessments.map((assessment) => (
                        <PronunciationAssessmentCard
                          key={assessment.id}
                          pronunciationAssessment={assessment}
                          onSelect={(assessment) =>
                            navigate(`/pronunciation_assessments/${assessment.id}`)
                          }
                          onSharing={setSharing}
                        />
                      ))}
                    </div>

                    {/* 游标分页：加载更多 */}
                    {nextCursor && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingMore}
                          onClick={() => fetchBackendHistory(true)}
                          className="rounded-xl px-6 text-xs font-bold border border-[#D3E4DE] hover:bg-[#E7F2EF] text-primary gap-2 cursor-pointer"
                        >
                          {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
                          <span>{loadingMore ? "正在加载..." : "加载更多"}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
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
                  <p className="tabular-nums">{todayPracticeCount} / 10次练习</p>
                </div>
                <div className="sb-ring">
                  <svg width="72" height="72" viewBox="0 0 72 72">
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
                  <div className="pct tabular-nums">{goalPct}%</div>
                </div>
              </div>

              {/* 核心板块 2：发音能力全维诊断看板 & 靶向薄弱音标攻克 (G-PRON-03) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#F3FAF8] border border-[#D3E4DE] shadow-xs space-y-4">
                <div className="flex flex-col gap-2.5 border-b border-[#D3E4DE] pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                        📊
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                        <span className="whitespace-nowrap">发音能力看板</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E7F2EF] text-[#0A5E5D] border border-[#0F7B7A]/25 shrink-0 whitespace-nowrap">
                          四维诊断
                        </span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                      点击音素标签可开始针对性练习
                    </p>

                    {/* 累计统计概览 (未加载完时标注已加载子集口径；失败态显示 —) */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-[#E7F2EF] border border-[#D3E4DE] text-xs shadow-2xs shrink-0 whitespace-nowrap">
                      <span className="text-muted-foreground text-[11px]">
                        {isFailedInitialLoad
                          ? "累计练习"
                          : hasMoreHistory
                          ? `已加载 ${learningStats.totalCount} 条统计`
                          : "累计练习"}
                      </span>
                      {isFailedInitialLoad ? (
                        <span className="font-black text-ink font-mono">
                          —
                        </span>
                      ) : !hasMoreHistory ? (
                        <span className="font-black text-ink font-mono tabular-nums">
                          {learningStats.totalCount} 次
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-[11px]">均分</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                        {isFailedInitialLoad ? "—" : `${learningStats.avgScore} 分`}
                      </span>
                    </div>
                  </div>
                </div>

                {!error && assessments.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-indigo-300/60 bg-indigo-500/5 px-4 py-3 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    0 次练习 · 暂无评测数据：完成一次发音评测后，这里会显示由真实记录算出的四维分数与薄弱音标。
                  </div>
                )}

                {/* 4 维语音宏观指标 (null 维度渲染为 —) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-blue-300/40 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold whitespace-nowrap">
                      <span>准确度</span>
                      <span className="text-sm font-black font-mono">
                        {phonicsDiagnostics.dimensions.accuracy !== null
                          ? `${phonicsDiagnostics.dimensions.accuracy} 分`
                          : "—"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                      发音清晰
                    </p>
                    <div className="w-full bg-blue-100 dark:bg-blue-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            phonicsDiagnostics.dimensions.accuracy !== null
                              ? Math.min(100, phonicsDiagnostics.dimensions.accuracy)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-emerald-300/40 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold whitespace-nowrap">
                      <span>流利度</span>
                      <span className="text-sm font-black font-mono">
                        {phonicsDiagnostics.dimensions.fluency !== null
                          ? `${phonicsDiagnostics.dimensions.fluency} 分`
                          : "—"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                      朗读流畅
                    </p>
                    <div className="w-full bg-emerald-100 dark:bg-emerald-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            phonicsDiagnostics.dimensions.fluency !== null
                              ? Math.min(100, phonicsDiagnostics.dimensions.fluency)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-[#D3E4DE] shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-ink font-bold whitespace-nowrap">
                      <span>完整度</span>
                      <span className="text-sm font-black font-mono">
                        {phonicsDiagnostics.dimensions.completeness !== null
                          ? `${phonicsDiagnostics.dimensions.completeness} 分`
                          : "—"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                      无漏词少字
                    </p>
                    <div className="w-full bg-[#E7F2EF] dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            phonicsDiagnostics.dimensions.completeness !== null
                              ? Math.min(100, phonicsDiagnostics.dimensions.completeness)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-black/30 border border-pink-300/40 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-pink-700 dark:text-pink-300 font-bold whitespace-nowrap">
                      <span>语调</span>
                      <span className="text-sm font-black font-mono">
                        {phonicsDiagnostics.dimensions.prosody !== null
                          ? `${phonicsDiagnostics.dimensions.prosody} 分`
                          : "—"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                      语调自然
                    </p>
                    <div className="w-full bg-pink-100 dark:bg-pink-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-pink-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            phonicsDiagnostics.dimensions.prosody !== null
                              ? Math.min(100, phonicsDiagnostics.dimensions.prosody)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 待攻克薄弱音标 */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="flex items-center gap-1.5 text-ink shrink-0 whitespace-nowrap">
                      <Flame className="size-3.5 text-primary shrink-0" />
                      <span>重点待练音素</span>
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground shrink-0 whitespace-nowrap">
                      点标签去练
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs bg-white/90 dark:bg-slate-900 border-[#D3E4DE] hover:border-primary text-foreground hover:bg-[#E7F2EF]"
                            title={`${wp.name} · ${wp.tip}（点击前往音素详情）`}
                          >
                            <span className="px-1.5 py-0.5 rounded-md font-mono text-xs font-black bg-[#E7F2EF] text-[#0A5E5D]">
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
        </div>

        {/* 页脚 */}
        <DesktopFooter />
      </main>



      
    </div>
  );
};
