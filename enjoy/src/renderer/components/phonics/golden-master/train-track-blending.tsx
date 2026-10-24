import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2Icon } from "lucide-react";
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
  slotIndex: number;
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
      randomRot: Math.round((Math.random() - 0.5) * 10),
    }))
    .sort(() => Math.random() - 0.5);

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
  
  // 文字瘦身：气泡限 ≤5 字短句，长指令通过语音播报
  const [ganganSpeech, setGanganSpeech] = useState("拼出 moon！");
  const [wobbleId, setWobbleId] = useState<string | null>(null);

  // C.3: 吸附成功时对应挂钩亮起与整列车冲刺回弹动效
  const [activeCoupling, setActiveCoupling] = useState<number | null>(null);
  const [trainImpulseKey, setTrainImpulseKey] = useState(0);

  // B.5: 开场无操作长文，车厢轻微弹跳动作暗示
  const [openingBounceHint, setOpeningBounceHint] = useState(true);

  const slotRefs = useRef<{ [slotIndex: number]: HTMLDivElement | null }>({});
  const dragStartRef = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  useEffect(() => {
    // 语音一句话引导
    speakGanganPrompt("拼读小火车进站啦！抓住散落的果冻车厢，拖到铁轨卡槽里拼出 moon 吧！");

    // 开场 1.4 秒动作暗示后恢复静止
    const t = setTimeout(() => {
      setOpeningBounceHint(false);
    }, 1400);

    return () => clearTimeout(t);
  }, []);

  // 1. 抓起车厢积木：自唱其音
  const handlePointerDown = (e: React.PointerEvent, blk: TrainBlock) => {
    if (isCompleted || placedSlots[blk.slotIndex]?.id === blk.id) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveDragId(blk.id);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY };
    setDragPos({ x: 0, y: 0 });

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

    let matchedSlot: number | null = null;
    const slotCenters: { slotIndex: number; cx: number; cy: number }[] = [];
    SLOTS.forEach((slot) => {
      const el = slotRefs.current[slot.slotIndex];
      if (el) {
        const rect = el.getBoundingClientRect();
        slotCenters.push({
          slotIndex: slot.slotIndex,
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
        });
      }
    });

    if (slotCenters.length >= 2) {
      slotCenters.sort((a, b) => a.slotIndex - b.slotIndex);
      let minPitch = Infinity;
      for (let i = 0; i < slotCenters.length - 1; i++) {
        const d = Math.hypot(
          slotCenters[i + 1].cx - slotCenters[i].cx,
          slotCenters[i + 1].cy - slotCenters[i].cy
        );
        if (d < minPitch) {
          minPitch = d;
        }
      }

      const pitch = minPitch;
      let closestSlot: number | null = null;
      let minDistance = Infinity;

      for (const sc of slotCenters) {
        const dist = Math.hypot(clientX - sc.cx, clientY - sc.cy);
        if (dist < minDistance) {
          minDistance = dist;
          closestSlot = sc.slotIndex;
        }
      }

      if (minDistance <= pitch / 2) {
        matchedSlot = closestSlot;
      }
    }

    if (matchedSlot !== null) {
      if (matchedSlot === blk.slotIndex) {
        // 🎯 正确吸附！对应挂钩点亮 + 整车前冲回弹
        moonAudioEngine.playMagneticSnap();
        playPhonemeSound(blk.sound);

        setActiveCoupling(blk.slotIndex);
        setTrainImpulseKey((k) => k + 1);

        setTimeout(() => setActiveCoupling(null), 700);

        const nextPlaced = { ...placedSlots, [blk.slotIndex]: blk };
        setPlacedSlots(nextPlaced);
        setGanganSpeech("吸好啦！✨");

        if (Object.keys(nextPlaced).length === 3) {
          handleAllAssembled();
        }
      } else {
        // 拖错卡槽：轻微回弹
        moonAudioEngine.playSneeze();
        setWobbleId(blk.id);
        setGanganSpeech("再试试！");
        setTimeout(() => setWobbleId(null), 800);
      }
    }
  };

  // 3. 拼搭大合体成功：全列车鸣笛 + 向右缓行一小段
  const handleAllAssembled = () => {
    setIsCompleted(true);
    setGanganSpeech("拼好啦！🎉");

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
                            speakGanganPrompt("全中！moon 月亮！进入荣誉收集册！", {
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
    }, 500);
  };

  return (
    <div className="relative w-full h-[470px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#090e29] via-[#141b44] to-[#201538] p-4 text-white">
      {/* 顶部标题与轻量进度 (B.1 瘦身：无整句说明文字) */}
      <div className="w-full flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚂</span>
          <h3 className="text-sm font-black text-amber-300">
            小火车
          </h3>
        </div>

        {/* 拼装进度 */}
        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-amber-400/40">
          <CheckCircle2Icon className="size-3.5 text-amber-300" />
          <span className="text-xs font-mono font-black text-amber-300">
            {Object.keys(placedSlots).length} / 3
          </span>
        </div>
      </div>

      {/* 中部核心：3D 皮克斯整列火车与连续铁轨 (C 核心体系) */}
      <div className="relative w-full flex flex-col items-center justify-center my-auto z-10">
        {/* 满月升空彩蛋 */}
        {isCompleted && (
          <div className="absolute -top-14 flex flex-col items-center animate-bounce z-30">
            <div className="relative size-20 rounded-full shadow-[0_0_35px_#fde047]">
              <img
                src="/assets/phonics/anchors/anchor-moon-transparent.png"
                alt="满月"
                className="w-full h-full object-contain filter drop-shadow-xl"
              />
            </div>
            <span className="text-xs font-black text-amber-300 mt-1 bg-black/70 px-2 py-0.5 rounded-full border border-amber-400">
              🌕 MOON!
            </span>
          </div>
        )}

        {/* 
          🌟 整列车体系容器 (C.1 & C.3 & C.4)：
          - 车头与 3 节车厢共处同一刚性列车总成
          - 吸附成功时整列车冲刺回弹 (translateX 8px)
          - 拼完 moon 后整列车向右缓行一小段 (translateX 54px)
        */}
        <div
          key={trainImpulseKey}
          style={{
            transform: isCompleted ? "translateX(54px)" : undefined,
            transition: isCompleted ? "transform 1.8s cubic-bezier(0.2, 0.9, 0.4, 1)" : undefined,
            animation: !isCompleted && trainImpulseKey > 0 ? "trainSnapBounce 160ms ease-out" : undefined,
          }}
          className="relative w-full max-w-[530px] h-32 flex items-end justify-start pl-1"
        >
          {/* 1. 3D 皮克斯实体蒸汽火车头 */}
          <div
            style={{ transform: "translateY(0.38px)" }}
            className="relative w-28 h-28 sm:w-32 sm:h-28 flex-shrink-0 z-10 filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.55)]"
          >
            <picture className="w-full h-full block">
              <source srcSet="/assets/phonics/train_locomotive_pixar_v3.webp" type="image/webp" />
              <img
                src="/assets/phonics/train_locomotive_pixar.png"
                alt="皮克斯 3D 蒸汽火车头"
                className="w-full h-full object-contain select-none pointer-events-none"
              />
            </picture>

            {/* 火车鸣笛蒸汽泡 */}
            {isCompleted && (
              <div className="absolute -top-6 left-5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-lg animate-bounce border border-white">
                Choo Choo! 💨
              </div>
            )}
          </div>

          {/* 挂钩连接件 0 (车头与车厢 0) */}
          <div
            style={{ marginBottom: "26px" }}
            className={`w-3.5 h-2 -ml-1 mr-0.5 rounded-sm transition-all duration-300 z-10 ${
              activeCoupling === 0
                ? "bg-amber-300 ring-4 ring-amber-300 shadow-[0_0_12px_#fbbf24] scale-125"
                : "bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 shadow-xs"
            }`}
          />

          {/* 
            2. 三节空车厢槽位 (C.1 拒绝色块 pill，同源 3D 车架 + DOM 果冻货物贴入牌位)
            坐标注释标明：
            - 车厢间距: gap-2
            - 车厢车轮与车头底轮全部精准落在底部同一条铁轨基准线 (-bottom-1)
          */}
          <div style={{ marginBottom: "6px" }} className="flex items-end gap-1.5 sm:gap-2 z-10">
            {SLOTS.map((slot, index) => {
              const placed = placedSlots[slot.slotIndex];
              const isSlotActiveCoupling = activeCoupling === slot.slotIndex;

              return (
                <React.Fragment key={slot.slotIndex}>
                  {/* 车厢本体结构卡槽 */}
                  <div
                    ref={(el) => (slotRefs.current[slot.slotIndex] = el)}
                    className="relative w-19 sm:w-21 h-20 flex flex-col items-center justify-end"
                  >
                    {/* 3D 金属车厢框架底座 (Collinear Wheels + Metallic Chassis) */}
                    <div className="relative w-full h-18 rounded-2xl border-2 border-amber-900/60 bg-gradient-to-b from-[#172554]/90 via-[#0f172a]/95 to-[#1e1b4b] shadow-lg flex flex-col items-center justify-center overflow-hidden">
                      {/* 车厢上沿金属护栏与黄铜边框饰条 */}
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 border-b border-amber-700/80" />

                      {/* 车厢槽位内：DOM 绝对定位果冻字母货物牌位 */}
                      {placed ? (
                        /* 已吸附的 Q 弹果冻货物 */
                        <div
                          className={`size-[85%] rounded-xl bg-gradient-to-b ${placed.color} shadow-md flex flex-col items-center justify-center border-b-2 border-white/50 animate-bounce z-10`}
                        >
                          {/* 货物果冻糖霜高光 */}
                          <div className="absolute top-1 left-2 w-4 h-1.5 rounded-full bg-white/50 blur-[0.5px]" />
                          <span className="text-2xl sm:text-3xl font-black font-sans text-white drop-shadow-md">
                            {placed.letter}
                          </span>
                        </div>
                      ) : (
                        /* 空车位虚位提示 */
                        <div className="flex flex-col items-center opacity-30">
                          <span className="text-2xl font-black font-mono text-amber-200">
                            {slot.expectedLetter}
                          </span>
                        </div>
                      )}

                      {/* 车厢下沿钢轨轴承与轮罩 */}
                      <div className="absolute bottom-0 inset-x-0 h-2 bg-slate-900/90 border-t border-amber-500/30" />
                    </div>

                    {/* 共线双车轮 (精确咬合在铁轨线上) */}
                    <div className="w-full flex justify-between px-2 -mt-1.5 z-20 pointer-events-none">
                      <div className="size-4 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-amber-400 shadow-sm flex items-center justify-center">
                        <div className="size-1 rounded-full bg-amber-300" />
                      </div>
                      <div className="size-4 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-amber-400 shadow-sm flex items-center justify-center">
                        <div className="size-1 rounded-full bg-amber-300" />
                      </div>
                    </div>
                  </div>

                  {/* 车厢之间的挂钩金属锁链连接件 */}
                  {index < SLOTS.length - 1 && (
                    <div
                      className={`w-3 h-2 mb-5 rounded-sm transition-all duration-300 z-10 ${
                        activeCoupling === index + 1
                          ? "bg-amber-300 ring-4 ring-amber-300 shadow-[0_0_12px_#fbbf24] scale-125"
                          : "bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shadow-xs"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* 站台旁的列车长敢敢 (列车长造型 + 站台氛围色调) */}
          <div className="relative ml-auto pr-1 flex flex-col items-center z-20 mb-2">
            <GanganInteractiveMascot
              pose="conductor"
              sceneTint="train"
              size={105}
              speechText={ganganSpeech}
              onClick={() => {
                moonAudioEngine.playTrainWhistle();
                setGanganSpeech("准备发车！");
              }}
            />
          </div>

          {/* 
            3. 贯穿全列车的物理铁轨 (C.4 任何状态下车轮全部严密落在同一条铁轨线上)
            轨面高度精确对齐全车轮底缘
          */}
          <div className="absolute bottom-0 left-0 right-0 h-2 flex flex-col justify-end pointer-events-none z-0">
            {/* 钢轨面 */}
            <div className="w-full h-1 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            {/* 枕木阴影 */}
            <div className="w-full h-0.5 bg-black/60" />
          </div>
        </div>
      </div>

      {/* 
        底部：打乱顺序散落在轨道旁的果冻积木 (B.5 开场轻微弹跳暗示)
      */}
      <div className="relative w-full flex items-center justify-center gap-5 sm:gap-7 pb-2 z-20">
        {scatteredBlocks.map((blk) => {
          const isPlaced = Boolean(placedSlots[blk.slotIndex]);
          const isDragging = activeDragId === blk.id;
          const isWobbling = wobbleId === blk.id;

          if (isPlaced) {
            return (
              <div
                key={blk.id}
                className="size-18 sm:size-20 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 opacity-25 flex items-center justify-center pointer-events-none"
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
                  ? `translate3d(${dragPos.x}px, ${dragPos.y}px, 0) scale(1.18)`
                  : `rotate(${blk.randomRot}deg)`,
                touchAction: "none",
              }}
              className={`relative size-18 sm:size-20 rounded-2xl bg-gradient-to-b ${
                blk.color
              } p-1 shadow-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-b-6 border-white/50 active:border-b-2 select-none transition-shadow ${
                isDragging
                  ? "z-50 shadow-[0_20px_35px_rgba(0,0,0,0.6)]"
                  : openingBounceHint
                  ? "animate-bounce"
                  : "hover:scale-105"
              } ${isWobbling ? "animate-spin" : ""}`}
            >
              {/* 果冻高光 */}
              <div className="absolute top-2 left-2.5 w-5 h-2 rounded-full bg-white/50 blur-[0.5px]" />

              {/* 字母符号 */}
              <span className="text-3xl sm:text-4xl font-black font-sans text-white drop-shadow-md">
                {blk.letter}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes trainSnapBounce {
          0% { transform: translateX(0); }
          40% { transform: translateX(8px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
