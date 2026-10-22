import React, { useState, useRef, useEffect, useMemo } from "react";
import { SparklesIcon, HeartIcon, Volume2Icon, RefreshCwIcon } from "lucide-react";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { moonAudioEngine } from "./moon-audio-engine";
import { GanganInteractiveMascot } from "../game/gangan-interactive-mascot";

interface JellyRainFeedingProps {
  onSuccess: () => void;
}

interface JellyBlock {
  id: string;
  letter: string;
  sound: string;
  color: string;
  isTarget: boolean;
}

const DISTRACTOR_POOL = [
  { letter: "s", sound: "s", color: "from-pink-400 via-rose-400 to-pink-500" },
  { letter: "t", sound: "t", color: "from-sky-400 via-cyan-400 to-teal-500" },
  { letter: "p", sound: "p", color: "from-emerald-400 via-teal-400 to-green-500" },
  { letter: "b", sound: "b", color: "from-purple-400 via-indigo-400 to-violet-500" },
  { letter: "f", sound: "f", color: "from-blue-400 via-cyan-400 to-sky-500" },
  { letter: "d", sound: "d", color: "from-red-400 via-rose-400 to-pink-600" },
];

function generateShuffledJellies(roundIndex: number): JellyBlock[] {
  // 选取 2 个随机混淆音素
  const shuffledPool = [...DISTRACTOR_POOL].sort(() => Math.random() - 0.5);
  const distractors = shuffledPool.slice(0, 2);

  const target: JellyBlock = {
    id: `m-${roundIndex}-${Date.now()}`,
    letter: "m",
    sound: "m",
    color: "from-amber-400 via-yellow-400 to-orange-500",
    isTarget: true,
  };

  const distBlocks: JellyBlock[] = distractors.map((d, idx) => ({
    id: `${d.letter}-${roundIndex}-${idx}-${Date.now()}`,
    letter: d.letter,
    sound: d.sound,
    color: d.color,
    isTarget: false,
  }));

  // 完全随机打乱位置（确保 m 不会总在同一个位置）
  return [target, ...distBlocks].sort(() => Math.random() - 0.5);
}

