// 阳光桥少儿英语 · 常用少儿拼读词汇卡通插画与 Emoji 图解映射
// 专为 6 岁以下儿童无字化视觉导航提供图像识别媒介 (P0-1 核心转译层)

export interface PhonicsCardVisual {
  emoji: string;
  labelZh: string;
  colorBg: string;
  category: "animal" | "food" | "nature" | "action" | "daily" | "magic";
  imageUrl?: string;
}

// Phase 1 首批 28 张高精度少儿 3D 闪卡插画映射表 (来源：D:\Download\flashcards-phase1-28张)
export const PHASE1_FLASHCARDS_MAP: Record<string, string> = {
  mist: "/assets/phonics/flashcards/flashcard-mist.webp",
  cat: "/assets/phonics/flashcards/flashcard-cat.webp",
  cats: "/assets/phonics/flashcards/flashcard-cats.webp",
  sad: "/assets/phonics/flashcards/flashcard-sad.webp",
  car: "/assets/phonics/flashcards/flashcard-car.webp",
  sit: "/assets/phonics/flashcards/flashcard-sit.webp",
  sat: "/assets/phonics/flashcards/flashcard-sat.webp",
  cart: "/assets/phonics/flashcards/flashcard-cart.webp",
  disc: "/assets/phonics/flashcards/flashcard-disc.webp",
  mad: "/assets/phonics/flashcards/flashcard-mad.webp",
  rats: "/assets/phonics/flashcards/flashcard-rats.webp",
  rat: "/assets/phonics/flashcards/flashcard-rat.webp",
  card: "/assets/phonics/flashcards/flashcard-card.webp",
  mass: "/assets/phonics/flashcards/flashcard-mass.webp",
  arm: "/assets/phonics/flashcards/flashcard-arm.webp",
  mats: "/assets/phonics/flashcards/flashcard-mats.webp",
  mat: "/assets/phonics/flashcards/flashcard-mat.webp",
  sac: "/assets/phonics/flashcards/flashcard-sac.webp",
  dad: "/assets/phonics/flashcards/flashcard-dad.webp",
  sam: "/assets/phonics/flashcards/flashcard-sam.webp",
  cast: "/assets/phonics/flashcards/flashcard-cast.webp",
  ram: "/assets/phonics/flashcards/flashcard-ram.webp",
  reed: "/assets/phonics/flashcards/flashcard-reed.webp",
  mast: "/assets/phonics/flashcards/flashcard-mast.webp",
  dam: "/assets/phonics/flashcards/flashcard-dam.webp",
  ears: "/assets/phonics/flashcards/flashcard-ears.webp",
  rim: "/assets/phonics/flashcards/flashcard-rim.webp",
  mars: "/assets/phonics/flashcards/flashcard-mars.webp",
};

