# -*- coding: utf-8 -*-
import sys
import re

# Complete 39 phonemes data dictionary
PHONEMES_DATA = {
  # --- 辅音 Consonants (22个) ---
  "p": {
    "name": "双唇清塞音 (如 pen, apple, cup)",
    "category": "爆破音",
    "voiced": False,
    "sampleWord": "pen",
    "phonicsSpell": "p-e-n",
    "ipa": "/pen/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 86, "lipHeight": 0, "jawDrop": 8, "teethGap": 4, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 130, "bodyX": 145, "bodyY": 130, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 220, "y": 115, "label": "双唇紧闭阻气，瞬间向外爆破"},
    "airflowType": "oral"
  },
  "b": {
    "name": "双唇浊塞音 (如 book, big, baby)",
    "category": "爆破音",
    "voiced": True,
    "sampleWord": "book",
    "phonicsSpell": "b-oo-k",
    "ipa": "/bʊk/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 86, "lipHeight": 0, "jawDrop": 8, "teethGap": 4, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 130, "bodyX": 145, "bodyY": 130, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 220, "y": 115, "label": "双唇闭合瞬间弹开，声带强力振动"},
    "airflowType": "oral"
  },
  "t": {
    "name": "齿龈清塞音 (如 tea, ten, cat)",
    "category": "爆破音",
    "voiced": False,
    "sampleWord": "tea",
    "phonicsSpell": "t-e-a",
    "ipa": "/tiː/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 88, "lipHeight": 18, "jawDrop": 12, "teethGap": 7, "tongueTipVisible": True, "tongueTipProtrusion": 0, "tongueAlveolarTouch": True},
    "tongueShape": {"tipX": 188, "tipY": 88, "bodyX": 145, "bodyY": 115, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 188, "y": 88, "label": "舌尖抵齿龈后弹开，清脆爆破"},
    "airflowType": "oral"
  },
  "d": {
    "name": "齿龈浊塞音 (如 dog, duck, door)",
    "category": "爆破音",
    "voiced": True,
    "sampleWord": "dog",
    "phonicsSpell": "d-o-g",
    "ipa": "/dɔːɡ/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 88, "lipHeight": 18, "jawDrop": 12, "teethGap": 7, "tongueTipVisible": True, "tongueTipProtrusion": 0, "tongueAlveolarTouch": True},
    "tongueShape": {"tipX": 188, "tipY": 88, "bodyX": 145, "bodyY": 115, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 188, "y": 88, "label": "舌尖紧贴上齿龈，声带强烈振动"},
    "airflowType": "oral"
  },
  "k": {
    "name": "软腭清塞音 (如 cat, kite, cup)",
    "category": "爆破音",
    "voiced": False,
    "sampleWord": "cat",
    "phonicsSpell": "c-a-t",
    "ipa": "/kæt/",
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
    "jawOpen": "medium",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 90, "lipHeight": 22, "jawDrop": 14, "teethGap": 9, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 170, "tipY": 135, "bodyX": 138, "bodyY": 110, "rootX": 115, "rootY": 98},
    "focusPoint": {"x": 130, "y": 95, "label": "舌根紧贴软腭，瞬间下弹爆破"},
    "airflowType": "oral"
  },
  "g": {
    "name": "软腭浊塞音 (如 go, girl, big)",
    "category": "爆破音",
    "voiced": True,
    "sampleWord": "go",
    "phonicsSpell": "g-o",
    "ipa": "/ɡoʊ/",
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
    "jawOpen": "medium",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 90, "lipHeight": 22, "jawDrop": 14, "teethGap": 9, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 170, "tipY": 135, "bodyX": 138, "bodyY": 110, "rootX": 115, "rootY": 98},
    "focusPoint": {"x": 130, "y": 95, "label": "舌根顶软腭，声带强烈蜂鸣振动"},
    "airflowType": "oral"
  },
  "f": {
    "name": "唇齿清擦音 (如 fish, face, foot)",
    "category": "唇齿音",
    "voiced": False,
    "sampleWord": "fish",
    "phonicsSpell": "f-i-s-h",
    "ipa": "/fɪʃ/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 86, "lipHeight": 16, "jawDrop": 10, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 130, "bodyX": 145, "bodyY": 125, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 215, "y": 118, "label": "上门牙轻触下唇内侧，平稳送气"},
    "airflowType": "friction"
  },
  "v": {
    "name": "唇齿浊擦音 (如 very, van, love)",
    "category": "唇齿音",
    "voiced": True,
    "sampleWord": "very",
    "phonicsSpell": "v-e-r-y",
    "ipa": "/ˈveri/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 86, "lipHeight": 16, "jawDrop": 10, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 130, "bodyX": 145, "bodyY": 125, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 215, "y": 118, "label": "上齿轻咬下唇，声带强烈蜂鸣震颤"},
    "airflowType": "friction"
  },
  "θ": {
    "name": "咬舌清辅音 (如 think, three, teeth)",
    "category": "咬舌音",
    "voiced": False,
    "sampleWord": "think",
    "phonicsSpell": "th-i-n-k",
    "ipa": "/θɪŋk/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 90, "lipHeight": 20, "jawDrop": 12, "teethGap": 7, "tongueTipVisible": True, "tongueTipProtrusion": 8},
    "tongueShape": {"tipX": 204, "tipY": 106, "bodyX": 155, "bodyY": 125, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 204, "y": 106, "label": "舌尖伸出齿缝 2-3 毫米，轻夹送气"},
    "airflowType": "interdental"
  },
  "ð": {
    "name": "咬舌浊辅音 (如 this, that, mother)",
    "category": "咬舌音",
    "voiced": True,
    "sampleWord": "this",
    "phonicsSpell": "th-i-s",
    "ipa": "/ðɪs/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 90, "lipHeight": 20, "jawDrop": 12, "teethGap": 7, "tongueTipVisible": True, "tongueTipProtrusion": 8},
    "tongueShape": {"tipX": 203, "tipY": 106, "bodyX": 155, "bodyY": 125, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 203, "y": 106, "label": "舌尖轻触齿缝，声带强烈振动"},
    "airflowType": "interdental"
  },
  "s": {
    "name": "齿龈清擦音 (如 see, sun, bus)",
    "category": "齿龈音",
    "voiced": False,
    "sampleWord": "sun",
    "phonicsSpell": "s-u-n",
    "ipa": "/sʌn/",
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
    "jawOpen": "small",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 92, "lipHeight": 16, "jawDrop": 6, "teethGap": 3, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 186, "tipY": 92, "bodyX": 150, "bodyY": 110, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 186, "y": 92, "label": "舌尖极贴近上齿龈留发丝细缝，清脆送气"},
    "airflowType": "friction"
  },
  "z": {
    "name": "齿龈浊擦音 (如 zoo, buzz, prize)",
    "category": "齿龈音",
    "voiced": True,
    "sampleWord": "zoo",
    "phonicsSpell": "z-oo",
    "ipa": "/zuː/",
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
    "jawOpen": "small",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 92, "lipHeight": 16, "jawDrop": 6, "teethGap": 3, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 186, "tipY": 92, "bodyX": 150, "bodyY": 110, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 186, "y": 92, "label": "齿龈微缝强摩擦，声带强烈蜂鸣震颤"},
    "airflowType": "friction"
  },
  "ʃ": {
    "name": "齿龈后擦嘘音 (如 ship, fish, she)",
    "category": "嘘擦音",
    "voiced": False,
    "sampleWord": "ship",
    "phonicsSpell": "sh-i-p",
    "ipa": "/ʃɪp/",
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
    "jawOpen": "small",
    "lipShape": "protruded",
    "frontLipParams": {"lipWidth": 68, "lipHeight": 24, "jawDrop": 12, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 178, "tipY": 92, "bodyX": 148, "bodyY": 105, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 178, "y": 92, "label": "双唇向前噘起，舌叶贴近前硬腭形成细缝"},
    "airflowType": "friction"
  },
  "h": {
    "name": "声门清擦音 (如 hat, hot, home)",
    "category": "声门音",
    "voiced": False,
    "sampleWord": "hat",
    "phonicsSpell": "h-a-t",
    "ipa": "/hæt/",
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
    "jawOpen": "medium",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 88, "lipHeight": 24, "jawDrop": 14, "teethGap": 8, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 130, "bodyX": 145, "bodyY": 125, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 110, "y": 170, "label": "声门微开深呼吸，像冬日哈气"},
    "airflowType": "friction"
  },
  "tʃ": {
    "name": "清破擦音 (如 chair, teacher, watch)",
    "category": "破擦音",
    "voiced": False,
    "sampleWord": "chair",
    "phonicsSpell": "ch-air",
    "ipa": "/tʃer/",
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
    "jawOpen": "small",
    "lipShape": "protruded",
    "frontLipParams": {"lipWidth": 70, "lipHeight": 22, "jawDrop": 12, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 185, "tipY": 90, "bodyX": 148, "bodyY": 106, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 185, "y": 90, "label": "舌尖抵齿龈后瞬间微弹，嘘声爆破"},
    "airflowType": "friction"
  },
  "dʒ": {
    "name": "浊破擦音 (如 jump, job, orange)",
    "category": "破擦音",
    "voiced": True,
    "sampleWord": "jump",
    "phonicsSpell": "j-u-m-p",
    "ipa": "/dʒʌmp/",
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
    "jawOpen": "small",
    "lipShape": "protruded",
    "frontLipParams": {"lipWidth": 70, "lipHeight": 22, "jawDrop": 12, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 185, "tipY": 90, "bodyX": 148, "bodyY": 106, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 185, "y": 90, "label": "双唇微突，舌尖破裂瞬间声带强劲振动"},
    "airflowType": "friction"
  },
  "m": {
    "name": "双唇鼻辅音 (如 moon, man, mom)",
    "category": "鼻音",
    "voiced": True,
    "sampleWord": "moon",
    "phonicsSpell": "m-oo-n",
    "ipa": "/muːn/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 84, "lipHeight": 0, "jawDrop": 6, "teethGap": 2, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 130, "bodyX": 145, "bodyY": 125, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 220, "y": 115, "label": "双唇紧闭，气流完全从鼻腔哼出"},
    "airflowType": "nasal"
  },
  "n": {
    "name": "齿龈鼻辅音 (如 nose, nut, sun)",
    "category": "鼻音",
    "voiced": True,
    "sampleWord": "nose",
    "phonicsSpell": "n-o-s-e",
    "ipa": "/noʊz/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 88, "lipHeight": 16, "jawDrop": 10, "teethGap": 6, "tongueTipVisible": True, "tongueTipProtrusion": 0, "tongueAlveolarTouch": True},
    "tongueShape": {"tipX": 188, "tipY": 88, "bodyX": 145, "bodyY": 115, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 188, "y": 88, "label": "舌尖紧贴上齿龈，气流由鼻腔透出"},
    "airflowType": "nasal"
  },
  "ŋ": {
    "name": "软腭后鼻音 (如 morning, singing, ring)",
    "category": "鼻音",
    "voiced": True,
    "sampleWord": "singing",
    "phonicsSpell": "s-i-ng-i-ng",
    "ipa": "/ˈsɪŋɪŋ/",
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
    "jawOpen": "medium",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 86, "lipHeight": 22, "jawDrop": 14, "teethGap": 8, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 172, "tipY": 135, "bodyX": 142, "bodyY": 120, "rootX": 118, "rootY": 102},
    "focusPoint": {"x": 118, "y": 102, "label": "舌根紧贴软腭天花板，强后鼻腔共鸣"},
    "airflowType": "nasal"
  },
  "l": {
    "name": "舌尖中边音 (如 light, exactly, life)",
    "category": "舌侧音",
    "voiced": True,
    "sampleWord": "exactly",
    "phonicsSpell": "ex-act-ly",
    "ipa": "/ɪɡˈzæktli/",
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
    "jawOpen": "medium",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 94, "lipHeight": 26, "jawDrop": 16, "teethGap": 10, "tongueTipVisible": True, "tongueTipProtrusion": 0, "tongueAlveolarTouch": True},
    "tongueShape": {"tipX": 186, "tipY": 89, "bodyX": 145, "bodyY": 116, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 186, "y": 89, "label": "舌尖紧抵上齿龈，气流从两侧逸出"},
    "airflowType": "lateral"
  },
  "r": {
    "name": "卷舌辅音 (如 red, room, tree)",
    "category": "卷舌音",
    "voiced": True,
    "sampleWord": "red",
    "phonicsSpell": "r-e-d",
    "ipa": "/red/",
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
    "jawOpen": "medium",
    "lipShape": "protruded",
    "frontLipParams": {"lipWidth": 70, "lipHeight": 28, "jawDrop": 14, "teethGap": 8, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 165, "tipY": 105, "bodyX": 135, "bodyY": 130, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 165, "y": 105, "label": "舌尖向后卷起悬空，绝不触碰上腭天花板"},
    "airflowType": "oral"
  },
  "w": {
    "name": "双唇圆唇半元音 (如 water, we, win)",
    "category": "半元音",
    "voiced": True,
    "sampleWord": "water",
    "phonicsSpell": "w-a-t-e-r",
    "ipa": "/ˈwɔːtər/",
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
    "jawOpen": "small",
    "lipShape": "round",
    "frontLipParams": {"lipWidth": 55, "lipHeight": 28, "jawDrop": 14, "teethGap": 8, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 170, "tipY": 130, "bodyX": 135, "bodyY": 125, "rootX": 118, "rootY": 105},
    "focusPoint": {"x": 200, "y": 108, "label": "双唇撅圆成小吸管口，声带振动迅速滑开"},
    "airflowType": "oral"
  },
  "j": {
    "name": "硬腭半元音 (如 you, yes, your, year)",
    "category": "半元音",
    "voiced": True,
    "sampleWord": "you",
    "phonicsSpell": "y-ou",
    "ipa": "/juː/",
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
    "jawOpen": "small",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 92, "lipHeight": 18, "jawDrop": 10, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 185, "tipY": 108, "bodyX": 152, "bodyY": 96, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 152, "y": 96, "label": "舌前部向硬腭高抬，声带振动迅速滑向元音"},
    "airflowType": "oral"
  },

  # --- 元音与双元音 Vowels & Diphthongs (17个) ---
  "iː": {
    "name": "微笑长元音 (如 tree, see, bee)",
    "category": "长元音",
    "voiced": True,
    "sampleWord": "tree",
    "phonicsSpell": "t-r-ee",
    "ipa": "/triː/",
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
    "jawOpen": "small",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 115, "lipHeight": 18, "jawDrop": 8, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 182, "tipY": 128, "bodyX": 152, "bodyY": 96, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 152, "y": 96, "label": "舌前部极度贴近硬腭，嘴角左右对称平拉"},
    "airflowType": "oral"
  },
  "ɪ": {
    "name": "短前元音 (如 sit, little, big)",
    "category": "短元音",
    "voiced": True,
    "sampleWord": "sit",
    "phonicsSpell": "s-i-t",
    "ipa": "/sɪt/",
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
    "jawOpen": "small",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 95, "lipHeight": 20, "jawDrop": 12, "teethGap": 8, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 180, "tipY": 125, "bodyX": 148, "bodyY": 108, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 150, "y": 108, "label": "舌面前部微抬，嘴唇微开短促发声"},
    "airflowType": "oral"
  },
  "ɛ": {
    "name": "前短元音 (如 bed, pen, red)",
    "category": "短元音",
    "voiced": True,
    "sampleWord": "bed",
    "phonicsSpell": "b-e-d",
    "ipa": "/bed/",
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
    "jawOpen": "medium",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 92, "lipHeight": 24, "jawDrop": 16, "teethGap": 10, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 178, "tipY": 128, "bodyX": 146, "bodyY": 115, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 148, "y": 115, "label": "开口一指宽，舌前微抬清脆发'哎'"},
    "airflowType": "oral"
  },
  "æ": {
    "name": "梅花大口音 (如 apple, cat, bad)",
    "category": "梅花音",
    "voiced": True,
    "sampleWord": "apple",
    "phonicsSpell": "a-p-p-l-e",
    "ipa": "/ˈæpl/",
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
    "jawOpen": "large",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 100, "lipHeight": 46, "jawDrop": 32, "teethGap": 24, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 180, "tipY": 135, "bodyX": 145, "bodyY": 138, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 180, "y": 135, "label": "口型纵向大开两指宽，舌尖抵下齿"},
    "airflowType": "oral"
  },
  "ɑ": {
    "name": "后开长元音 (如 hot, father, car)",
    "category": "长元音",
    "voiced": True,
    "sampleWord": "hot",
    "phonicsSpell": "h-o-t",
    "ipa": "/hɑːt/",
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
    "jawOpen": "large",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 85, "lipHeight": 48, "jawDrop": 34, "teethGap": 26, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 140, "bodyX": 140, "bodyY": 142, "rootX": 112, "rootY": 160},
    "focusPoint": {"x": 135, "y": 140, "label": "下巴大张舌身低平，喉底饱满发'啊'"},
    "airflowType": "oral"
  },
  "ɔ": {
    "name": "圆唇中后长元音 (如 water, talk, dog)",
    "category": "长元音",
    "voiced": True,
    "sampleWord": "water",
    "phonicsSpell": "w-a-t-e-r",
    "ipa": "/ˈwɔːtər/",
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
    "jawOpen": "medium",
    "lipShape": "round",
    "frontLipParams": {"lipWidth": 64, "lipHeight": 32, "jawDrop": 22, "teethGap": 15, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 172, "tipY": 135, "bodyX": 136, "bodyY": 125, "rootX": 116, "rootY": 110},
    "focusPoint": {"x": 125, "y": 112, "label": "双唇收圆向前突出，深沉发'嗷'"},
    "airflowType": "oral"
  },
  "ʊ": {
    "name": "短圆唇后元音 (如 book, look, good)",
    "category": "短元音",
    "voiced": True,
    "sampleWord": "book",
    "phonicsSpell": "b-oo-k",
    "ipa": "/bʊk/",
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
    "jawOpen": "small",
    "lipShape": "round",
    "frontLipParams": {"lipWidth": 62, "lipHeight": 24, "jawDrop": 12, "teethGap": 7, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 172, "tipY": 132, "bodyX": 138, "bodyY": 120, "rootX": 116, "rootY": 112},
    "focusPoint": {"x": 125, "y": 115, "label": "双唇微圆微突，短促深沉"},
    "airflowType": "oral"
  },
  "uː": {
    "name": "长圆唇后元音 (如 blue, room, moon)",
    "category": "长元音",
    "voiced": True,
    "sampleWord": "moon",
    "phonicsSpell": "m-oo-n",
    "ipa": "/muːn/",
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
    "jawOpen": "small",
    "lipShape": "round",
    "frontLipParams": {"lipWidth": 50, "lipHeight": 22, "jawDrop": 10, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 170, "tipY": 132, "bodyX": 134, "bodyY": 118, "rootX": 118, "rootY": 102},
    "focusPoint": {"x": 120, "y": 102, "label": "双唇高度收圆成小孔，悠长圆润"},
    "airflowType": "oral"
  },
  "ʌ": {
    "name": "中短元音 (如 cup, sun, love)",
    "category": "短元音",
    "voiced": True,
    "sampleWord": "cup",
    "phonicsSpell": "c-u-p",
    "ipa": "/kʌp/",
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
    "jawOpen": "medium",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 88, "lipHeight": 26, "jawDrop": 18, "teethGap": 12, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 134, "bodyX": 142, "bodyY": 130, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 142, "y": 130, "label": "自然半开口，短促有力自胸腔发出"},
    "airflowType": "oral"
  },
  "ɜ": {
    "name": "卷舌/中长元音 (如 bird, girl, nurse)",
    "category": "长元音",
    "voiced": True,
    "sampleWord": "bird",
    "phonicsSpell": "b-i-r-d",
    "ipa": "/bɜːrd/",
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
    "jawOpen": "medium",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 86, "lipHeight": 22, "jawDrop": 14, "teethGap": 8, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 120, "bodyX": 145, "bodyY": 115, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 145, "y": 115, "label": "舌中部微抬，声音浑厚悠长"},
    "airflowType": "oral"
  },
  "ə": {
    "name": "中央弱元音/施瓦音 (如 ago, banana, sofa)",
    "category": "弱元音",
    "voiced": True,
    "sampleWord": "ago",
    "phonicsSpell": "a-g-o",
    "ipa": "/əˈɡoʊ/",
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
    "jawOpen": "small",
    "lipShape": "neutral",
    "frontLipParams": {"lipWidth": 84, "lipHeight": 18, "jawDrop": 10, "teethGap": 6, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 176, "tipY": 130, "bodyX": 144, "bodyY": 125, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 144, "y": 125, "label": "口腔与肌肉完全放松，极轻短'呃'"},
    "airflowType": "oral"
  },
  "eɪ": {
    "name": "前合双元音 (如 day, play, cake)",
    "category": "双元音",
    "voiced": True,
    "sampleWord": "day",
    "phonicsSpell": "d-a-y",
    "ipa": "/deɪ/",
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
    "jawOpen": "medium",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 96, "lipHeight": 22, "jawDrop": 14, "teethGap": 8, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 178, "tipY": 125, "bodyX": 148, "bodyY": 108, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 150, "y": 108, "label": "由 /e/ 迅速滑向 /ɪ/，口型渐合微笑"},
    "airflowType": "oral"
  },
  "aɪ": {
    "name": "开双元音 (如 my, nice, like)",
    "category": "双元音",
    "voiced": True,
    "sampleWord": "nice",
    "phonicsSpell": "n-i-c-e",
    "ipa": "/naɪs/",
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
    "jawOpen": "large",
    "lipShape": "spread",
    "frontLipParams": {"lipWidth": 92, "lipHeight": 36, "jawDrop": 24, "teethGap": 16, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 176, "tipY": 132, "bodyX": 145, "bodyY": 115, "rootX": 110, "rootY": 165},
    "focusPoint": {"x": 146, "y": 115, "label": "由大开口 /a/ 快速滑向扁唇 /ɪ/"},
    "airflowType": "oral"
  },
  "oʊ": {
    "name": "后合双元音 (如 go, home, boat)",
    "category": "双元音",
    "voiced": True,
    "sampleWord": "home",
    "phonicsSpell": "h-o-m-e",
    "ipa": "/hoʊm/",
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
    "jawOpen": "medium",
    "lipShape": "round",
    "frontLipParams": {"lipWidth": 60, "lipHeight": 26, "jawDrop": 16, "teethGap": 10, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 172, "tipY": 132, "bodyX": 136, "bodyY": 122, "rootX": 116, "rootY": 108},
    "focusPoint": {"x": 125, "y": 110, "label": "由中等开口迅速收紧为圆唇小孔"},
    "airflowType": "oral"
  },
  "ɔɪ": {
    "name": "圆展双元音 (如 boy, toy, voice)",
    "category": "双元音",
    "voiced": True,
    "sampleWord": "boy",
    "phonicsSpell": "b-o-y",
    "ipa": "/bɔɪ/",
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
    "jawOpen": "medium",
    "lipShape": "round",
    "frontLipParams": {"lipWidth": 70, "lipHeight": 28, "jawDrop": 18, "teethGap": 12, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 175, "tipY": 128, "bodyX": 142, "bodyY": 115, "rootX": 112, "rootY": 120},
    "focusPoint": {"x": 140, "y": 115, "label": "由圆圆嘴型向微笑扁平口型滑动"},
    "airflowType": "oral"
  },
  "aʊ": {
    "name": "合双元音 (如 cow, house, now)",
    "category": "双元音",
    "voiced": True,
    "sampleWord": "cow",
    "phonicsSpell": "c-o-w",
    "ipa": "/kaʊ/",
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
    "jawOpen": "large",
    "lipShape": "round",
    "frontLipParams": {"lipWidth": 72, "lipHeight": 38, "jawDrop": 26, "teethGap": 18, "tongueTipVisible": False, "tongueTipProtrusion": 0},
    "tongueShape": {"tipX": 174, "tipY": 135, "bodyX": 138, "bodyY": 126, "rootX": 114, "rootY": 115},
    "focusPoint": {"x": 130, "y": 120, "label": "由大口'啊'瞬间收小收圆向前突出"},
    "airflowType": "oral"
  }
}

