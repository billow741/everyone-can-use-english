import { PhonicsAnchorItem, getAnchorBlocks } from "@renderer/lib/phoneme-anchors";

export interface FeedRoundSpec {
  round: number;
  optionsCount: number;
  distractorType: "far" | "near" | "mixed";
}

export interface VoiceArchetypeSpec {
  manner: "humming" | "continuous" | "plosive" | "vowel_long" | "liquid";
  targetObject: "expand" | "depart" | "bloom" | "light" | "wake";
}

export interface BlendWordSpec {
  word: string;
  zh: string;
  blocks: string[];
  image: string;
  isQuiz?: boolean;
  options?: string[];
}

export interface ChoiceDropOption {
  id: string;
  name: string;
  icon: string;
}

export interface RewardSpec {
  sticker: {
    id: string;
    name: string;
    image: string;
  };
  choiceDrop: {
    prompt: string;
    options: ChoiceDropOption[];
  };
  aliveAnimation: {
    type: "moon_shine" | "sun_burst" | "star_glow";
    durationMs: number;
  };
}

export interface LevelConfig {
  // P1 新模板核心九大字段
  levelId: string;
  phonemeId: string;
  anchor: {
    word: string;
    zh: string;
    image: string;
  };
  feedPool: {
    target: string;
    nearDistractors: string[];
    farDistractors: string[];
  };
  feedRounds: number;
  distractorLadder: FeedRoundSpec[];
  voiceArchetype: VoiceArchetypeSpec;
  blendWords: BlendWordSpec[];
  wordSets: [string[], string[]];
  reward: RewardSpec;

  // 既有场景兼容字段
  id: string;
  letter: string;
  phoneme: string;
  anchorWord: string;
  anchorZh: string;
  anchorImage: string;
  bgImage: string;
  blocks: string[];
  targetRate: number;
  decoyPool: string[];
  sceneFamily: "night" | "day" | "forest" | "ocean";
  actBDriver: "hold_hum" | "tap_pulse" | "voice_detect";
  actCEnding: "train_depart" | "rocket_launch" | "boat_sail";
  audioKeys: {
    letterSound: string;
    wordSound: string;
  };
}

export function buildLevelConfig(item: PhonicsAnchorItem): LevelConfig {
  const parsedBlocks = getAnchorBlocks(item.anchorWord || "moon");
  const blocks =
    parsedBlocks.length > 0
      ? parsedBlocks.map((b) => b.letters)
      : ["m", "oo", "n"];

  const letter = item.letter || "m";
  const anchorWord = item.anchorWord || "moon";
  const anchorZh = item.anchorZh || "月亮";
  const anchorImage =
    item.anchorImage || "/assets/phonics/anchors/anchor-moon-transparent.png";

  // 梯形干扰梯：轮 1-2 远干扰(音差大), 轮 3-4 近干扰(近音), 轮 5 混合4选项
  const distractorLadder: FeedRoundSpec[] = [
    { round: 1, optionsCount: 3, distractorType: "far" },
    { round: 2, optionsCount: 3, distractorType: "far" },
    { round: 3, optionsCount: 3, distractorType: "near" },
    { round: 4, optionsCount: 3, distractorType: "near" },
    { round: 5, optionsCount: 4, distractorType: "mixed" },
  ];

  return {
    // 新模板九大字段落点
    levelId: item.id || "m",
    phonemeId: letter,
    anchor: {
      word: anchorWord,
      zh: anchorZh,
      image: anchorImage,
    },
    feedPool: {
      target: letter,
      nearDistractors: ["n", "ng", "b", "p"],
      farDistractors: ["s", "t", "k", "f", "l", "a"],
    },
    feedRounds: 5,
    distractorLadder,
    voiceArchetype: {
      manner: "humming", // 发声方式轴：m 为哼鸣型 (持续型/短促型/哼鸣型/元音拉长型/流音型)
      targetObject: "wake", // 驱动对象轴：月亮安睡催眠 (膨胀/启程/绽放/点亮/苏醒)
    },
    blendWords: [
      {
        word: "moon",
        zh: "月亮",
        blocks: ["m", "oo", "n"],
        image: anchorImage,
      },
      {
        word: "map",
        zh: "地图",
        blocks: ["m", "a", "p"],
        image: anchorImage,
      },
      {
        word: "mug",
        zh: "杯子",
        blocks: ["m", "u", "g"],
        image: anchorImage,
        isQuiz: true,
        options: ["mug", "pug"],
      },
    ],
    wordSets: [
      ["moon", "map", "mug"],
      ["milk", "mop", "man"],
    ],
    reward: {
      sticker: {
        id: `${item.id || "m"}_gold`,
        name: "月亮黄金贴纸",
        image: anchorImage,
      },
      choiceDrop: {
        prompt: "今天配什么？",
        options: [
          { id: "honey", name: "蜂蜜罐", icon: "🍯" },
          { id: "star_candy", name: "星星糖", icon: "🍬" },
        ],
      },
      aliveAnimation: {
        type: "moon_shine",
        durationMs: 3600,
      },
    },

    // 既有兼容属性
    id: item.id || "m",
    letter,
    phoneme: letter, // 界面复核：去除 IPA /m/ 字面量，仅使用纯字母/音
    anchorWord,
    anchorZh,
    anchorImage,
    bgImage:
      item.id === "m"
        ? "/assets/phonics-phaser/moon/bg-night.webp"
        : `/assets/phonics-phaser/${item.id}/bg.webp`,
    blocks,
    targetRate: 0.22,
    decoyPool: ["p", "a", "s", "n", "b", "e", "o"],
    sceneFamily: "night",
    actBDriver: "hold_hum",
    actCEnding: "train_depart",
    audioKeys: {
      letterSound: letter,
      wordSound: anchorWord,
    },
  };
}
