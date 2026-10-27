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
  distractorBlocks?: string[];
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

export function buildLevelConfig(item: PhonicsAnchorItem, playCount = 0): LevelConfig {
  const isS = item.id === "s" || item.letter === "s" || item.anchorWord === "sun";

  // 梯形干扰梯：轮 1-2 远干扰(音差大), 轮 3-4 近干扰(近音), 轮 5 混合4选项
  const distractorLadder: FeedRoundSpec[] = [
    { round: 1, optionsCount: 3, distractorType: "far" },
    { round: 2, optionsCount: 3, distractorType: "far" },
    { round: 3, optionsCount: 3, distractorType: "near" },
    { round: 4, optionsCount: 3, distractorType: "near" },
    { round: 5, optionsCount: 4, distractorType: "mixed" },
  ];

  if (isS) {
    const isSet2 = playCount % 2 === 1;

    // 2 套轮换词表：sun/sat 与 sock/sit
    const blendWordsSet1: BlendWordSpec[] = [
      {
        word: "sun",
        zh: "太阳",
        blocks: ["s", "u", "n"],
        image: "/assets/phonics/anchors/anchor-sun.webp",
      },
      {
        word: "sat",
        zh: "坐",
        blocks: ["s", "a", "t"],
        distractorBlocks: ["m"],
        image: "/assets/phonics/flashcards/flashcard-sat.webp",
      },
      {
        word: "sit",
        zh: "坐下",
        blocks: ["s", "i", "t"],
        image: "/assets/phonics/flashcards/flashcard-sit.webp",
        isQuiz: true,
        options: ["sit", "sat"],
      },
    ];

    const blendWordsSet2: BlendWordSpec[] = [
      {
        word: "sock",
        zh: "短袜",
        blocks: ["s", "o", "ck"],
        image: "/assets/phonics/anchors/anchor-sun.webp",
      },
      {
        word: "sit",
        zh: "坐下",
        blocks: ["s", "i", "t"],
        distractorBlocks: ["m"],
        image: "/assets/phonics/flashcards/flashcard-sit.webp",
      },
      {
        word: "sun",
        zh: "太阳",
        blocks: ["s", "u", "n"],
        image: "/assets/phonics/anchors/anchor-sun.webp",
        isQuiz: true,
        options: ["sun", "sit"],
      },
    ];

    return {
      levelId: "s",
      phonemeId: "s",
      anchor: {
        word: "sun",
        zh: "太阳",
        image: "/assets/phonics/anchors/anchor-sun.webp",
      },
      feedPool: {
        target: "s",
        nearDistractors: ["sh", "z", "f", "th"],
        farDistractors: ["m", "n", "b", "d", "g", "a"],
      },
      feedRounds: 5,
      distractorLadder,
      voiceArchetype: {
        manner: "continuous", // 发声方式轴：持续型 / 嘶音族
        targetObject: "expand", // 驱动对象轴：气球膨胀
      },
      blendWords: isSet2 ? blendWordsSet2 : blendWordsSet1,
      wordSets: [
        ["sun", "sat"],
        ["sock", "sit"],
      ],
      reward: {
        sticker: {
          id: "s_gold",
          name: "太阳黄金贴纸",
          image: "/assets/phonics/anchors/anchor-sun.webp",
        },
        choiceDrop: {
          prompt: "今天配什么？",
          options: [
            { id: "sunglasses", name: "酷墨镜", icon: "🕶️" },
            { id: "sunhat", name: "遮阳帽", icon: "👒" },
          ],
        },
        aliveAnimation: {
          type: "sun_burst",
          durationMs: 3600,
        },
      },

      id: "s",
      letter: "s",
      phoneme: "s",
      anchorWord: "sun",
      anchorZh: "太阳",
      anchorImage: "/assets/phonics/anchors/anchor-sun.webp",
      bgImage: "/assets/phonics/anchors/anchor-sun.webp",
      blocks: ["s", "u", "n"],
      targetRate: 0.22,
      decoyPool: ["sh", "z", "f", "m", "t", "a", "p"],
      sceneFamily: "day",
      actBDriver: "voice_detect",
      actCEnding: "train_depart",
      audioKeys: {
        letterSound: "s",
        wordSound: "sun",
      },
    };
  }

  // m 样板关配置
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

  return {
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
      manner: "humming",
      targetObject: "wake",
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

    id: item.id || "m",
    letter,
    phoneme: letter,
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
