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
  size = 140,
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
        <div className="mb-2 max-w-[260px] px-3.5 py-1.5 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 text-amber-950 dark:text-amber-200 text-xs font-black shadow-md text-center relative animate-bounce">
          <span>{speechText}</span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-8 border-t-amber-400" />
        </div>
      )}

      {/* 敢敢动态 SVG 角色 */}
      <div
        style={{ width: size, height: size }}
        className={`relative transition-transform duration-300 ${
          mood === "cheering"
            ? "animate-bounce scale-110"
            : mood === "eating"
            ? "scale-105 animate-pulse"
            : mood === "confused"
            ? "rotate-6"
            : "hover:scale-105"
        }`}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-lg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 鬃毛渐变 */}
            <radialGradient id="ganganMane" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
            {/* 脸部渐变 */}
            <linearGradient id="ganganFace" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fde68a" />
            </linearGradient>
            {/* 皇冠金渐变 */}
            <linearGradient id="ganganCrown" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* 1. 蓬松狮子鬃毛 (Outer Mane) */}
          <g className={mood === "eating" ? "animate-pulse" : ""}>
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const cx = 100 + Math.cos(rad) * 62;
              const cy = 105 + Math.sin(rad) * 62;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="26"
                  fill="url(#ganganMane)"
                  stroke="#92400e"
                  strokeWidth="2.5"
                />
              );
            })}
          </g>

          {/* 2. 可爱狮子耳朵 */}
          <g>
            {/* 左耳 */}
            <circle cx="58" cy="56" r="20" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />
            <circle cx="60" cy="58" r="12" fill="#fbcfe8" />
            {/* 右耳 */}
            <circle cx="142" cy="56" r="20" fill="#d97706" stroke="#92400e" strokeWidth="2.5" />
            <circle cx="140" cy="58" r="12" fill="#fbcfe8" />
          </g>

          {/* 3. 脸庞主轮廓 */}
          <circle
            cx="100"
            cy="108"
            r="60"
            fill="url(#ganganFace)"
            stroke="#b45309"
            strokeWidth="3.5"
          />

          {/* 4. 腮红 */}
          <circle cx="64" cy="122" r="10" fill="#fda4af" opacity="0.65" />
          <circle cx="136" cy="122" r="10" fill="#fda4af" opacity="0.65" />

          {/* 5. 眼睛 */}
          {mood === "happy" || mood === "eating" || mood === "cheering" ? (
            // 开心月牙眯眯眼 (^ ^)
            <g stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M 68 102 Q 80 90 90 102" />
              <path d="M 110 102 Q 120 90 132 102" />
            </g>
          ) : mood === "confused" ? (
            // 困惑眨巴眼 (o _ O)
            <g>
              <circle cx="78" cy="100" r="7" fill="#78350f" />
              <circle cx="76" cy="98" r="2.5" fill="#ffffff" />
              {/* 大眼睛 */}
              <circle cx="122" cy="98" r="11" fill="#78350f" />
              <circle cx="119" cy="95" r="4" fill="#ffffff" />
              {/* 困惑汗滴 */}
              <path d="M 148 92 C 148 86 155 80 155 80 C 155 80 162 86 162 92 C 162 96 156 100 155 100 C 154 100 148 96 148 92 Z" fill="#38bdf8" />
            </g>
          ) : (
            // 标准大眼珠有高光闪耀 (星星眼)
            <g>
              <ellipse cx="78" cy="100" rx="9" ry="11" fill="#78350f" />
              <circle cx="75" cy="96" r="3.5" fill="#ffffff" />
              <circle cx="81" cy="104" r="1.5" fill="#ffffff" />

              <ellipse cx="122" cy="100" rx="9" ry="11" fill="#78350f" />
              <circle cx="119" cy="96" r="3.5" fill="#ffffff" />
              <circle cx="125" cy="104" r="1.5" fill="#ffffff" />
            </g>
          )}

          {/* 6. 小鼻子 */}
          <ellipse cx="100" cy="115" rx="7.5" ry="5.5" fill="#92400e" />

          {/* 7. 嘴巴变化 */}
          {mood === "hungry" ? (
            // 饿了：张大圆嘴巴等着吃 (投喂目标)
            <g>
              <ellipse
                cx="100"
                cy="134"
                rx="14"
                ry="18"
                fill="#7f1d1d"
                stroke="#991b1b"
                strokeWidth="2.5"
                className="animate-pulse"
              />
              <path d="M 92 142 Q 100 136 108 142 Q 100 150 92 142" fill="#ef4444" />
            </g>
          ) : mood === "eating" ? (
            // 咀嚼嚼嚼口型
            <g>
              <ellipse cx="100" cy="130" rx="16" ry="10" fill="#991b1b" />
              <path d="M 90 128 Q 100 124 110 128" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          ) : mood === "confused" ? (
            // 困惑波浪小嘴 (~ ~)
            <path
              d="M 90 130 Q 95 125 100 130 Q 105 135 110 130"
              stroke="#78350f"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            // 开心微笑猫猫嘴 (w)
            <path
              d="M 88 123 Q 94 133 100 126 Q 106 133 112 123"
              stroke="#78350f"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* 8. 胡须 */}
          <g stroke="#b45309" strokeWidth="2" strokeLinecap="round" opacity="0.6">
            <line x1="50" y1="116" x2="32" y2="112" />
            <line x1="49" y1="123" x2="30" y2="124" />
            <line x1="150" y1="116" x2="168" y2="112" />
            <line x1="151" y1="123" x2="170" y2="124" />
          </g>

          {/* 9. 胜利黄金皇冠 (Happy / Cheering 模式展现) */}
          {(mood === "happy" || mood === "cheering") && (
            <g className="animate-bounce">
              <polygon
                points="75,44 85,18 100,32 115,18 125,44"
                fill="url(#ganganCrown)"
                stroke="#a16207"
                strokeWidth="2.5"
              />
              <circle cx="85" cy="18" r="3.5" fill="#ef4444" />
              <circle cx="100" cy="32" r="3.5" fill="#3b82f6" />
              <circle cx="115" cy="18" r="3.5" fill="#10b981" />
            </g>
          )}
        </svg>

        {/* 嚼食物飞溅爱心 / 星星粒子 */}
        {mood === "eating" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="absolute -top-3 -right-2 text-xl animate-ping">💖</span>
            <span className="absolute -bottom-2 -left-2 text-xl animate-bounce">✨</span>
            <span className="absolute top-4 -left-4 text-sm font-black text-amber-500 animate-pulse">
              Nom!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
