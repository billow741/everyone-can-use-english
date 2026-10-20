import React, { useState, useRef, useEffect } from "react";
import { MicIcon, SquareIcon, StarIcon, SparklesIcon, Volume2Icon } from "lucide-react";
import { PhonicsAnchorItem } from "@renderer/lib/phoneme-anchors";
import {
  phonicsAudioFx,
  speakGanganPrompt,
} from "@renderer/lib/phonics-audio-fx";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { GanganInteractiveMascot, GanganMood } from "./gangan-interactive-mascot";

interface PhonemeVoiceBalloonGameProps {
  targetItem: PhonicsAnchorItem;
  onSuccess: () => void;
}

export const PhonemeVoiceBalloonGame: React.FC<PhonemeVoiceBalloonGameProps> = ({
  targetItem,
  onSuccess,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [balloonScale, setBalloonScale] = useState(1);
  const [isPopped, setIsPopped] = useState(false);
  const [mood, setMood] = useState<GanganMood>("idle");
  const [speech, setSpeech] = useState<string>("");
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setBalloonScale(1);
    setIsPopped(false);
    setMood("idle");
    setSpeech(`大声念 ${targetItem.letter} 吹爆气球！`);

    const promptText = `现在，按住麦克风，大声读出字母 ${targetItem.letter} 和代表词 ${targetItem.anchorWord}，把魔法能量气球吹大吧！`;
    const timer = setTimeout(() => {
      speakGanganPrompt(promptText);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [targetItem.id]);

  const handleStartRecord = () => {
    if (isPopped) return;
    phonicsAudioFx.playPop();
    setIsRecording(true);
    setMood("eating"); // 敢敢张大嘴一起加油
    setSpeech("加油加油！气球越来越大啦！💨");

    // 气球膨胀动画序列
    setBalloonScale(1.15);
    const t1 = setTimeout(() => setBalloonScale(1.3), 700);
    const t2 = setTimeout(() => setBalloonScale(1.45), 1400);

    // 2.2 秒后自动引爆气球
    timerRef.current = setTimeout(() => {
      clearTimeout(t1);
      clearTimeout(t2);
      popBalloon();
    }, 2200);
  };

  const handleStopRecord = () => {
    if (!isRecording || isPopped) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    popBalloon();
  };

  const popBalloon = () => {
    setIsRecording(false);
    setIsPopped(true);
    phonicsAudioFx.playBalloonPop();

    setTimeout(() => {
      phonicsAudioFx.playSuccessChime();
      setMood("cheering");
      setSpeech("砰！气球破啦！满星通关！🎉");

      speakGanganPrompt(`太棒啦！声音真洪亮！恭喜获得三星能量！`, {
        pitch: 1.3,
        onEnd: () => {
          setTimeout(onSuccess, 800);
        },
      });

      // 兜底 2.2 秒推进
      setTimeout(onSuccess, 2200);
    }, 250);
  };

  return (
    <div className="flex flex-col items-center justify-between w-full min-h-[360px] py-2 relative select-none">
      {/* 顶部：敢敢伴学鼓励 */}
      <div className="flex flex-col items-center">
        <GanganInteractiveMascot
          mood={mood}
          size={120}
          speechText={speech}
          onClick={() => {
            playPhonemeSound(targetItem.ipaSymbol);
            setTimeout(() => playStandardTts(targetItem.anchorWord), 500);
          }}
        />
      </div>

      {/* 中部：魔法气球 / 爆开后的 3D 代表物 */}
      <div className="relative size-44 sm:size-48 flex items-center justify-center my-2">
        {!isPopped ? (
          <div
            style={{ transform: `scale(${balloonScale})` }}
            className={`relative size-36 sm:size-40 rounded-full bg-gradient-to-tr from-rose-500 via-pink-400 to-amber-300 p-3 shadow-xl flex flex-col items-center justify-center text-white border-4 border-white/60 transition-transform duration-300 ${
              isRecording ? "animate-pulse" : "animate-bounce"
            }`}
          >
            {/* 气球高光 */}
            <div className="absolute top-3 left-4 w-6 h-3 rounded-full bg-white/50 -rotate-30" />

            <span className="text-3xl font-black font-sans drop-shadow-md">
              {targetItem.letter}
            </span>
            <span className="text-xs font-bold font-mono opacity-90 mt-0.5">
              /{targetItem.anchorWord}/
            </span>

            {/* 气球下端吹口结 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-2 bg-rose-600 rounded-b-sm" />
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-muted-foreground/60" />
          </div>
        ) : (
          // 气球爆破后：3D 萌物登场 + 三星闪耀
          <div className="flex flex-col items-center justify-center animate-bounce">
            <div className="size-32 rounded-3xl bg-amber-500/10 p-2 border-2 border-amber-400 flex items-center justify-center relative shadow-lg">
              <img
                src={targetItem.imageUrl}
                alt={targetItem.anchorWord}
                className="w-full h-full object-contain filter drop-shadow-md"
              />
              <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-xs">
                {targetItem.anchorWord}
              </div>
            </div>

            {/* 三颗金星 */}
            <div className="flex items-center gap-1.5 mt-2">
              <StarIcon className="size-6 fill-amber-400 text-amber-500" />
              <StarIcon className="size-8 fill-amber-400 text-amber-500 -translate-y-1" />
              <StarIcon className="size-6 fill-amber-400 text-amber-500" />
            </div>
          </div>
        )}
      </div>

      {/* 底部：录音大按钮 */}
      {!isPopped ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onPointerDown={handleStartRecord}
            onPointerUp={handleStopRecord}
            className={`size-20 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl relative ${
              isRecording
                ? "bg-rose-500 text-white scale-110 ring-8 ring-rose-400/40 animate-pulse"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 ring-4 ring-amber-300/60 hover:scale-105 active:scale-95"
            }`}
          >
            {isRecording ? (
              <>
                <SquareIcon className="size-8 fill-current" />
                <span className="text-[10px] font-black mt-0.5">松开引爆</span>
              </>
            ) : (
              <>
                <MicIcon className="size-9 fill-current" />
                <span className="text-[10px] font-black mt-0.5">按住大声读</span>
              </>
            )}
          </button>
          <span className="text-xs font-bold text-muted-foreground">
            {isRecording ? "🔴 声音注入中...把气球吹大！" : "按住麦克风大声读，吹爆气球！"}
          </span>
        </div>
      ) : (
        <div className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <SparklesIcon className="size-4 animate-spin" />
          <span>能量已充满，正在前往积木工坊...</span>
        </div>
      )}
    </div>
  );
};
