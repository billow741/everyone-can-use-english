import { useEffect, useRef, useState } from "react";
import { gradeMeaning } from "@renderer/lib/vocab-srs";
import { getRushStats, recordRushGame } from "@renderer/lib/rush-stats";

/**
 * SRS 极速模式（P0 游戏快赢层，2026-11-02 规格 · 探险漫画风）
 * 读释义猜词 + 加时经济：60 秒开局、拼对 +4 秒、跳过 −3 秒、拼错不扣分。
 * 本局答对的词按 SRS「记得」记账（仅首轮，循环重遇不再重复记账）；
 * 跳过不记账。个人纪录只和自己比，存 rush-stats（本地按用户分桶）。
 */
type Phase = "ready" | "playing" | "done";
type Tile = { id: number; letter: string; used: boolean };

const INK = "#3A2A18";
const PAPER_TEX = {
  backgroundImage:
    "radial-gradient(rgba(160,110,40,.16) 1.5px, transparent 1.6px)",
  backgroundSize: "22px 22px",
} as const;

function cleanWord(m: MeaningType): string {
  return (m.word || "").toLowerCase().replace(/[^a-z]/g, "");
}
export function isRushPlayable(m: MeaningType): boolean {
  const w = cleanWord(m);
  return w.length >= 2 && w.length <= 10;
}
function meaningKey(m: MeaningType): string {
  return `id:${m.id}`;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildTiles(word: string): Tile[] {
  const letters = word.split("");
  const pool = "abcdefghijklmnopqrstuvwxyz";
  while (letters.length < word.length + 2) {
    letters.push(pool[Math.floor(Math.random() * 26)]);
  }
  return shuffle(letters).map((letter, i) => ({ id: i, letter, used: false }));
}

export default function VocabRush({
  queue,
  onExit,
}: {
  queue: MeaningType[];
  onExit: () => void;
}) {
  const playable = queue.filter(isRushPlayable);
  const [phase, setPhase] = useState<Phase>("ready");
  const [order, setOrder] = useState<number[]>(() =>
    shuffle(playable.map((_, i) => i))
  );
  const [qPos, setQPos] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [timeTenths, setTimeTenths] = useState(600);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [result, setResult] = useState<{
    score: number;
    correct: number;
    bestStreak: number;
    graded: number;
    isRecord: boolean;
  } | null>(null);

  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const correctRef = useRef(0);
  const gradedRef = useRef<Set<string>>(new Set());
  const finishedRef = useRef(false);

  const current: MeaningType | undefined =
    playable.length > 0 ? playable[order[qPos % order.length]] : undefined;
  const word = current ? cleanWord(current) : "";
  const seconds = Math.ceil(timeTenths / 10);
  const danger = timeTenths <= 100;

  // 每道新题重建字母牌
  useEffect(() => {
    if (phase !== "playing" || !current) return;
    setTiles(buildTiles(cleanWord(current)));
    setPickedIds([]);
    setCelebrate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPos, phase]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const rec = recordRushGame(scoreRef.current, bestStreakRef.current);
    setResult({
      score: scoreRef.current,
      correct: correctRef.current,
      bestStreak: bestStreakRef.current,
      graded: gradedRef.current.size,
      isRecord: rec.isRecord,
    });
    setPhase("done");
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // 计时器
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => {
      setTimeTenths((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setTimeout(() => finishRef.current(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  const startGame = () => {
    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    correctRef.current = 0;
    gradedRef.current = new Set();
    finishedRef.current = false;
    setScore(0);
    setStreak(0);
    setTimeTenths(600);
    setQPos(0);
    setOrder(shuffle(playable.map((_, i) => i)));
    setResult(null);
    setPhase("playing");
  };

  const advance = () => setQPos((p) => p + 1);

  const completeWord = () => {
    if (!current) return;
    const key = meaningKey(current);
    if (!gradedRef.current.has(key)) {
      gradedRef.current.add(key);
      try {
        gradeMeaning(current, "good");
      } catch {}
    }
    correctRef.current += 1;
    streakRef.current += 1;
    bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
    const bonus = streakRef.current % 5 === 0 ? 20 : 0;
    scoreRef.current += 10 + bonus;
    setScore(scoreRef.current);
    setStreak(streakRef.current);
    setTimeTenths((t) => Math.min(990, t + 40));
    if (streakRef.current >= 5 && streakRef.current % 5 === 0) {
      setMilestone(streakRef.current);
      setTimeout(() => setMilestone(null), 1300);
    }
    setCelebrate(true);
    setTimeout(advance, 520);
  };

  const pickTile = (tile: Tile) => {
    if (phase !== "playing" || celebrate || tile.used || !word) return;
    const needed = word[pickedIds.length];
    if (tile.letter === needed) {
      const nextPicked = [...pickedIds, tile.id];
      setTiles((ts) => ts.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));
      setPickedIds(nextPicked);
      if (nextPicked.length === word.length) completeWord();
    } else {
      setWrongId(tile.id);
      setTimeout(() => setWrongId(null), 300);
    }
  };

  // 桌面物理键盘
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!/^[a-z]$/.test(k)) return;
      const tile = tiles.find((t) => !t.used && t.letter === k);
      if (tile) pickTile(tile);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tiles, pickedIds, celebrate, word]);

  const skip = () => {
    if (phase !== "playing" || celebrate) return;
    streakRef.current = 0;
    setStreak(0);
    setTimeTenths((t) => Math.max(0, t - 30));
    advance();
  };

  const best = getRushStats();
  const promptText = current ? current.definition || current.translation || "" : "";

  return (
    <div
      className="rounded-3xl border-[3px] bg-[#F3E3C2] p-5 shadow-[5px_5px_0_#3A2A18] sm:p-6"
      style={{ borderColor: INK, ...PAPER_TEX }}
    >
      {/* ============ 开始页 ============ */}
      {phase === "ready" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full border-[3px] bg-[#FFB340] text-2xl shadow-[2.5px_2.5px_0_#3A2A18]" style={{ borderColor: INK }}>
              🦁
            </span>
            <div>
              <h3 className="text-xl font-black text-[#3A2A18]">极速模式</h3>
              <p className="text-xs font-bold text-[#8A6A34]">敢敢向导 · 陪你闯关</p>
            </div>
          </div>
          <div className="rounded-2xl border-[3px] bg-[#FFFDF6] p-4 shadow-[4px_4px_0_#3A2A18]" style={{ borderColor: INK }}>
            <ul className="space-y-1.5 text-sm font-bold text-[#3A2A18]">
              <li>⏳ 60 秒开局，读释义拼单词</li>
              <li>✅ 拼对一词，时间 +4 秒 · 得 10 分</li>
              <li>⏭ 跳过一题，时间 −3 秒 · 连对清零</li>
              <li>🎈 拼错不扣分，放心大胆点</li>
              <li>🔥 连对满 5 的倍数，额外 +20 分</li>
            </ul>
          </div>
          <div className="flex items-center justify-between rounded-2xl border-[3px] bg-[#FFF8EA] px-4 py-3 shadow-[3.5px_3.5px_0_#3A2A18]" style={{ borderColor: INK }}>
            <span className="text-xs font-black text-[#8A6A34]">个人最佳</span>
            <span className="text-sm font-black tabular-nums text-[#3A2A18]">
              {best.gamesPlayed > 0
                ? `得分 ${best.bestScore} · 最佳连对 ${best.bestStreak} · 已玩 ${best.gamesPlayed} 局`
                : "暂无纪录，来打第一局！"}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={startGame}
              className="flex-1 rounded-2xl border-[3px] bg-[#2E7D5B] py-3.5 text-base font-black tracking-widest text-white shadow-[4px_4px_0_#3A2A18] transition-transform hover:scale-[1.02]"
              style={{ borderColor: INK }}
            >
              开始挑战 →
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-2xl border-[3px] bg-[#FFF8EA] px-5 py-3.5 text-sm font-black text-[#3A2A18] shadow-[4px_4px_0_#3A2A18]"
              style={{ borderColor: INK }}
            >
              返回
            </button>
          </div>
        </div>
      )}

      {/* ============ 进行中 ============ */}
      {phase === "playing" && current && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black tracking-widest text-[#3A2A18]">⚡ 极速模式</span>
            <span className="rounded-full border-2 bg-[#FFF8EA] px-3 py-1 text-xs font-black text-[#3A2A18] shadow-[2.5px_2.5px_0_#3A2A18]" style={{ borderColor: INK }}>
              第 {qPos + 1} 题
            </span>
          </div>

          {/* 时间沙漏 */}
          <div className="rounded-2xl border-[3px] bg-[#FFF8EA] p-3.5 shadow-[4px_4px_0_#3A2A18]" style={{ borderColor: INK }}>
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-[#3A2A18]">⏳ 沙漏时间</span>
              <span className={`tabular-nums text-base ${danger ? "text-[#D63C2F]" : "text-[#3A2A18]"}`}>
                剩 {seconds} 秒
              </span>
            </div>
            <div className={`mt-2 h-4 overflow-hidden rounded-full border-2 bg-[#ECD9AE] ${danger ? "animate-pulse" : ""}`} style={{ borderColor: INK }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, (timeTenths / 600) * 100)}%`,
                  background:
                    "repeating-linear-gradient(45deg,#E4572E,#E4572E 10px,#F07F4F 10px,#F07F4F 20px)",
                }}
              />
            </div>
            {celebrate && (
              <span className="mt-2 inline-block -rotate-1 rounded-full border-2 bg-[#D9F2E2] px-2.5 py-0.5 text-xs font-black text-[#1E7D46]" style={{ borderColor: INK }}>
                🎉 答对啦，时间 +4 秒！
              </span>
            )}
            {milestone !== null && !celebrate && (
              <span className="mt-2 inline-block -rotate-1 rounded-full border-2 bg-[#FFE9BD] px-2.5 py-0.5 text-xs font-black text-[#3A2A18]" style={{ borderColor: INK }}>
                🦁 连对 {milestone}！手感火热 +20 分
              </span>
            )}
          </div>

          {/* 三格纪录 */}
          <div className="flex gap-2.5">
            {[
              { v: `🔥×${streak}`, k: "连对" },
              { v: String(score), k: "得分" },
              { v: String(Math.max(best.bestStreak, bestStreakRef.current)), k: "最佳连对" },
            ].map((s, i) => (
              <div
                key={s.k}
                className="flex-1 rounded-2xl border-[3px] bg-[#FFF8EA] px-2 py-2.5 text-center shadow-[3.5px_3.5px_0_#3A2A18]"
                style={{ borderColor: INK, transform: `rotate(${i === 1 ? -1 : i === 2 ? 1 : 0}deg)` }}
              >
                <div className="text-xl font-black tabular-nums text-[#3A2A18]">{s.v}</div>
                <div className="text-[10px] font-black text-[#8A6A34]">{s.k}</div>
              </div>
            ))}
          </div>

          {/* 释义卡 */}
          <div className="relative rounded-2xl border-[3px] bg-[#FFFDF6] p-5 shadow-[5px_5px_0_#3A2A18]" style={{ borderColor: INK }}>
            <div className="pointer-events-none absolute inset-1.5 rounded-xl border-2 border-dashed border-[#3A2A18]/25" />
            <span className="relative inline-block -rotate-1 rounded-lg border-2 bg-[#2E7D5B] px-2.5 py-1 text-[11px] font-black tracking-widest text-white" style={{ borderColor: INK }}>
              📜 读释义 · 猜单词
            </span>
            <p className="relative mt-3 text-2xl font-black leading-snug text-[#3A2A18]">{promptText}</p>
            <p className="relative mt-2 text-xs font-bold text-[#8A6A34]">
              {current.pos ? `${current.pos} · ` : ""}首字母是 {word.charAt(0).toUpperCase()} · 一共 {word.length} 个字母
            </p>
            <div className="relative mt-4 flex flex-wrap gap-2">
              {word.split("").map((ch, i) => {
                const filled = i < pickedIds.length;
                const isCurrent = i === pickedIds.length;
                return (
                  <span
                    key={i}
                    className={`flex size-12 items-center justify-center rounded-xl border-[3px] text-2xl font-black shadow-[3px_3px_0_#3A2A18] ${
                      celebrate || filled
                        ? "bg-[#2E7D5B] text-white"
                        : isCurrent
                          ? "border-dashed bg-white text-[#CBB27F]"
                          : "bg-[#F7ECD2] text-[#CBB27F]"
                    }`}
                    style={{ borderColor: INK }}
                  >
                    {filled || celebrate ? word[i].toUpperCase() : ""}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 字母牌 */}
          <div>
            <p className="mb-2 text-[11px] font-black tracking-widest text-[#8A6A34]">点字母牌，把它拼完</p>
            <div className="flex flex-wrap gap-2">
              {tiles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={t.used}
                  onClick={() => pickTile(t)}
                  className={`size-12 rounded-xl border-[3px] text-xl font-black transition-all ${
                    t.used
                      ? "bg-[#E8DCC0] opacity-35 shadow-none"
                      : wrongId === t.id
                        ? "bg-[#FBE3DF] text-[#D63C2F] shadow-[3px_3px_0_#3A2A18]"
                        : "bg-[#FFF8EA] text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] hover:scale-105"
                  }`}
                  style={{ borderColor: INK }}
                >
                  {t.letter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={skip}
            className="w-full rounded-2xl border-[3px] bg-[#3A2A18] py-3 text-sm font-black tracking-widest text-[#FFE9BD] shadow-[4px_4px_0_rgba(58,42,24,.35)]"
            style={{ borderColor: INK }}
          >
            跳过这题 →
          </button>
          <p className="text-center text-[11px] font-bold text-[#8A6A34]">答对加时间 · 连对有火焰奖励 · 错了不扣分</p>
        </div>
      )}

      {/* ============ 结算页 ============ */}
      {phase === "done" && result && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="text-5xl">🏆</div>
            <h3 className="mt-2 text-2xl font-black text-[#3A2A18]">极速模式 · 本局结算</h3>
            {result.isRecord && (
              <span className="mt-2.5 inline-block -rotate-2 rounded-full border-2 bg-[#D63C2F] px-3.5 py-1 text-sm font-black text-white shadow-[3px_3px_0_#3A2A18]" style={{ borderColor: INK }}>
                ★ 新纪录！
              </span>
            )}
          </div>
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border-[3px] bg-[#FFFDF6] p-3.5 shadow-[4px_4px_0_#3A2A18]" style={{ borderColor: INK }}>
            <span className="flex size-11 flex-none items-center justify-center rounded-full border-[3px] bg-[#FFB340] text-2xl" style={{ borderColor: INK }}>
              🦁
            </span>
            <p className="text-sm font-black leading-relaxed text-[#3A2A18]">
              {result.correct >= 12
                ? "这速度太稳了，可以去闯小游戏馆啦！"
                : result.correct >= 7
                  ? "手感火热！明天到期词见，继续冲纪录！"
                  : result.correct >= 3
                    ? "不错的开始，纪录就是用来破的！"
                    : "第一局完成！熟悉节奏后会越来越快。"}
              <span className="block text-[11px] font-bold text-[#8A6A34]">敢敢向导 · 本局陪练</span>
            </p>
          </div>
          <div className="flex gap-2.5">
            {[
              { v: String(result.score), k: "得分" },
              { v: String(result.correct), k: "答对题数" },
              { v: `🔥${result.bestStreak}`, k: "最佳连对" },
            ].map((s) => (
              <div key={s.k} className="flex-1 rounded-2xl border-[3px] bg-[#FFF8EA] px-2 py-3 text-center shadow-[3.5px_3.5px_0_#3A2A18]" style={{ borderColor: INK }}>
                <div className="text-2xl font-black tabular-nums text-[#3A2A18]">{s.v}</div>
                <div className="text-[10px] font-black text-[#8A6A34]">{s.k}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs font-bold text-[#8A6A34]">
            答对的 {result.graded} 个词已按「记得」记入复习计划 · 纪录只和自己比
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={startGame}
              className="w-full rounded-2xl border-[3px] bg-[#2E7D5B] py-3.5 text-base font-black tracking-widest text-white shadow-[4px_4px_0_#3A2A18]"
              style={{ borderColor: INK }}
            >
              再来一局 →
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full rounded-2xl border-[3px] bg-[#FFF8EA] py-3 text-sm font-black tracking-widest text-[#3A2A18] shadow-[4px_4px_0_#3A2A18]"
              style={{ borderColor: INK }}
            >
              返回生词库
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
