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

export class VoiceScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private progress = 0;
  private charging = false;
  private asleep = false;
  private litCount = 0;
  private noteAcc = 0;

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
    const manner = S.levelConfig?.voiceArchetype?.manner || "humming";

    // 顶部玩法引导提示（数据驱动，零 IPA 零术语）
    let hintText = `按住大按钮哼 ${letterStr} 的声音，把困意哼满，月亮就睡着啦`;
    if (manner === "plosive") {
      hintText = `短促点击按钮念 ${letterStr}，每一次短促击发都能注入能量！`;
    } else if (manner === "continuous") {
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
      .text(0, 0, manner === "plosive" ? "再来一下！" : "别停哦，继续哼～", {
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
      manner === "plosive"
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

    // 交互逻辑：短促型短促一击，哼鸣型按住蓄力
    if (manner === "plosive") {
      // === 短促型：短促一击触发，不用长按 ===
      btnFace.on("pointerdown", () => {
        audioBridge.ensure();
        if (S.asleep) return;
        squashRebound(S, btnBox);
        audioBridge.pop();
        audioBridge.playLetter(letterStr);

        // 每次短促一击注入 34% 进度
        S.progress = Math.min(100, S.progress + 34);
        S.drawMeter();
        S.lightStars();
        S.spawnNote();
        S.moon.eatFeedback();

        if (S.progress >= 100) {
          S.fallAsleep();
        }
      });
    } else {
      // === 哼鸣型 / 持续型：按住持续充满 ===
      btnFace.on("pointerdown", () => {
        audioBridge.ensure();
        if (S.asleep) return;
        S.charging = true;
        // 点按也有初始小蓄力（无障碍降级通道）
        S.progress = Math.min(100, S.progress + 3);
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

    // 9. 注册测试探针
    registerProbe(() => ({
      scene: "lullaby",
      progress: Math.round(S.progress),
      asleep: S.asleep,
    }));
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

    if (S.charging && !S.asleep) {
      // 约 4.8 秒充满
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

    S.drawMeter();
    S.lightStars();
    S.moon.setSleepProgress?.(S.progress);
    S.overlay.setAlpha(S.progress * 0.0022);
  }
}
