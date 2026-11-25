/**
 * 阳光桥少儿英语 · LDOCE5 后端音标与词典查询与共享缓存模块
 * 工单：/home/billow/desktop-highlight-dict/工单-播放页高亮居中与查词卡兜底-2026-11-18.md
 * 原工单：/home/billow/desktop-ldoce-frontend/工单-词详情LDOCE接线-2026-11-16.md
 */

export interface WordIpaResult {
  us: string;
  uk: string;
  source: string;
}

export interface WordDictionaryResult {
  us: string;
  uk: string;
  phonetic: string;
  translation: string;
  pos: string;
  source: string;
}

// 模块级内存缓存（Map，key 为小写词形），不写 localStorage
const memoryCache = new Map<string, WordIpaResult>();
const pendingFetches = new Map<string, Promise<WordIpaResult | null>>();

const dictMemoryCache = new Map<string, WordDictionaryResult>();
const pendingDictFetches = new Map<string, Promise<WordDictionaryResult | null>>();

/**
 * 统一音标包装格式：确保包含前后斜杠 /.../
 */
export function formatIpa(raw: string | undefined | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") && trimmed.endsWith("/") && trimmed.length > 1) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

/**
 * 残缺音标判定：
 * 工单规则：去掉斜杠与 ˈ 后剩余字母少于 2 个即视为残缺；
 * 包含连字符 '-'（如 LDOCE 派生后缀片段 ˈ-ər、-ɪŋ 等）也视为残缺片段。
 */
export function isPhoneticFragment(raw: string | undefined | null): boolean {
  if (!raw) return true;
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (trimmed.includes("-")) return true;
  const letters = trimmed.replace(/[/ˈˌ\s]/g, "");
  if (letters.length < 2) return true;
  return false;
}

/**
 * 音标回落解析：优先 phonetic_us，若为空或残缺片段则回落 phonetic_uk，再回落 phonetic；三者均无返回空串
 */
export function resolvePhonetic(dict: {
  us?: string;
  uk?: string;
  phonetic?: string;
}): string {
  const us = (dict.us || "").trim();
  if (us && !isPhoneticFragment(us)) {
    return formatIpa(us);
  }
  const uk = (dict.uk || "").trim();
  if (uk && !isPhoneticFragment(uk)) {
    return formatIpa(uk);
  }
  const general = (dict.phonetic || "").trim();
  if (general && !isPhoneticFragment(general)) {
    return formatIpa(general);
  }
  return "";
}

/**
 * 同步读取音标内存缓存
 */
export function getCachedWordIpa(word: string): WordIpaResult | null {
  const clean = (word || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return null;
  return memoryCache.get(clean) || null;
}

/**
 * 同步读取词典内存缓存
 */
export function getCachedWordDictionary(word: string): WordDictionaryResult | null {
  const clean = (word || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return null;
  return dictMemoryCache.get(clean) || null;
}

/**
 * 清空内存缓存（仅供测试或重置使用）
 */
export function clearWordIpaCache(): void {
  memoryCache.clear();
  pendingFetches.clear();
}

export function clearWordDictionaryCache(): void {
  dictMemoryCache.clear();
  pendingDictFetches.clear();
}

function getDictionaryApiUrl(clean: string, context?: string): string {
  const isHttp =
    typeof window !== "undefined" &&
    window.location &&
    window.location.protocol.startsWith("http");
  const base = isHttp ? "" : "https://app.sunnybridge.qzz.io";
  let url = `${base}/api/dictionary?word=${encodeURIComponent(clean)}`;
  if (context) {
    url += `&context=${encodeURIComponent(context)}`;
  }
  return url;
}

/**
 * 异步查询后端词典完整信息（音标、释义、词性等）
 * 供查词卡无精读词条时兜底使用
 */
export async function fetchWordDictionary(
  word: string,
  context?: string
): Promise<WordDictionaryResult | null> {
  const clean = (word || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return null;

  // 1. 命中缓存直接返回
  const cached = dictMemoryCache.get(clean);
  if (cached) {
    return cached;
  }

  // 2. 在途请求去重：复用已有 Promise
  const pending = pendingDictFetches.get(clean);
  if (pending) {
    return pending;
  }

  // 3. 发起新请求
  const fetchPromise = (async (): Promise<WordDictionaryResult | null> => {
    try {
      const url = getDictionaryApiUrl(clean, context);
      const res = await fetch(url);
      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (!data) return null;

      const rawUs = (data.phonetic_us ?? "").trim();
      const rawUk = (data.phonetic_uk ?? "").trim();
      const rawPhonetic = (
        data.phonetic !== undefined && data.phonetic !== ""
          ? data.phonetic
          : data.pronunciation || ""
      ).trim();

      const rawTrans = (data.translation || "").trim();
      // 如果后端兜底直接把英文单词原样作为 translation（如 lippity），且无实际中文释义，视为空翻译
      const hasRealTranslation =
        rawTrans && rawTrans.toLowerCase() !== clean.toLowerCase();
      const translation = hasRealTranslation ? rawTrans : "";

      const pos = (data.pos || "").trim();
      const source = (data.pronunciation_source || data.source || "").trim();

      const result: WordDictionaryResult = {
        us: rawUs,
        uk: rawUk,
        phonetic: rawPhonetic,
        translation,
        pos,
        source,
      };

      // 成功写入模块级内存缓存
      dictMemoryCache.set(clean, result);
      return result;
    } catch {
      return null;
    } finally {
      pendingDictFetches.delete(clean);
    }
  })();

  pendingDictFetches.set(clean, fetchPromise);
  return fetchPromise;
}

/**
 * 异步查询后端音标接口（保留旧接口签名与行为）
 */
export async function fetchWordIpa(
  word: string,
  context?: string
): Promise<WordIpaResult | null> {
  const clean = (word || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return null;

  // 1. 命中缓存直接返回
  const cached = memoryCache.get(clean);
  if (cached) {
    return cached;
  }

  // 2. 在途请求去重：复用已有 Promise
  const pending = pendingFetches.get(clean);
  if (pending) {
    return pending;
  }

  // 3. 发起新请求
  const fetchPromise = (async (): Promise<WordIpaResult | null> => {
    try {
      const url = getDictionaryApiUrl(clean, context);
      const res = await fetch(url);
      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (!data) return null;

      // 提取 us / uk / source，兼容回落：新字段缺失时读 phonetic / pronunciation 作 us
      const rawUs = (
        data.phonetic_us !== undefined && data.phonetic_us !== ""
          ? data.phonetic_us
          : data.phonetic || data.pronunciation || ""
      ).trim();
      const rawUk = (data.phonetic_uk || "").trim();
      const source = (data.pronunciation_source || data.source || "").trim();

      if (!rawUs && !rawUk) {
        return null;
      }

      const result: WordIpaResult = {
        us: formatIpa(rawUs),
        uk: formatIpa(rawUk),
        source,
      };

      // 成功写入模块级内存缓存
      memoryCache.set(clean, result);
      return result;
    } catch {
      return null;
    } finally {
      pendingFetches.delete(clean);
    }
  })();

  pendingFetches.set(clean, fetchPromise);
  return fetchPromise;
}
