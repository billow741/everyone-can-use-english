import React, { useState } from "react";
import { XIcon } from "lucide-react";
import { JellyRainFeeding } from "./jelly-rain-feeding";
import { VoiceHummingLullaby } from "./voice-humming-lullaby";
import { TrainTrackBlending } from "./train-track-blending";
import { StickerAlbumReward } from "./sticker-album-reward";
import { PhonicsAnchorItem } from "@renderer/lib/phoneme-anchors";

interface MoonSampleLevelProps {
  item: PhonicsAnchorItem;
  onClose: () => void;
  onLevelCompleted: (item: PhonicsAnchorItem) => void;
  onNextLevel: () => void;
}

export const MoonSampleLevel: React.FC<MoonSampleLevelProps> = ({
  item,
  onClose,
  onLevelCompleted,
  onNextLevel,
}) => {
  // 1 = 果冻雨, 2 = 催眠曲, 3 = 小火车, 4 = 贴纸入册
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);

  const handleStage1Complete = () => {
    setStage(2);
  };

  const handleStage2Complete = () => {
    setStage(3);
  };

  const handleStage3Complete = () => {
    setStage(4);
    onLevelCompleted(item);
  };

  return (
    <div className="w-full flex flex-col bg-slate-950 text-white overflow-hidden rounded-3xl border-2 border-amber-400/60 shadow-2xl">
      {/* 关卡顶部深蓝星空顶栏 */}
      <div className="relative px-5 py-3.5 bg-gradient-to-r from-[#0b1026] via-[#161c47] to-[#0b1026] border-b border-amber-400/30 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img
            src="/assets/gangan/gangan_official.png"
            alt="敢敢"
            className="size-10 rounded-2xl object-cover bg-amber-100 shadow-md border-2 border-amber-300"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black font-mono text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-400/40">
                第 01 关 · 样板关
              </span>
              <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-lg border border-sky-400/40">
                夜空草地
              </span>
            </div>
            <h2 className="text-base font-black text-amber-200 mt-0.5">
              字母 <strong className="text-xl font-mono text-amber-400">m</strong> · 沉睡月亮大冒险
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer border border-white/20"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      {/* 顶部四段式游戏进度指示条 */}
      <div className="px-5 py-2.5 bg-[#090e24] border-b border-white/10 flex items-center justify-between text-xs font-bold z-20">
        <button
          type="button"
          onClick={() => setStage(1)}
          className={`flex items-center gap-1.5 cursor-pointer transition-all ${
            stage === 1
              ? "text-amber-400 font-black scale-105"
              : stage > 1
              ? "text-emerald-400"
              : "text-slate-500"
          }`}
        >
          <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
            {stage > 1 ? "✓" : "1"}
          </span>
          <span>🌧️ 果冻雨</span>
        </button>

        <span className="text-slate-600">➔</span>

        <button
          type="button"
          onClick={() => setStage(2)}
          className={`flex items-center gap-1.5 cursor-pointer transition-all ${
            stage === 2
              ? "text-amber-400 font-black scale-105"
              : stage > 2
              ? "text-emerald-400"
              : "text-slate-500"
          }`}
        >
          <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
            {stage > 2 ? "✓" : "2"}
          </span>
          <span>🌙 催眠曲</span>
        </button>

        <span className="text-slate-600">➔</span>

        <button
          type="button"
          onClick={() => setStage(3)}
          className={`flex items-center gap-1.5 cursor-pointer transition-all ${
            stage === 3
              ? "text-amber-400 font-black scale-105"
              : stage > 3
              ? "text-emerald-400"
              : "text-slate-500"
          }`}
        >
          <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
            {stage > 3 ? "✓" : "3"}
          </span>
          <span>🚂 小火车</span>
        </button>

        <span className="text-slate-600">➔</span>

        <button
          type="button"
          onClick={() => setStage(4)}
          className={`flex items-center gap-1.5 cursor-pointer transition-all ${
            stage === 4 ? "text-amber-400 font-black scale-105" : "text-slate-500"
          }`}
        >
          <span className="size-5 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
            🏆
          </span>
          <span>收集册</span>
        </button>
      </div>

      {/* 核心沉浸游戏容器 */}
      <div className="w-full">
        {stage === 1 && <JellyRainFeeding onSuccess={handleStage1Complete} />}
        {stage === 2 && <VoiceHummingLullaby onSuccess={handleStage2Complete} />}
        {stage === 3 && <TrainTrackBlending onSuccess={handleStage3Complete} />}
        {stage === 4 && (
          <StickerAlbumReward onClose={onClose} onNextLevel={onNextLevel} />
        )}
      </div>
    </div>
  );
};
