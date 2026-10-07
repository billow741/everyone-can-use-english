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
import { useContext, useEffect, useState } from "react";
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

const pronunciationAssessmentSchema = z.object({
  file: z.instanceof(FileList).optional(),
  recordingFile: z.instanceof(Blob).optional(),
  language: z.string().min(2),
  referenceText: z.string().optional(),
});

export const PronunciationAssessmentForm = (props?: {
  defaultReferenceText?: string;
  onSuccess?: () => void;
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryText = searchParams.get("text") || "";
  const initialText = props?.defaultReferenceText || queryText || "";
  const { EnjoyApp, learningLanguage } = useContext(AppSettingsProviderContext);
  const [submitting, setSubmitting] = useState(false);
  const { createAssessment } = usePronunciationAssessments();

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
        toast.success("发音评测完成，已生成精准纠错报告！");
        if (props?.onSuccess) {
          props.onSuccess();
        } else {
          navigate(`/pronunciation_assessments?selectId=${created?.id || ""}`);
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

    let persistentUrl = blobUrl;
    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(blobUrl);
        reader.readAsDataURL(rawBlob);
      });
      if (dataUrl) persistentUrl = dataUrl;
    } catch {}

    const rec = await EnjoyApp.recordings.create({
      language,
      referenceText,
      src: persistentUrl || blobUrl,
      blob: {
        type: recordingFile?.type || file[0].type || "audio/webm",
        arrayBuffer,
      },
    });

    if (rec) {
      (rec as any)._rawBlob = rawBlob;
      if (!rec.src) rec.src = persistentUrl || blobUrl;
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
    // 牛津绘本 Floppy's Bone 每一页单句专属外教原声
    "Floppy had a bone.": "/assets/books/floppys_bone/audio/page_1.mp3",
    "A dog took the bone.": "/assets/books/floppys_bone/audio/page_2.mp3",
    "Floppy ran after the dog.": "/assets/books/floppys_bone/audio/page_3.mp3",
    "“Come back!” said Mum.": "/assets/books/floppys_bone/audio/page_4.mp3",
    "Come back! said Mum.": "/assets/books/floppys_bone/audio/page_4.mp3",
    "She ran after Floppy.": "/assets/books/floppys_bone/audio/page_5.mp3",
    "“Come back,” said Dad.": "/assets/books/floppys_bone/audio/page_6.mp3",
    "Come back, said Dad.": "/assets/books/floppys_bone/audio/page_6.mp3",
    "He ran after Mum.": "/assets/books/floppys_bone/audio/page_7.mp3",
    "“Come back!” said Biff and Chip.": "/assets/books/floppys_bone/audio/page_8.mp3",
    "Come back! said Biff and Chip.": "/assets/books/floppys_bone/audio/page_8.mp3",
    "They ran after Dad.": "/assets/books/floppys_bone/audio/page_9.mp3",
    "The dog stopped.": "/assets/books/floppys_bone/audio/page_10.mp3",
    "A big dog took the bone.": "/assets/books/floppys_bone/audio/page_11.mp3",
    "The big dog ate the bone. Oh no!": "/assets/books/floppys_bone/audio/page_12.mp3",
  };

  const audioParam = searchParams.get("audio") || "";
  // 如果 audioParam 是全本长音频（比如 floppy_bone.mp3），优先使用精准匹配的单句音频
  const sentenceAudioMatch = currentRefText ? SAMPLE_AUDIO_MAP[currentRefText.trim()] : "";
  const effectiveDemoAudio =
    sentenceAudioMatch ||
    audioParam ||
    "";

  return (
    <div className="max-w-screen-md mx-auto">
      {/* 预设目标跟读句子提示卡片与返回原绘本快捷按钮 */}
      {currentRefText && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 mb-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              🎯 目标跟读标准句 (Reference Text)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/stories")}
              className="h-8 px-3 text-xs font-bold rounded-xl border-amber-400/60 bg-white/90 dark:bg-black/30 hover:bg-amber-500 hover:text-white text-amber-700 dark:text-amber-300 gap-1.5 shadow-xs transition-colors"
            >
              <BookOpenIcon className="size-3.5" />
              <span>返回绘本页面 ➔</span>
            </Button>
          </div>
          <p className="text-lg md:text-xl font-bold text-foreground font-sans tracking-wide">
            "{currentRefText}"
          </p>
        </div>
      )}

      {/* 篮框位置：排图一【外教标准发音示范（声波 + 蓝点音调）】 */}
      {effectiveDemoAudio && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-blue-200/90 dark:border-blue-900/50 mb-4 shadow-xs">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 text-sm">
              <Volume2Icon className="size-4" />
              <span>外教标准发音示范 (Native Audio)</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
              蓝点：标准声调走势
            </span>
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
  }, []);

  useEffect(() => {
    if (recordingBlob) {
      if (!isCancelled) {
        onFinish(recordingBlob);
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

  return (
    <div className="w-full flex items-center gap-4 justify-center">
      <Button
        type="button"
        data-tooltip-id="global-tooltip"
        data-tooltip-content={t("record")}
        disabled={submitting}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onStart && onStart();
          if (access) {
            startRecording();
          } else {
            askForMediaAccess();
          }
        }}
        className="rounded-full shadow w-10 h-10"
        size="icon"
      >
        {submitting ? (
          <LoaderIcon className="w-6 h-6 animate-spin" />
        ) : (
          <MicIcon className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
};