print(f"Loaded {len(PHONEMES_DATA)} phonemes successfully.")

# Generate TypeScript content for ARTICULATORY_PRESETS
presets_ts_lines = ["export const ARTICULATORY_PRESETS: Record<string, ArticulatoryConfig> = {"]
for ph, d in PHONEMES_DATA.items():
    steps_json = ",\n".join([f'      "{s}"' for s in d["steps"]])
    fl = d["frontLipParams"]
    ts = d["tongueShape"]
    fp = d["focusPoint"]
    voiced_str = "true" if d["voiced"] else "false"
    alveolar_str = f', tongueAlveolarTouch: {"true" if fl.get("tongueAlveolarTouch") else "false"}' if "tongueAlveolarTouch" in fl else ""
    
    presets_ts_lines.append(f"""  "{ph}": {{
    phoneme: "{ph}",
    name: "{d['name']}",
    category: "{d['category']}",
    voiced: {voiced_str},
    sampleWord: "{d['sampleWord']}",
    phonicsSpell: "{d['phonicsSpell']}",
    ipa: "{d['ipa']}",
    chineseExplanation:
      "{d['chineseExplanation']}",
    englishExplanation:
      "{d['englishExplanation']}",
    steps: [
{steps_json}
    ],
    jawOpen: "{d['jawOpen']}",
    lipShape: "{d['lipShape']}",
    frontLipParams: {{
      lipWidth: {fl['lipWidth']},
      lipHeight: {fl['lipHeight']},
      jawDrop: {fl['jawDrop']},
      teethGap: {fl['teethGap']},
      tongueTipVisible: {"true" if fl['tongueTipVisible'] else "false"},
      tongueTipProtrusion: {fl['tongueTipProtrusion']}{alveolar_str}
    }},
    tongueShape: {{
      tipX: {ts['tipX']},
      tipY: {ts['tipY']},
      bodyX: {ts['bodyX']},
      bodyY: {ts['bodyY']},
      rootX: {ts['rootX']},
      rootY: {ts['rootY']}
    }},
    focusPoint: {{ x: {fp['x']}, y: {fp['y']}, label: "{fp['label']}" }},
    airflowType: "{d['airflowType']}"
  }},""")

