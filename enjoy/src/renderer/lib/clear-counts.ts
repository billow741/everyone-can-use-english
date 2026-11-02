import { getScopedKey } from "@renderer/lib/phoneme-cloud-sync";

/**
 * 通关次数与奖牌（P0 游戏快赢层，2026-11-02 规格）
 * - 每个音素 slug / 每节对话课 lessonId 累计通关次数，本地存储、按 user.id 分桶。
 * - 奖牌档位：通关 ≥2 铜、≥5 银、≥10 金；1 次不发牌（沿用点亮/星）。
 * - 计数从功能上线后计起，不追溯历史。
 */
export type ClearCounts = {
  phonemes: Record<string, number>;
  dialogues: Record<string, number>;
};

const BASE_KEY = "sunnybridge_clear_counts_v1";
export const CLEAR_COUNTS_EVENT = "sunnybridge:clear-counts-updated";

export type MedalTier = "none" | "bronze" | "silver" | "gold";

export function medalTierFor(count: number): MedalTier {
  if (count >= 10) return "gold";
  if (count >= 5) return "silver";
  if (count >= 2) return "bronze";
  return "none";
}

export const MEDAL_EMOJI: Record<Exclude<MedalTier, "none">, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
};

export function getClearCounts(): ClearCounts {
  try {
    const raw = localStorage.getItem(getScopedKey(BASE_KEY));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        phonemes: parsed?.phonemes || {},
        dialogues: parsed?.dialogues || {},
      };
    }
  } catch {}
  return { phonemes: {}, dialogues: {} };
}

function save(counts: ClearCounts) {
  try {
    localStorage.setItem(getScopedKey(BASE_KEY), JSON.stringify(counts));
    window.dispatchEvent(new Event(CLEAR_COUNTS_EVENT));
  } catch {}
}

export function incPhonemeClear(slug: string): number {
  if (!slug) return 0;
  const counts = getClearCounts();
  counts.phonemes[slug] = (counts.phonemes[slug] || 0) + 1;
  save(counts);
  return counts.phonemes[slug];
}

export function incDialogueClear(lessonId: string): number {
  if (!lessonId) return 0;
  const counts = getClearCounts();
  counts.dialogues[lessonId] = (counts.dialogues[lessonId] || 0) + 1;
  save(counts);
  return counts.dialogues[lessonId];
}

/** 汇总奖牌数（铜/银/金各多少枚） */
export function medalTotals(counts: ClearCounts): Record<Exclude<MedalTier, "none">, number> {
  const totals = { bronze: 0, silver: 0, gold: 0 };
  const all = [...Object.values(counts.phonemes), ...Object.values(counts.dialogues)];
  for (const n of all) {
    const tier = medalTierFor(n);
    if (tier !== "none") totals[tier] += 1;
  }
  return totals;
}
