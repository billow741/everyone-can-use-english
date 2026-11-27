import { useEffect, useRef, useState } from "react";
import { Button } from "@renderer/components/ui";
import {
  CheckIcon,
  LoaderIcon,
  MicIcon,
  SquareIcon,
} from "lucide-react";
import {
  compareTranscriptWords,
  recognizeSpeechWords,
} from "@renderer/components/pronunciation-assessments/word-signal";
import type { SrsGrade } from "@renderer/lib/vocab-srs";

type SpeakStatus =
  | "idle"
  | "recording"
  | "recognizing"
  | "matched"
  | "missed";

const MAX_RECORD_MS = 4000;

/**
 * 复习卡轻量跟读组件：
 * - 录音后仅调用 /api/speech/recognize-word + word-signal 本地对齐；
 * - 只展示词级信号与按钮建议（读对建议 Good，读错建议 Again），绝不写发音档案、不自动打分；
 * - 麦克风不可用或识别失败时静默回落普通翻卡，不报错不阻塞。
 */
export function VocabReviewSpeak({
  meaningId,
  word,
  onSuggestionChange,
}: {
  meaningId: string;
  word: string;
  onSuggestionChange: (suggestion: SrsGrade | null) => void;
}) {
  const [status, setStatus] = useState<SpeakStatus>("idle");
  const [heardLike, setHeardLike] = useState<string | undefined>(undefined);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeCardIdRef = useRef<string>(meaningId);
  const unmountedRef = useRef<boolean>(false);
  const onSuggestionRef = useRef(onSuggestionChange);
  onSuggestionRef.current = onSuggestionChange;

  const stopTracks = (stream: MediaStream | null) => {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    } catch {}
  };

  const cleanupMedia = () => {
    if (autoStopTimerRef.current !== null) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
      abortRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {}
    }
    stopTracks(streamRef.current);
    streamRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      cleanupMedia();
    };
  }, []);

  useEffect(() => {
    activeCardIdRef.current = meaningId;
    cleanupMedia();
    setStatus("idle");
    setHeardLike(undefined);
    onSuggestionRef.current(null);
  }, [meaningId]);

  const fallbackSilently = (cardId: string) => {
    if (unmountedRef.current || activeCardIdRef.current !== cardId) return;
    setStatus("idle");
    setHeardLike(undefined);
    onSuggestionRef.current(null);
  };

  const handleToggleSpeak = async () => {
    if (status === "recognizing") return;

    if (status === "recording") {
      if (autoStopTimerRef.current !== null) {
        window.clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      const mr = mediaRecorderRef.current;
      if (mr && mr.state === "recording") {
        try {
          mr.stop();
          return;
        } catch {
          cleanupMedia();
          fallbackSilently(activeCardIdRef.current);
          return;
        }
      }
      cleanupMedia();
      fallbackSilently(activeCardIdRef.current);
      return;
    }

    const cardId = meaningId;
    const targetWord = word.trim();
    if (!targetWord) {
      fallbackSilently(cardId);
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      fallbackSilently(cardId);
      return;
    }

    cleanupMedia();

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (unmountedRef.current || activeCardIdRef.current !== cardId) {
        stopTracks(stream);
        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mr.onerror = () => {
        cleanupMedia();
        fallbackSilently(cardId);
      };

      mr.onstop = async () => {
        if (autoStopTimerRef.current !== null) {
          window.clearTimeout(autoStopTimerRef.current);
          autoStopTimerRef.current = null;
        }
        stopTracks(streamRef.current);
        streamRef.current = null;
        mediaRecorderRef.current = null;

        if (unmountedRef.current || activeCardIdRef.current !== cardId) {
          chunksRef.current = [];
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        chunksRef.current = [];

        if (blob.size === 0) {
          fallbackSilently(cardId);
          return;
        }

        setStatus("recognizing");
        const ctl = new AbortController();
        abortRef.current = ctl;

        try {
          const alts = await recognizeSpeechWords(blob, ctl.signal);
          if (
            ctl.signal.aborted ||
            unmountedRef.current ||
            activeCardIdRef.current !== cardId
          ) {
            return;
          }
          if (!alts || alts.length === 0) {
            fallbackSilently(cardId);
            return;
          }

          const comparison = compareTranscriptWords(targetWord, alts);
          if (!comparison) {
            fallbackSilently(cardId);
            return;
          }

          if (comparison.allMatched) {
            setStatus("matched");
            setHeardLike(undefined);
            onSuggestionRef.current("good");
          } else {
            setStatus("missed");
            setHeardLike(comparison.missedWords[0]?.heardLike);
            onSuggestionRef.current("again");
          }
        } catch {
          fallbackSilently(cardId);
        } finally {
          if (abortRef.current === ctl) {
            abortRef.current = null;
          }
        }
      };

      setHeardLike(undefined);
      onSuggestionRef.current(null);
      mr.start();
      setStatus("recording");

      autoStopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current === mr && mr.state === "recording") {
          try {
            mr.stop();
          } catch {}
        }
      }, MAX_RECORD_MS);
    } catch {
      stopTracks(stream);
      cleanupMedia();
      fallbackSilently(cardId);
    }
  };

  return (
    <div
      data-testid="review-speak-bar"
      className="mt-3 pt-3 border-t border-sand-border/80 flex flex-wrap items-center justify-between gap-2 shrink-0"
    >
      <Button
        type="button"
        size="sm"
        variant={status === "recording" ? "destructive" : "outline"}
        disabled={status === "recognizing"}
        aria-pressed={status === "recording"}
        data-testid="review-speak-btn"
        onClick={handleToggleSpeak}
        className="min-h-[36px] gap-1.5 rounded-xl px-3 text-xs font-bold shadow-none"
      >
        {status === "recording" ? (
          <>
            <SquareIcon className="size-3.5 fill-current animate-pulse" />
            <span>录音中…点此停止</span>
          </>
        ) : status === "recognizing" ? (
          <>
            <LoaderIcon className="size-3.5 animate-spin" />
            <span>识别中…</span>
          </>
        ) : (
          <>
            <MicIcon className="size-3.5" />
            <span>{status === "idle" ? "跟读" : "再读一遍"}</span>
          </>
        )}
      </Button>

      {status === "matched" && (
        <div
          role="status"
          aria-live="polite"
          data-testid="review-speak-signal"
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
        >
          <CheckIcon className="size-3.5 shrink-0" />
          <span>听清了 · 建议选「记得」</span>
        </div>
      )}

      {status === "missed" && (
        <div
          role="status"
          aria-live="polite"
          data-testid="review-speak-signal"
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
        >
          <span>
            {heardLike ? `听起来像「${heardLike}」` : "没听清"} · 建议选「忘了」
          </span>
        </div>
      )}
    </div>
  );
}
