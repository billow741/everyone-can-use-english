import { getScopedKey } from "./phoneme-cloud-sync";

/**
 * 阳光桥少儿英语 · 作答事件流水与词级曝光记录（数据地基）
 * 依据：《方案-通关岛全新游戏方案-专家共创版-2026-11-03》第九节与 DATA-WORKORDER.md
 *
 * 核心设计原则：
 * 1. 分桶隔离：使用 getScopedKey(baseKey) 按当前用户 user.id / guestUid 分桶。
 * 2. 纯客户端只读/只追加存储：localStorage 存储，不改动现有任何掌握度、奖牌或 SRS 键。
 * 3. 容错第一：所有写入操作 try/catch 兜底，绝不抛错打断上层业务或玩法逻辑。
 * 4. 流水容量：FIFO 保留最近 3000 条事件。
 */

export const EVENTS_STORAGE_KEY = "sunnybridge_learning_events_v1";
export const WORD_EXPOSURE_STORAGE_KEY = "sunnybridge_word_exposure_v1";
export const MAX_LEARNING_EVENTS = 3000;

export type LearningSkill = "listen" | "blend" | "family" | "sentence" | "review";
export type LearningResult = "independent" | "assisted" | "wrong";

export type LearningEvent = {
  ts: number;                 // Date.now()
  phoneme: string;            // 音素 slug，如 's'、'ae'；句子级事件可为空串
  word?: string;              // 涉及的词（小写），无则缺省
  skill: LearningSkill;
  mode: string;               // 来源关型/组件标识，如 'signal-hunt'、'manual-blend'、'legacy-step1'
  levelId?: string;           // 关卡标识，如 'R03' 或既有音素关 slug
  attempt: number;            // 本题第几次尝试（1 起）
  firstTry: boolean;          // 是否首次尝试即对（attempt===1 且 result 为 independent）
  result: LearningResult;
  scaffold: number;           // 当时的脚手架档位（0=无脚手架…3=全脚手架，口径随试点工单）
  durationMs?: number;        // 本题耗时（可得则记）
};

export type WordExposureRecord = {
  seen: number;               // 同 exposures（保留字段名与专家稿一致）
  lastSeenAt: number;         // 最近一次呈现时间戳
  firstTryCorrect: number;    // 该词作为验证题时首次尝试即对的累计次数
  exposures: number;          // 该词被呈现给孩子的总次数
};

export type LearningEventFilter =
  | {
      phoneme?: string;
      skill?: LearningSkill;
      mode?: string;
      result?: LearningResult;
      since?: number;
      until?: number;
    }
  | ((event: LearningEvent) => boolean);

export type PhonemeStats = {
  attempts: number;
  firstTryCorrect: number;
  lastCorrectAt: number | null;
  lastAttemptAt: number | null;
  scaffoldLevel: number;
};

export type PhonemeLitStatus = {
  lit: boolean;
  status: "lit" | "pending" | "unmet";
  verifyCount: number;
  accuracy: number;
  unseenVerifiedCount: number;
};

// ==========================================
// 1. 作答事件流水 (Event Stream)
// ==========================================

export function recordEvent(
  e: Omit<LearningEvent, "ts"> | (Omit<LearningEvent, "ts" | "firstTry"> & { firstTry?: boolean }),
  userId?: string
): LearningEvent | null {
  if (typeof window === "undefined") return null;
  try {
    const attempt = typeof e.attempt === "number" && e.attempt > 0 ? e.attempt : 1;
    const result = e.result || "independent";
    const firstTry =
      typeof e.firstTry === "boolean"
        ? e.firstTry
        : attempt === 1 && result === "independent";

    const word = e.word ? e.word.trim().toLowerCase() : undefined;

    const event: LearningEvent = {
      ts: Date.now(),
      phoneme: e.phoneme || "",
      ...(word ? { word } : {}),
      skill: e.skill,
      mode: e.mode || "unknown",
      ...(e.levelId ? { levelId: e.levelId } : {}),
      attempt,
      firstTry,
      result,
      scaffold: typeof e.scaffold === "number" ? e.scaffold : 0,
      ...(typeof e.durationMs === "number" ? { durationMs: e.durationMs } : {}),
    };

    const key = getScopedKey(EVENTS_STORAGE_KEY, userId);
    const raw = localStorage.getItem(key);
    let events: LearningEvent[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          events = parsed;
        }
      } catch {}
    }

    events.push(event);

    // FIFO: 超出 MAX_LEARNING_EVENTS 丢弃最旧
    if (events.length > MAX_LEARNING_EVENTS) {
      events = events.slice(events.length - MAX_LEARNING_EVENTS);
    }

    localStorage.setItem(key, JSON.stringify(events));
    return event;
  } catch (err) {
    // 写入异常容错，绝不抛错打断玩法
    console.warn("recordEvent error:", err);
    return null;
  }
}

