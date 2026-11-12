import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { Star, Volume2, Mic, Check } from "lucide-react";
import dayjs from "dayjs";
import { AppSettingsProviderContext } from "@renderer/context";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopFooter } from "./desktop-footer";
import { useUserStars } from "@renderer/lib/desktop-data";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { usePronunciationAssessments } from "@renderer/hooks";

interface AnalyzedPhonemeWord {
  word: string;
  hasError: boolean;
  errorPhoneme?: string;
  correctionHint?: string;
}

export const DesktopPronunciation: React.FC = () => {
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const stars = useUserStars();
  const { sentence: currentSentence, nextSentence } = useDailySentence();
  const { createAssessment } = usePronunciationAssessments();

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

  // 练习句与音标：按 word-ipa.json 口径（词库外单词跳过、不显示在音标行）
  const sentenceIpa = useMemo(() => {
    if (!currentSentence?.text) return "";
    const words = currentSentence.text.match(/[A-Za-z][A-Za-z']*/g) || [];
    const ipas: string[] = [];
    for (const w of words) {
      const lower = w.toLowerCase();
      const ipa = wordIpaMap[lower];
      if (ipa) {
        ipas.push(ipa);
      }
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

  // 录音器
  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
  } = useAudioRecorder();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);

  // 评测结果状态
  const [lastResult, setLastResult] = useState<{
    score: number;
    starsCount: number; // 1, 2, 3
    analyzedWords: AnalyzedPhonemeWord[];
  } | null>(null);

  // 提交录音评测
  useEffect(() => {
    if (!recordingBlob || isSubmitting) return;

    let mounted = true;
    setIsSubmitting(true);

    const blobUrl = URL.createObjectURL(recordingBlob);
    const rec: any = {
      id: "rec_" + Date.now(),
      language: learningLanguage || "en-US",
      referenceText: currentSentence.text,
      src: blobUrl,
      duration: 3000,
      _rawBlob: recordingBlob,
      blob: recordingBlob,
    };

    createAssessment({
      language: learningLanguage || "en-US",
      reference: currentSentence.text,
      recording: rec,
      archiveContext: {
        source: "quote",
        contextRef: `${currentSentence.id || "quote"}#${dayjs().format("YYYY-MM-DD")}`,
      },
    })
      .then((created: any) => {
        if (!mounted || !created) return;

        recordPracticeDone();

        // 真实得分（M4：不设 || 85 兜底，真实为 0 时真实展示 0）
        const score = typeof created.pronunciationScore === "number" ? Math.round(created.pronunciationScore) : 0;

        // 逐音素与星级分析（M5：按错音数计数，0 错音 3 星、1 错音 2 星、≥2 错音 1 星）
        const detailWords = created.result?.words || [];
        const words = currentSentence.text.match(/[A-Za-z][A-Za-z']*/g) || [];

        let totalErrors = 0;
        const analyzed: AnalyzedPhonemeWord[] = words.map((w, idx) => {
          const detail = detailWords[idx];
          if (detail && Array.isArray(detail.phonemes)) {
            const wrongPhonemes = detail.phonemes.filter((p: any) => {
              const sc = p.accuracyScore ?? p.pronunciationAssessment?.accuracyScore ?? 100;
              return sc < 75;
            });
            totalErrors += wrongPhonemes.length;
            if (wrongPhonemes.length > 0) {
              const firstWrong = wrongPhonemes[0];
              return {
                word: w,
                hasError: true,
                errorPhoneme: firstWrong.phoneme,
                correctionHint: `/${firstWrong.phoneme}/ → 纠正口型`,
              };
            }
          }
          return { word: w, hasError: false };
        });

        const starRating = totalErrors === 0 ? 3 : totalErrors === 1 ? 2 : 1;

        setLastResult({
          score,
          starsCount: starRating,
          analyzedWords: analyzed,
        });
      })
      .catch((err) => {
        console.warn("Pronunciation assessment error:", err);
      })
      .finally(() => {
        if (mounted) setIsSubmitting(false);
      });

    return () => {
      mounted = false;
    };
  }, [recordingBlob]);

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

  // 换题
  const handleNext = () => {
    setLastResult(null);
    nextSentence();
  };

  const handleRetry = () => {
    setLastResult(null);
  };

  // 今日目标环形进度 (周长 188.5)
  const goalFraction = Math.min(1, todayPracticeCount / 10);
  const dashOffset = 188.5 * (1 - goalFraction);
  const goalPct = Math.round(goalFraction * 100);

  // 波形假柱（录音时激活波浪动画）
  const waveBars = [28, 42, 60, 35, 52, 78, 44, 30, 58, 70, 38, 48, 84, 62, 40, 55, 72, 46, 34, 66, 80, 50, 36, 58, 74, 42, 60, 88, 54, 38, 64, 76, 44, 52, 68, 40, 58, 82, 48, 36, 62, 70, 44, 56, 74, 40];

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
          {/* 左栏：练习卡 */}
          <div className="sb-col-mid">
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
                    const isStrong = isRecording ? i % 2 === 0 : h > 70;
                    const liveHeight = isRecording ? Math.min(100, h * 1.2) : h;
                    return (
                      <i
                        key={i}
                        style={{ height: `${liveHeight}%` }}
                        className={isStrong ? "strong" : ""}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 大圆录音钮：按住说话 */}
              <div
                className={`sb-record ${isRecording ? "recording" : ""}`}
                onMouseDown={() => startRecording()}
                onMouseUp={() => stopRecording()}
                onTouchStart={() => startRecording()}
                onTouchEnd={() => stopRecording()}
              >
                <button
                  type="button"
                  className="btn"
                  title="按住录音，松开评测"
                >
                  <Mic className="size-8 text-white stroke-[2.2]" />
                </button>
                <span>
                  {isSubmitting
                    ? "正在评测中…"
                    : isRecording
                    ? "松开结束评测"
                    : "按住说话"}
                </span>
              </div>
            </div>
          </div>

          {/* 右栏 400px：今日目标 + 评分卡 */}
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

              {/* 评分卡 */}
              {lastResult ? (
                <div className="sb-card sb-score">
                  <div className="stars-row">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`size-6.5 ${
                          s <= lastResult.starsCount
                            ? "fill-sun-orange text-sun-orange"
                            : "text-[#E5D5B8]"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="num">{lastResult.score}</div>
                  <div className="num-label">综合得分</div>
                  <div className="divider" />
                  <div className="ph-label">逐音素分析</div>
                  <div className="sb-ph-row">
                    {lastResult.analyzedWords.map((item, idx) => (
                      <div key={idx} className="sb-ph">
                        <div className="word">
                          {item.hasError ? (
                            <>
                              <span className="bad">{item.word}</span>
                              <span className="red-dot" />
                            </>
                          ) : (
                            <span>{item.word}</span>
                          )}
                        </div>
                        <div className="mark">
                          {item.hasError ? (
                            <span className="fix">{item.correctionHint || "纠偏"}</span>
                          ) : (
                            <span className="ok">
                              <Check className="size-3 text-white stroke-[3.4]" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="actions">
                    <button className="sb-btn-ghost" onClick={handleRetry}>
                      再练一次
                    </button>
                    <button className="sb-btn-solid" onClick={handleNext}>
                      下一个
                    </button>
                  </div>
                </div>
              ) : (
                <div className="sb-card sb-score">
                  <div className="stars-row">
                    {[1, 2, 3].map((s) => (
                      <Star key={s} className="size-6.5 text-[#E5D5B8]" />
                    ))}
                  </div>
                  <div className="num text-warm-muted">—</div>
                  <div className="num-label">准备就绪</div>
                  <div className="divider" />
                  <p className="text-sm text-warm-muted py-4">
                    点击左侧按住说话按钮完成跟读，查看逐音素分析与星级打分！
                  </p>
                  <div className="actions">
                    <button className="sb-btn-solid" onClick={handleNext}>
                      下一个练习句
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <DesktopFooter />
      </main>
    </div>
  );
};
