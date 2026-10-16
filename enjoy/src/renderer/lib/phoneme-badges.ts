import { ALL_39_PHONEMES, PhonemeItem } from "./phoneme-data";

export interface PhonemeBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  requiredPhonemes: string[]; // 音标 id 列表
  isUnlocked: boolean;
  unlockedCount: number;
  totalCount: number;
}

// 预定义成就勋章规则
export const PHONEME_BADGES_CONFIG = [
  {
    id: "first_step",
    name: "启蒙破冰者",
    icon: "🌱",
    category: "起步里程碑",
    description: "成功攻克并掌握第 1 个音标，开启纯正发音之旅！",
    check: (masteryMap: Record<string, boolean>) => {
      const count = Object.values(masteryMap).filter(Boolean).length;
      return {
        isUnlocked: count >= 1,
        unlockedCount: Math.min(count, 1),
        totalCount: 1,
        requiredPhonemes: [],
      };
    },
  },
  {
    id: "five_stars",
    name: "五星发音官",
    icon: "⭐",
    category: "起步里程碑",
    description: "掌握任意 5 个音标，发音地基初具规模！",
    check: (masteryMap: Record<string, boolean>) => {
      const count = Object.values(masteryMap).filter(Boolean).length;
      return {
        isUnlocked: count >= 5,
        unlockedCount: Math.min(count, 5),
        totalCount: 5,
        requiredPhonemes: [],
      };
    },
  },
  {
    id: "plosive_master",
    name: "爆破音大师",
    icon: "🎯",
    category: "辅音专项",
    description: "全通 6 大爆破塞音 /p, b, t, d, k, ɡ/，喷薄有力！",
    phonemes: ["p", "b", "t", "d", "k", "g"],
  },
  {
    id: "fricative_master",
    name: "摩擦音专家",
    icon: "🌊",
    category: "辅音专项",
    description: "攻克 9 大气流摩擦音 /f, v, θ, ð, s, z, ʃ, ʒ, h/！",
    phonemes: ["f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h"],
  },
  {
    id: "long_vowel_master",
    name: "长元音黄金官",
    icon: "💎",
    category: "元音专项",
    description: "掌握全部 5 大长元音 /iː, uː, ɑː, ɔː, ɜː/，饱满悠扬！",
    phonemes: ["i_long", "u_long", "a_long", "o_long", "er_long"],
  },
  {
    id: "short_vowel_master",
    name: "短元音小飞侠",
    icon: "⚡",
    category: "元音专项",
    description: "掌握全部 6 大短元音 /ɪ, ʊ, ɛ, æ, ʌ, ɒ/，短促弹韧！",
    phonemes: ["i_short", "u_short", "eh", "ae", "uh", "o_short"],
  },
  {
    id: "diphthong_master",
    name: "双元音游侠",
    icon: "🌈",
    category: "元音专项",
    description: "掌握全部 5 大双元音 /eɪ, aɪ, ɔɪ, aʊ, oʊ/，丝滑滑移！",
    phonemes: ["ei", "ai", "oi", "au", "ou"],
  },
  {
    id: "grand_master",
    name: "全能发音王者",
    icon: "👑",
    category: "终极殿堂",
    description: "39 个国际核心音标全满贯通关！登顶语音金殿堂！",
    check: (masteryMap: Record<string, boolean>) => {
      const count = ALL_39_PHONEMES.filter((p) => masteryMap[p.id]).length;
      return {
        isUnlocked: count >= ALL_39_PHONEMES.length,
        unlockedCount: count,
        totalCount: ALL_39_PHONEMES.length,
        requiredPhonemes: ALL_39_PHONEMES.map((p) => p.id),
      };
    },
  },
];

// 计算当前用户的所有勋章解锁状态
export function calculatePhonemeBadges(masteryMap: Record<string, boolean>): PhonemeBadge[] {
  return PHONEME_BADGES_CONFIG.map((cfg) => {
    if (cfg.check) {
      const res = cfg.check(masteryMap);
      return {
        id: cfg.id,
        name: cfg.name,
        icon: cfg.icon,
        category: cfg.category,
        description: cfg.description,
        isUnlocked: res.isUnlocked,
        unlockedCount: res.unlockedCount,
        totalCount: res.totalCount,
        requiredPhonemes: res.requiredPhonemes,
      };
    }

    const phonemes = cfg.phonemes || [];
    // 匹配 phoneme item id 或 slug
    const unlockedCount = phonemes.filter((idOrSlug) => {
      // 检查当前 map 里的 id 或从 ALL_39_PHONEMES 找对应项
      const target = ALL_39_PHONEMES.find(
        (p) => p.id === idOrSlug || p.slug === idOrSlug
      );
      return target ? !!masteryMap[target.id] : !!masteryMap[idOrSlug];
    }).length;

    const totalCount = phonemes.length;
    const isUnlocked = unlockedCount >= totalCount && totalCount > 0;

    return {
      id: cfg.id,
      name: cfg.name,
      icon: cfg.icon,
      category: cfg.category,
      description: cfg.description,
      isUnlocked,
      unlockedCount,
      totalCount,
      requiredPhonemes: phonemes,
    };
  });
}
