import Phaser from "phaser";
import { audioBridge } from "../audio";

export const W = 960;
export const H = 540;
export const RAIL_Y = 452;
export const WHEEL_R = 14;

// 招手敢敢骨骼拆件参数（与产品同一枢轴与画布比）
export const WAVE_ASPECT = 0.7036;
export const WAVE_PIVOT = { x: 0.6804, y: 0.5436 };

// 车长敢敢骨骼拆件参数
export const CONDUCTOR_ASPECT = 1.0;
export const CONDUCTOR_PIVOT = { x: 0.6367, y: 0.5273 };

// 扁平风规范配色：5-6个暖色 + 1个湖蓝
export const CANDY_PALETTE = {
  coralPink: 0xff6b81,     // 暖珊瑚粉
  warmOrange: 0xff9f43,    // 暖活力橙
  sunshineYellow: 0xfeca57,// 糖果明黄
  peachRose: 0xff7675,     // 柔桃红
  amberGold: 0xf7c948,     // 琥珀暖黄
  creamyWhite: 0xffffff,   // 纯白描边
  lakeBlue: 0x0abde3,      // 湖蓝
  cardBg: 0x242b4d,        // 卡片底色
  deepBase: 0x1a213d,      // 地面深基底
};

export interface ProbeState {
  scene: string;
  fed?: number;
  progress?: number;
  asleep?: boolean;
  loaded?: number;
  departed?: boolean;
  departing?: boolean;
  moon?: { x: number; y: number };
  jellies?: Array<{ letter: string; x: number; y: number }>;
  crates?: Array<{ letter: string; x: number; y: number; done: boolean }>;
  beds?: Array<{ letter: string; x: number; y: number }>;
}

declare global {
  interface Window {
    __phaserProbe?: () => ProbeState;
    __probe?: () => ProbeState;
  }
}

export function registerProbe(fn: () => ProbeState) {
  window.__phaserProbe = fn;
  window.__probe = fn;
}

// 统一动效：挤压回弹 (Juice)
export function squashRebound(
  S: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  onComplete?: () => void
) {
  S.tweens.add({
    targets: target,
    scaleX: 1.09,
    scaleY: 0.91,
    duration: 100,
    yoyo: true,
    ease: "Quad.Out",
    onComplete: () => {
      onComplete?.();
    },
  });
}

