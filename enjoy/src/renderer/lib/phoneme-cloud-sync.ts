import { PHONICS_ISLAND_39_ANCHORS } from "./phoneme-anchors";
// 阳光桥少儿英语 · 39 音标与勋章云端数据库持久化与同步引擎
// 支持离线乐观更新、实时事件驱动响应、多端自动双向同步与访客/登录无损合流

import { PhonemeBadge, calculatePhonemeBadges } from "./phoneme-badges";

export const BASE_MASTERY_KEY = "sunnybridge_phonemes_mastery_v1";
export const BASE_BADGES_KEY = "sunnybridge_phonemes_badges_v1";
export const BASE_SYNC_KEY = "sunnybridge_phonemes_last_sync";

// 兼容既有命名导出
export const MASTERY_STORAGE_KEY = BASE_MASTERY_KEY;
export const BADGES_CACHE_KEY = BASE_BADGES_KEY;
export const LAST_SYNC_KEY = BASE_SYNC_KEY;

export const MIGRATION_DONE_KEY = "sunnybridge_phonemes_migrated_v1";
export const LEGACY_BACKUP_KEY = "sunnybridge_phonemes_mastery_legacy_backup";

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

// 获取分桶 key
export const getScopedKey = (baseKey: string, userId: string = getPhonemeUserId()): string => {
  return `${baseKey}:${userId}`;
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

// Batch 3 鉴权绑定：按目标用户生成 Authorization 头（凭证主人必须与请求 user_id 一致）
export const getPhonemeAuthHeaders = (forUserId: string): Record<string, string> => {
  if (!forUserId) return {};
  // 游客自证：凭证即游客身份本身（随机 guest_ id 或共享体验号）
  if (forUserId.startsWith("guest_") || forUserId === "sunnybridge_guest") {
    return { Authorization: `Bearer ${forUserId}` };
  }
  // 微信用户：用本地登录态里与目标用户一致的长效会话凭证
  try {
    const rawUser = localStorage.getItem("sunnybridge_user");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && String(user.id) === forUserId && user.accessToken) {
        return { Authorization: `Bearer ${user.accessToken}` };
      }
    }
  } catch {}
  return {};
};

// 本地发音掌握度状态获取 (0ms 同步秒开)
export const getPhonemeMasteryMap = (targetUserId?: string): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  try {
    const key = getScopedKey(BASE_MASTERY_KEY, targetUserId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// 保存掌握度到本地缓存
export const savePhonemeMasteryLocal = (map: Record<string, boolean>, targetUserId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const key = getScopedKey(BASE_MASTERY_KEY, targetUserId);
    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.warn("savePhonemeMasteryLocal error:", err);
  }
};

// 徽章与 lastSync 的分桶读写函数
export const getPhonemeBadgesLocal = (targetUserId?: string): PhonemeBadge[] => {
  if (typeof window === "undefined") return [];
  try {
    const key = getScopedKey(BASE_BADGES_KEY, targetUserId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePhonemeBadgesLocal = (badges: PhonemeBadge[], targetUserId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const key = getScopedKey(BASE_BADGES_KEY, targetUserId);
    localStorage.setItem(key, JSON.stringify(badges));
  } catch (err) {
    console.warn("savePhonemeBadgesLocal error:", err);
  }
};

export const getPhonemeLastSync = (targetUserId?: string): number | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const key = getScopedKey(BASE_SYNC_KEY, targetUserId);
    const raw = localStorage.getItem(key);
    return raw ? Number(raw) : undefined;
  } catch {
    return undefined;
  }
};

export const setPhonemeLastSync = (time: number, targetUserId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const key = getScopedKey(BASE_SYNC_KEY, targetUserId);
    localStorage.setItem(key, String(time));
  } catch (err) {
    console.warn("setPhonemeLastSync error:", err);
  }
};

