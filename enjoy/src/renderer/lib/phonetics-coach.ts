// 阳光桥少儿英语 · 具象发音纠偏与音标教练知识库
// 提供针对中国英语学习者常见发音痛点的逐音素剖析、口型指导以及真人高保真 TTS 示范

export interface PhonemeGuide {
  name: string;
  tip: string;
  mistake: string;
  mouthShape?: string;
}

export const PHONEME_COACHING_GUIDES: Record<string, PhonemeGuide> = {
  // 核心难点辅音
  "θ": {
    name: "咬舌清辅音 (如 think, three)",
    tip: "舌尖轻抵上下门牙之间，微露舌尖，轻柔送气，声带不振动。千万别读成了汉字'四' (/s/) 哦！",
    mistake: "最常见错误是用 /s/ 或 /f/ 代替咬舌音",
    mouthShape: "上下门牙微张，舌尖轻夹齿缝",
  },
  "ð": {
    name: "咬舌浊辅音 (如 this, that, mother)",
    tip: "舌尖轻触上下门牙缝隙，送气的同时用力振动声带。不要读成爆破音 /d/ (得) 或 /z/！",
    mistake: "常误读为 /d/ 或 /z/",
    mouthShape: "舌尖轻伸出上下门牙之间，喉部声带振动",
  },
  "æ": {
    name: "梅花大口音 (如 cat, apple, bad)",
    tip: "口型尽量张大，能竖着放进两根手指！嘴角向两侧像大笑一样咧开，舌尖抵下齿，发音短促饱满！",
    mistake: "口型不够大，容易发成小口的 /e/ 或 /ʌ/",
    mouthShape: "上下颌大开，嘴角后咧",
  },
  "r": {
    name: "卷舌辅音 (如 red, room, tree)",
    tip: "舌尖向上向后卷起，但绝对不能碰到口腔上腭！双唇稍向前突出收圆，滑出发音。",
    mistake: "舌尖接触牙龈导致发成汉语拼音 r，或与 /l/ 混淆",
    mouthShape: "双唇微突收圆，舌尖悬空上卷",
  },
  "ɹ": {
    name: "美式卷舌音 (如 car, morning)",
    tip: "舌根收紧，舌尖向上悬空微翘，声带振动发出浑厚饱满的卷舌音。",
    mistake: "卷舌不充分或舌面贴上腭",
    mouthShape: "唇部微拢，舌体后缩上悬",
  },
  "l": {
    name: "清晰/模糊舌侧音 (如 look, little, apple)",
    tip: "发词首 /l/ 时舌尖紧抵上齿龈；发词尾辅音 /l/ (如 little 结尾) 时保持舌尖贴紧上牙龈，声音从两腮流出，不要收口太快！",
    mistake: "词尾漏读或混淆为 /w/ 或 /r/",
    mouthShape: "舌尖紧紧贴住上牙门后牙龈",
  },
  "v": {
    name: "唇齿摩擦音 (如 very, love, seven)",
    tip: "上排门牙轻轻触碰下嘴唇内侧边缘，轻轻呼气并振动声带。不要用双唇像发 /w/ (乌) 那样读哦！",
    mistake: "常误用双唇读成 /w/",
    mouthShape: "上门牙轻咬下唇内侧",
  },
  "w": {
    name: "双唇圆唇音 (如 water, we, sweet)",
    tip: "双唇收成一个小圆孔并向前突出，声带振动，随后肌肉迅速放松滑向后面的元音。",
    mistake: "唇形不够圆或误咬嘴唇变成 /v/",
    mouthShape: "双唇极度收圆突出呈小圆孔",
  },
  "ʃ": {
    name: "嘘音 (如 she, ship, fish)",
    tip: "双唇向前噘起呈小圆弧，舌面前部抬起靠近硬腭，轻轻吐气产生连续平稳的摩擦嘘声。",
    mistake: "嘴角过平或气流过于干涩",
    mouthShape: "双唇噘起微圆，舌面抬起",
  },
  "tʃ": {
    name: "清破擦音 (如 chair, teacher)",
    tip: "舌尖抵住上牙龈后部阻断气流，然后瞬间爆破并带出摩擦嘘声，动作要干脆利落，声带不震动！",
    mistake: "爆破不够干脆或声带多余震动",
    mouthShape: "双唇突出，瞬间破裂出气",
  },
  "dʒ": {
    name: "浊破擦音 (如 jump, orange)",
    tip: "舌尖抵上门牙后方，瞬间破裂的同时用力振动声带，声音结实浑厚。",
    mistake: "声带未振动发成清破擦音",
    mouthShape: "双唇微张微圆，声带结实振动",
  },
  "ŋ": {
    name: "后鼻音 (如 morning, singing, ring)",
    tip: "舌根部向后向上抬起，紧贴软腭闭合，气流全部从鼻腔发出共鸣！千万别漏掉鼻音读成前鼻音 /n/。",
    mistake: "漏读后鼻音，读成普通前鼻音 /n/",
    mouthShape: "嘴巴微张，舌根完全闭住咽腔走鼻音",
  },

  // 核心元音对立与长短音
  "iː": {
    name: "长元音 (如 see, tree, sweet)",
    tip: "嘴角向两边像开怀微笑一样尽量拉开，声音清脆明亮并适当延长，注意与短元音 /ɪ/ 区分。",
    mistake: "时间过短导致与短元音混淆",
    mouthShape: "嘴角平拉微笑状",
  },
  "ɪ": {
    name: "短元音 (如 sit, little, big)",
    tip: "嘴角自然微开放松，舌尖轻抵下齿，发音短促利落，不要拉长！",
    mistake: "发音时间拖沓或口型太扁变成 /iː/",
    mouthShape: "嘴巴放松微开，舌前部稍抬",
  },
  "ʊ": {
    name: "短圆唇元音 (如 look, book, good)",
    tip: "双唇稍稍收圆向前突出，但肌肉保持自然放松，声音短促深沉，不要读成汉字'乌'的长音。",
    mistake: "嘴唇过紧或时间过长变成 /uː/",
    mouthShape: "唇形微圆稍向前，短促有力",
  },
  "uː": {
    name: "长圆唇元音 (如 blue, room, food)",
    tip: "双唇紧紧收紧向前突出成一个小孔，舌后部大幅抬起，声音悠长圆润。",
    mistake: "双唇不够圆、声音不够饱满",
    mouthShape: "双唇高度收圆突出小孔",
  },
  "ʌ": {
    name: "短元音 (如 cup, sun, love)",
    tip: "嘴巴半开，下巴稍向下沉，舌中部稍稍抬起，发出短促有力的中元音。",
    mistake: "嘴巴张太大变成 /ɑː/ 或太小变成 /ə/",
    mouthShape: "自然半开口，短促干脆",
  },
  "ɔː": {
    name: "长圆唇元音 (如 water, talk, bottle)",
    tip: "嘴巴尽量张大同时双唇用力收圆，舌后部微缩，发出深沉浑厚的长音。",
    mistake: "唇形不够圆，口型不够大",
    mouthShape: "双唇用力收圆向前，深沉长音",
  },
  "eɪ": {
    name: "双元音 (如 day, play, cake)",
    tip: "由 /e/ 迅速滑向 /ɪ/，口型从半开自然合拢变小，前面音长且响亮，后面短促收尾。",
    mistake: "口型固定不动，只发了单音",
    mouthShape: "由半开口型滑动至微合微笑状",
  },
  "aɪ": {
    name: "双元音 (如 my, nice, like)",
    tip: "由大口 /a/ 快速平滑地滑向 /ɪ/，滑动过程清晰，声音流畅饱满。",
    mistake: "起始口型不够大或结尾未收到位",
    mouthShape: "大开口滑向扁平小口",
  },
  "oʊ": {
    name: "双元音 (如 go, home, boat)",
    tip: "由半开的 /o/ 逐渐收圆滑向 /ʊ/，双唇越来越拢圆，充满弹性。",
    mistake: "嘴唇无滑动变化",
    mouthShape: "半开圆唇滑动到收紧小圆唇",
  },
};

