// 26 个英文字母自然拼读歌（A0 热身歌）时间戳与教学配置表
// 依据工单 alphabet-song-work-order-2026-11-20.md §二 教学定稿值（逐字照抄，严禁擅改）

export interface AlphabetSongLetterConfig {
  letter: string;           // 大写字母，如 "A"
  letterDisplay: string;    // 大小写形态，如 "Aa"
  nameIpa: string;          // 字母名 IPA，如 "/eɪ/"
  soundIpa: string;         // 字母音 IPA（美音，一律用 / /），如 "/æ/"
  anchorWord: string;       // 锚点词（全部来自 App 现行 39 音素锚定词表），如 "apple"
  lyric: string;            // 26 句歌词定稿，如 "A a apple, /æ/ /æ/ apple"
  startTime: number;        // 起始时间（秒）
  endTime: number;          // 结束时间（秒）
  encouragement?: string;   // 里程碑鼓励文案（每唱完 6 个字母提示一次）
}

export const ALPHABET_SONG_AUDIO_SRC = "/assets/phonics/alphabet-song-v1.mp3";
export const ALPHABET_SONG_TOTAL_DURATION = 53.44;

export const ALPHABET_SONG_CONFIG: AlphabetSongLetterConfig[] = [
  {
    letter: "A",
    letterDisplay: "Aa",
    nameIpa: "/eɪ/",
    soundIpa: "/æ/",
    anchorWord: "apple",
    lyric: "A a apple, /æ/ /æ/ apple",
    startTime: 0.00,
    endTime: 2.05,
  },
  {
    letter: "B",
    letterDisplay: "Bb",
    nameIpa: "/biː/",
    soundIpa: "/b/",
    anchorWord: "ball",
    lyric: "B b ball, /b/ /b/ ball",
    startTime: 2.05,
    endTime: 4.11,
  },
  {
    letter: "C",
    letterDisplay: "Cc",
    nameIpa: "/siː/",
    soundIpa: "/k/",
    anchorWord: "cat",
    lyric: "C c cat, /k/ /k/ cat",
    startTime: 4.11,
    endTime: 6.16,
  },
  {
    letter: "D",
    letterDisplay: "Dd",
    nameIpa: "/diː/",
    soundIpa: "/d/",
    anchorWord: "dog",
    lyric: "D d dog, /d/ /d/ dog",
    startTime: 6.16,
    endTime: 8.22,
  },
  {
    letter: "E",
    letterDisplay: "Ee",
    nameIpa: "/iː/",
    soundIpa: "/ɛ/",
    anchorWord: "egg",
    lyric: "E e egg, /ɛ/ /ɛ/ egg",
    startTime: 8.22,
    endTime: 10.27,
  },
  {
    letter: "F",
    letterDisplay: "Ff",
    nameIpa: "/ɛf/",
    soundIpa: "/f/",
    anchorWord: "fish",
    lyric: "F f fish, /f/ /f/ fish",
    startTime: 10.27,
    endTime: 12.33,
    encouragement: "已经唱完 6 个字母啦，继续加油！",
  },
  {
    letter: "G",
    letterDisplay: "Gg",
    nameIpa: "/dʒiː/",
    soundIpa: "/g/",
    anchorWord: "goat",
    lyric: "G g goat, /g/ /g/ goat",
    startTime: 12.33,
    endTime: 14.38,
  },
  {
    letter: "H",
    letterDisplay: "Hh",
    nameIpa: "/eɪtʃ/",
    soundIpa: "/h/",
    anchorWord: "hat",
    lyric: "H h hat, /h/ /h/ hat",
    startTime: 14.38,
    endTime: 16.44,
  },
  {
    letter: "I",
    letterDisplay: "Ii",
    nameIpa: "/aɪ/",
    soundIpa: "/ɪ/",
    anchorWord: "igloo",
    lyric: "I i igloo, /ɪ/ /ɪ/ igloo",
    startTime: 16.44,
    endTime: 18.49,
  },
  {
    letter: "J",
    letterDisplay: "Jj",
    nameIpa: "/dʒeɪ/",
    soundIpa: "/dʒ/",
    anchorWord: "juice",
    lyric: "J j juice, /dʒ/ /dʒ/ juice",
    startTime: 18.49,
    endTime: 20.55,
  },
  {
    letter: "K",
    letterDisplay: "Kk",
    nameIpa: "/keɪ/",
    soundIpa: "/k/",
    anchorWord: "cat",
    lyric: "K k cat, /k/ /k/ cat（和 C 同一个音）",
    startTime: 20.55,
    endTime: 22.60,
  },
  {
    letter: "L",
    letterDisplay: "Ll",
    nameIpa: "/ɛl/",
    soundIpa: "/l/",
    anchorWord: "lion",
    lyric: "L l lion, /l/ /l/ lion",
    startTime: 22.60,
    endTime: 24.66,
    encouragement: "已经掌握 12 个字母音了，差不多一半啦！",
  },
  {
    letter: "M",
    letterDisplay: "Mm",
    nameIpa: "/ɛm/",
    soundIpa: "/m/",
    anchorWord: "moon",
    lyric: "M m moon, /m/ /m/ moon",
    startTime: 24.66,
    endTime: 26.72,
  },
  {
    letter: "N",
    letterDisplay: "Nn",
    nameIpa: "/ɛn/",
    soundIpa: "/n/",
    anchorWord: "nose",
    lyric: "N n nose, /n/ /n/ nose",
    startTime: 26.72,
    endTime: 28.77,
  },
  {
    letter: "O",
    letterDisplay: "Oo",
    nameIpa: "/oʊ/",
    soundIpa: "/ɔ/",
    anchorWord: "orange",
    lyric: "O o orange, /ɔ/ /ɔ/ orange",
    startTime: 28.77,
    endTime: 30.83,
  },
  {
    letter: "P",
    letterDisplay: "Pp",
    nameIpa: "/piː/",
    soundIpa: "/p/",
    anchorWord: "pig",
    lyric: "P p pig, /p/ /p/ pig",
    startTime: 30.83,
    endTime: 32.88,
  },
  {
    letter: "Q",
    letterDisplay: "Qq",
    nameIpa: "/kjuː/",
    soundIpa: "/kw/",
    anchorWord: "queen",
    lyric: "Q q queen, qu qu queen（q 和 u 手拉手发 /kw/）",
    startTime: 32.88,
    endTime: 34.94,
  },
  {
    letter: "R",
    letterDisplay: "Rr",
    nameIpa: "/ɑːr/",
    soundIpa: "/r/",
    anchorWord: "rabbit",
    lyric: "R r rabbit, /r/ /r/ rabbit",
    startTime: 34.94,
    endTime: 36.99,
    encouragement: "太棒了！已经唱完 18 个字母音啦！",
  },
  {
    letter: "S",
    letterDisplay: "Ss",
    nameIpa: "/ɛs/",
    soundIpa: "/s/",
    anchorWord: "sun",
    lyric: "S s sun, /s/ /s/ sun",
    startTime: 36.99,
    endTime: 39.05,
  },
  {
    letter: "T",
    letterDisplay: "Tt",
    nameIpa: "/tiː/",
    soundIpa: "/t/",
    anchorWord: "tiger",
    lyric: "T t tiger, /t/ /t/ tiger",
    startTime: 39.05,
    endTime: 41.10,
  },
  {
    letter: "U",
    letterDisplay: "Uu",
    nameIpa: "/juː/",
    soundIpa: "/ʌ/",
    anchorWord: "umbrella",
    lyric: "U u umbrella, /ʌ/ /ʌ/ umbrella",
    startTime: 41.10,
    endTime: 43.16,
  },
  {
    letter: "V",
    letterDisplay: "Vv",
    nameIpa: "/viː/",
    soundIpa: "/v/",
    anchorWord: "van",
    lyric: "V v van, /v/ /v/ van",
    startTime: 43.16,
    endTime: 45.21,
  },
  {
    letter: "W",
    letterDisplay: "Ww",
    nameIpa: "/ˈdʌbəl.juː/",
    soundIpa: "/w/",
    anchorWord: "whale",
    lyric: "W w whale, /w/ /w/ whale",
    startTime: 45.21,
    endTime: 47.27,
  },
  {
    letter: "X",
    letterDisplay: "Xx",
    nameIpa: "/ɛks/",
    soundIpa: "/ks/",
    anchorWord: "box",
    lyric: "X x box, /k/ /s/ box（x 藏在 box 的尾巴上）",
    startTime: 47.27,
    endTime: 49.32,
    encouragement: "只剩最后两个字母啦，一鼓作气！",
  },
  {
    letter: "Y",
    letterDisplay: "Yy",
    nameIpa: "/waɪ/",
    soundIpa: "/j/",
    anchorWord: "yoyo",
    lyric: "Y y yoyo, /j/ /j/ yoyo",
    startTime: 49.32,
    endTime: 51.38,
  },
  {
    letter: "Z",
    letterDisplay: "Zz",
    nameIpa: "/ziː/",
    soundIpa: "/z/",
    anchorWord: "zebra",
    lyric: "Z z zebra, /z/ /z/ zebra",
    startTime: 51.38,
    endTime: 53.44,
  },
];

export const getLetterConfigByIndex = (index: number): AlphabetSongLetterConfig => {
  const safeIndex = Math.max(0, Math.min(ALPHABET_SONG_CONFIG.length - 1, index));
  return ALPHABET_SONG_CONFIG[safeIndex];
};

export const getLetterConfigByTime = (currentTime: number): { config: AlphabetSongLetterConfig; index: number } => {
  if (currentTime >= ALPHABET_SONG_TOTAL_DURATION) {
    const lastIndex = ALPHABET_SONG_CONFIG.length - 1;
    return { config: ALPHABET_SONG_CONFIG[lastIndex], index: lastIndex };
  }
  for (let i = 0; i < ALPHABET_SONG_CONFIG.length; i++) {
    const item = ALPHABET_SONG_CONFIG[i];
    if (currentTime >= item.startTime && currentTime < item.endTime) {
      return { config: item, index: i };
    }
  }
  return { config: ALPHABET_SONG_CONFIG[0], index: 0 };
};
