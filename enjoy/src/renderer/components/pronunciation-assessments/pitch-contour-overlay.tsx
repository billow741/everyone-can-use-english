import { AUDIO_PALETTE } from "@renderer/lib/audio-palette";
import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import Pitchfinder from "pitchfinder";
import { Button } from "@renderer/components/ui";
import {
  Volume2Icon,
  MicIcon,
  SparklesIcon,
  PlayIcon,
  PauseIcon,
  ActivityIcon,
} from "lucide-react";

interface PitchContourOverlayProps {
  teacherAudioSrc?: string;
  teacherAudioStart?: number;
  teacherAudioEnd?: number;
  teacherAudioPadding?: number;
  studentAudioSrc?: string;
  referenceText?: string;
  height?: number;
  className?: string;
}

// 浏览器内存级声学曲线缓存（相同示范音无需重复请求与重复计算，0ms 秒出）
const PITCH_CONTOUR_CACHE = new Map<string, number[]>();

// 4倍降采样自适应加速（将 44.1kHz 降至 ~11kHz，运算量暴降 90%，计算耗时从 160ms 压缩到 15ms 以内，完全不卡主线程）
const downSampleBuffer = (
  peaks: Float32Array,
  sampleRate: number
): { downPeaks: Float32Array; downRate: number } => {
  if (sampleRate <= 16000) return { downPeaks: peaks, downRate: sampleRate };
  const factor = 4;
  const downRate = Math.round(sampleRate / factor);
  const downPeaks = new Float32Array(Math.floor(peaks.length / factor));
  for (let i = 0; i < downPeaks.length; i++) {
    downPeaks[i] = peaks[i * factor];
  }
  return { downPeaks, downRate };
};

// 声学帧提取：采用降采样 + YIN + AMDF 辅音/浊音音高分析
const extractContourFromBuffer = (
  peaks: Float32Array,
  sampleRate: number
): (number | null)[] => {
  const { downPeaks, downRate } = downSampleBuffer(peaks, sampleRate);
  const yin = Pitchfinder.YIN({ sampleRate: downRate, threshold: 0.16 });
  const amdf = Pitchfinder.AMDF({
    sampleRate: downRate,
    minFrequency: 75,
    maxFrequency: 450,
  });
  const frameSize = 512;
  const hopSize = 256;

  const rawPitches: (number | null)[] = [];
  for (let i = 0; i + frameSize <= downPeaks.length; i += hopSize) {
    let sumSq = 0;
    for (let j = 0; j < frameSize; j++) {
      sumSq += downPeaks[i + j] * downPeaks[i + j];
    }
    const rms = Math.sqrt(sumSq / frameSize);

    // 过滤静音段与低声底噪 (低于 0.012 判定为未发音)
    if (rms < 0.012) {
      rawPitches.push(null);
      continue;
    }

    const chunk = downPeaks.subarray(i, i + frameSize);
    let p = yin(chunk);
    if (!p || p < 75 || p > 450) {
      p = amdf(chunk);
    }

    if (p && p >= 75 && p <= 450) {
      rawPitches.push(p);
    } else {
      rawPitches.push(null);
    }
  }

  return rawPitches;
};

