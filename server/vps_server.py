import http.server
import json
import urllib.request
import urllib.parse
import base64
import time
import uuid
import threading
import os
import re
import hashlib
import copy
import sqlite3

APP_ID = "wx595afada6df958e8"
# APP_SECRET 已移入 .env：见 load_env() 后的赋值（2026-10-25 Plan A）
ENV_FILE = "/opt/sunnybridge-auth/.env"
OXFORD_FILE = "/opt/sunnybridge-auth/oxford_content.json"
OXFORD_ALL_FILE = "/opt/sunnybridge-auth/oxford_all_books.json"
LEADS_FILE = "/opt/sunnybridge-auth/leads.json"
COURSES_FILE = "/opt/sunnybridge-auth/courses.json"
ENROLLMENTS_FILE = "/opt/sunnybridge-auth/enrollments.json"
CHATS_FILE = "/opt/sunnybridge-auth/chats.json"
VOCABULARY_FILE = "/opt/sunnybridge-auth/vocabulary.json"
PHONEMES_FILE = "/opt/sunnybridge-auth/phonemes_mastery.json"
APP_CONFIG_FILE = "/opt/sunnybridge-auth/app_config.json"

# ================= Dynamic App Configuration (Headless Shell Architecture) =================
DEFAULT_APP_CONFIG = {
    "version": "1.0.0",
    "updatedAt": "2026-10-06T15:00:00Z",
    "auditMode": False,
    "appMeta": {
        "appName": "SunnyBridge 阳光桥",
        "appSubtitle": "少儿趣味英语 · 智能伴读打卡工具",
        "brandLogo": "https://app.sunnybridge.qzz.io/assets/qiaobao_sunny240.png",
        "mascotName": "敢敢",
        "mascotTitle": "🦁 伴学小向导 · 敢敢",
        "mascotGreeting": "“Hi there! 今天想和我聊英语，还是精读牛津原版绘本？”",
        "shareTitle": "🦁 阳光桥 SunnyBridge · 电脑/iPad 专属护眼大屏伴学平台",
        "shareImageUrl": "https://app.sunnybridge.qzz.io/assets/qiaobao_sunny240.png"
    },
    "quotaConfig": {
        "maxDailyQuota": 15,
        "quotaBarText": "今日试用体验：{remaining} / {max} 次 · 直连云端",
        "quotaActionText": "前往电脑大屏完整体验 →",
        "quotaExhaustedTitle": "今日 15 次体验已完成 🎉",
        "quotaExhaustedDesc": "推荐前往电脑或 iPad 大屏端，享受无限制沉浸式纯正英语伴读！"
    },
    "chatConfig": {
        "enabled": True,
        "tabTitle": "敢敢口语伴读",
        "tabEmoji": "🦁",
        "initialAiMessage": {
            "en": "Hi! I am Gangan, your SunnyBridge learning friend! 🦁 What is your name?",
            "zh": "嗨！我是小狮子敢敢，你的阳光桥英语伙伴！你叫什么名字呀？"
        },
        "inputPlaceholder": "输入你想对敢敢说的英语 (如 Hello!)...",
        "quickPrompts": []
    },
    "evalConfig": {
        "enabled": True,
        "tabTitle": "语音精准纠音",
        "tabEmoji": "🎙️",
        "indicatorBadge": "☁️ SunnyBridge 云端 AI 精准评测"
    },
    "storyConfig": {
        "enabled": True,
        "tabTitle": "牛津精选绘本",
        "tabEmoji": "📚"
    },
    "promotionCard": {
        "enabled": True,
        "badgeIcon": "🎁",
        "badgeName": "新用户交流特权",
        "slotsTip": "今日开放预约中",
        "heading": "预约 50分钟 少儿英语交流体验",
        "subheading": "专属交流伙伴 · 牛津原版体系深度互动 · 日常配合敢敢智能纠错",
        "guarantees": [
            {"icon": "🤝", "label": "专属交流伙伴"},
            {"icon": "⏱️", "label": "50分钟深度交流"},
            {"icon": "📚", "label": "纯正语感打磨"},
            {"icon": "🌍", "label": "自信流利表达"}
        ],
        "buttonText": "立即预约交流体验 →",
        "targetUrl": "/pages/apply/index"
    },
    "contactConfig": {
        "consultantTitle": "专属少儿英语伴学顾问",
        "wechatId": "SunnyBridge_Helper",
        "consultantQr": "https://app.sunnybridge.qzz.io/assets/advisor_qr.png"
    }
}

app_config_cache = {}
app_config_lock = threading.Lock()

def load_app_config():
    global app_config_cache
    if os.path.exists(APP_CONFIG_FILE):
        try:
            with open(APP_CONFIG_FILE, "r", encoding="utf-8") as f:
                app_config_cache = json.load(f)
                return app_config_cache
        except Exception as e:
            print("Error loading app_config.json:", e)
    app_config_cache = copy.deepcopy(DEFAULT_APP_CONFIG)
    save_app_config()
    return app_config_cache

