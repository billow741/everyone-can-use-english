import {
  getPhonemeAuthHeaders,
  getPhonemeUserId,
  getScopedKey,
} from "@renderer/lib/phoneme-cloud-sync";

// 生词 SRS 引擎（本地，按用户分桶）：SM-2 进阶版（EF 难度系数 + 每日新词上限 + 难词标记）
// Again=10 分钟 / Hard / Good / Easy 基于 ease 难度系数计算间隔；按钮上印的即下次到期时间
export type SrsGrade = "again" | "hard" | "good" | "easy";
export type DailyNewLimitOption = 5 | 10 | 20;

export interface SrsEntry {
  id: string; // meaning.id
  word: string;
  intervalDays: number; // 本次排定的间隔（天，可为分数：10 分钟 = 1/144）
  dueAt: number; // epoch ms
  reps: number;
  lapses: number;
  ease: number; // 难度系数 EF（初始 2.5，范围 [1.3, 2.8]）
  lastGrade: SrsGrade | null;
  updatedAt: string;
}

export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const LEECH_LAPSES_THRESHOLD = 4;
export const DAILY_NEW_LIMIT_OPTIONS: readonly DailyNewLimitOption[] = [5, 10, 20];
export const DEFAULT_DAILY_NEW_LIMIT: DailyNewLimitOption = 10;

const SRS_BASE_KEY = "sunnybridge_vocab_srs_v1";
const DAILY_NEW_LIMIT_BASE_KEY = "sunnybridge_vocab_daily_new_limit_v1";
const DAILY_NEW_PROGRESS_BASE_KEY = "sunnybridge_vocab_daily_new_progress_v1";
export const SRS_EVENT = "sunnybridge:vocab-srs-updated";
export const DAILY_NEW_LIMIT_EVENT = "sunnybridge:vocab-daily-limit-updated";
const TEN_MINUTES_DAYS = 10 / 1440;
const SYNC_DEBOUNCE_MS = 2000;
const SYNC_TIMEOUT_MS = 6000;

export function clampEase(ease: number): number {
  const rounded = Math.round(ease * 100) / 100;
  return Math.min(MAX_EASE, Math.max(MIN_EASE, rounded));
}

export function resolveEase(entry?: Partial<Pick<SrsEntry, "ease">> | null): number {
  if (!entry || typeof entry.ease !== "number" || !Number.isFinite(entry.ease)) {
    return DEFAULT_EASE;
  }
  return clampEase(entry.ease);
}

export function nextEase(currentEase: number | undefined, grade: SrsGrade): number {
  const base =
    typeof currentEase === "number" && Number.isFinite(currentEase)
      ? clampEase(currentEase)
      : DEFAULT_EASE;
  switch (grade) {
    case "again":
      return clampEase(base - 0.2);
    case "hard":
      return clampEase(base - 0.15);
    case "good":
      return base;
    case "easy":
      return clampEase(base + 0.15);
  }
}

export function isLeechEntry(entry?: Partial<Pick<SrsEntry, "lapses">> | null): boolean {
  return (entry?.lapses ?? 0) >= LEECH_LAPSES_THRESHOLD;
}

export function countLeechFromStore(
  store: Record<string, SrsEntry> = getSrsStore()
): number {
  return Object.values(store).filter((e) => isLeechEntry(e)).length;
}

function getLocalDateKey(now: number = Date.now()): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDailyNewLimit(targetUserId?: string): DailyNewLimitOption {
  if (typeof window === "undefined") return DEFAULT_DAILY_NEW_LIMIT;
  try {
    const raw = localStorage.getItem(
      getScopedKey(DAILY_NEW_LIMIT_BASE_KEY, targetUserId)
    );
    const num = Number(raw);
    if (num === 5 || num === 10 || num === 20) return num;
  } catch {}
  return DEFAULT_DAILY_NEW_LIMIT;
}

export function setDailyNewLimit(
  limit: DailyNewLimitOption,
  targetUserId?: string
): DailyNewLimitOption {
  const normalized: DailyNewLimitOption =
    limit === 5 || limit === 10 || limit === 20 ? limit : DEFAULT_DAILY_NEW_LIMIT;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        getScopedKey(DAILY_NEW_LIMIT_BASE_KEY, targetUserId),
        String(normalized)
      );
      window.dispatchEvent(new Event(DAILY_NEW_LIMIT_EVENT));
    } catch {}
  }
  return normalized;
}