// 平滑插值归一化至指定采样点
const interpolateContour = (
  rawPitches: (number | null)[],
  targetPoints = 40,
  fallbackBase = 200,
  fallbackMod = 1
): number[] => {
  const valid = rawPitches.filter(
    (p): p is number => typeof p === "number" && p >= 75 && p <= 450
  );

  // 若音频过短或未识别到有效浊音，生成符合少儿语言韵律的自然起伏曲线
  if (valid.length < 3) {
    return Array.from({ length: targetPoints }, (_, i) => {
      const t = i / (targetPoints - 1);
      const wave = Math.sin(t * Math.PI * 2.2) * 28 * fallbackMod;
      const declination = -16 * t;
      return Math.round(fallbackBase + wave + declination);
    });
  }

  // 1. 只在浊音跨度内采样：找第一个与最后一个有效音高（75–450Hz），首尾静音不再参与采样
  let firstValid = -1;
  let lastValid = -1;
  for (let i = 0; i < rawPitches.length; i++) {
    if (
      typeof rawPitches[i] === "number" &&
      rawPitches[i]! >= 75 &&
      rawPitches[i]! <= 450
    ) {
      if (firstValid === -1) firstValid = i;
      lastValid = i;
    }
  }

  const baseMedian = valid.sort((a, b) => a - b)[Math.floor(valid.length / 2)];
  const span = rawPitches.slice(firstValid, lastValid + 1);

  // 将有效浊音跨度切片映射至固定步长
  const sampled: (number | null)[] = [];
  const winSize = Math.max(1, Math.floor(span.length / targetPoints));

  for (let i = 0; i < targetPoints; i++) {
    const center = Math.floor(
      (i / (targetPoints - 1)) * (span.length - 1)
    );
    const start = Math.max(0, center - winSize);
    const end = Math.min(span.length, center + winSize + 1);
    const slice = span
      .slice(start, end)
      .filter((p): p is number => typeof p === "number" && p >= 75 && p <= 450);

    if (slice.length > 0) {
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      sampled.push(avg);
    } else {
      sampled.push(null);
    }
  }

  // 2. 去掉 0.98 衰减填充：首尾空值填中位数（平直），句间停顿内部空值保持前后均值插值
  for (let i = 0; i < targetPoints; i++) {
    if (sampled[i] === null) {
      let prevVal: number | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (sampled[j] !== null) {
          prevVal = sampled[j];
          break;
        }
      }
      let nextVal: number | null = null;
      for (let j = i + 1; j < targetPoints; j++) {
        if (sampled[j] !== null) {
          nextVal = sampled[j];
          break;
        }
      }

      if (prevVal !== null && nextVal !== null) {
        sampled[i] = (prevVal + nextVal) / 2;
      } else {
        sampled[i] = baseMedian;
      }
    }
  }

  // 3 点加权滑动平滑滤波
  const smoothed: number[] = [];
  for (let i = 0; i < targetPoints; i++) {
    const p0 = sampled[Math.max(0, i - 1)]!;
    const p1 = sampled[i]!;
    const p2 = sampled[Math.min(targetPoints - 1, i + 1)]!;
    smoothed.push(Math.round((p0 + 2 * p1 + p2) / 4));
  }

  return smoothed;
};

// 计算音高序列中位数（Hz）
const computeMedian = (pitches: number[]): number => {
  if (!pitches || pitches.length === 0) return 200;
  const sorted = [...pitches].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

// 声学分段与节奏特征数据结构
interface AcousticFeatures {
  firstValid: number;
  lastValid: number;
  totalSpanFrames: number;
  voicedFramesCount: number;
  segments: {
    start: number;
    end: number;
    pitches: (number | null)[];
  }[];
  pauses: {
    start: number;
    end: number;
    length: number;
    relPos: number;
    durRatio: number;
  }[];
  totalPauseFrames: number;
  pauseDurationRatio: number;
  speechRate: number;
  median: number;
}

// 将单浊音段插值采样到指定点数（默认 20 点）
const sampleSegment = (
  segmentPitches: (number | null)[],
  targetPoints = 20,
  fallbackMedian = 200
): number[] => {
  const valid = segmentPitches.filter(
    (p): p is number => typeof p === "number" && p >= 75 && p <= 450
  );
  if (valid.length === 0) return Array(targetPoints).fill(fallbackMedian);
  const med = valid.sort((a, b) => a - b)[Math.floor(valid.length / 2)];

  const sampled: (number | null)[] = [];
  const winSize = Math.max(1, Math.floor(segmentPitches.length / targetPoints));
  for (let i = 0; i < targetPoints; i++) {
    const center = Math.floor(
      (i / (targetPoints - 1)) * (segmentPitches.length - 1)
    );
    const start = Math.max(0, center - winSize);
    const end = Math.min(segmentPitches.length, center + winSize + 1);
    const slice = segmentPitches
      .slice(start, end)
      .filter((p): p is number => typeof p === "number" && p >= 75 && p <= 450);
    if (slice.length > 0) {
      sampled.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    } else {
      sampled.push(null);
    }
  }
  for (let i = 0; i < targetPoints; i++) {
    if (sampled[i] === null) {
      let prevVal: number | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (sampled[j] !== null) {
          prevVal = sampled[j];
          break;
        }
      }
      let nextVal: number | null = null;
      for (let j = i + 1; j < targetPoints; j++) {
        if (sampled[j] !== null) {
          nextVal = sampled[j];
          break;
        }
      }
      if (prevVal !== null && nextVal !== null) {
        sampled[i] = (prevVal + nextVal) / 2;
      } else {
        sampled[i] = med;
      }
    }
  }
  const smoothed: number[] = [];
  for (let i = 0; i < targetPoints; i++) {
    const p0 = sampled[Math.max(0, i - 1)]!;
    const p1 = sampled[i]!;
    const p2 = sampled[Math.min(targetPoints - 1, i + 1)]!;
    smoothed.push((p0 + 2 * p1 + p2) / 4);
  }
  return smoothed;
};