export function getEvents(filter?: LearningEventFilter, userId?: string): LearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getScopedKey(EVENTS_STORAGE_KEY, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    let events: LearningEvent[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        events = parsed;
      }
    } catch {
      return [];
    }

    if (!filter) return events;

    if (typeof filter === "function") {
      return events.filter(filter);
    }

    return events.filter((e) => {
      if (filter.phoneme !== undefined && e.phoneme !== filter.phoneme) return false;
      if (filter.skill !== undefined && e.skill !== filter.skill) return false;
      if (filter.mode !== undefined && e.mode !== filter.mode) return false;
      if (filter.result !== undefined && e.result !== filter.result) return false;
      if (typeof filter.since === "number" && e.ts < filter.since) return false;
      if (typeof filter.until === "number" && e.ts > filter.until) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export function clearEventsForCurrentUser(userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getScopedKey(EVENTS_STORAGE_KEY, userId);
    localStorage.removeItem(key);
  } catch {}
}

// ==========================================
// 2. 词级曝光记录 (Word Exposure)
// ==========================================

function getWordExposureMap(userId?: string): Record<string, WordExposureRecord> {
  if (typeof window === "undefined") return {};
  try {
    const key = getScopedKey(WORD_EXPOSURE_STORAGE_KEY, userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {}
  return {};
}

function saveWordExposureMap(map: Record<string, WordExposureRecord>, userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getScopedKey(WORD_EXPOSURE_STORAGE_KEY, userId);
    localStorage.setItem(key, JSON.stringify(map));
  } catch (err) {
    console.warn("saveWordExposureMap error:", err);
  }
}

export function recordWordExposure(
  word: string,
  _kind: "practice" | "verify" = "practice",
  userId?: string
): WordExposureRecord | null {
  if (typeof window === "undefined" || !word) return null;
  try {
    const w = word.trim().toLowerCase();
    if (!w) return null;

    const map = getWordExposureMap(userId);
    const now = Date.now();
    const existing = map[w];

    if (existing) {
      existing.exposures = (existing.exposures || 0) + 1;
      existing.seen = existing.exposures;
      existing.lastSeenAt = now;
      map[w] = existing;
    } else {
      map[w] = {
        seen: 1,
        lastSeenAt: now,
        firstTryCorrect: 0,
        exposures: 1,
      };
    }

    saveWordExposureMap(map, userId);
    return map[w];
  } catch (err) {
    console.warn("recordWordExposure error:", err);
    return null;
  }
}

export function recordWordVerifyResult(
  word: string,
  firstTry: boolean,
  userId?: string
): WordExposureRecord | null {
  if (typeof window === "undefined" || !word) return null;
  try {
    const w = word.trim().toLowerCase();
    if (!w) return null;

    const map = getWordExposureMap(userId);
    const now = Date.now();
    const existing = map[w];

    if (existing) {
      if (firstTry) {
        existing.firstTryCorrect = (existing.firstTryCorrect || 0) + 1;
      }
      existing.lastSeenAt = now;
      map[w] = existing;
    } else {
      map[w] = {
        seen: 1,
        lastSeenAt: now,
        firstTryCorrect: firstTry ? 1 : 0,
        exposures: 1,
      };
    }

    saveWordExposureMap(map, userId);
    return map[w];
  } catch (err) {
    console.warn("recordWordVerifyResult error:", err);
    return null;
  }
}

export function getWordExposure(word: string, userId?: string): WordExposureRecord | null {
  if (typeof window === "undefined" || !word) return null;
  try {
    const w = word.trim().toLowerCase();
    const map = getWordExposureMap(userId);
    return map[w] || null;
  } catch {
    return null;
  }
}

export function getUnseenWords(candidates: string[], userId?: string): string[] {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  try {
    const map = getWordExposureMap(userId);
    return candidates.filter((item) => {
      if (!item) return false;
      const w = item.trim().toLowerCase();
      const rec = map[w];
      return !rec || !rec.exposures || rec.exposures === 0;
    });
  } catch {
    return [...candidates];
  }
}

export function clearWordExposuresForCurrentUser(userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getScopedKey(WORD_EXPOSURE_STORAGE_KEY, userId);
    localStorage.removeItem(key);
  } catch {}
}

// ==========================================
// 3. 派生统计 (Derived Statistics - 读时计算)
// ==========================================

export function getPhonemeStats(slug: string, userId?: string): PhonemeStats {
  if (!slug) {
    return {
      attempts: 0,
      firstTryCorrect: 0,
      lastCorrectAt: null,
      lastAttemptAt: null,
      scaffoldLevel: 0,
    };
  }

  try {
    const events = getEvents({ phoneme: slug }, userId);
    if (events.length === 0) {
      return {
        attempts: 0,
        firstTryCorrect: 0,
        lastCorrectAt: null,
        lastAttemptAt: null,
        scaffoldLevel: 0,
      };
    }

    const attempts = events.length;
    let firstTryCorrect = 0;
    let lastCorrectAt: number | null = null;

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.firstTry === true || (e.attempt === 1 && e.result === "independent")) {
        firstTryCorrect++;
      }
      if (e.result === "independent") {
        lastCorrectAt = e.ts;
      }
    }

    const latest = events[events.length - 1];
    const lastAttemptAt = latest.ts;
    const scaffoldLevel = typeof latest.scaffold === "number" ? latest.scaffold : 0;

    return {
      attempts,
      firstTryCorrect,
      lastCorrectAt,
      lastAttemptAt,
      scaffoldLevel,
    };
  } catch {
    return {
      attempts: 0,
      firstTryCorrect: 0,
      lastCorrectAt: null,
      lastAttemptAt: null,
      scaffoldLevel: 0,
    };
  }
}

