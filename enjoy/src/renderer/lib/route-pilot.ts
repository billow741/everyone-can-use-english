import { getGameStoryState, GameStoryState } from "./game-story";
import { getScopedKey } from "./phoneme-cloud-sync";
import { LearningEvent, getEvents } from "./learning-events";

/**
 * 阳光桥少儿英语 · 新路线试点区存储与探针 (route-pilot.ts)
 * 依据：《PILOT-WORKORDER.md》第三节、第五节与工单红线口径
 * 
 * 存储铁律：
 * 1. 键名 sunnybridge_route_pilot_v1，严格通过 getScopedKey(PILOT_STORAGE_KEY, userId) 分桶隔离；
 * 2. 绝不读写旧掌握度 sunnybridge_phonemes_mastery_v1 与 clear-counts；
 * 3. 初始 R01 解锁，完成任一关（independent 或 assisted）均解锁下一关；
 * 4. 探针 window.__routePilotProbe 暴露当前关、题序、计数、解锁状态与最近事件。
 */

export const PILOT_STORAGE_KEY = "sunnybridge_route_pilot_v1";
export const PILOT_UPDATED_EVENT = "sunnybridge:route-pilot-updated";

export type PilotLevelId = "R01" | "R02" | "R03" | "R04";

export interface CampVerificationResult {
  cleared: boolean;     // 过关线：4 项全部走完（含 assisted）
  lit: boolean;         // 点亮线：4 项首次正确率 ≥ 70% 且迁移项答对
  accuracy: number;     // 营地 4 项首次正确率 (0 ~ 1)
  reviewList: string[]; // 复练清单（未首次答对的音/词）
}

export interface PilotLevelState {
  completed: boolean;
  unlocked: boolean;
  result?: "independent" | "assisted";
  firstTryCount?: number;
  totalQuestions?: number;
  completedAt?: number;
  durationMs?: number;
  firstIndependentBlend?: boolean; // R03 首次手动拼装标记
  campVerification?: CampVerificationResult; // R04 营地校验两线结果
}

export interface RoutePilotProgress {
  version: number;
  levels: Record<PilotLevelId, PilotLevelState>;
  updatedAt: number;
}

export const PILOT_LEVEL_ORDER: PilotLevelId[] = ["R01", "R02", "R03", "R04"];

export function createDefaultPilotProgress(): RoutePilotProgress {
  return {
    version: 1,
    levels: {
      R01: { completed: false, unlocked: true },
      R02: { completed: false, unlocked: false },
      R03: { completed: false, unlocked: false },
      R04: { completed: false, unlocked: false },
    },
    updatedAt: Date.now(),
  };
}

export function getPilotProgress(userId?: string): RoutePilotProgress {
  if (typeof window === "undefined") return createDefaultPilotProgress();
  try {
    const key = getScopedKey(PILOT_STORAGE_KEY, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return createDefaultPilotProgress();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.levels) {
      return createDefaultPilotProgress();
    }

    const base = createDefaultPilotProgress();
    const mergedLevels = { ...base.levels };

    for (const lvl of PILOT_LEVEL_ORDER) {
      if (parsed.levels[lvl]) {
        mergedLevels[lvl] = {
          ...mergedLevels[lvl],
          ...parsed.levels[lvl],
        };
      }
    }

    // 级联解锁校正：R01 永远解锁；完成前置关卡必解锁后一关
    mergedLevels.R01.unlocked = true;
    if (mergedLevels.R01.completed) mergedLevels.R02.unlocked = true;
    if (mergedLevels.R02.completed) mergedLevels.R03.unlocked = true;
    if (mergedLevels.R03.completed) mergedLevels.R04.unlocked = true;

    return {
      version: parsed.version || 1,
      levels: mergedLevels,
      updatedAt: parsed.updatedAt || Date.now(),
    };
  } catch (err) {
    console.warn("getPilotProgress error:", err);
    return createDefaultPilotProgress();
  }
}

export function savePilotProgress(progress: RoutePilotProgress, userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = getScopedKey(PILOT_STORAGE_KEY, userId);
    progress.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent(PILOT_UPDATED_EVENT, { detail: progress }));
  } catch (err) {
    console.warn("savePilotProgress error:", err);
  }
}