// ---------- 运行时程序化纹理 ----------
export function makeCommonTextures(S: Phaser.Scene) {
  const g = S.make.graphics({ x: 0, y: 0 }, false);

  // 1. 软圆点（粒子/高光共用）
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 15);
  g.generateTexture("dot", 32, 32);

  // 2. 云朵（改小改利落，圆润饱满多层轮廓，一眼就是云不是烟）
  g.clear();
  g.fillStyle(0xffffff, 0.95);
  // 底部平整药丸体基底
  g.fillRoundedRect(6, 14, 64, 16, 8);
  // 三个饱满圆弧顶峰
  g.fillCircle(38, 14, 13);
  g.fillCircle(24, 17, 10);
  g.fillCircle(52, 18, 9);
  // 底部柔和灰蓝反光阴影边（利落边缘感，告别烟雾模糊感）
  g.fillStyle(0xd5e1f5, 0.45);
  g.fillRoundedRect(10, 24, 56, 5, 2.5);
  g.generateTexture("cloud", 76, 36);

  // 3. 山丘剪影（扁平双曲山脊）
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.beginPath();
  g.moveTo(0, 90);
  g.lineTo(0, 55);
  g.lineTo(90, 20);
  g.lineTo(180, 55);
  g.lineTo(300, 8);
  g.lineTo(420, 50);
  g.lineTo(480, 38);
  g.lineTo(480, 90);
  g.closePath();
  g.fillPath();
  g.generateTexture("hills", 480, 90);

  // 4. 五角星
  g.clear();
  g.fillStyle(0xffffff, 1);
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 15 : 6.5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: 16 + r * Math.cos(a), y: 16 + r * Math.sin(a) });
  }
  g.fillPoints(pts, true);
  g.generateTexture("star", 32, 32);

  // 5. 扁平糖果瓷砖（粗圆角 + 3-4px 纯白描边，符合 P0 扁平风规范）
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(3, 3, 64, 64, 16);
  g.lineStyle(4, 0xffffff, 1);
  g.strokeRoundedRect(2, 2, 66, 66, 16);
  // 糖果顶部柔和内反光
  g.fillStyle(0xffffff, 0.45);
  g.fillRoundedRect(8, 7, 54, 14, 7);
  g.generateTexture("candy_tile", 70, 70);

  // 兼容旧名称 jelly
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(3, 3, 58, 58, 14);
  g.lineStyle(3.5, 0xffffff, 1);
  g.strokeRoundedRect(2, 2, 60, 60, 14);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(8, 6, 48, 12, 6);
  g.generateTexture("jelly", 64, 64);

  // 6. 木质货箱（扁平风粗圆角 + 白描边贴纸外缘）
  g.clear();
  g.fillStyle(0xcc8e4b, 1);
  g.fillRoundedRect(3, 3, 66, 66, 12);
  g.lineStyle(3.5, 0xffffff, 1);
  g.strokeRoundedRect(2, 2, 68, 68, 12);
  g.fillStyle(0xb57836, 1);
  g.fillRect(5, 24, 62, 5);
  g.fillRect(5, 46, 62, 5);
  g.lineStyle(4, 0x935824, 0.8);
  g.lineBetween(8, 62, 62, 8);
  g.generateTexture("crate", 72, 72);

  // 7. 车轮（金属轮圈 + 辐条）
  g.clear();
  g.fillStyle(0x1b2242, 1);
  g.fillCircle(16, 16, 15);
  g.lineStyle(3, 0xf7c948, 1);
  g.strokeCircle(16, 16, 13);
  g.lineStyle(3, 0xf7c948, 0.9);
  g.lineBetween(16, 4, 16, 28);
  g.lineBetween(4, 16, 28, 16);
  g.lineBetween(7, 7, 25, 25);
  g.fillStyle(0xf7c948, 1);
  g.fillCircle(16, 16, 4);
  g.generateTexture("wheel", 32, 32);

  // 8. 枕木
  g.clear();
  g.fillStyle(0x4a3b2c, 1);
  g.fillRoundedRect(2, 0, 20, 14, 3);
  g.generateTexture("sleeper", 48, 14);

  // 9. 柔和双色渐变背景纹理 (月光照亮的柔和深蓝夜色到收柔和的暖意地平线)
  g.clear();
  // 绘制 960x540 平滑色带
  const steps = 48;
  const colTop = Phaser.Display.Color.ValueToColor(0x203c78); // 柔和深蓝夜色 (月光夜空，星星鲜明)
  const colBottom = Phaser.Display.Color.ValueToColor(0x9e666c); // 柔和温润暖意 (收柔和，不抢月光)
  for (let s = 0; s < steps; s++) {
    const t = s / steps;
    const cur = Phaser.Display.Color.Interpolate.ColorWithColor(
      colTop,
      colBottom,
      steps,
      s
    );
    const colorHex = Phaser.Display.Color.GetColor(cur.r, cur.g, cur.b);
    g.fillStyle(colorHex, 1);
    g.fillRect(0, (H / steps) * s, W, H / steps + 2);
  }
  g.generateTexture("bg_warm_gradient", W, H);

  g.destroy();
}

// ---------- 场景背景装配与微动环境（扁平风：柔和双色渐变 + 暖色站台） ----------
export interface SceneWorld {
  bg: Phaser.GameObjects.Image;
  clouds: Phaser.GameObjects.Image[];
  fireflies: Phaser.GameObjects.Image[];
  driftClouds: () => void;
}

