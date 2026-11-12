// 阳光桥少儿英语 · 级别资源总注册表 (Level Registry)
// 单一数据源：统一登记 A0 / A1 / A2 / B1 四级资源
// 依据《工单 C：四级入口陈列层 P-1》与业主（Roger 2026-11-11）派工口径决议

import { useState, useEffect } from "react";
import { getDialoguePack, DialoguePack, DialogueLesson } from "./dialogue-service";
import { loadCatalog } from "./listening-sync";
import { getPhonemeMasteryMap, ALL_39_PHONEMES } from "./phoneme-data";
import { getFinishedLocal } from "./listening-sync";
import { getDialogueProgress } from "./dialogue-service";

export type LevelKey = "a0" | "a1" | "a2" | "b1";
export type LevelZone = "pronunciation" | "books";

/**
 * 资源条目契约接口
 */
export interface LevelResource {
  id: string;
  level: LevelKey;
  zone: LevelZone;
  title: string;
  subtitle?: string;
  route: string;
  source: string; // 'phonics' | 'dialogue' | 'listening' | 'world'
  metadata?: Record<string, any>;
}

/**
 * 级别静态元信息
 */
export interface LevelMeta {
  key: LevelKey;
  code: string; // 'A0' | 'A1' | 'A2' | 'B1'
  name: string; // '自然拼读' | '初级' | '中级' | '高级'
  title: string; // '自然拼读 A0' 等
  cefr: string; // 'Pre-A1' | 'CEFR A1' 等
  outcome: string; // 出口标准一句话（一字不改照抄工单附录）
  gradient: string; // 设计风格渐变色
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  colorHex?: string;
  indicatorBg?: string;
}

/**
 * 工单附录：四级卡出口标准一句话（家长版文案，施工照抄，一字不改）
 */
export const LEVEL_METAS: Record<LevelKey, LevelMeta> = {
  a0: {
    key: "a0",
    code: "A0",
    name: "自然拼读",
    title: "自然拼读 A0",
    cefr: "Pre-A1",
    outcome: "听得出、拼得出：39 个音素过关，能自己拼读新词",
    gradient: "from-level-a0/15 via-level-a0/10 to-warm-paper",
    badgeBg: "bg-level-a0/15 text-level-a0 border-level-a0/40",
    badgeText: "拼读启蒙",
    borderColor: "border-level-a0",
    colorHex: "var(--level-a0)",
    indicatorBg: "bg-level-a0",
  },
  a1: {
    key: "a1",
    code: "A1",
    name: "初级",
    title: "初级 A1",
    cefr: "CEFR A1",
    outcome: "读得完、读得准：短故事独立跟读完，词尾不吞音",
    gradient: "from-level-a1/15 via-level-a1/10 to-warm-paper",
    badgeBg: "bg-level-a1/15 text-level-a1 border-level-a1/40",
    badgeText: "基础会话与阅读",
    borderColor: "border-level-a1",
    colorHex: "var(--level-a1)",
    indicatorBg: "bg-level-a1",
  },
  a2: {
    key: "a2",
    code: "A2",
    name: "中级",
    title: "中级 A2",
    cefr: "CEFR A2",
    outcome: "读得懂、说得顺：完整故事能复述，-ed/-s 读法过关",
    gradient: "from-level-a2/15 via-level-a2/10 to-warm-paper",
    badgeBg: "bg-level-a2/15 text-level-a2 border-level-a2/40",
    badgeText: "进阶复述与语法",
    borderColor: "border-level-a2",
    colorHex: "var(--level-a2)",
    indicatorBg: "bg-level-a2",
  },
  b1: {
    key: "b1",
    code: "B1",
    name: "高级",
    title: "高级 B1",
    cefr: "CEFR B1",
    outcome: "读得有想法：长篇朗读流利，能说出自己的看法",
    gradient: "from-level-b1/15 via-level-b1/10 to-warm-paper",
    badgeBg: "bg-level-b1/15 text-level-b1 border-level-b1/40",
    badgeText: "长篇思辨与表达",
    borderColor: "border-level-b1",
    colorHex: "var(--level-b1)",
    indicatorBg: "bg-level-b1",
  },
};

