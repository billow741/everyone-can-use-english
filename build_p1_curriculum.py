# -*- coding: utf-8 -*-
"""
SunnyBridge × Tell Me More P1 Core Curriculum Builder
Generates 20 Theme-based Child-friendly Units from TMM D001/D004,
transcodes all audio to 44.1kHz MP3, and outputs tmm_curriculum_catalog.json.
"""

import os
import sys
import glob
import re
import json
import subprocess
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')

SOURCE_BASE = "G:/AurData/D001/Pda"
DEST_AUDIO_DIR = "d:/SunnyBridge/enjoy/enjoy/public/assets/tmm/audio"
OUTPUT_CATALOG = "d:/SunnyBridge/enjoy/enjoy/public/assets/tmm/tmm_curriculum_catalog.json"

os.makedirs(DEST_AUDIO_DIR, exist_ok=True)

# 20 Units Architecture
UNIT_SPECS = [
    # Level 1 启蒙破冰
    {
        "id": "c01_saying_hello",
        "level": 1,
        "levelName": "Level 1 启蒙破冰",
        "title": "打招呼与初次见面",
        "titleEn": "Saying Hello & Making Friends",
        "tagline": "像勇敢的小狮子一样大方问好，结识新朋友！",
        "icon": "👋",
        "gradient": "from-amber-400 to-orange-500",
        "themeColor": "#F59E0B",
        "xmlPaths": [
            "000001/000001.xml",
            "000001/000002.xml"
        ],
        "phonicsFocus": ["j", "w", "h"],
        "phonicsChant": "嘴角像微笑一样向两侧平拉，大方喊出 Hello！",
        "keywords": [
            {"word": "hello", "ipa": "/həˈləʊ/", "zh": "你好", "hint": "最经典的礼貌问候语"},
            {"word": "name", "ipa": "/neɪm/", "zh": "名字", "hint": "介绍自己：My name is..."},
            {"word": "friend", "ipa": "/frend/", "zh": "朋友", "hint": "一起快乐玩耍的好伙伴"},
            {"word": "welcome", "ipa": "/ˈwelkəm/", "zh": "欢迎", "hint": "双唇圆圆发 /w/，热情迎宾"}
        ]
    },
    {
        "id": "c02_my_family",
        "level": 1,
        "levelName": "Level 1 启蒙破冰",
        "title": "我的温馨大家庭",
        "titleEn": "My Family & Loved Ones",
        "tagline": "认识爸爸妈妈、兄弟姐妹，用英语表达家庭的爱！",
        "icon": "🏡",
        "gradient": "from-rose-400 to-pink-500",
        "themeColor": "#EC4899",
        "xmlPaths": [
            "000001/000003.xml",
            "000001/000004.xml"
        ],
        "phonicsFocus": ["ð", "m", "f"],
        "phonicsChant": "发 mother 时舌尖微探齿缝，感受小蜜蜂声带振动！",
        "keywords": [
            {"word": "family", "ipa": "/ˈfæməli/", "zh": "家庭", "hint": "梅花大口音 /æ/，嘴巴张大两指"},
            {"word": "mother", "ipa": "/ˈmʌðər/", "zh": "妈妈", "hint": "中间咬舌浊音 /ð/ 轻轻咬舌"},
            {"word": "father", "ipa": "/ˈfɑːðər/", "zh": "爸爸", "hint": "后开长元音 /ɑː/ 喉底饱满"},
            {"word": "sister", "ipa": "/ˈsɪstər/", "zh": "姐妹", "hint": "清脆丝丝齿龈音 /s/"}
        ]
    },
    {
        "id": "c03_numbers_letters",
        "level": 1,
        "levelName": "Level 1 启蒙破冰",
        "title": "神奇数字与字母魔法",
        "titleEn": "Magic Numbers & Alphabet",
        "tagline": "数小羊、数苹果，1到20数字节奏唱出来！",
        "icon": "🔢",
        "gradient": "from-blue-400 to-cyan-500",
        "themeColor": "#06B6D4",
        "xmlPaths": [
            "000001/000012.xml",
            "000001/000013.xml"
        ],
        "phonicsFocus": ["θ", "n", "l"],
        "phonicsChant": "发 three 时舌尖像小乌龟探头，千万别读成汉字'四'！",
        "keywords": [
            {"word": "one", "ipa": "/wʌn/", "zh": "一", "hint": "圆圆吸管唇 /w/ 起音"},
            {"word": "three", "ipa": "/θriː/", "zh": "三", "hint": "核心咬舌音 /θ/ 探头送气"},
            {"word": "seven", "ipa": "/ˈsevn/", "zh": "七", "hint": "上牙轻触下唇发 /v/"},
            {"word": "twenty", "ipa": "/ˈtwenti/", "zh": "二十", "hint": "小鼓槌舌尖清脆爆破 /t/"}
        ]
    },
    {
        "id": "c04_date_time",
        "level": 1,
        "levelName": "Level 1 启蒙破冰",
        "title": "时钟滴答与快乐生日",
        "titleEn": "Date, Time & Birthday",
        "tagline": "学会看时钟、说星期与月份，期待下一次生日派对！",
        "icon": "⏰",
        "gradient": "from-emerald-400 to-teal-500",
        "themeColor": "#10B981",
        "xmlPaths": [
            "000001/000010.xml",
            "000001/000011.xml"
        ],
        "phonicsFocus": ["d", "t", "eɪ"],
        "phonicsChant": "发 day 和 date 时，由 /e/ 顺滑滑向 /ɪ/，口型渐合！",
        "keywords": [
            {"word": "time", "ipa": "/taɪm/", "zh": "时间", "hint": "大口 /a/ 滑向扁唇 /ɪ/"},
            {"word": "today", "ipa": "/təˈdeɪ/", "zh": "今天", "hint": "弱元音 /ə/ 轻短如羽毛"},
            {"word": "birthday", "ipa": "/ˈbɜːrθdeɪ/", "zh": "生日", "hint": "卷舌音 /ɜː/ 紧接咬舌清音 /θ/"},
            {"word": "clock", "ipa": "/klɒk/", "zh": "时钟", "hint": "舌根向后顶紧软腭发 /k/"}
        ]
    },
    {
        "id": "c05_animals_world",
        "level": 1,
        "levelName": "Level 1 启蒙破冰",
        "title": "奇趣小动物与多彩世界",
        "titleEn": "Animals & Colorful World",
        "tagline": "可爱的小狗小猫、农场小马，还有五彩斑斓的彩虹！",
        "icon": "🐾",
        "gradient": "from-yellow-400 to-amber-500",
        "themeColor": "#F59E0B",
        "xmlPaths": [
            "000004/000001.xml",
            "000004/000005.xml"
        ],
        "phonicsFocus": ["æ", "r", "b"],
        "phonicsChant": "发 cat 和 apple 时嘴巴张大两指宽，清脆有活力！",
        "keywords": [
            {"word": "cat", "ipa": "/kæt/", "zh": "小猫", "hint": "经典梅花音 /æ/ 竖塞两指"},
            {"word": "dog", "ipa": "/dɔːɡ/", "zh": "小狗", "hint": "双唇圆圆深沉后元音 /ɔː/"},
            {"word": "horse", "ipa": "/hɔːrs/", "zh": "马", "hint": "喉咙深处自然哈气 /h/"},
            {"word": "yellow", "ipa": "/ˈjeləʊ/", "zh": "黄色", "hint": "半元音 /j/ 微笑平拉轻巧滑出"}
        ]
    },

    # Level 2 校园与生活
    {
        "id": "c06_bus_trip",
        "level": 2,
        "levelName": "Level 2 校园与生活",
        "title": "乘上小巴士出发",
        "titleEn": "The Fun Bus Trip",
        "tagline": "滴滴！刷卡上车，看窗外风景，学习交通出行礼貌用语。",
        "icon": "🚌",
        "gradient": "from-red-400 to-orange-500",
        "themeColor": "#EF4444",
        "xmlPaths": [
            "000002/000001.xml",
            "000002/000002.xml"
        ],
        "phonicsFocus": ["ʌ", "b", "p"],
        "phonicsChant": "发 bus 就像小爆破音连着短促的胸腔爆发音 /ʌ/！",
        "keywords": [
            {"word": "bus", "ipa": "/bʌs/", "zh": "公共汽车", "hint": "短元音 /ʌ/ 从胸膛爆发"},
            {"word": "ticket", "ipa": "/ˈtɪkɪt/", "zh": "车票", "hint": "小鼓槌舌尖两次清脆跳跃"},
            {"word": "stop", "ipa": "/stɒp/", "zh": "车站/停", "hint": "双唇收紧瞬间闭气"},
            {"word": "driver", "ipa": "/ˈdraɪvər/", "zh": "司机叔叔", "hint": "卷舌 /r/ 配合唇齿摩擦 /v/"}
        ]
    },
    {
        "id": "c07_birthday_party",
        "level": 2,
        "levelName": "Level 2 校园与生活",
        "title": "惊喜生日大派对",
        "titleEn": "Surprise Birthday Party",
        "tagline": "点蜡烛、吹气球、拆礼物，一起唱响生日快乐歌！",
        "icon": "🎂",
        "gradient": "from-pink-400 to-purple-500",
        "themeColor": "#A855F7",
        "xmlPaths": [
            "000001/000006.xml"
        ],
        "phonicsFocus": ["p", "iː", "ɜ"],
        "phonicsChant": "party 和 present 发音要双唇紧闭，瞬间放小鞭炮爆破！",
        "keywords": [
            {"word": "party", "ipa": "/ˈpɑːrti/", "zh": "派对", "hint": "开长元音 /ɑː/ 饱满欢快"},
            {"word": "cake", "ipa": "/keɪk/", "zh": "蛋糕", "hint": "双元音 /eɪ/ 滑动甜美"},
            {"word": "candle", "ipa": "/ˈkændl/", "zh": "蜡烛", "hint": "成音节 /dl/ 舌尖贴齿龈"},
            {"word": "present", "ipa": "/ˈpreznt/", "zh": "礼物", "hint": "送气短促，声带不振"}
        ]
    },
    {
        "id": "c08_breakfast_bar",
        "level": 2,
        "levelName": "Level 2 校园与生活",
        "title": "能量元气早餐吧",
        "titleEn": "Delicious Breakfast Bar",
        "tagline": "牛奶面包香喷喷，水果煎蛋好营养，开启活力满满的一天！",
        "icon": "🥛",
        "gradient": "from-amber-300 to-yellow-500",
        "themeColor": "#F59E0B",
        "xmlPaths": [
            "000006/000004.xml",
            "000006/000005.xml"
        ],
        "phonicsFocus": ["ɛ", "m", "k"],
        "phonicsChant": "发 milk 时双唇闭紧走鼻音 /m/，结尾舌尖顶牙龈 /l/！",
        "keywords": [
            {"word": "milk", "ipa": "/mɪlk/", "zh": "牛奶", "hint": "鼻腔共鸣加舌侧流音"},
            {"word": "bread", "ipa": "/bred/", "zh": "面包", "hint": "短元音 /e/ 口开一指宽"},
            {"word": "egg", "ipa": "/eɡ/", "zh": "鸡蛋", "hint": "短促清脆紧接浊音 /g/"},
            {"word": "juice", "ipa": "/dʒuːs/", "zh": "果汁", "hint": "长圆唇 /uː/ 像吹蜡烛撅嘴"}
        ]
    },
    {
        "id": "c09_sweet_desserts",
        "level": 2,
        "levelName": "Level 2 校园与生活",
        "title": "甜蜜烘焙与甜品屋",
        "titleEn": "Sweet Desserts & Treats",
        "tagline": "冰淇淋、巧克力、草莓布丁，英语点单我最棒！",
        "icon": "🍨",
        "gradient": "from-violet-400 to-fuchsia-500",
        "themeColor": "#D946EF",
        "xmlPaths": [
            "000005/000003.xml",
            "000005/000004.xml"
        ],
        "phonicsFocus": ["s", "tʃ", "uː"],
        "phonicsChant": "chocolate 发首音时双唇微撅，舌尖先阻后裂发清脆切菜声！",
        "keywords": [
            {"word": "sweet", "ipa": "/swiːt/", "zh": "甜甜的", "hint": "微笑长元音 /iː/ 像拍茄子"},
            {"word": "ice cream", "ipa": "/ˌaɪs ˈkriːm/", "zh": "冰淇淋", "hint": "大口 /aɪ/ 滑入清亮长元音"},
            {"word": "chocolate", "ipa": "/ˈtʃɒklət/", "zh": "巧克力", "hint": "清破擦音 /tʃ/ 干脆爆破"},
            {"word": "fruit", "ipa": "/fruːt/", "zh": "水果", "hint": "圆唇长元音收紧小孔"}
        ]
    },
    {
        "id": "c10_daily_routines",
        "level": 2,
        "levelName": "Level 2 校园与生活",
        "title": "好习惯生活小标兵",
        "titleEn": "My Healthy Daily Habits",
        "tagline": "自己穿衣、认真洗手、整理书包，做独立自信的英语小能手！",
        "icon": "🌟",
        "gradient": "from-teal-400 to-green-500",
        "themeColor": "#14B8A6",
        "xmlPaths": [
            "000004/000003.xml",
            "000004/000004.xml"
        ],
        "phonicsFocus": ["l", "ʃ", "æ"],
        "phonicsChant": "发 wash 时双唇向前撅起发嘘声，发 clean 舌尖紧抵天花板！",
        "keywords": [
            {"word": "wash", "ipa": "/wɒʃ/", "zh": "洗净", "hint": "圆唇半元音 /w/ 接嘘声 /ʃ/"},
            {"word": "clean", "ipa": "/kliːn/", "zh": "干净的", "hint": "舌尖贴上门牙后龈 /l/"},
            {"word": "happy", "ipa": "/ˈhæpi/", "zh": "快乐的", "hint": "哈气起音紧接梅花大口 /æ/"},
            {"word": "good", "ipa": "/ɡʊd/", "zh": "优秀的", "hint": "短圆唇 /ʊ/ 放松短促"}
        ]
    },

    # Level 3 城市与漫游
    {
        "id": "c11_city_tour",
        "level": 3,
        "levelName": "Level 3 城市与漫游",
        "title": "小小导游看世界",
        "titleEn": "Little City Tour Guide",
        "tagline": "逛公园、看钟楼、访博物馆，用英语为家人做城市向导！",
        "icon": "🏛️",
        "gradient": "from-indigo-400 to-blue-600",
        "themeColor": "#3B82F6",
        "xmlPaths": [
            "000001/000007.xml",
            "000001/000008.xml"
        ],
        "phonicsFocus": ["s", "t", "ʊ"],
        "phonicsChant": "city 像小蛇吐信清脆发 /s/，tour 舌尖卷起饱满回旋！",
        "keywords": [
            {"word": "city", "ipa": "/ˈsɪti/", "zh": "城市", "hint": "轻柔齿龈清擦音起头"},
            {"word": "park", "ipa": "/pɑːrk/", "zh": "公园", "hint": "开长元音卷舌通透"},
            {"word": "museum", "ipa": "/mjuˈziːəm/", "zh": "博物馆", "hint": "中间硬腭滑音 /juː/ 紧接蜂鸣 /z/"},
            {"word": "bridge", "ipa": "/brɪdʒ/", "zh": "大桥", "hint": "浊破擦音 /dʒ/ 结实有劲"}
        ]
    },
    {
        "id": "c12_streets_of_london",
        "level": 3,
        "levelName": "Level 3 城市与漫游",
        "title": "漫步英伦历史古街",
        "titleEn": "Exploring Historic Streets",
        "tagline": "红色的双层巴士，泰晤士河畔的大本钟，感受原汁原味英伦风情。",
        "icon": "🇬🇧",
        "gradient": "from-blue-600 to-indigo-800",
        "themeColor": "#2563EB",
        "xmlPaths": [
            "000003/000004.xml",
            "000003/000005.xml"
        ],
        "phonicsFocus": ["l", "r", "t"],
        "phonicsChant": "London 舌尖两次贴上牙龈，清晰有力不含混！",
        "keywords": [
            {"word": "street", "ipa": "/striːt/", "zh": "街道", "hint": "连续三个辅音 /str/ 紧密连接"},
            {"word": "castle", "ipa": "/ˈkɑːsl/", "zh": "城堡", "hint": "字母 t 不发音，直接滑入 /sl/"},
            {"word": "river", "ipa": "/ˈrɪvər/", "zh": "河流", "hint": "唇齿轻触 /v/，卷舌收尾"},
            {"word": "tower", "ipa": "/ˈtaʊər/", "zh": "高塔", "hint": "合双元音 /aʊ/ 大口收圆"}
        ]
    },
    {
        "id": "c13_shopping_fun",
        "level": 3,
        "levelName": "Level 3 城市与漫游",
        "title": "橱窗寻宝与文具玩具",
        "titleEn": "Window Shopping & Toys",
        "tagline": "挑一本喜欢的绘本，选一只毛绒小熊，练习地道购物口语！",
        "icon": "🛍️",
        "gradient": "from-purple-400 to-pink-500",
        "themeColor": "#C026D3",
        "xmlPaths": [
            "000007/000001.xml",
            "000007/000002.xml"
        ],
        "phonicsFocus": ["ʃ", "ɪ", "ŋ"],
        "phonicsChant": "shopping 结尾的 -ing 舌根高抬贴软腭，鼻音饱满悠长！",
        "keywords": [
            {"word": "shop", "ipa": "/ʃɒp/", "zh": "商店", "hint": "嘘声 /ʃ/ 接大口后元音"},
            {"word": "book", "ipa": "/bʊk/", "zh": "书本", "hint": "短圆唇 /ʊ/ 短促收声"},
            {"word": "toy", "ipa": "/tɔɪ/", "zh": "玩具", "hint": "圆圆唇 /ɔ/ 快速滑向微笑 /ɪ/"},
            {"word": "price", "ipa": "/praɪs/", "zh": "价格", "hint": "开双元音 /aɪ/ 弹性充足"}
        ]
    },
    {
        "id": "c14_my_wardrobe",
        "level": 3,
        "levelName": "Level 3 城市与漫游",
        "title": "换装魔法与今天穿什么",
        "titleEn": "My Wonderful Wardrobe",
        "tagline": "外套、帽子、小雨靴，根据天气自己挑选帅气漂亮的衣服！",
        "icon": "👗",
        "gradient": "from-rose-400 to-amber-500",
        "themeColor": "#F43F5E",
        "xmlPaths": [
            "000007/000003.xml",
            "000007/000004.xml"
        ],
        "phonicsFocus": ["uː", "z", "f"],
        "phonicsChant": "shoes 和 boots 嘴唇极度收圆成吸管孔，长音响亮！",
        "keywords": [
            {"word": "coat", "ipa": "/kəʊt/", "zh": "大衣外套", "hint": "双元音 /əʊ/ 嘴唇圆拢"},
            {"word": "shoes", "ipa": "/ʃuːz/", "zh": "鞋子", "hint": "嘘声起音加声带蜂鸣浊音 /z/"},
            {"word": "shirt", "ipa": "/ʃɜːrt/", "zh": "衬衫", "hint": "卷舌音 /ɜː/ 喉部深沉"},
            {"word": "hat", "ipa": "/hæt/", "zh": "帽子", "hint": "梅花音 /æ/ 嘴角两侧拉开"}
        ]
    },
    {
        "id": "c15_weather_station",
        "level": 3,
        "levelName": "Level 3 城市与漫游",
        "title": "四季天气小气象员",
        "titleEn": "Little Weather Reporter",
        "tagline": "今天晴天还是下雨？用专业又生动的英语播报今天的天气！",
        "icon": "⛅",
        "gradient": "from-sky-400 to-blue-500",
        "themeColor": "#0EA5E9",
        "xmlPaths": [
            "000008/000005.xml",
            "000008/000006.xml"
        ],
        "phonicsFocus": ["w", "ð", "ɔ"],
        "phonicsChant": "weather 中间咬舌浊音 /ð/ 舌尖轻触齿缝，声带嗡嗡震！",
        "keywords": [
            {"word": "weather", "ipa": "/ˈweðər/", "zh": "天气", "hint": "双唇圆圆起步，中间轻咬舌"},
            {"word": "sunny", "ipa": "/ˈsʌni/", "zh": "晴朗的", "hint": "短元音 /ʌ/ 胸腔有力"},
            {"word": "rainy", "ipa": "/ˈreɪni/", "zh": "下雨的", "hint": "双元音 /eɪ/ 顺滑如丝"},
            {"word": "warm", "ipa": "/wɔːrm/", "zh": "温暖的", "hint": "长圆唇 /ɔː/ 加卷舌"}
        ]
    },

    # Level 4 自然与探险
    {
        "id": "c16_airport_travel",
        "level": 4,
        "levelName": "Level 4 自然与探险",
        "title": "整理行囊快乐出发",
        "titleEn": "Airport & Travel Adventures",
        "tagline": "拿好护照，拉好行李箱，坐上飞机去远方大冒险！",
        "icon": "✈️",
        "gradient": "from-blue-500 to-indigo-700",
        "themeColor": "#4F46E5",
        "xmlPaths": [
            "000009/000001.xml",
            "000009/000003.xml"
        ],
        "phonicsFocus": ["h", "l", "eɪ"],
        "phonicsChant": "plane 双唇爆破接舌侧流音，滑入甜美的 /eɪ/！",
        "keywords": [
            {"word": "plane", "ipa": "/pleɪn/", "zh": "飞机", "hint": "双唇弹开滑入双元音"},
            {"word": "airport", "ipa": "/ˈerpɔːrt/", "zh": "机场", "hint": "卷舌 /er/ 紧接圆唇 /ɔː/"},
            {"word": "travel", "ipa": "/ˈtrævl/", "zh": "旅行", "hint": "梅花大口音开度两指"},
            {"word": "ready", "ipa": "/ˈredi/", "zh": "准备好", "hint": "跑车卷舌音 /r/ 起步"}
        ]
    },
    {
        "id": "c17_sunny_beach",
        "level": 4,
        "levelName": "Level 4 自然与探险",
        "title": "阳光海滩拾贝记",
        "titleEn": "Sunny Beach & Ocean Fun",
        "tagline": "金色细沙，海浪拍岸，海鸥飞过，堆起威武的沙滩城堡！",
        "icon": "🏖️",
        "gradient": "from-amber-400 to-cyan-500",
        "themeColor": "#06B6D4",
        "xmlPaths": [
            "000011/000003.xml",
            "000011/000004.xml"
        ],
        "phonicsFocus": ["iː", "tʃ", "s"],
        "phonicsChant": "beach 嘴角左右平拉喊茄子 /iː/，尾音清脆切菜 /tʃ/！",
        "keywords": [
            {"word": "beach", "ipa": "/biːtʃ/", "zh": "沙滩海滨", "hint": "微笑长元音接破擦音"},
            {"word": "sea", "ipa": "/siː/", "zh": "大海", "hint": "丝丝齿龈音加清亮长音"},
            {"word": "sand", "ipa": "/sænd/", "zh": "细沙", "hint": "梅花大口 /æ/ 饱满有力"},
            {"word": "swim", "ipa": "/swɪm/", "zh": "游泳", "hint": "短元音 /ɪ/ 接双唇鼻音 /m/"}
        ]
    },
    {
        "id": "c18_sports_champs",
        "level": 4,
        "levelName": "Level 4 自然与探险",
        "title": "活力全开运动小健将",
        "titleEn": "Playground Sports Champions",
        "tagline": "踢足球、打篮球、赛跑跳高，团队协作我们第一名！",
        "icon": "⚽",
        "gradient": "from-emerald-500 to-green-600",
        "themeColor": "#10B981",
        "xmlPaths": [
            "000012/000001.xml",
            "000012/000002.xml"
        ],
        "phonicsFocus": ["ɔ", "p", "t"],
        "phonicsChant": "sport 双唇圆圆向前突出，爆破音干脆利落不拖尾！",
        "keywords": [
            {"word": "football", "ipa": "/ˈfʊtbɔːl/", "zh": "足球", "hint": "短圆唇 /ʊ/ 与长圆唇 /ɔː/ 对比"},
            {"word": "running", "ipa": "/ˈrʌnɪŋ/", "zh": "跑步", "hint": "卷舌起音，鼻音 /ŋ/ 收尾"},
            {"word": "team", "ipa": "/tiːm/", "zh": "团队", "hint": "小鼓槌弹开发长元音 /iː/"},
            {"word": "champion", "ipa": "/ˈtʃæmpiən/", "zh": "冠军", "hint": "破擦嘘声开头，气势昂扬"}
        ]
    },
    {
        "id": "c19_ski_slopes",
        "level": 4,
        "levelName": "Level 4 自然与探险",
        "title": "冰雪大世界与滑雪乐园",
        "titleEn": "Winter Snow & Ski Slopes",
        "tagline": "白雪皑皑的山峰，雪橇飞驰，滚雪球堆一个大雪人！",
        "icon": "⛷️",
        "gradient": "from-cyan-400 to-blue-600",
        "themeColor": "#0284C7",
        "xmlPaths": [
            "000011/000006.xml"
        ],
        "phonicsFocus": ["oʊ", "s", "k"],
        "phonicsChant": "snow 双唇由半开快速拢成紧致小圆孔，充满弹性！",
        "keywords": [
            {"word": "snow", "ipa": "/snəʊ/", "zh": "雪", "hint": "后合双元音 /əʊ/ 嘴唇圆拢"},
            {"word": "ski", "ipa": "/skiː/", "zh": "滑雪", "hint": "齿龈擦音紧接微笑长音 /iː/"},
            {"word": "cold", "ipa": "/kəʊld/", "zh": "寒冷的", "hint": "舌尖贴牙龈 /l/，轻击 /d/"},
            {"word": "mountain", "ipa": "/ˈmaʊntn/", "zh": "高山", "hint": "大口合双元音 /aʊ/ 收小"}
        ]
    },
    {
        "id": "c20_nature_camp",
        "level": 4,
        "levelName": "Level 4 自然与探险",
        "title": "奇妙森林露营记",
        "titleEn": "Forest Camping & Nature Wonders",
        "tagline": "搭起野外帐篷，围着篝火看漫天繁星，倾听大自然的呼吸！",
        "icon": "🏕️",
        "gradient": "from-amber-600 to-emerald-700",
        "themeColor": "#D97706",
        "xmlPaths": [
            "000013/000001.xml",
            "000015/000001.xml"
        ],
        "phonicsFocus": ["ɑ", "r", "ŋ"],
        "phonicsChant": "stars 下巴大张喊啊，舌尖向上微翘发出璀璨星空长音！",
        "keywords": [
            {"word": "camp", "ipa": "/kæmp/", "zh": "露营", "hint": "梅花音大开口接双唇鼻音"},
            {"word": "forest", "ipa": "/ˈfɒrɪst/", "zh": "森林", "hint": "唇齿轻咬送风，短促清脆"},
            {"word": "star", "ipa": "/stɑːr/", "zh": "星星", "hint": "开长元音通透回荡"},
            {"word": "nature", "ipa": "/ˈneɪtʃər/", "zh": "大自然", "hint": "双元音顺滑接切菜破擦音"}
        ]
    }
]

