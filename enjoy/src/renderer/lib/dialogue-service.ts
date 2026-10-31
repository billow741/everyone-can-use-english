import { getPhonemeUserId, getScopedKey } from "@renderer/lib/phoneme-cloud-sync";

export interface DialogueVariant {
  id: string;
  text: string;
  translation: string;
  audio: string;
}

export interface DialogueLine {
  seq: number;
  speaker: "A" | "B" | string;
  lineType: "spoken" | "narration" | "mixed" | "response" | string;
  text: string;
  translation: string;
  audio: string;
  variants: DialogueVariant[];
}

export interface DialogueLesson {
  lessonId: string;
  dialogueId: string;
  part: number;
  parts: number;
  level: string;
  unit: number;
  scene: string;
  sceneZh: string;
  theme: string;
  pool: string;
  ageBand: string;
  lines: DialogueLine[];
}

export interface DialoguePack {
  pool: string;
  builtFrom?: string;
  lessonCount: number;
  lessons: DialogueLesson[];
}

export interface LessonProgress {
  stars: number;
  bestScores: Record<number, number>;
  completedAt: string;
}

export type DialogueProgressMap = Record<string, LessonProgress>;

export const DIALOGUE_PROGRESS_BASE_KEY = "sunnybridge_dialogue_progress_v1";
export const DIALOGUE_PROGRESS_EVENT = "sunnybridge:dialogue-progress-updated";

/**
 * 获取当前用户分桶的 localStorage key
 */
export const getDialogueProgressKey = (userId?: string): string => {
  const uid = userId || getPhonemeUserId();
  return getScopedKey(DIALOGUE_PROGRESS_BASE_KEY, uid);
};

/**
 * 获取当前用户的对话课进度
 */
export const getDialogueProgress = (userId?: string): DialogueProgressMap => {
  if (typeof window === "undefined") return {};
  try {
    const key = getDialogueProgressKey(userId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Failed to read dialogue progress:", err);
    return {};
  }
};

/**
 * 保存某课的完成进度（按用户分桶），保留历史最高星数与各行最高分
 */
export const saveDialogueLessonProgress = (
  lessonId: string,
  progress: {
    stars: number;
    bestScores: Record<number, number>;
    completedAt?: string;
  },
  userId?: string
): DialogueProgressMap => {
  if (typeof window === "undefined") return {};
  try {
    const key = getDialogueProgressKey(userId);
    const current = getDialogueProgress(userId);
    const existing = current[lessonId];

    const mergedScores: Record<number, number> = { ...(existing?.bestScores || {}) };
    for (const [seqStr, score] of Object.entries(progress.bestScores)) {
      const seq = Number(seqStr);
      mergedScores[seq] = Math.max(mergedScores[seq] || 0, score);
    }

    const mergedStars = Math.max(existing?.stars || 0, progress.stars);
    const completedAt = progress.completedAt || new Date().toISOString();

    current[lessonId] = {
      stars: mergedStars,
      bestScores: mergedScores,
      completedAt,
    };

    localStorage.setItem(key, JSON.stringify(current));

    window.dispatchEvent(
      new CustomEvent(DIALOGUE_PROGRESS_EVENT, {
        detail: { lessonId, progress: current[lessonId], all: current },
      })
    );

    return current;
  } catch (err) {
    console.error("Failed to save dialogue lesson progress:", err);
    return {};
  }
};

/**
 * 响应式订阅对话课进度更新
 */
export const subscribeDialogueProgress = (
  callback: (map: DialogueProgressMap) => void
): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    callback(getDialogueProgress());
  };

  window.addEventListener(DIALOGUE_PROGRESS_EVENT, handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener(DIALOGUE_PROGRESS_EVENT, handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
};

let cachedPack: DialoguePack | null = null;
let packLoadingPromise: Promise<DialoguePack> | null = null;

/**
 * 加载对话课包数据
 */
export const getDialoguePack = async (): Promise<DialoguePack> => {
  if (cachedPack) return cachedPack;
  if (!packLoadingPromise) {
    packLoadingPromise = fetch("/assets/tmm-dialogues/dialogue-pack-kids-ok.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data: DialoguePack) => {
        cachedPack = data;
        return data;
      })
      .catch((err) => {
        packLoadingPromise = null;
        console.error("Failed to load dialogue pack JSON:", err);
        throw err;
      });
  }
  return packLoadingPromise;
};

/**
 * 根据 lessonId 获取单节课数据
 */
export const getDialogueLesson = async (
  lessonId: string
): Promise<DialogueLesson | null> => {
  const pack = await getDialoguePack();
  return pack.lessons.find((l) => l.lessonId === lessonId) || null;
};
