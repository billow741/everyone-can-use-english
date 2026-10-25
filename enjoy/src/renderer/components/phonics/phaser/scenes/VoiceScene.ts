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

export class VoiceScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private progress = 0;
  private charging = false;
  private asleep = false;
  private litCount = 0;
  private noteAcc = 0;

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
    this.load.image(
      "anchor_moon",
      this.levelConfig?.anchor?.image ||
        this.levelConfig?.anchorImage ||
        "/assets/phonics/anchors/anchor-moon-transparent.png"
    );
    this.load.image(
      "gangan_wave_body",
      "/assets/gangan/gangan_wave_body.webp"
    );
    this.load.image(
      "gangan_wave_arm",
      "/assets/gangan/gangan_wave_arm.webp"
    );
  }

  create() {
    const S = this;
    if (!S.textures.exists("dot")) makeCommonTextures(S);
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

    // 1. 搭建扁平风柔和渐变背景世界
    S.world = buildSceneWorld(S, 460);

    // 2. 困意夜幕渐深遮罩
    S.overlay = S.add
      .rectangle(0, 0, W, H, 0x151b3a, 0)
      .setOrigin(0, 0)
      .setDepth(5);

    // 3. 顶部 HUD 与 5 格饱腹度槽（接续第 1 幕的 3 格）
    const shadow = createHud(S, "🌙 摇篮曲 · 声音魔法", "第 2 / 3 幕");
    const currentSatiety = S.game.registry.get("satietyCount") || 3;
    S.satietyGauge = createSatietyGauge(S, 24, 52, currentSatiety);

    const letterStr = S.levelConfig?.phonemeId || S.levelConfig?.letter || "m";
    const manner = S.levelConfig?.voiceArchetype?.manner;
    S.targetFamily = getPhonemeFamily(letterStr, manner);

    // 顶部玩法引导提示（数据驱动，零 IPA 零术语）
    let hintText = `按住大按钮哼 ${letterStr} 的声音，把困意哼满，月亮就睡着啦`;
    if (S.targetFamily === "plosive") {
      hintText = `短促点击按钮念 ${letterStr}，每一次短促击发都能注入能量！`;
    } else if (S.targetFamily === "continuous") {
      hintText = `按住大按钮持续念 ${letterStr}，声音注入能量！`;
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

    // 4. 月亮（锚定物：摇篮曲带眼皮与闭眼弧线）
    S.moon = createInteractiveMoon(S, 472, 186, {
      displaySize: 184,
      isLullaby: true,
    });

    // 5. 待点亮的 5 颗星星
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

    // 6. 敢敢陪哼主持
    S.gangan = makeGanganWave(S, 134, 460, 94);
    S.gangan.box.setDepth(12);

    S.bubble = S.add.container(210, 330).setDepth(41).setAlpha(0);
    const bb = S.add
      .rectangle(0, 0, 168, 40, 0xffffff, 0.95)
      .setStrokeStyle(2, 0xfeca57);
    const bt = S.add
      .text(0, 0, S.targetFamily === "plosive" ? "再来一下！" : "别停哦，继续哼～", {
        fontSize: "15px",
        fontStyle: "bold",
        color: "#232c52",
      })
      .setOrigin(0.5);
    S.bubble.add([bb, bt]);

    // 7. 困意能量条
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

    // 8. B 幕发声大按钮（短促型 vs 哼鸣型/持续型 分支实现）
    const btnBox = S.add.container(480, 390).setDepth(15);
    S.btnRing = S.add
      .circle(0, 0, 56, 0xfeca57, 0)
      .setStrokeStyle(3.5, 0xfeca57, 0.6);
    const btnFace = S.add
      .image(0, 0, "dot")
      .setTint(CANDY_PALETTE.sunshineYellow)
      .setDisplaySize(94, 94);
    const btnTxt = S.add.text(0, -9, "🎤", { fontSize: "30px" }).setOrigin(0.5);

    // 按钮文案：短促型为短促一击，哼鸣型为按住哼
    const subLabel =
      S.targetFamily === "plosive"
        ? `短促念 ${letterStr}`
        : `按住哼 ${letterStr}`;

    const btnSub = S.add
      .text(0, 24, subLabel, {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#232c52",
      })
      .setOrigin(0.5);

    btnBox.add([S.btnRing, btnFace, btnTxt, btnSub]);
    S.btnBox = btnBox;

    btnFace.setInteractive({ useHandCursor: true });

    // 进幕即启动真实麦克风
    S.startMicrophone();

    // 交互逻辑：短促型短促一击，哼鸣型/持续型按住蓄力
    if (S.targetFamily === "plosive") {
      // === 短促型：短促一击触发 ===
      btnFace.on("pointerdown", () => {
        audioBridge.ensure();
        if (S.audioContext && S.audioContext.state === "suspended") {
          S.audioContext.resume().catch(() => {});
        }
        if (S.asleep) return;
        squashRebound(S, btnBox);
        audioBridge.pop();
        audioBridge.playLetter(letterStr);

        if (S.micState === "granted") {
          // 有麦克风：必须音量过门槛且对上家族（短促爆破类）
          if (S.isGateOpen) {
            S.progress = Math.min(100, S.progress + 34);
            S.drawMeter();
            S.lightStars();
            S.spawnNote();
            S.moon.eatFeedback();

            if (S.progress >= 100) {
              S.fallAsleep();
            }
          } else {
            // 未过门槛或家族不匹配：不涨进度，温和提示
            S.triggerGentleConfusedHint();
          }
        } else if (S.fallbackActive) {
          // 无麦克风降级通道
          S.progress = Math.min(100, S.progress + 34);
          S.drawMeter();
          S.lightStars();
          S.spawnNote();
          S.moon.eatFeedback();

          if (S.progress >= 100) {
            S.fallAsleep();
          }
        }
      });
    } else {
      // === 哼鸣型 / 持续型 / 元音 / 流音：按住持续充满 ===
      btnFace.on("pointerdown", () => {
        audioBridge.ensure();
        if (S.audioContext && S.audioContext.state === "suspended") {
          S.audioContext.resume().catch(() => {});
        }
        if (S.asleep) return;
        S.charging = true;

        // 仅在无麦克风降级模式下给初始点按微蓄力；有麦克风时严禁赠送进度，修掉“按住就能过”
        if (S.fallbackActive) {
          S.progress = Math.min(100, S.progress + 3);
        }
        btnBox.setScale(1.07);

        S.tweens.add({
          targets: S.btnRing,
          scale: 1.18,
          alpha: 0.45,
          duration: 480,
          yoyo: true,
          repeat: -1,
        });

        S.rockTween = S.tweens.add({
          targets: S.gangan.box,
          rotation: 0.05,
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });

        S.moon.openMouth(true);
      });

      S.input.on("pointerup", () => {
        if (!S.charging) return;
        S.charging = false;
        btnBox.setScale(1);
        S.tweens.killTweensOf(S.btnRing);
        S.btnRing.setScale(1).setAlpha(0);
        if (S.rockTween) {
          S.rockTween.stop();
          S.gangan.box.setRotation(0);
        }
        S.moon.openMouth(false);

        if (!S.asleep && S.progress < 100) {
          S.tweens.killTweensOf(S.bubble);
          S.bubble.setAlpha(1);
          S.tweens.add({
            targets: S.bubble,
            alpha: 0,
            delay: 1400,
            duration: 450,
          });
        }
      });
    }

    // 9. 注册测试探针 (window.__phaserProbe 与 window.__voiceProbe)
    const exposeProbe = () => ({
      scene: "lullaby",
      progress: Math.round(S.progress),
      asleep: S.asleep,
      btn: { x: 480, y: 390 },
      micState: S.micState,
      volume: Math.round(S.currentVolume),
      rawVolume: S.currentVolume,
      detectedFamily: S.detectedFamily,
      gateOpen: S.isGateOpen,
      isGateOpen: S.isGateOpen,
      targetFamily: S.targetFamily,
      fallbackActive: S.fallbackActive,
    });

    registerProbe(exposeProbe as any);

    const voiceProbeFn: any = () => exposeProbe();
    Object.defineProperties(voiceProbeFn, {
      micState: { get: () => S.micState },
      volume: { get: () => Math.round(S.currentVolume) },
      rawVolume: { get: () => S.currentVolume },
      detectedFamily: { get: () => S.detectedFamily },
      gateOpen: { get: () => S.isGateOpen },
      isGateOpen: { get: () => S.isGateOpen },
      targetFamily: { get: () => S.targetFamily },
      progress: { get: () => Math.round(S.progress) },
      asleep: { get: () => S.asleep },
      fallbackActive: { get: () => S.fallbackActive },
      btn: { get: () => ({ x: 480, y: 390 }) },
    });
    (window as any).__voiceProbe = voiceProbeFn;

    // 生命周期监听：场景关闭或销毁时立即停止并释放麦克风
    S.events.once("shutdown", () => {
      S.stopMicrophone();
    });
    S.events.once("destroy", () => {
      S.stopMicrophone();
      if ((window as any).__voiceProbe) {
        delete (window as any).__voiceProbe;
      }
    });
  }

  /**
   * 进幕时尝试 getUserMedia 拿麦克风，AnalyserNode fftSize 512
   */
  private async startMicrophone() {
    const S = this;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      S.micState = "unavailable";
      S.enableFallback();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!S.scene.isActive()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      S.micStream = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      S.audioContext = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      S.analyser = analyser;
      S.dataArray = new Uint8Array(analyser.frequencyBinCount);
      S.micState = "granted";
      S.fallbackActive = false;
      if (S.fallbackBtn) {
        S.fallbackBtn.setVisible(false);
      }
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch (err: any) {
      if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        S.micState = "unavailable";
      } else {
        S.micState = "denied";
      }
      S.enableFallback();
    }
  }

  /**
   * 无麦克风降级通道：展示“点击蓄力”按钮，保证无麦克风环境也能通关
   */
  private enableFallback() {
    const S = this;
    S.fallbackActive = true;
    if (!S.fallbackBtn) {
      S.fallbackBtn = S.add
        .text(480, 448, "(无麦克风 · 点击蓄力)", {
          fontSize: "13px",
          color: "#feca57",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(20)
        .setInteractive({ useHandCursor: true });

      S.fallbackBtn.on("pointerdown", () => {
        if (S.asleep) return;
        audioBridge.pop();
        squashRebound(S, S.fallbackBtn!);
        // 降级点击：每次点击蓄力 15% (沿用老摇篮曲标准)
        S.progress = Math.min(100, S.progress + 15);
        S.drawMeter();
        S.lightStars();
        S.spawnNote();
        S.moon.eatFeedback();
        if (S.progress >= 100) {
          S.fallAsleep();
        }
      });
    } else {
      S.fallbackBtn.setVisible(true);
    }
  }

  /**
   * 停止并释放麦克风资源
   */
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
    S.voiceAnalyzer.reset();
  }

  /**
   * 温和可视提示（月亮困惑表情与柔和问号，绝不扣进度、绝不失败、绝无说教）
   */
  private triggerGentleConfusedHint() {
    const S = this;
    const now = S.time.now;
    if (now - S.lastGentleHintTime < 1500) return;
    S.lastGentleHintTime = now;

    // 月亮困惑微倾 (4度)
    S.tweens.add({
      targets: S.moon.container,
      rotation: 0.06,
      duration: 260,
      yoyo: true,
      ease: "Sine.InOut",
    });

    // 柔和小金问号从月亮身旁轻浮淡出
    const q = S.add
      .text(S.moon.container.x + 72, S.moon.container.y - 64, "？", {
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

  private drawMeter() {
    const S = this;
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
    S.stopMicrophone(); // 睡眠时及时释放麦克风
    S.btnBox.setScale(1);
    S.tweens.killTweensOf(S.btnRing);
    if (S.rockTween) {
      S.rockTween.stop();
      S.gangan.box.setRotation(0);
    }

    S.moon.setAsleep?.();
    audioBridge.lullaby();

    // 饱腹度跨幕累积：第二幕完成增加第 4 格！
    S.satietyGauge.setCount(4);

    // 月亮安睡微摇
    S.tweens.add({
      targets: S.moon.container,
      y: 196,
      rotation: 0.05,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    S.gangan.wave(2);

    // Zzz 字符轻柔飘起
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

    // 2. 蓄力充能逻辑
    if (S.charging && !S.asleep) {
      if (S.micState === "granted") {
        // 有麦克风：只有在“音量过门槛(avgVolume>16)且家族对上”时进度才上涨
        if (S.isGateOpen) {
          // 约 4.8 秒充满 (与现状 5 秒手感完全一致: 100 / 0.021 ≈ 4762ms)
          S.progress = Math.min(100, S.progress + delta * 0.021);
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
          // 音量不够或家族不对时：进度停住，并给孩子一个温和的可视提示（绝不扣进度、绝不失败）
          S.triggerGentleConfusedHint();
        }
      } else if (S.fallbackActive) {
        // 无麦克风降级通道：按住蓄力可平滑通关
        S.progress = Math.min(100, S.progress + delta * 0.021);
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
    S.moon.setSleepProgress?.(S.progress);
    S.overlay.setAlpha(S.progress * 0.0022);
  }
}
