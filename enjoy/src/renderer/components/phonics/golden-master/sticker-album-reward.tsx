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

      {/* 贴纸盖印时四角深色背景区的庆典粒子 (搬离文字区与册子，尺寸 ≤ text-xl，💖 透明度 ≤ 50%) */}
      {animationStage !== "peeling" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <span className="absolute top-6 left-6 text-lg animate-ping opacity-70">✨</span>
          <span className="absolute top-12 left-12 text-base animate-bounce opacity-40">💖</span>
          <span className="absolute top-6 right-8 text-lg animate-ping opacity-70">✨</span>
          <span className="absolute top-12 right-14 text-base animate-bounce opacity-40">💖</span>
        </div>
      )}

      {/* 顶部荣耀标题 */}
      <div className="flex items-center gap-2 z-10">
        <div className="p-1 rounded-full bg-amber-400/20 border border-amber-400/40">
          <AwardIcon className="size-5 text-amber-300 animate-bounce" />
        </div>
        <h3 className="text-base font-black text-amber-300 drop-shadow-md">
          🏆 通关荣耀时刻 · 黄金贴纸入册！
        </h3>
      </div>

      {/* 中部核心：排成一行 (flex items-end)，册子在左、敢敢在右站进构图基线 */}
      <div className="relative flex items-end justify-center w-full my-auto z-10 gap-2.5 sm:gap-3">
        {/* 精装手账画册本体 (双页展开 + 皮革包边 + 黄铜金属包角) */}
        <div className="relative w-[335px] sm:w-[345px] h-[200px] shrink-0 rounded-3xl bg-[#fefce8] dark:bg-[#201a14] border-6 border-[#78350f] dark:border-[#451a03] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-3.5 flex flex-col justify-between text-slate-800 dark:text-amber-100 rotate-[-1deg] transition-all">
          {/* 四个复古黄铜包角 */}
          <div className="absolute -top-1.5 -left-1.5 size-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 size-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 size-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg pointer-events-none" />
          <div className="absolute -bottom-1.5 -right-1.5 size-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg pointer-events-none" />

          {/* 画册中间中缝柔和阴影 */}
          <div
            style={{ background: "linear-gradient(to right, transparent, rgba(0, 0, 0, 0.04), transparent)" }}
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-transparent via-black/[0.04] to-transparent pointer-events-none"
          />

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

          {/* 收集册核心：左侧贴纸底座 + 右侧五行干净网格 */}
          <div className="relative w-full flex items-center justify-between px-1 flex-1 pt-1.5">
            {/* 左侧：已入册的精致月亮贴纸 */}
            <div
              onClick={handlePlayStickerAudio}
              className={`relative size-28 rounded-3xl p-2 bg-gradient-to-br from-white via-amber-50 to-white shadow-xl border-4 border-white dark:border-amber-200 cursor-pointer transition-all duration-500 shrink-0 ${
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

            {/* 右侧：干净五行网格（统一左对齐、间距一致） */}
            <div className="flex-1 min-w-0 pl-3 flex flex-col justify-center items-start text-left gap-1.5">
              {/* 第 1 行：标题 */}
              <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                /m/ 萌芽通关认证
              </span>

              {/* 第 2 行：引言 (独占一行，其上无任何图形遮挡) */}
              <p className="text-[10.5px] font-bold text-amber-800 dark:text-amber-400 leading-tight">
                "闭上嘴唇，从鼻尖哼出美妙乐章。"
              </p>

              {/* 第 3 行：拼读单词行 (单行显示，whitespace-nowrap 不截断) */}
              <div className="text-[10px] sm:text-[10.5px] font-bold text-amber-900 dark:text-amber-200 whitespace-nowrap flex items-center">
                <span>拼读单词：</span>
                <span className="font-mono font-black">m + oo + n = moon</span>
              </div>

              {/* 第 4 行：PASSED 徽章 (sealed 阶段显示，原样保留) */}
              <div className="h-6 flex items-center">
                {animationStage === "sealed" && (
                  <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white text-[10px] font-black shadow-lg border-2 border-amber-200 flex items-center gap-1 animate-bounce">
                    <span>★ PASSED 完美收录 ★</span>
                  </div>
                )}
              </div>

              {/* 第 5 行：收藏能量 (从页脚移入本网格末行) */}
              <div className="text-[10px] font-bold text-amber-800/80 dark:text-amber-400/80 flex items-center gap-1 whitespace-nowrap">
                <span>✨ 收藏能量：+100 探险积分</span>
              </div>
            </div>
          </div>
        </div>

        {/* 站在册子右侧地面基线上的定妆敢敢小狮子 (wave 定妆招手姿态 + 手账金色氛围) */}
        <div className="shrink-0 flex flex-col items-center">
          <GanganInteractiveMascot
            pose="wave"
            sceneTint="album"
            size={105}
            speechText={ganganSpeech}
            onClick={() => {
              phonicsAudioFx.playSuccessChime();
              setGanganSpeech("最棒！⭐");
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
