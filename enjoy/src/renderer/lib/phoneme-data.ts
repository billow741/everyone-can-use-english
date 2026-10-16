// 阳光桥少儿英语 · 39 国际音标全景数据库
// 包含 39 个核心音标元数据、分类群组、三步黄金口诀、例词库与最小对立体 (Minimal Pairs)

export type PhonemeGroupKey =
  | "all"
  | "monophthongs"
  | "diphthongs"
  | "plosives"
  | "fricatives"
  | "affricates"
  | "sonorants";

export interface PracticeWord {
  word: string;
  ipa: string;
  translation: string;
}

export interface MinimalPairItem {
  word1: string;
  ipa1: string;
  word2: string;
  ipa2: string;
}

export interface MinimalPairGroup {
  targetPhoneme: string;
  targetSymbol: string;
  pairTitle: string;
  pairs: MinimalPairItem[];
}

export interface PhonicsBlock {
  letters: string;
  phoneme: string;
  isTarget: boolean;
}

export interface PhonicsBenchmarkWord {
  word: string;
  ipa: string;
  translation: string;
  phonicsSpell: string;
  rule: string;
  blocks: PhonicsBlock[];
}

export interface PhonemeItem {
  order: number;
  id: string; // 核心音标键，如 'p', 'θ', 'iː'
  slug: string; // URL 友好标识，如 'p', 'th', 'i_long'
  symbol: string; // 呈现符号，如 '/p/', '/θ/'
  name: string; // 中文名称，如 '双唇清塞音'
  category: string; // 细分分类，如 '爆破音', '长元音'
  group: PhonemeGroupKey; // 大分类键
  groupName: string; // 大分类中文名
  voiced: boolean; // 是否声带振动 (浊音 vs 清音)
  sampleWord: string;
  phonicsSpell: string;
  wordIpa: string;
  chineseExplanation: string;
  englishExplanation: string;
  steps: [string, string, string]; // 三步通关黄金口诀
  tip: string;
  mistake: string;
  mouthShape: string;
  practiceWords: PracticeWord[];
  benchmarkWords: PhonicsBenchmarkWord[]; // 3个自然拼读代表词拆解
  minimalPair: MinimalPairGroup;
}

export const PHONEME_GROUPS: { key: PhonemeGroupKey; name: string; count: number; description: string }[] = [
  { key: "all", name: "全部音标", count: 39, description: "全景 39 个美式/国际标准核心音标" },
  { key: "monophthongs", name: "单元音", count: 11, description: "长元音、短元音、梅花音与中元音" },
  { key: "diphthongs", name: "双元音", count: 5, description: "由两个元音平滑滑动组成的双重音" },
  { key: "plosives", name: "爆破辅音", count: 6, description: "闭气聚力后瞬间喷薄爆发的清浊对音" },
  { key: "fricatives", name: "摩擦辅音", count: 8, description: "气流经狭窄唇齿缝隙摩擦发出的长流音" },
  { key: "affricates", name: "破擦辅音", count: 2, description: "先爆破后摩擦一气呵成的复合辅音" },
  { key: "sonorants", name: "鼻音·边音·半元音", count: 7, description: "共鸣充沛、如歌如流的响音与滑音" },
];

