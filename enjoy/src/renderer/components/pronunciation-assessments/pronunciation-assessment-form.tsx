import {
  Button,
  Input,
  SelectContent,
  SelectTrigger,
  SelectValue,
  Select,
  SelectItem,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
  toast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@renderer/components/ui";
import { t } from "i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useContext, useEffect, useState, useRef } from "react";
import { AppSettingsProviderContext } from "@/renderer/context";
import { LANGUAGES } from "@/constants";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckIcon,
  LoaderIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
  XIcon,
  Volume2Icon,
  SparklesIcon,
  ArrowLeftIcon,
  BookOpenIcon,
} from "lucide-react";
import { usePronunciationAssessments } from "@/renderer/hooks";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { WavesurferPlayer } from "@renderer/components/misc/wavesurfer-player";
import { PitchContourOverlay } from "./pitch-contour-overlay";
import { TMM_CURATED_EXERCISES } from "@renderer/data/tmm-curated-exercises";
import {
  findPhonicsWord,
  isPhonicsVowel,
  PhonicsWord,
  playPhonicsTokenSound,
  getPhonicsTokenIpa,
} from "@renderer/lib/open-phonics-service";

const pronunciationAssessmentSchema = z.object({
  file: z.instanceof(FileList).optional(),
  recordingFile: z.instanceof(Blob).optional(),
  language: z.string().min(2),
  referenceText: z.string().optional(),
});

