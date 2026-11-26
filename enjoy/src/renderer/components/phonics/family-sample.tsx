import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { StarIcon } from "lucide-react";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { submitPronunciationArchive } from "@renderer/hooks/use-pronunciation-assessments";
import {
  getApiBase,
  getPhonemeAuthHeaders,
  getPhonemeUserId,
  getScopedKey,
} from "@renderer/lib/phoneme-cloud-sync";
import { getEvents } from "@renderer/lib/learning-events";

/**
 * 词族乐园 · 通用词族组件（量产打样：-am 已定版 / -at 打样中）
 * 参照教材图2：a+m=am 演示教学（不拼韵脚）→ 换首音拼整词 → 听辨点图 → 跟读 → 族内复习。
 * 教材风：白底、柔和色块、圆角软阴影；字母块点击即发音，不加喇叭徽标。
 * 纯内存状态，不写任何进度/掌握度/学习事件。
 */

export interface FamilyConfig {
  id: string;
  rime: string;
  rimeLetters: [string, string];
  badge: string;
  blurb: string;
  words: { word: string; onset: string }[];
  listenOrder: string[];
  repeatWords: string[];
  reviewRounds: { word: string; onset: string; tiles: string[] }[];
}

const AM_FAMILY: FamilyConfig = {
  id: "am",
  rime: "am",
  rimeLetters: ["a", "m"],
  badge: "第 1 族",
  blurb: "a+m=am 先学韵脚，再换首音拼整词：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "ram", onset: "r" },
    { word: "jam", onset: "j" },
    { word: "yam", onset: "y" },
    { word: "dam", onset: "d" },
  ],
  listenOrder: ["jam", "ram", "dam", "yam"],
  repeatWords: ["ram", "jam"],
  reviewRounds: [
    { word: "dam", onset: "d", tiles: ["y", "d", "r", "j"] },
    { word: "yam", onset: "y", tiles: ["d", "y", "j", "r"] },
  ],
};

const AT_FAMILY: FamilyConfig = {
  id: "at",
  rime: "at",
  rimeLetters: ["a", "t"],
  badge: "第 2 族",
  blurb: "a+t=at 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "cat", onset: "c" },
    { word: "hat", onset: "h" },
    { word: "bat", onset: "b" },
    { word: "mat", onset: "m" },
  ],
  listenOrder: ["hat", "cat", "mat", "bat"],
  repeatWords: ["cat", "hat"],
  reviewRounds: [
    { word: "bat", onset: "b", tiles: ["m", "b", "h", "c"] },
    { word: "mat", onset: "m", tiles: ["h", "m", "c", "b"] },
  ],
};

const AN_FAMILY: FamilyConfig = {
  id: "an",
  rime: "an",
  rimeLetters: ["a", "n"],
  badge: "第 3 族",
  blurb: "a+n=an 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "can", onset: "c" },
    { word: "man", onset: "m" },
    { word: "fan", onset: "f" },
    { word: "van", onset: "v" },
  ],
  listenOrder: ["man", "can", "van", "fan"],
  repeatWords: ["can", "man"],
  reviewRounds: [
    { word: "fan", onset: "f", tiles: ["v", "f", "c", "m"] },
    { word: "van", onset: "v", tiles: ["m", "v", "f", "c"] },
  ],
};

const AP_FAMILY: FamilyConfig = {
  id: "ap",
  rime: "ap",
  rimeLetters: ["a", "p"],
  badge: "第 4 族",
  blurb: "a+p=ap 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "cap", onset: "c" },
    { word: "map", onset: "m" },
    { word: "tap", onset: "t" },
    { word: "nap", onset: "n" },
  ],
  listenOrder: ["map", "cap", "nap", "tap"],
  repeatWords: ["cap", "map"],
  reviewRounds: [
    { word: "nap", onset: "n", tiles: ["t", "n", "c", "m"] },
    { word: "tap", onset: "t", tiles: ["c", "t", "m", "n"] },
  ],
};

const AD_FAMILY: FamilyConfig = {
  id: "ad",
  rime: "ad",
  rimeLetters: ["a", "d"],
  badge: "第 5 族",
  blurb: "a+d=ad 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "dad", onset: "d" },
    { word: "sad", onset: "s" },
    { word: "mad", onset: "m" },
    { word: "pad", onset: "p" },
  ],
  listenOrder: ["sad", "dad", "pad", "mad"],
  repeatWords: ["dad", "sad"],
  reviewRounds: [
    { word: "mad", onset: "m", tiles: ["s", "m", "d", "p"] },
    { word: "pad", onset: "p", tiles: ["d", "p", "m", "s"] },
  ],
};

const AG_FAMILY: FamilyConfig = {
  id: "ag",
  rime: "ag",
  rimeLetters: ["a", "g"],
  badge: "第 6 族",
  blurb: "a+g=ag 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "bag", onset: "b" },
    { word: "tag", onset: "t" },
    { word: "rag", onset: "r" },
    { word: "wag", onset: "w" },
  ],
  listenOrder: ["tag", "bag", "wag", "rag"],
  repeatWords: ["bag", "tag"],
  reviewRounds: [
    { word: "wag", onset: "w", tiles: ["r", "w", "b", "t"] },
    { word: "rag", onset: "r", tiles: ["b", "r", "t", "w"] },
  ],
};


const IT_FAMILY: FamilyConfig = {
  id: "it",
  rime: "it",
  rimeLetters: ["i", "t"],
  badge: "新词族",
  blurb: "i+t=it 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "sit", onset: "s" },
    { word: "hit", onset: "h" },
    { word: "bit", onset: "b" },
    { word: "pit", onset: "p" },
  ],
  listenOrder: ["bit", "sit", "pit", "hit"],
  repeatWords: ["sit", "hit"],
  reviewRounds: [
    { word: "pit", onset: "p", tiles: ["s", "p", "h", "b"] },
    { word: "bit", onset: "b", tiles: ["h", "b", "p", "s"] },
  ],
};

const IP_FAMILY: FamilyConfig = {
  id: "ip",
  rime: "ip",
  rimeLetters: ["i", "p"],
  badge: "新词族",
  blurb: "i+p=ip 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "sip", onset: "s" },
    { word: "lip", onset: "l" },
    { word: "dip", onset: "d" },
    { word: "zip", onset: "z" },
  ],
  listenOrder: ["zip", "sip", "dip", "lip"],
  repeatWords: ["sip", "lip"],
  reviewRounds: [
    { word: "dip", onset: "d", tiles: ["l", "d", "z", "s"] },
    { word: "zip", onset: "z", tiles: ["s", "z", "l", "d"] },
  ],
};

const IN_FAMILY: FamilyConfig = {
  id: "in",
  rime: "in",
  rimeLetters: ["i", "n"],
  badge: "新词族",
  blurb: "i+n=in 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "pin", onset: "p" },
    { word: "win", onset: "w" },
    { word: "fin", onset: "f" },
    { word: "bin", onset: "b" },
  ],
  listenOrder: ["fin", "pin", "bin", "win"],
  repeatWords: ["pin", "win"],
  reviewRounds: [
    { word: "fin", onset: "f", tiles: ["w", "f", "b", "p"] },
    { word: "bin", onset: "b", tiles: ["p", "b", "f", "w"] },
  ],
};

const IG_FAMILY: FamilyConfig = {
  id: "ig",
  rime: "ig",
  rimeLetters: ["i", "g"],
  badge: "新词族",
  blurb: "i+g=ig 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "pig", onset: "p" },
    { word: "big", onset: "b" },
    { word: "dig", onset: "d" },
    { word: "wig", onset: "w" },
  ],
  listenOrder: ["wig", "pig", "dig", "big"],
  repeatWords: ["pig", "big"],
  reviewRounds: [
    { word: "dig", onset: "d", tiles: ["b", "d", "w", "p"] },
    { word: "wig", onset: "w", tiles: ["p", "w", "d", "b"] },
  ],
};

