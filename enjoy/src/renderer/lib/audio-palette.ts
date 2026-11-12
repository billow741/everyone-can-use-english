/**
 * 音频波形与声调走势图表色板常量 (WaveSurfer / Chart.js / 音频可视化)
 * 用于第三方 Canvas / Web Audio 可视化库配置参数，提供统一的色阶收口。
 */

export const AUDIO_PALETTE = {
  // 学员标准录音通道（天蓝系）
  userAudio: {
    wave: "#bfdbfe",
    progress: "#3b82f6",
    line: "#3b82f6",
    point: "#60a5fa",
    pointBorder: "#2563eb",
  },
  // 领读外教/范读参照通道（粉紫系）
  coachAudio: {
    wave: "#fbcfe8",
    progress: "#f472b6",
    line: "#fb6f92",
    lineDark: "#ec4899",
    point: "#ff8fab",
    pointBorder: "#db2777",
  },
  // 声调走势图坐标轴与辅助网格
  contourAxis: {
    text: "#64748b",
    grid: "#94a3b8",
  },
  // 录音底栏与即时波形
  mediaRecording: {
    tint: "#fb6f9211",
    tintLight: "#fb6f9233",
    line: "#fb6f92",
    point: "#ff8fab",
    wave: "#efefef",
    waveFallback: "#eaeaea",
    progressFallback: "#c0d6df",
    cursor: "#ff0054",
  },
  // 音频电平指示条
  liveVisualizer: {
    barSuccess: "#10b981",
  },
};