// 历史单例 key 迁移逻辑，支持 4 种情况分支
export const migrateLegacySingleKeys = (currentUserId?: string): void => {
  if (typeof window === "undefined") return;

  try {
    // 情况 4: MIGRATION_DONE_KEY 已置位，已完成迁移，直接跳过
    if (localStorage.getItem(MIGRATION_DONE_KEY) === "true") {
      return;
    }

    const legacyRaw = localStorage.getItem(BASE_MASTERY_KEY);

    // 情况 1: 旧 key 为空或无有效数据，直接标记迁移完成并退出
    if (!legacyRaw || legacyRaw.trim() === "" || legacyRaw === "{}") {
      localStorage.setItem(MIGRATION_DONE_KEY, "true");
      return;
    }

    let parsedData: Record<string, any> = {};
    try {
      parsedData = JSON.parse(legacyRaw);
    } catch {
      localStorage.setItem(MIGRATION_DONE_KEY, "true");
      return;
    }

    if (!parsedData || Object.keys(parsedData).length === 0) {
      localStorage.setItem(MIGRATION_DONE_KEY, "true");
      return;
    }

    const userId = currentUserId || getPhonemeUserId();
    const rawUser = localStorage.getItem("sunnybridge_user");
    let isUserLoggedIn = false;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        if (u && u.id && !u.isGuest && u.id !== "sunnybridge_guest") {
          isUserLoggedIn = true;
        }
      } catch {}
    }

    if (isUserLoggedIn) {
      // 情况 2: 旧 key 有数据且已登录，全量复制到当前用户的分桶
      savePhonemeMasteryLocal(parsedData, userId);
    } else {
      // 情况 3: 旧 key 有数据且为游客，全量复制到当前游客的分桶
      savePhonemeMasteryLocal(parsedData, userId);
    }

    // 徽章与 lastSync 的旧单例数据同步归档与迁移
    const legacyBadges = localStorage.getItem(BASE_BADGES_KEY);
    if (legacyBadges) {
      try {
        const parsedBadges = JSON.parse(legacyBadges);
        savePhonemeBadgesLocal(parsedBadges, userId);
      } catch {}
    }
    const legacySync = localStorage.getItem(BASE_SYNC_KEY);
    if (legacySync) {
      setPhonemeLastSync(Number(legacySync) || Date.now(), userId);
    }

    // 把旧 Key 改名归档为 sunnybridge_phonemes_mastery_legacy_backup（保留旧数据，绝不删除）
    localStorage.setItem(LEGACY_BACKUP_KEY, legacyRaw);
    localStorage.removeItem(BASE_MASTERY_KEY);

    // 写 MIGRATION_DONE_KEY = "true"
    localStorage.setItem(MIGRATION_DONE_KEY, "true");
  } catch (err) {
    console.warn("migrateLegacySingleKeys error:", err);
  }
};

// 应用启动时自动触发一次迁移
if (typeof window !== "undefined") {
  try {
    migrateLegacySingleKeys();
  } catch (err) {
    console.warn("migrateLegacySingleKeys startup error:", err);
  }
}

// 触发全局掌握度与勋章更新事件
export const countMasteredPhonemes = (map: Record<string, any>): number => {
  if (!map) return 0;
  return PHONICS_ISLAND_39_ANCHORS.filter(
    (a) => Boolean(map[a.id] || (a.ipaSlug && map[a.ipaSlug]))
  ).length;
};

