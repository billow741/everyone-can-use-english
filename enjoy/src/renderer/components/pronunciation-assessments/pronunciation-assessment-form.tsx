import { AUDIO_PALETTE } from "@renderer/lib/audio-palette";
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
import { useContext, useEffect, useState, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { cn, secondsToTimestamp } from "@renderer/lib/utils";
import {
  AppSettingsProviderContext,
  usePronunciationCoach,
} from "@/renderer/context";
import { LANGUAGES } from "@/constants";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
  XIcon,
  SparklesIcon,
  ArrowLeftIcon,
  BookOpenIcon,
} from "lucide-react";
import { usePronunciationAssessments } from "@/renderer/hooks";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { WavesurferPlayer } from "@renderer/components/misc/wavesurfer-player";
import { PitchContourOverlay } from "./pitch-contour-overlay";
import {
  compareTranscriptWords,
  recognizeSpeechWords,
} from "./word-signal";
import { TMM_CURATED_EXERCISES } from "@renderer/data/tmm-curated-exercises";
import {
  findPhonicsWord,
  isPhonicsVowel,
  PhonicsWord,
  playPhonicsTokenSound,
  getPhonicsTokenIpa,
} from "@renderer/lib/open-phonics-service";

const LISTENING_ABBREV_WORDS = new Set([
  "mr", "mrs", "ms", "miss", "dr", "st", "sr", "jr", "prof", "rev",
  "hon", "pres", "gov", "gen", "col", "maj", "capt", "lt", "sgt", "cpl", "pvt",
  "mt", "ft", "no", "vol", "ch", "fig", "pp", "vs", "etc", "al",
  "inc", "ltd", "co", "corp", "dept", "est", "approx",
  "jan", "feb", "mar", "apr", "aug", "sep", "sept", "oct", "nov", "dec",
  "mon", "tue", "tues", "wed", "thu", "thur", "thurs", "fri", "sat", "sun",
]);

/**
 * 将听故事长单元文本按句终标点（. ! ? 及可选引号收尾）拆分为子句数组；
 * 避开常见缩写（Mr. Mrs. Dr. St. 等）、小数与省略号误拆；单句不可拆时返回单元素数组。
 */
