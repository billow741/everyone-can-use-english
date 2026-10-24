// 阳光桥少儿英语 · 自然拼读 12 组推荐路线与 4 阶段测验核心大纲体系
// 依据：《自然拼读课程大纲与 39 关学习路线》（2026-10-24）
// 核心原则：
// 1. 合成式自然拼读（synthetic phonics）：音 → 拼 → 词。
// 2. 12 组进阶顺序（G1→G12），关卡 ID 严格与现有 39 音素注册表 PHONICS_ISLAND_39_ANCHORS 保持 1:1 锚定。
// 3. 组末 D 模板场景寻宝复习关（12 组各 1 关）。
// 4. 4 个阶段盲拼测验（G5 后、G9 后、G11 后、G12 后），5 个未见过新词盲拼，>=4 解锁下一阶段；未通过定位 weakest-2 音素回炉。
// 5. 儿童界面 0 IPA 符号、0 发音术语，0 数字挫败分，只给星星鼓励。

import {
  PHONICS_ISLAND_39_ANCHORS,
  PhonicsAnchorItem,
} from "./phoneme-anchors";

export interface PhonicsQuizWord {
  word: string; // 单词，如 'cup'
  translation: string; // 中文释义，如 '小水杯'
  phonemeIds: string[]; // 涉及的音素 ID，如 ['c_k', 'u', 'p']，用于错题回炉统计
  displayLetters: string[]; // 正确字母拆分，如 ['c', 'u', 'p']
  scrambledLetters: string[]; // 随机打乱供点击/拖拽的字母块，如 ['u', 'p', 'c']
}

export interface PhonicsRouteGroup {
  id: string; // 'g1' ~ 'g12'
  order: number; // 1 ~ 12
  stage: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  description: string;
  phonemeIds: string[]; // 严格对应现有源码注册 ID
  cumulativeWordsExample: string[]; // 学完本组累计可拼读词示例
  reviewTitle: string;
  reviewDescription: string;
}

export interface PhonicsRouteStage {
  id: 1 | 2 | 3 | 4;
  name: string; // '第一阶段'
  title: string; // '短元音 CVC 拼读'
  description: string;
  afterGroupId: string; // 'g5', 'g9', 'g11', 'g12'
  totalSounds: number; // 18, 13, 5, 3
  quizWords: PhonicsQuizWord[]; // 5 个未见过新词盲拼
}

