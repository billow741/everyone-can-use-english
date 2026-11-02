import { getScopedKey } from "@renderer/lib/phoneme-cloud-sync";

// 生词 SRS 引擎（本地，按用户分桶）：SM-2 简化版
// Again=10 分钟 / Hard / Good / Easy 按当前间隔倍增；按钮上印的即下次到期时间
export type SrsGrade = "again" | "hard" | "good" | "easy";

export interface SrsEntry {
  id: string; // meaning.id
  word: string;
  intervalDays: number; // 本次排定的间隔（天，可为分数：10 分钟 = 1/144）
  dueAt: number; // epoch ms
  reps: number;
  lapses: number;
  lastGrade: SrsGrade | null;
  updatedAt: string;
}

const SRS_BASE_KEY = "sunnybridge_vocab_srs_v1";
export const SRS_EVENT = "sunnybridge:vocab-srs-updated";
const TEN_MINUTES_DAYS = 10 / 1440;

export function getSrsStore(): Record<string, SrsEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getScopedKey(SRS_BASE_KEY));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSrsStore(store: Record<string, SrsEntry>) {
  try {
    localStorage.setItem(getScopedKey(SRS_BASE_KEY), JSON.stringify(store));
    window.dispatchEvent(new Event(SRS_EVENT));
  } catch {}
}

export function nextIntervalDays(
  entry: SrsEntry | undefined,
  grade: SrsGrade
): number {
  if (grade === "again") return TEN_MINUTES_DAYS;
  const base = entry?.intervalDays ?? 0;
  const isNew = !entry || entry.reps === 0;
  switch (grade) {
    case "hard":
      return isNew ? 1 : Math.max(1, base * 1.2);
    case "good":
      return isNew ? 3 : base < 1 ? 3 : base * 2.2;
    case "easy":
      return isNew ? 7 : base < 1 ? 7 : base * 3.2;
  }
}

export function gradeMeaning(
  meaning: { id: string; word: string },
  grade: SrsGrade
): SrsEntry {
  const store = getSrsStore();
  const prev = store[meaning.id];
  const intervalDays = nextIntervalDays(prev, grade);
  const entry: SrsEntry = {
    id: meaning.id,
    word: meaning.word,
    intervalDays,
    dueAt: Date.now() + intervalDays * 86400000,
    reps: (prev?.reps ?? 0) + (grade === "again" ? 0 : 1),
    lapses: (prev?.lapses ?? 0) + (grade === "again" ? 1 : 0),
    lastGrade: grade,
    updatedAt: new Date().toISOString(),
  };
  store[meaning.id] = entry;
  saveSrsStore(store);
  return entry;
}

export function countDueFromStore(now: number = Date.now()): number {
  const store = getSrsStore();
  return Object.values(store).filter((e) => e.dueAt <= now).length;
}

export function buildReviewQueue<T extends { id: string }>(
  meanings: T[],
  now: number = Date.now(),
  cap: number = 20
): T[] {
  const store = getSrsStore();
  const due = meanings
    .filter((m) => store[m.id] && store[m.id].dueAt <= now)
    .sort((a, b) => store[a.id].dueAt - store[b.id].dueAt);
  const fresh = meanings.filter((m) => !store[m.id]);
  return [...due, ...fresh].slice(0, cap);
}

export function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))} 分钟`;
  if (days < 1) return `${Math.round(days * 24)} 小时`;
  if (days < 2) return "1 天";
  if (days < 30) return `${Math.round(days)} 天`;
  return `${(days / 30).toFixed(1).replace(/\.0$/, "")} 个月`;
}
