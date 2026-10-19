import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from "@renderer/components/ui";
import {
  PhonicsWord,
  getPhaseMeta,
  playPhonicsSound,
} from "@renderer/lib/open-phonics-service";
import {
  Volume2Icon,
  MicIcon,
  SparklesIcon,
  PlayIcon,
  ArrowRightIcon,
  BookOpenIcon,
  LayersIcon,
} from "lucide-react";

export const PhonicsWordBlendingModal = (props: {
  word: PhonicsWord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { word, open, onOpenChange } = props;
  const navigate = useNavigate();
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number | null>(null);
  const [isBlending, setIsBlending] = useState(false);

  if (!word) return null;

  const phaseMeta = getPhaseMeta(word.phase);

  // 连贯滑读 Blending 动画与发音
  const handleStartBlending = async () => {
    if (isBlending) return;
    setIsBlending(true);

    // 逐个高亮拼读积木
    for (let i = 0; i < word.sounds.length; i++) {
      setActiveHighlightIndex(i);
      playPhonicsSound(word.sounds[i], 0.8);
      await new Promise((r) => setTimeout(r, 650));
    }

    // 全部高亮并完整发音
    setActiveHighlightIndex(-1); // -1 表示全部激活
    await new Promise((r) => setTimeout(r, 200));
    playPhonicsSound(word.word, 0.9);

    await new Promise((r) => setTimeout(r, 900));
    setActiveHighlightIndex(null);
    setIsBlending(false);
  };

  const handleGoToAssessment = () => {
    onOpenChange(false);
    navigate(
      `/pronunciation_assessments?text=${encodeURIComponent(
        word.word
      )}&source=phonics`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-6 rounded-3xl bg-[#FFFDF7] dark:bg-slate-900 border-2 border-amber-300 shadow-2xl space-y-5">
        <DialogHeader className="pb-3 border-b border-border/50 text-left">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xl">{phaseMeta.emoji}</span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/40">
                {phaseMeta.titleZh}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Lesson {word.lesson}
              </span>
            </div>
            {word.note && (
              <Badge variant="outline" className="text-[11px] font-bold text-amber-600 border-amber-300">
                💡 {word.note}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-3xl font-black text-foreground tracking-tight pt-2 font-mono">
            {word.word}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            自然拼读分级可解码词 · 点击各音素积木发音，或一键连贯滑拼 (Blending)
          </DialogDescription>
        </DialogHeader>

        {/* 🧩 拼读积木（Sound Blocks）展示区 */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-300/60 text-center space-y-4">
          <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center justify-center gap-1.5">
            <LayersIcon className="size-4 text-amber-600" />
            <span>拼读积木动态拆解 (点击单块发音):</span>
          </div>

          {/* 积木群 */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap py-2">
            {word.sounds.map((soundToken, idx) => {
              const isCurrent =
                activeHighlightIndex === idx || activeHighlightIndex === -1;
              return (
                <button
                  key={`${soundToken}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveHighlightIndex(idx);
                    playPhonicsSound(soundToken, 0.85);
                    setTimeout(() => setActiveHighlightIndex(null), 600);
                  }}
                  className={`px-4 py-3 rounded-2xl font-mono text-xl font-black border-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                    isCurrent
                      ? "bg-amber-500 text-slate-950 border-amber-600 scale-110 shadow-lg -translate-y-1"
                      : "bg-white dark:bg-slate-800 text-foreground border-amber-300/80 hover:border-amber-500 hover:bg-amber-50"
                  }`}
                  title={`点击试听单音素 /${soundToken}/`}
                >
                  <span className="text-xs text-amber-600 dark:text-amber-400 block font-sans font-normal opacity-70">
                    音素 {idx + 1}
                  </span>
                  <span>{soundToken}</span>
                </button>
              );
            })}
          </div>

          {/* 连贯滑读 Blending 主按钮 */}
          <div className="pt-2">
            <Button
              onClick={handleStartBlending}
              disabled={isBlending}
              className="h-11 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm gap-2 shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Volume2Icon className={`size-4.5 ${isBlending ? "animate-bounce" : ""}`} />
              <span>{isBlending ? "拼读滑行中..." : "连贯滑读 (Sound Blending)"}</span>
            </Button>
          </div>
        </div>

        {/* 底部功能：直连发音纠错舱打分 */}
        <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-bold"
            onClick={() => onOpenChange(false)}
          >
            返回词库
          </Button>

          <Button
            size="sm"
            onClick={handleGoToAssessment}
            className="rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-xs gap-1.5 shadow-md border border-amber-300 cursor-pointer"
          >
            <MicIcon className="size-4" />
            <span>🎙️ 马上大声跟读（AI发音打分）</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