// 12 组大纲严格定义 (G1 ~ G12)
export const PHONICS_ROUTE_GROUPS: PhonicsRouteGroup[] = [
  // ========== 第一段：短元音 CVC 拼读 (18 音) ==========
  {
    id: "g1",
    order: 1,
    stage: 1,
    title: "第 1 组 · 拼读第一步",
    subtitle: "s, a, t, p",
    description: "第一组就能拼出真词，开启第一次阅读正反馈！",
    phonemeIds: ["s", "a", "t", "p"],
    cumulativeWordsExample: ["sat", "pat", "tap", "sap"],
    reviewTitle: "第 1 组 场景寻宝大冒险",
    reviewDescription: "找齐 s, a, t, p 四个字母宝贝，开启通关宝箱！",
  },
  {
    id: "g2",
    order: 2,
    stage: 1,
    title: "第 2 组 · 舌尖与短元音",
    subtitle: "i, n, d",
    description: "短元音 i 加入，拼读词库飞速扩张！",
    phonemeIds: ["i", "n", "d"],
    cumulativeWordsExample: ["pin", "tin", "pit", "sit", "dip", "nip", "pad", "sad"],
    reviewTitle: "第 2 组 场景寻宝大冒险",
    reviewDescription: "在小雪屋与海滩中，找齐 i, n, d 字母宝贝！",
  },
  {
    id: "g3",
    order: 3,
    stage: 1,
    title: "第 3 组 · 双唇与硬辅音",
    subtitle: "m, g, o, c / k",
    description: "m 与 n 听辨对比，小猫小羊聚齐！",
    phonemeIds: ["m", "g", "o", "c_k"],
    cumulativeWordsExample: ["man", "map", "mad", "mom", "mop", "dog", "got", "pot", "top", "cap", "cat"],
    reviewTitle: "第 3 组 场景寻宝大冒险",
    reviewDescription: "月亮与小猫捉迷藏，找齐 m, g, o, c/k 宝贝！",
  },
  {
    id: "g4",
    order: 4,
    stage: 1,
    title: "第 4 组 · 短元音集结",
    subtitle: "e, u, r",
    description: "短元音全员到齐，CVC 拼读全线贯通！",
    phonemeIds: ["e", "u", "r"],
    cumulativeWordsExample: ["red", "pen", "rug", "run", "sun", "cup", "rip", "rat", "rag"],
    reviewTitle: "第 4 组 场景寻宝大冒险",
    reviewDescription: "小雨伞下寻宝藏，找齐 e, u, r 字母宝贝！",
  },
  {
    id: "g5",
    order: 5,
    stage: 1,
    title: "第 5 组 · CVC 大贯通",
    subtitle: "h, b, f, l",
    description: "b 与 d 隔三组防混淆，CVC 基础大功告成！",
    phonemeIds: ["h", "b", "f", "l"],
    cumulativeWordsExample: ["hat", "bat", "fat", "fan", "hen", "leg", "lip", "fog", "hug", "bug", "tub"],
    reviewTitle: "第 5 组 场景寻宝大冒险",
    reviewDescription: "森林小木屋寻宝，找齐 h, b, f, l 宝贝！",
  },

  // ========== 第二段：其余辅音与双字母音 (13 音) ==========
  {
    id: "g6",
    order: 6,
    stage: 2,
    title: "第 6 组 · 活力辅音群",
    subtitle: "j, v, w, x, y, z",
    description: "果汁面包车与斑马，感受丰富多彩的发音小齿轮！",
    phonemeIds: ["j", "v", "w", "x", "y", "z"],
    cumulativeWordsExample: ["jet", "vet", "wax", "zip", "van", "web", "jam", "box", "fox"],
    reviewTitle: "第 6 组 场景寻宝大冒险",
    reviewDescription: "果汁斑马乐园，找齐 j, v, w, x, y, z 宝贝！",
  },
  {
    id: "g7",
    order: 7,
    stage: 2,
    title: "第 7 组 · 二合双字母音 (一)",
    subtitle: "sh, ch, th (清)",
    description: "两个字母拉起手，发出一个奇妙好听的新声音！",
    phonemeIds: ["sh", "ch", "th_unvoiced"],
    cumulativeWordsExample: ["ship", "shop", "fish", "chin", "chop", "thin", "bath"],
    reviewTitle: "第 7 组 场景寻宝大冒险",
    reviewDescription: "轮船甲板寻宝，找齐 sh, ch, th 字母伙伴！",
  },
  {
    id: "g8",
    order: 8,
    stage: 2,
    title: "第 8 组 · 二合双字母音 (二)",
    subtitle: "qu, ng, wh",
    description: "女王戴戒指转车轮，双字母战队大显身手！",
    phonemeIds: ["qu", "ng", "wh"],
    cumulativeWordsExample: ["quick", "quack", "quit", "quiz", "ring", "sing", "song", "when", "whip"],
    reviewTitle: "第 8 组 场景寻宝大冒险",
    reviewDescription: "城堡宫殿寻宝，找齐 qu, ng, wh 闪耀宝贝！",
  },
  {
    id: "g9",
    order: 9,
    stage: 2,
    title: "第 9 组 · 声带小震动",
    subtitle: "th (浊)",
    description: "羽毛轻拂声带轻轻震，与清音 th 对比听辨！",
    phonemeIds: ["th_voiced"],
    cumulativeWordsExample: ["this", "that", "them", "with"],
    reviewTitle: "第 9 组 场景寻宝大冒险",
    reviewDescription: "羽毛森林寻宝，锁定 th (浊) 宝藏！",
  },

  // ========== 第三段：长元音 (5 音) ==========
  {
    id: "g10",
    order: 10,
    stage: 3,
    title: "第 10 组 · 魔法长元音 (一)",
    subtitle: "ā, ī",
    description: "神奇 Magic e 让元音变长，大声喊出自己的名字！",
    phonemeIds: ["a_long", "i_long"],
    cumulativeWordsExample: ["cake", "make", "like", "bike", "kite", "time"],
    reviewTitle: "第 10 组 场景寻宝大冒险",
    reviewDescription: "魔法蛋糕城堡，找齐 ā 与 ī 魔法星！",
  },
  {
    id: "g11",
    order: 11,
    stage: 3,
    title: "第 11 组 · 魔法长元音 (二)",
    subtitle: "ē, ō, ū",
    description: "大树小船与独角兽，长元音军团全部集结！",
    phonemeIds: ["e_long", "o_long", "u_long"],
    cumulativeWordsExample: ["tree", "bee", "boat", "road"],
    reviewTitle: "第 11 组 场景寻宝大冒险",
    reviewDescription: "彩虹独角兽岛，找齐 ē, ō, ū 长元音宝贝！",
  },

  // ========== 第四段：r 音 (3 音) ==========
  {
    id: "g12",
    order: 12,
    stage: 4,
    title: "第 12 组 · 卷舌 r 魔法战队",
    subtitle: "ar, or, er",
    description: "汽车小马与蕨类，舌尖卷起美妙音符，39 关终点站！",
    phonemeIds: ["ar", "or", "er"],
    cumulativeWordsExample: ["car", "star", "horse", "short", "fern", "her"],
    reviewTitle: "第 12 组 场景寻宝大冒险",
    reviewDescription: "通关终点站寻宝，找齐 ar, or, er 终极大奖章！",
  },
];

