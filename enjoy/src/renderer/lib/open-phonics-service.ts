// 阳光桥少儿英语 · Open-Phonics 自然拼读 7 阶核心服务
// 涵盖 7 个进阶阶段、150 节循序递进课程、97 个拼读音素/字母组合、1,236 个分级可解码词

export interface PhonicsPhaseMeta {
  id: number;
  title: string;
  titleZh: string;
  subtitle: string;
  lessonRange: string;
  description: string;
  descriptionZh: string;
  emoji: string;
  color: string;
  accentBorder: string;
  badgeBg: string;
  ageBadge: string;
}

export interface PhonicsSound {
  symbol: string;
  pronounced: string;
  asIn: string;
  type: string;
  lesson: number;
  note: string | null;
  ipaSlug?: string;
}

export interface PhonicsLesson {
  id: number;
  title: string;
  target: string;
  phase: number;
}

export interface PhonicsWord {
  word: string;
  phase: number;
  lesson: number;
  sounds: string[];
  note?: string;
  translation?: string;
}

export interface OpenPhonicsCatalog {
  source: string;
  license: string;
  exported: string;
  stats: {
    words: number;
    sounds: number;
    phases: number;
    lessons: number;
  };
  phases: Array<{
    id: number;
    title: string;
    subtitle: string;
    lessonRange: string;
    description: string;
  }>;
  sounds: PhonicsSound[];
  lessons: PhonicsLesson[];
  words: PhonicsWord[];
}

