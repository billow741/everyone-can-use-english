/** @type {import('tailwindcss').Config} */

const defaultTheme = require("tailwindcss/defaultTheme");
module.exports = {
  darkMode: ["class"],
  content: ["./src/renderer/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      height: {
        content: "calc(100vh - 2rem)",
      },
      maxHeight: {
        content: "calc(100vh - 2rem)",
      },
      fontSize: {
        xxs: "0.625rem",
        xxxs: "0.5rem",
        // 暖阳学者四级字号规范 (D0)
        "title-lg": ["1.75rem", { lineHeight: "2.25rem" }], // 28px 页面大标题
        "title-md": ["1.25rem", { lineHeight: "1.75rem" }], // 20px 区块标题
        "body-base": ["1rem", { lineHeight: "1.5rem" }], // 16px 正文
        "caption-note": ["0.8125rem", { lineHeight: "1.125rem" }], // 13px 注记
      },
      fontFamily: {
        code: ["CharisSIL", ...defaultTheme.fontFamily.mono],
        reading: ["Georgia", "Source Han Serif SC", "Source Han Serif CN", "Songti SC", "SimSun", "serif"],
        serif: ["Georgia", "Source Han Serif SC", "Source Han Serif CN", "Songti SC", "SimSun", ...defaultTheme.fontFamily.serif],
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "active-word": "hsl(var(--active-word))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 暖阳学者设计令牌 (Warm Scholar Design Tokens)
        "warm-paper": "var(--warm-paper)",
        "card-white": "var(--card-white)",
        "sun-orange": "var(--sun-orange)",
        "ink": "var(--ink)",
        "warm-muted": "var(--warm-muted)",
        "sand-border": "var(--sand-border)",
        "level-a0": "hsl(var(--level-a0-hsl, 37 90% 48%))",
        "level-a1": "hsl(var(--level-a1-hsl, 211 67% 57%))",
        "level-a2": "hsl(var(--level-a2-hsl, 145 45% 45%))",
        "level-b1": "hsl(var(--level-b1-hsl, 249 59% 64%))",
        "semantic-success": "var(--semantic-success)",
        "semantic-warning": "var(--semantic-warning)",
        "semantic-error": "var(--semantic-error)",
        "semantic-info": "var(--semantic-info)",
        "brick-red": "var(--semantic-error)",
        "trust-blue": "hsl(var(--trust-blue-hsl, 207 38% 28%))",

        // 工单 F 扩展语义令牌 (收口硬编码色值)
        "wood-ink": "hsl(var(--wood-ink-hsl, 32 41% 16%))",
        "forest-green": "hsl(var(--forest-green-hsl, 154 46% 34%))",
        "forest-green-hover": "var(--forest-green-hover)",
        "amber-gold": "hsl(var(--amber-gold-hsl, 36 100% 63%))",
        "amber-gold-hover": "var(--amber-gold-hover)",
        "parchment-light": "hsl(var(--parchment-light-hsl, 40 100% 96%))",
        "sand-light": "hsl(var(--sand-light-hsl, 40 67% 86%))",
        "wood-muted": "hsl(var(--wood-muted-hsl, 38 45% 37%))",
        "retro-red": "var(--retro-red)",
        "sun-orange-hover": "var(--sun-orange-hover)",
        "destructive-hover": "var(--destructive-hover)",
        "card-muted": "var(--card-muted)",
        "paper-soft": "var(--paper-soft)",
        "banner-start": "var(--banner-warm-start)",
        "banner-end": "var(--banner-warm-end)",
        "wechat": "var(--wechat-green)",
        "wechat-hover": "var(--wechat-green-hover)",
        "medal-gold": "var(--medal-gold)",
        "medal-silver": "var(--medal-silver)",
        "medal-bronze": "var(--medal-bronze)",
        "parchment-warm": "var(--parchment-warm)",
        "parchment-gold": "var(--parchment-gold)",
      },
      borderRadius: {
        sm: "8px", // 小元素 8px
        md: "14px", // 标准卡片 14px
        lg: "20px", // 大型特征区 20px 封顶
        card: "14px",
        section: "20px",
        pill: "9999px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "star-pop": {
          "0%": { transform: "scale(0.88)" },
          "50%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.2s ease-out",
        "star-pop": "star-pop 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar"),
    require("tailwind-scrollbar-hide"),
    require("@vidstack/react/tailwind.cjs"),
  ],
};