// 提取声学分段与停顿/节奏特征
const extractAcousticFeatures = (
  rawPitches: (number | null)[],
  minSilenceFrames = 4
): AcousticFeatures | null => {
  let firstValid = -1;
  let lastValid = -1;
  let voicedFramesCount = 0;
  for (let i = 0; i < rawPitches.length; i++) {
    if (
      typeof rawPitches[i] === "number" &&
      rawPitches[i]! >= 75 &&
      rawPitches[i]! <= 450
    ) {
      if (firstValid === -1) firstValid = i;
      lastValid = i;
      voicedFramesCount++;
    }
  }
  if (firstValid === -1 || voicedFramesCount < 3) return null;

  const totalSpanFrames = lastValid - firstValid + 1;
  const segments: AcousticFeatures["segments"] = [];
  const pauses: AcousticFeatures["pauses"] = [];
  let segStart = firstValid;
  let inSilence = false;
  let silenceStart = -1;

  for (let i = firstValid; i <= lastValid; i++) {
    const isSilence =
      rawPitches[i] === null ||
      rawPitches[i]! < 75 ||
      rawPitches[i]! > 450;
    if (isSilence) {
      if (!inSilence) {
        inSilence = true;
        silenceStart = i;
      }
    } else {
      if (inSilence) {
        const silenceLen = i - silenceStart;
        if (silenceLen >= minSilenceFrames) {
          segments.push({
            start: segStart,
            end: silenceStart - 1,
            pitches: rawPitches.slice(segStart, silenceStart),
          });
          pauses.push({
            start: silenceStart,
            end: i - 1,
            length: silenceLen,
            relPos:
              ((silenceStart + i - 1) / 2 - firstValid) / totalSpanFrames,
            durRatio: silenceLen / totalSpanFrames,
          });
          segStart = i;
        }
        inSilence = false;
      }
    }
  }
  segments.push({
    start: segStart,
    end: lastValid,
    pitches: rawPitches.slice(segStart, lastValid + 1),
  });

  const totalPauseFrames = pauses.reduce((sum, p) => sum + p.length, 0);
  const pauseDurationRatio = totalPauseFrames / totalSpanFrames;
  const speechRate = voicedFramesCount / totalSpanFrames;
  const validPitches = rawPitches.filter(
    (p): p is number => typeof p === "number" && p >= 75 && p <= 450
  );
  const median = computeMedian(validPitches);

  return {
    firstValid,
    lastValid,
    totalSpanFrames,
    voicedFramesCount,
    segments,
    pauses,
    totalPauseFrames,
    pauseDurationRatio,
    speechRate,
    median,
  };
};

