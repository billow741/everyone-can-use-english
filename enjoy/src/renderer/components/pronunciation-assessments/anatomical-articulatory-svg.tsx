import React, { useId } from "react";
import { PlayIcon, PauseIcon } from "lucide-react";
import { ArticulatoryConfig } from "./articulatory-tongue-visualizer";

interface AnatomicalArticulatorySvgProps {
  config: ArticulatoryConfig;
  playProgress?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const AnatomicalArticulatorySvg: React.FC<AnatomicalArticulatorySvgProps> = ({
  config,
  playProgress = 0,
  isPlaying = false,
  onTogglePlay,
}) => {
  const uid = useId().replace(/:/g, "");
  const { tongueShape, frontLipParams, focusPoint, voiced, airflowType } = config;

  // playProgress 0→1 时采用 ease-in-out 曲线从静止位（中性低位）插值到音素目标位
  const clampedProgress = Math.max(0, Math.min(1, playProgress));
  const animProgress =
    clampedProgress < 0.5
      ? 2 * clampedProgress * clampedProgress
      : 1 - Math.pow(-2 * clampedProgress + 2, 2) / 2;

  // 针对咬舌音特别优化齿间探出坐标
  const isInterdental = airflowType === "interdental" || config.category === "咬舌音";

  // 静止位（中性低位）→ 各音素目标位（位移量级 12–20+px）
  const restTipX = 168;
  const restTipY = 120;
  const restBodyX = 140;
  const restBodyY = 122;
  const restBackX = 114;
  const restBackY = 134;

  const targetTipX = isInterdental ? Math.max(tongueShape.tipX, 204) : tongueShape.tipX;
  const targetTipY = isInterdental ? 109 : tongueShape.tipY;
  const targetBodyX = tongueShape.bodyX;
  const targetBodyY = tongueShape.bodyY;

  const rawRootX = tongueShape.rootX || 110;
  const rawRootY = tongueShape.rootY || 165;
  const hasVelarRaise = rawRootY < 145;
  const targetBackX = hasVelarRaise ? rawRootX : Math.max(112, targetBodyX - 28);
  const targetBackY = hasVelarRaise ? rawRootY : Math.min(148, targetBodyY + 12);

  // 舌尖、舌身、舌后背动态插值坐标
  const currentTipX = lerp(restTipX, targetTipX, animProgress);
  const currentTipY = lerp(restTipY, targetTipY, animProgress);
  const currentBodyX = lerp(restBodyX, targetBodyX, animProgress);
  const currentBodyY = lerp(restBodyY, targetBodyY, animProgress);
  const currentBackX = lerp(restBackX, targetBackX, animProgress);
  const currentBackY = lerp(restBackY, targetBackY, animProgress);

  // 舌根向下延展至舌骨附近，厚舌体铺满口腔底部（厚度约 45–55px）
  const hyoidX = 104;
  const hyoidY = 176;
  const tipThickness = isInterdental ? 8.5 : 11.5;
  const anteriorFloorX = Math.max(170, Math.min(178, currentTipX - 2));
  const anteriorFloorY = Math.min(152, Math.max(142, currentTipY + tipThickness + 4));
  const floorMidY = Math.max(176, Math.min(188, currentBodyY + 50));
  const sublingualCtrlX = Math.min(currentTipX - 6, anteriorFloorX + 2);
  const sublingualCtrlY = (currentTipY + tipThickness + anteriorFloorY) * 0.5;

  const dxBB = currentBackX < currentBodyX ? currentBodyX - currentBackX : 20;
  const dxBT = currentBodyX < currentTipX ? currentTipX - currentBodyX : 20;

  const tonguePathD = `M ${hyoidX},${hyoidY}
    C ${hyoidX - 2},${(hyoidY + currentBackY) * 0.5 + 3}
      ${currentBackX - 5},${currentBackY + 9}
      ${currentBackX},${currentBackY}
    C ${currentBackX + dxBB * 0.42},${currentBackY - 3}
      ${currentBodyX - dxBB * 0.42},${currentBodyY - 1.5}
      ${currentBodyX},${currentBodyY}
    C ${currentBodyX + dxBT * 0.44},${currentBodyY + 1}
      ${currentTipX - dxBT * 0.44},${currentTipY + 1}
      ${currentTipX},${currentTipY}
    Q ${currentTipX + 5.5},${currentTipY + tipThickness * 0.45}
      ${currentTipX - 3},${currentTipY + tipThickness}
    Q ${sublingualCtrlX},${sublingualCtrlY}
      ${anteriorFloorX},${anteriorFloorY}
    C ${anteriorFloorX - 12},${floorMidY - 4}
      ${currentBodyX - 14},${floorMidY + 2}
      ${hyoidX},${hyoidY}
    Z`;

  // 沿舌背弧线偏内侧 3–4px 走向的柔和光泽高光带
  const highlightPathD = `M ${hyoidX + 9},${hyoidY - 14}
    C ${hyoidX + 11},${(hyoidY + currentBackY) * 0.5}
      ${currentBackX - 2},${currentBackY + 10}
      ${currentBackX + 3},${currentBackY + 3.5}
    C ${currentBackX + dxBB * 0.42},${currentBackY + 0.5}
      ${currentBodyX - dxBB * 0.42},${currentBodyY + 2}
      ${currentBodyX},${currentBodyY + 3.5}
    C ${currentBodyX + dxBT * 0.44},${currentBodyY + 4}
      ${currentTipX - dxBT * 0.44},${currentTipY + 3.5}
      ${currentTipX - 3.5},${currentTipY + 3.5}`;

  const fiberPathD = `M ${hyoidX + 14},${hyoidY - 6} Q ${currentBodyX - 4},${currentBodyY + 22} ${currentTipX - 14},${currentTipY + 10}
    M ${hyoidX + 20},${hyoidY - 2} Q ${currentBodyX + 4},${currentBodyY + 30} ${anteriorFloorX - 10},${anteriorFloorY - 8}`;

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
      {/* 视角 1: 侧切面舌位解剖图 (Sagittal Cross-Section) - 浅底教科书解剖配色，dark 模式下亦保持浅底深字 */}
      <div
        style={{ colorScheme: "light" }}
        className="bg-[#F3FAF8] dark:bg-[#F3FAF8] text-[#123B3C] dark:text-[#123B3C] rounded-2xl border border-[#D3E4DE] dark:border-[#D3E4DE] p-3.5 flex flex-col items-center justify-between shadow-[0_1px_3px_rgba(18,59,60,0.04),0_6px_16px_rgba(18,59,60,0.06)] relative overflow-hidden"
      >
        <div className="w-full flex items-center justify-between gap-2 pb-2 border-b border-[#D3E4DE] text-xs">
          <span className="font-bold text-[#123B3C] dark:text-[#123B3C] flex items-center gap-1.5 min-w-0">
            <span className="size-2 rounded-full bg-[#0F7B7A] shrink-0" />
            <span className="truncate">
              矢状面解剖舌位图 <span className="hidden sm:inline font-medium text-[#4E6B69]">(Sagittal Section)</span>
            </span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {onTogglePlay && (
              <button
                type="button"
                onClick={onTogglePlay}
                aria-pressed={isPlaying}
                data-testid="sagittal-play-button"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[30px] rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F7B7A] ${
                  isPlaying
                    ? "bg-[#0A5E5D] text-white border-[#084A49] hover:bg-[#084A49] ring-2 ring-[#0F7B7A]/25"
                    : "bg-[#0F7B7A] text-white border-[#0A5E5D] hover:bg-[#0A5E5D]"
                }`}
              >
                {isPlaying ? (
                  <>
                    <PauseIcon className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>暂停</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="size-3.5 fill-current shrink-0" aria-hidden="true" />
                    <span>播放舌位动画</span>
                  </>
                )}
              </button>
            )}
            <span className="text-[10px] text-[#0A5E5D] dark:text-[#0A5E5D] font-mono font-semibold bg-white px-2 py-0.5 rounded border border-[#D3E4DE]">
              {config.category}
            </span>
          </div>
        </div>

        {/* SVG 解剖解说画布 */}
        <div className="w-full max-w-[300px] aspect-[4/3] relative my-1.5 rounded-xl bg-white border border-[#D3E4DE]/80 p-1">
          <svg
            viewBox="0 0 280 210"
            className="w-full h-full overflow-visible select-none"
          >
            <defs>
              {/* 颅面矢状切面浅色软组织底色 */}
              <linearGradient id={`${uid}-headTissue`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EBF4F1" />
                <stop offset="55%" stopColor="#E1EEEA" />
                <stop offset="100%" stopColor="#D6E6E1" />
              </linearGradient>

              {/* 鼻腔柔和空腔渐变 */}
              <linearGradient id={`${uid}-nasalSpace`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D7E5E1" />
                <stop offset="100%" stopColor="#EDF5F3" />
              </linearGradient>

              {/* 口腔与咽腔声道空间渐变（浅色教科书风格，温和阴影凸显腔道边界） */}
              <linearGradient id={`${uid}-oralSpace`} x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#D1E0DC" />
                <stop offset="45%" stopColor="#E8F1EF" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>

              {/* 硬腭与下颌骨截面骨骼渐变 */}
              <linearGradient id={`${uid}-boneGrad`} x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#EEF2F6" />
                <stop offset="55%" stopColor="#DCE4EC" />
                <stop offset="100%" stopColor="#C7D3DF" />
              </linearGradient>

              {/* 软腭与咽壁黏膜粉色渐变 */}
              <linearGradient id={`${uid}-velumGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDA4AF" />
                <stop offset="60%" stopColor="#F4728A" />
                <stop offset="100%" stopColor="#D94B6A" />
              </linearGradient>

              {/* 真实 3D 解剖舌体主渐变（舌背粉亮、舌中鲜红、舌底深红） */}
              <linearGradient id={`${uid}-tongueBase`} x1="30%" y1="0%" x2="65%" y2="100%">
                <stop offset="0%" stopColor="#FF8FA3" />
                <stop offset="22%" stopColor="#F43F5E" />
                <stop offset="64%" stopColor="#BE123C" />
                <stop offset="100%" stopColor="#7F1030" />
              </linearGradient>

              {/* 舌体 3D 立体径向光影叠加（舌背圆顶受光 + 舌根舌底深暗阴影） */}
              <radialGradient id={`${uid}-tongueRadial`} cx="56%" cy="22%" r="72%" fx="58%" fy="18%">
                <stop offset="0%" stopColor="#FFE4E8" stopOpacity="0.46" />
                <stop offset="42%" stopColor="#FB7185" stopOpacity="0.12" />
                <stop offset="80%" stopColor="#881337" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#4C0519" stopOpacity="0.56" />
              </radialGradient>

              {/* 舌体轮廓裁剪区，保证高光带与肌纤维纹理贴合舌面 */}
              <clipPath id={`${uid}-tongueClip`}>
                <path d={tonguePathD} />
              </clipPath>

              {/* 牙齿牙釉质高光渐变 */}
              <linearGradient id={`${uid}-toothGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#F8FAFC" />
                <stop offset="100%" stopColor="#DCE4EE" />
              </linearGradient>

              {/* 牙龈粉润质感 */}
              <linearGradient id={`${uid}-gumGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FDA4AF" />
                <stop offset="100%" stopColor="#E11D48" stopOpacity="0.82" />
              </linearGradient>

              {/* 动态气流渐变（深青/天蓝高对比） */}
              <linearGradient id={`${uid}-airGrad`} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0F7B7A" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#0284C7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0369A1" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* 水平镜像层：开口朝左（x' = 280 - x），所有文字标签放在镜像层外保持正向可读 */}
            <g transform="translate(280, 0) scale(-1, 1)">
              {/* 1. 颅面轮廓切面底色剪影 */}
              <path
                d="M 60,34
                   Q 140,22 204,28
                   Q 218,40 224,50
                   Q 232,56 244,62
                   Q 237,70 230,75
                   L 225,86
                   Q 232,94 222,102
                   L 212,106
                   L 212,119
                   L 221,122
                   Q 225,130 219,138
                   Q 214,146 216,154
                   Q 222,167 210,177
                   Q 184,193 148,195
                   L 82,193
                   L 60,188 Z"
                fill={`url(#${uid}-headTissue)`}
              />

              {/* 口腔与咽腔声道空间 (Oral & Pharyngeal Lumen) */}
              <path
                d="M 84,66 Q 79,112 85,184 L 106,184 Q 112,168 150,158 L 214,121 L 214,104 L 194,88 Q 160,68 115,68 Z"
                fill={`url(#${uid}-oralSpace)`}
              />

              {/* 鼻腔空腔 (Nasal Cavity) */}
              <path
                d="M 116,49 Q 165,44 218,52 L 220,64 Q 165,58 119,64 Z"
                fill={`url(#${uid}-nasalSpace)`}
                stroke="#123B3C"
                strokeWidth="0.9"
                strokeOpacity="0.45"
              />
              {/* 鼻甲骨弧线纹理 */}
              <path
                d="M 134,53 Q 168,49 204,55 M 144,59 Q 174,56 208,61"
                fill="none"
                stroke="#2E5B5C"
                strokeWidth="0.9"
                strokeDasharray="3 2"
                opacity="0.55"
              />

              {/* 后咽壁黏膜层与咽后壁轮廓线 (Posterior Pharyngeal Wall) */}
              <path
                d="M 76,44 Q 72,108 77,184 L 85,184 Q 79,112 84,44 Z"
                fill="#E8D1D5"
                opacity="0.7"
              />
              <path
                d="M 84,44 Q 79,112 85,184"
                fill="none"
                stroke="#123B3C"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* 颅面外轮廓线（上下唇处留出真实张口通道，不封死嘴唇） */}
              <path
                d="M 60,34
                   Q 140,22 204,28
                   Q 218,40 224,50
                   Q 232,56 244,62
                   Q 237,70 230,75
                   L 225,86
                   Q 232,94 222,102
                   Q 215,107 205,103"
                fill="none"
                stroke="#123B3C"
                strokeWidth="1.35"
                strokeLinecap="round"
                opacity="0.78"
              />
              <path
                d="M 204,121
                   Q 214,118 221,122
                   Q 225,130 219,138
                   Q 214,146 216,154
                   Q 222,167 210,177
                   Q 184,193 148,195
                   L 82,193
                   L 60,188"
                fill="none"
                stroke="#123B3C"
                strokeWidth="1.35"
                strokeLinecap="round"
                opacity="0.78"
              />
              {/* 上下唇红微润轮廓 */}
              <path
                d="M 222,97 Q 228,100 221,104 Q 214,106 208,103 Q 216,100 222,97 Z"
                fill="#E88D9F"
                stroke="#123B3C"
                strokeWidth="0.8"
                opacity="0.75"
              />
              <path
                d="M 208,120 Q 216,118 222,122 Q 223,128 217,129 Q 212,125 208,120 Z"
                fill="#E88D9F"
                stroke="#123B3C"
                strokeWidth="0.8"
                opacity="0.75"
              />

              {/* 2. 上腭骨架 (硬腭弧 + 齿龈隆起) */}
              <path
                d="M 115,66 Q 150,63 178,70 Q 192,76 198,90 L 191,92 Q 186,81 172,76 Q 145,72 115,74 Z"
                fill={`url(#${uid}-boneGrad)`}
                stroke="#123B3C"
                strokeWidth="1.25"
              />
              {/* 硬腭前部横褶纹理 (Palatal Rugae) */}
              <path
                d="M 182,78 Q 185,75 189,80 M 172,74 Q 175,71 179,76"
                fill="none"
                stroke="#3E6465"
                strokeWidth="1.0"
                opacity="0.65"
              />

              {/* 3. 软腭与悬雍垂小舌 (Velum & Uvula) - 动态开闭 */}
              {isNasal ? (
                <path
                  d="M 115,69 Q 105,88 109,106 Q 105,110 101,104 Q 98,86 115,74 Z"
                  fill={`url(#${uid}-velumGrad)`}
                  stroke="#123B3C"
                  strokeWidth="1.15"
                />
              ) : (
                <path
                  d="M 115,69 Q 98,74 86,80 Q 84,84 90,84 Q 100,79 115,74 Z"
                  fill={`url(#${uid}-velumGrad)`}
                  stroke="#123B3C"
                  strokeWidth="1.15"
                />
              )}

              {/* 4. 上门牙与牙龈 (Upper Central Incisor) */}
              <path
                d="M 193,86 Q 198,82 204,86 L 200,93 L 190,93 Z"
                fill={`url(#${uid}-gumGrad)`}
                stroke="#123B3C"
                strokeWidth="0.85"
              />
              <path
                d="M 191,92 L 197,106 Q 193.5,107.5 190,106 L 187,92 Z"
                fill={`url(#${uid}-toothGrad)`}
                stroke="#123B3C"
                strokeWidth="1.2"
              />

              {/* 5. 下门牙、下颌骨矢状截面与口腔底线 (Lower Incisor, Mandible & Oral Floor) */}
              {/* 下颌骨截面轮廓 (Mandibular Symphysis) */}
              <path
                d="M 185,129 Q 195,131 199,144 Q 201,158 193,166 Q 184,169 180,159 Q 179,144 184,131 Z"
                fill={`url(#${uid}-boneGrad)`}
                stroke="#123B3C"
                strokeWidth="1.2"
              />
              <ellipse
                cx="190"
                cy="148"
                rx="4.2"
                ry="8.5"
                fill="#B8C7D4"
                opacity="0.45"
              />
              {/* 下牙龈与下门牙 */}
              <path
                d="M 183,128 Q 190,126 194,131 L 187,135 L 181,132 Z"
                fill={`url(#${uid}-gumGrad)`}
                stroke="#123B3C"
                strokeWidth="0.85"
              />
              <path
                d="M 184,130 L 191,116 Q 194.5,117 191,130 Z"
                fill={`url(#${uid}-toothGrad)`}
                stroke="#123B3C"
                strokeWidth="1.2"
              />

              {/* 舌下口腔底线 (Floor of Oral Cavity - 贴合下颌到舌骨托住厚实舌底) */}
              <path
                d="M 181,152 Q 166,178 136,189 Q 118,191 103,181"
                fill="none"
                stroke="#123B3C"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.78"
              />

              {/* 舌骨截面 (Hyoid Bone) */}
              <ellipse
                cx="101"
                cy="179"
                rx="3.4"
                ry="2.2"
                fill={`url(#${uid}-boneGrad)`}
                stroke="#123B3C"
                strokeWidth="1.0"
              />

              {/* 会厌软骨 (Epiglottis) */}
              <path
                d="M 94,164 Q 91,148 97,149 Q 102,155 98,166 Z"
                fill="#F4A2B0"
                stroke="#123B3C"
                strokeWidth="1.1"
              />

              {/* 6. 喉头与声带振动区 (Larynx & Vocal Cords) */}
              <g transform="translate(90, 182)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="8"
                  ry="4"
                  fill={voiced ? "#F59E0B" : "#CBD5E1"}
                  stroke="#123B3C"
                  strokeWidth="1.2"
                />
                {voiced && isPlaying && (
                  <path
                    d="M -14,-6 Q 0,-12 14,-6 M -16,0 Q 0,-7 16,0 M -14,6 Q 0,12 14,6"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                )}
              </g>

              {/* 7. 真实 3D 解剖感厚实肌肉舌体 (Multi-gradient 3D Anatomical Tongue) */}
              <path
                data-testid="sagittal-tongue-path"
                d={tonguePathD}
                fill={`url(#${uid}-tongueBase)`}
              />

              {/* 舌体 3D 径向明暗叠加 + 柔和舌背高光带 + 肌纤维微流线（裁剪至舌体轮廓内） */}
              <g clipPath={`url(#${uid}-tongueClip)`}>
                <path d={tonguePathD} fill={`url(#${uid}-tongueRadial)`} />
                {/* 外层柔和宽描边光泽带 (半透明白色模糊感) */}
                <path
                  d={highlightPathD}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="9.5"
                  strokeLinecap="round"
                  opacity="0.18"
                />
                {/* 内层水润舌背主高光带 */}
                <path
                  d={highlightPathD}
                  fill="none"
                  stroke="#FFF1F2"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  opacity="0.44"
                />
                {/* 圆润舌尖微高光点 */}
                <circle
                  cx={currentTipX - 3.5}
                  cy={currentTipY + 4}
                  r="2.4"
                  fill="#FFFFFF"
                  opacity="0.32"
                />
                {/* 舌体深层肌纤维纹理 */}
                <path
                  d={fiberPathD}
                  fill="none"
                  stroke="#881337"
                  strokeWidth="0.9"
                  strokeDasharray="5 3"
                  opacity="0.24"
                />
              </g>

              {/* 舌体外部清晰解剖描边 */}
              <path
                d={tonguePathD}
                fill="none"
                stroke="#881337"
                strokeWidth="1.45"
                strokeLinejoin="round"
              />

              {/* 8. 动态气流路径 (Dynamic Airflow Stream - 浅底高对比配色) */}
              {airflowType === "oral" && (
                <path
                  d="M 96,175 Q 106,108 160,90 Q 200,94 235,110"
                  fill="none"
                  stroke={`url(#${uid}-airGrad)`}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeDasharray="5 3"
                  className={isPlaying ? "animate-pulse" : ""}
                />
              )}
              {airflowType === "interdental" && (
                <path
                  d="M 96,175 Q 110,115 170,110 L 245,112"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="5 2.5"
                  className={isPlaying ? "animate-pulse" : ""}
                />
              )}
              {airflowType === "nasal" && (
                <path
                  d="M 96,175 Q 98,88 118,58 Q 165,45 230,52"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeDasharray="5 3"
                  className={isPlaying ? "animate-pulse" : ""}
                />
              )}
              {(airflowType === "friction" || airflowType === "lateral") && (
                <path
                  d={`M 96,175 Q 108,110 155,95 Q 188,98 ${currentTipX + 8},${currentTipY - 2}`}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeDasharray="4 2"
                  className={isPlaying ? "animate-pulse" : ""}
                />
              )}

              {/* 9. 发音核心阻气/触点高精度雷达 (Focus Radar Point) */}
              <g transform={`translate(${focusX}, ${focusY})`}>
                <circle cx="0" cy="0" r="4.5" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.8" />
                <circle
                  cx="0"
                  cy="0"
                  r="11"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="1.6"
                  opacity="0.85"
                  className={isPlaying ? "animate-ping" : ""}
                />
              </g>

              {/* 解剖引线（随镜像翻转坐标） */}
              <g opacity="0.65">
                <line x1="146" y1="42" x2="152" y2="67" stroke="#123B3C" strokeWidth="0.9" strokeDasharray="2 2" />
                <line x1="188" y1="45" x2="190" y2="75" stroke="#123B3C" strokeWidth="0.9" strokeDasharray="2 2" />
                <line x1="102" y1="47" x2="107" y2="69" stroke="#123B3C" strokeWidth="0.9" strokeDasharray="2 2" />
                <line x1="210" y1="82" x2="196" y2="94" stroke="#123B3C" strokeWidth="0.9" strokeDasharray="2 2" />
              </g>
            </g>

            {/* 10. 高品质科学解剖微标（在镜像层外保持正向可读，x = 280 - 原引线起点） */}
            <text
              x="190"
              y="204"
              textAnchor="middle"
              fill={voiced ? "#B45309" : "#4E6B69"}
              fontSize="8"
              fontWeight="600"
              fontFamily="sans-serif"
            >
              声带{voiced ? "(振动)" : "(静止)"}
            </text>
            <g>
              <text x="134" y="39" textAnchor="middle" fill="#123B3C" fontSize="8" fontWeight="bold">硬腭</text>
              <text x="92" y="42" textAnchor="middle" fill="#123B3C" fontSize="8" fontWeight="bold">齿龈</text>
              <text x="178" y="44" textAnchor="middle" fill="#123B3C" fontSize="8" fontWeight="bold">软腭</text>
              <text x="68" y="79" textAnchor="end" fill="#123B3C" fontSize="8" fontWeight="bold">门牙</text>
            </g>

            {/* 11. 左上角专业 HUD 发音焦点标引舱 (浅底深字，独立避让不重叠) */}
            <g transform="translate(8, 6)">
              <rect
                x="0"
                y="0"
                width={Math.min(focusPoint.label.length * 10.5 + 24, 152)}
                height="19"
                rx="6"
                fill="#FFFFFF"
                fillOpacity="0.95"
                stroke="#0F7B7A"
                strokeWidth="1"
              />
              <circle cx="8" cy="9.5" r="3" fill="#D97706" />
              <text x="15" y="13" fill="#123B3C" fontSize="8" fontWeight="bold">
                🎯 {focusPoint.label.length > 11 ? `${focusPoint.label.slice(0, 10)}…` : focusPoint.label}
              </text>
            </g>
          </svg>
        </div>

        {/* 底部解剖指标要点 */}
        <div className="w-full flex items-center justify-between gap-2 text-[11px] text-[#4E6B69] dark:text-[#4E6B69] pt-1.5 border-t border-[#D3E4DE]">
          <span className="min-w-0 truncate">
            发音触点: <strong className="text-[#92400E] dark:text-[#92400E] font-mono">{focusPoint.label}</strong>
          </span>
          <span className="text-[#123B3C] dark:text-[#123B3C] text-[10px] font-mono font-semibold shrink-0">
            气流: {airflowType}
          </span>
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
              <linearGradient id="toothGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient id="tongueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="25%" stopColor="#fb7185" />
                <stop offset="70%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#9f1239" />
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
