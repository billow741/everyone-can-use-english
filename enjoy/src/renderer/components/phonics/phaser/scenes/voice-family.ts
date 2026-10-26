/**
 * voice-family.ts
 *
 * 声音特征与发声方式家族校验模块 (Acoustic Feature & Voice Family Validation)
 *
 * 【诚实边界 (Honest Boundary)】
 * 1. 本模块基于 WebAudio 频谱（AnalyserNode fftSize 512, bins 2..60）与短时能量动力学进行
 *    “发声方式家族（Voice Family）粗筛”，不属于也不应宣称为“发音评测”或“逐音素打分”。
 * 2. 分得清发声方式家族（持续型、短促型、哼鸣型、元音拉长型、流音型）；
 *    分不清 m/n 双胞胎——m 和 n 同属“哼鸣型”，声学特征高度同构（低频鼻音共鸣），任一通过另一的家族门均属正常且合规。
 * 3. 任何代码注释、文档与宣传口径严禁宣称“能区分 m 和 n”、“逐音素打分”或“发音评测”。
 */

export type VoiceFamily =
  | "humming"      // 哼鸣型 (m, n, ng) - 持续浊音低频主导
  | "continuous"   // 持续型/嘶音类 (s, f, sh, th, v, z, h) - 高频噪声主导
  | "plosive"      // 短促型/爆破类 (p, t, k, b, d, g, ch, j) - 短促能量峰后衰减
  | "vowel_long"   // 元音拉长型 (a, e, i, o, u, oo, ee, ar, or, er 等) - 持续浊音中频能量
  | "liquid";      // 流音型 (l, r, w, y) - 持续浊音带滑动

export interface VoiceAnalysisResult {
  avgVolume: number;              // bins 2..60 平均音量 (0~255)
  normalizedVolume: number;        // 归一化音量 (0~100)
  isVolumeAboveThreshold: boolean; // avgVolume > 10（2026-10-26 轻哼友好下调）
  detectedFamily: VoiceFamily | null; // 检出的家族（音量不足时为 null）
  gateOpen: boolean;              // 门是否打开 (isVolumeAboveThreshold && detectedFamily === targetFamily)
  lowAvg: number;                 // 低频区 (bins 2..8) 平均能量
  midAvg: number;                 // 中频区 (bins 9..24) 平均能量
  highAvg: number;                // 高频区 (bins 25..59) 平均能量
  spectralCentroid: number;       // 频谱质心 (bin 索引加权)
}

// 音素到发声家族的映射表 (phoneme -> voice family)
export const PHONEME_TO_FAMILY: Record<string, VoiceFamily> = {
  // 哼鸣型 (humming)
  m: "humming",
  n: "humming",
  ng: "humming",

  // 持续型 / 嘶音类 (continuous)
  s: "continuous",
  f: "continuous",
  sh: "continuous",
  th: "continuous",
  v: "continuous",
  z: "continuous",
  h: "continuous",

  // 短促型 / 爆破类 (plosive)
  p: "plosive",
  t: "plosive",
  k: "plosive",
  b: "plosive",
  d: "plosive",
  g: "plosive",
  ch: "plosive",
  j: "plosive",

  // 流音型 (liquid)
  l: "liquid",
  r: "liquid",
  w: "liquid",
  y: "liquid",

  // 元音拉长型 (vowel_long)
  a: "vowel_long",
  e: "vowel_long",
  i: "vowel_long",
  o: "vowel_long",
  u: "vowel_long",
  oo: "vowel_long",
  ee: "vowel_long",
  ea: "vowel_long",
  ai: "vowel_long",
  ay: "vowel_long",
  oa: "vowel_long",
  oe: "vowel_long",
  ou: "vowel_long",
  ow: "vowel_long",
  oi: "vowel_long",
  oy: "vowel_long",
  ar: "vowel_long",
  or: "vowel_long",
  er: "vowel_long",
  ir: "vowel_long",
  ur: "vowel_long",
};

/**
 * 将音素标识符与可选的配置 manner 映射到归属的 VoiceFamily
 */
export function getPhonemeFamily(phoneme: string, fallbackManner?: string): VoiceFamily {
  const clean = phoneme.toLowerCase().replace(/[^a-z]/g, "");
  if (PHONEME_TO_FAMILY[clean]) {
    return PHONEME_TO_FAMILY[clean];
  }
  if (
    fallbackManner === "humming" ||
    fallbackManner === "continuous" ||
    fallbackManner === "plosive" ||
    fallbackManner === "vowel_long" ||
    fallbackManner === "liquid"
  ) {
    return fallbackManner;
  }
  return "humming";
}

/**
 * 实时频谱特征与家族分析器 (WebAudio 频域与时域特征提取)
 */
export class VoiceFamilyAnalyzer {
  private history: Array<{ volume: number; centroid: number; time: number }> = [];
  private sustainCount = 0;

  public reset() {
    this.history = [];
    this.sustainCount = 0;
  }