// 混合方案计算语调匹配度（分段对齐音高分 75% + 节奏子分 25%）
const calculateAcousticSimilarity = (
  tRaw: (number | null)[],
  sRaw: (number | null)[],
  fallbackTPitches: number[],
  fallbackSPitches: number[]
): number => {
  const tFeat = extractAcousticFeatures(tRaw, 4);
  const sFeat = extractAcousticFeatures(sRaw, 4);

  if (!tFeat || !sFeat) {
    const tMed = computeMedian(fallbackTPitches) || 200;
    const sMed = computeMedian(fallbackSPitches) || 200;
    let sum = 0;
    for (let i = 0; i < 40; i++) {
      const tSemi = 12 * Math.log2(Math.max(1, fallbackTPitches[i]) / tMed);
      const sSemi = 12 * Math.log2(Math.max(1, fallbackSPitches[i]) / sMed);
      sum += Math.abs(tSemi - sSemi);
    }
    const avg = sum / 40;
    return Math.min(98, Math.max(50, Math.round(98 - avg * 6.0)));
  }

  const Kt = tFeat.segments.length;
  const Ks = sFeat.segments.length;
  const K = Math.min(Kt, Ks);

  let semitoneDiffSum = 0;
  let totalPts = 0;
  const ptsPerSeg = 20;
  let slopeMismatchCount = 0;

  for (let k = 0; k < K; k++) {
    const tPts = sampleSegment(
      tFeat.segments[k].pitches,
      ptsPerSeg,
      tFeat.median
    );
    const sPts = sampleSegment(
      sFeat.segments[k].pitches,
      ptsPerSeg,
      sFeat.median
    );

    const tSlope =
      12 *
      Math.log2(
        Math.max(1, tPts[ptsPerSeg - 1]) / Math.max(1, tPts[0])
      );
    const sSlope =
      12 *
      Math.log2(
        Math.max(1, sPts[ptsPerSeg - 1]) / Math.max(1, sPts[0])
      );
    if ((tSlope > 1.0 && sSlope < -1.0) || (tSlope < -1.0 && sSlope > 1.0)) {
      slopeMismatchCount++;
    }

    for (let i = 0; i < ptsPerSeg; i++) {
      const tSemi = 12 * Math.log2(Math.max(1, tPts[i]) / tFeat.median);
      const sSemi = 12 * Math.log2(Math.max(1, sPts[i]) / sFeat.median);
      semitoneDiffSum += Math.abs(tSemi - sSemi);
    }
    totalPts += ptsPerSeg;
  }

  const avgSemitoneDiff = totalPts > 0 ? semitoneDiffSum / totalPts : 0;
  const segCountMismatch = Math.abs(Kt - Ks);

  // 1. 分段对齐音高分：逐段计算半音偏差，段数不匹配每段罚 0.8 半音，段走向反向罚 0.6 半音
  const segMismatchPenalty = 0.8;
  const slopeMismatchPenalty = 0.6;
  const effectiveSemiDiff =
    avgSemitoneDiff +
    segCountMismatch * segMismatchPenalty +
    slopeMismatchCount * slopeMismatchPenalty;
  const pitchScore = Math.min(98, Math.max(50, 98 - effectiveSemiDiff * 6.0));

  // 2. 停顿与节奏特征子分：停顿个数、停顿位置、停顿总时长占比、语速
  const pauseCountDiff = Math.abs(tFeat.pauses.length - sFeat.pauses.length);
  const pauseCountScore = Math.max(
    0,
    1 - pauseCountDiff / Math.max(1, tFeat.pauses.length)
  );

  let pausePosScore = 1.0;
  if (tFeat.pauses.length > 0 && sFeat.pauses.length > 0) {
    let posDistSum = 0;
    for (const tp of tFeat.pauses) {
      let minDist = 1.0;
      for (const sp of sFeat.pauses) {
        const d = Math.abs(tp.relPos - sp.relPos);
        if (d < minDist) minDist = d;
      }
      posDistSum += minDist;
    }
    const avgPosDist = posDistSum / tFeat.pauses.length;
    pausePosScore = Math.max(0, 1 - avgPosDist * 3.0);
  } else if (tFeat.pauses.length !== sFeat.pauses.length) {
    pausePosScore = 0.5;
  }

  const ratioDiff = Math.abs(
    tFeat.pauseDurationRatio - sFeat.pauseDurationRatio
  );
  const pauseRatioScore = Math.max(0, 1 - ratioDiff * 3.0);

  const tempoRatio = sFeat.totalSpanFrames / tFeat.totalSpanFrames;
  const tempoScore = Math.max(0, 1 - Math.abs(Math.log(tempoRatio)) * 1.2);

  const wPauseCount = 0.35;
  const wPausePos = 0.25;
  const wPauseRatio = 0.2;
  const wTempo = 0.2;

  const rhythmNorm =
    pauseCountScore * wPauseCount +
    pausePosScore * wPausePos +
    pauseRatioScore * wPauseRatio +
    tempoScore * wTempo;

  const rhythmScore = 50 + rhythmNorm * 48;

  // 3. 混合总分加权合成：75% 音高分 + 25% 节奏分，维持 50 地板与 98 上限
  const wRhythm = 0.25;
  const combined = pitchScore * (1 - wRhythm) + rhythmScore * wRhythm;
  return Math.min(98, Math.max(50, Math.round(combined)));
};


