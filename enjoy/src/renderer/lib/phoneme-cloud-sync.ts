// 阳光桥少儿英语 · 39 音标与勋章云端数据库持久化与同步引擎
// 支持离线乐观更新、实时事件驱动响应、多端自动双向同步与访客/登录无损合流

import { PhonemeBadge, calculatePhonemeBadges } from "./phoneme-badges";

export const MASTERY_STORAGE_KEY = "sunnybridge_phonemes_mastery_v1";
export const BADGES_CACHE_KEY = "sunnybridge_phonemes_badges_v1";
export const LAST_SYNC_KEY = "sunnybridge_phonemes_last_sync";

export interface PhonemeSyncState {
  masteryMap: Record<string, boolean>;
  badges: PhonemeBadge[];
  stats: {
    masteredCount: number;
    totalCount: number;
    masteryPercentage: number;
  };
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt?: number;
}

// 获取 API 基地址
const getApiBase = (): string => {
  if (typeof window === "undefined") return "https://app.sunnybridge.qzz.io";
  if (window.location.origin.includes("sunnybridge.qzz.io")) {
    return "";
  }
  return "https://app.sunnybridge.qzz.io";
};

// 获取或持久化生成用户唯一标识符
export const getPhonemeUserId = (): string => {
  if (typeof window === "undefined") return "guest_user";
  try {
    const rawUser = localStorage.getItem("sunnybridge_user");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && user.id) return String(user.id);
    }

    // 访客持久化唯一标识
    let guestUid = localStorage.getItem("sunnybridge_guest_uid");
    if (!guestUid) {
      guestUid = "guest_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem("sunnybridge_guest_uid", guestUid);
    }
    return guestUid;
  } catch {
    return "guest_user";
  }
};

// 本地发音掌握度状态获取 (0ms 同步秒开)
export const getPhonemeMasteryMap = (): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MASTERY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// 保存掌握度到本地缓存
export const savePhonemeMasteryLocal = (map: Record<string, boolean>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn("savePhonemeMasteryLocal error:", err);
  }
};

// 触发全局掌握度与勋章更新事件
export const emitPhonemeMasteryUpdate = (detail?: Partial<PhonemeSyncState>) => {
  if (typeof window === "undefined") return;
  try {
    const masteryMap = getPhonemeMasteryMap();
    const badges = calculatePhonemeBadges(masteryMap);
    const masteredCount = Object.values(masteryMap).filter(Boolean).length;
    const totalCount = 39;
    const masteryPercentage = Math.round((masteredCount / totalCount) * 100);

    const event = new CustomEvent("sunnybridge:phonemes-updated", {
      detail: {
        masteryMap,
        badges,
        stats: { masteredCount, totalCount, masteryPercentage },
        ...detail,
      },
    });
    window.dispatchEvent(event);
  } catch (err) {
    console.warn("emitPhonemeMasteryUpdate error:", err);
  }
};

// 监听掌握度状态变更
export const subscribePhonemeMastery = (
  callback: (state: {
    masteryMap: Record<string, boolean>;
    badges: PhonemeBadge[];
    stats: { masteredCount: number; totalCount: number; masteryPercentage: number };
    isOnline?: boolean;
    isSyncing?: boolean;
  }) => void
): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const handler = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  window.addEventListener("sunnybridge:phonemes-updated", handler);
  return () => {
    window.removeEventListener("sunnybridge:phonemes-updated", handler);
  };
};