const ID_FAMILY: FamilyConfig = {
  id: "id",
  rime: "id",
  rimeLetters: ["i", "d"],
  badge: "新词族",
  blurb: "i+d=id 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "kid", onset: "k" },
    { word: "lid", onset: "l" },
    { word: "hid", onset: "h" },
    { word: "mid", onset: "m" },
  ],
  listenOrder: ["mid", "kid", "hid", "lid"],
  repeatWords: ["kid", "lid"],
  reviewRounds: [
    { word: "hid", onset: "h", tiles: ["l", "h", "m", "k"] },
    { word: "mid", onset: "m", tiles: ["k", "m", "h", "l"] },
  ],
};

const IX_FAMILY: FamilyConfig = {
  id: "ix",
  rime: "ix",
  rimeLetters: ["i", "x"],
  badge: "新词族",
  blurb: "i+x=ix 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
  words: [
    { word: "six", onset: "s" },
    { word: "mix", onset: "m" },
    { word: "fix", onset: "f" },
  ],
  listenOrder: ["fix", "six", "mix"],
  repeatWords: ["six", "mix"],
  reviewRounds: [
    { word: "fix", onset: "f", tiles: ["m", "f", "s"] },
    { word: "mix", onset: "m", tiles: ["s", "m", "f"] },
  ],
};

const OT_FAMILY: FamilyConfig = {
id: "ot",
rime: "ot",
rimeLetters: ["o", "t"],
badge: "新词族",
blurb: "o+t=ot 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "hot", onset: "h"},
{ word: "pot", onset: "p"},
{ word: "dot", onset: "d"},
{ word: "cot", onset: "c"},
],
listenOrder: ["dot", "hot", "cot", "pot"],
repeatWords: ["hot", "pot"],
reviewRounds: [
{ word: "dot", onset: "d", tiles: ["h", "d", "c", "p"]},
{ word: "cot", onset: "c", tiles: ["p", "c", "d", "h"]},
],
};

const OP_FAMILY: FamilyConfig = {
id: "op",
rime: "op",
rimeLetters: ["o", "p"],
badge: "新词族",
blurb: "o+p=op 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "top", onset: "t"},
{ word: "mop", onset: "m"},
{ word: "hop", onset: "h"},
{ word: "pop", onset: "p"},
],
listenOrder: ["hop", "top", "pop", "mop"],
repeatWords: ["top", "mop"],
reviewRounds: [
{ word: "hop", onset: "h", tiles: ["m", "h", "p", "t"]},
{ word: "pop", onset: "p", tiles: ["t", "p", "h", "m"]},
],
};

const OG_FAMILY: FamilyConfig = {
id: "og",
rime: "og",
rimeLetters: ["o", "g"],
badge: "新词族",
blurb: "o+g=og 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "dog", onset: "d"},
{ word: "log", onset: "l"},
{ word: "hog", onset: "h"},
{ word: "fog", onset: "f"},
],
listenOrder: ["fog", "dog", "hog", "log"],
repeatWords: ["dog", "log"],
reviewRounds: [
{ word: "hog", onset: "h", tiles: ["l", "h", "f", "d"]},
{ word: "fog", onset: "f", tiles: ["d", "f", "h", "l"]},
],
};

const OB_FAMILY: FamilyConfig = {
id: "ob",
rime: "ob",
rimeLetters: ["o", "b"],
badge: "新词族",
blurb: "o+b=ob 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "job", onset: "j"},
{ word: "rob", onset: "r"},
{ word: "cob", onset: "c"},
{ word: "sob", onset: "s"},
],
listenOrder: ["sob", "job", "cob", "rob"],
repeatWords: ["job", "rob"],
reviewRounds: [
{ word: "cob", onset: "c", tiles: ["r", "c", "s", "j"]},
{ word: "sob", onset: "s", tiles: ["j", "s", "c", "r"]},
],
};

const OX_FAMILY: FamilyConfig = {
id: "ox",
rime: "ox",
rimeLetters: ["o", "x"],
badge: "新词族",
blurb: "o+x=ox 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "fox", onset: "f"},
{ word: "box", onset: "b"},
{ word: "ox", onset: ""},
],
listenOrder: ["box", "fox", "ox"],
repeatWords: ["fox", "box"],
reviewRounds: [
{ word: "fox", onset: "f", tiles: ["b", "f"]},
{ word: "box", onset: "b", tiles: ["f", "b"]},
],
};

const ET_FAMILY: FamilyConfig = {
id: "et",
rime: "et",
rimeLetters: ["e", "t"],
badge: "新词族",
blurb: "e+t=et 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "net", onset: "n"},
{ word: "wet", onset: "w"},
{ word: "pet", onset: "p"},
{ word: "jet", onset: "j"},
],
listenOrder: ["pet", "net", "jet", "wet"],
repeatWords: ["net", "wet"],
reviewRounds: [
{ word: "pet", onset: "p", tiles: ["j", "p", "w", "n"]},
{ word: "jet", onset: "j", tiles: ["n", "j", "p", "w"]},
],
};

const EN_FAMILY: FamilyConfig = {
id: "en",
rime: "en",
rimeLetters: ["e", "n"],
badge: "新词族",
blurb: "e+n=en 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "hen", onset: "h"},
{ word: "pen", onset: "p"},
{ word: "ten", onset: "t"},
{ word: "den", onset: "d"},
],
listenOrder: ["ten", "hen", "den", "pen"],
repeatWords: ["hen", "pen"],
reviewRounds: [
{ word: "ten", onset: "t", tiles: ["d", "t", "p", "h"]},
{ word: "den", onset: "d", tiles: ["h", "d", "t", "p"]},
],
};

const ED_FAMILY: FamilyConfig = {
id: "ed",
rime: "ed",
rimeLetters: ["e", "d"],
badge: "新词族",
blurb: "e+d=ed 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "bed", onset: "b"},
{ word: "red", onset: "r"},
{ word: "fed", onset: "f"},
{ word: "led", onset: "l"},
],
listenOrder: ["red", "bed", "led", "fed"],
repeatWords: ["bed", "red"],
reviewRounds: [
{ word: "fed", onset: "f", tiles: ["l", "f", "r", "b"]},
{ word: "led", onset: "l", tiles: ["b", "l", "f", "r"]},
],
};

const EG_FAMILY: FamilyConfig = {
id: "eg",
rime: "eg",
rimeLetters: ["e", "g"],
badge: "新词族",
blurb: "e+g=eg 同一套五步：学韵脚 → 拼词 → 听辨 → 跟读 → 复习",
words: [
{ word: "leg", onset: "l"},
{ word: "peg", onset: "p"},
{ word: "beg", onset: "b"},
],
listenOrder: ["peg", "leg", "beg"],
repeatWords: ["leg", "peg"],
reviewRounds: [
{ word: "beg", onset: "b", tiles: ["l", "b", "p"]},
{ word: "leg", onset: "l", tiles: ["p", "l", "b"]},
],
};

