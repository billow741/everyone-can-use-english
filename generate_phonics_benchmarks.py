# -*- coding: utf-8 -*-
import json
import re

# Comprehensive 3 benchmark words dictionary with phonics letter blocks for all 39 phonemes
BENCHMARK_WORDS_MAP = {
    "p": [
        {
            "word": "pen",
            "ipa": "/pen/",
            "translation": "钢笔",
            "phonicsSpell": "p - e - n",
            "rule": "辅音字母 p 在词首发清双唇塞音 /p/",
            "blocks": [
                {"letters": "p", "phoneme": "/p/", "isTarget": True},
                {"letters": "e", "phoneme": "/e/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "apple",
            "ipa": "/ˈæpl/",
            "translation": "苹果",
            "phonicsSpell": "a - pp - le",
            "rule": "双写字母 pp 发单个清塞音 /p/",
            "blocks": [
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "pp", "phoneme": "/p/", "isTarget": True},
                {"letters": "le", "phoneme": "/l/", "isTarget": False}
            ]
        },
        {
            "word": "cup",
            "ipa": "/kʌp/",
            "translation": "茶杯",
            "phonicsSpell": "c - u - p",
            "rule": "辅音字母 p 在词尾爆破停顿，发轻音 /p/",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "p", "phoneme": "/p/", "isTarget": True}
            ]
        }
    ],
    "b": [
        {
            "word": "book",
            "ipa": "/bʊk/",
            "translation": "书本",
            "phonicsSpell": "b - oo - k",
            "rule": "辅音字母 b 在词首发浊双唇塞音 /b/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": True},
                {"letters": "oo", "phoneme": "/ʊ/", "isTarget": False},
                {"letters": "k", "phoneme": "/k/", "isTarget": False}
            ]
        },
        {
            "word": "baby",
            "ipa": "/ˈbeɪbi/",
            "translation": "婴儿",
            "phonicsSpell": "b - a - b - y",
            "rule": "字母 b 双重出现，声带均需强劲振动",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": True},
                {"letters": "a", "phoneme": "/eɪ/", "isTarget": False},
                {"letters": "b", "phoneme": "/b/", "isTarget": True},
                {"letters": "y", "phoneme": "/i/", "isTarget": False}
            ]
        },
        {
            "word": "tub",
            "ipa": "/tʌb/",
            "translation": "浴缸",
            "phonicsSpell": "t - u - b",
            "rule": "字母 b 在词尾发微弱但清晰的浊塞音 /b/",
            "blocks": [
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "b", "phoneme": "/b/", "isTarget": True}
            ]
        }
    ],
    "t": [
        {
            "word": "tea",
            "ipa": "/tiː/",
            "translation": "茶",
            "phonicsSpell": "t - ea",
            "rule": "辅音字母 t 在词首发清齿龈爆破音 /t/",
            "blocks": [
                {"letters": "t", "phoneme": "/t/", "isTarget": True},
                {"letters": "ea", "phoneme": "/iː/", "isTarget": False}
            ]
        },
        {
            "word": "water",
            "ipa": "/ˈwɔːtər/",
            "translation": "水",
            "phonicsSpell": "w - a - t - er",
            "rule": "美音中字母 t 在两元音之间可闪音为轻弹音",
            "blocks": [
                {"letters": "w", "phoneme": "/w/", "isTarget": False},
                {"letters": "a", "phoneme": "/ɔː/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": True},
                {"letters": "er", "phoneme": "/ər/", "isTarget": False}
            ]
        },
        {
            "word": "cat",
            "ipa": "/kæt/",
            "translation": "猫",
            "phonicsSpell": "c - a - t",
            "rule": "词尾字母 t 舌尖抵上齿龈干脆停顿",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": True}
            ]
        }
    ],
    "d": [
        {
            "word": "dog",
            "ipa": "/dɔːɡ/",
            "translation": "狗",
            "phonicsSpell": "d - o - g",
            "rule": "辅音字母 d 在词首发浊齿龈爆破音 /d/",
            "blocks": [
                {"letters": "d", "phoneme": "/d/", "isTarget": True},
                {"letters": "o", "phoneme": "/ɔː/", "isTarget": False},
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False}
            ]
        },
        {
            "word": "duck",
            "ipa": "/dʌk/",
            "translation": "鸭子",
            "phonicsSpell": "d - u - ck",
            "rule": "首音字母 d 舌尖贴齿龈弹开，声带振动",
            "blocks": [
                {"letters": "d", "phoneme": "/d/", "isTarget": True},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "ck", "phoneme": "/k/", "isTarget": False}
            ]
        },
        {
            "word": "bed",
            "ipa": "/bed/",
            "translation": "床",
            "phonicsSpell": "b - e - d",
            "rule": "词尾字母 d 声带短促振动，利落收尾",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "e", "phoneme": "/e/", "isTarget": False},
                {"letters": "d", "phoneme": "/d/", "isTarget": True}
            ]
        }
    ],
    "k": [
        {
            "word": "cat",
            "ipa": "/kæt/",
            "translation": "猫咪",
            "phonicsSpell": "c - a - t",
            "rule": "字母 c 在 a, o, u 前发硬音 /k/",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": True},
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "kite",
            "ipa": "/kaɪt/",
            "translation": "风筝",
            "phonicsSpell": "k - i - te",
            "rule": "字母 k 在元音前直接对应清塞音 /k/",
            "blocks": [
                {"letters": "k", "phoneme": "/k/", "isTarget": True},
                {"letters": "i_e", "phoneme": "/aɪ/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "milk",
            "ipa": "/mɪlk/",
            "translation": "牛奶",
            "phonicsSpell": "m - i - l - k",
            "rule": "字母 k 在词尾舌根顶软腭送气爆破",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "l", "phoneme": "/l/", "isTarget": False},
                {"letters": "k", "phoneme": "/k/", "isTarget": True}
            ]
        }
    ],
    "g": [
        {
            "word": "go",
            "ipa": "/ɡoʊ/",
            "translation": "去",
            "phonicsSpell": "g - o",
            "rule": "字母 g 在词首发浊软腭爆破音 /ɡ/",
            "blocks": [
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": True},
                {"letters": "o", "phoneme": "/oʊ/", "isTarget": False}
            ]
        },
        {
            "word": "girl",
            "ipa": "/ɡɜːrl/",
            "translation": "女孩",
            "phonicsSpell": "g - ir - l",
            "rule": "字母 g 舌根顶软腭，声带低沉有力振动",
            "blocks": [
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": True},
                {"letters": "ir", "phoneme": "/ɜːr/", "isTarget": False},
                {"letters": "l", "phoneme": "/l/", "isTarget": False}
            ]
        },
        {
            "word": "bag",
            "ipa": "/bæɡ/",
            "translation": "包包",
            "phonicsSpell": "b - a - g",
            "rule": "字母 g 在词尾保持声带微颤，不脱落",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": True}
            ]
        }
    ],
    "f": [
        {
            "word": "fish",
            "ipa": "/fɪʃ/",
            "translation": "鱼",
            "phonicsSpell": "f - i - sh",
            "rule": "字母 f 在词首上门牙轻咬下唇送气 /f/",
            "blocks": [
                {"letters": "f", "phoneme": "/f/", "isTarget": True},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "sh", "phoneme": "/ʃ/", "isTarget": False}
            ]
        },
        {
            "word": "coffee",
            "ipa": "/ˈkɔːfi/",
            "translation": "咖啡",
            "phonicsSpell": "c - o - ff - ee",
            "rule": "双写字母 ff 发单个清唇齿摩擦音 /f/",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "o", "phoneme": "/ɔː/", "isTarget": False},
                {"letters": "ff", "phoneme": "/f/", "isTarget": True},
                {"letters": "ee", "phoneme": "/i/", "isTarget": False}
            ]
        },
        {
            "word": "leaf",
            "ipa": "/liːf/",
            "translation": "树叶",
            "phonicsSpell": "l - ea - f",
            "rule": "字母 f 在词尾持续平稳呼出丝丝气流",
            "blocks": [
                {"letters": "l", "phoneme": "/l/", "isTarget": False},
                {"letters": "ea", "phoneme": "/iː/", "isTarget": False},
                {"letters": "f", "phoneme": "/f/", "isTarget": True}
            ]
        }
    ],
    "v": [
        {
            "word": "van",
            "ipa": "/væn/",
            "translation": "面包车",
            "phonicsSpell": "v - a - n",
            "rule": "字母 v 在词首上齿咬下唇，声带强烈振颤",
            "blocks": [
                {"letters": "v", "phoneme": "/v/", "isTarget": True},
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "very",
            "ipa": "/ˈveri/",
            "translation": "非常",
            "phonicsSpell": "v - e - r - y",
            "rule": "首音发 /v/，绝不能用双唇撅圆发成 /w/",
            "blocks": [
                {"letters": "v", "phoneme": "/v/", "isTarget": True},
                {"letters": "e", "phoneme": "/e/", "isTarget": False},
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "y", "phoneme": "/i/", "isTarget": False}
            ]
        },
        {
            "word": "love",
            "ipa": "/lʌv/",
            "translation": "爱",
            "phonicsSpell": "l - o - ve",
            "rule": "字母组合 ve 在词尾发浊唇齿摩擦音 /v/",
            "blocks": [
                {"letters": "l", "phoneme": "/l/", "isTarget": False},
                {"letters": "o", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "ve", "phoneme": "/v/", "isTarget": True}
            ]
        }
    ],
    "θ": [
        {
            "word": "think",
            "ipa": "/θɪŋk/",
            "translation": "思考",
            "phonicsSpell": "th - i - nk",
            "rule": "字母组合 th 在实词词首发清咬舌音 /θ/",
            "blocks": [
                {"letters": "th", "phoneme": "/θ/", "isTarget": True},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "nk", "phoneme": "/ŋk/", "isTarget": False}
            ]
        },
        {
            "word": "three",
            "ipa": "/θriː/",
            "translation": "数字三",
            "phonicsSpell": "th - r - ee",
            "rule": "th 咬舌后紧跟卷舌音 r，舌位快速回缩",
            "blocks": [
                {"letters": "th", "phoneme": "/θ/", "isTarget": True},
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "ee", "phoneme": "/iː/", "isTarget": False}
            ]
        },
        {
            "word": "teeth",
            "ipa": "/tiːθ/",
            "translation": "牙齿",
            "phonicsSpell": "t - ee - th",
            "rule": "th 在词尾微探舌尖轻送气，声带绝对不振动",
            "blocks": [
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "ee", "phoneme": "/iː/", "isTarget": False},
                {"letters": "th", "phoneme": "/θ/", "isTarget": True}
            ]
        }
    ],
    "ð": [
        {
            "word": "this",
            "ipa": "/ðɪs/",
            "translation": "这一个",
            "phonicsSpell": "th - i - s",
            "rule": "字母组合 th 在代词词首发浊咬舌音 /ð/",
            "blocks": [
                {"letters": "th", "phoneme": "/ð/", "isTarget": True},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "s", "phoneme": "/s/", "isTarget": False}
            ]
        },
        {
            "word": "that",
            "ipa": "/ðæt/",
            "translation": "那一个",
            "phonicsSpell": "th - a - t",
            "rule": "舌尖微夹上下齿间，伴随喉部强烈振颤",
            "blocks": [
                {"letters": "th", "phoneme": "/ð/", "isTarget": True},
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "mother",
            "ipa": "/ˈmʌðər/",
            "translation": "妈妈",
            "phonicsSpell": "m - o - th - er",
            "rule": "字母组合 th 在词中发浊咬舌音 /ð/",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": False},
                {"letters": "o", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "th", "phoneme": "/ð/", "isTarget": True},
                {"letters": "er", "phoneme": "/ər/", "isTarget": False}
            ]
        }
    ],
    "s": [
        {
            "word": "sun",
            "ipa": "/sʌn/",
            "translation": "太阳",
            "phonicsSpell": "s - u - n",
            "rule": "字母 s 在词首吹出平稳清脆摩擦细风 /s/",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": True},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "see",
            "ipa": "/siː/",
            "translation": "看见",
            "phonicsSpell": "s - ee",
            "rule": "上下门牙微闭留细缝，气流经齿龈喷薄",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": True},
                {"letters": "ee", "phoneme": "/iː/", "isTarget": False}
            ]
        },
        {
            "word": "bus",
            "ipa": "/bʌs/",
            "translation": "公交车",
            "phonicsSpell": "b - u - s",
            "rule": "字母 s 在清辅音或短元音后发清辅音 /s/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "s", "phoneme": "/s/", "isTarget": True}
            ]
        }
    ],
    "z": [
        {
            "word": "zoo",
            "ipa": "/zuː/",
            "translation": "动物园",
            "phonicsSpell": "z - oo",
            "rule": "字母 z 在词首如小蜜蜂嗡嗡振颤 /z/",
            "blocks": [
                {"letters": "z", "phoneme": "/z/", "isTarget": True},
                {"letters": "oo", "phoneme": "/uː/", "isTarget": False}
            ]
        },
        {
            "word": "buzz",
            "ipa": "/bʌz/",
            "translation": "嗡嗡声",
            "phonicsSpell": "b - u - zz",
            "rule": "双写 zz 保持强烈声带振颤，发浊擦音 /z/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "zz", "phoneme": "/z/", "isTarget": True}
            ]
        },
        {
            "word": "nose",
            "ipa": "/noʊz/",
            "translation": "鼻子",
            "phonicsSpell": "n - o - se",
            "rule": "字母 s 在两元音之间通常浊化为 /z/",
            "blocks": [
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "o", "phoneme": "/oʊ/", "isTarget": False},
                {"letters": "se", "phoneme": "/z/", "isTarget": True}
            ]
        }
    ],
    "ʃ": [
        {
            "word": "ship",
            "ipa": "/ʃɪp/",
            "translation": "轮船",
            "phonicsSpell": "sh - i - p",
            "rule": "字母组合 sh 永远对应嘘擦音 /ʃ/",
            "blocks": [
                {"letters": "sh", "phoneme": "/ʃ/", "isTarget": True},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "p", "phoneme": "/p/", "isTarget": False}
            ]
        },
        {
            "word": "she",
            "ipa": "/ʃiː/",
            "translation": "她",
            "phonicsSpell": "sh - e",
            "rule": "双唇向前收拢突出微翘，呼出厚重嘘气",
            "blocks": [
                {"letters": "sh", "phoneme": "/ʃ/", "isTarget": True},
                {"letters": "e", "phoneme": "/iː/", "isTarget": False}
            ]
        },
        {
            "word": "fish",
            "ipa": "/fɪʃ/",
            "translation": "小鱼",
            "phonicsSpell": "f - i - sh",
            "rule": "字母组合 sh 在词尾气流持久饱满",
            "blocks": [
                {"letters": "f", "phoneme": "/f/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "sh", "phoneme": "/ʃ/", "isTarget": True}
            ]
        }
    ],
    "h": [
        {
            "word": "hat",
            "ipa": "/hæt/",
            "translation": "帽子",
            "phonicsSpell": "h - a - t",
            "rule": "字母 h 在词首从声门呼出深吸哈气 /h/",
            "blocks": [
                {"letters": "h", "phoneme": "/h/", "isTarget": True},
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "hot",
            "ipa": "/hɑːt/",
            "translation": "热的",
            "phonicsSpell": "h - o - t",
            "rule": "口腔自然大开，声带完全不振动",
            "blocks": [
                {"letters": "h", "phoneme": "/h/", "isTarget": True},
                {"letters": "o", "phoneme": "/ɑː/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "home",
            "ipa": "/hoʊm/",
            "translation": "家",
            "phonicsSpell": "h - o - me",
            "rule": "轻柔哈气，顺滑过渡至随后的元音",
            "blocks": [
                {"letters": "h", "phoneme": "/h/", "isTarget": True},
                {"letters": "o_e", "phoneme": "/oʊ/", "isTarget": False},
                {"letters": "m", "phoneme": "/m/", "isTarget": False}
            ]
        }
    ],
    "tʃ": [
        {
            "word": "chair",
            "ipa": "/tʃer/",
            "translation": "椅子",
            "phonicsSpell": "ch - air",
            "rule": "字母组合 ch 在词首发清破擦音 /tʃ/",
            "blocks": [
                {"letters": "ch", "phoneme": "/tʃ/", "isTarget": True},
                {"letters": "air", "phoneme": "/er/", "isTarget": False}
            ]
        },
        {
            "word": "teacher",
            "ipa": "/ˈtiːtʃər/",
            "translation": "老师",
            "phonicsSpell": "t - ea - ch - er",
            "rule": "先闭气爆破再瞬间摩擦喷出，一气呵成",
            "blocks": [
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "ea", "phoneme": "/iː/", "isTarget": False},
                {"letters": "ch", "phoneme": "/tʃ/", "isTarget": True},
                {"letters": "er", "phoneme": "/ər/", "isTarget": False}
            ]
        },
        {
            "word": "watch",
            "ipa": "/wɑːtʃ/",
            "translation": "手表",
            "phonicsSpell": "w - a - tch",
            "rule": "字母组合 tch 在短元音后发清破擦音 /tʃ/",
            "blocks": [
                {"letters": "w", "phoneme": "/w/", "isTarget": False},
                {"letters": "a", "phoneme": "/ɑː/", "isTarget": False},
                {"letters": "tch", "phoneme": "/tʃ/", "isTarget": True}
            ]
        }
    ],
    "dʒ": [
        {
            "word": "jump",
            "ipa": "/dʒʌmp/",
            "translation": "跳跃",
            "phonicsSpell": "j - u - m - p",
            "rule": "字母 j 在词首对应浊破擦音 /dʒ/",
            "blocks": [
                {"letters": "j", "phoneme": "/dʒ/", "isTarget": True},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "m", "phoneme": "/m/", "isTarget": False},
                {"letters": "p", "phoneme": "/p/", "isTarget": False}
            ]
        },
        {
            "word": "job",
            "ipa": "/dʒɑːb/",
            "translation": "工作",
            "phonicsSpell": "j - o - b",
            "rule": "舌尖贴齿龈爆破伴随声带强劲振颤",
            "blocks": [
                {"letters": "j", "phoneme": "/dʒ/", "isTarget": True},
                {"letters": "o", "phoneme": "/ɑː/", "isTarget": False},
                {"letters": "b", "phoneme": "/b/", "isTarget": False}
            ]
        },
        {
            "word": "orange",
            "ipa": "/ˈɔːrɪndʒ/",
            "translation": "橙子",
            "phonicsSpell": "o - r - a - n - ge",
            "rule": "词尾 ge 组合发浊破擦音 /dʒ/",
            "blocks": [
                {"letters": "o", "phoneme": "/ɔː/", "isTarget": False},
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "a", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "ge", "phoneme": "/dʒ/", "isTarget": True}
            ]
        }
    ],
    "m": [
        {
            "word": "moon",
            "ipa": "/muːn/",
            "translation": "月亮",
            "phonicsSpell": "m - oo - n",
            "rule": "字母 m 在词首双唇紧闭，气流从鼻腔送出",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": True},
                {"letters": "oo", "phoneme": "/uː/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "mom",
            "ipa": "/mɑːm/",
            "translation": "妈妈",
            "phonicsSpell": "m - o - m",
            "rule": "首尾双重 m，闭唇鼻音饱满共鸣",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": True},
                {"letters": "o", "phoneme": "/ɑː/", "isTarget": False},
                {"letters": "m", "phoneme": "/m/", "isTarget": True}
            ]
        },
        {
            "word": "milk",
            "ipa": "/mɪlk/",
            "translation": "牛奶",
            "phonicsSpell": "m - i - l - k",
            "rule": "声带持续振颤，鼻音共鸣丰沛",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": True},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "l", "phoneme": "/l/", "isTarget": False},
                {"letters": "k", "phoneme": "/k/", "isTarget": False}
            ]
        }
    ],
    "n": [
        {
            "word": "nose",
            "ipa": "/noʊz/",
            "translation": "鼻子",
            "phonicsSpell": "n - o - se",
            "rule": "字母 n 舌尖紧抵上牙龈，气流由鼻孔流出",
            "blocks": [
                {"letters": "n", "phoneme": "/n/", "isTarget": True},
                {"letters": "o_e", "phoneme": "/oʊ/", "isTarget": False},
                {"letters": "s", "phoneme": "/z/", "isTarget": False}
            ]
        },
        {
            "word": "nut",
            "ipa": "/nʌt/",
            "translation": "坚果",
            "phonicsSpell": "n - u - t",
            "rule": "舌尖贴紧上齿龈不漏气，发前鼻辅音 /n/",
            "blocks": [
                {"letters": "n", "phoneme": "/n/", "isTarget": True},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "sun",
            "ipa": "/sʌn/",
            "translation": "太阳",
            "phonicsSpell": "s - u - n",
            "rule": "字母 n 在词尾舌尖稳固停在上牙龈",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": True}
            ]
        }
    ],
    "ŋ": [
        {
            "word": "sing",
            "ipa": "/sɪŋ/",
            "translation": "歌唱",
            "phonicsSpell": "s - i - ng",
            "rule": "字母组合 ng 在词尾发软腭后鼻音 /ŋ/",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "ng", "phoneme": "/ŋ/", "isTarget": True}
            ]
        },
        {
            "word": "ring",
            "ipa": "/rɪŋ/",
            "translation": "戒指",
            "phonicsSpell": "r - i - ng",
            "rule": "舌后部高抬封死口腔，气流完全经后鼻腔共鸣",
            "blocks": [
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "ng", "phoneme": "/ŋ/", "isTarget": True}
            ]
        },
        {
            "word": "morning",
            "ipa": "/ˈmɔːrnɪŋ/",
            "translation": "早晨",
            "phonicsSpell": "m - or - n - i - ng",
            "rule": "词尾 ing 后鼻音清透饱满，声带持久振动",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": False},
                {"letters": "or", "phoneme": "/ɔːr/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "ng", "phoneme": "/ŋ/", "isTarget": True}
            ]
        }
    ],
    "l": [
        {
            "word": "light",
            "ipa": "/laɪt/",
            "translation": "光芒 / 轻便",
            "phonicsSpell": "l - igh - t",
            "rule": "字母 l 在词首发清晰舌侧音 (Clear L)",
            "blocks": [
                {"letters": "l", "phoneme": "/l/", "isTarget": True},
                {"letters": "igh", "phoneme": "/aɪ/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "life",
            "ipa": "/laɪf/",
            "translation": "生活 / 生命",
            "phonicsSpell": "l - i - fe",
            "rule": "舌尖紧抵上齿龈，气流由舌体两侧顺滑流出",
            "blocks": [
                {"letters": "l", "phoneme": "/l/", "isTarget": True},
                {"letters": "i_e", "phoneme": "/aɪ/", "isTarget": False},
                {"letters": "f", "phoneme": "/f/", "isTarget": False}
            ]
        },
        {
            "word": "apple",
            "ipa": "/ˈæpl/",
            "translation": "苹果",
            "phonicsSpell": "a - pp - le",
            "rule": "le 组合在词尾发暗辅音 (Dark L)，舌后部微翘",
            "blocks": [
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "pp", "phoneme": "/p/", "isTarget": False},
                {"letters": "le", "phoneme": "/l/", "isTarget": True}
            ]
        }
    ],
    "r": [
        {
            "word": "red",
            "ipa": "/red/",
            "translation": "红色",
            "phonicsSpell": "r - e - d",
            "rule": "字母 r 在词首舌尖向上卷起悬空，绝不碰上腭",
            "blocks": [
                {"letters": "r", "phoneme": "/r/", "isTarget": True},
                {"letters": "e", "phoneme": "/e/", "isTarget": False},
                {"letters": "d", "phoneme": "/d/", "isTarget": False}
            ]
        },
        {
            "word": "run",
            "ipa": "/rʌn/",
            "translation": "奔跑",
            "phonicsSpell": "r - u - n",
            "rule": "双唇向前收圆突出，声带振动发出引擎轰鸣",
            "blocks": [
                {"letters": "r", "phoneme": "/r/", "isTarget": True},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "tree",
            "ipa": "/triː/",
            "translation": "大树",
            "phonicsSpell": "t - r - ee",
            "rule": "辅音丛 tr 中快速由爆破音滑动至卷舌音",
            "blocks": [
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "r", "phoneme": "/r/", "isTarget": True},
                {"letters": "ee", "phoneme": "/iː/", "isTarget": False}
            ]
        }
    ],
    "w": [
        {
            "word": "water",
            "ipa": "/ˈwɔːtər/",
            "translation": "水",
            "phonicsSpell": "w - a - t - er",
            "rule": "字母 w 在词首双唇极度收圆突出为小吸管口",
            "blocks": [
                {"letters": "w", "phoneme": "/w/", "isTarget": True},
                {"letters": "a", "phoneme": "/ɔː/", "isTarget": False},
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "er", "phoneme": "/ər/", "isTarget": False}
            ]
        },
        {
            "word": "we",
            "ipa": "/wiː/",
            "translation": "我们",
            "phonicsSpell": "w - e",
            "rule": "由收圆迅速向平展长元音 /iː/ 滑开",
            "blocks": [
                {"letters": "w", "phoneme": "/w/", "isTarget": True},
                {"letters": "e", "phoneme": "/iː/", "isTarget": False}
            ]
        },
        {
            "word": "win",
            "ipa": "/wɪn/",
            "translation": "获胜",
            "phonicsSpell": "w - i - n",
            "rule": "声带强力振颤并平滑过渡，严禁上齿咬唇",
            "blocks": [
                {"letters": "w", "phoneme": "/w/", "isTarget": True},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        }
    ],
    "j": [
        {
            "word": "you",
            "ipa": "/juː/",
            "translation": "你",
            "phonicsSpell": "y - ou",
            "rule": "字母 y 在词首发硬腭半元音 /j/",
            "blocks": [
                {"letters": "y", "phoneme": "/j/", "isTarget": True},
                {"letters": "ou", "phoneme": "/uː/", "isTarget": False}
            ]
        },
        {
            "word": "yes",
            "ipa": "/jes/",
            "translation": "是的",
            "phonicsSpell": "y - e - s",
            "rule": "嘴角微笑平拉，舌面贴硬腭滑出发音",
            "blocks": [
                {"letters": "y", "phoneme": "/j/", "isTarget": True},
                {"letters": "e", "phoneme": "/e/", "isTarget": False},
                {"letters": "s", "phoneme": "/s/", "isTarget": False}
            ]
        },
        {
            "word": "yellow",
            "ipa": "/ˈjeloʊ/",
            "translation": "黄色",
            "phonicsSpell": "y - ell - ow",
            "rule": "短促有力的起音滑音，声带持续共振",
            "blocks": [
                {"letters": "y", "phoneme": "/j/", "isTarget": True},
                {"letters": "ell", "phoneme": "/el/", "isTarget": False},
                {"letters": "ow", "phoneme": "/oʊ/", "isTarget": False}
            ]
        }
    ],
    "iː": [
        {
            "word": "tree",
            "ipa": "/triː/",
            "translation": "大树",
            "phonicsSpell": "t - r - ee",
            "rule": "字母组合 ee 稳定发饱满长元音 /iː/",
            "blocks": [
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "ee", "phoneme": "/iː/", "isTarget": True}
            ]
        },
        {
            "word": "see",
            "ipa": "/siː/",
            "translation": "看见",
            "phonicsSpell": "s - ee",
            "rule": "嘴角两侧平拉至最大极限，如微笑喊'茄子'",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": False},
                {"letters": "ee", "phoneme": "/iː/", "isTarget": True}
            ]
        },
        {
            "word": "green",
            "ipa": "/ɡriːn/",
            "translation": "绿色",
            "phonicsSpell": "g - r - ee - n",
            "rule": "发音清亮持久，注意与短元音 /ɪ/ 区分",
            "blocks": [
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False},
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "ee", "phoneme": "/iː/", "isTarget": True},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        }
    ],
    "ɪ": [
        {
            "word": "sit",
            "ipa": "/sɪt/",
            "translation": "坐下",
            "phonicsSpell": "s - i - t",
            "rule": "闭音节中单字母 i 发短前元音 /ɪ/",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": True},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "big",
            "ipa": "/bɪɡ/",
            "translation": "巨大的",
            "phonicsSpell": "b - i - g",
            "rule": "嘴角自然放松，发音短促利落，绝不拖长",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": True},
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False}
            ]
        },
        {
            "word": "fish",
            "ipa": "/fɪʃ/",
            "translation": "鱼",
            "phonicsSpell": "f - i - sh",
            "rule": "舌尖轻触下齿龈，介于汉语'一'与'哎'之间",
            "blocks": [
                {"letters": "f", "phoneme": "/f/", "isTarget": False},
                {"letters": "i", "phoneme": "/ɪ/", "isTarget": True},
                {"letters": "sh", "phoneme": "/ʃ/", "isTarget": False}
            ]
        }
    ],
    "ɛ": [
        {
            "word": "bed",
            "ipa": "/bed/",
            "translation": "床铺",
            "phonicsSpell": "b - e - d",
            "rule": "闭音节中单字母 e 发前短元音 /ɛ/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "e", "phoneme": "/e/", "isTarget": True},
                {"letters": "d", "phoneme": "/d/", "isTarget": False}
            ]
        },
        {
            "word": "pen",
            "ipa": "/pen/",
            "translation": "钢笔",
            "phonicsSpell": "p - e - n",
            "rule": "上下唇微开约一指宽，短促清脆",
            "blocks": [
                {"letters": "p", "phoneme": "/p/", "isTarget": False},
                {"letters": "e", "phoneme": "/e/", "isTarget": True},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "red",
            "ipa": "/red/",
            "translation": "红色",
            "phonicsSpell": "r - e - d",
            "rule": "舌前部轻微隆起，避免开口过大变成梅花音",
            "blocks": [
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "e", "phoneme": "/e/", "isTarget": True},
                {"letters": "d", "phoneme": "/d/", "isTarget": False}
            ]
        }
    ],
    "æ": [
        {
            "word": "apple",
            "ipa": "/ˈæpl/",
            "translation": "苹果",
            "phonicsSpell": "a - pp - le",
            "rule": "闭音节中单字母 a 发经典梅花大口音 /æ/",
            "blocks": [
                {"letters": "a", "phoneme": "/æ/", "isTarget": True},
                {"letters": "pp", "phoneme": "/p/", "isTarget": False},
                {"letters": "le", "phoneme": "/l/", "isTarget": False}
            ]
        },
        {
            "word": "cat",
            "ipa": "/kæt/",
            "translation": "猫咪",
            "phonicsSpell": "c - a - t",
            "rule": "下巴大张两指宽，嘴角同时向两侧尽力张开",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "a", "phoneme": "/æ/", "isTarget": True},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "hat",
            "ipa": "/hæt/",
            "translation": "帽子",
            "phonicsSpell": "h - a - t",
            "rule": "舌面压平，声音饱满夸张，如同医生检查喉咙",
            "blocks": [
                {"letters": "h", "phoneme": "/h/", "isTarget": False},
                {"letters": "a", "phoneme": "/æ/", "isTarget": True},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        }
    ],
    "ɑ": [
        {
            "word": "hot",
            "ipa": "/hɑːt/",
            "translation": "热的",
            "phonicsSpell": "h - o - t",
            "rule": "美音中字母 o 在很多开音节发后开长音 /ɑː/",
            "blocks": [
                {"letters": "h", "phoneme": "/h/", "isTarget": False},
                {"letters": "o", "phoneme": "/ɑː/", "isTarget": True},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "father",
            "ipa": "/ˈfɑːðər/",
            "translation": "父亲",
            "phonicsSpell": "f - a - th - er",
            "rule": "下巴彻底放松下沉，舌身平放于口腔底部",
            "blocks": [
                {"letters": "f", "phoneme": "/f/", "isTarget": False},
                {"letters": "a", "phoneme": "/ɑː/", "isTarget": True},
                {"letters": "th", "phoneme": "/ð/", "isTarget": False},
                {"letters": "er", "phoneme": "/ər/", "isTarget": False}
            ]
        },
        {
            "word": "car",
            "ipa": "/kɑːr/",
            "translation": "汽车",
            "phonicsSpell": "c - ar",
            "rule": "字母组合 ar 发深沉宏亮的长元音加卷舌",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "ar", "phoneme": "/ɑːr/", "isTarget": True}
            ]
        }
    ],
    "ɔ": [
        {
            "word": "water",
            "ipa": "/ˈwɔːtər/",
            "translation": "水",
            "phonicsSpell": "w - a - t - er",
            "rule": "字母 a 在 w 之后常发长圆唇元音 /ɔː/",
            "blocks": [
                {"letters": "w", "phoneme": "/w/", "isTarget": False},
                {"letters": "a", "phoneme": "/ɔː/", "isTarget": True},
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "er", "phoneme": "/ər/", "isTarget": False}
            ]
        },
        {
            "word": "dog",
            "ipa": "/dɔːɡ/",
            "translation": "狗狗",
            "phonicsSpell": "d - o - g",
            "rule": "双唇用力向前拢圆，发出浑厚深沉的后长音",
            "blocks": [
                {"letters": "d", "phoneme": "/d/", "isTarget": False},
                {"letters": "o", "phoneme": "/ɔː/", "isTarget": True},
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False}
            ]
        },
        {
            "word": "door",
            "ipa": "/dɔːr/",
            "translation": "大门",
            "phonicsSpell": "d - oor",
            "rule": "字母组合 oor 发饱满圆唇音 /ɔːr/",
            "blocks": [
                {"letters": "d", "phoneme": "/d/", "isTarget": False},
                {"letters": "oor", "phoneme": "/ɔːr/", "isTarget": True}
            ]
        }
    ],
    "ʊ": [
        {
            "word": "book",
            "ipa": "/bʊk/",
            "translation": "书本",
            "phonicsSpell": "b - oo - k",
            "rule": "字母组合 oo 在 k 前常发短圆唇音 /ʊ/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "oo", "phoneme": "/ʊ/", "isTarget": True},
                {"letters": "k", "phoneme": "/k/", "isTarget": False}
            ]
        },
        {
            "word": "look",
            "ipa": "/lʊk/",
            "translation": "注视",
            "phonicsSpell": "l - oo - k",
            "rule": "双唇微收圆自然放松，短促有力收尾",
            "blocks": [
                {"letters": "l", "phoneme": "/l/", "isTarget": False},
                {"letters": "oo", "phoneme": "/ʊ/", "isTarget": True},
                {"letters": "k", "phoneme": "/k/", "isTarget": False}
            ]
        },
        {
            "word": "good",
            "ipa": "/ɡʊd/",
            "translation": "好极了",
            "phonicsSpell": "g - oo - d",
            "rule": "介于汉语'乌'与'欧'之间，切忌过长",
            "blocks": [
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False},
                {"letters": "oo", "phoneme": "/ʊ/", "isTarget": True},
                {"letters": "d", "phoneme": "/d/", "isTarget": False}
            ]
        }
    ],
    "uː": [
        {
            "word": "moon",
            "ipa": "/muːn/",
            "translation": "月亮",
            "phonicsSpell": "m - oo - n",
            "rule": "字母组合 oo 发长圆唇元音 /uː/",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": False},
                {"letters": "oo", "phoneme": "/uː/", "isTarget": True},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "blue",
            "ipa": "/bluː/",
            "translation": "蓝色",
            "phonicsSpell": "bl - ue",
            "rule": "字母组合 ue 发长圆唇音 /uː/",
            "blocks": [
                {"letters": "bl", "phoneme": "/bl/", "isTarget": False},
                {"letters": "ue", "phoneme": "/uː/", "isTarget": True}
            ]
        },
        {
            "word": "room",
            "ipa": "/ruːm/",
            "translation": "房间",
            "phonicsSpell": "r - oo - m",
            "rule": "双唇收至最小圆孔并用力突出，声音持久清亮",
            "blocks": [
                {"letters": "r", "phoneme": "/r/", "isTarget": False},
                {"letters": "oo", "phoneme": "/uː/", "isTarget": True},
                {"letters": "m", "phoneme": "/m/", "isTarget": False}
            ]
        }
    ],
    "ʌ": [
        {
            "word": "cup",
            "ipa": "/kʌp/",
            "translation": "茶杯",
            "phonicsSpell": "c - u - p",
            "rule": "单字母 u 在闭音节中发中短元音 /ʌ/",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": True},
                {"letters": "p", "phoneme": "/p/", "isTarget": False}
            ]
        },
        {
            "word": "sun",
            "ipa": "/sʌn/",
            "translation": "太阳",
            "phonicsSpell": "s - u - n",
            "rule": "下巴中度下沉约一指半，声音干脆从喉间爆发",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": True},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        },
        {
            "word": "duck",
            "ipa": "/dʌk/",
            "translation": "鸭子",
            "phonicsSpell": "d - u - ck",
            "rule": "舌中部微抬，双唇放松不撅圆",
            "blocks": [
                {"letters": "d", "phoneme": "/d/", "isTarget": False},
                {"letters": "u", "phoneme": "/ʌ/", "isTarget": True},
                {"letters": "ck", "phoneme": "/k/", "isTarget": False}
            ]
        }
    ],
    "ɜ": [
        {
            "word": "bird",
            "ipa": "/bɜːrd/",
            "translation": "小鸟",
            "phonicsSpell": "b - ir - d",
            "rule": "字母组合 ir 在重读音节中发长卷舌元音 /ɜːr/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "ir", "phoneme": "/ɜːr/", "isTarget": True},
                {"letters": "d", "phoneme": "/d/", "isTarget": False}
            ]
        },
        {
            "word": "girl",
            "ipa": "/ɡɜːrl/",
            "translation": "女孩",
            "phonicsSpell": "g - ir - l",
            "rule": "舌身微抬、舌尖悬空上卷，保持舌根收紧振颤",
            "blocks": [
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False},
                {"letters": "ir", "phoneme": "/ɜːr/", "isTarget": True},
                {"letters": "l", "phoneme": "/l/", "isTarget": False}
            ]
        },
        {
            "word": "nurse",
            "ipa": "/nɜːrs/",
            "translation": "护士",
            "phonicsSpell": "n - ur - se",
            "rule": "字母组合 ur 对应浑厚持久的卷舌长音",
            "blocks": [
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "ur", "phoneme": "/ɜːr/", "isTarget": True},
                {"letters": "se", "phoneme": "/s/", "isTarget": False}
            ]
        }
    ],
    "ə": [
        {
            "word": "ago",
            "ipa": "/əˈɡoʊ/",
            "translation": "以前",
            "phonicsSpell": "a - g - o",
            "rule": "非重读音节中单字母 a 弱读为施瓦音 /ə/",
            "blocks": [
                {"letters": "a", "phoneme": "/ə/", "isTarget": True},
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False},
                {"letters": "o", "phoneme": "/oʊ/", "isTarget": False}
            ]
        },
        {
            "word": "banana",
            "ipa": "/bəˈnænə/",
            "translation": "香蕉",
            "phonicsSpell": "b - a - n - a - n - a",
            "rule": "首尾 a 均处非重读音节，极度轻柔放松",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "a", "phoneme": "/ə/", "isTarget": True},
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "a", "phoneme": "/æ/", "isTarget": False},
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "a", "phoneme": "/ə/", "isTarget": True}
            ]
        },
        {
            "word": "sofa",
            "ipa": "/ˈsoʊfə/",
            "translation": "沙发",
            "phonicsSpell": "s - o - f - a",
            "rule": "词尾字母 a 弱化为最短促的中央元音",
            "blocks": [
                {"letters": "s", "phoneme": "/s/", "isTarget": False},
                {"letters": "o", "phoneme": "/oʊ/", "isTarget": False},
                {"letters": "f", "phoneme": "/f/", "isTarget": False},
                {"letters": "a", "phoneme": "/ə/", "isTarget": True}
            ]
        }
    ],
    "eɪ": [
        {
            "word": "day",
            "ipa": "/deɪ/",
            "translation": "日子",
            "phonicsSpell": "d - ay",
            "rule": "字母组合 ay 在词尾发合口双元音 /eɪ/",
            "blocks": [
                {"letters": "d", "phoneme": "/d/", "isTarget": False},
                {"letters": "ay", "phoneme": "/eɪ/", "isTarget": True}
            ]
        },
        {
            "word": "play",
            "ipa": "/pleɪ/",
            "translation": "玩耍",
            "phonicsSpell": "pl - ay",
            "rule": "由半开元音 /e/ 顺滑滑动到前高元音 /ɪ/",
            "blocks": [
                {"letters": "pl", "phoneme": "/pl/", "isTarget": False},
                {"letters": "ay", "phoneme": "/eɪ/", "isTarget": True}
            ]
        },
        {
            "word": "cake",
            "ipa": "/keɪk/",
            "translation": "蛋糕",
            "phonicsSpell": "c - a - ke",
            "rule": "相对开音节 a_e 结构发字母本音 /eɪ/",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "a_e", "phoneme": "/eɪ/", "isTarget": True},
                {"letters": "k", "phoneme": "/k/", "isTarget": False}
            ]
        }
    ],
    "aɪ": [
        {
            "word": "nice",
            "ipa": "/naɪs/",
            "translation": "美好的",
            "phonicsSpell": "n - i - ce",
            "rule": "开音节中 i_e 结构发开双元音 /aɪ/",
            "blocks": [
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "i_e", "phoneme": "/aɪ/", "isTarget": True},
                {"letters": "ce", "phoneme": "/s/", "isTarget": False}
            ]
        },
        {
            "word": "kite",
            "ipa": "/kaɪt/",
            "translation": "风筝",
            "phonicsSpell": "k - i - te",
            "rule": "大开口由后开元音 /a/ 快速滑向微展音 /ɪ/",
            "blocks": [
                {"letters": "k", "phoneme": "/k/", "isTarget": False},
                {"letters": "i_e", "phoneme": "/aɪ/", "isTarget": True},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        },
        {
            "word": "my",
            "ipa": "/maɪ/",
            "translation": "我的",
            "phonicsSpell": "m - y",
            "rule": "单音节词尾字母 y 发双元音 /aɪ/",
            "blocks": [
                {"letters": "m", "phoneme": "/m/", "isTarget": False},
                {"letters": "y", "phoneme": "/aɪ/", "isTarget": True}
            ]
        }
    ],
    "oʊ": [
        {
            "word": "home",
            "ipa": "/hoʊm/",
            "translation": "家",
            "phonicsSpell": "h - o - me",
            "rule": "开音节 o_e 结构发后合双元音 /oʊ/",
            "blocks": [
                {"letters": "h", "phoneme": "/h/", "isTarget": False},
                {"letters": "o_e", "phoneme": "/oʊ/", "isTarget": True},
                {"letters": "m", "phoneme": "/m/", "isTarget": False}
            ]
        },
        {
            "word": "go",
            "ipa": "/ɡoʊ/",
            "translation": "出发",
            "phonicsSpell": "g - o",
            "rule": "单字母 o 在绝对开音节词尾发 /oʊ/",
            "blocks": [
                {"letters": "g", "phoneme": "/ɡ/", "isTarget": False},
                {"letters": "o", "phoneme": "/oʊ/", "isTarget": True}
            ]
        },
        {
            "word": "boat",
            "ipa": "/boʊt/",
            "translation": "小船",
            "phonicsSpell": "b - oa - t",
            "rule": "字母组合 oa 稳定发后合双元音 /oʊ/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "oa", "phoneme": "/oʊ/", "isTarget": True},
                {"letters": "t", "phoneme": "/t/", "isTarget": False}
            ]
        }
    ],
    "ɔɪ": [
        {
            "word": "boy",
            "ipa": "/bɔɪ/",
            "translation": "男孩",
            "phonicsSpell": "b - oy",
            "rule": "字母组合 oy 在词尾发圆展双元音 /ɔɪ/",
            "blocks": [
                {"letters": "b", "phoneme": "/b/", "isTarget": False},
                {"letters": "oy", "phoneme": "/ɔɪ/", "isTarget": True}
            ]
        },
        {
            "word": "toy",
            "ipa": "/tɔɪ/",
            "translation": "玩具",
            "phonicsSpell": "t - oy",
            "rule": "嘴唇由极度收圆向前，顺畅滑动至平展微咧",
            "blocks": [
                {"letters": "t", "phoneme": "/t/", "isTarget": False},
                {"letters": "oy", "phoneme": "/ɔɪ/", "isTarget": True}
            ]
        },
        {
            "word": "coin",
            "ipa": "/kɔɪn/",
            "translation": "硬币",
            "phonicsSpell": "c - oi - n",
            "rule": "字母组合 oi 在词中发双元音 /ɔɪ/",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "oi", "phoneme": "/ɔɪ/", "isTarget": True},
                {"letters": "n", "phoneme": "/n/", "isTarget": False}
            ]
        }
    ],
    "aʊ": [
        {
            "word": "cow",
            "ipa": "/kaʊ/",
            "translation": "奶牛",
            "phonicsSpell": "c - ow",
            "rule": "字母组合 ow 在词尾发合口双元音 /aʊ/",
            "blocks": [
                {"letters": "c", "phoneme": "/k/", "isTarget": False},
                {"letters": "ow", "phoneme": "/aʊ/", "isTarget": True}
            ]
        },
        {
            "word": "house",
            "ipa": "/haʊs/",
            "translation": "房屋",
            "phonicsSpell": "h - ou - se",
            "rule": "字母组合 ou 在词中发合口双元音 /aʊ/",
            "blocks": [
                {"letters": "h", "phoneme": "/h/", "isTarget": False},
                {"letters": "ou", "phoneme": "/aʊ/", "isTarget": True},
                {"letters": "se", "phoneme": "/s/", "isTarget": False}
            ]
        },
        {
            "word": "now",
            "ipa": "/naʊ/",
            "translation": "现在",
            "phonicsSpell": "n - ow",
            "rule": "由大开后音 /a/ 快速收小撅圆滑向 /ʊ/",
            "blocks": [
                {"letters": "n", "phoneme": "/n/", "isTarget": False},
                {"letters": "ow", "phoneme": "/aʊ/", "isTarget": True}
            ]
        }
    ]
}