  /**
   * 分析一帧频谱数据 (AnalyserNode fftSize 512, 对应 256 个频点)
   * @param dataArray 字节频域数据
   * @param targetFamily 当前关卡目标家族
   * @param now 当前时间 (ms)
   */
  public analyze(
    dataArray: Uint8Array,
    targetFamily: VoiceFamily,
    now = performance.now()
  ): VoiceAnalysisResult {
    // 1. 麦克风音量门槛：沿用 golden-master 算法，取 bins 2..60 的平均值
    let sum = 0;
    const sampleCount = Math.min(dataArray.length, 60);
    for (let i = 2; i < sampleCount; i++) {
      sum += dataArray[i];
    }
    const binCount = Math.max(1, sampleCount - 2);
    const avgVolume = sum / binCount;
    const normalizedVolume = Math.min(100, Math.round((avgVolume / 140) * 100));
    // 门槛 2026-10-26 由 16 下调到 10：闭唇鼻音 m 天生轻，手机正常距离哼常在 16 上下晃导致门反复开关；
    // 环境静音约 0-5，仍远低于门槛，静音按住依然 0 进度。
    const isVolumeAboveThreshold = avgVolume > 10;

    // 2. 频段能量拆分
    // 低频区 (bins 2..8): ~170Hz - 750Hz (浊音基频、鼻音共鸣)
    let lowSum = 0;
    for (let i = 2; i <= 8 && i < sampleCount; i++) {
      lowSum += dataArray[i];
    }
    const lowAvg = lowSum / 7;

    // 中频区 (bins 9..24): ~770Hz - 2250Hz (元音共振峰 F1/F2、流音能量)
    let midSum = 0;
    for (let i = 9; i <= 24 && i < sampleCount; i++) {
      midSum += dataArray[i];
    }
    const midAvg = midSum / 16;

    // 高频区 (bins 25..59): ~2340Hz - 5600Hz (嘶音湍流高频噪声)
    let highSum = 0;
    const highEnd = Math.min(sampleCount - 1, 59);
    const highBins = Math.max(1, highEnd - 25 + 1);
    for (let i = 25; i <= highEnd; i++) {
      highSum += dataArray[i];
    }
    const highAvg = highSum / highBins;

    // 频谱质心 (Spectral Centroid)
    let weightedSum = 0;
    let totalMag = 0;
    for (let i = 2; i < sampleCount; i++) {
      weightedSum += i * dataArray[i];
      totalMag += dataArray[i];
    }
    const spectralCentroid = totalMag > 0 ? weightedSum / totalMag : 0;

    // 更新滑动时间窗口 (保留最近 500ms 记录用于时域动态特征)
    this.history.push({ volume: avgVolume, centroid: spectralCentroid, time: now });
    while (this.history.length > 0 && now - this.history[0].time > 500) {
      this.history.shift();
    }

    if (isVolumeAboveThreshold) {
      this.sustainCount++;
    } else {
      this.sustainCount = 0;
    }

    // 3. 家族分类 (粗分)
    let detectedFamily: VoiceFamily | null = null;

    if (isVolumeAboveThreshold) {
      const oldestVol = this.history[0]?.volume || 0;
      const onsetJump = avgVolume - oldestVol;

      // 短促爆破特征：能量瞬时跃升，持续时长短 (< 400ms，约 25 帧)
      const isBurstOnset = onsetJump > 14 && this.sustainCount < 25;

      // 嘶音类特征：高频能量主导，高质心
      const isContinuousHigh =
        highAvg > 14 &&
        (highAvg > lowAvg * 0.75 || spectralCentroid >= 22 || highAvg > midAvg * 1.05);

      // 哼鸣类特征：低频主导，高频极低，低质心
      const isHummingLow =
        lowAvg > midAvg * 1.15 &&
        lowAvg > highAvg * 1.5 &&
        spectralCentroid < 14 &&
        highAvg < 30;

      // 元音拉长类特征：中频能量饱满，持续浊音
      const isVowelMid =
        midAvg > 15 &&
        lowAvg > 12 &&
        midAvg > highAvg * 0.9 &&
        spectralCentroid >= 9 &&
        spectralCentroid <= 24;

      // 流音类特征：低中频带平滑滑动或过渡
      let centroidVariance = 0;
      if (this.history.length >= 4) {
        let sumC = 0;
        for (const h of this.history) sumC += h.centroid;
        const meanC = sumC / this.history.length;
        let sumDiffSq = 0;
        for (const h of this.history) sumDiffSq += (h.centroid - meanC) ** 2;
        centroidVariance = sumDiffSq / this.history.length;
      }
      const isLiquidGlide =
        lowAvg > 12 &&
        midAvg > 10 &&
        spectralCentroid >= 8 &&
        spectralCentroid <= 18 &&
        centroidVariance > 1.2;

      // 哼鸣容错（2026-10-26）：真人哼鸣常带中频共鸣峰与气息噪声，低频不必绝对主导；
      // 只要低频能量扎实（>=20）且不被中频强压（mid <= low*1.3）、质心不太高，即算哼鸣；
      // 元音喊叫（中频强压低频，如 mid > low*1.3）仍走原分类判元音，不会混过。
      const isHummingTolerant =
        lowAvg >= 20 &&
        lowAvg >= midAvg * 0.77 &&
        lowAvg > highAvg &&
        spectralCentroid < 18;

      // 综合分类判决
      if (targetFamily === "humming" && isHummingTolerant) {
        detectedFamily = "humming";
      } else if (targetFamily === "plosive" && isBurstOnset) {
        detectedFamily = "plosive";
      } else if (isContinuousHigh) {
        detectedFamily = "continuous";
      } else if (isHummingLow) {
        detectedFamily = "humming";
      } else if (isLiquidGlide && targetFamily === "liquid") {
        detectedFamily = "liquid";
      } else if (isVowelMid) {
        detectedFamily = "vowel_long";
      } else {
        // 兜底能量偏向
        if (highAvg > lowAvg && highAvg > midAvg) {
          detectedFamily = "continuous";
        } else if (lowAvg > midAvg && lowAvg > highAvg) {
          detectedFamily = "humming";
        } else {
          detectedFamily = "vowel_long";
        }
      }
    }

    const gateOpen = isVolumeAboveThreshold && detectedFamily === targetFamily;

    return {
      avgVolume,
      normalizedVolume,
      isVolumeAboveThreshold,
      detectedFamily,
      gateOpen,
      lowAvg,
      midAvg,
      highAvg,
      spectralCentroid,
    };
  }
}
