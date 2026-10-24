import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  XIcon,
  Volume2Icon,
  StarIcon,
  SparklesIcon,
  CheckCircle2Icon,
  AwardIcon,
  RotateCcwIcon,
  GiftIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
} from "@renderer/components/ui";
import {
  PhonicsRouteGroup,
} from "@renderer/lib/phonics-route-config";
import {
  PHONICS_ISLAND_39_ANCHORS,
  PhonicsAnchorItem,
} from "@renderer/lib/phoneme-anchors";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  phonicsAudioFx,
  speakGanganPrompt,
} from "@renderer/lib/phonics-audio-fx";

interface PhonicsGroupReviewModalProps {
  group: PhonicsRouteGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (groupId: string) => void;
}

// 寻宝泡泡背景渐变配色池
const BUBBLE_COLORS = [
  "from-pink-400 via-rose-400 to-rose-500 border-pink-200 text-white",
  "from-amber-400 via-orange-400 to-amber-500 border-amber-200 text-slate-950",
  "from-sky-400 via-blue-400 to-indigo-500 border-sky-200 text-white",
  "from-emerald-400 via-teal-400 to-green-500 border-emerald-200 text-white",
  "from-purple-400 via-violet-400 to-purple-600 border-purple-200 text-white",
];

// 寻宝场景中气泡的预置散落坐标（百分比，保证视觉层次丰富且不重叠）
const SCENE_POSITIONS = [
  { left: "12%", top: "28%" },
  { left: "38%", top: "20%" },
  { left: "68%", top: "24%" },
  { left: "84%", top: "42%" },
  { left: "18%", top: "62%" },
  { left: "44%", top: "58%" },
  { left: "72%", top: "68%" },
  { left: "54%", top: "38%" },
];

