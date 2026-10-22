import React, { useState, useRef, useEffect, useMemo } from "react";
import { SparklesIcon, CheckCircle2Icon } from "lucide-react";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { moonAudioEngine } from "./moon-audio-engine";
import { GanganInteractiveMascot } from "../game/gangan-interactive-mascot";

interface TrainTrackBlendingProps {
  onSuccess: () => void;
}

interface TrackSlot {
  slotIndex: number;
  expectedLetter: string;
  expectedSound: string;
}

interface TrainBlock {
  id: string;
  letter: string;
  sound: string;
  slotIndex: number; // 目标卡槽
  color: string;
  randomRot: number;
}

const SLOTS: TrackSlot[] = [
  { slotIndex: 0, expectedLetter: "m", expectedSound: "m" },
  { slotIndex: 1, expectedLetter: "oo", expectedSound: "u:" },
  { slotIndex: 2, expectedLetter: "n", expectedSound: "n" },
];

const RAW_BLOCKS: Omit<TrainBlock, "randomRot">[] = [
  { id: "blk-m", letter: "m", sound: "m", slotIndex: 0, color: "from-amber-400 to-orange-500" },
  { id: "blk-oo", letter: "oo", sound: "u:", slotIndex: 1, color: "from-sky-400 to-indigo-500" },
  { id: "blk-n", letter: "n", sound: "n", slotIndex: 2, color: "from-emerald-400 to-teal-500" },
];

function generateShuffledBlocks(): TrainBlock[] {
  let list = [...RAW_BLOCKS]
    .map((b) => ({
      ...b,
      randomRot: Math.round((Math.random() - 0.5) * 12),
    }))
    .sort(() => Math.random() - 0.5);

  // 确保初次呈现不是按顺序 m, oo, n 排列，让孩子必须动脑辨识
  if (list.length >= 2 && list[0].letter === "m" && list[1].letter === "oo") {
    list = [list[1], list[2], list[0]];
  }
  return list;
}

