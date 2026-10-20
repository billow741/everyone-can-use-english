// 阳光桥少儿英语 · m/moon 样板关专属 Web Audio 拟真游戏音效引擎
// 零外部资源依赖，毫秒级即时发声：打喷嚏、磁吸咔嗒、蒸汽火车鸣笛、催眠呼噜、贴纸翻页

class MoonAudioEngine {
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

  // 1. 月亮搞笑打喷嚏 (Achoo! 喜剧弹开)
  playSneeze() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 喷嚏吸气 (Ah~)
      const inOsc = ctx.createOscillator();
      const inGain = ctx.createGain();
      inOsc.type = "sine";
      inOsc.frequency.setValueAtTime(320, t);
      inOsc.frequency.exponentialRampToValueAtTime(580, t + 0.18);
      inGain.gain.setValueAtTime(0.01, t);
      inGain.gain.linearRampToValueAtTime(0.2, t + 0.15);
      inGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      inOsc.connect(inGain);
      inGain.connect(ctx.destination);
      inOsc.start(t);
      inOsc.stop(t + 0.2);

      // 喷嚏爆发 (Choo! 带高频气流)
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, t + 0.2);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.4);
      filter.Q.setValueAtTime(2, t + 0.2);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, t + 0.2);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t + 0.2);
      noise.stop(t + 0.42);
    } catch {}
  }

  // 2. 磁力积木轨道咔嗒吸附音 (Magnetic Snap Clack)
  playMagneticSnap() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 短促的高音吸附敲击 (800Hz -> 1800Hz 冲击)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);

      // 伴随微小清脆泛音
      const highOsc = ctx.createOscillator();
      const highGain = ctx.createGain();
      highOsc.type = "triangle";
      highOsc.frequency.setValueAtTime(2400, t);
      highGain.gain.setValueAtTime(0.15, t);
      highGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      highOsc.connect(highGain);
      highGain.connect(ctx.destination);
      highOsc.start(t);
      highOsc.stop(t + 0.04);
    } catch {}
  }

  // 3. 蒸汽小火车鸣笛 (Choo-Choo 双音汽笛)
  playTrainWhistle() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 经典双音汽笛 (440Hz A4 + 554Hz C#5)
      const freqs = [440, 554.37];
      [0, 0.22].forEach((offset) => {
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(f, t + offset);

          // 气鸣滤波
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(900, t + offset);

          gain.gain.setValueAtTime(0, t + offset);
          gain.gain.linearRampToValueAtTime(0.15, t + offset + 0.03);
          gain.gain.setValueAtTime(0.15, t + offset + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.19);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.2);
        });
      });
    } catch {}
  }

  // 4. 贴纸撕下并粘贴音效 (Paper Peel & Thud)
  playStickerPaste() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 纸张飞入嗖声
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(750, t + 0.12);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);

      // 啪嗒盖印重音
      setTimeout(() => {
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.type = "sine";
        thud.frequency.setValueAtTime(140, ctx.currentTime);
        thud.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.15);
        thudGain.gain.setValueAtTime(0.35, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        thud.connect(thudGain);
        thudGain.connect(ctx.destination);
        thud.start();
        thud.stop(ctx.currentTime + 0.15);
      }, 100);
    } catch {}
  }

  // 5. 月亮满足饱嗝 (Burp)
  playMoonBurp() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.linearRampToValueAtTime(160, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch {}
  }
}

export const moonAudioEngine = new MoonAudioEngine();