export const JellyRainFeeding: React.FC<JellyRainFeedingProps> = ({ onSuccess }) => {
  const [fedCount, setFedCount] = useState(0);
  const [roundKey, setRoundKey] = useState(0);
  const [jellies, setJellies] = useState<JellyBlock[]>(() => generateShuffledJellies(0));

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [moonState, setMoonState] = useState<"normal" | "eating" | "sneeze">("normal");
  const [ganganSpeech, setGanganSpeech] = useState<string>("月亮肚子饿啦，快抓起会发 /m/ 的果冻喂它！");
  const [dizzyId, setDizzyId] = useState<string | null>(null);

  const moonRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  useEffect(() => {
    speakGanganPrompt("月亮小宝贝肚子饿啦，天上掉下了果冻糖！抓起它们听听看，把发 /m/ 的果冻喂给月亮吧！");
  }, []);

  // 1. 抓起果冻块：立即自唱其音 (PointerDown)
  const handlePointerDown = (e: React.PointerEvent, jelly: JellyBlock) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveDragId(jelly.id);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY };
    setDragPos({ x: 0, y: 0 });

    // 抓起瞬间唱出自己的发音
    playPhonemeSound(jelly.sound);
  };

  // 2. 拖拽过程中跟随手指
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragId) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setDragPos({ x: dx, y: dy });
  };

  // 3. 放手检测碰撞 (PointerUp)
  const handlePointerUp = (e: React.PointerEvent, jelly: JellyBlock) => {
    if (!activeDragId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const clientX = e.clientX;
    const clientY = e.clientY;
    setActiveDragId(null);
    setDragPos({ x: 0, y: 0 });

    // 检测放手坐标是否在月亮目标区域内
    if (moonRef.current) {
      const rect = moonRef.current.getBoundingClientRect();
      const inMoonZone =
        clientX >= rect.left - 40 &&
        clientX <= rect.right + 40 &&
        clientY >= rect.top - 40 &&
        clientY <= rect.bottom + 40;

      if (inMoonZone) {
        if (jelly.isTarget) {
          // 🎯 喂对 m：月亮咀嚼、爆星星、计次，并刷新下一波随机果冻
          handleEatSuccess();
        } else {
          // ❌ 喂错（如 s 或 t）：月亮打喷嚏喜剧弹开
          handleSneezeMistake(jelly.id, jelly.sound);
        }
      }
    }
  };

  const handleEatSuccess = () => {
    phonicsAudioFx.playMunch();
    setMoonState("eating");
    setGanganSpeech("啊呜！太香啦！月亮吃得真开心！💖");

    const nextCount = fedCount + 1;
    setFedCount(nextCount);

    setTimeout(() => {
      if (nextCount >= 3) {
        // 喂满 3 块 m 果冻：月亮打饱嗝，通往催眠阶段
        moonAudioEngine.playMoonBurp();
        phonicsAudioFx.playSuccessChime();
        setGanganSpeech("饱啦！月亮打了满意的饱嗝，准备听催眠曲啦！⭐");
        setTimeout(onSuccess, 1200);
      } else {
        setMoonState("normal");
        setGanganSpeech(`还要吃 ${3 - nextCount} 颗 /m/ 果冻哦！位置随机变啦，仔细听哦！`);
        // 重新随机刷新位置与混淆项
        setRoundKey((k) => k + 1);
        setJellies(generateShuffledJellies(nextCount));
      }
    }, 800);
  };

  const handleSneezeMistake = (jellyId: string, wrongSound: string) => {
    moonAudioEngine.playSneeze();
    setMoonState("sneeze");
    setDizzyId(jellyId);
    setGanganSpeech(`阿嚏~！月亮说这个是 /${wrongSound}/，好酸呀！`);

    setTimeout(() => {
      setMoonState("normal");
      setDizzyId(null);
    }, 1200);
  };

  return (
    <div className="relative w-full h-[470px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#0b1026] via-[#161b40] to-[#1e1333] p-4 text-white">
      {/* 背景闪烁星光与星云 */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <span className="absolute top-6 left-10 text-xs animate-pulse">✨</span>
        <span className="absolute top-14 right-14 text-sm animate-ping">⭐</span>
        <span className="absolute top-32 left-1/4 text-xs animate-pulse">🌟</span>
        <span className="absolute top-20 right-1/3 text-xs animate-pulse">✨</span>
      </div>

      {/* 顶部：玩法标题与饱食进度条 */}
      <div className="w-full flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌧️</span>
          <div>
            <h3 className="text-sm font-black text-amber-300">
              玩法一：字母果冻雨
            </h3>
            <p className="text-[10px] text-slate-300">
              果冻位置已随机！抓起果冻听声音，把 <strong>/m/</strong> 拖进月亮嘴里！
            </p>
          </div>
        </div>

        {/* 饱食度爱心进度 */}
        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-amber-400/40">
          <HeartIcon className="size-3.5 fill-rose-500 text-rose-500" />
          <span className="text-xs font-mono font-black text-amber-300">
            {fedCount} / 3 颗
          </span>
        </div>
      </div>

      {/* 敢敢上方提示气泡 */}
      <div className="z-10 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-black shadow-md backdrop-blur-sm animate-bounce">
        🦁 敢敢：" {ganganSpeech} "
      </div>

      {/* 中部核心舞台：3D 瞌睡月亮与敢敢动图 */}
      <div className="relative flex items-center justify-center my-auto w-full z-10">
        {/* 月亮接收投喂光圈 (Drop Target Zone) */}
        <div
          ref={moonRef}
          className={`relative size-40 sm:size-44 rounded-full flex items-center justify-center transition-all duration-300 ${
            activeDragId
              ? "ring-8 ring-amber-400/50 scale-105"
              : "ring-2 ring-white/20"
          } ${
            moonState === "sneeze"
              ? "scale-x-125 scale-y-75 -rotate-12 transition-transform duration-100"
              : moonState === "eating"
              ? "scale-110 animate-bounce"
              : "hover:scale-102"
          }`}
        >
          {/* 月亮后方发光晕 */}
          <div className="absolute inset-0 rounded-full bg-amber-300/25 blur-2xl -z-10" />

          {/* 3D 黏土真实月亮图片 (透明通道) */}
          <img
            src="/assets/phonics/anchors/anchor-moon-transparent.png"
            alt="瞌睡月亮"
            className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(245,158,11,0.35)]"
          />

          {/* 月亮打喷嚏风团特效 */}
          {moonState === "sneeze" && (
            <div className="absolute -top-4 -right-4 px-3 py-1 bg-white text-slate-900 font-black text-sm rounded-full shadow-xl border-2 border-amber-400 animate-ping">
              阿嚏~！💨
            </div>
          )}

          {/* 吃对后满嘴爆星星 */}
          {moonState === "eating" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-3xl animate-ping">✨</span>
              <span className="text-2xl animate-bounce">💖</span>
            </div>
          )}
        </div>

        {/* 坐在一旁的动态敢敢小狮子 (投喂场景专属动作 + 喂食勺道具) */}
        <div className="absolute -bottom-2 right-2 sm:right-8 z-20">
          <GanganInteractiveMascot
            scenario="eating"
            size={115}
            onClick={() => {
              playPhonemeSound("m");
              setGanganSpeech("这是 /m/，像在品尝美味蜂蜜！");
            }}
          />
        </div>
      </div>

      {/* 底部：从天空慢悠悠掉下的 Q 弹果冻字母块（随机位置与随机项） */}
      <div
        key={roundKey}
        className="relative w-full flex items-center justify-center gap-5 sm:gap-7 pb-2 z-20 animate-fade-in"
      >
        {jellies.map((jelly, index) => {
          const isDragging = activeDragId === jelly.id;
          const isDizzy = dizzyId === jelly.id;

          return (
            <div
              key={jelly.id}
              onPointerDown={(e) => handlePointerDown(e, jelly)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, jelly)}
              style={{
                transform: isDragging
                  ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0) scale(1.2) rotate(${
                      dragPos.x > 0 ? 8 : -8
                    }deg)`
                  : undefined,
                touchAction: "none",
              }}
              className={`relative size-20 sm:size-22 rounded-3xl bg-gradient-to-b ${
                jelly.color
              } p-1 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-b-6 border-white/50 active:border-b-2 select-none transition-shadow ${
                isDragging
                  ? "z-50 shadow-[0_20px_35px_rgba(0,0,0,0.6)]"
                  : "animate-bounce hover:scale-105"
              } ${isDizzy ? "animate-spin" : ""}`}
            >
              {/* 果冻糖霜高光 */}
              <div className="absolute top-2 left-2.5 w-6 h-2.5 rounded-full bg-white/50 blur-[0.5px]" />

              {/* 字母符号 */}
              <span className="text-3xl sm:text-4xl font-black font-sans text-white drop-shadow-md">
                {jelly.letter}
              </span>

              {/* 抓起自唱提示小图标 */}
              <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] font-bold text-amber-200 border border-white/30 flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                <Volume2Icon className="size-2.5" />
                <span>抓起听音</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部草地地平线软边 */}
      <div className="absolute -bottom-6 left-0 right-0 h-10 bg-gradient-to-t from-emerald-950 via-emerald-900/40 to-transparent pointer-events-none rounded-b-3xl" />
    </div>
  );
};
