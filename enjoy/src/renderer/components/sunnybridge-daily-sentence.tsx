import React, { useState, useMemo } from "react";
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
}

/**
 * 今日少儿魔法金句跟读与声学评测组件
 * 句源口径：60 句 TMM 库（TMM_CURATED_EXERCISES，按年积日轮换，换一句在 60 句内循环）
 * 评测参数：referenceText, translation, audioUrl, phonicsFocus, source: "quote"
 * W6b 状态：onSentenceDone 已移除，不恢复
 */
export const SunnyBridgeDailySentence: React.FC<SunnyBridgeDailySentenceProps> = ({
  className,
  onAssessmentSuccess,
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

  // 将语言学焦点音翻译为儿童发音小窍门
  const kidFriendlyFocusHint = useMemo(() => {
    const focus = currentSentence.phonicsFocus || "";
    if (focus.includes("/r/") || focus.includes("卷舌")) {
      return "👅 发音小窍门：舌头尖尖像滑滑梯一样往后卷，但不要碰到嘴巴顶上哦！";
    }
    if (focus.includes("/θ/") || focus.includes("咬舌")) {
      return "🦷 发音小窍门：像小乌龟一样把舌尖伸出小牙齿一点点，轻轻吹气不震动！";
    }
    if (focus.includes("/ð/")) {
      return "🐝 发音小窍门：小牙齿咬住舌尖，嗓子像小蜜蜂一样嗡嗡震动！";
    }
    if (focus.includes("元音") || focus.includes("长元音")) {
      return "😮 发音小窍门：嘴巴像看牙医一样大大张开，声音响亮又好听！";
    }
    return `🎯 发音小窍门: 模仿外教口型，听清每个音符，大声跟读！`;
  }, [currentSentence.phonicsFocus]);

  return (
    <div
      className={`rounded-[14px] border border-sand-border bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-none ${
        className || ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-2xs">
            🌟
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-foreground">
                今日魔法金句 · 大声跟读大挑战
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/40">
                外教纯正原声
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              听外教纯正示范，跟着敢敢大声开口，赢取今日能量星！
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleNext}
          className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground rounded-full px-3 gap-1.5 cursor-pointer border border-border/80"
        >
          <RotateCwIcon className="size-3.5" />
          <span>换一句 ({currentIndex + 1}/{totalCount})</span>
        </Button>
      </div>

      <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/50 dark:bg-slate-800/60 border-2 border-amber-200/60 dark:border-slate-700 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {currentSentence.topic && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-amber-200 text-amber-900 dark:text-amber-200">
                  {currentSentence.topic}
                </span>
              )}
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                {kidFriendlyFocusHint}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-serif tracking-wide leading-tight">
              &ldquo;{currentSentence.text}&rdquo;
            </div>
            <div className="text-sm font-bold text-muted-foreground">
              {currentSentence.translation}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handlePlayAudio}
            className={`rounded-2xl shrink-0 cursor-pointer h-11 px-5 font-black text-xs transition-all shadow-xs border-2 ${
              isPlaying
                ? "border-amber-500 text-amber-600 animate-pulse bg-amber-100"
                : "bg-white hover:bg-amber-50 text-slate-900 border-amber-300"
            }`}
          >
            <Volume2Icon className="size-4 mr-1.5 text-amber-500" />
            <span>{isPlaying ? "正在示范中..." : "听外教老师范读"}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <CheckCircle2Icon className="size-4.5 text-emerald-500 shrink-0" />
          <span>英国母语真人示范 · 敢敢做你的发音小导师</span>
        </div>

        <Button
          size="sm"
          onClick={() => {
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
          }}
          className="w-full sm:w-auto h-11 px-6 bg-sun-orange hover:bg-sun-orange-hover text-white font-bold rounded-lg gap-2 shadow-none transition-all cursor-pointer text-sm border-none"
        >
          <MicIcon className="size-5" />
          <span>马上大声跟读（领小红花）</span>
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};
