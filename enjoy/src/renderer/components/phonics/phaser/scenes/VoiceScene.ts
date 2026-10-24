import Phaser from "phaser";
import {
  W,
  H,
  makeCommonTextures,
  buildSceneWorld,
  makeGanganWave,
  createInteractiveMoon,
  showCompletionPanel,
  createHud,
  registerProbe,
  SceneWorld,
  GanganWaveApi,
  MoonController,
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
  private bubble!: Phaser.GameObjects.Container;
  private meterFill!: Phaser.GameObjects.Graphics;
  private sleepStars: Phaser.GameObjects.Image[] = [];
  private overlay!: Phaser.GameObjects.Rectangle;
  private btnBox!: Phaser.GameObjects.Container;
  private btnRing!: Phaser.GameObjects.Arc;
  private rockTween?: Phaser.Tweens.Tween;

  constructor() {
    super("lullaby");
  }

  private onLevelFinished?: () => void;

  init(data?: { levelConfig?: LevelConfig; onLevelFinished?: () => void }) {
    this.levelConfig = data?.levelConfig || this.game.registry.get("levelConfig");
    this.onLevelFinished = data?.onLevelFinished || this.game.registry.get("onLevelFinished");
  }

  preload() {
    this.load.image("bg_night", "/assets/phonics-phaser/moon/bg-night.webp");
    this.load.image(
      "anchor_moon",
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

    // 1. 搭建精致背景世界
    S.world = buildSceneWorld(S, 470);

    // 2. 困意夜幕渐深遮罩
    S.overlay = S.add
      .rectangle(0, 0, W, H, 0x070b20, 0)
      .setOrigin(0, 0)
      .setDepth(5);

    // 3. 顶部 HUD
    const shadow = createHud(S, "🌙 摇篮曲 · 哄月亮睡觉", "第 2 / 3 幕");
    const phonemeStr = S.levelConfig?.phoneme || "/m/";
    S.add
      .text(
        W / 2,
        16,
        `按住大按钮哼 ${phonemeStr}，把困意哼满，月亮就睡着啦`,
        { fontSize: "16px", color: "#dfe6ff", shadow }
      )
      .setOrigin(0.5, 0)
      .setDepth(40);

    // 4. 月亮（摇篮曲模式：带眼皮与闭眼弧线）
    S.moon = createInteractiveMoon(S, 472, 192, {
      displaySize: 184,
      isLullaby: true,
    });

    // 5. 待点亮的星星（困意每 20% 点亮一颗）
    S.sleepStars = [];
    [
      [352, 74],
      [412, 52],
      [472, 44],
      [532, 52],
      [592, 74],
    ].forEach(([x, y]) => {
      const st = S.add
        .image(x, y, "star")
        .setDepth(9)
        .setTint(0x8a93b8)
        .setAlpha(0.25)
        .setDisplaySize(26, 26);
      S.sleepStars.push(st);
    });

    // 6. 敢敢陪哼（充能时轻轻摇晃，松手出提示气泡）
    S.gangan = makeGanganWave(S, 138, 470, 92);
    S.gangan.box.setDepth(12);

    S.bubble = S.add.container(210, 330).setDepth(41).setAlpha(0);
    const bb = S.add
      .rectangle(0, 0, 168, 40, 0xffffff, 0.95)
      .setStrokeStyle(2, 0xf7c948);
    const bt = S.add
      .text(0, 0, "别停哦，继续哼～", {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#232c52",
      })
      .setOrigin(0.5);
    S.bubble.add([bb, bt]);

    // 7. 困意条
    S.add
      .text(268, 486, "困意", {
        fontSize: "16px",
        color: "#aeb9e8",
        shadow,
      })
      .setOrigin(1, 0.5)
      .setDepth(40);

    const mbg = S.add.graphics().setDepth(40);
    mbg.fillStyle(0x171f42, 1);
    mbg.fillRoundedRect(282, 476, 360, 20, 10);
    mbg.lineStyle(2, 0xf7c948, 0.7);
    mbg.strokeRoundedRect(282, 476, 360, 20, 10);
    S.meterFill = S.add.graphics().setDepth(40);
    S.drawMeter();

    // 8. 按住哼大按钮
    const btnBox = S.add.container(480, 392).setDepth(15);
    S.btnRing = S.add
      .circle(0, 0, 55, 0xf7c948, 0)
      .setStrokeStyle(3, 0xf7c948, 0.55);
    const btnFace = S.add
      .image(0, 0, "dot")
      .setTint(0xf7c948)
      .setDisplaySize(92, 92);
    const btnTxt = S.add.text(0, -8, "🎤", { fontSize: "30px" }).setOrigin(0.5);
    const btnSub = S.add
      .text(0, 24, `按住哼 ${phonemeStr}`, {
        fontSize: "14px",
        fontStyle: "bold",
        color: "#232c52",
      })
      .setOrigin(0.5);

    btnBox.add([S.btnRing, btnFace, btnTxt, btnSub]);
    S.btnBox = btnBox;

    btnFace.setInteractive({ useHandCursor: true });

    btnFace.on("pointerdown", () => {
      audioBridge.ensure();
      if (S.asleep) return;
      S.charging = true;
      // 点按也有蓄力（降级通道）
      S.progress = Math.min(100, S.progress + 3);
      btnBox.setScale(1.07);

      S.tweens.add({
        targets: S.btnRing,
        scale: 1.18,
        alpha: 0.4,
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
        // 未满松手：敢敢气泡鼓励
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
    S.meterFill.fillStyle(0xf7c948, 1);
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
          st.setTint(0xf7c948);
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
          fontSize: Phaser.Math.Between(20, 26) + "px",
          color: "#f7d774",
        }
      )
      .setDepth(14);

    S.tweens.add({
      targets: n,
      x: 472 + Phaser.Math.Between(-35, 35),
      y: 192 + Phaser.Math.Between(-20, 20),
      alpha: { from: 1, to: 0.1 },
      duration: Phaser.Math.Between(1000, 1400),
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

    // 月亮安睡微摇
    S.tweens.add({
      targets: S.moon.container,
      y: 204,
      rotation: 0.05,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    S.gangan.wave(2);

    // Zzz 字符轻柔飘起
    for (let i = 0; i < 5; i++) {
      S.time.delayedCall(500 + i * 750, () => {
        const z = S.add
          .text(548, 128, "Z", {
            fontSize: 17 + i * 4 + "px",
            fontStyle: "bold",
            color: "#aeb9e8",
          })
          .setDepth(16)
          .setAlpha(0.9);

        S.tweens.add({
          targets: z,
          x: 548 + 44 + i * 9,
          y: 62,
          alpha: 0,
          duration: 1500,
          onComplete: () => z.destroy(),
        });
      });
    }

    S.time.delayedCall(1500, () => {
      showCompletionPanel(S, {
        title: "💤 月亮睡着啦",
        sub: `哼满了 ${S.levelConfig?.phoneme || "/m/"} 摇篮曲 · 做个好梦`,
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
      // 约 5 秒充满 (100 / 5000 = 0.02)
      S.progress = Math.min(100, S.progress + delta * 0.021);
      S.noteAcc += delta;
      if (S.noteAcc > 190) {
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
