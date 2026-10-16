import React, { useState, useEffect, useRef, useContext } from "react";
import {
  MicIcon,
  SquareIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  SparklesIcon,
  CheckCircle2Icon,
  Volume2Icon,
  FlameIcon,
  AwardIcon,
  HelpCircleIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Input,
} from "@renderer/components/ui";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { usePronunciationAssessments } from "@renderer/hooks";
import { AppSettingsProviderContext } from "@renderer/context";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { playPhonemeSound, hasPhonemeAudio } from "@renderer/lib/phoneme-data";

export interface CandidateTarget {
  label: string;
  word: string;
  ipa: string;
  translation?: string;
  isPhoneme?: boolean;
}

interface PhonemeRecordingStationProps {
  phoneme: string;
  sampleWord: string;
  candidateTargets?: CandidateTarget[];
  chineseExplanation?: string;
  selectedTargetWord?: string;
  onAssessmentDone?: (score: number) => void;
}

export const PhonemeRecordingStation: React.FC<PhonemeRecordingStationProps> = ({
  phoneme,
  sampleWord,
  candidateTargets = [],
  chineseExplanation,
  selectedTargetWord,
  onAssessmentDone,
}) => {
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const { createAssessment } = usePronunciationAssessments();

  // 默认练习目标列表（包含纯单音与核心词）
  const allTargets: CandidateTarget[] = [
    {
      label: `单音 /${phoneme}/`,
      word: phoneme,
      ipa: `/${phoneme}/`,
      translation: "纯正单音",
      isPhoneme: true,
    },
    {
      label: `核心词 ${sampleWord}`,
      word: sampleWord,
      ipa: `/${sampleWord}/`,
      translation: "代表词",
      isPhoneme: false,
    },
    ...candidateTargets.filter((c) => c.word.toLowerCase() !== sampleWord.toLowerCase()),
  ];

  const [customTargets, setCustomTargets] = useState<CandidateTarget[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInputText, setCustomInputText] = useState("");

  const combinedTargets = [...allTargets, ...customTargets];

  const [currentTarget, setCurrentTarget] = useState<CandidateTarget>(allTargets[0]);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 响应外部传入的目标词
  useEffect(() => {
    if (!selectedTargetWord) return;
    const match = allTargets.find(
      (t) => t.word.toLowerCase() === selectedTargetWord.toLowerCase()
    );
    if (match) {
      setCurrentTarget(match);
      setRecordedUrl(null);
      setAssessmentResult(null);
    }
  }, [selectedTargetWord]);

  // 当音标或基础词变化时，同步更新默认目标
  useEffect(() => {
    setCurrentTarget(allTargets[0]);
    setRecordedUrl(null);
    setAssessmentResult(null);
  }, [phoneme, sampleWord]);

  // 语音录音器驱动
  const recorder = useAudioRecorder(
    {
      noiseSuppression: true,
      echoCancellation: true,
    },
    (err) => console.warn("AudioRecorder Error:", err)
  );

  const {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
    mediaRecorder,
  } = recorder;

  // 当录音完成产生 Blob 时
  useEffect(() => {
    if (recordingBlob) {
      const url = URL.createObjectURL(recordingBlob);
      setRecordedUrl(url);
      setAssessmentResult(null); // 清理上一次评测结果，等待本次提交
    }
  }, [recordingBlob]);

  // 切换目标时重置录音
  const handleSelectTarget = (target: CandidateTarget) => {
    if (isRecording) stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingRecorded(false);
    }
    setCurrentTarget(target);
    setRecordedUrl(null);
    setAssessmentResult(null);
  };

  // 添加自定义目标（如用户输入的 tr, train, thought 等）
  const handleAddCustomTarget = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = customInputText.trim();
    if (!text) return;
    const isPhoneme = hasPhonemeAudio(text);
    const newTarget: CandidateTarget = {
      label: isPhoneme ? `音素: ${text}` : `自定义: ${text}`,
      word: text,
      ipa: `/${text}/`,
      translation: isPhoneme ? "纯正音标" : "自定义发音",
      isPhoneme: isPhoneme,
    };
    setCustomTargets((prev) => [...prev, newTarget]);
    handleSelectTarget(newTarget);
    setCustomInputText("");
    setIsAddingCustom(false);
  };

  // 播放标准参考发音
  const handlePlayStandard = () => {
    if (isPlayingRef) return;
    setIsPlayingRef(true);

    if (currentTarget.isPhoneme || hasPhonemeAudio(currentTarget.word)) {
      playPhonemeSound(currentTarget.word, {
        onEnd: () => setIsPlayingRef(false),
      });
    } else {
      playStandardTts(currentTarget.word, {
        onEnd: () => setIsPlayingRef(false),
      });
    }
  };

  // 播放用户自己刚录制的声音
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

  // 提交 AI 智能评测
  const handleSubmitAssessment = async () => {
    if (!recordingBlob) return;
    setIsSubmitting(true);

    try {
      let rec: any = null;
      const blobUrl = URL.createObjectURL(recordingBlob);
      try {
        rec = await EnjoyApp?.recordings?.create({
          language: learningLanguage || "en-US",
          referenceText: currentTarget.word,
          src: blobUrl,
          blob: {
            type: recordingBlob.type || "audio/webm",
          },
        });
      } catch (dbErr) {
        console.warn("Local DB recording save fallback:", dbErr);
      }

      if (!rec) {
        rec = {
          id: `rec-${Date.now()}`,
          language: learningLanguage || "en-US",
          referenceText: currentTarget.word,
          src: blobUrl,
          duration: recordingTime * 1000 || 3000,
        };
      }
      rec._rawBlob = recordingBlob;
      rec.src = blobUrl;

      const created = await createAssessment({
        language: learningLanguage || "en-US",
        reference: currentTarget.word,
        recording: rec,
      });

      setAssessmentResult(created);
      if (onAssessmentDone && created?.pronunciationScore) {
        onAssessmentDone(created.pronunciationScore);
      }
    } catch (err: any) {
      console.error("Pronunciation assessment failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重新录制
  const handleResetRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingRecorded(false);
    }
    setRecordedUrl(null);
    setAssessmentResult(null);
  };

  // 评测等级与得分徽章
  const score = assessmentResult?.pronunciationScore || 0;
  const isHighScore = score >= 85;
  const isMidScore = score >= 70 && score < 85;

  return (
    <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent pb-3.5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center text-sm font-black shadow-sm">
              🎙️
            </span>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                AI 实时跟读评测与多维波形诊断
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                先听标准音，再按住麦克风跟读录音，AI 引擎将从音准、流利度、完整度给出即时专业诊断
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 self-start sm:self-auto"
          >
            真人发音比对
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 pb-6 space-y-5">
        {/* 1. 目标选择 Chip 栏 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <FlameIcon className="size-3.5 text-emerald-500" />
            选择跟读目标：
          </span>
          {combinedTargets.map((item, idx) => {
            const isSelected = item.word === currentTarget.word;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectTarget(item)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-105"
                    : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                }`}
              >
                <span>{item.label}</span>
                {item.translation && (
                  <span className={`text-[10px] ${isSelected ? "text-slate-800" : "text-muted-foreground"}`}>
                    ({item.translation})
                  </span>
                )}
              </button>
            );
          })}

          {/* 自定义发音添加按钮与内联输入框 */}
          {isAddingCustom ? (
            <form onSubmit={handleAddCustomTarget} className="flex items-center gap-1.5">
              <Input
                value={customInputText}
                onChange={(e) => setCustomInputText(e.target.value)}
                placeholder="输入发音/单词 (如 tr, train...)"
                autoFocus
                className="h-8 w-44 text-xs rounded-xl px-2.5 bg-background border-emerald-500"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
              >
                添加
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingCustom(false)}
                className="h-8 px-2 text-xs rounded-xl"
              >
                取消
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <PlusIcon className="size-3.5" />
              <span>自定义发音</span>
            </button>
          )}
        </div>

        {/* 2. 录音操纵台主视窗 (包含动态波形与标准音频) */}
        <div className="rounded-2xl border-2 border-border/80 bg-slate-950 text-slate-100 p-4 sm:p-5 shadow-inner">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* 左侧：当前目标大卡与标准音试听 */}
            <div className="flex items-center gap-3.5">
              <div className="size-14 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center font-mono">
                <span className="text-xl font-black text-emerald-400">{currentTarget.word}</span>
                <span className="text-[10px] text-slate-400">{currentTarget.ipa}</span>
              </div>
              <div>
                <div className="text-xs text-slate-400">当前跟读参考</div>
                <div className="text-sm font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{currentTarget.label}</span>
                  {currentTarget.translation && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {currentTarget.translation}
                    </Badge>
                  )}
                </div>
                {/* 听标准音按钮 */}
                <button
                  type="button"
                  onClick={handlePlayStandard}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer transition-colors"
                >
                  <Volume2Icon className={`size-3.5 ${isPlayingRef ? "animate-pulse" : ""}`} />
                  <span>{isPlayingRef ? "正在示范中..." : "👂 听标准发音示范"}</span>
                </button>
              </div>
            </div>

            {/* 右侧：录音按钮与动态波形 */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
              {/* 录音中的动态波形与计时 */}
              {isRecording ? (
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/40">
                  <span className="size-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {Math.floor(recordingTime / 60)}:
                    {String(recordingTime % 60).padStart(2, "0")}
                  </span>
                  {mediaRecorder && (
                    <LiveAudioVisualizer
                      mediaRecorder={mediaRecorder}
                      barWidth={3}
                      gap={2}
                      width={120}
                      height={28}
                      barColor="#10b981"
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={stopRecording}
                    className="h-8 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs gap-1 cursor-pointer"
                  >
                    <SquareIcon className="size-3 fill-current" />
                    <span>完成</span>
                  </Button>
                </div>
              ) : recordedUrl ? (
                /* 录音已完成状态：试听录音、重录、提交打分 */
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePlayMyRecording}
                    className={`h-9 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer border-slate-700 ${
                      isPlayingRecorded ? "bg-emerald-500/20 text-emerald-300 border-emerald-400" : "text-slate-200"
                    }`}
                  >
                    {isPlayingRecorded ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5 fill-current" />}
                    <span>{isPlayingRecorded ? "暂停试听" : "回放我的录音"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetRecording}
                    className="h-9 px-2.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                    title="放弃当前录音重新录制"
                  >
                    <RotateCcwIcon className="size-3.5" />
                    <span>重录</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSubmitAssessment}
                    disabled={isSubmitting}
                    className="h-9 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <SparklesIcon className="size-3.5" />
                    )}
                    <span>{isSubmitting ? "AI 评分中..." : "🚀 立即 AI 评分"}</span>
                  </Button>
                </div>
              ) : (
                /* 准备录音状态 */
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="h-10 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  <MicIcon className="size-4 animate-bounce" />
                  <span>点击开始跟读录音</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 3. 评测结果即时呈现报告卡片 (评分大轮盘 + 4 维指标 + 音素级纠错) */}
        {assessmentResult && (
          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-background to-background space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 顶栏：总分徽章与鼓励语 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
              <div className="flex items-center gap-3">
                <div
                  className={`size-14 rounded-2xl flex flex-col items-center justify-center font-black shadow-md ${
                    isHighScore
                      ? "bg-emerald-500 text-slate-950 shadow-emerald-500/30"
                      : isMidScore
                      ? "bg-amber-500 text-slate-950 shadow-amber-500/30"
                      : "bg-rose-500 text-white shadow-rose-500/30"
                  }`}
                >
                  <span className="text-xl leading-none font-mono">{score}</span>
                  <span className="text-[9px] font-bold mt-0.5">分</span>
                </div>
                <div>
                  <div className="text-sm font-black text-foreground flex items-center gap-1.5">
                    <span>
                      {isHighScore ? "🎉 太棒了！发音极其纯正地道！" : isMidScore ? "👍 良好！音准在线，继续巩固！" : "💪 加油！注意舌位要领，再冲一次！"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    目标单词: <strong className="text-foreground font-mono">{currentTarget.word}</strong> · 发音综合表现评级
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetRecording}
                  className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                >
                  <RotateCcwIcon className="size-3" />
                  <span>再练一次</span>
                </Button>
              </div>
            </div>

            {/* 四大核心维度小雷达 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "准确度 Accuracy", val: assessmentResult.accuracyScore || score },
                { label: "流利度 Fluency", val: assessmentResult.fluencyScore || score },
                { label: "完整度 Completeness", val: assessmentResult.completenessScore || score },
                { label: "音调 Prosody", val: assessmentResult.prosodyScore || score },
              ].map((dim, dIdx) => (
                <div key={dIdx} className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                  <div className="text-[10px] text-muted-foreground font-medium">{dim.label}</div>
                  <div className="text-base font-black font-mono text-foreground mt-0.5">{dim.val}</div>
                  <Progress value={dim.val} className="h-1.5 mt-1.5 bg-muted" />
                </div>
              ))}
            </div>

            {/* 音素级诊断拆解 (Phoneme Breakdown) */}
            {assessmentResult.result?.words?.[0]?.phonemes && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <SparklesIcon className="size-3.5 text-amber-500" />
                    <span>音素逐一诊断 (Phoneme Diagnostic)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">绿色: 优异 | 橙色: 需注意</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {assessmentResult.result.words[0].phonemes.map((phItem: any, pIdx: number) => {
                    const phScore = phItem.pronunciationAssessment?.accuracyScore || 80;
                    const isPhonemeGood = phScore >= 75;
                    return (
                      <div
                        key={pIdx}
                        className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-mono ${
                          isPhonemeGood
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        <span className="text-xs font-black">/{phItem.phoneme}/</span>
                        <span className="text-[10px] font-bold opacity-80">{phScore}分</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