export const emitPhonemeMasteryUpdate = (detail?: Partial<PhonemeSyncState>, targetUserId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const masteryMap = detail?.masteryMap || getPhonemeMasteryMap(targetUserId);
    const badges = detail?.badges || calculatePhonemeBadges(masteryMap);
    const masteredCount = detail?.stats?.masteredCount ?? countMasteredPhonemes(masteryMap);
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

// 从云端拉取最新掌握度与勋章状态 (带合流合并机制与竞态守卫)
export const fetchPhonemesCloudProgress = async (targetUserId?: string): Promise<PhonemeSyncState> => {
  const requestUserId = targetUserId || getPhonemeUserId();
  const localMap = getPhonemeMasteryMap(requestUserId);
  const apiBase = getApiBase();

  try {
    emitPhonemeMasteryUpdate({ isSyncing: true }, requestUserId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch(`${apiBase}/api/phonemes/progress?user_id=${encodeURIComponent(requestUserId)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        ...getPhonemeAuthHeaders(requestUserId),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();

      // 竞态守卫：切号瞬间若请求发出时的用户不是当前激活用户，直接丢弃该响应（不写本地、不广播）
      if (requestUserId !== getPhonemeUserId()) {
        console.warn(`[RaceGuard] Discarded fetchPhonemesCloudProgress response: requestUserId=${requestUserId} != currentUserId=${getPhonemeUserId()}`);
        return {
          masteryMap: localMap,
          badges: calculatePhonemeBadges(localMap),
          stats: {
            masteredCount: countMasteredPhonemes(localMap),
            totalCount: 39,
            masteryPercentage: Math.round((countMasteredPhonemes(localMap) / 39) * 100),
          },
          isOnline: true,
          isSyncing: false,
        };
      }

      const serverMap: Record<string, any> = data.masteryMap || {};

      // 智能双向合流：逻辑并集，任何一端掌握过即视为掌握，避免覆盖丢失
      let hasLocalDifference = false;
      const mergedMap: Record<string, any> = { ...serverMap };
      for (const [k, v] of Object.entries(localMap)) {
        if (v && !serverMap[k]) {
          // 保留原值：quiz_data_* 等对象键不能压成 true，否则测验数据丢失
          mergedMap[k] = v;
          hasLocalDifference = true;
        }
      }

      // 保存最新数据到本地分桶
      savePhonemeMasteryLocal(mergedMap, requestUserId);
      setPhonemeLastSync(Date.now(), requestUserId);

      // 如果本地有服务端未记录的进展，异步回写同步至云端
      if (hasLocalDifference) {
        syncLocalPhonemesToCloud(mergedMap, requestUserId).catch(console.warn);
      }

      const badges = data.badges && data.badges.length > 0
        ? data.badges
        : calculatePhonemeBadges(mergedMap);
      savePhonemeBadgesLocal(badges, requestUserId);

      const masteredCount = countMasteredPhonemes(mergedMap);
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

      emitPhonemeMasteryUpdate(result, requestUserId);
      return result;
    }
  } catch (err) {
    console.warn("fetchPhonemesCloudProgress offline or error:", err);
  }

  // 离线或异常时回退到本地数据
  const badges = calculatePhonemeBadges(localMap);
  const masteredCount = countMasteredPhonemes(localMap);
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
  // 竞态守卫：离线回退广播前校验当前用户，切号后不广播旧号数据
  if (requestUserId === getPhonemeUserId()) {
    emitPhonemeMasteryUpdate(result, requestUserId);
  }
  return result;
};

// 切换单音掌握状态 (0ms 乐观更新 + 异步云端持久化 + 竞态守卫)
export const togglePhonemeMastery = (phonemeId: string): boolean => {
  if (typeof window === "undefined") return false;

  const requestUserId = getPhonemeUserId();
  const map = getPhonemeMasteryMap(requestUserId);
  const nextState = !map[phonemeId];
  map[phonemeId] = nextState;

  // 1. 本地乐观秒更新
  savePhonemeMasteryLocal(map, requestUserId);
  emitPhonemeMasteryUpdate({ masteryMap: map, isSyncing: true }, requestUserId);

  // 2. 异步云端持久化
  const apiBase = getApiBase();

  fetch(`${apiBase}/api/phonemes/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...getPhonemeAuthHeaders(requestUserId),
    },
    body: JSON.stringify({
      user_id: requestUserId,
      phonemeId,
      mastered: nextState,
    }),
  })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();

        // 竞态守卫：切号瞬间若当前激活用户已变，直接丢弃该响应（不写本地、不广播）
        if (requestUserId !== getPhonemeUserId()) {
          console.warn(`[RaceGuard] Discarded togglePhonemeMastery response: requestUserId=${requestUserId} != currentUserId=${getPhonemeUserId()}`);
          return;
        }

        setPhonemeLastSync(Date.now(), requestUserId);
        // 与全量上传同一规则：服务端回显不直接覆盖本地，合并保留本地独有键
        const returnedToggleMap: Record<string, any> = data.masteryMap || {};
        const mergedToggleMap: Record<string, any> = { ...returnedToggleMap };
        for (const [k, v] of Object.entries(map)) {
          if (v && !returnedToggleMap[k]) {
            mergedToggleMap[k] = v;
          }
        }
        savePhonemeMasteryLocal(mergedToggleMap, requestUserId);
        if (data.badges) {
          savePhonemeBadgesLocal(data.badges, requestUserId);
        }

        emitPhonemeMasteryUpdate({
          masteryMap: mergedToggleMap,
          badges: data.badges,
          stats: data.stats,
          isOnline: true,
          isSyncing: false,
        }, requestUserId);
      }
    })
    .catch((err) => {
      if (requestUserId !== getPhonemeUserId()) return;
      console.warn("Cloud persistence failed, saved locally:", err);
      emitPhonemeMasteryUpdate({ isOnline: false, isSyncing: false }, requestUserId);
    });

  return nextState;
};