/**
 * 获取最近 n 次作答的首次正确率（供自适应升降档调用，口径与新方案第四节一致）。
 * - 仅统计首次尝试 (attempt === 1) 的作答题目。
 * - 返回 [0, 1] 浮点数（如 0.8 代表 80%），无有效作答时返回 0。
 */
export function getRecentAccuracy(slug: string, n: number = 6, userId?: string): number {
  if (!slug || n <= 0) return 0;
  try {
    const events = getEvents({ phoneme: slug }, userId);
    const firstAttempts = events.filter((e) => e.attempt === 1 || e.attempt === undefined);
    if (firstAttempts.length === 0) return 0;

    const windowSlice = firstAttempts.slice(-n);
    if (windowSlice.length === 0) return 0;

    const correctCount = windowSlice.filter(
      (e) => e.firstTry === true || (e.attempt === 1 && e.result === "independent")
    ).length;

    return correctCount / windowSlice.length;
  } catch {
    return 0;
  }
}

/**
 * 判定音素点亮详情与状态。
 * 点亮标准（新方案）：
 * 1. 验证类事件 ≥ 4 (mode 带 -verify)
 * 2. 首次正确率 ≥ 80% (>= 0.8)
 * 3. 且含 ≥ 1 个未见词验证通过 (word 字段存在且 result 为 independent)
 *
 * 状态返回值：
 * - lit: 达成全部条件
 * - pending: 待确认（验证项 < 4）
 * - unmet: 验证项已足但未达标（正确率不足或缺未见词验证）
 */
