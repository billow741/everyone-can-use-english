// 阳光桥少儿英语 · 七大资源版块总注册表 (Section Registry)
// 单一数据源：统一登记 自然拼读 / 听故事 / 环球漫游 / 情景对话 / VOA听力 / 伊索寓言 / 绘本
// 依据《工单 G · IA 翻转：资源先行七版块》（Roger 2026-11-12 亲批）

import { useState, useEffect } from "react";
import { getPhonemeMasteryMap, ALL_39_PHONEMES } from "./phoneme-data";
import { getDialogueProgress } from "./dialogue-service";
import { getFinishedLocal } from "./listening-sync";

export type SectionKey =
  | "phonics"
  | "listening"
  | "world"
  | "dialogues"
  | "voa"
  | "fables"
  | "stories";

export interface SectionMeta {
  id: SectionKey;
  name: string;
  route: string;
  dimension: string; // 孩子在这里练什么
  levelStructure: string; // 各版块内部分级
  badge: string;
  badgeBg: string;
  iconName: "Sparkles" | "Headphones" | "Compass" | "MessageCircle" | "Radio" | "Scroll" | "BookOpen";
  status: "active" | "preparing";
  statusLabel?: string;
  summary: string;
}

/**
 * 七版块元数据配置（依据工单 G 定案标准，严禁私自变更）
 */
export const SECTION_METAS: Record<SectionKey, SectionMeta> = {
  phonics: {
    id: "phonics",
    name: "自然拼读",
    route: "/phonemes",
    dimension: "听得出、拼得出：39 音素感知与 21 词族发音基石",
    levelStructure: "A0 专属（39 音素 ＋ 21 词族）",
    badge: "拼读启蒙",
    badgeBg: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200",
    iconName: "Sparkles",
    status: "active",
    summary: "39 音素 · 21 词族乐园 · 3D 口型",
  },
  listening: {
    id: "listening",
    name: "听故事",
    route: "/listening",
    dimension: "原版原声伴读，逐句跟读、积累词汇与听力感知",
    levelStructure: "A1 5 章 · A2 8 章 · B1 3 章（16 单元）",
    badge: "分级听读",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200",
    iconName: "Headphones",
    status: "active",
    summary: "彼得兔 15 单元 ＋ 绒布小兔 1 单元",
  },
  world: {
    id: "world",
    name: "环球漫游",
    route: "/world",
    dimension: "英美历史名胜、地道美食与风土文化漫游跟读",
    levelStructure: "A2 34 站 · B1 45 站（79 站，无 A1）",
    badge: "文化漫游",
    badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200",
    iconName: "Compass",
    status: "active",
    summary: "79 站英美名胜风土 · 环球旅行护照",
  },
  dialogues: {
    id: "dialogues",
    name: "情景对话",
    route: "/dialogues",
    dimension: "情景导入到角色扮演，五步闭环沉浸式日常会话",
    levelStructure: "L1/1+ (A1) · L2/2+ (A2) · L3 (B1)",
    badge: "口语会话",
    badgeBg: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200",
    iconName: "MessageCircle",
    status: "active",
    summary: "12 节 kids-ok 沉浸会话闭环",
  },
  voa: {
    id: "voa",
    name: "VOA听力",
    route: "/voa",
    dimension: "慢速英语日常学习泛听，纯正美音标准语速跟听",
    levelStructure: "L1 · L2 · Anna 原生分级（不映射 A0–B1）",
    badge: "慢速听力",
    badgeBg: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200",
    iconName: "Radio",
    status: "preparing",
    statusLabel: "筹备中",
    summary: "慢速泛听 · 原生三档架构预备",
  },
  fables: {
    id: "fables",
    name: "伊索寓言",
    route: "/fables",
    dimension: "精选原版双语寓言微剧场，每天一则哲理启迪",
    levelStructure: "每天一则 · 四级之外",
    badge: "每日寓言",
    badgeBg: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200",
    iconName: "Scroll",
    status: "preparing",
    statusLabel: "筹备中",
    summary: "双语微剧场 · 每日更新一则",
  },
  stories: {
    id: "stories",
    name: "绘本",
    route: "/stories",
    dimension: "牛津原版分级阅读数字图书馆，真正看图读书",
    levelStructure: "Home 5 级（30 册）· School 16 级（314 册）",
    badge: "牛津原版",
    badgeBg: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200",
    iconName: "BookOpen",
    status: "active",
    summary: "344 册全量文库 · Oxford Levels 1–20",
  },
};

export const ORDERED_SECTIONS: SectionKey[] = [
  "phonics",
  "listening",
  "world",
  "dialogues",
  "voa",
  "fables",
  "stories",
];

export interface SectionProgressInfo {
  completed: number;
  total: number;
  label: string;
  sublabel?: string;
}

/**
 * 响应式统计 Hook：获取各版块真实进度与资源数量
 */
export function useSectionStats() {
  const [stats, setStats] = useState<Record<SectionKey, SectionProgressInfo>>(() => ({
    phonics: { completed: 0, total: 39, label: "39 音素 · 21 词族" },
    listening: { completed: 0, total: 16, label: "16 单元故事" },
    world: { completed: 0, total: 79, label: "79 站漫游" },
    dialogues: { completed: 0, total: 12, label: "12 节日常课" },
    voa: { completed: 0, total: 0, label: "原生 L1/L2/Anna", sublabel: "筹备中" },
    fables: { completed: 0, total: 0, label: "每天一则 · 四级之外", sublabel: "筹备中" },
    stories: { completed: 0, total: 344, label: "344 册牛津全量" },
  }));

  useEffect(() => {
    try {
      // 1. 音素进度
      const masteryMap = getPhonemeMasteryMap();
      const phonemeDone = ALL_39_PHONEMES.filter((p) => !!masteryMap[p.slug]).length;

      // 2. 对话课进度
      const dialProg = getDialogueProgress();
      const dialDone = Object.values(dialProg).filter((v) => (v?.stars || 0) > 0).length;

      // 3. 听力进度
      const finList = getFinishedLocal();
      let listeningDone = 0;
      let worldDone = 0;
      for (const b in finList) {
        const count = Object.values(finList[b] || {}).filter(Boolean).length;
        if (b === "world") {
          worldDone += count;
        } else {
          listeningDone += count;
        }
      }

      setStats({
        phonics: {
          completed: phonemeDone,
          total: 39,
          label: `已点亮 ${phonemeDone}/39 音素 ＋ 21 词族`,
        },
        listening: {
          completed: listeningDone,
          total: 16,
          label: `已听完 ${listeningDone}/16 单元（A1/A2/B1）`,
        },
        world: {
          completed: worldDone,
          total: 79,
          label: `已打卡 ${worldDone}/79 站（A2 34 · B1 45）`,
        },
        dialogues: {
          completed: dialDone,
          total: 12,
          label: `已通关 ${dialDone}/12 课（L1/L2/L3）`,
        },
        voa: {
          completed: 0,
          total: 0,
          label: "慢速听力三档架构",
          sublabel: "筹备中",
        },
        fables: {
          completed: 0,
          total: 0,
          label: "每日一则 · 寓言微剧场",
          sublabel: "筹备中",
        },
        stories: {
          completed: 0,
          total: 344,
          label: "344 册（家庭 30 · 校园 314）",
        },
      });
    } catch (e) {
      console.warn("Error computing section stats:", e);
    }
  }, []);

  return stats;
}
