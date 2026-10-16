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

  // 舌尖与舌身坐标
  const currentTipX = isInterdental ? Math.max(rawTipX, 204) : rawTipX;
  const currentTipY = isInterdental ? 112 : rawTipY;
  const currentBodyX = tongueShape.bodyX;
  const currentBodyY = tongueShape.bodyY - animProgress * 2.5;
  const rootX = tongueShape.rootX || 100;
  const rootY = tongueShape.rootY || 165;

  // 唇形动态开合插值
  const currentLipHeight = Math.max(
    0,
    frontLipParams.lipHeight + animProgress * (frontLipParams.lipHeight > 0 ? 3 : 0)
  );

  // 软腭与小舌状态：鼻音下垂通畅，非鼻音抬起闭锁鼻咽
  const isNasal = airflowType === "nasal";

  // 发音触点坐标
  const focusX = isInterdental ? 204 : focusPoint.x;
  const focusY = isInterdental ? 112 : focusPoint.y;

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
        <div className="w-full max-w-[300px] aspect-[4/3] relative my-1">
          <svg
            viewBox="0 0 280 210"
            className="w-full h-full drop-shadow-xl overflow-visible select-none"
          >
            <defs>
              {/* 人体组织外部轮廓渐变 */}
              <linearGradient id="headTissue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
                <stop offset="60%" stopColor="#0f172a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.8" />
              </linearGradient>

              {/* 口腔深邃声道空间背景渐变 */}
              <radialGradient id="oralSpace" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#020617" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0b1120" stopOpacity="0.75" />
              </radialGradient>

              {/* 硬腭与颅骨骨骼渐变 */}
              <linearGradient id="boneGrad" x1="0%" y1="0%" x2="100%" y2="60%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>

              {/* 优雅修长人体肌肉渐变 (灵动舌肌与黏膜) */}
              <linearGradient id="tongueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="25%" stopColor="#fb7185" />
                <stop offset="70%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#9f1239" />
              </linearGradient>

              {/* 下颌底肌群微渐变 */}
              <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#1e293b" stopOpacity="0.7" />
              </linearGradient>

              {/* 牙齿牙釉质高光渐变 */}
              <linearGradient id="toothGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>

              {/* 牙龈粉润质感 */}
              <linearGradient id="gumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#be123c" stopOpacity="0.65" />
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

            {/* 1. 颅面轮廓切面剪影 (自然人体头部比例，朝右) */}
            <path
              d="M 60,35 
                 Q 140,25 205,30 
                 Q 218,42 224,52 
                 Q 232,58 244,63 
                 Q 236,70 230,75 
                 L 225,86 
                 Q 232,94 220,103 
                 L 214,108 
                 L 215,118 
                 Q 224,122 220,132 
                 Q 214,142 216,152 
                 Q 222,166 212,176 
                 Q 185,195 150,200 
                 L 85,200 
                 L 60,195 Z"
              fill="url(#headTissue)"
              stroke="#334155"
              strokeWidth="1.2"
              strokeDasharray="4 2"
              opacity="0.6"
            />

            {/* 鼻腔通透空腔 (自然柔和鼻道，无生硬黑块) */}
            <path
              d="M 115,45 Q 165,38 220,50 L 222,64 Q 165,58 120,64 Z"
              fill="#090d16"
              opacity="0.5"
            />
            {/* 鼻甲骨微纹理 */}
            <path
              d="M 135,50 Q 170,45 205,53 M 145,58 Q 175,54 210,60"
              fill="none"
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity="0.4"
            />

            {/* 咽腔深色声道气道 (Pharyngeal Airway) */}
            <path
              d="M 85,68 Q 80,110 86,185 L 102,185 Q 96,120 112,68 Z"
              fill="url(#oralSpace)"
            />

            {/* 后咽壁基底厚度 (Posterior Pharyngeal Wall) */}
            <path
              d="M 82,45 Q 78,105 84,185"
              fill="none"
              stroke="#64748b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* 2. 上腭骨架 (硬腭 + 齿龈隆起，自然横向延展) */}
            <path
              d="M 115,66 Q 150,64 178,70 Q 192,76 198,90 L 191,92 Q 186,81 172,76 Q 145,72 115,74 Z"
              fill="url(#boneGrad)"
              stroke="#475569"
              strokeWidth="1"
            />
            {/* 硬腭前部横褶纹理 (Palatal Rugae) */}
            <path
              d="M 182,78 Q 185,75 189,80 M 172,74 Q 175,71 179,76"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              opacity="0.6"
            />

            {/* 3. 软腭与悬雍垂小舌 (Velum & Uvula) - 动态开闭 */}
            {isNasal ? (
              // 鼻音：软腭下垂开放鼻咽通道
              <path
                d="M 115,70 Q 106,88 109,106 Q 105,110 102,104 Q 99,86 115,66 Z"
                fill="#fb7185"
                stroke="#e11d48"
                strokeWidth="1"
                opacity="0.9"
              />
            ) : (
              // 口音：软腭上提紧闭后鼻孔
              <path
                d="M 115,70 Q 98,75 86,80 Q 84,84 90,84 Q 99,80 115,74 Z"
                fill="#fb7185"
                stroke="#e11d48"
                strokeWidth="1"
                opacity="0.9"
              />
            )}

            {/* 4. 上门牙与牙龈 (Upper Central Incisor) */}
            <path
              d="M 194,86 Q 198,82 204,85 L 201,92 Z"
              fill="url(#gumGrad)"
            />
            <path
              d="M 191,92 L 197,106 Q 194,107 190,106 L 187,92 Z"
              fill="url(#toothGrad)"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />

            {/* 5. 下门牙与下颌前牙槽骨 (Lower Central Incisor & Mandible) */}
            {/* 下颌骨底线与下牙龈 */}
            <path
              d="M 188,128 Q 192,132 186,138 L 182,130 Z"
              fill="url(#gumGrad)"
            />
            <path
              d="M 184,130 L 191,116 Q 194,117 191,130 Z"
              fill="url(#toothGrad)"
              stroke="#94a3b8"
              strokeWidth="1.2"
            />

            {/* 下颌口腔底部托架 (Floor of Oral Cavity - 留出舌下通透空间) */}
            <path
              d="M 182,132 Q 165,152 135,168 L 105,175"
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.5"
            />

            {/* 会厌软骨 (Epiglottis) */}
            <path
              d="M 94,162 Q 92,148 97,150 Q 102,156 98,165 Z"
              fill="#fb7185"
              stroke="#be123c"
              strokeWidth="1"
              opacity="0.85"
            />

            {/* 6. 喉头与声带振动区 (Larynx & Vocal Cords) */}
            <g transform="translate(90, 182)">
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

            {/* 7. 灵动修长仿生肌肉舌体 (Slender Anatomical Tongue) */}
            {/* 真实人体舌头横向延展、灵动修长、厚度均匀，非笨重肉块 */}
            <path
              d={`M ${rootX},${rootY} 
                  C ${rootX + 4},${(rootY + currentBodyY) / 2 + 5} 
                    ${currentBodyX - 22},${currentBodyY} 
                    ${currentBodyX},${currentBodyY}
                  C ${currentBodyX + 22},${currentBodyY} 
                    ${currentTipX - 14},${currentTipY} 
                    ${currentTipX},${currentTipY}
                  Q ${currentTipX + 2},${currentTipY + 4} ${currentTipX - 2},${currentTipY + 7}
                  C ${currentTipX - 16},${currentTipY + 14} 
                    ${currentBodyX + 16},${currentBodyY + 22} 
                    ${currentBodyX},${currentBodyY + 22}
                  C ${currentBodyX - 18},${currentBodyY + 22} 
                    ${rootX + 16},${rootY - 5} 
                    ${rootX + 10},${rootY}
                  Z`}
              fill="url(#tongueGrad)"
              stroke="#be123c"
              strokeWidth="1.4"
            />

            {/* 舌背面水润高光线 (Moist Dorsum Highlight) */}
            <path
              d={`M ${rootX + 6},${rootY - 5} 
                  C ${rootX + 14},${(rootY + currentBodyY) / 2} 
                    ${currentBodyX - 16},${currentBodyY + 1} 
                    ${currentBodyX},${currentBodyY + 1}
                  C ${currentBodyX + 18},${currentBodyY + 1} 
                    ${currentTipX - 12},${currentTipY + 1} 
                    ${currentTipX - 2},${currentTipY}`}
              fill="none"
              stroke="#ffe4e6"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* 舌体细腻肌纤维微流线 */}
            <path
              d={`M ${rootX + 18},${rootY - 8} Q ${currentBodyX},${currentBodyY + 11} ${currentTipX - 12},${currentTipY + 6}
                  M ${rootX + 12},${rootY - 18} Q ${currentBodyX - 6},${currentBodyY + 15} ${currentTipX - 24},${currentTipY + 8}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="0.8"
              strokeDasharray="4 3"
              opacity="0.5"
            />

            {/* 8. 动态气流光晕路径 (Dynamic Airflow Stream) */}
            {airflowType === "oral" && (
              <path
                d="M 96,175 Q 106,108 160,90 Q 200,94 235,110"
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
                d="M 96,175 Q 110,115 170,110 L 245,112"
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
                d="M 96,175 Q 98,88 118,58 Q 165,45 230,52"
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
                d={`M 96,175 Q 108,110 155,95 Q 188,98 ${currentTipX + 8},${currentTipY - 2}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="4 2"
                className={isPlaying ? "animate-pulse" : ""}
                filter="url(#glow)"
              />
            )}

            {/* 9. 发音核心阻气/触点高精度雷达 (Focus Radar Point) */}
            <g transform={`translate(${focusX}, ${focusY})`}>
              <circle cx="0" cy="0" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" filter="url(#glow)" />
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

            {/* 10. 高品质科学解剖引线与微标 (放置在气道外侧，绝对不遮挡口腔与舌体) */}
            <g opacity="0.8">
              <text x="142" y="52" fill="#94a3b8" fontSize="8" fontWeight="bold">硬腭</text>
              <line x1="152" y1="56" x2="155" y2="67" stroke="#475569" strokeWidth="0.8" strokeDasharray="2 2" />

              <text x="180" y="58" fill="#94a3b8" fontSize="8" fontWeight="bold">齿龈</text>
              <line x1="188" y1="62" x2="191" y2="76" stroke="#475569" strokeWidth="0.8" strokeDasharray="2 2" />

              <text x="96" y="52" fill="#94a3b8" fontSize="8" fontWeight="bold">软腭</text>
              <line x1="104" y1="56" x2="108" y2="68" stroke="#475569" strokeWidth="0.8" strokeDasharray="2 2" />

              <text x="210" y="80" fill="#e2e8f0" fontSize="8" fontWeight="bold">门牙</text>
              <line x1="210" y1="84" x2="198" y2="94" stroke="#475569" strokeWidth="0.8" strokeDasharray="2 2" />
            </g>

            {/* 11. 左上角专业 HUD 发音焦点标引舱 (独立避让，不与器官文字重叠) */}
            <g transform="translate(10, 10)">
              <rect
                x="0"
                y="0"
                width={Math.min(focusPoint.label.length * 10.5 + 24, 150)}
                height="19"
                rx="6"
                fill="#020617"
                fillOpacity="0.88"
                stroke="#f59e0b"
                strokeWidth="1"
              />
              <circle cx="8" cy="9.5" r="3" fill="#f59e0b" filter="url(#glow)" />
              <text x="15" y="13" fill="#fbbf24" fontSize="8" fontWeight="bold">
                🎯 {focusPoint.label.slice(0, 11)}
              </text>
            </g>
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
