import React, { useState, useRef, useEffect } from "react";
import {
  Volume2Icon,
  PlayIcon,
  PauseIcon,
  SquareIcon,
  SparklesIcon,
  CheckCircle2Icon,
  XIcon,
  FlameIcon,
  HelpCircleIcon,
  InfoIcon,
  MicIcon,
} from "lucide-react";
import { Button, Badge } from "@renderer/components/ui";
import { getPhonemeCoach } from "@renderer/lib/phonetics-coach";

// 音标解剖学与唇形参数模型
export interface ArticulatoryConfig {
  phoneme: string;
  name: string;
  category:
    | "咬舌音"
    | "卷舌音"
    | "梅花音"
    | "后鼻音"
    | "舌侧音"
    | "唇齿音"
    | "破擦音"
    | "长元音"
    | "圆唇音"
    | "齿龈音"
    | "半元音"
    | "通用";
  voiced: boolean; // 是否声带振动 (浊音 vs 清音)
  sampleWord: string;
  phonicsSpell: string;
  ipa: string;
  chineseExplanation: string;
  englishExplanation: string;
  steps: [string, string, string]; // 少儿 3 步黄金口诀
  jawOpen: "small" | "medium" | "large"; // 下颌开合度
  lipShape: "spread" | "neutral" | "round" | "protruded" | "bite"; // 唇形
  frontLipParams: {
    lipWidth: number; // 唇裂横向宽度
    lipHeight: number; // 上下唇裂纵向开合
    jawDrop: number; // 下巴下移量
    teethGap: number; // 上下牙齿可见间隙
    tongueTipVisible: boolean; // 正面是否能看见舌尖
    tongueTipProtrusion: number; // 舌尖伸出上下门牙的像素
    tongueAlveolarTouch?: boolean; // 舌尖顶上齿龈 (如 /l/)
  };
  tongueShape: {
    // 侧切面贝塞尔曲线控制点：从舌根到舌尖 (x, y)
    tipX: number;
    tipY: number;
    bodyX: number;
    bodyY: number;
    rootX: number;
    rootY: number;
  };
  focusPoint: { x: number; y: number; label: string };
  airflowType: "oral" | "nasal" | "interdental" | "friction" | "lateral";
}