export const ORDERED_LEVELS: LevelKey[] = ["a0", "a1", "a2", "b1"];

/**
 * 对话课级别映射函数
 * 出处：工单 C 派工口径决议（Roger 2026-11-11 亲批）
 * 映射规则：Level 1 / Level 1+ → a1；Level 2 / Level 2+ → a2；Level 3 → b1
 */
export function mapDialogueLevel(rawLevel: string): LevelKey {
  const normalized = (rawLevel || "").trim().toLowerCase();
  if (normalized === "level 1" || normalized === "level 1+") return "a1";
  if (normalized === "level 2" || normalized === "level 2+") return "a2";
  if (normalized === "level 3") return "b1";
  if (normalized.startsWith("level 1") || normalized.startsWith("1")) return "a1";
  if (normalized.startsWith("level 2") || normalized.startsWith("2")) return "a2";
  if (normalized.startsWith("level 3") || normalized.startsWith("3")) return "b1";
  return "a1"; // 缺省兜底
}

/**
 * 双轨星评测达标常量定义
 * 出处：工单 C 派工口径决议（2026-11-11，Echo 定，Roger 批准）
 */
export const EVIDENCE_STAR_MIN_ATTEMPTS = 5;
export const EVIDENCE_STAR_MAX_ERROR_RATE = 0.5;

/**
 * A0 级固定登记资源（音素字典 + 词族乐园）
 */
export const A0_STATIC_RESOURCES: LevelResource[] = [
  {
    id: "phonemes",
    level: "a0",
    zone: "pronunciation",
    title: "39 音素字典",
    subtitle: "39 个字母音与音标卡，点读查询与发音练习",
    route: "/phonemes",
    source: "phonics",
  },
  {
    id: "families",
    level: "a0",
    zone: "pronunciation",
    title: "词族乐园",
    subtitle: "五步学词族：学韵脚、拼词、听辨、跟读、复习",
    route: "/families",
    source: "phonics",
  },
];

let cachedRegistry: LevelResource[] | null = null;
let registryPromise: Promise<LevelResource[]> | null = null;

/**
 * 异步从单一真实数据源派生全量资源注册表（禁止手抄第二份级别数据）
 */
export async function getLevelRegistry(): Promise<LevelResource[]> {
  if (cachedRegistry) return cachedRegistry;
  if (registryPromise) return registryPromise;

  registryPromise = (async () => {
    const list: LevelResource[] = [...A0_STATIC_RESOURCES];

    // 1. 对话课派生（从课包 lessons 派生，zone=pronunciation，route 沿用 /dialogues/:lessonId）
    try {
      const pack = await getDialoguePack();
      if (pack?.lessons) {
        for (const lesson of pack.lessons) {
          const lvl = mapDialogueLevel(lesson.level);
          const partLabel = lesson.parts > 1 ? `第${lesson.part}部分` : "";
          const title = lesson.sceneZh
            ? `${lesson.sceneZh}${partLabel ? ` (${partLabel})` : ""}`
            : lesson.scene;
          list.push({
            id: `dialogue-${lesson.lessonId}`,
            level: lvl,
            zone: "pronunciation",
            title,
            subtitle: lesson.scene,
            route: `/dialogues/${lesson.lessonId}`,
            source: "dialogue",
            metadata: { lessonId: lesson.lessonId, rawLevel: lesson.level, lesson },
          });
        }
      }
    } catch (e) {
      console.warn("Failed to derive dialogue lessons in level registry:", e);
    }

    // 2. 听力章节派生（从 listening-sync 的 catalog 派生，zone=books，route 沿用 /listening/:book/:chapter）
    try {
      const cat = await loadCatalog();
      if (cat?.chapters) {
        for (const ch of cat.chapters) {
          const rawLvl = (ch.level || "").trim().toLowerCase();
          const lvl: LevelKey =
            rawLvl === "a1" || rawLvl === "a2" || rawLvl === "b1" ? rawLvl : "a1";
          list.push({
            id: `listening-${ch.book}-${ch.chapter}`,
            level: lvl,
            zone: "books",
            title: ch.title_zh || ch.title_en,
            subtitle: ch.title_en,
            route: `/listening/${ch.book}/${ch.chapter}`,
            source: ch.book === "world" ? "world" : "listening",
            metadata: { book: ch.book, chapter: ch.chapter, catalogEntry: ch },
          });
        }
      }
    } catch (e) {
      console.warn("Failed to derive listening chapters in level registry:", e);
    }

    cachedRegistry = list;
    return list;
  })();

  return registryPromise;
}

