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

interface DraggableJelly extends Phaser.GameObjects.Image {
  label: Phaser.GameObjects.Text;
  letter: string;
  landY: number;
  meltTimer?: Phaser.Time.TimerEvent;
}

export class FeedScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private fed = 0;
  private jellies: DraggableJelly[] = [];
  private world!: SceneWorld;
  private moon!: MoonController;
  private moonBaseX = 688;
  private gangan!: GanganWaveApi;
  private spawner?: Phaser.Time.TimerEvent;
  private progressText!: Phaser.GameObjects.Text;

  constructor() {
    super("jelly");
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
    S.fed = 0;
    S.jellies = [];

    // 1. 搭建精致背景世界
    S.world = buildSceneWorld(S, 470);

    // 2. 顶部 HUD
    const shadow = createHud(S, "🍓 果冻雨 · 喂月亮吃果冻", "第 1 / 3 幕");
    S.progressText = S.add
      .text(24, 52, "已喂 0 / 3", {
        fontSize: "18px",
        color: "#f7c948",
        shadow,
      })
      .setDepth(40);

    S.add
      .text(
        W / 2,
        48,
        "把 m 果冻拖到月亮嘴边，手快一点，果冻会化掉哦",
        { fontSize: "16px", color: "#dfe6ff", shadow }
      )
      .setOrigin(0.5, 0)
      .setDepth(40);

    // 3. 月亮（锚定图本尊 + 动态开合嘴部）
    S.moon = createInteractiveMoon(S, S.moonBaseX, 148, {
      displaySize: 180,
    });

    // 4. 敢敢主持（招手姿态）
    S.gangan = makeGanganWave(S, 126, 470, 92);
    S.gangan.box.setDepth(12);

    // 5. 拖拽投喂交互（图片本体 + 字母文本跟随模式，严禁使用 Container）
    S.input.on("pointerdown", () => audioBridge.ensure());

    S.input.on(
      "dragstart",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const j = gameObject as DraggableJelly;
        audioBridge.pop();
        audioBridge.playLetter(j.letter);

        S.tweens.killTweensOf([j, j.label]);
        if (j.meltTimer) j.meltTimer.remove(false);

        j.setAlpha(1);
        j.label.setAlpha(1);
        j.setScale(1.08);
        j.label.setScale(1.08);
        j.setDepth(30);
        j.label.setDepth(31);
      }
    );

    S.input.on(
      "drag",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        const j = gameObject as DraggableJelly;
        j.x = dragX;
        j.y = dragY;
        j.label.setPosition(dragX, dragY - 2);

        const d = Phaser.Math.Distance.Between(
          dragX,
          dragY,
          S.moonBaseX,
          148
        );
        S.moon.openMouth(d < 170);
      }
    );

    S.input.on(
      "dragend",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const j = gameObject as DraggableJelly;
        S.onDropJelly(j);
      }
    );

    // 6. 周期性果冻生成
    S.spawner = S.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => S.spawnJelly(),
    });
    S.time.delayedCall(350, () => S.spawnJelly());

    // 7. 注册测试探针
    registerProbe(() => ({
      scene: "jelly",
      fed: S.fed,
      moon: { x: S.moonBaseX, y: 148 },
      jellies: S.jellies
        .filter((j) => j.active)
        .map((j) => ({
          letter: j.letter,
          x: Math.round(j.x),
          y: Math.round(j.y),
        })),
    }));
  }

  private spawnJelly() {
    const S = this;
    if (S.fed >= 3) return;
    const alive = S.jellies.filter((j) => j.active);
    if (alive.length >= 5) return;

    // 保底：场上没有 m 时下一颗必是 m，绝不让孩子干等
    const targetLetter = S.levelConfig?.letter || "m";
    const hasTarget = alive.some((j) => j.letter === targetLetter);
    const DECOYS = S.levelConfig?.decoyPool || [
      "p",
      "a",
      "s",
      "n",
      "b",
      "e",
      "o",
    ];

    const letter = !hasTarget
      ? targetLetter
      : Math.random() < 0.22
      ? targetLetter
      : DECOYS[Phaser.Math.Between(0, DECOYS.length - 1)];

    const colors: Record<string, number> = {
      m: 0xef5d7a,
      p: 0x8a6fe0,
      a: 0x41a8d8,
      s: 0x5cb85f,
      n: 0xf2a541,
      b: 0x5c6bc0,
      e: 0x26a69a,
      o: 0xab47bc,
    };

    const x = Phaser.Math.Between(320, 890);

    // 果冻本体用图片对象（命中判定精准），字母文本跟随——严禁使用 Container
    const j = S.add
      .image(x, -40, "jelly")
      .setTint(colors[letter] || 0xef5d7a)
      .setDepth(15)
      .setInteractive({ useHandCursor: true }) as DraggableJelly;

    S.input.setDraggable(j);

    const label = S.add
      .text(x, -42, letter, {
        fontSize: "27px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "rgba(0,0,0,0.25)",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(16);

    j.label = label;
    j.letter = letter;
    j.landY = 443;
    S.jellies.push(j);

    S.tweens.add({
      targets: [j, label],
      y: j.landY,
      duration: Phaser.Math.Between(650, 900),
      ease: "Bounce.Out",
    });

    S.tweens.add({
      targets: j,
      rotation: Phaser.Math.FloatBetween(-0.1, 0.1),
      duration: 300,
      yoyo: true,
      repeat: 1,
    });

    S.armMelt(j);
  }

  private armMelt(j: DraggableJelly) {
    const S = this;
    const label = j.label;
    if (j.meltTimer) j.meltTimer.remove(false);

    // 静置 11 秒后闪烁提醒约 3 秒，总计约 14 秒化没
    j.meltTimer = S.time.delayedCall(11000, () => {
      if (!j.active) return;
      S.tweens.add({
        targets: [j, label],
        alpha: 0.35,
        duration: 260,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          if (!j.active) return;
          S.tweens.add({
            targets: [j, label],
            alpha: 0,
            scale: 0.55,
            duration: 500,
            onComplete: () => {
              const idx = S.jellies.indexOf(j);
              if (idx >= 0) S.jellies.splice(idx, 1);
              label.destroy();
              j.destroy();
            },
          });
        },
      });
    });
  }

  private onDropJelly(j: DraggableJelly) {
    const S = this;
    j.setScale(1);
    j.setDepth(15);
    j.label.setScale(1);
    j.label.setDepth(16);
    S.moon.openMouth(false);

    const d = Phaser.Math.Distance.Between(j.x, j.y, S.moonBaseX, 148);
    const targetLetter = S.levelConfig?.letter || "m";

    if (d < 105) {
      if (j.letter === targetLetter) {
        return S.eatJelly(j);
      }
      // 错吃：月亮摇头，果冻弹回地面
      audioBridge.bad();
      S.moon.shakeNo();
    }

    S.tweens.add({
      targets: [j, j.label],
      y: j.landY,
      duration: 450,
      ease: "Bounce.Out",
    });
    S.armMelt(j);
  }

  private eatJelly(j: DraggableJelly) {
    const S = this;
    j.disableInteractive();
    S.tweens.killTweensOf([j, j.label]);
    if (j.meltTimer) j.meltTimer.remove(false);

    const idx = S.jellies.indexOf(j);
    if (idx >= 0) S.jellies.splice(idx, 1);

    S.tweens.add({
      targets: [j, j.label],
      x: S.moonBaseX,
      y: 166,
      scale: 0.3,
      alpha: 0.5,
      duration: 170,
      ease: "Quad.In",
      onComplete: () => {
        j.label.destroy();
        j.destroy();
      },
    });

    // 吧唧嘴 + 月亮满足反馈 + 碎屑飞溅
    S.time.delayedCall(150, () => {
      audioBridge.nom();
      S.moon.eatFeedback();

      for (let i = 0; i < 6; i++) {
        const c = S.add
          .image(
            S.moonBaseX + Phaser.Math.Between(-14, 14),
            168,
            "dot"
          )
          .setDepth(20)
          .setTint(0xef5d7a)
          .setDisplaySize(
            Phaser.Math.Between(4, 8),
            Phaser.Math.Between(4, 8)
          );
        S.tweens.add({
          targets: c,
          x: c.x + Phaser.Math.Between(-34, 34),
          y: c.y + Phaser.Math.Between(8, 30),
          alpha: 0,
          duration: 420,
          onComplete: () => c.destroy(),
        });
      }

      S.gangan.hop();
      S.gangan.wave(1);
      S.fed++;
      S.progressText.setText(`已喂 ${S.fed} / 3`);

      if (S.fed >= 3) {
        S.time.delayedCall(700, () => S.finale());
      }
    });
  }

  private finale() {
    const S = this;
    S.spawner?.remove();
    audioBridge.jingle();

    S.tweens.add({
      targets: S.moon.container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 260,
      yoyo: true,
      ease: "Back.Out(2)",
    });

    for (let i = 0; i < 10; i++) {
      const st = S.add
        .image(S.moonBaseX, 148, "star")
        .setDepth(25)
        .setTint(0xff8fab)
        .setDisplaySize(
          Phaser.Math.Between(10, 17),
          Phaser.Math.Between(10, 17)
        );
      S.tweens.add({
        targets: st,
        x: S.moonBaseX + Phaser.Math.Between(-130, 130),
        y: 148 + Phaser.Math.Between(-110, 110),
        alpha: 0,
        rotation: 2.5,
        duration: Phaser.Math.Between(550, 900),
        onComplete: () => st.destroy(),
      });
    }

    showCompletionPanel(S, {
      title: "🌙 月亮吃饱啦！",
      sub: `${S.levelConfig?.letter || "m"} 果冻 × 3 · 小肚子圆圆的`,
      btnText: "下一幕：摇篮曲 →",
      onBtn: () => {
        S.scene.start("lullaby", {
          levelConfig: S.levelConfig,
          onLevelFinished: S.onLevelFinished || S.game.registry.get("onLevelFinished"),
        });
      },
    });
  }

  update() {
    this.world?.driftClouds();
  }
}