# Intelligent Child-Friendly Translation Map for TMM Sentences
CHILD_FRIENDLY_ZH = {
    "Hello.": "你好呀！",
    "What is your name?": "你叫什么名字呀？",
    "Where are you from?": "你来自哪里呢？",
    "Are you from Edinburgh?": "你来自爱丁堡吗？",
    "Are you married?": "你结婚了吗？",
    "My birthday is in July. When is your birthday?": "我的生日在七月。你的生日是在什么时候呢？",
    "What is your job? Are you a teacher?": "你的工作是什么？你是一名老师吗？",
    "Have you got a sister?": "你有姐妹吗？",
    "Has your brother got a job?": "你的哥哥/弟弟有工作吗？",
    "See you later.": "待会儿见咯！",
    "Hi, how are you?": "嗨，你今天好吗？",
    "Good morning, how are you?": "早上好呀，今天过得怎么样？",
    "My name is Simon.": "我的名字叫西蒙。",
    "I am Adam and this is Wendy.": "我是亚当，这位是温蒂。",
    "She is from England, but I am Scottish.": "她来自英格兰，但我来自苏格兰哦。",
    "I am from Wales.": "我来自威尔士。",
    "My father is a doctor.": "我的爸爸是一名医生。",
    "My mother is a teacher.": "我的妈妈是一名老师。",
    "I have got two brothers.": "我有两个兄弟。",
    "She is my sister.": "她是我的姐妹。",
    "This is my grandfather.": "这是我的爷爷/外公。",
    "This is my grandmother.": "这是我的奶奶/外婆。",
    "We are a happy family.": "我们是一个幸福快乐的大家庭！",
    "How old are you?": "你今年几岁啦？",
    "I am seven years old.": "我今年七岁啦！",
    "One, two, three, four, five.": "一、二、三、四、五。",
    "Six, seven, eight, nine, ten.": "六、七、八、九、十。",
    "Eleven, twelve, thirteen, fourteen, fifteen.": "十一、十二、十三、十四、十五。",
    "Sixteen, seventeen, eighteen, nineteen, twenty.": "十六、十七、十八、十九、二十。",
    "What time is it?": "现在几点钟啦？",
    "It is eight o'clock.": "现在是早上八点整！",
    "Today is Monday.": "今天是星期一。",
    "Happy birthday to you!": "祝你生日快乐！",
    "Make a wish and blow out the candles.": "快许个愿望，吹灭蜡烛吧！",
    "This present is for you.": "这份漂亮的礼物是送给你的！",
    "Thank you very much!": "非常感谢你！",
    "I like this cute little dog.": "我喜欢这只可爱的小狗。",
    "The cat is sleeping under the tree.": "小猫咪正在大树下睡大觉呢。",
    "Look at the big brown horse!": "快看那匹高大的棕色小马！",
    "The yellow duck is swimming in the pond.": "小黄鸭正在池塘里欢快地游泳。",
    "The bus is coming. Let's get on!": "小巴士来啦，我们快上车吧！",
    "Two tickets, please.": "请给我买两张车票。",
    "Please sit down and hold on tight.": "请快快坐好，抓紧扶手哦。",
    "Next stop is the Central Park.": "下一站就是中央公园啦！",
    "What would you like for breakfast?": "早餐你想吃点什么好吃的呢？",
    "I would like some milk and bread, please.": "我想喝点牛奶，吃点面包，谢谢！",
    "An apple a day keeps the doctor away.": "一天一苹果，医生远离我！",
    "This fruit cake is very sweet and delicious.": "这个水果蛋糕又香又甜，太美味啦！",
    "I love chocolate ice cream!": "我最喜欢吃巧克力冰淇淋啦！",
    "Remember to wash your hands before eating.": "吃东西之前记得一定要把小手洗干净哦！",
    "Let's visit the Big Ben and Tower Bridge!": "我们一起去参观大本钟和伦敦塔桥吧！",
    "Welcome to the natural science museum.": "欢迎来到奇妙的自然科学博物馆！",
    "How much is this toy bear?": "请问这只可爱的小玩具熊多少钱呀？",
    "Put on your warm coat and boots.": "穿上你保暖的小外套和靴子吧。",
    "It is sunny and warm today.": "今天天气晴朗，暖洋洋的！",
    "Don't forget your umbrella. It is raining!": "别忘了带上小雨伞，外面下雨啦！",
    "Fasten your seatbelt, the plane is taking off!": "系好安全带，我们的小飞机要起飞啦！",
    "Let's build a big sandcastle on the beach!": "我们一起在沙滩上堆一座威武的大城堡吧！",
    "Pass me the football! Great goal!": "把足球传给我！好球，进啦！",
    "Put on your warm jacket, let's go skiing!": "穿上厚厚保暖的羽绒服，我们去滑雪啦！",
    "Look at the bright stars in the night sky!": "快看夜空中闪闪发光的小星星！"
}