export const PHONICS_WORD_VISUALS: Record<string, PhonicsCardVisual> = {
  // --- 常见动物类 (Animals) ---
  cat: { emoji: "🐱", labelZh: "小猫", colorBg: "from-amber-100 to-orange-100", category: "animal" },
  cats: { emoji: "🐱", labelZh: "小猫们", colorBg: "from-amber-100 to-orange-100", category: "animal" },
  dog: { emoji: "🐶", labelZh: "小狗", colorBg: "from-yellow-100 to-amber-100", category: "animal" },
  pig: { emoji: "🐷", labelZh: "小猪", colorBg: "from-pink-100 to-rose-100", category: "animal" },
  rat: { emoji: "🐭", labelZh: "小老鼠", colorBg: "from-slate-100 to-stone-200", category: "animal" },
  rats: { emoji: "🐭", labelZh: "小老鼠们", colorBg: "from-slate-100 to-stone-200", category: "animal" },
  ram: { emoji: "🐏", labelZh: "公羊", colorBg: "from-amber-50 to-orange-100", category: "animal" },
  bat: { emoji: "🦇", labelZh: "蝙蝠", colorBg: "from-purple-100 to-slate-200", category: "animal" },
  fox: { emoji: "🦊", labelZh: "狐狸", colorBg: "from-orange-100 to-amber-200", category: "animal" },
  duck: { emoji: "🦆", labelZh: "小鸭子", colorBg: "from-yellow-100 to-emerald-100", category: "animal" },
  fish: { emoji: "🐟", labelZh: "小鱼", colorBg: "from-cyan-100 to-blue-200", category: "animal" },
  hen: { emoji: "🐔", labelZh: "母鸡", colorBg: "from-red-100 to-amber-100", category: "animal" },
  bee: { emoji: "🐝", labelZh: "蜜蜂", colorBg: "from-yellow-100 to-amber-200", category: "animal" },
  bug: { emoji: "🐛", labelZh: "小虫子", colorBg: "from-emerald-100 to-teal-100", category: "animal" },
  ant: { emoji: "🐜", labelZh: "小蚂蚁", colorBg: "from-stone-100 to-amber-100", category: "animal" },
  frog: { emoji: "🐸", labelZh: "小青蛙", colorBg: "from-emerald-100 to-green-200", category: "animal" },
  bear: { emoji: "🐻", labelZh: "大熊", colorBg: "from-amber-100 to-stone-200", category: "animal" },
  bird: { emoji: "🐦", labelZh: "小鸟", colorBg: "from-sky-100 to-blue-200", category: "animal" },
  cow: { emoji: "🐮", labelZh: "奶牛", colorBg: "from-stone-100 to-amber-100", category: "animal" },
  sheep: { emoji: "🐑", labelZh: "小羊", colorBg: "from-slate-50 to-stone-100", category: "animal" },
  goat: { emoji: "🐐", labelZh: "山羊", colorBg: "from-stone-100 to-amber-100", category: "animal" },
  rabbit: { emoji: "🐰", labelZh: "兔子", colorBg: "from-pink-50 to-rose-100", category: "animal" },
  lion: { emoji: "🦁", labelZh: "小狮子", colorBg: "from-amber-100 to-orange-200", category: "animal" },

  // --- 食物与植物类 (Food & Plants) ---
  apple: { emoji: "🍎", labelZh: "红苹果", colorBg: "from-red-100 to-rose-200", category: "food" },
  apples: { emoji: "🍎", labelZh: "苹果", colorBg: "from-red-100 to-rose-200", category: "food" },
  banana: { emoji: "🍌", labelZh: "香蕉", colorBg: "from-yellow-100 to-amber-100", category: "food" },
  egg: { emoji: "🥚", labelZh: "鸡蛋", colorBg: "from-amber-50 to-yellow-100", category: "food" },
  milk: { emoji: "🥛", labelZh: "牛奶", colorBg: "from-sky-50 to-blue-100", category: "food" },
  nut: { emoji: "🥜", labelZh: "坚果", colorBg: "from-amber-100 to-stone-200", category: "food" },
  nuts: { emoji: "🥜", labelZh: "坚果", colorBg: "from-amber-100 to-stone-200", category: "food" },
  cake: { emoji: "🎂", labelZh: "蛋糕", colorBg: "from-pink-100 to-purple-100", category: "food" },
  pie: { emoji: "🥧", labelZh: "派", colorBg: "from-amber-100 to-orange-200", category: "food" },
  tea: { emoji: "🍵", labelZh: "绿茶", colorBg: "from-emerald-100 to-teal-100", category: "food" },
  jam: { emoji: "🍓", labelZh: "果酱", colorBg: "from-rose-100 to-red-200", category: "food" },
  corn: { emoji: "🌽", labelZh: "玉米", colorBg: "from-yellow-100 to-amber-200", category: "food" },
  reed: { emoji: "🌾", labelZh: "芦苇", colorBg: "from-emerald-100 to-teal-100", category: "nature" },
  tree: { emoji: "🌳", labelZh: "大树", colorBg: "from-emerald-100 to-green-200", category: "nature" },

  // --- 自然与天文 (Nature & Sky) ---
  sun: { emoji: "☀️", labelZh: "太阳", colorBg: "from-amber-100 to-yellow-200", category: "nature" },
  star: { emoji: "⭐", labelZh: "星星", colorBg: "from-yellow-100 to-amber-200", category: "nature" },
  stars: { emoji: "✨", labelZh: "繁星", colorBg: "from-yellow-100 to-amber-200", category: "nature" },
  moon: { emoji: "🌙", labelZh: "月亮", colorBg: "from-indigo-100 to-purple-200", category: "nature" },
  rain: { emoji: "🌧️", labelZh: "下雨", colorBg: "from-sky-100 to-blue-200", category: "nature" },
  wind: { emoji: "💨", labelZh: "刮风", colorBg: "from-teal-100 to-cyan-200", category: "nature" },
  mist: { emoji: "🌫️", labelZh: "水雾 / 薄雾", colorBg: "from-cyan-100 to-blue-100", category: "nature" },
  sea: { emoji: "🌊", labelZh: "大海", colorBg: "from-cyan-100 to-blue-200", category: "nature" },
  rock: { emoji: "🪨", labelZh: "石头", colorBg: "from-stone-200 to-slate-300", category: "nature" },
  dam: { emoji: "🦫", labelZh: "大水坝", colorBg: "from-blue-100 to-sky-200", category: "nature" },
  fire: { emoji: "🔥", labelZh: "火", colorBg: "from-orange-100 to-red-200", category: "nature" },
  mars: { emoji: "🪐", labelZh: "火星", colorBg: "from-orange-100 to-red-200", category: "nature" },

  // --- 身体与生活用品 (Body & Daily) ---
  dad: { emoji: "👨", labelZh: "爸爸", colorBg: "from-sky-100 to-indigo-100", category: "daily" },
  sam: { emoji: "👦", labelZh: "山姆小男孩", colorBg: "from-sky-100 to-indigo-100", category: "daily" },
  arm: { emoji: "💪", labelZh: "手臂", colorBg: "from-amber-100 to-yellow-100", category: "daily" },
  ears: { emoji: "👂", labelZh: "耳朵", colorBg: "from-rose-100 to-amber-100", category: "daily" },
  eye: { emoji: "👁️", labelZh: "眼睛", colorBg: "from-sky-100 to-blue-100", category: "daily" },
  eyes: { emoji: "👀", labelZh: "眼睛", colorBg: "from-sky-100 to-blue-100", category: "daily" },
  foot: { emoji: "🦶", labelZh: "脚丫", colorBg: "from-amber-100 to-orange-100", category: "daily" },
  feet: { emoji: "👣", labelZh: "脚印", colorBg: "from-amber-100 to-orange-100", category: "daily" },
  hand: { emoji: "✋", labelZh: "小手", colorBg: "from-amber-100 to-yellow-100", category: "daily" },
  leg: { emoji: "🦵", labelZh: "腿", colorBg: "from-amber-100 to-yellow-100", category: "daily" },
  lip: { emoji: "👄", labelZh: "嘴唇", colorBg: "from-pink-100 to-rose-200", category: "daily" },
  hat: { emoji: "👒", labelZh: "帽子", colorBg: "from-pink-100 to-purple-100", category: "daily" },
  cap: { emoji: "🧢", labelZh: "棒球帽", colorBg: "from-blue-100 to-indigo-200", category: "daily" },
  bed: { emoji: "🛏️", labelZh: "小床", colorBg: "from-indigo-100 to-purple-100", category: "daily" },
  box: { emoji: "📦", labelZh: "盒子", colorBg: "from-amber-100 to-stone-200", category: "daily" },
  cup: { emoji: "🥛", labelZh: "杯子", colorBg: "from-sky-100 to-cyan-100", category: "daily" },
  mat: { emoji: "🧘", labelZh: "地垫 / 席子", colorBg: "from-emerald-100 to-teal-100", category: "daily" },
  mats: { emoji: "🧘", labelZh: "地垫", colorBg: "from-emerald-100 to-teal-100", category: "daily" },
  pen: { emoji: "🖊️", labelZh: "钢笔", colorBg: "from-blue-100 to-indigo-100", category: "daily" },
  pot: { emoji: "🍲", labelZh: "锅", colorBg: "from-stone-200 to-slate-300", category: "daily" },
  van: { emoji: "🚐", labelZh: "面包车", colorBg: "from-yellow-100 to-amber-200", category: "daily" },
  bus: { emoji: "🚌", labelZh: "大巴车", colorBg: "from-amber-100 to-orange-200", category: "daily" },
  car: { emoji: "🚗", labelZh: "小汽车", colorBg: "from-red-100 to-rose-200", category: "daily" },
  cart: { emoji: "🛒", labelZh: "小推车", colorBg: "from-amber-100 to-orange-200", category: "daily" },
  card: { emoji: "🃏", labelZh: "卡片", colorBg: "from-purple-100 to-indigo-200", category: "daily" },
  disc: { emoji: "💿", labelZh: "圆盘 / 光盘", colorBg: "from-sky-100 to-indigo-100", category: "daily" },
  boat: { emoji: "⛵", labelZh: "小船", colorBg: "from-sky-100 to-blue-200", category: "daily" },
  mast: { emoji: "⛵", labelZh: "船桅杆", colorBg: "from-amber-100 to-yellow-200", category: "daily" },
  bell: { emoji: "🔔", labelZh: "小铃铛", colorBg: "from-yellow-100 to-amber-200", category: "daily" },
  ring: { emoji: "💍", labelZh: "戒指", colorBg: "from-amber-100 to-yellow-200", category: "daily" },
  book: { emoji: "📖", labelZh: "故事书", colorBg: "from-emerald-100 to-teal-100", category: "daily" },
  door: { emoji: "🚪", labelZh: "大门", colorBg: "from-amber-100 to-stone-200", category: "daily" },
  ball: { emoji: "⚽", labelZh: "皮球", colorBg: "from-slate-100 to-zinc-200", category: "daily" },
  kite: { emoji: "🪁", labelZh: "风筝", colorBg: "from-rose-100 to-amber-100", category: "daily" },
  sac: { emoji: "🎒", labelZh: "小口袋", colorBg: "from-amber-100 to-yellow-200", category: "daily" },
  rim: { emoji: "⭕", labelZh: "边缘 / 篮圈", colorBg: "from-blue-100 to-sky-200", category: "daily" },

  // --- 常见动作与情绪 (Actions & Emotions) ---
  sit: { emoji: "🪑", labelZh: "坐下", colorBg: "from-amber-100 to-yellow-100", category: "action" },
  sat: { emoji: "🪑", labelZh: "坐着", colorBg: "from-amber-100 to-yellow-100", category: "action" },
  run: { emoji: "🏃", labelZh: "快跑", colorBg: "from-orange-100 to-amber-200", category: "action" },
  jump: { emoji: "🦘", labelZh: "跳跃", colorBg: "from-emerald-100 to-teal-100", category: "action" },
  hop: { emoji: "🐰", labelZh: "单脚跳", colorBg: "from-pink-100 to-rose-100", category: "action" },
  swim: { emoji: "🏊", labelZh: "游泳", colorBg: "from-sky-100 to-cyan-200", category: "action" },
  sing: { emoji: "🎤", labelZh: "唱歌", colorBg: "from-purple-100 to-indigo-100", category: "action" },
  see: { emoji: "👀", labelZh: "看见", colorBg: "from-sky-100 to-blue-200", category: "action" },
  look: { emoji: "🔍", labelZh: "看一看", colorBg: "from-amber-100 to-yellow-100", category: "action" },
  eat: { emoji: "😋", labelZh: "吃东西", colorBg: "from-rose-100 to-orange-100", category: "action" },
  read: { emoji: "📚", labelZh: "读书", colorBg: "from-teal-100 to-emerald-200", category: "action" },
  play: { emoji: "🎮", labelZh: "玩游戏", colorBg: "from-purple-100 to-pink-100", category: "action" },
  cast: { emoji: "🪄", labelZh: "投掷 / 石膏", colorBg: "from-purple-100 to-pink-100", category: "action" },
  mad: { emoji: "😠", labelZh: "生气", colorBg: "from-rose-100 to-red-200", category: "magic" },
  sad: { emoji: "😢", labelZh: "难过", colorBg: "from-blue-100 to-slate-200", category: "magic" },
  happy: { emoji: "😄", labelZh: "开心", colorBg: "from-amber-100 to-yellow-200", category: "magic" },

  // --- 特殊词与虚词 (高频情境转译) ---
  a: { emoji: "🌟", labelZh: "一个", colorBg: "from-amber-100 to-yellow-200", category: "magic" },
  am: { emoji: "🙋", labelZh: "我是", colorBg: "from-sky-100 to-indigo-100", category: "magic" },
  at: { emoji: "📍", labelZh: "在...", colorBg: "from-emerald-100 to-teal-100", category: "magic" },
  an: { emoji: "🎈", labelZh: "一个", colorBg: "from-pink-100 to-rose-100", category: "magic" },
  the: { emoji: "👉", labelZh: "那个", colorBg: "from-amber-100 to-orange-100", category: "magic" },
  is: { emoji: "✨", labelZh: "是", colorBg: "from-indigo-100 to-purple-100", category: "magic" },
  it: { emoji: "🎯", labelZh: "它", colorBg: "from-cyan-100 to-blue-100", category: "magic" },
  in: { emoji: "📥", labelZh: "在里面", colorBg: "from-blue-100 to-indigo-100", category: "magic" },
  on: { emoji: "🔛", labelZh: "在上面", colorBg: "from-amber-100 to-orange-100", category: "magic" },
  up: { emoji: "⬆️", labelZh: "向上", colorBg: "from-sky-100 to-blue-200", category: "magic" },
  down: { emoji: "⬇️", labelZh: "向下", colorBg: "from-teal-100 to-emerald-200", category: "magic" },
  go: { emoji: "🚀", labelZh: "出发", colorBg: "from-orange-100 to-red-200", category: "magic" },
  no: { emoji: "🙅", labelZh: "不行", colorBg: "from-rose-100 to-red-100", category: "magic" },
  yes: { emoji: "🙆", labelZh: "好的", colorBg: "from-emerald-100 to-green-100", category: "magic" },
  big: { emoji: "🐘", labelZh: "很大", colorBg: "from-blue-100 to-indigo-200", category: "magic" },
  small: { emoji: "🐁", labelZh: "很小", colorBg: "from-yellow-100 to-amber-100", category: "magic" },
  hot: { emoji: "♨️", labelZh: "很热", colorBg: "from-orange-100 to-red-200", category: "magic" },
  cold: { emoji: "🧊", labelZh: "很冷", colorBg: "from-cyan-100 to-sky-200", category: "magic" },
  mass: { emoji: "🏔️", labelZh: "一大团 / 好多", colorBg: "from-slate-100 to-stone-200", category: "nature" },
};

// 获取单词的童趣视觉配图与标签
export function getPhonicsWordVisual(word: string): PhonicsCardVisual {
  const clean = word.toLowerCase().trim();
  const baseVisual = PHONICS_WORD_VISUALS[clean];

  const FALLBACK_EMOJIS = ["🎈", "🧩", "🚀", "🌈", "⭐", "🎨", "🔔", "🧸", "🎠", "🪄", "🍭"];
  const charCode = clean.charCodeAt(0) || 0;
  const emoji = FALLBACK_EMOJIS[charCode % FALLBACK_EMOJIS.length];

  const visual: PhonicsCardVisual = baseVisual
    ? { ...baseVisual }
    : {
        emoji,
        labelZh: word,
        colorBg: "from-amber-50 to-orange-50",
        category: "magic",
      };

  // 检查是否在首批 28 张高精度 3D 闪卡插画映射中
  const flashcardUrl = PHASE1_FLASHCARDS_MAP[clean];
  if (flashcardUrl) {
    visual.imageUrl = flashcardUrl;
  }

  return visual;
}