export const PhonicsGroupReviewModal: React.FC<PhonicsGroupReviewModalProps> = ({
  group,
  isOpen,
  onClose,
  onCompleted,
}) => {
  if (!group) return null;

  // 获取本组音素对应的完整 anchor items
  const groupAnchors: PhonicsAnchorItem[] = useMemo(() => {
    return group.phonemeIds
      .map((id) => PHONICS_ISLAND_39_ANCHORS.find((a) => a.id === id))
      .filter(Boolean) as PhonicsAnchorItem[];
  }, [group]);

  // 已成功寻获的音素 ID 列表
  const [foundIds, setFoundIds] = useState<string[]>([]);
  // 当前正在寻找的目标音素索引
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  // 点错的元素 ID（用于短暂抖动）
  const [shakingId, setShakingId] = useState<string | null>(null);
  // 是否全部找齐通关
  const [isAllFound, setIsAllFound] = useState(false);
  // 敢敢当前对白
  const [ganganSpeech, setGanganSpeech] = useState("");
  // 音频播放中状态
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // 待寻找的目标
  const currentTarget = groupAnchors[currentTargetIndex] || null;

  // 停止所有音频
  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsPlayingAudio(false);
  };

  // 生成当前场景中的交互泡泡（包含全部本组音素 + 1~2 个本组复现干扰项）
  const sceneItems = useMemo(() => {
    const list = [...groupAnchors];
    // 如果组音素较少（如 1~3 个），复制部分作为场景趣味元素，凑足 5~6 个
    while (list.length < 6) {
      list.push(groupAnchors[list.length % groupAnchors.length]);
    }
    // 伪随机打乱并分配散落坐标
    const shuffled = [...list].sort((a, b) => (a.id + b.id).localeCompare(b.id + a.id));
    return shuffled.map((item, idx) => ({
      uniqueKey: `${item.id}-${idx}`,
      item,
      pos: SCENE_POSITIONS[idx % SCENE_POSITIONS.length],
      color: BUBBLE_COLORS[idx % BUBBLE_COLORS.length],
    }));
  }, [groupAnchors]);

  // 初始化与打开对话框重置
  useEffect(() => {
    if (isOpen && group) {
      setFoundIds([]);
      setCurrentTargetIndex(0);
      setIsAllFound(false);
      setShakingId(null);

      const welcome = `小探险家！欢迎来到${group.title}寻宝大冒险！听声音，把本组学过的全部字母宝贝全找齐吧！`;
      setGanganSpeech(welcome);

      const timer = setTimeout(() => {
        speakGanganPrompt(welcome, {
          onEnd: () => {
            if (groupAnchors[0]) {
              playTargetSound(groupAnchors[0]);
            }
          },
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        stopAllAudio();
      };
    }
  }, [isOpen, group?.id]);

  // 播放当前目标的纯正发音
  const playTargetSound = (target: PhonicsAnchorItem) => {
    stopAllAudio();
    setIsPlayingAudio(true);
    setGanganSpeech(`仔细听！这是哪个字母宝贝的声音？快在地图里找出来！`);

    // 播放纯音素 + 锚定词
    playPhonemeSound(target.letter, {
      onEnd: () => {
        playStandardTts(target.anchorWord, {
          onEnd: () => setIsPlayingAudio(false),
        });
      },
    });
  };

  // 点击场景中的字母泡泡
  const handleItemClick = (clickedItem: PhonicsAnchorItem, uniqueKey: string) => {
    if (isAllFound || !currentTarget) return;

    if (clickedItem.id === currentTarget.id) {
      // 找对啦！
      phonicsAudioFx.playSuccessChime();
      const nextFound = Array.from(new Set([...foundIds, currentTarget.id]));
      setFoundIds(nextFound);

      // 检查是否全找齐
      if (nextFound.length >= groupAnchors.length) {
        setIsAllFound(true);
        stopAllAudio();
        phonicsAudioFx.playStampSound();
        const cheers = `哇！太厉害啦！第 ${group.order} 组的字母宝贝全部找齐啦！下一组成功解锁！`;
        setGanganSpeech(cheers);
        speakGanganPrompt(cheers, { pitch: 1.3 });
      } else {
        // 进入下一个目标
        const nextIdx = currentTargetIndex + 1;
        setCurrentTargetIndex(nextIdx);
        const praise = `太棒啦！找到了字母 ${currentTarget.letter}！继续找下一个！`;
        setGanganSpeech(praise);
        speakGanganPrompt(praise, {
          onEnd: () => {
            if (groupAnchors[nextIdx]) {
              playTargetSound(groupAnchors[nextIdx]);
            }
          },
        });
      }
    } else {
      // 选错了，温柔鼓励并抖动
      phonicsAudioFx.playPop();
      setShakingId(uniqueKey);
      setTimeout(() => setShakingId(null), 600);

      const hint = `这个是 ${clickedItem.letter} 哦，再听一次发音，继续加油！`;
      setGanganSpeech(hint);
      speakGanganPrompt(hint, {
        onEnd: () => {
          if (currentTarget) {
            playTargetSound(currentTarget);
          }
        },
      });
    }
  };

  // 通关领取奖励并完成
  const handleFinish = () => {
    stopAllAudio();
    onCompleted(group.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/10 via-background to-background shadow-2xl select-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{group.reviewTitle}</DialogTitle>
        </DialogHeader>

        {/* 顶部通关站头部 */}
        <div className="relative px-5 py-3.5 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 border-b border-amber-300/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl shadow-xs border-2 border-amber-300">
              🦁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                  D 模板 · 场景寻宝复习关
                </Badge>
                <span className="text-xs font-black font-mono text-amber-900 dark:text-amber-200">
                  第 {group.order} 组
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-foreground mt-0.5">
                {group.reviewTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="size-9 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground flex items-center justify-center shadow-xs border border-border cursor-pointer transition-transform active:scale-90"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* 宝藏收集卡槽指示栏 */}
        <div className="px-5 py-3 bg-muted/30 border-b border-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-foreground flex items-center gap-1.5">
              <GiftIcon className="size-4 text-amber-500" />
              <span>本组宝藏收集进度</span>
            </span>
            <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
              已找齐 {foundIds.length} / {groupAnchors.length} 个字母宝贝
            </span>
          </div>

          {/* 宝藏收集卡槽 */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {groupAnchors.map((item) => {
              const isFound = foundIds.includes(item.id);
              const isCurrent = currentTarget?.id === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-2 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                    isFound
                      ? "bg-amber-500/20 border-amber-400 shadow-sm shadow-amber-500/10 scale-102"
                      : isCurrent
                      ? "bg-sky-500/10 border-sky-400 ring-2 ring-sky-400/50 animate-pulse"
                      : "bg-muted/40 border-border/60 opacity-60"
                  }`}
                >
                  <div className="size-8 rounded-xl bg-background/90 flex items-center justify-center overflow-hidden mb-1">
                    {isFound ? (
                      <img
                        src={item.imageUrl}
                        alt={item.anchorWord}
                        className="w-full h-full object-contain filter drop-shadow-xs"
                      />
                    ) : (
                      <span className="text-xs font-mono font-black text-muted-foreground">
                        ?
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black font-sans text-foreground">
                    {item.letter}
                  </span>
                  {isFound ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                      <StarIcon className="size-2.5 fill-current" /> 已集齐
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground font-semibold">
                      待寻获
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 敢敢伴学对白与发音重听按钮 */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-300/30 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-amber-950 dark:text-amber-200 line-clamp-1">
            🦁 敢敢小贴士：{ganganSpeech}
          </p>
          {currentTarget && !isAllFound && (
            <Button
              size="sm"
              onClick={() => playTargetSound(currentTarget)}
              disabled={isPlayingAudio}
              className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <Volume2Icon className={`size-3.5 ${isPlayingAudio ? "animate-bounce" : ""}`} />
              <span>听发音</span>
            </Button>
          )}
        </div>

        {/* 寻宝互动大舞台 (场景交互区) */}
        <div className="p-5 relative min-h-[340px] flex items-center justify-center overflow-hidden">
          {/* 自然岛屿沙滩与树林萌趣手绘背景层 */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400/15 via-emerald-400/10 to-amber-400/20 pointer-events-none" />

          {/* 装饰元素 */}
          <div className="absolute top-4 left-6 text-3xl opacity-40 select-none">🌴</div>
          <div className="absolute top-6 right-8 text-3xl opacity-40 select-none">⛵</div>
          <div className="absolute bottom-4 left-8 text-3xl opacity-40 select-none">🏖️</div>
          <div className="absolute bottom-4 right-6 text-3xl opacity-40 select-none">🦀</div>

          {/* 全部找齐胜利通关庆祝界面 */}
          {isAllFound ? (
            <div className="relative z-10 flex flex-col items-center text-center space-y-4 py-4 animate-in zoom-in-75 duration-300">
              <div className="size-28 rounded-full border-4 border-dashed border-amber-500 bg-amber-500/20 flex flex-col items-center justify-center text-amber-600 dark:text-amber-400 shadow-xl shadow-amber-500/20">
                <AwardIcon className="size-12 fill-current" />
                <span className="text-xs font-black font-mono mt-1">⭐ 寻宝大满贯 ⭐</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground">
                  🎉 恭喜找齐第 {group.order} 组全部字母宝贝！
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  本组自然拼读圆满通关，下一组路线已点亮解锁！
                </p>
              </div>

              {/* 三星鼓励（0 数字挫败分） */}
              <div className="flex items-center gap-2">
                <StarIcon className="size-7 fill-amber-400 text-amber-500 animate-bounce" />
                <StarIcon className="size-9 fill-amber-400 text-amber-500 animate-bounce delay-100" />
                <StarIcon className="size-7 fill-amber-400 text-amber-500 animate-bounce delay-200" />
              </div>

              <Button
                onClick={handleFinish}
                className="h-11 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <SparklesIcon className="size-4" />
                <span>点亮星程 · 解锁下一组</span>
              </Button>
            </div>
          ) : (
            /* 场景交互泡泡群 */
            <div className="relative w-full h-[320px]">
              {sceneItems.map(({ uniqueKey, item, pos, color }) => {
                const isItemFound = foundIds.includes(item.id);
                const isShaking = shakingId === uniqueKey;

                return (
                  <button
                    key={uniqueKey}
                    type="button"
                    style={{ left: pos.left, top: pos.top }}
                    onClick={() => handleItemClick(item, uniqueKey)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 size-20 sm:size-22 rounded-3xl bg-gradient-to-b ${color} border-2 p-2 flex flex-col items-center justify-center shadow-lg transition-all duration-300 cursor-pointer active:scale-90 hover:scale-110 ${
                      isShaking ? "animate-shake ring-4 ring-rose-400" : ""
                    } ${
                      isItemFound
                        ? "opacity-40 grayscale scale-95 pointer-events-none"
                        : "hover:shadow-amber-500/30"
                    }`}
                  >
                    <div className="size-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center mb-0.5 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.anchorWord}
                        className="w-full h-full object-contain filter drop-shadow-xs"
                      />
                    </div>
                    <span className="text-xl sm:text-2xl font-black font-sans tracking-tight">
                      {item.letter}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