export function getPhonemeLitStatus(slug: string, userId?: string): PhonemeLitStatus {
  if (!slug) {
    return {
      lit: false,
      status: "pending",
      verifyCount: 0,
      accuracy: 0,
      unseenVerifiedCount: 0,
    };
  }

  try {
    const events = getEvents({ phoneme: slug }, userId);
    const verifyEvents = events.filter(
      (e) => Boolean(e.mode && (e.mode.endsWith("-verify") || e.mode.includes("verify")))
    );

    // 验证题目按首次尝试过滤 (attempt === 1)
    const verifyItems = verifyEvents.filter((e) => e.attempt === 1 || e.attempt === undefined);
    const verifyCount = verifyItems.length;

    const correctCount = verifyItems.filter(
      (e) => e.firstTry === true || (e.attempt === 1 && e.result === "independent")
    ).length;
    const accuracy = verifyCount > 0 ? correctCount / verifyCount : 0;

    // 未见词验证通过：在当前分桶全部事件流水中，按时间顺序是 word 字段首次出现且答对的验证事件
    const allEvents = getEvents(undefined, userId);
    const seenWords = new Set<string>();
    let unseenVerifiedCount = 0;

    for (const e of allEvents) {
      const w = e.word?.trim().toLowerCase();
      if (!w) continue;

      if (!seenWords.has(w)) {
        seenWords.add(w);
        const isTargetPhoneme = e.phoneme === slug;
        const isVerifyMode = Boolean(e.mode && (e.mode.endsWith("-verify") || e.mode.includes("verify")));
        const isFirstAttempt = e.attempt === 1 || e.attempt === undefined;
        const isCorrect = e.firstTry === true || e.result === "independent";

        if (isTargetPhoneme && isVerifyMode && isFirstAttempt && isCorrect) {
          unseenVerifiedCount++;
        }
      }
    }

    if (verifyCount < 4) {
      return {
        lit: false,
        status: "pending",
        verifyCount,
        accuracy,
        unseenVerifiedCount,
      };
    }

    const hasUnseenPass = unseenVerifiedCount >= 1;
    const isAccuracyPass = accuracy >= 0.8;

    if (isAccuracyPass && hasUnseenPass) {
      return {
        lit: true,
        status: "lit",
        verifyCount,
        accuracy,
        unseenVerifiedCount,
      };
    }

    return {
      lit: false,
      status: "unmet",
      verifyCount,
      accuracy,
      unseenVerifiedCount,
    };
  } catch {
    return {
      lit: false,
      status: "pending",
      verifyCount: 0,
      accuracy: 0,
      unseenVerifiedCount: 0,
    };
  }
}

export function isPhonemeLit(slug: string, options?: { detailed?: false }, userId?: string): boolean;
export function isPhonemeLit(slug: string, options: { detailed: true }, userId?: string): PhonemeLitStatus;
export function isPhonemeLit(
  slug: string,
  options?: { detailed?: boolean },
  userId?: string
): boolean | PhonemeLitStatus {
  const result = getPhonemeLitStatus(slug, userId);
  if (options?.detailed) {
    return result;
  }
  return result.lit;
}

// ==========================================
// 4. 开发探针 (Probe for Playwright)
// ==========================================

export interface LearningEventsProbe {
  (): {
    count: number;
    latest: LearningEvent | null;
    events: LearningEvent[];
  };
  count: number;
  latest: LearningEvent | null;
}

declare global {
  interface Window {
    __learningEventsProbe?: LearningEventsProbe;
  }
}

if (typeof window !== "undefined") {
  const probe = (() => {
    const events = getEvents();
    return {
      count: events.length,
      latest: events.length > 0 ? events[events.length - 1] : null,
      events,
    };
  }) as LearningEventsProbe;

  Object.defineProperty(probe, "count", {
    get: () => getEvents().length,
    configurable: true,
    enumerable: true,
  });

  Object.defineProperty(probe, "latest", {
    get: () => {
      const events = getEvents();
      return events.length > 0 ? events[events.length - 1] : null;
    },
    configurable: true,
    enumerable: true,
  });

  window.__learningEventsProbe = probe;
}