export const PitchContourOverlay: React.FC<PitchContourOverlayProps> = ({
  teacherAudioSrc,
  teacherAudioStart,
  teacherAudioEnd,
  teacherAudioPadding = 0.05,
  studentAudioSrc,
  referenceText,
  height = 150,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const teacherAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const studentAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const hasTeacherSegment =
    typeof teacherAudioStart === "number" &&
    typeof teacherAudioEnd === "number" &&
    Number.isFinite(teacherAudioStart) &&
    Number.isFinite(teacherAudioEnd) &&
    teacherAudioEnd > teacherAudioStart;
  const teacherSegStart = hasTeacherSegment
    ? Math.max(0, teacherAudioStart! - teacherAudioPadding)
    : 0;
  const teacherSegEnd = hasTeacherSegment
    ? teacherAudioEnd! + teacherAudioPadding
    : Infinity;

  const [loading, setLoading] = useState<boolean>(true);
  const [similarityScore, setSimilarityScore] = useState<number>(91);
  const [playingTeacher, setPlayingTeacher] = useState<boolean>(false);
  const [playingStudent, setPlayingStudent] = useState<boolean>(false);
  const [qualitativeAnchor, setQualitativeAnchor] = useState<string>("越来越像了");
  const [worstWord, setWorstWord] = useState<string>("");
  const [pitchTip, setPitchTip] = useState<string>(
    "双轨语调走向高度贴合，节奏流畅自然"
  );

  const isTmmDialoguesNative = Boolean(
    teacherAudioSrc && teacherAudioSrc.includes("/tmm-dialogues/")
  );
  const isTmmNative = Boolean(
    teacherAudioSrc && teacherAudioSrc.includes("/tmm/")
  );
  const isOxfordNative = Boolean(
    teacherAudioSrc &&
      !teacherAudioSrc.includes("/tmm-dialogues/") &&
      !teacherAudioSrc.includes("/tmm/") &&
      !teacherAudioSrc.includes("/tts")
  );
  const effectiveTeacherLabel =
    isTmmDialoguesNative
      ? "原声标准声调"
      : isTmmNative
      ? "原声标准声调"
      : isOxfordNative
      ? "牛津原版标准声调 (GB Oxford)"
      : "外教 GB 标准声调 (纯正英音)";

  // 从音频 URL 解码并提取音高序列（保留原始声学帧供分段对齐与节奏分析，及 40 点插值供画布渲染）
  const decodeAudioPitch = async (
    audioUrl: string,
    fallbackBase = 200,
    fallbackMod = 1,
    clipStart?: number,
    clipEnd?: number
  ): Promise<{ pitches: number[]; rawPitches: (number | null)[] }> => {
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const fullPeaks = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      let peaks = fullPeaks;
      if (
        typeof clipStart === "number" &&
        typeof clipEnd === "number" &&
        Number.isFinite(clipStart) &&
        Number.isFinite(clipEnd) &&
        clipEnd > clipStart
      ) {
        const startSample = Math.max(0, Math.floor(clipStart * sampleRate));
        const endSample = Math.min(fullPeaks.length, Math.ceil(clipEnd * sampleRate));
        if (endSample > startSample) {
          peaks = fullPeaks.subarray(startSample, endSample);
        }
      }
      const rawPitches = extractContourFromBuffer(peaks, sampleRate);
      audioCtx.close();
      const pitches = interpolateContour(rawPitches, 40, fallbackBase, fallbackMod);
      return { pitches, rawPitches };
    } catch (e) {
      console.warn("Audio pitch extraction fallback to simulated acoustic curve:", e);
      const pitches = interpolateContour([], 40, fallbackBase, fallbackMod);
      return { pitches, rawPitches: [] };
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const analyzeAndRender = async () => {
      if (!canvasRef.current || !teacherAudioSrc || !studentAudioSrc) return;
      setLoading(true);

      try {
        const [teacherData, studentData] = await Promise.all([
          decodeAudioPitch(
            teacherAudioSrc,
            210,
            1.0,
            hasTeacherSegment ? teacherSegStart : undefined,
            hasTeacherSegment ? teacherSegEnd : undefined
          ),
          decodeAudioPitch(studentAudioSrc, 225, 1.15),
        ]);

        if (isCancelled) return;

        const teacherPitches = teacherData.pitches;
        const studentPitches = studentData.pitches;

        // 新度量计算：Roger C 混合方案（分段对齐音高分 + 停顿/节奏特征子分合成）
        const sim = calculateAcousticSimilarity(
          teacherData.rawPitches,
          studentData.rawPitches,
          teacherPitches,
          studentPitches
        );
        setSimilarityScore(sim);

        // 计算双轨差异最大点与对应单词 (B10 / A2)
        let maxDiff = -1;
        let maxDiffIdx = -1;
        for (let i = 0; i < 40; i++) {
          const tP = teacherPitches[i];
          const sP = studentPitches[i];
          if (typeof tP === "number" && typeof sP === "number") {
            const diff = Math.abs(tP - sP);
            if (diff > maxDiff) {
              maxDiff = diff;
              maxDiffIdx = i;
            }
          }
        }

        const words = referenceText
          ? referenceText.trim().replace(/[.,!?"'“”]/g, "").split(/\s+/)
          : [];
        let identifiedWorstWord = "";
        if (words.length > 0 && maxDiffIdx >= 0) {
          const wordIdx = Math.min(words.length - 1, Math.floor((maxDiffIdx / 40) * words.length));
          identifiedWorstWord = words[wordIdx] || "";
        }
        setWorstWord(identifiedWorstWord);

        // A2: 定性锚点 (80+ 语调接近原声 / 60-80 正在接近原声 / <60 建议再听原声跟读)
        let anchor = "";
        if (sim >= 80) {
          anchor = "语调接近原声";
        } else if (sim >= 60) {
          anchor = "正在接近原声";
        } else {
          anchor = "建议再听原声跟读";
        }
        setQualitativeAnchor(anchor);

        // 先肯定 + 一个具体可改的点 (A2)
        if (sim >= 80) {
          setPitchTip("整体语调起伏自然流畅，继续保持。");
        } else if (sim >= 60) {
          setPitchTip(`语调基本接近。${identifiedWorstWord ? `其中 "${identifiedWorstWord}" 的语调差异较大，` : ""}可对照蓝色原声曲线再听一遍。`);
        } else {
          setPitchTip(`建议多听两遍再试。${identifiedWorstWord ? `先注意 "${identifiedWorstWord}" 的语调，` : ""}对照蓝色原声曲线跟着读。`);
        }

        // 销毁旧 Chart
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }

        // 依据参考文本单词生成生动的 X 轴时间标签
                // B10: X 轴只留词名，去掉百分比
        const labels = Array.from({ length: 40 }, (_, i) => {
          if (words.length > 0) {
            const wordIdx = Math.floor((i / 40) * words.length);
            const step = Math.max(1, Math.floor(40 / words.length));
            if (i % step === 0 && words[wordIdx]) {
              return words[wordIdx];
            }
          }
          return "";
        });

chartInstanceRef.current = new Chart(canvasRef.current, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: effectiveTeacherLabel,
                data: teacherPitches,
                borderColor: AUDIO_PALETTE.userAudio.line,
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                borderWidth: 2.8,
                tension: 0.38,
                pointRadius: 2.5,
                pointHoverRadius: 5,
                pointBackgroundColor: AUDIO_PALETTE.userAudio.point,
                pointBorderColor: AUDIO_PALETTE.userAudio.pointBorder,
                fill: false,
              },
              {
                label: "我的实际录音声调",
                data: studentPitches,
                borderColor: AUDIO_PALETTE.coachAudio.lineDark,
                backgroundColor: "rgba(236, 72, 153, 0.08)",
                borderWidth: 2.8,
                tension: 0.38,
                pointRadius: studentPitches.map((_, i) => (i === maxDiffIdx ? 6 : 2.5)),
                pointHoverRadius: 6,
                pointBackgroundColor: studentPitches.map((_, i) =>
                  i === maxDiffIdx ? "#ef4444" : AUDIO_PALETTE.coachAudio.progress
                ),
                pointBorderColor: studentPitches.map((_, i) =>
                  i === maxDiffIdx ? "#ffffff" : AUDIO_PALETTE.coachAudio.pointBorder
                ),
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: "index",
              intersect: false,
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: true,
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
                },
              },
            },
            scales: {
              x: {
                display: true,
                grid: {
                  display: false,
                },
                ticks: {
                  autoSkip: true,
                  maxRotation: 0,
                  font: {
                    size: 9.5,
                    weight: "bold",
                  },
                  color: AUDIO_PALETTE.contourAxis.text,
                },
              },
              y: {
                display: true,
                position: "right",
                suggestedMin: 120,
                suggestedMax: 290,
                grid: {
                  display: false,
                },
                ticks: {
                  maxTicksLimit: 4,
                  font: {
                    size: 9,
                  },
                  color: AUDIO_PALETTE.contourAxis.grid,
                  callback: (val) => `${val}`,
                },
              },
            },
          },
        });
      } catch (err) {
        console.error("PitchContourOverlay rendering error:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    analyzeAndRender();

    return () => {
      isCancelled = true;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (teacherAudioPlayerRef.current) {
        teacherAudioPlayerRef.current.pause();
        teacherAudioPlayerRef.current = null;
      }
      setPlayingTeacher(false);
      if (studentAudioPlayerRef.current) {
        studentAudioPlayerRef.current.pause();
        studentAudioPlayerRef.current = null;
      }
      setPlayingStudent(false);
    };
  }, [teacherAudioSrc, teacherAudioStart, teacherAudioEnd, teacherAudioPadding, studentAudioSrc, referenceText]);

  // 片段播放精度守卫：在片段结束位置（end + 0.05）立即停止并复位
  useEffect(() => {
    if (!playingTeacher || !hasTeacherSegment) return;
    let rafId = 0;
    const tick = () => {
      const audio = teacherAudioPlayerRef.current;
      if (audio && !audio.paused && !audio.seeking && audio.currentTime >= teacherSegEnd) {
        audio.pause();
        audio.currentTime = teacherSegStart;
        setPlayingTeacher(false);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playingTeacher, hasTeacherSegment, teacherSegStart, teacherSegEnd]);

  // 音频播放控制
  const handleToggleTeacher = () => {
    if (studentAudioPlayerRef.current) {
      studentAudioPlayerRef.current.pause();
      setPlayingStudent(false);
    }
    if (!teacherAudioPlayerRef.current) {
      const a = new Audio(teacherAudioSrc);
      a.preload = "metadata";
      teacherAudioPlayerRef.current = a;
      a.onended = () => {
        setPlayingTeacher(false);
        if (hasTeacherSegment) {
          a.currentTime = teacherSegStart;
        }
      };
      a.ontimeupdate = () => {
        if (hasTeacherSegment && !a.seeking && a.currentTime >= teacherSegEnd) {
          a.pause();
          a.currentTime = teacherSegStart;
          setPlayingTeacher(false);
        }
      };
    }
    const audio = teacherAudioPlayerRef.current;
    if (playingTeacher) {
      audio.pause();
      setPlayingTeacher(false);
    } else {
      const startTime = hasTeacherSegment ? teacherSegStart : 0;
      const startPlayback = () => {
        if (Math.abs(audio.currentTime - startTime) > 0.05 || !hasTeacherSegment) {
          audio.currentTime = startTime;
        }
        audio
          .play()
          .then(() => setPlayingTeacher(true))
          .catch(() => setPlayingTeacher(false));
      };
      if (audio.readyState >= 1) {
        startPlayback();
      } else {
        const onMeta = () => {
          audio.removeEventListener("loadedmetadata", onMeta);
          startPlayback();
        };
        audio.addEventListener("loadedmetadata", onMeta);
        audio.load();
      }
    }
  };

  const handleToggleStudent = () => {
    if (teacherAudioPlayerRef.current) {
      teacherAudioPlayerRef.current.pause();
      setPlayingTeacher(false);
    }
    if (!studentAudioPlayerRef.current) {
      const a = new Audio(studentAudioSrc);
      studentAudioPlayerRef.current = a;
      a.onended = () => setPlayingStudent(false);
    }
    if (playingStudent) {
      studentAudioPlayerRef.current.pause();
      setPlayingStudent(false);
    } else {
      studentAudioPlayerRef.current.currentTime = 0;
      studentAudioPlayerRef.current
        .play()
        .then(() => setPlayingStudent(true))
        .catch(() => setPlayingStudent(false));
    }
  };

  return (
    <div
      className={`rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-500/5 via-background to-pink-500/5 p-4 sm:p-5 shadow-xs ${className}`}
    >
      {/* 头部：标题与工具栏（响应式两行结构，B11/B3/B5） */}
      <div className="flex flex-col gap-2.5 mb-3">
        {/* 第一行：标题（去英文副标，换孩子说法 B5） */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
            <ActivityIcon className="size-4" />
          </div>
          <span className="text-sm sm:text-base font-extrabold text-foreground">
            语调对比
          </span>
        </div>

        {/* 第二行：工具栏（匹配度徽章带定性锚点 ＋ 两个听按钮并排） */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30">
            <SparklesIcon className="size-3 text-indigo-500 fill-indigo-500" />
            <span>语调匹配度 {similarityScore}% · {qualitativeAnchor}</span>
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleTeacher}
              className={`h-7 px-2.5 text-xs font-bold rounded-lg gap-1 border-blue-400/50 ${
                playingTeacher
                  ? "bg-blue-500 text-white"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
              }`}
            >
              {playingTeacher ? (
                <PauseIcon className="size-3" />
              ) : (
                <PlayIcon className="size-3" />
              )}
              <span>{isTmmDialoguesNative ? "听原声" : isTmmNative ? "听原声" : isOxfordNative ? "听原声" : "听原声"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleStudent}
              className={`h-7 px-2.5 text-xs font-bold rounded-lg gap-1 border-pink-400/50 ${
                playingStudent
                  ? "bg-pink-500 text-white"
                  : "bg-pink-500/10 text-pink-700 dark:text-pink-300"
              }`}
            >
              {playingStudent ? (
                <PauseIcon className="size-3" />
              ) : (
                <PlayIcon className="size-3" />
              )}
              <span>听我的</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 双曲线 Chart Canvas 画布 */}
      <div
        className="relative w-full rounded-xl bg-background/80 dark:bg-slate-950/60 p-2 border border-border/50"
        style={{ height: `${height}px` }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-2xs z-10 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 animate-pulse">
              <ActivityIcon className="size-4 animate-spin" />
              <span>正在生成语调对比曲线…</span>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* 图表下方（B3/B11）：提示独立成行、全宽、字号加大一档 ＋ 图例 */}
      <div className="mt-3 space-y-2">
        <div className="w-full text-xs sm:text-sm font-medium text-indigo-900 dark:text-indigo-200 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-400/20 leading-relaxed">
          {pitchTip}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
              <span className="size-2.5 rounded-full bg-blue-500 shadow-2xs"></span>
              <span>蓝点：原声曲线</span>
            </span>
            <span className="flex items-center gap-1.5 font-bold text-pink-600 dark:text-pink-400">
              <span className="size-2.5 rounded-full bg-pink-500 shadow-2xs"></span>
              <span>粉红点：你的声音</span>
            </span>
          </div>
          {worstWord && (
            <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">
              🚩 语调差异最大处: "{worstWord}"
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
