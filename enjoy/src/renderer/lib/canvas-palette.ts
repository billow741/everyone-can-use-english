/**
 * 海洋青与设计系统 Canvas 绘图与导出海报色板常量
 * 用于 HTML5 Canvas / 海报离线渲染等无法直接消费 CSS 变量的环境，
 * 提供与 src/index.css 设计令牌语义严格对齐的十六进制颜色值。
 */

export const CANVAS_OCEAN_PALETTE = {
  canvas: "#F3FAF8",
  surface: "#FFFFFF",
  surfaceMuted: "#E7F2EF",
  hairline: "#D3E4DE",
  primary: "#0F7B7A",
  primaryDark: "#0A5E5D",
  midTeal: "#149694",
  accent: "#F2A93B",
  accentText: "#96690A",
  ink: "#123B3C",
  inkMuted: "#4E6B69",
  focusRing: "#0F7B7A",
  trustBlue: "#2C4A63",
};

export const CANVAS_WARM_PALETTE = {
  sunOrange: "#0F7B7A", /* 退役：主色改深青 */
  sunOrangeHover: "#0A5E5D",
  sandBorder: "#D3E4DE",
  warmMuted: "#4E6B69",
  warmPaper: "#F3FAF8",
  ink: "#123B3C",
  woodInk: "#123B3C",
  forestGreen: "#2E7D5B",
  amberGold: "#F2A93B",
  parchmentLight: "#E7F2EF",
  sandLight: "#D3E4DE",
};

export const THEATER_POSTER_PALETTE = {
  bgStart: "#FFFDF5",
  bgMid: "#FFF7ED",
  bgEnd: "#FEF3C7",
  borderLight: "#FDE68A",
  borderGold: "#F59E0B",
  brandGold: "#F59E0B",
  titleBrown: "#78350F",
  cardWhite: "#FFFFFF",
  catGold: "#D97706",
  titleDark: "#1E293B",
  subtitleMuted: "#64748B",
  gridLine: "#F1F5F9",
  scoreDark: "#334155",
  scoreMuted: "#94A3B8",
  badgeBg: "#FEF3C7",
  badgeText: "#B45309",
  badgeBorder: "#D97706",
  dotGold: "#F59E0B",
  stampRed: "#EF4444",
};