export const TrainTrackBlending: React.FC<TrainTrackBlendingProps> = ({ onSuccess }) => {
  const [scatteredBlocks, setScatteredBlocks] = useState<TrainBlock[]>(() => generateShuffledBlocks());
  const [placedSlots, setPlacedSlots] = useState<{ [slotIndex: number]: TrainBlock }>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCompleted, setIsCompleted] = useState(false);
  const [ganganSpeech, setGanganSpeech] = useState("散落的车厢已随机打乱！拖上铁轨卡槽，拼出 moon 吧！");
  const [wobbleId, setWobbleId] = useState<string | null>(null);

  const slotRefs = useRef<{ [slotIndex: number]: HTMLDivElement | null }>({});
  const dragStartRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  useEffect(() => {
    speakGanganPrompt("拼读小火车进站啦！抓住散落的果冻车厢，拖到铁轨卡槽里吸附成词吧！");
  }, []);

  // 1. 抓起车厢积木：自唱其音
  const handlePointerDown = (e: React.PointerEvent, blk: TrainBlock) => {
    if (isCompleted || placedSlots[blk.slotIndex]?.id === blk.id) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveDragId(blk.id);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY };
    setDragPos({ x: 0, y: 0 });

    // 抓起即自唱
    playPhonemeSound(blk.sound);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragId) return;
    setDragPos({
      x: e.clientX - dragStartRef.current.startX,
      y: e.clientY - dragStartRef.current.startY,
    });
  };

  // 2. 放手检测吸附到哪个槽位
  const handlePointerUp = (e: React.PointerEvent, blk: TrainBlock) => {
    if (!activeDragId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const clientX = e.clientX;
    const clientY = e.clientY;
    setActiveDragId(null);
    setDragPos({ x: 0, y: 0 });

    // 遍历卡槽判断是否靠近
    let matchedSlot: number | null = null;
    SLOTS.forEach((slot) => {
      const el = slotRefs.current[slot.slotIndex];
      if (el) {
        const rect = el.getBoundingClientRect();
        // 50px 吸附磁力距离
        if (
          clientX >= rect.left - 50 &&
          clientX <= rect.right + 50 &&
          clientY >= rect.top - 50 &&
          clientY <= rect.bottom + 50
        ) {
          matchedSlot = slot.slotIndex;
        }
      }
    });

    if (matchedSlot !== null) {
      if (matchedSlot === blk.slotIndex) {
        // 🎯 正确吸附！
        moonAudioEngine.playMagneticSnap();
        playPhonemeSound(blk.sound);
        const nextPlaced = { ...placedSlots, [blk.slotIndex]: blk };
        setPlacedSlots(nextPlaced);
        setGanganSpeech(`咔嗒！${blk.letter} 吸附成功！`);

        // 检查是否 3 块全部吸附完成
        if (Object.keys(nextPlaced).length === 3) {
          handleAllAssembled();
        }
      } else {
        // ❌ 拖错位置：晃晃滑回原位，不报错
        moonAudioEngine.playSneeze();
        setWobbleId(blk.id);
        setGanganSpeech(`车厢扭了扭，这是第 ${blk.slotIndex + 1} 节车厢哦！`);
        setTimeout(() => setWobbleId(null), 800);
      }
    }
  };

  // 3. 拼搭大合体成功：火车加速鸣笛 + 满月升空
  const handleAllAssembled = () => {
    setIsCompleted(true);
    setGanganSpeech("叮咚！拼读小火车加速鸣笛！满月升起来啦！🌕");

    setTimeout(() => {
      moonAudioEngine.playTrainWhistle();

      // 依次连读发音 m-oo-n -> moon!
      playPhonemeSound("m", {
        onEnd: () => {
          setTimeout(() => {
            playPhonemeSound("u:", {
              onEnd: () => {
                setTimeout(() => {
                  playPhonemeSound("n", {
                    onEnd: () => {
                      setTimeout(() => {
                        phonicsAudioFx.playSuccessChime();
                        playStandardTts("moon", {
                          onEnd: () => {
                            speakGanganPrompt("全中！/m/ - /u:/ - /n/ 拼成了 moon 月亮！进入荣誉收集册！", {
                              pitch: 1.25,
                              onEnd: () => setTimeout(onSuccess, 1000),
                            });
                          },
                        });
                      }, 400);
                    },
                  });
                }, 350);
              },
            });
          }, 350);
        },
      });
    }, 600);
  };

  return (
    <div className="relative w-full h-[470px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#090e29] via-[#141b44] to-[#201538] p-4 text-white">
      {/* 顶部标题 */}
      <div className="w-full flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚂</span>
          <div>
            <h3 className="text-sm font-black text-amber-300">
              玩法三：轨道合体车
            </h3>
            <p className="text-[10px] text-slate-300">
              车厢位置完全随机！拖动车厢积木吸附到轨道槽中，拼出完整单词！
            </p>
          </div>
        </div>

        {/* 拼装进度 */}
        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-amber-400/40">
          <CheckCircle2Icon className="size-3.5 text-amber-300" />
          <span className="text-xs font-mono font-black text-amber-300">
            {Object.keys(placedSlots).length} / 3 节
          </span>
        </div>
      </div>

      {/* 敢敢上方提示气泡 */}
      <div className="z-10 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-black shadow-md backdrop-blur-sm animate-bounce">
        🦁 敢敢列车长：" {ganganSpeech} "
      </div>

      {/* 中部核心：发光铁轨与车厢卡槽 */}
      <div className="relative w-full flex flex-col items-center justify-center my-auto z-10">
        {/* 顶部漂浮的满月升空彩蛋 */}
        {isCompleted && (
          <div className="absolute -top-16 flex flex-col items-center animate-bounce z-30">
            <div className="relative size-24 rounded-full shadow-[0_0_40px_#fde047]">
              <img
                src="/assets/phonics/anchors/anchor-moon-transparent.png"
                alt="满月"
                className="w-full h-full object-contain filter drop-shadow-xl"
              />
            </div>
            <span className="text-xs font-black text-amber-300 mt-1 bg-black/60 px-2 py-0.5 rounded-full border border-amber-400">
              🌕 MOON!
            </span>
          </div>
        )}

        {/* 铁轨主体与 3D 皮克斯小火车 */}
        <div className="relative w-full max-w-[540px] h-36 flex items-center justify-start pl-2">
          {/* 1. 皮克斯 3D 实体蒸汽火车头 (全立体高精渲染 · 车头大动轮 · 烟囱蒸汽喷发) */}
          <div className="relative -mt-2 w-32 h-28 sm:w-36 sm:h-30 flex-shrink-0 z-10 filter drop-shadow-[0_14px_24px_rgba(0,0,0,0.6)]">
            {/* 车头照地金光 */}
            <div className="absolute top-1/2 left-0 -translate-x-full w-24 h-14 bg-gradient-to-l from-amber-300/35 via-yellow-200/15 to-transparent blur-md pointer-events-none rounded-full" />
            
            <picture className="w-full h-full block">
              <source srcSet="/assets/phonics/train_locomotive_pixar_v3.webp" type="image/webp" />
              <img
                src="/assets/phonics/train_locomotive_pixar.png"
                alt="皮克斯 3D 蒸汽火车头"
                className="w-full h-full object-contain select-none pointer-events-none"
              />
            </picture>

            {/* 火车头汽笛鸣笛气泡 */}
            {isCompleted && (
              <div className="absolute -top-6 left-6 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-lg animate-bounce border border-white">
                Choo Choo! 🚂💨
              </div>
            )}
          </div>

          {/* 车头与车厢挂钩连接件 */}
          <div className="w-3 h-2 bg-gradient-to-r from-amber-600 to-amber-400 rounded-sm shadow-xs -ml-1 z-0" />

          {/* 2. 3 个车厢吸附卡槽 (Slot 0: m, Slot 1: oo, Slot 2: n) */}
          <div className="flex items-center gap-2 sm:gap-3 z-10">
            {SLOTS.map((slot, index) => {
              const placed = placedSlots[slot.slotIndex];
              return (
                <React.Fragment key={slot.slotIndex}>
                  <div
                    ref={(el) => (slotRefs.current[slot.slotIndex] = el)}
                    className={`relative size-19 sm:size-21 rounded-3xl border-3 ${
                      placed
                        ? "border-amber-400 bg-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                        : "border-dashed border-white/40 bg-white/5"
                    } flex flex-col items-center justify-center transition-all duration-300`}
                  >
                    {/* 车厢底座金属车轮与轴承 */}
                    <div className="absolute -bottom-2.5 flex gap-4">
                      <div className="size-4 rounded-full bg-slate-900 border-2 border-amber-400 shadow-sm" />
                      <div className="size-4 rounded-full bg-slate-900 border-2 border-amber-400 shadow-sm" />
                    </div>

                    {placed ? (
                      // 已吸附的车厢积木
                      <div
                        className={`size-full rounded-2xl bg-gradient-to-b ${placed.color} flex flex-col items-center justify-center shadow-lg animate-bounce`}
                      >
                        <span className="text-3xl sm:text-4xl font-black font-sans text-white drop-shadow-md">
                          {placed.letter}
                        </span>
                        <span className="text-[10px] font-mono text-white/80">
                          /{placed.sound}/
                        </span>
                      </div>
                    ) : (
                      // 虚位以待的半透明目标提示
                      <div className="flex flex-col items-center opacity-40">
                        <span className="text-2xl font-black font-mono">
                          {slot.expectedLetter}
                        </span>
                        <span className="text-[9px] font-bold text-slate-300">
                          车厢 {slot.slotIndex + 1}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 车厢之间的挂钩金属锁链 */}
                  {index < SLOTS.length - 1 && (
                    <div className="w-2.5 h-1.5 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full shadow-xs" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* 3. 站台旁的 3D 皮克斯列车长敢敢小狮子 (身着制服、大檐帽、怀表、挥手致意) */}
          <div className="relative ml-auto pr-1 flex flex-col items-center z-20">
            <GanganInteractiveMascot
              scenario="conductor"
              size={120}
              onClick={() => {
                moonAudioEngine.playTrainWhistle();
                setGanganSpeech("咔嗒！列车长敢敢检查怀表，准备准点发车！");
              }}
            />
            {/* 站台立牌角标 */}
            <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-900/90 border border-sky-400/60 text-[9px] font-black text-sky-200 shadow-md whitespace-nowrap">
              🚉 列车长
            </div>
          </div>

          {/* 铁轨枕木与轨条 */}
          <div className="absolute -bottom-3 left-0 right-0 h-3 flex items-center justify-between px-2 pointer-events-none">
            <div className="w-full h-1 bg-gradient-to-r from-amber-400/80 via-yellow-400 to-amber-400/80 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          </div>
        </div>
      </div>

      {/* 底部：完全打乱顺序散落在轨道旁的积木 */}
      <div className="relative w-full flex items-center justify-center gap-5 sm:gap-7 pb-2 z-20">
        {scatteredBlocks.map((blk) => {
          const isPlaced = Boolean(placedSlots[blk.slotIndex]);
          const isDragging = activeDragId === blk.id;
          const isWobbling = wobbleId === blk.id;

          if (isPlaced) {
            // 已放置的积木原位留虚线轮廓
            return (
              <div
                key={blk.id}
                className="size-18 sm:size-20 rounded-3xl border-2 border-dashed border-white/20 bg-white/5 opacity-30 flex items-center justify-center pointer-events-none"
              >
                <CheckCircle2Icon className="size-6 text-white" />
              </div>
            );
          }

          return (
            <div
              key={blk.id}
              onPointerDown={(e) => handlePointerDown(e, blk)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, blk)}
              style={{
                transform: isDragging
                  ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0) scale(1.22) rotate(${
                      dragPos.x > 0 ? 8 : -8
                    }deg)`
                  : `rotate(${blk.randomRot}deg)`,
                touchAction: "none",
              }}
              className={`relative size-18 sm:size-20 rounded-3xl bg-gradient-to-b ${
                blk.color
              } p-1 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-b-6 border-white/50 active:border-b-2 select-none transition-shadow ${
                isDragging
                  ? "z-50 shadow-[0_20px_35px_rgba(0,0,0,0.6)]"
                  : "animate-bounce hover:scale-105"
              } ${isWobbling ? "animate-spin" : ""}`}
            >
              {/* 果冻高光 */}
              <div className="absolute top-2 left-2.5 w-5 h-2 rounded-full bg-white/50 blur-[0.5px]" />

              {/* 字母符号 */}
              <span className="text-3xl sm:text-4xl font-black font-sans text-white drop-shadow-md">
                {blk.letter}
              </span>

              {/* 底部抓起小磁吸提示 */}
              <div className="absolute -bottom-2 px-1.5 py-0.5 rounded-full bg-black/60 text-[8px] font-bold text-amber-200 border border-white/30 flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                <span>🧲 拖上轨道</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