presets_ts_lines.append("};")
presets_ts = "\n".join(presets_ts_lines)

# 1. Update articulatory-tongue-visualizer.tsx
v_path = "enjoy/src/renderer/components/pronunciation-assessments/articulatory-tongue-visualizer.tsx"
with open(v_path, "r", encoding="utf-8") as f:
    v_content = f.read()

# Replace ARTICULATORY_PRESETS in visualizer
v_pattern = r"export const ARTICULATORY_PRESETS: Record<string, ArticulatoryConfig> = \{[\s\S]+?\n\};"
if not re.search(v_pattern, v_content):
    print("Error: Could not find ARTICULATORY_PRESETS in visualizer!")
    sys.exit(1)

new_v_content = re.sub(v_pattern, presets_ts, v_content)
with open(v_path, "w", encoding="utf-8") as f:
    f.write(new_v_content)
print("Updated articulatory-tongue-visualizer.tsx successfully!")

# 2. Update phonetics-coach.ts
coach_path = "enjoy/src/renderer/lib/phonetics-coach.ts"
with open(coach_path, "r", encoding="utf-8") as f:
    c_content = f.read()

coach_lines = ["export const PHONEME_COACHING_GUIDES: Record<string, PhonemeGuide> = {"]
for ph, d in PHONEMES_DATA.items():
    coach_lines.append(f"""  "{ph}": {{
    name: "{d['name']}",
    tip: "{d['tip']}",
    mistake: "{d['mistake']}",
    mouthShape: "{d['mouthShape']}",
  }},""")