export const ARTICULATORY_PRESETS: Record<string, ArticulatoryConfig> = {
  "p": {
    phoneme: "p",
    name: "双唇清塞音 (如 pen, apple, cup)",
    category: "爆破音",
    voiced: false,
    sampleWord: "pen",
    phonicsSpell: "p-e-n",
    ipa: "/pen/",
    chineseExplanation:
      "上下双唇紧紧闭合阻断口腔气流，积蓄力量后瞬间向外喷开爆破，声带完全不振动，嘴前有强劲冲气感。",
    englishExplanation:
      "The lips form a complete airtight closure, then release suddenly with a crisp, voiceless burst of air.",
    steps: [
      "上下嘴唇紧紧闭合，把气流紧紧憋在嘴里",
      "双唇瞬间有力地向外弹开，气流像放小爆竹一样清脆喷出",
      "摸摸脖子声带完全安静不振动，手心在嘴前能感到强烈的冷气流"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 86,
      lipHeight: 0,
      jawDrop: 8,
      teethGap: 4,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 130,
      bodyX: 145,
      bodyY: 130,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 220, y: 115, label: "双唇紧闭阻气，瞬间向外爆破" },
    airflowType: "oral"
  },
  "b": {
    phoneme: "b",
    name: "双唇浊塞音 (如 book, big, baby)",
    category: "爆破音",
    voiced: true,
    sampleWord: "book",
    phonicsSpell: "b-oo-k",
    ipa: "/bʊk/",
    chineseExplanation:
      "双唇紧闭阻断气流，双唇弹开破裂的瞬间声带强力振动发声，发出干脆有力的浊爆破音。",
    englishExplanation:
      "The lips seal completely then release abruptly with simultaneous vocal cord vibration.",
    steps: [
      "上下嘴唇紧闭，准备阻断口腔气流",
      "双唇弹开破裂的瞬间，声带同步用力发声爆破",
      "摸摸脖子感受明显的小蜜蜂嗡嗡振颤，发音利落果断"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 86,
      lipHeight: 0,
      jawDrop: 8,
      teethGap: 4,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 130,
      bodyX: 145,
      bodyY: 130,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 220, y: 115, label: "双唇闭合瞬间弹开，声带强力振动" },
    airflowType: "oral"
  },
  "t": {
    phoneme: "t",
    name: "齿龈清塞音 (如 tea, ten, cat)",
    category: "爆破音",
    voiced: false,
    sampleWord: "tea",
    phonicsSpell: "t-e-a",
    ipa: "/tiː/",
    chineseExplanation:
      "舌尖紧贴上门牙后齿龈阻断气流，随后舌尖迅速向下弹开，强气流清脆爆破，声带不振动。",
    englishExplanation:
      "The tongue tip forms a tight seal against the alveolar ridge, then releases abruptly with a crisp puff of air.",
    steps: [
      "舌尖紧紧贴在上门牙后面的硬齿龈天花板上封住气流",
      "舌尖迅速向下弹开，憋住的气流像清脆鼓槌一样爆破喷出",
      "声带保持安静不振动，发音利落果断不拖尾巴"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 88,
      lipHeight: 18,
      jawDrop: 12,
      teethGap: 7,
      tongueTipVisible: true,
      tongueTipProtrusion: 0, tongueAlveolarTouch: true
    },
    tongueShape: {
      tipX: 188,
      tipY: 88,
      bodyX: 145,
      bodyY: 115,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 188, y: 88, label: "舌尖抵齿龈后弹开，清脆爆破" },
    airflowType: "oral"
  },
  "d": {
    phoneme: "d",
    name: "齿龈浊塞音 (如 dog, duck, door)",
    category: "爆破音",
    voiced: true,
    sampleWord: "dog",
    phonicsSpell: "d-o-g",
    ipa: "/dɔːɡ/",
    chineseExplanation:
      "舌尖紧抵上门牙后方齿龈阻断气流，弹开瞬间声带用力振动，发出有力饱满的浊爆破音。",
    englishExplanation:
      "The tongue tip seals the alveolar ridge, releasing with immediate vocal cord vibration.",
    steps: [
      "舌尖紧抵上门牙后方的硬齿龈天花板阻断气流",
      "舌尖弹开的瞬间，声带立刻大声振动发出浊音",
      "摸脖子感受扎实的麻麻振颤感，不要读成汉字'得'"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 88,
      lipHeight: 18,
      jawDrop: 12,
      teethGap: 7,
      tongueTipVisible: true,
      tongueTipProtrusion: 0, tongueAlveolarTouch: true
    },
    tongueShape: {
      tipX: 188,
      tipY: 88,
      bodyX: 145,
      bodyY: 115,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 188, y: 88, label: "舌尖紧贴上齿龈，声带强烈振动" },
    airflowType: "oral"
  },
  "k": {
    phoneme: "k",
    name: "软腭清塞音 (如 cat, kite, cup)",
    category: "爆破音",
    voiced: false,
    sampleWord: "cat",
    phonicsSpell: "c-a-t",
    ipa: "/kæt/",
    chineseExplanation:
      "舌后根高高抬起紧贴软腭天花板阻挡气流，随后瞬间向下弹离软腭，猛烈爆破出气，声带不振动。",
    englishExplanation:
      "The back of the tongue presses firmly against the velum, then releases with a sharp audible burst.",
    steps: [
      "嘴巴微张，舌根高高抬起紧贴软腭天花板堵住出气口",
      "舌根瞬间向下弹离软腭，积聚气流猛烈喷出",
      "声带完全安静不振动，手心在嘴前感受到明显的冲气"
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 90,
      lipHeight: 22,
      jawDrop: 14,
      teethGap: 9,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 170,
      tipY: 135,
      bodyX: 138,
      bodyY: 110,
      rootX: 115,
      rootY: 98
    },
    focusPoint: { x: 130, y: 95, label: "舌根紧贴软腭，瞬间下弹爆破" },
    airflowType: "oral"
  },
  "g": {
    phoneme: "g",
    name: "软腭浊塞音 (如 go, girl, big)",
    category: "爆破音",
    voiced: true,
    sampleWord: "go",
    phonicsSpell: "g-o",
    ipa: "/ɡoʊ/",
    chineseExplanation:
      "舌后根高高抬起抵住软腭，弹开的瞬间声带强力振动发声，发出低沉有力的浊音。",
    englishExplanation:
      "The back of the tongue seals against the soft palate, then releases with simultaneous vocal fold vibration.",
    steps: [
      "舌后根高高抬起紧贴软腭天花板",
      "舌根瞬间弹开的同时，声带强力振动发声",
      "摸脖子感受浑厚扎实的蜂鸣震颤，不要发成汉语轻声'哥'"
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 90,
      lipHeight: 22,
      jawDrop: 14,
      teethGap: 9,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 170,
      tipY: 135,
      bodyX: 138,
      bodyY: 110,
      rootX: 115,
      rootY: 98
    },
    focusPoint: { x: 130, y: 95, label: "舌根顶软腭，声带强烈蜂鸣振动" },
    airflowType: "oral"
  },
  "f": {
    phoneme: "f",
    name: "唇齿清擦音 (如 fish, face, foot)",
    category: "唇齿音",
    voiced: false,
    sampleWord: "fish",
    phonicsSpell: "f-i-s-h",
    ipa: "/fɪʃ/",
    chineseExplanation:
      "上排门牙轻轻搭在下嘴唇内侧边缘，气流从缝隙中轻柔吹出摩擦声，声带不振动。",
    englishExplanation:
      "The upper incisors rest gently against the lower lip, forcing air through the narrow slit without voicing.",
    steps: [
      "上排门牙轻轻搭在下嘴唇的内侧边缘，轻轻贴住",
      "气流从牙齿与下嘴唇的细微缝隙中呼出，产生摩擦吹风声",
      "声带不振动，像小兔子露出门牙轻轻吹气球"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 86,
      lipHeight: 16,
      jawDrop: 10,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 130,
      bodyX: 145,
      bodyY: 125,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 215, y: 118, label: "上门牙轻触下唇内侧，平稳送气" },
    airflowType: "friction"
  },
  "v": {
    phoneme: "v",
    name: "唇齿浊擦音 (如 very, van, love)",
    category: "唇齿音",
    voiced: true,
    sampleWord: "very",
    phonicsSpell: "v-e-r-y",
    ipa: "/ˈveri/",
    chineseExplanation:
      "保持与 /f/ 完全相同的上牙轻咬下唇姿势，送气的同时声带剧烈振动，像小马达运转般震颤。",
    englishExplanation:
      "Same labiodental contact as /f/, accompanied by continuous vocal cord vibration.",
    steps: [
      "上门牙轻触下嘴唇内侧，保持标准唇齿阻气通道",
      "送气的同时声带用力振动！感受嘴唇与喉头强烈的麻酥感",
      "绝不要撅起双唇读成拼音'乌' (/w/)"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 86,
      lipHeight: 16,
      jawDrop: 10,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 130,
      bodyX: 145,
      bodyY: 125,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 215, y: 118, label: "上齿轻咬下唇，声带强烈蜂鸣震颤" },
    airflowType: "friction"
  },
  "θ": {
    phoneme: "θ",
    name: "咬舌清辅音 (如 think, three, teeth)",
    category: "咬舌音",
    voiced: false,
    sampleWord: "think",
    phonicsSpell: "th-i-n-k",
    ipa: "/θɪŋk/",
    chineseExplanation:
      "舌尖轻放于上下门牙之间，上门牙轻触舌面。送气时不振动声带，气流由齿间轻柔摩擦而出。",
    englishExplanation:
      "The tip of the tongue is placed lightly between the upper and lower incisors. Friction is produced by air expelled between teeth and tongue. The vocal cords do not vibrate.",
    steps: [
      "舌尖像小乌龟探头一样，微微露出上下门牙齿缝之间 2-3 毫米",
      "上门牙轻轻挨住舌面，千万不要狠咬用力压",
      "轻轻从齿缝持续吹气，喉咙不振动，像微风吹过树梢的沙沙声"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 90,
      lipHeight: 20,
      jawDrop: 12,
      teethGap: 7,
      tongueTipVisible: true,
      tongueTipProtrusion: 8
    },
    tongueShape: {
      tipX: 204,
      tipY: 106,
      bodyX: 155,
      bodyY: 125,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 204, y: 106, label: "舌尖伸出齿缝 2-3 毫米，轻夹送气" },
    airflowType: "interdental"
  },
  "ð": {
    phoneme: "ð",
    name: "咬舌浊辅音 (如 this, that, mother)",
    category: "咬舌音",
    voiced: true,
    sampleWord: "this",
    phonicsSpell: "th-i-s",
    ipa: "/ðɪs/",
    chineseExplanation:
      "舌位与 /θ/ 完全相同，舌尖微露于齿缝。送气的同时声带剧烈振动，摸喉部有明显的蜂鸣震颤感。",
    englishExplanation:
      "The tip of the tongue is placed between the teeth as in /θ/. Friction is accompanied by vibration of the vocal cords.",
    steps: [
      "舌尖微露于门牙缝隙，保持与 /θ/ 相同的咬舌位置",
      "送气的同时声带动起来！摸脖子有明显的小蜜蜂嗡嗡振动",
      "不要收口过早发成汉语拼音的'得' (/d/) 或 /z/"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 90,
      lipHeight: 20,
      jawDrop: 12,
      teethGap: 7,
      tongueTipVisible: true,
      tongueTipProtrusion: 8
    },
    tongueShape: {
      tipX: 203,
      tipY: 106,
      bodyX: 155,
      bodyY: 125,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 203, y: 106, label: "舌尖轻触齿缝，声带强烈振动" },
    airflowType: "interdental"
  },
  "s": {
    phoneme: "s",
    name: "齿龈清擦音 (如 see, sun, bus)",
    category: "齿龈音",
    voiced: false,
    sampleWord: "sun",
    phonicsSpell: "s-u-n",
    ipa: "/sʌn/",
    chineseExplanation:
      "上下齿自然闭合对齐，舌尖极度靠近上齿龈留有细如发丝的狭缝，强气流摩擦喷出清脆的丝丝声，声带不振。",
    englishExplanation:
      "The teeth are closely aligned. The tongue tip forms a narrow groove against the alveolar ridge creating a sharp hiss without voicing.",
    steps: [
      "上下门牙轻轻挨近对齐，不要咬死",
      "舌尖向上抬高，非常贴近上门牙后方的齿龈，留一道细细的小狭缝",
      "像小蛇吐信子一样吹出嘶嘶声，摸脖子不振动"
    ],
    jawOpen: "small",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 92,
      lipHeight: 16,
      jawDrop: 6,
      teethGap: 3,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 186,
      tipY: 92,
      bodyX: 150,
      bodyY: 110,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 186, y: 92, label: "舌尖极贴近上齿龈留发丝细缝，清脆送气" },
    airflowType: "friction"
  },
  "z": {
    phoneme: "z",
    name: "齿龈浊擦音 (如 zoo, buzz, prize)",
    category: "齿龈音",
    voiced: true,
    sampleWord: "zoo",
    phonicsSpell: "z-oo",
    ipa: "/zuː/",
    chineseExplanation:
      "舌位与口型与 /s/ 相同，但发音时声带强烈振动，产生如同蜜蜂振翅或电锯般的蜂鸣浊音。",
    englishExplanation:
      "Same articulatory position as /s/, accompanied by continuous vocal cord vibration.",
    steps: [
      "保持与 /s/ 完全相同的上下牙对齐与舌尖位置",
      "在送气的同时让声带大声唱起来！",
      "摸摸脖子感受强烈的麻麻震颤感，像小蜜蜂在耳边嗡嗡叫"
    ],
    jawOpen: "small",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 92,
      lipHeight: 16,
      jawDrop: 6,
      teethGap: 3,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 186,
      tipY: 92,
      bodyX: 150,
      bodyY: 110,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 186, y: 92, label: "齿龈微缝强摩擦，声带强烈蜂鸣震颤" },
    airflowType: "friction"
  },
  "ʃ": {
    phoneme: "ʃ",
    name: "齿龈后擦嘘音 (如 ship, fish, she)",
    category: "嘘擦音",
    voiced: false,
    sampleWord: "ship",
    phonicsSpell: "sh-i-p",
    ipa: "/ʃɪp/",
    chineseExplanation:
      "双唇向前撅起呈喇叭圆状，像做'安静嘘——'的手势。舌前部贴近硬腭形成窄缝，气流穿过产生沙沙嘘声。",
    englishExplanation:
      "The lips are rounded and pursed forward. The blade of the tongue approaches the postalveolar area to create friction without voicing.",
    steps: [
      "双唇向前稍微噘起，像做“安静嘘——”的手势",
      "舌面两侧紧贴上磨牙，舌中间留一条微小的通道",
      "用力吐气产生沙沙的摩擦嘘声，声带保持安静不振动"
    ],
    jawOpen: "small",
    lipShape: "protruded",
    frontLipParams: {
      lipWidth: 68,
      lipHeight: 24,
      jawDrop: 12,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 178,
      tipY: 92,
      bodyX: 148,
      bodyY: 105,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 178, y: 92, label: "双唇向前噘起，舌叶贴近前硬腭形成细缝" },
    airflowType: "friction"
  },
  "h": {
    phoneme: "h",
    name: "声门清擦音 (如 hat, hot, home)",
    category: "声门音",
    voiced: false,
    sampleWord: "hat",
    phonicsSpell: "h-a-t",
    ipa: "/hæt/",
    chineseExplanation:
      "口腔和舌头完全放松自然张开，喉咙深处深呼吸送气，像冬天对着双手哈气取暖一样，声带不振动。",
    englishExplanation:
      "The mouth remains relaxed and open. Air flows freely from the glottis causing quiet audible friction without voicing.",
    steps: [
      "口腔和舌头完全放松自然张开，不做多余动作",
      "喉咙深处深呼吸送气，像冬天对着双手哈气取暖一样",
      "声带不振动，气流平稳顺畅呼出，不要用力摩擦喉头"
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 88,
      lipHeight: 24,
      jawDrop: 14,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 130,
      bodyX: 145,
      bodyY: 125,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 110, y: 170, label: "声门微开深呼吸，像冬日哈气" },
    airflowType: "friction"
  },
  "tʃ": {
    phoneme: "tʃ",
    name: "清破擦音 (如 chair, teacher, watch)",
    category: "破擦音",
    voiced: false,
    sampleWord: "chair",
    phonicsSpell: "ch-air",
    ipa: "/tʃer/",
    chineseExplanation:
      "双唇向前撅起，舌尖先紧贴齿龈阻断气流，随后瞬间弹开形成细缝，气流爆破并伴随清脆嘘声，声带不振动。",
    englishExplanation:
      "Tongue tip seals against the alveolar ridge, then releases into postalveolar friction with pursed lips. Voiceless affricate.",
    steps: [
      "双唇向前撅起，舌尖先紧紧贴在上门牙后的齿龈阻断气流",
      "舌尖瞬间弹开一条细缝，气流猛然爆破并伴随嘘声喷出",
      "动作利落果断，像清脆的切菜声，声带保持安静不振动"
    ],
    jawOpen: "small",
    lipShape: "protruded",
    frontLipParams: {
      lipWidth: 70,
      lipHeight: 22,
      jawDrop: 12,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 185,
      tipY: 90,
      bodyX: 148,
      bodyY: 106,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 185, y: 90, label: "舌尖抵齿龈后瞬间微弹，嘘声爆破" },
    airflowType: "friction"
  },
  "dʒ": {
    phoneme: "dʒ",
    name: "浊破擦音 (如 jump, job, orange)",
    category: "破擦音",
    voiced: true,
    sampleWord: "jump",
    phonicsSpell: "j-u-m-p",
    ipa: "/dʒʌmp/",
    chineseExplanation:
      "口型与舌位与 /tʃ/ 完全相同，但在爆破弹开的瞬间声带强力振动发声，声音结实浑厚。",
    englishExplanation:
      "Same articulatory sequence as /tʃ/, combined with immediate vocal fold vibration upon release.",
    steps: [
      "口型与舌位与 /tʃ/ 完全相同，双唇微突收圆",
      "舌尖爆破弹开的瞬间，声带立刻爆发出结实的振动声",
      "摸脖子有扎实的麻感，切记不可读成拼音的'知'"
    ],
    jawOpen: "small",
    lipShape: "protruded",
    frontLipParams: {
      lipWidth: 70,
      lipHeight: 22,
      jawDrop: 12,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 185,
      tipY: 90,
      bodyX: 148,
      bodyY: 106,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 185, y: 90, label: "双唇微突，舌尖破裂瞬间声带强劲振动" },
    airflowType: "friction"
  },
  "m": {
    phoneme: "m",
    name: "双唇鼻辅音 (如 moon, man, mom)",
    category: "鼻音",
    voiced: true,
    sampleWord: "moon",
    phonicsSpell: "m-oo-n",
    ipa: "/muːn/",
    chineseExplanation:
      "上下双唇自然轻柔闭合封住口腔，声带振动发声，气流全部从鼻腔发出浑厚的共鸣声。",
    englishExplanation:
      "The lips form a complete closure while voiced air resonates entirely through the nasal cavity.",
    steps: [
      "上下双唇轻柔自然闭合，封住嘴巴出口",
      "声带振动发声，气流全部从鼻子中哼出，产生浑厚的鼻腔共鸣",
      "摸摸鼻梁骨有微微的麻麻震动感，声音如同品尝美食的'嗯~'"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 84,
      lipHeight: 0,
      jawDrop: 6,
      teethGap: 2,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 130,
      bodyX: 145,
      bodyY: 125,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 220, y: 115, label: "双唇紧闭，气流完全从鼻腔哼出" },
    airflowType: "nasal"
  },
  "n": {
    phoneme: "n",
    name: "齿龈鼻辅音 (如 nose, nut, sun)",
    category: "鼻音",
    voiced: true,
    sampleWord: "nose",
    phonicsSpell: "n-o-s-e",
    ipa: "/noʊz/",
    chineseExplanation:
      "嘴巴微张，舌尖紧贴上门牙后齿龈封堵口腔气流，声带振动，气流全部由鼻腔冲出形成共鸣。",
    englishExplanation:
      "The tongue tip forms a seal at the alveolar ridge. Voiced air resonates through the nasal cavity.",
    steps: [
      "嘴巴微张，舌尖紧紧贴在上门牙后面的齿龈天花板上堵住口腔气流",
      "声带振动发声，气流全部引导至鼻腔冲出",
      "摸鼻梁感受强烈的共鸣感，在词尾时舌尖保持贴住不松开"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 88,
      lipHeight: 16,
      jawDrop: 10,
      teethGap: 6,
      tongueTipVisible: true,
      tongueTipProtrusion: 0, tongueAlveolarTouch: true
    },
    tongueShape: {
      tipX: 188,
      tipY: 88,
      bodyX: 145,
      bodyY: 115,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 188, y: 88, label: "舌尖紧贴上齿龈，气流由鼻腔透出" },
    airflowType: "nasal"
  },
  "ŋ": {
    phoneme: "ŋ",
    name: "软腭后鼻音 (如 morning, singing, ring)",
    category: "鼻音",
    voiced: true,
    sampleWord: "singing",
    phonicsSpell: "s-i-ng-i-ng",
    ipa: "/ˈsɪŋɪŋ/",
    chineseExplanation:
      "舌后部向软腭抬起闭合堵住口腔通道，气流经由鼻腔送出，产生强烈的后鼻腔共鸣，声带振动。",
    englishExplanation:
      "The back of the tongue presses against the soft palate. The air stream is directed through the nose. The vocal cords vibrate.",
    steps: [
      "舌尖自然放下，舌根部使劲向上向后抬起，紧贴软腭天花板",
      "口腔通道完全被舌后根封住，引导气流全部从鼻腔后方哼出",
      "声带振动，摸摸鼻梁深处有强烈的麻麻共鸣，千万别偷懒漏发"
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 86,
      lipHeight: 22,
      jawDrop: 14,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 172,
      tipY: 135,
      bodyX: 142,
      bodyY: 120,
      rootX: 118,
      rootY: 102
    },
    focusPoint: { x: 118, y: 102, label: "舌根紧贴软腭天花板，强后鼻腔共鸣" },
    airflowType: "nasal"
  },
  "l": {
    phoneme: "l",
    name: "舌尖中边音 (如 light, exactly, life)",
    category: "舌侧音",
    voiced: true,
    sampleWord: "exactly",
    phonicsSpell: "ex-act-ly",
    ipa: "/ɪɡˈzæktli/",
    chineseExplanation:
      "舌尖紧抵在上齿龈的后边，舌前向硬腭抬起，气流从舌头两侧送出。声带伴随强烈振动。",
    englishExplanation:
      "The tip of the tongue is placed behind the upper alveolar ridge. The sides of the tongue drop to allow air to pass around both sides. The vocal cords vibrate.",
    steps: [
      "舌尖像小跳板一样，使劲顶在上门牙后面的齿龈天花板上",
      "舌头中间挡住出气口，引导气流从舌头两边像小河流一样溜出",
      "发音同时声带振动，摸摸脖子有明显的小蜜蜂嗡嗡声"
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 94,
      lipHeight: 26,
      jawDrop: 16,
      teethGap: 10,
      tongueTipVisible: true,
      tongueTipProtrusion: 0, tongueAlveolarTouch: true
    },
    tongueShape: {
      tipX: 186,
      tipY: 89,
      bodyX: 145,
      bodyY: 116,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 186, y: 89, label: "舌尖紧抵上齿龈，气流从两侧逸出" },
    airflowType: "lateral"
  },
  "r": {
    phoneme: "r",
    name: "卷舌辅音 (如 red, room, tree)",
    category: "卷舌音",
    voiced: true,
    sampleWord: "red",
    phonicsSpell: "r-e-d",
    ipa: "/red/",
    chineseExplanation:
      "舌尖悬空向上向后方卷起，注意千万不要碰到上腭天花板！双唇稍向前突出撅圆，声带振动。",
    englishExplanation:
      "The tip of the tongue curls up and slightly backwards into the alveolar area without touching the roof of the mouth. The lips are slightly rounded and protruded. The vocal cords vibrate.",
    steps: [
      "舌尖悬空向上后方卷起，注意：千万别碰到上天花板（硬腭）！",
      "嘴唇稍稍向前突出撅圆，像吹喇叭准备吹气",
      "发出浑厚有力的红色小跑车轰鸣引擎声，声带振动"
    ],
    jawOpen: "medium",
    lipShape: "protruded",
    frontLipParams: {
      lipWidth: 70,
      lipHeight: 28,
      jawDrop: 14,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 165,
      tipY: 105,
      bodyX: 135,
      bodyY: 130,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 165, y: 105, label: "舌尖向后卷起悬空，绝不触碰上腭天花板" },
    airflowType: "oral"
  },
  "w": {
    phoneme: "w",
    name: "双唇圆唇半元音 (如 water, we, win)",
    category: "半元音",
    voiced: true,
    sampleWord: "water",
    phonicsSpell: "w-a-t-e-r",
    ipa: "/ˈwɔːtər/",
    chineseExplanation:
      "双唇极度收小撅圆成一个小圆孔，舌后部同时向上隆起，随即迅速向后面的元音滑开。声带振动。",
    englishExplanation:
      "The lips are closely rounded and protruded into a tight circle while the back of the tongue elevates toward the velum. The vocal cords vibrate as it glides into the vowel.",
    steps: [
      "嘴唇使劲向前撅起，缩成一个像吸管口一样的小圆圈",
      "舌头后半截向上稍稍抬起",
      "发音瞬间声带振动，同时嘴唇迅速向两边放松滑开"
    ],
    jawOpen: "small",
    lipShape: "round",
    frontLipParams: {
      lipWidth: 55,
      lipHeight: 28,
      jawDrop: 14,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 170,
      tipY: 130,
      bodyX: 135,
      bodyY: 125,
      rootX: 118,
      rootY: 105
    },
    focusPoint: { x: 200, y: 108, label: "双唇撅圆成小吸管口，声带振动迅速滑开" },
    airflowType: "oral"
  },
  "j": {
    phoneme: "j",
    name: "硬腭半元音 (如 you, yes, your, year)",
    category: "半元音",
    voiced: true,
    sampleWord: "you",
    phonicsSpell: "y-ou",
    ipa: "/juː/",
    chineseExplanation:
      "舌前部向硬腭（口腔天花板）抬起，舌身两侧轻触上磨牙，双唇向两侧自然微咧平展。气流平稳送出，声带强烈振动，随后迅速滑向后面的元音。",
    englishExplanation:
      "The front of the tongue rises towards the hard palate, the sides of the tongue touch the upper molars. The lips are spread or neutral. The vocal cords vibrate continuously as it glides swiftly into the following vowel.",
    steps: [
      "嘴角像微笑一样向两侧微微平拉，嘴巴微张",
      "舌前部向上抬起贴近上腭天花板，但不要完全堵死气流",
      "声带振动发出短促的'爷' (/j/) 的起音，舌头迅速滑向后面的元音"
    ],
    jawOpen: "small",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 92,
      lipHeight: 18,
      jawDrop: 10,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 185,
      tipY: 108,
      bodyX: 152,
      bodyY: 96,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 152, y: 96, label: "舌前部向硬腭高抬，声带振动迅速滑向元音" },
    airflowType: "oral"
  },
  "iː": {
    phoneme: "iː",
    name: "微笑长元音 (如 tree, see, bee)",
    category: "长元音",
    voiced: true,
    sampleWord: "tree",
    phonicsSpell: "t-r-ee",
    ipa: "/triː/",
    chineseExplanation:
      "嘴角向左右平拉至最大限度（如微笑或喊'茄子'），舌前部极度贴近硬腭向上抬起，声音清亮饱满且拉长。",
    englishExplanation:
      "The lips are spread horizontally in a wide smile. The front of the tongue is raised very high toward the hard palate without causing audible friction. The vocal cords vibrate.",
    steps: [
      "嘴角像拍照喊'茄子'一样，向左右两侧彻底拉开",
      "舌面前半段尽量向上抬高接近上腭，但不要贴死",
      "声音清亮饱满并适当拉长，注意和短音 /ɪ/ 区分"
    ],
    jawOpen: "small",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 115,
      lipHeight: 18,
      jawDrop: 8,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 182,
      tipY: 128,
      bodyX: 152,
      bodyY: 96,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 152, y: 96, label: "舌前部极度贴近硬腭，嘴角左右对称平拉" },
    airflowType: "oral"
  },
  "ɪ": {
    phoneme: "ɪ",
    name: "短前元音 (如 sit, little, big)",
    category: "短元音",
    voiced: true,
    sampleWord: "sit",
    phonicsSpell: "s-i-t",
    ipa: "/sɪt/",
    chineseExplanation:
      "嘴唇自然微张半指宽，下颌与双唇完全放松，舌面前部稍微隆起，短促有力发声。",
    englishExplanation:
      "The lips are slightly parted and relaxed. The tongue is positioned in the upper mid-front area. Crisp, short vowel.",
    steps: [
      "嘴巴自然微张半指宽，下颌与嘴唇肌肉完全放松，不用使劲咧嘴",
      "舌尖轻抵下门牙背，舌面前部稍微隆起",
      "短促利落地发声，不要拖长尾音，介于汉语'一'和'哎'之间"
    ],
    jawOpen: "small",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 95,
      lipHeight: 20,
      jawDrop: 12,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 180,
      tipY: 125,
      bodyX: 148,
      bodyY: 108,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 150, y: 108, label: "舌面前部微抬，嘴唇微开短促发声" },
    airflowType: "oral"
  },
  "ɛ": {
    phoneme: "ɛ",
    name: "前短元音 (如 bed, pen, red)",
    category: "短元音",
    voiced: true,
    sampleWord: "bed",
    phonicsSpell: "b-e-d",
    ipa: "/bed/",
    chineseExplanation:
      "口腔上下开度约一指宽，嘴角向两侧自然平展，舌面前部稍微隆起，发出短促清脆的哎音。",
    englishExplanation:
      "The mouth is open approximately one finger width with slightly spread lips. Crisp, energetic short front vowel.",
    steps: [
      "口腔上下开度约一指宽，嘴角向两侧微微自然放松平展",
      "舌尖抵住下门牙背，舌面前部稍微隆起",
      "发出短促清脆的'哎'音，干脆有力"
    ],
    jawOpen: "medium",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 92,
      lipHeight: 24,
      jawDrop: 16,
      teethGap: 10,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 178,
      tipY: 128,
      bodyX: 146,
      bodyY: 115,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 148, y: 115, label: "开口一指宽，舌前微抬清脆发'哎'" },
    airflowType: "oral"
  },
  "æ": {
    phoneme: "æ",
    name: "梅花大口音 (如 apple, cat, bad)",
    category: "梅花音",
    voiced: true,
    sampleWord: "apple",
    phonicsSpell: "a-p-p-l-e",
    ipa: "/ˈæpl/",
    chineseExplanation:
      "口型纵向大开两指宽，嘴角向两侧平拉，舌前部低平下沉，舌尖抵住下门牙根部，发音干脆有爆发力。",
    englishExplanation:
      "The mouth opens wide (two-finger width). The lips are neutral to slightly spread. The front of the tongue is low and flat with the tip touching the bottom teeth.",
    steps: [
      "嘴巴张大到极致！能垂直塞进食指与中指两根手指的宽度",
      "嘴角像哈哈大笑一样使劲往两边拉开",
      "舌尖平贴抵住下牙齿根部，发音饱满清脆响亮"
    ],
    jawOpen: "large",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 100,
      lipHeight: 46,
      jawDrop: 32,
      teethGap: 24,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 180,
      tipY: 135,
      bodyX: 145,
      bodyY: 138,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 180, y: 135, label: "口型纵向大开两指宽，舌尖抵下齿" },
    airflowType: "oral"
  },
  "ɑ": {
    phoneme: "ɑ",
    name: "后开长元音 (如 hot, father, car)",
    category: "长元音",
    voiced: true,
    sampleWord: "hot",
    phonicsSpell: "h-o-t",
    ipa: "/hɑːt/",
    chineseExplanation:
      "下巴自然下沉大张，舌身平平沉在口腔底部，舌根微缩，声音从喉咙深处通透发出。",
    englishExplanation:
      "The jaw drops low to open the mouth wide. The tongue rests flat at the bottom with slight back retraction.",
    steps: [
      "像去看牙医检查喉咙喊'啊'一样，下巴自然下沉，嘴巴大张",
      "舌身平平地沉在口腔底部，舌根微微后缩",
      "声音从喉咙深处发出，浑厚圆润而通透"
    ],
    jawOpen: "large",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 85,
      lipHeight: 48,
      jawDrop: 34,
      teethGap: 26,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 140,
      bodyX: 140,
      bodyY: 142,
      rootX: 112,
      rootY: 160
    },
    focusPoint: { x: 135, y: 140, label: "下巴大张舌身低平，喉底饱满发'啊'" },
    airflowType: "oral"
  },
  "ɔ": {
    phoneme: "ɔ",
    name: "圆唇中后长元音 (如 water, talk, dog)",
    category: "长元音",
    voiced: true,
    sampleWord: "water",
    phonicsSpell: "w-a-t-e-r",
    ipa: "/ˈwɔːtər/",
    chineseExplanation:
      "嘴巴张大呈立椭圆形，双唇明显收拢向前撅圆，舌后部向软腭抬起，声音深沉浑厚。",
    englishExplanation:
      "The lips are rounded and protruded into an oval shape. The back of the tongue elevates towards the velum.",
    steps: [
      "嘴巴张大呈立椭圆形，双唇明显收拢向前撅圆",
      "舌头后部向软腭抬起，舌尖离开下齿",
      "声音深沉浑厚，像喊'嗷'一样充满共鸣"
    ],
    jawOpen: "medium",
    lipShape: "round",
    frontLipParams: {
      lipWidth: 64,
      lipHeight: 32,
      jawDrop: 22,
      teethGap: 15,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 172,
      tipY: 135,
      bodyX: 136,
      bodyY: 125,
      rootX: 116,
      rootY: 110
    },
    focusPoint: { x: 125, y: 112, label: "双唇收圆向前突出，深沉发'嗷'" },
    airflowType: "oral"
  },
  "ʊ": {
    phoneme: "ʊ",
    name: "短圆唇后元音 (如 book, look, good)",
    category: "短元音",
    voiced: true,
    sampleWord: "book",
    phonicsSpell: "b-oo-k",
    ipa: "/bʊk/",
    chineseExplanation:
      "双唇微收成小圆形并微微向前突出，肌肉自然放松，舌后部向上抬起，声音短促深沉。",
    englishExplanation:
      "The lips are loosely rounded and slightly protruded. The back of the tongue rises towards the velum.",
    steps: [
      "双唇微收成小圆形并微微向前突出，但肌肉保持自然放松",
      "舌后部向上抬起，舌尖自然缩回",
      "声音短促深沉，像被击中肚子轻哼一声，绝不要拖成长音'乌'"
    ],
    jawOpen: "small",
    lipShape: "round",
    frontLipParams: {
      lipWidth: 62,
      lipHeight: 24,
      jawDrop: 12,
      teethGap: 7,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 172,
      tipY: 132,
      bodyX: 138,
      bodyY: 120,
      rootX: 116,
      rootY: 112
    },
    focusPoint: { x: 125, y: 115, label: "双唇微圆微突，短促深沉" },
    airflowType: "oral"
  },
  "uː": {
    phoneme: "uː",
    name: "长圆唇后元音 (如 blue, room, moon)",
    category: "长元音",
    voiced: true,
    sampleWord: "moon",
    phonicsSpell: "m-oo-n",
    ipa: "/muːn/",
    chineseExplanation:
      "嘴唇极度收圆突出成一个小孔，像吹蜡烛一样，舌后根大幅度高高抬起贴近软腭，声音悠长圆润。",
    englishExplanation:
      "The lips are tightly rounded and pursed into a tiny opening. The back of the tongue rises high towards the velum.",
    steps: [
      "嘴唇极度收圆突出成一个小孔，像要亲吻或吹蜡烛一样",
      "舌后根大幅度高高抬起贴近软腭",
      "发出悠长、圆润且明亮的长音，声带持续振动"
    ],
    jawOpen: "small",
    lipShape: "round",
    frontLipParams: {
      lipWidth: 50,
      lipHeight: 22,
      jawDrop: 10,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 170,
      tipY: 132,
      bodyX: 134,
      bodyY: 118,
      rootX: 118,
      rootY: 102
    },
    focusPoint: { x: 120, y: 102, label: "双唇高度收圆成小孔，悠长圆润" },
    airflowType: "oral"
  },
  "ʌ": {
    phoneme: "ʌ",
    name: "中短元音 (如 cup, sun, love)",
    category: "短元音",
    voiced: true,
    sampleWord: "cup",
    phonicsSpell: "c-u-p",
    ipa: "/kʌp/",
    chineseExplanation:
      "嘴巴半开，下巴稍向下沉，舌身居中平放微缩，从胸膛深处快速爆发出短促干脆的声响。",
    englishExplanation:
      "The jaw lowers comfortably with lips unrounded. A short, energetic central vowel resonating from the chest.",
    steps: [
      "嘴巴半开，下巴稍向下沉，嘴唇肌肉完全不紧绷",
      "舌身居中平放，舌尖离开下齿微后缩",
      "从胸膛快速爆发出短促干脆的声响，利落有力"
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 88,
      lipHeight: 26,
      jawDrop: 18,
      teethGap: 12,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 134,
      bodyX: 142,
      bodyY: 130,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 142, y: 130, label: "自然半开口，短促有力自胸腔发出" },
    airflowType: "oral"
  },
  "ɜ": {
    phoneme: "ɜ",
    name: "卷舌/中长元音 (如 bird, girl, nurse)",
    category: "长元音",
    voiced: true,
    sampleWord: "bird",
    phonicsSpell: "b-i-r-d",
    ipa: "/bɜːrd/",
    chineseExplanation:
      "嘴唇微开保持中性，舌身中部平抬，舌尖向上后方微微卷起悬空，声带发出浑厚饱满的长音。",
    englishExplanation:
      "The lips are neutral and relaxed. The center of the tongue rises mid-high, producing a deep, sustained central vowel.",
    steps: [
      "嘴唇微开保持中性，舌身中部平抬，舌尖向上后方微微卷起悬空",
      "保持舌体肌肉收紧，声带发出浑厚饱满的长音",
      "声音像汽车低速巡航的马达声，饱满持久"
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 86,
      lipHeight: 22,
      jawDrop: 14,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 120,
      bodyX: 145,
      bodyY: 115,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 145, y: 115, label: "舌中部微抬，声音浑厚悠长" },
    airflowType: "oral"
  },
  "ə": {
    phoneme: "ə",
    name: "中央弱元音/施瓦音 (如 ago, banana, sofa)",
    category: "弱元音",
    voiced: true,
    sampleWord: "ago",
    phonicsSpell: "a-g-o",
    ipa: "/əˈɡoʊ/",
    chineseExplanation:
      "全身上下发音器官进入彻底放松状态，嘴唇微张，舌位居中平放，极度轻短一晃而过。",
    englishExplanation:
      "The schwa is the most relaxed English vowel. Lips and tongue rest in neutral position with minimal muscular effort.",
    steps: [
      "全身上下发音器官进入'彻底放松'状态，嘴唇自然微张",
      "舌头平放在嘴里什么动作都不用做",
      "极度轻短、一晃而过地发出微弱的声音，英语中最省力的音！"
    ],
    jawOpen: "small",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 84,
      lipHeight: 18,
      jawDrop: 10,
      teethGap: 6,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 176,
      tipY: 130,
      bodyX: 144,
      bodyY: 125,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 144, y: 125, label: "口腔与肌肉完全放松，极轻短'呃'" },
    airflowType: "oral"
  },
  "eɪ": {
    phoneme: "eɪ",
    name: "前合双元音 (如 day, play, cake)",
    category: "双元音",
    voiced: true,
    sampleWord: "day",
    phonicsSpell: "d-a-y",
    ipa: "/deɪ/",
    chineseExplanation:
      "由半开口的 /e/ 迅速滑向扁唇 /ɪ/，口型从半开自然合拢变扁，前面音长响亮，后面短促收尾。",
    englishExplanation:
      "Closing diphthong gliding smoothly from mid-front /e/ towards near-close /ɪ/. Lips spread as jaw closes.",
    steps: [
      "先发出半开唇的前音 /e/，声音响亮清晰",
      "嘴角迅速向两侧平拉滑向 /ɪ/，口型逐渐变扁合拢",
      "前长后短，滑动过程如丝般顺滑自然"
    ],
    jawOpen: "medium",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 96,
      lipHeight: 22,
      jawDrop: 14,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 178,
      tipY: 125,
      bodyX: 148,
      bodyY: 108,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 150, y: 108, label: "由 /e/ 迅速滑向 /ɪ/，口型渐合微笑" },
    airflowType: "oral"
  },
  "aɪ": {
    phoneme: "aɪ",
    name: "开双元音 (如 my, nice, like)",
    category: "双元音",
    voiced: true,
    sampleWord: "nice",
    phonicsSpell: "n-i-c-e",
    ipa: "/naɪs/",
    chineseExplanation:
      "从大口 /a/ 充分张开起始，随后下颌顺畅合拢滑向扁唇 /ɪ/，口型由大变小，声音前长后短。",
    englishExplanation:
      "A wide diphthong gliding from open front /a/ towards near-close /ɪ/. Jaw moves upward as glide finishes.",
    steps: [
      "嘴巴从大口 /a/ 充分张开起始，声音饱满响亮",
      "随后下颌合拢，嘴角顺畅滑向 /ɪ/",
      "口型由大变小，声音由强渐弱，如波浪般顺畅起伏"
    ],
    jawOpen: "large",
    lipShape: "spread",
    frontLipParams: {
      lipWidth: 92,
      lipHeight: 36,
      jawDrop: 24,
      teethGap: 16,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 176,
      tipY: 132,
      bodyX: 145,
      bodyY: 115,
      rootX: 110,
      rootY: 165
    },
    focusPoint: { x: 146, y: 115, label: "由大开口 /a/ 快速滑向扁唇 /ɪ/" },
    airflowType: "oral"
  },
  "oʊ": {
    phoneme: "oʊ",
    name: "后合双元音 (如 go, home, boat)",
    category: "双元音",
    voiced: true,
    sampleWord: "home",
    phonicsSpell: "h-o-m-e",
    ipa: "/hoʊm/",
    chineseExplanation:
      "由半开的圆唇起始，随后嘴唇迅速向前收拢撅圆，缩成一个小圆孔，充满圆润弹性。",
    englishExplanation:
      "Diphthong beginning with mid-back rounded /o/ and gliding towards near-close back /ʊ/.",
    steps: [
      "嘴巴先中等半开，舌身居中",
      "嘴唇迅速向前收拢撅圆，像吹口哨一样缩成紧致的小圆孔",
      "声音圆润饱满，双唇弹性十足"
    ],
    jawOpen: "medium",
    lipShape: "round",
    frontLipParams: {
      lipWidth: 60,
      lipHeight: 26,
      jawDrop: 16,
      teethGap: 10,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 172,
      tipY: 132,
      bodyX: 136,
      bodyY: 122,
      rootX: 116,
      rootY: 108
    },
    focusPoint: { x: 125, y: 110, label: "由中等开口迅速收紧为圆唇小孔" },
    airflowType: "oral"
  },
  "ɔɪ": {
    phoneme: "ɔɪ",
    name: "圆展双元音 (如 boy, toy, voice)",
    category: "双元音",
    voiced: true,
    sampleWord: "boy",
    phonicsSpell: "b-o-y",
    ipa: "/bɔɪ/",
    chineseExplanation:
      "起始双唇向前撅成小圆弧发 /ɔ/，随即嘴角向两旁迅速拉平展开滑向 /ɪ/，口型由圆变扁。",
    englishExplanation:
      "Wide diphthong gliding from open-mid back rounded /ɔ/ to near-close front unrounded /ɪ/.",
    steps: [
      "双唇先撅成圆圆的喇叭形发 /ɔ/",
      "随即嘴角向两旁迅速拉平展开，滑向 /ɪ/",
      "感受从'圆嘟嘟'到'扁扁笑脸'的明显口型滑动变化"
    ],
    jawOpen: "medium",
    lipShape: "round",
    frontLipParams: {
      lipWidth: 70,
      lipHeight: 28,
      jawDrop: 18,
      teethGap: 12,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 175,
      tipY: 128,
      bodyX: 142,
      bodyY: 115,
      rootX: 112,
      rootY: 120
    },
    focusPoint: { x: 140, y: 115, label: "由圆圆嘴型向微笑扁平口型滑动" },
    airflowType: "oral"
  },
  "aʊ": {
    phoneme: "aʊ",
    name: "合双元音 (如 cow, house, now)",
    category: "双元音",
    voiced: true,
    sampleWord: "cow",
    phonicsSpell: "c-o-w",
    ipa: "/kaʊ/",
    chineseExplanation:
      "从大口 /a/ 充分张开起始，随后嘴唇迅速向前收拢撅圆滑向 /ʊ/，口型由极大变为极小。",
    englishExplanation:
      "Diphthong gliding from open front /a/ towards near-close rounded /ʊ/. Pronounced rounding movement.",
    steps: [
      "嘴巴先像喊'啊'一样充分大张，下巴下拉",
      "紧接着嘴唇迅速向前撅圆收小，滑向 /ʊ/",
      "像不小心被针扎了一下喊出'嗷'的声音，动作夸张连贯"
    ],
    jawOpen: "large",
    lipShape: "round",
    frontLipParams: {
      lipWidth: 72,
      lipHeight: 38,
      jawDrop: 26,
      teethGap: 18,
      tongueTipVisible: false,
      tongueTipProtrusion: 0
    },
    tongueShape: {
      tipX: 174,
      tipY: 135,
      bodyX: 138,
      bodyY: 126,
      rootX: 114,
      rootY: 115
    },
    focusPoint: { x: 130, y: 120, label: "由大口'啊'瞬间收小收圆向前突出" },
    airflowType: "oral"
  },
};

