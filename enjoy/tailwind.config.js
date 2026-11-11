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
        "level-a0": "var(--level-a0)",
        "level-a1": "var(--level-a1)",
        "level-a2": "var(--level-a2)",
        "level-b1": "var(--level-b1)",
        "semantic-success": "var(--semantic-success)",
        "semantic-warning": "var(--semantic-warning)",
        "semantic-error": "var(--semantic-error)",
        "semantic-info": "var(--semantic-info)",
        "brick-red": "var(--semantic-error)",
        "trust-blue": "var(--trust-blue)",
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
