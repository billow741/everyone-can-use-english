/**
 * 阳光桥少儿英语 · LDOCE5 后端音标查询与共享缓存模块
 * 工单：/home/billow/desktop-ldoce-frontend/工单-词详情LDOCE接线-2026-11-16.md
 */

export interface WordIpaResult {
  us: string;
  uk: string;
  source: string;
}

// 模块级内存缓存（Map，key 为小写词形），不写 localStorage
const memoryCache = new Map<string, WordIpaResult>();

// 在途请求去重（同一词并发只发一个 fetch）
const pendingFetches = new Map<string, Promise<WordIpaResult | null>>();

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
 * 同步读取内存缓存
 */
export function getCachedWordIpa(word: string): WordIpaResult | null {
  const clean = (word || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return null;
  return memoryCache.get(clean) || null;
}

/**
 * 清空内存缓存（仅供测试或重置使用）
 */
export function clearWordIpaCache(): void {
  memoryCache.clear();
  pendingFetches.clear();
}

/**
 * 异步查询后端词典接口
 * URL 与 stories.tsx L1236 一致：GET https://app.sunnybridge.qzz.io/api/dictionary?word=<clean>&context=<context>
 * 失败（网络错、非 200、JSON 异常、无值）返回 null，不抛错、不写缓存
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
      let url = `https://app.sunnybridge.qzz.io/api/dictionary?word=${encodeURIComponent(clean)}`;
      if (context) {
        url += `&context=${encodeURIComponent(context)}`;
      }

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
