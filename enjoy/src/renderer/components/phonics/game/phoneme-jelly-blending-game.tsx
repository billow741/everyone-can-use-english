import React, { useState, useEffect } from "react";
import { SparklesIcon, CheckCircle2Icon } from "lucide-react";
import {
  PhonicsAnchorItem,
  getAnchorBlocks,
} from "@renderer/lib/phoneme-anchors";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  phonicsAudioFx,
  speakGanganPrompt,
} from "@renderer/lib/phonics-audio-fx";
import { GanganInteractiveMascot, GanganMood } from "./gangan-interactive-mascot";

interface PhonemeJellyBlendingGameProps {
  targetItem: PhonicsAnchorItem;
  onSuccess: () => void;
}

export const PhonemeJellyBlendingGame: React.FC<PhonemeJellyBlendingGameProps> = ({
  targetItem,
  onSuccess,
}) => {
  const [tappedIndices, setTappedIndices] = useState<number[]>([]);
  const [isBlended, setIsBlended] = useState(false);
  const [mood, setMood] = useState<GanganMood>("idle");
  const [speech, setSpeech] = useState<string>("");

  const blocks = getAnchorBlocks(targetItem.anchorWord);

  useEffect(() => {
    setTappedIndices([]);
    setIsBlended(false);
    setMood("idle");
    setSpeech(`按顺序点亮积木拼出 ${targetItem.anchorWord}！`);

    const promptText = `最后一步！按顺序点击果冻积木，听音拼出 ${targetItem.anchorWord}！`;
    const timer = setTimeout(() => {
      speakGanganPrompt(promptText);
    }, 200);

    return () => clearTimeout(timer);
  }, [targetItem.id]);

  const handleTapBlock = (index: number) => {
    if (isBlended) return;

    phonicsAudioFx.playPop();
    const blk = blocks[index];
    playPhonemeSound(blk.sound);

    if (!tappedIndices.includes(index)) {
      const next = [...tappedIndices, index];
      setTappedIndices(next);

      // 全部拼搭完成！
      if (next.length === blocks.length) {
        setTimeout(() => {
          setIsBlended(true);
          phonicsAudioFx.playSuccessChime();
          setMood("cheering");
          setSpeech(`成功合体！${targetItem.anchorWord}！🎉`);

          playStandardTts(targetItem.anchorWord, {
            onEnd: () => {
              speakGanganPrompt(`太棒啦！恭喜通关！小勇士真厉害！`, {
                pitch: 1.3,
                onEnd: () => setTimeout(onSuccess, 800),
              });
            },
          });

          // 兜底 2.5 秒推进
          setTimeout(onSuccess, 2500);
        }, 400);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[360px] py-2 relative select-none">
      {/* 顶部：敢敢互动 */}
      <div className="flex flex-col items-center">
        <GanganInteractiveMascot
          mood={mood}
          size={120}
          speechText={speech}
          onClick={() => {
            playStandardTts(targetItem.anchorWord);
          }}
        />
      </div>

      {/* 中部：果冻积木碰撞区 */}
      <div className="w-full flex flex-col items-center justify-center my-4">
        {!isBlended ? (
          // 独立果冻积木排布
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {blocks.map((blk, idx) => {
              const isTapped = tappedIndices.includes(idx);
              const isCurrentTarget =
                tappedIndices.length === idx; // 下一个该点按的目标

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTapBlock(idx)}
                  className={`size-20 sm:size-22 rounded-3xl flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 border-b-6 shadow-xl ${
                    isTapped
                      ? "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-amber-600 text-slate-950 scale-105 ring-4 ring-amber-300/60"
                      : isCurrentTarget
                      ? "bg-white dark:bg-slate-800 border-amber-400 text-foreground ring-4 ring-amber-400/50 animate-bounce"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-foreground hover:scale-105 active:scale-95"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl font-black font-mono">
                    {blk.letters}
                  </span>
                  <span className="text-xs font-bold font-sans text-slate-600 dark:text-slate-400 mt-0.5">
                    /{blk.sound}/
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          // 合体完成状态：磁力积木融合长条 + 3D 浮雕
          <div className="flex flex-col items-center animate-bounce">
            <div className="px-6 py-3.5 rounded-3xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 font-mono font-black text-3xl shadow-2xl border-4 border-white flex items-center gap-3">
              <CheckCircle2Icon className="size-8 text-slate-950" />
              <span>{targetItem.anchorWord}</span>
              <span className="text-base font-sans font-bold bg-white/40 px-3 py-1 rounded-full">
                {targetItem.anchorZh}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 底部引导说明 */}
      <div className="flex flex-col items-center text-center">
        {!isBlended ? (
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-amber-500 animate-spin" />
            <span>依次点击拼读果冻，感受声音合体的魔法！</span>
          </span>
        ) : (
          <span className="text-xs font-black text-amber-600 dark:text-amber-400">
            ⭐ 完美拼合！正在颁发通关印章...
          </span>
        )}
      </div>
    </div>
  );
};