// 从云端拉取最新掌握度与勋章状态 (带合流合并机制)
export const fetchPhonemesCloudProgress = async (): Promise<PhonemeSyncState> => {
  const localMap = getPhonemeMasteryMap();
  const userId = getPhonemeUserId();
  const apiBase = getApiBase();

  try {
    emitPhonemeMasteryUpdate({ isSyncing: true });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch(`${apiBase}/api/phonemes/progress?user_id=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      const serverMap: Record<string, boolean> = data.masteryMap || {};

      // 智能双向合流：逻辑并集，任何一端掌握过即视为掌握，避免覆盖丢失
      let hasLocalDifference = false;
      const mergedMap: Record<string, boolean> = { ...serverMap };
      for (const [k, v] of Object.entries(localMap)) {
        if (v && !serverMap[k]) {
          mergedMap[k] = true;
          hasLocalDifference = true;
        }
      }

      // 保存最新数据到本地缓存
      savePhonemeMasteryLocal(mergedMap);
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

      // 如果本地有服务端未记录的进展，异步回写同步至云端
      if (hasLocalDifference) {
        syncLocalPhonemesToCloud(mergedMap).catch(console.warn);
      }

      const badges = data.badges && data.badges.length > 0
        ? data.badges
        : calculatePhonemeBadges(mergedMap);

      const masteredCount = Object.values(mergedMap).filter(Boolean).length;
      const stats = data.stats || {
        masteredCount,
        totalCount: 39,
        masteryPercentage: Math.round((masteredCount / 39) * 100),
      };

      const result: PhonemeSyncState = {
        masteryMap: mergedMap,
        badges,
        stats,
        isOnline: true,
        isSyncing: false,
        lastSyncedAt: Date.now(),
      };

      emitPhonemeMasteryUpdate(result);
      return result;
    }
  } catch (err) {
    console.warn("fetchPhonemesCloudProgress offline or error:", err);
  }

  // 离线或异常时回退到本地数据
  const badges = calculatePhonemeBadges(localMap);
  const masteredCount = Object.values(localMap).filter(Boolean).length;
  const result: PhonemeSyncState = {
    masteryMap: localMap,
    badges,
    stats: {
      masteredCount,
      totalCount: 39,
      masteryPercentage: Math.round((masteredCount / 39) * 100),
    },
    isOnline: false,
    isSyncing: false,
  };
  emitPhonemeMasteryUpdate(result);
  return result;
};

// 切换单音掌握状态 (0ms 乐观更新 + 异步云端持久化)
export const togglePhonemeMastery = (phonemeId: string): boolean => {
  if (typeof window === "undefined") return false;

  const map = getPhonemeMasteryMap();
  const nextState = !map[phonemeId];
  map[phonemeId] = nextState;

  // 1. 本地乐观秒更新
  savePhonemeMasteryLocal(map);
  emitPhonemeMasteryUpdate({ masteryMap: map, isSyncing: true });

  // 2. 异步云端持久化
  const userId = getPhonemeUserId();
  const apiBase = getApiBase();

  fetch(`${apiBase}/api/phonemes/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      phonemeId,
      mastered: nextState,
    }),
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        emitPhonemeMasteryUpdate({
          masteryMap: data.masteryMap || map,
          badges: data.badges,
          stats: data.stats,
          isOnline: true,
          isSyncing: false,
        });
      }
    })
    .catch((err) => {
      console.warn("Cloud persistence failed, saved locally:", err);
      emitPhonemeMasteryUpdate({ isOnline: false, isSyncing: false });
    });

  return nextState;
};

// 全量将本地数据同步至云端数据库
export const syncLocalPhonemesToCloud = async (overrideMap?: Record<string, boolean>): Promise<PhonemeSyncState> => {
  const localMap = overrideMap || getPhonemeMasteryMap();
  const userId = getPhonemeUserId();
  const apiBase = getApiBase();

  try {
    emitPhonemeMasteryUpdate({ isSyncing: true });

    const resp = await fetch(`${apiBase}/api/phonemes/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        localMap,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const serverMap = data.masteryMap || localMap;
      savePhonemeMasteryLocal(serverMap);
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

      const result: PhonemeSyncState = {
        masteryMap: serverMap,
        badges: data.badges || calculatePhonemeBadges(serverMap),
        stats: data.stats || {
          masteredCount: Object.values(serverMap).filter(Boolean).length,
          totalCount: 39,
          masteryPercentage: Math.round((Object.values(serverMap).filter(Boolean).length / 39) * 100),
        },
        isOnline: true,
        isSyncing: false,
        lastSyncedAt: Date.now(),
      };
      emitPhonemeMasteryUpdate(result);
      return result;
    }
  } catch (err) {
    console.warn("syncLocalPhonemesToCloud error:", err);
  }

  const badges = calculatePhonemeBadges(localMap);
  return {
    masteryMap: localMap,
    badges,
    stats: {
      masteredCount: Object.values(localMap).filter(Boolean).length,
      totalCount: 39,
      masteryPercentage: Math.round((Object.values(localMap).filter(Boolean).length / 39) * 100),
    },
    isOnline: false,
    isSyncing: false,
  };
};
