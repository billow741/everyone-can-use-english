// 阳光桥少儿英语 · 敢敢英语探索学院课程服务
// 提供 20 个进阶主题单元、4 大能力阶梯、原声音频与本地学习进度持久化管理

export interface PhonicsKeyword {
  word: string;
  ipa: string;
  zh: string;
  hint: string;
}

export interface CurriculumSentence {
  id: string;
  text: string;
  translation: string;
  audioUrl: string;
  targetPhoneme?: string;
  phonicsHint?: string;
  coachTip?: string;
}

export interface CurriculumQuizItem {
  id: string;
  question: string;
  englishText: string;
  audioUrl: string;
  options: string[];
  correctIndex: number;
  explain: string;
}

export interface CurriculumUnit {
  id: string;
  sequence: number;
  level: number;
  levelName: string;
  title: string;
  titleEn: string;
  tagline: string;
  icon: string;
  gradient: string;
  themeColor: string;
  phonicsFocus: string[];
  phonicsChant: string;
  learningObjectives: string[];
  keywords: PhonicsKeyword[];
  stats: {
    totalSentences: number;
    estimatedMinutes: number;
    starsReward: number;
  };
  sections: {
    listening: CurriculumSentence[];
    speaking: CurriculumSentence[];
    quiz: CurriculumQuizItem[];
  };
}

export interface UserCurriculumProgress {
  completedUnitIds: string[];
  unitStars: Record<string, number>; // unitId -> stars (1-3)
  unitScores: Record<string, number>; // unitId -> high score (0-100)
  totalGoldCoins: number;
  lastStudiedUnitId?: string;
  lastStudiedAt?: string;
}

const PROGRESS_STORAGE_KEY = "sunnybridge_curriculum_progress_v1";

// 内存缓存
let cachedUnits: CurriculumUnit[] | null = null;
let cachedLoadingPromise: Promise<CurriculumUnit[]> | null = null;

// 从静态 JSON 加载全量 20 单元数据
export const loadCurriculumCatalog = async (): Promise<CurriculumUnit[]> => {
  if (cachedUnits && cachedUnits.length > 0) {
    return cachedUnits;
  }

  if (cachedLoadingPromise) {
    return cachedLoadingPromise;
  }

  cachedLoadingPromise = (async () => {
    try {
      const resp = await fetch("/assets/tmm/tmm_curriculum_catalog.json");
      if (!resp.ok) {
        throw new Error(`Failed to load catalog: ${resp.status}`);
      }
      const data = await resp.json();
      cachedUnits = data.units || [];
      return cachedUnits;
    } catch (err) {
      console.warn("Error fetching /assets/tmm/tmm_curriculum_catalog.json, fallbacking to built-in cache:", err);
      return [];
    } finally {
      cachedLoadingPromise = null;
    }
  })();

  return cachedLoadingPromise;
};

// 获取所有单元
export const getAllCurriculumUnits = async (): Promise<CurriculumUnit[]> => {
  return await loadCurriculumCatalog();
};

// 根据 ID 获取指定单元
export const getCurriculumUnitById = async (id: string): Promise<CurriculumUnit | undefined> => {
  const units = await loadCurriculumCatalog();
  return units.find((u) => u.id === id);
};

// 根据 Level 筛选单元 (1~4)
export const getCurriculumUnitsByLevel = async (level: number): Promise<CurriculumUnit[]> => {
  const units = await loadCurriculumCatalog();
  return units.filter((u) => u.level === level);
};

// 获取用户学习进度
export const getUserCurriculumProgress = (): UserCurriculumProgress => {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read curriculum progress:", e);
  }

  return {
    completedUnitIds: [],
    unitStars: {},
    unitScores: {},
    totalGoldCoins: 0,
  };
};

// 更新并保存用户学习进度
export const recordUnitCompletion = (
  unitId: string,
  stars: number,
  score: number,
  goldEarned: number = 10
): UserCurriculumProgress => {
  const current = getUserCurriculumProgress();
  
  if (!current.completedUnitIds.includes(unitId)) {
    current.completedUnitIds.push(unitId);
  }

  const prevStars = current.unitStars[unitId] || 0;
  if (stars > prevStars) {
    current.unitStars[unitId] = stars;
  }

  const prevScore = current.unitScores[unitId] || 0;
  if (score > prevScore) {
    current.unitScores[unitId] = score;
  }

  current.totalGoldCoins = (current.totalGoldCoins || 0) + goldEarned;
  current.lastStudiedUnitId = unitId;
  current.lastStudiedAt = new Date().toISOString();

  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to save curriculum progress:", e);
  }

  return current;
};
