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

// ---------- 运行时程序化纹理 ----------
export function makeCommonTextures(S: Phaser.Scene) {
  const g = S.make.graphics({ x: 0, y: 0 }, false);

  // 1. 软圆点（粒子/高光共用）
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(16, 16, 15);
  g.generateTexture("dot", 32, 32);

  // 2. 云朵
  g.clear();
  g.fillStyle(0xffffff, 0.9);
  g.fillEllipse(50, 26, 88, 30);
  g.fillEllipse(28, 32, 46, 20);
  g.fillEllipse(74, 32, 52, 22);
  g.generateTexture("cloud", 110, 48);

  // 3. 山丘剪影（平铺层）
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

  // 5. 软糖果冻块（白色底，运行时 tint 染色）
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(1, 1, 52, 52, 13);
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(19, 15, 24, 12);
  g.fillStyle(0x000000, 0.1);
  g.fillRoundedRect(1, 38, 52, 15, 8);
  g.generateTexture("jelly", 54, 54);

  // 6. 木质货箱（火车幕用）
  g.clear();
  g.fillStyle(0xb57e46, 1);
  g.fillRoundedRect(0, 0, 72, 72, 8);
  g.fillStyle(0xa06a35, 1);
  g.fillRect(0, 22, 72, 4);
  g.fillRect(0, 46, 72, 4);
  g.lineStyle(5, 0x8a5a2b, 1);
  g.strokeRoundedRect(2, 2, 68, 68, 8);
  g.lineStyle(6, 0x9c6a34, 0.85);
  g.lineBetween(6, 66, 66, 6);
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

  g.destroy();
}

// ---------- 场景背景装配与微动环境 ----------
export interface SceneWorld {
  bg: Phaser.GameObjects.Image;
  clouds: Phaser.GameObjects.Image[];
  fireflies: Phaser.GameObjects.Image[];
  driftClouds: () => void;
}