# Update enjoy/src/renderer/lib/phoneme-data.ts
data_path = "enjoy/src/renderer/lib/phoneme-data.ts"
with open(data_path, "r", encoding="utf-8") as f:
    content = f.read()

prefix = "export const ALL_39_PHONEMES: PhonemeItem[] = "
suffix = ";\n\n// 辅助索引字典"
start_idx = content.find(prefix)
if start_idx == -1:
    print("Error: Could not locate prefix in phoneme-data.ts!")
    exit(1)
start_idx += len(prefix)

end_idx = content.find(suffix, start_idx)
if end_idx == -1:
    print("Error: Could not locate suffix in phoneme-data.ts!")
    exit(1)

json_text = content[start_idx:end_idx]
phonemes_list = json.loads(json_text)

for item in phonemes_list:
    pid = item["id"]
    benchmarks = BENCHMARK_WORDS_MAP.get(pid, [
        {
            "word": item["sampleWord"],
            "ipa": item["wordIpa"],
            "translation": "核心示范词",
            "phonicsSpell": item["phonicsSpell"],
            "rule": f"示范词 {item['sampleWord']} 中包含核心音标 {item['symbol']}",
            "blocks": [{"letters": item["sampleWord"], "phoneme": item["symbol"], "isTarget": True}]
        }
    ])
    item["benchmarkWords"] = benchmarks

# Update interface and data
new_interface = """export interface PhonicsBlock {
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
}"""

new_json_str = json.dumps(phonemes_list, ensure_ascii=False, indent=2)
content = content[:start_idx] + new_json_str + content[end_idx:]
content = re.sub(r"export interface PhonemeItem \{[\s\S]+?\}\n", new_interface + "\n", content, count=1)

with open(data_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully injected 3 Phonics Benchmark Words for all {len(phonemes_list)} phonemes!")