export function getTodayNewCount(
  now: number = Date.now(),
  targetUserId?: string
): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(
      getScopedKey(DAILY_NEW_PROGRESS_BASE_KEY, targetUserId)
    );
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed?.date !== getLocalDateKey(now)) return 0;
    if (Array.isArray(parsed.ids)) return parsed.ids.length;
    if (typeof parsed.count === "number" && Number.isFinite(parsed.count)) {
      return Math.max(0, parsed.count);
    }
  } catch {}
  return 0;
}

function recordTodayNewWord(
  meaningId: string,
  now: number = Date.now(),
  targetUserId?: string
) {
  if (typeof window === "undefined" || !meaningId) return;
  try {
    const key = getScopedKey(DAILY_NEW_PROGRESS_BASE_KEY, targetUserId);
    const today = getLocalDateKey(now);
    let ids: string[] = [];
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === today && Array.isArray(parsed.ids)) {
        ids = parsed.ids.filter((id: unknown) => typeof id === "string");
      }
    }
    if (!ids.includes(meaningId)) {
      ids.push(meaningId);
      localStorage.setItem(key, JSON.stringify({ date: today, ids }));
    }
  } catch {}
}

export function getRemainingDailyNewLimit(
  now: number = Date.now(),
  targetUserId?: string
): number {
  const limit = getDailyNewLimit(targetUserId);
  const used = getTodayNewCount(now, targetUserId);
  return Math.max(0, limit - used);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function getVocabApiBase(): string {
  if (typeof window !== "undefined" && window.location?.protocol?.startsWith("http")) {
    return "";
  }
  return "https://app.sunnybridge.qzz.io";
}

function parseUpdatedAtMs(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : 0;
}

export function mergeSrsStores(
  local: Record<string, SrsEntry>,
  remote: Record<string, SrsEntry>
): Record<string, SrsEntry> {
  const merged: Record<string, SrsEntry> = { ...local };
  for (const [id, remoteEntry] of Object.entries(remote || {})) {
    if (!remoteEntry || typeof remoteEntry !== "object") continue;
    const localEntry = merged[id];
    if (!localEntry) {
      merged[id] = remoteEntry;
      continue;
    }
    const localTs = parseUpdatedAtMs(localEntry.updatedAt);
    const remoteTs = parseUpdatedAtMs(remoteEntry.updatedAt);
    if (remoteTs > localTs) {
      merged[id] = remoteEntry;
    } else if (
      remoteTs === localTs &&
      (remoteEntry.updatedAt || "") >= (localEntry.updatedAt || "")
    ) {
      merged[id] = remoteEntry;
    }
  }
  return merged;
}

export function getSrsStore(targetUserId?: string): Record<string, SrsEntry> {
  if (typeof window === "undefined") return {};
  try {
    const key = getScopedKey(SRS_BASE_KEY, targetUserId);
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const migratedStore: Record<string, SrsEntry> = {};
    let migrated = false;
    for (const [id, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, any>;
      const hasValidEase =
        typeof rec.ease === "number" && Number.isFinite(rec.ease);
      const ease = hasValidEase ? clampEase(rec.ease) : DEFAULT_EASE;
      if (!hasValidEase || ease !== rec.ease) {
        migrated = true;
      }
      migratedStore[id] = {
        ...(rec as SrsEntry),
        ease,
      };
    }
    if (migrated) {
      try {
        localStorage.setItem(key, JSON.stringify(migratedStore));
      } catch {}
    }
    return migratedStore;
  } catch {
    return {};
  }
}

function writeSrsStoreLocal(
  store: Record<string, SrsEntry>,
  targetUserId?: string
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getScopedKey(SRS_BASE_KEY, targetUserId),
      JSON.stringify(store)
    );
    window.dispatchEvent(new Event(SRS_EVENT));
  } catch {}
}

function scheduleSrsSync() {
  if (typeof window === "undefined") return;
  if (syncTimer !== null) {
    clearTimeout(syncTimer);
  }
  const requestUserId = getPhonemeUserId();
  syncTimer = setTimeout(() => {
    syncTimer = null;
    pushSrsToCloud(requestUserId).catch(() => {});
  }, SYNC_DEBOUNCE_MS);
}

function saveSrsStore(store: Record<string, SrsEntry>) {
  writeSrsStoreLocal(store);
  scheduleSrsSync();
}

