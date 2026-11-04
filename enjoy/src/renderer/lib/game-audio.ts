// 阳光桥少儿英语 · G1 试点区游戏音频系统 (WebAudio 合成 + BGM + 语音)
// 依据《接入工单 1》第 2 节配方实现，全链路支持静音与探针检测

import { getGameStoryState, saveGameStoryState } from "./game-story";

export type SfxName =
  | "tap"
  | "scan"
  | "lock-ok"
  | "lock-soft"
  | "snap"
  | "slide-tick"
  | "word-formed"
  | "place-lit"
  | "hush-recede"
  | "page-turn"
  | "stamp"
  | "badge-lit"
  | "panel-turn"
  | "echo-slot"
  | "campfire";

export type BgmMode = "title" | "camp";

export interface GameAudioProbe {
  ctxState: string;
  lastSfx: string | null;
  bgmMode: BgmMode | null;
  lastVoiceId: string | null;
  muted: boolean;
}

declare global {
  interface Window {
    __gameAudioProbe?: GameAudioProbe;
  }
}

// 探针全局初始化
const probeState: GameAudioProbe = {
  ctxState: "uninitialized",
  lastSfx: null,
  bgmMode: null,
  lastVoiceId: null,
  muted: false,
};

if (typeof window !== "undefined") {
  window.__gameAudioProbe = probeState;
}

function updateProbe(partial?: Partial<GameAudioProbe>): void {
  if (typeof window === "undefined") return;
  if (partial) {
    Object.assign(probeState, partial);
  }
  if (audioCtx) {
    probeState.ctxState = audioCtx.state;
  }
  window.__gameAudioProbe = { ...probeState };
}

// AudioContext 单例与状态
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

let isMutedState = false;

// 初始化静音状态
if (typeof window !== "undefined") {
  try {
    isMutedState = getGameStoryState().muted;
    probeState.muted = isMutedState;
    updateProbe();
  } catch {}
}

export function isMuted(): boolean {
  return isMutedState;
}

export function setMuted(muted: boolean): void {
  isMutedState = muted;
  probeState.muted = muted;
  try {
    saveGameStoryState({ muted });
  } catch {}

  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(muted ? 0 : 1, audioCtx.currentTime);
  }

  if (muted) {
    stopVoice();
    if (bgmModeCurrent) {
      pauseBgmGenerative();
    }
    stopCampfireSfx();
  } else {
    if (bgmModeCurrent) {
      resumeBgmGenerative(bgmModeCurrent);
    }
  }

  updateProbe({ muted });
}

export function toggleMuted(): boolean {
  setMuted(!isMutedState);
  return isMutedState;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMutedState ? 0 : 1, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.setValueAtTime(1, audioCtx.currentTime);
      sfxGain.connect(masterGain);

      bgmGain = audioCtx.createGain();
      bgmGain.gain.setValueAtTime(0.12, audioCtx.currentTime); // 默认音量 -18dB 量级
      bgmGain.connect(masterGain);
    }
  }

  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  updateProbe();
  return audioCtx;
}

// 首次手势监听解锁 AudioContext
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
}

// 噪声缓冲区生成
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const frameCount = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// -------------------------------------------------------------
// 营火环境音效状态 (循环型)
// -------------------------------------------------------------
let campfireSource: AudioBufferSourceNode | null = null;
let campfireGain: GainNode | null = null;
let campfireFilter: BiquadFilterNode | null = null;
let campfireCrackleInterval: ReturnType<typeof setInterval> | null = null;
let isCampfirePlaying = false;