// 4 大阶段测验定义 (各 5 个未见过新词盲拼)
// 选词标准：非 39 个音素的锚定词，纯正自然拼读真词，仅使用截至该阶段已学音素
export const PHONICS_ROUTE_STAGES: PhonicsRouteStage[] = [
  {
    id: 1,
    name: "第一阶段",
    title: "短元音 CVC 拼读测验",
    description: "只听读音不给提示，盲拼 5 个新 CVC 单词，答对 4 词解锁第二阶段！",
    afterGroupId: "g5",
    totalSounds: 18,
    quizWords: [
      {
        word: "cup",
        translation: "小水杯",
        phonemeIds: ["c_k", "u", "p"],
        displayLetters: ["c", "u", "p"],
        scrambledLetters: ["u", "p", "c"],
      },
      {
        word: "bed",
        translation: "小床铺",
        phonemeIds: ["b", "e", "d"],
        displayLetters: ["b", "e", "d"],
        scrambledLetters: ["d", "b", "e"],
      },
      {
        word: "fin",
        translation: "鱼鳍",
        phonemeIds: ["f", "i", "n"],
        displayLetters: ["f", "i", "n"],
        scrambledLetters: ["n", "f", "i"],
      },
      {
        word: "hot",
        translation: "热热的",
        phonemeIds: ["h", "o", "t"],
        displayLetters: ["h", "o", "t"],
        scrambledLetters: ["t", "h", "o"],
      },
      {
        word: "leg",
        translation: "小腿",
        phonemeIds: ["l", "e", "g"],
        displayLetters: ["l", "e", "g"],
        scrambledLetters: ["g", "e", "l"],
      },
    ],
  },
  {
    id: 2,
    name: "第二阶段",
    title: "其余辅音与双字母音测验",
    description: "盲拼 5 个含双字母音的新单词，答对 4 词解锁长元音阶段！",
    afterGroupId: "g9",
    totalSounds: 13,
    quizWords: [
      {
        word: "jam",
        translation: "甜果酱",
        phonemeIds: ["j", "a", "m"],
        displayLetters: ["j", "a", "m"],
        scrambledLetters: ["m", "j", "a"],
      },
      {
        word: "chin",
        translation: "小下巴",
        phonemeIds: ["ch", "i", "n"],
        displayLetters: ["c", "h", "i", "n"],
        scrambledLetters: ["i", "n", "c", "h"],
      },
      {
        word: "song",
        translation: "一首歌",
        phonemeIds: ["s", "o", "ng"],
        displayLetters: ["s", "o", "n", "g"],
        scrambledLetters: ["g", "s", "o", "n"],
      },
      {
        word: "whip",
        translation: "轻拂",
        phonemeIds: ["wh", "i", "p"],
        displayLetters: ["w", "h", "i", "p"],
        scrambledLetters: ["p", "w", "h", "i"],
      },
      {
        word: "bath",
        translation: "泡泡浴",
        phonemeIds: ["b", "a", "th_unvoiced"],
        displayLetters: ["b", "a", "t", "h"],
        scrambledLetters: ["t", "h", "b", "a"],
      },
    ],
  },
  {
    id: 3,
    name: "第三阶段",
    title: "长元音 Magic e 测验",
    description: "盲拼 5 个含长元音的新单词，答对 4 词解锁 r 音终极阶段！",
    afterGroupId: "g11",
    totalSounds: 5,
    quizWords: [
      {
        word: "bike",
        translation: "自行车",
        phonemeIds: ["b", "i_long", "c_k"],
        displayLetters: ["b", "i", "k", "e"],
        scrambledLetters: ["e", "b", "k", "i"],
      },
      {
        word: "make",
        translation: "做手工",
        phonemeIds: ["m", "a_long", "c_k"],
        displayLetters: ["m", "a", "k", "e"],
        scrambledLetters: ["k", "m", "e", "a"],
      },
      {
        word: "road",
        translation: "大马路",
        phonemeIds: ["r", "o_long", "d"],
        displayLetters: ["r", "o", "a", "d"],
        scrambledLetters: ["a", "d", "r", "o"],
      },
      {
        word: "kite",
        translation: "飞风筝",
        phonemeIds: ["c_k", "i_long", "t"],
        displayLetters: ["k", "i", "t", "e"],
        scrambledLetters: ["t", "e", "k", "i"],
      },
      {
        word: "bee",
        translation: "小蜜蜂",
        phonemeIds: ["b", "e_long"],
        displayLetters: ["b", "e", "e"],
        scrambledLetters: ["e", "b", "e"],
      },
    ],
  },
  {
    id: 4,
    name: "第四阶段",
    title: "r 音终极通关测验",
    description: "盲拼 5 个含 r 卷舌音的新单词，答对 4 词达成 39 音终极通关！",
    afterGroupId: "g12",
    totalSounds: 3,
    quizWords: [
      {
        word: "star",
        translation: "小星星",
        phonemeIds: ["s", "t", "ar"],
        displayLetters: ["s", "t", "a", "r"],
        scrambledLetters: ["r", "s", "a", "t"],
      },
      {
        word: "fork",
        translation: "小餐叉",
        phonemeIds: ["f", "or", "c_k"],
        displayLetters: ["f", "o", "r", "k"],
        scrambledLetters: ["k", "f", "o", "r"],
      },
      {
        word: "her",
        translation: "她的",
        phonemeIds: ["h", "er"],
        displayLetters: ["h", "e", "r"],
        scrambledLetters: ["r", "h", "e"],
      },
      {
        word: "park",
        translation: "大公园",
        phonemeIds: ["p", "ar", "c_k"],
        displayLetters: ["p", "a", "r", "k"],
        scrambledLetters: ["k", "a", "p", "r"],
      },
      {
        word: "short",
        translation: "短短的",
        phonemeIds: ["sh", "or", "t"],
        displayLetters: ["s", "h", "o", "r", "t"],
        scrambledLetters: ["r", "t", "s", "h", "o"],
      },
    ],
  },
];

