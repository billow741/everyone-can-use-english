import React, { useEffect, useRef, useState } from "react";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";

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

const FAMILIES: FamilyConfig[] = [
  AM_FAMILY,
  AT_FAMILY,
  AN_FAMILY,
  AP_FAMILY,
  AD_FAMILY,
  AG_FAMILY,
];
// 字母 → 音素库 ID：音素库按 IPA 索引，字母 j 的拼读音是 /dʒ/、字母 y 是 /j/；
// 直传字母会让 y 无声、j 串成 y 的音（2026-11-05 Roger 试玩抓到）
const PHONEME_ID: Record<string, string> = {
  a: "ae",
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
};
const ONSET_COLORS: Record<string, string> = {
  r: "#F06292",
  j: "#26C6DA",
  y: "#FFA000",
  d: "#7E57C2",
  c: "#EF5350",
  h: "#5C6BC0",
  b: "#26A69A",
  m: "#FF7043",
  f: "#43A047",
  v: "#D81B60",
  p: "#3949AB",
  n: "#6D4C41",
  s: "#00ACC1",
  g: "#FDD835",
  w: "#8D6E63",
  t: "#546E7A",
};
const TEACH_COLORS: Record<string, string> = {
  a: "#F06292",
  m: "#29B6F6",
  t: "#29B6F6",
  n: "#29B6F6",
  p: "#29B6F6",
  d: "#29B6F6",
  g: "#29B6F6",
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
  "w-[76px] h-[76px] rounded-[22px] shadow-[0_8px_18px_rgba(31,64,120,0.22)] flex items-center justify-center text-4xl font-black text-white select-none touch-none cursor-grab active:cursor-grabbing";
const CELL_BASE =
  "w-[72px] h-[72px] rounded-[20px] flex items-center justify-center text-4xl font-black select-none";
const NEXT_BTN_CLS =
  "font-black text-lg px-9 py-3 rounded-full bg-[#29B6F6] hover:bg-[#039BE5] text-white shadow-[0_10px_22px_rgba(41,182,246,0.40)] active:translate-y-0.5 animate-in fade-in";

export interface FamilyGameProps {
  family: FamilyConfig;
  onExit: () => void;
}

export const FamilyGame: React.FC<FamilyGameProps> = ({ family, onExit }) => {
  const RIME = family.rime;
  const RIME_LETTERS = family.rimeLetters;
  const WORDS = family.words;
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
  const [listenOrder] = useState<string[]>(() => shuffled(LISTEN_ORDER));
  const [cardOrder, setCardOrder] = useState<string[]>(() =>
    shuffled(WORDS.map((w) => w.word))
  );

  // 跟读
  const [recState, setRecState] = useState<Record<string, string>>({});
  const [recUrls, setRecUrls] = useState<Record<string, string>>({});
  const [repeatDone, setRepeatDone] = useState<string[]>([]);
  const [micError, setMicError] = useState(false);
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
    const t = window.setTimeout(
      () => playWord(listenOrder[listenIdx], setLastWordPlayed),
      500
    );
    return () => window.clearTimeout(t);
  }, [step, listenIdx]);

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

  const buildDrag = useDrag(
    (_key, _letter) => playRime(RIME, setLastWordPlayed),
    (_key, _letter, x, y) => {
      const hit = hitSlot(buildSlotRefs.current, x, y);
      const cur = WORDS[buildIdx];
      if (hit === 0 && !rimePlaced) {
        setRimePlaced(true);
        setSweepKey((k) => k + 1);
        window.setTimeout(() => {
          playWord(cur.word, setLastWordPlayed);
          setBuildRevealed(true);
          setWordsBuilt((prev) =>
            prev.includes(cur.word) ? prev : [...prev, cur.word]
          );
        }, 500);
        return;
      }
      doShake("build-rime");
    }
  );

  const reviewDrag = useDrag(
    (_key, letter) => speakLetter(letter, setLastPhoneme),
    (_key, letter, x, y) => {
      const hit = hitSlot(reviewSlotRefs.current, x, y);
      const round = REVIEW_ROUNDS[reviewIdx];
      if (hit === 0 && !reviewPlaced && letter === round.onset) {
        setReviewPlaced(true);
        speakLetter(letter, setLastPhoneme);
        playWord(round.word, setLastWordPlayed);
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
        setRepeatDone((prev) =>
          prev.includes(word) ? prev : [...prev, word]
        );
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
        <div key={letter} className={`${CELL_BASE} bg-[#E3F2FD] text-[#1976D2]`}>
          {letter}
        </div>
      ))}
    </>
  );

  const onsetCell = (letter: string | null, placed: boolean) =>
    placed && letter ? (
      <div className={`${CELL_BASE} bg-[#FDE7EF] text-[#D6336C]`}>{letter}</div>
    ) : (
      <div className="w-[72px] h-[72px] rounded-[20px] border-[3px] border-dashed border-[#F3B8CD] bg-[#FFF5F9]" />
    );

  return (
    <div className="rounded-[24px] bg-[#F8FBFF] p-4 sm:p-6">
      <style>{`@keyframes dragshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}@keyframes blendsweep{from{width:0}to{width:100%}}`}</style>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-black px-3.5 py-1.5 rounded-full bg-[#E3F2FD] text-[#1976D2]">
          {step === "done" ? "样板完成" : STEP_LABEL[step]}
        </span>
        <button
          onClick={onExit}
          className="text-sm font-black px-3.5 py-1.5 rounded-full bg-[#FDE7EF] text-[#D6336C] active:translate-y-0.5"
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
                    <span className="text-3xl font-black text-slate-300">+</span>
                  )}
                  <button
                    data-tile={letter}
                    onClick={() => tapTeachLetter(letter)}
                    className="w-[64px] h-[64px] rounded-[20px] shadow-[0_8px_18px_rgba(31,64,120,0.20)] flex items-center justify-center text-4xl font-black text-white select-none active:scale-95 transition-transform"
                    style={{ background: TEACH_COLORS[letter] }}
                  >
                    {letter}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="my-2 text-[26px] leading-none font-light text-slate-300 select-none">
              ↓
            </div>
            <div
              data-blend={RIME}
              onClick={tapBlend}
              className="flex items-center justify-center rounded-[26px] bg-white px-8 py-4 cursor-pointer select-none shadow-[0_12px_26px_rgba(31,64,120,0.16)]"
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
            </div>
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
          <p className="text-center text-sm font-black text-slate-400">
            拼词 {buildIdx + 1} / {WORDS.length}
          </p>
          {!buildRevealed ? (
            <div>
              <div className="mt-6 flex items-stretch justify-center gap-3">
                <div
                  className={`${CELL_BASE} bg-[#FDE7EF] text-[#D6336C] cursor-pointer`}
                  onClick={() =>
                    speakLetter(WORDS[buildIdx].onset, setLastPhoneme)
                  }
                >
                  {WORDS[buildIdx].onset}
                </div>
                <div
                  data-slot={0}
                  ref={(el) => {
                    buildSlotRefs.current[0] = el;
                  }}
                  className={`w-[152px] h-[72px] rounded-[20px] flex items-center justify-center text-4xl font-black select-none ${
                    rimePlaced
                      ? "bg-[#E3F2FD] text-[#1976D2]"
                      : "border-[3px] border-dashed border-[#A8CBEA] bg-[#F2F9FF] text-transparent"
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
                      <div
                        key={key}
                        data-tile={RIME}
                        className="w-[152px] h-[76px] rounded-[22px] shadow-[0_8px_18px_rgba(31,64,120,0.22)] flex items-center justify-center text-4xl font-black text-white select-none touch-none cursor-grab active:cursor-grabbing"
                        onPointerDown={b.onPointerDown}
                        onPointerMove={b.onPointerMove}
                        onPointerUp={b.onPointerUp}
                        onPointerCancel={b.onPointerCancel}
                        style={{
                          ...b.style,
                          background: "#29B6F6",
                          animation:
                            shakeKey === key ? "dragshake .3s ease" : undefined,
                        }}
                      >
                        {RIME}
                      </div>
                    );
                  })()}
              </div>
              <div className="mt-6 min-h-[52px]" />
            </div>
          ) : (
            <div className="animate-in fade-in">
              <div className="mx-auto mt-4 w-full max-w-[560px] rounded-[24px] bg-white shadow-[0_10px_26px_rgba(31,64,120,0.10)] px-4 pt-4 pb-2">
                <img
                  src={`/assets/phonics/flashcards/flashcard-${WORDS[buildIdx].word}.webp`}
                  alt={WORDS[buildIdx].word}
                  className="h-[210px] w-full object-contain"
                  draggable={false}
                />
                <p className="mt-1 pb-2 text-center text-4xl font-black">
                  <span className="text-[#D6336C]">{WORDS[buildIdx].onset}</span>
                  <span className="text-[#1976D2]">{RIME}</span>
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
              onClick={() =>
                playWord(listenOrder[listenIdx], setLastWordPlayed)
              }
              className="font-black px-7 py-3 rounded-full bg-[#FFB340] text-[#5D4037] shadow-[0_10px_22px_rgba(255,179,64,0.40)] active:translate-y-0.5"
            >
              听一听 {listenIdx + 1} / {LISTEN_ORDER.length}
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
                  className={`relative rounded-[24px] p-2 cursor-pointer select-none bg-white transition-shadow ${
                    found
                      ? "shadow-[0_10px_26px_rgba(46,160,110,0.30)] ring-4 ring-[#6EE7B7]"
                      : "shadow-[0_8px_20px_rgba(31,64,120,0.10)]"
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
                    className="h-[130px] w-full object-contain pointer-events-none"
                    draggable={false}
                  />
                  <p className="h-7 text-center text-xl font-black">
                    {found ? (
                      <>
                        <span className="text-[#D6336C]">{word[0]}</span>
                        <span className="text-[#1976D2]">{RIME}</span>
                      </>
                    ) : (
                      ""
                    )}
                  </p>
                  {found && (
                    <span className="absolute top-2 right-2 text-sm font-black px-2 py-0.5 rounded-full bg-[#DFF5E9] text-[#1E9E6A]">
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
                  className="rounded-[24px] bg-white shadow-[0_10px_26px_rgba(31,64,120,0.10)] p-3 flex flex-col items-center"
                >
                  <img
                    src={`/assets/phonics/flashcards/flashcard-${word}.webp`}
                    alt={word}
                    className="h-[120px] w-full object-contain"
                    draggable={false}
                  />
                  <p className="mt-1 text-2xl font-black">
                    <span className="text-[#D6336C]">{word[0]}</span>
                    <span className="text-[#1976D2]">{RIME}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => playWord(word, setLastWordPlayed)}
                      className="text-sm font-black px-4 py-2 rounded-full bg-[#E3F2FD] text-[#1976D2] active:translate-y-0.5"
                    >
                      听原声
                    </button>
                    <button
                      data-record={word}
                      onClick={() => toggleRecord(word)}
                      className={`text-sm font-black px-4 py-2 rounded-full text-white active:translate-y-0.5 ${
                        state === "recording" ? "bg-[#E53935]" : "bg-[#F06292]"
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
                        className="text-sm font-black px-4 py-2 rounded-full bg-[#DFF5E9] text-[#1E9E6A] active:translate-y-0.5"
                      >
                        播放我的录音
                      </button>
                    )}
                  </div>
                  {isDone && (
                    <span className="mt-2 text-xs font-black px-2.5 py-1 rounded-full bg-[#DFF5E9] text-[#1E9E6A]">
                      ✓ 已跟读
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs font-bold text-slate-400">
            样板版跟读先做录音回放，真评测打分后续接入
          </p>
          {micError && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => setRepeatDone([...REPEAT_WORDS])}
                className="text-sm font-black px-4 py-2 rounded-full bg-white shadow active:translate-y-0.5"
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
                <div className="mx-auto w-full max-w-[430px] h-[170px] rounded-[24px] bg-white shadow-[0_10px_26px_rgba(31,64,120,0.10)] overflow-hidden">
                  <img
                    src={`/assets/phonics/flashcards/flashcard-${round.word}.webp`}
                    alt={round.word}
                    className="h-full w-full object-contain"
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
                        <div
                          key={key}
                          data-tile={letter}
                          className={TILE_BASE}
                          onPointerDown={b.onPointerDown}
                          onPointerMove={b.onPointerMove}
                          onPointerUp={b.onPointerUp}
                          onPointerCancel={b.onPointerCancel}
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
                        </div>
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
                className="flex items-center justify-between rounded-[20px] bg-white shadow-[0_6px_18px_rgba(31,64,120,0.08)] px-4 py-3"
              >
                <span className="font-black text-slate-700">{row.label}</span>
                <span className="text-sm font-black px-3 py-1 rounded-full bg-[#DFF5E9] text-[#1E9E6A]">
                  {row.badge}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={resetAll}
              className="font-black px-6 py-3 rounded-full bg-[#FFB340] text-[#5D4037] shadow-[0_10px_22px_rgba(255,179,64,0.40)] active:translate-y-0.5"
            >
              再来一遍
            </button>
            <button
              onClick={onExit}
              className="font-black px-6 py-3 rounded-full bg-[#29B6F6] text-white shadow-[0_10px_22px_rgba(41,182,246,0.40)] active:translate-y-0.5"
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
  return (
    <section className="relative z-10 my-6 rounded-[28px] bg-white p-4 sm:p-5 shadow-[0_14px_36px_rgba(31,64,120,0.12)]">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs font-black px-3 py-1 rounded-full bg-[#29B6F6] text-white">
          全新上线
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-[#16324F]">
          词族乐园
        </h3>
      </div>
      {!openFamily ? (
        <div className="flex flex-col gap-4">
          {FAMILIES.map((fam) => (
            <div
              key={fam.id}
              data-family-card={fam.id}
              className="rounded-[24px] bg-[#F8FBFF] p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex gap-2">
                {fam.words.map(({ word }) => (
                  <img
                    key={word}
                    src={`/assets/phonics/flashcards/flashcard-${word}.webp`}
                    alt={word}
                    className="w-[64px] h-[64px] rounded-2xl object-cover bg-white shadow"
                    draggable={false}
                  />
                ))}
              </div>
              <div className="flex-1">
                <p className="font-black text-[#16324F]">
                  -{fam.rime} 一家
                  <span className="ml-2 text-[11px] font-black px-2.5 py-1 rounded-full bg-[#DFF5E9] text-[#1E9E6A] align-middle">
                    {fam.badge}
                  </span>
                </p>
                <p className="font-black text-[#16324F] mt-0.5">
                  {fam.words.map((w) => w.word).join(" · ")}
                </p>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  {fam.blurb}
                </p>
              </div>
              <button
                data-enter={fam.id}
                onClick={() => setOpenId(fam.id)}
                className="font-black px-7 py-3 rounded-full bg-[#29B6F6] hover:bg-[#039BE5] text-white shadow-[0_10px_22px_rgba(41,182,246,0.40)] active:translate-y-0.5 whitespace-nowrap"
              >
                开始学习
              </button>
            </div>
          ))}
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