def save_app_config():
    try:
        with open(APP_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(app_config_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving app_config.json:", e)

def get_app_config():
    with app_config_lock:
        if not app_config_cache:
            load_app_config()
        return copy.deepcopy(app_config_cache)

def update_app_config(new_data):
    with app_config_lock:
        if not app_config_cache:
            load_app_config()
        def _merge(dest, src):
            for k, v in src.items():
                if isinstance(v, dict) and k in dest and isinstance(dest[k], dict):
                    _merge(dest[k], v)
                else:
                    dest[k] = v
        _merge(app_config_cache, new_data)
        app_config_cache["updatedAt"] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
        save_app_config()
        return copy.deepcopy(app_config_cache)

load_app_config()

# Default fallback environment settings
DEFAULT_ENV = {
    "ADMIN_TOKEN": "",
    "AI_PROVIDER": "deepseek",
    "AI_BASE_URL": "https://api.deepseek.com",
    "AI_API_KEY": "",
    "AI_MODEL": "deepseek-chat",
    "AI_TEMPERATURE": "0.7",
    "AI_MAX_TOKENS": "600",
    "AZURE_SPEECH_KEY": "",
    "AZURE_SPEECH_REGION": "eastasia"
}

# In-memory configuration cache
current_config = {}
config_lock = threading.Lock()

def load_env():
    global current_config
    cfg = DEFAULT_ENV.copy()
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        cfg[k] = v
        except Exception as e:
            print(f"Error loading {ENV_FILE}: {e}")
    else:
        # Create default .env file
        save_env(cfg)
    
    with config_lock:
        current_config = cfg
    return cfg

def save_env(new_cfg):
    global current_config
    with config_lock:
        current_config.update(new_cfg)
        lines = [
            "# SunnyBridge AI & System Environment Configuration",
            f"# Last Updated: {time.strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "# Admin Portal Security Passkey",
            f"ADMIN_TOKEN={current_config.get('ADMIN_TOKEN', 'sunnybridge2026')}",
            "",
            "# AI Provider: deepseek | openai | kimi | qwen | custom",
            f"AI_PROVIDER={current_config.get('AI_PROVIDER', 'deepseek')}",
            "",
            "# OpenAI-Compatible Base URL",
            f"AI_BASE_URL={current_config.get('AI_BASE_URL', 'https://api.deepseek.com')}",
            "",
            "# Upstream AI API Key (sk-...)",
            f"AI_API_KEY={current_config.get('AI_API_KEY', '')}",
            "",
            "# Model Name",
            f"AI_MODEL={current_config.get('AI_MODEL', 'deepseek-chat')}",
            "",
            "# Temperature & Max Tokens",
            f"AI_TEMPERATURE={current_config.get('AI_TEMPERATURE', '0.7')}",
            f"AI_MAX_TOKENS={current_config.get('AI_MAX_TOKENS', '600')}",
            "",
            "# Microsoft Azure Pronunciation Assessment Keys & Region",
            f"AZURE_SPEECH_KEY={current_config.get('AZURE_SPEECH_KEY', '')}",
            f"AZURE_SPEECH_REGION={current_config.get('AZURE_SPEECH_REGION', 'eastasia')}",
            ""
        ]
        try:
            with open(ENV_FILE, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
            print(f"[{time.strftime('%X')}] Successfully saved new .env configuration.")
        except Exception as e:
            print(f"Error writing {ENV_FILE}: {e}")

# Initial load
load_env()
# APP_SECRET（微信 AppSecret）必须由 .env 提供，代码中不再设默认值
APP_SECRET = current_config.get("APP_SECRET", "")
if not APP_SECRET:
    raise RuntimeError("APP_SECRET is required in .env")

# In-memory ticket storage: { ticket: { "status": "PENDING"|"SUCCESS"|"EXPIRED", "created_at": timestamp, "user": {...} } }
tickets = {}
tickets_lock = threading.Lock()

# Token cache
token_cache = {
    "token": None,
    "expires_at": 0
}
token_lock = threading.Lock()

# Azure Speech Multi-Key Pool & Concurrency Slot Manager (1 key = 1 slot, N keys = N slots)
key_slots = {}  # { key: { "slot_id": None, "acquired_at": 0.0, "max_duration_sec": 7.0 } }
key_slots_lock = threading.Lock()
key_slots_cv = threading.Condition(key_slots_lock)

def get_azure_keys():
    with config_lock:
        raw_keys = current_config.get("AZURE_SPEECH_KEY", "").strip()
        region = current_config.get("AZURE_SPEECH_REGION", "eastasia").strip()
    if not raw_keys:
        return [], region
    keys = [k.strip() for k in re.split(r'[,;\n\r]+', raw_keys) if k.strip()]
    return keys, region

def get_access_token():
    with token_lock:
        now = time.time()
        if token_cache["token"] and now < token_cache["expires_at"] - 300:
            return token_cache["token"]
        
        url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APP_ID}&secret={APP_SECRET}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SunnyBridgeAuth/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if "access_token" in data:
                    token_cache["token"] = data["access_token"]
                    token_cache["expires_at"] = now + data.get("expires_in", 7200)
                    print(f"[{time.strftime('%X')}] Refreshed WeChat access_token successfully.")
                    return token_cache["token"]
                else:
                    print("Error getting access token:", data)
                    return None
        except Exception as e:
            print("Failed to request access token:", e)
            return None

def clean_expired_tickets():
    while True:
        time.sleep(60)
        now = time.time()
        with tickets_lock:
            expired_keys = [k for k, v in tickets.items() if now - v.get("created_at", 0) > 600]
            for k in expired_keys:
                del tickets[k]

OXFORD_WEEKLY_CACHE = {}

def get_oxford_content(stage=None, category=None, limit=None, all_books=False, week=None):
    import datetime
    
    # 1. 如果显式请求全量 (all=true) 或指定了阶段 stage / 类别 category
    if all_books or stage or category:
        lib_path = OXFORD_ALL_FILE if os.path.exists(OXFORD_ALL_FILE) else OXFORD_FILE
        try:
            with open(lib_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                stories = data.get("all_stories") or data.get("stories", [])
                
                if category:
                    c_lower = category.lower()
                    stories = [s for s in stories if s.get("stageId", "").lower().startswith(c_lower) or c_lower in s.get("level", "").lower()]
                
                if stage:
                    s_lower = stage.lower()
                    stories = [s for s in stories if s_lower in s.get("stageId", "").lower() or s_lower in s.get("level", "").lower()]

                if limit:
                    try:
                        lim = int(limit)
                        stories = stories[:lim]
                    except Exception:
                        pass

                return {
                    "success": True,
                    "total": len(stories),
                    "lessons": data.get("lessons", []),
                    "stories": stories
                }
        except Exception as e:
            print("Error loading full oxford library:", e)

    # 2. 默认模式（小程序客户端拉取）：每周从 4 大类中精选 30 本（加 4 个大类楼层卡，共 34 项），每周一自动轮转！
    cur_year, cur_week, _ = datetime.date.today().isocalendar()
    target_week = week if (week and isinstance(week, int)) else cur_week

    # 检查内存缓存
    if target_week in OXFORD_WEEKLY_CACHE:
        return OXFORD_WEEKLY_CACHE[target_week]

    # 尝试从 oxford_all_books.json 动态计算 target_week 的精选
    if os.path.exists(OXFORD_ALL_FILE):
        try:
            with open(OXFORD_ALL_FILE, "r", encoding="utf-8") as f:
                all_lib = json.load(f)
                books_map = all_lib.get("books_by_stage", {})
                groups = all_lib.get("category_groups", [])
                lessons = all_lib.get("lessons", [])

                weekly_stories = []
                picked_count = 0

                for group in groups:
                    group_books = []
                    if group.get("alloc") == "high_rotation":
                        high_stages = group.get("stages", [])
                        for k in range(4):
                            st_id = high_stages[(target_week + k) % len(high_stages)]
                            st_books = books_map.get(st_id, [])
                            if st_books:
                                idx = (target_week * 2 + k) % len(st_books)
                                group_books.append(st_books[idx])
                    else:
                        alloc_map = group.get("alloc", {})
                        for st_id, count in alloc_map.items():
                            st_books = books_map.get(st_id, [])
                            if not st_books:
                                continue
                            for c in range(count):
                                idx = (target_week * count + c) % len(st_books)
                                group_books.append(st_books[idx])

                    if group_books:
                        first_b = group_books[0]
                        divider_card = {
                            "id": f"divider_{group['id']}",
                            "slug": f"header-{group['id']}",
                            "title": group["title"],
                            "stageId": group["id"],
                            "level": group["badge"],
                            "coverEmoji": group["emoji"],
                            "coverImage": first_b["coverImage"],
                            "audioUrl": first_b["audioUrl"],
                            "sentenceEn": f"{group.get('sentenceEn', '')} (Week {target_week})",
                            "sentenceZh": group["desc"],
                            "tip": group["tip"],
                            "pageCount": 1,
                            "pages": [
                                {
                                    "page": 1,
                                    "image": first_b["coverImage"],
                                    "sentenceEn": f"Welcome to {group['title']} (Week {target_week})! Choose any book below to start reading.",
                                    "sentenceZh": f"欢迎进入{group['title']}！每周一精选轮换，点击下方任意绘本即可沉浸式伴读。",
                                    "tip": group["desc"]
                                }
                            ]
                        }
                        weekly_stories.append(divider_card)
                        weekly_stories.extend(group_books)
                        picked_count += len(group_books)

                result = {
                    "success": True,
                    "total": len(weekly_stories),
                    "bookCount": picked_count,
                    "week": target_week,
                    "lessons": lessons,
                    "stories": weekly_stories
                }
                OXFORD_WEEKLY_CACHE[target_week] = result
                return result
        except Exception as e:
            print("Error dynamically computing weekly oxford selection:", e)

    # 3. 兜底直接读取 oxford_content.json
    if os.path.exists(OXFORD_FILE):
        try:
            with open(OXFORD_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception as e:
            print("Error loading oxford_content fallback:", e)

    return {"success": False, "lessons": [], "stories": []}

DEFAULT_COURSES = [
    {
        "id": "course-phonics-101",
        "title": "🐣 敢敢少儿自然拼读启蒙课 (Phonics 101)",
        "description": "专为5-12岁少儿设计的自然拼读与发音基础课。通过趣味发音、标准英美音标与互动跟读，带孩子轻松掌握字母发音规则与字母组合拼读秘诀！",
        "chaptersCount": 3,
        "enrollmentsCount": 128,
        "coverUrl": "/assets/qiaobao_sunny240.png",
        "chapters": [
            {
                "id": "ch-ph-1",
                "courseId": "course-phonics-101",
                "sequence": 1,
                "title": "字母 A 的魔力魔法发音 /æ/",
                "keywords": ["Apple", "Cat", "Hat"],
                "content": "### 欢迎来到自然拼读第一课！🦁\n\n今天小狮子敢敢带你认识字母 **A** 的短元音发音 **/æ/**！\n\n**发音要领：**\n1. 嘴巴张大，嘴角向两侧微微咧开。\n2. 舌尖轻触下齿龈，舌身放平。\n3. 快速短促发出 **/æ/** 的声音，就像小猫喵喵叫一样的快乐口型！\n\n跟随敢敢一起大声朗读下方的例句，并点击麦克风进行智能纠音评测吧！",
                "finishesCount": 95,
                "translations": [
                    {"language": "zh-CN", "content": "掌握字母A的发音规则，练习发音：苹果、猫咪、小帽子。"}
                ],
                "examples": [
                    {
                        "id": "ex-ph-1-1",
                        "keywords": ["cat", "cute"],
                        "language": "en",
                        "content": "Look at the cute little cat.",
                        "audioUrl": "/assets/audio/l1_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "快看那只可爱的小猫咪。"}]
                    },
                    {
                        "id": "ex-ph-1-2",
                        "keywords": ["apple", "banana"],
                        "language": "en",
                        "content": "I love sweet red apples and bananas.",
                        "audioUrl": "/assets/audio/l1_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "我喜欢甜甜的红苹果和香蕉。"}]
                    },
                    {
                        "id": "ex-ph-1-3",
                        "keywords": ["sunny", "room"],
                        "language": "en",
                        "content": "Good morning! This is my sunny room.",
                        "audioUrl": "/assets/audio/l1_3.mp3",
                        "translations": [{"language": "zh-CN", "content": "早上好！这是我充满阳光的房间。"}]
                    }
                ]
            },
            {
                "id": "ch-ph-2",
                "courseId": "course-phonics-101",
                "sequence": 2,
                "title": "神奇辅音字母组合 /b/ 和 /p/",
                "keywords": ["Ball", "Puppy", "Play"],
                "content": "### 双唇爆破音：/b/ 与 /p/ 的对比！🥁\n\n**发音秘籍：**\n- **/b/** 是浊辅音，声带震动，双唇紧闭后突然放开，像小鼓在敲响！\n- **/p/** 是清辅音，声带不震动，只送出一股强气流，就像吹蜡烛一样！\n\n敢敢建议：拿一张纸巾放在嘴前，发 **/p/** 的时候纸巾会轻轻飞起来哦！试一试吧！",
                "finishesCount": 78,
                "translations": [
                    {"language": "zh-CN", "content": "学习爆破音b与p的区别，体会清辅音和浊辅音的气流差异。"}
                ],
                "examples": [
                    {
                        "id": "ex-ph-2-1",
                        "keywords": ["bottle", "blue"],
                        "language": "en",
                        "content": "Can you pass me that blue bottle, please?",
                        "audioUrl": "/assets/audio/l2_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "请把那个蓝色瓶子递给我好吗？"}]
                    },
                    {
                        "id": "ex-ph-2-2",
                        "keywords": ["monkey", "happy"],
                        "language": "en",
                        "content": "The happy monkey is swinging in the tree.",
                        "audioUrl": "/assets/audio/l2_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "快乐的小猴子正在树上荡秋千。"}]
                    },
                    {
                        "id": "ex-ph-2-3",
                        "keywords": ["sandcastles", "fun"],
                        "language": "en",
                        "content": "We are having fun building sandcastles together.",
                        "audioUrl": "/assets/audio/l2_3.mp3",
                        "translations": [{"language": "zh-CN", "content": "我们一起开心地堆沙堡。"}]
                    }
                ]
            },
            {
                "id": "ch-ph-3",
                "courseId": "course-phonics-101",
                "sequence": 3,
                "title": "拼读大挑战：自然拼读连读技巧",
                "keywords": ["Read", "Fast", "Together"],
                "content": "### 自然拼读综合实战大通关！🌟\n\n小朋友，你已经掌握了单音节的发音，现在我们要把它们连起来读成优美的句子！\n\n注意辅音和元音的自然连缀，语调要像波浪一样欢快生动！",
                "finishesCount": 64,
                "translations": [
                    {"language": "zh-CN", "content": "综合练习连读和语调，挑战完整的英文长句。"}
                ],
                "examples": [
                    {
                        "id": "ex-ph-3-1",
                        "keywords": ["practice", "reading"],
                        "language": "en",
                        "content": "Practice makes perfect when you keep reading every day!",
                        "audioUrl": "/assets/audio/l3_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "只要每天坚持朗读，熟能生巧！"}]
                    },
                    {
                        "id": "ex-ph-3-2",
                        "keywords": ["stars", "summer"],
                        "language": "en",
                        "content": "Bright stars shine quietly in the summer night sky.",
                        "audioUrl": "/assets/audio/l3_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "璀璨的星星在夏夜的天空中静静闪烁。"}]
                    },
                    {
                        "id": "ex-ph-3-3",
                        "keywords": ["brave", "lion"],
                        "language": "en",
                        "content": "The brave little lion always speaks English with confidence!",
                        "audioUrl": "/assets/audio/today_challenge.mp3",
                        "translations": [{"language": "zh-CN", "content": "勇敢的小狮子总是自信满满地说英语！"}]
                    }
                ]
            }
        ]
    },
    {
        "id": "course-daily-spoken-201",
        "title": "🌟 阳光桥少儿日常情景口语课 (Daily Spoken English)",
        "description": "精选少儿日常生活、学校交流、家庭互动中最实用的纯正口语表达。通过情境模拟与对话互动，培养孩子用英文表达自我想法的地道习惯！",
        "chaptersCount": 3,
        "enrollmentsCount": 96,
        "coverUrl": "/assets/qiaobao_sunny240.png",
        "chapters": [
            {
                "id": "ch-ds-1",
                "courseId": "course-daily-spoken-201",
                "sequence": 1,
                "title": "第1课：你好！我的新朋友 (Greetings & Introductions)",
                "keywords": ["Hello", "Friend", "Name"],
                "content": "### 遇见新朋友，自信说 Hello！🦁\n\n当你进入阳光桥或者新学期认识新朋友时，怎么用自然亲切的英语打招呼呢？\n\n一起来练习这些实用打招呼高频句！",
                "finishesCount": 81,
                "translations": [
                    {"language": "zh-CN", "content": "学习与新朋友打招呼和自我介绍。"}
                ],
                "examples": [
                    {
                        "id": "ex-ds-1-1",
                        "keywords": ["morning", "sunny"],
                        "language": "en",
                        "content": "Good morning! This is my sunny room.",
                        "audioUrl": "/assets/audio/l1_3.mp3",
                        "translations": [{"language": "zh-CN", "content": "早上好！这是我充满阳光的房间。"}]
                    },
                    {
                        "id": "ex-ds-1-2",
                        "keywords": ["bottle", "please"],
                        "language": "en",
                        "content": "Can you pass me that blue bottle, please?",
                        "audioUrl": "/assets/audio/l2_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "请把那个蓝色水杯递给我好吗？"}]
                    },
                    {
                        "id": "ex-ds-1-3",
                        "keywords": ["brave", "confidence"],
                        "language": "en",
                        "content": "The brave little lion always speaks English with confidence!",
                        "audioUrl": "/assets/audio/today_challenge.mp3",
                        "translations": [{"language": "zh-CN", "content": "勇敢的小狮子总是自信满满地说英语！"}]
                    }
                ]
            },
            {
                "id": "ch-ds-2",
                "courseId": "course-daily-spoken-201",
                "sequence": 2,
                "title": "第2课：我最喜爱的食物与美味水果 (My Favorite Snacks)",
                "keywords": ["Food", "Apple", "Yummy"],
                "content": "### 美味野餐时刻！🍎\n\n今天我们来聊聊大家都爱吃的美食！学会用英语表达自己的喜好和分享食物！",
                "finishesCount": 73,
                "translations": [
                    {"language": "zh-CN", "content": "表达喜欢的食物与水果，练习分享美味。"}
                ],
                "examples": [
                    {
                        "id": "ex-ds-2-1",
                        "keywords": ["apple", "sweet"],
                        "language": "en",
                        "content": "I love sweet red apples and bananas.",
                        "audioUrl": "/assets/audio/l1_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "我喜欢甜甜的红苹果和香蕉。"}]
                    },
                    {
                        "id": "ex-ds-2-2",
                        "keywords": ["monkey", "tree"],
                        "language": "en",
                        "content": "The happy monkey is swinging in the tree.",
                        "audioUrl": "/assets/audio/l2_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "快乐的小猴子正在树上荡秋千。"}]
                    },
                    {
                        "id": "ex-ds-2-3",
                        "keywords": ["fun", "sandcastles"],
                        "language": "en",
                        "content": "We are having fun building sandcastles together.",
                        "audioUrl": "/assets/audio/l2_3.mp3",
                        "translations": [{"language": "zh-CN", "content": "我们一起开心地堆沙堡。"}]
                    }
                ]
            },
            {
                "id": "ch-ds-3",
                "courseId": "course-daily-spoken-201",
                "sequence": 3,
                "title": "第3课：晴朗好天气与户外活动 (A Wonderful Day)",
                "keywords": ["Weather", "Sunny", "Play"],
                "content": "### 走出家门，享受阳光！☀️\n\n今天的天气真舒服！和小伙伴一起在大自然里奔跑探索吧！",
                "finishesCount": 59,
                "translations": [
                    {"language": "zh-CN", "content": "讨论天气与户外探险活动。"}
                ],
                "examples": [
                    {
                        "id": "ex-ds-3-1",
                        "keywords": ["stars", "summer"],
                        "language": "en",
                        "content": "Bright stars shine quietly in the summer night sky.",
                        "audioUrl": "/assets/audio/l3_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "璀璨的星星在夏夜的天空中静静闪烁。"}]
                    },
                    {
                        "id": "ex-ds-3-2",
                        "keywords": ["reading", "practice"],
                        "language": "en",
                        "content": "Practice makes perfect when you keep reading every day!",
                        "audioUrl": "/assets/audio/l3_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "只要每天坚持朗读，熟能生巧！"}]
                    },
                    {
                        "id": "ex-ds-3-3",
                        "keywords": ["sun", "bridge"],
                        "language": "en",
                        "content": "The sun is shining bright, and our little bridge connects the world.",
                        "audioUrl": "/assets/audio/daily_sentence.mp3",
                        "translations": [{"language": "zh-CN", "content": "阳光明媚，我们的小桥连接着大大的世界。"}]
                    }
                ]
            }
        ]
    },
    {
        "id": "course-oxford-stories-301",
        "title": "🚀 牛津经典少儿故事精读课 (Oxford Story World)",
        "description": "紧扣牛津少儿分级阅读大纲，精选生动有趣的世界经典故事篇章。通过分句精读、角色扮演与AI陪读，全面提升孩子的听力理解与地道表达能力！",
        "chaptersCount": 3,
        "enrollmentsCount": 152,
        "coverUrl": "/assets/qiaobao_sunny240.png",
        "chapters": [
            {
                "id": "ch-ox-1",
                "courseId": "course-oxford-stories-301",
                "sequence": 1,
                "title": "第1篇：好奇的小猫与小狮子 (The Cat and Gangan)",
                "keywords": ["Cat", "Little", "Story"],
                "content": "### 故事第一幕：初遇小猫咪 🐾\n\n在一个阳光洒满草地的早晨，敢敢在花园里遇到了一只可爱的小猫咪！\n\n点击播放原声朗读，并尝试跟读每一句话！",
                "finishesCount": 110,
                "translations": [
                    {"language": "zh-CN", "content": "阅读小狮子敢敢与猫咪的故事，学习叙述句型。"}
                ],
                "examples": [
                    {
                        "id": "ex-ox-1-1",
                        "keywords": ["cat", "cute"],
                        "language": "en",
                        "content": "Look at the cute little cat.",
                        "audioUrl": "/assets/audio/l1_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "快看那只可爱的小猫咪。"}]
                    },
                    {
                        "id": "ex-ox-1-2",
                        "keywords": ["apple", "share"],
                        "language": "en",
                        "content": "I love sweet red apples and bananas.",
                        "audioUrl": "/assets/audio/l1_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "我喜欢甜甜的红苹果和香蕉。"}]
                    },
                    {
                        "id": "ex-ox-1-3",
                        "keywords": ["brave", "lion"],
                        "language": "en",
                        "content": "The brave little lion always speaks English with confidence!",
                        "audioUrl": "/assets/audio/today_challenge.mp3",
                        "translations": [{"language": "zh-CN", "content": "勇敢的小狮子总是自信满满地说英语！"}]
                    }
                ]
            },
            {
                "id": "ch-ox-2",
                "courseId": "course-oxford-stories-301",
                "sequence": 2,
                "title": "第2篇：神秘森林里的快乐小猴 (Monkey in the Forest)",
                "keywords": ["Monkey", "Tree", "Explore"],
                "content": "### 故事第二幕：穿过绿荫小径 🌳\n\n树林里传来沙沙声，原来是一只聪明顽皮的小猴子！它用长长的尾巴荡秋千，给我们展示它的精彩本领！",
                "finishesCount": 88,
                "translations": [
                    {"language": "zh-CN", "content": "生动描述小猴子在树上荡秋千的活泼场景。"}
                ],
                "examples": [
                    {
                        "id": "ex-ox-2-1",
                        "keywords": ["bottle", "water"],
                        "language": "en",
                        "content": "Can you pass me that blue bottle, please?",
                        "audioUrl": "/assets/audio/l2_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "请把那个蓝色瓶子递给我好吗？"}]
                    },
                    {
                        "id": "ex-ox-2-2",
                        "keywords": ["monkey", "swinging"],
                        "language": "en",
                        "content": "The happy monkey is swinging in the tree.",
                        "audioUrl": "/assets/audio/l2_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "快乐的小猴子正在树上荡秋千。"}]
                    },
                    {
                        "id": "ex-ox-2-3",
                        "keywords": ["sandcastles", "friends"],
                        "language": "en",
                        "content": "We are having fun building sandcastles together.",
                        "audioUrl": "/assets/audio/l2_3.mp3",
                        "translations": [{"language": "zh-CN", "content": "我们一起开心地堆沙堡。"}]
                    }
                ]
            },
            {
                "id": "ch-ox-3",
                "courseId": "course-oxford-stories-301",
                "sequence": 3,
                "title": "第3篇：彩虹桥与星光盛典 (Stars over the Bridge)",
                "keywords": ["Stars", "Night", "Dream"],
                "content": "### 故事大结局：点亮夜空的星光 🌟\n\n夜幕降临，天空中闪烁着千万颗耀眼的星星。敢敢和小伙伴们坐在阳光桥边，回顾今天学会的每一个词汇与句子！",
                "finishesCount": 79,
                "translations": [
                    {"language": "zh-CN", "content": "故事收尾，以美丽的夏夜星空与坚持朗读的信念结尾。"}
                ],
                "examples": [
                    {
                        "id": "ex-ox-3-1",
                        "keywords": ["reading", "practice"],
                        "language": "en",
                        "content": "Practice makes perfect when you keep reading every day!",
                        "audioUrl": "/assets/audio/l3_1.mp3",
                        "translations": [{"language": "zh-CN", "content": "只要每天坚持朗读，熟能生巧！"}]
                    },
                    {
                        "id": "ex-ox-3-2",
                        "keywords": ["stars", "summer"],
                        "language": "en",
                        "content": "Bright stars shine quietly in the summer night sky.",
                        "audioUrl": "/assets/audio/l3_2.mp3",
                        "translations": [{"language": "zh-CN", "content": "璀璨的星星在夏夜的天空中静静闪烁。"}]
                    },
                    {
                        "id": "ex-ox-3-3",
                        "keywords": ["sun", "bridge"],
                        "language": "en",
                        "content": "The sun is shining bright, and our little bridge connects the world.",
                        "audioUrl": "/assets/audio/daily_sentence.mp3",
                        "translations": [{"language": "zh-CN", "content": "阳光明媚，我们的小桥连接着大大的世界。"}]
                    }
                ]
            }
        ]
    }
]

# Courses and Enrollments Persistence & Memory Cache
courses_cache = []
courses_lock = threading.Lock()

enrollments_cache = {}
enrollments_lock = threading.Lock()

chats_cache = {}
chat_messages_cache = {}
chats_lock = threading.Lock()

def load_courses():
    global courses_cache
    if os.path.exists(COURSES_FILE):
        try:
            with open(COURSES_FILE, "r", encoding="utf-8") as f:
                courses_cache = json.load(f)
                return courses_cache
        except Exception as e:
            print("Error loading courses file:", e)
    courses_cache = list(DEFAULT_COURSES)
    save_courses()
    return courses_cache

def save_courses():
    try:
        with open(COURSES_FILE, "w", encoding="utf-8") as f:
            json.dump(courses_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving courses file:", e)

def load_enrollments():
    global enrollments_cache
    if os.path.exists(ENROLLMENTS_FILE):
        try:
            with open(ENROLLMENTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                enrollments_cache = {e["id"]: e for e in data}
                return
        except Exception as e:
            print("Error loading enrollments file:", e)
    enrollments_cache = {}

def save_enrollments():
    try:
        with open(ENROLLMENTS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(enrollments_cache.values()), f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving enrollments file:", e)

def get_user_enrollment(user_id, course_id):
    with enrollments_lock:
        for enr in enrollments_cache.values():
            if enr.get("user_id") == user_id and (enr.get("course_id") == course_id or enr.get("courseId") == course_id):
                return dict(enr)
    return None

def create_or_get_enrollment(user_id, course_id):
    with enrollments_lock:
        for enr in enrollments_cache.values():
            if enr.get("user_id") == user_id and (enr.get("course_id") == course_id or enr.get("courseId") == course_id):
                return enr

        first_ch_id = ""
        with courses_lock:
            for c in courses_cache:
                if c["id"] == course_id:
                    c["enrollmentsCount"] = c.get("enrollmentsCount", 0) + 1
                    if c.get("chapters"):
                        first_ch_id = c["chapters"][0]["id"]
                    save_courses()
                    break

        enr_id = f"enr_{uuid.uuid4().hex[:12]}"
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        new_enr = {
            "id": enr_id,
            "course_id": course_id,
            "courseId": course_id,
            "user_id": user_id,
            "state": "in_progress",
            "progress": 0.0,
            "current_chapter_id": first_ch_id,
            "currentChapterId": first_ch_id,
            "current_chapter_sequence": 1,
            "currentChapterSequence": 1,
            "finished_chapters": [],
            "createdAt": now_str,
            "updatedAt": now_str,
            "created_at": now_str,
            "updated_at": now_str
        }
        enrollments_cache[enr_id] = new_enr
        save_enrollments()
        return new_enr

# Vocabulary & Word Meaning Management
vocabulary_lock = threading.Lock()
vocabulary_cache = {}  # { user_id: [ MeaningType, ... ] }

def load_vocabulary():
    global vocabulary_cache
    if os.path.exists(VOCABULARY_FILE):
        try:
            with open(VOCABULARY_FILE, "r", encoding="utf-8") as f:
                vocabulary_cache = json.load(f)
                return vocabulary_cache
        except Exception as e:
            print("Error loading vocabulary file:", e)
    # Starts completely empty - zero pre-seeded cards
    vocabulary_cache = {}
    return vocabulary_cache

def save_vocabulary():
    try:
        with open(VOCABULARY_FILE, "w", encoding="utf-8") as f:
            json.dump(vocabulary_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving vocabulary file:", e)

def get_user_vocabulary(user_id):
    if not user_id:
        user_id = "default_user"
    if user_id not in vocabulary_cache:
        vocabulary_cache[user_id] = []
    return vocabulary_cache[user_id]

# ================= 39 Phonemes Mastery & Badges Cloud Database =================
phonemes_lock = threading.Lock()
phonemes_cache = {}  # { user_id: { "masteryMap": {}, "unlockedBadges": [], "stats": {}, "updatedAt": "" } }

def load_phonemes():
    global phonemes_cache
    if os.path.exists(PHONEMES_FILE):
        try:
            with open(PHONEMES_FILE, "r", encoding="utf-8") as f:
                phonemes_cache = json.load(f)
                return phonemes_cache
        except Exception as e:
            print("Error loading phonemes_mastery.json:", e)
    phonemes_cache = {}
    return phonemes_cache

def save_phonemes():
    try:
        with open(PHONEMES_FILE, "w", encoding="utf-8") as f:
            json.dump(phonemes_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving phonemes_mastery.json:", e)

def calculate_badges_for_mastery(mastery_map):
    mastered_keys = set([k for k, v in mastery_map.items() if v])
    mastered_count = len(mastered_keys)
    badges = []

    # 1. 启蒙破冰者 (攻克第 1 个音标)
    badges.append({
        "id": "first_step",
        "name": "启蒙破冰者",
        "icon": "🌱",
        "category": "起步里程碑",
        "description": "成功攻克并掌握第 1 个音标，开启纯正发音之旅！",
        "isUnlocked": mastered_count >= 1,
        "unlockedCount": min(mastered_count, 1),
        "totalCount": 1,
        "requiredPhonemes": []
    })

    # 2. 五星发音官 (掌握任意 5 个音标)
    badges.append({
        "id": "five_stars",
        "name": "五星发音官",
        "icon": "⭐",
        "category": "起步里程碑",
        "description": "掌握任意 5 个音标，发音地基初具规模！",
        "isUnlocked": mastered_count >= 5,
        "unlockedCount": min(mastered_count, 5),
        "totalCount": 5,
        "requiredPhonemes": []
    })

    # 3. 爆破音大师 (6 大爆破塞音 /p, b, t, d, k, g/)
    plosives = ["p", "b", "t", "d", "k", "g"]
    plosive_done = len([p for p in plosives if p in mastered_keys or ("g" in mastered_keys and p == "g")])
    badges.append({
        "id": "plosive_master",
        "name": "爆破音大师",
        "icon": "🎯",
        "category": "辅音专项",
        "description": "全通 6 大爆破塞音 /p, b, t, d, k, ɡ/，喷薄有力！",
        "isUnlocked": plosive_done >= len(plosives),
        "unlockedCount": plosive_done,
        "totalCount": len(plosives),
        "requiredPhonemes": plosives
    })

    # 4. 摩擦音专家 (9 大气流摩擦音 /f, v, θ, ð, s, z, ʃ, ʒ, h/)
    fricatives = ["f", "v", "θ", "ð", "s", "z", "ʃ", "h"]
    fricative_done = len([p for p in fricatives if p in mastered_keys])
    badges.append({
        "id": "fricative_master",
        "name": "摩擦音专家",
        "icon": "🌊",
        "category": "辅音专项",
        "description": "攻克 9 大气流摩擦音 /f, v, θ, ð, s, z, ʃ, ʒ, h/！",
        "isUnlocked": fricative_done >= len(fricatives),
        "unlockedCount": fricative_done,
        "totalCount": len(fricatives),
        "requiredPhonemes": fricatives
    })

    # 5. 长元音黄金官 (5 大长元音 /iː, uː, ɑ, ɔ, ɜ/)
    long_vowels = ["iː", "uː", "ɑ", "ɔ", "ɜ"]
    long_done = len([p for p in long_vowels if p in mastered_keys or p.replace("ː", "") in mastered_keys or (p + "ː") in mastered_keys])
    badges.append({
        "id": "long_vowel_master",
        "name": "长元音黄金官",
        "icon": "💎",
        "category": "元音专项",
        "description": "掌握全部 5 大长元音 /iː, uː, ɑː, ɔː, ɜː/，饱满悠扬！",
        "isUnlocked": long_done >= len(long_vowels),
        "unlockedCount": long_done,
        "totalCount": len(long_vowels),
        "requiredPhonemes": long_vowels
    })

    # 6. 短元音小飞侠 (6 大短元音 /ɪ, ʊ, ɛ, æ, ʌ, ə/)
    short_vowels = ["ɪ", "ʊ", "ɛ", "æ", "ʌ", "ə"]
    short_done = len([p for p in short_vowels if p in mastered_keys or (p == "ɛ" and "e" in mastered_keys)])
    badges.append({
        "id": "short_vowel_master",
        "name": "短元音小飞侠",
        "icon": "⚡",
        "category": "元音专项",
        "description": "掌握全部 6 大短元音 /ɪ, ʊ, ɛ, æ, ʌ, ɒ/，短促弹韧！",
        "isUnlocked": short_done >= len(short_vowels),
        "unlockedCount": short_done,
        "totalCount": len(short_vowels),
        "requiredPhonemes": short_vowels
    })

    # 7. 双元音游侠 (5 大双元音 /eɪ, aɪ, ɔɪ, aʊ, oʊ/)
    diphthongs = ["eɪ", "aɪ", "ɔɪ", "aʊ", "oʊ"]
    dip_done = len([p for p in diphthongs if p in mastered_keys or (p == "oʊ" and "əʊ" in mastered_keys)])
    badges.append({
        "id": "diphthong_master",
        "name": "双元音游侠",
        "icon": "🌈",
        "category": "元音专项",
        "description": "掌握全部 5 大双元音 /eɪ, aɪ, ɔɪ, aʊ, oʊ/，丝滑滑移！",
        "isUnlocked": dip_done >= len(diphthongs),
        "unlockedCount": dip_done,
        "totalCount": len(diphthongs),
        "requiredPhonemes": diphthongs
    })

    # 8. 全能发音王者 (39 个核心音标全满贯)
    badges.append({
        "id": "grand_master",
        "name": "全能发音王者",
        "icon": "👑",
        "category": "终极殿堂",
        "description": "39 个国际核心音标全满贯通关！登顶语音金殿堂！",
        "isUnlocked": mastered_count >= 39,
        "unlockedCount": min(mastered_count, 39),
        "totalCount": 39,
        "requiredPhonemes": []
    })

    return badges

def get_user_phonemes(user_id):
    if not user_id:
        user_id = "default_user"
    with phonemes_lock:
        if not phonemes_cache:
            load_phonemes()
        if user_id not in phonemes_cache:
            phonemes_cache[user_id] = {
                "masteryMap": {},
                "unlockedBadges": calculate_badges_for_mastery({}),
                "stats": {
                    "masteredCount": 0,
                    "totalCount": 39,
                    "badgeCount": 0,
                    "lastUpdated": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                },
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        return phonemes_cache[user_id]

def call_dictionary_llm(word, context=""):
    with config_lock:
        key = current_config.get("AI_API_KEY", "").strip()
        url = current_config.get("AI_BASE_URL", "https://api.deepseek.com").strip().rstrip("/")
        mdl = current_config.get("AI_MODEL", "deepseek-chat").strip()

    if not key:
        return None

    target_endpoint = f"{url}/chat/completions"
    sys_prompt = (
        "You are an English-Chinese dictionary assistant for children learning English. "
        "Analyze the given English word and optional context sentence.\n"
        "Return STRICTLY a JSON object with keys:\n"
        '- "word": the word itself\n'
        '- "lemma": base/dictionary form\n'
        '- "pos": part of speech abbreviation (e.g. n., v., adj., adv.)\n'
        '- "pronunciation": IPA phonetic symbol (e.g. /ˈæp.əl/)\n'
        '- "translation": concise Chinese translation (e.g. 苹果)\n'
        '- "definition": simple English definition for children\n'
        '- "context": the provided context sentence, or if blank, create a simple, vivid example sentence containing the word\n'
        '- "contextTranslation": Chinese translation of the context sentence\n'
        "Do not include markdown code blocks, output raw JSON string only."
    )
    req_data = {
        "model": mdl,
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"Word: {word}\nContext: {context or ''}"}
        ],
        "temperature": 0.2,
        "max_tokens": 400
    }
    try:
        req = urllib.request.Request(
            target_endpoint,
            data=json.dumps(req_data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
                "User-Agent": "SunnyBridgeDictionary/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            res_body = json.loads(resp.read().decode("utf-8"))
            raw = res_body.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            if raw.startswith("```"):
                lines = raw.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                raw = "\n".join(lines).strip()
            return json.loads(raw)
    except Exception as e:
        print(f"Dictionary AI lookup failed for {word}:", e)
        return None

COMMON_CHILD_WORDS = {
    "apples": {"lemma": "apple", "pos": "n.", "pronunciation": "ˈæp.əl", "translation": "苹果", "definition": "A round fruit with red or green skin and firm white flesh"},
    "apple": {"lemma": "apple", "pos": "n.", "pronunciation": "ˈæp.əl", "translation": "苹果", "definition": "A round fruit with red or green skin and firm white flesh"},
    "butterfly": {"lemma": "butterfly", "pos": "n.", "pronunciation": "ˈbʌt.ə.flaɪ", "translation": "蝴蝶", "definition": "A flying insect with large, often brightly colored wings"},
    "pencil": {"lemma": "pencil", "pos": "n.", "pronunciation": "ˈpen.səl", "translation": "铅笔", "definition": "A long, thin object used for writing or drawing"},
    "library": {"lemma": "library", "pos": "n.", "pronunciation": "ˈlaɪ.brər.i", "translation": "图书馆", "definition": "A room or building containing books that can be read or borrowed"},
    "football": {"lemma": "football", "pos": "n.", "pronunciation": "ˈfʊt.bɔːl", "translation": "足球", "definition": "A game played between two teams of eleven players"},
    "dinner": {"lemma": "dinner", "pos": "n.", "pronunciation": "ˈdɪn.ər", "translation": "晚餐", "definition": "The main meal of the day, usually eaten in the evening"},
    "stars": {"lemma": "star", "pos": "n.", "pronunciation": "stɑːr", "translation": "繁星/星星", "definition": "A tiny bright point of light that shines in the night sky"},
    "star": {"lemma": "star", "pos": "n.", "pronunciation": "stɑːr", "translation": "星星", "definition": "A tiny bright point of light that shines in the night sky"},
    "bananas": {"lemma": "banana", "pos": "n.", "pronunciation": "bəˈnɑː.nə", "translation": "香蕉", "definition": "A long, curved fruit with a yellow skin and soft, sweet, white flesh"},
    "banana": {"lemma": "banana", "pos": "n.", "pronunciation": "bəˈnɑː.nə", "translation": "香蕉", "definition": "A long, curved fruit with a yellow skin and soft, sweet, white flesh"},
    "sunshine": {"lemma": "sunshine", "pos": "n.", "pronunciation": "ˈsʌn.ʃaɪn", "translation": "阳光", "definition": "The light and heat that come from the sun"},
    "straight": {"lemma": "straight", "pos": "adj./adv.", "pronunciation": "streɪt", "translation": "笔直的；挺直的", "definition": "Continuing in one direction without curving"},
    "clown": {"lemma": "clown", "pos": "n.", "pronunciation": "klaʊn", "translation": "小丑", "definition": "An entertainer who wears funny clothes and paints their face"},
    "school": {"lemma": "school", "pos": "n.", "pronunciation": "skuːl", "translation": "学校", "definition": "A place where children learn"},
    "teacher": {"lemma": "teacher", "pos": "n.", "pronunciation": "ˈtiː.tʃər", "translation": "老师", "definition": "A person whose job is teaching"},
    "fishing": {"lemma": "fish", "pos": "n./v.", "pronunciation": "ˈfɪʃ.ɪŋ", "translation": "钓鱼；捕鱼", "definition": "The activity of trying to catch fish"},
    "rabbit": {"lemma": "rabbit", "pos": "n.", "pronunciation": "ˈræb.ɪt", "translation": "兔子", "definition": "A small animal with long ears and soft fur"},
    "excited": {"lemma": "excited", "pos": "adj.", "pronunciation": "ɪkˈsaɪ.tɪd", "translation": "激动的；兴奋的", "definition": "Feeling very happy and enthusiastic"},
    "room": {"lemma": "room", "pos": "n.", "pronunciation": "ruːm", "translation": "房间", "definition": "A part of the inside of a building with its own walls"}
}

LOCAL_DICT_DB_PATHS = [
    "/opt/sunnybridge-auth/ecdict.db",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "ecdict.db"),
    "d:/SunnyBridge/ecdict.db"
]

def query_local_dictionary(word):
    clean_w = word.strip().strip(" .,!?:;\"'()[]{}“”‘’…—").lower()
    if not clean_w:
        return None
    
    db_path = None
    for p in LOCAL_DICT_DB_PATHS:
        if os.path.exists(p):
            db_path = p
            break
    if not db_path:
        return None
        
    try:
        conn = sqlite3.connect(db_path, check_same_thread=False)
        c = conn.cursor()
        
        c.execute("SELECT word, phonetic, pos, translation, definition, exchange FROM dict WHERE word = ? LIMIT 1", (clean_w,))
        row = c.fetchone()
        
        if not row:
            candidates = []
            if clean_w.endswith("'s"):
                candidates.append(clean_w[:-2])
            if clean_w.endswith("ies") and len(clean_w) > 4:
                candidates.append(clean_w[:-3] + "y")
            if clean_w.endswith("es") and len(clean_w) > 3:
                candidates.append(clean_w[:-2])
            if clean_w.endswith("s") and len(clean_w) > 2:
                candidates.append(clean_w[:-1])
            if clean_w.endswith("ed") and len(clean_w) > 3:
                candidates.append(clean_w[:-2])
                candidates.append(clean_w[:-1])
            if clean_w.endswith("ing") and len(clean_w) > 4:
                candidates.append(clean_w[:-3])
                candidates.append(clean_w[:-3] + "e")
            if clean_w.endswith("ly") and len(clean_w) > 3:
                candidates.append(clean_w[:-2])
            if clean_w.endswith("er") and len(clean_w) > 3:
                candidates.append(clean_w[:-2])
                candidates.append(clean_w[:-1])
            if clean_w.endswith("est") and len(clean_w) > 4:
                candidates.append(clean_w[:-3])
                candidates.append(clean_w[:-2])
                
            for cand in candidates:
                c.execute("SELECT word, phonetic, pos, translation, definition, exchange FROM dict WHERE word = ? LIMIT 1", (cand,))
                row = c.fetchone()
                if row:
                    break
        conn.close()
        
        if row:
            word_found, phonetic, pos, translation, definition, exchange = row
            clean_text = (translation or "").replace("\\n", "\n")
            raw_lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
            formatted_trans = "；".join(raw_lines) if raw_lines else clean_text
            return {
                "word": word.strip(),
                "lemma": word_found,
                "phonetic": phonetic or "",
                "pronunciation": phonetic or "",
                "translation": formatted_trans,
                "translations": raw_lines,
                "pos": pos or (raw_lines[0].split(".")[0] + "." if raw_lines and "." in raw_lines[0][:5] else ""),
                "definition": definition or "",
                "source": "ecdict"
            }
    except Exception as e:
        print("Error querying local dictionary:", e)
    return None

def query_word_meaning(word, context=""):
    # 1. First priority: high-performance local ECDICT database (770k entries, instant < 1ms)
    local_info = query_local_dictionary(word)
    if local_info and local_info.get("translation"):
        return {
            "word": word.strip(),
            "lemma": local_info["lemma"],
            "pos": local_info["pos"],
            "phonetic": local_info["phonetic"],
            "pronunciation": local_info["pronunciation"],
            "translation": local_info["translation"],
            "definition": local_info["definition"],
            "context": context if context else f"Look at this {word.strip()}.",
            "contextTranslation": "",
            "source": "ecdict"
        }

    # 2. Second priority: common child words hardcoded dictionary
    clean_w = word.strip().strip(" .,!?:;\"'()[]{}“”‘’…—").lower()
    if clean_w in COMMON_CHILD_WORDS:
        info = COMMON_CHILD_WORDS[clean_w]
        return {
            "word": word.strip(),
            "lemma": info["lemma"],
            "pos": info["pos"],
            "phonetic": info["pronunciation"],
            "pronunciation": info["pronunciation"],
            "translation": info["translation"],
            "definition": info["definition"],
            "context": context if context else f"Look at this {word.strip()}.",
            "contextTranslation": "",
            "source": "common_child"
        }

    # 3. Third priority: Cloud LLM fallback
    parsed = call_dictionary_llm(word, context)
    if parsed and isinstance(parsed, dict) and parsed.get("word"):
        return {
            "word": parsed.get("word", word),
            "lemma": parsed.get("lemma", word),
            "pos": parsed.get("pos", "n."),
            "phonetic": parsed.get("pronunciation", "").strip("/"),
            "pronunciation": parsed.get("pronunciation", "").strip("/"),
            "translation": parsed.get("translation", ""),
            "definition": parsed.get("definition", ""),
            "context": parsed.get("context", context or f"Look at this {word}."),
            "contextTranslation": parsed.get("contextTranslation", ""),
            "source": "cloud_llm"
        }

    clean_w = word.strip()
    return {
        "word": clean_w,
        "lemma": clean_w.lower(),
        "pos": "word",
        "phonetic": "",
        "pronunciation": "",
        "translation": clean_w,
        "definition": f"The English word '{clean_w}'",
        "context": context if context else f"Look at this {clean_w}.",
        "contextTranslation": f"看这个{clean_w}。" if not context else ""
    }


def mask_api_key(key):
    if not key:
        return ""
    if len(key) <= 8:
        return "****"
    return f"{key[:6]}...{key[-4:]}"

# Call upstream OpenAI-compatible chat completion
def call_upstream_llm(messages, api_key=None, base_url=None, model=None, temperature=None):
    with config_lock:
        key = api_key or current_config.get("AI_API_KEY", "").strip()
        url = (base_url or current_config.get("AI_BASE_URL", "https://api.deepseek.com")).strip().rstrip("/")
        configured_model = model or current_config.get("AI_MODEL", "deepseek-chat").strip()
        temp = float(temperature or current_config.get("AI_TEMPERATURE", "0.7"))
        max_tok = int(current_config.get("AI_MAX_TOKENS", "350"))

    if not key:
        return {
            "success": False,
            "error": "no_api_key",
            "message": "尚未配置大模型 API Key"
        }

    target_endpoint = f"{url}/chat/completions"
    
    # Prepend Gangan kid-friendly companion system prompt
    system_prompt = {
        "role": "system",
        "content": (
            "You are 'Gangan' (敢敢), a friendly, energetic, warm little lion mascot and AI English companion "
            "for children aged 4-12 learning English at SunnyBridge (阳光桥少儿英语).\n\n"
            "Persona & Strict Rules:\n"
            "1. Be super enthusiastic, gentle, positive, and praise the child generously! Use cute emojis like 🦁, 🌟, ✨, 🌈, 🍎, 🎒.\n"
            "2. Speak STRICTLY and PURELY in simple English (CEFR Pre-A1 to A1 level). NEVER output any Chinese characters, Chinese pinyin, or Chinese translations under any circumstances. Zero Chinese!\n"
            "3. Sentences must be short, clear, and phonics-friendly (1 to 2 sentences maximum).\n"
            "4. Ask only ONE simple, inviting question at a time so the child feels encouraged and easy to reply.\n"
            "5. Even if the child writes or speaks in Chinese, you must ALWAYS reply in simple, encouraging English only."
        )
    }

    full_messages = [system_prompt]
    for m in messages:
        if m.get("content"):
            full_messages.append({"role": m.get("role", "user"), "content": m.get("content")})

    # Build model attempt order (configured model first, then tested working fallbacks)
    models_to_try = [configured_model]
    if "nvidia.com" in url:
        for backup_m in [
            "meta/llama-3.2-11b-vision-instruct",
            "openai/gpt-oss-20b",
            "nvidia/nemotron-3.5-lightning-30b-a3b"
        ]:
            if backup_m not in models_to_try:
                models_to_try.append(backup_m)

    last_error = None
    for mdl in models_to_try:
        req_data = {
            "model": mdl,
            "messages": full_messages,
            "temperature": temp,
            "max_tokens": max_tok
        }

        t0 = time.time()
        try:
            req = urllib.request.Request(
                target_endpoint,
                data=json.dumps(req_data).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {key}",
                    "User-Agent": "SunnyBridgeAI-Gateway/1.0"
                }
            )
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                elapsed_ms = int((time.time() - t0) * 1000)
                res_body = json.loads(resp.read().decode("utf-8"))
                choice = res_body.get("choices", [{}])[0]
                msg_obj = choice.get("message", {})
                raw_text = msg_obj.get("content") or ""
                if not raw_text and msg_obj.get("reasoning_content"):
                    raw_text = msg_obj.get("reasoning_content")
                raw_text = str(raw_text or "").strip()

                if not raw_text:
                    continue

                # Strip reasoning artifacts or thought process if model leaks thinking
                if "Here's a thinking process:" in raw_text or "<think>" in raw_text:
                    raw_text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL)
                    if "Here's a thinking process:" in raw_text:
                        parts = raw_text.split("**Formulate Response:**")
                        if len(parts) > 1:
                            raw_text = parts[-1]
                        else:
                            parts = raw_text.split("\n\n")
                            raw_text = parts[-1]

                # Ensure pure English: strip any brackets containing Chinese or Chinese characters
                clean_text = re.sub(r'[\(（][^()（）]*[\u4e00-\u9fa5]+[^()（）]*[\)）]', '', raw_text)
                clean_text = re.sub(r'[\u4e00-\u9fa5]+', '', clean_text).strip()
                clean_text = re.sub(r'[\*\#\_]+', '', clean_text)
                clean_text = re.sub(r' +', ' ', clean_text).strip()
                if not clean_text:
                    clean_text = raw_text.strip()

                return {
                    "success": True,
                    "reply": clean_text,
                    "replyEn": clean_text,
                    "replyZh": "",
                    "model": mdl,
                    "latencyMs": elapsed_ms
                }
        except urllib.error.HTTPError as e:
            err_content = e.read().decode("utf-8", errors="ignore")
            last_error = {
                "success": False,
                "error": f"HTTP {e.code}",
                "details": err_content,
                "latencyMs": int((time.time() - t0) * 1000)
            }
            print(f"Model {mdl} error: HTTP {e.code} - {err_content[:80]}")
            continue
        except Exception as e:
            last_error = {
                "success": False,
                "error": "ConnectionError",
                "details": str(e),
                "latencyMs": int((time.time() - t0) * 1000)
            }
            print(f"Model {mdl} exception: {e}")
            continue

    return last_error or {
        "success": False,
        "error": "all_models_failed",
        "details": "所有候选模型均无法响应",
        "latencyMs": 0
    }

# Edge TTS Speech Synthesis helper using Microsoft Azure Neural Voices with Disk Caching
TTS_CACHE_DIR = os.environ.get("TTS_CACHE_DIR", "/var/www/sunnybridge-app/oxford/tts_cache")
try:
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)
except Exception:
    pass

def get_edge_tts_audio(text, voice="en-GB-SoniaNeural", rate="-5%"):
    clean_text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    clean_text = re.sub(r'[*_#`~]', '', clean_text).strip()
    if not clean_text:
        return b""
    
    # 1. 尝试从本地磁盘缓存读取（零边际成本，极速响应）
    cache_key = hashlib.md5(f"{clean_text}_{voice}_{rate}".encode("utf-8")).hexdigest()
    cache_path = os.path.join(TTS_CACHE_DIR, f"{cache_key}.mp3")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "rb") as f:
                return f.read()
        except Exception:
            pass

    # 2. 线上实时合成
    try:
        import asyncio
        import edge_tts

        async def _synthesize():
            comm = edge_tts.Communicate(clean_text, voice=voice, rate=rate)
            chunks = []
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])
            return b"".join(chunks)

        audio_bytes = asyncio.run(_synthesize())
        if audio_bytes:
            # 微信小程序端对音频采样率/声道支持严格 (errCode:62 native decode so fail)
            # 使用 ffmpeg 转换为标准 44100Hz 2通道 128kbps MP3
            try:
                import subprocess
                proc = subprocess.run(
                    ['ffmpeg', '-i', 'pipe:0', '-ar', '44100', '-ac', '2', '-b:a', '128k', '-f', 'mp3', 'pipe:1', '-y', '-loglevel', 'quiet'],
                    input=audio_bytes, capture_output=True, timeout=10
                )
                if proc.returncode == 0 and proc.stdout:
                    audio_bytes = proc.stdout
            except Exception as fe:
                print(f"ffmpeg transcode warning: {fe}")

            try:
                with open(cache_path, "wb") as f:
                    f.write(audio_bytes)
            except Exception as e:
                print(f"Error caching TTS to {cache_path}: {e}")
        if not audio_bytes:
            raise RuntimeError("Edge TTS returned empty audio bytes")
        return audio_bytes
    except Exception as e:
        print(f"Edge TTS error ({e}), attempting dictionary audio fallback...")
        try:
            import urllib.request
            import urllib.parse
            dict_voice_type = "1" if "GB" in voice else "2"
            encoded_word = urllib.parse.quote(clean_text)
            dict_url = f"https://dict.youdao.com/dictvoice?audio={encoded_word}&type={dict_voice_type}"
            req = urllib.request.Request(dict_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    fallback_bytes = resp.read()
                    if fallback_bytes and len(fallback_bytes) > 500:
                        print(f"Fallback dict voice succeeded for '{clean_text}' ({len(fallback_bytes)} bytes)")
                        try:
                            with open(cache_path, "wb") as f:
                                f.write(fallback_bytes)
                        except Exception:
                            pass
                        return fallback_bytes
        except Exception as fe:
            print(f"Fallback voice error: {fe}")
        return b""

class WeChatAuthHandler(http.server.BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token")

    def send_audio_data(self, audio_data, content_type="audio/mpeg"):
        total_len = len(audio_data)
        range_header = self.headers.get("Range")

        if range_header and range_header.startswith("bytes="):
            try:
                ranges = range_header[6:].split("-")
                start = int(ranges[0]) if ranges[0] else 0
                end = int(ranges[1]) if ranges[1] else total_len - 1
                if start >= total_len:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{total_len}")
                    self.end_headers()
                    return
                end = min(end, total_len - 1)
                content_length = end - start + 1
                self.send_response(206)
                self.send_cors_headers()
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Range", f"bytes {start}-{end}/{total_len}")
                self.send_header("Content-Length", str(content_length))
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(audio_data[start:end+1])
                return
            except Exception as e:
                print(f"Error handling Range request: {e}")

        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(total_len))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(audio_data)

    def do_HEAD(self):
        self.do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def get_current_user_id(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            tok = auth_header[7:].strip()
            if tok:
                with tickets_lock:
                    if tok in tickets and tickets[tok].get("user"):
                        return tickets[tok]["user"].get("id", tok)
                return tok
        return "guest_user"

    def check_admin_auth(self, params=None, body_data=None):
        auth_header = self.headers.get("Authorization", "")
        token = ""
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif self.headers.get("X-Admin-Token"):
            token = self.headers.get("X-Admin-Token").strip()
        elif params and "token" in params:
            token = params["token"][0].strip()
        elif body_data and "token" in body_data:
            token = str(body_data["token"]).strip()

        with config_lock:
            expected = current_config.get("ADMIN_TOKEN", "").strip()

        return bool(token and token == expected)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # 1. Generate QR Code
        if path == "/api/auth/wechat/qrcode":
            token = get_access_token()
            if not token:
                self.send_json({"error": "Failed to get WeChat access token"}, status=500)
                return

            ticket = uuid.uuid4().hex[:16]
            with tickets_lock:
                tickets[ticket] = {
                    "status": "PENDING",
                    "created_at": time.time(),
                    "user": None
                }

            wxa_url = f"https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token={token}"
            payload = {
                "scene": ticket,
                "page": "pages/index/index",
                "check_path": False,
                "env_version": "release",
                "width": 320
            }

            try:
                req = urllib.request.Request(
                    wxa_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=12) as resp:
                    c_type = resp.headers.get("Content-Type", "")
                    body = resp.read()
                    if "image" in c_type:
                        b64_img = base64.b64encode(body).decode('utf-8')
                        self.send_json({
                            "ticket": ticket,
                            "qrcode_base64": f"data:image/jpeg;base64,{b64_img}",
                            "app_id": APP_ID,
                            "expires_in": 300
                        })
                    else:
                        print("WeChat returned non-image:", body.decode('utf-8', errors='ignore'))
                        self.send_json({"error": "Failed to generate WeChat QR code"}, status=500)
            except Exception as e:
                print("Error contacting WeChat API:", e)
                self.send_json({"error": str(e)}, status=500)
            return

        # 2. Poll Status
        elif path == "/api/auth/wechat/poll":
            ticket = params.get("ticket", [None])[0]
            if not ticket:
                self.send_json({"error": "Missing ticket parameter"}, status=400)
                return

            with tickets_lock:
                info = tickets.get(ticket)

            if not info:
                self.send_json({"status": "EXPIRED", "message": "二维码已失效，请刷新"})
                return

            if time.time() - info["created_at"] > 300:
                self.send_json({"status": "EXPIRED", "message": "二维码已超时，请刷新"})
                return

            if info["status"] == "SUCCESS":
                self.send_json({
                    "status": "SUCCESS",
                    "user": info.get("user", {}),
                    "token": f"sb_jwt_{ticket}"
                })
            else:
                self.send_json({"status": "PENDING"})
            return

        # 3. Oxford Content
        elif path == "/api/oxford/content":
            stage_q = params.get("stage", [None])[0]
            cat_q = params.get("category", [None])[0]
            lim_q = params.get("limit", [None])[0]
            all_q = params.get("all", ["false"])[0].lower() in ["true", "1", "yes"]
            week_q = params.get("week", [None])[0]
            if week_q:
                try:
                    week_q = int(week_q)
                except Exception:
                    week_q = None
            self.send_json(get_oxford_content(stage=stage_q, category=cat_q, limit=lim_q, all_books=all_q, week=week_q))
            return

        # 3.1 Public Content for Mini Program (Daily Sparks)
        elif path == "/api/v1/content/public":
            self.send_json({
                "success": True,
                "data": {
                    "daily_sparks": [
                        {
                            "id": "spark_1",
                            "author": "Walt Disney",
                            "quoteEn": "Laughter is timeless, imagination has no age, and dreams are forever.",
                            "quoteZh": "欢笑永不过时，想象没有年龄界限，梦想永不停息。",
                            "audioUrl": "/assets/audio/l1_1.mp3"
                        },
                        {
                            "id": "spark_2",
                            "author": "Dr. Seuss",
                            "quoteEn": "The more that you read, the more things you will know.",
                            "quoteZh": "读得越多，你知道的就越多；学得越多，你能走得更远。",
                            "audioUrl": "/assets/audio/l2_1.mp3"
                        },
                        {
                            "id": "spark_3",
                            "author": "SunnyBridge",
                            "quoteEn": "Every small step in English builds a big bridge to the world.",
                            "quoteZh": "用英语迈出的每一个小小脚步，都在搭建通往广阔世界的阳光之桥。",
                            "audioUrl": "/assets/audio/l3_1.mp3"
                        }
                    ]
                }
            })
            return

        # 3.2 Dynamic App Configuration for Mini Program (Headless Shell)
        elif path in ["/api/v1/config/app", "/api/app/config"]:
            self.send_json({"success": True, "config": get_app_config()})
            return

        # 3.3 Ahoy analytics
        elif path.startswith("/ahoy/"):
            self.send_json({"status": "ok"})
            return

        # 3.4 Enjoy Web Shell Config Compatibility (/api/config/*)
        elif path.startswith("/api/config/"):
            cfg_key = path.replace("/api/config/", "")
            cfg_map = {
                "app_version": {"version": "1.0.0"},
                "gpt_providers": [],
                "ipa_mappings": {},
                "tts_providers_v2": []
            }
            self.send_json(cfg_map.get(cfg_key, {}))
            return

        # 4. Admin: Get Configuration
        elif path == "/api/admin/config":
            if not self.check_admin_auth(params=params):
                self.send_json({"error": "Unauthorized", "message": "管理密钥不正确或未提供"}, status=401)
                return

            with config_lock:
                az_raw = current_config.get("AZURE_SPEECH_KEY", "").strip()
                az_keys = [k.strip() for k in re.split(r'[,;\n\r]+', az_raw) if k.strip()]
                masked_az_keys = [mask_api_key(k) for k in az_keys]
                if len(az_keys) > 1:
                    az_display = f"{len(az_keys)} 个 Key (双路并发池已就绪): " + ", ".join(masked_az_keys)
                elif len(az_keys) == 1:
                    az_display = masked_az_keys[0]
                else:
                    az_display = ""

                safe_cfg = {
                    "AI_PROVIDER": current_config.get("AI_PROVIDER", "deepseek"),
                    "AI_BASE_URL": current_config.get("AI_BASE_URL", "https://api.deepseek.com"),
                    "AI_MODEL": current_config.get("AI_MODEL", "deepseek-chat"),
                    "AI_TEMPERATURE": current_config.get("AI_TEMPERATURE", "0.7"),
                    "AI_MAX_TOKENS": current_config.get("AI_MAX_TOKENS", "600"),
                    "AI_API_KEY_MASKED": mask_api_key(current_config.get("AI_API_KEY", "")),
                    "hasKey": bool(current_config.get("AI_API_KEY", "").strip()),
                    "AZURE_SPEECH_KEY_MASKED": az_display,
                    "azureKeyCount": len(az_keys),
                    "AZURE_SPEECH_REGION": current_config.get("AZURE_SPEECH_REGION", "eastasia"),
                    "hasAzureKey": bool(len(az_keys) > 0),
                    "adminTokenConfigured": bool(current_config.get("ADMIN_TOKEN", "")),
                    "APP_CONFIG": get_app_config()
                }
            self.send_json({"success": True, "config": safe_cfg})
            return

        # 5. Admin: Get Leads
        elif path == "/api/admin/leads":
            if not self.check_admin_auth(params=params):
                self.send_json({"error": "Unauthorized", "message": "管理密钥不正确或未提供"}, status=401)
                return

            leads = []
            if os.path.exists(LEADS_FILE):
                try:
                    with open(LEADS_FILE, "r", encoding="utf-8") as f:
                        leads = json.load(f)
                except Exception:
                    pass
            # Sort newest first
            leads.reverse()
            self.send_json({"success": True, "count": len(leads), "leads": leads})
            return

        # 6. Health Check
        elif path in ["/api/auth/health", "/api/health"]:
            with config_lock:
                has_key = bool(current_config.get("AI_API_KEY", "").strip())
                provider = current_config.get("AI_PROVIDER", "deepseek")
            self.send_json({
                "status": "ok",
                "app": "SunnyBridge Gateway & AI Hub",
                "aiActive": has_key,
                "provider": provider,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            return

        # 7. Edge TTS Speech Synthesis
        elif path in ["/api/ai/tts", "/api/tts"]:
            text = params.get("text", [""])[0]
            voice = params.get("voice", ["en-US-AnaNeural"])[0]
            rate = params.get("rate", ["-10%"])[0]
            if not text:
                self.send_json({"error": "text is required"}, status=400)
                return

            audio_data = get_edge_tts_audio(text, voice=voice, rate=rate)
            if audio_data:
                self.send_audio_data(audio_data)
                return
            else:
                self.send_json({"error": "tts_failed"}, status=500)
                return

        # 7.1 Fast Dictionary Lookup & Translation: /api/dictionary
        elif path == "/api/dictionary":
            word = params.get("word", [""])[0].strip()
            context = params.get("context", [""])[0].strip()
            if not word:
                self.send_json({"error": "word is required"}, status=400)
                return

            meaning = query_word_meaning(word, context)
            phonetic_val = meaning.get("phonetic", "") or meaning.get("pronunciation", "")
            self.send_json({
                "success": True,
                "word": word,
                "lemma": meaning.get("lemma", word),
                "translation": meaning.get("translation", ""),
                "translations": meaning.get("translations", []),
                "pos": meaning.get("pos", ""),
                "phonetic": phonetic_val,
                "pronunciation": phonetic_val,
                "definition": meaning.get("definition", ""),
                "source": meaning.get("source", "dictionary")
            })
            return

        # Student Vocabulary Meanings: /api/mine/meanings
        elif path == "/api/mine/meanings":
            user_id = self.get_current_user_id()
            items_per_page = int(params.get("items", ["10"])[0])
            page = int(params.get("page", ["1"])[0])
            with vocabulary_lock:
                user_vocab = get_user_vocabulary(user_id)
                total = len(user_vocab)
                start = (page - 1) * items_per_page
                end = start + items_per_page
                page_items = user_vocab[start:end]
                last_page = max(1, (total + items_per_page - 1) // items_per_page) if total > 0 else 1
                next_page = page + 1 if end < total else None
                self.send_json({
                    "meanings": page_items,
                    "page": page,
                    "next": next_page,
                    "last": last_page,
                    "total": total
                })
            return

        # 39 Phonemes Mastery & Badges: /api/phonemes/progress
        elif path == "/api/phonemes/progress":
            user_id = self.get_current_user_id()
            if "user_id" in params and params["user_id"][0]:
                user_id = params["user_id"][0].strip()
            data = get_user_phonemes(user_id)
            self.send_json({
                "status": "ok",
                "user_id": user_id,
                "masteryMap": data.get("masteryMap", {}),
                "badges": data.get("unlockedBadges", []),
                "stats": data.get("stats", {}),
                "updatedAt": data.get("updatedAt", "")
            })
            return

        # 8. Courses List
        elif path == "/api/courses":
            user_id = self.get_current_user_id()
            with courses_lock:
                course_list = []
                for c in courses_cache:
                    c_copy = {k: v for k, v in c.items() if k != "chapters"}
                    user_enr = get_user_enrollment(user_id, c["id"])
                    c_copy["enrolled"] = bool(user_enr)
                    c_copy["enrollment"] = user_enr
                    course_list.append(c_copy)
            self.send_json({
                "courses": course_list,
                "page": 1,
                "last": 1,
                "next": None
            })
            return

        # 9. Course Chapter Detail: /api/courses/{course_id}/chapters/{sequence_or_id}
        elif re.match(r"^/api/courses/([^/]+)/chapters/([^/]+)$", path):
            m = re.match(r"^/api/courses/([^/]+)/chapters/([^/]+)$", path)
            course_id = m.group(1)
            seq_or_id = m.group(2)
            user_id = self.get_current_user_id()

            target_course = None
            with courses_lock:
                for c in courses_cache:
                    if c["id"] == course_id:
                        target_course = c
                        break
            if not target_course:
                self.send_json({"error": "course_not_found"}, status=404)
                return

            target_ch = None
            for ch in target_course.get("chapters", []):
                if str(ch.get("sequence")) == seq_or_id or ch.get("id") == seq_or_id:
                    target_ch = dict(ch)
                    break

            if not target_ch:
                self.send_json({"error": "chapter_not_found"}, status=404)
                return

            user_enr = get_user_enrollment(user_id, course_id)
            if not user_enr:
                user_enr = create_or_get_enrollment(user_id, course_id)

            target_ch["course"] = {
                "id": target_course["id"],
                "title": target_course["title"],
                "chaptersCount": target_course.get("chaptersCount", len(target_course.get("chapters", []))),
                "coverUrl": target_course.get("coverUrl", "")
            }
            target_ch["enrollment"] = user_enr
            target_ch["finished"] = bool(user_enr and target_ch["id"] in user_enr.get("finished_chapters", []))
            self.send_json(target_ch)
            return

        # 10. Course Chapters List: /api/courses/{course_id}/chapters
        elif re.match(r"^/api/courses/([^/]+)/chapters$", path):
            m = re.match(r"^/api/courses/([^/]+)/chapters$", path)
            course_id = m.group(1)
            user_id = self.get_current_user_id()

            target_course = None
            with courses_lock:
                for c in courses_cache:
                    if c["id"] == course_id:
                        target_course = c
                        break
            if not target_course:
                self.send_json({"chapters": [], "page": 1, "last": 1, "next": None})
                return

            user_enr = get_user_enrollment(user_id, course_id)
            finished_ids = set(user_enr.get("finished_chapters", [])) if user_enr else set()

            chapters_res = []
            for ch in target_course.get("chapters", []):
                ch_copy = dict(ch)
                ch_copy["courseId"] = course_id
                ch_copy["finished"] = ch["id"] in finished_ids
                chapters_res.append(ch_copy)

            self.send_json({
                "chapters": chapters_res,
                "page": 1,
                "last": 1,
                "next": None
            })
            return

        # 11. Course Detail: /api/courses/{course_id}
        elif re.match(r"^/api/courses/([^/]+)$", path):
            m = re.match(r"^/api/courses/([^/]+)$", path)
            course_id = m.group(1)
            user_id = self.get_current_user_id()

            target_course = None
            with courses_lock:
                for c in courses_cache:
                    if c["id"] == course_id:
                        target_course = dict(c)
                        break
            if not target_course:
                self.send_json({"error": "course_not_found"}, status=404)
                return

            user_enr = get_user_enrollment(user_id, course_id)
            target_course["enrolled"] = bool(user_enr)
            target_course["enrollment"] = user_enr
            if "chapters" in target_course:
                target_course["chapters"] = [
                    {
                        "id": ch["id"],
                        "courseId": course_id,
                        "sequence": ch["sequence"],
                        "title": ch["title"],
                        "finishesCount": ch.get("finishesCount", 0),
                        "finished": bool(user_enr and ch["id"] in user_enr.get("finished_chapters", []))
                    }
                    for ch in target_course["chapters"]
                ]
            self.send_json(target_course)
            return

        # 12. Enrollments List
        elif path == "/api/enrollments":
            user_id = self.get_current_user_id()
            with enrollments_lock:
                user_enrs = [e for e in enrollments_cache.values() if e.get("user_id") == user_id]
            self.send_json({
                "enrollments": user_enrs,
                "page": 1,
                "last": 1,
                "next": None
            })
            return

        # 13. Chat Messages List: /api/chats/{chat_id}/messages
        elif re.match(r"^/api/chats/([^/]+)/messages$", path):
            m = re.match(r"^/api/chats/([^/]+)/messages$", path)
            chat_id = m.group(1)
            with chats_lock:
                msgs = chat_messages_cache.get(chat_id, [])
            self.send_json({
                "messages": msgs,
                "page": 1,
                "last": 1,
                "next": None
            })
            return

        # 14. Chat Detail: /api/chats/{chat_id}
        elif re.match(r"^/api/chats/([^/]+)$", path):
            m = re.match(r"^/api/chats/([^/]+)$", path)
            chat_id = m.group(1)
            user_id = self.get_current_user_id()
            default_agent = {
                "id": "agent_gangan",
                "name": "敢敢 AI 助教",
                "avatarUrl": "/assets/qiaobao_sunny240.png",
                "introduction": "Hi there! 🦁 我是你的本课 AI 助教小狮子敢敢！在右侧你可以随时向我提问关于本节课单词、发音或句型的问题，我们一起大声说英语吧！"
            }
            default_user = {
                "id": user_id,
                "name": "阳光桥学员",
                "avatarUrl": "/assets/qiaobao_sunny240.png"
            }
            with chats_lock:
                chat_info = chats_cache.get(chat_id)
                if not chat_info:
                    chat_info = {
                        "id": chat_id,
                        "user": default_user,
                        "agent": default_agent,
                        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                    }
                    chats_cache[chat_id] = chat_info
            self.send_json(chat_info)
            return

        else:
            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()


    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/ahoy/"):
            self.send_json({"status": "ok"})
            return
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
        
        try:
            data = json.loads(post_body.decode('utf-8'))
        except Exception:
            data = {}

        # 0. Student Vocabulary Lookup: /api/lookups
        if path == "/api/lookups":
            user_id = self.get_current_user_id()
            word = data.get("word", "").strip()
            context = data.get("context", "").strip()
            source_id = data.get("source_id", "") or data.get("sourceId", "")
            source_type = data.get("source_type", "manual") or data.get("sourceType", "manual")

            if not word:
                self.send_json({"error": "word_required"}, status=400)
                return

            meaning_data = query_word_meaning(word, context)
            now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            lookup_id = f"lookup-{uuid.uuid4().hex[:8]}"
            meaning_id = f"meaning-{hashlib.md5(word.lower().encode('utf-8')).hexdigest()[:12]}"

            ctx_sentence = context if context else (meaning_data.get("context") or f"This is an example sentence for {word}.")
            ctx_trans = meaning_data.get("contextTranslation") or ""

            lookup_item = {
                "id": lookup_id,
                "word": word,
                "context": ctx_sentence,
                "contextTranslation": ctx_trans,
                "sourceId": source_id,
                "sourceType": source_type,
                "createdAt": now_iso,
                "updatedAt": now_iso
            }

            with vocabulary_lock:
                user_vocab = get_user_vocabulary(user_id)
                existing_meaning = None
                for m in user_vocab:
                    if m.get("word", "").lower() == word.lower() or m.get("id") == meaning_id:
                        existing_meaning = m
                        break

                if existing_meaning:
                    if "lookups" not in existing_meaning:
                        existing_meaning["lookups"] = []
                    if not any(l.get("context") == ctx_sentence for l in existing_meaning["lookups"]):
                        existing_meaning["lookups"].append(lookup_item)
                    target_meaning = existing_meaning
                else:
                    target_meaning = {
                        "id": meaning_id,
                        "word": word,
                        "lemma": meaning_data.get("lemma", word),
                        "pos": meaning_data.get("pos", "n."),
                        "pronunciation": meaning_data.get("pronunciation", ""),
                        "translation": meaning_data.get("translation", ""),
                        "definition": meaning_data.get("definition", ""),
                        "lookups": [lookup_item]
                    }
                    user_vocab.insert(0, target_meaning)

                save_vocabulary()

            lookup_response = dict(lookup_item)
            lookup_response["meaning"] = target_meaning
            self.send_json(lookup_response)
            return

        # 39 Phonemes Progress Update: /api/phonemes/progress
        elif path == "/api/phonemes/progress":
            user_id = self.get_current_user_id()
            if "user_id" in data and data["user_id"]:
                user_id = str(data["user_id"]).strip()

            target_phoneme = data.get("phonemeId") or data.get("phoneme_id")
            mastered_val = data.get("mastered")
            batch_map = data.get("masteryMap")

            with phonemes_lock:
                record = get_user_phonemes(user_id)
                m_map = record.get("masteryMap", {})
                
                if batch_map and isinstance(batch_map, dict):
                    # Batch upsert
                    for k, v in batch_map.items():
                        m_map[str(k)] = bool(v)
                elif target_phoneme:
                    # Single toggle / set
                    if mastered_val is None:
                        m_map[str(target_phoneme)] = not bool(m_map.get(str(target_phoneme), False))
                    else:
                        m_map[str(target_phoneme)] = bool(mastered_val)

                badges = calculate_badges_for_mastery(m_map)
                unlocked_badge_ids = [b["id"] for b in badges if b.get("isUnlocked")]
                mastered_cnt = len([k for k, v in m_map.items() if v])
                now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ")

                record["masteryMap"] = m_map
                record["unlockedBadges"] = badges
                record["stats"] = {
                    "masteredCount": mastered_cnt,
                    "totalCount": 39,
                    "badgeCount": len(unlocked_badge_ids),
                    "lastUpdated": now_str
                }
                record["updatedAt"] = now_str
                save_phonemes()

            self.send_json({
                "status": "ok",
                "user_id": user_id,
                "masteryMap": m_map,
                "badges": badges,
                "stats": record["stats"],
                "updatedAt": now_str
            })
            return

        # 39 Phonemes Client-Cloud Sync: /api/phonemes/sync
        elif path == "/api/phonemes/sync":
            user_id = self.get_current_user_id()
            if "user_id" in data and data["user_id"]:
                user_id = str(data["user_id"]).strip()

            local_map = data.get("localMasteryMap") or data.get("masteryMap") or {}

            with phonemes_lock:
                record = get_user_phonemes(user_id)
                m_map = record.get("masteryMap", {})

                # Merge: Union logic (if local is mastered or cloud is mastered, keep mastered)
                if isinstance(local_map, dict):
                    for k, v in local_map.items():
                        if v:
                            m_map[str(k)] = True

                badges = calculate_badges_for_mastery(m_map)
                unlocked_badge_ids = [b["id"] for b in badges if b.get("isUnlocked")]
                mastered_cnt = len([k for k, v in m_map.items() if v])
                now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ")

                record["masteryMap"] = m_map
                record["unlockedBadges"] = badges
                record["stats"] = {
                    "masteredCount": mastered_cnt,
                    "totalCount": 39,
                    "badgeCount": len(unlocked_badge_ids),
                    "lastUpdated": now_str
                }
                record["updatedAt"] = now_str
                save_phonemes()

            self.send_json({
                "status": "ok",
                "user_id": user_id,
                "masteryMap": m_map,
                "badges": badges,
                "stats": record["stats"],
                "updatedAt": now_str
            })
            return

        # 1. WeChat Confirm
        elif path == "/api/auth/wechat/confirm":
            ticket = data.get("ticket")
            code = data.get("code")
            raw_nickname = (data.get("nickname") or "").strip()
            avatar_url = data.get("avatarUrl", "/assets/qiaobao_sunny240.png")

            if not ticket:
                self.send_json({"error": "ticket required"}, status=400)
                return

            openid = f"mock_wx_{uuid.uuid4().hex[:10]}"
            if code:
                try:
                    js_url = f"https://api.weixin.qq.com/sns/jscode2session?appid={APP_ID}&secret={APP_SECRET}&js_code={code}&grant_type=authorization_code"
                    req = urllib.request.Request(js_url, headers={"User-Agent": "SunnyBridgeAuth/1.0"})
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        js_data = json.loads(resp.read().decode('utf-8'))
                        if "openid" in js_data:
                            openid = js_data["openid"]
                            print(f"WeChat authorized openid: {openid}")
                except Exception as e:
                    print("jscode2session error:", e)

            # Determine clean student display name (no hardcoded stars/celebrity names)
            if raw_nickname and raw_nickname not in ["阳光桥小明星", "阳光桥小学员"]:
                nickname = raw_nickname
            else:
                tail = (openid[-4:] if len(openid) >= 4 else ticket[-4:]).upper()
                nickname = f"微信学员_{tail}"

            with tickets_lock:
                if ticket in tickets:
                    tickets[ticket]["status"] = "SUCCESS"
                    tickets[ticket]["user"] = {
                        "id": openid,
                        "name": nickname,
                        "avatarUrl": avatar_url,
                        "openid": openid,
                        "role": "student",
                        "isGuest": False,
                        "verifiedAt": time.strftime("%Y-%m-%d %H:%M:%S")
                    }
                    print(f"Ticket {ticket} verified successfully for {nickname} ({openid})!")
                    self.send_json({"status": "SUCCESS", "message": "授权成功"})
                else:
                    self.send_json({"error": "Ticket expired or not found"}, status=404)
            return

        # 2. Speech Evaluation
        elif path in ["/api/eval/speech", "/api/pronunciation/evaluate"]:
            duration = int(data.get("duration", 3))
            sentence = data.get("sentence", data.get("targetText", ""))
            import random
            if duration < 2:
                self.send_json({
                    "success": False,
                    "error": "too_short",
                    "message": "录音时间过短，未采集到完整英文句子"
                })
            else:
                score_base = 88 + random.randint(0, 8)
                words = [w for w in re.split(r'\s+', sentence) if w]
                wordDetails = [{"word": w, "score": min(99, score_base + random.randint(-3, 3)), "isCorrect": True} for w in words]
                self.send_json({
                    "success": True,
                    "overallScore": score_base,
                    "accuracyScore": min(99, score_base + random.randint(-2, 3)),
                    "fluencyScore": min(99, score_base + random.randint(-3, 2)),
                    "integrityScore": min(99, score_base + random.randint(1, 4)),
                    "words": wordDetails,
                    "result": {
                        "overallScore": score_base,
                        "accuracy": min(99, score_base + random.randint(-2, 3)),
                        "fluency": min(99, score_base + random.randint(-3, 2)),
                        "integrity": min(99, score_base + random.randint(1, 4)),
                        "comment": "发音自然连贯！特别在核心关键词的发音上非常饱满，敢敢给你点赞！🌟"
                    }
                })

        # 3. Azure Speech Assessment & STT Token Issuer (Multi-Key Pool & Queue)
        elif path in ["/api/speech/tokens", "/api/speech/token"]:
            keys, azure_region = get_azure_keys()
            if not keys:
                self.send_json({
                    "error": "no_azure_key",
                    "message": "尚未配置微软 Azure 纠音密钥，可在管理控制台 (/admin.html) 中设置"
                }, status=400)
                return

            slot_id = uuid.uuid4().hex[:12]
            assigned_key = None

            # 并发保护：从所有可用 Key 中动态抢占一个空闲或超时的评测槽位 (支持单Key单并发，多Key多并发)
            with key_slots_cv:
                for k in keys:
                    if k not in key_slots:
                        key_slots[k] = {"slot_id": None, "acquired_at": 0.0, "max_duration_sec": 7.0}

                wait_deadline = time.time() + 6.0
                while time.time() < wait_deadline:
                    now = time.time()
                    for k in keys:
                        s_info = key_slots[k]
                        if s_info["slot_id"] is None or (now - s_info["acquired_at"]) >= s_info["max_duration_sec"]:
                            s_info["slot_id"] = slot_id
                            s_info["acquired_at"] = now
                            assigned_key = k
                            break
                    if assigned_key:
                        break
                    key_slots_cv.wait(timeout=0.3)
                else:
                    assigned_key = keys[0]
                    key_slots[assigned_key]["slot_id"] = slot_id
                    key_slots[assigned_key]["acquired_at"] = time.time()

            try:
                sts_url = f"https://{azure_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
                req = urllib.request.Request(
                    sts_url,
                    data=b"",
                    headers={
                        "Ocp-Apim-Subscription-Key": assigned_key,
                        "Content-type": "application/x-www-form-urlencoded",
                        "Content-Length": "0",
                        "User-Agent": "SunnyBridgeGateway/1.0"
                    }
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    azure_token = resp.read().decode('utf-8')
                    self.send_json({
                        "id": int(time.time()),
                        "token": azure_token,
                        "region": azure_region,
                        "slotId": slot_id
                    })
                    return
            except Exception as e:
                # 异常时归还槽位
                with key_slots_cv:
                    for k, s_info in key_slots.items():
                        if s_info["slot_id"] == slot_id:
                            s_info["slot_id"] = None
                            s_info["acquired_at"] = 0.0
                            key_slots_cv.notify_all()
                self.send_json({
                    "error": "azure_token_error",
                    "message": f"微软语音服务认证失败: {str(e)}"
                }, status=502)
                return

        # 3.1 Release Assessment Slot
        elif path in ["/api/speech/release-slot", "/api/speech/release"]:
            rel_slot = data.get("slotId")
            with key_slots_cv:
                if rel_slot:
                    for k, s_info in key_slots.items():
                        if s_info["slot_id"] == rel_slot:
                            s_info["slot_id"] = None
                            s_info["acquired_at"] = 0.0
                            key_slots_cv.notify_all()
            self.send_json({"success": True})
            return

        # 4. AI TTS (Microsoft Edge Neural Voice)
        elif path in ["/api/ai/tts", "/api/tts"]:
            text = data.get("text", "")
            voice = data.get("voice", "en-US-AnaNeural")
            rate = data.get("rate", "-10%")
            if not text:
                self.send_json({"error": "text is required"}, status=400)
                return

            audio_data = get_edge_tts_audio(text, voice=voice, rate=rate)
            if audio_data:
                self.send_audio_data(audio_data)
                return
            else:
                self.send_json({"error": "tts_failed"}, status=500)
                return

        # 4. AI Chat Relay (Universal for Mini Program and Web App)
        elif path in ["/api/ai/chat", "/api/chat"]:
            messages = data.get("messages")
            if not messages:
                # Support single message payload from Mini Program
                user_msg = data.get("message", "")
                messages = [{"role": "user", "content": user_msg}]

            with config_lock:
                has_key = bool(current_config.get("AI_API_KEY", "").strip())

            if has_key:
                # Real LLM Call to DeepSeek / OpenAI / Moonshot
                result = call_upstream_llm(messages)
                if result.get("success"):
                    self.send_json({
                        "success": True,
                        "reply": result.get("reply", ""),
                        "replyEn": result.get("replyEn", ""),
                        "replyZh": result.get("replyZh", ""),
                        "choices": [
                            {
                                "message": {
                                    "role": "assistant",
                                    "content": result.get("reply", "")
                                }
                            }
                        ],
                        "model": result.get("model", ""),
                        "source": "live_llm",
                        "isFromCloud": True,
                        "latencyMs": result.get("latencyMs", 0)
                    })
                    return
                else:
                    print(f"Upstream LLM error: {result.get('error')} - {result.get('details')}")
                    # Fallback on upstream error

            # Dynamic diversified kid responses if emergency fallback is ever needed
            user_text = messages[-1].get("content", "").strip()
            last_msg = user_text.lower()
            seed_val = int(hashlib.md5(f"{last_msg}_{len(messages)}_{int(time.time()//10)}".encode('utf-8')).hexdigest()[:6], 16)

            if any(w in last_msg for w in ["leo", "name", "who are you", "what's your name"]):
                options = [
                    ("Hello there! 🦁 My name is Gangan! I am your little lion English companion! What is your name?", "你好呀！我是小狮子敢敢，你的英语伴读伙伴！你叫什么名字呀？"),
                    ("Hi! I'm Gangan the brave lion cub! 🌟 SunnyBridge is my home! What is your English name?", "嗨！我是勇敢的小狮子敢敢！阳光桥是我的家，你的英文名字是什么呀？")
                ]
            elif any(w in last_msg for w in ["cat", "dog", "animal", "pet", "lion", "rabbit", "puppy", "kitten"]):
                options = [
                    ("Dogs and cats are so adorable! 🐶🐱 Do you have a pet at home?", "小狗和小猫都太可爱啦！你家里有养小宠物吗？"),
                    ("Animals are wonderful friends! 🦁 I love running with little animals. What animal do you like most?", "小动物是人类最好的朋友！我最喜欢和小动物一起玩耍，你最喜欢哪种动物呀？"),
                    ("Woof woof and meow! 🐾 Pets make every day so happy. Do you like big dogs or little cats?", "汪汪、喵喵！有宠物每天都好开心，你更喜欢大狗狗还是小猫咪呀？")
                ]
            elif any(w in last_msg for w in ["apple", "banana", "food", "pizza", "eat", "fruit", "cake", "ice cream"]):
                options = [
                    ("Yummy! 🍎 Sweet fruits give us lots of energy! Do you like red apples or yellow bananas?", "真好吃！甜甜的水果给我们满满的能量！你喜欢红苹果还是黄香蕉呀？"),
                    ("Delicious food makes me smile! 🍕 What is your favorite snack after school?", "美味的食物让人心情大好！放学后你最喜欢的零食是什么呀？")
                ]
            elif any(w in last_msg for w in ["color", "red", "blue", "green", "yellow", "pink", "purple"]):
                options = [
                    ("Colors make our world shine! 🌈 My favorite color is sunny bright orange! What is yours?", "色彩让世界变得璀璨！我最喜欢阳光般灿烂的橙色，你呢？"),
                    ("I love drawing with colorful crayons! 🎨 Do you like blue skies or green grass?", "我喜欢用五颜六色的蜡笔画画！你喜欢蓝蓝的天空还是绿绿的草地？")
                ]
            elif any(w in last_msg for w in ["hello", "hi", "hey", "good morning", "good afternoon"]):
                options = [
                    ("Hi my awesome friend! 🌟 I'm so happy to chat with you! Are you ready for an English adventure?", "嗨我超棒的朋友！能和你聊天太开心啦！准备好开启英语大冒险了吗？"),
                    ("Good day! 🦁 Gangan is here to cheer for you! How are you doing today?", "你好呀！敢敢随时为你加油打气！你今天过得怎么样？")
                ]
            else:
                options = [
                    ("You speak English so well! 🌟 Tell me more about what you like!", "你说英语太棒啦！快跟我多讲讲你喜欢什么吧！"),
                    ("That sounds super interesting! 🦁 What other fun things did you do today?", "听起来超级有趣！你今天还做了什么好玩的事呀？"),
                    ("Wow, I love chatting with you! 🎈 Keep practicing English with Gangan!", "哇，我太喜欢和你聊天啦！继续和敢敢一起练英语吧！")
                ]

            picked_en, picked_zh = options[seed_val % len(options)]

            self.send_json({
                "success": True,
                "reply": f"{picked_en}\n{picked_zh}",
                "replyEn": picked_en,
                "replyZh": picked_zh,
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": f"{picked_en}\n{picked_zh}"
                        }
                    }
                ],
                "model": "gangan-backup-dialog",
                "source": "live_backup",
                "isFromCloud": True
            })
            return

        # 3.2 Update Dynamic App Configuration
        elif path in ["/api/v1/config/app", "/api/app/config"]:
            if not self.check_admin_auth(body_data=data):
                self.send_json({"error": "Unauthorized", "message": "管理密钥不正确或未提供"}, status=401)
                return
            new_conf_data = data.get("config", data)
            updated = update_app_config(new_conf_data)
            self.send_json({"success": True, "config": updated})
            return

        # 4. Admin: Update Configuration
        elif path == "/api/admin/config":
            if not self.check_admin_auth(body_data=data):
                self.send_json({"error": "Unauthorized", "message": "管理密钥不正确或未提供"}, status=401)
                return

            if "APP_CONFIG" in data and isinstance(data["APP_CONFIG"], dict):
                update_app_config(data["APP_CONFIG"])

            new_fields = {}
            for field in ["AI_PROVIDER", "AI_BASE_URL", "AI_MODEL", "AI_TEMPERATURE", "AI_MAX_TOKENS", "AZURE_SPEECH_REGION"]:
                if field in data and data[field] is not None:
                    new_fields[field] = str(data[field]).strip()

            # Update API key if provided and not masked
            if "AI_API_KEY" in data:
                key_input = str(data["AI_API_KEY"]).strip()
                if key_input and not key_input.startswith("sk-") and "..." in key_input:
                    pass # User didn't change masked key
                elif key_input:
                    new_fields["AI_API_KEY"] = key_input

            # Update Azure Speech Key and Region if provided
            if "AZURE_SPEECH_KEY" in data:
                az_key = str(data["AZURE_SPEECH_KEY"]).strip()
                if az_key and not "..." in az_key:
                    new_fields["AZURE_SPEECH_KEY"] = az_key
            if "AZURE_SPEECH_REGION" in data:
                az_reg = str(data["AZURE_SPEECH_REGION"]).strip()
                if az_reg:
                    new_fields["AZURE_SPEECH_REGION"] = az_reg

            # Change admin token if requested
            if "NEW_ADMIN_TOKEN" in data and data["NEW_ADMIN_TOKEN"].strip():
                new_fields["ADMIN_TOKEN"] = data["NEW_ADMIN_TOKEN"].strip()

            save_env(new_fields)
            self.send_json({
                "success": True,
                "message": "配置已成功保存并即时生效！",
                "hasKey": bool(current_config.get("AI_API_KEY", "").strip()),
                "hasAzureKey": bool(current_config.get("AZURE_SPEECH_KEY", "").strip())
            })
            return

        # 5. Admin: Live Test AI Connection
        elif path == "/api/admin/test-ai":
            if not self.check_admin_auth(body_data=data):
                self.send_json({"error": "Unauthorized", "message": "管理密钥不正确或未提供"}, status=401)
                return

            test_key = data.get("apiKey")
            test_url = data.get("baseUrl")
            test_model = data.get("model")
            test_msg = data.get("message") or "Hello Gangan! Tell me what is your favorite color?"

            test_messages = [{"role": "user", "content": test_msg}]
            res = call_upstream_llm(test_messages, api_key=test_key, base_url=test_url, model=test_model)
            self.send_json(res)
            return

        # 6. Admin: Test Azure Speech Connection
        elif path == "/api/admin/test-azure":
            if not self.check_admin_auth(body_data=data):
                self.send_json({"error": "Unauthorized", "message": "管理密钥不正确或未提供"}, status=401)
                return

            azure_key = str(data.get("azureKey", "")).strip()
            azure_region = str(data.get("azureRegion", "")).strip()

            with config_lock:
                if not azure_key or "..." in azure_key:
                    azure_key = current_config.get("AZURE_SPEECH_KEY", "").strip()
                if not azure_region:
                    azure_region = current_config.get("AZURE_SPEECH_REGION", "eastasia").strip()

            keys = [k.strip() for k in re.split(r'[,;\n\r]+', azure_key) if k.strip()]
            if not keys:
                self.send_json({
                    "success": False,
                    "error": "no_key",
                    "message": "请先输入微软 Azure 语音服务 Key"
                })
                return

            results = []
            all_success = True
            total_latency = 0

            for i, k in enumerate(keys):
                masked = mask_api_key(k)
                t0 = time.time()
                try:
                    sts_url = f"https://{azure_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
                    req = urllib.request.Request(
                        sts_url,
                        data=b"",
                        headers={
                            "Ocp-Apim-Subscription-Key": k,
                            "Content-type": "application/x-www-form-urlencoded",
                            "Content-Length": "0",
                            "User-Agent": "SunnyBridgeGateway/1.0"
                        }
                    )
                    with urllib.request.urlopen(req, timeout=8) as resp:
                        elapsed = int((time.time() - t0) * 1000)
                        total_latency += elapsed
                        results.append(f"Key #{i+1} [{masked}]: 连通成功 (延迟 {elapsed}ms)")
                except Exception as e:
                    all_success = False
                    results.append(f"Key #{i+1} [{masked}]: 连通失败 ({str(e)})")

            avg_latency = total_latency // len(keys) if keys else 0
            if all_success:
                summary = f"🎉 恭喜！已测试全部 {len(keys)} 个 Key，100% 成功连通微软官方语音服务 (双路并发池已就绪)！\n\n" + "\n".join(results)
                self.send_json({
                    "success": True,
                    "message": summary,
                    "region": azure_region,
                    "latencyMs": avg_latency
                })
            else:
                summary = f"⚠️ 部分 Key 测试未通过：\n\n" + "\n".join(results)
                self.send_json({
                    "success": False,
                    "error": "partial_failure",
                    "message": summary,
                    "region": azure_region,
                    "latencyMs": avg_latency
                })
            return

        # 6. Admin: Delete Lead
        elif path == "/api/admin/leads/delete":
            if not self.check_admin_auth(body_data=data):
                self.send_json({"error": "Unauthorized", "message": "管理密钥不正确或未提供"}, status=401)
                return

            target_id = data.get("id")
            if not target_id:
                self.send_json({"error": "Missing id"}, status=400)
                return

            if os.path.exists(LEADS_FILE):
                try:
                    with open(LEADS_FILE, "r", encoding="utf-8") as f:
                        leads = json.load(f)
                    new_leads = [l for l in leads if l.get("id") != target_id]
                    with open(LEADS_FILE, "w", encoding="utf-8") as f:
                        json.dump(new_leads, f, ensure_ascii=False, indent=2)
                    self.send_json({"success": True, "message": "线索已删除"})
                    return
                except Exception as e:
                    self.send_json({"error": str(e)}, status=500)
                    return
            self.send_json({"success": True})
            return

        # 7. Public Lead Submission
        elif path in ["/api/leads", "/api/v1/leads"]:
            print(f"[{time.strftime('%X')}] Received new booking/lead: {data}")
            lead_record = {
                "id": uuid.uuid4().hex[:12],
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "name": data.get("name", ""),
                "phone": data.get("phone", ""),
                "wechat": data.get("wechat", ""),
                "age": data.get("age", ""),
                "course": data.get("course", ""),
                "message": data.get("message", ""),
                "source": data.get("source", "微信小程序/预约交流")
            }
            try:
                existing = []
                if os.path.exists(LEADS_FILE):
                    with open(LEADS_FILE, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                existing.append(lead_record)
                with open(LEADS_FILE, "w", encoding="utf-8") as f:
                    json.dump(existing, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print("Error saving lead record:", e)

            self.send_json({
                "success": True,
                "status": "SUCCESS",
                "message": "预约提交成功",
                "lead": lead_record
            })
            return

        # 8. Create Enrollment
        elif path == "/api/enrollments":
            course_id = data.get("course_id") or data.get("courseId")
            user_id = self.get_current_user_id()
            if not course_id:
                self.send_json({"error": "course_id_required"}, status=400)
                return

            user_enr = create_or_get_enrollment(user_id, course_id)
            self.send_json(user_enr)
            return

        # 9. Finish Chapter: /api/courses/{course_id}/chapters/{seq_or_id}/finish
        elif re.match(r"^/api/courses/([^/]+)/chapters/([^/]+)/finish$", path):
            m = re.match(r"^/api/courses/([^/]+)/chapters/([^/]+)/finish$", path)
            course_id = m.group(1)
            seq_str = m.group(2)
            user_id = self.get_current_user_id()

            with enrollments_lock:
                user_enr = None
                for enr in enrollments_cache.values():
                    if enr.get("user_id") == user_id and (enr.get("course_id") == course_id or enr.get("courseId") == course_id):
                        user_enr = enr
                        break
                if not user_enr:
                    user_enr = create_or_get_enrollment(user_id, course_id)

                total_chapters = 1
                target_ch_id = None
                with courses_lock:
                    for c in courses_cache:
                        if c["id"] == course_id:
                            total_chapters = max(1, len(c.get("chapters", [])))
                            for ch in c.get("chapters", []):
                                if str(ch.get("sequence")) == seq_str or ch.get("id") == seq_str:
                                    target_ch_id = ch["id"]
                                    ch["finishesCount"] = ch.get("finishesCount", 0) + 1
                                    break
                            save_courses()
                            break

                finished = set(user_enr.get("finished_chapters", []))
                if target_ch_id:
                    finished.add(target_ch_id)
                user_enr["finished_chapters"] = list(finished)
                user_enr["progress"] = min(1.0, round(len(finished) / total_chapters, 2))
                if user_enr["progress"] >= 1.0:
                    user_enr["state"] = "completed"
                now_str = time.strftime("%Y-%m-%d %H:%M:%S")
                user_enr["updated_at"] = now_str
                user_enr["updatedAt"] = now_str
                save_enrollments()

            self.send_json({"success": True, "progress": user_enr["progress"]})
            return

        # 10. Create Chat: /api/chats
        elif path == "/api/chats":
            agent_id = data.get("agent_id") or data.get("agentId")
            agent_type = data.get("agent_type") or data.get("agentType", "Chapter")
            user_id = self.get_current_user_id()

            chat_id = f"chat_{hashlib.md5(f'{user_id}_{agent_type}_{agent_id}'.encode('utf-8')).hexdigest()[:12]}"
            chat_obj = {
                "id": chat_id,
                "agent_id": agent_id,
                "agentId": agent_id,
                "agent_type": agent_type,
                "agentType": agent_type,
                "user_id": user_id,
                "user": {
                    "id": user_id,
                    "name": "阳光桥学员",
                    "avatarUrl": "/assets/qiaobao_sunny240.png"
                },
                "agent": {
                    "id": agent_id or "agent_gangan",
                    "name": "敢敢 AI 助教",
                    "avatarUrl": "/assets/qiaobao_sunny240.png",
                    "introduction": "Hi there! 🦁 我是你的本课 AI 助教小狮子敢敢！在右侧你可以随时向我提问关于本节课单词、发音或句型的问题，我们一起大声说英语吧！"
                },
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            with chats_lock:
                chats_cache[chat_id] = chat_obj
                if chat_id not in chat_messages_cache:
                    chat_messages_cache[chat_id] = [
                        {
                            "id": f"msg_{uuid.uuid4().hex[:10]}",
                            "chat_id": chat_id,
                            "chatId": chat_id,
                            "role": "assistant",
                            "query": "",
                            "response": "Hi there! 🦁 I am Gangan, your AI companion for this chapter! If you have any questions or want to practice pronunciation together, just ask me!",
                            "content": "Hi there! 🦁 I am Gangan, your AI companion for this chapter! If you have any questions or want to practice pronunciation together, just ask me!",
                            "agent": chat_obj["agent"],
                            "user": chat_obj["user"],
                            "chat": chat_obj,
                            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                            "createdAt": time.strftime("%Y-%m-%d %H:%M:%S")
                        }
                    ]
            self.send_json(chat_obj)
            return

        # 11. Send Chat Message: /api/chats/{chat_id}/messages
        elif re.match(r"^/api/chats/([^/]+)/messages$", path):
            m = re.match(r"^/api/chats/([^/]+)/messages$", path)
            chat_id = m.group(1)
            query = data.get("query", "").strip()
            if not query:
                self.send_json({"error": "query_required"}, status=400)
                return

            now_str = time.strftime("%Y-%m-%d %H:%M:%S")
            with chats_lock:
                chat_obj = chats_cache.get(chat_id, {
                    "id": chat_id,
                    "user": {"id": "guest_user", "name": "阳光桥学员", "avatarUrl": "/assets/qiaobao_sunny240.png"},
                    "agent": {
                        "id": "agent_gangan",
                        "name": "敢敢 AI 助教",
                        "avatarUrl": "/assets/qiaobao_sunny240.png",
                        "introduction": "Hi there! 🦁 我是你的本课 AI 助教小狮子敢敢！"
                    }
                })

            user_msg = {
                "id": f"msg_{uuid.uuid4().hex[:10]}",
                "chat_id": chat_id,
                "chatId": chat_id,
                "role": "user",
                "query": query,
                "content": query,
                "agent": chat_obj["agent"],
                "user": chat_obj["user"],
                "chat": chat_obj,
                "created_at": now_str,
                "createdAt": now_str
            }
            with chats_lock:
                if chat_id not in chat_messages_cache:
                    chat_messages_cache[chat_id] = []
                chat_messages_cache[chat_id].append(user_msg)

            # Upstream LLM call
            llm_history = [{"role": m.get("role", "user"), "content": m.get("content") or m.get("query", "")} for m in chat_messages_cache[chat_id]]
            llm_res = call_upstream_llm(llm_history)
            reply_text = llm_res.get("reply") or "Great job! 🦁 Keep reading with me and let's speak English bravely!"

            assistant_msg = {
                "id": f"msg_{uuid.uuid4().hex[:10]}",
                "chat_id": chat_id,
                "chatId": chat_id,
                "role": "assistant",
                "query": query,
                "response": reply_text,
                "content": reply_text,
                "agent": chat_obj["agent"],
                "user": chat_obj["user"],
                "chat": chat_obj,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "createdAt": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            with chats_lock:
                chat_messages_cache[chat_id].append(assistant_msg)

            self.send_json(assistant_msg)
            return

        else:
            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
        
        try:
            data = json.loads(post_body.decode('utf-8'))
        except Exception:
            data = {}

        # 1. Update Enrollment: /api/enrollments/{enrollment_id}
        m = re.match(r"^/api/enrollments/([^/]+)$", path)
        if m:
            enr_id = m.group(1)
            target_ch_id = data.get("current_chapter_id") or data.get("currentChapterId")
            with enrollments_lock:
                if enr_id in enrollments_cache:
                    enr = enrollments_cache[enr_id]
                    if target_ch_id:
                        enr["current_chapter_id"] = target_ch_id
                        enr["currentChapterId"] = target_ch_id
                        with courses_lock:
                            for c in courses_cache:
                                if c["id"] == enr.get("course_id") or c["id"] == enr.get("courseId"):
                                    for ch in c.get("chapters", []):
                                        if ch["id"] == target_ch_id:
                                            enr["current_chapter_sequence"] = ch["sequence"]
                                            enr["currentChapterSequence"] = ch["sequence"]
                                            break
                        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
                        enr["updated_at"] = now_str
                        enr["updatedAt"] = now_str
                        save_enrollments()
                    self.send_json(enr)
                    return
                # Friendly fallback enrollment
                now_str = time.strftime("%Y-%m-%d %H:%M:%S")
                mock_enr = {
                    "id": enr_id,
                    "state": "in_progress",
                    "progress": 0.0,
                    "currentChapterId": target_ch_id,
                    "current_chapter_id": target_ch_id,
                    "createdAt": now_str,
                    "updatedAt": now_str
                }
                self.send_json(mock_enr)
                return

        self.send_response(404)
        self.send_cors_headers()
        self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        user_id = self.get_current_user_id()

        # Delete Meaning: /api/mine/meanings/{id}
        m = re.match(r"^/api/mine/meanings/([^/]+)$", path)
        if m:
            meaning_id = m.group(1)
            with vocabulary_lock:
                user_vocab = get_user_vocabulary(user_id)
                initial_len = len(user_vocab)
                user_vocab[:] = [x for x in user_vocab if x.get("id") != meaning_id]
                if len(user_vocab) < initial_len:
                    save_vocabulary()
            self.send_json({"success": True, "id": meaning_id})
            return

        self.send_response(404)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass

def run():
    clean_thread = threading.Thread(target=clean_expired_tickets, daemon=True)
    clean_thread.start()

    load_courses()
    load_enrollments()
    load_vocabulary()
    load_phonemes()

    server_address = ('127.0.0.1', 8001)
    httpd = http.server.ThreadingHTTPServer(server_address, WeChatAuthHandler)
    print("SunnyBridge Gateway & AI Hub started on http://127.0.0.1:8001")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
