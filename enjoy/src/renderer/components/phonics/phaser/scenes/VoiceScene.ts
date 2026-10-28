import Phaser from "phaser";
import {
  W,
  H,
  CANDY_PALETTE,
  makeCommonTextures,
  buildSceneWorld,
  makeGanganWave,
  createInteractiveMoon,
  showCompletionPanel,
  createHud,
  createSatietyGauge,
  squashRebound,
  registerProbe,
  SceneWorld,
  GanganWaveApi,
  MoonController,
  SatietyGaugeApi,
} from "./shared";
import { audioBridge } from "../audio";
import { LevelConfig } from "../config";
import {
  VoiceFamily,
  VoiceFamilyAnalyzer,
  getPhonemeFamily,
} from "./voice-family";

interface BalloonSpec {
  durationMs: number;
  color: number;
  maxScale: number;
}

const BALLOON_SPECS: BalloonSpec[] = [
  { durationMs: 600, color: CANDY_PALETTE.coralPink, maxScale: 1.7 },
  { durationMs: 1200, color: CANDY_PALETTE.sunshineYellow, maxScale: 2.3 },
  { durationMs: 600, color: CANDY_PALETTE.lakeBlue, maxScale: 2.1 }, // 短短两次节奏型
];

export class VoiceScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private progress = 0;
  private charging = false;
  private asleep = false;
  private litCount = 0;
  private noteAcc = 0;

  // 气球膨胀模式专属状态 (s 关：持续型 x 驱动对象膨胀)
  private isBalloonMode = false;
  private currentBalloonIdx = 0;
  private balloonProgress = 0;
  private consecutiveQuietCount = 0;
  private isPopped = false;
  private balloonContainer?: Phaser.GameObjects.Container;
  private balloonBody?: Phaser.GameObjects.Image;
  private balloonRoundText?: Phaser.GameObjects.Text;
  private attemptMaxVolume = 0;
  private attemptAchievedGate = false;
  // 起音 latch 门（2026-10-27）：稳态环境噪声不得开门。
  // 按住期间记录最低音量；只有音量从按住期最低点爬升 >12 且家族匹配，门才打开；
  // 打开后靠音量维持（>10），音量掉回安静 300ms 以上自动落锁；松手必落锁。
  // 降级通道（无麦克风）保持原样，不动。
  private gateLatched = false;
  private pressMinVolume = 0;
  private quietSince = 0;
  private lastRhythmTapTime = 0;

  // 麦克风与声音家族校验核心状态 (WebAudio & Voice Family Validation)
  private micState: "granted" | "denied" | "unavailable" = "unavailable";
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private dataArray?: Uint8Array;
  private voiceAnalyzer = new VoiceFamilyAnalyzer();
  private targetFamily: VoiceFamily = "humming";
  private currentVolume = 0;
  private detectedFamily: VoiceFamily | null = null;
  private isGateOpen = false;
  private fallbackActive = false;
  private lastGentleHintTime = 0;
  private fallbackBtn?: Phaser.GameObjects.Text;

  private world!: SceneWorld;
  private moon!: MoonController;
  private gangan!: GanganWaveApi;
  private satietyGauge!: SatietyGaugeApi;
  private bubble!: Phaser.GameObjects.Container;
  private bubbleText!: Phaser.GameObjects.Text;
  private meterFill!: Phaser.GameObjects.Graphics;
  private sleepStars: Phaser.GameObjects.Image[] = [];
  private overlay!: Phaser.GameObjects.Rectangle;
  private btnBox!: Phaser.GameObjects.Container;
  private btnRing!: Phaser.GameObjects.Arc;
  private rockTween?: Phaser.Tweens.Tween;
  private onLevelFinished?: () => void;

  constructor() {
    super("lullaby");
  }

  init(data?: { levelConfig?: LevelConfig; onLevelFinished?: () => void }) {
    this.levelConfig = data?.levelConfig || this.game.registry.get("levelConfig");
    this.onLevelFinished = data?.onLevelFinished || this.game.registry.get("onLevelFinished");
  }

  preload() {
    const isSun = this.levelConfig?.levelId === "s" || this.levelConfig?.anchorWord === "sun";
    const texKey = isSun ? "anchor_sun" : "anchor_moon";
    const defaultImg = isSun
      ? "/assets/phonics/anchors/anchor-sun-transparent.png"
      : "/assets/phonics/anchors/anchor-moon-transparent.png";
    this.load.image(
      texKey,
      this.levelConfig?.anchor?.image ||
        this.levelConfig?.anchorImage ||
        defaultImg
    );
    this.load.image("gangan_wave_body", "/assets/gangan/gangan_wave_body.webp");
    this.load.image("gangan_wave_arm", "/assets/gangan/gangan_wave_arm.webp");
  }

  create() {
    const S = this;
    if (!S.textures.exists("dot")) makeCommonTextures(S);

    S.isBalloonMode =
      S.levelConfig?.voiceArchetype?.targetObject === "expand" ||
      S.levelConfig?.levelId === "s";

    S.progress = 0;
    S.charging = false;
    S.asleep = false;
    S.litCount = 0;
    S.noteAcc = 0;
    S.currentVolume = 0;
    S.detectedFamily = null;
    S.isGateOpen = false;
    S.fallbackActive = false;
    S.voiceAnalyzer.reset();

    S.currentBalloonIdx = 0;
    S.balloonProgress = 0;
    S.consecutiveQuietCount = 0;
    S.isPopped = false;
    S.attemptMaxVolume = 0;
    S.attemptAchievedGate = false;

    // 1. 搭建扁平风柔和渐变背景世界
    S.world = buildSceneWorld(S, 460, S.levelConfig?.levelId === "s" || S.levelConfig?.anchorWord === "sun" || S.levelConfig?.sceneFamily === "day");

    // 2. 遮罩层
    S.overlay = S.add
      .rectangle(0, 0, W, H, 0x151b3a, 0)
      .setOrigin(0, 0)
      .setDepth(5);

    // 3. 顶部 HUD 与 5 格饱腹度槽（接续第 1 幕的 3 格）
    const shadow = createHud(S, "", "");
    const currentSatiety = S.game.registry.get("satietyCount") || 3;
    S.satietyGauge = createSatietyGauge(S, 24, 52, currentSatiety);

    const letterStr = S.levelConfig?.phonemeId || S.levelConfig?.letter || (S.isBalloonMode ? "s" : "m");
    const manner = S.levelConfig?.voiceArchetype?.manner;
    S.targetFamily = getPhonemeFamily(letterStr, manner);

    // 4. 敢敢主持
    S.gangan = makeGanganWave(S, 134, 460, 94);
    S.gangan.box.setDepth(12);

    S.bubble = S.add.container(210, 330).setDepth(41).setAlpha(0);
    const bb = S.add
      .rectangle(0, 0, 180, 42, 0xffffff, 0.95)
      .setStrokeStyle(2, 0xfeca57);
    S.bubbleText = S.add
      .text(0, 0, S.isBalloonMode ? "吹气球，念 s！" : "别停哦，继续哼～", {
        fontSize: "15px",
        fontStyle: "bold",
        color: "#232c52",
      })
      .setOrigin(0.5);
    S.bubble.add([bb, S.bubbleText]);

    if (S.isBalloonMode) {
      // === 气球膨胀模式（s 关）===
      S.balloonRoundText = S.add
        .text(W / 2, 48, "气球 1 / 3", {
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
          shadow,
        })
        .setOrigin(0.5, 0)
        .setDepth(40);

      S.createBalloon(0);
    } else {
      // === 月亮安睡模式（m 关）===
      let hintText = `按住大按钮，哼 ${letterStr}！`;
      if (S.targetFamily === "plosive") {
        hintText = `点按钮，念 ${letterStr}！`;
      } else if (S.targetFamily === "continuous") {
        hintText = `按住大按钮，念 ${letterStr}！`;
      }

      S.add
        .text(W / 2, 48, hintText, {
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
          shadow,
        })
        .setOrigin(0.5, 0)
        .setDepth(40);

      S.moon = createInteractiveMoon(S, 472, 186, {
        displaySize: 184,
        isLullaby: true,
      });

      S.sleepStars = [];
      [
        [352, 70],
        [412, 48],
        [472, 40],
        [532, 48],
        [592, 70],
      ].forEach(([x, y]) => {
        const st = S.add
          .image(x, y, "star")
          .setDepth(9)
          .setTint(0x7c88b5)
          .setAlpha(0.3)
          .setDisplaySize(26, 26);
        S.sleepStars.push(st);
      });

      // 困意能量条
      S.add
        .text(268, 486, "困意", {
          fontSize: "15px",
          fontStyle: "bold",
          color: "#dfe6ff",
          shadow,
        })
        .setOrigin(1, 0.5)
        .setDepth(40);

      const mbg = S.add.graphics().setDepth(40);
      mbg.fillStyle(0x192144, 1);
      mbg.fillRoundedRect(282, 476, 360, 20, 10);
      mbg.lineStyle(2, 0xfeca57, 0.7);
      mbg.strokeRoundedRect(282, 476, 360, 20, 10);
      S.meterFill = S.add.graphics().setDepth(40);
      S.drawMeter();
    }

    // 5. B 幕发声大按钮
    const btnBox = S.add.container(480, 400).setDepth(15);
    S.btnRing = S.add
      .circle(0, 0, 54, 0xfeca57, 0)
      .setStrokeStyle(3.5, 0xfeca57, 0.6);
    const btnFace = S.add
      .image(0, 0, "dot")
      .setTint(CANDY_PALETTE.sunshineYellow)
      .setDisplaySize(92, 92);
    const btnTxt = S.add.text(0, -9, "🎤", { fontSize: "28px" }).setOrigin(0.5);

    const subLabel = S.isBalloonMode
      ? `按住吹气球`
      : S.targetFamily === "plosive"
      ? `短促念 ${letterStr}`
      : `按住哼 ${letterStr}`;

    const btnSub = S.add
      .text(0, 23, subLabel, {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#232c52",
      })
      .setOrigin(0.5);

    btnBox.add([S.btnRing, btnFace, btnTxt, btnSub]);
    S.btnBox = btnBox;

    btnFace.setInteractive({ useHandCursor: true });

    // 启动麦克风
    S.startMicrophone();

    // 按钮交互
    btnFace.on("pointerdown", () => {
      audioBridge.ensure();
      if (S.audioContext && S.audioContext.state === "suspended") {
        S.audioContext.resume().catch(() => {});
      }
      S.charging = true;
      S.attemptMaxVolume = 0;
      S.attemptAchievedGate = false;
      S.pressMinVolume = S.currentVolume;
      S.quietSince = 0;
      btnBox.setScale(0.95);
      S.btnRing.setScale(1.15).setAlpha(0.9);

      if (S.isBalloonMode) {
        if (S.currentBalloonIdx === 2) {
          // 短短两次节奏型按压
          const now = performance.now();
          if (now - S.lastRhythmTapTime > 300) {
            S.lastRhythmTapTime = now;
            if (S.balloonProgress < 50) {
              S.balloonProgress = 50;
              if (S.balloonContainer) {
                const sc = S.getBalloonScale(50);
                S.balloonContainer.setScale(sc);
              }
              audioBridge.pop();
            } else {
              S.balloonProgress = 100;
              S.popCurrentBalloon();
            }
          }
        }
      } else {
        if (S.moon) S.moon.openMouth(true);
        if (S.rockTween) S.rockTween.resume();
      }
    });

    const endHold = () => {
      if (!S.charging) return;
      S.charging = false;
      S.gateLatched = false;
      btnBox.setScale(1);
      S.tweens.killTweensOf(S.btnRing);
      S.btnRing.setScale(1).setAlpha(0);

      if (S.isBalloonMode) {
        if (!S.isPopped && !S.attemptAchievedGate && S.attemptMaxVolume > 0) {
          S.handleBalloonQuietAttempt();
        }
      } else {
        if (S.moon) S.moon.openMouth(false);
        if (S.rockTween) S.rockTween.pause();
      }
    };

    btnFace.on("pointerup", endHold);
    btnFace.on("pointerout", endHold);

    // 降级文本按钮
    S.fallbackBtn = S.add
      .text(480, 485, "按住直接充能 →", {
        fontSize: "13px",
        color: "#9aa6cc",
        backgroundColor: "#1c2444",
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });

    S.fallbackBtn.on("pointerdown", () => {
      audioBridge.ensure();
      S.fallbackActive = true;
      S.charging = true;
      S.pressMinVolume = S.currentVolume;
      S.quietSince = 0;
      btnBox.setScale(0.95);
    });
    S.fallbackBtn.on("pointerup", endHold);
    S.fallbackBtn.on("pointerout", endHold);

    // 注册探针
    registerProbe(() => ({
      scene: "lullaby",
      progress: Math.round(S.isBalloonMode ? S.balloonProgress : S.progress),
      balloonIndex: S.isBalloonMode ? S.currentBalloonIdx : undefined,
      asleep: S.asleep,
      consecutiveQuiet: S.consecutiveQuietCount,
    }));
  }

  // ---------- 气球模式专属逻辑 ----------
  private createBalloon(idx: number) {
    const S = this;
    if (S.balloonContainer) {
      S.balloonContainer.destroy();
    }
    const spec = BALLOON_SPECS[idx] || BALLOON_SPECS[0];
    const cx = W / 2;
    const cy = 200;

    const container = S.add.container(cx, cy).setDepth(20);

    const body = S.add
      .image(0, 0, "balloon_body")
      .setDisplaySize(90, 100)
      .setTint(spec.color);

    const strG = S.add.graphics();
    strG.lineStyle(2.5, 0xffffff, 0.7);
    strG.beginPath();
    strG.moveTo(0, 48);
    strG.lineTo(0, 85);
    strG.strokePath();

    const label = S.add
      .text(0, -6, S.levelConfig?.phonemeId || "s", {
        fontSize: "36px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#232c52",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    container.add([strG, body, label]);

    container.setScale(0.2);
    container.setAlpha(0);
    S.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 380,
      ease: "Back.Out(1.8)",
    });

    S.tweens.add({
      targets: container,
      y: cy + 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    S.balloonContainer = container;
    S.balloonBody = body;
    S.balloonProgress = 0;
    S.isPopped = false;
  }

  private getBalloonScale(progress: number): number {
    const S = this;
    const spec = BALLOON_SPECS[S.currentBalloonIdx] || BALLOON_SPECS[0];
    const maxSc = spec.maxScale;
    const pct = Phaser.Math.Clamp(progress / 100, 0, 1);
    return 1.0 + pct * (maxSc - 1.0);
  }

  private handleBalloonQuietAttempt() {
    const S = this;
    if (S.isPopped || !S.balloonContainer) return;

    S.consecutiveQuietCount++;

    // 气球害羞缩回
    S.tweens.killTweensOf(S.balloonContainer);
    S.tweens.add({
      targets: S.balloonContainer,
      scaleX: 0.88,
      scaleY: 0.88,
      duration: 160,
      yoyo: true,
      repeat: 1,
      ease: "Sine.InOut",
      onComplete: () => {
        if (!S.balloonContainer) return;
        const baseSc = S.getBalloonScale(S.balloonProgress);
        S.balloonContainer.setScale(baseSc);
      },
    });

    // 敢敢示范
    S.gangan.hop();
    S.gangan.wave(1);
    S.showBalloonHint("敢敢示范：发 s 声音~");

    // 连续 3 次小声后气球自动变大一半帮忙
    if (S.consecutiveQuietCount >= 3) {
      S.balloonProgress = Math.max(S.balloonProgress, 50);
      const halfScale = S.getBalloonScale(50);
      S.tweens.add({
        targets: S.balloonContainer,
        scaleX: halfScale,
        scaleY: halfScale,
        duration: 350,
        ease: "Back.Out(1.6)",
      });
      S.showBalloonHint("敢敢帮你吹大一半啦！");
    }
  }

  private showBalloonHint(text: string) {
    const S = this;
    S.bubbleText.setText(text);
    S.tweens.killTweensOf(S.bubble);
    S.tweens.add({
      targets: S.bubble,
      alpha: 1,
      y: 320,
      duration: 220,
      ease: "Back.Out(1.5)",
      onComplete: () => {
        S.time.delayedCall(1600, () => {
          S.tweens.add({
            targets: S.bubble,
            alpha: 0,
            y: 330,
            duration: 280,
          });
        });
      },
    });
  }

  private popCurrentBalloon() {
    const S = this;
    if (S.isPopped) return;
    S.isPopped = true;
    S.charging = false;
    audioBridge.pop();
    audioBridge.playLetter("s");

    const cx = W / 2;
    const cy = 200;

    // 爆破彩带与星星
    for (let i = 0; i < 20; i++) {
      const p = S.add
        .image(cx, cy, i % 2 === 0 ? "star" : "dot")
        .setDepth(25)
        .setTint(
          i % 3 === 0
            ? CANDY_PALETTE.sunshineYellow
            : i % 3 === 1
            ? CANDY_PALETTE.coralPink
            : CANDY_PALETTE.lakeBlue
        )
        .setDisplaySize(Phaser.Math.Between(10, 20), Phaser.Math.Between(10, 20));

      const angle = (i / 20) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.15, 0.15);
      const dist = Phaser.Math.Between(100, 220);
      S.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(450, 750),
        ease: "Quad.Out",
        onComplete: () => p.destroy(),
      });
    }

    if (S.balloonContainer) {
      S.tweens.add({
        targets: S.balloonContainer,
        scaleX: 2.6,
        scaleY: 2.6,
        alpha: 0,
        duration: 120,
        onComplete: () => {
          S.balloonContainer?.destroy();
          S.balloonContainer = undefined;
        },
      });
    }

    S.gangan.hop();
    S.gangan.wave(1);

    const nextIdx = S.currentBalloonIdx + 1;
    if (nextIdx < 3) {
      S.currentBalloonIdx = nextIdx;
      S.consecutiveQuietCount = 0;
      S.balloonProgress = 0;
      S.balloonRoundText?.setText(`气球 ${nextIdx + 1} / 3`);
      S.time.delayedCall(600, () => {
        S.createBalloon(nextIdx);
      });
    } else {
      // 3 个气球全部完成！
      S.time.delayedCall(400, () => {
        audioBridge.jingle();
        S.satietyGauge.setCount(4);
        S.gangan.celebrate?.();
      });

      S.time.delayedCall(1200, () => {
        showCompletionPanel(S, {
          title: "🎈 气球全部吹爆啦！",
          sub: "发出 3 次 s 能量 · 饱腹度升至 4 格！",
          btnText: "下一幕：小火车装货 →",
          onBtn: () => {
            S.scene.start("train", { levelConfig: S.levelConfig });
          },
        });
      });
    }
  }

  // ---------- 麦克风控制 ----------
  private async startMicrophone() {
    const S = this;
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      S.micState = "unavailable";
      S.fallbackActive = true;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      S.micStream = stream;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      S.audioContext = new AudioCtx();
      S.analyser = S.audioContext.createAnalyser();
      S.analyser.fftSize = 512;
      S.analyser.smoothingTimeConstant = 0.4;

      const source = S.audioContext.createMediaStreamSource(stream);
      source.connect(S.analyser);
      S.dataArray = new Uint8Array(S.analyser.frequencyBinCount);
      S.micState = "granted";
      if (S.fallbackBtn) S.fallbackBtn.setVisible(false);
    } catch {
      S.micState = "denied";
      S.fallbackActive = true;
      if (S.fallbackBtn) S.fallbackBtn.setVisible(true);
    }
  }

  private stopMicrophone() {
    const S = this;
    if (S.micStream) {
      S.micStream.getTracks().forEach((track) => track.stop());
      S.micStream = null;
    }
    if (S.audioContext && S.audioContext.state !== "closed") {
      S.audioContext.close().catch(() => {});
      S.audioContext = null;
    }
    S.analyser = null;
  }

  // ---------- 月亮安睡模式专属逻辑 ----------
  private triggerGentleConfusedHint() {
    const S = this;
    const now = performance.now();
    if (now - S.lastGentleHintTime < 2400) return;
    S.lastGentleHintTime = now;

    let hint = "？";
    if (S.micState === "granted") {
      if (S.currentVolume <= 10) {
        hint = "再大声一点";
      } else if (S.targetFamily === "humming") {
        hint = "闭上嘴唇哼";
      } else {
        hint = "换个发音方式试试";
      }
    }

    if (S.moon?.container) {
      const q = S.add
        .text(S.moon.container.x + 72, S.moon.container.y - 64, hint, {
          fontSize: "26px",
          fontStyle: "bold",
          color: "#feca57",
        })
        .setDepth(30)
        .setAlpha(0.85);

      S.tweens.add({
        targets: q,
        y: q.y - 28,
        alpha: 0,
        duration: 1100,
        ease: "Quad.Out",
        onComplete: () => q.destroy(),
      });
    }
  }

  private drawMeter() {
    const S = this;
    if (!S.meterFill) return;
    S.meterFill.clear();
    const w = (S.progress / 100) * 356;
    if (w <= 0) return;
    S.meterFill.fillStyle(CANDY_PALETTE.sunshineYellow, 1);
    S.meterFill.fillRoundedRect(284, 478, w, 16, 8);
  }

  private lightStars() {
    const S = this;
    const need = Math.min(5, Math.floor(S.progress / 20));
    for (let i = S.litCount; i < need; i++) {
      const st = S.sleepStars[i];
      S.litCount = i + 1;
      audioBridge.pop();
      S.tweens.add({
        targets: st,
        alpha: 1,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: 240,
        yoyo: true,
        ease: "Quad.Out",
        onComplete: () => {
          st.setTint(CANDY_PALETTE.sunshineYellow);
          st.setScale(1);
        },
      });
    }
  }

  private spawnNote() {
    const S = this;
    const notes = ["♪", "♫", "♬", "♩"];
    const sym = notes[Phaser.Math.Between(0, notes.length - 1)];
    const n = S.add
      .text(
        480 + Phaser.Math.Between(-28, 28),
        360,
        sym,
        {
          fontSize: Phaser.Math.Between(22, 28) + "px",
          color: "#feca57",
        }
      )
      .setDepth(14);

    S.tweens.add({
      targets: n,
      x: 472 + Phaser.Math.Between(-35, 35),
      y: 186 + Phaser.Math.Between(-20, 20),
      alpha: { from: 1, to: 0.1 },
      duration: Phaser.Math.Between(950, 1350),
      ease: "Quad.Out",
      onComplete: () => n.destroy(),
    });
  }

  private fallAsleep() {
    const S = this;
    S.asleep = true;
    S.charging = false;
    S.stopMicrophone();
    S.btnBox.setScale(1);
    S.tweens.killTweensOf(S.btnRing);
    if (S.rockTween) {
      S.rockTween.stop();
      S.gangan.box.setRotation(0);
    }

    if (S.moon) {
      S.moon.openMouth(false);
      S.moon.setAsleep?.();
    }
    audioBridge.lullaby();
    S.satietyGauge.setCount(4);

    if (S.moon?.container) {
      S.tweens.add({
        targets: S.moon.container,
        y: 196,
        rotation: 0.05,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }

    S.gangan.wave(2);

    for (let i = 0; i < 5; i++) {
      S.time.delayedCall(450 + i * 700, () => {
        const z = S.add
          .text(548, 124, "Z", {
            fontSize: 18 + i * 4 + "px",
            fontStyle: "bold",
            color: "#ffffff",
          })
          .setDepth(16)
          .setAlpha(0.9);

        S.tweens.add({
          targets: z,
          x: 548 + 44 + i * 9,
          y: 58,
          alpha: 0,
          duration: 1500,
          onComplete: () => z.destroy(),
        });
      });
    }

    const letterStr = S.levelConfig?.phonemeId || S.levelConfig?.letter || "m";
    S.time.delayedCall(1500, () => {
      showCompletionPanel(S, {
        title: "💤 月亮睡着啦",
        sub: `哼满了 ${letterStr} 摇篮曲 · 饱腹度升至 4 格！做个好梦`,
        btnText: "下一幕：小火车装货 →",
        onBtn: () => {
          S.scene.start("train", { levelConfig: S.levelConfig });
        },
      });
    });
  }

  update(time: number, delta: number) {
    const S = this;
    S.world?.driftClouds();

    // 1. 麦克风实时音频帧采样与校验
    if (S.analyser && S.dataArray && S.micState === "granted") {
      if (S.audioContext && S.audioContext.state === "suspended") {
        S.audioContext.resume().catch(() => {});
      }
      S.analyser.getByteFrequencyData(S.dataArray);
      const result = S.voiceAnalyzer.analyze(S.dataArray, S.targetFamily, time);
      S.currentVolume = result.avgVolume;
      S.detectedFamily = result.detectedFamily;
      S.isGateOpen = result.gateOpen;
    } else {
      S.currentVolume = 0;
      S.detectedFamily = null;
      S.isGateOpen = false;
    }

    // 有效门（起音 latch）：按住期最低音量为基线，爬升 >12 才算真发声；
    // 稳态噪声基线即当前值，爬升约 0，门打不开；真嘶声从安静起音＋持续即开。
    let voiceGate = false;
    if (S.micState === "granted" && S.charging) {
      if (S.currentVolume < S.pressMinVolume) S.pressMinVolume = S.currentVolume;
      const onset = S.currentVolume > S.pressMinVolume + 12;
      if (!S.gateLatched && S.isGateOpen && onset) S.gateLatched = true;
      if (S.gateLatched) {
        if (S.currentVolume > 10) {
          S.quietSince = 0;
          voiceGate = true;
        } else {
          if (!S.quietSince) S.quietSince = time;
          if (time - S.quietSince > 300) S.gateLatched = false;
        }
      }
    }

    if (S.isBalloonMode) {
      // === 气球膨胀模式运行逻辑 ===
      if (S.charging && !S.isPopped) {
        let shouldAdvance = false;

        if (S.micState === "granted") {
          if (voiceGate) {
            S.attemptAchievedGate = true;
            S.consecutiveQuietCount = 0;
            shouldAdvance = true;
          } else {
            if (S.currentVolume > 0 && S.currentVolume > S.attemptMaxVolume) {
              S.attemptMaxVolume = S.currentVolume;
            }
          }
        } else if (S.fallbackActive) {
          shouldAdvance = true;
        }

        if (shouldAdvance) {
          if (S.currentBalloonIdx === 0) {
            // 0.6 秒拉长变大
            S.balloonProgress = Math.min(100, S.balloonProgress + delta * (100 / 600));
          } else if (S.currentBalloonIdx === 1) {
            // 1.2 秒拉长变大
            S.balloonProgress = Math.min(100, S.balloonProgress + delta * (100 / 1200));
          } else {
            // 短短两次节奏型
            if (S.balloonProgress < 50) {
              S.balloonProgress = Math.min(50, S.balloonProgress + delta * (50 / 250));
            } else {
              S.balloonProgress = Math.min(100, S.balloonProgress + delta * (50 / 250));
            }
          }

          if (S.balloonContainer) {
            const sc = S.getBalloonScale(S.balloonProgress);
            S.balloonContainer.setScale(sc);
          }

          if (S.balloonProgress >= 100) {
            S.popCurrentBalloon();
          }
        }
      }
      return;
    }

    // === 月亮安睡模式运行逻辑 ===
    if (S.charging && !S.asleep) {
      if (S.micState === "granted") {
        if (voiceGate) {
          S.progress = Math.min(100, S.progress + delta * 0.028);
          S.noteAcc += delta;
          if (S.noteAcc > 180) {
            S.noteAcc = 0;
            S.spawnNote();
          }

          if (S.progress >= 100) {
            S.drawMeter();
            S.lightStars();
            S.fallAsleep();
            return;
          }
        } else {
          S.triggerGentleConfusedHint();
        }
      } else if (S.fallbackActive) {
        S.progress = Math.min(100, S.progress + delta * 0.028);
        S.noteAcc += delta;
        if (S.noteAcc > 180) {
          S.noteAcc = 0;
          S.spawnNote();
        }

        if (S.progress >= 100) {
          S.drawMeter();
          S.lightStars();
          S.fallAsleep();
          return;
        }
      }
    }

    S.drawMeter();
    S.lightStars();
    if (S.moon) S.moon.setSleepProgress?.(S.progress);
    S.overlay.setAlpha(S.progress * 0.0022);
  }
}
