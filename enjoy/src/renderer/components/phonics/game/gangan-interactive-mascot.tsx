import React from "react";

export type GanganMood = "idle" | "hungry" | "eating" | "happy" | "confused" | "cheering";

interface GanganInteractiveMascotProps {
  mood?: GanganMood;
  size?: number;
  className?: string;
  speechText?: string;
  onClick?: () => void;
}

export const GanganInteractiveMascot: React.FC<GanganInteractiveMascotProps> = ({
  mood = "idle",
  size = 150,
  className = "",
  speechText,
  onClick,
}) => {
  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      onClick={onClick}
    >
      {/* 敢敢上方趣味说话气泡 */}
      {speechText && (
        <div className="mb-2 max-w-[280px] px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 dark:from-amber-950/90 dark:to-yellow-950/90 border-2 border-amber-400 text-amber-950 dark:text-amber-100 text-xs font-black shadow-lg text-center relative animate-bounce z-20">
          <span>{speechText}</span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-8 border-t-amber-400" />
        </div>
      )}

      {/* 敢敢 3D 官方正版形象容器 */}
      <div
        style={{ width: size, height: size * 1.15 }}
        className={`relative transition-all duration-300 cursor-pointer ${
          mood === "cheering"
            ? "animate-bounce scale-110"
            : mood === "eating"
            ? "scale-105 animate-pulse"
            : mood === "confused"
            ? "-rotate-6 scale-95"
            : mood === "hungry"
            ? "hover:scale-105"
            : "hover:scale-105"
        }`}
      >
        {/* 背景柔光能量光晕 */}
        <div
          className={`absolute inset-0 rounded-full blur-xl -z-10 transition-colors duration-500 ${
            mood === "eating" || mood === "happy" || mood === "cheering"
              ? "bg-amber-400/40"
              : mood === "confused"
              ? "bg-sky-400/30"
              : "bg-amber-300/25"
          }`}
        />

        {/* 官方高精度 3D 敢敢形象图片 */}
        <img
          src="/assets/gangan/gangan_official.png"
          alt="敢敢小狮子"
          className="w-full h-full object-contain filter drop-shadow-[0_12px_16px_rgba(180,83,9,0.22)]"
        />

        {/* 1. 胜利状态：黄金 3D 皇冠 */}
        {(mood === "happy" || mood === "cheering") && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl animate-bounce drop-shadow-md z-10">
            👑
          </div>
        )}

        {/* 2. 咀嚼与吃东西状态：爱心、星星、咀嚼动效 */}
        {mood === "eating" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="absolute -top-2 -right-2 text-2xl animate-ping">💖</span>
            <span className="absolute -bottom-1 -left-2 text-2xl animate-bounce">✨</span>
            <span className="absolute top-8 -left-5 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black shadow-md animate-pulse">
              Yum! 😋
            </span>
          </div>
        )}

        {/* 3. 困惑状态：汗滴与问号浮动 */}
        {mood === "confused" && (
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute -top-1 -right-1 text-2xl animate-bounce">💧</span>
            <span className="absolute top-2 -left-3 text-lg font-black text-sky-500 animate-pulse">
              ❓
            </span>
          </div>
        )}

        {/* 4. 饥饿状态：等待投喂的闪亮小星星 */}
        {mood === "hungry" && (
          <div className="absolute -bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm animate-pulse border border-amber-300">
            求投喂 🥣
          </div>
        )}
      </div>
    </div>
  );
};