// 音素 ID 到所在组的快速反向映射
export const PHONEME_TO_GROUP_MAP: Record<string, PhonicsRouteGroup> = {};
PHONICS_ROUTE_GROUPS.forEach((group) => {
  group.phonemeIds.forEach((id) => {
    PHONEME_TO_GROUP_MAP[id] = group;
  });
});

// ========== 状态判断与进度推进纯函数集合 ==========

/**
 * 判断单个音素是否已掌握（兼容 id 和 ipaSlug 两种键名）
 */
export const isPhonemeMastered = (
  phonemeId: string,
  masteryMap: Record<string, any>
): boolean => {
  if (!masteryMap) return false;
  if (masteryMap[phonemeId]) return true;
  // 查找对应 anchor item 的 ipaSlug
  const anchor = PHONICS_ISLAND_39_ANCHORS.find((a) => a.id === phonemeId);
  if (anchor?.ipaSlug && masteryMap[anchor.ipaSlug]) return true;
  return false;
};

/**
 * 判断组内所有新音素是否都已掌握
 */
export const isGroupPhonemesMastered = (
  group: PhonicsRouteGroup,
  masteryMap: Record<string, any>
): boolean => {
  return group.phonemeIds.every((id) => isPhonemeMastered(id, masteryMap));
};

