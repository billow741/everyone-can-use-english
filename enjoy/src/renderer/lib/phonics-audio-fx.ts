// 阳光桥少儿英语 · 自然拼读通关岛专属 Web Audio 音效合成器
// 无需外部音频文件加载，低延迟、高响应、专为儿童游戏化互动设计

class PhonicsAudioFx {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // 1. 积木点按轻脆泡泡音 (Pop)
  playPop() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  // 2. 录音星级奖励欢呼音效 (Success Fanfare)
  playSuccessChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.36);
      });
    } catch {}
  }

  // 3. 通关金印章盖印音效 (Stamp Thud & Sparkle)
  playStampSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      // 重音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);

      // 闪烁金光高音
      setTimeout(() => {
        this.playSuccessChime();
      }, 80);
    } catch {}
  }

  // 4. 敢敢吃食物咀嚼音 (Munch / Nom Nom)
  playMunch() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      [0, 0.1, 0.2].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const baseFreq = idx % 2 === 0 ? 320 : 440;
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime + offset);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + offset + 0.08);

        gain.gain.setValueAtTime(0.28, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.08);
      });
    } catch {}
  }

  // 5. 趣味弹簧回弹音 (Boing)
  playBoing() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  // 6. 声能气球爆炸破裂音 (Balloon Pop)
  playBalloonPop() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      // 噪音爆破 + 下冲
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start();
      whiteNoise.stop(ctx.currentTime + 0.05);

      setTimeout(() => this.playPop(), 40);
    } catch {}
  }
}

export const phonicsAudioFx = new PhonicsAudioFx();

// 敢敢中文伴学语音口播：首选微软 TTS 中文女声 Xiaoxiao（走后端 /api/ai/tts Edge TTS，免 Azure Key），
// 失败时回落浏览器朗读（优先挑中文女声，音调 1.0 不捏尖）
let currentGanganAudio: HTMLAudioElement | null = null;

export const stopGanganPrompt = () => {
  try {
    if (currentGanganAudio) {
      currentGanganAudio.pause();
      currentGanganAudio.currentTime = 0;
      currentGanganAudio = null;
    }
  } catch {}
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}
};

export const speakGanganPrompt = (
  text: string,
  options?: { onEnd?: () => void; rate?: number; pitch?: number }
) => {
  if (typeof window === "undefined") {
    options?.onEnd?.();
    return;
  }
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      options?.onEnd?.();
    }
  };
  const fallbackBrowserSpeak = () => {
    if (!("speechSynthesis" in window)) {
      finish();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      const voices = window.speechSynthesis.getVoices();
      const zhVoices = voices.filter((v) =>
        v.lang.toLowerCase().startsWith("zh")
      );
      const preferred =
        zhVoices.find((v) => /xiaoxiao|yunjian|女/.test(v.name)) ||
        zhVoices[0];
      if (preferred) utterance.voice = preferred;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.rate = options?.rate ?? 0.95;
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    } catch {
      finish();
    }
  };
  try {
    stopGanganPrompt();
    const url = `/api/ai/tts?text=${encodeURIComponent(text)}&voice=zh-CN-XiaoxiaoNeural&rate=-5%`;
    const audio = new Audio(url);
    currentGanganAudio = audio;
    audio.onended = () => {
      if (currentGanganAudio === audio) currentGanganAudio = null;
      finish();
    };
    audio.onerror = () => {
      if (currentGanganAudio === audio) currentGanganAudio = null;
      fallbackBrowserSpeak();
    };
    audio.play().catch(() => {
      if (currentGanganAudio === audio) currentGanganAudio = null;
      fallbackBrowserSpeak();
    });
  } catch {
    fallbackBrowserSpeak();
  }
};
