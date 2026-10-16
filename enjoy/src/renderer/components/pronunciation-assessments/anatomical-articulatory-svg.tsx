import React from "react";
import { ArticulatoryConfig } from "./articulatory-tongue-visualizer";

interface AnatomicalArticulatorySvgProps {
  config: ArticulatoryConfig;
  playProgress?: number;
  isPlaying?: boolean;
}

export const AnatomicalArticulatorySvg: React.FC<AnatomicalArticulatorySvgProps> = ({
  config,
  playProgress = 0,
  isPlaying = false,
}) => {
  const { tongueShape, frontLipParams, focusPoint, voiced, airflowType } = config;

  // 舌位动态插值 (根据播放进度在静止位与发音位之间轻微运动)
  const animProgress = isPlaying ? Math.sin(playProgress * Math.PI) : 0;
  const currentTipX = tongueShape.tipX + animProgress * 2;
  const currentTipY = tongueShape.tipY - animProgress * 3;
  const currentBodyX = tongueShape.bodyX;
  const currentBodyY = tongueShape.bodyY - animProgress * 2;

  // 唇形动态开合插值
  const currentLipHeight = Math.max(
    0,
    frontLipParams.lipHeight + animProgress * (frontLipParams.lipHeight > 0 ? 3 : 0)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* 视角 1: 侧切面舌位解剖图 (Sagittal Cross-Section) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 flex flex-col items-center justify-between shadow-inner relative overflow-hidden">
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <span className="font-bold text-amber-400 flex items-center gap-1.5">
            <span>👅</span>
            <span>矢状面解剖舌位图</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            {config.category}
          </span>
        </div>

        {/* SVG 解剖解说画布 */}
        <div className="w-full max-w-[260px] aspect-[4/3] relative my-1">
          <svg
            viewBox="0 0 260 200"
            className="w-full h-full drop-shadow-md overflow-visible"
          >
            <defs>
              {/* 舌体肌肉渐变 */}
              <linearGradient id="tongueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#ef4444" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.75" />
              </linearGradient>

              {/* 气流渐变 */}
              <linearGradient id="airGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
                <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* 口腔颅骨与硬腭天花板 (Hard Palate & Velum) */}
            <path
              d="M 60,70 Q 110,65 145,72 Q 180,80 205,108"
              fill="none"
              stroke="#64748b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* 上切牙 (Upper Teeth) */}
            <path
              d="M 205,108 L 208,122 L 202,122 Z"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />

            {/* 下切牙 (Lower Teeth) */}
            <path
              d="M 198,142 L 202,130 L 195,130 Z"
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />

            {/* 咽壁与后颅腔 (Pharyngeal Wall) */}
            <path
              d="M 80,68 Q 70,110 75,175"
              fill="none"
              stroke="#475569"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* 声带位置与振动波 (Vocal Cords) */}
            <g transform="translate(85, 175)">
              <ellipse cx="0" cy="0" rx="7" ry="3.5" fill={voiced ? "#f59e0b" : "#64748b"} />
              {voiced && isPlaying && (
                <path
                  d="M -12,-5 Q 0,-10 12,-5 M -15,0 Q 0,-6 15,0 M -12,5 Q 0,0 12,5"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              )}
              <text x="-25" y="16" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
                声带{voiced ? "(振动)" : "(静止)"}
              </text>
            </g>

            {/* 动态舌体轮廓 (Tongue Body) */}
            <path
              d={`M ${tongueShape.rootX},${tongueShape.rootY} 
                  Q ${currentBodyX},${currentBodyY} ${currentTipX},${currentTipY}
                  Q ${currentTipX - 15},${currentTipY + 25} ${tongueShape.rootX + 15},${tongueShape.rootY + 15}
                  Z`}
              fill="url(#tongueGrad)"
              stroke="#dc2626"
              strokeWidth="2"
            />

            {/* 动态气流路径 (Airflow Stream) */}
            {airflowType === "oral" && (
              <path
                d="M 88,170 Q 105,100 170,95 Q 210,105 235,115"
                fill="none"
                stroke="url(#airGrad)"
                strokeWidth="3"
                strokeDasharray="4 3"
                className={isPlaying ? "animate-pulse" : ""}
              />
            )}
            {airflowType === "interdental" && (
              <path
                d="M 88,170 Q 110,115 180,122 L 235,124"
                fill="none"
                stroke="#facc15"
                strokeWidth="3.5"
                strokeDasharray="4 2"
              />
            )}
            {airflowType === "nasal" && (
              <path
                d="M 88,170 Q 95,85 140,55 Q 185,50 220,55"
                fill="none"
                stroke="#34d399"
                strokeWidth="3"
                strokeDasharray="4 3"
              />
            )}

            {/* 发音核心阻气/摩擦触点 (Focus Radar Point) */}
            <circle
              cx={focusPoint.x}
              cy={focusPoint.y}
              r="5"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle
              cx={focusPoint.x}
              cy={focusPoint.y}
              r="10"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              opacity="0.6"
              className={isPlaying ? "animate-ping" : ""}
            />

            {/* 触点文字标引 */}
            <g transform={`translate(${Math.min(focusPoint.x + 8, 170)}, ${Math.max(focusPoint.y - 12, 35)})`}>
              <rect x="0" y="0" width="76" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" stroke="#f59e0b" strokeWidth="1" />
              <text x="5" y="12" fill="#fbbf24" fontSize="8" fontWeight="bold">
                🎯 {focusPoint.label.slice(0, 5)}
              </text>
            </g>

            {/* 解剖结构标注 */}
            <text x="135" y="60" fill="#94a3b8" fontSize="8">硬腭</text>
            <text x="95" y="55" fill="#94a3b8" fontSize="8">软腭</text>
            <text x="212" y="105" fill="#e2e8f0" fontSize="8">门牙</text>
            <text x={currentTipX - 8} y={currentTipY - 8} fill="#fef08a" fontSize="8" fontWeight="bold">舌尖</text>
          </svg>
        </div>

        {/* 底部解剖指标要点 */}
        <div className="w-full flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80">
          <span>触点: <strong className="text-amber-400 font-mono">{focusPoint.label}</strong></span>
          <span className="text-slate-400 text-[10px]">气流: {airflowType}</span>
        </div>
      </div>

      {/* 视角 2: 正面唇形参数几何图 (Frontal Lip Geometry Schema) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 flex flex-col items-center justify-between shadow-inner relative overflow-hidden">
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <span className="font-bold text-sky-400 flex items-center gap-1.5">
            <span>👄</span>
            <span>正面唇形几何参数</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 uppercase">
            {config.lipShape} · 下颌 {config.jawOpen}
          </span>
        </div>

        {/* 正面唇部模型 SVG */}
        <div className="w-full max-w-[260px] aspect-[4/3] relative my-1">
          <svg
            viewBox="0 0 240 180"
            className="w-full h-full drop-shadow-md overflow-visible"
          >
            <defs>
              <radialGradient id="mouthDark" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
              <linearGradient id="lipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>

            {/* 脸颊轮廓基底 */}
            <ellipse cx="120" cy="90" rx="95" ry="75" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />

            {/* 口腔内腔深色区域 */}
            <path
              d={`M ${120 - frontLipParams.lipWidth / 2},90 
                  Q 120,${90 - currentLipHeight / 2} ${120 + frontLipParams.lipWidth / 2},90
                  Q 120,${90 + currentLipHeight / 2 + frontLipParams.jawDrop} ${120 - frontLipParams.lipWidth / 2},90 Z`}
              fill="url(#mouthDark)"
            />

            {/* 上排门牙 */}
            {frontLipParams.teethGap > 0 && (
              <rect
                x={120 - Math.min(frontLipParams.lipWidth * 0.35, 32)}
                y={90 - currentLipHeight / 2}
                width={Math.min(frontLipParams.lipWidth * 0.7, 64)}
                height={Math.min(frontLipParams.teethGap * 1.5, 12)}
                rx="2"
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            )}

            {/* 咬舌音特征：舌尖从门牙缝微微探出 */}
            {frontLipParams.tongueTipVisible && (
              <path
                d={`M 108,${90 + frontLipParams.teethGap * 0.5} 
                    Q 120,${90 + frontLipParams.teethGap * 0.5 + frontLipParams.tongueTipProtrusion + 4} 132,${90 + frontLipParams.teethGap * 0.5} 
                    Z`}
                fill="#ef4444"
                stroke="#dc2626"
                strokeWidth="1"
              />
            )}

            {/* 上唇饱满轮廓 */}
            <path
              d={`M ${120 - frontLipParams.lipWidth / 2 - 10},90 
                  Q 120,${85 - currentLipHeight * 0.4 - 10} ${120 + frontLipParams.lipWidth / 2 + 10},90
                  Q 120,${90 - currentLipHeight * 0.25} ${120 - frontLipParams.lipWidth / 2 - 10},90 Z`}
              fill="url(#lipGrad)"
              stroke="#fda4af"
              strokeWidth="1.5"
            />

            {/* 下唇饱满轮廓 */}
            <path
              d={`M ${120 - frontLipParams.lipWidth / 2 - 8},90 
                  Q 120,${92 + currentLipHeight * 0.25 + frontLipParams.jawDrop} ${120 + frontLipParams.lipWidth / 2 + 8},90
                  Q 120,${96 + currentLipHeight * 0.6 + frontLipParams.jawDrop + 10} ${120 - frontLipParams.lipWidth / 2 - 8},90 Z`}
              fill="url(#lipGrad)"
              stroke="#fda4af"
              strokeWidth="1.5"
            />

            {/* 唇裂宽度卡尺标引 (Lip Width Dimension) */}
            <g transform="translate(0, 16)">
              <line
                x1={120 - frontLipParams.lipWidth / 2}
                y1="38"
                x2={120 + frontLipParams.lipWidth / 2}
                y2="38"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <line x1={120 - frontLipParams.lipWidth / 2} y1="34" x2={120 - frontLipParams.lipWidth / 2} y2="42" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1={120 + frontLipParams.lipWidth / 2} y1="34" x2={120 + frontLipParams.lipWidth / 2} y2="42" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="105" y="32" fill="#38bdf8" fontSize="8" fontWeight="bold">
                宽度 {frontLipParams.lipWidth}px
              </text>
            </g>

            {/* 纵向开合标引 (Vertical Opening) */}
            <g transform={`translate(${120 + frontLipParams.lipWidth / 2 + 16}, 0)`}>
              <line
                x1="0"
                y1={90 - currentLipHeight / 2}
                x2="0"
                y2={90 + currentLipHeight / 2 + frontLipParams.jawDrop}
                stroke="#a855f7"
                strokeWidth="1.5"
              />
              <text x="6" y={95 + frontLipParams.jawDrop / 2} fill="#c084fc" fontSize="8" fontWeight="bold">
                开合 {frontLipParams.lipHeight + frontLipParams.jawDrop}px
              </text>
            </g>
          </svg>
        </div>

        {/* 底部几何参数说明 */}
        <div className="w-full grid grid-cols-3 gap-1 text-center text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
          <span>唇裂: <strong className="text-slate-200">{frontLipParams.lipWidth}px</strong></span>
          <span>下颌: <strong className="text-slate-200">{frontLipParams.jawDrop}px</strong></span>
          <span>舌尖微露: <strong className={frontLipParams.tongueTipVisible ? "text-amber-400 font-bold" : "text-slate-500"}>
            {frontLipParams.tongueTipVisible ? "露出" : "内收"}
          </strong></span>
        </div>
      </div>
    </div>
  );
};