export const ALL_39_PHONEMES: PhonemeItem[] = [
  {
    "order": 1,
    "id": "iː",
    "slug": "i_long",
    "symbol": "/iː/",
    "name": "微笑长元音 (如 tree, see, bee)",
    "category": "长元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "tree",
    "phonicsSpell": "t-r-ee",
    "wordIpa": "/triː/",
    "chineseExplanation": "嘴角向左右平拉至最大限度（如微笑或喊'茄子'），舌前部极度贴近硬腭向上抬起，声音清亮饱满且拉长。",
    "englishExplanation": "The lips are spread horizontally in a wide smile. The front of the tongue is raised very high toward the hard palate without causing audible friction. The vocal cords vibrate.",
    "steps": [
      "嘴角像拍照喊'茄子'一样，向左右两侧彻底拉开",
      "舌面前半段尽量向上抬高接近上腭，但不要贴死",
      "声音清亮饱满并适当拉长，注意和短音 /ɪ/ 区分"
    ],
    "tip": "嘴角向两边像开怀微笑一样尽量拉开，声音清脆明亮并适当延长，注意与短元音 /ɪ/ 区分。",
    "mistake": "时间过短导致与短元音混淆",
    "mouthShape": "嘴角平拉微笑状",
    "practiceWords": [
      {
        "word": "tree",
        "ipa": "/triː/",
        "translation": "树木"
      },
      {
        "word": "see",
        "ipa": "/siː/",
        "translation": "看见"
      },
      {
        "word": "bee",
        "ipa": "/biː/",
        "translation": "蜜蜂"
      },
      {
        "word": "green",
        "ipa": "/ɡriːn/",
        "translation": "绿色"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ɪ",
      "targetSymbol": "/ɪ/",
      "pairTitle": "微笑长音 /iː/ vs 短元音 /ɪ/",
      "pairs": [
        {
          "word1": "sheep",
          "ipa1": "/ʃiːp/",
          "word2": "ship",
          "ipa2": "/ʃɪp/"
        },
        {
          "word1": "seat",
          "ipa1": "/siːt/",
          "word2": "sit",
          "ipa2": "/sɪt/"
        },
        {
          "word1": "beat",
          "ipa1": "/biːt/",
          "word2": "bit",
          "ipa2": "/bɪt/"
        },
        {
          "word1": "feet",
          "ipa1": "/fiːt/",
          "word2": "fit",
          "ipa2": "/fɪt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "tree",
        "ipa": "/triː/",
        "translation": "大树",
        "phonicsSpell": "t - r - ee",
        "rule": "字母组合 ee 稳定发饱满长元音 /iː/",
        "blocks": [
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "ee",
            "phoneme": "/iː/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "see",
        "ipa": "/siː/",
        "translation": "看见",
        "phonicsSpell": "s - ee",
        "rule": "嘴角两侧平拉至最大极限，如微笑喊'茄子'",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          },
          {
            "letters": "ee",
            "phoneme": "/iː/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "green",
        "ipa": "/ɡriːn/",
        "translation": "绿色",
        "phonicsSpell": "g - r - ee - n",
        "rule": "发音清亮持久，注意与短元音 /ɪ/ 区分",
        "blocks": [
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          },
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "ee",
            "phoneme": "/iː/",
            "isTarget": true
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 2,
    "id": "ɪ",
    "slug": "ih",
    "symbol": "/ɪ/",
    "name": "短前元音 (如 sit, little, big)",
    "category": "短元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "sit",
    "phonicsSpell": "s-i-t",
    "wordIpa": "/sɪt/",
    "chineseExplanation": "嘴唇自然微张半指宽，下颌与双唇完全放松，舌面前部稍微隆起，短促有力发声。",
    "englishExplanation": "The lips are slightly parted and relaxed. The tongue is positioned in the upper mid-front area. Crisp, short vowel.",
    "steps": [
      "嘴巴自然微张半指宽，下颌与嘴唇肌肉完全放松，不用使劲咧嘴",
      "舌尖轻抵下门牙背，舌面前部稍微隆起",
      "短促利落地发声，不要拖长尾音，介于汉语'一'和'哎'之间"
    ],
    "tip": "嘴角自然微开放松，舌尖轻抵下齿，发音短促利落，不要拉长！",
    "mistake": "发音时间拖沓或口型太扁变成 /iː/",
    "mouthShape": "嘴巴放松微开，舌前部稍抬",
    "practiceWords": [
      {
        "word": "sit",
        "ipa": "/sɪt/",
        "translation": "坐"
      },
      {
        "word": "big",
        "ipa": "/bɪɡ/",
        "translation": "大的"
      },
      {
        "word": "fish",
        "ipa": "/fɪʃ/",
        "translation": "鱼"
      },
      {
        "word": "pig",
        "ipa": "/pɪɡ/",
        "translation": "猪"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "iː",
      "targetSymbol": "/iː/",
      "pairTitle": "短元音 /ɪ/ vs 微笑长音 /iː/",
      "pairs": [
        {
          "word1": "ship",
          "ipa1": "/ʃɪp/",
          "word2": "sheep",
          "ipa2": "/ʃiːp/"
        },
        {
          "word1": "sit",
          "ipa1": "/sɪt/",
          "word2": "seat",
          "ipa2": "/siːt/"
        },
        {
          "word1": "bit",
          "ipa1": "/bɪt/",
          "word2": "beat",
          "ipa2": "/biːt/"
        },
        {
          "word1": "fit",
          "ipa1": "/fɪt/",
          "word2": "feet",
          "ipa2": "/fiːt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "sit",
        "ipa": "/sɪt/",
        "translation": "坐下",
        "phonicsSpell": "s - i - t",
        "rule": "闭音节中单字母 i 发短前元音 /ɪ/",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": true
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "big",
        "ipa": "/bɪɡ/",
        "translation": "巨大的",
        "phonicsSpell": "b - i - g",
        "rule": "嘴角自然放松，发音短促利落，绝不拖长",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": true
          },
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "fish",
        "ipa": "/fɪʃ/",
        "translation": "鱼",
        "phonicsSpell": "f - i - sh",
        "rule": "舌尖轻触下齿龈，介于汉语'一'与'哎'之间",
        "blocks": [
          {
            "letters": "f",
            "phoneme": "/f/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": true
          },
          {
            "letters": "sh",
            "phoneme": "/ʃ/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 3,
    "id": "ɛ",
    "slug": "eh",
    "symbol": "/ɛ/",
    "name": "前短元音 (如 bed, pen, red)",
    "category": "短元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "bed",
    "phonicsSpell": "b-e-d",
    "wordIpa": "/bed/",
    "chineseExplanation": "口腔上下开度约一指宽，嘴角向两侧自然平展，舌面前部稍微隆起，发出短促清脆的哎音。",
    "englishExplanation": "The mouth is open approximately one finger width with slightly spread lips. Crisp, energetic short front vowel.",
    "steps": [
      "口腔上下开度约一指宽，嘴角向两侧微微自然放松平展",
      "舌尖抵住下门牙背，舌面前部稍微隆起",
      "发出短促清脆的'哎'音，干脆有力"
    ],
    "tip": "上下牙距一指宽，嘴角自然微咧，舌尖抵下齿，发音短促清脆。",
    "mistake": "嘴巴张太大误读成梅花音 /æ/，或太小发成 /ɪ/",
    "mouthShape": "开口一指宽，嘴角微展",
    "practiceWords": [
      {
        "word": "bed",
        "ipa": "/bed/",
        "translation": "床"
      },
      {
        "word": "pen",
        "ipa": "/pen/",
        "translation": "钢笔"
      },
      {
        "word": "red",
        "ipa": "/red/",
        "translation": "红色"
      },
      {
        "word": "ten",
        "ipa": "/ten/",
        "translation": "十"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "æ",
      "targetSymbol": "/æ/",
      "pairTitle": "前短元音 /ɛ/ vs 梅花大口音 /æ/",
      "pairs": [
        {
          "word1": "bed",
          "ipa1": "/bed/",
          "word2": "bad",
          "ipa2": "/bæd/"
        },
        {
          "word1": "men",
          "ipa1": "/men/",
          "word2": "man",
          "ipa2": "/mæn/"
        },
        {
          "word1": "pen",
          "ipa1": "/pen/",
          "word2": "pan",
          "ipa2": "/pæn/"
        },
        {
          "word1": "set",
          "ipa1": "/set/",
          "word2": "sat",
          "ipa2": "/sæt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "bed",
        "ipa": "/bed/",
        "translation": "床铺",
        "phonicsSpell": "b - e - d",
        "rule": "闭音节中单字母 e 发前短元音 /ɛ/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": true
          },
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "pen",
        "ipa": "/pen/",
        "translation": "钢笔",
        "phonicsSpell": "p - e - n",
        "rule": "上下唇微开约一指宽，短促清脆",
        "blocks": [
          {
            "letters": "p",
            "phoneme": "/p/",
            "isTarget": false
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": true
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "red",
        "ipa": "/red/",
        "translation": "红色",
        "phonicsSpell": "r - e - d",
        "rule": "舌前部轻微隆起，避免开口过大变成梅花音",
        "blocks": [
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": true
          },
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 4,
    "id": "æ",
    "slug": "ae",
    "symbol": "/æ/",
    "name": "梅花大口音 (如 apple, cat, bad)",
    "category": "梅花音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "apple",
    "phonicsSpell": "a-p-p-l-e",
    "wordIpa": "/ˈæpl/",
    "chineseExplanation": "口型纵向大开两指宽，嘴角向两侧平拉，舌前部低平下沉，舌尖抵住下门牙根部，发音干脆有爆发力。",
    "englishExplanation": "The mouth opens wide (two-finger width). The lips are neutral to slightly spread. The front of the tongue is low and flat with the tip touching the bottom teeth.",
    "steps": [
      "嘴巴张大到极致！能垂直塞进食指与中指两根手指的宽度",
      "嘴角像哈哈大笑一样使劲往两边拉开",
      "舌尖平贴抵住下牙齿根部，发音饱满清脆响亮"
    ],
    "tip": "口型尽量张大，能竖着放进两根手指！嘴角向两侧像大笑一样咧开，舌尖抵下齿，发音短促饱满！",
    "mistake": "口型不够大，容易发成小口的 /e/ 或 /ʌ/",
    "mouthShape": "上下颌大开，嘴角后咧",
    "practiceWords": [
      {
        "word": "apple",
        "ipa": "/ˈæpl/",
        "translation": "苹果"
      },
      {
        "word": "cat",
        "ipa": "/kæt/",
        "translation": "猫"
      },
      {
        "word": "bad",
        "ipa": "/bæd/",
        "translation": "坏的"
      },
      {
        "word": "hat",
        "ipa": "/hæt/",
        "translation": "帽子"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ɛ",
      "targetSymbol": "/ɛ/",
      "pairTitle": "梅花大口音 /æ/ vs 前短元音 /ɛ/",
      "pairs": [
        {
          "word1": "bad",
          "ipa1": "/bæd/",
          "word2": "bed",
          "ipa2": "/bed/"
        },
        {
          "word1": "man",
          "ipa1": "/mæn/",
          "word2": "men",
          "ipa2": "/men/"
        },
        {
          "word1": "pan",
          "ipa1": "/pæn/",
          "word2": "pen",
          "ipa2": "/pen/"
        },
        {
          "word1": "sat",
          "ipa1": "/sæt/",
          "word2": "set",
          "ipa2": "/set/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "apple",
        "ipa": "/ˈæpl/",
        "translation": "苹果",
        "phonicsSpell": "a - pp - le",
        "rule": "闭音节中单字母 a 发经典梅花大口音 /æ/",
        "blocks": [
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": true
          },
          {
            "letters": "pp",
            "phoneme": "/p/",
            "isTarget": false
          },
          {
            "letters": "le",
            "phoneme": "/l/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "cat",
        "ipa": "/kæt/",
        "translation": "猫咪",
        "phonicsSpell": "c - a - t",
        "rule": "下巴大张两指宽，嘴角同时向两侧尽力张开",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": true
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "hat",
        "ipa": "/hæt/",
        "translation": "帽子",
        "phonicsSpell": "h - a - t",
        "rule": "舌面压平，声音饱满夸张，如同医生检查喉咙",
        "blocks": [
          {
            "letters": "h",
            "phoneme": "/h/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": true
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 5,
    "id": "ɑ",
    "slug": "ah",
    "symbol": "/ɑ/",
    "name": "后开长元音 (如 hot, father, car)",
    "category": "长元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "hot",
    "phonicsSpell": "h-o-t",
    "wordIpa": "/hɑːt/",
    "chineseExplanation": "下巴自然下沉大张，舌身平平沉在口腔底部，舌根微缩，声音从喉咙深处通透发出。",
    "englishExplanation": "The jaw drops low to open the mouth wide. The tongue rests flat at the bottom with slight back retraction.",
    "steps": [
      "像去看牙医检查喉咙喊'啊'一样，下巴自然下沉，嘴巴大张",
      "舌身平平地沉在口腔底部，舌根微微后缩",
      "声音从喉咙深处发出，浑厚圆润而通透"
    ],
    "tip": "下巴尽量下沉大开口，舌头平放，声音从喉咙深处自然呼出。",
    "mistake": "嘴张得太小或误读成圆唇音 /ɔː/",
    "mouthShape": "下巴大张，舌身平沉",
    "practiceWords": [
      {
        "word": "hot",
        "ipa": "/hɑːt/",
        "translation": "热的"
      },
      {
        "word": "father",
        "ipa": "/ˈfɑːðər/",
        "translation": "父亲"
      },
      {
        "word": "car",
        "ipa": "/kɑːr/",
        "translation": "汽车"
      },
      {
        "word": "star",
        "ipa": "/stɑːr/",
        "translation": "星星"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ʌ",
      "targetSymbol": "/ʌ/",
      "pairTitle": "后开长音 /ɑ/ vs 短中元音 /ʌ/",
      "pairs": [
        {
          "word1": "hot",
          "ipa1": "/hɑːt/",
          "word2": "hut",
          "ipa2": "/hʌt/"
        },
        {
          "word1": "not",
          "ipa1": "/nɑːt/",
          "word2": "nut",
          "ipa2": "/nʌt/"
        },
        {
          "word1": "body",
          "ipa1": "/ˈbɑːdi/",
          "word2": "buddy",
          "ipa2": "/ˈbʌdi/"
        },
        {
          "word1": "lock",
          "ipa1": "/lɑːk/",
          "word2": "luck",
          "ipa2": "/lʌk/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "hot",
        "ipa": "/hɑːt/",
        "translation": "热的",
        "phonicsSpell": "h - o - t",
        "rule": "美音中字母 o 在很多开音节发后开长音 /ɑː/",
        "blocks": [
          {
            "letters": "h",
            "phoneme": "/h/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/ɑː/",
            "isTarget": true
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "father",
        "ipa": "/ˈfɑːðər/",
        "translation": "父亲",
        "phonicsSpell": "f - a - th - er",
        "rule": "下巴彻底放松下沉，舌身平放于口腔底部",
        "blocks": [
          {
            "letters": "f",
            "phoneme": "/f/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ɑː/",
            "isTarget": true
          },
          {
            "letters": "th",
            "phoneme": "/ð/",
            "isTarget": false
          },
          {
            "letters": "er",
            "phoneme": "/ər/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "car",
        "ipa": "/kɑːr/",
        "translation": "汽车",
        "phonicsSpell": "c - ar",
        "rule": "字母组合 ar 发深沉宏亮的长元音加卷舌",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "ar",
            "phoneme": "/ɑːr/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 6,
    "id": "ɔ",
    "slug": "aw",
    "symbol": "/ɔ/",
    "name": "圆唇中后长元音 (如 water, talk, dog)",
    "category": "长元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "water",
    "phonicsSpell": "w-a-t-e-r",
    "wordIpa": "/ˈwɔːtər/",
    "chineseExplanation": "嘴巴张大呈立椭圆形，双唇明显收拢向前撅圆，舌后部向软腭抬起，声音深沉浑厚。",
    "englishExplanation": "The lips are rounded and protruded into an oval shape. The back of the tongue elevates towards the velum.",
    "steps": [
      "嘴巴张大呈立椭圆形，双唇明显收拢向前撅圆",
      "舌头后部向软腭抬起，舌尖离开下齿",
      "声音深沉浑厚，像喊'嗷'一样充满共鸣"
    ],
    "tip": "嘴巴尽量张大同时双唇用力收圆，舌后部微缩，发出深沉浑厚的长音。",
    "mistake": "唇形不够圆，口型不够大",
    "mouthShape": "双唇用力收圆向前，深沉长音",
    "practiceWords": [
      {
        "word": "water",
        "ipa": "/ˈwɔːtər/",
        "translation": "水"
      },
      {
        "word": "dog",
        "ipa": "/dɔːɡ/",
        "translation": "狗"
      },
      {
        "word": "talk",
        "ipa": "/tɔːk/",
        "translation": "说话"
      },
      {
        "word": "door",
        "ipa": "/dɔːr/",
        "translation": "门"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "oʊ",
      "targetSymbol": "/oʊ/",
      "pairTitle": "长圆唇 /ɔ/ vs 双元音 /oʊ/",
      "pairs": [
        {
          "word1": "saw",
          "ipa1": "/sɔː/",
          "word2": "so",
          "ipa2": "/soʊ/"
        },
        {
          "word1": "law",
          "ipa1": "/lɔː/",
          "word2": "low",
          "ipa2": "/loʊ/"
        },
        {
          "word1": "call",
          "ipa1": "/kɔːl/",
          "word2": "coal",
          "ipa2": "/koʊl/"
        },
        {
          "word1": "bought",
          "ipa1": "/bɔːt/",
          "word2": "boat",
          "ipa2": "/boʊt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "water",
        "ipa": "/ˈwɔːtər/",
        "translation": "水",
        "phonicsSpell": "w - a - t - er",
        "rule": "字母 a 在 w 之后常发长圆唇元音 /ɔː/",
        "blocks": [
          {
            "letters": "w",
            "phoneme": "/w/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ɔː/",
            "isTarget": true
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "er",
            "phoneme": "/ər/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "dog",
        "ipa": "/dɔːɡ/",
        "translation": "狗狗",
        "phonicsSpell": "d - o - g",
        "rule": "双唇用力向前拢圆，发出浑厚深沉的后长音",
        "blocks": [
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/ɔː/",
            "isTarget": true
          },
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "door",
        "ipa": "/dɔːr/",
        "translation": "大门",
        "phonicsSpell": "d - oor",
        "rule": "字母组合 oor 发饱满圆唇音 /ɔːr/",
        "blocks": [
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          },
          {
            "letters": "oor",
            "phoneme": "/ɔːr/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 7,
    "id": "ʊ",
    "slug": "uh",
    "symbol": "/ʊ/",
    "name": "短圆唇后元音 (如 book, look, good)",
    "category": "短元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "book",
    "phonicsSpell": "b-oo-k",
    "wordIpa": "/bʊk/",
    "chineseExplanation": "双唇微收成小圆形并微微向前突出，肌肉自然放松，舌后部向上抬起，声音短促深沉。",
    "englishExplanation": "The lips are loosely rounded and slightly protruded. The back of the tongue rises towards the velum.",
    "steps": [
      "双唇微收成小圆形并微微向前突出，但肌肉保持自然放松",
      "舌后部向上抬起，舌尖自然缩回",
      "声音短促深沉，像被击中肚子轻哼一声，绝不要拖成长音'乌'"
    ],
    "tip": "双唇稍稍收圆向前突出，但肌肉保持自然放松，声音短促深沉，不要读成汉字'乌'的长音。",
    "mistake": "嘴唇过紧或时间过长变成 /uː/",
    "mouthShape": "唇形微圆稍向前，短促有力",
    "practiceWords": [
      {
        "word": "book",
        "ipa": "/bʊk/",
        "translation": "书"
      },
      {
        "word": "look",
        "ipa": "/lʊk/",
        "translation": "看"
      },
      {
        "word": "good",
        "ipa": "/ɡʊd/",
        "translation": "好的"
      },
      {
        "word": "foot",
        "ipa": "/fʊt/",
        "translation": "脚"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "uː",
      "targetSymbol": "/uː/",
      "pairTitle": "短圆唇 /ʊ/ vs 长圆唇 /uː/",
      "pairs": [
        {
          "word1": "look",
          "ipa1": "/lʊk/",
          "word2": "Luke",
          "ipa2": "/luːk/"
        },
        {
          "word1": "foot",
          "ipa1": "/fʊt/",
          "word2": "food",
          "ipa2": "/fuːd/"
        },
        {
          "word1": "pull",
          "ipa1": "/pʊl/",
          "word2": "pool",
          "ipa2": "/puːl/"
        },
        {
          "word1": "full",
          "ipa1": "/fʊl/",
          "word2": "fool",
          "ipa2": "/fuːl/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "book",
        "ipa": "/bʊk/",
        "translation": "书本",
        "phonicsSpell": "b - oo - k",
        "rule": "字母组合 oo 在 k 前常发短圆唇音 /ʊ/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "oo",
            "phoneme": "/ʊ/",
            "isTarget": true
          },
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "look",
        "ipa": "/lʊk/",
        "translation": "注视",
        "phonicsSpell": "l - oo - k",
        "rule": "双唇微收圆自然放松，短促有力收尾",
        "blocks": [
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": false
          },
          {
            "letters": "oo",
            "phoneme": "/ʊ/",
            "isTarget": true
          },
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "good",
        "ipa": "/ɡʊd/",
        "translation": "好极了",
        "phonicsSpell": "g - oo - d",
        "rule": "介于汉语'乌'与'欧'之间，切忌过长",
        "blocks": [
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          },
          {
            "letters": "oo",
            "phoneme": "/ʊ/",
            "isTarget": true
          },
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 8,
    "id": "uː",
    "slug": "u_long",
    "symbol": "/uː/",
    "name": "长圆唇后元音 (如 blue, room, moon)",
    "category": "长元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "moon",
    "phonicsSpell": "m-oo-n",
    "wordIpa": "/muːn/",
    "chineseExplanation": "嘴唇极度收圆突出成一个小孔，像吹蜡烛一样，舌后根大幅度高高抬起贴近软腭，声音悠长圆润。",
    "englishExplanation": "The lips are tightly rounded and pursed into a tiny opening. The back of the tongue rises high towards the velum.",
    "steps": [
      "嘴唇极度收圆突出成一个小孔，像要亲吻或吹蜡烛一样",
      "舌后根大幅度高高抬起贴近软腭",
      "发出悠长、圆润且明亮的长音，声带持续振动"
    ],
    "tip": "双唇紧紧收紧向前突出成一个小孔，舌后部大幅抬起，声音悠长圆润。",
    "mistake": "双唇不够圆、声音不够饱满",
    "mouthShape": "双唇高度收圆突出小孔",
    "practiceWords": [
      {
        "word": "moon",
        "ipa": "/muːn/",
        "translation": "月亮"
      },
      {
        "word": "blue",
        "ipa": "/bluː/",
        "translation": "蓝色"
      },
      {
        "word": "room",
        "ipa": "/ruːm/",
        "translation": "房间"
      },
      {
        "word": "food",
        "ipa": "/fuːd/",
        "translation": "食物"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ʊ",
      "targetSymbol": "/ʊ/",
      "pairTitle": "长圆唇 /uː/ vs 短圆唇 /ʊ/",
      "pairs": [
        {
          "word1": "pool",
          "ipa1": "/puːl/",
          "word2": "pull",
          "ipa2": "/pʊl/"
        },
        {
          "word1": "food",
          "ipa1": "/fuːd/",
          "word2": "foot",
          "ipa2": "/fʊt/"
        },
        {
          "word1": "fool",
          "ipa1": "/fuːl/",
          "word2": "full",
          "ipa2": "/fʊl/"
        },
        {
          "word1": "suit",
          "ipa1": "/suːt/",
          "word2": "soot",
          "ipa2": "/sʊt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "moon",
        "ipa": "/muːn/",
        "translation": "月亮",
        "phonicsSpell": "m - oo - n",
        "rule": "字母组合 oo 发长圆唇元音 /uː/",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          },
          {
            "letters": "oo",
            "phoneme": "/uː/",
            "isTarget": true
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "blue",
        "ipa": "/bluː/",
        "translation": "蓝色",
        "phonicsSpell": "bl - ue",
        "rule": "字母组合 ue 发长圆唇音 /uː/",
        "blocks": [
          {
            "letters": "bl",
            "phoneme": "/bl/",
            "isTarget": false
          },
          {
            "letters": "ue",
            "phoneme": "/uː/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "room",
        "ipa": "/ruːm/",
        "translation": "房间",
        "phonicsSpell": "r - oo - m",
        "rule": "双唇收至最小圆孔并用力突出，声音持久清亮",
        "blocks": [
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "oo",
            "phoneme": "/uː/",
            "isTarget": true
          },
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 9,
    "id": "ʌ",
    "slug": "wedge",
    "symbol": "/ʌ/",
    "name": "中短元音 (如 cup, sun, love)",
    "category": "短元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "cup",
    "phonicsSpell": "c-u-p",
    "wordIpa": "/kʌp/",
    "chineseExplanation": "嘴巴半开，下巴稍向下沉，舌身居中平放微缩，从胸膛深处快速爆发出短促干脆的声响。",
    "englishExplanation": "The jaw lowers comfortably with lips unrounded. A short, energetic central vowel resonating from the chest.",
    "steps": [
      "嘴巴半开，下巴稍向下沉，嘴唇肌肉完全不紧绷",
      "舌身居中平放，舌尖离开下齿微后缩",
      "从胸膛快速爆发出短促干脆的声响，利落有力"
    ],
    "tip": "嘴巴半开，下巴稍向下沉，舌中部稍稍抬起，发出短促有力的中元音。",
    "mistake": "嘴巴张太大变成 /ɑː/ 或太小变成 /ə/",
    "mouthShape": "自然半开口，短促干脆",
    "practiceWords": [
      {
        "word": "cup",
        "ipa": "/kʌp/",
        "translation": "茶杯"
      },
      {
        "word": "sun",
        "ipa": "/sʌn/",
        "translation": "太阳"
      },
      {
        "word": "love",
        "ipa": "/lʌv/",
        "translation": "爱"
      },
      {
        "word": "duck",
        "ipa": "/dʌk/",
        "translation": "鸭子"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "æ",
      "targetSymbol": "/æ/",
      "pairTitle": "短中元音 /ʌ/ vs 梅花大口音 /æ/",
      "pairs": [
        {
          "word1": "cup",
          "ipa1": "/kʌp/",
          "word2": "cap",
          "ipa2": "/kæp/"
        },
        {
          "word1": "sun",
          "ipa1": "/sʌn/",
          "word2": "san",
          "ipa2": "/sæn/"
        },
        {
          "word1": "cut",
          "ipa1": "/kʌt/",
          "word2": "cat",
          "ipa2": "/kæt/"
        },
        {
          "word1": "hut",
          "ipa1": "/hʌt/",
          "word2": "hat",
          "ipa2": "/hæt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "cup",
        "ipa": "/kʌp/",
        "translation": "茶杯",
        "phonicsSpell": "c - u - p",
        "rule": "单字母 u 在闭音节中发中短元音 /ʌ/",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": true
          },
          {
            "letters": "p",
            "phoneme": "/p/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "sun",
        "ipa": "/sʌn/",
        "translation": "太阳",
        "phonicsSpell": "s - u - n",
        "rule": "下巴中度下沉约一指半，声音干脆从喉间爆发",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": true
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "duck",
        "ipa": "/dʌk/",
        "translation": "鸭子",
        "phonicsSpell": "d - u - ck",
        "rule": "舌中部微抬，双唇放松不撅圆",
        "blocks": [
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": true
          },
          {
            "letters": "ck",
            "phoneme": "/k/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 10,
    "id": "ɜ",
    "slug": "er",
    "symbol": "/ɜ/",
    "name": "卷舌/中长元音 (如 bird, girl, nurse)",
    "category": "长元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "bird",
    "phonicsSpell": "b-i-r-d",
    "wordIpa": "/bɜːrd/",
    "chineseExplanation": "嘴唇微开保持中性，舌身中部平抬，舌尖向上后方微微卷起悬空，声带发出浑厚饱满的长音。",
    "englishExplanation": "The lips are neutral and relaxed. The center of the tongue rises mid-high, producing a deep, sustained central vowel.",
    "steps": [
      "嘴唇微开保持中性，舌身中部平抬，舌尖向上后方微微卷起悬空",
      "保持舌体肌肉收紧，声带发出浑厚饱满的长音",
      "声音像汽车低速巡航的马达声，饱满持久"
    ],
    "tip": "舌身微抬、舌尖悬空微卷，保持舌根收紧，发出浑厚持久的卷舌长音。",
    "mistake": "舌尖碰到硬腭或口型过扁",
    "mouthShape": "双唇中性微张，舌身悬空卷起",
    "practiceWords": [
      {
        "word": "bird",
        "ipa": "/bɜːrd/",
        "translation": "小鸟"
      },
      {
        "word": "girl",
        "ipa": "/ɡɜːrl/",
        "translation": "女孩"
      },
      {
        "word": "nurse",
        "ipa": "/nɜːrs/",
        "translation": "护士"
      },
      {
        "word": "shirt",
        "ipa": "/ʃɜːrt/",
        "translation": "衬衫"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ə",
      "targetSymbol": "/ə/",
      "pairTitle": "卷舌重读长音 /ɜ/ vs 弱读施瓦音 /ə/",
      "pairs": [
        {
          "word1": "bird",
          "ipa1": "/bɜːrd/",
          "word2": "board",
          "ipa2": "/bɔːrd/"
        },
        {
          "word1": "turn",
          "ipa1": "/tɜːrn/",
          "word2": "tin",
          "ipa2": "/tɪn/"
        },
        {
          "word1": "curtain",
          "ipa1": "/ˈkɜːrtn/",
          "word2": "cotton",
          "ipa2": "/ˈkɑːtn/"
        },
        {
          "word1": "hurt",
          "ipa1": "/hɜːrt/",
          "word2": "heart",
          "ipa2": "/hɑːrt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "bird",
        "ipa": "/bɜːrd/",
        "translation": "小鸟",
        "phonicsSpell": "b - ir - d",
        "rule": "字母组合 ir 在重读音节中发长卷舌元音 /ɜːr/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "ir",
            "phoneme": "/ɜːr/",
            "isTarget": true
          },
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "girl",
        "ipa": "/ɡɜːrl/",
        "translation": "女孩",
        "phonicsSpell": "g - ir - l",
        "rule": "舌身微抬、舌尖悬空上卷，保持舌根收紧振颤",
        "blocks": [
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          },
          {
            "letters": "ir",
            "phoneme": "/ɜːr/",
            "isTarget": true
          },
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "nurse",
        "ipa": "/nɜːrs/",
        "translation": "护士",
        "phonicsSpell": "n - ur - se",
        "rule": "字母组合 ur 对应浑厚持久的卷舌长音",
        "blocks": [
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "ur",
            "phoneme": "/ɜːr/",
            "isTarget": true
          },
          {
            "letters": "se",
            "phoneme": "/s/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 11,
    "id": "ə",
    "slug": "schwa",
    "symbol": "/ə/",
    "name": "中央弱元音/施瓦音 (如 ago, banana, sofa)",
    "category": "弱元音",
    "group": "monophthongs",
    "groupName": "单元音",
    "voiced": true,
    "sampleWord": "ago",
    "phonicsSpell": "a-g-o",
    "wordIpa": "/əˈɡoʊ/",
    "chineseExplanation": "全身上下发音器官进入彻底放松状态，嘴唇微张，舌位居中平放，极度轻短一晃而过。",
    "englishExplanation": "The schwa is the most relaxed English vowel. Lips and tongue rest in neutral position with minimal muscular effort.",
    "steps": [
      "全身上下发音器官进入'彻底放松'状态，嘴唇自然微张",
      "舌头平放在嘴里什么动作都不用做",
      "极度轻短、一晃而过地发出微弱的声音，英语中最省力的音！"
    ],
    "tip": "全口腔肌肉完全放松，极其轻弱、短促地一晃而过，不要加重音！",
    "mistake": "用力过猛或误读成汉语重音拼音 a/e",
    "mouthShape": "嘴唇自然微启，完全松弛",
    "practiceWords": [
      {
        "word": "ago",
        "ipa": "/əˈɡoʊ/",
        "translation": "以前"
      },
      {
        "word": "banana",
        "ipa": "/bəˈnænə/",
        "translation": "香蕉"
      },
      {
        "word": "sofa",
        "ipa": "/ˈsoʊfə/",
        "translation": "沙发"
      },
      {
        "word": "water",
        "ipa": "/ˈwɔːtər/",
        "translation": "水"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ʌ",
      "targetSymbol": "/ʌ/",
      "pairTitle": "弱读中央音 /ə/ vs 重读中元音 /ʌ/",
      "pairs": [
        {
          "word1": "sofa",
          "ipa1": "/ˈsoʊfə/",
          "word2": "sun",
          "ipa2": "/sʌn/"
        },
        {
          "word1": "ago",
          "ipa1": "/əˈɡoʊ/",
          "word2": "up",
          "ipa2": "/ʌp/"
        },
        {
          "word1": "banana",
          "ipa1": "/bəˈnænə/",
          "word2": "bun",
          "ipa2": "/bʌn/"
        },
        {
          "word1": "lemon",
          "ipa1": "/ˈlemən/",
          "word2": "ton",
          "ipa2": "/tʌn/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "ago",
        "ipa": "/əˈɡoʊ/",
        "translation": "以前",
        "phonicsSpell": "a - g - o",
        "rule": "非重读音节中单字母 a 弱读为施瓦音 /ə/",
        "blocks": [
          {
            "letters": "a",
            "phoneme": "/ə/",
            "isTarget": true
          },
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/oʊ/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "banana",
        "ipa": "/bəˈnænə/",
        "translation": "香蕉",
        "phonicsSpell": "b - a - n - a - n - a",
        "rule": "首尾 a 均处非重读音节，极度轻柔放松",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ə/",
            "isTarget": true
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ə/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "sofa",
        "ipa": "/ˈsoʊfə/",
        "translation": "沙发",
        "phonicsSpell": "s - o - f - a",
        "rule": "词尾字母 a 弱化为最短促的中央元音",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/oʊ/",
            "isTarget": false
          },
          {
            "letters": "f",
            "phoneme": "/f/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ə/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 12,
    "id": "eɪ",
    "slug": "ey",
    "symbol": "/eɪ/",
    "name": "前合双元音 (如 day, play, cake)",
    "category": "双元音",
    "group": "diphthongs",
    "groupName": "双元音",
    "voiced": true,
    "sampleWord": "day",
    "phonicsSpell": "d-a-y",
    "wordIpa": "/deɪ/",
    "chineseExplanation": "由半开口的 /e/ 迅速滑向扁唇 /ɪ/，口型从半开自然合拢变扁，前面音长响亮，后面短促收尾。",
    "englishExplanation": "Closing diphthong gliding smoothly from mid-front /e/ towards near-close /ɪ/. Lips spread as jaw closes.",
    "steps": [
      "先发出半开唇的前音 /e/，声音响亮清晰",
      "嘴角迅速向两侧平拉滑向 /ɪ/，口型逐渐变扁合拢",
      "前长后短，滑动过程如丝般顺滑自然"
    ],
    "tip": "由 /e/ 迅速滑向 /ɪ/，口型从半开自然合拢变小，前面音长且响亮，后面短促收尾。",
    "mistake": "口型固定不动，只发了单音",
    "mouthShape": "由半开口型滑动至微合微笑状",
    "practiceWords": [
      {
        "word": "day",
        "ipa": "/deɪ/",
        "translation": "日子"
      },
      {
        "word": "play",
        "ipa": "/pleɪ/",
        "translation": "玩耍"
      },
      {
        "word": "cake",
        "ipa": "/keɪk/",
        "translation": "蛋糕"
      },
      {
        "word": "name",
        "ipa": "/neɪm/",
        "translation": "名字"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ɛ",
      "targetSymbol": "/ɛ/",
      "pairTitle": "前合双元音 /eɪ/ vs 短单元音 /ɛ/",
      "pairs": [
        {
          "word1": "bake",
          "ipa1": "/beɪk/",
          "word2": "beck",
          "ipa2": "/bek/"
        },
        {
          "word1": "late",
          "ipa1": "/leɪt/",
          "word2": "let",
          "ipa2": "/let/"
        },
        {
          "word1": "taste",
          "ipa1": "/teɪst/",
          "word2": "test",
          "ipa2": "/test/"
        },
        {
          "word1": "wait",
          "ipa1": "/weɪt/",
          "word2": "wet",
          "ipa2": "/wet/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "day",
        "ipa": "/deɪ/",
        "translation": "日子",
        "phonicsSpell": "d - ay",
        "rule": "字母组合 ay 在词尾发合口双元音 /eɪ/",
        "blocks": [
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          },
          {
            "letters": "ay",
            "phoneme": "/eɪ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "play",
        "ipa": "/pleɪ/",
        "translation": "玩耍",
        "phonicsSpell": "pl - ay",
        "rule": "由半开元音 /e/ 顺滑滑动到前高元音 /ɪ/",
        "blocks": [
          {
            "letters": "pl",
            "phoneme": "/pl/",
            "isTarget": false
          },
          {
            "letters": "ay",
            "phoneme": "/eɪ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "cake",
        "ipa": "/keɪk/",
        "translation": "蛋糕",
        "phonicsSpell": "c - a - ke",
        "rule": "相对开音节 a_e 结构发字母本音 /eɪ/",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "a_e",
            "phoneme": "/eɪ/",
            "isTarget": true
          },
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 13,
    "id": "aɪ",
    "slug": "ay",
    "symbol": "/aɪ/",
    "name": "开双元音 (如 my, nice, like)",
    "category": "双元音",
    "group": "diphthongs",
    "groupName": "双元音",
    "voiced": true,
    "sampleWord": "nice",
    "phonicsSpell": "n-i-c-e",
    "wordIpa": "/naɪs/",
    "chineseExplanation": "从大口 /a/ 充分张开起始，随后下颌顺畅合拢滑向扁唇 /ɪ/，口型由大变小，声音前长后短。",
    "englishExplanation": "A wide diphthong gliding from open front /a/ towards near-close /ɪ/. Jaw moves upward as glide finishes.",
    "steps": [
      "嘴巴从大口 /a/ 充分张开起始，声音饱满响亮",
      "随后下颌合拢，嘴角顺畅滑向 /ɪ/",
      "口型由大变小，声音由强渐弱，如波浪般顺畅起伏"
    ],
    "tip": "由大口 /a/ 快速平滑地滑向 /ɪ/，滑动过程清晰，声音流畅饱满。",
    "mistake": "起始口型不够大或结尾未收到位",
    "mouthShape": "大开口滑向扁平小口",
    "practiceWords": [
      {
        "word": "nice",
        "ipa": "/naɪs/",
        "translation": "美好的"
      },
      {
        "word": "my",
        "ipa": "/maɪ/",
        "translation": "我的"
      },
      {
        "word": "like",
        "ipa": "/laɪk/",
        "translation": "喜欢"
      },
      {
        "word": "kite",
        "ipa": "/kaɪt/",
        "translation": "风筝"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ɪ",
      "targetSymbol": "/ɪ/",
      "pairTitle": "开双元音 /aɪ/ vs 短单元音 /ɪ/",
      "pairs": [
        {
          "word1": "night",
          "ipa1": "/naɪt/",
          "word2": "knit",
          "ipa2": "/nɪt/"
        },
        {
          "word1": "bite",
          "ipa1": "/baɪt/",
          "word2": "bit",
          "ipa2": "/bɪt/"
        },
        {
          "word1": "write",
          "ipa1": "/raɪt/",
          "word2": "wrist",
          "ipa2": "/rɪst/"
        },
        {
          "word1": "ride",
          "ipa1": "/raɪd/",
          "word2": "rid",
          "ipa2": "/rɪd/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "nice",
        "ipa": "/naɪs/",
        "translation": "美好的",
        "phonicsSpell": "n - i - ce",
        "rule": "开音节中 i_e 结构发开双元音 /aɪ/",
        "blocks": [
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "i_e",
            "phoneme": "/aɪ/",
            "isTarget": true
          },
          {
            "letters": "ce",
            "phoneme": "/s/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "kite",
        "ipa": "/kaɪt/",
        "translation": "风筝",
        "phonicsSpell": "k - i - te",
        "rule": "大开口由后开元音 /a/ 快速滑向微展音 /ɪ/",
        "blocks": [
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "i_e",
            "phoneme": "/aɪ/",
            "isTarget": true
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "my",
        "ipa": "/maɪ/",
        "translation": "我的",
        "phonicsSpell": "m - y",
        "rule": "单音节词尾字母 y 发双元音 /aɪ/",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          },
          {
            "letters": "y",
            "phoneme": "/aɪ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 14,
    "id": "oʊ",
    "slug": "ow",
    "symbol": "/oʊ/",
    "name": "后合双元音 (如 go, home, boat)",
    "category": "双元音",
    "group": "diphthongs",
    "groupName": "双元音",
    "voiced": true,
    "sampleWord": "home",
    "phonicsSpell": "h-o-m-e",
    "wordIpa": "/hoʊm/",
    "chineseExplanation": "由半开的圆唇起始，随后嘴唇迅速向前收拢撅圆，缩成一个小圆孔，充满圆润弹性。",
    "englishExplanation": "Diphthong beginning with mid-back rounded /o/ and gliding towards near-close back /ʊ/.",
    "steps": [
      "嘴巴先中等半开，舌身居中",
      "嘴唇迅速向前收拢撅圆，像吹口哨一样缩成紧致的小圆孔",
      "声音圆润饱满，双唇弹性十足"
    ],
    "tip": "由半开的 /o/ 逐渐收圆滑向 /ʊ/，双唇越来越拢圆，充满弹性。",
    "mistake": "嘴唇无滑动变化",
    "mouthShape": "半开圆唇滑动到收紧小圆唇",
    "practiceWords": [
      {
        "word": "home",
        "ipa": "/hoʊm/",
        "translation": "家"
      },
      {
        "word": "go",
        "ipa": "/ɡoʊ/",
        "translation": "走"
      },
      {
        "word": "boat",
        "ipa": "/boʊt/",
        "translation": "小船"
      },
      {
        "word": "nose",
        "ipa": "/noʊz/",
        "translation": "鼻子"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ɔ",
      "targetSymbol": "/ɔ/",
      "pairTitle": "后合双元音 /oʊ/ vs 长圆唇音 /ɔ/",
      "pairs": [
        {
          "word1": "boat",
          "ipa1": "/boʊt/",
          "word2": "bought",
          "ipa2": "/bɔːt/"
        },
        {
          "word1": "coat",
          "ipa1": "/koʊt/",
          "word2": "cot",
          "ipa2": "/kɑːt/"
        },
        {
          "word1": "low",
          "ipa1": "/loʊ/",
          "word2": "law",
          "ipa2": "/lɔː/"
        },
        {
          "word1": "so",
          "ipa1": "/soʊ/",
          "word2": "saw",
          "ipa2": "/sɔː/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "home",
        "ipa": "/hoʊm/",
        "translation": "家",
        "phonicsSpell": "h - o - me",
        "rule": "开音节 o_e 结构发后合双元音 /oʊ/",
        "blocks": [
          {
            "letters": "h",
            "phoneme": "/h/",
            "isTarget": false
          },
          {
            "letters": "o_e",
            "phoneme": "/oʊ/",
            "isTarget": true
          },
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "go",
        "ipa": "/ɡoʊ/",
        "translation": "出发",
        "phonicsSpell": "g - o",
        "rule": "单字母 o 在绝对开音节词尾发 /oʊ/",
        "blocks": [
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/oʊ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "boat",
        "ipa": "/boʊt/",
        "translation": "小船",
        "phonicsSpell": "b - oa - t",
        "rule": "字母组合 oa 稳定发后合双元音 /oʊ/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "oa",
            "phoneme": "/oʊ/",
            "isTarget": true
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 15,
    "id": "ɔɪ",
    "slug": "oy",
    "symbol": "/ɔɪ/",
    "name": "圆展双元音 (如 boy, toy, voice)",
    "category": "双元音",
    "group": "diphthongs",
    "groupName": "双元音",
    "voiced": true,
    "sampleWord": "boy",
    "phonicsSpell": "b-o-y",
    "wordIpa": "/bɔɪ/",
    "chineseExplanation": "起始双唇向前撅成小圆弧发 /ɔ/，随即嘴角向两旁迅速拉平展开滑向 /ɪ/，口型由圆变扁。",
    "englishExplanation": "Wide diphthong gliding from open-mid back rounded /ɔ/ to near-close front unrounded /ɪ/.",
    "steps": [
      "双唇先撅成圆圆的喇叭形发 /ɔ/",
      "随即嘴角向两旁迅速拉平展开，滑向 /ɪ/",
      "感受从'圆嘟嘟'到'扁扁笑脸'的明显口型滑动变化"
    ],
    "tip": "由圆圆的 /ɔ/ 迅速拉平嘴角滑向 /ɪ/，口型由圆变扁，对比鲜明。",
    "mistake": "结尾口型没有拉开，声音含混",
    "mouthShape": "圆圆喇叭嘴滑向展唇笑脸",
    "practiceWords": [
      {
        "word": "boy",
        "ipa": "/bɔɪ/",
        "translation": "男孩"
      },
      {
        "word": "toy",
        "ipa": "/tɔɪ/",
        "translation": "玩具"
      },
      {
        "word": "voice",
        "ipa": "/vɔɪs/",
        "translation": "声音"
      },
      {
        "word": "coin",
        "ipa": "/kɔɪn/",
        "translation": "硬币"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ɔ",
      "targetSymbol": "/ɔ/",
      "pairTitle": "圆展双元音 /ɔɪ/ vs 单元音 /ɔ/",
      "pairs": [
        {
          "word1": "boy",
          "ipa1": "/bɔɪ/",
          "word2": "ball",
          "ipa2": "/bɔːl/"
        },
        {
          "word1": "toy",
          "ipa1": "/tɔɪ/",
          "word2": "tall",
          "ipa2": "/tɔːl/"
        },
        {
          "word1": "coin",
          "ipa1": "/kɔɪn/",
          "word2": "corn",
          "ipa2": "/kɔːrn/"
        },
        {
          "word1": "voice",
          "ipa1": "/vɔɪs/",
          "word2": "vase",
          "ipa2": "/veɪs/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "boy",
        "ipa": "/bɔɪ/",
        "translation": "男孩",
        "phonicsSpell": "b - oy",
        "rule": "字母组合 oy 在词尾发圆展双元音 /ɔɪ/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "oy",
            "phoneme": "/ɔɪ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "toy",
        "ipa": "/tɔɪ/",
        "translation": "玩具",
        "phonicsSpell": "t - oy",
        "rule": "嘴唇由极度收圆向前，顺畅滑动至平展微咧",
        "blocks": [
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "oy",
            "phoneme": "/ɔɪ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "coin",
        "ipa": "/kɔɪn/",
        "translation": "硬币",
        "phonicsSpell": "c - oi - n",
        "rule": "字母组合 oi 在词中发双元音 /ɔɪ/",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "oi",
            "phoneme": "/ɔɪ/",
            "isTarget": true
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 16,
    "id": "aʊ",
    "slug": "aw_dip",
    "symbol": "/aʊ/",
    "name": "合双元音 (如 cow, house, now)",
    "category": "双元音",
    "group": "diphthongs",
    "groupName": "双元音",
    "voiced": true,
    "sampleWord": "cow",
    "phonicsSpell": "c-o-w",
    "wordIpa": "/kaʊ/",
    "chineseExplanation": "从大口 /a/ 充分张开起始，随后嘴唇迅速向前收拢撅圆滑向 /ʊ/，口型由极大变为极小。",
    "englishExplanation": "Diphthong gliding from open front /a/ towards near-close rounded /ʊ/. Pronounced rounding movement.",
    "steps": [
      "嘴巴先像喊'啊'一样充分大张，下巴下拉",
      "紧接着嘴唇迅速向前撅圆收小，滑向 /ʊ/",
      "像不小心被针扎了一下喊出'嗷'的声音，动作夸张连贯"
    ],
    "tip": "从大口 /a/ 迅速滑向小圆唇 /ʊ/，口型由极大变为极圆极小，弹性饱满。",
    "mistake": "嘴唇未收圆，滑音不充分",
    "mouthShape": "大开口滑向收紧圆唇",
    "practiceWords": [
      {
        "word": "cow",
        "ipa": "/kaʊ/",
        "translation": "奶牛"
      },
      {
        "word": "house",
        "ipa": "/haʊs/",
        "translation": "房屋"
      },
      {
        "word": "now",
        "ipa": "/naʊ/",
        "translation": "现在"
      },
      {
        "word": "mouse",
        "ipa": "/maʊs/",
        "translation": "老鼠"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "oʊ",
      "targetSymbol": "/oʊ/",
      "pairTitle": "合双元音 /aʊ/ vs 双元音 /oʊ/",
      "pairs": [
        {
          "word1": "how",
          "ipa1": "/haʊ/",
          "word2": "hoe",
          "ipa2": "/hoʊ/"
        },
        {
          "word1": "loud",
          "ipa1": "/laʊd/",
          "word2": "load",
          "ipa2": "/loʊd/"
        },
        {
          "word1": "town",
          "ipa1": "/taʊn/",
          "word2": "tone",
          "ipa2": "/toʊn/"
        },
        {
          "word1": "now",
          "ipa1": "/naʊ/",
          "word2": "no",
          "ipa2": "/noʊ/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "cow",
        "ipa": "/kaʊ/",
        "translation": "奶牛",
        "phonicsSpell": "c - ow",
        "rule": "字母组合 ow 在词尾发合口双元音 /aʊ/",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "ow",
            "phoneme": "/aʊ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "house",
        "ipa": "/haʊs/",
        "translation": "房屋",
        "phonicsSpell": "h - ou - se",
        "rule": "字母组合 ou 在词中发合口双元音 /aʊ/",
        "blocks": [
          {
            "letters": "h",
            "phoneme": "/h/",
            "isTarget": false
          },
          {
            "letters": "ou",
            "phoneme": "/aʊ/",
            "isTarget": true
          },
          {
            "letters": "se",
            "phoneme": "/s/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "now",
        "ipa": "/naʊ/",
        "translation": "现在",
        "phonicsSpell": "n - ow",
        "rule": "由大开后音 /a/ 快速收小撅圆滑向 /ʊ/",
        "blocks": [
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "ow",
            "phoneme": "/aʊ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 17,
    "id": "p",
    "slug": "p",
    "symbol": "/p/",
    "name": "双唇清塞音 (如 pen, apple, cup)",
    "category": "爆破音",
    "group": "plosives",
    "groupName": "爆破辅音",
    "voiced": false,
    "sampleWord": "pen",
    "phonicsSpell": "p-e-n",
    "wordIpa": "/pen/",
    "chineseExplanation": "上下双唇紧紧闭合阻断口腔气流，积蓄力量后瞬间向外喷开爆破，声带完全不振动，嘴前有强劲冲气感。",
    "englishExplanation": "The lips form a complete airtight closure, then release suddenly with a crisp, voiceless burst of air.",
    "steps": [
      "上下嘴唇紧紧闭合，把气流紧紧憋在嘴里",
      "双唇瞬间有力地向外弹开，气流像放小爆竹一样清脆喷出",
      "摸摸脖子声带完全安静不振动，手心在嘴前能感到强烈的冷气流"
    ],
    "tip": "双唇紧闭阻断气流，瞬间喷薄而出，声带完全不振动，手心有强冷气流。",
    "mistake": "声带误振动读成浊音 /b/，或爆破无力漏发",
    "mouthShape": "双唇紧闭后瞬弹开",
    "practiceWords": [
      {
        "word": "pen",
        "ipa": "/pen/",
        "translation": "钢笔"
      },
      {
        "word": "apple",
        "ipa": "/ˈæpl/",
        "translation": "苹果"
      },
      {
        "word": "cup",
        "ipa": "/kʌp/",
        "translation": "茶杯"
      },
      {
        "word": "pig",
        "ipa": "/pɪɡ/",
        "translation": "小猪"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "b",
      "targetSymbol": "/b/",
      "pairTitle": "清辅音 /p/ vs 浊辅音 /b/",
      "pairs": [
        {
          "word1": "pen",
          "ipa1": "/pen/",
          "word2": "Ben",
          "ipa2": "/ben/"
        },
        {
          "word1": "pat",
          "ipa1": "/pæt/",
          "word2": "bat",
          "ipa2": "/bæt/"
        },
        {
          "word1": "pig",
          "ipa1": "/pɪɡ/",
          "word2": "big",
          "ipa2": "/bɪɡ/"
        },
        {
          "word1": "cap",
          "ipa1": "/kæp/",
          "word2": "cab",
          "ipa2": "/kæb/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "pen",
        "ipa": "/pen/",
        "translation": "钢笔",
        "phonicsSpell": "p - e - n",
        "rule": "辅音字母 p 在词首发清双唇塞音 /p/",
        "blocks": [
          {
            "letters": "p",
            "phoneme": "/p/",
            "isTarget": true
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "apple",
        "ipa": "/ˈæpl/",
        "translation": "苹果",
        "phonicsSpell": "a - pp - le",
        "rule": "双写字母 pp 发单个清塞音 /p/",
        "blocks": [
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "pp",
            "phoneme": "/p/",
            "isTarget": true
          },
          {
            "letters": "le",
            "phoneme": "/l/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "cup",
        "ipa": "/kʌp/",
        "translation": "茶杯",
        "phonicsSpell": "c - u - p",
        "rule": "辅音字母 p 在词尾爆破停顿，发轻音 /p/",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "p",
            "phoneme": "/p/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 18,
    "id": "b",
    "slug": "b",
    "symbol": "/b/",
    "name": "双唇浊塞音 (如 book, big, baby)",
    "category": "爆破音",
    "group": "plosives",
    "groupName": "爆破辅音",
    "voiced": true,
    "sampleWord": "book",
    "phonicsSpell": "b-oo-k",
    "wordIpa": "/bʊk/",
    "chineseExplanation": "双唇紧闭阻断气流，双唇弹开破裂的瞬间声带强力振动发声，发出干脆有力的浊爆破音。",
    "englishExplanation": "The lips seal completely then release abruptly with simultaneous vocal cord vibration.",
    "steps": [
      "上下嘴唇紧闭，准备阻断口腔气流",
      "双唇弹开破裂的瞬间，声带同步用力发声爆破",
      "摸摸脖子感受明显的小蜜蜂嗡嗡振颤，发音利落果断"
    ],
    "tip": "双唇紧闭阻断气流，弹开瞬间声带用力振动，不要拖长尾音。",
    "mistake": "声带未振动发成清辅音 /p/，或误加尾音'波'",
    "mouthShape": "双唇闭合瞬间弹开，声带振动",
    "practiceWords": [
      {
        "word": "book",
        "ipa": "/bʊk/",
        "translation": "书本"
      },
      {
        "word": "baby",
        "ipa": "/ˈbeɪbi/",
        "translation": "婴儿"
      },
      {
        "word": "big",
        "ipa": "/bɪɡ/",
        "translation": "大的"
      },
      {
        "word": "boy",
        "ipa": "/bɔɪ/",
        "translation": "男孩"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "p",
      "targetSymbol": "/p/",
      "pairTitle": "浊辅音 /b/ vs 清辅音 /p/",
      "pairs": [
        {
          "word1": "bat",
          "ipa1": "/bæt/",
          "word2": "pat",
          "ipa2": "/pæt/"
        },
        {
          "word1": "big",
          "ipa1": "/bɪɡ/",
          "word2": "pig",
          "ipa2": "/pɪɡ/"
        },
        {
          "word1": "cab",
          "ipa1": "/kæb/",
          "word2": "cap",
          "ipa2": "/kæp/"
        },
        {
          "word1": "bear",
          "ipa1": "/ber/",
          "word2": "pear",
          "ipa2": "/per/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "book",
        "ipa": "/bʊk/",
        "translation": "书本",
        "phonicsSpell": "b - oo - k",
        "rule": "辅音字母 b 在词首发浊双唇塞音 /b/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": true
          },
          {
            "letters": "oo",
            "phoneme": "/ʊ/",
            "isTarget": false
          },
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "baby",
        "ipa": "/ˈbeɪbi/",
        "translation": "婴儿",
        "phonicsSpell": "b - a - b - y",
        "rule": "字母 b 双重出现，声带均需强劲振动",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": true
          },
          {
            "letters": "a",
            "phoneme": "/eɪ/",
            "isTarget": false
          },
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": true
          },
          {
            "letters": "y",
            "phoneme": "/i/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "tub",
        "ipa": "/tʌb/",
        "translation": "浴缸",
        "phonicsSpell": "t - u - b",
        "rule": "字母 b 在词尾发微弱但清晰的浊塞音 /b/",
        "blocks": [
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 19,
    "id": "t",
    "slug": "t",
    "symbol": "/t/",
    "name": "齿龈清塞音 (如 tea, ten, cat)",
    "category": "爆破音",
    "group": "plosives",
    "groupName": "爆破辅音",
    "voiced": false,
    "sampleWord": "tea",
    "phonicsSpell": "t-e-a",
    "wordIpa": "/tiː/",
    "chineseExplanation": "舌尖紧贴上门牙后齿龈阻断气流，随后舌尖迅速向下弹开，强气流清脆爆破，声带不振动。",
    "englishExplanation": "The tongue tip forms a tight seal against the alveolar ridge, then releases abruptly with a crisp puff of air.",
    "steps": [
      "舌尖紧紧贴在上门牙后面的硬齿龈天花板上封住气流",
      "舌尖迅速向下弹开，憋住的气流像清脆鼓槌一样爆破喷出",
      "声带保持安静不振动，发音利落果断不拖尾巴"
    ],
    "tip": "舌尖紧抵上牙龈，瞬间弹开爆破，清脆短促不振声带。",
    "mistake": "舌尖接触牙齿面发成齿音，或拖长带出杂音",
    "mouthShape": "舌尖抵上齿龈后弹开",
    "practiceWords": [
      {
        "word": "tea",
        "ipa": "/tiː/",
        "translation": "茶"
      },
      {
        "word": "ten",
        "ipa": "/ten/",
        "translation": "十"
      },
      {
        "word": "cat",
        "ipa": "/kæt/",
        "translation": "猫"
      },
      {
        "word": "water",
        "ipa": "/ˈwɔːtər/",
        "translation": "水"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "d",
      "targetSymbol": "/d/",
      "pairTitle": "清辅音 /t/ vs 浊辅音 /d/",
      "pairs": [
        {
          "word1": "ten",
          "ipa1": "/ten/",
          "word2": "den",
          "ipa2": "/den/"
        },
        {
          "word1": "tie",
          "ipa1": "/taɪ/",
          "word2": "die",
          "ipa2": "/daɪ/"
        },
        {
          "word1": "cat",
          "ipa1": "/kæt/",
          "word2": "cad",
          "ipa2": "/kæd/"
        },
        {
          "word1": "tear",
          "ipa1": "/ter/",
          "word2": "dear",
          "ipa2": "/dɪr/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "tea",
        "ipa": "/tiː/",
        "translation": "茶",
        "phonicsSpell": "t - ea",
        "rule": "辅音字母 t 在词首发清齿龈爆破音 /t/",
        "blocks": [
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": true
          },
          {
            "letters": "ea",
            "phoneme": "/iː/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "water",
        "ipa": "/ˈwɔːtər/",
        "translation": "水",
        "phonicsSpell": "w - a - t - er",
        "rule": "美音中字母 t 在两元音之间可闪音为轻弹音",
        "blocks": [
          {
            "letters": "w",
            "phoneme": "/w/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ɔː/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": true
          },
          {
            "letters": "er",
            "phoneme": "/ər/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "cat",
        "ipa": "/kæt/",
        "translation": "猫",
        "phonicsSpell": "c - a - t",
        "rule": "词尾字母 t 舌尖抵上齿龈干脆停顿",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 20,
    "id": "d",
    "slug": "d",
    "symbol": "/d/",
    "name": "齿龈浊塞音 (如 dog, duck, door)",
    "category": "爆破音",
    "group": "plosives",
    "groupName": "爆破辅音",
    "voiced": true,
    "sampleWord": "dog",
    "phonicsSpell": "d-o-g",
    "wordIpa": "/dɔːɡ/",
    "chineseExplanation": "舌尖紧抵上门牙后方齿龈阻断气流，弹开瞬间声带用力振动，发出有力饱满的浊爆破音。",
    "englishExplanation": "The tongue tip seals the alveolar ridge, releasing with immediate vocal cord vibration.",
    "steps": [
      "舌尖紧抵上门牙后方的硬齿龈天花板阻断气流",
      "舌尖弹开的瞬间，声带立刻大声振动发出浊音",
      "摸脖子感受扎实的麻麻振颤感，不要读成汉字'得'"
    ],
    "tip": "舌尖紧贴上齿龈，弹开瞬间声带强劲振动，清脆利落。",
    "mistake": "拖长尾巴读成汉语'得'，或词尾漏发",
    "mouthShape": "舌尖贴齿龈弹开，声带振动",
    "practiceWords": [
      {
        "word": "dog",
        "ipa": "/dɔːɡ/",
        "translation": "狗"
      },
      {
        "word": "duck",
        "ipa": "/dʌk/",
        "translation": "鸭子"
      },
      {
        "word": "door",
        "ipa": "/dɔːr/",
        "translation": "门"
      },
      {
        "word": "bed",
        "ipa": "/bed/",
        "translation": "床"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "t",
      "targetSymbol": "/t/",
      "pairTitle": "浊辅音 /d/ vs 清辅音 /t/",
      "pairs": [
        {
          "word1": "den",
          "ipa1": "/den/",
          "word2": "ten",
          "ipa2": "/ten/"
        },
        {
          "word1": "door",
          "ipa1": "/dɔːr/",
          "word2": "tore",
          "ipa2": "/tɔːr/"
        },
        {
          "word1": "bad",
          "ipa1": "/bæd/",
          "word2": "bat",
          "ipa2": "/bæt/"
        },
        {
          "word1": "die",
          "ipa1": "/daɪ/",
          "word2": "tie",
          "ipa2": "/taɪ/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "dog",
        "ipa": "/dɔːɡ/",
        "translation": "狗",
        "phonicsSpell": "d - o - g",
        "rule": "辅音字母 d 在词首发浊齿龈爆破音 /d/",
        "blocks": [
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": true
          },
          {
            "letters": "o",
            "phoneme": "/ɔː/",
            "isTarget": false
          },
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "duck",
        "ipa": "/dʌk/",
        "translation": "鸭子",
        "phonicsSpell": "d - u - ck",
        "rule": "首音字母 d 舌尖贴齿龈弹开，声带振动",
        "blocks": [
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": true
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "ck",
            "phoneme": "/k/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "bed",
        "ipa": "/bed/",
        "translation": "床",
        "phonicsSpell": "b - e - d",
        "rule": "词尾字母 d 声带短促振动，利落收尾",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": false
          },
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 21,
    "id": "k",
    "slug": "k",
    "symbol": "/k/",
    "name": "软腭清塞音 (如 cat, kite, cup)",
    "category": "爆破音",
    "group": "plosives",
    "groupName": "爆破辅音",
    "voiced": false,
    "sampleWord": "cat",
    "phonicsSpell": "c-a-t",
    "wordIpa": "/kæt/",
    "chineseExplanation": "舌后根高高抬起紧贴软腭天花板阻挡气流，随后瞬间向下弹离软腭，猛烈爆破出气，声带不振动。",
    "englishExplanation": "The back of the tongue presses firmly against the velum, then releases with a sharp audible burst.",
    "steps": [
      "嘴巴微张，舌根高高抬起紧贴软腭天花板堵住出气口",
      "舌根瞬间向下弹离软腭，积聚气流猛烈喷出",
      "声带完全安静不振动，手心在嘴前感受到明显的冲气"
    ],
    "tip": "舌根抬高顶软腭，瞬间爆破送气，喉部声带不振动。",
    "mistake": "声带误振发成 /g/，或爆破气流太弱",
    "mouthShape": "舌根高抬紧顶软腭",
    "practiceWords": [
      {
        "word": "cat",
        "ipa": "/kæt/",
        "translation": "猫"
      },
      {
        "word": "kite",
        "ipa": "/kaɪt/",
        "translation": "风筝"
      },
      {
        "word": "milk",
        "ipa": "/mɪlk/",
        "translation": "牛奶"
      },
      {
        "word": "cake",
        "ipa": "/keɪk/",
        "translation": "蛋糕"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "g",
      "targetSymbol": "/ɡ/",
      "pairTitle": "清辅音 /k/ vs 浊辅音 /ɡ/",
      "pairs": [
        {
          "word1": "coat",
          "ipa1": "/koʊt/",
          "word2": "goat",
          "ipa2": "/ɡoʊt/"
        },
        {
          "word1": "cold",
          "ipa1": "/koʊld/",
          "word2": "gold",
          "ipa2": "/ɡoʊld/"
        },
        {
          "word1": "back",
          "ipa1": "/bæk/",
          "word2": "bag",
          "ipa2": "/bæɡ/"
        },
        {
          "word1": "lock",
          "ipa1": "/lɑːk/",
          "word2": "log",
          "ipa2": "/lɔːɡ/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "cat",
        "ipa": "/kæt/",
        "translation": "猫咪",
        "phonicsSpell": "c - a - t",
        "rule": "字母 c 在 a, o, u 前发硬音 /k/",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": true
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "kite",
        "ipa": "/kaɪt/",
        "translation": "风筝",
        "phonicsSpell": "k - i - te",
        "rule": "字母 k 在元音前直接对应清塞音 /k/",
        "blocks": [
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": true
          },
          {
            "letters": "i_e",
            "phoneme": "/aɪ/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "milk",
        "ipa": "/mɪlk/",
        "translation": "牛奶",
        "phonicsSpell": "m - i - l - k",
        "rule": "字母 k 在词尾舌根顶软腭送气爆破",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": false
          },
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 22,
    "id": "g",
    "slug": "g",
    "symbol": "/g/",
    "name": "软腭浊塞音 (如 go, girl, big)",
    "category": "爆破音",
    "group": "plosives",
    "groupName": "爆破辅音",
    "voiced": true,
    "sampleWord": "go",
    "phonicsSpell": "g-o",
    "wordIpa": "/ɡoʊ/",
    "chineseExplanation": "舌后根高高抬起抵住软腭，弹开的瞬间声带强力振动发声，发出低沉有力的浊音。",
    "englishExplanation": "The back of the tongue seals against the soft palate, then releases with simultaneous vocal fold vibration.",
    "steps": [
      "舌后根高高抬起紧贴软腭天花板",
      "舌根瞬间弹开的同时，声带强力振动发声",
      "摸脖子感受浑厚扎实的蜂鸣震颤，不要发成汉语轻声'哥'"
    ],
    "tip": "舌根顶住软腭，弹开同时声带用力振动，低沉浑厚。",
    "mistake": "误读为汉语轻声'哥'或丢失声带振动",
    "mouthShape": "舌根抬贴软腭，声带振动",
    "practiceWords": [
      {
        "word": "go",
        "ipa": "/ɡoʊ/",
        "translation": "去"
      },
      {
        "word": "girl",
        "ipa": "/ɡɜːrl/",
        "translation": "女孩"
      },
      {
        "word": "big",
        "ipa": "/bɪɡ/",
        "translation": "大的"
      },
      {
        "word": "bag",
        "ipa": "/bæɡ/",
        "translation": "包包"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "k",
      "targetSymbol": "/k/",
      "pairTitle": "浊辅音 /ɡ/ vs 清辅音 /k/",
      "pairs": [
        {
          "word1": "goat",
          "ipa1": "/ɡoʊt/",
          "word2": "coat",
          "ipa2": "/koʊt/"
        },
        {
          "word1": "gold",
          "ipa1": "/ɡoʊld/",
          "word2": "cold",
          "ipa2": "/koʊld/"
        },
        {
          "word1": "bag",
          "ipa1": "/bæɡ/",
          "word2": "back",
          "ipa2": "/bæk/"
        },
        {
          "word1": "pig",
          "ipa1": "/pɪɡ/",
          "word2": "pick",
          "ipa2": "/pɪk/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "go",
        "ipa": "/ɡoʊ/",
        "translation": "去",
        "phonicsSpell": "g - o",
        "rule": "字母 g 在词首发浊软腭爆破音 /ɡ/",
        "blocks": [
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": true
          },
          {
            "letters": "o",
            "phoneme": "/oʊ/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "girl",
        "ipa": "/ɡɜːrl/",
        "translation": "女孩",
        "phonicsSpell": "g - ir - l",
        "rule": "字母 g 舌根顶软腭，声带低沉有力振动",
        "blocks": [
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": true
          },
          {
            "letters": "ir",
            "phoneme": "/ɜːr/",
            "isTarget": false
          },
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "bag",
        "ipa": "/bæɡ/",
        "translation": "包包",
        "phonicsSpell": "b - a - g",
        "rule": "字母 g 在词尾保持声带微颤，不脱落",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "g",
            "phoneme": "/ɡ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 23,
    "id": "f",
    "slug": "f",
    "symbol": "/f/",
    "name": "唇齿清擦音 (如 fish, face, foot)",
    "category": "唇齿音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": false,
    "sampleWord": "fish",
    "phonicsSpell": "f-i-s-h",
    "wordIpa": "/fɪʃ/",
    "chineseExplanation": "上排门牙轻轻搭在下嘴唇内侧边缘，气流从缝隙中轻柔吹出摩擦声，声带不振动。",
    "englishExplanation": "The upper incisors rest gently against the lower lip, forcing air through the narrow slit without voicing.",
    "steps": [
      "上排门牙轻轻搭在下嘴唇的内侧边缘，轻轻贴住",
      "气流从牙齿与下嘴唇的细微缝隙中呼出，产生摩擦吹风声",
      "声带不振动，像小兔子露出门牙轻轻吹气球"
    ],
    "tip": "上门牙轻触下嘴唇内侧，吹出平稳摩擦气流，声带安静。",
    "mistake": "用双唇吹气误发成 /p/ 或 /h/",
    "mouthShape": "上门牙轻咬下唇内侧",
    "practiceWords": [
      {
        "word": "fish",
        "ipa": "/fɪʃ/",
        "translation": "鱼"
      },
      {
        "word": "face",
        "ipa": "/feɪs/",
        "translation": "脸"
      },
      {
        "word": "foot",
        "ipa": "/fʊt/",
        "translation": "脚"
      },
      {
        "word": "leaf",
        "ipa": "/liːf/",
        "translation": "树叶"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "v",
      "targetSymbol": "/v/",
      "pairTitle": "唇齿清音 /f/ vs 唇齿浊音 /v/",
      "pairs": [
        {
          "word1": "fan",
          "ipa1": "/fæn/",
          "word2": "van",
          "ipa2": "/væn/"
        },
        {
          "word1": "fast",
          "ipa1": "/fæst/",
          "word2": "vast",
          "ipa2": "/væst/"
        },
        {
          "word1": "safe",
          "ipa1": "/seɪf/",
          "word2": "save",
          "ipa2": "/seɪv/"
        },
        {
          "word1": "leaf",
          "ipa1": "/liːf/",
          "word2": "leave",
          "ipa2": "/liːv/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "fish",
        "ipa": "/fɪʃ/",
        "translation": "鱼",
        "phonicsSpell": "f - i - sh",
        "rule": "字母 f 在词首上门牙轻咬下唇送气 /f/",
        "blocks": [
          {
            "letters": "f",
            "phoneme": "/f/",
            "isTarget": true
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "sh",
            "phoneme": "/ʃ/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "coffee",
        "ipa": "/ˈkɔːfi/",
        "translation": "咖啡",
        "phonicsSpell": "c - o - ff - ee",
        "rule": "双写字母 ff 发单个清唇齿摩擦音 /f/",
        "blocks": [
          {
            "letters": "c",
            "phoneme": "/k/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/ɔː/",
            "isTarget": false
          },
          {
            "letters": "ff",
            "phoneme": "/f/",
            "isTarget": true
          },
          {
            "letters": "ee",
            "phoneme": "/i/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "leaf",
        "ipa": "/liːf/",
        "translation": "树叶",
        "phonicsSpell": "l - ea - f",
        "rule": "字母 f 在词尾持续平稳呼出丝丝气流",
        "blocks": [
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": false
          },
          {
            "letters": "ea",
            "phoneme": "/iː/",
            "isTarget": false
          },
          {
            "letters": "f",
            "phoneme": "/f/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 24,
    "id": "v",
    "slug": "v",
    "symbol": "/v/",
    "name": "唇齿浊擦音 (如 very, van, love)",
    "category": "唇齿音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": true,
    "sampleWord": "very",
    "phonicsSpell": "v-e-r-y",
    "wordIpa": "/ˈveri/",
    "chineseExplanation": "保持与 /f/ 完全相同的上牙轻咬下唇姿势，送气的同时声带剧烈振动，像小马达运转般震颤。",
    "englishExplanation": "Same labiodental contact as /f/, accompanied by continuous vocal cord vibration.",
    "steps": [
      "上门牙轻触下嘴唇内侧，保持标准唇齿阻气通道",
      "送气的同时声带用力振动！感受嘴唇与喉头强烈的麻酥感",
      "绝不要撅起双唇读成拼音'乌' (/w/)"
    ],
    "tip": "上排门牙轻轻触碰下嘴唇内侧边缘，呼气并用力振动声带，绝不用双唇发成 /w/！",
    "mistake": "常误用双唇读成 /w/",
    "mouthShape": "上门牙轻咬下唇内侧，声带振动",
    "practiceWords": [
      {
        "word": "very",
        "ipa": "/ˈveri/",
        "translation": "非常"
      },
      {
        "word": "van",
        "ipa": "/væn/",
        "translation": "面包车"
      },
      {
        "word": "love",
        "ipa": "/lʌv/",
        "translation": "爱"
      },
      {
        "word": "voice",
        "ipa": "/vɔɪs/",
        "translation": "声音"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "w",
      "targetSymbol": "/w/",
      "pairTitle": "咬唇 /v/ vs 圆唇 /w/",
      "pairs": [
        {
          "word1": "very",
          "ipa1": "/ˈveri/",
          "word2": "worry",
          "ipa2": "/ˈwɜːri/"
        },
        {
          "word1": "vest",
          "ipa1": "/vest/",
          "word2": "west",
          "ipa2": "/west/"
        },
        {
          "word1": "vet",
          "ipa1": "/vet/",
          "word2": "wet",
          "ipa2": "/wet/"
        },
        {
          "word1": "vine",
          "ipa1": "/vaɪn/",
          "word2": "wine",
          "ipa2": "/waɪn/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "van",
        "ipa": "/væn/",
        "translation": "面包车",
        "phonicsSpell": "v - a - n",
        "rule": "字母 v 在词首上齿咬下唇，声带强烈振颤",
        "blocks": [
          {
            "letters": "v",
            "phoneme": "/v/",
            "isTarget": true
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "very",
        "ipa": "/ˈveri/",
        "translation": "非常",
        "phonicsSpell": "v - e - r - y",
        "rule": "首音发 /v/，绝不能用双唇撅圆发成 /w/",
        "blocks": [
          {
            "letters": "v",
            "phoneme": "/v/",
            "isTarget": true
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": false
          },
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "y",
            "phoneme": "/i/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "love",
        "ipa": "/lʌv/",
        "translation": "爱",
        "phonicsSpell": "l - o - ve",
        "rule": "字母组合 ve 在词尾发浊唇齿摩擦音 /v/",
        "blocks": [
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "ve",
            "phoneme": "/v/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 25,
    "id": "θ",
    "slug": "th",
    "symbol": "/θ/",
    "name": "咬舌清辅音 (如 think, three, teeth)",
    "category": "咬舌音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": false,
    "sampleWord": "think",
    "phonicsSpell": "th-i-n-k",
    "wordIpa": "/θɪŋk/",
    "chineseExplanation": "舌尖轻放于上下门牙之间，上门牙轻触舌面。送气时不振动声带，气流由齿间轻柔摩擦而出。",
    "englishExplanation": "The tip of the tongue is placed lightly between the upper and lower incisors. Friction is produced by air expelled between teeth and tongue. The vocal cords do not vibrate.",
    "steps": [
      "舌尖像小乌龟探头一样，微微露出上下门牙齿缝之间 2-3 毫米",
      "上门牙轻轻挨住舌面，千万不要狠咬用力压",
      "轻轻从齿缝持续吹气，喉咙不振动，像微风吹过树梢的沙沙声"
    ],
    "tip": "舌尖轻抵上下门牙之间，微露舌尖，轻柔送气，声带不振动。千万别读成了汉字'四' (/s/) 哦！",
    "mistake": "最常见错误是用 /s/ 或 /f/ 代替咬舌音",
    "mouthShape": "上下门牙微张，舌尖轻夹齿缝",
    "practiceWords": [
      {
        "word": "think",
        "ipa": "/θɪŋk/",
        "translation": "思考"
      },
      {
        "word": "three",
        "ipa": "/θriː/",
        "translation": "三"
      },
      {
        "word": "teeth",
        "ipa": "/tiːθ/",
        "translation": "牙齿"
      },
      {
        "word": "thank",
        "ipa": "/θæŋk/",
        "translation": "谢谢"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "s",
      "targetSymbol": "/s/",
      "pairTitle": "咬舌 /θ/ vs 齿龈 /s/",
      "pairs": [
        {
          "word1": "think",
          "ipa1": "/θɪŋk/",
          "word2": "sink",
          "ipa2": "/sɪŋk/"
        },
        {
          "word1": "thick",
          "ipa1": "/θɪk/",
          "word2": "sick",
          "ipa2": "/sɪk/"
        },
        {
          "word1": "thumb",
          "ipa1": "/θʌm/",
          "word2": "sum",
          "ipa2": "/sʌm/"
        },
        {
          "word1": "mouth",
          "ipa1": "/maʊθ/",
          "word2": "mouse",
          "ipa2": "/maʊs/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "think",
        "ipa": "/θɪŋk/",
        "translation": "思考",
        "phonicsSpell": "th - i - nk",
        "rule": "字母组合 th 在实词词首发清咬舌音 /θ/",
        "blocks": [
          {
            "letters": "th",
            "phoneme": "/θ/",
            "isTarget": true
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "nk",
            "phoneme": "/ŋk/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "three",
        "ipa": "/θriː/",
        "translation": "数字三",
        "phonicsSpell": "th - r - ee",
        "rule": "th 咬舌后紧跟卷舌音 r，舌位快速回缩",
        "blocks": [
          {
            "letters": "th",
            "phoneme": "/θ/",
            "isTarget": true
          },
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "ee",
            "phoneme": "/iː/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "teeth",
        "ipa": "/tiːθ/",
        "translation": "牙齿",
        "phonicsSpell": "t - ee - th",
        "rule": "th 在词尾微探舌尖轻送气，声带绝对不振动",
        "blocks": [
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "ee",
            "phoneme": "/iː/",
            "isTarget": false
          },
          {
            "letters": "th",
            "phoneme": "/θ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 26,
    "id": "ð",
    "slug": "dh",
    "symbol": "/ð/",
    "name": "咬舌浊辅音 (如 this, that, mother)",
    "category": "咬舌音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": true,
    "sampleWord": "this",
    "phonicsSpell": "th-i-s",
    "wordIpa": "/ðɪs/",
    "chineseExplanation": "舌位与 /θ/ 完全相同，舌尖微露于齿缝。送气的同时声带剧烈振动，摸喉部有明显的蜂鸣震颤感。",
    "englishExplanation": "The tip of the tongue is placed between the teeth as in /θ/. Friction is accompanied by vibration of the vocal cords.",
    "steps": [
      "舌尖微露于门牙缝隙，保持与 /θ/ 相同的咬舌位置",
      "送气的同时声带动起来！摸脖子有明显的小蜜蜂嗡嗡振动",
      "不要收口过早发成汉语拼音的'得' (/d/) 或 /z/"
    ],
    "tip": "舌尖轻触上下门牙缝隙，送气的同时用力振动声带。不要读成爆破音 /d/ (得) 或 /z/！",
    "mistake": "常误读为 /d/ 或 /z/",
    "mouthShape": "舌尖轻伸出上下门牙之间，喉部声带振动",
    "practiceWords": [
      {
        "word": "this",
        "ipa": "/ðɪs/",
        "translation": "这个"
      },
      {
        "word": "that",
        "ipa": "/ðæt/",
        "translation": "那个"
      },
      {
        "word": "mother",
        "ipa": "/ˈmʌðər/",
        "translation": "母亲"
      },
      {
        "word": "brother",
        "ipa": "/ˈbrʌðər/",
        "translation": "兄弟"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "d",
      "targetSymbol": "/d/",
      "pairTitle": "咬舌浊音 /ð/ vs 齿龈爆破 /d/",
      "pairs": [
        {
          "word1": "then",
          "ipa1": "/ðen/",
          "word2": "den",
          "ipa2": "/den/"
        },
        {
          "word1": "they",
          "ipa1": "/ðeɪ/",
          "word2": "day",
          "ipa2": "/deɪ/"
        },
        {
          "word1": "there",
          "ipa1": "/ðer/",
          "word2": "dare",
          "ipa2": "/der/"
        },
        {
          "word1": "breathe",
          "ipa1": "/briːð/",
          "word2": "breed",
          "ipa2": "/briːd/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "this",
        "ipa": "/ðɪs/",
        "translation": "这一个",
        "phonicsSpell": "th - i - s",
        "rule": "字母组合 th 在代词词首发浊咬舌音 /ð/",
        "blocks": [
          {
            "letters": "th",
            "phoneme": "/ð/",
            "isTarget": true
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "that",
        "ipa": "/ðæt/",
        "translation": "那一个",
        "phonicsSpell": "th - a - t",
        "rule": "舌尖微夹上下齿间，伴随喉部强烈振颤",
        "blocks": [
          {
            "letters": "th",
            "phoneme": "/ð/",
            "isTarget": true
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "mother",
        "ipa": "/ˈmʌðər/",
        "translation": "妈妈",
        "phonicsSpell": "m - o - th - er",
        "rule": "字母组合 th 在词中发浊咬舌音 /ð/",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "th",
            "phoneme": "/ð/",
            "isTarget": true
          },
          {
            "letters": "er",
            "phoneme": "/ər/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 27,
    "id": "s",
    "slug": "s",
    "symbol": "/s/",
    "name": "齿龈清擦音 (如 see, sun, bus)",
    "category": "齿龈音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": false,
    "sampleWord": "sun",
    "phonicsSpell": "s-u-n",
    "wordIpa": "/sʌn/",
    "chineseExplanation": "上下齿自然闭合对齐，舌尖极度靠近上齿龈留有细如发丝的狭缝，强气流摩擦喷出清脆的丝丝声，声带不振。",
    "englishExplanation": "The teeth are closely aligned. The tongue tip forms a narrow groove against the alveolar ridge creating a sharp hiss without voicing.",
    "steps": [
      "上下门牙轻轻挨近对齐，不要咬死",
      "舌尖向上抬高，非常贴近上门牙后方的齿龈，留一道细细的小狭缝",
      "像小蛇吐信子一样吹出嘶嘶声，摸脖子不振动"
    ],
    "tip": "上下齿微合，舌尖极度贴近上齿龈留细缝，吹出清脆丝丝声，声带不振动。",
    "mistake": "舌尖伸出门牙变成咬舌音 /θ/，或气流无力",
    "mouthShape": "上下齿对齐留细隙，嘴角微展",
    "practiceWords": [
      {
        "word": "sun",
        "ipa": "/sʌn/",
        "translation": "太阳"
      },
      {
        "word": "see",
        "ipa": "/siː/",
        "translation": "看见"
      },
      {
        "word": "bus",
        "ipa": "/bʌs/",
        "translation": "公交车"
      },
      {
        "word": "star",
        "ipa": "/stɑːr/",
        "translation": "星星"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "z",
      "targetSymbol": "/z/",
      "pairTitle": "清擦音 /s/ vs 浊擦音 /z/",
      "pairs": [
        {
          "word1": "sip",
          "ipa1": "/sɪp/",
          "word2": "zip",
          "ipa2": "/zɪp/"
        },
        {
          "word1": "bus",
          "ipa1": "/bʌs/",
          "word2": "buzz",
          "ipa2": "/bʌz/"
        },
        {
          "word1": "price",
          "ipa1": "/praɪs/",
          "word2": "prize",
          "ipa2": "/praɪz/"
        },
        {
          "word1": "loose",
          "ipa1": "/luːs/",
          "word2": "lose",
          "ipa2": "/luːz/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "sun",
        "ipa": "/sʌn/",
        "translation": "太阳",
        "phonicsSpell": "s - u - n",
        "rule": "字母 s 在词首吹出平稳清脆摩擦细风 /s/",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": true
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "see",
        "ipa": "/siː/",
        "translation": "看见",
        "phonicsSpell": "s - ee",
        "rule": "上下门牙微闭留细缝，气流经齿龈喷薄",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": true
          },
          {
            "letters": "ee",
            "phoneme": "/iː/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "bus",
        "ipa": "/bʌs/",
        "translation": "公交车",
        "phonicsSpell": "b - u - s",
        "rule": "字母 s 在清辅音或短元音后发清辅音 /s/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 28,
    "id": "z",
    "slug": "z",
    "symbol": "/z/",
    "name": "齿龈浊擦音 (如 zoo, buzz, prize)",
    "category": "齿龈音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": true,
    "sampleWord": "zoo",
    "phonicsSpell": "z-oo",
    "wordIpa": "/zuː/",
    "chineseExplanation": "舌位与口型与 /s/ 相同，但发音时声带强烈振动，产生如同蜜蜂振翅或电锯般的蜂鸣浊音。",
    "englishExplanation": "Same articulatory position as /s/, accompanied by continuous vocal cord vibration.",
    "steps": [
      "保持与 /s/ 完全相同的上下牙对齐与舌尖位置",
      "在送气的同时让声带大声唱起来！",
      "摸摸脖子感受强烈的麻麻震颤感，像小蜜蜂在耳边嗡嗡叫"
    ],
    "tip": "口型舌位与 /s/ 相同，送气同时声带剧烈振动，像小蜜蜂嗡嗡振翅。",
    "mistake": "丢失声带振动发成 /s/，或发成汉语拼音 z",
    "mouthShape": "上下齿对齐留细隙，声带振动",
    "practiceWords": [
      {
        "word": "zoo",
        "ipa": "/zuː/",
        "translation": "动物园"
      },
      {
        "word": "buzz",
        "ipa": "/bʌz/",
        "translation": "嗡嗡声"
      },
      {
        "word": "nose",
        "ipa": "/noʊz/",
        "translation": "鼻子"
      },
      {
        "word": "zero",
        "ipa": "/ˈzɪroʊ/",
        "translation": "零"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "s",
      "targetSymbol": "/s/",
      "pairTitle": "浊擦音 /z/ vs 清擦音 /s/",
      "pairs": [
        {
          "word1": "zip",
          "ipa1": "/zɪp/",
          "word2": "sip",
          "ipa2": "/sɪp/"
        },
        {
          "word1": "buzz",
          "ipa1": "/bʌz/",
          "word2": "bus",
          "ipa2": "/bʌs/"
        },
        {
          "word1": "prize",
          "ipa1": "/praɪz/",
          "word2": "price",
          "ipa2": "/praɪs/"
        },
        {
          "word1": "eyes",
          "ipa1": "/aɪz/",
          "word2": "ice",
          "ipa2": "/aɪs/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "zoo",
        "ipa": "/zuː/",
        "translation": "动物园",
        "phonicsSpell": "z - oo",
        "rule": "字母 z 在词首如小蜜蜂嗡嗡振颤 /z/",
        "blocks": [
          {
            "letters": "z",
            "phoneme": "/z/",
            "isTarget": true
          },
          {
            "letters": "oo",
            "phoneme": "/uː/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "buzz",
        "ipa": "/bʌz/",
        "translation": "嗡嗡声",
        "phonicsSpell": "b - u - zz",
        "rule": "双写 zz 保持强烈声带振颤，发浊擦音 /z/",
        "blocks": [
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "zz",
            "phoneme": "/z/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "nose",
        "ipa": "/noʊz/",
        "translation": "鼻子",
        "phonicsSpell": "n - o - se",
        "rule": "字母 s 在两元音之间通常浊化为 /z/",
        "blocks": [
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "o",
            "phoneme": "/oʊ/",
            "isTarget": false
          },
          {
            "letters": "se",
            "phoneme": "/z/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 29,
    "id": "ʃ",
    "slug": "sh",
    "symbol": "/ʃ/",
    "name": "齿龈后擦嘘音 (如 ship, fish, she)",
    "category": "嘘擦音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": false,
    "sampleWord": "ship",
    "phonicsSpell": "sh-i-p",
    "wordIpa": "/ʃɪp/",
    "chineseExplanation": "双唇向前撅起呈喇叭圆状，像做'安静嘘——'的手势。舌前部贴近硬腭形成窄缝，气流穿过产生沙沙嘘声。",
    "englishExplanation": "The lips are rounded and pursed forward. The blade of the tongue approaches the postalveolar area to create friction without voicing.",
    "steps": [
      "双唇向前稍微噘起，像做“安静嘘——”的手势",
      "舌面两侧紧贴上磨牙，舌中间留一条微小的通道",
      "用力吐气产生沙沙的摩擦嘘声，声带保持安静不振动"
    ],
    "tip": "双唇向前噘起呈小圆弧，舌面前部抬起靠近硬腭，轻轻吐气产生连续平稳的摩擦嘘声。",
    "mistake": "嘴角过平或气流过于干涩",
    "mouthShape": "双唇噘起微圆，舌面抬起",
    "practiceWords": [
      {
        "word": "ship",
        "ipa": "/ʃɪp/",
        "translation": "轮船"
      },
      {
        "word": "she",
        "ipa": "/ʃiː/",
        "translation": "她"
      },
      {
        "word": "fish",
        "ipa": "/fɪʃ/",
        "translation": "鱼"
      },
      {
        "word": "shoe",
        "ipa": "/ʃuː/",
        "translation": "鞋子"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "s",
      "targetSymbol": "/s/",
      "pairTitle": "嘘擦音 /ʃ/ vs 齿龈音 /s/",
      "pairs": [
        {
          "word1": "ship",
          "ipa1": "/ʃɪp/",
          "word2": "sip",
          "ipa2": "/sɪp/"
        },
        {
          "word1": "she",
          "ipa1": "/ʃiː/",
          "word2": "see",
          "ipa2": "/siː/"
        },
        {
          "word1": "shoe",
          "ipa1": "/ʃuː/",
          "word2": "sue",
          "ipa2": "/suː/"
        },
        {
          "word1": "shine",
          "ipa1": "/ʃaɪn/",
          "word2": "sign",
          "ipa2": "/saɪn/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "ship",
        "ipa": "/ʃɪp/",
        "translation": "轮船",
        "phonicsSpell": "sh - i - p",
        "rule": "字母组合 sh 永远对应嘘擦音 /ʃ/",
        "blocks": [
          {
            "letters": "sh",
            "phoneme": "/ʃ/",
            "isTarget": true
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "p",
            "phoneme": "/p/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "she",
        "ipa": "/ʃiː/",
        "translation": "她",
        "phonicsSpell": "sh - e",
        "rule": "双唇向前收拢突出微翘，呼出厚重嘘气",
        "blocks": [
          {
            "letters": "sh",
            "phoneme": "/ʃ/",
            "isTarget": true
          },
          {
            "letters": "e",
            "phoneme": "/iː/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "fish",
        "ipa": "/fɪʃ/",
        "translation": "小鱼",
        "phonicsSpell": "f - i - sh",
        "rule": "字母组合 sh 在词尾气流持久饱满",
        "blocks": [
          {
            "letters": "f",
            "phoneme": "/f/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "sh",
            "phoneme": "/ʃ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 30,
    "id": "h",
    "slug": "h",
    "symbol": "/h/",
    "name": "声门清擦音 (如 hat, hot, home)",
    "category": "声门音",
    "group": "fricatives",
    "groupName": "摩擦辅音",
    "voiced": false,
    "sampleWord": "hat",
    "phonicsSpell": "h-a-t",
    "wordIpa": "/hæt/",
    "chineseExplanation": "口腔和舌头完全放松自然张开，喉咙深处深呼吸送气，像冬天对着双手哈气取暖一样，声带不振动。",
    "englishExplanation": "The mouth remains relaxed and open. Air flows freely from the glottis causing quiet audible friction without voicing.",
    "steps": [
      "口腔和舌头完全放松自然张开，不做多余动作",
      "喉咙深处深呼吸送气，像冬天对着双手哈气取暖一样",
      "声带不振动，气流平稳顺畅呼出，不要用力摩擦喉头"
    ],
    "tip": "口腔完全放松，喉咙深处平缓呼气，像冬日哈气取暖，声带不振动。",
    "mistake": "喉头肌肉过紧导致声音干瘪发涩，或误读成汉语拼音 h",
    "mouthShape": "口腔自然张开放松",
    "practiceWords": [
      {
        "word": "hat",
        "ipa": "/hæt/",
        "translation": "帽子"
      },
      {
        "word": "hot",
        "ipa": "/hɑːt/",
        "translation": "热的"
      },
      {
        "word": "home",
        "ipa": "/hoʊm/",
        "translation": "家"
      },
      {
        "word": "happy",
        "ipa": "/ˈhæpi/",
        "translation": "快乐"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "silent",
      "targetSymbol": "Ø (零声母)",
      "pairTitle": "送气音 /h/ vs 零声母元音",
      "pairs": [
        {
          "word1": "hat",
          "ipa1": "/hæt/",
          "word2": "at",
          "ipa2": "/æt/"
        },
        {
          "word1": "hear",
          "ipa1": "/hɪr/",
          "word2": "ear",
          "ipa2": "/ɪr/"
        },
        {
          "word1": "hold",
          "ipa1": "/hoʊld/",
          "word2": "old",
          "ipa2": "/oʊld/"
        },
        {
          "word1": "heart",
          "ipa1": "/hɑːrt/",
          "word2": "art",
          "ipa2": "/ɑːrt/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "hat",
        "ipa": "/hæt/",
        "translation": "帽子",
        "phonicsSpell": "h - a - t",
        "rule": "字母 h 在词首从声门呼出深吸哈气 /h/",
        "blocks": [
          {
            "letters": "h",
            "phoneme": "/h/",
            "isTarget": true
          },
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "hot",
        "ipa": "/hɑːt/",
        "translation": "热的",
        "phonicsSpell": "h - o - t",
        "rule": "口腔自然大开，声带完全不振动",
        "blocks": [
          {
            "letters": "h",
            "phoneme": "/h/",
            "isTarget": true
          },
          {
            "letters": "o",
            "phoneme": "/ɑː/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "home",
        "ipa": "/hoʊm/",
        "translation": "家",
        "phonicsSpell": "h - o - me",
        "rule": "轻柔哈气，顺滑过渡至随后的元音",
        "blocks": [
          {
            "letters": "h",
            "phoneme": "/h/",
            "isTarget": true
          },
          {
            "letters": "o_e",
            "phoneme": "/oʊ/",
            "isTarget": false
          },
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 31,
    "id": "tʃ",
    "slug": "ch",
    "symbol": "/tʃ/",
    "name": "清破擦音 (如 chair, teacher, watch)",
    "category": "破擦音",
    "group": "affricates",
    "groupName": "破擦辅音",
    "voiced": false,
    "sampleWord": "chair",
    "phonicsSpell": "ch-air",
    "wordIpa": "/tʃer/",
    "chineseExplanation": "双唇向前撅起，舌尖先紧贴齿龈阻断气流，随后瞬间弹开形成细缝，气流爆破并伴随清脆嘘声，声带不振动。",
    "englishExplanation": "Tongue tip seals against the alveolar ridge, then releases into postalveolar friction with pursed lips. Voiceless affricate.",
    "steps": [
      "双唇向前撅起，舌尖先紧紧贴在上门牙后的齿龈阻断气流",
      "舌尖瞬间弹开一条细缝，气流猛然爆破并伴随嘘声喷出",
      "动作利落果断，像清脆的切菜声，声带保持安静不振动"
    ],
    "tip": "舌尖抵住上牙龈后部阻断气流，瞬间爆破并带出摩擦嘘声，动作干脆利落，声带不振动！",
    "mistake": "爆破不够干脆或声带多余振动发成 /dʒ/",
    "mouthShape": "双唇突出，瞬间破裂出气",
    "practiceWords": [
      {
        "word": "chair",
        "ipa": "/tʃer/",
        "translation": "椅子"
      },
      {
        "word": "teacher",
        "ipa": "/ˈtiːtʃər/",
        "translation": "老师"
      },
      {
        "word": "watch",
        "ipa": "/wɑːtʃ/",
        "translation": "手表"
      },
      {
        "word": "cheese",
        "ipa": "/tʃiːz/",
        "translation": "奶酪"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ʃ",
      "targetSymbol": "/ʃ/",
      "pairTitle": "破擦音 /tʃ/ vs 擦音 /ʃ/",
      "pairs": [
        {
          "word1": "chair",
          "ipa1": "/tʃer/",
          "word2": "share",
          "ipa2": "/ʃer/"
        },
        {
          "word1": "chin",
          "ipa1": "/tʃɪn/",
          "word2": "shin",
          "ipa2": "/ʃɪn/"
        },
        {
          "word1": "cheap",
          "ipa1": "/tʃiːp/",
          "word2": "sheep",
          "ipa2": "/ʃiːp/"
        },
        {
          "word1": "catch",
          "ipa1": "/kætʃ/",
          "word2": "cash",
          "ipa2": "/kæʃ/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "chair",
        "ipa": "/tʃer/",
        "translation": "椅子",
        "phonicsSpell": "ch - air",
        "rule": "字母组合 ch 在词首发清破擦音 /tʃ/",
        "blocks": [
          {
            "letters": "ch",
            "phoneme": "/tʃ/",
            "isTarget": true
          },
          {
            "letters": "air",
            "phoneme": "/er/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "teacher",
        "ipa": "/ˈtiːtʃər/",
        "translation": "老师",
        "phonicsSpell": "t - ea - ch - er",
        "rule": "先闭气爆破再瞬间摩擦喷出，一气呵成",
        "blocks": [
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "ea",
            "phoneme": "/iː/",
            "isTarget": false
          },
          {
            "letters": "ch",
            "phoneme": "/tʃ/",
            "isTarget": true
          },
          {
            "letters": "er",
            "phoneme": "/ər/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "watch",
        "ipa": "/wɑːtʃ/",
        "translation": "手表",
        "phonicsSpell": "w - a - tch",
        "rule": "字母组合 tch 在短元音后发清破擦音 /tʃ/",
        "blocks": [
          {
            "letters": "w",
            "phoneme": "/w/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ɑː/",
            "isTarget": false
          },
          {
            "letters": "tch",
            "phoneme": "/tʃ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 32,
    "id": "dʒ",
    "slug": "jh",
    "symbol": "/dʒ/",
    "name": "浊破擦音 (如 jump, job, orange)",
    "category": "破擦音",
    "group": "affricates",
    "groupName": "破擦辅音",
    "voiced": true,
    "sampleWord": "jump",
    "phonicsSpell": "j-u-m-p",
    "wordIpa": "/dʒʌmp/",
    "chineseExplanation": "口型与舌位与 /tʃ/ 完全相同，但在爆破弹开的瞬间声带强力振动发声，声音结实浑厚。",
    "englishExplanation": "Same articulatory sequence as /tʃ/, combined with immediate vocal fold vibration upon release.",
    "steps": [
      "口型与舌位与 /tʃ/ 完全相同，双唇微突收圆",
      "舌尖爆破弹开的瞬间，声带立刻爆发出结实的振动声",
      "摸脖子有扎实的麻感，切记不可读成拼音的'知'"
    ],
    "tip": "舌尖抵上门牙后方，瞬间破裂的同时用力振动声带，声音结实浑厚。",
    "mistake": "声带未振动发成清破擦音，或读成拼音'知'",
    "mouthShape": "双唇微张微圆，声带结实振动",
    "practiceWords": [
      {
        "word": "jump",
        "ipa": "/dʒʌmp/",
        "translation": "跳跃"
      },
      {
        "word": "job",
        "ipa": "/dʒɑːb/",
        "translation": "工作"
      },
      {
        "word": "orange",
        "ipa": "/ˈɔːrɪndʒ/",
        "translation": "橙子"
      },
      {
        "word": "juice",
        "ipa": "/dʒuːs/",
        "translation": "果汁"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "tʃ",
      "targetSymbol": "/tʃ/",
      "pairTitle": "浊破擦 /dʒ/ vs 清破擦 /tʃ/",
      "pairs": [
        {
          "word1": "jump",
          "ipa1": "/dʒʌmp/",
          "word2": "chump",
          "ipa2": "/tʃʌmp/"
        },
        {
          "word1": "joke",
          "ipa1": "/dʒoʊk/",
          "word2": "choke",
          "ipa2": "/tʃoʊk/"
        },
        {
          "word1": "jeep",
          "ipa1": "/dʒiːp/",
          "word2": "cheep",
          "ipa2": "/tʃiːp/"
        },
        {
          "word1": "gin",
          "ipa1": "/dʒɪn/",
          "word2": "chin",
          "ipa2": "/tʃɪn/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "jump",
        "ipa": "/dʒʌmp/",
        "translation": "跳跃",
        "phonicsSpell": "j - u - m - p",
        "rule": "字母 j 在词首对应浊破擦音 /dʒ/",
        "blocks": [
          {
            "letters": "j",
            "phoneme": "/dʒ/",
            "isTarget": true
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          },
          {
            "letters": "p",
            "phoneme": "/p/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "job",
        "ipa": "/dʒɑːb/",
        "translation": "工作",
        "phonicsSpell": "j - o - b",
        "rule": "舌尖贴齿龈爆破伴随声带强劲振颤",
        "blocks": [
          {
            "letters": "j",
            "phoneme": "/dʒ/",
            "isTarget": true
          },
          {
            "letters": "o",
            "phoneme": "/ɑː/",
            "isTarget": false
          },
          {
            "letters": "b",
            "phoneme": "/b/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "orange",
        "ipa": "/ˈɔːrɪndʒ/",
        "translation": "橙子",
        "phonicsSpell": "o - r - a - n - ge",
        "rule": "词尾 ge 组合发浊破擦音 /dʒ/",
        "blocks": [
          {
            "letters": "o",
            "phoneme": "/ɔː/",
            "isTarget": false
          },
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "a",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "ge",
            "phoneme": "/dʒ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 33,
    "id": "m",
    "slug": "m",
    "symbol": "/m/",
    "name": "双唇鼻辅音 (如 moon, man, mom)",
    "category": "鼻音",
    "group": "sonorants",
    "groupName": "鼻音·边音·半元音",
    "voiced": true,
    "sampleWord": "moon",
    "phonicsSpell": "m-oo-n",
    "wordIpa": "/muːn/",
    "chineseExplanation": "上下双唇自然轻柔闭合封住口腔，声带振动发声，气流全部从鼻腔发出浑厚的共鸣声。",
    "englishExplanation": "The lips form a complete closure while voiced air resonates entirely through the nasal cavity.",
    "steps": [
      "上下双唇轻柔自然闭合，封住嘴巴出口",
      "声带振动发声，气流全部从鼻子中哼出，产生浑厚的鼻腔共鸣",
      "摸摸鼻梁骨有微微的麻麻震动感，声音如同品尝美食的'嗯~'"
    ],
    "tip": "双唇闭合封口，声带振动，气流由鼻腔完全哼出，摸鼻梁有共鸣。",
    "mistake": "双唇未闭合或气流走口腔丢失鼻音",
    "mouthShape": "双唇紧闭，声带振动鼻共鸣",
    "practiceWords": [
      {
        "word": "moon",
        "ipa": "/muːn/",
        "translation": "月亮"
      },
      {
        "word": "man",
        "ipa": "/mæn/",
        "translation": "男人"
      },
      {
        "word": "mom",
        "ipa": "/mɑːm/",
        "translation": "妈妈"
      },
      {
        "word": "milk",
        "ipa": "/mɪlk/",
        "translation": "牛奶"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "n",
      "targetSymbol": "/n/",
      "pairTitle": "双唇鼻音 /m/ vs 齿龈鼻音 /n/",
      "pairs": [
        {
          "word1": "sum",
          "ipa1": "/sʌm/",
          "word2": "sun",
          "ipa2": "/sʌn/"
        },
        {
          "word1": "mice",
          "ipa1": "/maɪs/",
          "word2": "nice",
          "ipa2": "/naɪs/"
        },
        {
          "word1": "comb",
          "ipa1": "/koʊm/",
          "word2": "cone",
          "ipa2": "/koʊn/"
        },
        {
          "word1": "dime",
          "ipa1": "/daɪm/",
          "word2": "dine",
          "ipa2": "/daɪn/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "moon",
        "ipa": "/muːn/",
        "translation": "月亮",
        "phonicsSpell": "m - oo - n",
        "rule": "字母 m 在词首双唇紧闭，气流从鼻腔送出",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": true
          },
          {
            "letters": "oo",
            "phoneme": "/uː/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "mom",
        "ipa": "/mɑːm/",
        "translation": "妈妈",
        "phonicsSpell": "m - o - m",
        "rule": "首尾双重 m，闭唇鼻音饱满共鸣",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": true
          },
          {
            "letters": "o",
            "phoneme": "/ɑː/",
            "isTarget": false
          },
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "milk",
        "ipa": "/mɪlk/",
        "translation": "牛奶",
        "phonicsSpell": "m - i - l - k",
        "rule": "声带持续振颤，鼻音共鸣丰沛",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": true
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": false
          },
          {
            "letters": "k",
            "phoneme": "/k/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 34,
    "id": "n",
    "slug": "n",
    "symbol": "/n/",
    "name": "齿龈鼻辅音 (如 nose, nut, sun)",
    "category": "鼻音",
    "group": "sonorants",
    "groupName": "鼻音·边音·半元音",
    "voiced": true,
    "sampleWord": "nose",
    "phonicsSpell": "n-o-s-e",
    "wordIpa": "/noʊz/",
    "chineseExplanation": "嘴巴微张，舌尖紧贴上门牙后齿龈封堵口腔气流，声带振动，气流全部由鼻腔冲出形成共鸣。",
    "englishExplanation": "The tongue tip forms a seal at the alveolar ridge. Voiced air resonates through the nasal cavity.",
    "steps": [
      "嘴巴微张，舌尖紧紧贴在上门牙后面的齿龈天花板上堵住口腔气流",
      "声带振动发声，气流全部引导至鼻腔冲出",
      "摸鼻梁感受强烈的共鸣感，在词尾时舌尖保持贴住不松开"
    ],
    "tip": "舌尖紧贴上齿龈封住口腔，声带振动走鼻音，词尾贴紧不松开。",
    "mistake": "词尾收舌过快漏掉鼻音，或与 /l/ 混淆",
    "mouthShape": "舌尖贴齿龈，鼻腔共鸣",
    "practiceWords": [
      {
        "word": "nose",
        "ipa": "/noʊz/",
        "translation": "鼻子"
      },
      {
        "word": "nut",
        "ipa": "/nʌt/",
        "translation": "坚果"
      },
      {
        "word": "sun",
        "ipa": "/sʌn/",
        "translation": "太阳"
      },
      {
        "word": "nine",
        "ipa": "/naɪn/",
        "translation": "九"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "ŋ",
      "targetSymbol": "/ŋ/",
      "pairTitle": "前鼻音 /n/ vs 后鼻音 /ŋ/",
      "pairs": [
        {
          "word1": "thin",
          "ipa1": "/θɪn/",
          "word2": "thing",
          "ipa2": "/θɪŋ/"
        },
        {
          "word1": "sin",
          "ipa1": "/sɪn/",
          "word2": "sing",
          "ipa2": "/sɪŋ/"
        },
        {
          "word1": "ran",
          "ipa1": "/ræn/",
          "word2": "rang",
          "ipa2": "/ræŋ/"
        },
        {
          "word1": "ban",
          "ipa1": "/bæn/",
          "word2": "bang",
          "ipa2": "/bæŋ/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "nose",
        "ipa": "/noʊz/",
        "translation": "鼻子",
        "phonicsSpell": "n - o - se",
        "rule": "字母 n 舌尖紧抵上牙龈，气流由鼻孔流出",
        "blocks": [
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": true
          },
          {
            "letters": "o_e",
            "phoneme": "/oʊ/",
            "isTarget": false
          },
          {
            "letters": "s",
            "phoneme": "/z/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "nut",
        "ipa": "/nʌt/",
        "translation": "坚果",
        "phonicsSpell": "n - u - t",
        "rule": "舌尖贴紧上齿龈不漏气，发前鼻辅音 /n/",
        "blocks": [
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": true
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "sun",
        "ipa": "/sʌn/",
        "translation": "太阳",
        "phonicsSpell": "s - u - n",
        "rule": "字母 n 在词尾舌尖稳固停在上牙龈",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 35,
    "id": "ŋ",
    "slug": "ng",
    "symbol": "/ŋ/",
    "name": "软腭后鼻音 (如 morning, singing, ring)",
    "category": "鼻音",
    "group": "sonorants",
    "groupName": "鼻音·边音·半元音",
    "voiced": true,
    "sampleWord": "singing",
    "phonicsSpell": "s-i-ng-i-ng",
    "wordIpa": "/ˈsɪŋɪŋ/",
    "chineseExplanation": "舌后部向软腭抬起闭合堵住口腔通道，气流经由鼻腔送出，产生强烈的后鼻腔共鸣，声带振动。",
    "englishExplanation": "The back of the tongue presses against the soft palate. The air stream is directed through the nose. The vocal cords vibrate.",
    "steps": [
      "舌尖自然放下，舌根部使劲向上向后抬起，紧贴软腭天花板",
      "口腔通道完全被舌后根封住，引导气流全部从鼻腔后方哼出",
      "声带振动，摸摸鼻梁深处有强烈的麻麻共鸣，千万别偷懒漏发"
    ],
    "tip": "舌根部向后向上抬起，紧贴软腭闭合，气流全部从鼻腔发出共鸣！千万别漏掉鼻音读成前鼻音 /n/。",
    "mistake": "漏读后鼻音，读成普通前鼻音 /n/",
    "mouthShape": "嘴巴微张，舌根完全闭住咽腔走鼻音",
    "practiceWords": [
      {
        "word": "singing",
        "ipa": "/ˈsɪŋɪŋ/",
        "translation": "歌唱"
      },
      {
        "word": "morning",
        "ipa": "/ˈmɔːrnɪŋ/",
        "translation": "早晨"
      },
      {
        "word": "ring",
        "ipa": "/rɪŋ/",
        "translation": "戒指"
      },
      {
        "word": "king",
        "ipa": "/kɪŋ/",
        "translation": "国王"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "n",
      "targetSymbol": "/n/",
      "pairTitle": "后鼻音 /ŋ/ vs 前鼻音 /n/",
      "pairs": [
        {
          "word1": "sing",
          "ipa1": "/sɪŋ/",
          "word2": "sin",
          "ipa2": "/sɪn/"
        },
        {
          "word1": "ring",
          "ipa1": "/rɪŋ/",
          "word2": "rin",
          "ipa2": "/rɪn/"
        },
        {
          "word1": "wing",
          "ipa1": "/wɪŋ/",
          "word2": "win",
          "ipa2": "/wɪn/"
        },
        {
          "word1": "thing",
          "ipa1": "/θɪŋ/",
          "word2": "thin",
          "ipa2": "/θɪn/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "sing",
        "ipa": "/sɪŋ/",
        "translation": "歌唱",
        "phonicsSpell": "s - i - ng",
        "rule": "字母组合 ng 在词尾发软腭后鼻音 /ŋ/",
        "blocks": [
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "ng",
            "phoneme": "/ŋ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "ring",
        "ipa": "/rɪŋ/",
        "translation": "戒指",
        "phonicsSpell": "r - i - ng",
        "rule": "舌后部高抬封死口腔，气流完全经后鼻腔共鸣",
        "blocks": [
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "ng",
            "phoneme": "/ŋ/",
            "isTarget": true
          }
        ]
      },
      {
        "word": "morning",
        "ipa": "/ˈmɔːrnɪŋ/",
        "translation": "早晨",
        "phonicsSpell": "m - or - n - i - ng",
        "rule": "词尾 ing 后鼻音清透饱满，声带持久振动",
        "blocks": [
          {
            "letters": "m",
            "phoneme": "/m/",
            "isTarget": false
          },
          {
            "letters": "or",
            "phoneme": "/ɔːr/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "ng",
            "phoneme": "/ŋ/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 36,
    "id": "l",
    "slug": "l",
    "symbol": "/l/",
    "name": "舌尖中边音 (如 light, exactly, life)",
    "category": "舌侧音",
    "group": "sonorants",
    "groupName": "鼻音·边音·半元音",
    "voiced": true,
    "sampleWord": "exactly",
    "phonicsSpell": "ex-act-ly",
    "wordIpa": "/ɪɡˈzæktli/",
    "chineseExplanation": "舌尖紧抵在上齿龈的后边，舌前向硬腭抬起，气流从舌头两侧送出。声带伴随强烈振动。",
    "englishExplanation": "The tip of the tongue is placed behind the upper alveolar ridge. The sides of the tongue drop to allow air to pass around both sides. The vocal cords vibrate.",
    "steps": [
      "舌尖像小跳板一样，使劲顶在上门牙后面的齿龈天花板上",
      "舌头中间挡住出气口，引导气流从舌头两边像小河流一样溜出",
      "发音同时声带振动，摸摸脖子有明显的小蜜蜂嗡嗡声"
    ],
    "tip": "发词首 /l/ 时舌尖紧抵上齿龈；发词尾辅音 /l/ (如 little 结尾) 时保持舌尖贴紧上牙龈，声音从两腮流出，不要收口太快！",
    "mistake": "词尾漏读或混淆为 /w/ 或 /r/",
    "mouthShape": "舌尖紧紧贴住上牙门后牙龈",
    "practiceWords": [
      {
        "word": "light",
        "ipa": "/laɪt/",
        "translation": "光/轻"
      },
      {
        "word": "life",
        "ipa": "/laɪf/",
        "translation": "生命"
      },
      {
        "word": "apple",
        "ipa": "/ˈæpl/",
        "translation": "苹果"
      },
      {
        "word": "exactly",
        "ipa": "/ɪɡˈzæktli/",
        "translation": "确切地"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "r",
      "targetSymbol": "/r/",
      "pairTitle": "舌侧音 /l/ vs 卷舌音 /r/",
      "pairs": [
        {
          "word1": "light",
          "ipa1": "/laɪt/",
          "word2": "right",
          "ipa2": "/raɪt/"
        },
        {
          "word1": "lake",
          "ipa1": "/leɪk/",
          "word2": "rake",
          "ipa2": "/reɪk/"
        },
        {
          "word1": "climb",
          "ipa1": "/klaɪm/",
          "word2": "crime",
          "ipa2": "/kraɪm/"
        },
        {
          "word1": "glass",
          "ipa1": "/ɡlæs/",
          "word2": "grass",
          "ipa2": "/ɡræs/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "light",
        "ipa": "/laɪt/",
        "translation": "光芒 / 轻便",
        "phonicsSpell": "l - igh - t",
        "rule": "字母 l 在词首发清晰舌侧音 (Clear L)",
        "blocks": [
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": true
          },
          {
            "letters": "igh",
            "phoneme": "/aɪ/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "life",
        "ipa": "/laɪf/",
        "translation": "生活 / 生命",
        "phonicsSpell": "l - i - fe",
        "rule": "舌尖紧抵上齿龈，气流由舌体两侧顺滑流出",
        "blocks": [
          {
            "letters": "l",
            "phoneme": "/l/",
            "isTarget": true
          },
          {
            "letters": "i_e",
            "phoneme": "/aɪ/",
            "isTarget": false
          },
          {
            "letters": "f",
            "phoneme": "/f/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "apple",
        "ipa": "/ˈæpl/",
        "translation": "苹果",
        "phonicsSpell": "a - pp - le",
        "rule": "le 组合在词尾发暗辅音 (Dark L)，舌后部微翘",
        "blocks": [
          {
            "letters": "a",
            "phoneme": "/æ/",
            "isTarget": false
          },
          {
            "letters": "pp",
            "phoneme": "/p/",
            "isTarget": false
          },
          {
            "letters": "le",
            "phoneme": "/l/",
            "isTarget": true
          }
        ]
      }
    ]
  },
  {
    "order": 37,
    "id": "r",
    "slug": "r",
    "symbol": "/r/",
    "name": "卷舌辅音 (如 red, room, tree)",
    "category": "卷舌音",
    "group": "sonorants",
    "groupName": "鼻音·边音·半元音",
    "voiced": true,
    "sampleWord": "red",
    "phonicsSpell": "r-e-d",
    "wordIpa": "/red/",
    "chineseExplanation": "舌尖悬空向上向后方卷起，注意千万不要碰到上腭天花板！双唇稍向前突出撅圆，声带振动。",
    "englishExplanation": "The tip of the tongue curls up and slightly backwards into the alveolar area without touching the roof of the mouth. The lips are slightly rounded and protruded. The vocal cords vibrate.",
    "steps": [
      "舌尖悬空向上后方卷起，注意：千万别碰到上天花板（硬腭）！",
      "嘴唇稍稍向前突出撅圆，像吹喇叭准备吹气",
      "发出浑厚有力的红色小跑车轰鸣引擎声，声带振动"
    ],
    "tip": "舌尖向上向后卷起，但绝对不能碰到口腔上腭！双唇稍向前突出收圆，滑出发音。",
    "mistake": "舌尖接触牙龈导致发成汉语拼音 r，或与 /l/ 混淆",
    "mouthShape": "双唇微突收圆，舌尖悬空上卷",
    "practiceWords": [
      {
        "word": "red",
        "ipa": "/red/",
        "translation": "红色"
      },
      {
        "word": "room",
        "ipa": "/ruːm/",
        "translation": "房间"
      },
      {
        "word": "tree",
        "ipa": "/triː/",
        "translation": "树木"
      },
      {
        "word": "run",
        "ipa": "/rʌn/",
        "translation": "奔跑"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "l",
      "targetSymbol": "/l/",
      "pairTitle": "卷舌音 /r/ vs 舌侧音 /l/",
      "pairs": [
        {
          "word1": "right",
          "ipa1": "/raɪt/",
          "word2": "light",
          "ipa2": "/laɪt/"
        },
        {
          "word1": "red",
          "ipa1": "/red/",
          "word2": "led",
          "ipa2": "/led/"
        },
        {
          "word1": "rake",
          "ipa1": "/reɪk/",
          "word2": "lake",
          "ipa2": "/leɪk/"
        },
        {
          "word1": "grass",
          "ipa1": "/ɡræs/",
          "word2": "glass",
          "ipa2": "/ɡlæs/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "red",
        "ipa": "/red/",
        "translation": "红色",
        "phonicsSpell": "r - e - d",
        "rule": "字母 r 在词首舌尖向上卷起悬空，绝不碰上腭",
        "blocks": [
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": true
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": false
          },
          {
            "letters": "d",
            "phoneme": "/d/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "run",
        "ipa": "/rʌn/",
        "translation": "奔跑",
        "phonicsSpell": "r - u - n",
        "rule": "双唇向前收圆突出，声带振动发出引擎轰鸣",
        "blocks": [
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": true
          },
          {
            "letters": "u",
            "phoneme": "/ʌ/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "tree",
        "ipa": "/triː/",
        "translation": "大树",
        "phonicsSpell": "t - r - ee",
        "rule": "辅音丛 tr 中快速由爆破音滑动至卷舌音",
        "blocks": [
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "r",
            "phoneme": "/r/",
            "isTarget": true
          },
          {
            "letters": "ee",
            "phoneme": "/iː/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 38,
    "id": "w",
    "slug": "w",
    "symbol": "/w/",
    "name": "双唇圆唇半元音 (如 water, we, win)",
    "category": "半元音",
    "group": "sonorants",
    "groupName": "鼻音·边音·半元音",
    "voiced": true,
    "sampleWord": "water",
    "phonicsSpell": "w-a-t-e-r",
    "wordIpa": "/ˈwɔːtər/",
    "chineseExplanation": "双唇极度收小撅圆成一个小圆孔，舌后部同时向上隆起，随即迅速向后面的元音滑开。声带振动。",
    "englishExplanation": "The lips are closely rounded and protruded into a tight circle while the back of the tongue elevates toward the velum. The vocal cords vibrate as it glides into the vowel.",
    "steps": [
      "嘴唇使劲向前撅起，缩成一个像吸管口一样的小圆圈",
      "舌头后半截向上稍稍抬起",
      "发音瞬间声带振动，同时嘴唇迅速向两边放松滑开"
    ],
    "tip": "双唇收成一个小圆孔并向前突出，声带振动，随后肌肉迅速放松滑向后面的元音。",
    "mistake": "唇形不够圆或误咬嘴唇变成 /v/",
    "mouthShape": "双唇极度收圆突出呈小圆孔",
    "practiceWords": [
      {
        "word": "water",
        "ipa": "/ˈwɔːtər/",
        "translation": "水"
      },
      {
        "word": "we",
        "ipa": "/wiː/",
        "translation": "我们"
      },
      {
        "word": "win",
        "ipa": "/wɪn/",
        "translation": "赢"
      },
      {
        "word": "warm",
        "ipa": "/wɔːrm/",
        "translation": "温暖"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "v",
      "targetSymbol": "/v/",
      "pairTitle": "圆唇半元音 /w/ vs 唇齿摩擦 /v/",
      "pairs": [
        {
          "word1": "west",
          "ipa1": "/west/",
          "word2": "vest",
          "ipa2": "/vest/"
        },
        {
          "word1": "wet",
          "ipa1": "/wet/",
          "word2": "vet",
          "ipa2": "/vet/"
        },
        {
          "word1": "wine",
          "ipa1": "/waɪn/",
          "word2": "vine",
          "ipa2": "/vaɪn/"
        },
        {
          "word1": "whale",
          "ipa1": "/weɪl/",
          "word2": "veil",
          "ipa2": "/veɪl/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "water",
        "ipa": "/ˈwɔːtər/",
        "translation": "水",
        "phonicsSpell": "w - a - t - er",
        "rule": "字母 w 在词首双唇极度收圆突出为小吸管口",
        "blocks": [
          {
            "letters": "w",
            "phoneme": "/w/",
            "isTarget": true
          },
          {
            "letters": "a",
            "phoneme": "/ɔː/",
            "isTarget": false
          },
          {
            "letters": "t",
            "phoneme": "/t/",
            "isTarget": false
          },
          {
            "letters": "er",
            "phoneme": "/ər/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "we",
        "ipa": "/wiː/",
        "translation": "我们",
        "phonicsSpell": "w - e",
        "rule": "由收圆迅速向平展长元音 /iː/ 滑开",
        "blocks": [
          {
            "letters": "w",
            "phoneme": "/w/",
            "isTarget": true
          },
          {
            "letters": "e",
            "phoneme": "/iː/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "win",
        "ipa": "/wɪn/",
        "translation": "获胜",
        "phonicsSpell": "w - i - n",
        "rule": "声带强力振颤并平滑过渡，严禁上齿咬唇",
        "blocks": [
          {
            "letters": "w",
            "phoneme": "/w/",
            "isTarget": true
          },
          {
            "letters": "i",
            "phoneme": "/ɪ/",
            "isTarget": false
          },
          {
            "letters": "n",
            "phoneme": "/n/",
            "isTarget": false
          }
        ]
      }
    ]
  },
  {
    "order": 39,
    "id": "j",
    "slug": "j",
    "symbol": "/j/",
    "name": "硬腭半元音 (如 you, yes, your, year)",
    "category": "半元音",
    "group": "sonorants",
    "groupName": "鼻音·边音·半元音",
    "voiced": true,
    "sampleWord": "you",
    "phonicsSpell": "y-ou",
    "wordIpa": "/juː/",
    "chineseExplanation": "舌前部向硬腭（口腔天花板）抬起，舌身两侧轻触上磨牙，双唇向两侧自然微咧平展。气流平稳送出，声带强烈振动，随后迅速滑向后面的元音。",
    "englishExplanation": "The front of the tongue rises towards the hard palate, the sides of the tongue touch the upper molars. The lips are spread or neutral. The vocal cords vibrate continuously as it glides swiftly into the following vowel.",
    "steps": [
      "嘴角像微笑一样向两侧微微平拉，嘴巴微张",
      "舌前部向上抬起贴近上腭天花板，但不要完全堵死气流",
      "声带振动发出短促的'爷' (/j/) 的起音，舌头迅速滑向后面的元音"
    ],
    "tip": "舌身向上贴近硬腭天花板，嘴角像微笑一样向两侧平拉，声带用力振动并迅速滑向后面的元音！切记不要读成汉语拼音的'日'或'衣'。",
    "mistake": "舌面离硬腭太远导致无滑动感，或误读为汉语声母 r/y",
    "mouthShape": "嘴角向两侧平咧如微笑，舌面抬高贴近硬腭",
    "practiceWords": [
      {
        "word": "you",
        "ipa": "/juː/",
        "translation": "你"
      },
      {
        "word": "yes",
        "ipa": "/jes/",
        "translation": "是的"
      },
      {
        "word": "year",
        "ipa": "/jɪr/",
        "translation": "年份"
      },
      {
        "word": "yellow",
        "ipa": "/ˈjeloʊ/",
        "translation": "黄色"
      }
    ],
    "minimalPair": {
      "targetPhoneme": "dʒ",
      "targetSymbol": "/dʒ/",
      "pairTitle": "硬腭半元音 /j/ vs 破擦音 /dʒ/",
      "pairs": [
        {
          "word1": "yes",
          "ipa1": "/jes/",
          "word2": "Jess",
          "ipa2": "/dʒes/"
        },
        {
          "word1": "year",
          "ipa1": "/jɪr/",
          "word2": "jeer",
          "ipa2": "/dʒɪr/"
        },
        {
          "word1": "yell",
          "ipa1": "/jel/",
          "word2": "jell",
          "ipa2": "/dʒel/"
        },
        {
          "word1": "yolk",
          "ipa1": "/joʊk/",
          "word2": "joke",
          "ipa2": "/dʒoʊk/"
        }
      ]
    },
    "benchmarkWords": [
      {
        "word": "you",
        "ipa": "/juː/",
        "translation": "你",
        "phonicsSpell": "y - ou",
        "rule": "字母 y 在词首发硬腭半元音 /j/",
        "blocks": [
          {
            "letters": "y",
            "phoneme": "/j/",
            "isTarget": true
          },
          {
            "letters": "ou",
            "phoneme": "/uː/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "yes",
        "ipa": "/jes/",
        "translation": "是的",
        "phonicsSpell": "y - e - s",
        "rule": "嘴角微笑平拉，舌面贴硬腭滑出发音",
        "blocks": [
          {
            "letters": "y",
            "phoneme": "/j/",
            "isTarget": true
          },
          {
            "letters": "e",
            "phoneme": "/e/",
            "isTarget": false
          },
          {
            "letters": "s",
            "phoneme": "/s/",
            "isTarget": false
          }
        ]
      },
      {
        "word": "yellow",
        "ipa": "/ˈjeloʊ/",
        "translation": "黄色",
        "phonicsSpell": "y - ell - ow",
        "rule": "短促有力的起音滑音，声带持续共振",
        "blocks": [
          {
            "letters": "y",
            "phoneme": "/j/",
            "isTarget": true
          },
          {
            "letters": "ell",
            "phoneme": "/el/",
            "isTarget": false
          },
          {
            "letters": "ow",
            "phoneme": "/oʊ/",
            "isTarget": false
          }
        ]
      }
    ]
  }
];

// 辅助索引字典
const ID_MAP = new Map<string, PhonemeItem>();
const SLUG_MAP = new Map<string, PhonemeItem>();

ALL_39_PHONEMES.forEach((item) => {
  ID_MAP.set(item.id, item);
  SLUG_MAP.set(item.slug.toLowerCase(), item);
});

// 查找单个音标 (支持标准 IPA 符号、URL slug 以及别名)
export const getPhonemeById = (rawId: string): PhonemeItem | undefined => {
  if (!rawId) return undefined;
  const clean = decodeURIComponent(rawId).replace(/[\/\[\]ˈˌ]/g, "").trim();
  if (ID_MAP.has(clean)) return ID_MAP.get(clean);
  if (SLUG_MAP.has(clean.toLowerCase())) return SLUG_MAP.get(clean.toLowerCase());
  
  // 别名兼容
  const ALIAS_MAP: Record<string, string> = {
    "th": "θ",
    "dh": "ð",
    "sh": "ʃ",
    "ch": "tʃ",
    "jh": "dʒ",
    "ng": "ŋ",
    "i:": "iː",
    "u:": "uː",
    "o:": "ɔ",
    "a:": "ɑ",
    "e:": "ɜ",
    "ae": "æ",
    "i_long": "iː",
    "u_long": "uː",
    "e": "ɛ",
    "ɡ": "g",
    "əʊ": "oʊ",
    "ɔː": "ɔ",
    "ɑː": "ɑ",
    "ɜː": "ɜ",
    "ɒ": "ɔ",
    "o": "oʊ",
  };
  const aliased = ALIAS_MAP[clean.toLowerCase()];
  if (aliased && ID_MAP.has(aliased)) return ID_MAP.get(aliased);

  // 模糊匹配包含
  return ALL_39_PHONEMES.find((item) => item.id.includes(clean) || clean.includes(item.id));
};

// 获取指定音标的上一个与下一个 (支持环形切换)
export const getAdjacentPhonemes = (currentId: string): { prev: PhonemeItem; next: PhonemeItem } => {
  const current = getPhonemeById(currentId) || ALL_39_PHONEMES[0];
  const idx = ALL_39_PHONEMES.findIndex((p) => p.id === current.id);
  const prevIdx = (idx - 1 + ALL_39_PHONEMES.length) % ALL_39_PHONEMES.length;
  const nextIdx = (idx + 1) % ALL_39_PHONEMES.length;
  return {
    prev: ALL_39_PHONEMES[prevIdx],
    next: ALL_39_PHONEMES[nextIdx],
  };
};

// 音标掌握度与云端同步引擎导出
export {
  MASTERY_STORAGE_KEY,
  getPhonemeUserId,
  getPhonemeMasteryMap,
  savePhonemeMasteryLocal,
  emitPhonemeMasteryUpdate,
  subscribePhonemeMastery,
  fetchPhonemesCloudProgress,
  togglePhonemeMastery,
  syncLocalPhonemesToCloud,
} from "./phoneme-cloud-sync";
export type { PhonemeSyncState } from "./phoneme-cloud-sync";

// 纯正原厂真人音标/音素音频精准映射表 (严禁播放字母名称音如 A, B, C，只播音标本身)
export const PHONEME_AUDIO_MAP: Record<string, string> = {
  // 元音
  "iː": "r0000123_iː",
  "ɪ": "r0000004_ɪ",
  "i": "r0000004_ɪ",
  "e": "r0000117_ɛ",
  "ɛ": "r0000117_ɛ",
  "æ": "r0000011_æ",
  "ʌ": "r0000118_ʌ",
  "ə": "r0000017_ə",
  "ɜ": "r0000103_ɜ",
  "ɜː": "r0000103_ɜ",
  "ɜːr": "r0000103_ɜ",
  "ər": "r0000103_ɜ",
  "er": "r0000103_ɜ",
  "uː": "r0000124_uː",
  "ʊ": "r0000014_ʊ",
  "ɔ": "r0000121_ɔ",
  "ɔː": "r0000121_ɔ",
  "ɔːr": "r0000121_ɔ",
  "ɑ": "r0000008_ɑ",
  "ɑː": "r0000008_ɑ",
  "ɑːr": "r0000008_ɑ",
  "eɪ": "r0000104_eɪ",
  "aɪ": "r0000040_aɪ",
  "ɔɪ": "r0000112_ɔɪ",
  "aʊ": "r0000122_aʊ",
  "oʊ": "r0000111_oʊ",

  // 辅音
  "p": "r0000055_p",
  "b": "r0000061_b",
  "t": "r0000057_t",
  "d": "r0000063_d",
  "k": "r0000059_k",
  "g": "r0000065_g",
  "ɡ": "r0000065_g",
  "f": "r0000067_f",
  "v": "r0000079_v",
  "θ": "r0000069_θ",
  "ð": "r0000081_ð",
  "s": "r0000070_s",
  "z": "r0000082_z",
  "ʃ": "r0000075_ʃ",
  "h": "r0000084_h",
  "tʃ": "r0000088_tʃ",
  "dʒ": "r0000090_dʒ",
  "m": "r0000095_m",
  "n": "r0000097_n",
  "ŋ": "r0000101_ŋ",
  "ŋk": "r0000101_ŋ",
  "l": "r0000050_l",
  "el": "r0000050_l",
  "r": "r0000046_r",
  "w": "r0000045_w",
  "j": "r0000043_j",
  "pl": "r0000055_p",
  "bl": "r0000061_b",

  // 常见拼写与二合字母别名 (严禁播放字母名称音如 T-H, S-H, C-H)
  "th": "r0000069_θ",
  "th_unvoiced": "r0000069_θ",
  "th_voiced": "r0000081_ð",
  "dh": "r0000081_ð",
  "sh": "r0000075_ʃ",
  "ch": "r0000088_tʃ",
  "jh": "r0000090_dʒ",
  "ng": "r0000101_ŋ",
  "zh": "r0000075_ʃ",
};

// 检查某个符号或输入是否有独立真人音素原声 MP3 资源
export const hasPhonemeAudio = (raw: string): boolean => {
  if (!raw) return false;
  const clean = raw.replace(/[\/\[\]ˈˌ]/g, "").trim();
  return Boolean(
    PHONEME_AUDIO_MAP[clean] ||
    PHONEME_AUDIO_MAP[clean.toLowerCase()] ||
    PHONEME_AUDIO_MAP[clean.replace("ː", "")]
  );
};

// 播放独立音素纯正发音 (非字母名称音)
export const playPhonemeSound = (
  rawPhoneme: string,
  options?: { onEnd?: () => void }
): Promise<void> => {
  return new Promise((resolve) => {
    const cleanup = () => {
      options?.onEnd?.();
      resolve();
    };

    if (!rawPhoneme) {
      cleanup();
      return;
    }

    const clean = rawPhoneme.replace(/[\/\[\]ˈˌ]/g, "").trim();
    let mapped =
      PHONEME_AUDIO_MAP[clean] ||
      PHONEME_AUDIO_MAP[clean.toLowerCase()] ||
      PHONEME_AUDIO_MAP[clean.replace("ː", "")] ||
      (clean.length === 1 ? PHONEME_AUDIO_MAP[clean] : undefined);

    if (!mapped) {
      const item = getPhonemeById(clean);
      if (item && item.id) {
        mapped =
          PHONEME_AUDIO_MAP[item.id] ||
          PHONEME_AUDIO_MAP[item.id.replace("ː", "")] ||
          PHONEME_AUDIO_MAP[item.slug];
      }
    }

    if (mapped) {
      const audioUrl = `/assets/phonetics-3d/audio/${encodeURIComponent(mapped)}.mp3`;
      const audio = new Audio(audioUrl);
      audio.onended = cleanup;
      audio.onerror = () => cleanup();
      audio.play().catch(() => cleanup());
    } else {
      cleanup();
    }
  });
};

export interface WordPhonemeBlock {
  token: string;
  symbol: string;
  item?: PhonemeItem;
}

// 单词自然拼读与音标积木拆解器 (支持从单词与 IPA 字符串精准解析为音标积木)
export const decomposeWordToPhonemes = (
  rawWord: string,
  rawIpa?: string
): WordPhonemeBlock[] => {
  const cleanWord = (rawWord || "").toLowerCase().replace(/[^a-z]/g, "");

  // 1. 如果有 IPA 字符串，按标准 IPA 音标符号优先贪婪解析
  if (rawIpa) {
    const cleanIpa = rawIpa.replace(/[\/\[\]ˈˌ'’"”\s.:\-]/g, "");
    if (cleanIpa) {
      const tokens: string[] = [];
      let i = 0;
      // 优先长串音标贪婪匹配
      const multiPatterns = [
        "tʃ", "dʒ", "eɪ", "aɪ", "oʊ", "əʊ", "ɔɪ", "aʊ",
        "iː", "uː", "ɔː", "ɑː", "ɜː", "i:", "u:", "o:", "a:", "e:",
        "ər", "ɜːr", "ɔːr", "ɑːr", "ɪə", "eə", "ʊə"
      ];

      while (i < cleanIpa.length) {
        let matched = false;
        for (const p of multiPatterns) {
          if (cleanIpa.startsWith(p, i)) {
            tokens.push(p);
            i += p.length;
            matched = true;
            break;
          }
        }
        if (!matched) {
          tokens.push(cleanIpa[i]);
          i += 1;
        }
      }

      if (tokens.length > 0) {
        return tokens
          .map((tok) => {
            const item = getPhonemeById(tok);
            return {
              token: tok,
              symbol: item ? item.symbol : `/${tok}/`,
              item,
            };
          })
          .filter((b) => Boolean(b.item) || /[a-z]/i.test(b.token));
      }
    }
  }

  // 2. 兜底策略：若无 IPA，根据高频自然拼读二合字母与单字母拆解
  if (!cleanWord) return [];
  const digraphs = [
    { p: "th", phoneme: "θ" },
    { p: "sh", phoneme: "ʃ" },
    { p: "ch", phoneme: "tʃ" },
    { p: "ph", phoneme: "f" },
    { p: "ck", phoneme: "k" },
    { p: "ee", phoneme: "iː" },
    { p: "ea", phoneme: "iː" },
    { p: "oo", phoneme: "uː" },
    { p: "ai", phoneme: "eɪ" },
    { p: "ay", phoneme: "eɪ" },
    { p: "ou", phoneme: "aʊ" },
    { p: "ow", phoneme: "aʊ" },
    { p: "oi", phoneme: "ɔɪ" },
    { p: "oy", phoneme: "ɔɪ" },
  ];

  const results: WordPhonemeBlock[] = [];
  let idx = 0;
  while (idx < cleanWord.length) {
    let matched = false;
    for (const dg of digraphs) {
      if (cleanWord.startsWith(dg.p, idx)) {
        const item = getPhonemeById(dg.phoneme);
        results.push({
          token: dg.phoneme,
          symbol: item ? item.symbol : `/${dg.phoneme}/`,
          item,
        });
        idx += dg.p.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const char = cleanWord[idx];
      const item = getPhonemeById(char);
      results.push({
        token: char,
        symbol: item ? item.symbol : `/${char}/`,
        item,
      });
      idx += 1;
    }
  }

  return results;
};