// 全量将本地数据同步至云端数据库 (带竞态守卫)
export const syncLocalPhonemesToCloud = async (
  overrideMap?: Record<string, boolean>,
  targetUserId?: string
): Promise<PhonemeSyncState> => {
  const requestUserId = targetUserId || getPhonemeUserId();
  const localMap = overrideMap || getPhonemeMasteryMap(requestUserId);
  const apiBase = getApiBase();

  try {
    emitPhonemeMasteryUpdate({ isSyncing: true }, requestUserId);

    const resp = await fetch(`${apiBase}/api/phonemes/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...getPhonemeAuthHeaders(requestUserId),
      },
      body: JSON.stringify({
        user_id: requestUserId,
        localMap,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();

      // 竞态守卫：切号瞬间若当前激活用户已变，直接丢弃该响应（不写本地、不广播）
      if (requestUserId !== getPhonemeUserId()) {
        console.warn(`[RaceGuard] Discarded syncLocalPhonemesToCloud response: requestUserId=${requestUserId} != currentUserId=${getPhonemeUserId()}`);
        return {
          masteryMap: localMap,
          badges: calculatePhonemeBadges(localMap),
          stats: {
            masteredCount: countMasteredPhonemes(localMap),
            totalCount: 39,
            masteryPercentage: Math.round((countMasteredPhonemes(localMap) / 39) * 100),
          },
          isOnline: true,
          isSyncing: false,
        };
      }

      // 上传成功后不直接用服务端回显覆盖本地：与下载路径一样的合并，保留本地对象值
      const returnedMap: Record<string, any> = data.masteryMap || {};
      const serverMap: Record<string, any> = { ...returnedMap };
      for (const [k, v] of Object.entries(localMap)) {
        if (v && !returnedMap[k]) {
          serverMap[k] = v;
        }
      }
      savePhonemeMasteryLocal(serverMap, requestUserId);
      setPhonemeLastSync(Date.now(), requestUserId);
      if (data.badges) {
        savePhonemeBadgesLocal(data.badges, requestUserId);
      }

      const result: PhonemeSyncState = {
        masteryMap: serverMap,
        badges: data.badges || calculatePhonemeBadges(serverMap),
        stats: data.stats || {
          masteredCount: countMasteredPhonemes(serverMap),
          totalCount: 39,
          masteryPercentage: Math.round((countMasteredPhonemes(serverMap) / 39) * 100),
        },
        isOnline: true,
        isSyncing: false,
        lastSyncedAt: Date.now(),
      };
      emitPhonemeMasteryUpdate(result, requestUserId);
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
      masteredCount: countMasteredPhonemes(localMap),
      totalCount: 39,
      masteryPercentage: Math.round((countMasteredPhonemes(localMap) / 39) * 100),
    },
    isOnline: false,
    isSyncing: false,
  };
};

// 切号与游客合流引擎
export const switchPhonemeUser = async (
  newUser: { id: string; accessToken?: string } | null,
  prevGuestUid?: string
): Promise<void> => {
  if (typeof window === "undefined") return;

  // a. 算出 targetUid = newUser?.id || getPhonemeUserId()
  if (!newUser) {
    try {
      localStorage.removeItem("sunnybridge_user");
    } catch {}
  }
  const targetUid = newUser?.id ? String(newUser.id) : getPhonemeUserId();

  // b. 如 prevGuestUid 有有效学习记录（masteredCount > 0），执行游客合流（并集）进目标号
  let mergeSyncPromise: Promise<void> | null = null;
  if (prevGuestUid && prevGuestUid !== targetUid) {
    const guestMap: Record<string, any> = getPhonemeMasteryMap(prevGuestUid);
    const guestMasteredCount = countMasteredPhonemes(guestMap);

    if (guestMasteredCount > 0) {
      // 先在内存做并集并写入目标号本地桶
      const targetMap: Record<string, any> = getPhonemeMasteryMap(targetUid);
      const mergedMap: Record<string, any> = { ...targetMap };
      for (const [k, v] of Object.entries(guestMap)) {
        if (!v) continue;
        if (!mergedMap[k]) {
          mergedMap[k] = v;
        } else if (typeof v === "object" && v !== null && typeof mergedMap[k] === "object" && mergedMap[k] !== null) {
          mergedMap[k] = Object.assign({}, mergedMap[k], v);
        } else if (v === true || mergedMap[k] === true) {
          mergedMap[k] = mergedMap[k] || v;
        }
      }
      savePhonemeMasteryLocal(mergedMap, targetUid);

      // 随后云端同步确认成功后，再移除该 guest 桶本地存储并生成全新 guestUid，防止二次复用合流；
      // 合流失败（网络超时等）时游客桶原样保留，绝不先清空。
      mergeSyncPromise = (async () => {
        try {
          const apiBase = getApiBase();
          const resp = await fetch(`${apiBase}/api/phonemes/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              ...(newUser?.accessToken
                ? { Authorization: `Bearer ${newUser.accessToken}` }
                : getPhonemeAuthHeaders(targetUid)),
            },
            body: JSON.stringify({
              user_id: targetUid,
              localMap: mergedMap,
            }),
          });

          if (resp.ok) {
            // 云端确认成功：移除该 guest 桶本地存储
            try {
              localStorage.removeItem(getScopedKey(BASE_MASTERY_KEY, prevGuestUid));
              localStorage.removeItem(getScopedKey(BASE_BADGES_KEY, prevGuestUid));
              localStorage.removeItem(getScopedKey(BASE_SYNC_KEY, prevGuestUid));
            } catch {}

            // 生成全新 guestUid，防止二次复用合流
            const newGuestUid = "guest_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
            try {
              localStorage.setItem("sunnybridge_guest_uid", newGuestUid);
            } catch {}
          } else {
            console.warn("Guest merge sync returned non-ok status, preserving guest bucket");
          }
        } catch (err) {
          console.warn("Guest merge sync failed (network timeout or error), preserving guest bucket:", err);
        }
      })();
    }
  }

  // c. 同步读新号本地桶，立即 emitPhonemeMasteryUpdate（界面秒切，阻断旧号残影）
  const freshLocalMap = getPhonemeMasteryMap(targetUid);
  emitPhonemeMasteryUpdate({
    masteryMap: freshLocalMap,
    badges: calculatePhonemeBadges(freshLocalMap),
    stats: {
      masteredCount: countMasteredPhonemes(freshLocalMap),
      totalCount: 39,
      masteryPercentage: Math.round((countMasteredPhonemes(freshLocalMap) / 39) * 100),
    },
    isSyncing: true,
  }, targetUid);

  // d. 异步 fetchPhonemesCloudProgress() 完成增量合流，再广播一次
  if (mergeSyncPromise) {
    mergeSyncPromise.finally(() => {
      fetchPhonemesCloudProgress(targetUid).catch(console.warn);
    });
  } else {
    fetchPhonemesCloudProgress(targetUid).catch(console.warn);
  }
};