# Also add common phonetic aliases
coach_lines.append("""  "ɹ": {
    name: "美式卷舌音 (如 car, morning)",
    tip: "舌根收紧，舌尖向上悬空微翘，声带振动发出浑厚饱满的卷舌音。",
    mistake: "卷舌不充分或舌面贴上腭",
    mouthShape: "唇部微拢，舌体后缩上悬",
  },
  "ɔː": {
    name: "长圆唇元音 (如 water, talk, bottle)",
    tip: "嘴巴尽量张大同时双唇用力收圆，舌后部微缩，发出深沉浑厚的长音。",
    mistake: "唇形不够圆，口型不够大",
    mouthShape: "双唇用力收圆向前，深沉长音",
  },
  "ɑː": {
    name: "后开长元音 (如 father, car)",
    tip: "下巴尽量下沉大开口，舌头平放，声音从喉咙深处自然呼出。",
    mistake: "嘴张得太小或误读成圆唇音 /ɔː/",
    mouthShape: "下巴大张，舌身平沉",
  },
  "ɜː": {
    name: "卷舌/中长元音 (如 bird, girl, nurse)",
    tip: "舌身微抬、舌尖悬空微卷，保持舌根收紧，发出浑厚持久的卷舌长音。",
    mistake: "舌尖碰到硬腭或口型过扁",
    mouthShape: "双唇中性微张，舌身悬空卷起",
  },
};""")
coach_ts = "\n".join(coach_lines)

c_pattern = r"export const PHONEME_COACHING_GUIDES: Record<string, PhonemeGuide> = \{[\s\S]+?\n\};"
if not re.search(c_pattern, c_content):
    print("Error: Could not find PHONEME_COACHING_GUIDES in coach!")
    sys.exit(1)

new_c_content = re.sub(c_pattern, coach_ts, c_content)
with open(coach_path, "w", encoding="utf-8") as f:
    f.write(new_c_content)
print("Updated phonetics-coach.ts successfully!")
