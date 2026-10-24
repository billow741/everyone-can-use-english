import React, { useState, useEffect, useRef } from "react";

export type GanganPose =
  | "idle"
  | "wave"
  | "nod"
  | "celebrate"
  | "conductor"
  | "eating"
  | "sleepy";

export type GanganMood =
  | "idle"
  | "hungry"
  | "eating"
  | "happy"
  | "confused"
  | "cheering"
  | "sleepy"
  | "conducting";

export type GanganScenario =
  | "default"
  | "eating"
  | "sleepy"
  | "conductor"
  | "celebrate";

export type GanganSceneTint = "rain" | "lullaby" | "train" | "album" | "none";

interface GanganInteractiveMascotProps {
  pose?: GanganPose;
  mood?: GanganMood;
  scenario?: GanganScenario;
  sceneTint?: GanganSceneTint;
  size?: number;
  className?: string;
  speechText?: string;
  onClick?: () => void;
}

// 骨骼分件姿态配置表：底图拆为 body + 若干绕枢轴摆动的部件图（同画布叠放）。
// origin 为枢轴在画布中的百分比坐标；animation 引用下方 <style> 中的关键帧。
// celebrate / eating 的旧底图双爪抱书骨骼化不达标，已另画动画专用新底图
// （双臂张开 / 爪捏星星饼干贴嘴边）完成拆件并进此表；旧整图继续作降级兜底。
// 拆件参数与验收存档见 visual-redo/skeletal-batch/{celebrate,eating}/params_newbase.json。
interface SkeletalPart {
  src: string;
  origin: string;
  animation: string;
}

interface SkeletalConfig {
  body: string;
  aspect: number; // 画布宽/高
  parts: SkeletalPart[];
}

const SKELETAL_POSES: Partial<Record<GanganPose, SkeletalConfig>> = {
  conductor: {
    body: "/assets/gangan/gangan_conductor_body.webp",
    aspect: 1,
    parts: [
      {
        src: "/assets/gangan/gangan_conductor_arm.webp",
        origin: "63.67% 52.73%",
        animation: "ganganArmWave 1.1s ease-in-out infinite",
      },
    ],
  },
  wave: {
    body: "/assets/gangan/gangan_wave_body.webp",
    aspect: 0.7036,
    parts: [
      {
        src: "/assets/gangan/gangan_wave_arm.webp",
        origin: "68.04% 54.36%",
        animation: "ganganWaveArm 1s ease-in-out infinite",
      },
    ],
  },
  nod: {
    body: "/assets/gangan/gangan_nod_body.webp",
    aspect: 0.7296,
    parts: [
      {
        src: "/assets/gangan/gangan_nod_head.webp",
        origin: "50.08% 50.50%",
        animation: "ganganNodHead 1.8s ease-in-out infinite",
      },
    ],
  },
  sleepy: {
    body: "/assets/gangan/gangan_sleepy_body.webp",
    aspect: 1,
    parts: [
      {
        src: "/assets/gangan/gangan_sleepy_head.webp",
        origin: "50% 50%",
        animation: "ganganSleepyHead 3.6s ease-in-out infinite",
      },
    ],
  },
  celebrate: {
    body: "/assets/gangan/gangan_celebrate_body.webp",
    aspect: 0.7318,
    parts: [
      {
        src: "/assets/gangan/gangan_celebrate_arm_l.webp",
        origin: "31.25% 47.19%",
        animation: "ganganCelebratePumpL 0.9s ease-in-out infinite",
      },
      {
        src: "/assets/gangan/gangan_celebrate_arm_r.webp",
        origin: "68.51% 47.19%",
        animation: "ganganCelebratePumpR 0.9s ease-in-out infinite",
      },
    ],
  },
  eating: {
    body: "/assets/gangan/gangan_eating_body.webp",
    aspect: 0.6094,
    parts: [
      {
        src: "/assets/gangan/gangan_eating_arm.webp",
        origin: "67.33% 46.79%",
        animation: "ganganEatingArm 1.6s ease-in-out infinite",
      },
    ],
  },
};