def clean_text(t):
    if not t:
        return ""
    return re.sub(r'\s+', ' ', t).strip()

def transcode_wma_to_mp3(wma_path, mp3_path):
    if os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 100:
        return True
    try:
        cmd = [
            "ffmpeg", "-y", "-i", wma_path,
            "-vn", "-ar", "44100", "-ac", "1", "-b:a", "64k",
            "-map_metadata", "-1",
            mp3_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        return res.returncode == 0
    except Exception as e:
        return False

# Collect and process units
processed_units = []
all_transcode_tasks = []

print("1. Parsing TMM XMLs and building 20 progressive units...")

for idx, spec in enumerate(UNIT_SPECS, 1):
    unit_id = spec["id"]
    unit_sentences = []
    
    for rel_xml in spec["xmlPaths"]:
        full_xml_path = os.path.join(SOURCE_BASE, rel_xml)
        if not os.path.exists(full_xml_path):
            continue
        try:
            tree = ET.parse(full_xml_path)
            root = tree.getroot()
            for elem in root.findall(".//CONTENT_ELEMENT"):
                sid = elem.get("ID")
                orig_text_elem = elem.find("ORIGINAL_TEXT")
                orig_text = clean_text(orig_text_elem.text) if orig_text_elem is not None else ""
                
                sound_elem = elem.find(".//FILE[@TYPE='SOUND']")
                sound_src = sound_elem.get("SOURCE") if sound_elem is not None else ""
                
                if orig_text and sound_src:
                    norm_src = sound_src.replace("\\", "/").lstrip("/")
                    full_wma = os.path.join(SOURCE_BASE, norm_src)
                    
                    # Target MP3 filename
                    base_name = os.path.splitext(os.path.basename(sound_src))[0]
                    mp3_name = f"tmm_{base_name}.mp3"
                    mp3_dest = os.path.join(DEST_AUDIO_DIR, mp3_name)
                    audio_url = f"/assets/tmm/audio/{mp3_name}"
                    
                    if os.path.exists(full_wma):
                        all_transcode_tasks.append((full_wma, mp3_dest))
                        
                        zh = CHILD_FRIENDLY_ZH.get(orig_text)
                        if not zh:
                            # fallback readable translation
                            zh = f"情景句：{orig_text}"
                        
                        # Generate phonics focus matching
                        unit_sentences.append({
                            "id": f"tmm-{base_name}",
                            "text": orig_text,
                            "translation": zh,
                            "audioUrl": audio_url,
                            "targetPhoneme": f"/{spec['phonicsFocus'][0]}/",
                            "phonicsHint": spec["phonicsChant"],
                            "coachTip": f"小狮子敢敢提示：注意听外教纯正原声，模仿标准语调！"
                        })
        except Exception as e:
            print(f"Error parsing {full_xml_path}: {e}")

    # Deduplicate by text
    seen_texts = set()
    unique_sentences = []
    for s in unit_sentences:
        if s["text"] not in seen_texts and len(s["text"]) > 2:
            seen_texts.add(s["text"])
            unique_sentences.append(s)

    # Split into sections
    # Section 1: Immersion Listening (first 8 sentences)
    listen_section = unique_sentences[:8]
    # Section 2: Speaking Assessment (next 5 sentences)
    speak_section = unique_sentences[8:13] if len(unique_sentences) >= 13 else unique_sentences[:5]
    
    # Section 4: Quiz Challenge (generate 3-4 interactive questions from sentences)
    quiz_items = []
    for q_idx, item in enumerate(listen_section[:3], 1):
        other_choices = [x["translation"] for x in unique_sentences if x["translation"] != item["translation"]][:2]
        if len(other_choices) < 2:
            other_choices = ["早上好，你好吗？", "很高兴认识你！"]
        options = [item["translation"]] + other_choices
        import random
        random.seed(q_idx)
        random.shuffle(options)
        
        quiz_items.append({
            "id": f"quiz-{unit_id}-{q_idx}",
            "question": f"仔细听录音，选出与这句英语相符的中文意思：",
            "englishText": item["text"],
            "audioUrl": item["audioUrl"],
            "options": options,
            "correctIndex": options.index(item["translation"]),
            "explain": f"这句英语是“{item['text']}”，中文意思是“{item['translation']}”。小狮子敢敢为你点赞！"
        })

    unit_obj = {
        "id": unit_id,
        "sequence": idx,
        "level": spec["level"],
        "levelName": spec["levelName"],
        "title": spec["title"],
        "titleEn": spec["titleEn"],
        "tagline": spec["tagline"],
        "icon": spec["icon"],
        "gradient": spec["gradient"],
        "themeColor": spec["themeColor"],
        "phonicsFocus": spec["phonicsFocus"],
        "phonicsChant": spec["phonicsChant"],
        "learningObjectives": [
            f"掌握 {len(spec['keywords'])} 个主题核心单词的准确发音与拼读",
            f"攻克核心音标 /{spec['phonicsFocus'][0]}/ 发音难关与自然连读",
            f"能自信流利地进行本单元生活场景双语表达与互动问答"
        ],
        "keywords": spec["keywords"],
        "stats": {
            "totalSentences": len(unique_sentences),
            "estimatedMinutes": 15,
            "starsReward": 3
        },
        "sections": {
            "listening": listen_section,
            "speaking": speak_section,
            "quiz": quiz_items
        }
    }
    processed_units.append(unit_obj)
    print(f"  ✓ Unit {idx}/20: {unit_obj['title']} ({len(unique_sentences)} sentences, {len(quiz_items)} quiz items)")

# Deduplicate transcode tasks
unique_transcode_tasks = list({t[0]: t for t in all_transcode_tasks}.values())
print(f"\n2. Transcoding {len(unique_transcode_tasks)} WMA audios to 44.1kHz MP3 in parallel...")

success_count = 0
with ThreadPoolExecutor(max_workers=8) as executor:
    futures = [executor.submit(transcode_wma_to_mp3, src, dest) for src, dest in unique_transcode_tasks]
    for f in futures:
        if f.result():
            success_count += 1

print(f"Transcoding finished: {success_count}/{len(unique_transcode_tasks)} MP3s ready at {DEST_AUDIO_DIR}.")

# Output Catalog JSON
catalog_data = {
    "version": "1.0.0",
    "updatedAt": "2026-10-15T12:00:00Z",
    "title": "SunnyBridge Enjoy 敢敢少儿英语阶梯学院",
    "description": "基于法国 Auralog Tell Me More 原厂母语原声重构的 20 个进阶主题课程，专为中国 4-12 岁少儿定制打造。",
    "totalUnits": len(processed_units),
    "levels": [
        {"level": 1, "name": "Level 1 启蒙破冰", "description": "日常问候、家庭成员、数字与色彩，零基础轻松开口！"},
        {"level": 2, "name": "Level 2 校园与生活", "description": "校园巴士、美味餐饮、好习惯养成，探索多彩日常！"},
        {"level": 3, "name": "Level 3 城市与漫游", "description": "城市观光、商场购物、四季天气，拓展国际广阔视野！"},
        {"level": 4, "name": "Level 4 自然与探险", "description": "阳光海滩、运动探险、野外露营，挑战高阶地道表达！"}
    ],
    "units": processed_units
}

with open(OUTPUT_CATALOG, "w", encoding="utf-8") as f:
    json.dump(catalog_data, f, ensure_ascii=False, indent=2)

print(f"\n3. Wrote curriculum catalog to {OUTPUT_CATALOG} (Size: {os.path.getsize(OUTPUT_CATALOG) / 1024:.2f} KB).")
print("🎉 P1 Core Curriculum generation completed successfully!")