/**
 * 判断组末 D 复习关是否已完成
 */
export const isGroupReviewCompleted = (
  groupId: string,
  masteryMap: Record<string, any>
): boolean => {
  if (!masteryMap) return false;
  return Boolean(masteryMap[`review_${groupId}`]);
};

/**
 * 判断某阶段测验是否已通过
 */
export const isStageQuizPassed = (
  stageId: number,
  masteryMap: Record<string, any>
): boolean => {
  if (!masteryMap) return false;
  return Boolean(masteryMap[`quiz_stage${stageId}`]);
};

/**
 * 获取阶段测验详实数据（含错题回炉音素）
 */
export const getStageQuizData = (
  stageId: number,
  masteryMap: Record<string, any>
): { passed: boolean; score: number; remedialPhonemes?: string[] } | null => {
  if (!masteryMap) return null;
  const raw = masteryMap[`quiz_data_stage${stageId}`];
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * 判断某组是否解锁（门禁机制：首组常开；后续组要求前一组新音全过 ＋ D 复习关完成；若跨阶段还需通过前阶段测验）
 */
export const isGroupUnlocked = (
  group: PhonicsRouteGroup,
  masteryMap: Record<string, any>
): boolean => {
  // G1 永远解锁
  if (group.order === 1) return true;

  const prevGroup = PHONICS_ROUTE_GROUPS[group.order - 2];
  if (!prevGroup) return true;

  // 1. 前一组必须音素全过关 ＋ D 复习关找齐
  const prevSoundsOk = isGroupPhonemesMastered(prevGroup, masteryMap);
  const prevReviewOk = isGroupReviewCompleted(prevGroup.id, masteryMap);
  if (!prevSoundsOk || !prevReviewOk) {
    return false;
  }

  // 2. 若跨阶段（例如 G6 需通过 Stage 1 测验、G10 需通过 Stage 2 测验、G12 需通过 Stage 3 测验）
  if (group.stage > prevGroup.stage) {
    const requiredStageId = prevGroup.stage;
    const stagePassed = isStageQuizPassed(requiredStageId, masteryMap);
    if (!stagePassed) {
      return false;
    }
  }

  return true;
};

/**
 * 判断某组是否完全通关（新音全通 ＋ D 复习关完成）
 */
export const isGroupCompleted = (
  group: PhonicsRouteGroup,
  masteryMap: Record<string, any>
): boolean => {
  return (
    isGroupPhonemesMastered(group, masteryMap) &&
    isGroupReviewCompleted(group.id, masteryMap)
  );
};

/**
 * 判断某阶段测验是否已解锁（该阶段所有组及其 D 关均已完成）
 */
export const isStageUnlocked = (
  stageId: number,
  masteryMap: Record<string, any>
): boolean => {
  const stage = PHONICS_ROUTE_STAGES.find((s) => s.id === stageId);
  if (!stage) return false;

  const stageGroups = PHONICS_ROUTE_GROUPS.filter((g) => g.stage === stageId);
  return stageGroups.every((g) => isGroupCompleted(g, masteryMap));
};

/**
 * 错题定位：根据错题索引定位当前阶段最弱的 2 个音素（weakest-2 回炉）
 */
export const findWeakestPhonemesForStage = (
  stageId: number,
  wrongWordIndices: number[]
): string[] => {
  const stage = PHONICS_ROUTE_STAGES.find((s) => s.id === stageId);
  if (!stage || wrongWordIndices.length === 0) {
    // 默认回退本阶段前 2 个音
    const stageGroups = PHONICS_ROUTE_GROUPS.filter((g) => g.stage === stageId);
    const allStagePhonemes = stageGroups.flatMap((g) => g.phonemeIds);
    return allStagePhonemes.slice(0, 2);
  }

  // 收集错词中的音素频次
  const phonemeCounts: Record<string, number> = {};
  const stageGroups = PHONICS_ROUTE_GROUPS.filter((g) => g.stage === stageId);
  const stagePhonemeSet = new Set(stageGroups.flatMap((g) => g.phonemeIds));

  wrongWordIndices.forEach((idx) => {
    const qWord = stage.quizWords[idx];
    if (qWord) {
      qWord.phonemeIds.forEach((pid) => {
        // 优先计入本阶段音素
        const weight = stagePhonemeSet.has(pid) ? 2 : 1;
        phonemeCounts[pid] = (phonemeCounts[pid] || 0) + weight;
      });
    }
  });

  // 按错误频次降序排序
  const sorted = Object.keys(phonemeCounts).sort(
    (a, b) => phonemeCounts[b] - phonemeCounts[a]
  );

  // 优先挑选本阶段音素
  const result: string[] = [];
  for (const pid of sorted) {
    if (stagePhonemeSet.has(pid) && !result.includes(pid)) {
      result.push(pid);
      if (result.length === 2) break;
    }
  }

  // 若不足 2 个，补充其他错题音素或本阶段音素
  if (result.length < 2) {
    for (const pid of sorted) {
      if (!result.includes(pid)) {
        result.push(pid);
        if (result.length === 2) break;
      }
    }
  }

  if (result.length < 2) {
    for (const pid of stagePhonemeSet) {
      if (!result.includes(pid)) {
        result.push(pid);
        if (result.length === 2) break;
      }
    }
  }

  return result.slice(0, 2);
};

export interface RouteTarget {
  type: "phoneme" | "review" | "quiz" | "all_done";
  group?: PhonicsRouteGroup;
  phonemeItem?: PhonicsAnchorItem;
  stage?: PhonicsRouteStage;
  label: string;
  subLabel: string;
}

/**
 * 计算当前应该学习的关卡节点（主进度定位）
 * 返回应学节点类型（单音关卡 / 组末 D 复习关 / 阶段测验 / 全通关）
 */
export const getCurrentRouteTarget = (
  masteryMap: Record<string, any>
): RouteTarget => {
  for (const group of PHONICS_ROUTE_GROUPS) {
    // 检查组内未掌握的音素
    for (let i = 0; i < group.phonemeIds.length; i++) {
      const pid = group.phonemeIds[i];
      if (!isPhonemeMastered(pid, masteryMap)) {
        const item = PHONICS_ISLAND_39_ANCHORS.find((a) => a.id === pid);
        return {
          type: "phoneme",
          group,
          phonemeItem: item,
          label: `第 ${group.order} 组 / 第 ${i + 1} 关`,
          subLabel: item ? `字母 ${item.letter} · ${item.anchorWord}` : `音素 ${pid}`,
        };
      }
    }

    // 组内新音全过了，但 D 复习关未做
    if (!isGroupReviewCompleted(group.id, masteryMap)) {
      return {
        type: "review",
        group,
        label: `第 ${group.order} 组 复习寻宝关`,
        subLabel: group.reviewTitle,
      };
    }

    // 检查当前组是否是某阶段的最后一组
    const stage = PHONICS_ROUTE_STAGES.find((s) => s.afterGroupId === group.id);
    if (stage && !isStageQuizPassed(stage.id, masteryMap)) {
      return {
        type: "quiz",
        stage,
        group,
        label: `${stage.name} · 盲拼解锁测验`,
        subLabel: stage.title,
      };
    }
  }

  return {
    type: "all_done",
    label: "🎉 39 拼读全通关",
    subLabel: "恭喜你成为超级自然拼读小探险家！",
  };
};

/**
 * 汇总当前推荐路线主进度指标
 */
export const getRouteProgressSummary = (masteryMap: Record<string, any>) => {
  const target = getCurrentRouteTarget(masteryMap);
  const masteredPhonemesCount = PHONICS_ISLAND_39_ANCHORS.filter((a) =>
    isPhonemeMastered(a.id, masteryMap)
  ).length;

  const completedGroupsCount = PHONICS_ROUTE_GROUPS.filter((g) =>
    isGroupCompleted(g, masteryMap)
  ).length;

  const passedStagesCount = PHONICS_ROUTE_STAGES.filter((s) =>
    isStageQuizPassed(s.id, masteryMap)
  ).length;

  return {
    target,
    masteredPhonemesCount,
    totalPhonemesCount: 39,
    completedGroupsCount,
    totalGroupsCount: 12,
    passedStagesCount,
    totalStagesCount: 4,
    pct: Math.round((masteredPhonemesCount / 39) * 100),
  };
};