export function buildSceneWorld(S: Phaser.Scene, groundY = 470): SceneWorld {
  // 1. 精致黏土风夜空插画底图
  const bg = S.add
    .image(W / 2, H / 2, "bg_night")
    .setDisplaySize(W, H)
    .setDepth(0);

  // 2. 环境微动 1：星光闪烁叠加层（微光呼吸）
  for (let i = 0; i < 35; i++) {
    const sx = Phaser.Math.Between(12, W - 12);
    const sy = Phaser.Math.Between(10, 220);
    const sz = Phaser.Math.FloatBetween(2, 4.5);
    const star = S.add
      .image(sx, sy, "dot")
      .setDisplaySize(sz, sz)
      .setTint(0xfff7cf)
      .setAlpha(Phaser.Math.FloatBetween(0.2, 0.8))
      .setDepth(1);

    S.tweens.add({
      targets: star,
      alpha: { from: 0.15, to: 0.95 },
      scaleX: sz * 1.3,
      scaleY: sz * 1.3,
      duration: Phaser.Math.Between(1200, 2600),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 1800),
      ease: "Sine.InOut",
    });
  }

  // 3. 环境微动 2：云影缓移
  const clouds: Phaser.GameObjects.Image[] = [];
  [
    [140, 50, 0.22],
    [480, 32, 0.18],
    [780, 70, 0.25],
  ].forEach(([x, y, a]) => {
    const c = S.add
      .image(x as number, y as number, "cloud")
      .setAlpha(a as number)
      .setDepth(2);
    clouds.push(c);
  });

  // 4. 环境微动 3：萤火虫微漂（夜空灵动感）
  const fireflies: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < 8; i++) {
    const fx = Phaser.Math.Between(40, W - 40);
    const fy = Phaser.Math.Between(160, groundY - 30);
    const f = S.add
      .image(fx, fy, "dot")
      .setDisplaySize(4, 4)
      .setTint(0xd2f558)
      .setAlpha(0.5)
      .setDepth(4);

    const wander = () => {
      if (!f.active) return;
      S.tweens.add({
        targets: f,
        x: f.x + Phaser.Math.Between(-45, 45),
        y: f.y + Phaser.Math.Between(-28, 28),
        alpha: Phaser.Math.FloatBetween(0.25, 0.75),
        duration: Phaser.Math.Between(1800, 3200),
        ease: "Sine.InOut",
        onComplete: wander,
      });
    };
    wander();
    fireflies.push(f);
  }

  // 5. 环境微动 4：暖色站台灯晕呼吸（深蓝墨绿地面上的温馨光晕）
  const lampGlow = S.add
    .circle(180, groundY - 40, 75, 0xfce881, 0.12)
    .setDepth(3);
  S.tweens.add({
    targets: lampGlow,
    alpha: { from: 0.08, to: 0.2 },
    scale: { from: 0.95, to: 1.1 },
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  // 6. 地面站台层（深蓝墨绿系，完美融入插画站台下沿）
  S.add
    .rectangle(0, groundY, W, H - groundY, 0x141a33, 0.92)
    .setOrigin(0, 0)
    .setDepth(3);
  S.add
    .rectangle(0, groundY, W, 4, 0x2b3459, 1)
    .setOrigin(0, 0)
    .setDepth(3);

  const driftClouds = () => {
    clouds.forEach((c, i) => {
      c.x -= 0.06 + i * 0.02;
      if (c.x < -70) c.x = W + 70;
    });
  };

  return { bg, clouds, fireflies, driftClouds };
}

// ---------- 招手敢敢主持 ----------
export interface GanganWaveApi {
  box: Phaser.GameObjects.Container;
  arm: Phaser.GameObjects.Image | null;
  wave: (n?: number) => void;
  hop: () => void;
}

export function makeGanganWave(
  S: Phaser.Scene,
  x: number,
  feetY: number,
  width: number
): GanganWaveApi {
  const height = width / WAVE_ASPECT;
  const box = S.add.container(x, feetY);
  const body = S.add
    .image(0, 0, "gangan_wave_body")
    .setOrigin(0.5, 1)
    .setDisplaySize(width, height);
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
      .setDisplaySize(width, height);
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
        duration: 250,
        yoyo: true,
        repeat: n * 2 - 1,
        ease: "Sine.InOut",
        onComplete: () => arm?.setRotation(0),
      });
    },
    hop() {
      S.tweens.add({
        targets: box,
        y: feetY - 15,
        duration: 160,
        yoyo: true,
        ease: "Quad.Out",
      });
    },
  };

  api.wave(2);
  return api;
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

  // 1. 柔和背光光晕（光晕在背景之上、月亮之下）
  const glow = S.add.circle(0, 0, sz * 0.58, 0xfce881, 0.18);
  S.tweens.add({
    targets: glow,
    scale: { from: 0.96, to: 1.12 },
    alpha: { from: 0.14, to: 0.26 },
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  container.add(glow);

  // 2. 现有锚定图本尊（1600x1600 精致 3D 黏土月亮）
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

  // 4. 张嘴开合椭圆（深色 + 黏土色描边，与原笑嘴完全吻合衔接）
  // 原图嘴部中心偏移：dx = -152 * scale, dy = +24 * scale
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
    // 摇篮曲眼皮：黏土黄眼睑随进度下垂
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

    // 睡着时的闭眼弧线
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
      // 嘴部开合吧唧 + 整体挤压回弹 + 腮红加深
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

// ---------- 共用收尾面板（文字加 padding top ≥12 防 emoji 裁切） ----------
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
    .setStrokeStyle(3, 0xf7c948);
  const t1 = S.add
    .text(0, -72, title, {
      fontSize: "31px",
      fontStyle: "bold",
      color: "#ffffff",
      padding: { top: 12, bottom: 4 },
    })
    .setOrigin(0.5);
  const t2 = S.add
    .text(0, -26, sub, { fontSize: "19px", color: "#f7c948" })
    .setOrigin(0.5);

  const btn = S.add
    .rectangle(0, 52, 300, 54, 0xf7c948)
    .setInteractive({ useHandCursor: true });
  const bt = S.add
    .text(0, 52, btnText, {
      fontSize: "21px",
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

  for (let i = 0; i < 14; i++) {
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
    blur: 5,
    fill: true,
  };
  S.add
    .text(24, 18, title, {
      fontSize: "24px",
      fontStyle: "bold",
      color: "#ffffff",
      shadow,
    })
    .setDepth(40);
  S.add
    .text(W - 24, 20, stageText, {
      fontSize: "16px",
      color: "#aeb9e8",
      shadow,
    })
    .setOrigin(1, 0)
    .setDepth(40);
  return shadow;
}
