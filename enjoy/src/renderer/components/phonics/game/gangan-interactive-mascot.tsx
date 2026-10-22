import React from "react";

export type GanganMood = "idle" | "hungry" | "eating" | "happy" | "confused" | "cheering" | "sleepy" | "conducting";

export type GanganScenario = "default" | "eating" | "sleepy" | "conductor" | "celebrate";

interface GanganInteractiveMascotProps {
  mood?: GanganMood;
  scenario?: GanganScenario;
  size?: number;
  className?: string;
  speechText?: string;
  onClick?: () => void;
}

export const GanganInteractiveMascot: React.FC<GanganInteractiveMascotProps> = ({
  mood = "idle",
  scenario = "default",
  size = 150,
  className = "",
  speechText,
  onClick,
}) => {
  // 根据 scenario 选取专属场景动图（包含专属装扮与动作）
  let assetSrc = "/assets/gangan/gangan_official.png";
  if (scenario === "eating" || mood === "eating") {
    assetSrc = "/assets/gangan/gangan_eating.webp";
  } else if (scenario === "sleepy" || mood === "sleepy") {
    assetSrc = "/assets/gangan/gangan_sleepy.webp";
  } else if (scenario === "conductor" || mood === "conducting") {
    assetSrc = "/assets/gangan/gangan_conductor_pixar_v3.webp";
  } else if (scenario === "celebrate" || mood === "cheering" || mood === "happy") {
    assetSrc = "/assets/gangan/gangan_celebrate.webp";
  }

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      onClick={onClick}
    >
      {/* 敢敢上方趣味说话气泡 */}
      {speechText && (
        <div className="mb-2 max-w-[280px] px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 dark:from-amber-950/95 dark:to-yellow-950/95 border-2 border-amber-400 text-amber-950 dark:text-amber-100 text-xs font-black shadow-lg text-center relative animate-bounce z-30 backdrop-blur-sm">
          <span>{speechText}</span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-8 border-t-amber-400" />
        </div>
      )}

      {/* 敢敢场景动态形象容器 */}
      <div
        style={{ width: size, height: size * 1.08 }}
        className={`relative transition-all duration-300 cursor-pointer ${
          scenario === "celebrate" || mood === "cheering"
            ? "scale-105"
            : scenario === "conductor"
            ? "hover:scale-105"
            : scenario === "sleepy"
            ? "hover:scale-102"
            : "hover:scale-105 active:scale-95"
        }`}
      >
        {/* 背景柔光能量光晕 */}
        <div
          className={`absolute inset-0 rounded-full blur-xl -z-10 transition-colors duration-500 ${
            scenario === "celebrate" || mood === "cheering" || mood === "happy"
              ? "bg-amber-400/50"
              : scenario === "sleepy" || mood === "sleepy"
              ? "bg-indigo-400/30"
              : scenario === "conductor"
              ? "bg-sky-400/35"
              : scenario === "eating" || mood === "eating"
              ? "bg-amber-400/40"
              : "bg-amber-300/25"
          }`}
        />

        {/* 场景专属动图 (WebP 动画带透明通道，若不可用自动降级为 GIF) */}
        <picture className="w-full h-full block">
          <source srcSet={assetSrc} type="image/webp" />
          <img
            src={assetSrc.replace(".webp", ".gif")}
            onError={(e) => {
              // 最终容灾回退
              (e.target as HTMLImageElement).src = "/assets/gangan/gangan_official.png";
            }}
            alt="敢敢小狮子"
            className="w-full h-full object-contain filter drop-shadow-[0_12px_18px_rgba(180,83,9,0.25)] select-none pointer-events-none"
          />
        </picture>

        {/* 动态场景辅助状态微表情 */}
        {scenario === "sleepy" && (
          <div className="absolute -top-3 right-0 pointer-events-none animate-pulse">
            <span className="text-sm font-black text-sky-300 font-mono">🌙</span>
          </div>
        )}

        {scenario === "eating" && (
          <div className="absolute -bottom-2 -left-2 pointer-events-none animate-bounce">
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black shadow-sm">
              😋 好吃！
            </span>
          </div>
        )}

        {scenario === "celebrate" && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none animate-bounce">
            <span className="text-2xl drop-shadow-md">🎉</span>
          </div>
        )}
      </div>
    </div>
  );
};