export const PronunciationAssessmentForm = (props?: {
  defaultReferenceText?: string;
  audioUrl?: string;
  translation?: string;
  phonicsFocus?: string;
  bookMeta?: {
    bookId?: string;
    bookTitle?: string;
    page?: number | string;
    returnToModal?: boolean | string;
  };
  onSuccess?: (created?: any) => void;
  onCancel?: () => void;
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryText = searchParams.get("text") || "";
  const initialText = props?.defaultReferenceText || queryText || "";
  const bookId = props?.bookMeta?.bookId || searchParams.get("bookId") || "";
  const bookTitle = props?.bookMeta?.bookTitle || searchParams.get("bookTitle") || "";
  const pageParam = props?.bookMeta?.page !== undefined ? String(props.bookMeta.page) : searchParams.get("page") || "";
  const returnToModal = props?.bookMeta?.returnToModal !== undefined ? String(props.bookMeta.returnToModal) : searchParams.get("returnToModal") || "true";
  const sourceParam = searchParams.get("source") || "";
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const [submitting, setSubmitting] = useState(false);
  const { createAssessment } = usePronunciationAssessments();
  const [phonicsWord, setPhonicsWord] = useState<PhonicsWord | null>(null);

  const form = useForm<z.infer<typeof pronunciationAssessmentSchema>>({
    resolver: zodResolver(pronunciationAssessmentSchema),
    values: {
      language: learningLanguage,
      referenceText: initialText,
    },
  });

  const currentRefText = form.watch("referenceText") || initialText;
  const watchedRecordingFile = form.watch("recordingFile");
  const [recordingUrl, setRecordingUrl] = useState<string>("");

  useEffect(() => {
    if (currentRefText) {
      findPhonicsWord(currentRefText).then((pw) => setPhonicsWord(pw));
    } else {
      setPhonicsWord(null);
    }
  }, [currentRefText]);

  useEffect(() => {
    if (watchedRecordingFile) {
      const url = URL.createObjectURL(watchedRecordingFile);
      setRecordingUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setRecordingUrl("");
    }
  }, [watchedRecordingFile]);

  const fileField = form.register("file");

  const onSubmit = async (
    data: z.infer<typeof pronunciationAssessmentSchema>
  ) => {
    if ((!data.file || data.file.length === 0) && !data.recordingFile) {
      toast.error(t("noFileOrRecording"));
      form.setError("recordingFile", { message: t("noFileOrRecording") });
      return;
    }
    const { language, referenceText } = data;

    let recording: RecordingType;
    try {
      recording = await createRecording(data);
    } catch (err) {
      toast.error(err.message);
    }
    if (!recording) return;

    setSubmitting(true);
    createAssessment({
      language,
      reference: referenceText,
      recording,
    })
      .then((created: any) => {
        let createdResult: any = (created as any)?.result;
        if (typeof createdResult === "string") {
          try {
            createdResult = JSON.parse(createdResult);
          } catch (e) {
            console.warn("parse assessment result failed:", e);
            createdResult = null;
          }
        }
        if (createdResult?.evaluationSource === "simulated-fallback") {
          toast.success("跟读完成，已生成练习反馈（本次为模拟评测）");
        } else {
          toast.success("发音评测完成，已生成精准纠错报告！");
        }
        if (props?.onSuccess) {
          props.onSuccess(created);
        } else {
          const bookParams = bookId
            ? `&bookId=${encodeURIComponent(bookId)}&bookTitle=${encodeURIComponent(bookTitle)}&page=${pageParam}&returnToModal=${returnToModal}`
            : "";
          const sourceQuery = sourceParam ? `&source=${encodeURIComponent(sourceParam)}` : "";
          navigate(`/pronunciation_assessments?selectId=${created?.id || ""}${bookParams}${sourceQuery}`);
        }
      })
      .catch((err) => {
        toast.error(err.message);
        EnjoyApp.recordings.destroy(recording.id);
      })
      .finally(() => setSubmitting(false));
  };

  const createRecording = async (
    data: z.infer<typeof pronunciationAssessmentSchema>
  ): Promise<RecordingType> => {
    const { language, referenceText, file, recordingFile } = data;
    let arrayBuffer: ArrayBuffer;
    let rawBlob: Blob;
    if (recordingFile) {
      rawBlob = recordingFile;
      arrayBuffer = await recordingFile.arrayBuffer();
    } else {
      rawBlob = new Blob([file[0]]);
      arrayBuffer = await rawBlob.arrayBuffer();
    }

    let blobUrl = "";
    try {
      blobUrl = URL.createObjectURL(rawBlob);
    } catch {}

    const rec = await EnjoyApp.recordings.create({
      language,
      referenceText,
      src: blobUrl,
      blob: {
        type: recordingFile?.type || file?.[0]?.type || "audio/wav",
      },
    });

    if (rec) {
      (rec as any)._rawBlob = rawBlob;
      rec.src = blobUrl;
      if (!rec.duration) rec.duration = 5000;
    }
    return rec;
  };

  const SAMPLE_AUDIO_MAP: Record<string, string> = {
    "The brave little lion always speaks English with confidence!": "/assets/audio/today_challenge.mp3",
    "Look at the cute little cat.": "/assets/audio/l1_1.mp3",
    "I love sweet red apples and bananas.": "/assets/audio/l1_2.mp3",
    "Good morning! This is my sunny room.": "/assets/audio/l1_3.mp3",
    "Can you pass me that blue bottle, please?": "/assets/audio/l2_1.mp3",
    "The happy monkey is swinging in the tree.": "/assets/audio/l2_2.mp3",
    "We are having fun building sandcastles together.": "/assets/audio/l2_3.mp3",
    "Practice makes perfect when you keep reading every day!": "/assets/audio/l3_1.mp3",
    "Bright stars shine quietly in the summer night sky.": "/assets/audio/l3_2.mp3",
    "Gangan loves exploring exciting English stories with you.": "/assets/audio/l3_3.mp3",
  };

  const rawAudioParam = props?.audioUrl || searchParams.get("audioUrl") || searchParams.get("audio") || "";
  // 严格过滤全书长音频（如 /audio.mp3），杜绝长音频在单句评测中串音
  const isFullBookAudio =
    rawAudioParam.toLowerCase().endsWith("/audio.mp3") ||
    rawAudioParam.toLowerCase().includes("/audio.mp3?");
  const audioParam = isFullBookAudio ? "" : rawAudioParam;

  // 优先匹配官方 44.1kHz 母语真人切片库
  const tmmMatch = currentRefText
    ? TMM_CURATED_EXERCISES.find(
        (ex) => ex.text.trim().toLowerCase() === currentRefText.trim().toLowerCase()
      )
    : null;
  const tmmAudio = tmmMatch?.audioUrl || "";

  const sentenceAudioMatch =
    tmmAudio ||
    (currentRefText
      ? (SAMPLE_AUDIO_MAP[currentRefText] || SAMPLE_AUDIO_MAP[currentRefText.trim()] || "")
      : "");

  // 外教标准发音示范：保底使用微软最高等级英国牛津音库 Sonia (en-GB-SoniaNeural 纯正英音)
  const fallbackTtsUrl = currentRefText
    ? `/api/ai/tts?text=${encodeURIComponent(currentRefText)}&voice=en-GB-SoniaNeural&rate=-5%`
    : "";
  const effectiveDemoAudio =
    sentenceAudioMatch ||
    audioParam ||
    fallbackTtsUrl ||
    "";

  // 判断是否为 GB 原厂母语切片（TMM 44.1kHz 真人原声或牛津绘本原声）
  const isTmmNative = Boolean(
    (sentenceAudioMatch && sentenceAudioMatch.includes("/tmm/")) ||
    (audioParam && audioParam.includes("/tmm/"))
  );
  const isStoryAudio = Boolean(
    (sentenceAudioMatch && !sentenceAudioMatch.includes("/tmm/")) ||
    (audioParam && !audioParam.includes("/tmm/") && !audioParam.includes("/tts"))
  );
  const isOriginalAudio = isTmmNative || isStoryAudio;

  return (
    <div className="max-w-screen-md mx-auto">
      {/* 预设目标跟读句子提示卡片与返回原绘本快捷按钮 */}
      {currentRefText && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              🎯 目标跟读标准句 (Reference Text)
            </span>
            {props?.onCancel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={props.onCancel}
                className="h-8 px-3 text-xs font-bold rounded-xl border-amber-400/60 bg-white/90 dark:bg-black/30 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 gap-1.5 shadow-xs transition-colors"
              >
                <XIcon className="size-3.5" />
                <span>关闭 / 返回</span>
              </Button>
            ) : sourceParam === "phonics" || phonicsWord ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate("/phonics");
                }}
                className="h-8 px-3 text-xs font-bold rounded-xl border-sky-400/60 bg-white/90 dark:bg-slate-900 hover:bg-sky-500 hover:text-white text-sky-700 dark:text-sky-300 gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <span>🧩</span>
                <span>返回自然拼读阶梯 ➔</span>
              </Button>
            ) : bookId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (pageParam) {
                    navigate(`/stories?bookId=${encodeURIComponent(bookId)}&page=${pageParam}&shadowModal=true`);
                  } else {
                    navigate("/stories");
                  }
                }}
                className="h-8 px-3 text-xs font-bold rounded-xl border-amber-400/60 bg-white/90 dark:bg-black/30 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 gap-1.5 shadow-xs transition-colors"
              >
                <BookOpenIcon className="size-3.5" />
                <span className="hidden sm:inline">
                  {bookTitle ? `返回《${bookTitle}》第 ${pageParam} 页 ➔` : "返回绘本页面 ➔"}
                </span>
                <span className="sm:hidden">
                  {bookTitle ? `返回第 ${pageParam} 页` : "返回绘本"}
                </span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate("/pronunciation_assessments");
                }}
                className="h-8 px-3 text-xs font-bold rounded-xl border-amber-400/60 bg-white/90 dark:bg-black/30 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 gap-1.5 shadow-xs transition-colors"
              >
                <ArrowLeftIcon className="size-3.5" />
                <span>返回纠音题库 ➔</span>
              </Button>
            )}
          </div>
          <p className="text-base sm:text-xl font-bold text-foreground font-sans tracking-wide">
            "{currentRefText}"
          </p>
          {props?.translation && (
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
              {props.translation}
            </p>
          )}
          {props?.phonicsFocus && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-300/40 text-xs font-bold">
              <span>🎯 重点关注:</span>
              <span>{props.phonicsFocus}</span>
            </div>
          )}

          {phonicsWord && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                  🌱 自然拼读 Phase {phonicsWord.phase} · L{phonicsWord.lesson}
                </span>
                {phonicsWord.sounds && phonicsWord.sounds.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    核心音：{phonicsWord.sounds.join(" · ")}
                  </span>
                )}
                {phonicsWord.note && (
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    💡 {phonicsWord.note}
                  </span>
                )}
              </div>

              {/* 音素拆解积木与纯音素点读 */}
              {phonicsWord.sounds && phonicsWord.sounds.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground mr-1">点读音素:</span>
                  {phonicsWord.sounds.map((soundToken, idx) => {
                    const ipa = getPhonicsTokenIpa(soundToken);
                    const isVowel = isPhonicsVowel(soundToken);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playPhonicsTokenSound(soundToken);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
                          isVowel
                            ? "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700"
                            : "bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-700"
                        }`}
                        title={`点击试听纯音素发音: ${ipa}`}
                      >
                        <span className="font-sans font-bold">{soundToken}</span>
                        <span className="opacity-70 text-[10px] ml-1">{ipa}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 篮框位置：排图一【外教标准发音示范（声波 + 蓝点音调）】 */}
      {effectiveDemoAudio && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-blue-200/90 dark:border-blue-900/50 mb-4 shadow-xs">
          <div className="flex items-center justify-between mb-2 text-xs flex-wrap gap-1">
            <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 text-sm">
              <Volume2Icon className="size-4" />
              <span>
                {isTmmNative
                  ? "外教母语原声示范 (GB 44.1kHz 纯正真人发音)"
                  : isStoryAudio
                  ? "牛津原版母语发音示范 (GB Oxford Audio)"
                  : "外教标准发音示范 (GB Sonia · 纯正牛津英音)"}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                蓝点：标准声调走势
              </span>
              {isTmmNative ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                  🇬🇧 GB母语外教原声 (44.1kHz)
                </span>
              ) : isStoryAudio ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                  🇬🇧 GB牛津原版原声
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800">
                  🇬🇧 GB英音外教 (纯正牛津音)
                </span>
              )}
            </div>
          </div>
          <WavesurferPlayer
            id="teacher-sample-pitch-preview"
            src={effectiveDemoAudio}
            height={64}
            wavesurferOptions={{
              waveColor: "#bfdbfe",
              progressColor: "#3b82f6",
            }}
            pitchContourOptions={{
              borderColor: "#3b82f6",
              pointBorderColor: "#3b82f6",
              pointBackgroundColor: "#60a5fa",
              pointRadius: 2,
            }}
          />
        </div>
      )}

      <Form {...form}>
        <div className="h-full flex flex-col">
          {/* 直接进行录音（已去除红框中的【录音/上传】Tabs） */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card mb-4 shadow-xs flex flex-col items-center justify-center">
            <FormField
              control={form.control}
              name="recordingFile"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-center justify-center">
                  <RecorderButton
                    onStart={() => {
                      form.resetField("recordingFile");
                    }}
                    onCancel={() => {
                      form.resetField("recordingFile");
                    }}
                    onFinish={(blob) => {
                      field.onChange(blob);
                    }}
                  />
                </FormItem>
              )}
            />

            {/* 学员录音后展示声学波形与声调走势对比 */}
            {recordingUrl && (
              <div className="w-full mt-4 p-4 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-pink-600 dark:text-pink-400">
                    <MicIcon className="size-3.5" />
                    <span>我的录音发音音调 (My Recording)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-800">
                      粉红点：我的声调走势
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        form.resetField("recordingFile");
                      }}
                      className="h-6 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-bold gap-1"
                    >
                      <XIcon className="size-3" />
                      <span>取消重录</span>
                    </Button>
                  </div>
                </div>
                <WavesurferPlayer
                  id="student-recording-pitch"
                  src={recordingUrl}
                  height={60}
                  wavesurferOptions={{
                    waveColor: "#fbcfe8",
                    progressColor: "#f472b6",
                  }}
                  pitchContourOptions={{
                    borderColor: "#fb6f92",
                    pointBorderColor: "#fb6f92",
                    pointBackgroundColor: "#ff8fab",
                    pointRadius: 2,
                  }}
                />
              </div>
            )}

            {/* 阶段三赋能：双轨语调走势叠图对比 (Pitch Contour Overlay) */}
            {recordingUrl && effectiveDemoAudio && (
              <div className="w-full mt-3">
                <PitchContourOverlay
                  teacherAudioSrc={effectiveDemoAudio}
                  studentAudioSrc={recordingUrl}
                  referenceText={currentRefText}
                  height={130}
                />
              </div>
            )}
          </div>

          {/* 若没有预设句子（纯自定义输入模式）才展示参考文本输入框 */}
          {!initialText && (
            <div className="mb-4">
              <FormField
                control={form.control}
                name="referenceText"
                render={({ field }) => (
                  <FormItem className="grid w-full items-center gap-1.5">
                    <FormLabel>{t("referenceText")}</FormLabel>
                    <Textarea
                      disabled={submitting}
                      placeholder={t("inputReferenceTextOrLeaveItBlank")}
                      className="h-28"
                      {...field}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* 手动提交测评按钮（绝不自动提交，由用户听完比对后自主点击提交） */}
          <div className="mt-2">
            <Button
              type="button"
              disabled={submitting || !form.watch("recordingFile")}
              onClick={(e) => {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
              }}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all text-sm md:text-base gap-2 cursor-pointer"
              data-testid="conversation-form-submit"
              size="lg"
            >
              {submitting && <LoaderIcon className="size-4 animate-spin" />}
              {submitting ? "正在进行音素级 AI 评测中..." : "🚀 提交进行语音精准评测"}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
};

// 快速轻量 PCM 转标准 16-bit Mono WAV 编码器
function encodePcmToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM = 1
  view.setUint16(22, 1, true); // Mono = 1
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16 bits
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

// 智能声学前导微裁切：检测并自动裁剪音频开头前 0.8 秒由于声卡回溯、麦克风启振或提示音泄漏导致的孤立杂音脉冲
async function trimLeadingArtifacts(blob: Blob): Promise<Blob> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return blob;
    const ctx = new AudioCtx();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = channelData.length;

    // 音频至少需要 0.8 秒以上才检查前导杂音
    if (totalSamples < sampleRate * 0.8) {
      try { await ctx.close(); } catch (_) {}
      return blob;
    }

    const winSize = Math.floor(sampleRate * 0.01); // 10ms 窗口
    const searchLimit = Math.floor(sampleRate * 0.8); // 检查前 0.8 秒
    const numWindows = Math.floor(searchLimit / winSize);

    // 计算前 0.8 秒每个 10ms 窗口的平均振幅
    const energies: number[] = new Array(numWindows);
    for (let w = 0; w < numWindows; w++) {
      let sum = 0;
      const start = w * winSize;
      for (let j = 0; j < winSize; j++) {
        sum += Math.abs(channelData[start + j]);
      }
      energies[w] = sum / winSize;
    }

    // 计算底噪（取前 30% 分位数，避免被脉冲或人声拉高）
    const sorted = [...energies].sort((a, b) => a - b);
    const noiseFloor = sorted[Math.floor(numWindows * 0.3)] || 0.002;
    // 脉冲判定阈值：高于底噪 3.5 倍且至少 0.016
    const eventThreshold = Math.max(0.016, noiseFloor * 3.5);

    // 寻找在 0.0s ~ 0.45s 之间出现的第一个声音事件
    let pulseStart = -1;
    let pulseEnd = -1;
    const maxSearchWin = Math.floor(sampleRate * 0.45 / winSize);
    for (let w = 0; w < maxSearchWin; w++) {
      if (energies[w] > eventThreshold) {
        if (pulseStart === -1) pulseStart = w;
        pulseEnd = w;
      } else if (pulseStart !== -1) {
        // 如果后面 80ms 内还有后续脉冲，则合并为同一个复合脉冲群
        let hasMoreSoon = false;
        const checkEnd = Math.min(Math.floor(sampleRate * 0.5 / winSize), w + 8);
        for (let k = w + 1; k < checkEnd; k++) {
          if (energies[k] > eventThreshold) {
            hasMoreSoon = true;
            break;
          }
        }
        if (!hasMoreSoon) {
          break; // 第一个脉冲群完整结束
        }
      }
    }

    // 若在 0.45s 前找到了脉冲群
    if (pulseStart !== -1 && pulseEnd !== -1) {
      const pulseDurationMs = (pulseEnd - pulseStart + 1) * 10;
      // 杂音脉冲特征：持续时间不超过 350ms
      if (pulseDurationMs <= 350) {
        // 检查该脉冲群之后是否有至少 60ms 的安静区
        let silenceCount = 0;
        const silenceLimit = Math.min(numWindows, pulseEnd + 10);
        for (let s = pulseEnd + 1; s < silenceLimit; s++) {
          if (energies[s] <= eventThreshold * 1.2) {
            silenceCount++;
          }
        }

        // 检查音频后续是否有真实发音（在 pulseEnd + 80ms 之后，全音频范围内累计至少有 100ms 的声音事件）
        let subsequentSoundWindows = 0;
        const totalWinsInAudio = Math.floor(totalSamples / winSize);
        for (let w = pulseEnd + 8; w < totalWinsInAudio; w++) {
          let sum = 0;
          const start = w * winSize;
          for (let j = 0; j < winSize; j++) {
            sum += Math.abs(channelData[start + j]);
          }
          if (sum / winSize > eventThreshold) {
            subsequentSoundWindows++;
            if (subsequentSoundWindows >= 10) break; // 累计超过 100ms 声音
          }
        }

        // 满足：脉冲短促 + 脉冲后有静音间隔 + 后续有真实语音朗读
        if (silenceCount >= 6 && subsequentSoundWindows >= 10) {
          // 在脉冲结束后留出 20ms 平滑余量进行裁切
          const cutSampleIndex = Math.min(totalSamples - 1, (pulseEnd + 2) * winSize);
          const remaining = totalSamples - cutSampleIndex;
          if (remaining > sampleRate * 0.4) {
            const cleanBuffer = encodePcmToWav(channelData.subarray(cutSampleIndex), sampleRate);
            try { await ctx.close(); } catch (_) {}
            return new Blob([cleanBuffer], { type: "audio/wav" });
          }
        }
      }
    }

    try { await ctx.close(); } catch (_) {}
    return blob;
  } catch (err) {
    console.warn("Auto trim leading artifacts fallback:", err);
    return blob;
  }
}


const RecorderButton = (props: {
  submitting?: boolean;
  onStart?: () => void;
  onCancel?: () => void;
  onFinish: (blob: Blob) => void;
}) => {
  const { submitting, onStart, onCancel, onFinish } = props;
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const [access, setAccess] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);

  const {
    startRecording,
    stopRecording,
    togglePauseResume,
    recordingBlob,
    isRecording,
    isPaused,
    recordingTime,
    mediaRecorder,
  } = useAudioRecorder();

  // 3、2、1 专属节拍器短促提示音（超轻柔、50ms快速指数衰减，开录前近 1 秒彻底断音静默）
  const playCountdownTick = (num: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      // 3 与 2 为 520Hz 节拍音，1 为 650Hz 提醒音
      const freq = num === 1 ? 650 : 520;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      setTimeout(() => {
        try {
          ctx.close();
        } catch (_) {}
      }, 80);
    } catch (_) {}
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    onCancel && onCancel();
  };

  const handleStartWithCountdown = async () => {
    if (submitting || isRecording || countdown !== null) return;

    // 预先检查并请求浏览器麦克风权限，确保倒计时结束后顺畅开始录音
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setAccess(true);
      } catch (err) {
        console.warn("Microphone permission check failed:", err);
        toast.warning("请允许麦克风权限以开始发音录音");
        return;
      }
    }

    onStart && onStart();
    let count = 3;
    setCountdown(3);
    playCountdownTick(3); // 3 秒提示音 (50ms 即断音)

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playCountdownTick(count); // 2 秒与 1 秒提示音 (50ms 即断音)
      } else {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);
        // 重要声学保障：开录瞬间扬声器绝对 0 分贝（严禁播放任何声音），
        // 此时距离上一声“1”的短音已过去近 1 秒，扬声器早已彻底静音，麦克风录入绝无任何提示音杂音！
        startRecording();
      }
    }, 1000);
  };

  const askForMediaAccess = () => {
    EnjoyApp.system.preferences.mediaAccess("microphone").then((access) => {
      if (access) {
        setAccess(true);
      } else {
        setAccess(false);
        toast.warning(t("noMicrophoneAccess"));
      }
    });
  };

  useEffect(() => {
    askForMediaAccess();
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (recordingBlob) {
      if (!isCancelled) {
        trimLeadingArtifacts(recordingBlob).then((cleanBlob) => {
          if (!isCancelled) {
            onFinish(cleanBlob);
          }
        });
      }
      setIsCancelled(false);
    }
  }, [recordingBlob]);

  useEffect(() => {
    if (!isRecording) return;

    if (recordingTime >= 60 * 5) {
      stopRecording();
    }
  }, [recordingTime]);

  // 1. 倒计时 3、2、1 进行中视觉呈现
  if (countdown !== null) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-2 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg ring-4 ring-amber-400/40 animate-pulse">
            <span className="text-3xl font-black font-mono transition-transform scale-110">
              {countdown}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cancelCountdown();
            }}
            className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 font-bold gap-1 cursor-pointer"
          >
            <XIcon className="size-3.5" />
            <span>取消</span>
          </Button>
        </div>
        <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-2.5 animate-pulse">
          准备好，倒计时结束后请大声朗读...
        </p>
      </div>
    );
  }

  // 2. 正式录音中视觉呈现
  if (isRecording) {
    return (
      <div className="w-full flex justify-center">
        <div className="flex items-center space-x-2">
          {/* 取消 / 放弃录音按钮 */}
          <Button
            type="button"
            data-tooltip-id="global-tooltip"
            data-tooltip-content="取消本次录音"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCancelled(true);
              stopRecording();
              onCancel && onCancel();
            }}
            className="rounded-full bg-red-500 hover:bg-red-600 shadow w-8 h-8 text-white"
            size="icon"
          >
            <XIcon className="w-4 h-4 text-white" />
          </Button>

          <LiveAudioVisualizer
            mediaRecorder={mediaRecorder}
            barWidth={2}
            gap={2}
            width={140}
            height={30}
            fftSize={512}
            maxDecibels={-10}
            minDecibels={-80}
            smoothingTimeConstant={0.4}
          />
          <span className="text-sm text-muted-foreground font-mono">
            {Math.floor(recordingTime / 60)}:
            {String(recordingTime % 60).padStart(2, "0")}
          </span>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePauseResume();
            }}
            className="rounded-full shadow w-8 h-8"
            size="icon"
          >
            {isPaused ? (
              <PlayIcon
                data-tooltip-id="global-tooltip"
                data-tooltip-content={t("continue")}
                fill="white"
                className="w-4 h-4"
              />
            ) : (
              <PauseIcon
                data-tooltip-id="global-tooltip"
                data-tooltip-content={t("pause")}
                fill="white"
                className="w-4 h-4"
              />
            )}
          </Button>
          <Button
            type="button"
            data-tooltip-id="global-tooltip"
            data-tooltip-content={t("finish")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCancelled(false);
              stopRecording();
            }}
            className="rounded-full bg-green-500 hover:bg-green-600 shadow w-8 h-8"
            size="icon"
          >
            <CheckIcon className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    );
  }

  // 3. 初始录音按钮
  return (
    <div className="w-full flex flex-col items-center gap-2 justify-center">
      <Button
        type="button"
        data-tooltip-id="global-tooltip"
        data-tooltip-content="点击录音（3秒倒计时）"
        disabled={submitting}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleStartWithCountdown();
        }}
        className="rounded-full shadow-md size-14 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-all hover:scale-105 active:scale-95 ring-4 ring-amber-400/20"
        size="icon"
      >
        {submitting ? (
          <LoaderIcon className="size-6 animate-spin" />
        ) : (
          <MicIcon className="size-7" />
        )}
      </Button>
      <span className="text-xs font-bold text-muted-foreground">
        点击录音（倒计时 3 秒后开始）
      </span>
    </div>
  );
};