export const GanganInteractiveMascot: React.FC<GanganInteractiveMascotProps> = ({
  pose,
  mood,
  scenario = "default",
  sceneTint = "none",
  size = 150,
  className = "",
  speechText,
  onClick,
}) => {
  // 1. 确定最终姿态 (优先级: pose > scenario > mood)
  let activePose: GanganPose = "idle";
  if (pose) {
    activePose = pose;
  } else if (scenario === "celebrate" || mood === "cheering" || mood === "happy") {
    activePose = "celebrate";
  } else if (scenario === "conductor" || mood === "conducting") {
    activePose = "conductor";
  } else if (scenario === "sleepy" || mood === "sleepy") {
    activePose = "sleepy";
  } else if (scenario === "eating" || mood === "eating" || mood === "hungry") {
    activePose = "eating";
  }

  // 2. 姿态切换过渡：Squash 回弹动画 (scaleY 1 -> 0.94 -> 1, 150ms)
  const [squashKey, setSquashKey] = useState(0);
  const prevPoseRef = useRef<GanganPose>(activePose);

  useEffect(() => {
    if (prevPoseRef.current !== activePose) {
      prevPoseRef.current = activePose;
      setSquashKey((k) => k + 1);
    }
  }, [activePose]);

  // 2b. 骨骼分件姿态（配置见 SKELETAL_POSES）：body 与部件同画布叠放，
  //     部件绕各自枢轴摆动；任一图加载失败则整套降级为原整图路径
  const skeletalCfg = SKELETAL_POSES[activePose];
  const isSkeletal = !!skeletalCfg;
  const [skeletalBroken, setSkeletalBroken] = useState(false);
  useEffect(() => {
      setSkeletalBroken(false);
  }, [activePose]);
  const showSkeletal = isSkeletal && !skeletalBroken;

  // 3. 姿态资产映射 (优先高精度透明图，WebP动画配GIF降级与官方兜底)
  let primarySrc = "/assets/gangan/gangan_idle.png";
  let fallbackSrc = "/assets/gangan/gangan_official.png";
  let isWebp = false;

  switch (activePose) {
    case "wave":
      primarySrc = "/assets/gangan/gangan_wave.png";
      fallbackSrc = "/assets/gangan/gangan_official.png";
      break;
    case "nod":
      primarySrc = "/assets/gangan/gangan_nod.png";
      fallbackSrc = "/assets/gangan/gangan_official.png";
      break;
    case "celebrate":
      primarySrc = "/assets/gangan/gangan_celebrate.webp";
      fallbackSrc = "/assets/gangan/gangan_celebrate.gif";
      isWebp = true;
      break;
    case "conductor":
      primarySrc = "/assets/gangan/gangan_conductor_body.webp";
      fallbackSrc = "/assets/gangan/gangan_conductor.gif";
      isWebp = true;
      break;
    case "eating":
      primarySrc = "/assets/gangan/gangan_eating.webp";
      fallbackSrc = "/assets/gangan/gangan_eating.gif";
      isWebp = true;
      break;
    case "sleepy":
      primarySrc = "/assets/gangan/gangan_sleepy.webp";
      fallbackSrc = "/assets/gangan/gangan_sleepy.gif";
      isWebp = true;
      break;
    case "idle":
    default:
      primarySrc = "/assets/gangan/gangan_idle.png";
      fallbackSrc = "/assets/gangan/gangan_official.png";
      break;
  }

  // 4. 场景色调叠加滤镜 (与所在场景的光照与氛围融为一体)
  const getSceneTintOverlay = () => {
    switch (sceneTint) {
      case "rain":
        return "bg-sky-900/15 mix-blend-multiply";
      case "lullaby":
        return "bg-indigo-950/25 mix-blend-multiply";
      case "train":
        return "bg-amber-950/15 mix-blend-multiply";
      case "album":
        return "bg-amber-600/10 mix-blend-color-burn";
      default:
        return "";
    }
  };

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${className}`}
      onClick={onClick}
    >
      {/* 敢敢上方说话气泡：限制 ≤5 字短语 */}
      {speechText && (
        <div className="mb-1.5 max-w-[200px] px-3 py-1 rounded-full bg-gradient-to-r from-amber-200/95 via-yellow-100/95 to-amber-200/95 dark:from-amber-950/95 dark:to-yellow-950/95 border border-amber-400 text-amber-950 dark:text-amber-100 text-xs font-black shadow-md text-center relative z-30 backdrop-blur-xs pointer-events-none">
          <span>{speechText}</span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-amber-400" />
        </div>
      )}

      {/* 敢敢多姿态精灵容器 */}
      <div
        style={{ width: size, height: size * 1.15 }}
        className="relative cursor-pointer"
      >
        {/* 脚下统一接触阴影 (Contact Shadow，彻底消除纸片悬浮感) */}
        <div
          style={{ width: size * 0.72 }}
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2.5 rounded-[100%] bg-slate-950/45 blur-[1.5px] pointer-events-none -z-10"
        />

        {/* 角色本体及 Squash 回弹动画容器 */}
        <div
          key={squashKey}
          style={{
            animation: !isSkeletal && squashKey > 0 ? "ganganSquashBounce 160ms cubic-bezier(0.2, 0.8, 0.4, 1)" : undefined,
            transformOrigin: "bottom center",
          }}
          className="relative w-full h-full"
        >
          {/* 角色图片 (静止待机/各姿态，禁止整图 rotate/translate 扭动) */}
          {showSkeletal && skeletalCfg ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
              <div
                className="relative"
                style={
                  skeletalCfg.aspect >= 1 / 1.15
                    ? { width: "100%", aspectRatio: skeletalCfg.aspect }
                    : { height: "100%", aspectRatio: skeletalCfg.aspect }
                }
              >
                <img
                  src={skeletalCfg.body}
                  onError={() => setSkeletalBroken(true)}
                  alt="敢敢小狮子"
                  draggable={false}
                  className="absolute inset-0 w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
                />
                {skeletalCfg.parts.map((part) => (
                  <img
                    key={part.src}
                    src={part.src}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      transformOrigin: part.origin,
                      animation: part.animation,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : isWebp && !isSkeletal ? (
            <picture className="w-full h-full block">
              <source srcSet={primarySrc} type="image/webp" />
              <img
                src={fallbackSrc}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/assets/gangan/gangan_official.png";
                }}
                alt="敢敢小狮子"
                className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
              />
            </picture>
          ) : (
            <img
              src={isSkeletal ? fallbackSrc : primarySrc}
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackSrc;
              }}
              alt="敢敢小狮子"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
            />
          )}

          {/* 场景氛围色调层 */}
          {sceneTint !== "none" && (
            <div
              className={`absolute inset-0 rounded-3xl pointer-events-none ${getSceneTintOverlay()}`}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes ganganSquashBounce {
          0% { transform: scale(1, 1); }
          45% { transform: scale(1.03, 0.94); }
          100% { transform: scale(1, 1); }
        }
        @keyframes ganganArmWave {
          0% { transform: rotate(16deg); }
          25% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(0deg); }
          100% { transform: rotate(16deg); }
        }
        @keyframes ganganWaveArm {
          0% { transform: rotate(12deg); }
          25% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg); }
          75% { transform: rotate(0deg); }
          100% { transform: rotate(12deg); }
        }
        @keyframes ganganNodHead {
          0% { transform: rotate(-3deg); }
          25% { transform: rotate(1deg); }
          50% { transform: rotate(5deg); }
          75% { transform: rotate(1deg); }
          100% { transform: rotate(-3deg); }
        }
        @keyframes ganganSleepyHead {
          0% { transform: rotate(0deg); }
          45% { transform: rotate(5deg); }
          60% { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes ganganCelebratePumpL {
          0% { transform: rotate(6deg); }
          50% { transform: rotate(-5deg); }
          100% { transform: rotate(6deg); }
        }
        @keyframes ganganCelebratePumpR {
          0% { transform: rotate(-6deg); }
          50% { transform: rotate(5deg); }
          100% { transform: rotate(-6deg); }
        }
        @keyframes ganganEatingArm {
          0% { transform: rotate(0deg); }
          30% { transform: rotate(-30deg); }
          55% { transform: rotate(-30deg); }
          85% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