// 预设高频音标切换列表
const QUICK_PHONEME_TABS = [
  { key: "j", label: "/j/ 半元音" },
  { key: "l", label: "/l/ 舌侧音" },
  { key: "θ", label: "/θ/ 咬舌清" },
  { key: "ð", label: "/ð/ 咬舌浊" },
  { key: "æ", label: "/æ/ 梅花音" },
  { key: "r", label: "/r/ 卷舌音" },
  { key: "ʃ", label: "/ʃ/ 嘘擦音" },
  { key: "v", label: "/v/ 唇齿音" },
  { key: "iː", label: "/iː/ 长元音" },
  { key: "ŋ", label: "/ŋ/ 后鼻音" },
  { key: "s", label: "/s/ 齿龈清" },
  { key: "z", label: "/z/ 齿龈浊" },
  { key: "w", label: "/w/ 双唇半元" },
];

export const cleanPhonemeKey = (raw: string): string => {
  if (!raw) return "p";
  let clean = decodeURIComponent(raw).replace(/[\/\[\]ˈˌ]/g, "").trim();
  const ALIASES: Record<string, string> = {
    th: "θ",
    dh: "ð",
    sh: "ʃ",
    ch: "tʃ",
    jh: "dʒ",
    ng: "ŋ",
    "i:": "iː",
    "u:": "uː",
    "o:": "ɔ",
    "a:": "ɑ",
    "e:": "ɜ",
    ae: "æ",
    i_long: "iː",
    u_long: "uː",
  };
  if (ALIASES[clean.toLowerCase()]) return ALIASES[clean.toLowerCase()];
  if (raw.includes("iː") || raw.includes("i:")) return "iː";
  if (raw.includes("uː") || raw.includes("u:")) return "uː";
  if (raw.includes("ɔː") || raw.includes("ɔ:")) return "ɔ";
  if (raw.includes("ɑː") || raw.includes("ɑ:")) return "ɑ";
  if (raw.includes("ɜː") || raw.includes("ɜ:")) return "ɜ";
  if (raw.toLowerCase() === "y") return "j";
  if (CLASSIC_3D_FILES[raw]) return raw;
  if (CLASSIC_3D_FILES[clean]) return clean;
  if (ARTICULATORY_PRESETS[raw]) return raw;
  if (ARTICULATORY_PRESETS[clean]) return clean;
  return clean || "p";
};

