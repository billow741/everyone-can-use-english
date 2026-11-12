// SunnyBridge 听力进度本地持久化 + 云端同步
// 复用 phoneme-cloud-sync 的模式与 openid 体系

import { getPhonemeUserId, getPhonemeAuthHeaders, getScopedKey } from "./phoneme-cloud-sync";

export { getPhonemeUserId as getListeningUserId };

const BASE_FINISHED_KEY = "sunnybridge_listening_finished_v1";
const BASE_FAV_SENTENCES_KEY = "sunnybridge_listening_fav_sentences_v1";
const BASE_FAV_WORDS_KEY = "sunnybridge_listening_fav_words_v1";
const BASE_SYNC_KEY = "sunnybridge_listening_last_sync";

const getApiBase = (): string => {
  if (typeof window === "undefined") return "https://app.sunnybridge.qzz.io";
  if (window.location.origin.includes("sunnybridge.qzz.io")) return "";
  return "https://app.sunnybridge.qzz.io";
};

// ---- 本地读写 ----

export const getFinishedLocal = (userId?: string): Record<string, Record<string, boolean>> => {
  const uid = userId ?? getPhonemeUserId();
  try {
    const raw = localStorage.getItem(getScopedKey(BASE_FINISHED_KEY, uid));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveFinishedLocal = (
  map: Record<string, Record<string, boolean>>,
  userId?: string
) => {
  const uid = userId ?? getPhonemeUserId();
  try {
    localStorage.setItem(getScopedKey(BASE_FINISHED_KEY, uid), JSON.stringify(map));
  } catch {}
};

export const getFavSentencesLocal = (userId?: string): Record<string, Record<string, number[]>> => {
  const uid = userId ?? getPhonemeUserId();
  try {
    const raw = localStorage.getItem(getScopedKey(BASE_FAV_SENTENCES_KEY, uid));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveFavSentencesLocal = (
  map: Record<string, Record<string, number[]>>,
  userId?: string
) => {
  const uid = userId ?? getPhonemeUserId();
  try {
    localStorage.setItem(getScopedKey(BASE_FAV_SENTENCES_KEY, uid), JSON.stringify(map));
  } catch {}
};

export const getFavWordsLocal = (userId?: string): Record<string, Record<string, string[]>> => {
  const uid = userId ?? getPhonemeUserId();
  try {
    const raw = localStorage.getItem(getScopedKey(BASE_FAV_WORDS_KEY, uid));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveFavWordsLocal = (
  map: Record<string, Record<string, string[]>>,
  userId?: string
) => {
  const uid = userId ?? getPhonemeUserId();
  try {
    localStorage.setItem(getScopedKey(BASE_FAV_WORDS_KEY, uid), JSON.stringify(map));
  } catch {}
};

// ---- 章节听完标记 ----

export const markChapterFinished = (book: string, chapter: string, done = true): void => {
  const map = getFinishedLocal();
  if (!map[book]) map[book] = {};
  map[book][chapter] = done;
  saveFinishedLocal(map);
  // 触发云端同步（非阻塞）
  syncListeningToCloud().catch(() => {});
};

export const isChapterFinished = (book: string, chapter: string): boolean => {
  const map = getFinishedLocal();
  return !!(map[book]?.[chapter]);
};

// ---- 收藏句子 ----

export const toggleFavSentence = (book: string, chapter: string, sentenceIdx: number): boolean => {
  const map = getFavSentencesLocal();
  if (!map[book]) map[book] = {};
  if (!map[book][chapter]) map[book][chapter] = [];
  const arr = map[book][chapter];
  const pos = arr.indexOf(sentenceIdx);
  if (pos >= 0) {
    arr.splice(pos, 1);
  } else {
    arr.push(sentenceIdx);
  }
  map[book][chapter] = arr;
  saveFavSentencesLocal(map);
  syncListeningToCloud().catch(() => {});
  return pos < 0; // true = 已收藏
};

export const isSentenceFaved = (book: string, chapter: string, sentenceIdx: number): boolean => {
  const map = getFavSentencesLocal();
  return !!(map[book]?.[chapter]?.includes(sentenceIdx));
};

// ---- 收藏生词 ----

export const toggleFavWord = (book: string, chapter: string, word: string): boolean => {
  const map = getFavWordsLocal();
  if (!map[book]) map[book] = {};
  if (!map[book][chapter]) map[book][chapter] = [];
  const arr = map[book][chapter];
  const pos = arr.indexOf(word);
  if (pos >= 0) {
    arr.splice(pos, 1);
  } else {
    arr.push(word);
  }
  map[book][chapter] = arr;
  saveFavWordsLocal(map);
  syncListeningToCloud().catch(() => {});
  return pos < 0;
};

export const isWordFaved = (book: string, chapter: string, word: string): boolean => {
  const map = getFavWordsLocal();
  return !!(map[book]?.[chapter]?.includes(word));
};

// ---- 云端同步（非阻塞，访客跳过）----

export const syncListeningToCloud = async (): Promise<void> => {
  const userId = getPhonemeUserId();
  if (userId.startsWith("guest_")) return; // 游客只存本地
  const apiBase = getApiBase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getPhonemeAuthHeaders(userId),
  };
  const payload = {
    user_id: userId,
    finished: getFinishedLocal(userId),
    fav_sentences: getFavSentencesLocal(userId),
    fav_words: getFavWordsLocal(userId),
    synced_at: Date.now(),
  };
  try {
    await fetch(`${apiBase}/api/v1/listening/progress`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });
    localStorage.setItem(getScopedKey(BASE_SYNC_KEY, userId), String(Date.now()));
  } catch {
    // 网络失败静默，本地已先写
  }
};

export const fetchListeningProgressFromCloud = async (): Promise<void> => {
  const userId = getPhonemeUserId();
  if (userId.startsWith("guest_")) return;
  const apiBase = getApiBase();
  const headers: Record<string, string> = {
    ...getPhonemeAuthHeaders(userId),
  };
  try {
    const res = await fetch(`${apiBase}/api/v1/listening/progress?user_id=${encodeURIComponent(userId)}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    if (data.finished) saveFinishedLocal(data.finished, userId);
    if (data.fav_sentences) saveFavSentencesLocal(data.fav_sentences, userId);
    if (data.fav_words) saveFavWordsLocal(data.fav_words, userId);
  } catch {
    // 离线时使用本地数据
  }
};

// ---- Catalog 加载 ----

import listeningFallback from "./listening-catalog-fallback.json";

export const loadCatalog = async (): Promise<{ books: import("../pages/listening/types").BookMeta[]; chapters: import("../pages/listening/types").CatalogEntry[] } | null> => {
  try {
    const apiBase = getApiBase();
    const url = apiBase ? `${apiBase}/listening-data/v2/catalog.json` : "/listening-data/v2/catalog.json";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.books && data.books.length > 0) return data;
    }
  } catch (_) {}

  try {
    const localRes = await fetch("/listening-data/v2/catalog.json");
    if (localRes.ok) {
      const data = await localRes.json();
      if (data && data.books && data.books.length > 0) return data;
    }
  } catch (_) {}

  // 离线完整兜底（包含彼得兔 15 + 绒布小兔 1 + 环球漫游 79）
  return listeningFallback as any;
};

export const loadChapterData = async (
  book: string,
  chapter: string
): Promise<import("../pages/listening/types").ListeningChapter | null> => {
  try {
    const res = await fetch(`/listening-data/v2/${book}/${chapter}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};
