import Phaser from "phaser";
import {
  W,
  H,
  RAIL_Y,
  WHEEL_R,
  CONDUCTOR_PIVOT,
  makeCommonTextures,
  createHud,
  createSatietyGauge,
  CANDY_PALETTE,
  squashRebound,
  registerProbe,
  SatietyGaugeApi,
} from "./shared";
import { audioBridge } from "../audio";
import { LevelConfig, BlendWordSpec } from "../config";

interface CargoCar extends Phaser.GameObjects.Container {
  letter: string;
  bedY: number;
  filled: boolean;
  ghost: Phaser.GameObjects.Text;
  wheels: Phaser.GameObjects.Image[];
}

interface DraggableCrate extends Phaser.GameObjects.Image {
  letter: string;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Ellipse;
  home: { x: number; y: number };
  baseScale: number;
  done?: boolean;
}

export class BlendScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private onLevelFinished?: () => void;

  private loaded = 0;
  private departed = false;
  private departing = false;
  private speed = 0;
  private chugAcc = 0;

  private train!: Phaser.GameObjects.Container;
  private trainBaseY = 0;
  private cars: CargoCar[] = [];
  private crates: DraggableCrate[] = [];
  private sleepers!: Phaser.GameObjects.TileSprite;
  private hillsFar!: Phaser.GameObjects.TileSprite;
  private hillsNear!: Phaser.GameObjects.TileSprite;
  private clouds: Phaser.GameObjects.Image[] = [];
  private signBoard!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private satietyGauge!: SatietyGaugeApi;

  private ganganArm: Phaser.GameObjects.Image | null = null;
  private driver: Phaser.GameObjects.Container | null = null;
  private locoWheels: Array<{ s: Phaser.GameObjects.Image; r: number }> = [];
  private rod: Phaser.GameObjects.Rectangle | null = null;
  private rodPins: Phaser.GameObjects.Arc[] = [];
  private rodCx = 112;
  private rodCy = RAIL_Y - 20;
  private chimney = { x: 56, y: RAIL_Y - 118 };
  private steamTimer?: Phaser.Time.TimerEvent;
  private currentWordIdx = 0;
  private wordsList: BlendWordSpec[] = [];
  private carLinks: Phaser.GameObjects.Rectangle[] = [];
  private wrongDropAttempts = 0;
  private wordRoundText?: Phaser.GameObjects.Text;

  constructor() {
    super("train");
  }

  init(data?: { levelConfig?: LevelConfig; onLevelFinished?: () => void }) {
    this.levelConfig = data?.levelConfig || this.game.registry.get("levelConfig");
    this.onLevelFinished = data?.onLevelFinished || this.game.registry.get("onLevelFinished");
  }

  preload() {
    const isSun = this.levelConfig?.levelId === "s" || this.levelConfig?.anchorWord === "sun";
    this.load.image(
      "anchor_moon",
      this.levelConfig?.anchor?.image ||
        this.levelConfig?.anchorImage ||
        (isSun ? "/assets/phonics/anchors/anchor-sun-transparent.png" : "/assets/phonics/anchors/anchor-moon-transparent.png")
    );
    this.load.image("anchor_sun", "/assets/phonics/anchors/anchor-sun-transparent.png");
    this.load.image("flashcard_sat", "/assets/phonics/flashcards/flashcard-sat.webp");
    this.load.image("flashcard_sit", "/assets/phonics/flashcards/flashcard-sit.webp");
    this.load.image("bg_night", "/assets/phonics-phaser/moon/bg-night.webp");
    this.load.image(
      "gangan_conductor_body",
      "/assets/gangan/gangan_conductor_body.webp"
    );
    this.load.image(
      "gangan_conductor_arm",
      "/assets/gangan/gangan_conductor_arm.webp"
    );
  }

  create() {
    const S = this;
    S.loaded = 0;
    S.departed = false;
    S.departing = false;
    S.speed = 0;
    S.chugAcc = 0;

    if (!S.textures.exists("dot")) makeCommonTextures(S);

    S.wordsList =
      S.levelConfig?.blendWords && S.levelConfig.blendWords.length > 0
        ? S.levelConfig.blendWords
        : [
            {
              word: S.levelConfig?.anchorWord || "moon",
              zh: S.levelConfig?.anchorZh || "月亮",
              blocks: S.levelConfig?.blocks || ["m", "oo", "n"],
              image: S.levelConfig?.anchorImage || "/assets/phonics/anchors/anchor-moon-transparent.png",
            },
          ];
    S.currentWordIdx = 0;
    S.wrongDropAttempts = 0;

    S.buildBackground();
    S.buildTrack();
    S.buildTrain();
    S.buildHud();

    S.input.on("pointerdown", () => audioBridge.ensure());

    S.input.on(
      "dragstart",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const crate = gameObject as DraggableCrate;
        audioBridge.pop();
        audioBridge.playLetter(crate.letter);

        S.tweens.killTweensOf([crate, crate.label]);
        crate.setScale(crate.baseScale * 1.07);
        crate.setDepth(30);
        crate.label.setDepth(31);
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
        const crate = gameObject as DraggableCrate;
        crate.x = dragX;
        crate.y = dragY;
        crate.label.setPosition(dragX, dragY - 2);
      }
    );

    S.input.on(
      "dragend",
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
      ) => {
        const crate = gameObject as DraggableCrate;
        S.onDrop(crate);
      }
    );

    // 吐蒸汽定时器
    S.steamTimer = S.time.addEvent({
      delay: 750,
      loop: true,
      callback: () => {
        if (!S.departing) S.puff(1);
      },
    });

    // 注册测试探针
    registerProbe(() => ({
      scene: "train",
      loaded: S.loaded,
      departed: S.departed,
      departing: S.departing,
      crates: S.crates.map((c) => ({
        letter: c.letter,
        x: Math.round(c.x),
        y: Math.round(c.y),
        done: !!c.done,
      })),
      beds: S.cars.map((c) => ({
        letter: c.letter,
        x: Math.round(S.train.x + c.x),
        y: Math.round(c.bedY),
      })),
    }));
  }

  private buildBackground() {
    const S = this;
    const isDay =
      S.levelConfig?.levelId === "s" ||
      S.levelConfig?.anchorWord === "sun" ||
      S.levelConfig?.sceneFamily === "day";
    // 1. 扁平风柔和双色渐变底图（白天用浅蓝渐变，夜晚用深蓝夜色）
    S.add
      .image(W / 2, H / 2, isDay ? "bg_day_gradient" : "bg_warm_gradient")
      .setDisplaySize(W, H)
      .setDepth(0);

    // 2. 满天繁星闪烁微动（数量加密至 78 颗、尺寸放大、呼吸闪烁）
    const starColors = [0xffffff, 0xfff8db, 0xfeca57, 0xe8f0fe];
    for (let i = 0; i < (isDay ? 0 : 78); i++) {
      let sx = Phaser.Math.Between(12, W - 12);
      let sy = Phaser.Math.Between(8, 310);

      // 避开天幕明月 (675, 105)、月亮车站牌 (838, 246)
      if (Phaser.Math.Distance.Between(sx, sy, 675, 105) < 70) {
        sx = Phaser.Math.Between(20, 560);
      }
      if (sx > 740 && sy > 200) {
        sx = Phaser.Math.Between(20, 720);
      }

      const isCrossStar = i < 14;
      const tex = isCrossStar ? "star" : "dot";
      const baseSz = isCrossStar
        ? Phaser.Math.Between(8, 13)
        : i % 3 === 0
        ? Phaser.Math.FloatBetween(5.5, 8.5)
        : Phaser.Math.FloatBetween(3.0, 5.5);
      const tint = Phaser.Utils.Array.GetRandom(starColors);
      const baseAlpha = Phaser.Math.FloatBetween(0.5, 0.95);

      const star = S.add
        .image(sx, sy, tex)
        .setDisplaySize(baseSz, baseSz)
        .setTint(tint)
        .setAlpha(baseAlpha)
        .setDepth(1);

      S.tweens.add({
        targets: star,
        alpha: { from: Math.max(0.25, baseAlpha * 0.4), to: 1 },
        scaleX: star.scaleX * 1.35,
        scaleY: star.scaleY * 1.35,
        duration: Phaser.Math.Between(1100, 2500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1600),
        ease: "Sine.InOut",
      });
    }

    // 2.5 天上天体（夜晚：无脸明月 + 月光晕；白天：透明太阳小盘 + 暖阳晕）
    const moonContainer = S.add.container(675, 105).setDepth(2);
    if (isDay) {
      const sunOuter = S.add.circle(0, 0, 88, 0xffd76a, 0.18);
      const sunMid = S.add.circle(0, 0, 56, 0xfeca57, 0.35);
      const sunDisc = S.add.image(0, 0, "anchor_sun").setDisplaySize(84, 84);
      moonContainer.add([sunOuter, sunMid, sunDisc]);
      S.tweens.add({
        targets: sunOuter,
        scale: { from: 0.94, to: 1.14 },
        alpha: { from: 0.12, to: 0.24 },
        duration: 2500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
      S.tweens.add({
        targets: moonContainer,
        y: 105 + 5,
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    } else {
    // 外层漫射柔和月晕
    const moonOuterGlow = S.add.circle(0, 0, 88, 0xfff2b8, 0.15);
    S.tweens.add({
      targets: moonOuterGlow,
      scale: { from: 0.94, to: 1.14 },
      alpha: { from: 0.10, to: 0.22 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    // 中层暖金明亮光晕
    const moonMidGlow = S.add.circle(0, 0, 56, 0xfce881, 0.32);
    S.tweens.add({
      targets: moonMidGlow,
      scale: { from: 0.96, to: 1.08 },
      alpha: { from: 0.24, to: 0.40 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    // 月亮主体盘（纯净暖白天体，无脸主角）
    const moonDisc = S.add.circle(0, 0, 36, 0xfffbe8, 1);
    // 月表浅浅的扁平天体斑纹（增添生动真实月光感）
    const crater1 = S.add.circle(-8, -6, 7, 0xf8e8a8, 0.45);
    const crater2 = S.add.circle(10, 8, 9, 0xf8e8a8, 0.45);
    const crater3 = S.add.circle(-6, 12, 5, 0xf8e8a8, 0.4);
    moonContainer.add([moonOuterGlow, moonMidGlow, moonDisc, crater1, crater2, crater3]);

    // 月亮微漂动画
    S.tweens.add({
      targets: moonContainer,
      y: 105 + 5,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    }

    // 3. 云朵（改小改利落，3朵云缓移，边缘利落如云非烟）
    S.clouds = [];
    [
      [140, 64, 0.72],
      [440, 42, 0.65],
      [780, 84, 0.70],
    ].forEach(([x, y, a]) => {
      const c = S.add
        .image(x as number, y as number, "cloud")
        .setAlpha(a as number)
        .setDepth(2);
      S.clouds.push(c);
    });

    // 4. 远山平铺视差层（融入柔和深蓝夜色）
    S.hillsFar = S.add
      .tileSprite(0, RAIL_Y - 96, W, 90, "hills")
      .setOrigin(0, 0)
      .setTint(isDay ? 0x9ed69a : 0x202b54)
      .setAlpha(0.65)
      .setDepth(1);
    S.hillsNear = S.add
      .tileSprite(0, RAIL_Y - 66, W, 90, "hills")
      .setOrigin(0, 0)
      .setTint(isDay ? 0x7cc47f : 0x182040)
      .setDepth(2);

    // 5. 站牌
    const sign = S.add.container(838, 268).setDepth(3);
    const pole = S.add.rectangle(0, 60, 8, 150, 0x2b3459);
    const board = S.add
      .rectangle(0, -22, 168, 52, 0x1f274a)
      .setStrokeStyle(3, 0xf7c948);
    const t1 = S.add
      .text(0, -30, isDay ? "SUN STATION" : "MOON STATION", {
        fontSize: "19px",
        fontStyle: "bold",
        color: "#f7c948",
      })
      .setOrigin(0.5);
    const t2 = S.add
      .text(0, -6, isDay ? "太 阳 车 站" : "月 亮 车 站", {
        fontSize: "14px",
        color: "#dfe6ff",
      })
      .setOrigin(0.5);
    sign.add([pole, board, t1, t2]);
    S.signBoard = board;
  }

  private buildTrack() {
    const S = this;
    const isDay =
      S.levelConfig?.levelId === "s" ||
      S.levelConfig?.anchorWord === "sun" ||
      S.levelConfig?.sceneFamily === "day";
    // 站台地面（夜晚深蓝底板 / 白天浅沙色底板）
    S.add
      .rectangle(0, RAIL_Y + 26, W, H - RAIL_Y - 26, isDay ? 0xf0e6d2 : 0x1c2444)
      .setOrigin(0, 0)
      .setDepth(3);
    S.add
      .rectangle(0, RAIL_Y + 24, W, 4, isDay ? 0xd8cbb2 : 0x34406a)
      .setOrigin(0, 0)
      .setDepth(3);

    // 道砟与枕木
    S.add
      .rectangle(0, RAIL_Y + 2, W, 26, isDay ? 0xcbbfa5 : 0x1a213e)
      .setOrigin(0, 0)
      .setDepth(3);
    S.sleepers = S.add
      .tileSprite(0, RAIL_Y + 8, W, 14, "sleeper")
      .setOrigin(0, 0)
      .setDepth(3);

    // 钢轨：金线，顶边 = RAIL_Y（轮底唯一基准）
    S.add
      .rectangle(0, RAIL_Y, W, 4, 0xf7c948)
      .setOrigin(0, 0)
      .setDepth(4);
    S.add
      .rectangle(0, RAIL_Y + 4, W, 3, 0x9c7c2d)
      .setOrigin(0, 0)
      .setDepth(4);
  }

  private buildTrain() {
    const S = this;
    S.train = S.add.container(0, 0).setDepth(10);
    S.trainBaseY = S.train.y;
    S.cars = [];
    S.carLinks = [];

    // --- 车头（程序绘制侧面蒸汽机车 + 敢敢司机） ---
    const LOCO_X = 26;
    const LOCO_W = 196;
    S.buildLoco(LOCO_X);

    S.setupWord(0);
  }

  private setupWord(idx: number) {
    const S = this;
    S.currentWordIdx = idx;
    S.loaded = 0;
    S.wrongDropAttempts = 0;
    const curWord = S.wordsList[idx];

    if (curWord.isQuiz) {
      S.showQuiz(curWord, () => {
        S.spawnCarsAndCrates(curWord);
      });
    } else {
      S.spawnCarsAndCrates(curWord);
    }
  }

  private spawnCarsAndCrates(curWord: BlendWordSpec) {
    const S = this;
    // 清理旧车厢与货箱
    S.cars.forEach((c) => c.destroy());
    S.cars = [];
    S.carLinks.forEach((l) => l.destroy());
    S.carLinks = [];
    S.crates.forEach((c) => {
      c.label?.destroy();
      c.shadow?.destroy();
      c.destroy();
    });
    S.crates = [];

    const letters = curWord.blocks;
    const LOCO_X = 26;
    const LOCO_W = 196;
    const locoRight = LOCO_X + LOCO_W;
    const carW = 118;
    const gap = 16;
    const wallTop = RAIL_Y - 78;
    const wallH = 46;
    const floorY = RAIL_Y - 36;

    for (let i = 0; i < letters.length; i++) {
      const cx = locoRight + gap + i * (carW + gap) + carW / 2;
      const car = S.add.container(cx, 0) as CargoCar;
      const gg = S.add.graphics();

      // 底盘梁
      gg.fillStyle(0x232c52, 1);
      gg.fillRoundedRect(-carW / 2, RAIL_Y - 34, carW, 12, 3);

      // 车帮
      gg.fillStyle(0x2f3a5f, 1);
      gg.fillRoundedRect(-carW / 2, wallTop, carW, wallH, 8);
      gg.lineStyle(2, 0xf7c948, 0.85);
      gg.strokeRoundedRect(-carW / 2, wallTop, carW, wallH, 8);

      // 帮顶金条
      gg.fillStyle(0xf7c948, 1);
      gg.fillRoundedRect(-carW / 2, wallTop, carW, 6, 3);

      // 竖板纹
      gg.lineStyle(2, 0x232c52, 0.5);
      [-30, 0, 30].forEach((off) =>
        gg.lineBetween(off, wallTop + 9, off, wallTop + wallH - 4)
      );

      // 厢底阴影
      gg.fillStyle(0x1a2140, 0.55);
      gg.fillRect(-carW / 2 + 7, floorY - 5, carW - 14, 5);
      car.add(gg);

      // 虚位提示字母
      const ghost = S.add
        .text(0, wallTop + 27, letters[i], {
          fontSize: "25px",
          fontStyle: "bold",
          color: "#f7c948",
        })
        .setOrigin(0.5)
        .setAlpha(0.38);
      car.add(ghost);

      // 车轮
      const wheels = [-34, 34].map((off) =>
        S.add
          .image(off, RAIL_Y - WHEEL_R, "wheel")
          .setDisplaySize(WHEEL_R * 2, WHEEL_R * 2)
      );
      wheels.forEach((w) => car.add(w));

      car.letter = letters[i];
      car.bedY = floorY - (72 * 0.8) / 2;
      car.filled = false;
      car.ghost = ghost;
      car.wheels = wheels;

      S.train.add(car);
      S.cars.push(car);

      // 车厢间连接挂钩
      if (i === 0) {
        const link0 = S.add
          .rectangle(locoRight + gap / 2, RAIL_Y - 26, gap + 4, 6, 0x9c7c2d)
          .setOrigin(0.5);
        S.train.add(link0);
        S.carLinks.push(link0);
      }
      if (i < letters.length - 1) {
        const link = S.add
          .rectangle(cx + carW / 2 + gap / 2, RAIL_Y - 26, gap + 4, 6, 0x9c7c2d)
          .setOrigin(0.5);
        S.train.add(link);
        S.carLinks.push(link);
      }
    }

    // 货物积木
    const allCrateLetters = [...curWord.blocks, ...(curWord.distractorBlocks || [])];
    const order = Phaser.Utils.Array.Shuffle([...allCrateLetters]);
    const spawnY = 498;
    const count = order.length;
    const spacing = count > 3 ? 140 : 165;
    const startX = count > 3 ? 240 : 300;

    order.forEach((letter, i) => {
      const x = startX + i * spacing;
      const shadow = S.add
        .ellipse(x, spawnY + 34, 62, 12, 0x000000, 0.3)
        .setDepth(14);
      const c = S.add
        .image(x, spawnY, "crate")
        .setDepth(15)
        .setInteractive({ useHandCursor: true }) as DraggableCrate;

      const label = S.add
        .text(x, spawnY - 2, letter, {
          fontSize: "32px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#7c4a1e",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(16);

      c.letter = letter;
      c.label = label;
      c.shadow = shadow;
      c.home = { x, y: spawnY };
      c.baseScale = 1;

      S.input.setDraggable(c);
      S.bobCrate(c, i * 170);

      S.tweens.add({
        targets: shadow,
        scaleX: 0.92,
        duration: 900 + i * 170,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });

      S.crates.push(c);
    });

    S.progressText?.setText(`货物 0 / ${curWord.blocks.length}`);
    S.wordRoundText?.setText(`第 ${S.currentWordIdx + 1} / ${S.wordsList.length} 词`);
  }

  private buildLoco(locoX: number) {
    const S = this;
    const loco = S.add.container(locoX, 0);
    S.train.add(loco);

    const DARK = 0x1b2242;
    const NAVY = 0x27325e;
    const GOLD = 0xf7c948;
    const GOLD_D = 0x9c7c2d;
    const CY = RAIL_Y - 50;

    // 1) 驾驶室背板与窗洞（柔和深蓝，与夜空/站台地面 0x1c2444 协调，告别死黑）
    const cabBack = S.add.graphics();
    cabBack.fillStyle(0x1c2444, 1);
    cabBack.fillRect(136, RAIL_Y - 137, 54, 49);
    loco.add(cabBack);

    // 2) 车体主层（标准蒸汽机车侧面：长锅炉横躺、端盖、烟囱、汽包、大动轮连杆）
    const g = S.add.graphics();

    // 车架
    g.fillStyle(DARK, 1);
    g.fillRoundedRect(4, RAIL_Y - 46, 192, 16, 4);
    g.lineStyle(2, GOLD, 0.65);
    g.lineBetween(4, RAIL_Y - 46, 196, RAIL_Y - 46);

    // 锅炉（横置长筒）
    g.fillStyle(NAVY, 1);
    g.fillRoundedRect(10, CY - 24, 120, 48, 21);
    g.lineStyle(2, GOLD, 0.85);
    g.strokeRoundedRect(10, CY - 24, 120, 48, 21);

    // 烟箱段
    g.fillStyle(DARK, 1);
    g.fillRoundedRect(10, CY - 24, 32, 48, 15);
    g.lineStyle(2, GOLD, 0.8);
    g.lineBetween(42, CY - 24, 42, CY + 24);

    // 端盖
    g.fillStyle(DARK, 1);
    g.fillEllipse(11, CY, 9, 42);
    g.lineStyle(1.5, GOLD, 0.8);
    g.strokeEllipse(11, CY, 9, 42);
    g.fillStyle(GOLD, 0.9);
    [CY - 14, CY, CY + 14].forEach((y) => g.fillCircle(11, y, 1.6));

    // 金箍
    g.fillStyle(GOLD, 0.75);
    g.fillRect(96, CY - 24, 5, 48);
    g.fillRect(120, CY - 24, 5, 48);

    // 车灯
    g.fillStyle(DARK, 1);
    g.fillRoundedRect(19, CY - 41, 17, 14, 3);
    g.lineStyle(2, GOLD, 0.9);
    g.strokeRoundedRect(19, CY - 41, 17, 14, 3);
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(20.5, CY - 34, 3.6);
    g.fillStyle(DARK, 1);
    g.fillRect(23, CY - 28, 10, 4);

    // 烟囱
    g.fillStyle(NAVY, 1);
    g.fillRect(24, CY - 52, 13, 30);
    g.lineStyle(1.5, GOLD, 0.75);
    g.lineBetween(24, CY - 52, 24, CY - 24);
    g.lineBetween(37, CY - 52, 37, CY - 24);
    g.fillTriangle(19, CY - 52, 42, CY - 52, 37, CY - 62);
    g.fillTriangle(19, CY - 52, 24, CY - 62, 37, CY - 62);
    g.fillStyle(GOLD, 1);
    g.fillEllipse(30.5, CY - 62, 23, 7);
    g.fillStyle(0x171f42, 1);
    g.fillEllipse(30.5, CY - 62, 13, 4);

    // 蒸汽包 + 沙包 + 汽笛
    g.fillStyle(GOLD, 1);
    g.fillEllipse(68, CY - 23, 30, 16);
    g.fillStyle(NAVY, 1);
    g.fillEllipse(92, CY - 22, 17, 11);
    g.lineStyle(1.5, GOLD, 0.8);
    g.strokeEllipse(92, CY - 22, 17, 11);
    g.fillStyle(GOLD, 1);
    g.fillCircle(108, CY - 20, 5.5);
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(106.5, CY - 21.5, 1.8);

    // 汽缸
    g.fillStyle(DARK, 1);
    g.fillRoundedRect(14, RAIL_Y - 40, 32, 13, 5);
    g.lineStyle(1.5, GOLD, 0.7);
    g.strokeRoundedRect(14, RAIL_Y - 40, 32, 13, 5);

    // 驾驶室围板 + 窗框 + 金星
    g.fillStyle(NAVY, 1);
    g.fillRoundedRect(134, RAIL_Y - 88, 62, 52, 6);
    g.lineStyle(2, GOLD, 0.85);
    g.strokeRoundedRect(134, RAIL_Y - 88, 62, 52, 6);
    g.strokeRect(136, RAIL_Y - 137, 54, 49);

    g.fillStyle(GOLD, 1);
    const star: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 9 : 4;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      star.push({
        x: 165 + r * Math.cos(a),
        y: RAIL_Y - 62 + r * Math.sin(a),
      });
    }
    g.fillPoints(star, true);

    // 排障器
    g.fillStyle(GOLD_D, 1);
    g.fillRect(0, RAIL_Y - 44, 7, 20);
    g.fillTriangle(0, RAIL_Y - 28, 30, RAIL_Y - 28, 2, RAIL_Y - 2);
    // 3) 敢敢司机坐姿：司机画在车厢板下层＋下沉 18px，下半身藏于星星板后，
    //    只露头＋肩＋挥手臂，不再是全身站在窗框里
    const cx = 164;
    const feetY = RAIL_Y - 70;
    const DS = 50;
    S.driver = S.add.container(0, 0);
    loco.add(S.driver);

    const body = S.add
      .image(cx, feetY, "gangan_conductor_body")
      .setOrigin(0.5, 1)
      .setDisplaySize(DS, DS);
    S.driver.add(body);

    if (S.textures.exists("gangan_conductor_arm")) {
      const topL = cx - DS / 2;
      const topT = feetY - DS;
      S.ganganArm = S.add
        .image(
          topL + CONDUCTOR_PIVOT.x * DS,
          topT + CONDUCTOR_PIVOT.y * DS,
          "gangan_conductor_arm"
        )
        .setOrigin(CONDUCTOR_PIVOT.x, CONDUCTOR_PIVOT.y)
        .setDisplaySize(DS, DS);
      S.driver.add(S.ganganArm);
    }

    S.tweens.add({
      targets: S.driver,
      y: 1.5,
      duration: 1150,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    loco.add(g);

    // 4) 车轮：前导小轮 + 两只大动轮
    S.locoWheels = [
      {
        s: S.add
          .image(24, RAIL_Y - 10, "wheel")
          .setDisplaySize(20, 20),
        r: 10,
      },
      {
        s: S.add
          .image(84, RAIL_Y - 20, "wheel")
          .setDisplaySize(40, 40),
        r: 20,
      },
      {
        s: S.add
          .image(140, RAIL_Y - 20, "wheel")
          .setDisplaySize(40, 40),
        r: 20,
      },
    ];
    S.locoWheels.forEach(({ s }) => loco.add(s));

    // 5) 连杆：挂在两只大动轮的曲柄销上
    S.rodCx = 112;
    S.rodCy = RAIL_Y - 20;
    S.rod = S.add
      .rectangle(S.rodCx + 11, S.rodCy, 74, 5, GOLD_D)
      .setOrigin(0.5);
    loco.add(S.rod);

    const pin1 = S.add.circle(S.rodCx - 28 + 11, S.rodCy, 3.5, GOLD);
    const pin2 = S.add.circle(S.rodCx + 28 + 11, S.rodCy, 3.5, GOLD);
    loco.add([pin1, pin2]);
    S.rodPins = [pin1, pin2];

    S.chimney = { x: locoX + 30, y: CY - 68 };
  }

  private buildCargo() {
    // 逻辑由 setupWord 驱动
  }

  private buildHud() {
    const S = this;
    const shadow = createHud(S, "", "");
    const currentSatiety = S.game.registry.get("satietyCount") || 4;
    S.satietyGauge = createSatietyGauge(S, 24, 52, currentSatiety);

    S.wordRoundText = S.add
      .text(W / 2, 48, `第 1 / ${S.wordsList.length} 词`, {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
        shadow,
      })
      .setOrigin(0.5, 0)
      .setDepth(40);

    S.progressText = S.add
      .text(220, 56, `货物 0 / 3`, {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#feca57",
        shadow,
      })
      .setDepth(40);

    S.waveArm(2);
  }

  // 未知词无图兜底（2026-10-27 Roger 定）：没有专属图的词不配图，宁可没图也不给错图。
  // 调用方 texKey 为 null 时只显示单词文字。
  private getWordTexture(word: string): string | null {
    const clean = word.toLowerCase().trim();
    if (clean === "sun") return "anchor_sun";
    if (clean === "sat") return "flashcard_sat";
    if (clean === "sit") return "flashcard_sit";
    if (clean === "moon") return "anchor_moon";
    return null;
  }

  // 等比适配：图片按原宽高比缩进 maxW×maxH 框内，不拉伸（sit 为 3:2 横图，硬拉正方形会压扁）
  private fitContain(img: Phaser.GameObjects.Image, maxW: number, maxH: number) {
    const src = img.texture.getSourceImage() as HTMLImageElement;
    const w = src.width || 1;
    const h = src.height || 1;
    const sc = Math.min(maxW / w, maxH / h);
    img.setDisplaySize(w * sc, h * sc);
  }

  private showQuiz(curWord: BlendWordSpec, onDone: () => void) {
    const S = this;
    const quizGroup = S.add.container(0, 0).setDepth(60);

    const mask = S.add
      .rectangle(0, 0, W, H, 0x0c1126, 0.72)
      .setOrigin(0, 0)
      .setInteractive();
    quizGroup.add(mask);

    const title = S.add
      .text(W / 2, 70, "听一听，选出正确的图！", {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    quizGroup.add(title);

    const speakerBox = S.add.container(W / 2, 125);
    const spkBg = S.add
      .circle(0, 0, 26, CANDY_PALETTE.sunshineYellow, 1)
      .setStrokeStyle(3, 0xffffff, 1)
      .setInteractive({ useHandCursor: true });
    const spkIcon = S.add
      .text(0, -2, "🔊", { fontSize: "22px" })
      .setOrigin(0.5);
    speakerBox.add([spkBg, spkIcon]);
    quizGroup.add(speakerBox);

    const playQuizSound = () => {
      audioBridge.playWord(curWord.word);
      S.tweens.add({
        targets: speakerBox,
        scale: 1.15,
        duration: 120,
        yoyo: true,
      });
    };
    spkBg.on("pointerdown", playQuizSound);

    playQuizSound();

    const opts = curWord.options || ["sit", "sat"];
    const cardW = 160;
    const cardH = 170;
    const spacing = 190;
    const startX = W / 2 - ((opts.length - 1) * spacing) / 2;

    opts.forEach((optWord, i) => {
      const cx = startX + i * spacing;
      const cy = 270;
      const card = S.add.container(cx, cy);

      const cardBg = S.add
        .rectangle(0, 0, cardW, cardH, 0x242b4d, 0.95)
        .setStrokeStyle(3.5, 0xfeca57, 0.8)
        .setInteractive({ useHandCursor: true });

      const texKey = S.getWordTexture(optWord);
      const img = texKey
        ? S.add.image(0, -20, texKey).setOrigin(0.5)
        : null;
      if (img) S.fitContain(img, 110, 110);

      const lbl = S.add
        .text(0, texKey ? 54 : 0, optWord, {
          fontSize: "22px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      card.add(img ? [cardBg, img, lbl] : [cardBg, lbl]);
      quizGroup.add(card);

      cardBg.on("pointerdown", () => {
        if (optWord === curWord.word) {
          audioBridge.jingle();
          cardBg.setStrokeStyle(4, 0x2ecc71, 1);
          S.tweens.add({
            targets: card,
            scale: 1.15,
            duration: 180,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              S.tweens.add({
                targets: quizGroup,
                alpha: 0,
                duration: 250,
                onComplete: () => {
                  quizGroup.destroy();
                  onDone();
                },
              });
            },
          });
        } else {
          audioBridge.bad();
          S.tweens.add({
            targets: card,
            x: cx - 8,
            duration: 45,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              card.setX(cx);
              playQuizSound();
            },
          });
        }
      });
    });
  }

  private celebrateCurrentWord(curWord: BlendWordSpec) {
    const S = this;
    const targetWord = curWord.word;
    audioBridge.playWord(targetWord);
    audioBridge.whistle();

    const aliveWordContainer = S.add
      .container(W / 2, RAIL_Y - 90)
      .setDepth(45)
      .setScale(0.2)
      .setAlpha(0);

    const halo = S.add.circle(0, 0, 85, 0xfeca57, 0.35);
    const texKey = S.getWordTexture(targetWord);
    const badgeImg = texKey ? S.add.image(0, 0, texKey) : null;
    if (badgeImg) S.fitContain(badgeImg, 120, 120);
    const wordLabel = S.add
      .text(0, texKey ? 56 : 0, targetWord, {
        fontSize: "26px",
        fontStyle: "bold",
        fontFamily: "monospace",
        color: "#ffffff",
        stroke: "#d35400",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    aliveWordContainer.add(badgeImg ? [halo, badgeImg, wordLabel] : [halo, wordLabel]);

    S.tweens.add({
      targets: aliveWordContainer,
      y: 160,
      scale: 1.1,
      alpha: 1,
      duration: 800,
      ease: "Back.Out(1.6)",
      onComplete: () => {
        S.tweens.add({
          targets: halo,
          scale: 1.3,
          alpha: { from: 0.45, to: 0.15 },
          duration: 500,
          yoyo: true,
          repeat: 2,
        });
      },
    });

    for (let i = 0; i < 4; i++) {
      S.time.delayedCall(i * 90, () => S.puff(1.4));
    }

    S.time.delayedCall(2000, () => {
      S.tweens.add({
        targets: aliveWordContainer,
        alpha: 0,
        y: 120,
        scale: 0.8,
        duration: 350,
        onComplete: () => {
          aliveWordContainer.destroy();
          S.setupWord(S.currentWordIdx + 1);
        },
      });
    });
  }

  private waveArm(n: number) {
    const S = this;
    if (!S.ganganArm) return;
    S.tweens.add({
      targets: S.ganganArm,
      rotation: { from: -0.25, to: 0.35 },
      duration: 260,
      yoyo: true,
      repeat: n * 2 - 1,
      ease: "Sine.InOut",
      onComplete: () => S.ganganArm?.setRotation(0),
    });
  }

  private puff(power: number) {
    const S = this;
    const cx = S.train.x + S.chimney.x;
    const cy = S.chimney.y;
    const p = S.add
      .image(cx, cy, "dot")
      .setDepth(9)
      .setAlpha(0.55)
      .setTint(0xe8ecf7)
      .setDisplaySize(13 * power, 13 * power);

    S.tweens.add({
      targets: p,
      x: p.x + 22 + S.speed * 0.05,
      y: p.y - 52 - 12 * power,
      scaleX: 3.2 * power,
      scaleY: 3.2 * power,
      alpha: 0,
      duration: 1250,
      ease: "Sine.Out",
      onComplete: () => p.destroy(),
    });
  }

  private onDrop(crate: DraggableCrate) {
    const S = this;
    crate.setScale(crate.baseScale);
    if (crate.done) return;

    // 检查落在哪节车厢上
    const car = S.cars.find(
      (c) =>
        !c.filled &&
        Math.abs(crate.x - (S.train.x + c.x)) < 66 &&
        Math.abs(crate.y - c.bedY) < 58
    );

    if (car && car.letter === crate.letter) {
      S.loadCrate(crate, car);
    } else {
      audioBridge.bad();
      S.wrongDropAttempts++;
      if (car) {
        S.tweens.add({
          targets: car,
          x: "+=5",
          duration: 45,
          yoyo: true,
          repeat: 3,
        });
      }
      if (S.wrongDropAttempts >= 2) {
        const targetCar = S.cars.find((c) => !c.filled && c.letter === crate.letter);
        if (targetCar && targetCar.ghost) {
          S.tweens.add({
            targets: targetCar.ghost,
            alpha: { from: 0.38, to: 1 },
            scale: 1.25,
            duration: 300,
            yoyo: true,
            repeat: 2,
          });
        }
      }
      S.sendHome(crate);
    }
  }

  private bobCrate(crate: DraggableCrate, delay = 0) {
    const S = this;
    S.tweens.add({
      targets: [crate, crate.label],
      y: "-=4",
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
      delay,
    });
  }

  private sendHome(crate: DraggableCrate) {
    const S = this;
    S.tweens.add({
      targets: crate,
      x: crate.home.x,
      y: crate.home.y,
      duration: 380,
      ease: "Back.Out(1.4)",
    });
    S.tweens.add({
      targets: crate.label,
      x: crate.home.x,
      y: crate.home.y - 2,
      duration: 380,
      ease: "Back.Out(1.4)",
      onComplete: () => {
        crate.setDepth(15);
        crate.label.setDepth(16);
        crate.setPosition(crate.home.x, crate.home.y);
        crate.label.setPosition(crate.home.x, crate.home.y - 2);
        S.bobCrate(crate);
      },
    });
  }

  private loadCrate(crate: DraggableCrate, car: CargoCar) {
    const S = this;
    crate.done = true;
    car.filled = true;
    S.input.setDraggable(crate, false);
    crate.disableInteractive();

    const bedX = S.train.x + car.x;
    const bedY = car.bedY;
    S.tweens.killTweensOf([crate, crate.label]);

    S.tweens.add({
      targets: [crate, crate.label],
      x: bedX,
      y: bedY,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 170,
      ease: "Quad.Out",
      onComplete: () => {
        audioBridge.thunk();

        car.add(crate);
        crate.setPosition(0, car.bedY);
        car.add(crate.label);
        crate.label.setPosition(0, car.bedY - 2);

        // 压扁回弹 + 车厢晃动
        S.tweens.add({
          targets: car,
          y: 5,
          duration: 90,
          yoyo: true,
          ease: "Quad.Out",
        });

        for (let i = 0; i < 7; i++) {
          const p = S.add
            .image(bedX, bedY + 22, "dot")
            .setDepth(20)
            .setTint(0xf7c948)
            .setDisplaySize(5, 5);
          S.tweens.add({
            targets: p,
            x: p.x + Phaser.Math.Between(-24, 24),
            y: p.y - Phaser.Math.Between(6, 20),
            alpha: 0,
            scaleX: 2.4,
            scaleY: 2.4,
            duration: 520,
            onComplete: () => p.destroy(),
          });
        }

        car.ghost.setVisible(false);
        S.loaded++;
        S.progressText.setText(`货物 ${S.loaded} / ${S.cars.length}`);
        S.waveArm(1);

        const curWord = S.wordsList[S.currentWordIdx];
        if (S.loaded >= S.cars.length) {
          if (S.currentWordIdx < S.wordsList.length - 1) {
            S.time.delayedCall(500, () => S.celebrateCurrentWord(curWord));
          } else {
            S.time.delayedCall(650, () => S.depart());
          }
        }
      },
    });

    crate.shadow.destroy();
  }

  private depart() {
    const S = this;
    if (S.departing) return;
    S.departing = true;
    S.steamTimer?.remove();
    S.tweens.killTweensOf(S.train);
    S.train.y = S.trainBaseY;

    // 饱腹度满格：5 格点亮！
    S.satietyGauge.setCount(5);

    // 1. 满格触发敢敢挥手庆祝（不开走前跳动：司机跳动会顶出窗框、看着像图片抽动）
    S.waveArm(8);

    // 2. 核心 3~5 秒「词活过来」高光动画 (moon 徽章跃然升空，绽放柔光与欢腾星光)
    const curWord = S.wordsList[S.currentWordIdx];
    const targetWord = curWord?.word || S.levelConfig?.anchor?.word || S.levelConfig?.anchorWord || "sun";
    audioBridge.playWord(targetWord);
    audioBridge.whistle();

    const aliveWordContainer = S.add
      .container(W / 2, RAIL_Y - 90)
      .setDepth(45)
      .setScale(0.2)
      .setAlpha(0);

    const halo = S.add.circle(0, 0, 85, 0xfeca57, 0.35);
    const texKey = S.getWordTexture(targetWord);
    const moonImg = texKey ? S.add.image(0, 0, texKey) : null;
    if (moonImg) S.fitContain(moonImg, 130, 130);
    const wordLabel = S.add
      .text(0, texKey ? 56 : 0, targetWord, {
        fontSize: "26px",
        fontStyle: "bold",
        fontFamily: "monospace",
        color: "#ffffff",
        stroke: "#d35400",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    aliveWordContainer.add(moonImg ? [halo, moonImg, wordLabel] : [halo, wordLabel]);

    // 词活过来动画：跃起、发光、脉动欢庆 (3.2 秒)
    S.tweens.add({
      targets: aliveWordContainer,
      y: 160,
      scale: 1.1,
      alpha: 1,
      duration: 1000,
      ease: "Back.Out(1.6)",
      onComplete: () => {
        // 光晕呼吸与闪光
        S.tweens.add({
          targets: halo,
          scale: 1.35,
          alpha: { from: 0.45, to: 0.15 },
          duration: 600,
          yoyo: true,
          repeat: 3,
        });

        // 喷射星彩
        for (let i = 0; i < 16; i++) {
          const st = S.add
            .image(W / 2, 160, "star")
            .setDepth(46)
            .setTint(CANDY_PALETTE.sunshineYellow)
            .setDisplaySize(Phaser.Math.Between(10, 20), Phaser.Math.Between(10, 20));
          S.tweens.add({
            targets: st,
            x: W / 2 + Phaser.Math.Between(-160, 160),
            y: 160 + Phaser.Math.Between(-110, 110),
            alpha: 0,
            rotation: 2.5,
            duration: Phaser.Math.Between(700, 1200),
            onComplete: () => st.destroy(),
          });
        }
      },
    });

    for (let i = 0; i < 5; i++) {
      S.time.delayedCall(i * 90, () => S.puff(1.7));
    }

    S.tweens.add({
      targets: S.signBoard,
      alpha: 0.55,
      duration: 130,
      yoyo: true,
      repeat: 5,
    });

    // 3.5 秒后小火车加速驶出
    S.time.delayedCall(3400, () => {
      const dist = 1250;
      const tweenObj = { d: 0 };

      S.tweens.add({
        targets: tweenObj,
        d: dist,
        duration: 4300,
        ease: "Cubic.In",
        onUpdate: () => {
          const prev = S.train.x;
          S.train.x = -tweenObj.d;
          S.speed =
            Math.abs(S.train.x - prev) /
            (S.game.loop.delta / 1000 || 0.016);

          // 轮子旋转
          const v = S.speed;
          S.cars.forEach((c) =>
            c.wheels.forEach((w) => {
              w.rotation -= (v * 0.016) / WHEEL_R;
            })
          );
          S.locoWheels.forEach(({ s, r }) => {
            s.rotation -= (v * 0.016) / r;
          });

          // 连杆做圆周运动
          if (S.rod && S.locoWheels[1]) {
            const th = S.locoWheels[1].s.rotation;
            const ox = Math.cos(th) * 11;
            const oy = Math.sin(th) * 11;
            S.rod.setPosition(S.rodCx + ox, S.rodCy + oy);
            S.rodPins[0]?.setPosition(84 + ox, S.rodCy + oy);
            S.rodPins[1]?.setPosition(140 + ox, S.rodCy + oy);
          }

          // 轰鸣声与烟雾
          S.chugAcc += v * 0.016;
          if (S.chugAcc > 90) {
            S.chugAcc = 0;
            audioBridge.chug();
            S.puff(1.25);
          }

          // 高速速度线
          if (v > 330 && Math.random() < 0.5) {
            const ln = S.add
              .rectangle(
                S.train.x + Phaser.Math.Between(60, 760),
                Phaser.Math.Between(300, 440),
                Phaser.Math.Between(40, 90),
                3,
                0xffffff,
                0.35
              )
              .setDepth(8);
            S.tweens.add({
              targets: ln,
              x: ln.x + 190,
              alpha: 0,
              duration: 260,
              onComplete: () => ln.destroy(),
            });
          }

          // 高速微震
          S.train.y =
            S.trainBaseY + (v > 260 ? Phaser.Math.Between(-1, 1) : 0);
        },
        onComplete: () => {
          S.departed = true;
          S.speed = 0;
          audioBridge.jingle();

          // 触发关卡完成回调（由 PhaserLevel 接管奖励收集册展示）
          const finishFn = S.onLevelFinished || S.game.registry.get("onLevelFinished");
          finishFn?.();
        },
      });
    });
  }

  update() {
    const S = this;
    S.clouds.forEach((c, i) => {
      c.x -= 0.06 + i * 0.02 + (S.departing ? S.speed * 0.0012 : 0);
      if (c.x < -60) c.x = W + 60;
    });
  }
}
