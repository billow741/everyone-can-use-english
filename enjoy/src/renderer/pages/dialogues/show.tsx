import React, { useEffect, useState, useRef, useMemo, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { AppSettingsProviderContext } from "@renderer/context";
import { usePronunciationAssessments } from "@renderer/hooks";
import { Button } from "@renderer/components/ui";
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
} from "lucide-react";
import {
  getDialogueLesson,
  saveDialogueLessonProgress,
  getDialogueProgress,
  DialogueLesson,
  DialogueLine,
  DialogueVariant,
} from "@renderer/lib/dialogue-service";
import { speakGanganPrompt, stopGanganPrompt } from "@renderer/lib/phonics-audio-fx";

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

  // 步骤切换与解锁
  const goToStep = (step: number) => {
    stopActiveAudio();
    setCurrentStep(step);
    setMaxStep((prev) => Math.max(prev, step));
  };

  // 记录单行最好成绩
  const recordBestScore = (seq: number, score: number) => {
    setBestScores((prev) => ({
      ...prev,
      [seq]: Math.max(prev[seq] || 0, score),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center space-y-3 bg-[#FAF8F5]">
        <div className="size-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
        <p className="text-sm font-bold text-slate-600">正在进入课堂...</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center space-y-4 bg-[#FAF8F5] p-6 text-center">
        <p className="text-base font-bold text-rose-700">{error || "课程不存在"}</p>
        <Button onClick={() => navigate("/dialogues")} className="rounded-xl bg-amber-500 text-white">
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
    <div className="min-h-full w-full bg-[#FAF8F5] pb-24 text-slate-900">
      {/* 顶部导航与步骤条 */}
      <div className="sticky top-0 z-20 border-b border-amber-200/70 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopActiveAudio();
              navigate("/dialogues");
            }}
            className="flex items-center gap-1 font-bold text-slate-600 hover:bg-amber-100/60 hover:text-slate-900"
          >
            <ArrowLeftIcon className="size-4" />
            <span>返回列表</span>
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-slate-900">
              {lesson.sceneZh}
              {partLabel ? `（${partLabel}）` : ""}
            </h1>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200">
              {lesson.theme} · {lesson.ageBand}岁
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
              return (
                <button
                  key={step}
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && goToStep(step)}
                  className={`flex flex-col items-center justify-center rounded-xl py-1.5 px-1 text-center transition-all ${
                    isCurrent
                      ? "bg-amber-400 text-slate-950 font-black shadow-xs scale-102"
                      : isUnlocked
                      ? "bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 font-bold cursor-pointer"
                      : "bg-slate-100 text-slate-400 font-medium cursor-not-allowed opacity-60"
                  }`}
                >
                  <span className="text-xs sm:text-sm truncate w-full">{name}</span>
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
          />
        )}

        {currentStep === 4 && (
          <Step4RolePlay
            lesson={lesson}
            playAudioFile={playAudioFile}
            stopActiveAudio={stopActiveAudio}
            bestScores={bestScores}
            onRecordScore={recordBestScore}
            onNext={() => goToStep(5)}
          />
        )}

        {currentStep === 5 && (
          <Step5Summary
            lesson={lesson}
            bestScores={bestScores}
            onReplay={() => goToStep(1)}
            onBack={() => navigate("/dialogues")}
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// 录音与发音评测组件 (统一复用现有评测链路)
// ==========================================
interface AssessmentResultWidgetProps {
  referenceText: string;
  onAssessmentCompleted: (score: number) => void;
  bestScore?: number;
  passThreshold?: number; // 及格分，默认 60
}

function DialogueVoiceRecorder({
  referenceText,
  onAssessmentCompleted,
  bestScore,
  passThreshold = 60,
}: AssessmentResultWidgetProps) {
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const { createAssessment } = usePronunciationAssessments();

  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // 录音结束自动触发评测
  useEffect(() => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    setRecordedUrl(url);

    const runAssess = async () => {
      setIsSubmitting(true);
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
        });

        const score =
          typeof created?.pronunciationScore === "number"
            ? created.pronunciationScore
            : 75;

        setLatestScore(score);
        onAssessmentCompleted(score);
      } catch (err) {
        console.error("Pronunciation assessment failed:", err);
      } finally {
        setIsSubmitting(false);
      }
    };

    runAssess();
  }, [recordingBlob]);

  const handlePlayMyRecording = () => {
    if (!recordedUrl) return;
    if (isPlayingRecorded && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingRecorded(false);
      return;
    }
    const audio = new Audio(recordedUrl);
    audioRef.current = audio;
    setIsPlayingRecorded(true);
    audio.onended = () => setIsPlayingRecorded(false);
    audio.onerror = () => setIsPlayingRecorded(false);
    audio.play().catch(() => setIsPlayingRecorded(false));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* 录音主按钮 */}
        {!isRecording ? (
          <Button
            size="sm"
            onClick={startRecording}
            disabled={isSubmitting}
            className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-black text-white shadow-sm flex items-center gap-1.5 px-4 h-10"
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
            className="rounded-2xl border-amber-300 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 flex items-center gap-1.5 h-10 px-3"
          >
            <Volume2Icon className="size-4 text-amber-600" />
            <span>{isPlayingRecorded ? "暂停回放" : "听我的录音"}</span>
          </Button>
        )}

        {/* 评测中状态 */}
        {isSubmitting && (
          <div className="flex items-center gap-2 text-xs font-black text-amber-700 bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-300">
            <div className="size-3.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
            <span>AI 外教正在打分...</span>
          </div>
        )}

        {/* 得分与及格状态展示 */}
        {latestScore !== null && !isSubmitting && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs border ${
              latestScore >= passThreshold
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-orange-50 text-orange-800 border-orange-300"
            }`}
          >
            {latestScore >= passThreshold ? (
              <CheckCircle2Icon className="size-4 text-emerald-600" />
            ) : (
              <span className="text-orange-600">💪</span>
            )}
            <span>本次得分: {latestScore}分</span>
            {latestScore >= passThreshold ? (
              <span className="ml-1 text-[11px] font-bold text-emerald-700">（过关）</span>
            ) : (
              <span className="ml-1 text-[11px] font-bold text-orange-700">（未及格，请重试）</span>
            )}
          </div>
        )}

        {typeof bestScore === "number" && bestScore > 0 && (
          <span className="text-[11px] font-bold text-slate-500">
            历史最好: {bestScore}分
          </span>
        )}
      </div>
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
    setIsPlayingTts(true);
    speakGanganPrompt(introText, {
      onEnd: () => setIsPlayingTts(false),
    });
  };

  // 进入页面自动朗读一次
  useEffect(() => {
    handlePlayTts();
    return () => {
      stopGanganPrompt();
    };
  }, [introText]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border-2 border-amber-300/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/gangan/gangan_avatar240.png"
              alt="敢敢伴学"
              className="size-14 rounded-2xl border-2 border-amber-200 bg-amber-50 p-1 object-cover shadow-2xs"
            />
            <div>
              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                第一步 · 情景导入
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {lesson.sceneZh}
              </h2>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={isPlayingTts ? () => { stopGanganPrompt(); setIsPlayingTts(false); } : handlePlayTts}
            className="rounded-2xl border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold flex items-center gap-1.5 h-10 px-4"
          >
            {isPlayingTts ? (
              <>
                <VolumeXIcon className="size-4 text-amber-600 animate-pulse" />
                <span>停止朗读</span>
              </>
            ) : (
              <>
                <Volume2Icon className="size-4 text-amber-600" />
                <span>重新听介绍</span>
              </>
            )}
          </Button>
        </div>

        {/* 导入文案卡片 */}
        <div className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/60 p-5 sm:p-7 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-amber-900">
            <SparklesIcon className="size-4 text-amber-600" />
            <span>情景导语（敢敢老师为你导读）</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed">
            {introText}
          </p>
        </div>

        {/* 底部行动按钮 */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-bold text-slate-500">
            听完情景介绍后，准备好进入整篇对话听力啦！
          </div>
          <Button
            size="lg"
            onClick={() => {
              stopGanganPrompt();
              onNext();
            }}
            className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-black text-white shadow-md hover:shadow-lg px-8 flex items-center gap-2 text-sm cursor-pointer"
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

  const lines = lesson.lines;
  const isPlayingRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  const playSequenceFrom = async (startIndex: number) => {
    isPlayingRef.current = true;
    setIsPlaying(true);

    for (let i = startIndex; i < lines.length; i++) {
      if (!isPlayingRef.current) break;
      setCurrentIndex(i);
      const line = lines[i];

      if (line.lineType === "narration") {
        // narration 行不播原声，以字幕条形式闪过其译文
        setNarrationSubtitle(line.translation);
        await new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, 2400);
        });
        setNarrationSubtitle(null);
      } else {
        // spoken/mixed/response 行播原声
        setNarrationSubtitle(null);
        await playAudioFile(line.audio);
        // 行间短暂停顿
        await new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, 400);
        });
      }
    }

    if (isPlayingRef.current) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      // 播完自动进下一步
      onNext();
    }
  };

  useEffect(() => {
    playSequenceFrom(0);
    return () => {
      isPlayingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      stopActiveAudio();
    };
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      stopActiveAudio();
    } else {
      playSequenceFrom(currentIndex);
    }
  };

  const handleRestart = () => {
    isPlayingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    stopActiveAudio();
    setCurrentIndex(0);
    playSequenceFrom(0);
  };

  return (
    <div className="space-y-4">
      {/* 顶部控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-200/80 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
            第二步 · 听对话 ({currentIndex + 1}/{lines.length})
          </span>
          <span className="text-xs font-bold text-slate-500">
            原声连播 · 纯英文浸润
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRestart}
            className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 text-xs h-9"
          >
            <RotateCcwIcon className="size-3.5 mr-1" />
            <span>从头重播</span>
          </Button>

          <Button
            size="sm"
            onClick={handleTogglePlay}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 font-black text-white text-xs h-9 px-4"
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
              isPlayingRef.current = false;
              stopActiveAudio();
              onNext();
            }}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-white text-xs h-9 px-4"
          >
            <span>下一步（逐句精学）</span>
            <ChevronRightIcon className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* 旁白字幕闪烁条 */}
      {narrationSubtitle && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-200/90 p-4 text-center text-sm font-black text-amber-950 shadow-md animate-bounce">
          🎬 场景旁白：{narrationSubtitle}
        </div>
      )}

      {/* 对话行列表（高亮当前行，只显示英文） */}
      <div className="space-y-3 rounded-3xl border-2 border-amber-200/80 bg-white p-4 sm:p-6 shadow-sm">
        {lines.map((line, idx) => {
          const isActive = idx === currentIndex;
          const isA = line.speaker === "A";

          if (line.lineType === "narration") {
            return (
              <div
                key={line.seq}
                className={`rounded-2xl p-3 text-center text-xs font-bold transition-all ${
                  isActive
                    ? "bg-amber-100 text-amber-900 border-2 border-amber-300"
                    : "bg-slate-50 text-slate-500 border border-slate-200/70"
                }`}
              >
                🎬 [场景情景旁白]
              </div>
            );
          }

          return (
            <div
              key={line.seq}
              className={`flex items-start gap-3 rounded-2xl p-4 transition-all duration-300 ${
                isActive
                  ? "bg-amber-50 border-2 border-amber-400 shadow-xs scale-101"
                  : "bg-slate-50/70 border border-slate-200/60"
              }`}
            >
              {/* 头像 */}
              <div className="shrink-0">
                {isA ? (
                  <div className="size-10 rounded-2xl bg-amber-200 border border-amber-300 flex items-center justify-center font-black text-xs text-amber-950 shadow-2xs">
                    敢敢
                  </div>
                ) : (
                  <div className="size-10 rounded-2xl bg-emerald-200 border border-emerald-300 flex items-center justify-center font-black text-xs text-emerald-950 shadow-2xs">
                    我
                  </div>
                )}
              </div>

              {/* 仅英文台词 */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-slate-500">
                    {isA ? "角色 A (敢敢)" : "角色 B (学生)"}
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-200/80 px-2 py-0.5 rounded-full">
                      <Volume2Icon className="size-3 animate-pulse" />
                      正在播放
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {line.text}
                </p>
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
function Step3Study({
  lesson,
  playAudioFile,
  stopActiveAudio,
  bestScores,
  onRecordScore,
  onNext,
}: {
  lesson: DialogueLesson;
  playAudioFile: (filename: string) => Promise<void>;
  stopActiveAudio: () => void;
  bestScores: Record<number, number>;
  onRecordScore: (seq: number, score: number) => void;
  onNext: () => void;
}) {
  // narration 行跳过，不出现在精学队列
  const studyLines = useMemo(
    () => lesson.lines.filter((l) => l.lineType !== "narration"),
    [lesson]
  );

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [showChineseMap, setShowChineseMap] = useState<Record<number, boolean>>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const currentLine = studyLines[activeIdx] || studyLines[0];

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
    <div className="space-y-5">
      {/* 顶部指示与翻句控制器 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-200/80 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
            第三步 · 逐句精学
          </span>
          <span className="text-xs font-bold text-slate-500">
            句子 {activeIdx + 1} / {studyLines.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={activeIdx <= 0}
            onClick={() => {
              stopActiveAudio();
              setActiveIdx((p) => Math.max(0, p - 1));
            }}
            className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 text-xs h-9"
          >
            <ChevronLeftIcon className="size-3.5 mr-1" />
            <span>上一句</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={activeIdx >= studyLines.length - 1}
            onClick={() => {
              stopActiveAudio();
              setActiveIdx((p) => Math.min(studyLines.length - 1, p + 1));
            }}
            className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 text-xs h-9"
          >
            <span>下一句</span>
            <ChevronRightIcon className="size-3.5 ml-1" />
          </Button>

          <Button
            size="sm"
            onClick={() => {
              stopActiveAudio();
              onNext();
            }}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-white text-xs h-9 px-4"
          >
            <span>进入角色扮演</span>
            <ChevronRightIcon className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* 句子卡片 */}
      {currentLine && (
        <div className="rounded-3xl border-2 border-amber-300/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* 卡片头部 */}
          <div className="flex items-center justify-between border-b border-amber-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-900 border border-amber-200">
                {currentLine.speaker === "A" ? "角色 A · 敢敢" : "角色 B · 学生"}
              </span>
              <span className="text-xs font-bold text-slate-500">
                Seq #{currentLine.seq}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePlayLineAudio(currentLine.audio)}
              disabled={isPlayingAudio}
              className="rounded-2xl border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-black text-xs h-10 px-4 flex items-center gap-1.5 shadow-2xs"
            >
              <Volume2Icon className={`size-4 text-amber-600 ${isPlayingAudio ? "animate-pulse" : ""}`} />
              <span>{isPlayingAudio ? "正在播放示范..." : "听原声示范"}</span>
            </Button>
          </div>

          {/* 英文正文 */}
          <div className="space-y-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif tracking-wide leading-snug">
              {currentLine.text}
            </div>

            {/* 中文译文（默认收起，点「看中文」展开） */}
            <div className="pt-1">
              {showChineseMap[currentLine.seq] ? (
                <div className="flex items-center justify-between rounded-2xl bg-amber-50/80 border border-amber-200 p-3.5">
                  <p className="text-sm font-bold text-amber-950">
                    {currentLine.translation}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleChinese(currentLine.seq)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 h-8 px-2 flex items-center gap-1"
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
                  className="text-xs font-bold text-amber-700 hover:bg-amber-50 h-8 px-3 rounded-xl flex items-center gap-1.5 border border-amber-200/60"
                >
                  <EyeIcon className="size-3.5 text-amber-600" />
                  <span>看中文译文</span>
                </Button>
              )}
            </div>
          </div>

          {/* 跟读评测区 */}
          <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-5 space-y-3">
            <div className="text-xs font-black text-amber-900">
              🎤 智能跟读与打分（测测你的发音纯正度）
            </div>
            <DialogueVoiceRecorder
              key={currentLine.seq}
              referenceText={currentLine.text}
              bestScore={currentBest}
              passThreshold={60}
              onAssessmentCompleted={(score) => {
                onRecordScore(currentLine.seq, score);
              }}
            />
          </div>
        </div>
      )}

      {/* 底部快速跳转条 */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2">
        {studyLines.map((l, i) => {
          const score = bestScores[l.seq];
          return (
            <button
              key={l.seq}
              onClick={() => {
                stopActiveAudio();
                setActiveIdx(i);
              }}
              className={`size-8 rounded-xl text-xs font-black shrink-0 transition-all ${
                i === activeIdx
                  ? "bg-amber-400 text-slate-950 ring-2 ring-amber-500 scale-105"
                  : typeof score === "number" && score >= 60
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-white text-slate-600 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 步骤 4：角色扮演 (Role Play · 学生演 B)
// ==========================================
function Step4RolePlay({
  lesson,
  playAudioFile,
  stopActiveAudio,
  bestScores,
  onRecordScore,
  onNext,
}: {
  lesson: DialogueLesson;
  playAudioFile: (filename: string) => Promise<void>;
  stopActiveAudio: () => void;
  bestScores: Record<number, number>;
  onRecordScore: (seq: number, score: number) => void;
  onNext: () => void;
}) {
  const lines = lesson.lines;
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

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [bLinePassedMap, setBLinePassedMap] = useState<Record<number, boolean>>({});
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
    <div className="space-y-5">
      {/* 顶部状态提示条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-200/80 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
            第四步 · 角色扮演
          </span>
          <span className="text-xs font-bold text-slate-500">
            你扮演角色 B (学生) · 进度 {currentIndex + 1}/{lines.length}
          </span>
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
            className="rounded-xl border-amber-200 bg-amber-50 text-amber-900 font-bold hover:bg-amber-100 text-xs h-9"
          >
            <RotateCcwIcon className="size-3.5 mr-1" />
            <span>重新开始扮演</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              stopActiveAudio();
              onNext();
            }}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-white text-xs h-9 px-4"
          >
            <span>直接去小结</span>
            <ChevronRightIcon className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* 旁白即时字幕条 */}
      {narrationSubtitle && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-200/90 p-4 text-center text-sm font-black text-amber-950 shadow-md">
          🎬 情景旁白：{narrationSubtitle}
        </div>
      )}

      {/* 当前角色扮演主台词舞台 */}
      {currentLine && (
        <div className="rounded-3xl border-2 border-amber-300/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* A 角色正在说话 */}
          {currentLine.speaker === "A" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/gangan/gangan_avatar240.png"
                  alt="敢敢"
                  className="size-14 rounded-2xl border-2 border-amber-200 bg-amber-50 p-1 object-cover shadow-2xs"
                />
                <div>
                  <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    敢敢正在说话...
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-0.5">
                    <Volume2Icon className="size-3.5 text-amber-600 animate-pulse" />
                    <span>认真听敢敢的提问哦</span>
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
                      <div className="inline-block rounded-xl bg-amber-100/80 border border-amber-300 px-3 py-1 text-xs font-black text-amber-900">
                        🎬 场景情景: [{mixedInfo.sceneNoteZh || mixedInfo.sceneNoteEn}]
                      </div>
                    )}
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif leading-snug">
                      {mixedInfo.spokenTextEn}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* B 角色（学生）轮到我说话 */}
          {currentLine.speaker === "B" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-amber-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-black text-base shadow-sm">
                    我
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      轮到你了！扮演角色 B
                    </span>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      大声读出下面这句话，分数 ≥ 60 即可过关！
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReplayBDemo}
                  disabled={isPlayingDemo}
                  className="rounded-2xl border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-black text-xs h-10 px-4 flex items-center gap-1.5"
                >
                  <Volume2Icon className={`size-4 text-amber-600 ${isPlayingDemo ? "animate-pulse" : ""}`} />
                  <span>{isPlayingDemo ? "正在示范中..." : "重播示范原声"}</span>
                </Button>
              </div>

              {/* 期望答案英文（B 行始终以主线 text 为准） */}
              <div className="space-y-2">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-serif tracking-wide leading-snug">
                  {currentLine.text}
                </div>
                <div className="text-sm font-bold text-slate-600">
                  {currentLine.translation}
                </div>
              </div>

              {/* 跟读评测与录音打分 */}
              <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-5 space-y-4">
                <DialogueVoiceRecorder
                  key={currentLine.seq}
                  referenceText={currentLine.text}
                  bestScore={bestScores[currentLine.seq]}
                  passThreshold={60}
                  onAssessmentCompleted={(score) => {
                    onRecordScore(currentLine.seq, score);
                    setBLatestScore(score);
                    if (score >= 60) {
                      setBLinePassedMap((p) => ({ ...p, [currentLine.seq]: true }));
                    }
                  }}
                />

                {/* 变体机关：B 行变体在评测后以「还可以这样说」形式展示 */}
                {bLatestScore !== null && currentLine.variants && currentLine.variants.length > 0 && (
                  <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                      <SparklesIcon className="size-4 text-amber-600" />
                      <span>💡 还可以这样说（地道口语拓展）:</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {currentLine.variants.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between rounded-xl bg-amber-50/70 p-3 border border-amber-200/80"
                        >
                          <div>
                            <div className="text-sm font-black text-slate-900 font-serif">
                              {v.text}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-0.5">
                              {v.translation}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudioFile(v.audio)}
                            className="size-8 p-0 rounded-full bg-white hover:bg-amber-100 border border-amber-300 text-amber-800"
                          >
                            <Volume2Icon className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 及格后下一句按钮 */}
                {bLinePassedMap[currentLine.seq] && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={advanceToNextLine}
                      className="rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-black text-white h-11 px-6 shadow-md flex items-center gap-1.5 text-sm"
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
  onReplay,
  onBack,
}: {
  lesson: DialogueLesson;
  bestScores: Record<number, number>;
  onReplay: () => void;
  onBack: () => void;
}) {
  // 角色扮演各 B 行最好分
  const bLines = useMemo(
    () => lesson.lines.filter((l) => l.speaker === "B"),
    [lesson]
  );

  const { avgScore, stars } = useMemo(() => {
    if (bLines.length === 0) return { avgScore: 90, stars: 3 };
    const total = bLines.reduce(
      (acc, line) => acc + (bestScores[line.seq] || 0),
      0
    );
    const avg = Math.round(total / bLines.length);
    // 均分 ≥85 三星 / ≥70 二星 / 完成一星
    const earnedStars = avg >= 85 ? 3 : avg >= 70 ? 2 : 1;
    return { avgScore: avg, stars: earnedStars };
  }, [bLines, bestScores]);

  // 保存进度到本地
  useEffect(() => {
    saveDialogueLessonProgress(lesson.lessonId, {
      stars,
      bestScores,
      completedAt: new Date().toISOString(),
    });
  }, [lesson.lessonId, stars, bestScores]);

  return (
    <div className="space-y-6">
      {/* 结算通关卡片 */}
      <div className="rounded-3xl border-2 border-amber-300/80 bg-white p-6 sm:p-8 shadow-sm text-center space-y-6">
        <div className="flex flex-col items-center justify-center space-y-3">
          <img
            src="/assets/gangan/gangan_celebrate.webp"
            alt="敢敢庆祝"
            className="size-24 rounded-3xl object-contain drop-shadow-md"
          />
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              🎉 挑战成功！完成本课扮演！
            </h2>
            <p className="text-sm font-bold text-slate-600">
              全课角色扮演均分：<span className="text-amber-600 text-base">{avgScore}分</span>
            </p>
          </div>

          {/* 获星展示 */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3].map((starIdx) => (
              <StarIcon
                key={starIdx}
                className={`size-10 ${
                  starIdx <= stars
                    ? "fill-amber-400 text-amber-500 scale-110"
                    : "fill-slate-100 text-slate-300"
                } transition-transform`}
              />
            ))}
          </div>
          <div className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            {stars === 3
              ? "太出色啦！荣获三星通关 🌟🌟🌟"
              : stars === 2
              ? "表现优异！荣获二星通关 🌟🌟"
              : "顺利通关！获得一星奖励 🌟"}
          </div>
        </div>

        {/* 各行得分回顾列表 */}
        <div className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 p-5 text-left space-y-3">
          <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
            <AwardIcon className="size-4 text-amber-600" />
            <span>我的台词得分回顾 ({bLines.length} 句)</span>
          </div>

          <div className="space-y-2">
            {bLines.map((line) => {
              const score = bestScores[line.seq] || 0;
              return (
                <div
                  key={line.seq}
                  className="flex items-center justify-between rounded-xl bg-white p-3 border border-amber-200/70"
                >
                  <div className="space-y-0.5 pr-3">
                    <div className="text-xs font-bold text-slate-500">
                      Line #{line.seq}
                    </div>
                    <div className="text-sm font-black text-slate-900 font-serif">
                      {line.text}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      {line.translation}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`text-sm font-black px-2.5 py-1 rounded-lg border ${
                        score >= 85
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : score >= 70
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {score > 0 ? `${score}分` : "已完成"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button
            size="lg"
            variant="outline"
            onClick={onReplay}
            className="w-full sm:w-auto rounded-2xl border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-black px-8 h-12 flex items-center justify-center gap-2"
          >
            <RotateCcwIcon className="size-4" />
            <span>再来一遍</span>
          </Button>

          <Button
            size="lg"
            onClick={onBack}
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black px-8 h-12 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <span>返回课程列表</span>
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
