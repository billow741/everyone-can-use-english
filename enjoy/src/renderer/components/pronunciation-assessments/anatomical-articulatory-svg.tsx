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

  // 舌位动态插值 (根据播放进度在静止位与发音位之间平滑轻微运动)
  const animProgress = isPlaying ? Math.sin(playProgress * Math.PI) : 0;
  
  // 针对咬舌音特别优化齿间探出坐标
  const isInterdental = airflowType === "interdental" || config.category === "咬舌音";
  const rawTipX = tongueShape.tipX + animProgress * 2.5;
  const rawTipY = tongueShape.tipY - animProgress * 3;

  const currentTipX = isInterdental ? Math.max(rawTipX, 212) : rawTipX;
  const currentTipY = isInterdental ? 116 : rawTipY;
  const currentBodyX = tongueShape.bodyX;
  const currentBodyY = tongueShape.bodyY - animProgress * 2.5;

  // 唇形动态开合插值
  const currentLipHeight = Math.max(
    0,
    frontLipParams.lipHeight + animProgress * (frontLipParams.lipHeight > 0 ? 3 : 0)
  );

  // 软腭与小舌状态：鼻音下垂通畅，非鼻音抬起闭锁鼻咽
  const isNasal = airflowType === "nasal";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* 视角 1: 侧切面舌位解剖图 (Sagittal Cross-Section) */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 rounded-2xl border border-slate-800 p-3.5 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
          <span className="font-bold text-amber-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
            <span>矢状面解剖舌位图 (Sagittal Section)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {config.category}
          </span>
        </div>

        {/* SVG 解剖解说画布 */}
        <div className="w-full max-w-[290px] aspect-[4/3] relative my-1">
          <svg
            viewBox="0 0 280 210"
            className="w-full h-full drop-shadow-xl overflow-visible select-none"
          >
            <defs>
              {/* 人体组织外部轮廓渐变 */}
              <linearGradient id="headTissue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#0f172a" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
              </linearGradient>

              {/* 口腔深邃声道空间背景渐变 */}
              <radialGradient id="oralSpace" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#030712" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.85" />
              </radialGradient>

              {/* 硬腭与颅骨骨骼渐变 */}
              <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="60%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="60%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>

              {/* 丰满仿生肌肉渐变 (舌体与软组织) */}
              <radialGradient id="tongueGrad" cx="55%" cy="35%" r="75%">
                <stop offset="0%" stopColor="#fda4af" stopOpacity="0.98" />
                <stop offset="30%" stopColor="#fb7185" stopOpacity="0.96" />
                <stop offset="70%" stopColor="#e11d48" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#881337" stopOpacity="0.95" />
              </radialGradient>

              {/* 舌底深层肌群渐变 (连接下颌骨) */}
              <linearGradient id="tongueFloorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#be123c" stopOpacity="0.85" />
                <stop offset="60%" stopColor="#881337" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#4c0519" stopOpacity="0.6" />
              </linearGradient>

              {/* 牙齿牙釉质高光渐变 */}
              <linearGradient id="toothGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>

              {/* 牙龈粉润质感 */}
              <linearGradient id="gumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#be123c" stopOpacity="0.7" />
              </linearGradient>

              {/* 动态气流光晕渐变 */}
              <linearGradient id="airGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="1" />
              </linearGradient>

              {/* 柔和发光微滤镜 */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. 颅面轮廓与组织背景切面 (Head Profile Silhouette) */}
            <path
              d="M 60,25 
                 Q 140,20 205,25 
                 Q 220,40 225,50 
                 Q 232,58 245,63 
                 Q 236,72 230,76 
                 L 225,88 
                 Q 232,96 220,106 
                 L 214,112 
                 L 216,122 
                 Q 226,126 222,136 
                 Q 216,145 218,155 
                 Q 224,168 214,178 
                 Q 185,198 150,202 
                 L 85,202 
                 L 60,195 Z"
              fill="url(#headTissue)"
              stroke="#334155"
              strokeWidth="1.2"
              strokeDasharray="4 2"
              opacity="0.75"
            />

            {/* 鼻腔深色腔体 (Nasal Cavity) */}
            <path
              d="M 115,40 Q 170,34 225,48 L 225,66 Q 165,60 120,68 Z"
              fill="#060913"
              opacity="0.85"
            />
            {/* 鼻甲软骨轮廓微线 */}
            <path
              d="M 135,46 Q 175,40 210,50 M 145,56 Q 180,50 215,60"
              fill="none"
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity="0.45"
            />

            {/* 口腔咽腔深色负空间 (Oral & Pharyngeal Airway) */}
            <path
              d="M 88,68 Q 84,110 90,185 L 108,185 Q 102,120 118,68 Z"
              fill="url(#oralSpace)"
            />

            {/* 后咽壁基底厚度 (Posterior Pharyngeal Wall) */}
            <path
              d="M 86,45 Q 82,105 88,185"
              fill="none"
              stroke="#64748b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* 2. 上腭骨架 (Hard Palate & Alveolar Ridge) */}
            <path
              d="M 120,68 Q 155,65 182,72 Q 198,78 206,94 L 198,96 Q 192,84 175,78 Q 148,74 120,76 Z"
              fill="url(#boneGrad)"
              stroke="#475569"
              strokeWidth="1"
            />
            {/* 硬腭前部横褶纹理 (Palatal Rugae) */}
            <path
              d="M 188,81 Q 191,78 195,83 M 178,77 Q 181,74 185,79"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              opacity="0.65"
            />

            {/* 3. 软腭与悬雍垂小舌 (Velum & Uvula) - 动态开闭 */}
            {isNasal ? (
              // 鼻音：软腭下垂开放鼻咽通道
              <path
                d="M 120,72 Q 110,92 113,110 Q 108,115 105,108 Q 102,90 120,68 Z"
                fill="#fb7185"
                stroke="#e11d48"
                strokeWidth="1"
                opacity="0.92"
              />
            ) : (
              // 口音：软腭上提紧紧闭锁后鼻孔
              <path
                d="M 120,72 Q 100,78 88,82 Q 86,87 92,87 Q 102,83 120,76 Z"
                fill="#fb7185"
                stroke="#e11d48"
                strokeWidth="1"
                opacity="0.92"
              />
            )}

            {/* 4. 上切牙与牙龈 (Upper Incisor & Gum) */}
            <path
              d="M 202,90 Q 206,85 212,88 L 209,96 Z"
              fill="url(#gumGrad)"
            />
            <path
              d="M 198,96 L 206,112 Q 202,114 196,112 L 194,96 Z"
              fill="url(#toothGrad)"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />

            {/* 5. 下切牙与下颌牙龈 (Lower Incisor & Mandible Gum) */}
            <path
              d="M 194,136 Q 199,140 193,146 L 188,138 Z"
              fill="url(#gumGrad)"
            />
            <path
              d="M 190,138 L 198,122 Q 202,123 198,138 Z"
              fill="url(#toothGrad)"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />

            {/* 会厌软骨 (Epiglottis) */}
            <path
              d="M 96,165 Q 94,150 99,152 Q 104,158 100,168 Z"
              fill="#fb7185"
              stroke="#be123c"
              strokeWidth="1"
              opacity="0.85"
            />

            {/* 6. 喉头与声带振动区 (Larynx & Vocal Cords) */}
            <g transform="translate(95, 184)">
              <ellipse
                cx="0"
                cy="0"
                rx="8"
                ry="4"
                fill={voiced ? "#f59e0b" : "#475569"}
                stroke={voiced ? "#fbbf24" : "#64748b"}
                strokeWidth="1.2"
              />
              {voiced && isPlaying && (
                <path
                  d="M -14,-6 Q 0,-12 14,-6 M -16,0 Q 0,-7 16,0 M -14,6 Q 0,12 14,6"
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="1.5"
                  className="animate-pulse"
                  filter="url(#glow)"
                />
              )}
              <text x="-26" y="16" fill={voiced ? "#fbbf24" : "#94a3b8"} fontSize="8" fontFamily="sans-serif">
                声带{voiced ? "(振动)" : "(静止)"}
              </text>
            </g>

            {/* 7. 丰满立体仿生舌体 (Dynamic Organic Tongue - 扎根下颌基底) */}
            {/* 舌下肌肉群深层基底 (Genioglossus Muscle Floor anchored to jaw) */}
            <path
              d={`M ${tongueShape.rootX - 5},${tongueShape.rootY} 
                  L ${currentTipX - 12},${currentTipY + 12} 
                  L 190,138 
                  Q 185,160 160,185 
                  L 115,188 Z`}
              fill="url(#tongueFloorGrad)"
              opacity="0.85"
            />

            {/* 舌体主肌肉层 (Tongue Body Full Organic Volume) */}
            <path
              d={`M ${tongueShape.rootX},${tongueShape.rootY} 
                  C ${tongueShape.rootX + 10},${(tongueShape.rootY + currentBodyY) / 2} 
                    ${currentBodyX - 15},${currentBodyY} 
                    ${currentBodyX},${currentBodyY}
                  C ${currentBodyX + 18},${currentBodyY} 
                    ${currentTipX - 12},${currentTipY - 2} 
                    ${currentTipX},${currentTipY}
                  Q ${currentTipX + 2},${currentTipY + 8} ${currentTipX - 8},${currentTipY + 14}
                  C ${(currentTipX + 185) / 2},${currentTipY + 22} 
                    188,142 
                    185,150
                  Q 160,178 118,178
                  Z`}
              fill="url(#tongueGrad)"
              stroke="#be123c"
              strokeWidth="1.5"
            />

            {/* 舌背面水润高光线 (Moist Lingual Dorsum Highlight) */}
            <path
              d={`M ${tongueShape.rootX + 6},${tongueShape.rootY - 4} 
                  C ${tongueShape.rootX + 16},${(tongueShape.rootY + currentBodyY) / 2 - 2} 
                    ${currentBodyX - 10},${currentBodyY - 1} 
                    ${currentBodyX},${currentBodyY - 1}
                  C ${currentBodyX + 16},${currentBodyY - 1} 
                    ${currentTipX - 10},${currentTipY - 1} 
                    ${currentTipX - 2},${currentTipY}`}
              fill="none"
              stroke="#ffe4e6"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* 舌体内部扇形肌纤维纹理 (Lingual Radiating Muscle Fibers) */}
            <path
              d={`M 145,170 Q ${currentBodyX - 5},${currentBodyY + 18} ${currentTipX - 16},${currentTipY + 8}
                  M 135,172 Q ${currentBodyX - 15},${currentBodyY + 14} ${currentBodyX},${currentBodyY + 8}`}
              fill="none"
              stroke="#e11d48"
              strokeWidth="0.9"
              strokeDasharray="4 3"
              opacity="0.45"
            />

            {/* 8. 动态气流光晕路径 (Dynamic Airflow Stream) */}
            {airflowType === "oral" && (
              <path
                d="M 100,175 Q 110,110 165,92 Q 205,98 238,114"
                fill="none"
                stroke="url(#airGrad)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray="6 3"
                className={isPlaying ? "animate-pulse" : ""}
                filter="url(#glow)"
              />
            )}
            {airflowType === "interdental" && (
              <path
                d="M 100,175 Q 115,115 178,114 L 245,116"
                fill="none"
                stroke="#facc15"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="5 2.5"
                className={isPlaying ? "animate-pulse" : ""}
                filter="url(#glow)"
              />
            )}
            {airflowType === "nasal" && (
              <path
                d="M 100,175 Q 100,90 120,62 Q 170,48 235,55"
                fill="none"
                stroke="#34d399"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray="6 3"
                className={isPlaying ? "animate-pulse" : ""}
                filter="url(#glow)"
              />
            )}
            {(airflowType === "friction" || airflowType === "lateral") && (
              <path
                d={`M 100,175 Q 112,112 160,98 Q 195,102 ${currentTipX + 8},${currentTipY - 2}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="4 2"
                className={isPlaying ? "animate-pulse" : ""}
                filter="url(#glow)"
              />
            )}

            {/* 9. 发音核心阻气/触点高精度雷达 (Focus Radar Point) */}
            <g transform={`translate(${isInterdental ? 212 : focusPoint.x}, ${isInterdental ? 116 : focusPoint.y})`}>
              <circle cx="0" cy="0" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" filter="url(#glow)" />
              <circle
                cx="0"
                cy="0"
                r="11"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                opacity="0.75"
                className={isPlaying ? "animate-ping" : ""}
              />
            </g>

            {/* 触点文字标引胶囊 (Tactile Focus Badge) */}
            <g transform={`translate(${Math.min((isInterdental ? 212 : focusPoint.x) - 40, 165)}, ${Math.max((isInterdental ? 116 : focusPoint.y) - 26, 38)})`}>
              <rect
                x="0"
                y="0"
                width="84"
                height="20"
                rx="6"
                fill="#020617"
                fillOpacity="0.9"
                stroke="#f59e0b"
                strokeWidth="1.2"
              />
              <text x="6" y="14" fill="#fbbf24" fontSize="8.5" fontWeight="bold">
                🎯 {focusPoint.label.slice(0, 5)}
              </text>
            </g>

            {/* 10. 高品质科学解剖引线与微标 (Anatomical Landmarks) */}
            <text x="145" y="62" fill="#94a3b8" fontSize="8" fontWeight="bold">硬腭</text>
            <text x="188" y="72" fill="#94a3b8" fontSize="8" fontWeight="bold">齿龈</text>
            <text x="102" y="62" fill="#94a3b8" fontSize="8" fontWeight="bold">软腭</text>
            <text x="206" y="88" fill="#e2e8f0" fontSize="8" fontWeight="bold">门牙</text>
            <text x={currentTipX - 10} y={currentTipY - 9} fill="#fef08a" fontSize="8.5" fontWeight="black" filter="url(#glow)">
              舌尖
            </text>
          </svg>
        </div>

        {/* 底部解剖指标要点 */}
        <div className="w-full flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80">
          <span>发音触点: <strong className="text-amber-400 font-mono">{focusPoint.label}</strong></span>
          <span className="text-slate-400 text-[10px] font-mono">气流: {airflowType}</span>
        </div>
      </div>

      {/* 视角 2: 正面唇形参数几何图 (Frontal Lip Geometry Schema) */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 rounded-2xl border border-slate-800 p-3.5 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
          <span className="font-bold text-sky-400 flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
            <span>正面唇形几何参数 (Frontal Lip Schema)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 uppercase">
            {config.lipShape} · 下颌 {config.jawOpen}
          </span>
        </div>

        {/* 正面唇部模型 SVG */}
        <div className="w-full max-w-[290px] aspect-[4/3] relative my-1">
          <svg
            viewBox="0 0 240 180"
            className="w-full h-full drop-shadow-xl overflow-visible select-none"
          >
            <defs>
              <radialGradient id="mouthDark" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#020617" />
                <stop offset="100%" stopColor="#090d16" />
              </radialGradient>
              <linearGradient id="lipGradFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="40%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
            </defs>

            {/* 面部下巴与脸颊阴影轮廓 */}
            <path
              d="M 35,65 Q 120,45 205,65 Q 215,120 180,155 Q 120,175 60,155 Q 25,120 35,65 Z"
              fill="#0f172a"
              stroke="#1e293b"
              strokeWidth="1.5"
            />

            {/* 人中线 (Philtrum) */}
            <path
              d="M 116,65 L 117,76 M 124,65 L 123,76"
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* 口腔内腔深色区域 */}
            <path
              d={`M ${120 - frontLipParams.lipWidth / 2},90 
                  Q 120,${90 - currentLipHeight / 2} ${120 + frontLipParams.lipWidth / 2},90
                  Q 120,${90 + currentLipHeight / 2 + frontLipParams.jawDrop} ${120 - frontLipParams.lipWidth / 2},90 Z`}
              fill="url(#mouthDark)"
            />

            {/* 上排门牙 (Upper Teeth Front View) */}
            {frontLipParams.teethGap > 0 && (
              <g>
                <rect
                  x={120 - Math.min(frontLipParams.lipWidth * 0.35, 32)}
                  y={90 - currentLipHeight / 2}
                  width={Math.min(frontLipParams.lipWidth * 0.7, 64)}
                  height={Math.min(frontLipParams.teethGap * 1.5, 12)}
                  rx="3"
                  fill="url(#toothGrad)"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                {/* 门牙缝隙微线 */}
                <line
                  x1="120"
                  y1={90 - currentLipHeight / 2}
                  x2="120"
                  y2={90 - currentLipHeight / 2 + Math.min(frontLipParams.teethGap * 1.5, 12)}
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                />
              </g>
            )}

            {/* 咬舌音特征：舌尖从上下门牙之间清晰探出 */}
            {frontLipParams.tongueTipVisible && (
              <path
                d={`M 106,${90 + frontLipParams.teethGap * 0.4} 
                    Q 120,${90 + frontLipParams.teethGap * 0.4 + frontLipParams.tongueTipProtrusion + 6} 134,${90 + frontLipParams.teethGap * 0.4} 
                    Z`}
                fill="url(#tongueGrad)"
                stroke="#e11d48"
                strokeWidth="1.2"
              />
            )}

            {/* 饱满上唇轮廓 (含丘比特弓 Cupid's Bow) */}
            <path
              d={`M ${120 - frontLipParams.lipWidth / 2 - 8},90 
                  Q ${120 - frontLipParams.lipWidth / 4},${82 - currentLipHeight * 0.35} 115,${80 - currentLipHeight * 0.35}
                  Q 120,${84 - currentLipHeight * 0.35} 125,${80 - currentLipHeight * 0.35}
                  Q ${120 + frontLipParams.lipWidth / 4},${82 - currentLipHeight * 0.35} ${120 + frontLipParams.lipWidth / 2 + 8},90
                  Q 120,${90 - currentLipHeight * 0.25} ${120 - frontLipParams.lipWidth / 2 - 8},90 Z`}
              fill="url(#lipGradFront)"
              stroke="#fda4af"
              strokeWidth="1.2"
            />

            {/* 饱满下唇轮廓 */}
            <path
              d={`M ${120 - frontLipParams.lipWidth / 2 - 6},90 
                  Q 120,${92 + currentLipHeight * 0.25 + frontLipParams.jawDrop} ${120 + frontLipParams.lipWidth / 2 + 6},90
                  Q 120,${98 + currentLipHeight * 0.65 + frontLipParams.jawDrop + 10} ${120 - frontLipParams.lipWidth / 2 - 6},90 Z`}
              fill="url(#lipGradFront)"
              stroke="#fda4af"
              strokeWidth="1.2"
            />

            {/* 唇裂宽度卡尺标引 (Lip Width Dimension) */}
            <g transform="translate(0, 16)">
              <line
                x1={120 - frontLipParams.lipWidth / 2}
                y1="34"
                x2={120 + frontLipParams.lipWidth / 2}
                y2="34"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <line x1={120 - frontLipParams.lipWidth / 2} y1="30" x2={120 - frontLipParams.lipWidth / 2} y2="38" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1={120 + frontLipParams.lipWidth / 2} y1="30" x2={120 + frontLipParams.lipWidth / 2} y2="38" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="105" y="28" fill="#38bdf8" fontSize="8" fontWeight="bold">
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
                stroke="#c084fc"
                strokeWidth="1.5"
              />
              <line x1="-3" y1={90 - currentLipHeight / 2} x2="3" y2={90 - currentLipHeight / 2} stroke="#c084fc" strokeWidth="1.5" />
              <line x1="-3" y1={90 + currentLipHeight / 2 + frontLipParams.jawDrop} x2="3" y2={90 + currentLipHeight / 2 + frontLipParams.jawDrop} stroke="#c084fc" strokeWidth="1.5" />
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