// 常见少儿高频词标准音标与拼读结构字典
export const COMMON_WORD_PHONETICS: Record<
  string,
  {
    ipa: string;
    translation: string;
    phonemes: Array<{ phoneme: string; isKeyVowel?: boolean; isConsonant?: boolean }>;
    coachingHint?: string;
  }
> = {
  look: {
    ipa: "/lʊk/",
    translation: "看",
    phonemes: [{ phoneme: "l" }, { phoneme: "ʊ", isKeyVowel: true }, { phoneme: "k" }],
    coachingHint: "核心在短元音 /ʊ/，发音要短促放松，结尾 /k/ 轻轻爆破，不要拖出'库'的杂音。",
  },
  cat: {
    ipa: "/kæt/",
    translation: "小猫",
    phonemes: [{ phoneme: "k" }, { phoneme: "æ", isKeyVowel: true }, { phoneme: "t" }],
    coachingHint: "重点抓梅花大口音 /æ/！嘴巴张大两指，短促有力；词尾 /t/ 轻点齿龈即收。",
  },
  cute: {
    ipa: "/kjuːt/",
    translation: "可爱的",
    phonemes: [{ phoneme: "k" }, { phoneme: "j" }, { phoneme: "uː", isKeyVowel: true }, { phoneme: "t" }],
    coachingHint: "注意中间的双辅音过渡 /kj/ 紧接圆唇长元音 /uː/，口型要圆润饱满。",
  },
  little: {
    ipa: "/ˈlɪtl/",
    translation: "小巧的/小的",
    phonemes: [{ phoneme: "l" }, { phoneme: "ɪ", isKeyVowel: true }, { phoneme: "t" }, { phoneme: "l" }],
    coachingHint: "词尾是成音节 /tl/，舌尖抵住上牙龈不要松开，声音从两腮滑出，切忌读成'里头'。",
  },
  love: {
    ipa: "/lʌv/",
    translation: "喜爱",
    phonemes: [{ phoneme: "l" }, { phoneme: "ʌ", isKeyVowel: true }, { phoneme: "v" }],
    coachingHint: "尾音 /v/ 必须上门牙轻咬下嘴唇微震动，千万不要念成无摩擦的 /w/。",
  },
  sweet: {
    ipa: "/swiːt/",
    translation: "甜甜的",
    phonemes: [{ phoneme: "s" }, { phoneme: "w" }, { phoneme: "iː", isKeyVowel: true }, { phoneme: "t" }],
    coachingHint: "长元音 /iː/ 像微笑一样嘴角向两边拉开，声音清亮悠长。",
  },
  apple: {
    ipa: "/ˈæpl/",
    translation: "苹果",
    phonemes: [{ phoneme: "æ", isKeyVowel: true }, { phoneme: "p" }, { phoneme: "l" }],
    coachingHint: "起音 /æ/ 务必大开口咧嘴！结尾 /l/ 舌尖紧抵上牙龈，不要漏发后半截尾音。",
  },
  apples: {
    ipa: "/ˈæplz/",
    translation: "苹果(复数)",
    phonemes: [{ phoneme: "æ", isKeyVowel: true }, { phoneme: "p" }, { phoneme: "l" }, { phoneme: "z" }],
    coachingHint: "复数词尾发浊辅音 /z/，声带需要微微振动。",
  },
  banana: {
    ipa: "/bəˈnænə/",
    translation: "香蕉",
    phonemes: [
      { phoneme: "b" },
      { phoneme: "ə" },
      { phoneme: "n" },
      { phoneme: "æ", isKeyVowel: true },
      { phoneme: "n" },
      { phoneme: "ə" },
    ],
    coachingHint: "重音在第二个音节 /næ/！第一个音节 /bə/ 轻微弱读，第二音节大口梅花音 /æ/ 饱满有力。",
  },
  bananas: {
    ipa: "/bəˈnænəz/",
    translation: "香蕉(复数)",
    phonemes: [
      { phoneme: "b" },
      { phoneme: "ə" },
      { phoneme: "n" },
      { phoneme: "æ", isKeyVowel: true },
      { phoneme: "n" },
      { phoneme: "ə" },
      { phoneme: "z" },
    ],
    coachingHint: "重音在 /næ/，尾音带轻微振动的 /z/。",
  },
  good: {
    ipa: "/ɡʊd/",
    translation: "好",
    phonemes: [{ phoneme: "ɡ" }, { phoneme: "ʊ", isKeyVowel: true }, { phoneme: "d" }],
    coachingHint: "中间短元音 /ʊ/ 放松短促，不要念成中文'咕'的长音。",
  },
  morning: {
    ipa: "/ˈmɔːrnɪŋ/",
    translation: "早晨",
    phonemes: [
      { phoneme: "m" },
      { phoneme: "ɔː", isKeyVowel: true },
      { phoneme: "r" },
      { phoneme: "n" },
      { phoneme: "ɪ" },
      { phoneme: "ŋ" },
    ],
    coachingHint: "圆唇长元音 /ɔː/ 紧接轻卷舌 /r/，结尾是后鼻音 /ŋ/，一定要把鼻腔共鸣送足。",
  },
  this: {
    ipa: "/ðɪs/",
    translation: "这个",
    phonemes: [{ phoneme: "ð" }, { phoneme: "ɪ", isKeyVowel: true }, { phoneme: "s" }],
    coachingHint: "起手就是咬舌浊辅音 /ð/！舌尖必须轻触门牙并振动声带，千万别读成 /d/ (得)。",
  },
  that: {
    ipa: "/ðæt/",
    translation: "那个",
    phonemes: [{ phoneme: "ð" }, { phoneme: "æ", isKeyVowel: true }, { phoneme: "t" }],
    coachingHint: "咬舌音 /ð/ 配合大口梅花音 /æ/，是经典的难点双拼！舌尖先咬牙再迅速大开口。",
  },
  think: {
    ipa: "/θɪŋk/",
    translation: "思考/想",
    phonemes: [{ phoneme: "θ" }, { phoneme: "ɪ" }, { phoneme: "ŋ" }, { phoneme: "k" }],
    coachingHint: "清咬舌音 /θ/ 气流从齿缝呼出，接着后鼻音 /ŋk/，不要发成'sink'或者'fink'！",
  },
  sunny: {
    ipa: "/ˈsʌni/",
    translation: "阳光明媚的",
    phonemes: [{ phoneme: "s" }, { phoneme: "ʌ", isKeyVowel: true }, { phoneme: "n" }, { phoneme: "i" }],
    coachingHint: "首音节 /sʌ/ 短促清脆，口型半开，不要发成 /ɑː/ 的大口音。",
  },
  room: {
    ipa: "/ruːm/",
    translation: "房间",
    phonemes: [{ phoneme: "r" }, { phoneme: "uː", isKeyVowel: true }, { phoneme: "m" }],
    coachingHint: "卷舌起音 /r/ 双唇微突，中间是深度圆唇长音 /uː/，尾音闭唇收为 /m/。",
  },
  bottle: {
    ipa: "/ˈbɑːtl/",
    translation: "水杯/瓶子",
    phonemes: [{ phoneme: "b" }, { phoneme: "ɑː", isKeyVowel: true }, { phoneme: "t" }, { phoneme: "l" }],
    coachingHint: "美音中 /t/ 在两个元音之间会轻快化成闪音 (flap t)，舌尖轻弹齿龈，结尾 /l/ 保持舌位。",
  },
  blue: {
    ipa: "/bluː/",
    translation: "蓝色的",
    phonemes: [{ phoneme: "b" }, { phoneme: "l" }, { phoneme: "uː", isKeyVowel: true }],
    coachingHint: "双辅音连缀 /bl/ 要一气呵成，紧接着嘴唇用力收成小圆孔发长音 /uː/。",
  },
  monkey: {
    ipa: "/ˈmʌŋki/",
    translation: "猴子",
    phonemes: [{ phoneme: "m" }, { phoneme: "ʌ", isKeyVowel: true }, { phoneme: "ŋ" }, { phoneme: "k" }, { phoneme: "i" }],
    coachingHint: "注意中间的后鼻音 /ŋ/，气流从鼻腔走，然后轻巧爆破 /k/。",
  },
  tree: {
    ipa: "/triː/",
    translation: "树",
    phonemes: [{ phoneme: "t" }, { phoneme: "r" }, { phoneme: "iː", isKeyVowel: true }],
    coachingHint: "辅音连缀 /tr/ 舌尖悬空上卷轻爆破，后接长元音 /iː/，声音清亮悠长。",
  },
  together: {
    ipa: "/təˈɡeðər/",
    translation: "一起",
    phonemes: [
      { phoneme: "t" },
      { phoneme: "ə" },
      { phoneme: "ɡ" },
      { phoneme: "e" },
      { phoneme: "ð" },
      { phoneme: "ər", isKeyVowel: true },
    ],
    coachingHint: "第三音节是咬舌音 /ð/ 与卷舌 /ər/，轻咬舌尖声带振动，滑向卷舌尾音。",
  },
  water: {
    ipa: "/ˈwɔːtər/",
    translation: "水",
    phonemes: [{ phoneme: "w" }, { phoneme: "ɔː", isKeyVowel: true }, { phoneme: "t" }, { phoneme: "ər" }],
    coachingHint: "圆唇起音 /w/ 嘴唇收圆突出，中间长音 /ɔː/ 饱满，美音结尾带卷舌 /ər/。",
  },
  very: {
    ipa: "/ˈveri/",
    translation: "非常",
    phonemes: [{ phoneme: "v" }, { phoneme: "e", isKeyVowel: true }, { phoneme: "r" }, { phoneme: "i" }],
    coachingHint: "上门牙轻触下唇发 /v/，严禁读成双唇的 /w/！",
  },
};

