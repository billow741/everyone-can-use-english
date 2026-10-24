import { PhonicsAnchorItem, getAnchorBlocks } from "@renderer/lib/phoneme-anchors";

export interface LevelConfig {
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

  return {
    id: item.id || "m",
    letter: item.letter || "m",
    phoneme: item.ipaSymbol || "/m/",
    anchorWord: item.anchorWord || "moon",
    anchorZh: item.anchorZh || "月亮",
    anchorImage:
      item.anchorImage || "/assets/phonics/anchors/anchor-moon-transparent.png",
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
      letterSound: item.letter || "m",
      wordSound: item.anchorWord || "moon",
    },
  };
}
