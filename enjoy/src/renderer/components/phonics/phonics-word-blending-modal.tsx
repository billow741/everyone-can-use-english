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
  getPhonicsTokenIpa,
  playPhonicsTokenSound,
  playPhonicsWordSound,
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

  // 连贯滑读 Blending 动画与发音 (精准节拍：音素读完才换下一个，整词使用 Sonia 纯正英音)
  const handleStartBlending = async () => {
    if (isBlending) return;
    setIsBlending(true);

    try {
      // 1. 逐个高亮拼读积木，精准等待前一个纯音素完全播放结束 (零空白延迟)
      for (let i = 0; i < word.sounds.length; i++) {
        setActiveHighlightIndex(i);
        // 音频已算法去空白，从第 0ms 起音，结束即 resolve
        await playPhonicsTokenSound(word.sounds[i]);
        // 音素之间留出 160ms 清爽节奏间隔，既不粘连也不拖沓
        await new Promise((r) => setTimeout(r, 160));
      }

      // 2. 音素逐个读完后，留出 200ms 呼吸缓冲
      setActiveHighlightIndex(null);
      await new Promise((r) => setTimeout(r, 200));

      // 3. 全部高亮（视觉连贯合体为整词形态）
      setActiveHighlightIndex(-1); // -1 表示全部激活
      await new Promise((r) => setTimeout(r, 140));

      // 4. Sonia 纯正牛津英音示范整词，并严格等待整词读完
      await playPhonicsWordSound(word.word, {
        voice: "en-GB-SoniaNeural",
        rate: "-5%",
      });

      // 5. 整词读完后保持高亮 450ms，让孩子看清完整单词形态
      await new Promise((r) => setTimeout(r, 450));
    } finally {
      setActiveHighlightIndex(null);
      setIsBlending(false);
    }
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
          <DialogTitle className="text-3xl font-black text-foreground tracking-tight pt-2 font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{word.word}</span>
              <span className="text-xs font-sans font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/30">
                🇬🇧 Sonia 示范
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                playPhonicsWordSound(word.word, {
                  voice: "en-GB-SoniaNeural",
                  rate: "-5%",
                })
              }
              className="size-9 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
              title="试听 Sonia 纯正英音整词朗读"
            >
              <Volume2Icon className="size-4.5" />
            </button>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            自然拼读分级可解码词 · 点击各音素积木发音，或一键连贯滑拼 (Blending)
          </DialogDescription>
        </DialogHeader>

        {/* 🧩 拼读积木（Sound Blocks）展示区 */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-300/60 text-center space-y-4">
          <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center justify-center gap-1.5">
            <LayersIcon className="size-4 text-amber-600" />
            <span>拼读积木动态拆解 (点击单个音素发音):</span>
          </div>

          {/* 积木群 */}
          <div className="flex items-center justify-center gap-3 flex-wrap py-2">
            {word.sounds.map((soundToken, idx) => {
              const isCurrent =
                activeHighlightIndex === idx || activeHighlightIndex === -1;
              const ipaSymbol = getPhonicsTokenIpa(soundToken);
              return (
                <button
                  key={`${soundToken}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveHighlightIndex(idx);
                    playPhonicsTokenSound(soundToken);
                    setTimeout(() => setActiveHighlightIndex(null), 600);
                  }}
                  className={`px-5 py-3.5 rounded-2xl font-mono border-2 transition-all cursor-pointer shadow-sm active:scale-95 flex flex-col items-center justify-center min-w-[72px] ${
                    isCurrent
                      ? "bg-amber-500 text-slate-950 border-amber-600 scale-110 shadow-lg -translate-y-1"
                      : "bg-white dark:bg-slate-800 text-foreground border-amber-300/80 hover:border-amber-500 hover:bg-amber-50"
                  }`}
                  title={`点击试听纯正音素 ${ipaSymbol} (非字母名)`}
                >
                  <span className="text-xs font-sans font-black text-amber-700 dark:text-amber-300 tracking-wider">
                    {ipaSymbol}
                  </span>
                  <span className="text-2xl font-black mt-0.5">{soundToken}</span>
                </button>
              );
            })}
          </div>

          {/* 友好说明：标明发出的是纯音素而非字母名称 */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 py-1 px-3.5 rounded-full border border-amber-400/30 w-fit mx-auto">
            <SparklesIcon className="size-3.5 text-amber-600" />
            <span>纯正自然拼读：发出的是纯音素原声 (如 /s/、/ɪ/、/t/)，而非字母名 (S, I, T)</span>
          </div>

          {/* 连贯滑读 Blending 主按钮 */}
          <div className="pt-1">
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