const getDynamicPhonemeConfig = (ph: string, defaultWord?: string): ArticulatoryConfig => {
  const guide = getPhonemeCoach(ph);
  return {
    phoneme: ph,
    name: guide.name || `音素 /${ph}/`,
    category: "通用",
    voiced: true,
    sampleWord: defaultWord || ph,
    phonicsSpell: ph,
    ipa: `/${ph}/`,
    chineseExplanation: guide.tip || "注意听外教标准发音示范，保持发音器官放松，对齐唇形与舌位。",
    englishExplanation: "Follow the 3D model for precise articulatory positioning and native phoneme production.",
    steps: [
      guide.mouthShape ? `口型要领：${guide.mouthShape}` : "观察 3D 唇齿正面开合度与嘴角张合",
      guide.tip ? `发音秘籍：${guide.tip}` : "调整舌位的高低与前后触碰位置",
      guide.mistake ? `避坑提示：${guide.mistake}` : "注意声带振动与气流摩擦的强弱控制",
    ],
    jawOpen: "medium",
    lipShape: "neutral",
    frontLipParams: {
      lipWidth: 88,
      lipHeight: 24,
      jawDrop: 14,
      teethGap: 8,
      tongueTipVisible: false,
      tongueTipProtrusion: 0,
    },
    tongueShape: {
      tipX: 180,
      tipY: 110,
      bodyX: 145,
      bodyY: 115,
      rootX: 110,
      rootY: 165,
    },
    focusPoint: { x: 180, y: 110, label: `音标 /${ph}/ 标准发音` },
    airflowType: "oral",
  };
};