export function startCampfireSfx(): void {
  if (isCampfirePlaying) return;
  const ctx = getAudioContext();
  if (!ctx || !sfxGain) return;

  isCampfirePlaying = true;
  updateProbe({ lastSfx: "campfire" });

  try {
    const noiseBuffer = createNoiseBuffer(ctx, 3.0);
    campfireSource = ctx.createBufferSource();
    campfireSource.buffer = noiseBuffer;
    campfireSource.loop = true;

    campfireFilter = ctx.createBiquadFilter();
    campfireFilter.type = "lowpass";
    campfireFilter.frequency.setValueAtTime(380, ctx.currentTime);

    campfireGain = ctx.createGain();
    campfireGain.gain.setValueAtTime(isMutedState ? 0 : 0.08, ctx.currentTime);

    campfireSource.connect(campfireFilter);
    campfireFilter.connect(campfireGain);
    campfireGain.connect(sfxGain);
    campfireSource.start();

    // 随机噼啪爆鸣
    campfireCrackleInterval = setInterval(() => {
      if (!isCampfirePlaying || isMutedState || !audioCtx || !sfxGain) return;
      try {
        const crackleBuffer = createNoiseBuffer(audioCtx, 0.02);
        const src = audioCtx.createBufferSource();
        src.buffer = crackleBuffer;
        const hp = audioCtx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.setValueAtTime(2500 + Math.random() * 2000, audioCtx.currentTime);
        const g = audioCtx.createGain();
        const crackleVol = 0.04 + Math.random() * 0.07;
        g.gain.setValueAtTime(crackleVol, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
        src.connect(hp);
        hp.connect(g);
        g.connect(sfxGain);
        src.start();
      } catch {}
    }, 220);
  } catch {}
}

export function stopCampfireSfx(): void {
  isCampfirePlaying = false;
  if (campfireCrackleInterval) {
    clearInterval(campfireCrackleInterval);
    campfireCrackleInterval = null;
  }
  if (campfireSource) {
    try {
      campfireSource.stop();
      campfireSource.disconnect();
    } catch {}
    campfireSource = null;
  }
}

// -------------------------------------------------------------
// 15 种 SFX 播放实现
// -------------------------------------------------------------
export function playSfx(name: SfxName): void {
  updateProbe({ lastSfx: name });

  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx || !sfxGain) return;

  const t = ctx.currentTime;

  try {
    switch (name) {
      case "tap": {
        // 660Hz 正弦单击 0.07s
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, t);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.07);
        break;
      }

      case "scan": {
        // 三角波 300→900 上扫 0.35s
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.35);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
        break;
      }

      case "lock-ok": {
        // E5(659.25Hz)→A5(880Hz) 双音 0.28s，低通 2kHz
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2000, t);
        filter.connect(sfxGain);

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, t);
        gain1.gain.setValueAtTime(0.26, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc1.connect(gain1);
        gain1.connect(filter);
        osc1.start(t);
        osc1.stop(t + 0.14);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, t + 0.14);
        gain2.gain.setValueAtTime(0.28, t + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc2.connect(gain2);
        gain2.connect(filter);
        osc2.start(t + 0.14);
        osc2.stop(t + 0.28);
        break;
      }

      case "lock-soft": {
        // A4(440Hz)→E4(329.63Hz) 下行 0.25s，-6dB (约 0.14 增益)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(329.63, t + 0.25);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.25);
        break;
      }

      case "snap": {
        // 噪声爆 + 180Hz 正弦 0.09s
        const noiseBuf = createNoiseBuffer(ctx, 0.05);
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        noiseSrc.connect(noiseGain);
        noiseGain.connect(sfxGain);
        noiseSrc.start(t);

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, t);
        oscGain.gain.setValueAtTime(0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(oscGain);
        oscGain.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.09);
        break;
      }

      case "slide-tick": {
        // 1kHz 滴答 0.04s
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1000, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.04);
        break;
      }

      case "word-formed": {
        // C5-E5-G5 琶音 0.45s (523.25 -> 659.25 -> 783.99)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t + i * 0.14);
          gain.gain.setValueAtTime(0.24, t + i * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.17);
          osc.connect(gain);
          gain.connect(sfxGain!);
          osc.start(t + i * 0.14);
          osc.stop(t + i * 0.14 + 0.17);
        });
        break;
      }

      case "place-lit": {
        // 大三和弦上扬 + 高音点缀 0.9s
        const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t + i * 0.11);
          gain.gain.setValueAtTime(0.22, t + i * 0.11);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
          osc.connect(gain);
          gain.connect(sfxGain!);
          osc.start(t + i * 0.11);
          osc.stop(t + 0.85);
        });

        // 高音晶亮闪烁
        const sparkle = ctx.createOscillator();
        const sGain = ctx.createGain();
        sparkle.type = "sine";
        sparkle.frequency.setValueAtTime(2093, t + 0.35); // C7
        sGain.gain.setValueAtTime(0.12, t + 0.35);
        sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        sparkle.connect(sGain);
        sGain.connect(sfxGain);
        sparkle.start(t + 0.35);
        sparkle.stop(t + 0.9);
        break;
      }

      case "hush-recede": {
        // 带通噪声 1200→300 下扫 0.8s
        const buf = createNoiseBuffer(ctx, 0.8);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(2.5, t);
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + 0.8);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        src.start(t);
        break;
      }

      case "page-turn": {
        // 高通噪声 0.2s
        const buf = createNoiseBuffer(ctx, 0.2);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(1600, t);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.24, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        src.start(t);
        break;
      }

      case "stamp": {
        // 120Hz 重击 0.15s
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.15);
        gain.gain.setValueAtTime(0.42, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }

      case "badge-lit": {
        // place-lit 加强 + 196Hz (G3) 钟声 1.2s
        // 钟声基频与泛音
        [196, 392, 588, 784].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t);
          const vol = 0.35 / (idx + 1);
          gain.gain.setValueAtTime(vol, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
          osc.connect(gain);
          gain.connect(sfxGain!);
          osc.start(t);
          osc.stop(t + 1.2);
        });

        // 伴随 place-lit 辉煌上扬
        const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, t + i * 0.1);
          gain.gain.setValueAtTime(0.2, t + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
          osc.connect(gain);
          gain.connect(sfxGain!);
          osc.start(t + i * 0.1);
          osc.stop(t + 1.1);
        });
        break;
      }

      case "panel-turn": {
        // page-turn 慢版 0.25s
        const buf = createNoiseBuffer(ctx, 0.25);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(1.8, t);
        filter.frequency.setValueAtTime(1400, t);
        filter.frequency.exponentialRampToValueAtTime(700, t + 0.25);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        src.start(t);
        break;
      }

      case "echo-slot": {
        // A4(440Hz) + 0.22s 后 -9dB 回声 0.6s
        // 主音
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, t);
        gain1.gain.setValueAtTime(0.28, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc1.connect(gain1);
        gain1.connect(sfxGain);
        osc1.start(t);
        osc1.stop(t + 0.2);

        // 回声 (约 -9dB, gain 0.10)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(440, t + 0.22);
        gain2.gain.setValueAtTime(0.1, t + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc2.connect(gain2);
        gain2.connect(sfxGain);
        osc2.start(t + 0.22);
        osc2.stop(t + 0.6);
        break;
      }

      case "campfire": {
        startCampfireSfx();
        break;
      }
    }
  } catch {}
}