export function buildSceneWorld(S: Phaser.Scene, groundY = 470): SceneWorld {
  // 1. 扁平风柔和双色渐变底图
  const bg = S.add
    .image(W / 2, H / 2, "bg_warm_gradient")
    .setDisplaySize(W, H)
    .setDepth(0);

  // 2. 环境微动 1：满天繁星闪烁叠加层（复用 yoyo 呼吸动画，数量加密至 76 颗、尺寸放大、亮度提升）
  const starColors = [0xffffff, 0xfff8db, 0xfeca57, 0xe8f0fe];
  for (let i = 0; i < 76; i++) {
    let sx = Phaser.Math.Between(16, W - 16);
    let sy = Phaser.Math.Between(10, 320);

    // 避开游戏主体：投喂幕月亮 (688, 156)、摇篮曲月亮 (472, 186)、敢敢主持 (130, 460)
    if (Phaser.Math.Distance.Between(sx, sy, 688, 156) < 120) {
      sx = Phaser.Math.Between(20, 520);
    }
    if (Phaser.Math.Distance.Between(sx, sy, 472, 186) < 100) {
      sx = Phaser.Math.Between(20, 350);
    }
    if (sx < 190 && sy > 280) {
      sy = Phaser.Math.Between(10, 240);
    }

    const isCrossStar = i < 12;
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

  // 3. 环境微动 2：利落小云朵缓移（数量不增加，边缘清晰利落）
  const clouds: Phaser.GameObjects.Image[] = [];
  [
    [140, 56, 0.75],
    [480, 38, 0.68],
    [780, 68, 0.72],
  ].forEach(([x, y, a]) => {
    const c = S.add
      .image(x as number, y as number, "cloud")
      .setAlpha(a as number)
      .setDepth(2);
    clouds.push(c);
  });

  // 4. 环境微动 3：萤火虫微漂
  const fireflies: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < 7; i++) {
    const fx = Phaser.Math.Between(40, W - 40);
    const fy = Phaser.Math.Between(170, groundY - 20);
    const f = S.add
      .image(fx, fy, "dot")
      .setDisplaySize(4.5, 4.5)
      .setTint(0xfeca57)
      .setAlpha(0.65)
      .setDepth(4);

    const wander = () => {
      if (!f.active) return;
      S.tweens.add({
        targets: f,
        x: f.x + Phaser.Math.Between(-40, 40),
        y: f.y + Phaser.Math.Between(-24, 24),
        alpha: Phaser.Math.FloatBetween(0.3, 0.9),
        duration: Phaser.Math.Between(1900, 3100),
        ease: "Sine.InOut",
        onComplete: wander,
      });
    };
    wander();
    fireflies.push(f);
  }

  // 5. 暖色站台光晕呼吸
  const lampGlow = S.add
    .circle(180, groundY - 30, 80, 0xfeca57, 0.15)
    .setDepth(3);
  S.tweens.add({
    targets: lampGlow,
    alpha: { from: 0.1, to: 0.22 },
    scale: { from: 0.96, to: 1.08 },
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  // 6. 扁平风圆角地面层（柔和深蓝底板配合月光夜色 + 琥珀描边）
  S.add
    .rectangle(0, groundY, W, H - groundY, 0x242a4a, 0.95)
    .setOrigin(0, 0)
    .setDepth(3);
  S.add
    .rectangle(0, groundY, W, 4, 0xfeca57, 0.8)
    .setOrigin(0, 0)
    .setDepth(3);

  const driftClouds = () => {
    clouds.forEach((c, i) => {
      c.x -= 0.06 + i * 0.02;
      if (c.x < -60) c.x = W + 60;
    });
  };

  return { bg, clouds, fireflies, driftClouds };
}

// ---------- 招手敢敢主持（带 3-4px 白描边贴纸效果） ----------
export interface GanganWaveApi {
  box: Phaser.GameObjects.Container;
  arm: Phaser.GameObjects.Image | null;
  wave: (n?: number) => void;
  hop: () => void;
  celebrate: () => void;
}

export function makeGanganWave(
  S: Phaser.Scene,
  x: number,
  feetY: number,
  width: number
): GanganWaveApi {
  const height = width / WAVE_ASPECT;
  const box = S.add.container(x, feetY);

  // 敢敢白描边贴纸效果：背后衬托一层柔和白圆角底座 / 白边轮廓
  const stickerBacking = S.add
    .ellipse(0, -height * 0.48, width * 1.06, height * 1.04, 0xffffff, 0.35)
    .setDepth(0);
  box.add(stickerBacking);

  const body = S.add
    .image(0, 0, "gangan_wave_body")
    .setOrigin(0.5, 1)
    .setDisplaySize(width, height)
    .setDepth(1);
  box.add(body);

  let arm: Phaser.GameObjects.Image | null = null;
  if (S.textures.exists("gangan_wave_arm")) {
    arm = S.add
      .image(
        -width / 2 + WAVE_PIVOT.x * width,
        -height + WAVE_PIVOT.y * height,
        "gangan_wave_arm"
      )
      .setOrigin(WAVE_PIVOT.x, WAVE_PIVOT.y)
      .setDisplaySize(width, height)
      .setDepth(2);
    box.add(arm);
  }

  const api: GanganWaveApi = {
    box,
    arm,
    wave(n = 2) {
      if (!arm) return;
      S.tweens.add({
        targets: arm,
        rotation: { from: -0.22, to: 0.32 },
        duration: 240,
        yoyo: true,
        repeat: n * 2 - 1,
        ease: "Sine.InOut",
        onComplete: () => arm?.setRotation(0),
      });
    },
    hop() {
      S.tweens.add({
        targets: box,
        y: feetY - 18,
        duration: 150,
        yoyo: true,
        ease: "Quad.Out",
      });
    },
    celebrate() {
      // 敢敢大表演：连续兴奋跳跃 + 手臂大幅度挥舞 + 欢庆彩带
      S.tweens.add({
        targets: box,
        y: feetY - 32,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 200,
        yoyo: true,
        repeat: 4,
        ease: "Back.Out(2)",
      });
      if (arm) {
        S.tweens.add({
          targets: arm,
          rotation: { from: -0.45, to: 0.55 },
          duration: 160,
          yoyo: true,
          repeat: 9,
          ease: "Sine.InOut",
          onComplete: () => arm?.setRotation(0),
        });
      }
    },
  };

  api.wave(2);
  return api;
}

// ---------- 饱腹度 5 格跨三幕累积 HUD ----------
export interface SatietyGaugeApi {
  container: Phaser.GameObjects.Container;
  setCount: (count: number) => void;
  getCount: () => number;
}

export function createSatietyGauge(
  S: Phaser.Scene,
  x: number,
  y: number,
  initialCount = 0
): SatietyGaugeApi {
  const container = S.add.container(x, y).setDepth(42);

  // 背景框
  const bg = S.add
    .rectangle(0, 0, 190, 32, 0x1f2648, 0.85)
    .setStrokeStyle(2, 0xfeca57, 0.6)
    .setOrigin(0, 0.5);
  container.add(bg);

  // 心形图标文本
  const heart = S.add
    .text(12, 0, "💖 饱腹度", {
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ff7675",
    })
    .setOrigin(0, 0.5);
  container.add(heart);

  // 5 个能量小格子
  const cells: Phaser.GameObjects.Rectangle[] = [];
  const startX = 82;
  for (let i = 0; i < 5; i++) {
    const cell = S.add
      .rectangle(startX + i * 16, 0, 12, 16, 0x36406e)
      .setStrokeStyle(1.5, 0xfeca57, 0.8)
      .setOrigin(0, 0.5);
    cells.push(cell);
    container.add(cell);
  }

  // 数字指示
  const countText = S.add
    .text(168, 0, `${initialCount}/5`, {
      fontSize: "12px",
      fontStyle: "bold",
      color: "#feca57",
    })
    .setOrigin(0, 0.5);
  container.add(countText);

  let current = initialCount;

  const updateDisplay = (c: number) => {
    current = Math.max(0, Math.min(5, c));
    S.game.registry.set("satietyCount", current);
    countText.setText(`${current}/5`);

    cells.forEach((cell, idx) => {
      if (idx < current) {
        cell.setFillStyle(0xfeca57, 1);
        cell.setStrokeStyle(1.5, 0xffffff, 1);
      } else {
        cell.setFillStyle(0x272e50, 0.6);
        cell.setStrokeStyle(1.5, 0x7683b3, 0.6);
      }
    });
  };

  updateDisplay(initialCount);

  return {
    container,
    setCount(n: number) {
      if (n > current) {
        audioBridge.pop();
        // 刚被点亮的格子弹性回弹
        const targetCell = cells[n - 1];
        if (targetCell) {
          S.tweens.add({
            targets: targetCell,
            scaleY: 1.4,
            duration: 140,
            yoyo: true,
            ease: "Quad.Out",
          });
        }
      }
      updateDisplay(n);
    },
    getCount() {
      return current;
    },
  };
}

// ---------- 二选一掉落弹窗（无对错选择，影响收集册掉落物） ----------
export function showChoiceDropModal(
  S: Phaser.Scene,
  options: {
    prompt: string;
    choices: Array<{ id: string; name: string; icon: string }>;
    onSelected: (chosen: { id: string; name: string; icon: string }) => void;
  }
) {
  // 半透明深色遮罩
  const blocker = S.add
    .rectangle(0, 0, W, H, 0x0a0f26, 0.65)
    .setOrigin(0, 0)
    .setDepth(60)
    .setInteractive();

  const modalBox = S.add
    .container(W / 2, H / 2)
    .setDepth(61)
    .setScale(0.8)
    .setAlpha(0);

  // 弹窗底板（粗圆角 + 4px 亮白描边）
  const modalBg = S.add
    .rectangle(0, 0, 480, 260, 0x222a4d, 0.96)
    .setStrokeStyle(4, 0xffffff);

  // 敢敢提问标题
  const title = S.add
    .text(0, -82, `🐾 敢敢问：${options.prompt}`, {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#feca57",
      padding: { top: 6, bottom: 6 },
    })
    .setOrigin(0.5);

  const sub = S.add
    .text(0, -48, "点选你喜欢的配菜，它会装进你的手账哦！", {
      fontSize: "14px",
      color: "#dfe6ff",
    })
    .setOrigin(0.5);

  modalBox.add([modalBg, title, sub]);

  // 渲染两个无对错卡片
  options.choices.slice(0, 2).forEach((c, idx) => {
    const cardX = idx === 0 ? -110 : 110;
    const cardY = 32;

    const card = S.add
      .rectangle(cardX, cardY, 170, 110, 0x2e3863)
      .setStrokeStyle(3, 0xfeca57)
      .setInteractive({ useHandCursor: true });

    const icon = S.add
      .text(cardX, cardY - 16, c.icon, {
        fontSize: "40px",
      })
      .setOrigin(0.5);

    const name = S.add
      .text(cardX, cardY + 28, c.name, {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    card.on("pointerover", () => {
      card.setFillStyle(0x3e4b85);
      card.setScale(1.04);
      icon.setScale(1.08);
    });
    card.on("pointerout", () => {
      card.setFillStyle(0x2e3863);
      card.setScale(1);
      icon.setScale(1);
    });

    card.on("pointerdown", () => {
      audioBridge.pop();
      squashRebound(S, [card, icon, name], () => {
        // 保存选择到 registry
        S.game.registry.set("selectedDrop", c);
        S.tweens.add({
          targets: modalBox,
          alpha: 0,
          scale: 0.8,
          duration: 200,
          onComplete: () => {
            blocker.destroy();
            modalBox.destroy();
            options.onSelected(c);
          },
        });
      });
    });

    modalBox.add([card, icon, name]);
  });

  S.tweens.add({
    targets: modalBox,
    alpha: 1,
    scale: 1,
    duration: 280,
    ease: "Back.Out(1.4)",
  });
}

// ---------- 月亮样板控制器（锚定图本尊 + 动态嘴部与眼皮） ----------
export interface MoonController {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
  mouth: Phaser.GameObjects.Ellipse;
  blushL: Phaser.GameObjects.Arc;
  blushR: Phaser.GameObjects.Arc;
  lidL?: Phaser.GameObjects.Rectangle;
  lidR?: Phaser.GameObjects.Rectangle;
  closedEyes?: Phaser.GameObjects.Graphics;
  openMouth: (open: boolean) => void;
  eatFeedback: () => void;
  shakeNo: () => void;
  setSleepProgress?: (pct: number) => void;
  setAsleep?: () => void;
}

export function createInteractiveMoon(
  S: Phaser.Scene,
  x: number,
  y: number,
  options: { isLullaby?: boolean; displaySize?: number } = {}
): MoonController {
  const sz = options.displaySize || 172;
  const container = S.add.container(x, y).setDepth(10);

  // 1. 柔和多层月光光晕（月光漫射，照亮夜空）
  // 外层宽广柔和月晕（漫射光照亮周围深蓝夜空）
  const outerGlow = S.add.circle(0, 0, sz * 0.96, 0xfff3be, 0.14);
  S.tweens.add({
    targets: outerGlow,
    scale: { from: 0.94, to: 1.14 },
    alpha: { from: 0.08, to: 0.18 },
    duration: 2500,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  // 中层明亮暖金光晕
  const glow = S.add.circle(0, 0, sz * 0.65, 0xfce881, 0.28);
  S.tweens.add({
    targets: glow,
    scale: { from: 0.96, to: 1.10 },
    alpha: { from: 0.20, to: 0.36 },
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  container.add([outerGlow, glow]);

  // 2. 现有锚定图本尊（保留原有锚定图，硬约束）
  const sprite = S.add
    .image(0, 0, "anchor_moon")
    .setDisplaySize(sz, sz)
    .setOrigin(0.5, 0.5);
  container.add(sprite);

  // 3. 腮红增强层（吃食或满足时加深）
  const blushScale = sz / 1600;
  const blushL = S.add
    .circle(-306 * blushScale, 45 * blushScale, 18 * blushScale, 0xf28b82, 0)
    .setDepth(11);
  const blushR = S.add
    .circle(115 * blushScale, 45 * blushScale, 18 * blushScale, 0xf28b82, 0)
    .setDepth(11);
  container.add([blushL, blushR]);

  // 4. 张嘴开合椭圆
  const mouthX = -152 * blushScale;
  const mouthY = 24 * blushScale;
  const mouthW = 54 * (sz / 172);
  const mouthH = 30 * (sz / 172);
  const mouth = S.add
    .ellipse(mouthX, mouthY, mouthW, mouthH, 0x3d1e12, 1)
    .setStrokeStyle(2.5, 0xd99b43, 1)
    .setScale(1, 0.15)
    .setDepth(11);
  container.add(mouth);

  let lidL: Phaser.GameObjects.Rectangle | undefined;
  let lidR: Phaser.GameObjects.Rectangle | undefined;
  let closedEyes: Phaser.GameObjects.Graphics | undefined;

  if (options.isLullaby) {
    const eyeLX = -306 * blushScale;
    const eyeLY = -65 * blushScale;
    const eyeRX = 64 * blushScale;
    const eyeRY = -70 * blushScale;
    const eyeW = 38 * blushScale;
    const eyeH = 26 * blushScale;

    lidL = S.add
      .rectangle(eyeLX, eyeLY - eyeH / 2, eyeW, eyeH, 0xf7d27e)
      .setOrigin(0.5, 0)
      .setScale(1, 0)
      .setDepth(12);
    lidR = S.add
      .rectangle(eyeRX, eyeRY - eyeH / 2, eyeW, eyeH, 0xf7d27e)
      .setOrigin(0.5, 0)
      .setScale(1, 0)
      .setDepth(12);

    closedEyes = S.add.graphics().setDepth(13);
    closedEyes.lineStyle(3, 0x3d1e12, 1);
    closedEyes.beginPath();
    closedEyes.arc(eyeLX, eyeLY + 2, 9, Math.PI * 0.15, Math.PI * 0.85, false);
    closedEyes.strokePath();
    closedEyes.beginPath();
    closedEyes.arc(eyeRX, eyeRY + 2, 9, Math.PI * 0.15, Math.PI * 0.85, false);
    closedEyes.strokePath();
    closedEyes.setVisible(false);

    container.add([lidL, lidR, closedEyes]);
  }

  // 基础浮动动画
  S.tweens.add({
    targets: container,
    y: y + 8,
    duration: 1900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  const controller: MoonController = {
    container,
    sprite,
    glow,
    mouth,
    blushL,
    blushR,
    lidL,
    lidR,
    closedEyes,
    openMouth(open: boolean) {
      S.tweens.killTweensOf(mouth);
      mouth.setScale(1, open ? 1.05 : 0.15);
    },
    eatFeedback() {
      S.tweens.add({
        targets: mouth,
        scaleY: 0.1,
        duration: 100,
        yoyo: true,
        repeat: 1,
      });
      S.tweens.add({
        targets: container,
        scaleX: 1.08,
        scaleY: 0.94,
        duration: 130,
        yoyo: true,
        ease: "Quad.Out",
      });
      S.tweens.add({
        targets: [blushL, blushR],
        alpha: 0.65,
        duration: 250,
        yoyo: true,
      });
    },
    shakeNo() {
      const baseX = container.x;
      S.tweens.add({
        targets: container,
        x: baseX - 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => container.setX(baseX),
      });
    },
    setSleepProgress(pct: number) {
      if (lidL && lidR) {
        const cover = Phaser.Math.Clamp(pct / 100, 0, 1);
        lidL.setScale(1, cover);
        lidR.setScale(1, cover);
      }
    },
    setAsleep() {
      if (lidL && lidR && closedEyes) {
        lidL.setVisible(false);
        lidR.setVisible(false);
        closedEyes.setVisible(true);
      }
    },
  };

  return controller;
}

// ---------- 幕间通关收尾面板 ----------
export function showCompletionPanel(
  S: Phaser.Scene,
  {
    title,
    sub,
    btnText,
    onBtn,
  }: {
    title: string;
    sub: string;
    btnText: string;
    onBtn: () => void;
  }
) {
  S.add.rectangle(0, 0, W, H, 0x0d1226, 0.45).setOrigin(0, 0).setDepth(50);
  const panel = S.add
    .container(W / 2, H / 2 - 16)
    .setDepth(51)
    .setScale(0.7)
    .setAlpha(0);

  const bg = S.add
    .rectangle(0, 0, 540, 228, 0x232c52)
    .setStrokeStyle(3.5, 0xf7c948);
  const t1 = S.add
    .text(0, -72, title, {
      fontSize: "30px",
      fontStyle: "bold",
      color: "#ffffff",
      padding: { top: 12, bottom: 4 },
    })
    .setOrigin(0.5);
  const t2 = S.add
    .text(0, -26, sub, { fontSize: "18px", color: "#f7c948" })
    .setOrigin(0.5);

  const btn = S.add
    .rectangle(0, 52, 280, 52, 0xf7c948)
    .setStrokeStyle(3, 0xffffff)
    .setInteractive({ useHandCursor: true });
  const bt = S.add
    .text(0, 52, btnText, {
      fontSize: "20px",
      fontStyle: "bold",
      color: "#232c52",
    })
    .setOrigin(0.5);

  btn.on("pointerdown", () => {
    audioBridge.pop();
    onBtn();
  });

  panel.add([bg, t1, t2, btn, bt]);
  S.tweens.add({
    targets: panel,
    scale: 1,
    alpha: 1,
    duration: 320,
    ease: "Back.Out(1.6)",
  });

  for (let i = 0; i < 12; i++) {
    const st = S.add
      .image(W / 2, H / 2 - 16, "star")
      .setDepth(52)
      .setTint(0xf7c948)
      .setDisplaySize(
        Phaser.Math.Between(10, 18),
        Phaser.Math.Between(10, 18)
      );
    S.tweens.add({
      targets: st,
      x: W / 2 + Phaser.Math.Between(-270, 270),
      y: H / 2 - 16 + Phaser.Math.Between(-140, 140),
      alpha: 0,
      rotation: 2,
      duration: Phaser.Math.Between(500, 950),
      onComplete: () => st.destroy(),
    });
  }
}

// ---------- 顶部 HUD ----------
export function createHud(S: Phaser.Scene, title: string, stageText: string) {
  const shadow = {
    offsetX: 0,
    offsetY: 1,
    color: "#000000",
    blur: 4,
    fill: true,
  };
  S.add
    .text(24, 18, title, {
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffffff",
      shadow,
    })
    .setDepth(40);
  S.add
    .text(W - 24, 20, stageText, {
      fontSize: "15px",
      color: "#feca57",
      shadow,
    })
    .setOrigin(1, 0)
    .setDepth(40);
  return shadow;
}
