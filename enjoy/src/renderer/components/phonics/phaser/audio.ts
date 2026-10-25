import { moonAudioEngine } from "../golden-master/moon-audio-engine";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { playPhonemeSound, hasPhonemeAudio } from "@renderer/lib/phoneme-data";

// WebAudio 辅助合成层（复用 pilot 算法，与现有 moonAudioEngine 协同）
class PhaserAudioBridge {
  private ctx: AudioContext | null = null;

  ensure() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {}
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  private tone(
    freqA: number,
    freqB: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    delay = 0
  ) {
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqA, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freqB), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq: number, delay = 0) {
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t0);
  }

  // --- 教学音频（严禁合成音冒充，走标准 TTS） ---
  playLetter(letter: string) {
    try {
      if (hasPhonemeAudio(letter)) {
        playPhonemeSound(letter).catch(() => {
          try {
            playStandardTts(letter);
          } catch {}
        });
      } else {
        playStandardTts(letter);
      }
    } catch {
      try {
        playStandardTts(letter);
      } catch {}
    }
  }

  playWord(word: string, onEnd?: () => void) {
    try {
      playStandardTts(word, { onEnd });
    } catch {
      onEnd?.();
    }
  }

  // --- 游戏内物理与反馈音效（复用 moonAudioEngine） ---
  pop() {
    this.tone(480, 920, 0.08, "square", 0.05);
  }

  thunk() {
    moonAudioEngine.playMagneticSnap();
    this.tone(150, 55, 0.14, "sine", 0.22);
    this.noise(0.08, 0.1, 300);
  }

  bad() {
    moonAudioEngine.playSneeze();
    this.tone(170, 120, 0.16, "sawtooth", 0.05);
  }

  chug() {
    this.noise(0.09, 0.16, 420);
  }

  nom() {
    moonAudioEngine.playMoonBurp();
    this.tone(320, 180, 0.09, "sine", 0.16);
    this.tone(400, 230, 0.09, "sine", 0.14, 0.08);
    this.tone(1250, 1650, 0.12, "sine", 0.05, 0.16);
  }

  jingle() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, f, 0.22, "sine", 0.1, i * 0.09)
    );
  }

  lullaby() {
    [659, 784, 988, 1319, 988, 784, 659].forEach((f, i) =>
      this.tone(f, f * 0.995, 0.5, "triangle", 0.06, i * 0.23)
    );
    this.tone(262, 262, 1.8, "sine", 0.03, 0);
  }

  whistle() {
    moonAudioEngine.playTrainWhistle();
  }
}

export const audioBridge = new PhaserAudioBridge();