export const PHONICS_PHASES_META: PhonicsPhaseMeta[] = [
  {
    id: 1,
    title: "Phase 1: Foundation",
    titleZh: "第 1 阶：拼读启蒙基石",
    subtitle: "Lessons 1-20 · 10 个首批核心音",
    lessonRange: "1-20",
    description: "The reading journey begins here. Introduces the first 10 sounds and teaches blending — the core skill of sounding out words.",
    descriptionZh: "自然拼读探索的第一步！认识前 10 个最基础字母音（m, s, a, t, r...），掌握声音滑拼（Blending）核心秘诀。",
    emoji: "🌱",
    color: "from-amber-500/20 via-orange-500/15 to-yellow-500/20",
    accentBorder: "border-amber-400/60",
    badgeBg: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/50",
    ageBadge: "适合 3~5 岁零基础",
  },
  {
    id: 2,
    title: "Phase 2: Building",
    titleZh: "第 2 阶：长元音与筑基",
    subtitle: "Lessons 21-40 · 基础字母与视觉词",
    lessonRange: "21-40",
    description: "Doubles sound knowledge and introduces digraphs, long vowels, and sight words. Sentences become longer.",
    descriptionZh: "音素量翻倍！引入基础长元音（ā, ō）、双字母组合（sh）与核心视觉高频词，迈出自主拼词大步。",
    emoji: "🧱",
    color: "from-emerald-500/20 via-teal-500/15 to-cyan-500/20",
    accentBorder: "border-emerald-400/60",
    badgeBg: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/50",
    ageBadge: "适合 4~6 岁拼读初阶",
  },
  {
    id: 3,
    title: "Phase 3: Expanding",
    titleZh: "第 3 阶：辅音拓展与卷舌音",
    subtitle: "Lessons 41-75 · 22 个丰富音素",
    lessonRange: "41-75",
    description: "The longest phase, introducing all remaining single letter sounds, digraphs, and r-controlled vowels.",
    descriptionZh: "单阶段音素最多！解锁 ch、ing、卷舌音家族（ar, er, ir, ur）与双写 oo，阅读词汇量呈爆发式增长。",
    emoji: "🚀",
    color: "from-blue-500/20 via-indigo-500/15 to-cyan-500/20",
    accentBorder: "border-blue-400/60",
    badgeBg: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-400/50",
    ageBadge: "适合 5~7 岁拼读进阶",
  },
  {
    id: 4,
    title: "Phase 4: Vowel Teams",
    titleZh: "第 4 阶：双元音战队",
    subtitle: "Lessons 76-88 · 元音结伴发长音",
    lessonRange: "76-88",
    description: "Introduces vowel team spellings — pairs of letters that make one vowel sound together.",
    descriptionZh: "攻克“元音两两结伴走，前一个发长音”神法则（ea, ee, oa, ay, ai），见词拼读更自信！",
    emoji: "⚡",
    color: "from-purple-500/20 via-violet-500/15 to-pink-500/20",
    accentBorder: "border-purple-400/60",
    badgeBg: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-400/50",
    ageBadge: "适合 6~8 岁自主阅读",
  },
  {
    id: 5,
    title: "Phase 5: Patterns & Rules",
    titleZh: "第 5 阶：特殊拼读与避坑规则",
    subtitle: "Lessons 89-100 · 强化常见拼写盲区",
    lessonRange: "89-100",
    description: "Introduces diphthongs, additional digraphs, short-oo, and unvoiced th.",
    descriptionZh: "补齐拼读版图中的关键拼图：ou、or、ck 词尾、清音 th（如 math）、短音 ŏŏ（如 book）。",
    emoji: "🧩",
    color: "from-rose-500/20 via-pink-500/15 to-orange-500/20",
    accentBorder: "border-rose-400/60",
    badgeBg: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-400/50",
    ageBadge: "适合 6~9 岁流利表达",
  },
  {
    id: 6,
    title: "Phase 6: Blends & Advanced",
    titleZh: "第 6 阶：辅音连缀与高级词缀",
    subtitle: "Lessons 101-125 · 辅音成串与过去式",
    lessonRange: "101-125",
    description: "Consonant blends, advanced vowel patterns, silent letters, -ed suffix, soft c/g rules.",
    descriptionZh: "攻破复合辅音（bl, cl, str）、静音词（kn, wr）、过去式 -ed 三种变音及 c/g 软音法则，突破长词难关。",
    emoji: "🧗",
    color: "from-amber-600/20 via-rose-600/15 to-orange-600/20",
    accentBorder: "border-amber-500/60",
    badgeBg: "bg-amber-600/15 text-amber-900 dark:text-amber-200 border-amber-500/50",
    ageBadge: "适合 7~10 岁进阶阅读",
  },
  {
    id: 7,
    title: "Phase 7: Mastery",
    titleZh: "第 7 阶：拼读巅峰大通关",
    subtitle: "Lessons 126-150 · 多辅音串与复合后缀",
    lessonRange: "126-150",
    description: "Remaining blends, silent letter patterns, double consonants, common suffixes, syllable types.",
    descriptionZh: "冲顶自然拼读终点站！掌握多辅音连缀（spr, scr, squ）、-tion/-sion 词尾、双写规则及音节切分，轻松拿下任何大词！",
    emoji: "👑",
    color: "from-yellow-500/20 via-amber-500/15 to-orange-500/20",
    accentBorder: "border-yellow-400/60",
    badgeBg: "bg-yellow-500/15 text-yellow-900 dark:text-yellow-200 border-yellow-400/50",
    ageBadge: "适合 8~12 岁全能通关",
  },
];

// Open-Phonics 音素与 SunnyBridge 39 国际音标 (IPA) 的对照映射表
export const SOUND_TO_IPA_MAP: Record<string, string> = {
  m: "m",
  s: "s",
  a: "ae", // /æ/
  "ē": "i_long", // /iː/
  t: "t",
  r: "r",
  d: "d",
  i: "ih", // /ɪ/
  th: "dh", // /ð/ (voiced)
  c: "k",
  o: "ah", // /ɑ/
  n: "n",
  f: "f",
  u: "wedge", // /ʌ/
  l: "l",
  w: "w",
  g: "g",
  sh: "sh", // /ʃ/
  "ā": "ey", // /eɪ/
  h: "h",
  k: "k",
  "ō": "ow", // /oʊ/
  v: "v",
  p: "p",
  ar: "ah", // /ɑː/
  ch: "ch", // /tʃ/
  e: "eh", // /ɛ/
  b: "b",
  ing: "ng", // /ŋ/
  "ī": "ay", // /aɪ/
  y: "j", // /j/
  er: "er", // /ɜ/
  ir: "er",
  ur: "er",
  oo: "u_long", // /uː/
  j: "jh", // /dʒ/
  wh: "w",
  "ȳ": "ay",
  "ū": "u_long",
  qu: "k",
  x: "k",
  z: "z",
  ea: "i_long",
  ee: "i_long",
  oa: "ow",
  ay: "ey",
  ai: "ey",
  ou: "aw_dip",
  or: "aw",
  ck: "k",
  "th (unvoiced)": "th", // /θ/
  "ŏŏ": "uh", // /ʊ/
  "ow (cow)": "aw_dip",
  "ow (snow)": "ow",
  oi: "oy",
  oy: "oy",
  aw: "aw",
  all: "aw",
  igh: "ay",
  ew: "u_long",
  "soft c": "s",
  "soft g": "jh",
  "-tion": "sh",
  "-sion": "sh",
};