export const CLASSIC_3D_FILES: Record<string, string> = {
  "ɪ": "r0000004_ɪ",
  "ɑ": "r0000008_ɑ",
  "æ": "r0000011_æ",
  "ʊ": "r0000014_ʊ",
  "ə": "r0000017_ə",
  "aɪ": "r0000040_aɪ",
  "j": "r0000043_j",
  "w": "r0000045_w",
  "r": "r0000046_r",
  "l": "r0000050_l",
  "p": "r0000055_p",
  "t": "r0000057_t",
  "k": "r0000059_k",
  "b": "r0000061_b",
  "d": "r0000063_d",
  "g": "r0000065_g",
  "f": "r0000067_f",
  "θ": "r0000069_θ",
  "s": "r0000070_s",
  "ʃ": "r0000075_ʃ",
  "v": "r0000079_v",
  "ð": "r0000081_ð",
  "z": "r0000082_z",
  "h": "r0000084_h",
  "tʃ": "r0000088_tʃ",
  "dʒ": "r0000090_dʒ",
  "m": "r0000095_m",
  "n": "r0000097_n",
  "ŋ": "r0000101_ŋ",
  "ɜ": "r0000103_ɜ",
  "eɪ": "r0000104_eɪ",
  "oʊ": "r0000111_oʊ",
  "ɔɪ": "r0000112_ɔɪ",
  "ɛ": "r0000117_ɛ",
  "ʌ": "r0000118_ʌ",
  "ɔ": "r0000121_ɔ",
  "aʊ": "r0000122_aʊ",
  "iː": "r0000123_iː",
  "uː": "r0000124_uː",
};