// -------------------------------------------------------------
// BGM 系统：五声音阶生成式循环（固定种子可复现）
// -------------------------------------------------------------
let bgmModeCurrent: BgmMode | null = null;
let bgmInterval: ReturnType<typeof setInterval> | null = null;
let bgmCampFilter: BiquadFilterNode | null = null;

// 固定种子伪随机生成器 (Mulberry32)
function createSeededPrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 五声音阶 (C-D-E-G-A)
const PENTATONIC_SCALE = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.0,  // G4
  440.0,  // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
];

function playBgmNote(freq: number, duration: number, isCamp: boolean): void {
  if (isMutedState || !audioCtx || !bgmGain) return;
  const t = audioCtx.currentTime;

  try {
    const osc = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();

    osc.type = isCamp ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, t);

    noteGain.gain.setValueAtTime(0.001, t);
    noteGain.gain.linearRampToValueAtTime(0.08, t + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    if (isCamp) {
      if (!bgmCampFilter) {
        bgmCampFilter = audioCtx.createBiquadFilter();
        bgmCampFilter.type = "lowpass";
        bgmCampFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);
        bgmCampFilter.connect(bgmGain);
      }
      osc.connect(noteGain);
      noteGain.connect(bgmCampFilter);
    } else {
      osc.connect(noteGain);
      noteGain.connect(bgmGain);
    }

    osc.start(t);
    osc.stop(t + duration);
  } catch {}
}

function pauseBgmGenerative(): void {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

function resumeBgmGenerative(mode: BgmMode): void {
  pauseBgmGenerative();
  const ctx = getAudioContext();
  if (!ctx) return;

  const isCamp = mode === "camp";
  // title: 72BPM (每拍 0.833s，半拍 0.416s)
  // camp: 56BPM (每拍 1.071s，半拍 0.535s) 且低通 1.2kHz + 营火声
  const bpm = isCamp ? 56 : 72;
  const intervalMs = Math.round((60 / bpm) * 500); // 半拍触发
  const noteDuration = (60 / bpm) * 0.95;

  const rand = createSeededPrng(isCamp ? 42 : 108);

  let step = 0;
  bgmInterval = setInterval(() => {
    if (isMutedState || !bgmModeCurrent) return;
    step++;
    // 有节律地触发五声音阶音符
    if (step % 2 === 0 || rand() > 0.4) {
      const idx = Math.floor(rand() * PENTATONIC_SCALE.length);
      const noteFreq = PENTATONIC_SCALE[idx];
      playBgmNote(noteFreq, noteDuration, isCamp);
    }
  }, intervalMs);

  if (isCamp && !isMutedState) {
    startCampfireSfx();
  } else if (!isCamp) {
    stopCampfireSfx();
  }
}

export function startBgm(mode: BgmMode): void {
  if (bgmModeCurrent === mode && bgmInterval) return;

  bgmModeCurrent = mode;
  updateProbe({ bgmMode: mode });

  resumeBgmGenerative(mode);
}

export function stopBgm(): void {
  bgmModeCurrent = null;
  pauseBgmGenerative();
  stopCampfireSfx();
  if (bgmCampFilter) {
    try {
      bgmCampFilter.disconnect();
    } catch {}
    bgmCampFilter = null;
  }
  updateProbe({ bgmMode: null });
}

// -------------------------------------------------------------
// 语音播放系统（单 Audio 元素复用，新播打断旧播）
// -------------------------------------------------------------
let currentVoiceAudio: HTMLAudioElement | null = null;

export function playVoice(id: string): HTMLAudioElement | null {
  updateProbe({ lastVoiceId: id });

  if (typeof window === "undefined") return null;

  stopVoice();

  if (isMutedState) return null;

  try {
    const src = `/assets/game/voice/${id}.mp3`;
    const audio = new Audio(src);
    audio.volume = 1.0;
    currentVoiceAudio = audio;

    audio.onended = () => {
      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
    };
    audio.onerror = () => {
      if (currentVoiceAudio === audio) {
        currentVoiceAudio = null;
      }
    };

    audio.play().catch(() => {
      // 捕获浏览器自动播放限制
    });

    return audio;
  } catch {
    return null;
  }
}

export function stopVoice(): void {
  if (currentVoiceAudio) {
    try {
      currentVoiceAudio.pause();
      currentVoiceAudio.currentTime = 0;
    } catch {}
    currentVoiceAudio = null;
  }
}
