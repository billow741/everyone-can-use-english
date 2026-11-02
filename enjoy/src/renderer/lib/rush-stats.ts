import { getScopedKey } from "@renderer/lib/phoneme-cloud-sync";

/**
 * SRS 极速模式个人纪录（P0 游戏快赢层，2026-11-02 规格）
 * 本地存储、按 user.id 分桶；只和自己的历史最好比。
 */
export type RushStats = {
  bestScore: number;
  bestStreak: number;
  gamesPlayed: number;
};

const BASE_KEY = "sunnybridge_rush_stats_v1";
const EMPTY: RushStats = { bestScore: 0, bestStreak: 0, gamesPlayed: 0 };

export function getRushStats(): RushStats {
  try {
    const raw = localStorage.getItem(getScopedKey(BASE_KEY));
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return { ...EMPTY };
}

export function recordRushGame(
  score: number,
  bestStreak: number
): { stats: RushStats; isRecord: boolean } {
  const prev = getRushStats();
  const isRecord = score > prev.bestScore && prev.gamesPlayed > 0;
  const next: RushStats = {
    bestScore: Math.max(prev.bestScore, score),
    bestStreak: Math.max(prev.bestStreak, bestStreak),
    gamesPlayed: prev.gamesPlayed + 1,
  };
  try {
    localStorage.setItem(getScopedKey(BASE_KEY), JSON.stringify(next));
  } catch {}
  return { stats: next, isRecord };
}
