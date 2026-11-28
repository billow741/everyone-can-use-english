import React, { useEffect, useState, useRef, useMemo, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { AppSettingsProviderContext } from "@renderer/context";
import { usePronunciationAssessments } from "@renderer/hooks";
import { Button, toast } from "@renderer/components/ui";
import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  MicIcon,
  SquareIcon,
  Volume2Icon,
  StarIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  ChevronLeftIcon,
  EyeIcon,
  EyeOffIcon,
  AwardIcon,
  VolumeXIcon,
  KeyboardIcon,
  BookOpenIcon,
  HelpCircleIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import {
  getDialogueLesson,
  saveDialogueLessonProgress,
  getDialogueProgress,
  DialogueLesson,
  DialogueLine,
  DialogueVariant,
} from "@renderer/lib/dialogue-service";
import StreakBar from "@renderer/components/streak-bar";
import { incDialogueClear } from "@renderer/lib/clear-counts";
import { speakGanganPrompt, stopGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { getScopedKey } from "@renderer/lib/phoneme-cloud-sync";
import { playStandardTts, stopStandardTts } from "@renderer/lib/phonetics-coach";
import { toggleFavWord, isWordFaved } from "@renderer/lib/listening-sync";
import { DialogueReportDialog } from "./dialogue-report-dialog";
import { PitchContourOverlay } from "@renderer/components/pronunciation-assessments";

const INTRO_AUTOPLAY_BASE_KEY = "sunnybridge_dialogue_intro_autoplay_v1";

const WARMUP_STOP_WORDS = new Set([
  "your", "that", "this", "with", "what", "when", "where", "which", "there", "their",
  "they", "them", "then", "than", "have", "from", "will", "would", "could", "should",
  "about", "some", "very", "just", "like", "here", "into", "only", "also", "been",
  "were", "does", "didn", "isn", "aren", "don", "cant", "wont", "yeah", "okay",
  "well", "much", "many", "more", "most", "going", "want", "need", "know", "think",
  "make", "take", "come", "look", "good", "nice", "fine", "really", "right", "sure",
  "please", "thank", "thanks", "hello", "sorry", "maybe", "always", "never", "still",
  "already", "again", "other", "another", "these", "those", "each", "every", "both",
  "such", "even", "back", "over", "down", "away", "after", "before", "around",
  "through", "between", "under", "above", "near", "next", "last", "first", "second",
  "three", "four", "five", "six", "seven", "eight", "nine", "ten",
]);

interface LineWithOptionalKeywords extends DialogueLine {
  keywords?: Array<string | { word?: string }>;
  keyWords?: Array<string | { word?: string }>;
}

// 辅助：解析 mixed 行方括号中的情景字幕与正文
function parseMixedLine(text: string, translation: string) {
  const textMatch = text.match(/^\[(.*?)\]\s*(.*)$/);
  const transMatch = translation.match(/^\[(.*?)\]\s*(.*)$/);
  return {
    sceneNoteEn: textMatch ? textMatch[1] : null,
    spokenTextEn: textMatch ? textMatch[2] : text,
    sceneNoteZh: transMatch ? transMatch[1] : null,
    spokenTextZh: transMatch ? transMatch[2] : translation,
  };
}

// 生词预热：优先取行内已有关键词，没有则取行文本中长度 ≥4 的实词去重取前 5
function extractWarmupWords(lesson: DialogueLesson): string[] {
  const fromKeywords: string[] = [];
  const seenKw = new Set<string>();

  for (const rawLine of lesson.lines) {
    const line = rawLine as LineWithOptionalKeywords;
    const candidates = line.keywords || line.keyWords;
    if (Array.isArray(candidates)) {
      for (const item of candidates) {
        const w = (typeof item === "string" ? item : item?.word || "").trim();
        const lower = w.toLowerCase();
        if (lower && !seenKw.has(lower)) {
          seenKw.add(lower);
          fromKeywords.push(w);
        }
      }
    }
  }
  if (fromKeywords.length >= 4) {
    return fromKeywords.slice(0, 6);
  }

  const contentWords: string[] = [...fromKeywords];
  const seenContent = new Set<string>(seenKw);
  const fallbackWords: string[] = [];
  const seenFallback = new Set<string>(seenKw);

  for (const line of lesson.lines) {
    if (line.lineType === "narration") continue;
    const { spokenTextEn } = parseMixedLine(line.text, line.translation);
    const matches = spokenTextEn.match(/[A-Za-z]+/g) || [];
    for (const raw of matches) {
      const lower = raw.toLowerCase();
      if (lower.length < 4) continue;
      if (!seenFallback.has(lower)) {
        seenFallback.add(lower);
        fallbackWords.push(lower);
      }
      if (!WARMUP_STOP_WORDS.has(lower) && !seenContent.has(lower)) {
        seenContent.add(lower);
        contentWords.push(lower);
      }
    }
  }

  for (const fw of fallbackWords) {
    if (contentWords.length >= 5) break;
    if (!seenContent.has(fw)) {
      seenContent.add(fw);
      contentWords.push(fw);
    }
  }

  return contentWords.slice(0, 5);
}

interface ListenQuizQuestion {
  id: string;
  prompt: string;
  quote: string;
  options: string[];
  correctIndex: number;
}

// 听对话播完后的 1–2 道理解小检验（纯课内即时练习，不计分、不入档）
function generateListenQuiz(lesson: DialogueLesson): ListenQuizQuestion[] {
  const spoken = lesson.lines
    .filter((l) => l.lineType !== "narration")
    .map((l) => {
      const parsed = parseMixedLine(l.text, l.translation);
      return {
        seq: l.seq,
        speaker: l.speaker,
        en: parsed.spokenTextEn.trim(),
        zh: parsed.spokenTextZh.trim(),
      };
    })
    .filter((l) => l.en.length > 0);

  if (spoken.length === 0) return [];

  const questions: ListenQuizQuestion[] = [];

  // 题 1：选一句台词问「这句话是谁说的？」（优先有实际内容的 A 行）
  const q1Line =
    spoken.find((l) => l.speaker === "A" && l.en.split(/\s+/).length >= 3) ||
    spoken.find((l) => l.speaker === "A") ||
    spoken[0];

  questions.push({
    id: `${lesson.lessonId}-who-${q1Line.seq}`,
    prompt: "下面这句话是谁说的？",
    quote: q1Line.en,
    options: ["角色 A（敢敢）", "角色 B（我）"],
    correctIndex: q1Line.speaker === "A" ? 0 : 1,
  });

  // 题 2：选另一句问中文意思，干扰项来自本课其他行译文
  const q2Line =
    spoken.find((l) => l.seq !== q1Line.seq && l.speaker === "B" && l.zh.length >= 2) ||
    spoken.find((l) => l.seq !== q1Line.seq && l.zh.length >= 2);

  if (q2Line) {
    const distractors: string[] = [];
    const seenZh = new Set<string>([q2Line.zh]);
    for (const candidate of spoken) {
      if (candidate.seq === q2Line.seq || !candidate.zh) continue;
      if (!seenZh.has(candidate.zh)) {
        seenZh.add(candidate.zh);
        distractors.push(candidate.zh);
        if (distractors.length >= 2) break;
      }
    }

    if (distractors.length >= 1) {
      const total = distractors.length + 1;
      const correctIdx = (q2Line.seq + lesson.lessonId.length) % total;
      const options = [...distractors];
      options.splice(correctIdx, 0, q2Line.zh);
      questions.push({
        id: `${lesson.lessonId}-meaning-${q2Line.seq}`,
        prompt: "下面这句话是什么意思？",
        quote: q2Line.en,
        options,
        correctIndex: correctIdx,
      });
    }
  }

  return questions;
}

export default function DialogueShow() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const { createAssessment } = usePronunciationAssessments();

  const [lesson, setLesson] = useState<DialogueLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 步骤控制：1 情景导入 → 2 听对话 → 3 逐句精学 → 4 角色扮演 → 5 小结
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxStep, setMaxStep] = useState<number>(1);

  // 每行最好分：{ [seq]: score }
  const [bestScores, setBestScores] = useState<Record<number, number>>({});

  // 精准评测报告弹窗状态
  const [reportDialogState, setReportDialogState] = useState<{
    open: boolean;
    assessment: PronunciationAssessmentType | null;
    recordingUrl: string | null;
    teacherAudioSrc: string;
    referenceText: string;
  }>({
    open: false,
    assessment: null,
    recordingUrl: null,
    teacherAudioSrc: "",
    referenceText: "",
  });

  const handleOpenReport = (
    assessment: PronunciationAssessmentType,
    recordingUrl: string,
    teacherAudioSrc?: string,
    referenceText?: string
  ) => {
    stopActiveAudio();
    setReportDialogState({
      open: true,
      assessment,
      recordingUrl,
      teacherAudioSrc: teacherAudioSrc || "",
      referenceText: referenceText || assessment.referenceText || "",
    });
  };

  // 全局播放实例管理
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  const stopActiveAudio = () => {
    if (audioInstanceRef.current) {
      try {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
      } catch {}
      audioInstanceRef.current = null;
    }
    stopGanganPrompt();
    stopStandardTts();
  };

  const playAudioFile = (filename: string): Promise<void> => {
    stopActiveAudio();
    return new Promise((resolve) => {
      try {
        const audio = new Audio(`/assets/tmm-dialogues/audio/${filename}`);
        audioInstanceRef.current = audio;
        audio.onended = () => {
          if (audioInstanceRef.current === audio) {
            audioInstanceRef.current = null;
          }
          resolve();
        };
        audio.onerror = () => {
          if (audioInstanceRef.current === audio) {
            audioInstanceRef.current = null;
          }
          resolve();
        };
        audio.play().catch(() => {
          if (audioInstanceRef.current === audio) {
            audioInstanceRef.current = null;
          }
          resolve();
        });
      } catch {
        resolve();
      }
    });
  };

  // 组件卸载时停止音频
  useEffect(() => {
    return () => {
      stopActiveAudio();
    };
  }, []);

  // 加载课包与历史最高分
  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    getDialogueLesson(lessonId)
      .then((data) => {
        if (!data) {
          setError("未找到该课程数据");
          return;
        }
        setLesson(data);
        const history = getDialogueProgress()[lessonId];
        if (history?.bestScores) {
          setBestScores(history.bestScores);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "加载课程失败");
        setLoading(false);
      });
  }, [lessonId]);

  const [rolePlayInitialSeq, setRolePlayInitialSeq] = useState<number | null>(null);

  // 步骤切换与解锁
  const goToStep = (step: number, options?: { keepRolePlaySeq?: boolean }) => {
    stopActiveAudio();
    if (!options?.keepRolePlaySeq) {
      setRolePlayInitialSeq(null);
    }
    setStreakRetryHint(false);
    setCurrentStep(step);
    setMaxStep((prev) => Math.max(prev, step));
  };

  const jumpToRolePlayLine = (seq: number) => {
    setRolePlayInitialSeq(seq);
    goToStep(4, { keepRolePlaySeq: true });
  };

  // P0 连击（纯荣誉，不参与任何计分）与投降标记（投降后本课不计奖牌）
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [pausedStreak, setPausedStreak] = useState(0);
  const [streakRetryHint, setStreakRetryHint] = useState(false);
  const [assisted, setAssisted] = useState(false);

  // 记录单行最好成绩（Step 3/4 共用）：≥60 连击 +1；<60 计数口径仍归零，但呈现上保留连击数只提示「这一句再练一次」
  const recordBestScore = (seq: number, score: number) => {
    setBestScores((prev) => ({
      ...prev,
      [seq]: Math.max(prev[seq] || 0, score),
    }));
    if (score >= 60) {
      setPausedStreak(0);
      setStreakRetryHint(false);
      setStreak((prev) => {
        const next = prev + 1;
        setMaxStreak((m) => Math.max(m, next));
        return next;
      });
    } else {
      setStreak((prev) => {
        if (prev > 0) {
          setPausedStreak(prev);
        }
        return 0;
      });
      setStreakRetryHint(true);
    }
  };

  const displayStreak = streak > 0 ? streak : pausedStreak;

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center space-y-3 bg-canvas">
        <div className="size-10 animate-spin rounded-full border-4 border-[#0F7B7A] border-t-transparent" />
        <p className="text-sm font-bold text-[#4E6B69]">正在进入课堂…</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center space-y-4 bg-canvas p-6 text-center">
        <p className="text-base font-bold text-rose-700">{error || "课程不存在"}</p>
        <Button onClick={() => navigate("/dialogues")} className="rounded-xl bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-bold">
          返回课程列表
        </Button>
      </div>
    );
  }

  const partLabel =
    lesson.parts > 1
      ? lesson.part === 1
        ? "上篇"
        : lesson.part === 2
        ? "下篇"
        : `第${lesson.part}部分`
      : null;

  return (
    <div className="min-h-full w-full bg-canvas pb-44 min-[1280px]:pb-12 text-[#123B3C]">
      {/* 顶部导航与步骤条 */}
      <div className="sticky top-0 z-20 border-b border-[#D3E4DE] bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopActiveAudio();
              navigate("/dialogues");
            }}
            className="flex shrink-0 items-center gap-1 font-bold text-[#4E6B69] hover:bg-[#E7F2EF] hover:text-[#123B3C]"
          >
            <ArrowLeftIcon className="size-4" />
            <span>返回列表</span>
          </Button>

          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base sm:text-xl font-black text-[#123B3C]">
              {lesson.sceneZh}
              {partLabel ? `（${partLabel}）` : ""}
            </h1>
            <span className="shrink-0 whitespace-nowrap rounded-md bg-[#E7F2EF] px-2 py-0.5 text-[11px] font-bold text-[#123B3C] border border-[#D3E4DE]">
              {lesson.theme}
            </span>
          </div>
        </div>

        {/* 五步闭环指示器（可回退步骤，不可跳未完成步骤） */}
        <div className="mx-auto max-w-4xl px-4 py-2 sm:px-6">
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {[
              { step: 1, name: "1 情景导入" },
              { step: 2, name: "2 听对话" },
              { step: 3, name: "3 逐句精学" },
              { step: 4, name: "4 角色扮演" },
              { step: 5, name: "5 小结" },
            ].map(({ step, name }) => {
              const isCurrent = currentStep === step;
              const isUnlocked = step <= maxStep;
              const isCompleted = step < maxStep && !isCurrent;
              return (
                <button
                  key={step}
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && goToStep(step)}
                  className={`flex items-center justify-center gap-1 rounded-xl py-1.5 px-1 text-center transition-all ${
                    isCurrent
                      ? "bg-[#0F7B7A] text-white font-black shadow-xs"
                      : isCompleted
                      ? "bg-[#E7F2EF] hover:bg-[#D3E4DE]/70 text-[#0A5E5D] border border-[#D3E4DE] font-bold cursor-pointer"
                      : isUnlocked
                      ? "bg-[#E7F2EF] hover:bg-[#D3E4DE]/70 text-[#0F7B7A] border border-[#D3E4DE] font-bold cursor-pointer"
                      : "bg-[#F3FAF8] text-[#4E6B69]/70 border border-[#D3E4DE]/60 font-medium cursor-not-allowed"
                  }`}
                >
                  {isCompleted && (
                    <span aria-hidden="true" className="text-[11px] leading-none shrink-0">
                      ✓
                    </span>
                  )}
                  <span className="text-[11px] sm:text-sm truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 主体步骤内容 */}
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        {currentStep === 1 && (
          <Step1Intro
            lesson={lesson}
            onNext={() => goToStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2Listen
            lesson={lesson}
            playAudioFile={playAudioFile}
            stopActiveAudio={stopActiveAudio}
            onNext={() => goToStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3Study
            lesson={lesson}
            playAudioFile={playAudioFile}
            stopActiveAudio={stopActiveAudio}
            bestScores={bestScores}
            onRecordScore={recordBestScore}
            onNext={() => goToStep(4)}
            onJumpToRolePlay={jumpToRolePlayLine}
            onOpenReport={handleOpenReport}
            streak={displayStreak}
            streakRetryHint={streakRetryHint}
          />
        )}

        {currentStep === 4 && (
          <Step4RolePlay
            lesson={lesson}
            initialSeq={rolePlayInitialSeq}
            playAudioFile={playAudioFile}
            stopActiveAudio={stopActiveAudio}
            bestScores={bestScores}
            onRecordScore={recordBestScore}
            onNext={() => goToStep(5)}
            onOpenReport={handleOpenReport}
            streak={displayStreak}
            streakRetryHint={streakRetryHint}
            onSurrender={() => setAssisted(true)}
          />
        )}

        {currentStep === 5 && (
          <Step5Summary
            lesson={lesson}
            bestScores={bestScores}
            maxStreak={maxStreak}
            assisted={assisted}
            onReplay={() => goToStep(1)}
            onContinueRolePlay={() => goToStep(4)}
            onBack={() => navigate("/dialogues")}
          />
        )}
      </div>

      {/* 精准评测报告弹窗 */}
      <DialogueReportDialog
        open={reportDialogState.open}
        onOpenChange={(open) =>
          setReportDialogState((prev) => ({ ...prev, open }))
        }
        assessment={reportDialogState.assessment}
        recordingUrl={reportDialogState.recordingUrl}
        teacherAudioSrc={reportDialogState.teacherAudioSrc}
        referenceText={reportDialogState.referenceText}
      />
    </div>
  );
}

// ==========================================
// 录音与发音评测组件 (统一复用现有评测链路)
// ==========================================
interface AssessmentResultWidgetProps {
  referenceText: string;
  teacherAudioSrc?: string;
  onAssessmentCompleted?: (
    score: number,
    assessment?: PronunciationAssessmentType,
    recordingUrl?: string
  ) => void;
  bestScore?: number;
  passThreshold?: number; // 及格分，默认 60
  initialAssessment?: PronunciationAssessmentType | null;
  initialRecordedUrl?: string | null;
  onOpenReport?: (
    assessment: PronunciationAssessmentType,
    recordingUrl: string,
    teacherAudioSrc?: string,
    referenceText?: string
  ) => void;
  archiveContext?: {
    source: "dialogue";
    contextRef: string;
  };
  onQuotaReached?: () => void;
  mimicOnly?: boolean;
  onMimicRecorded?: (url: string) => void;
}

function DialogueVoiceRecorder({
  referenceText,
  teacherAudioSrc,
  onAssessmentCompleted,
  bestScore,
  passThreshold = 60,
  initialAssessment = null,
  initialRecordedUrl = null,
  onOpenReport,
  archiveContext,
  onQuotaReached,
  mimicOnly = false,
  onMimicRecorded,
}: AssessmentResultWidgetProps) {
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const { createAssessment } = usePronunciationAssessments();

  const [recordedUrl, setRecordedUrl] = useState<string | null>(initialRecordedUrl || null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [isPlayingTeacher, setIsPlayingTeacher] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(
    initialAssessment?.pronunciationScore ?? null
  );
  // 评测未出分时的诚实失败提示（不回落假分）
  const [assessmentFailed, setAssessmentFailed] = useState(false);
  const [latestAssessment, setLatestAssessment] = useState<PronunciationAssessmentType | null>(
    initialAssessment || null
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const compareTokenRef = useRef(0);
  const effectiveRecordingUrl =
    recordedUrl || (latestAssessment as any)?.recordingSrc || "";

  const stopLocalPlayback = () => {
    compareTokenRef.current += 1;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    setIsPlayingRecorded(false);
    setIsPlayingTeacher(false);
    setIsComparing(false);
  };

  useEffect(() => {
    return () => {
      stopLocalPlayback();
    };
  }, []);

  const recorder = useAudioRecorder(
    { noiseSuppression: true, echoCancellation: true },
    (err) => console.warn("Dialogue Recorder Error:", err)
  );

  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
  } = recorder;

  // 录音结束：跟读对比模式仅保存本地回放 URL，不调评测、不出分、不入档；评测模式自动触发评测
  useEffect(() => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    setRecordedUrl(url);

    if (mimicOnly) {
      onMimicRecorded?.(url);
      return;
    }

    const runAssess = async () => {
      setIsSubmitting(true);
      setAssessmentFailed(false);
      try {
        let rec: any = null;
        try {
          rec = await EnjoyApp?.recordings?.create({
            language: learningLanguage || "en-US",
            referenceText,
            src: url,
            blob: {
              type: recordingBlob.type || "audio/webm",
            },
          });
        } catch (dbErr) {
          console.warn("recordings.create fallback:", dbErr);
        }

        if (!rec) {
          rec = {
            id: `rec-${Date.now()}`,
            language: learningLanguage || "en-US",
            referenceText,
            src: url,
            duration: recordingTime * 1000 || 3000,
          };
        }
        rec._rawBlob = recordingBlob;
        rec.src = url;

        const created = await createAssessment({
          language: learningLanguage || "en-US",
          reference: referenceText,
          recording: rec,
          archiveContext,
        });

        if (typeof created?.pronunciationScore === "number") {
          const score = created.pronunciationScore;
          setLatestScore(score);
          setLatestAssessment(created);
          onAssessmentCompleted?.(score, created, url);
        } else {
          // 评测没有返回真实分数：不编造分数、不算过关，只提示重录
          console.warn(
            "Pronunciation assessment returned no numeric score:",
            created
          );
          setAssessmentFailed(true);
        }
      } catch (err: any) {
        if (err?.code === "measurement_quota") {
          toast.success(
            "今日深度评测次数已用完，语调对比与词级反馈仍可继续练习。"
          );
          onQuotaReached?.();
          return;
        }
        console.error("Pronunciation assessment failed:", err);
        setAssessmentFailed(true);
      } finally {
        setIsSubmitting(false);
      }
    };

    runAssess();
  }, [recordingBlob]);

  const playUrlOnce = (src: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        if (audioRef.current === audio) audioRef.current = null;
        resolve();
      };
      audio.play().catch(() => {
        if (audioRef.current === audio) audioRef.current = null;
        resolve();
      });
    });
  };

  const handlePlayMyRecording = () => {
    if (!recordedUrl) return;
    if (isPlayingRecorded) {
      stopLocalPlayback();
      return;
    }
    stopLocalPlayback();
    setIsPlayingRecorded(true);
    playUrlOnce(recordedUrl).then(() => setIsPlayingRecorded(false));
  };

  const handlePlayTeacher = () => {
    if (!teacherAudioSrc) return;
    if (isPlayingTeacher) {
      stopLocalPlayback();
      return;
    }
    stopLocalPlayback();
    setIsPlayingTeacher(true);
    playUrlOnce(teacherAudioSrc).then(() => setIsPlayingTeacher(false));
  };

  const handleComparePlayback = async () => {
    if (!teacherAudioSrc || !recordedUrl) return;
    if (isComparing) {
      stopLocalPlayback();
      return;
    }
    stopLocalPlayback();
    const token = ++compareTokenRef.current;
    setIsComparing(true);
    setIsPlayingTeacher(true);
    await playUrlOnce(teacherAudioSrc);
    if (compareTokenRef.current !== token) return;
    setIsPlayingTeacher(false);
    await new Promise((r) => setTimeout(r, 320));
    if (compareTokenRef.current !== token) return;
    setIsPlayingRecorded(true);
    await playUrlOnce(recordedUrl);
    if (compareTokenRef.current !== token) return;
    setIsPlayingRecorded(false);
    setIsComparing(false);
  };

  const handleStartRecord = () => {
    stopLocalPlayback();
    startRecording();
  };

  if (mimicOnly) {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        {teacherAudioSrc && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePlayTeacher}
            disabled={isRecording}
            className="rounded-2xl border-[#D3E4DE] bg-white text-[#123B3C] font-bold hover:bg-[#E7F2EF] flex items-center gap-1.5 h-10 px-3.5"
          >
            <Volume2Icon className={`size-4 text-[#0F7B7A] ${isPlayingTeacher ? "animate-pulse" : ""}`} />
            <span>{isPlayingTeacher ? "停止原声" : "听原声"}</span>
          </Button>
        )}

        {!isRecording ? (
          <Button
            type="button"
            size="sm"
            onClick={handleStartRecord}
            className="rounded-2xl bg-[#0F7B7A] hover:bg-[#0A5E5D] font-black text-white shadow-sm flex items-center gap-1.5 px-4 h-10"
          >
            <MicIcon className="size-4" />
            <span>{recordedUrl ? "重新模仿" : "录音模仿"}</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={stopRecording}
            className="rounded-2xl bg-rose-500 hover:bg-rose-600 font-black text-white shadow-sm flex items-center gap-1.5 px-4 h-10 animate-pulse"
          >
            <SquareIcon className="size-4 fill-white" />
            <span>完成录音 ({recordingTime}s)</span>
          </Button>
        )}

        {recordedUrl && !isRecording && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePlayMyRecording}
              className="rounded-2xl border-[#D3E4DE] bg-white text-[#123B3C] font-bold hover:bg-[#E7F2EF] flex items-center gap-1.5 h-10 px-3.5"
            >
              <Volume2Icon className={`size-4 text-[#0F7B7A] ${isPlayingRecorded ? "animate-pulse" : ""}`} />
              <span>{isPlayingRecorded ? "暂停回放" : "听我的录音"}</span>
            </Button>

            {teacherAudioSrc && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleComparePlayback}
                className="rounded-2xl border-[#0F7B7A]/40 bg-[#E7F2EF] text-[#0A5E5D] font-black hover:bg-[#D3E4DE]/60 flex items-center gap-1.5 h-10 px-3.5"
              >
                <PlayIcon className="size-3.5 text-[#0F7B7A]" />
                <span>{isComparing ? "停止对比" : "原声 → 我的对比"}</span>
              </Button>
            )}

            <span className="inline-flex items-center gap-1 rounded-xl border border-[#0F7B7A]/30 bg-[#E7F2EF] px-2.5 py-1 text-xs font-black text-[#0A5E5D]">
              <CheckCircle2Icon className="size-3.5 text-[#0F7B7A]" />
              <span>已跟读对比</span>
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* 录音主按钮 */}
        {!isRecording ? (
          <Button
            size="sm"
            onClick={handleStartRecord}
            disabled={isSubmitting}
            className="rounded-2xl bg-[#F2A93B] hover:bg-[#D69128] font-black text-[#123B3C] shadow-sm flex items-center gap-1.5 px-4 h-10"
          >
            <MicIcon className="size-4" />
            <span>{latestScore !== null ? "重新跟读" : "开始跟读评测"}</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={stopRecording}
            className="rounded-2xl bg-rose-500 hover:bg-rose-600 font-black text-white shadow-sm flex items-center gap-1.5 px-4 h-10 animate-pulse"
          >
            <SquareIcon className="size-4 fill-white" />
            <span>完成录音 ({recordingTime}s)</span>
          </Button>
        )}

        {/* 播放自己录音 */}
        {recordedUrl && !isRecording && (
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayMyRecording}
            className="rounded-2xl border-[#D3E4DE] bg-[#F3FAF8] text-[#123B3C] font-bold hover:bg-[#E7F2EF] flex items-center gap-1.5 h-10 px-3"
          >
            <Volume2Icon className="size-4 text-[#0F7B7A]" />
            <span>{isPlayingRecorded ? "暂停回放" : "听我的录音"}</span>
          </Button>
        )}

        {/* 评测中状态 */}
        {isSubmitting && (
          <div className="flex items-center gap-2 text-xs font-black text-[#0A5E5D] bg-[#E7F2EF] px-3 py-1.5 rounded-xl border border-[#D3E4DE]">
            <div className="size-3.5 animate-spin rounded-full border-2 border-[#0F7B7A] border-t-transparent" />
            <span>AI 正在评测…</span>
          </div>
        )}

        {/* 评测未出分：诚实提示，不显示假分 */}
        {assessmentFailed && !isSubmitting && (
          <div className="flex items-center gap-2 text-xs font-black text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
            <span>这次评测没能出分，请重新跟读一次。</span>
          </div>
        )}

        {/* 得分与分档完成态展示（≥60 读完 ✓；≥75 发音达标；60–74 不显示通过/合格；<60 这一句再练一次） */}
        {latestScore !== null && !isSubmitting && (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs border ${
                latestScore >= 75
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : latestScore >= passThreshold
                  ? "bg-[#E7F2EF] text-[#0A5E5D] border-[#0F7B7A]/30"
                  : "bg-amber-50 text-amber-900 border-amber-300"
              }`}
            >
              {latestScore >= passThreshold ? (
                <CheckCircle2Icon
                  className={`size-4 ${latestScore >= 75 ? "text-emerald-600" : "text-[#0F7B7A]"}`}
                />
              ) : null}
              <span>本次得分：{latestScore} 分</span>
              {latestScore >= passThreshold ? (
                <span className="ml-1 text-[11px] font-bold">读完 ✓</span>
              ) : (
                <span className="ml-1 text-[11px] font-bold">这一句再练一次</span>
              )}
            </div>

            {latestScore >= 75 && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-800">
                <AwardIcon className="size-3.5 text-emerald-600" />
                <span>发音达标</span>
              </span>
            )}

            {/* 新增按钮：精准评测报告 */}
            {latestAssessment && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (onOpenReport && latestAssessment) {
                    onOpenReport(
                      latestAssessment,
                      effectiveRecordingUrl,
                      teacherAudioSrc,
                      referenceText
                    );
                  }
                }}
                className="rounded-2xl border-[#D3E4DE] bg-[#F3FAF8] text-[#123B3C] font-bold hover:bg-[#E7F2EF] flex items-center gap-1.5 h-10 px-3 cursor-pointer shadow-2xs"
              >
                <SparklesIcon className="size-4 text-[#0F7B7A]" />
                <span>精准评测报告</span>
              </Button>
            )}
          </div>
        )}

        {typeof bestScore === "number" && bestScore > 0 && (
          <span className="text-[11px] font-bold text-slate-500">
            历史最好: {bestScore}分
          </span>
        )}
      </div>

      {/* 出分后内嵌双轨语调曲线（学生录音轨 vs 该句 TMM 原声轨＋语调匹配度＋提示语） */}
      {latestScore !== null && !isSubmitting && effectiveRecordingUrl && teacherAudioSrc && (
        <div className="w-full pt-1">
          <PitchContourOverlay
            key={effectiveRecordingUrl}
            teacherAudioSrc={teacherAudioSrc}
            studentAudioSrc={effectiveRecordingUrl}
            referenceText={referenceText}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

// ==========================================
// 步骤 1：情景导入 (Context Introduction)
// ==========================================
function Step1Intro({
  lesson,
  onNext,
}: {
  lesson: DialogueLesson;
  onNext: () => void;
}) {
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const autoPlayStorageKey = useMemo(() => getScopedKey(INTRO_AUTOPLAY_BASE_KEY), []);
  const [autoPlayIntro, setAutoPlayIntro] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(getScopedKey(INTRO_AUTOPLAY_BASE_KEY)) !== "off";
    } catch {
      return true;
    }
  });
  const wordIpaMap = useWordIpa();
  const warmupWords = useMemo(() => extractWarmupWords(lesson), [lesson]);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const wordPlaybackRunIdRef = useRef(0);
  const [favedWords, setFavedWords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const w of warmupWords) {
      next[w] = isWordFaved("dialogues", lesson.lessonId, w);
    }
    setFavedWords(next);
  }, [lesson.lessonId, warmupWords]);

  // 本课全部 narration 行中文译文，没有 narration 时用第一句 A 行译文兜底
  const introText = useMemo(() => {
    const narrationLines = lesson.lines.filter((l) => l.lineType === "narration");
    if (narrationLines.length > 0) {
      return narrationLines.map((l) => l.translation).join(" ");
    }
    const firstA = lesson.lines.find((l) => l.speaker === "A");
    return firstA?.translation || lesson.sceneZh;
  }, [lesson]);

  // 播放 Xiaoxiao TTS
  const handlePlayTts = () => {
    stopStandardTts();
    setPlayingWord(null);
    setIsPlayingTts(true);
    speakGanganPrompt(introText, {
      onEnd: () => setIsPlayingTts(false),
    });
  };

  const handleToggleAutoPlay = () => {
    const next = !autoPlayIntro;
    setAutoPlayIntro(next);
    try {
      localStorage.setItem(autoPlayStorageKey, next ? "on" : "off");
    } catch {}
    if (!next && isPlayingTts) {
      stopGanganPrompt();
      setIsPlayingTts(false);
    }
  };

  const handlePlayWarmupWord = (word: string) => {
    stopGanganPrompt();
    setIsPlayingTts(false);
    stopStandardTts();
    const runId = ++wordPlaybackRunIdRef.current;
    setPlayingWord(word);
    playStandardTts(word, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onEnd: () => {
        if (wordPlaybackRunIdRef.current !== runId) return;
        setPlayingWord((cur) => (cur === word ? null : cur));
      },
    }).catch(() => {
      if (wordPlaybackRunIdRef.current !== runId) return;
      setPlayingWord((cur) => (cur === word ? null : cur));
    });
  };

  const handleToggleWarmupFav = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    const nextFaved = toggleFavWord("dialogues", lesson.lessonId, word);
    setFavedWords((prev) => ({ ...prev, [word]: nextFaved }));
    if (nextFaved) {
      toast.success(`已将 "${word}" 加入生词本`);
    } else {
      toast.info(`已将 "${word}" 移出生词本`);
    }
  };

  // 进入页面按持久化设置自动朗读一次
  useEffect(() => {
    if (autoPlayIntro) {
      handlePlayTts();
    }
    return () => {
      stopGanganPrompt();
      stopStandardTts();
    };
  }, [introText]);

  return (
    <div className="space-y-6">
      <div className="rounded-[20px] border border-[#D3E4DE] bg-white p-5 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/gangan/gangan_avatar240.png"
              alt="敢敢伴学"
              className="size-14 shrink-0 rounded-2xl border border-[#D3E4DE] bg-[#E7F2EF] p-1 object-cover shadow-2xs"
            />
            <div className="min-w-0">
              <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-black text-[#0A5E5D] bg-[#E7F2EF] px-2.5 py-0.5 rounded-full border border-[#D3E4DE]">
                第一步 · 情景导入
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#123B3C] mt-1">
                {lesson.sceneZh}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleToggleAutoPlay}
              aria-pressed={!autoPlayIntro}
              className={`shrink-0 rounded-2xl border text-xs font-bold flex items-center gap-1.5 h-10 px-3.5 transition-colors ${
                autoPlayIntro
                  ? "border-[#D3E4DE] bg-white text-[#4E6B69] hover:bg-[#F3FAF8] hover:text-[#123B3C]"
                  : "border-[#0F7B7A]/40 bg-[#E7F2EF] text-[#0A5E5D] hover:bg-[#D3E4DE]/60"
              }`}
            >
              {autoPlayIntro ? (
                <>
                  <VolumeXIcon className="size-3.5 text-[#4E6B69]" />
                  <span>关闭自动朗读</span>
                </>
              ) : (
                <>
                  <Volume2Icon className="size-3.5 text-[#0F7B7A]" />
                  <span>已关闭自动朗读</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={isPlayingTts ? () => { stopGanganPrompt(); setIsPlayingTts(false); } : handlePlayTts}
              className="shrink-0 rounded-2xl border-[#D3E4DE] text-[#123B3C] bg-[#F3FAF8] hover:bg-[#E7F2EF] font-bold flex items-center gap-1.5 h-10 px-4"
            >
              {isPlayingTts ? (
                <>
                  <VolumeXIcon className="size-4 text-[#0F7B7A] animate-pulse" />
                  <span>停止朗读</span>
                </>
              ) : (
                <>
                  <Volume2Icon className="size-4 text-[#0F7B7A]" />
                  <span>重新听介绍</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 导入文案卡片 */}
        <div className="rounded-2xl border border-[#D3E4DE] bg-[#E7F2EF] p-5 sm:p-7 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#0A5E5D]">
            <SparklesIcon className="size-4 text-[#0F7B7A]" />
            <span>情景导语</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-[#123B3C] leading-relaxed">
            {introText}
          </p>
        </div>

        {/* 本课目标（由 sceneZh + 行数生成） */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#D3E4DE] bg-[#F3FAF8] px-4 py-3">
          <TargetIcon className="size-4 shrink-0 text-[#0F7B7A]" />
          <p className="text-sm font-bold text-[#123B3C]">
            <span className="text-[#0A5E5D] font-black">本课目标：</span>
            听懂并跟读《{lesson.sceneZh}》的 {lesson.lines.length} 句对话
          </p>
        </div>

        {/* 先认几个词（生词预热：可点发音 + 可收藏生词本） */}
        {warmupWords.length > 0 && (
          <div className="space-y-2.5 rounded-2xl border border-[#D3E4DE] bg-[#F3FAF8]/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#4E6B69]">
              <span className="flex items-center gap-1.5 font-black text-[#123B3C]">
                <BookOpenIcon className="size-4 text-[#0F7B7A]" />
                <span>先认几个词</span>
              </span>
              <span className="text-[11px]">点击单词听发音 · 星标收藏进生词本</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {warmupWords.map((word) => {
                const isFaved = !!favedWords[word];
                const isPlaying = playingWord === word;
                const ipa = wordIpaMap[word.toLowerCase()];

                return (
                  <div
                    key={word}
                    className={`relative rounded-xl border transition-colors ${
                      isPlaying
                        ? "bg-[#E7F2EF] border-[#0F7B7A]"
                        : isFaved
                        ? "bg-[#F3FAF8] border-[#F2A93B]"
                        : "bg-white border-[#D3E4DE] hover:border-[#0F7B7A]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handlePlayWarmupWord(word)}
                      aria-label={`朗读生词 ${word}`}
                      className="w-full text-left p-2.5 pr-9 space-y-0.5 rounded-xl cursor-pointer"
                    >
                      <div className="flex items-center gap-1 font-black text-sm text-[#123B3C]">
                        <span className="truncate">{word}</span>
                        <Volume2Icon
                          className={`size-3.5 shrink-0 ${
                            isPlaying ? "text-[#0F7B7A] animate-pulse" : "text-[#4E6B69]"
                          }`}
                        />
                      </div>
                      {ipa ? (
                        <div className="text-[11px] font-mono text-[#0F7B7A] truncate">
                          /{ipa}/
                        </div>
                      ) : (
                        <div className="text-[11px] text-[#4E6B69]">点按听音</div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleWarmupFav(e, word)}
                      aria-pressed={isFaved}
                      aria-label={isFaved ? `取消收藏 ${word}` : `收藏 ${word} 到生词本`}
                      title={isFaved ? "已收藏至生词本（点击移除）" : "收藏到生词本"}
                      className={`absolute top-1.5 right-1.5 size-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isFaved
                          ? "bg-[#F2A93B]/20 text-[#96690A] border border-[#F2A93B]/50"
                          : "text-[#4E6B69] hover:text-[#0F7B7A] hover:bg-[#F3FAF8]"
                      }`}
                    >
                      <StarIcon
                        className={`size-3.5 ${
                          isFaved ? "fill-[#F2A93B] text-[#F2A93B]" : ""
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 底部行动按钮 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs font-bold text-[#4E6B69]">
            听完导入后，进入整篇对话听力。
          </div>
          <Button
            size="lg"
            onClick={() => {
              stopGanganPrompt();
              stopStandardTts();
              onNext();
            }}
            className="rounded-2xl bg-[#F2A93B] hover:bg-[#D69128] font-black text-[#123B3C] shadow-md hover:shadow-lg px-8 flex items-center gap-2 text-sm cursor-pointer"
          >
            <span>开始学习（听对话）</span>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 步骤 2：听对话 (Listen Full Dialogue)
// ==========================================
function Step2Listen({
  lesson,
  playAudioFile,
  stopActiveAudio,
  onNext,
}: {
  lesson: DialogueLesson;
  playAudioFile: (filename: string) => Promise<void>;
  stopActiveAudio: () => void;
  onNext: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [narrationSubtitle, setNarrationSubtitle] = useState<string | null>(null);
  const [playbackFinished, setPlaybackFinished] = useState<boolean>(false);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [replayingSeq, setReplayingSeq] = useState<number | null>(null);

  const quizQuestions = useMemo(() => generateListenQuiz(lesson), [lesson]);
  const [wrongOptionsByQ, setWrongOptionsByQ] = useState<Record<string, number[]>>({});
  const [solvedByQ, setSolvedByQ] = useState<Record<string, boolean>>({});

  const lines = lesson.lines;
  const isPlayingRef = useRef<boolean>(false);
  const playRunIdRef = useRef<number>(0);
  const timerRef = useRef<any>(null);
  const replayAudioRef = useRef<HTMLAudioElement | null>(null);
  const replayTokenRef = useRef<number>(0);
  const resumeSeqIndexRef = useRef<number | null>(null);

  const stopSingleLineReplay = () => {
    replayTokenRef.current += 1;
    resumeSeqIndexRef.current = null;
    if (replayAudioRef.current) {
      try {
        replayAudioRef.current.pause();
        replayAudioRef.current.currentTime = 0;
      } catch {}
      replayAudioRef.current = null;
    }
    setReplayingSeq(null);
  };

  const playSequenceFrom = async (startIndex: number) => {
    const runId = ++playRunIdRef.current;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setPlaybackFinished(false);

    for (let i = startIndex; i < lines.length; i++) {
      if (!isPlayingRef.current || playRunIdRef.current !== runId) break;
      setCurrentIndex(i);
      const line = lines[i];

      if (line.lineType === "narration") {
        // narration 行不播原声，以字幕条形式闪过其译文
        setNarrationSubtitle(line.translation);
        await new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, 2400);
        });
        if (playRunIdRef.current !== runId) break;
        setNarrationSubtitle(null);
      } else {
        // spoken/mixed/response 行播原声
        setNarrationSubtitle(null);
        await playAudioFile(line.audio);
        if (!isPlayingRef.current || playRunIdRef.current !== runId) break;
        // 行间短暂停顿
        await new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, 400);
        });
      }
    }

    if (isPlayingRef.current && playRunIdRef.current === runId) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      // 播完停在当前步：由孩子点按「继续」才进下一步，不再自动跳步
      setPlaybackFinished(true);
    }
  };

  useEffect(() => {
    playSequenceFrom(0);
    return () => {
      playRunIdRef.current += 1;
      isPlayingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSingleLineReplay();
      stopActiveAudio();
    };
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      playRunIdRef.current += 1;
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSingleLineReplay();
      stopActiveAudio();
    } else {
      stopSingleLineReplay();
      playSequenceFrom(currentIndex);
    }
  };

  const handleRestart = () => {
    playRunIdRef.current += 1;
    isPlayingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    stopSingleLineReplay();
    stopActiveAudio();
    setCurrentIndex(0);
    playSequenceFrom(0);
  };

  // 重播单行：不破坏整段播放状态管理，若当前正在连播则暂停后播完本行再恢复
  const handleReplayLine = (line: DialogueLine) => {
    if (replayingSeq === line.seq) {
      const pendingResume = resumeSeqIndexRef.current;
      stopSingleLineReplay();
      if (pendingResume !== null) {
        playSequenceFrom(pendingResume);
      }
      return;
    }

    const shouldResume = isPlayingRef.current || resumeSeqIndexRef.current !== null;
    const resumeIdx =
      resumeSeqIndexRef.current !== null ? resumeSeqIndexRef.current : currentIndex;

    if (isPlayingRef.current) {
      playRunIdRef.current += 1;
      isPlayingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopActiveAudio();
    }

    if (replayAudioRef.current) {
      try {
        replayAudioRef.current.pause();
        replayAudioRef.current.currentTime = 0;
      } catch {}
      replayAudioRef.current = null;
    }

    const token = ++replayTokenRef.current;
    resumeSeqIndexRef.current = shouldResume ? resumeIdx : null;
    setReplayingSeq(line.seq);

    const finishReplay = () => {
      if (replayTokenRef.current !== token) return;
      replayAudioRef.current = null;
      setReplayingSeq(null);
      const nextResume = resumeSeqIndexRef.current;
      resumeSeqIndexRef.current = null;
      if (nextResume !== null) {
        playSequenceFrom(nextResume);
      }
    };

    try {
      const audio = new Audio(`/assets/tmm-dialogues/audio/${line.audio}`);
      replayAudioRef.current = audio;
      audio.onended = finishReplay;
      audio.onerror = finishReplay;
      audio.play().catch(finishReplay);
    } catch {
      finishReplay();
    }
  };

  const handleSelectQuizOption = (q: ListenQuizQuestion, optIdx: number) => {
    if (solvedByQ[q.id]) return;
    if (optIdx === q.correctIndex) {
      setSolvedByQ((prev) => ({ ...prev, [q.id]: true }));
    } else {
      setWrongOptionsByQ((prev) => {
        const list = prev[q.id] || [];
        return list.includes(optIdx) ? prev : { ...prev, [q.id]: [...list, optIdx] };
      });
    }
  };

  const progressPct = Math.round(((currentIndex + 1) / Math.max(1, lines.length)) * 100);

  return (
    <div className="space-y-4">
      {/* 顶部控制栏 */}
      <div className="rounded-2xl border border-[#D3E4DE] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-black text-[#0A5E5D] bg-[#E7F2EF] px-2.5 py-0.5 rounded-full border border-[#D3E4DE] tabular-nums">
              第二步 · 听对话 ({currentIndex + 1}/{lines.length})
            </span>
            <span className="text-xs font-bold text-[#4E6B69]">
              原声连播
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowTranslation((prev) => !prev)}
              aria-pressed={showTranslation}
              className={`rounded-xl border text-xs font-bold h-9 px-3 ${
                showTranslation
                  ? "border-[#0F7B7A]/40 bg-[#E7F2EF] text-[#0A5E5D]"
                  : "border-[#D3E4DE] bg-white text-[#4E6B69] hover:bg-[#F3FAF8] hover:text-[#123B3C]"
              }`}
            >
              {showTranslation ? (
                <>
                  <EyeOffIcon className="size-3.5 mr-1 text-[#0F7B7A]" />
                  <span>隐藏译文</span>
                </>
              ) : (
                <>
                  <EyeIcon className="size-3.5 mr-1 text-[#0F7B7A]" />
                  <span>显示译文</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRestart}
              className="rounded-xl border-[#D3E4DE] bg-[#F3FAF8] text-[#123B3C] font-bold hover:bg-[#E7F2EF] text-xs h-9"
            >
              <RotateCcwIcon className="size-3.5 mr-1 text-[#0F7B7A]" />
              <span>从头重播</span>
            </Button>

            <Button
              size="sm"
              onClick={handleTogglePlay}
              className="rounded-xl bg-[#0F7B7A] hover:bg-[#0A5E5D] font-black text-white text-xs h-9 px-4"
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="size-3.5 mr-1" />
                  <span>暂停</span>
                </>
              ) : (
                <>
                  <PlayIcon className="size-3.5 mr-1" />
                  <span>继续播放</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => {
                playRunIdRef.current += 1;
                isPlayingRef.current = false;
                if (timerRef.current) clearTimeout(timerRef.current);
                stopSingleLineReplay();
                stopActiveAudio();
                onNext();
              }}
              className="rounded-xl bg-[#F2A93B] hover:bg-[#D69128] font-black text-[#123B3C] text-xs h-9 px-4"
            >
              <span>下一步（逐句精学）</span>
              <ChevronRightIcon className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* 播放进度条（含移动端清晰可见的百分比/行数进度） */}
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E7F2EF]">
            <div
              className="h-full rounded-full bg-[#0F7B7A] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-bold text-[#4E6B69] tabular-nums">
            {currentIndex + 1}/{lines.length}
          </span>
        </div>
      </div>

      {/* 连播结束后的理解小检验 + 继续入口：播完停在本步，点按才进下一步 */}
      {playbackFinished && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0F7B7A]/40 bg-[#E7F2EF] p-4 shadow-2xs">
            <span className="text-sm font-black text-[#123B3C]">
              整篇对话已听完，可以先做下方小检验再进入逐句精学。
            </span>
            <Button
              size="sm"
              onClick={() => {
                playRunIdRef.current += 1;
                isPlayingRef.current = false;
                if (timerRef.current) clearTimeout(timerRef.current);
                stopSingleLineReplay();
                stopActiveAudio();
                onNext();
              }}
              className="rounded-xl bg-[#F2A93B] hover:bg-[#D69128] font-black text-[#123B3C] text-xs h-9 px-4"
            >
              <span>继续</span>
              <ChevronRightIcon className="size-3.5 ml-1" />
            </Button>
          </div>

          {quizQuestions.length > 0 && (
            <div className="rounded-[20px] border border-[#D3E4DE] bg-white p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircleIcon className="size-4 text-[#0F7B7A]" />
                  <h3 className="text-sm font-black text-[#123B3C]">
                    理解小检验（随堂小练 · 不计分）
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-[#4E6B69]">
                  选错可继续重选，轻松回顾刚听过的对话
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizQuestions.map((q, qIdx) => {
                  const wrongList = wrongOptionsByQ[q.id] || [];
                  const isSolved = !!solvedByQ[q.id];

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-[#D3E4DE] bg-[#F3FAF8] p-4 space-y-3"
                    >
                      <div className="space-y-1">
                        <span className="inline-block rounded-full bg-[#E7F2EF] px-2 py-0.5 text-[11px] font-black text-[#0A5E5D] border border-[#D3E4DE]">
                          第 {qIdx + 1} 题 · {q.prompt}
                        </span>
                        <p className="font-serif text-sm sm:text-base font-black text-[#123B3C]">
                          “{q.quote}”
                        </p>
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isWrong = wrongList.includes(optIdx);
                          const isCorrectChosen = isSolved && optIdx === q.correctIndex;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={isWrong || isSolved}
                              onClick={() => handleSelectQuizOption(q, optIdx)}
                              className={`w-full text-left rounded-xl border px-3 py-2 text-xs sm:text-sm font-bold transition-colors ${
                                isCorrectChosen
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                                  : isWrong
                                  ? "border-rose-200 bg-rose-50/70 text-rose-500 line-through cursor-not-allowed"
                                  : isSolved
                                  ? "border-[#D3E4DE] bg-white/60 text-[#4E6B69]"
                                  : "border-[#D3E4DE] bg-white text-[#123B3C] hover:border-[#0F7B7A] hover:bg-[#E7F2EF]/50 cursor-pointer"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {isSolved ? (
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#0A5E5D]">
                          <CheckCircle2Icon className="size-4 text-[#0F7B7A]" />
                          <span>答对了，听得很认真 ✓</span>
                        </div>
                      ) : wrongList.length > 0 ? (
                        <p className="text-xs font-bold text-amber-800">
                          再想想哦，可点下方对应行「重播本行」或开启译文确认一下，再选一次。
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 旁白字幕闪烁条 */}
      {narrationSubtitle && (
        <div className="rounded-2xl border border-[#0F7B7A]/40 bg-[#E7F2EF] p-4 text-center text-sm font-black text-[#123B3C] shadow-sm animate-bounce">
          场景旁白：{narrationSubtitle}
        </div>
      )}

      {/* 对话行列表（高亮当前行，译文开关默认关） */}
      <div className="space-y-3 rounded-[20px] border border-[#D3E4DE] bg-white p-4 sm:p-6 shadow-sm">
        {lines.map((line, idx) => {
          const isActive = idx === currentIndex;
          const isA = line.speaker === "A";
          const isReplayingLine = replayingSeq === line.seq;

          if (line.lineType === "narration") {
            return (
              <div
                key={line.seq}
                className={`rounded-2xl p-3 text-center text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#E7F2EF] text-[#0A5E5D] border border-[#D3E4DE] border-l-4 border-l-[#0F7B7A]"
                    : "bg-[#F3FAF8] text-[#4E6B69] border border-[#D3E4DE]/70"
                }`}
              >
                <div>[场景旁白]</div>
                {showTranslation && (
                  <p className="mt-1 text-xs font-semibold text-[#123B3C]">
                    {line.translation}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div
              key={line.seq}
              className={`flex items-start gap-3 rounded-2xl p-4 transition-all duration-300 ${
                isActive
                  ? "bg-[#E7F2EF] border border-[#D3E4DE] border-l-4 border-l-[#0F7B7A] shadow-xs"
                  : "bg-[#F3FAF8]/60 border border-[#D3E4DE]/70"
              }`}
            >
              {/* 头像 */}
              <div className="shrink-0">
                {isA ? (
                  <div className="size-10 rounded-2xl bg-[#E7F2EF] border border-[#0F7B7A]/30 flex items-center justify-center font-black text-xs text-[#0A5E5D] shadow-2xs">
                    敢敢
                  </div>
                ) : (
                  <div className="size-10 rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-xs text-[#123B3C] shadow-2xs">
                    我
                  </div>
                )}
              </div>

              {/* 台词内容与重播本行按钮 */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-[#4E6B69]">
                      {isA ? "角色 A (敢敢)" : "角色 B (学生)"}
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-white bg-[#0F7B7A] px-2 py-0.5 rounded-full">
                        <Volume2Icon className="size-3 animate-pulse" />
                        正在播放
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleReplayLine(line)}
                    aria-label={`重播第 ${idx + 1} 句`}
                    className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      isReplayingLine
                        ? "border-[#0F7B7A] bg-[#0F7B7A] text-white"
                        : "border-[#D3E4DE] bg-white text-[#0A5E5D] hover:bg-[#E7F2EF]"
                    }`}
                  >
                    <Volume2Icon
                      className={`size-3 ${isReplayingLine ? "animate-pulse" : ""}`}
                    />
                    <span>{isReplayingLine ? "重播中…" : "重播本行"}</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg font-black text-[#123B3C] leading-snug">
                  {line.text}
                </p>
                {showTranslation && (
                  <p className="text-xs sm:text-sm font-semibold text-[#4E6B69] pt-0.5">
                    {line.translation}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 步骤 3：逐句精学 (Detailed Study)
// ==========================================

// ==========================================
// U2a 统一练习卡组件：句子丸 / 逐词片 / 词级 IPA
// ==========================================
let wordIpaCache: Record<string, string> | null = null;
let wordIpaPromise: Promise<Record<string, string>> | null = null;

function loadWordIpa(): Promise<Record<string, string>> {
  if (wordIpaCache) return Promise.resolve(wordIpaCache);
  if (!wordIpaPromise) {
    wordIpaPromise = fetch("/assets/tmm-dialogues/word-ipa.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        wordIpaCache =
          data && typeof data === "object" ? (data as Record<string, string>) : {};
        return wordIpaCache;
      });
  }
  return wordIpaPromise;
}

function useWordIpa(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(wordIpaCache || {});
  useEffect(() => {
    let alive = true;
    loadWordIpa().then((m) => {
      if (alive) setMap(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return map;
}

function WordIpaRow({
  text,
  map,
}: {
  text: string;
  map: Record<string, string>;
}) {
  const tokens = text.split(/(\s+)/).filter((s) => s.trim().length > 0);
  return (
    <div className="flex flex-wrap items-start gap-x-1.5 gap-y-3">
      {tokens.map((tok, i) => {
        const m = tok.match(/[A-Za-z][A-Za-z']*/);
        const ipa = m ? map[m[0].toLowerCase()] : undefined;
        return (
          <span key={i} className="inline-flex flex-col items-center gap-1">
            <span className="inline-block rounded-xl border border-[#D3E4DE] bg-[#F3FAF8] px-2 py-1 font-serif text-[22px] font-black leading-none text-[#123B3C] shadow-2xs sm:text-2xl">
              {tok}
            </span>
            <span className="h-4 text-[13px] font-semibold leading-none text-[#4E6B69]">
              {ipa ? `/${ipa}/` : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function SentencePills({
  items,
  activeKey,
  onPick,
}: {
  items: { key: number; label: string; done?: boolean; score?: number }[];
  activeKey?: number;
  onPick?: (key: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-[#D3E4DE] bg-white px-3 py-2.5 shadow-2xs">
      <span className="mr-1 shrink-0 text-[11px] font-black text-[#4E6B69]">句子</span>
      {items.map((it) => {
        const isActive = it.key === activeKey;
        const cls = isActive
          ? "bg-[#0F7B7A] text-white ring-2 ring-[#0F7B7A]/40 scale-105"
          : it.done
          ? "bg-[#E7F2EF] text-[#0A5E5D] border border-[#0F7B7A]/30"
          : "bg-white text-[#4E6B69] border border-[#D3E4DE]";
        const content =
          typeof it.score === "number"
            ? it.score >= 60
              ? `✓ ${it.score}`
              : String(it.score)
            : it.done
            ? "✓"
            : it.label;
        if (onPick) {
          return (
            <button
              key={it.key}
              onClick={() => onPick(it.key)}
              className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-xs font-black transition-all hover:brightness-105 ${cls}`}
            >
              {content}
            </button>
          );
        }
        return (
          <span
            key={it.key}
            className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-2 text-xs font-black ${cls}`}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}


// ==========================================
// U2b 听写卡：听原声 -> 逐词输入 -> 即时判对错 -> 错词收集
// ==========================================
function normDictTokens(s: string): string[] {
  return s.toLowerCase().match(/[a-z][a-z']*/g) || [];
}

function Step3DictationCard({
  lesson,
  line,
  playAudioFile,
  ipaMap,
  onCheckResult,
  onNextLine,
  hasNext,
}: {
  lesson: DialogueLesson;
  line: DialogueLine;
  playAudioFile: (filename: string) => Promise<void>;
  ipaMap: Record<string, string>;
  onCheckResult: (wrongWords: string[], allOk: boolean) => void;
  onNextLine: () => void;
  hasNext: boolean;
}) {
  const spoken = parseMixedLine(line.text, line.translation).spokenTextEn;
  const target = useMemo(() => normDictTokens(spoken), [spoken]);
  const targetDisplay = useMemo<string[]>(
    () => spoken.match(/[A-Za-z][A-Za-z']*/g) || [],
    [spoken]
  );
  const [input, setInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<{
    rows: { word: string; typed: string | null; ok: boolean }[];
    extra: string[];
    allOk: boolean;
  } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showChinese, setShowChinese] = useState(false);
  const [wrongCollected, setWrongCollected] = useState<string[]>([]);

  const play = async () => {
    setIsPlaying(true);
    setPlayCount((c) => c + 1);
    await playAudioFile(line.audio);
    setIsPlaying(false);
  };

  const handleCheck = () => {
    const typed = normDictTokens(input);
    if (typed.length === 0) return;
    const rows = target.map((w, i) => ({
      word: targetDisplay[i] || w,
      typed: typed[i] ?? null,
      ok: typed[i] === w,
    }));
    const extra = typed.slice(target.length);
    const allOk = rows.every((r) => r.ok) && extra.length === 0;
    setResult({ rows, extra, allOk });
    setAttempts((a) => a + 1);
    if (!allOk) {
      const wrong = Array.from(
        new Set(
          rows
            .filter((r) => !r.ok)
            .map((r) => r.word.toLowerCase().replace(/[^a-z']/g, ''))
        )
      );
      setWrongCollected((prev) => Array.from(new Set([...prev, ...wrong])));
      onCheckResult(wrong, false);
    } else {
      onCheckResult([], true);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border-2 border-sky-300/80 bg-white p-6 shadow-sm sm:p-8">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-900">
            {line.speaker === "A" ? "角色 A · 敢敢" : "角色 B · 学生"}
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-sky-800">
            ✎ 听写中
          </span>
        </div>
        <span className="text-xs font-bold text-slate-500">
          已听 {playCount} 次 · 尝试 {attempts} 次
        </span>
      </div>

      {/* 听原声 */}
      <div className="flex flex-col items-center gap-3 py-1">
        <button
          onClick={play}
          disabled={isPlaying}
          className="flex size-20 items-center justify-center rounded-full bg-sky-400 text-slate-950 shadow-md transition-all hover:bg-sky-500 disabled:opacity-70"
          aria-label="听原声"
        >
          <Volume2Icon className={`size-9 ${isPlaying ? "animate-pulse" : ""}`} />
        </button>
        <span className="text-xs font-bold text-slate-500">
          {isPlaying ? "正在播放原声..." : "点大喇叭听原声，把句子写下来"}
        </span>
      </div>

      {/* 词槽（只给词长提示，不给答案） */}
      {!result && !revealed && (
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2">
          {target.map((w, i) => (
            <span
              key={i}
              className="inline-block rounded-xl border border-dashed border-sky-300 bg-sky-50/70 px-2 py-1.5 font-mono text-sm font-bold tracking-widest text-sky-700"
            >
              {"_".repeat(w.length)}
            </span>
          ))}
        </div>
      )}

      {/* 输入与检查 */}
      {!result && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheck();
          }}
          className="space-y-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在这里输入你听到的句子..."
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-2xl border-2 border-sky-200 bg-sky-50/40 px-4 py-3 font-serif text-lg font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowChinese((s) => !s)}
                className="flex h-8 items-center gap-1.5 rounded-xl border border-sky-200/70 px-3 text-xs font-bold text-sky-700 hover:bg-sky-50"
              >
                <EyeIcon className="size-3.5" />
                <span>{showChinese ? "收起中文" : "看中文提示"}</span>
              </Button>
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="h-8 rounded-full border-2 border-dashed border-wood-ink/60 bg-parchment-light px-3 text-xs font-black text-wood-ink shadow-[2px_2px_0_var(--wood-ink)] hover:bg-parchment-warm"
              >
                查看答案（不计完成）
              </button>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={normDictTokens(input).length === 0}
              className="h-10 rounded-xl bg-sky-500 px-5 text-xs font-black text-white hover:bg-sky-600 disabled:opacity-50"
            >
              检查答案
            </Button>
          </div>
          {showChinese && (
            <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm font-bold text-sky-950">
              {line.translation}
            </p>
          )}
        </form>
      )}

      {/* 判定结果 */}
      {result && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl border-2 p-4 text-center text-sm font-black ${
              result.allOk
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {result.allOk
              ? "全部拼写正确。"
              : `还差一点：${result.rows.filter((r) => !r.ok).length} 个词需要订正${
                  result.extra.length > 0 ? `，还多写了 ${result.extra.length} 个词` : ""
                }`}
          </div>

          <div className="flex flex-wrap items-start gap-x-1.5 gap-y-2">
            {result.rows.map((r, i) => (
              <span key={i} className="inline-flex flex-col items-center gap-1">
                <span
                  className={`inline-block rounded-xl border px-2 py-1 font-serif text-lg font-black leading-none ${
                    r.ok
                      ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                      : "border-rose-300 bg-rose-100 text-rose-900"
                  }`}
                >
                  {r.word}
                </span>
                <span className="h-4 text-[12px] font-bold leading-none">
                  {r.ok ? (
                    <span className="text-emerald-700">✓</span>
                  ) : (
                    <span className="text-rose-500 line-through">
                      {r.typed ?? "（漏写）"}
                    </span>
                  )}
                </span>
              </span>
            ))}
          </div>
          {result.extra.length > 0 && (
            <p className="text-xs font-bold text-rose-500">
              多写的词：{result.extra.join("、")}
            </p>
          )}

          {result.allOk ? (
            <div className="space-y-3">
              <WordIpaRow text={spoken} map={ipaMap} />
              <p className="text-sm font-bold text-slate-600">{line.translation}</p>
              {hasNext && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={onNextLine}
                    className="flex h-11 items-center gap-1.5 rounded-2xl bg-emerald-500 px-6 text-sm font-black text-white shadow-md hover:bg-emerald-600"
                  >
                    <span>下一句</span>
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {wrongCollected.length > 0 && (
                <p className="text-xs font-bold text-[#0A5E5D]">
                  错词已收藏到生词本：{wrongCollected.join("、")}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={play}
                  disabled={isPlaying}
                  className="h-10 rounded-xl border-sky-200 bg-sky-50 px-4 text-xs font-bold text-sky-900 hover:bg-sky-100"
                >
                  <Volume2Icon className="mr-1 size-3.5" />
                  <span>再听一次</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setInput("");
                  }}
                  className="h-10 rounded-xl bg-sky-500 px-5 text-xs font-black text-white hover:bg-sky-600"
                >
                  重新输入
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 看答案揭示 */}
      {revealed && !result && (
        <div className="space-y-3 rounded-2xl border border-[#D3E4DE] bg-[#E7F2EF] p-4">
          <p className="text-xs font-black text-[#123B3C]">参考答案（看完可再写一遍）</p>
          <WordIpaRow text={spoken} map={ipaMap} />
          <p className="text-sm font-bold text-[#4E6B69]">{line.translation}</p>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRevealed(false)}
              className="h-9 rounded-xl border-[#D3E4DE] bg-white px-4 text-xs font-bold text-[#123B3C] hover:bg-[#F3FAF8]"
            >
              收起答案，继续写
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Step3Study({
  lesson,
  playAudioFile,
  stopActiveAudio,
  bestScores,
  onRecordScore,
  onNext,
  onJumpToRolePlay,
  onOpenReport,
  streak,
  streakRetryHint,
}: {
  lesson: DialogueLesson;
  playAudioFile: (filename: string) => Promise<void>;
  stopActiveAudio: () => void;
  bestScores: Record<number, number>;
  onRecordScore: (seq: number, score: number) => void;
  onNext: () => void;
  onJumpToRolePlay: (seq: number) => void;
  streak: number;
  streakRetryHint?: boolean;
  onOpenReport: (
    assessment: PronunciationAssessmentType,
    recordingUrl: string,
    teacherAudioSrc?: string,
    referenceText?: string
  ) => void;
}) {
  // 保存每句最新评测记录：{ [seq]: { assessment, recordingUrl } }
  const [assessmentsMap, setAssessmentsMap] = useState<
    Record<number, { assessment: PronunciationAssessmentType; recordingUrl: string }>
  >({});
  // 保存每句「先跟读一遍」本地回放录音 URL（仅内存态对比，不评测、不入档）
  const [mimicUrlsMap, setMimicUrlsMap] = useState<Record<number, string>>({});
  // narration 行跳过，不出现在精学队列
  const studyLines = useMemo(
    () => lesson.lines.filter((l) => l.lineType !== "narration"),
    [lesson]
  );

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [showChineseMap, setShowChineseMap] = useState<Record<number, boolean>>({});
  const [mode, setMode] = useState<"study" | "dictation">("study");
  const [dictDoneMap, setDictDoneMap] = useState<Record<number, boolean>>({});
  const { webApi } = useContext(AppSettingsProviderContext);

  // 听写错词收集：本地留底（按用户分桶）+ 尽力同步服务端生词库
  const collectDictWrongWords = (line: DialogueLine, wrongWords: string[]) => {
    if (wrongWords.length === 0) return;
    try {
      const key = getScopedKey("sunnybridge_dictation_wrong_v1");
      const raw = localStorage.getItem(key);
      const store: Record<string, { word: string; count: number; lessonId: string; seq: number; updatedAt: string }> = raw ? JSON.parse(raw) : {};
      const now = new Date().toISOString();
      for (const w of wrongWords) {
        const k = w.toLowerCase();
        store[k] = {
          word: k,
          count: (store[k]?.count || 0) + 1,
          lessonId: lesson.lessonId,
          seq: line.seq,
          updatedAt: now,
        };
      }
      localStorage.setItem(key, JSON.stringify(store));
    } catch {}
    try {
      webApi
        ?.lookupInBatch(
          wrongWords.map((w) => ({
            word: w,
            context: line.text,
            sourceId: lesson.lessonId,
            sourceType: "dialogue",
          }))
        )
        .catch(() => {});
    } catch {}
  };
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const currentLine = studyLines[activeIdx] || studyLines[0];
  const wordIpaMap = useWordIpa();

  const toggleChinese = (seq: number) => {
    setShowChineseMap((prev) => ({
      ...prev,
      [seq]: !prev[seq],
    }));
  };

  const handlePlayLineAudio = async (filename: string) => {
    setIsPlayingAudio(true);
    await playAudioFile(filename);
    setIsPlayingAudio(false);
  };

  const currentBest = currentLine ? bestScores[currentLine.seq] : 0;

  return (
    <div className="relative space-y-5">
      <StreakBar streak={streak} />
      {/* 顶部指示与翻句控制器 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D3E4DE] bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-black text-[#0A5E5D] bg-[#E7F2EF] px-2.5 py-0.5 rounded-full border border-[#D3E4DE]">
            第三步 · 逐句精学
          </span>
          <span className="text-xs font-bold text-[#4E6B69]">
            句子 {activeIdx + 1} / {studyLines.length}
          </span>
          {streakRetryHint && (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
              这一句再练一次
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              stopActiveAudio();
              onNext();
            }}
            className="rounded-xl bg-[#F2A93B] hover:bg-[#D69128] font-black text-[#123B3C] text-xs h-9 px-4"
          >
            <span>进入角色扮演</span>
            <ChevronRightIcon className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* 模式切换：跟读 / 听写 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-[#D3E4DE] bg-white p-1 shadow-2xs">
            <button
              onClick={() => setMode("study")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                mode === "study" ? "bg-[#0F7B7A] text-white" : "text-[#4E6B69] hover:text-[#123B3C]"
              }`}
            >
              <MicIcon className="size-3.5" />
              <span>跟读练习</span>
            </button>
            <button
              onClick={() => setMode("dictation")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                mode === "dictation" ? "bg-[#0F7B7A] text-white" : "text-[#4E6B69] hover:text-[#123B3C]"
              }`}
            >
              <KeyboardIcon className="size-3.5" />
              <span>听写练习</span>
            </button>
          </div>
          {mode === "dictation" && (
            <span className="text-xs font-bold text-[#0A5E5D]">
              听一句写一句，错词会自动收藏到生词本。
            </span>
          )}
        </div>

        {currentLine && mode === "dictation" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              stopActiveAudio();
              onJumpToRolePlay(currentLine.seq);
            }}
            className="rounded-xl border-[#0F7B7A]/40 bg-[#E7F2EF] text-[#0A5E5D] hover:bg-[#D3E4DE]/60 font-black text-xs h-9 px-3.5 flex items-center gap-1.5"
          >
            <UsersIcon className="size-3.5 text-[#0F7B7A]" />
            <span>角色扮演这一句</span>
          </Button>
        )}
      </div>

      <SentencePills
        items={studyLines.map((l, i) => ({
          key: l.seq,
          label: String(i + 1),
          done:
            mode === "dictation"
              ? !!dictDoneMap[l.seq]
              : typeof bestScores[l.seq] === "number" && bestScores[l.seq] >= 60,
          score: mode === "dictation" ? undefined : bestScores[l.seq],
        }))}
        activeKey={currentLine?.seq}
        onPick={(key) => {
          const idx = studyLines.findIndex((l) => l.seq === key);
          if (idx >= 0) {
            stopActiveAudio();
            setActiveIdx(idx);
          }
        }}
      />

      {/* 先跟读一遍：播原声 → 录音回放对比（只录音回放，不调评测、不出分、不入档） */}
      {currentLine && (
        <div className="rounded-2xl border border-[#D3E4DE] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#E7F2EF] px-2.5 py-0.5 text-[11px] font-black text-[#0A5E5D] border border-[#D3E4DE]">
                热身 · 先跟读一遍
              </span>
              <span className="text-xs font-bold text-[#4E6B69]">
                先听原声并录音回放对比（不计分），再进入下方学习或听写
              </span>
            </div>
          </div>
          <DialogueVoiceRecorder
            key={`mimic-${currentLine.seq}`}
            mimicOnly
            referenceText={currentLine.text}
            teacherAudioSrc={`/assets/tmm-dialogues/audio/${currentLine.audio}`}
            initialRecordedUrl={mimicUrlsMap[currentLine.seq] || null}
            onMimicRecorded={(url) => {
              setMimicUrlsMap((prev) => ({
                ...prev,
                [currentLine.seq]: url,
              }));
            }}
          />
        </div>
      )}

      {/* 句子卡片 */}
      {currentLine && mode === "study" && (
        <div className="rounded-[20px] border border-[#D3E4DE] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* 卡片头部 */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D3E4DE] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center whitespace-nowrap shrink-0 rounded-xl bg-[#E7F2EF] px-2.5 py-1 text-xs font-black text-[#0A5E5D] border border-[#D3E4DE]">
                {currentLine.speaker === "A" ? "角色 A · 敢敢" : "角色 B · 学生"}
              </span>

              {typeof currentBest === "number" && currentBest > 0 ? (
                <>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                      currentBest >= 75
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : currentBest >= 60
                        ? "border-[#0F7B7A]/30 bg-[#E7F2EF] text-[#0A5E5D]"
                        : "border-amber-300 bg-amber-50 text-amber-900"
                    }`}
                  >
                    最佳 {currentBest} 分{currentBest >= 60 ? " · 读完 ✓" : " · 这一句再练一次"}
                  </span>
                  {currentBest >= 75 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                      <AwardIcon className="size-3.5 text-emerald-600" />
                      <span>发音达标</span>
                    </span>
                  )}
                </>
              ) : null}
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                stopActiveAudio();
                onJumpToRolePlay(currentLine.seq);
              }}
              className="rounded-xl border-[#0F7B7A]/40 bg-[#E7F2EF] text-[#0A5E5D] hover:bg-[#D3E4DE]/60 font-black text-xs h-9 px-3.5 flex items-center gap-1.5"
            >
              <UsersIcon className="size-3.5 text-[#0F7B7A]" />
              <span>角色扮演这一句</span>
            </Button>
          </div>

          {/* 英文正文 */}
          <div className="space-y-3">
            <WordIpaRow text={currentLine.text} map={wordIpaMap} />

            {/* 中文译文（默认收起，点「看中文」展开） */}
            <div className="pt-1">
              {showChineseMap[currentLine.seq] ? (
                <div className="flex items-center justify-between rounded-2xl bg-[#E7F2EF] border border-[#D3E4DE] p-3.5">
                  <p className="text-sm font-bold text-[#123B3C]">
                    {currentLine.translation}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleChinese(currentLine.seq)}
                    className="text-xs font-bold text-[#4E6B69] hover:text-[#123B3C] h-8 px-2 flex items-center gap-1"
                  >
                    <EyeOffIcon className="size-3.5" />
                    <span>收起中文</span>
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleChinese(currentLine.seq)}
                  className="text-xs font-bold text-[#0F7B7A] hover:bg-[#E7F2EF] h-8 px-3 rounded-xl flex items-center gap-1.5 border border-[#D3E4DE]"
                >
                  <EyeIcon className="size-3.5 text-[#0F7B7A]" />
                  <span>看中文译文</span>
                </Button>
              )}
            </div>
          </div>

          {/* 跟读评测区 */}
          <div className="rounded-2xl border-2 border-dashed border-[#D3E4DE] bg-[#F3FAF8] p-5 space-y-3">
            <div className="text-xs font-black text-[#123B3C]">
              跟读与发音评测
            </div>
            <DialogueVoiceRecorder
              key={currentLine.seq}
              referenceText={currentLine.text}
              teacherAudioSrc={`/assets/tmm-dialogues/audio/${currentLine.audio}`}
              bestScore={currentBest}
              passThreshold={60}
              initialAssessment={assessmentsMap[currentLine.seq]?.assessment}
              initialRecordedUrl={assessmentsMap[currentLine.seq]?.recordingUrl}
              archiveContext={{
                source: "dialogue",
                contextRef: `${lesson.lessonId}#seq${currentLine.seq}`,
              }}
              onAssessmentCompleted={(score, created, url) => {
                onRecordScore(currentLine.seq, score);
                if (created && url) {
                  setAssessmentsMap((prev) => ({
                    ...prev,
                    [currentLine.seq]: { assessment: created, recordingUrl: url },
                  }));
                }
              }}
              onOpenReport={onOpenReport}
            />
          </div>
        </div>
      )}

      {currentLine && mode === "dictation" && (
        <Step3DictationCard
          key={currentLine.seq}
          lesson={lesson}
          line={currentLine}
          playAudioFile={playAudioFile}
          ipaMap={wordIpaMap}
          hasNext={activeIdx < studyLines.length - 1}
          onCheckResult={(wrongWords, allOk) => {
            if (allOk) {
              setDictDoneMap((prev) => ({ ...prev, [currentLine.seq]: true }));
            } else {
              collectDictWrongWords(currentLine, wrongWords);
            }
          }}
          onNextLine={() => {
            stopActiveAudio();
            setActiveIdx((p) => Math.min(studyLines.length - 1, p + 1));
          }}
        />
      )}

      {/* 底部动作条：上一句 / 听原声 / 下一句 */}
      {currentLine && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D3E4DE] bg-white p-3 shadow-2xs">
          <Button
            size="sm"
            variant="outline"
            disabled={activeIdx <= 0}
            onClick={() => {
              stopActiveAudio();
              setActiveIdx((p) => Math.max(0, p - 1));
            }}
            className="h-10 rounded-xl border-[#D3E4DE] bg-[#F3FAF8] px-4 text-xs font-bold text-[#123B3C] hover:bg-[#E7F2EF]"
          >
            <ChevronLeftIcon className="mr-1 size-3.5" />
            <span>上一句</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handlePlayLineAudio(currentLine.audio)}
            disabled={isPlayingAudio}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-[#0F7B7A] px-5 text-xs font-black text-white shadow-2xs hover:bg-[#0A5E5D]"
          >
            <Volume2Icon className={`size-4 ${isPlayingAudio ? "animate-pulse" : ""}`} />
            <span>{isPlayingAudio ? "正在播放示范…" : "听原声示范"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={activeIdx >= studyLines.length - 1}
            onClick={() => {
              stopActiveAudio();
              setActiveIdx((p) => Math.min(studyLines.length - 1, p + 1));
            }}
            className="h-10 rounded-xl border-[#D3E4DE] bg-[#F3FAF8] px-4 text-xs font-bold text-[#123B3C] hover:bg-[#E7F2EF]"
          >
            <span>下一句</span>
            <ChevronRightIcon className="ml-1 size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 步骤 4：角色扮演 (Role Play · 学生演 B)
// ==========================================
function Step4RolePlay({
  lesson,
  initialSeq,
  playAudioFile,
  stopActiveAudio,
  bestScores,
  onRecordScore,
  onNext,
  onOpenReport,
  streak,
  streakRetryHint,
  onSurrender,
}: {
  lesson: DialogueLesson;
  initialSeq?: number | null;
  playAudioFile: (filename: string) => Promise<void>;
  stopActiveAudio: () => void;
  bestScores: Record<number, number>;
  onRecordScore: (seq: number, score: number) => void;
  onNext: () => void;
  streak: number;
  streakRetryHint?: boolean;
  onSurrender: () => void;
  onOpenReport: (
    assessment: PronunciationAssessmentType,
    recordingUrl: string,
    teacherAudioSrc?: string,
    referenceText?: string
  ) => void;
}) {
  // 保存每句最新评测记录：{ [seq]: { assessment, recordingUrl } }
  const [bAssessmentsMap, setBAssessmentsMap] = useState<
    Record<number, { assessment: PronunciationAssessmentType; recordingUrl: string }>
  >({});
  const lines = lesson.lines;
  const wordIpaMap = useWordIpa();
  const midIndex = Math.floor(lines.length / 2);
  const midSeq = lines[midIndex]?.seq ?? 0;

  // 变体机关：从对话后半段起（seq 大于本课中点），A 行若有 variants，
  // 每次进入本课时随机选主线或某个变体作为提问（播变体音频、显示变体英文）
  const aVariantPickMap = useMemo(() => {
    const map: Record<number, { text: string; audio: string; translation: string }> = {};
    for (const line of lines) {
      if (line.speaker === "A" && line.seq > midSeq && line.variants && line.variants.length > 0) {
        const pool = [
          { text: line.text, audio: line.audio, translation: line.translation },
          ...line.variants.map((v) => ({
            text: v.text,
            audio: v.audio,
            translation: v.translation,
          })),
        ];
        const picked = pool[Math.floor(Math.random() * pool.length)];
        map[line.seq] = picked;
      }
    }
    return map;
  }, [lesson]);

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (typeof initialSeq === "number") {
      const idx = lines.findIndex((l) => l.seq === initialSeq);
      if (idx >= 0) return idx;
    }
    return 0;
  });
  const [bLinePassedMap, setBLinePassedMap] = useState<Record<number, boolean>>({});
  const [quotaBypassedMap, setQuotaBypassedMap] = useState<Record<number, boolean>>({});
  const [bLatestScore, setBLatestScore] = useState<number | null>(null);
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const [narrationSubtitle, setNarrationSubtitle] = useState<string | null>(null);

  const currentLine = lines[currentIndex];

  // 推进到下一句
  const advanceToNextLine = () => {
    stopActiveAudio();
    setBLatestScore(null);
    if (currentIndex + 1 < lines.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // 全部角色扮演行顺利通关
      onNext();
    }
  };

  // 处理 A 行或 narration 行的自动推进
  useEffect(() => {
    if (!currentLine) return;

    if (currentLine.speaker === "A") {
      if (currentLine.lineType === "narration") {
        // narration 行以字幕＋TTS 中文带过不等待
        setNarrationSubtitle(currentLine.translation);
        speakGanganPrompt(currentLine.translation, {
          onEnd: () => {
            setNarrationSubtitle(null);
            advanceToNextLine();
          },
        });
      } else {
        // A 行（spoken/mixed）：播原声（或变体原声）并显示英文
        const activeA = aVariantPickMap[currentLine.seq] || {
          text: currentLine.text,
          audio: currentLine.audio,
        };
        playAudioFile(activeA.audio).then(() => {
          // A 播完后稍作缓冲推进到下一行
          setTimeout(() => {
            advanceToNextLine();
          }, 600);
        });
      }
    } else if (currentLine.speaker === "B") {
      // 轮到 B 行：先播一次示范原声（可重播），学生录音评测
      setIsPlayingDemo(true);
      playAudioFile(currentLine.audio).then(() => {
        setIsPlayingDemo(false);
      });
    }

    return () => {
      stopActiveAudio();
    };
  }, [currentIndex]);

  const handleReplayBDemo = () => {
    if (!currentLine) return;
    setIsPlayingDemo(true);
    playAudioFile(currentLine.audio).then(() => {
      setIsPlayingDemo(false);
    });
  };

  return (
    <div className="relative space-y-5">
      <StreakBar streak={streak} />
      {/* 顶部状态提示条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D3E4DE] bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-black text-[#0A5E5D] bg-[#E7F2EF] px-2.5 py-0.5 rounded-full border border-[#D3E4DE]">
            第四步 · 角色扮演
          </span>
          <span className="text-xs font-bold text-[#4E6B69]">
            你扮演角色 B (学生) · 进度 {currentIndex + 1}/{lines.length}
          </span>
          {streakRetryHint && (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
              这一句再练一次
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              stopActiveAudio();
              setCurrentIndex(0);
              setBLinePassedMap({});
              setBLatestScore(null);
            }}
            className="rounded-xl border-[#D3E4DE] bg-[#F3FAF8] text-[#123B3C] font-bold hover:bg-[#E7F2EF] text-xs h-9"
          >
            <RotateCcwIcon className="size-3.5 mr-1 text-[#0F7B7A]" />
            <span>重新开始扮演</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              stopActiveAudio();
              onNext();
            }}
            className="rounded-xl bg-[#F2A93B] hover:bg-[#D69128] font-black text-[#123B3C] text-xs h-9 px-4"
          >
            <span>直接去小结</span>
            <ChevronRightIcon className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      <SentencePills
        items={lines.map((l, i) => ({
          key: l.seq,
          label: l.speaker === "A" ? "A" : String(i + 1),
          done: i < currentIndex || !!bLinePassedMap[l.seq],
          score:
            l.speaker === "B" && bLinePassedMap[l.seq]
              ? bestScores[l.seq]
              : undefined,
        }))}
        activeKey={currentLine?.seq}
      />

      {/* 旁白即时字幕条 */}
      {narrationSubtitle && (
        <div className="rounded-2xl border border-[#0F7B7A]/40 bg-[#E7F2EF] p-4 text-center text-sm font-black text-[#123B3C] shadow-sm">
          🎬 情景旁白：{narrationSubtitle}
        </div>
      )}

      {/* 当前角色扮演主台词舞台 */}
      {currentLine && (
        <div className="rounded-[20px] border border-[#D3E4DE] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* A 角色正在说话 */}
          {currentLine.speaker === "A" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/gangan/gangan_avatar240.png"
                  alt="敢敢"
                  className="size-14 rounded-2xl border border-[#D3E4DE] bg-[#E7F2EF] p-1 object-cover shadow-2xs"
                />
                <div>
                  <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-black text-[#0A5E5D] bg-[#E7F2EF] px-2.5 py-0.5 rounded-full border border-[#D3E4DE]">
                    敢敢正在说话…
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#4E6B69] font-bold mt-0.5">
                    <Volume2Icon className="size-3.5 text-[#0F7B7A] animate-pulse" />
                    <span>听敢敢的台词</span>
                  </div>
                </div>
              </div>

              {/* mixed 行方括号部分作为情境字幕呈现 */}
              {(() => {
                const mixedInfo = parseMixedLine(
                  aVariantPickMap[currentLine.seq]?.text || currentLine.text,
                  aVariantPickMap[currentLine.seq]?.translation || currentLine.translation
                );
                return (
                  <div className="space-y-3">
                    {mixedInfo.sceneNoteEn && (
                      <div className="inline-block rounded-xl bg-[#E7F2EF] border border-[#D3E4DE] px-3 py-1 text-xs font-black text-[#123B3C]">
                        场景情景：[{mixedInfo.sceneNoteZh || mixedInfo.sceneNoteEn}]
                      </div>
                    )}
                    <WordIpaRow text={mixedInfo.spokenTextEn} map={wordIpaMap} />
                  </div>
                );
              })()}
            </div>
          )}

          {/* B 角色（学生）轮到我说话 */}
          {currentLine.speaker === "B" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3E4DE] pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 shrink-0 rounded-2xl bg-slate-100 border border-slate-300 text-[#123B3C] flex items-center justify-center font-black text-base shadow-2xs">
                    我
                  </div>
                  <div>
                    <span className="inline-flex items-center whitespace-nowrap shrink-0 text-xs font-black text-[#123B3C] bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
                      轮到你了！扮演角色 B
                    </span>
                    <p className="text-xs font-bold text-[#4E6B69] mt-0.5">
                      跟读下面这句，读出 ≥ 60 分即可继续（≥ 75 分发音达标）。
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReplayBDemo}
                  disabled={isPlayingDemo}
                  className="rounded-2xl border-[#D3E4DE] bg-[#F3FAF8] text-[#123B3C] hover:bg-[#E7F2EF] font-black text-xs h-10 px-4 flex items-center gap-1.5"
                >
                  <Volume2Icon className={`size-4 text-[#0F7B7A] ${isPlayingDemo ? "animate-pulse" : ""}`} />
                  <span>{isPlayingDemo ? "正在示范中…" : "重播示范原声"}</span>
                </Button>
              </div>

              {/* 期望答案英文（B 行始终以主线 text 为准） */}
              <div className="space-y-2">
                <WordIpaRow text={currentLine.text} map={wordIpaMap} />
                <div className="text-sm font-bold text-[#4E6B69]">
                  {currentLine.translation}
                </div>
              </div>

              {/* 跟读评测与录音打分 */}
              <div className="rounded-2xl border-2 border-dashed border-[#D3E4DE] bg-[#F3FAF8] p-5 space-y-4">
                <DialogueVoiceRecorder
                  key={currentLine.seq}
                  referenceText={currentLine.text}
                  teacherAudioSrc={`/assets/tmm-dialogues/audio/${currentLine.audio}`}
                  bestScore={bestScores[currentLine.seq]}
                  passThreshold={60}
                  initialAssessment={bAssessmentsMap[currentLine.seq]?.assessment}
                  initialRecordedUrl={bAssessmentsMap[currentLine.seq]?.recordingUrl}
                  archiveContext={{
                    source: "dialogue",
                    contextRef: `${lesson.lessonId}#seq${currentLine.seq}`,
                  }}
                  onAssessmentCompleted={(score, created, url) => {
                    onRecordScore(currentLine.seq, score);
                    setBLatestScore(score);
                    if (created && url) {
                      setBAssessmentsMap((prev) => ({
                        ...prev,
                        [currentLine.seq]: { assessment: created, recordingUrl: url },
                      }));
                    }
                    if (score >= 60) {
                      setBLinePassedMap((p) => ({ ...p, [currentLine.seq]: true }));
                    }
                  }}
                  onQuotaReached={() => {
                    setQuotaBypassedMap((p) => ({ ...p, [currentLine.seq]: true }));
                  }}
                  onOpenReport={onOpenReport}
                />

                {/* P0 投降键：这句先跳过（记 0 分过关计数，本课不计奖牌） */}
                {!bLinePassedMap[currentLine.seq] && !quotaBypassedMap[currentLine.seq] && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onSurrender();
                        onRecordScore(currentLine.seq, 0);
                        advanceToNextLine();
                      }}
                      className="rounded-full border-2 border-dashed border-wood-ink/60 bg-parchment-light px-3.5 py-1.5 text-xs font-black text-wood-ink shadow-[2px_2px_0_var(--wood-ink)] hover:bg-parchment-warm"
                    >
                      跳过本句（记 0 分 · 不计奖牌）
                    </button>
                  </div>
                )}

                {/* 变体机关：B 行变体在评测后以「还可以这样说」形式展示 */}
                {bLatestScore !== null && currentLine.variants && currentLine.variants.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-[#D3E4DE] bg-white p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#123B3C]">
                      <SparklesIcon className="size-4 text-[#0F7B7A]" />
                      <span>替换表达：</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {currentLine.variants.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between rounded-xl bg-[#F3FAF8] p-3 border border-[#D3E4DE]"
                        >
                          <div>
                            <div className="text-sm font-black text-[#123B3C] font-serif">
                              {v.text}
                            </div>
                            <div className="text-xs font-semibold text-[#4E6B69] mt-0.5">
                              {v.translation}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudioFile(v.audio)}
                            className="size-8 p-0 rounded-full bg-white hover:bg-[#E7F2EF] border border-[#D3E4DE] text-[#0F7B7A]"
                          >
                            <Volume2Icon className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 及格后（或配额达上限后）下一句按钮 */}
                {(bLinePassedMap[currentLine.seq] || quotaBypassedMap[currentLine.seq]) && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={advanceToNextLine}
                      className="rounded-2xl bg-[#F2A93B] hover:bg-[#D69128] font-black text-[#123B3C] h-11 px-6 shadow-md flex items-center gap-1.5 text-sm"
                    >
                      <span>下一句</span>
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 步骤 5：小结 (Summary & Star Settlement)
// ==========================================
function Step5Summary({
  lesson,
  bestScores,
  maxStreak,
  assisted,
  onReplay,
  onBack,
  onContinueRolePlay,
}: {
  lesson: DialogueLesson;
  bestScores: Record<number, number>;
  maxStreak: number;
  assisted: boolean;
  onReplay: () => void;
  onBack: () => void;
  onContinueRolePlay?: () => void;
}) {
  // 角色扮演各 B 行最好分
  const bLines = useMemo(
    () => lesson.lines.filter((l) => l.speaker === "B"),
    [lesson]
  );

  const answeredLines = useMemo(
    () => bLines.filter((l) => typeof bestScores[l.seq] === "number"),
    [bLines, bestScores]
  );
  const answeredCount = answeredLines.length;
  const isAllAnswered = bLines.length > 0 ? answeredCount === bLines.length : true;

  const { avgScore, stars } = useMemo(() => {
    if (!isAllAnswered) return { avgScore: 0, stars: 0 };
    if (bLines.length === 0) return { avgScore: 90, stars: 3 };
    const total = bLines.reduce(
      (acc, line) => acc + (bestScores[line.seq] || 0),
      0
    );
    const avg = Math.round(total / bLines.length);
    // 均分 ≥85 三星 / ≥70 二星 / 完成一星
    const earnedStars = avg >= 85 ? 3 : avg >= 70 ? 2 : 1;
    return { avgScore: avg, stars: earnedStars };
  }, [bLines, bestScores, isAllAnswered]);

  const practiceAvg = useMemo(() => {
    if (answeredCount === 0) return 0;
    const total = answeredLines.reduce(
      (acc, line) => acc + (bestScores[line.seq] as number),
      0
    );
    return Math.round(total / answeredCount);
  }, [answeredLines, answeredCount, bestScores]);

  // 全部作答时才保存进度到本地；未答完不调用保存（不发星、不写完成）
  const countedRef = useRef(false);
  useEffect(() => {
    if (!isAllAnswered) return;
    saveDialogueLessonProgress(lesson.lessonId, {
      stars,
      bestScores,
      completedAt: new Date().toISOString(),
    });
    // P0 奖牌：真实通关（stars>0）且未投降才计一次；本组件挂载内只计一次
    if (stars > 0 && !assisted && !countedRef.current) {
      countedRef.current = true;
      incDialogueClear(lesson.lessonId);
    }
  }, [lesson.lessonId, isAllAnswered, stars, bestScores, assisted]);

  return (
    <div className="space-y-6">
      {/* 结算卡片 */}
      <div className="rounded-[20px] border border-[#D3E4DE] bg-white p-6 sm:p-8 shadow-sm text-center space-y-6">
        <div className="flex flex-col items-center justify-center space-y-3">
          {isAllAnswered ? (
            <>
              <img
                src="/assets/gangan/gangan_celebrate.webp"
                alt="敢敢庆祝"
                className="size-24 rounded-3xl object-contain drop-shadow-md"
              />
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-black text-[#123B3C] tracking-tight">
                  本课角色扮演完成！
                </h2>
                <p className="text-sm font-bold text-[#4E6B69]">
                  全课角色扮演均分：<span className="text-[#0F7B7A] text-base tabular-nums">{avgScore} 分</span>
                </p>
              </div>

              {/* 获星展示 */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {[1, 2, 3].map((starIdx) => (
                  <StarIcon
                    key={starIdx}
                    className={`size-10 ${
                      starIdx <= stars
                        ? "fill-[#F2A93B] text-[#F2A93B] scale-110"
                        : "fill-none text-[#D3E4DE]"
                    } transition-transform`}
                  />
                ))}
              </div>
              <div className="text-xs font-black text-[#0A5E5D] bg-[#E7F2EF] px-3 py-1 rounded-full border border-[#D3E4DE]">
                {stars === 3
                  ? "均分达标，获得三星。"
                  : stars === 2
                  ? "表现良好，获得二星。"
                  : "完成本课，获得一星。"}
              </div>
              {maxStreak >= 3 && (
                <div className="rotate-[-1deg] rounded-full border-2 border-wood-ink bg-parchment-light px-3 py-1 text-xs font-black text-wood-ink shadow-[2.5px_2.5px_0_var(--wood-ink)]">
                  本课最高连对 ×{maxStreak}
                </div>
              )}
            </>
          ) : (
            <>
              <img
                src="/assets/gangan/gangan_avatar240.png"
                alt="敢敢"
                className="size-20 rounded-2xl border border-[#D3E4DE] bg-[#E7F2EF] p-1 object-cover shadow-2xs"
              />
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-black text-[#123B3C] tracking-tight">
                  还差 {bLines.length - answeredCount} 句台词没有练习
                </h2>
                <p className="text-sm font-bold text-[#4E6B69]">
                  已完成练习：<span className="text-[#0F7B7A] text-base font-black tabular-nums">{answeredCount} / {bLines.length} 句</span>
                  {answeredCount > 0 && (
                    <span className="ml-2 text-[#4E6B69] font-medium">
                      （已练习句均分：<span className="text-[#0F7B7A] font-bold tabular-nums">{practiceAvg} 分</span>）
                    </span>
                  )}
                </p>
              </div>
              <div className="text-xs font-bold text-[#4E6B69] bg-[#F3FAF8] px-3.5 py-1.5 rounded-full border border-[#D3E4DE]">
                完成全部台词后可生成本课评星。
              </div>
            </>
          )}
        </div>

        {/* 各行得分回顾列表 */}
        <div className="rounded-2xl border border-[#D3E4DE] bg-[#F3FAF8] p-5 text-left space-y-3">
          <div className="text-xs font-black text-[#123B3C] flex items-center gap-1.5">
            <AwardIcon className="size-4 text-[#0F7B7A]" />
            <span>我的台词得分回顾 ({bLines.length} 句)</span>
          </div>

          <div className="space-y-2">
            {bLines.map((line) => {
              const hasScore = typeof bestScores[line.seq] === "number";
              const score = bestScores[line.seq];
              return (
                <div
                  key={line.seq}
                  className="flex items-center justify-between rounded-xl bg-white p-3 border border-[#D3E4DE]"
                >
                  <div className="space-y-0.5 pr-3">
                    <div className="text-xs font-bold text-[#4E6B69]">
                      Line #{line.seq}
                    </div>
                    <div className="text-sm font-black text-[#123B3C] font-serif">
                      {line.text}
                    </div>
                    <div className="text-xs font-medium text-[#4E6B69]">
                      {line.translation}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-wrap items-center justify-end gap-1.5 text-right">
                    {hasScore ? (
                      <>
                        <span
                          className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg border ${
                            score >= 75
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : score >= 60
                              ? "bg-[#E7F2EF] text-[#0A5E5D] border-[#0F7B7A]/30"
                              : "bg-amber-50 text-amber-900 border-amber-300"
                          }`}
                        >
                          {score}分 · {score >= 60 ? "读完 ✓" : "这一句再练一次"}
                        </span>
                        {score >= 75 && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">
                            <AwardIcon className="size-3.5 text-emerald-600" />
                            <span>发音达标</span>
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-sm font-bold px-2.5 py-1 rounded-lg border bg-slate-100 text-[#4E6B69] border-[#D3E4DE]">
                        未作答
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {!isAllAnswered && onContinueRolePlay && (
            <Button
              size="lg"
              onClick={onContinueRolePlay}
              className="w-full sm:w-auto rounded-2xl bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-black px-8 h-12 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span>继续角色扮演</span>
              <ChevronRightIcon className="size-4" />
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            onClick={onReplay}
            className="w-full sm:w-auto rounded-2xl border-[#D3E4DE] bg-[#F3FAF8] hover:bg-[#E7F2EF] text-[#123B3C] font-black px-8 h-12 flex items-center justify-center gap-2"
          >
            <RotateCcwIcon className="size-4 text-[#0F7B7A]" />
            <span>{isAllAnswered ? "再来一遍" : "从头学习"}</span>
          </Button>

          <Button
            size="lg"
            variant={isAllAnswered ? "default" : "outline"}
            onClick={onBack}
            className={
              isAllAnswered
                ? "w-full sm:w-auto rounded-2xl bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-black px-8 h-12 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                : "w-full sm:w-auto rounded-2xl border-[#D3E4DE] bg-white hover:bg-[#F3FAF8] text-[#123B3C] font-bold px-8 h-12 flex items-center justify-center gap-2"
            }
          >
            <span>返回课程列表</span>
            {isAllAnswered && <ChevronRightIcon className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
