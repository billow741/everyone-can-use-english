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
  registerProbe,
  SceneWorld,
  GanganWaveApi,
  MoonController,
  SatietyGaugeApi,
} from "./shared";
import { audioBridge } from "../audio";
import { LevelConfig } from "../config";

interface DraggableJelly extends Phaser.GameObjects.Image {
  label: Phaser.GameObjects.Text;
  letter: string;
  homeX: number;
  homeY: number;
  isCorrect: boolean;
  glowTween?: Phaser.Tweens.Tween;
}

export class FeedScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private currentRound = 0; // 0 to 4 (共 5 轮)
  private wrongAttemptsInRound = 0;
  private jellies: DraggableJelly[] = [];
  private world!: SceneWorld;
  private moon!: MoonController;
  private moonBaseX = 688;
  private gangan!: GanganWaveApi;
  private satietyGauge!: SatietyGaugeApi;
  private roundPromptText!: Phaser.GameObjects.Text;
  private onLevelFinished?: () => void;

  constructor() {
    super("jelly");
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

    S.currentRound = 0;
    S.wrongAttemptsInRound = 0;
    S.jellies = [];

    // 1. 搭建扁平风柔和渐变背景世界
    S.world = buildSceneWorld(S, 460);

    // 2. 顶部 HUD 与 5 格饱腹度槽
    const shadow = createHud(S, "🍬 听音投喂 · 想吃的声音", "第 1 / 3 幕");

    const initialSatiety = S.game.registry.get("satietyCount") || 0;
    S.satietyGauge = createSatietyGauge(S, 24, 52, initialSatiety);

    S.roundPromptText = S.add
      .text(
        W / 2,
        48,
        `第 1 / 5 轮`,
        { fontSize: "16px", color: "#ffffff", fontStyle: "bold", shadow }
      )
      .setOrigin(0.5, 0)
      .setDepth(40);

    // 3. 月亮（锚定物）——主角明月加大一圈（180 -> 216），带柔和光晕照亮夜空
    S.moon = createInteractiveMoon(S, S.moonBaseX, 156, {
      displaySize: 216,
    });

    // 4. 敢敢主持（带白描边贴纸）
    S.gangan = makeGanganWave(S, 130, 460, 96);
    S.gangan.box.setDepth(12);

    // 5. 拖拽交互监听
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
        j.setScale(1.1);
        j.label.setScale(1.1);
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
          156
        );
        S.moon.openMouth(d < 160);
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

    // 6. 生成第 1 轮选项
    S.startRound(0);

    // 7. 注册测试探针
    registerProbe(() => ({
      scene: "jelly",
      fed: S.currentRound,
      moon: { x: S.moonBaseX, y: 156 },
      jellies: S.jellies
        .filter((j) => j.active)
        .map((j) => ({
          letter: j.letter,
          x: Math.round(j.x),
          y: Math.round(j.y),
        })),
    }));
  }

  private startRound(roundIdx: number) {
    const S = this;
    S.currentRound = roundIdx;
    S.wrongAttemptsInRound = 0;

    // 清空现有选项
    S.jellies.forEach((j) => {
      j.label?.destroy();
      j.destroy();
    });
    S.jellies = [];

    const targetLetter = S.levelConfig?.phonemeId || S.levelConfig?.letter || "m";
    const ladder = S.levelConfig?.distractorLadder || [
      { round: 1, optionsCount: 3, distractorType: "far" },
      { round: 2, optionsCount: 3, distractorType: "far" },
      { round: 3, optionsCount: 3, distractorType: "near" },
      { round: 4, optionsCount: 3, distractorType: "near" },
      { round: 5, optionsCount: 4, distractorType: "mixed" },
    ];

    const currentLadder = ladder[roundIdx] || ladder[ladder.length - 1];
    const optionsCount = currentLadder.optionsCount;
    const distType = currentLadder.distractorType;

    // 更新提示
    S.roundPromptText.setText(
      `第 ${roundIdx + 1} / 5 轮`
    );

    // 从干扰池中选取干扰字母
    const farPool = S.levelConfig?.feedPool?.farDistractors || ["s", "t", "k", "f", "l", "a"];
    const nearPool = S.levelConfig?.feedPool?.nearDistractors || ["n", "ng", "b", "p"];

    let pickedDistractors: string[] = [];
    if (distType === "far") {
      const shuffled = [...farPool].sort(() => 0.5 - Math.random());
      pickedDistractors = shuffled.slice(0, optionsCount - 1);
    } else if (distType === "near") {
      const shuffled = [...nearPool].sort(() => 0.5 - Math.random());
      pickedDistractors = shuffled.slice(0, optionsCount - 1);
    } else {
      // mixed: 包含近音与远音
      const sn = [...nearPool].sort(() => 0.5 - Math.random());
      const sf = [...farPool].sort(() => 0.5 - Math.random());
      pickedDistractors = [sn[0], sn[1] || sf[0], sf[1] || sf[0]].slice(0, optionsCount - 1);
    }

    // 组合并随机打乱位置
    const optionLetters = [targetLetter, ...pickedDistractors].sort(
      () => 0.5 - Math.random()
    );

    // 颜色表 (5 暖色 + 1 湖蓝)
    const colorList = [
      CANDY_PALETTE.coralPink,
      CANDY_PALETTE.warmOrange,
      CANDY_PALETTE.sunshineYellow,
      CANDY_PALETTE.lakeBlue,
      CANDY_PALETTE.peachRose,
    ];

    // 排布坐标
    const startY = 432;
    let xs: number[] = [];
    if (optionsCount === 3) {
      xs = [320, 480, 640];
    } else {
      xs = [250, 400, 550, 700];
    }

    optionLetters.forEach((letStr, i) => {
      const x = xs[i];
      const y = startY;
      const isCorrect = letStr === targetLetter;
      const tintColor = colorList[i % colorList.length];

      // 糖果瓷砖
      const j = S.add
        .image(x, y - 70, "candy_tile")
        .setInteractive({ draggable: true, useHandCursor: true })
        .setDepth(15)
        .setTint(tintColor) as DraggableJelly;

      const label = S.add
        .text(x, y - 72, letStr, {
          fontSize: "32px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#2c3e50",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(16);

      j.label = label;
      j.letter = letStr;
      j.homeX = x;
      j.homeY = y;
      j.isCorrect = isCorrect;

      S.jellies.push(j);

      // 落地弹跳动画
      S.tweens.add({
        targets: [j, label],
        y: y,
        duration: Phaser.Math.Between(450, 650),
        ease: "Bounce.Out",
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

    const d = Phaser.Math.Distance.Between(j.x, j.y, S.moonBaseX, 156);

    if (d < 120) {
      if (j.isCorrect) {
        return S.eatCorrectJelly(j);
      }
      // ❌ 选错：喜剧弹开＋该字母自唱一次，同轮错 2 次后正确项发光脉动，不扣格
      return S.handleWrongJelly(j);
    }

    // 拖空或未到嘴边：弹回原位
    S.tweens.add({
      targets: [j, j.label],
      x: j.homeX,
      y: j.homeY,
      duration: 320,
      ease: "Quad.Out",
    });
  }

  private handleWrongJelly(j: DraggableJelly) {
    const S = this;
    audioBridge.bad();
    audioBridge.playLetter(j.letter); // 选错该字母自唱一次，强化听辨对比
    S.moon.shakeNo();

    S.wrongAttemptsInRound++;

    // 喜剧弹开：抛物线弹性跳回原位
    S.tweens.add({
      targets: [j, j.label],
      x: j.homeX,
      y: j.homeY,
      duration: 520,
      ease: "Bounce.Out",
    });

    // 同轮错 2 次后正确项发光脉动
    if (S.wrongAttemptsInRound >= 2) {
      const correctJelly = S.jellies.find((opt) => opt.isCorrect);
      if (correctJelly && !correctJelly.glowTween) {
        correctJelly.glowTween = S.tweens.add({
          targets: [correctJelly, correctJelly.label],
          scale: 1.18,
          duration: 360,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
    }
  }

  private eatCorrectJelly(j: DraggableJelly) {
    const S = this;
    j.disableInteractive();
    S.tweens.killTweensOf([j, j.label]);
    if (j.glowTween) j.glowTween.stop();

    // 糖果吸入月亮口中
    S.tweens.add({
      targets: [j, j.label],
      x: S.moonBaseX,
      y: 174,
      scale: 0.25,
      alpha: 0.4,
      duration: 160,
      ease: "Quad.In",
      onComplete: () => {
        j.label.destroy();
        j.destroy();
      },
    });

    // 满足吧唧与饱腹度增长
    S.time.delayedCall(140, () => {
      audioBridge.nom();
      S.moon.eatFeedback();
      S.gangan.hop();
      S.gangan.wave(1);

      const nextRound = S.currentRound + 1;

      // 饱腹度 5 格跨三幕累积：第一幕最多 3 格
      // 轮 2 完成 -> 1 格
      // 轮 4 完成 -> 2 格
      // 轮 5 完成 -> 3 格
      if (nextRound === 2) {
        S.satietyGauge.setCount(1);
      } else if (nextRound === 4) {
        S.satietyGauge.setCount(2);
      } else if (nextRound === 5) {
        S.satietyGauge.setCount(3);
      }

      // 2026-10-26 二选一掉落已去除：选择无实际意义（仅结算页一行显示，且不持久保存）
      if (nextRound >= 5) {
        // 第一幕 5 轮全部完成
        S.time.delayedCall(600, () => S.finale());
      } else {
        // 进入下一轮
        S.time.delayedCall(350, () => {
          S.startRound(nextRound);
        });
      }
    });
  }

  private finale() {
    const S = this;
    audioBridge.jingle();

    S.tweens.add({
      targets: S.moon.container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 260,
      yoyo: true,
      ease: "Back.Out(2)",
    });

    for (let i = 0; i < 12; i++) {
      const st = S.add
        .image(S.moonBaseX, 156, "star")
        .setDepth(25)
        .setTint(CANDY_PALETTE.sunshineYellow)
        .setDisplaySize(
          Phaser.Math.Between(10, 18),
          Phaser.Math.Between(10, 18)
        );
      S.tweens.add({
        targets: st,
        x: S.moonBaseX + Phaser.Math.Between(-140, 140),
        y: 156 + Phaser.Math.Between(-120, 120),
        alpha: 0,
        rotation: 2.5,
        duration: Phaser.Math.Between(550, 950),
        onComplete: () => st.destroy(),
      });
    }

    showCompletionPanel(S, {
      title: "🌙 月亮吃饱啦！",
      sub: `${S.levelConfig?.phonemeId || "m"} 声音果冻 × 5 · 饱腹度充至 3 格！`,
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
