import React, { useState, useEffect } from "react";
import { BookOpenIcon, CheckCircle2Icon, SparklesIcon, Volume2Icon, AwardIcon } from "lucide-react";
import { Button } from "@renderer/components/ui";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { moonAudioEngine } from "./moon-audio-engine";
import { GanganInteractiveMascot } from "../game/gangan-interactive-mascot";

interface StickerAlbumRewardProps {
  onClose: () => void;
  onNextLevel: () => void;
}

export const StickerAlbumReward: React.FC<StickerAlbumRewardProps> = ({
  onClose,
  onNextLevel,
}) => {
  const [animationStage, setAnimationStage] = useState<"peeling" | "stamping" | "sealed">("peeling");
  const [ganganSpeech, setGanganSpeech] = useState("哇！太棒啦！专属月亮贴纸揭下来啦！");

  useEffect(() => {
    // 阶段 1：撕开贴纸
    moonAudioEngine.playStickerPaste();

    // 阶段 2：盖章入册
    const t1 = setTimeout(() => {
      setAnimationStage("stamping");
      phonicsAudioFx.playSuccessChime();
      setGanganSpeech("咔嗒！金箔贴纸牢牢贴进收藏册啦！获得拼读印章！🌟");
    }, 700);

    // 阶段 3：金印认证
    const t2 = setTimeout(() => {
      setAnimationStage("sealed");
      speakGanganPrompt("哇！恭喜你获得专属月亮拼读贴纸！已永久收录进你的大冒险手账！", {
        pitch: 1.25,
      });
    }, 1300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handlePlayStickerAudio = () => {
    phonicsAudioFx.playPop();
    playStandardTts("moon", {
      onEnd: () => {
        playPhonemeSound("m");
      },
    });
  };

  return (
    <div className="relative w-full h-[470px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e1638] via-[#1b2354] to-[#251744] p-5 text-white">
      {/* 顶部背景星云与彩带浮粒 */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <span className="absolute top-4 left-8 text-xs animate-pulse">✨</span>
        <span className="absolute top-10 right-12 text-sm animate-ping">🌟</span>
        <span className="absolute top-28 left-16 text-base animate-pulse">🎉</span>
        <span className="absolute top-18 right-1/4 text-xs animate-pulse">✨</span>
      </div>

      {/* 顶部荣耀标题 */}
      <div className="flex items-center gap-2 z-10">
        <div className="p-1 rounded-full bg-amber-400/20 border border-amber-400/40">
          <AwardIcon className="size-5 text-amber-300 animate-bounce" />
        </div>
        <h3 className="text-base font-black text-amber-300 drop-shadow-md">
          🏆 通关荣耀时刻 · 黄金贴纸入册！
        </h3>
      </div>

      {/* 敢敢上方祝贺气泡 */}
      <div className="z-10 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-black shadow-md backdrop-blur-sm animate-bounce">
        🦁 敢敢：" {ganganSpeech} "
      </div>

      {/* 中部核心：3D 实体精装冒险手账收集画册 */}
      <div className="relative flex items-center justify-center my-auto w-full z-10">
        {/* 精装手账画册本体 (双页展开 + 皮革包边 + 黄铜金属包角) */}
        <div className="relative w-[340px] sm:w-[380px] h-[230px] rounded-3xl bg-[#fefce8] dark:bg-[#201a14] border-6 border-[#78350f] dark:border-[#451a03] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-4 flex flex-col justify-between text-slate-800 dark:text-amber-100 rotate-[-1deg] transition-all">
          {/* 四个复古黄铜包角 */}
          <div className="absolute -top-1.5 -left-1.5 size-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 size-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 size-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 size-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg pointer-events-none" />

          {/* 画册中间复古缝线 / 中缝阴影 */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 bg-gradient-to-r from-black/10 via-black/20 to-transparent pointer-events-none" />

          {/* 收集册页眉 */}
          <div className="w-full flex items-center justify-between text-[11px] font-black text-amber-900 dark:text-amber-300 border-b border-amber-200 dark:border-amber-900/60 pb-1">
            <span className="flex items-center gap-1.5">
              <BookOpenIcon className="size-3.5" />
              <span>39 自然拼读通关岛 · 专属收集册</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 text-[10px] text-amber-950 dark:text-amber-200 font-mono">
              第 01 / 39 页
            </span>
          </div>

          {/* 收集册核心：贴纸底座与 3D 飞入入册动效 */}
          <div className="relative w-full flex items-center justify-between px-2 py-1">
            {/* 左侧：已入册的精致月亮贴纸 */}
            <div
              onClick={handlePlayStickerAudio}
              className={`relative size-28 sm:size-32 rounded-3xl p-2 bg-gradient-to-br from-white via-amber-50 to-white shadow-xl border-4 border-white dark:border-amber-200 cursor-pointer transition-all duration-500 ${
                animationStage === "peeling"
                  ? "scale-125 -rotate-12 shadow-[0_25px_40px_rgba(245,158,11,0.5)] z-30"
                  : animationStage === "stamping"
                  ? "scale-100 rotate-2 shadow-md z-10"
                  : "rotate-2 hover:scale-105 active:scale-95 shadow-md"
              }`}
            >
              {/* 金色全息光泽流动动画 */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-60 pointer-events-none" />

              {/* 3D 黏土月亮贴纸主图 */}
              <img
                src="/assets/phonics/anchors/anchor-moon-transparent.png"
                alt="月亮贴纸"
                className="w-full h-full object-contain filter drop-shadow-md"
              />

              {/* 贴纸金属光泽编号徽章 */}
              <div className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[9px] font-black font-mono shadow-md border border-amber-100 flex items-center gap-1">
                <span>★ #01 MOON</span>
              </div>

              {/* 点击重播读音提示 */}
              <div className="absolute -top-2 -left-2 px-1.5 py-0.5 rounded-full bg-slate-900/80 text-amber-200 text-[8px] font-bold border border-amber-300 flex items-center gap-0.5 pointer-events-none">
                <Volume2Icon className="size-2.5" />
                <span>点我读音</span>
              </div>
            </div>

            {/* 右侧：贴纸通关评语与火漆印章 */}
            <div className="flex-1 pl-4 flex flex-col justify-center items-start text-left">
              <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                /m/ 萌芽通关认证
              </span>
              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400 mt-0.5 leading-snug">
                "闭上嘴唇，从鼻尖哼出美妙乐章。"
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-700/80 dark:text-amber-500 font-medium">
                <span>拼读单词:</span>
                <strong className="text-amber-900 dark:text-amber-200 text-xs font-black">
                  m - oo - n ➔ moon
                </strong>
              </div>

              {/* 阶段 3 盖下的赤金火漆印章 */}
              {animationStage === "sealed" && (
                <div className="mt-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white text-[10px] font-black shadow-lg border-2 border-amber-200 flex items-center gap-1 animate-bounce">
                  <span>★ PASSED 完美收录 ★</span>
                </div>
              )}
            </div>
          </div>

          {/* 收集册页脚 */}
          <div className="w-full flex items-center justify-between text-[10px] text-amber-800/70 dark:text-amber-400/70 border-t border-amber-200/60 dark:border-amber-900/40 pt-1">
            <span>✨ 收藏能量：+100 探险积分</span>
            <span className="font-mono">SunnyBridge Adventure</span>
          </div>
        </div>

        {/* 贴纸盖印时爆裂的金色星光粒子 */}
        {animationStage !== "peeling" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-5xl animate-ping opacity-70">✨</span>
            <span className="text-3xl animate-bounce">💖</span>
          </div>
        )}

        {/* 坐在一旁的通关庆典敢敢小狮子 (戴皇冠、胜利欢呼、彩带礼花) */}
        <div className="absolute -bottom-8 right-0 sm:right-4 z-20">
          <GanganInteractiveMascot
            scenario="celebrate"
            size={120}
            onClick={() => {
              phonicsAudioFx.playSuccessChime();
              setGanganSpeech("太厉害啦！你是我见过最棒的拼读小探险家！🎉");
            }}
          />
        </div>
      </div>

      {/* 底部离开与继续按钮 */}
      <div className="w-full flex gap-3 pt-2 z-20">
        <Button
          size="lg"
          type="button"
          onClick={onClose}
          variant="outline"
          className="flex-1 h-12 rounded-2xl border-2 border-white/20 bg-white/10 hover:bg-white/20 text-white font-black text-xs cursor-pointer"
        >
          <span>返回岛屿地图</span>
        </Button>

        <Button
          size="lg"
          type="button"
          onClick={onNextLevel}
          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-lg shadow-amber-500/30 cursor-pointer"
        >
          <span>挑战下一关 ➔</span>
        </Button>
      </div>
    </div>
  );
};