async function requestSrsSync(
  method: "GET" | "POST",
  targetUserId?: string
): Promise<Record<string, SrsEntry> | null> {
  if (typeof window === "undefined") return null;
  const requestUserId = targetUserId || getPhonemeUserId();
  if (!requestUserId) return null;

  const apiBase = getVocabApiBase();
  const url =
    method === "GET"
      ? `${apiBase}/api/vocab/srs?user_id=${encodeURIComponent(requestUserId)}`
      : `${apiBase}/api/vocab/srs`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...getPhonemeAuthHeaders(requestUserId),
  };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    const resp = await fetch(url, {
      method,
      headers,
      body:
        method === "POST"
          ? JSON.stringify({
              user_id: requestUserId,
              store: getSrsStore(requestUserId),
            })
          : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) return null;
    const data = await resp.json();
    if (requestUserId !== getPhonemeUserId()) return null;

    const serverStore = data?.store;
    if (!serverStore || typeof serverStore !== "object" || Array.isArray(serverStore)) {
      return null;
    }

    const merged = mergeSrsStores(getSrsStore(requestUserId), serverStore);
    writeSrsStoreLocal(merged, requestUserId);
    return merged;
  } catch {
    return null;
  }
}

export function pushSrsToCloud(
  targetUserId?: string
): Promise<Record<string, SrsEntry> | null> {
  return requestSrsSync("POST", targetUserId);
}

export function syncSrsFromCloud(
  targetUserId?: string
): Promise<Record<string, SrsEntry> | null> {
  return requestSrsSync("GET", targetUserId);
}

export function nextIntervalDays(
  entry: SrsEntry | undefined,
  grade: SrsGrade
): number {
  if (grade === "again") return TEN_MINUTES_DAYS;
  const base = entry?.intervalDays ?? 0;
  const isNew = !entry || entry.reps === 0;
  const ease = resolveEase(entry);
  switch (grade) {
    case "hard":
      return isNew ? 1 : Math.max(1, base * ease * 0.8);
    case "good":
      return isNew ? 3 : base < 1 ? 3 : base * ease;
    case "easy":
      return isNew ? 7 : base < 1 ? 7 : base * ease * 1.3;
  }
}

export function gradeMeaning(
  meaning: { id: string; word: string },
  grade: SrsGrade
): SrsEntry {
  const now = Date.now();
  const store = getSrsStore();
  const prev = store[meaning.id];
  const intervalDays = nextIntervalDays(prev, grade);
  const ease = nextEase(prev?.ease, grade);
  const entry: SrsEntry = {
    id: meaning.id,
    word: meaning.word,
    intervalDays,
    dueAt: now + intervalDays * 86400000,
    reps: (prev?.reps ?? 0) + (grade === "again" ? 0 : 1),
    lapses: (prev?.lapses ?? 0) + (grade === "again" ? 1 : 0),
    ease,
    lastGrade: grade,
    updatedAt: new Date(now).toISOString(),
  };
  if (!prev) {
    recordTodayNewWord(meaning.id, now);
  }
  store[meaning.id] = entry;
  saveSrsStore(store);
  return entry;
}

export function countDueFromStore(now: number = Date.now()): number {
  const store = getSrsStore();
  return Object.values(store).filter((e) => e.dueAt <= now).length;
}

export interface BuildReviewQueueOptions {
  now?: number;
  dailyNewLimit?: number;
  reviewCap?: number;
}

export function buildReviewQueue<T extends { id: string }>(
  meanings: T[],
  now: number = Date.now(),
  newLimitOrOptions?: number | BuildReviewQueueOptions
): T[] {
  const store = getSrsStore();
  const opts: BuildReviewQueueOptions =
    typeof newLimitOrOptions === "number"
      ? { dailyNewLimit: newLimitOrOptions }
      : newLimitOrOptions || {};
  const effectiveNow = opts.now ?? now;
  const dueSorted = meanings
    .filter((m) => store[m.id] && store[m.id].dueAt <= effectiveNow)
    .sort((a, b) => store[a.id].dueAt - store[b.id].dueAt);
  const due =
    typeof opts.reviewCap === "number" && Number.isFinite(opts.reviewCap)
      ? dueSorted.slice(0, Math.max(0, opts.reviewCap))
      : dueSorted;
  const newCap = Math.max(
    0,
    opts.dailyNewLimit ?? getRemainingDailyNewLimit(effectiveNow)
  );
  const fresh = meanings.filter((m) => !store[m.id]).slice(0, newCap);
  return [...due, ...fresh];
}

export function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))} 分钟`;
  if (days < 1) return `${Math.round(days * 24)} 小时`;
  if (days < 2) return "1 天";
  if (days < 30) return `${Math.round(days)} 天`;
  return `${(days / 30).toFixed(1).replace(/\.0$/, "")} 个月`;
}