export const ArticulatoryTongueVisualizer = ({
  phoneme = "θ",
  word,
  compact = false,
  onClose,
  onStartAssessment,
}: {
  phoneme?: string;
  word?: string;
  compact?: boolean;
  onClose?: () => void;
  onStartAssessment?: () => void;
}) => {
  const [selectedPhoneme, setSelectedPhoneme] = useState(() => {
    return cleanPhonemeKey(phoneme);
  });

  const [audioTarget, setAudioTarget] = useState<"phoneme" | "word">("phoneme");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0); // 0.0 ~ 1.0 动画时间轴进度
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(1400); // 动画参考时长 ms

  const config =
    ARTICULATORY_PRESETS[selectedPhoneme] ||
    getDynamicPhonemeConfig(selectedPhoneme, word);
  const displayWord = word || config.sampleWord;

  // 当外部音标变动时同步切换
  useEffect(() => {
    const nextKey = cleanPhonemeKey(phoneme);
    setSelectedPhoneme(nextKey);
  }, [phoneme]);

  // 音标切换时重置媒体播放
  useEffect(() => {
    handleStop();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
  }, [selectedPhoneme]);

  // 慢动作倍速同步
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = isSlowMotion ? 0.65 : 1.0;
    }
  }, [isSlowMotion]);

  // 停止并归位
  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setPlayProgress(0);
  };

  // 播放与动画同频驱动 (支持单音 vs 单词切换)
  const handlePlay = (target: "phoneme" | "word" = audioTarget) => {
    if (isPlaying) {
      handleStop();
      if (target === audioTarget) return;
    }

    setAudioTarget(target);
    setIsPlaying(true);
    setPlayProgress(0);

    if (target === "phoneme") {
      // 纯音标单音：使用嵌入原厂纯音轨的 MP4 视频直接驱动，音画 100% 硬件同步且单次播完即停
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = false;
        videoRef.current.playbackRate = isSlowMotion ? 0.65 : 1.0;
        videoRef.current.play().catch((err) => {
          console.warn("Video play error, falling back to standalone audio", err);
          const classicFile =
            CLASSIC_3D_FILES[selectedPhoneme] ||
            CLASSIC_3D_FILES[cleanPhonemeKey(selectedPhoneme)];
          if (classicFile) {
            const audio = new Audio(`/assets/phonetics-3d/audio/${classicFile}.mp3`);
            if (isSlowMotion) audio.playbackRate = 0.75;
            audioRef.current = audio;
            audio.onended = () => {
              setIsPlaying(false);
              setPlayProgress(0);
            };
            audio.play();
          }
        });
      }
    } else {
      // 单词发音 (TTS 示范完整例词)
      const speedRate = isSlowMotion ? "-25%" : "-10%";
      const encodedWord = encodeURIComponent(displayWord);
      const audioUrl = `/api/ai/tts?text=${encodedWord}&voice=en-GB-SoniaNeural&rate=${encodeURIComponent(
        speedRate
      )}`;

      const audio = new Audio(audioUrl);
      if (isSlowMotion) {
        audio.playbackRate = 0.75;
      }
      audioRef.current = audio;

      // 同时静音播放 3D 视频供唇动参考
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = true;
        videoRef.current.playbackRate = isSlowMotion ? 0.65 : 1.0;
        videoRef.current.play().catch(() => {});
      }

      const playDurationMs = isSlowMotion ? 1800 : 1200;
      durationRef.current = playDurationMs;
      startTimeRef.current = performance.now();

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          durationRef.current = (audio.duration * 1000) / (isSlowMotion ? 0.75 : 1.0);
        }
      };

      const updateFrame = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / durationRef.current, 1);
        setPlayProgress(progress);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(updateFrame);
        } else {
          setIsPlaying(false);
          setPlayProgress(1);
          setTimeout(() => setPlayProgress(0), 400);
        }
      };

      animFrameRef.current = requestAnimationFrame(updateFrame);

      audio.onended = () => {
        handleStop();
      };

      audio.onerror = () => {
        console.warn("Edge TTS audio error, falling back to Web Speech API");
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(displayWord);
          utterance.lang = "en-GB";
          utterance.rate = isSlowMotion ? 0.7 : 0.9;
          utterance.onend = () => handleStop();
          utterance.onerror = () => handleStop();
          window.speechSynthesis.speak(utterance);
        } else {
          handleStop();
        }
      };

      audio.play().catch(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(displayWord);
          utterance.lang = "en-GB";
          window.speechSynthesis.speak(utterance);
        }
      });
    }
  };

  // 手动拖动进度条定格观察
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPlayProgress(val);
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = val * videoRef.current.duration;
    }
    if (isPlaying) {
      handleStop();
    }
  };

  return (
    <div
      className={`rounded-3xl bg-slate-900 text-slate-100 border-2 border-slate-700/80 shadow-2xl p-4 sm:p-5 relative ${
        compact ? "max-w-4xl" : "w-full"
      } overflow-hidden`}
    >
      {/* 顶部：专业双重视角镜舱标题与音标速切 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-amber-500/20">
            👅
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black tracking-wide text-white">
                发音大师 · 音标单音 3D 唇齿与解剖动效
              </h3>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-mono text-xs font-bold">
                🎯 音标单音 /{config.phoneme}/ (非单词整音)
              </Badge>
              <span className="text-xs text-amber-400/90 font-mono bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50">
                例词: {displayWord}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              专注于单个音标的器官动作（唇齿正面开合 + 侧切面声带与舌位），配套原厂 1.4s 纯音标发声
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="size-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 音标快速切换 Chip 栏 */}
      {(() => {
        const activeInTabs = QUICK_PHONEME_TABS.some((t) => t.key === selectedPhoneme);
        const displayTabs = activeInTabs
          ? QUICK_PHONEME_TABS
          : [{ key: selectedPhoneme, label: `/${selectedPhoneme}/ 目标音` }, ...QUICK_PHONEME_TABS];

        return (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <FlameIcon className="size-3.5 text-amber-500" />
              重点发音点选：
            </span>
            {displayTabs.map((tab) => {
              const isActive = selectedPhoneme === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSelectedPhoneme(tab.key);
                    handleStop();
                  }}
                  className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105"
                      : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* 主体双栏：左侧声学与口诀指导卡片 | 右侧双视角动画播放镜舱 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 左侧栏 (占 6 列)：🎞️ 3D 实录与解剖视听台 + 统一发音操纵台 */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl bg-slate-950 border-2 border-slate-700/80 p-3.5 shadow-xl relative overflow-hidden">
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>🎞️</span>
              <span>3D 唇齿与舌位实录视窗</span>
            </span>
            <span className="text-[10px] text-amber-400/90 font-mono bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              Tell Me More 3D 原厂实录
            </span>
          </div>

          {/* 3D 录像视窗 (MP4 视频同频驱动，单次播完自动停驻) */}
          <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 relative min-h-[300px]">
            <div className="w-full max-w-[210px] aspect-[2/3] bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center group">
              <video
                ref={videoRef}
                src={`/assets/phonetics-3d/animations/mp4/${CLASSIC_3D_FILES[selectedPhoneme] || CLASSIC_3D_FILES[cleanPhonemeKey(selectedPhoneme)] || "r0000043_j"}.mp4`}
                playsInline
                preload="auto"
                loop={isLooping}
                onTimeUpdate={() => {
                  if (videoRef.current && videoRef.current.duration) {
                    setPlayProgress(videoRef.current.currentTime / videoRef.current.duration);
                  }
                }}
                onEnded={() => {
                  if (!isLooping) {
                    setIsPlaying(false);
                    setPlayProgress(1);
                    setTimeout(() => {
                      setPlayProgress(0);
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                      }
                    }, 300);
                  }
                }}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => {
                  if (isPlaying) {
                    handleStop();
                  } else {
                    handlePlay(audioTarget);
                  }
                }}
              />
              {/* 未播放时居中轻触播放浮层 */}
              {!isPlaying && playProgress === 0 && (
                <div
                  onClick={() => handlePlay(audioTarget)}
                  className="absolute inset-0 bg-slate-950/20 hover:bg-slate-950/40 transition-colors flex items-center justify-center cursor-pointer"
                  title="点击开始发音示范"
                >
                  <div className="size-11 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                    <PlayIcon className="size-5 fill-current ml-0.5" />
                  </div>
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-2.5 font-mono flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${isPlaying ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
              <span>纯单音原厂实录 ({isLooping ? "已开启循环" : "单次播放·播完即停"})</span>
            </div>
          </div>

          {/* 底部统一发音操纵台 (Unified Media Console) */}
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
            {/* Row 1: 核心播放按钮与声带状态徽章 */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => handlePlay("phoneme")}
                  className={`h-8 px-3 text-xs rounded-xl font-bold gap-1.5 cursor-pointer transition-all ${
                    isPlaying && audioTarget === "phoneme"
                      ? "bg-amber-500 text-slate-950 animate-pulse ring-2 ring-amber-400"
                      : "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm shadow-amber-500/20"
                  }`}
                  title="播放独立音标单音（与 3D 口型动画 1:1 同步）"
                >
                  {isPlaying && audioTarget === "phoneme" ? (
                    <PauseIcon className="size-3.5 fill-current" />
                  ) : (
                    <Volume2Icon className="size-3.5" />
                  )}
                  <span>播放单音 /{config.phoneme}/</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePlay("word")}
                  className={`h-8 px-3 text-xs rounded-xl font-bold gap-1.5 cursor-pointer transition-all ${
                    isPlaying && audioTarget === "word"
                      ? "bg-sky-500/20 text-sky-300 border-sky-400 ring-2 ring-sky-400"
                      : "border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                  title={`听在单词中的发音: ${displayWord}`}
                >
                  <span>🗣️ 听例词: {displayWord}</span>
                </Button>
              </div>

              {/* 声带振动实时状态徽章 */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
                <span
                  className={`size-2 rounded-full ${
                    config.voiced
                      ? isPlaying
                        ? "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-ping"
                        : "bg-emerald-500"
                      : "bg-slate-600"
                  }`}
                />
                <span className={config.voiced ? "text-emerald-300 font-bold" : "text-slate-400"}>
                  {config.voiced ? "浊音 (声带振动)" : "清音 (纯气流)"}
                </span>
              </div>
            </div>

            {/* Row 2: 时间轴进度滑杆与定格拖拽 */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono text-slate-400 shrink-0">帧定格</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={playProgress}
                onChange={handleScrub}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                title="拖拽时间轴观察发音过程与唇舌定格"
              />
              <span className="text-[10px] font-mono text-amber-400 w-8 text-right font-bold">
                {Math.round(playProgress * 100)}%
              </span>
            </div>

            {/* Row 3: 辅助控制 (归位、慢放、循环、模式说明) */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStop}
                  className="h-6 px-2 text-[11px] rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="停止并归位"
                >
                  <SquareIcon className="size-3 fill-current mr-1" />
                  <span>归位</span>
                </Button>

                <button
                  onClick={() => setIsSlowMotion(!isSlowMotion)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    isSlowMotion
                      ? "bg-orange-500/20 text-orange-300 border-orange-500/50"
                      : "text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                  title="开启 0.75x 慢速便于观察唇齿运动"
                >
                  🐢 0.75x 慢放
                </button>

                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    isLooping
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                  title={isLooping ? "当前已开启循环播放" : "当前为单次播放（播完自动停驻）"}
                >
                  {isLooping ? "🔁 循环" : "⏹️ 单次"}
                </button>
              </div>

              <span className="text-[10px] text-slate-400 hidden sm:inline font-mono">
                {audioTarget === "phoneme" ? "🎯 1.4s 纯正单音" : `📖 例词 ${displayWord}`}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧栏 (占 6 列)：💡 敢敢发音私教与动作要领 (导学实战区) */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-3.5">
          {/* 1. 🌟 少儿 3 步黄金口诀卡片 */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <SparklesIcon className="size-4 text-amber-400" />
                <span>少儿 3 步拟物练音口诀</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                肌肉记忆法
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-1">
              {config.steps.map((st, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                  <span className="size-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 border border-amber-500/30">
                    {i + 1}
                  </span>
                  <span className="text-xs text-slate-200 leading-relaxed font-medium">{st}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 🎯 发音器官定位自查清单 */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <span className="size-2 rounded-xs bg-amber-500 inline-block" />
              <span>唇齿舌位解剖自查要点</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">👄 唇形</div>
                <div className="text-xs font-bold text-slate-200 uppercase truncate">
                  {config.lipShape}
                </div>
                <div className="text-[9px] text-slate-400">下颌 {config.jawOpen}</div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">👅 舌位</div>
                <div className="text-xs font-bold text-amber-300 truncate" title={config.focusPoint.label}>
                  {config.category}
                </div>
                <div className="text-[9px] text-slate-400 truncate">触点到位</div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">💨 气流</div>
                <div className="text-xs font-bold text-sky-300 truncate">
                  {config.airflowType === "interdental"
                    ? "齿间送气"
                    : config.airflowType === "nasal"
                    ? "鼻腔共鸣"
                    : "口腔送气"}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  {config.voiced ? "声带振动" : "声带不振"}
                </div>
              </div>
            </div>
          </div>

          {/* 3. 📖 示范例词与避坑提示 */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>📖</span>
                <span>核心释义与避坑</span>
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                {displayWord} {config.ipa}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pl-2.5 border-l-2 border-amber-500/60">
              {config.chineseExplanation}
            </p>
          </div>

          {/* 4. 🎙️ 即学即练 · 敢敢跟读打分挑战 */}
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-slate-900 border border-amber-500/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <SparklesIcon className="size-3.5 text-amber-400" />
                <span>看懂口型了？快来模仿读一遍！</span>
              </div>
              <p className="text-[11px] text-slate-300">
                大声朗读例词 <span className="font-bold text-white font-mono">{displayWord}</span> 或跟读题库，AI 为你音素级实时打分
              </p>
            </div>
            <Button
              onClick={() => {
                if (onStartAssessment) {
                  onStartAssessment();
                } else {
                  const el =
                    document.getElementById("curated-library-section") ||
                    document.getElementById("assessment-recorder-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="h-8 px-3.5 text-xs rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <MicIcon className="size-3.5" />
              <span>去跟读测评打分</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