// 获取某个音素的详细发音指导
export const getPhonemeCoach = (phoneme: string): PhonemeGuide => {
  const clean = phoneme.replace(/[\/\[\]ˈˌː]/g, "").trim();
  if (PHONEME_COACHING_GUIDES[phoneme]) return PHONEME_COACHING_GUIDES[phoneme];
  if (PHONEME_COACHING_GUIDES[clean]) return PHONEME_COACHING_GUIDES[clean];

  return {
    name: `音素 /${phoneme}/`,
    tip: "注意听敢敢老师的标准示范，保持发音器官放松，对齐唇形与舌位。",
    mistake: "发音不够饱满或时长控制不准",
  };
};

// 获取单词的音素拆解与释义
export const getWordPhonetics = (rawWord: string) => {
  const cleanWord = rawWord.toLowerCase().replace(/[^a-z]/g, "");
  if (COMMON_WORD_PHONETICS[cleanWord]) {
    return {
      word: cleanWord,
      ...COMMON_WORD_PHONETICS[cleanWord],
    };
  }

  // 默认拆解规则
  return {
    word: cleanWord,
    ipa: `/${cleanWord}/`,
    translation: "单词",
    phonemes: cleanWord.split("").map((c) => ({ phoneme: c })),
    coachingHint: "仔细听外教标准发音示范，注意多音节节奏与重音位置！",
  };
};