/**
 * 响应式 React Hook，获取全量资源注册表
 */
export function useLevelRegistry() {
  const [resources, setResources] = useState<LevelResource[]>(
    () => cachedRegistry || A0_STATIC_RESOURCES
  );
  const [loading, setLoading] = useState<boolean>(!cachedRegistry);

  useEffect(() => {
    let mounted = true;
    getLevelRegistry().then((res) => {
      if (mounted) {
        setResources(res);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { resources, loading };
}

/**
 * 动态按级汇总生成「资源构成一行」（不手写数字）
 */
export function getLevelResourceSummary(
  level: LevelKey,
  resources: LevelResource[]
): string {
  const levelResources = resources.filter((r) => r.level === level);
  const pronCount = levelResources.filter((r) => r.zone === "pronunciation").length;
  const bookCount = levelResources.filter((r) => r.zone === "books").length;

  if (level === "a0") {
    return `${pronCount} 项拼读与发音模块（音素字典 · 词族乐园）`;
  }

  const parts: string[] = [];
  if (pronCount > 0) parts.push(`${pronCount} 节情景对话`);
  if (bookCount > 0) parts.push(`${bookCount} 篇绘本故事`);

  return parts.length > 0 ? parts.join(" · ") : "资源加载中…";
}

export interface LevelProgressInfo {
  completed: number;
  total: number;
  percentage: number;
  label: string;
}

/**
 * 根据现有进度数据源精确计算某级别进度（不编造假数据）
 */
export function calculateLevelProgress(
  level: LevelKey,
  resources: LevelResource[],
  options?: {
    masteryMap?: Record<string, boolean>;
    dialogueProgress?: Record<string, { stars: number }>;
    finishedListening?: Record<string, Record<string, boolean>>;
  }
): LevelProgressInfo {
  if (level === "a0") {
    const map = options?.masteryMap || getPhonemeMasteryMap();
    const completed = ALL_39_PHONEMES.filter((p) => !!map[p.slug]).length;
    const total = 39;
    const percentage = Math.round((completed / total) * 100);
    return {
      completed,
      total,
      percentage,
      label: `已点亮 ${completed}/${total} 音素`,
    };
  }

  const levelRes = resources.filter((r) => r.level === level);
  if (levelRes.length === 0) {
    return { completed: 0, total: 0, percentage: 0, label: "资源统计中" };
  }

  const dialProg = options?.dialogueProgress || getDialogueProgress();
  const finList = options?.finishedListening || getFinishedLocal();

  let completed = 0;
  for (const item of levelRes) {
    if (item.zone === "pronunciation" && item.metadata?.lessonId) {
      if ((dialProg[item.metadata.lessonId]?.stars || 0) > 0) {
        completed++;
      }
    } else if (item.zone === "books" && item.metadata?.book && item.metadata?.chapter) {
      if (finList[item.metadata.book]?.[String(item.metadata.chapter)]) {
        completed++;
      }
    }
  }

  const total = levelRes.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return {
    completed,
    total,
    percentage,
    label: `已完成 ${completed}/${total} 项资源`,
  };
}

/**
 * 推导用户当前级别（正在学）
 */
export function determineCurrentLevel(
  progressMap: Record<LevelKey, LevelProgressInfo>
): LevelKey {
  try {
    const saved = localStorage.getItem("sunnybridge_current_level") as LevelKey;
    if (saved && ORDERED_LEVELS.includes(saved)) {
      return saved;
    }
  } catch {}

  // 默认由低到高，取第一个尚未 100% 完成的级别
  for (const k of ORDERED_LEVELS) {
    const prog = progressMap[k];
    if (prog && prog.percentage < 100) {
      return k;
    }
  }
  return "a0";
}
