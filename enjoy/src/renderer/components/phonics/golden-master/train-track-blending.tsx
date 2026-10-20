import React, { useState, useRef, useEffect } from "react";
import { SparklesIcon, CheckCircle2Icon } from "lucide-react";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { moonAudioEngine } from "./moon-audio-engine";

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
}

const SLOTS: TrackSlot[] = [
  { slotIndex: 0, expectedLetter: "m", expectedSound: "m" },
  { slotIndex: 1, expectedLetter: "oo", expectedSound: "u:" },
  { slotIndex: 2, expectedLetter: "n", expectedSound: "n" },
];

const INITIAL_BLOCKS: TrainBlock[] = [
  // 打乱顺序散落在轨道旁
  { id: "blk-oo", letter: "oo", sound: "u:", slotIndex: 1, color: "from-sky-400 to-indigo-500" },
  { id: "blk-m", letter: "m", sound: "m", slotIndex: 0, color: "from-amber-400 to-orange-500" },
  { id: "blk-n", letter: "n", sound: "n", slotIndex: 2, color: "from-emerald-400 to-teal-500" },
];

export const TrainTrackBlending: React.FC<TrainTrackBlendingProps> = ({ onSuccess }) => {
  const [placedSlots, setPlacedSlots] = useState<{ [slotIndex: number]: TrainBlock }>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCompleted, setIsCompleted] = useState(false);
  const [ganganSpeech, setGanganSpeech] = useState("把散落的车厢积木，拖上轨道拼成 moon 吧！");
  const [wobbleId, setWobbleId] = useState<string | null>(null);

  const slotRefs = useRef<{ [slotIndex: number]: HTMLDivElement | null }>({});
  const dragStartRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  useEffect(() => {
    speakGanganPrompt("拼读小火车进站啦！抓住果冻车厢，拖到铁轨卡槽里吸附成词吧！");
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
        // 45px 吸附磁力距离
        if (
          clientX >= rect.left - 45 &&
          clientX <= rect.right + 45 &&
          clientY >= rect.top - 45 &&
          clientY <= rect.bottom + 45
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
      // 汽笛鸣笛
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
                        playStandardTts("moon");
                        phonicsAudioFx.playSuccessChime();
                        setTimeout(onSuccess, 1800);
                      }, 300);
                    },
                  });
                }, 250);
              },
            });
          }, 250);
        },
      });
    }, 400);
  };

  return (
    <div className="relative w-full h-[460px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#090f2b] via-[#141b43] to-[#1f1438] p-4 text-white">
      {/* 顶部标题与提示 */}
      <div className="w-full flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚂</span>
          <div>
            <h3 className="text-sm font-black text-amber-300">
              玩法三：拼读小火车
            </h3>
            <p className="text-[10px] text-slate-300">
              把果冻车厢<strong>拖上铁轨卡槽</strong>，磁力吸附拼成词！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-amber-400/40 text-xs font-mono font-black text-amber-300">
          <span>{Object.keys(placedSlots).length} / 3 节</span>
        </div>
      </div>

      {/* 敢敢上方提示气泡 */}
      <div className="z-10 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-black shadow-md backdrop-blur-sm animate-bounce">
        🦁 敢敢：" {ganganSpeech} "
      </div>

      {/* 中部场景：满月升起动画与铁轨 */}
      <div className="relative flex flex-col items-center justify-center my-auto w-full z-10">
        {/* 满月升空特效 (透明通道) */}
        <div
          className={`relative size-28 sm:size-32 transition-all duration-1000 ${
            isCompleted
              ? "scale-125 -translate-y-4 filter drop-shadow-[0_0_35px_#fde047]"
              : "opacity-85"
          }`}
        >
          <img
            src="/assets/phonics/anchors/anchor-moon-transparent.png"
            alt="满月"
            className="w-full h-full object-contain"
          />
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-3xl animate-ping">✨</span>
            </div>
          )}
        </div>

        {/* 🚂 卡通铁轨与 3 个卡槽 */}
        <div className="relative w-full max-w-sm mt-4 p-3 rounded-2xl bg-black/40 border-2 border-amber-400/30 flex flex-col items-center">
          {/* 铁轨枕木线 */}
          <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-amber-900/60 -translate-y-1/2 -z-0" />

          {/* 3 个磁力吸附槽位 */}
          <div className="w-full flex items-center justify-around z-10">
            {SLOTS.map((slot) => {
              const placed = placedSlots[slot.slotIndex];

              return (
                <div
                  key={slot.slotIndex}
                  ref={(el) => {
                    slotRefs.current[slot.slotIndex] = el;
                  }}
                  className={`size-20 sm:size-22 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                    placed
                      ? "border-emerald-400 bg-emerald-500/10 shadow-lg"
                      : "border-amber-400/60 bg-amber-400/5 hover:border-amber-300"
                  }`}
                >
                  {placed ? (
                    // 已吸附的车厢
                    <div
                      className={`size-full rounded-2xl bg-gradient-to-b ${placed.color} p-1 shadow-md flex flex-col items-center justify-center border-b-4 border-white/50 animate-bounce`}
                    >
                      <span className="text-3xl font-black font-mono text-white">
                        {placed.letter}
                      </span>
                      <span className="text-[10px] font-sans font-bold text-white/80">
                        /{placed.sound}/
                      </span>
                    </div>
                  ) : (
                    // 未吸附的虚线卡位
                    <span className="text-xs font-black font-mono text-amber-300/40">
                      第 {slot.slotIndex + 1} 节
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部：轨道边散落的果冻车厢积木 */}
      <div className="relative w-full flex items-center justify-center gap-5 pb-2 z-20">
        {!isCompleted ? (
          INITIAL_BLOCKS.map((blk) => {
            const isPlaced = placedSlots[blk.slotIndex]?.id === blk.id;
            if (isPlaced) return null; // 吸附后在轨道显示

            const isDragging = activeDragId === blk.id;
            const isWobble = wobbleId === blk.id;

            return (
              <div
                key={blk.id}
                onPointerDown={(e) => handlePointerDown(e, blk)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, blk)}
                style={{
                  transform: isDragging
                    ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0) scale(1.18) rotate(${
                        dragPos.x > 0 ? 6 : -6
                      }deg)`
                    : undefined,
                  touchAction: "none",
                }}
                className={`relative size-20 sm:size-22 rounded-3xl bg-gradient-to-b ${
                  blk.color
                } p-1 shadow-xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-b-6 border-white/50 active:border-b-2 select-none ${
                  isDragging
                    ? "z-50 shadow-[0_20px_35px_rgba(0,0,0,0.6)]"
                    : "animate-pulse hover:scale-105"
                } ${isWobble ? "animate-shake" : ""}`}
              >
                <div className="absolute top-2 left-2.5 w-6 h-2 rounded-full bg-white/50 blur-[0.5px]" />
                <span className="text-3xl font-black font-mono text-white drop-shadow-md">
                  {blk.letter}
                </span>
                <span className="text-[10px] font-sans font-bold text-white/90">
                  /{blk.sound}/
                </span>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm shadow-xl animate-bounce">
            <CheckCircle2Icon className="size-5" />
            <span>🎉 MOON (月亮) 拼读合体成功！即将揭晓贴纸！</span>
          </div>
        )}
      </div>
    </div>
  );
};
