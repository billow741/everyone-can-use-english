// 阳光桥少儿英语 · G1 试点区故事状态存储管理
// 遵循红线：使用独立 scoped 键名 sunnybridge_game_story_v1，绝不影响旧键

import { getScopedKey } from "./phoneme-cloud-sync";

export const GAME_STORY_STORAGE_KEY = "sunnybridge_game_story_v1";
export const GAME_STORY_UPDATED_EVENT = "sunnybridge:game-story-updated";

export interface GameStoryState {
  cs00Seen: boolean;
  g1inSeen: boolean;
  r03PreSeen: boolean;
  r04ArrSeen: boolean;
  cs04Seen: boolean;
  muted: boolean;
}

export const DEFAULT_GAME_STORY_STATE: GameStoryState = {
  cs00Seen: false,
  g1inSeen: false,
  r03PreSeen: false,
  r04ArrSeen: false,
  cs04Seen: false,
  muted: false,
};

export function getGameStoryState(userId?: string): GameStoryState {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_GAME_STORY_STATE };
  }

  try {
    const key = getScopedKey(GAME_STORY_STORAGE_KEY, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_GAME_STORY_STATE };
    const parsed = JSON.parse(raw);
    return {
      cs00Seen: Boolean(parsed.cs00Seen),
      g1inSeen: Boolean(parsed.g1inSeen),
      r03PreSeen: Boolean(parsed.r03PreSeen),
      r04ArrSeen: Boolean(parsed.r04ArrSeen),
      cs04Seen: Boolean(parsed.cs04Seen),
      muted: Boolean(parsed.muted),
    };
  } catch {
    return { ...DEFAULT_GAME_STORY_STATE };
  }
}

export function saveGameStoryState(
  partial: Partial<GameStoryState>,
  userId?: string
): GameStoryState {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_GAME_STORY_STATE, ...partial };
  }

  try {
    const current = getGameStoryState(userId);
    const updated: GameStoryState = {
      ...current,
      ...partial,
    };
    const key = getScopedKey(GAME_STORY_STORAGE_KEY, userId);
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent(GAME_STORY_UPDATED_EVENT, { detail: updated })
    );

    return updated;
  } catch {
    return { ...DEFAULT_GAME_STORY_STATE, ...partial };
  }
}

export function resetGameStoryState(userId?: string): GameStoryState {
  return saveGameStoryState(DEFAULT_GAME_STORY_STATE, userId);
}
