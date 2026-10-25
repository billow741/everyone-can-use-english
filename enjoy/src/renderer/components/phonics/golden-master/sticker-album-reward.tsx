import React, { useState, useEffect } from "react";
import { BookOpenIcon, CheckCircle2Icon, SparklesIcon, Volume2Icon, AwardIcon, RotateCcwIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@renderer/components/ui";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { moonAudioEngine } from "./moon-audio-engine";
import { GanganInteractiveMascot } from "../game/gangan-interactive-mascot";

interface DroppedRewardItem {
  id: string;
  name: string;
  icon: string;
}

interface StickerAlbumRewardProps {
  onClose: () => void;
  onNextLevel: () => void;
  onReplay?: () => void;
  droppedReward?: DroppedRewardItem;
}

export const StickerAlbumReward: React.FC<StickerAlbumRewardProps> = ({
  onClose,
  onNextLevel,
  onReplay,
  droppedReward = { id: "honey", name: "黄金蜂蜜罐", icon: "🍯" },
}) => {
  const [animationStage, setAnimationStage] = useState<"peeling" | "stamping" | "sealed">("peeling");
  const [ganganSpeech, setGanganSpeech] = useState("太棒啦！🎉");

  useEffect(() => {
    // 阶段 1：撕开贴纸
    moonAudioEngine.playStickerPaste();

    // 阶段 2：盖章入册
    const t1 = setTimeout(() => {
      setAnimationStage("stamping");
      phonicsAudioFx.playSuccessChime();
      setGanganSpeech("盖章入册！");
    }, 700);

    // 阶段 3：金印认证
    const t2 = setTimeout(() => {
      setAnimationStage("sealed");
      setGanganSpeech("收录成功！");
      speakGanganPrompt("哇！恭喜你获得专属月亮拼读贴纸和美味掉落！已永久收录进你的大冒险手账！", {
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
    <div className="relative w-full h-[520px] max-h-[540px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#10193e] via-[#1a2352] to-[#2b1b47] p-4 sm:p-5 text-white">
      {/* 顶部背景星云与彩带浮粒 */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <span className="absolute top-4 left-8 text-xs animate-pulse">✨</span>
        <span className="absolute top-10 right-12 text-sm animate-ping">🌟</span>
        <span className="absolute top-28 left-16 text-base animate-pulse">🎉</span>
        <span className="absolute top-18 right-1/4 text-xs animate-pulse">✨</span>
      </div>

      {/* 贴纸盖印时四角深色背景区的庆典粒子 */}
      {animationStage !== "peeling" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <span className="absolute top-6 left-6 text-lg animate-ping opacity-70">✨</span>
          <span className="absolute top-12 left-12 text-base animate-bounce opacity-40">💖</span>
          <span className="absolute top-6 right-8 text-lg animate-ping opacity-70">✨</span>
          <span className="absolute top-12 right-14 text-base animate-bounce opacity-40">💖</span>
        </div>
      )}

      {/* 顶部荣耀标题与 5 格满腹 + 3 颗闪耀星星 */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 z-10 px-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-full bg-amber-400/20 border border-amber-400/40">
            <AwardIcon className="size-5 text-amber-300 animate-bounce" />
          </div>
          <h3 className="text-base font-black text-amber-300 drop-shadow-md">
            🏆 通关荣耀时刻 · 黄金贴纸入册！
          </h3>
        </div>

        {/* 饱腹度 5 格满格状态 + 三星闪耀 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-base">
            <span>⭐</span>
            <span className="text-lg -translate-y-0.5">⭐</span>
            <span>⭐</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-xs font-bold">
            <span className="text-rose-400">💖 饱腹度</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((c) => (
                <div key={c} className="h-3 w-4 rounded-xs bg-amber-400 border border-white/80 shadow-xs" />
              ))}
            </div>
            <span className="font-mono text-amber-300 font-black">5/5 满格</span>
          </div>
        </div>
      </div>

      {/* 中部核心：画册在左、敢敢在右 */}
      <div className="relative flex items-end justify-center w-full my-auto z-10 gap-3 sm:gap-4">
        {/* 精装手账画册本体 (双页展开 + 皮革包边 + 黄铜金属包角) */}
        <div className="relative w-[345px] sm:w-[370px] h-[215px] shrink-0 rounded-3xl bg-[#fefce8] dark:bg-[#201a14] border-6 border-[#78350f] dark:border-[#451a03] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-3.5 flex flex-col justify-between text-slate-800 dark:text-amber-100 rotate-[-1deg] transition-all">
          {/* 四个复古黄铜包角 */}
          <div className="absolute -top-1.5 -left-1.5 size-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 size-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 size-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 size-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg pointer-events-none" />

          {/* 画册中间中缝装订阴影与丝带书签 */}
          <div className="absolute top-0 bottom-0 left-[44%] w-[2px] bg-gradient-to-b from-amber-900/30 via-amber-950/50 to-amber-900/30 pointer-events-none" />
          <div className="absolute -top-2 left-[44%] -translate-x-1/2 w-3.5 h-7 bg-rose-600 rounded-b-md shadow-md pointer-events-none border-b-2 border-amber-200" />

          {/* 页面内容布局：左页贴纸，右页单词 + 二选一掉落物 */}
          <div className="flex h-full items-center justify-between">
            {/* 左页：黄金贴纸本体 */}
            <div
              onClick={handlePlayStickerAudio}
              className={`relative size-26 sm:size-28 rounded-2xl p-2 bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 border-3 border-amber-200 cursor-pointer transition-all duration-500 ${
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

            {/* 右页：通关认证 + 二选一掉落卡 */}
            <div className="flex-1 min-w-0 pl-3 flex flex-col justify-center items-start text-left gap-1.5">
              {/* 第 1 行：标题（无任何 IPA 符号） */}
              <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                字母 m 通关认证
              </span>

              {/* 第 2 行：引言 */}
              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-tight">
                "闭上嘴唇，从鼻尖哼出美妙乐章。"
              </p>

              {/* 第 3 行：拼读单词行 */}
              <div className="text-[10px] sm:text-[10.5px] font-bold text-amber-900 dark:text-amber-200 whitespace-nowrap flex items-center">
                <span>拼读单词：</span>
                <span className="font-mono font-black">m + oo + n = moon</span>
              </div>

              {/* 第 4 行：二选一掉落展示 (掉落 1 次，无对错) */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                <span className="text-sm">{droppedReward.icon}</span>
                <span>掉落配物：{droppedReward.name}</span>
              </div>

              {/* 第 5 行：PASSED 徽章 */}
              <div className="h-5 flex items-center">
                {animationStage === "sealed" && (
                  <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white text-[9px] font-black shadow-md border border-amber-200 flex items-center gap-1 animate-bounce">
                    <span>★ PASSED 完美收录 ★</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 站在册子右侧地面基线上的敢敢小狮子 */}
        <div className="shrink-0 flex flex-col items-center">
          <GanganInteractiveMascot
            pose="wave"
            sceneTint="album"
            size={110}
            speechText={ganganSpeech}
            onClick={() => {
              phonicsAudioFx.playSuccessChime();
              setGanganSpeech("最棒！⭐");
            }}
          />
        </div>
      </div>

      {/* 底部按钮栏：大的"再玩一次"、小的"下一关" */}
      <div className="w-full flex items-center justify-between gap-3 pt-2 z-20 max-w-lg">
        {/* 返回地图小按钮 */}
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-xl text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          返回地图
        </button>

        {/* 大的"再玩一次" */}
        <Button
          size="lg"
          type="button"
          onClick={onReplay ? onReplay : onClose}
          className="flex-[2] h-13 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-sm gap-2 shadow-xl shadow-amber-500/30 cursor-pointer border-2 border-white/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <RotateCcwIcon className="size-4.5" />
          <span>再玩一次</span>
        </Button>

        {/* 小的"下一关" */}
        <Button
          size="sm"
          type="button"
          onClick={onNextLevel}
          variant="outline"
          className="flex-[1] h-10 rounded-xl border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-xs gap-1 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>下一关</span>
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
