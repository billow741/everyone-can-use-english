import React, { useEffect } from "react";
import { BookOpenIcon, CheckCircle2Icon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Button } from "@renderer/components/ui";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { moonAudioEngine } from "./moon-audio-engine";

interface StickerAlbumRewardProps {
  onClose: () => void;
  onNextLevel: () => void;
}

export const StickerAlbumReward: React.FC<StickerAlbumRewardProps> = ({
  onClose,
  onNextLevel,
}) => {
  useEffect(() => {
    // 播放贴纸撕下并粘贴音效
    moonAudioEngine.playStickerPaste();
    phonicsAudioFx.playSuccessChime();

    speakGanganPrompt("哇！恭喜你获得专属月亮拼读贴纸！已收录进你的大冒险收集册！", {
      pitch: 1.3,
    });
  }, []);

  return (
    <div className="relative w-full h-[460px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e1638] via-[#1b2354] to-[#251744] p-5 text-white">
      {/* 顶部标题 */}
      <div className="flex items-center gap-2 z-10">
        <SparklesIcon className="size-5 text-amber-400 animate-spin" />
        <h3 className="text-base font-black text-amber-300">
          🏆 通关荣耀时刻 · 贴纸入册！
        </h3>
      </div>

      {/* 中部核心：3D 冒险收集画册与月亮贴纸 */}
      <div className="relative flex items-center justify-center my-auto w-full z-10">
        {/* 打开的羊皮纸/魔法绘本插画背景 */}
        <div className="relative w-72 sm:w-80 h-56 rounded-3xl bg-[#fef3c7] dark:bg-[#292218] border-4 border-amber-600 shadow-2xl p-4 flex flex-col items-center justify-between text-slate-800 dark:text-amber-100 rotate-[-2deg]">
          {/* 画册装订中缝线 */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-700/30 dashed" />

          {/* 收集册左页：敢敢盖章 */}
          <div className="w-full flex items-center justify-between text-[11px] font-black text-amber-900 dark:text-amber-300">
            <span className="flex items-center gap-1">
              <BookOpenIcon className="size-3.5" />
              <span>拼读岛大冒险 · 第 01 页</span>
            </span>
            <span>⭐ 通关星 +1</span>
          </div>

          {/* 3D 黏土月亮贴纸（带白边、厚度与轻微倾斜） */}
          <div className="relative size-32 rounded-3xl p-2 bg-white/95 shadow-xl border-4 border-white rotate-6 animate-bounce flex items-center justify-center">
            <img
              src="/assets/phonics/anchors/anchor-moon-transparent.png"
              alt="月亮贴纸"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
            {/* 贴纸金箔角标 */}
            <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black font-mono shadow-xs border border-amber-200">
              MOON #01
            </div>
          </div>

          {/* 底部贴纸名称与诗意文字 */}
          <div className="text-center">
            <p className="text-xs font-black text-amber-900 dark:text-amber-200">
              字母 m · Moon (月亮)
            </p>
            <p className="text-[10px] text-amber-800/80 dark:text-amber-400/80">
              "月亮在山坡上睡香香，小火车开过夜空。"
            </p>
          </div>
        </div>

        {/* 贴纸飞入时的金色星光光圈 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-4xl animate-ping opacity-60">✨</span>
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