export function markPilotLevelCompleted(
  levelId: PilotLevelId,
  data: Partial<PilotLevelState>,
  userId?: string
): RoutePilotProgress {
  const current = getPilotProgress(userId);
  const existing = current.levels[levelId] || { completed: false, unlocked: true };

  const updatedLevel: PilotLevelState = {
    ...existing,
    ...data,
    completed: true,
    completedAt: Date.now(),
  };

  current.levels[levelId] = updatedLevel;

  // 级联解锁下一关
  if (levelId === "R01") current.levels.R02.unlocked = true;
  if (levelId === "R02") current.levels.R03.unlocked = true;
  if (levelId === "R03") current.levels.R04.unlocked = true;

  savePilotProgress(current, userId);
  return current;
}

export function resetPilotProgress(userId?: string): RoutePilotProgress {
  const def = createDefaultPilotProgress();
  savePilotProgress(def, userId);
  return def;
}

export function unlockAllPilotLevels(userId?: string): RoutePilotProgress {
  const current = getPilotProgress(userId);
  for (const lvl of PILOT_LEVEL_ORDER) {
    current.levels[lvl].unlocked = true;
  }
  savePilotProgress(current, userId);
  return current;
}

// ==========================================
// 探针 (window.__routePilotProbe)
// ==========================================

export interface RoutePilotProbeRuntime {
  currentLevel: PilotLevelId | null;
  stepIndex: number;
  independentCount: number;
  assistedCount: number;
  latestEvent: LearningEvent | null;
  campResult?: CampVerificationResult | null;
}

const probeRuntime: RoutePilotProbeRuntime = {
  currentLevel: null,
  stepIndex: 0,
  independentCount: 0,
  assistedCount: 0,
  latestEvent: null,
  campResult: null,
};

export function updatePilotProbeRuntime(
  partial: Partial<RoutePilotProbeRuntime>
): void {
  Object.assign(probeRuntime, partial);
}

export interface RoutePilotProbe {
  readonly currentLevel: PilotLevelId | null;
  readonly stepIndex: number;
  readonly independentCount: number;
  readonly assistedCount: number;
  readonly unlockStatus: Record<PilotLevelId, boolean>;
  readonly latestEvent: LearningEvent | null;
  readonly progress: RoutePilotProgress;
  readonly campResult?: CampVerificationResult | null;
  readonly story: GameStoryState;
  getProgress: () => RoutePilotProgress;
  resetProgress: () => void;
  unlockAll: () => void;
  updateRuntime: (partial: Partial<RoutePilotProbeRuntime>) => void;
}

declare global {
  interface Window {
    __routePilotProbe?: RoutePilotProbe;
  }
}

if (typeof window !== "undefined") {
  const probeObj = {
    get currentLevel() {
      return probeRuntime.currentLevel;
    },
    get stepIndex() {
      return probeRuntime.stepIndex;
    },
    get independentCount() {
      return probeRuntime.independentCount;
    },
    get assistedCount() {
      return probeRuntime.assistedCount;
    },
    get unlockStatus() {
      const prog = getPilotProgress();
      return {
        R01: prog.levels.R01.unlocked,
        R02: prog.levels.R02.unlocked,
        R03: prog.levels.R03.unlocked,
        R04: prog.levels.R04.unlocked,
      };
    },
    get latestEvent() {
      if (probeRuntime.latestEvent) return probeRuntime.latestEvent;
      const events = getEvents();
      return events.length > 0 ? events[events.length - 1] : null;
    },
    get progress() {
      return getPilotProgress();
    },
    get campResult() {
      return probeRuntime.campResult || probeObj.progress.levels.R04.campVerification || null;
    },
    get story() {
      return getGameStoryState();
    },
    getProgress: () => getPilotProgress(),
    resetProgress: () => resetPilotProgress(),
    unlockAll: () => unlockAllPilotLevels(),
    updateRuntime: updatePilotProbeRuntime,
  };

  window.__routePilotProbe = probeObj as RoutePilotProbe;
}