export function splitListeningSentences(rawText: string): string[] {
  const text = (rawText || "").trim();
  if (!text) return [];

  const clauses: string[] = [];
  let startIdx = 0;
  const boundaryRe = /([.!?])(["”'’)\]]*)(\s+)(?=["“'‘(\[_*]*[A-Z])/g;
  let match: RegExpExecArray | null;

  while ((match = boundaryRe.exec(text)) !== null) {
    const punct = match[1];
    const closing = match[2];
    const punctIdx = match.index;
    const afterPunctIdx = punctIdx + 1 + closing.length;

    if (punct === ".") {
      const prevChar = punctIdx > 0 ? text[punctIdx - 1] : "";
      const nextChar = punctIdx + 1 < text.length ? text[punctIdx + 1] : "";
      if (prevChar === "." || nextChar === ".") continue;
      if (/\d/.test(prevChar) && /\d/.test(text[afterPunctIdx + match[3].length] || "")) {
        continue;
      }

      const beforePunct = text.slice(startIdx, punctIdx);
      if (/(?:^|[\s("“'‘])(?:[A-Za-z]\.){1,}[A-Za-z]$/.test(beforePunct)) {
        continue;
      }

      const wordMatch = beforePunct.match(/([A-Za-z]+)$/);
      if (wordMatch) {
        const wordLower = wordMatch[1].toLowerCase();
        if (LISTENING_ABBREV_WORDS.has(wordLower)) continue;
        if (wordMatch[1].length === 1 && wordMatch[1] !== "I") continue;
      }
    }

    const segment = text.slice(startIdx, afterPunctIdx).trim();
    if (segment) {
      clauses.push(segment);
      startIdx = afterPunctIdx + match[3].length;
    }
  }

  const tail = text.slice(startIdx).trim();
  if (tail) {
    clauses.push(tail);
  }

  return clauses.length > 1 ? clauses : [text];
}

/**
 * 按子句字符数占整单元字符数比例，把 [unitStart, unitEnd] 线性估切到子句区间；
 * 句首句尾各留 0.05s 余量并严格钳制在 [unitStart, unitEnd] 内。
 */
export function computeClauseAudioSegment(
  clauses: string[],
  clauseIndex: number,
  unitStart: number,
  unitEnd: number,
  margin = 0.05
): { start: number; end: number } {
  const safeIdx = Math.max(0, Math.min(clauses.length - 1, clauseIndex));
  const lengths = clauses.map((c) => Math.max(1, c.length));
  const totalChars = lengths.reduce((sum, l) => sum + l, 0);
  const unitDuration = Math.max(0, unitEnd - unitStart);
  const prefixChars = lengths.slice(0, safeIdx).reduce((sum, l) => sum + l, 0);
  const rawStart = unitStart + (prefixChars / totalChars) * unitDuration;
  const rawEnd = unitStart + ((prefixChars + lengths[safeIdx]) / totalChars) * unitDuration;

  const clampedStart = Math.max(unitStart, Math.min(unitEnd, rawStart - margin));
  const clampedEnd = Math.max(clampedStart, Math.min(unitEnd, rawEnd + margin));
  return { start: clampedStart, end: clampedEnd };
}

const pronunciationAssessmentSchema = z.object({
  file: z.instanceof(FileList).optional(),
  recordingFile: z.instanceof(Blob).optional(),
  language: z.string().min(2),
  referenceText: z.string().optional(),
});

export const PronunciationAssessmentForm = (props?: {
  defaultReferenceText?: string;
  audioUrl?: string;
  audioStart?: number;
  audioEnd?: number;
  translation?: string;
  phonicsFocus?: string;
  source?: string;
  contextTitle?: string;
  archiveContext?: {
    source: "dialogue" | "quote" | "correction" | "family" | "listening";
    contextRef: string;
  };
  bookMeta?: {
    bookId?: string;
    bookTitle?: string;
    page?: number | string;
    returnToModal?: boolean | string;
  };
  className?: string;
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
  const { isOpen: coachIsOpen, options: coachOptions } = usePronunciationCoach();
  const [submitting, setSubmitting] = useState(false);
  const recorderRef = useRef<{ start: () => void } | null>(null);
  const { createAssessment } = usePronunciationAssessments();
  const [phonicsWord, setPhonicsWord] = useState<PhonicsWord | null>(null);

  const effectiveSource =
    props?.archiveContext?.source ||
    props?.source ||
    (coachIsOpen ? coachOptions?.archiveContext?.source || coachOptions?.source : undefined) ||
    sourceParam;
  const isListeningMode = effectiveSource === "listening";

  const clauses = useMemo(() => {
    if (!initialText) return [];
    return isListeningMode ? splitListeningSentences(initialText) : [initialText];
  }, [isListeningMode, initialText]);
  const isMultiClause = isListeningMode && clauses.length > 1;

  const [clauseIndex, setClauseIndex] = useState(0);
  useEffect(() => {
    setClauseIndex(0);
  }, [initialText, isListeningMode]);

  const activeClauseIndex = isMultiClause
    ? Math.max(0, Math.min(clauseIndex, clauses.length - 1))
    : 0;
  const activeClauseText = isMultiClause ? clauses[activeClauseIndex] : initialText;

  const resolvedArchiveContext = useMemo(() => {
    const base = (() => {
      if (props?.archiveContext) return props.archiveContext;
      if (sourceParam === "quote" || props?.source === "quote") {
        const today = new Date().toISOString().slice(0, 10);
        return {
          source: "quote" as const,
          contextRef: `quote#${today}`,
        };
      }
      const ref = props?.bookMeta?.bookId
        ? `book#${props.bookMeta.bookId}`
        : `correction#${Date.now()}`;
      return {
        source: "correction" as const,
        contextRef: ref,
      };
    })();

    if (isMultiClause && base.source === "listening") {
      return {
        ...base,
        contextRef: `${base.contextRef}/${activeClauseIndex + 1}`,
      };
    }
    return base;
  }, [
    props?.archiveContext,
    props?.source,
    sourceParam,
    props?.bookMeta,
    isMultiClause,
    activeClauseIndex,
  ]);

  const form = useForm<z.infer<typeof pronunciationAssessmentSchema>>({
    resolver: zodResolver(pronunciationAssessmentSchema),
    values: {
      language: learningLanguage,
      referenceText: activeClauseText,
    },
  });

  const currentRefText = form.watch("referenceText") || activeClauseText;
  const watchedRecordingFile = form.watch("recordingFile");
  const [recordingUrl, setRecordingUrl] = useState<string>("");
  const hasRefText = currentRefText.trim().length > 0;
  const [wordSttState, setWordSttState] = useState<{
    status: "idle" | "loading" | "ready" | "silent";
    alternatives: string[] | null;
  }>({ status: "idle", alternatives: null });

  const handleSelectClause = (nextIdx: number) => {
    if (submitting || nextIdx < 0 || nextIdx >= clauses.length || nextIdx === activeClauseIndex) {
      return;
    }
    form.resetField("recordingFile");
    form.clearErrors("recordingFile");
    setWordSttState({ status: "idle", alternatives: null });
    setClauseIndex(nextIdx);
  };

  useEffect(() => {
    if (!watchedRecordingFile || !hasRefText) {
      setWordSttState({ status: "idle", alternatives: null });
      return;
    }

    const ctl = new AbortController();
    setWordSttState({ status: "loading", alternatives: null });

    recognizeSpeechWords(watchedRecordingFile, ctl.signal).then((alts) => {
      if (ctl.signal.aborted) return;
      if (alts && alts.length > 0) {
        setWordSttState({ status: "ready", alternatives: alts });
      } else {
        setWordSttState({ status: "silent", alternatives: null });
      }
    });

    return () => {
      ctl.abort();
    };
  }, [watchedRecordingFile, hasRefText]);

  const wordSignal = useMemo(() => {
    if (wordSttState.status !== "ready" || !wordSttState.alternatives) {
      return null;
    }
    return compareTranscriptWords(currentRefText, wordSttState.alternatives);
  }, [currentRefText, wordSttState]);

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
      archiveContext: resolvedArchiveContext,
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
        if (createdResult?.measurementMode === "sampled") {
          toast.success("跟读完成，已记录！");
          if (props?.onSuccess) {
            props.onSuccess(created);
          }
          return;
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
        if ((err as any)?.code === "measurement_quota") {
          toast.success(
            "今日深度评测次数已用完，语调对比与词级反馈仍可继续练习。"
          );
          return;
        }
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

  const unitAudioStart =
    typeof props?.audioStart === "number"
      ? props.audioStart
      : coachIsOpen &&
          coachOptions &&
          (!props?.audioUrl || props.audioUrl === coachOptions.audioUrl)
        ? coachOptions.audioStart
        : undefined;
  const unitAudioEnd =
    typeof props?.audioEnd === "number"
      ? props.audioEnd
      : coachIsOpen &&
          coachOptions &&
          (!props?.audioUrl || props.audioUrl === coachOptions.audioUrl)
        ? coachOptions.audioEnd
        : undefined;
  const isUsingPassedAudio = Boolean(audioParam) && effectiveDemoAudio === audioParam;
  const hasAudioSegment =
    isUsingPassedAudio &&
    typeof unitAudioStart === "number" &&
    typeof unitAudioEnd === "number" &&
    Number.isFinite(unitAudioStart) &&
    Number.isFinite(unitAudioEnd) &&
    unitAudioEnd > unitAudioStart;

  const clauseSegment =
    hasAudioSegment && isMultiClause
      ? computeClauseAudioSegment(clauses, activeClauseIndex, unitAudioStart!, unitAudioEnd!)
      : null;
  const resolvedAudioStart = clauseSegment ? clauseSegment.start : unitAudioStart;
  const resolvedAudioEnd = clauseSegment ? clauseSegment.end : unitAudioEnd;
  const resolvedAudioPadding = clauseSegment ? 0 : 0.05;



  return (
    <div className={cn("max-w-screen-md mx-auto w-full", props?.className)}>
      <Form {...form}>
        <div className="h-full flex-1 flex flex-col min-h-0">
          {/* 抽屉上方可滚动内容区 */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-2 space-y-4">
            {/* 目标跟读句子提示卡片 */}
            {currentRefText && (
              <div
                className={cn(
                  "rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-xs",
                  recordingUrl ? "p-3 sm:p-3.5" : "p-4 sm:p-5"
                )}
              >
                {/* B8: 抽屉模式下不显示多余关闭按钮，只在独立页模式下显示返回按钮 */}
                {!props?.onCancel && (
                  <div className="flex items-center justify-end mb-2">
                    {sourceParam === "phonics" || phonicsWord ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate("/phonemes");
                        }}
                        className="h-8 px-3 text-xs font-bold rounded-xl border-sky-400/60 bg-white/90 dark:bg-slate-900 hover:bg-sky-500 hover:text-white text-sky-700 dark:text-sky-300 gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <span>返回自然拼读 →</span>
                      </Button>
                    ) : bookId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (pageParam) {
                            navigate(`/stories?bookId=${encodeURIComponent(bookId)}&page=${pageParam}`);
                          } else {
                            navigate(`/stories?bookId=${encodeURIComponent(bookId)}`);
                          }
                        }}
                        className="h-8 px-3 text-xs font-bold rounded-xl border-amber-400/60 bg-white/90 dark:bg-black/30 hover:bg-[#F2A93B] hover:text-[#123B3C] text-amber-800 dark:text-amber-300 gap-1.5 shadow-xs transition-colors"
                      >
                        <BookOpenIcon className="size-3.5" />
                        <span className="hidden sm:inline">
                          {bookTitle ? `返回《${bookTitle}》第 ${pageParam} 页 →` : "返回绘本页面 →"}
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
                        className="h-8 px-3 text-xs font-bold rounded-xl border-amber-400/60 bg-white/90 dark:bg-black/30 hover:bg-[#F2A93B] hover:text-[#123B3C] text-amber-800 dark:text-amber-300 gap-1.5 shadow-xs transition-colors"
                      >
                        <ArrowLeftIcon className="size-3.5" />
                        <span>返回发音纠错 →</span>
                      </Button>
                    )}
                  </div>
                )}

                {isMultiClause && (
                  <div
                    data-testid="clause-navigator"
                    className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-amber-500/20 flex-wrap"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        data-testid="clause-progress"
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-[#123B3C] shadow-2xs tabular-nums"
                      >
                        第 {activeClauseIndex + 1}/{clauses.length} 句
                      </span>
                      <span className="text-[11px] font-medium text-amber-900/75 dark:text-amber-200/80 hidden sm:inline">
                        长段分句，一句一句跟着读
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="clause-prev-btn"
                        disabled={activeClauseIndex === 0 || submitting}
                        onClick={() => handleSelectClause(activeClauseIndex - 1)}
                        className="h-7 px-2.5 text-xs font-bold rounded-lg border-amber-400/60 bg-background/80 hover:bg-amber-500/15 gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="size-3.5" />
                        <span>上一句</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="clause-next-btn"
                        disabled={activeClauseIndex >= clauses.length - 1 || submitting}
                        onClick={() => handleSelectClause(activeClauseIndex + 1)}
                        className="h-7 px-2.5 text-xs font-bold rounded-lg border-amber-400/60 bg-background/80 hover:bg-amber-500/15 gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        <span>下一句</span>
                        <ChevronRightIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                <p
                  data-testid="coach-reference-text"
                  className={cn(
                    "font-bold text-foreground font-sans tracking-wide",
                    recordingUrl ? "text-sm sm:text-base" : "text-base sm:text-xl"
                  )}
                >
                  "{currentRefText}"
                </p>
                {props?.translation && (
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                    {props.translation}
                  </p>
                )}

                {phonicsWord && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#F2A93B] text-[#123B3C] shadow-xs">
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

            {/* B6: ① 听一遍【外教标准发音示范（声波 + 蓝点音调）】 */}
            {effectiveDemoAudio && !recordingUrl && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-blue-200/90 dark:border-blue-900/50 shadow-xs">
                <div className="flex items-center justify-between mb-2 text-xs flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500 text-white font-black text-xs shadow-xs">
                    1. 听原声
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      先听一遍原声示范，再跟着读
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                      蓝点：原声曲线
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground sm:hidden mb-2">
                  先听一遍原声示范，再跟着读
                </p>
                {hasAudioSegment ? (
                  <SegmentDemoAudioPlayer
                    src={effectiveDemoAudio}
                    start={resolvedAudioStart!}
                    end={resolvedAudioEnd!}
                    segmentPadding={resolvedAudioPadding}
                  />
                ) : (
                  <WavesurferPlayer
                    id="teacher-sample-pitch-preview"
                    src={effectiveDemoAudio}
                    height={56}
                    wavesurferOptions={{
                      waveColor: AUDIO_PALETTE.userAudio.wave,
                      progressColor: AUDIO_PALETTE.userAudio.progress,
                    }}
                    pitchContourOptions={{
                      borderColor: AUDIO_PALETTE.userAudio.line,
                      pointBorderColor: AUDIO_PALETTE.userAudio.line,
                      pointBackgroundColor: AUDIO_PALETTE.userAudio.point,
                      pointRadius: 2,
                    }}
                  />
                )}
              </div>
            )}

            {/* ② 跟着读 / 录音卡片 */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card shadow-xs">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2A93B] text-[#123B3C] font-black text-xs shadow-xs">
                  2. 跟读录音
                </span>
                <span className="text-[11px] text-muted-foreground">
                  读错可重录，确认后再提交
                </span>
              </div>

              {/* 录音按钮：未录音态大圆麦克风，录音中态为录音控制条 */}
              <div className={recordingUrl ? "hidden" : "w-full flex flex-col items-center justify-center py-2"}>
                <FormField
                  control={form.control}
                  name="recordingFile"
                  render={({ field }) => (
                    <FormItem className="w-full flex flex-col items-center justify-center">
                      <RecorderButton
                        key={isMultiClause ? `clause-${activeClauseIndex}` : "single"}
                        ref={recorderRef}
                        submitting={submitting}
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
              </div>

              {/* 录完态第一反馈：双轨语调走势对比卡 (Pitch Contour Overlay) */}
              {recordingUrl && effectiveDemoAudio && (
                <div className="w-full mt-3">
                  <PitchContourOverlay
                    teacherAudioSrc={effectiveDemoAudio}
                    teacherAudioStart={hasAudioSegment ? resolvedAudioStart : undefined}
                    teacherAudioEnd={hasAudioSegment ? resolvedAudioEnd : undefined}
                    teacherAudioPadding={resolvedAudioPadding}
                    studentAudioSrc={recordingUrl}
                    referenceText={currentRefText}
                    height={130}
                  />
                </div>
              )}

              {/* 录完态第二反馈：词级信号（仅展示机器听到的词，不评分、不入档；失败静默隐藏） */}
              {recordingUrl && hasRefText && wordSttState.status === "loading" && (
                <div
                  data-testid="word-signal-loading"
                  className="w-full mt-3 rounded-xl border border-indigo-200/45 dark:border-indigo-900/25 bg-indigo-50/20 dark:bg-indigo-950/10 px-3 py-2 flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground"
                >
                  <LoaderIcon className="size-3 animate-spin text-indigo-400 shrink-0" />
                  <span>识别中…</span>
                </div>
              )}

              {recordingUrl && hasRefText && wordSignal && (
                <div
                  data-testid="word-signal-card"
                  aria-live="polite"
                  className={cn(
                    "w-full mt-3 rounded-xl border px-3 py-2",
                    wordSignal.allMatched
                      ? "border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/15"
                      : "border-amber-200/50 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/15"
                  )}
                >
                  {wordSignal.allMatched ? (
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-700/90 dark:text-emerald-300/90">
                      <CheckIcon className="size-3.5 text-emerald-600/80 dark:text-emerald-400/80 shrink-0" />
                      <span>每个词都听清了！</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[11px] sm:text-xs font-semibold text-amber-900/90 dark:text-amber-200/90">
                        这几个词没听清，再读一遍试试：
                      </p>
                      <ul
                        className="flex flex-wrap gap-1.5"
                        aria-label="没听清的词"
                      >
                        {wordSignal.missedWords.map((item, idx) => (
                          <li
                            key={`${item.norm}-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 border border-amber-200/60 dark:border-amber-800/60 text-[11px] font-semibold text-foreground"
                          >
                            <span>{item.display}</span>
                            {item.heardLike && (
                              <span className="text-[10px] font-medium text-muted-foreground">
                                （听起来像 {item.heardLike}）
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 学员录音后展示声学波形与单轨音调预览（仅无示范音/无参考文本、语调卡不挂载时兜底显示） */}
              {recordingUrl && !effectiveDemoAudio && (
                <div className="w-full mt-3 p-4 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/50 space-y-2">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-pink-600 dark:text-pink-400">
                      <MicIcon className="size-3.5" />
                      <span>我的录音发音音调</span>
                    </span>
                    <span className="text-[11px] font-bold text-pink-700 dark:text-pink-300 whitespace-nowrap">
                      ● 粉红点：你的声音
                    </span>
                  </div>
                  <WavesurferPlayer
                    id="student-recording-pitch"
                    src={recordingUrl}
                    height={56}
                    wavesurferOptions={{
                      waveColor: AUDIO_PALETTE.coachAudio.wave,
                      progressColor: AUDIO_PALETTE.coachAudio.progress,
                    }}
                    pitchContourOptions={{
                      borderColor: AUDIO_PALETTE.coachAudio.line,
                      pointBorderColor: AUDIO_PALETTE.coachAudio.line,
                      pointBackgroundColor: AUDIO_PALETTE.coachAudio.point,
                      pointRadius: 2,
                    }}
                  />
                </div>
              )}

              {/* B2: 录完后收成紧凑行 (~56px)，置于词级信号卡之后 */}
              {recordingUrl ? (
                <div className="w-full mt-3 min-h-14 px-3 sm:px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="size-7 sm:size-8 rounded-full bg-[#F2A93B] text-[#123B3C] flex items-center justify-center shadow-xs shrink-0">
                      <MicIcon className="size-3.5 sm:size-4" />
                    </div>
                    <div className="text-xs min-w-0">
                      <div className="font-bold text-foreground">录音已就绪</div>
                      <div className="text-[11px] text-muted-foreground leading-snug">可回听或比对声调后提交</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        form.resetField("recordingFile");
                        setTimeout(() => {
                          recorderRef.current?.start();
                        }, 80);
                      }}
                      className="h-8 px-2.5 sm:px-3 text-xs font-bold rounded-xl border-amber-400 bg-background text-amber-800 dark:text-amber-300 hover:bg-[#F2A93B] hover:text-[#123B3C] gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <MicIcon className="size-3" />
                      <span>重新录音</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        form.resetField("recordingFile");
                      }}
                      className="h-8 px-2 text-[11px] sm:text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-bold gap-1 cursor-pointer"
                    >
                      <XIcon className="size-3" />
                      <span>删除录音</span>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 若没有预设句子才展示参考文本输入框 */}
            {!initialText && (
              <div className="mb-2">
                <FormField
                  control={form.control}
                  name="referenceText"
                  render={({ field }) => (
                    <FormItem className="grid w-full items-center gap-1.5">
                      <FormLabel>{t("referenceText")}</FormLabel>
                      <Textarea
                        disabled={submitting}
                        placeholder={t("inputReferenceTextOrLeaveItBlank")}
                        className="h-24"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* A1: 吸底提交条（初始态与录完态共用同一条，抽屉常驻底部） */}
          <div className="shrink-0 p-3 sm:p-4 bg-background/95 backdrop-blur-md border-t border-border/60 sticky bottom-0 z-20 mt-auto">
            <Button
              type="button"
              disabled={submitting || !watchedRecordingFile}
              onClick={(e) => {
                e.preventDefault();
                if (!watchedRecordingFile) return;
                form.handleSubmit(onSubmit)();
              }}
              className={cn(
                "w-full h-12 rounded-xl transition-all text-sm md:text-base gap-2 font-bold",
                !watchedRecordingFile
                  ? "bg-muted text-muted-foreground border border-border/60 cursor-not-allowed hover:bg-muted"
                  : "bg-[#F2A93B] hover:bg-[#E0992E] text-[#123B3C] shadow-md cursor-pointer active:scale-[0.99]"
              )}
              data-testid="conversation-form-submit"
              size="lg"
            >
              {submitting && <LoaderIcon className="size-4 animate-spin" />}
              <span>
                {submitting
                  ? "AI 正在评测…"
                  : !watchedRecordingFile
                  ? "3. 录完音后可提交"
                  : "3. 提交评测"}
              </span>
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


const SEGMENT_BAR_HEIGHTS = [
  28, 46, 62, 38, 76, 88, 54, 42, 70, 92,
  64, 48, 82, 58, 34, 72, 86, 52, 66, 40,
  78, 60, 44, 84, 56, 36, 68, 74, 50, 32,
];

const SegmentDemoAudioPlayer: React.FC<{
  src: string;
  start: number;
  end: number;
  segmentPadding?: number;
}> = ({ src, start, end, segmentPadding = 0.05 }) => {
  const segStart = Math.max(0, start - segmentPadding);
  const segEnd = end + segmentPadding;
  const segDuration = Math.max(0.1, segEnd - segStart);
  const displayDuration = segDuration < 1 ? 1 : segDuration;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveEndRef = useRef<number>(segEnd);
  const playerIdRef = useRef<string>(`seg-${Math.random().toString(36).slice(2)}`);

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    effectiveEndRef.current = segEnd;
    setIsPlaying(false);
    setElapsed(0);
    if (!audio) return;

    const handleLoadedMetadata = () => {
      effectiveEndRef.current =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.min(segEnd, audio.duration)
          : segEnd;
      if (Math.abs(audio.currentTime - segStart) > 0.02) {
        audio.currentTime = segStart;
      }
    };

    const handleTimeUpdate = () => {
      if (audio.seeking) return;
      const now = audio.currentTime;
      if (now >= effectiveEndRef.current) {
        audio.pause();
        audio.currentTime = segStart;
        setIsPlaying(false);
        setElapsed(0);
        return;
      }
      setElapsed(Math.max(0, Math.min(segDuration, now - segStart)));
    };

    const handlePlay = () => {
      setIsPlaying(true);
      document.dispatchEvent(
        new CustomEvent("play", { detail: { uuid: playerIdRef.current } })
      );
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setElapsed(0);
      audio.currentTime = segStart;
    };

    const handleOtherPlay = (event: Event) => {
      const detail = (event as CustomEvent<{ uuid?: string }>).detail;
      if (detail?.uuid && detail.uuid !== playerIdRef.current) {
        audio.pause();
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    document.addEventListener("play", handleOtherPlay);

    if (audio.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      document.removeEventListener("play", handleOtherPlay);
    };
  }, [src, segStart, segEnd, segDuration]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.seeking) {
        const now = audio.currentTime;
        if (now >= effectiveEndRef.current) {
          audio.pause();
          audio.currentTime = segStart;
          setIsPlaying(false);
          setElapsed(0);
          return;
        }
        setElapsed(Math.max(0, Math.min(segDuration, now - segStart)));
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, segStart, segDuration]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    const endLimit = effectiveEndRef.current;
    const targetTime =
      audio.currentTime >= segStart && audio.currentTime < endLimit - 0.02
        ? audio.currentTime
        : segStart;

    if (targetTime === segStart) {
      setElapsed(0);
    }

    const startPlayback = () => {
      if (Math.abs(audio.currentTime - targetTime) > 0.05) {
        audio.currentTime = targetTime;
      }
      audio.play().catch(() => setIsPlaying(false));
    };

    if (audio.readyState >= 1) {
      startPlayback();
    } else {
      const onMeta = () => {
        audio.removeEventListener("loadedmetadata", onMeta);
        startPlayback();
      };
      audio.addEventListener("loadedmetadata", onMeta);
      audio.load();
    }
  };

  const handleSeekBar = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = segStart + ratio * segDuration;
    setElapsed(ratio * segDuration);
    if (audio.readyState >= 1) {
      audio.currentTime = Math.min(effectiveEndRef.current, target);
    }
  };

  const progressRatio = Math.max(0, Math.min(1, elapsed / segDuration));

  return (
    <div
      className="w-full max-w-screen-lg"
      data-testid="teacher-segment-player"
      data-seg-start={segStart.toFixed(3)}
      data-seg-end={segEnd.toFixed(3)}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <div className="flex justify-end">
        <span
          className="text-xs text-muted-foreground tabular-nums"
          data-testid="teacher-segment-time"
        >
          {secondsToTimestamp(elapsed)} / {secondsToTimestamp(displayDuration)}
        </span>
      </div>

      <div className="bg-background rounded-sm grid grid-cols-9 items-center relative h-[56px]">
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={handleTogglePlay}
            data-testid="teacher-segment-play-btn"
            aria-label={isPlaying ? "暂停示范" : "播放本句示范"}
            className="aspect-square rounded-full p-2 w-full max-w-[50%] h-auto bg-blue-600 hover:bg-blue-500 cursor-pointer"
          >
            {isPlaying ? (
              <PauseIcon className="w-6 h-6 text-white" />
            ) : (
              <PlayIcon className="w-6 h-6 text-white translate-x-0.5" />
            )}
          </Button>
        </div>

        <div
          className="col-span-8 h-full flex items-center gap-[3px] px-1 cursor-pointer select-none"
          onClick={handleSeekBar}
          role="slider"
          aria-label="范读片段播放进度"
          aria-valuemin={0}
          aria-valuemax={Math.round(segDuration)}
          aria-valuenow={Math.round(elapsed)}
        >
          {SEGMENT_BAR_HEIGHTS.map((h, i) => {
            const barPos = (i + 0.5) / SEGMENT_BAR_HEIGHTS.length;
            const isActive = barPos <= progressRatio;
            return (
              <span
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${Math.max(18, Math.round(h * 0.5))}%`,
                  backgroundColor: isActive
                    ? AUDIO_PALETTE.userAudio.progress
                    : AUDIO_PALETTE.userAudio.wave,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const RecorderButton = forwardRef<
  { start: () => void },
  {
    submitting?: boolean;
    onStart?: () => void;
    onCancel?: () => void;
    onFinish: (blob: Blob) => void;
  }
>((props, ref) => {
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

  const handleStart = async () => {
    if (submitting || isRecording) return;

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
    startRecording();
  };

  useImperativeHandle(ref, () => ({
    start: handleStart,
  }));

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

  // B4: 录音中视觉呈现（三个图标加文字标签，录音条加一句「读完点 ✓」）
  if (isRecording) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-2 py-1">
        <div className="flex items-center space-x-2 flex-wrap justify-center gap-y-2">
          {/* 取消录音按钮 */}
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCancelled(true);
              stopRecording();
              onCancel && onCancel();
            }}
            className="rounded-full bg-red-500 hover:bg-red-600 shadow px-3 h-8 text-white gap-1 text-xs font-bold shrink-0 cursor-pointer"
          >
            <XIcon className="w-3.5 h-3.5 text-white" />
            <span>取消</span>
          </Button>

          <LiveAudioVisualizer
            mediaRecorder={mediaRecorder}
            barWidth={2}
            gap={2}
            width={120}
            height={28}
            fftSize={512}
            maxDecibels={-10}
            minDecibels={-80}
            smoothingTimeConstant={0.4}
          />
          <span className="text-xs text-muted-foreground font-mono font-bold">
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
            variant="outline"
            className="rounded-full shadow px-3 h-8 gap-1 text-xs font-bold shrink-0 cursor-pointer"
          >
            {isPaused ? (
              <>
                <PlayIcon fill="currentColor" className="w-3.5 h-3.5" />
                <span>继续</span>
              </>
            ) : (
              <>
                <PauseIcon fill="currentColor" className="w-3.5 h-3.5" />
                <span>暂停</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCancelled(false);
              stopRecording();
            }}
            className="rounded-full bg-green-600 hover:bg-green-700 shadow px-3.5 h-8 text-white gap-1 text-xs font-bold shrink-0 cursor-pointer"
          >
            <CheckIcon className="w-4 h-4 text-white" />
            <span>完成</span>
          </Button>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
          读完点 ✓
        </span>
      </div>
    );
  }

  // 初始录音按钮
  return (
    <div className="w-full flex flex-col items-center gap-2 justify-center">
      <Button
        type="button"
        data-testid="recorder-start-btn"
        disabled={submitting}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleStart();
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
        点击开始录音
      </span>
    </div>
  );
});