// 全局高保真 TTS 示范播放器 (首选云端微软 Edge Neural 高清女声，兜底 Web Speech API)
export const playStandardTts = (
  text: string,
  options?: {
    rate?: string;
    voice?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<void> => {
  return new Promise((resolve) => {
    const {
      rate = "-10%",
      voice = "en-US-AnaNeural",
      onStart,
      onEnd,
    } = options || {};

    onStart?.();

    const ttsUrl = `/api/ai/tts?text=${encodeURIComponent(
      text
    )}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`;
    const audio = new Audio(ttsUrl);

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      onEnd?.();
      resolve();
    };

    audio.onended = cleanup;
    audio.onerror = () => {
      // 降级使用 Web SpeechSynthesis
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = rate.includes("-") ? 0.78 : 0.9;
        const voices = window.speechSynthesis.getVoices();
        const v = voices.find(
          (vo) =>
            (vo.name.includes("Natural") ||
              vo.name.includes("Jenny") ||
              vo.name.includes("Ana") ||
              vo.name.includes("Samantha") ||
              vo.name.includes("Google")) &&
            vo.lang.startsWith("en")
        );
        if (v) u.voice = v;
        u.onend = cleanup;
        u.onerror = cleanup;
        window.speechSynthesis.speak(u);
      } else {
        cleanup();
      }
    };

    audio.play().catch(() => {
      audio.onerror(null as any);
    });
  });
};
