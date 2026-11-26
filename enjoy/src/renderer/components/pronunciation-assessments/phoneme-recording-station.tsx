import { AUDIO_PALETTE } from "@renderer/lib/audio-palette";
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
  toast,
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
      if (err?.code === "measurement_quota") {
        toast.success(
          "今天的深度评测先到这里，语调和词级反馈照常练，明天继续！"
        );
        return;
      }
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
    <Card className="rounded-[20px] border-[#D3E4DE] bg-white dark:bg-card shadow-[0_1px_3px_rgba(18,59,60,0.04),0_4px_12px_rgba(18,59,60,0.05)] overflow-hidden">
      <CardHeader className="bg-[#E7F2EF]/60 dark:bg-slate-900/50 pb-3.5 border-b border-[#D3E4DE]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-[10px] bg-[#0F7B7A] text-white flex items-center justify-center text-sm font-black shadow-xs">
              <MicIcon className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-[#123B3C] dark:text-foreground">
                第 2 步 · 跟读录音与即时反馈
              </CardTitle>
              <p className="text-xs text-[#4E6B69] dark:text-muted-foreground mt-0.5">
                选单音或例词，点开始录音跟着读，系统即时给出反馈
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-mono border-[#D3E4DE] bg-white text-[#0A5E5D] dark:text-emerald-300 self-start sm:self-auto"
          >
            真人发音比对
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 pb-6 space-y-5">
        {/* 1. 目标选择 Chip 栏（触控热区 >= 44px） */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#4E6B69] shrink-0 mr-1 flex items-center gap-1">
            <FlameIcon className="size-3.5 text-[#96690A]" />
            选择跟读目标：
          </span>
          {combinedTargets.map((item, idx) => {
            const isSelected = item.word === currentTarget.word;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectTarget(item)}
                className={`min-h-[44px] px-3.5 py-2 rounded-[12px] font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#0F7B7A] text-white shadow-xs"
                    : "bg-[#F3FAF8] hover:bg-[#E7F2EF] text-[#123B3C] border border-[#D3E4DE]"
                }`}
              >
                <span>{item.label}</span>
                {item.translation && (
                  <span className={`text-[10px] ${isSelected ? "text-white/90" : "text-[#4E6B69]"}`}>
                    ({item.translation})
                  </span>
                )}
              </button>
            );
          })}

          {/* 自定义发音添加按钮与内联输入框 */}
          {isAddingCustom ? (
            <form onSubmit={handleAddCustomTarget} className="flex items-center gap-1.5 flex-wrap">
              <Input
                value={customInputText}
                onChange={(e) => setCustomInputText(e.target.value)}
                placeholder="输入发音/单词 (如 tr, train...)"
                autoFocus
                className="h-11 w-44 text-base sm:text-xs rounded-[12px] px-3 bg-white border-[#0F7B7A]"
              />
              <Button
                type="submit"
                size="sm"
                className="min-h-[44px] px-3.5 rounded-[12px] bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white font-bold text-xs"
              >
                添加
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingCustom(false)}
                className="min-h-[44px] px-3 text-xs rounded-[12px]"
              >
                取消
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-[12px] text-xs font-bold border border-dashed border-[#0F7B7A]/50 text-[#0A5E5D] dark:text-emerald-300 hover:bg-[#E7F2EF] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <PlusIcon className="size-3.5" />
              <span>自定义发音</span>
            </button>
          )}
        </div>

        {/* 2. 录音操纵台主视窗 */}
        <div className="rounded-[14px] border border-[#123B3C] bg-[#123B3C] text-white p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* 左侧：当前目标大卡与标准音试听 */}
            <div className="flex items-center gap-3.5">
              <div className="size-14 rounded-[12px] bg-[#0A5E5D] border border-white/20 flex flex-col items-center justify-center font-mono">
                <span className="text-xl font-black text-[#F2A93B]">{currentTarget.word}</span>
                <span className="text-[10px] text-white/80">{currentTarget.ipa}</span>
              </div>
              <div>
                <div className="text-xs text-white/75">当前跟读目标</div>
                <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                  <span>{currentTarget.label}</span>
                  {currentTarget.translation && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/15 text-white border-white/20">
                      {currentTarget.translation}
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handlePlayStandard}
                  className="mt-1 min-h-[44px] px-2.5 -ml-2.5 rounded-[10px] inline-flex items-center gap-1.5 text-xs text-[#F2A93B] hover:bg-white/10 font-bold cursor-pointer transition-colors"
                >
                  <Volume2Icon className={`size-3.5 ${isPlayingRef ? "animate-pulse" : ""}`} />
                  <span>{isPlayingRef ? "正在示范中..." : "听标准发音示范"}</span>
                </button>
              </div>
            </div>

            {/* 右侧：录音按钮与动态波形 */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
              {isRecording ? (
                <div className="flex items-center gap-3 px-4 py-2 rounded-[14px] bg-[#0A5E5D] border border-white/25">
                  <span className="size-2.5 rounded-full bg-rose-400 animate-ping" />
                  <span className="text-xs font-mono font-bold text-white">
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
                      barColor={AUDIO_PALETTE.liveVisualizer.barSuccess}
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={stopRecording}
                    className="min-h-[44px] px-3.5 rounded-[12px] bg-[#D9553F] hover:bg-[#C44732] text-white font-bold text-xs gap-1 cursor-pointer"
                  >
                    <SquareIcon className="size-3 fill-current" />
                    <span>完成</span>
                  </Button>
                </div>
              ) : recordedUrl ? (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePlayMyRecording}
                    className={`min-h-[44px] px-3.5 rounded-[12px] text-xs font-bold gap-1.5 cursor-pointer border-white/30 bg-white/10 hover:bg-white/20 ${
                      isPlayingRecorded ? "text-[#F2A93B] border-[#F2A93B]" : "text-white"
                    }`}
                  >
                    {isPlayingRecorded ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5 fill-current" />}
                    <span>{isPlayingRecorded ? "暂停试听" : "回放我的录音"}</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetRecording}
                    className="min-h-[44px] px-3 rounded-[12px] text-xs text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="放弃当前录音重新录制"
                  >
                    <RotateCcwIcon className="size-3.5" />
                    <span>重录</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSubmitAssessment}
                    disabled={isSubmitting}
                    className="min-h-[44px] px-4 rounded-[12px] text-xs font-black bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] gap-1.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <SparklesIcon className="size-3.5" />
                    )}
                    <span>{isSubmitting ? "AI 评分中..." : "提交 AI 评分"}</span>
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={startRecording}
                  className="min-h-[48px] px-6 rounded-[14px] bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-black text-xs sm:text-sm gap-2 shadow-sm cursor-pointer"
                >
                  <MicIcon className="size-4" />
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
                    <SparklesIcon className="size-3.5 text-[#96690A] dark:text-amber-300" />
                    <span>音素逐一诊断 (Phoneme Diagnostic)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">绿色: 优异 | 琥珀: 需注意</span>
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
                            : "bg-[#F2A93B]/15 border-[#F2A93B]/40 text-[#96690A] dark:text-amber-300"
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