let cachedCatalog: OpenPhonicsCatalog | null = null;
let catalogLoadingPromise: Promise<OpenPhonicsCatalog> | null = null;

// 加载 Open-Phonics 词库数据
export async function getOpenPhonicsCatalog(): Promise<OpenPhonicsCatalog> {
  if (cachedCatalog) return cachedCatalog;
  if (catalogLoadingPromise) return catalogLoadingPromise;

  catalogLoadingPromise = fetch("/assets/phonics/open-phonics-catalog.json")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load open-phonics catalog: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data: OpenPhonicsCatalog) => {
      // 丰富 sounds 的 ipaSlug
      data.sounds = data.sounds.map((s) => ({
        ...s,
        ipaSlug: SOUND_TO_IPA_MAP[s.symbol] || undefined,
      }));
      cachedCatalog = data;
      return data;
    });

  return catalogLoadingPromise;
}

// 获取某个阶段的元数据
export function getPhaseMeta(phaseId: number): PhonicsPhaseMeta {
  return (
    PHONICS_PHASES_META.find((p) => p.id === phaseId) || PHONICS_PHASES_META[0]
  );
}

// 根据筛选条件获取单词列表
export async function getPhonicsWords(options?: {
  phaseId?: number;
  soundSymbol?: string;
  searchKeyword?: string;
  limit?: number;
}): Promise<PhonicsWord[]> {
  const catalog = await getOpenPhonicsCatalog();
  let list = catalog.words;

  if (options?.phaseId && options.phaseId > 0) {
    list = list.filter((w) => w.phase === options.phaseId);
  }

  if (options?.soundSymbol) {
    const sym = options.soundSymbol.toLowerCase();
    list = list.filter((w) =>
      w.sounds.some((s) => s.toLowerCase() === sym)
    );
  }

  if (options?.searchKeyword) {
    const kw = options.searchKeyword.toLowerCase().trim();
    list = list.filter(
      (w) =>
        w.word.toLowerCase().includes(kw) ||
        w.sounds.some((s) => s.toLowerCase().includes(kw)) ||
        (w.note && w.note.toLowerCase().includes(kw))
    );
  }

  if (options?.limit && options.limit > 0) {
    return list.slice(0, options.limit);
  }

  return list;
}

// 关联查询：根据 39 国际音标的 slug 获取对应自然拼读词库的可解码词
export async function getDecodableWordsForIpaSlug(
  ipaSlug: string,
  limit: number = 24
): Promise<PhonicsWord[]> {
  const catalog = await getOpenPhonicsCatalog();

  // 找到所有映射到该 ipaSlug 的 sound symbols
  const matchingSymbols = new Set<string>();
  for (const [symbol, slug] of Object.entries(SOUND_TO_IPA_MAP)) {
    if (slug === ipaSlug) {
      matchingSymbols.add(symbol.toLowerCase());
    }
  }

  if (matchingSymbols.size === 0) return [];

  // 从 1236 个词库中找出包含这些音素的单词
  const results = catalog.words.filter((w) =>
    w.sounds.some((s) => matchingSymbols.has(s.toLowerCase()))
  );

  return results.slice(0, limit);
}

// 获取某一阶段所有的音素 (Sounds)
export async function getSoundsByPhase(phaseId: number): Promise<PhonicsSound[]> {
  const catalog = await getOpenPhonicsCatalog();
  const lessonsInPhase = new Set(
    catalog.lessons.filter((l) => l.phase === phaseId).map((l) => l.id)
  );

  return catalog.sounds.filter((s) => lessonsInPhase.has(s.lesson));
}

// 播放拼读音素/单词的标准发音 (Web Speech / standard TTS)
export function playPhonicsSound(text: string, rate: number = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}
