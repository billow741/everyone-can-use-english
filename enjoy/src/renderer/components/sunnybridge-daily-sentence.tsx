import React, { useState } from "react";
import dayjs from "@renderer/lib/dayjs";
import { usePronunciationCoach } from "@renderer/context";
import { Button } from "@renderer/components/ui";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  RotateCwIcon,
  Volume2Icon,
  CheckCircle2Icon,
  MicIcon,
  ArrowRightIcon,
} from "lucide-react";

export interface SunnyBridgeDailySentenceProps {
  className?: string;
  onAssessmentSuccess?: () => void;
  variant?: "default" | "pronunciation";
  ipa?: string;
}


/**
 * 今日金句跟读与声学评测组件
 * 句源口径：60 句 TMM 库（TMM_CURATED_EXERCISES，按年积日轮换，换一句在 60 句内循环）
 * 评测参数：referenceText, translation, audioUrl, phonicsFocus, source: "quote"
 * W6b 状态：onSentenceDone 已移除，不恢复
 */
export const SunnyBridgeDailySentence: React.FC<SunnyBridgeDailySentenceProps> = ({
  className,
  onAssessmentSuccess,
  variant = "default",
  ipa,
}) => {
  const { openAssessment } = usePronunciationCoach();
  const [isPlaying, setIsPlaying] = useState(false);
  const {
    index: currentIndex,
    sentence: currentSentence,
    nextSentence: handleNext,
    totalCount,
  } = useDailySentence();

  const handlePlayAudio = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (currentSentence.audioUrl) {
      const audio = new Audio(currentSentence.audioUrl);
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => fallbackSpeech();
      audio.play().catch(() => fallbackSpeech());
    } else {
      fallbackSpeech();
    }
  };

  const fallbackSpeech = () => {
    setIsPlaying(true);
    playStandardTts(currentSentence.text, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onEnd: () => setIsPlaying(false),
    }).catch(() => setIsPlaying(false));
  };

  const handleStartAssessment = () => {
    const todayDate = dayjs().format("YYYY-MM-DD");
    const quoteRef = currentSentence.id
      ? `${currentSentence.id}#${todayDate}`
      : `quote#${todayDate}`;
    openAssessment({
      referenceText: currentSentence.text,
      translation: currentSentence.translation,
      audioUrl: currentSentence.audioUrl,
      phonicsFocus: currentSentence.phonicsFocus,
      source: "quote",
      contextTitle: "今日每日精读金句",
      archiveContext: {
        source: "quote",
        contextRef: quoteRef,
      },
      onSuccess: () => {
        onAssessmentSuccess?.();
      },
    });
  };

  return (
    <div
      className={`rounded-[14px] border border-sand-border bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-none ${
        className || ""
      }`}
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-2xs shrink-0">
            🌟
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-foreground leading-snug">
                今日金句 · 大声跟读
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/40 shrink-0">
                外教纯正原声
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5 leading-relaxed">
              听外教纯正示范，跟着大声开口。
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleNext}
          className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground rounded-full px-3 gap-1.5 cursor-pointer border border-border/80 shrink-0"
        >
          <RotateCwIcon className="size-3.5" />
          <span>换一句 ({currentIndex + 1}/{totalCount})</span>
        </Button>
      </div>

      <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/50 dark:bg-slate-800/60 border-2 border-amber-200/60 dark:border-slate-700 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            {currentSentence.topic && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-amber-200 text-amber-900 dark:text-amber-200">
                  {currentSentence.topic}
                </span>
              </div>
            )}
            <div className="text-2xl sm:text-3xl font-black text-foreground font-serif tracking-wide leading-tight">
              &ldquo;{currentSentence.text}&rdquo;
            </div>
            {variant === "pronunciation" && ipa && (
              <div className="ipa text-base sm:text-lg font-normal text-[#4E6B69] dark:text-amber-200/80 tracking-wide font-sans">
                {ipa}
              </div>
            )}
            <div className="text-sm font-bold text-muted-foreground">
              {currentSentence.translation}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handlePlayAudio}
            className={`rounded-2xl shrink-0 cursor-pointer h-11 px-5 font-black text-xs transition-all shadow-xs border-2 ${
              isPlaying
                ? "border-primary text-primary animate-pulse bg-primary/10"
                : "bg-white hover:bg-primary/5 text-foreground border-border"
            }`}
          >
            <Volume2Icon className="size-4 mr-1.5 text-primary" />
            <span>{isPlaying ? "正在示范中..." : "听外教老师范读"}</span>
          </Button>
        </div>
      </div>

      {variant === "pronunciation" ? (
        <div className="space-y-5">
          {/* 录音按钮：点按开弹窗 */}
          <div className="flex flex-col items-center justify-center">
            <div
              className="sb-record"
              onClick={handleStartAssessment}
            >
              <button
                type="button"
                className="btn"
                title="开始跟读"
                aria-label="开始跟读"
              >
                <MicIcon className="size-8 text-[#123B3C] stroke-[2.2]" />
              </button>
              <span>开始跟读</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground pt-3 border-t border-sand-border/40">
            <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0" />
            <span>英国母语真人示范</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <CheckCircle2Icon className="size-4.5 text-emerald-500 shrink-0" />
            <span>英国母语真人示范</span>
          </div>

          <Button
            size="sm"
            onClick={handleStartAssessment}
            className="w-full sm:w-auto h-11 px-6 bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-bold rounded-lg gap-2 shadow-none transition-all cursor-pointer text-sm border-none"
          >
            <MicIcon className="size-5" />
            <span>马上大声跟读</span>
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