const FAMILIES: FamilyConfig[] = [
  AM_FAMILY,
  AT_FAMILY,
  AN_FAMILY,
  AP_FAMILY,
  AD_FAMILY,
  AG_FAMILY,
  IT_FAMILY,
  IP_FAMILY,
  IN_FAMILY,
  IG_FAMILY,
  ID_FAMILY,
  IX_FAMILY,
  OT_FAMILY,
  OP_FAMILY,
  OG_FAMILY,
  OB_FAMILY,
  OX_FAMILY,
  ET_FAMILY,
  EN_FAMILY,
  ED_FAMILY,
  EG_FAMILY,
];
// 字母 → 音素库 ID：音素库按 IPA 索引，字母 j 的拼读音是 /dʒ/、字母 y 是 /j/；
// 直传字母会让 y 无声、j 串成 y 的音（2026-11-05 Roger 试玩抓到）
const PHONEME_ID: Record<string, string> = {
  a: "ae",
  i: "i_short",
  o: "o_short",
  e: "e_short",
  m: "m",
  r: "r",
  j: "dʒ",
  y: "j",
  d: "d",
  c: "k",
  h: "h",
  b: "b",
  t: "t",
  f: "f",
  v: "v",
  p: "p",
  n: "n",
  s: "s",
  g: "g",
  w: "w",
  l: "l",
  z: "z",
  k: "k",
  x: "ks",
};
const ONSET_COLORS: Record<string, string> = {
  r: "#C2185B",
  j: "#007B83",
  y: "#96690A",
  d: "#5E35B1",
  c: "#C62828",
  h: "#3949AB",
  b: "#0F7B7A",
  m: "#BF360C",
  f: "#2E7D32",
  v: "#AD1457",
  p: "#283593",
  n: "#5D4037",
  s: "#0277BD",
  g: "#7A5900",
  w: "#6D4C41",
  t: "#455A64",
  l: "#6A1B9A",
  z: "#A84300",
  k: "#0A5E5D",
};
const TEACH_COLORS: Record<string, string> = {
  a: "#C2185B",
  i: "#C2185B",
  o: "#C2185B",
  e: "#C2185B",
  m: "#0277BD",
  t: "#0277BD",
  n: "#0277BD",
  p: "#0277BD",
  d: "#0277BD",
  g: "#0277BD",
  x: "#0277BD",
  b: "#0277BD",
};

type Step = "rime" | "build" | "listen" | "repeat" | "review" | "done";
const STEP_LABEL: Record<Step, string> = {
  rime: "第 1 步 · 学韵脚",
  build: "第 2 步 · 换首音拼词",
  listen: "第 3 步 · 听辨点图",
  repeat: "第 4 步 · 跟读",
  review: "第 5 步 · 复习填字",
  done: "完成",
};

function playWord(word: string, mark?: (w: string) => void) {
  try {
    const audio = new Audio(
      `/api/ai/tts?text=${encodeURIComponent(word)}&voice=en-US-AriaNeural&rate=-5%`
    );
    audio.play().catch(() => {});
  } catch (e) {}
  if (mark) mark(word);
}

// 韵脚音频走预生成的静态文件（Azure 按 IPA 合成）：单词 TTS 会把 ap/ag 这类非词字母串读成字母名（2026-11-06 实测）
function playRime(rime: string, mark?: (w: string) => void) {
  try {
    const audio = new Audio(`/assets/phonics/rimes/${rime}.mp3`);
    audio.play().catch(() => {});
  } catch (e) {}
  if (mark) mark(rime);
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 跟读识别走自家后端（Azure STT）：浏览器自带识别依赖 Google 服务、国内不可用，已弃用（2026-11-06 实测 Roger 的 Chrome 无星）
async function recognizeWord(
  target: string,
  blob: Blob
): Promise<{ stars: number; heard: string; raw?: any } | null> {
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 12000);
    const resp = await fetch("/api/speech/recognize-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: dataUrl.split(",")[1] || "" }),
      signal: ctl.signal,
    });
    window.clearTimeout(timer);
    if (!resp.ok) return null;
    const j = await resp.json();
    const alts = (j.alternatives || [])
      .map((a: any) => a.text)
      .filter(Boolean);
    const scored = scoreHeard(target, alts);
    return scored ? { ...scored, raw: j } : null;
  } catch (e) {
    return null;
  }
}

function editDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = Array(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// 跟读简单识别打分（2026-11-06 Roger 拍板加入）：识别文本与目标词比对——3 星读对、2 星差一点、1 星录到了但没读准；无可用识别结果返回 null（不打分、不编分）
function scoreHeard(
  target: string,
  alternatives: string[]
): { stars: number; heard: string } | null {
  let best: { stars: number; heard: string } | null = null;
  for (const alt of alternatives) {
    const t = alt.toLowerCase().replace(/[^a-z'\s]/g, "").trim();
    if (!t) continue;
    let stars = 1;
    if (t.split(/\s+/).includes(target)) stars = 3;
    else if (editDistance(t, target) <= 1) stars = 2;
    if (!best || stars > best.stars) best = { stars, heard: t };
  }
  return best;
}

function speakLetter(letter: string, mark?: (pid: string) => void) {
  const pid = PHONEME_ID[letter];
  if (!pid) return;
  if (mark) mark(pid);
  playPhonemeSound(pid).catch(() => {});
}

function hitSlot(
  refs: (HTMLDivElement | null)[],
  x: number,
  y: number
): number {
  let hit = -1;
  refs.forEach((el, i) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) hit = i;
  });
  return hit;
}

interface DragBind {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  style?: React.CSSProperties;
}

function useDrag(
  onTap: (tileKey: string, letter: string) => void,
  onDropAt: (tileKey: string, letter: string, x: number, y: number) => void
) {
  const ref = useRef<{
    tileKey: string;
    letter: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [drag, setDrag] = useState<{
    tileKey: string;
    dx: number;
    dy: number;
  } | null>(null);

  const bind = (tileKey: string, letter: string, locked: boolean): DragBind => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (locked) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch (err) {}
      ref.current = {
        tileKey,
        letter,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      setDrag({ tileKey, dx: 0, dy: 0 });
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = ref.current;
      if (!d || d.tileKey !== tileKey) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) + Math.abs(dy) > 8) d.moved = true;
      setDrag({ tileKey, dx, dy });
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = ref.current;
      if (!d || d.tileKey !== tileKey) return;
      ref.current = null;
      setDrag(null);
      if (!d.moved) onTap(tileKey, letter);
      else onDropAt(tileKey, letter, e.clientX, e.clientY);
    },
    onPointerCancel: () => {
      if (ref.current && ref.current.tileKey === tileKey) {
        ref.current = null;
        setDrag(null);
      }
    },
    style:
      drag && drag.tileKey === tileKey
        ? {
            transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-3deg) scale(1.05)`,
            zIndex: 50,
            position: "relative",
          }
        : undefined,
  });

  return { bind };
}

const TILE_BASE =
  "w-[76px] h-[76px] rounded-[20px] shadow-[0_8px_18px_rgba(18,59,60,0.18)] flex items-center justify-center text-4xl font-black text-white select-none touch-none cursor-grab active:cursor-grabbing";
const CELL_BASE =
  "w-[72px] h-[72px] rounded-[20px] flex items-center justify-center text-4xl font-black select-none";
const NEXT_BTN_CLS =
  "min-h-[48px] font-black text-lg px-9 py-3 rounded-full bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white shadow-[0_8px_20px_rgba(15,123,122,0.3)] active:translate-y-0.5 animate-in fade-in";

const FAMILY_PROGRESS_STORAGE_KEY = "sunnybridge_family_progress_v1";

export type FamilyCardStatus = "unstarted" | "in_progress" | "learned";

interface FamilyLocalProgressItem {
  status: FamilyCardStatus;
  lastStep?: Step;
  repeatStars?: Record<string, number>;
  updatedAt: number;
}

interface FamilyStatusSummary {
  status: FamilyCardStatus;
  avgStars: number | null;
}

function readLocalFamilyProgressMap(): Record<string, FamilyLocalProgressItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getScopedKey(FAMILY_PROGRESS_STORAGE_KEY));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalFamilyProgress(
  famId: string,
  patch: {
    status?: FamilyCardStatus;
    lastStep?: Step;
    repeatStars?: Record<string, number>;
  }
): void {
  if (typeof window === "undefined" || !famId) return;
  try {
    const map = readLocalFamilyProgressMap();
    const prev = map[famId];
    const mergedStars: Record<string, number> = { ...(prev?.repeatStars || {}) };
    if (patch.repeatStars) {
      for (const [w, s] of Object.entries(patch.repeatStars)) {
        if (typeof s === "number" && s > 0) {
          mergedStars[w] = Math.max(mergedStars[w] || 0, s);
        }
      }
    }
    const nextStatus: FamilyCardStatus =
      prev?.status === "learned" || patch.status === "learned"
        ? "learned"
        : patch.status || prev?.status || "in_progress";

    map[famId] = {
      status: nextStatus,
      lastStep: patch.lastStep || prev?.lastStep,
      repeatStars: Object.keys(mergedStars).length > 0 ? mergedStars : prev?.repeatStars,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getScopedKey(FAMILY_PROGRESS_STORAGE_KEY), JSON.stringify(map));
  } catch {}
}

export interface FamilyGameProps {
  family: FamilyConfig;
  onExit: () => void;
}

export const FamilyGame: React.FC<FamilyGameProps> = ({ family, onExit }) => {
  const RIME = family.rime;
  const RIME_LETTERS = family.rimeLetters;
  const WORDS = family.words;
  const onsetOf = (word: string) =>
    WORDS.find((w) => w.word === word)?.onset ?? word[0];
  const LISTEN_ORDER = family.listenOrder;
  const REPEAT_WORDS = family.repeatWords;
  const REVIEW_ROUNDS = family.reviewRounds;
  const [step, setStep] = useState<Step>("rime");
  const [sweepKey, setSweepKey] = useState(0);
  const [shakeKey, setShakeKey] = useState<string | null>(null);
  const [lastPhoneme, setLastPhoneme] = useState<string | null>(null);
  const [lastWordPlayed, setLastWordPlayed] = useState<string | null>(null);

  // 学韵脚（演示教学：点字母听单音，点 am 听合成）
  const [tapped, setTapped] = useState<string[]>([]);
  const [blendPlayed, setBlendPlayed] = useState(false);

  // 换首音
  const [buildIdx, setBuildIdx] = useState(0);
  const [rimePlaced, setRimePlaced] = useState(false);
  const [buildRevealed, setBuildRevealed] = useState(false);
  const [wordsBuilt, setWordsBuilt] = useState<string[]>([]);
  const buildSlotRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 听辨
  const [listenIdx, setListenIdx] = useState(0);
  const [listenHits, setListenHits] = useState(0);
  const [listenMisses, setListenMisses] = useState(0);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  // 听辨出现顺序随机（2026-11-06 Roger 拍板）：目标词顺序每次进入本族洗一次，图卡位置每轮重洗
  const [listenOrder, setListenOrder] = useState<string[]>(() => shuffled(LISTEN_ORDER));
  const [cardOrder, setCardOrder] = useState<string[]>(() =>
    shuffled(WORDS.map((w) => w.word))
  );

  // 跟读
  const [recState, setRecState] = useState<Record<string, string>>({});
  const [recUrls, setRecUrls] = useState<Record<string, string>>({});
  const [repeatDone, setRepeatDone] = useState<string[]>([]);
  const [micError, setMicError] = useState(false);
  const [repeatScores, setRepeatScores] = useState<
    Record<string, { stars: number; heard: string }>
  >({});
  const [repeatAttempts, setRepeatAttempts] = useState<Record<string, number>>({});
  const [scoringWord, setScoringWord] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 复习
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewPlaced, setReviewPlaced] = useState(false);
  const [reviewMisses, setReviewMisses] = useState(0);
  const reviewSlotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const doShake = (key: string) => {
    setShakeKey(key);
    window.setTimeout(() => setShakeKey(null), 350);
  };

  // 听辨每轮自动播一次目标词
  useEffect(() => {
    if (step !== "listen") return;
    if (listenIdx >= listenOrder.length) return;
    const t = window.setTimeout(
      () => playWord(listenOrder[listenIdx], setLastWordPlayed),
      500
    );
    return () => window.clearTimeout(t);
  }, [step, listenIdx]);

  // 仅在用户实际推进步骤/产生跟读星级时写入真实进度，绝不预填充假数据
  useEffect(() => {
    const starsOnly: Record<string, number> = {};
    for (const [w, val] of Object.entries(repeatScores)) {
      if (val && typeof val.stars === "number" && val.stars > 0) {
        starsOnly[w] = val.stars;
      }
    }
    const hasRepeatScores = Object.keys(starsOnly).length > 0;
    if (step === "done") {
      saveLocalFamilyProgress(family.id, {
        status: "learned",
        lastStep: "done",
        repeatStars: starsOnly,
      });
    } else if (step !== "rime" || hasRepeatScores) {
      saveLocalFamilyProgress(family.id, {
        status: "in_progress",
        lastStep: step,
        repeatStars: starsOnly,
      });
    }
  }, [family.id, step, repeatScores]);

  // 验收探针
  useEffect(() => {
    (window as any).__familySampleProbe = {
      family: family.id,
      step,
      rimeBuilt: blendPlayed,
      rimeMisses: 0,
      tapped,
      wordsBuilt,
      listenTarget: step === "listen" ? listenOrder[listenIdx] : null,
      listenHits,
      listenMisses,
      repeatDone,
      repeatScores,
      repeatAttempts,
      reviewMisses,
      lastPhoneme,
      lastWordPlayed,
    };
  }, [
    step,
    blendPlayed,
    tapped,
    wordsBuilt,
    listenIdx,
    listenHits,
    listenMisses,
    repeatDone,
    repeatScores,
    repeatAttempts,
    reviewMisses,
    lastPhoneme,
    lastWordPlayed,
  ]);

  const tapTeachLetter = (letter: string) => {
    speakLetter(letter, setLastPhoneme);
    setTapped((prev) => (prev.includes(letter) ? prev : [...prev, letter]));
  };

  const tapBlend = () => {
    setSweepKey((k) => k + 1);
    window.setTimeout(() => {
      playRime(RIME, setLastWordPlayed);
      setBlendPlayed(true);
    }, 450);
  };

  const placeBuildRime = () => {
    const cur = WORDS[buildIdx];
    if (rimePlaced) return;
    setRimePlaced(true);
    setSweepKey((k) => k + 1);
    window.setTimeout(() => {
      playWord(cur.word, setLastWordPlayed);
      setBuildRevealed(true);
      setWordsBuilt((prev) =>
        prev.includes(cur.word) ? prev : [...prev, cur.word]
      );
    }, 500);
  };

  const placeReviewTile = (letter: string) => {
    const round = REVIEW_ROUNDS[reviewIdx];
    if (!reviewPlaced && letter === round.onset) {
      setReviewPlaced(true);
      // 声音规则与拼词步对齐：拖起/点选只发首音、落位只发整词音
      playWord(round.word, setLastWordPlayed);
      return;
    }
    setReviewMisses((m) => m + 1);
    doShake(`rev-${reviewIdx}-${letter}`);
  };

  const buildDrag = useDrag(
    (_key, _letter) => {
      playRime(RIME, setLastWordPlayed);
      placeBuildRime();
    },
    (_key, _letter, x, y) => {
      const hit = hitSlot(buildSlotRefs.current, x, y);
      if (hit === 0 && !rimePlaced) {
        placeBuildRime();
        return;
      }
      doShake("build-rime");
    }
  );

  const reviewDrag = useDrag(
    (_key, letter) => {
      speakLetter(letter, setLastPhoneme);
      placeReviewTile(letter);
    },
    (_key, letter, x, y) => {
      const hit = hitSlot(reviewSlotRefs.current, x, y);
      if (hit === 0) {
        placeReviewTile(letter);
        return;
      }
      setReviewMisses((m) => m + 1);
      doShake(`rev-${reviewIdx}-${letter}`);
    }
  );

  const handleListenPick = (word: string) => {
    const target = listenOrder[listenIdx];
    if (foundWords.includes(word)) return;
    if (word === target) {
      setFoundWords((prev) => [...prev, word]);
      setListenHits((h) => h + 1);
      window.setTimeout(() => {
        setCardOrder(shuffled(WORDS.map((w) => w.word)));
        setListenIdx((i) => i + 1);
      }, 650);
    } else {
      setListenMisses((m) => m + 1);
      doShake(`listen-${word}`);
    }
  };

  const toggleRecord = async (word: string) => {
    if (recState[word] === "recording") {
      if (recRef.current) recRef.current.stop();
      return;
    }
    const attempt = (repeatAttempts[word] || 0) + 1;
    setRepeatAttempts((prev) => ({ ...prev, [word]: attempt }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const url = URL.createObjectURL(
          new Blob(chunksRef.current, { type: "audio/webm" })
        );
        setRecUrls((prev) => ({ ...prev, [word]: url }));
        setRecState((prev) => ({ ...prev, [word]: "recorded" }));
        // 录音送后端识别打分（Azure STT）；识别失败/无结果时按原口径完成（只回放、不编分）
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        setScoringWord(word);
        recognizeWord(word, blob).then((sc) => {
          setScoringWord((w) => (w === word ? null : w));
          if (sc) {
            // 工单 E · E2-A 口径：词族 STT 结果入档（只记词级尝试，不记音素归属，不产生音素 attempts/errors，不污染 A0 证据星）
            submitPronunciationArchive({
              archiveContext: {
                source: "family",
                contextRef: `${family.id}#${word}`,
              },
              reference: word,
              scores: {
                accuracy: null,
                fluency: null,
                completeness: null,
                prosody: null,
                overall: null,
              },
              words: [
                {
                  word,
                  accuracy: null,
                  error_type: sc.stars === 3 ? "None" : "Mispronunciation",
                  phonemes: [],
                },
              ],
              raw: sc.raw || {},
            }).catch(() => {});

            setRepeatScores((prev) => {
              const old = prev[word];
              return old && old.stars >= sc.stars
                ? prev
                : { ...prev, [word]: sc };
            });
            if (sc.stars >= 2 || attempt >= 2) {
              setRepeatDone((prev) =>
                prev.includes(word) ? prev : [...prev, word]
              );
            }
          } else {
            setRepeatDone((prev) =>
              prev.includes(word) ? prev : [...prev, word]
            );
          }
        });
      };
      recRef.current = mr;
      mr.start();
      setRecState((prev) => ({ ...prev, [word]: "recording" }));
    } catch (e) {
      setMicError(true);
    }
  };

  const playRecording = (word: string) => {
    const url = recUrls[word];
    if (!url) return;
    try {
      new Audio(url).play().catch(() => {});
    } catch (e) {}
  };

  const resetAll = () => {
    setStep("rime");
    setTapped([]);
    setBlendPlayed(false);
    setBuildIdx(0);
    setRimePlaced(false);
    setBuildRevealed(false);
    setWordsBuilt([]);
    setListenIdx(0);
    setListenHits(0);
    setListenMisses(0);
    setFoundWords([]);
    setRecState({});
    setRecUrls({});
    setRepeatDone([]);
    setRepeatScores({});
    setScoringWord(null);
    setRepeatAttempts({});
    setListenOrder(shuffled(LISTEN_ORDER));
    setCardOrder(shuffled(WORDS.map((w) => w.word)));
    setMicError(false);
    setReviewIdx(0);
    setReviewPlaced(false);
    setReviewMisses(0);
    setLastPhoneme(null);
    setLastWordPlayed(null);
  };

  const blendBar = (
    <div className="mx-auto mt-5 w-full max-w-[430px]">
      <div className="h-[14px] rounded-full bg-[#EDF3F9] overflow-hidden">
        {sweepKey > 0 && (
          <div
            key={sweepKey}
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg,#F49AC1,#57B6E5)",
              animation: "blendsweep .9s ease forwards",
            }}
          />
        )}
      </div>
    </div>
  );

  const rimeCells = (
    <>
      {RIME_LETTERS.map((letter) => (
        <div key={letter} className={`${CELL_BASE} bg-[#E3F2FD] text-[#1565C0]`}>
          {letter}
        </div>
      ))}
    </>
  );

  const onsetCell = (letter: string | null, placed: boolean) =>
    placed && letter ? (
      <div className={`${CELL_BASE} bg-[#FDE7EF] text-[#B81D56]`}>{letter}</div>
    ) : (
      <div className="w-[72px] h-[72px] rounded-[20px] border-[3px] border-dashed border-[#D6336C]/40 bg-[#FFF5F9]" />
    );

  return (
    <div className="rounded-[20px] bg-[#F3FAF8] p-4 sm:p-6">
      <style>{`@keyframes dragshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@keyframes blendsweep{from{width:0}to{width:100%}}`}</style>

      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-sm font-black px-3.5 py-2 rounded-full bg-[#E3F2FD] text-[#1565C0]">
          {step === "done" ? "样板完成" : STEP_LABEL[step]}
        </span>
        <button
          onClick={onExit}
          className="min-h-[44px] text-sm font-black px-4 py-2 rounded-full bg-[#FDE7EF] text-[#B81D56] active:translate-y-0.5 cursor-pointer"
        >
          退出任务
        </button>
      </div>

      {step === "rime" && (
        <div>
          <div className="mt-3 flex flex-col items-center">
            <div className="flex items-center justify-center gap-3">
              {RIME_LETTERS.map((letter, i) => (
                <React.Fragment key={letter}>
                  {i > 0 && (
                    <span className="text-3xl font-black text-[#4E6B69]">+</span>
                  )}
                  <button
                    data-tile={letter}
                    onClick={() => tapTeachLetter(letter)}
                    className="w-[64px] h-[64px] rounded-[20px] shadow-[0_8px_18px_rgba(18,59,60,0.18)] flex items-center justify-center text-4xl font-black text-white select-none active:scale-95 transition-transform cursor-pointer"
                    style={{ background: TEACH_COLORS[letter] }}
                  >
                    {letter}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="my-2 text-[26px] leading-none font-light text-[#4E6B69] select-none">
              ↓
            </div>
            <button
              type="button"
              data-blend={RIME}
              onClick={tapBlend}
              aria-label={`合成韵脚 ${RIME}`}
              className="flex items-center justify-center rounded-[20px] bg-white border border-[#D3E4DE] px-8 py-4 cursor-pointer select-none shadow-[0_8px_20px_rgba(18,59,60,0.10)]"
            >
              <span
                className="text-[65px] leading-none font-black"
                style={{ color: TEACH_COLORS[RIME_LETTERS[0]] }}
              >
                {RIME_LETTERS[0]}
              </span>
              <span
                className="text-[65px] leading-none font-black"
                style={{ color: TEACH_COLORS[RIME_LETTERS[1]] }}
              >
                {RIME_LETTERS[1]}
              </span>
            </button>
          </div>
          {blendBar}
          <div className="mt-6 flex justify-center min-h-[52px]">
            {blendPlayed && (
              <button className={NEXT_BTN_CLS} onClick={() => setStep("build")}>
                下一步
              </button>
            )}
          </div>
        </div>
      )}

      {step === "build" && (
        <div>
          <p className="text-center text-sm font-black text-[#4E6B69]">
            拼词 {buildIdx + 1} / {WORDS.length}
          </p>
          {!buildRevealed ? (
            <div>
              <div className="mt-6 flex items-stretch justify-center gap-3">
                <button
                  type="button"
                  aria-label={`听首音 ${WORDS[buildIdx].onset}`}
                  className={`${CELL_BASE} bg-[#FDE7EF] text-[#B81D56] cursor-pointer`}
                  onClick={() =>
                    speakLetter(WORDS[buildIdx].onset, setLastPhoneme)
                  }
                >
                  {WORDS[buildIdx].onset}
                </button>
                <div
                  data-slot={0}
                  ref={(el) => {
                    buildSlotRefs.current[0] = el;
                  }}
                  className={`w-[152px] h-[72px] rounded-[20px] flex items-center justify-center text-4xl font-black select-none ${
                    rimePlaced
                      ? "bg-[#E3F2FD] text-[#1565C0]"
                      : "border-[3px] border-dashed border-[#0277BD]/40 bg-white text-transparent"
                  }`}
                >
                  {rimePlaced ? RIME : "·"}
                </div>
              </div>
              {blendBar}
              <div className="mt-8 flex items-center justify-center gap-4 min-h-[84px]">
                {!rimePlaced &&
                  (() => {
                    const key = "build-rime";
                    const b = buildDrag.bind(key, RIME, false);
                    return (
                      <button
                        type="button"
                        key={key}
                        data-tile={RIME}
                        aria-label={`点选或拖拽韵脚 ${RIME} 完成拼词`}
                        className="w-[152px] h-[76px] rounded-[20px] shadow-[0_8px_18px_rgba(18,59,60,0.18)] flex items-center justify-center text-4xl font-black text-white select-none touch-none cursor-grab active:cursor-grabbing"
                        onPointerDown={b.onPointerDown}
                        onPointerMove={b.onPointerMove}
                        onPointerUp={b.onPointerUp}
                        onPointerCancel={b.onPointerCancel}
                        onClick={(e) => {
                          if (e.detail === 0) {
                            playRime(RIME, setLastWordPlayed);
                            placeBuildRime();
                          }
                        }}
                        style={{
                          ...b.style,
                          background: "#0277BD",
                          animation:
                            shakeKey === key ? "dragshake .3s ease" : undefined,
                        }}
                      >
                        {RIME}
                      </button>
                    );
                  })()}
              </div>
              <div className="mt-6 min-h-[52px]" />
            </div>
          ) : (
            <div className="animate-in fade-in">
              <div className="mx-auto mt-4 w-full max-w-[560px] rounded-[20px] bg-white border border-[#D3E4DE] shadow-[0_8px_20px_rgba(18,59,60,0.08)] p-3">
                <img
                  src={`/assets/phonics/flashcards/flashcard-${WORDS[buildIdx].word}.webp`}
                  alt={WORDS[buildIdx].word}
                  className="h-[210px] w-full object-contain rounded-[8px]"
                  draggable={false}
                />
                <p className="mt-1 pb-1 text-center text-4xl font-black">
                  <span className="text-[#B81D56]">{WORDS[buildIdx].onset}</span>
                  <span className="text-[#1565C0]">{RIME}</span>
                </p>
              </div>
              <div className="mt-6 flex justify-center min-h-[52px]">
                {buildIdx < WORDS.length - 1 ? (
                  <button
                    className={NEXT_BTN_CLS}
                    onClick={() => {
                      setBuildIdx(buildIdx + 1);
                      setRimePlaced(false);
                      setBuildRevealed(false);
                    }}
                  >
                    下一个词
                  </button>
                ) : (
                  <button className={NEXT_BTN_CLS} onClick={() => setStep("listen")}>
                    下一步
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === "listen" && (
        <div>
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (listenIdx < listenOrder.length)
                  playWord(listenOrder[listenIdx], setLastWordPlayed);
              }}
              className="min-h-[44px] font-black px-7 py-3 rounded-full bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] shadow-sm active:translate-y-0.5 cursor-pointer"
            >
              听一听 {Math.min(listenIdx + 1, LISTEN_ORDER.length)} / {LISTEN_ORDER.length}
            </button>
          </div>
          <div className="mx-auto mt-5 grid grid-cols-2 gap-4 max-w-[560px]">
            {cardOrder.map((word) => {
              const found = foundWords.includes(word);
              return (
                <div
                  key={word}
                  data-word={word}
                  onClick={() => handleListenPick(word)}
                  className={`relative rounded-[20px] p-3 cursor-pointer select-none bg-white border transition-shadow ${
                    found
                      ? "border-[#0F7B7A] ring-2 ring-[#0F7B7A]/30 shadow-sm"
                      : "border-[#D3E4DE] shadow-[0_6px_16px_rgba(18,59,60,0.06)]"
                  }`}
                  style={{
                    animation:
                      shakeKey === `listen-${word}`
                        ? "dragshake .3s ease"
                        : undefined,
                  }}
                >
                  <img
                    src={`/assets/phonics/flashcards/flashcard-${word}.webp`}
                    alt={word}
                    className="h-[130px] w-full object-contain rounded-[8px] pointer-events-none"
                    draggable={false}
                  />
                  <p className="h-7 text-center text-xl font-black">
                    {found ? (
                      <>
                        <span className="text-[#B81D56]">{onsetOf(word)}</span>
                        <span className="text-[#1565C0]">{RIME}</span>
                      </>
                    ) : (
                      ""
                    )}
                  </p>
                  {found && (
                    <span className="absolute top-2 right-2 text-sm font-black px-2 py-0.5 rounded-full bg-[#DFF5E9] text-[#0A5E5D]">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center min-h-[52px]">
            {listenIdx >= LISTEN_ORDER.length && (
              <button className={NEXT_BTN_CLS} onClick={() => setStep("repeat")}>
                下一步
              </button>
            )}
          </div>
        </div>
      )}

      {step === "repeat" && (
        <div>
          <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[560px]">
            {REPEAT_WORDS.map((word) => {
              const state = recState[word] || "idle";
              const isDone = repeatDone.includes(word);
              return (
                <div
                  key={word}
                  className="rounded-[20px] bg-white border border-[#D3E4DE] shadow-[0_8px_20px_rgba(18,59,60,0.08)] p-3 flex flex-col items-center"
                >
                  <img
                    src={`/assets/phonics/flashcards/flashcard-${word}.webp`}
                    alt={word}
                    className="h-[120px] w-full object-contain rounded-[8px]"
                    draggable={false}
                  />
                  <p className="mt-1 text-2xl font-black">
                    <span className="text-[#B81D56]">{onsetOf(word)}</span>
                    <span className="text-[#1565C0]">{RIME}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => playWord(word, setLastWordPlayed)}
                      className="min-h-[44px] text-sm font-black px-4 py-2 rounded-full bg-[#E3F2FD] text-[#1565C0] active:translate-y-0.5 cursor-pointer"
                    >
                      听原声
                    </button>
                    <button
                      data-record={word}
                      onClick={() => toggleRecord(word)}
                      className={`min-h-[44px] text-sm font-black px-4 py-2 rounded-full text-white active:translate-y-0.5 cursor-pointer ${
                        state === "recording" ? "bg-[#C62828]" : "bg-[#C2185B]"
                      }`}
                    >
                      {state === "recording"
                        ? "停止录音"
                        : isDone
                        ? "再录一次"
                        : "按此录音"}
                    </button>
                    {recUrls[word] && (
                      <button
                        onClick={() => playRecording(word)}
                        className="min-h-[44px] text-sm font-black px-4 py-2 rounded-full bg-[#DFF5E9] text-[#0A5E5D] active:translate-y-0.5 cursor-pointer"
                      >
                        播放我的录音
                      </button>
                    )}
                  </div>
                  {isDone && (
                    <span className="mt-2 text-xs font-black px-2.5 py-1 rounded-full bg-[#DFF5E9] text-[#0A5E5D]">
                      ✓ 已跟读
                    </span>
                  )}
                  {scoringWord === word && (
                    <span className="mt-2 text-xs font-black text-[#4E6B69]">
                      正在听你读…
                    </span>
                  )}
                  {repeatScores[word] && (
                    <div className="mt-2 flex flex-col items-center gap-0.5">
                      <span className="text-base tracking-[2px]">
                        {"⭐".repeat(repeatScores[word].stars)}
                        <span className="opacity-25">
                          {"⭐".repeat(3 - repeatScores[word].stars)}
                        </span>
                      </span>
                      <span className="text-xs font-black text-[#96690A]">
                        {repeatScores[word].stars >= 3
                          ? "读对啦，太棒了！"
                          : repeatScores[word].stars === 2
                          ? "很接近啦，再试一次！"
                          : "录到啦，再听听原声试一次"}
                      </span>
                      <span className="text-[11px] font-bold text-[#4E6B69]">
                        我听到的是：{repeatScores[word].heard}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs font-bold text-[#4E6B69]">
            跟读小测：读对有星星（简单识别打分）；更细的发音评测后续接入
          </p>
          {micError && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => setRepeatDone([...REPEAT_WORDS])}
                className="min-h-[44px] text-sm font-black px-4 py-2 rounded-full bg-white border border-[#D3E4DE] text-[#123B3C] shadow-xs active:translate-y-0.5 cursor-pointer"
              >
                没有麦克风，先跳过跟读
              </button>
            </div>
          )}
          <div className="mt-5 flex justify-center min-h-[52px]">
            {repeatDone.length >= REPEAT_WORDS.length && (
              <button className={NEXT_BTN_CLS} onClick={() => setStep("review")}>
                下一步
              </button>
            )}
          </div>
        </div>
      )}

      {step === "review" && (
        <div>
          {(() => {
            const round = REVIEW_ROUNDS[reviewIdx];
            return (
              <div>
                <div className="mx-auto w-full max-w-[430px] h-[180px] rounded-[20px] p-3 bg-white border border-[#D3E4DE] shadow-[0_8px_20px_rgba(18,59,60,0.08)] overflow-hidden">
                  <img
                    src={`/assets/phonics/flashcards/flashcard-${round.word}.webp`}
                    alt={round.word}
                    className="h-full w-full object-contain rounded-[8px]"
                    draggable={false}
                  />
                </div>
                <div className="mt-5 flex items-stretch justify-center gap-3">
                  <div
                    data-slot={0}
                    ref={(el) => {
                      reviewSlotRefs.current[0] = el;
                    }}
                    className="rounded-[20px]"
                  >
                    {onsetCell(round.onset, reviewPlaced)}
                  </div>
                  {rimeCells}
                </div>
                <div className="mt-8 flex items-center justify-center gap-4 min-h-[84px]">
                  {!reviewPlaced &&
                    round.tiles.map((letter) => {
                      const key = `rev-${reviewIdx}-${letter}`;
                      const b = reviewDrag.bind(key, letter, false);
                      return (
                        <button
                          type="button"
                          key={key}
                          data-tile={letter}
                          aria-label={`选择首字母 ${letter}`}
                          className={TILE_BASE}
                          onPointerDown={b.onPointerDown}
                          onPointerMove={b.onPointerMove}
                          onPointerUp={b.onPointerUp}
                          onPointerCancel={b.onPointerCancel}
                          onClick={(e) => {
                            if (e.detail === 0) {
                              speakLetter(letter, setLastPhoneme);
                              placeReviewTile(letter);
                            }
                          }}
                          style={{
                            ...b.style,
                            background: ONSET_COLORS[letter],
                            animation:
                              shakeKey === key
                                ? "dragshake .3s ease"
                                : undefined,
                          }}
                        >
                          {letter}
                        </button>
                      );
                    })}
                </div>
                <div className="mt-6 flex justify-center min-h-[52px]">
                  {reviewPlaced &&
                    (reviewIdx < REVIEW_ROUNDS.length - 1 ? (
                      <button
                        className={NEXT_BTN_CLS}
                        onClick={() => {
                          setReviewIdx(reviewIdx + 1);
                          setReviewPlaced(false);
                        }}
                      >
                        下一个
                      </button>
                    ) : (
                      <button
                        className={NEXT_BTN_CLS}
                        onClick={() => setStep("done")}
                      >
                        完成
                      </button>
                    ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {step === "done" && (
        <div>
          <div className="flex flex-col gap-2.5 max-w-[560px] mx-auto">
            {[
              { label: `学韵脚 ${RIME}`, badge: "已学会" },
              {
                label: "换首音拼词",
                badge: `${wordsBuilt.length} / ${WORDS.length} 词`,
              },
              {
                label: "听辨点图",
                badge: listenMisses === 0 ? "全对" : `错 ${listenMisses} 次`,
              },
              {
                label: "跟读",
                badge: `${repeatDone.length} / ${REPEAT_WORDS.length} 词`,
              },
              {
                label: "复习填字",
                badge: reviewMisses === 0 ? "全对" : `错 ${reviewMisses} 次`,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-[14px] bg-white border border-[#D3E4DE] px-4 py-3"
              >
                <span className="font-black text-[#123B3C]">{row.label}</span>
                <span className="text-sm font-black px-3 py-1 rounded-full bg-[#DFF5E9] text-[#0A5E5D]">
                  {row.badge}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={resetAll}
              className="min-h-[44px] font-bold px-6 py-2.5 rounded-[12px] bg-[#F2A93B] text-[#123B3C] shadow-none hover:bg-[#D69128] cursor-pointer"
            >
              再来一遍
            </button>
            <button
              onClick={onExit}
              className="min-h-[44px] font-bold px-6 py-2.5 rounded-[12px] bg-white text-[#123B3C] border border-[#D3E4DE] shadow-none hover:bg-[#E7F2EF] cursor-pointer"
            >
              返回
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const FamilySampleSection: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const openFamily = FAMILIES.find((f) => f.id === openId) || null;
  const sectionRef = useRef<HTMLElement | null>(null);

  const [localProgressMap, setLocalProgressMap] = useState<Record<string, FamilyLocalProgressItem>>(() =>
    readLocalFamilyProgressMap()
  );
  const [backendFamilyStars, setBackendFamilyStars] = useState<Record<string, Record<string, number>>>({});
  const [backendFamilyWords, setBackendFamilyWords] = useState<Record<string, string[]>>({});

  // 每次返回词族卡片列表时刷新真实本地进度（无数据时保持空对象，绝不编造）
  useEffect(() => {
    if (!openFamily) {
      setLocalProgressMap(readLocalFamilyProgressMap());
    }
  }, [openFamily]);

  // 拉取已有的词族跟读档案（source = "family" | "word-family"），无数据或离线时静默维持空态
  useEffect(() => {
    let mounted = true;
    try {
      const uid = getPhonemeUserId();
      const apiBase = getApiBase();
      const headers = getPhonemeAuthHeaders(uid);
      fetch(
        `${apiBase}/api/v1/pronunciation/assessments?user_id=${encodeURIComponent(uid)}&limit=100`,
        { headers: { Accept: "application/json", ...headers } }
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!mounted || !data?.assessments || !Array.isArray(data.assessments)) return;
          const starsByFam: Record<string, Record<string, number>> = {};
          const wordsByFam: Record<string, Set<string>> = {};

          for (const item of data.assessments) {
            if (item?.source !== "family" && item?.source !== "word-family") continue;
            const ctx = String(item.context_ref || "");
            const [rawFamId, rawWord] = ctx.split("#");
            const famId = (rawFamId || "").trim().toLowerCase();
            if (!famId) continue;

            const wordText = (
              rawWord ||
              item.words?.[0]?.word ||
              item.ref_text ||
              ""
            )
              .trim()
              .toLowerCase();
            if (!wordsByFam[famId]) wordsByFam[famId] = new Set();
            if (wordText) wordsByFam[famId].add(wordText);

            const w = item.words?.[0];
            let stars: number | null = null;
            if (typeof w?.accuracy === "number") {
              stars = w.accuracy >= 80 ? 3 : w.accuracy >= 50 ? 2 : 1;
            } else if (typeof item.scores?.overall === "number") {
              stars = item.scores.overall >= 80 ? 3 : item.scores.overall >= 50 ? 2 : 1;
            } else if (w?.error_type === "None") {
              stars = 3;
            } else if (w?.error_type === "Mispronunciation") {
              stars = 2;
            }

            if (stars !== null && wordText) {
              if (!starsByFam[famId]) starsByFam[famId] = {};
              starsByFam[famId][wordText] = Math.max(starsByFam[famId][wordText] || 0, stars);
            }
          }

          const wordsOut: Record<string, string[]> = {};
          for (const [k, s] of Object.entries(wordsByFam)) {
            wordsOut[k] = Array.from(s);
          }
          setBackendFamilyStars(starsByFam);
          setBackendFamilyWords(wordsOut);
        })
        .catch(() => {});
    } catch {}
    return () => {
      mounted = false;
    };
  }, [openFamily]);

  const familyEvents = useMemo(() => {
    try {
      return getEvents({ skill: "family" });
    } catch {
      return [];
    }
  }, [openFamily]);

  const familyStatusMap = useMemo(() => {
    const out: Record<string, FamilyStatusSummary> = {};
    for (const fam of FAMILIES) {
      const local = localProgressMap[fam.id];
      const backWords = new Set(backendFamilyWords[fam.id] || []);
      const mergedStars: Record<string, number> = {
        ...(backendFamilyStars[fam.id] || {}),
        ...(local?.repeatStars || {}),
      };
      const starValues = Object.values(mergedStars).filter((n) => typeof n === "number" && n > 0);
      const avgStars =
        starValues.length > 0
          ? Math.round((starValues.reduce((a, b) => a + b, 0) / starValues.length) * 10) / 10
          : null;

      const allRepeatArchived =
        fam.repeatWords.length > 0 &&
        fam.repeatWords.every((rw) => backWords.has(rw.toLowerCase()));

      const hasEvent = familyEvents.some(
        (e) =>
          e.levelId === fam.id ||
          (e.word && fam.words.some((w) => w.word === e.word?.toLowerCase()))
      );

      let status: FamilyCardStatus = "unstarted";
      if (local?.status === "learned" || allRepeatArchived) {
        status = "learned";
      } else if (
        local?.status === "in_progress" ||
        backWords.size > 0 ||
        starValues.length > 0 ||
        hasEvent
      ) {
        status = "in_progress";
      }

      out[fam.id] = { status, avgStars };
    }
    return out;
  }, [localProgressMap, backendFamilyStars, backendFamilyWords, familyEvents]);

  const learnedCount = useMemo(
    () => FAMILIES.filter((f) => familyStatusMap[f.id]?.status === "learned").length,
    [familyStatusMap]
  );
  const inProgressCount = useMemo(
    () => FAMILIES.filter((f) => familyStatusMap[f.id]?.status === "in_progress").length,
    [familyStatusMap]
  );

  // 韵脚字母入场出现动画（Motion Prompt #001 Pop-in + #130 Wave text）
  useEffect(() => {
    if (openFamily || !sectionRef.current) return;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const letters = sectionRef.current.querySelectorAll<HTMLElement>("[data-family-letter]");
    if (letters.length > 0) {
      if (isReduced) {
        gsap.fromTo(letters, { opacity: 0.7 }, { opacity: 1, duration: 0.2, stagger: 0.005, ease: "none" });
      } else {
        gsap.fromTo(
          letters,
          { opacity: 0.35, y: 6, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.22,
            stagger: 0.006,
            ease: "power2.out",
          }
        );
      }
    }
  }, [openFamily]);

  // 整卡点按抬升/翻转反馈（Motion Prompt #081 Hover lift + #021 Flip + #153 3D tilt）
  const handleCardClick = (e: React.MouseEvent<HTMLElement>, famId: string) => {
    const card = e.currentTarget;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      gsap.fromTo(card, { opacity: 0.6 }, { opacity: 1, duration: 0.15, onComplete: () => setOpenId(famId) });
      return;
    }

    gsap.timeline({
      onComplete: () => {
        gsap.set(card, { clearProps: "all" });
        setOpenId(famId);
      },
    })
      .to(card, {
        scale: 1.05,
        y: -8,
        rotateY: 8,
        rotateX: -3,
        boxShadow: "0 12px 24px rgba(245,130,11,0.2)",
        duration: 0.16,
        ease: "power2.out",
      })
      .to(card, {
        scale: 1,
        y: -2,
        rotateY: 0,
        rotateX: 0,
        duration: 0.12,
        ease: "power1.inOut",
      });
  };

  return (
    <section ref={sectionRef} className="relative z-10 my-6 rounded-[20px] bg-white p-4 sm:p-5 border border-sand-border shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black text-[#123B3C]">
            词族乐园 · 21 族
          </h2>
          <span
            data-testid="families-progress-summary"
            className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E7F2EF] text-[#0A5E5D] border border-[#D3E4DE] font-mono tabular-nums"
          >
            已学 {learnedCount}/{FAMILIES.length}
            {inProgressCount > 0 ? ` · 进行中 ${inProgressCount}` : ""}
          </span>
        </div>

        {/* 统一状态图例（所有边框/状态徽标皆有清晰图例对应，无无图例标记） */}
        <div
          data-testid="families-status-legend"
          className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#4E6B69]"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#0F7B7A]" aria-hidden="true" />
            <span>已学</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#F2A93B]" aria-hidden="true" />
            <span>进行中</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#D3E4DE]" aria-hidden="true" />
            <span>未开始</span>
          </span>
        </div>
      </div>
      {!openFamily ? (
        <div className="flex flex-col gap-7">
          {["a", "i", "o", "e", "u"].map((vowel) => {
            const group = FAMILIES.filter((f) => f.rime.startsWith(vowel));
            if (!group.length) return null;
            return (
              <div key={vowel}>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4" style={{ perspective: 1000 }}>
                  {group.map((fam) => {
                    const st = familyStatusMap[fam.id] || { status: "unstarted", avgStars: null };
                    const cardCls =
                      st.status === "learned"
                        ? "border-[#0F7B7A] bg-[#E7F2EF]/35 [@media(hover:hover)]:hover:border-[#0A5E5D]"
                        : st.status === "in_progress"
                        ? "border-[#F2A93B] bg-[#F2A93B]/10 [@media(hover:hover)]:hover:border-[#D69128]"
                        : "border-[#D3E4DE] bg-white [@media(hover:hover)]:hover:bg-[#F3FAF8]";

                    return (
                      <button
                        type="button"
                        key={fam.id}
                        data-family-card={fam.id}
                        data-family-status={st.status}
                        data-enter={fam.id}
                        aria-label={`进入词族 -${fam.rime}，${
                          st.status === "learned"
                            ? st.avgStars !== null
                              ? `已学，平均 ${st.avgStars} 星`
                              : "已学"
                            : st.status === "in_progress"
                            ? "进行中"
                            : "未开始"
                        }`}
                        onClick={(e) => handleCardClick(e, fam.id)}
                        className={`rounded-[14px] border py-6 sm:py-7 px-3 shadow-none transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 select-none will-change-transform focus-visible:outline-2 focus-visible:outline-[#0F7B7A] focus-visible:outline-offset-2 ${cardCls}`}
                      >
                        <div className="flex items-baseline justify-center">
                          <span
                            data-family-letter
                            className="text-2xl sm:text-3xl font-black text-[#4E6B69] leading-none select-none inline-block"
                          >
                            -
                          </span>
                          <span
                            data-family-letter
                            className="text-2xl sm:text-3xl font-black text-[#C2185B] leading-none inline-block"
                          >
                            {fam.rime.slice(0, 1)}
                          </span>
                          <span
                            data-family-letter
                            className="text-2xl sm:text-3xl font-black text-[#0277BD] leading-none inline-block"
                          >
                            {fam.rime.slice(1)}
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {st.status === "learned" ? (
                            <>
                              <span className="px-2 py-0.5 rounded-full bg-[#0F7B7A] text-white text-[10px] font-black leading-tight">
                                已学
                              </span>
                              {st.avgStars !== null ? (
                                <span
                                  data-testid={`family-stars-${fam.id}`}
                                  className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold text-[#96690A] tabular-nums"
                                >
                                  <StarIcon className="size-3 fill-[#F2A93B] text-[#96690A]" aria-hidden="true" />
                                  <span>{st.avgStars}/3</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-[#0A5E5D]">
                                  5步完成
                                </span>
                              )}
                            </>
                          ) : st.status === "in_progress" ? (
                            <>
                              <span className="px-2 py-0.5 rounded-full bg-[#F2A93B]/20 text-[#96690A] border border-[#F2A93B]/40 text-[10px] font-black leading-tight">
                                进行中
                              </span>
                              {st.avgStars !== null && (
                                <span
                                  data-testid={`family-stars-${fam.id}`}
                                  className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold text-[#96690A] tabular-nums"
                                >
                                  <StarIcon className="size-3 fill-[#F2A93B] text-[#96690A]" aria-hidden="true" />
                                  <span>{st.avgStars}/3</span>
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#F3FAF8] text-[#4E6B69] border border-[#D3E4DE] text-[10px] font-semibold leading-tight">
                              未开始
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <FamilyGame
          key={openFamily.id}
          family={openFamily}
          onExit={() => setOpenId(null)}
        />
      )}
    </section>
  );
};
