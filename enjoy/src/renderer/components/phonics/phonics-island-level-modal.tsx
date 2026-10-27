import React, { useState, useEffect, useRef } from "react";
import {
  XIcon,
  Volume2Icon,
  MicIcon,
  SquareIcon,
  StarIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  RotateCcwIcon,
  AwardIcon,
  PlayIcon,
  RocketIcon,
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
  PhonicsAnchorItem,
  getAnchorBlocks,
  PHONICS_ISLAND_39_ANCHORS,
  PHONICS_ISLAND_BADGES,
  IslandBadge,
} from "@renderer/lib/phoneme-anchors";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  phonicsAudioFx,
  speakGanganPrompt,
  stopGanganPrompt,
} from "@renderer/lib/phonics-audio-fx";
import { CLASSIC_3D_FILES, cleanPhonemeKey } from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import {
  getDecodableWordsForIpaSlug,
  PhonicsWord,
} from "@renderer/lib/open-phonics-service";
import { PhonicsWordBlendingModal } from "@renderer/components/phonics/phonics-word-blending-modal";
import { Link } from "react-router-dom";
import {
  PhonemeFeedGame,
  PhonemeVoiceBalloonGame,
  PhonemeJellyBlendingGame,
} from "./game";
import { MoonSampleLevel } from "./golden-master";
import { PhaserLevel } from "./phaser";

// Wave 0: Phaser 引擎关卡控制集（回退时改回 MoonSampleLevel 只需清空或调整此集合）
const PHASER_LEVEL_IDS = new Set(["m", "s"]);

interface PhonicsIslandLevelModalProps {
  item: PhonicsAnchorItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLevelCompleted: (item: PhonicsAnchorItem) => void;
  masteryMap: Record<string, boolean>;
}

export const PhonicsIslandLevelModal: React.FC<PhonicsIslandLevelModalProps> = ({
  item,
  isOpen,
  onClose,
  onLevelCompleted,
  masteryMap,
}) => {
  if (!item) return null;

  // 闯关三部曲步骤: 1 = 听音磨耳, 2 = 麦克风跟读, 3 = 拼读小游戏, 4 = 通关盖章
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSuccess, setRecordingSuccess] = useState(false);
  const [tappedBlocks, setTappedBlocks] = useState<number[]>([]);
  const [isWordBlended, setIsWordBlended] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<IslandBadge | null>(null);
  const [practiceWords, setPracticeWords] = useState<PhonicsWord[]>([]);
  const [blendingWord, setBlendingWord] = useState<PhonicsWord | null>(null);

  const wordBlocks = getAnchorBlocks(item.anchorWord);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // 停止任何背景音频
  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    // 敢敢口播（含微软 TTS 音频）一并停掉
    stopGanganPrompt();
    setIsPlayingAudio(false);
  };

  // 重置状态并在打开时自动触发敢敢开场口播与听音磨耳
  useEffect(() => {
    if (isOpen && item) {
      setCurrentStep(1);
      setRecordingSuccess(false);
      setTappedBlocks([]);
      setIsWordBlended(false);
      setUnlockedBadge(null);
      setPracticeWords([]);

      // 预先拉取当前音素在 1236 词库中的关联练习词
      getDecodableWordsForIpaSlug(item.ipaSlug, 4).then((w) => setPracticeWords(w));

      // 敢敢开场口播：亲切温和，引导 3~6 岁孩子
      // 2026-10-26 入场欢迎词去除：缩短后只剩“听，m，moon！”，与随后音素＋单词读音完全重复；直接播音素＋单词
      const timer = setTimeout(() => {
        handlePlayPhonemeAndWord();
      }, 300);

      return () => {
        clearTimeout(timer);
        stopAllAudio();
      };
    }
  }, [isOpen, item?.id]);

  // 播放原声纯音素 + 锚定词
  const handlePlayPhonemeAndWord = () => {
    if (!item) return;
    stopAllAudio();
    setIsPlayingAudio(true);

    const cleanKey = cleanPhonemeKey(item.ipaSymbol);
    const audioFile =
      CLASSIC_3D_FILES[cleanKey] ||
      CLASSIC_3D_FILES[item.id] ||
      CLASSIC_3D_FILES[item.ipaSlug];

    if (audioFile) {
      const audio = new Audio(`/assets/phonetics-3d/audio/${audioFile}.mp3`);
      currentAudioRef.current = audio;
      audio.onended = () => {
        playStandardTts(item.anchorWord, {
          onEnd: () => {
            setIsPlayingAudio(false);
            currentAudioRef.current = null;
          },
        });
      };
      audio.onerror = () => {
        playStandardTts(item.anchorWord, {
          onEnd: () => setIsPlayingAudio(false),
        });
      };
      audio.play().catch(() => {
        playStandardTts(item.anchorWord, {
          onEnd: () => setIsPlayingAudio(false),
        });
      });
    } else {
      playPhonemeSound(item.ipaSymbol, {
        onEnd: () => {
          playStandardTts(item.anchorWord, {
            onEnd: () => setIsPlayingAudio(false),
          });
        },
      });
    }
  };

  // 模拟麦克风儿童友好跟读录音（大按钮，正向三星鼓励，0 数字挫败分）
  const handleToggleRecord = () => {
    if (isRecording) {
      // 提前停止
      finishRecording();
    } else {
      stopAllAudio();
      setIsRecording(true);
      phonicsAudioFx.playPop();

      // 录制 2.5 秒后自动收尾并打出闪耀三星
      recordingTimerRef.current = setTimeout(() => {
        finishRecording();
      }, 2500);
    }
  };

  const finishRecording = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSuccess(true);
    phonicsAudioFx.playSuccessChime();

    let transitioned = false;
    const advanceToStep3 = () => {
      if (transitioned) return;
      transitioned = true;
      setCurrentStep(3); // 自动迈向第三步拼积木
    };

    // 敢敢欢呼
    speakGanganPrompt("太棒啦！发音真清脆！小勇士，我们来拼积木吧！", {
      pitch: 1.3,
      onEnd: advanceToStep3,
    });

    // 2.2 秒兜底自动跳转第三步，避免部分浏览器无音频设备时挂起
    setTimeout(advanceToStep3, 2200);
  };

  // 拼读小积木点按
  const handleTapBlock = (index: number) => {
    phonicsAudioFx.playPop();
    const block = wordBlocks[index];
    playPhonemeSound(block.sound);

    if (!tappedBlocks.includes(index)) {
      const next = [...tappedBlocks, index];
      setTappedBlocks(next);

      // 全部拼搭完成
      if (next.length === wordBlocks.length) {
        setTimeout(() => {
          setIsWordBlended(true);
          phonicsAudioFx.playSuccessChime();

          let passed = false;
          const advanceToStamp = () => {
            if (passed) return;
            passed = true;
            triggerStampPass();
          };

          playStandardTts(item.anchorWord, {
            onEnd: () => {
              // 顺利通关，进入盖章环节
              setTimeout(advanceToStamp, 400);
            },
          });

          // 1.8 秒兜底进入盖章环节
          setTimeout(advanceToStamp, 1800);
        }, 500);
      }
    }
  };

  // 触发通关盖印与徽章结算
  const triggerStampPass = () => {
    setCurrentStep(4);
    phonicsAudioFx.playStampSound();
    onLevelCompleted(item);

    // 检查是否点亮了某个岛区的最后一个关卡并解锁徽章
    const updatedMap = { ...masteryMap, [item.id]: true, [item.ipaSlug]: true };
    const zoneItems = PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === item.zone);
    const isZoneComplete = zoneItems.every(
      (a) => updatedMap[a.id] || updatedMap[a.ipaSlug]
    );

    if (isZoneComplete) {
      const matchedBadge = PHONICS_ISLAND_BADGES.find((b) => b.zone === item.zone);
      if (matchedBadge) {
        setUnlockedBadge(matchedBadge);
        speakGanganPrompt(`哇！恭喜你集齐了${item.zoneName}的所有发音星！荣获${matchedBadge.name}勋章！`, {
          pitch: 1.3,
        });
      }
    }
  };

  // 下一关
  const handleNextLevel = () => {
    const nextOrder = item.order < 39 ? item.order + 1 : 1;
    const nextItem = PHONICS_ISLAND_39_ANCHORS.find((a) => a.order === nextOrder);
    if (nextItem) {
      stopAllAudio();
      onClose();
      setTimeout(() => {
        // 由父组件触发打开新关卡
        onLevelCompleted(nextItem);
      }, 100);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`p-0 overflow-hidden rounded-3xl ${
          PHASER_LEVEL_IDS.has(item.id) || item.id === "m" || item.anchorWord === "moon"
            ? "max-w-4xl sm:max-w-4xl border-0 bg-transparent shadow-none"
            : "max-w-lg border-2 border-amber-400/50 bg-gradient-to-b from-amber-500/10 via-background to-background shadow-2xl"
        }`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>自然拼读通关挑战舱 - 第 {item.order} 关</DialogTitle>
        </DialogHeader>

        {/* 🌟 若为样板关 (m / moon)：加载 Phaser 正式版沉浸舞台 */}
        {PHASER_LEVEL_IDS.has(item.id) ? (
          <PhaserLevel
            item={item}
            onClose={onClose}
            onLevelCompleted={onLevelCompleted}
            onNextLevel={handleNextLevel}
          />
        ) : item.id === "m" || item.anchorWord === "moon" ? (
          <MoonSampleLevel
            item={item}
            onClose={onClose}
            onLevelCompleted={onLevelCompleted}
            onNextLevel={handleNextLevel}
          />
        ) : (
          <>
            {/* 顶部通关站头部 */}
            <div className="relative px-6 py-4 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 border-b border-amber-300/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/gangan/gangan_official.png"
              alt="敢敢"
              className="size-11 rounded-2xl object-cover bg-amber-100 shadow-xs border-2 border-amber-300"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black font-mono text-amber-900 dark:text-amber-200 bg-amber-400/40 px-2 py-0.5 rounded-lg">
                  第 {String(item.order).padStart(2, "0")} 关
                </span>
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                  {item.zoneName}
                </Badge>
              </div>
              <h2 className="text-lg font-black text-foreground mt-0.5">
                字母 <span className="text-amber-600 dark:text-amber-400 text-xl font-mono">{item.letter}</span> 通关挑战
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

        {/* 游戏关卡四部曲指示器 */}
        <div className="px-5 py-2.5 bg-muted/40 border-b border-border/60 flex items-center justify-between text-xs font-bold">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
              currentStep === 1
                ? "text-amber-600 dark:text-amber-400 font-black scale-105"
                : currentStep > 1
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-muted-foreground"
            }`}
          >
            <span className="size-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">
              {currentStep > 1 ? "✓" : "1"}
            </span>
            <span>🍎 听音投喂</span>
          </button>
          <span className="text-muted-foreground/30">➔</span>
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
              currentStep === 2
                ? "text-amber-600 dark:text-amber-400 font-black scale-105"
                : currentStep > 2
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-muted-foreground"
            }`}
          >
            <span className="size-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">
              {currentStep > 2 ? "✓" : "2"}
            </span>
            <span>🎈 声能爆破</span>
          </button>
          <span className="text-muted-foreground/30">➔</span>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
              currentStep === 3
                ? "text-amber-600 dark:text-amber-400 font-black scale-105"
                : currentStep > 3
                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-muted-foreground"
            }`}
          >
            <span className="size-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px]">
              {currentStep > 3 ? "✓" : "3"}
            </span>
            <span>🧩 果冻拼读</span>
          </button>
        </div>

        {/* 核心互动关卡主体 */}
        <div className="p-5 max-h-[78vh] overflow-y-auto">
          {/* 关卡阶段 1：🍎 听音投喂马卡龙微游戏 */}
          {currentStep === 1 && (
            <PhonemeFeedGame
              targetItem={item}
              onSuccess={() => setCurrentStep(2)}
            />
          )}

          {/* 关卡阶段 2：🎈 声能大声喊 / 吹爆能量气球微游戏 */}
          {currentStep === 2 && (
            <PhonemeVoiceBalloonGame
              targetItem={item}
              onSuccess={() => setCurrentStep(3)}
            />
          )}

          {/* 关卡阶段 3：🧩 Q弹磁力果冻积木合词微游戏 */}
          {currentStep === 3 && (
            <PhonemeJellyBlendingGame
              targetItem={item}
              onSuccess={() => triggerStampPass()}
            />
          )}

          {/* 关卡阶段 4：通关盖章与荣耀时刻 */}
          {currentStep === 4 && (
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              {/* 金灿灿通关印章 */}
              <div className="size-32 rounded-full border-4 border-dashed border-amber-500 bg-amber-500/15 flex flex-col items-center justify-center text-amber-600 dark:text-amber-400 animate-in zoom-in-75 duration-300 shadow-xl shadow-amber-500/20 rotate-[-8deg]">
                <AwardIcon className="size-12 fill-current" />
                <span className="text-xs font-black font-mono mt-1">⭐ 通关盖印 ⭐</span>
                <span className="text-[10px] font-bold">字母 {item.letter}</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground">
                  🎉 恭喜通关第 {item.order} 关！
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  已点亮第 {item.order} 颗拼读通关星，能量星 +10 颗！
                </p>
              </div>

              {/* 若解锁全岛荣誉徽章 */}
              {unlockedBadge && (
                <div className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-400 flex items-center gap-3.5 shadow-md">
                  <span className="text-4xl">{unlockedBadge.icon}</span>
                  <div className="text-left space-y-0.5">
                    <div className="text-sm font-black text-foreground flex items-center gap-2">
                      <span>获得荣誉徽章 · {unlockedBadge.name}</span>
                      <Badge className="bg-amber-500 text-slate-950 font-black text-[9px]">
                        {unlockedBadge.badgeLevel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {unlockedBadge.description}
                    </p>
                  </div>
                </div>
              )}

              {/* 🚀 联动 1,236 拼读词库：通关后推荐对应拼读练习词 */}
              {practiceWords.length > 0 && (
                <div className="w-full p-3.5 sm:p-4 rounded-3xl bg-sky-500/10 border-2 border-sky-400/40 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black text-sm shadow-2xs">
                        🚀
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-foreground">
                          拼读趁热打铁 · 推荐解码词
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          用刚刚攻克的字母 <strong>{item.letter}</strong> 音，拼读 1,236 词库中的新单词！
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-sky-500/15 border-sky-400/50 text-sky-800 dark:text-sky-200 font-bold">
                      {practiceWords.length} 个新词
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {practiceWords.map((pw) => (
                      <div
                        key={pw.word}
                        className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900 flex flex-col justify-between hover:border-sky-400 transition-all shadow-2xs group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-sm text-foreground">
                            {pw.word}
                          </span>
                          <button
                            type="button"
                            title="播放读音"
                            onClick={(e) => {
                              e.stopPropagation();
                              playStandardTts(pw.word);
                            }}
                            className="size-6 rounded-full hover:bg-sky-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-sky-600 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Volume2Icon className="size-3.5" />
                          </button>
                        </div>

                        {pw.sounds && pw.sounds.length > 0 && (
                          <div className="flex items-center gap-1 my-1 text-[10px] font-mono text-muted-foreground font-semibold flex-wrap">
                            {pw.sounds.map((s, idx) => (
                              <span
                                key={idx}
                                className={`px-1 py-0.2 rounded ${
                                  s.toLowerCase() === item.letter.toLowerCase()
                                    ? "bg-amber-400/40 text-amber-950 dark:text-amber-200 font-black"
                                    : "bg-muted/70"
                                }`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        <Button
                          size="sm"
                          type="button"
                          onClick={() => setBlendingWord(pw)}
                          className="w-full h-7 rounded-xl text-[10px] font-black bg-sky-500 hover:bg-sky-600 text-white mt-1 gap-1 cursor-pointer"
                        >
                          <RocketIcon className="size-3" />
                          <span>火箭滑读</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 底部继续探险按钮 */}
              <div className="w-full flex gap-3 pt-2">
                <Button
                  size="lg"
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl border-2 border-border font-black text-xs cursor-pointer"
                >
                  <span>返回岛屿地图</span>
                </Button>

                <Button
                  size="lg"
                  type="button"
                  onClick={handleNextLevel}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-md shadow-amber-500/25 cursor-pointer"
                >
                  <span>挑战下一关 ➔</span>
                </Button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
      </DialogContent>

      {/* 🚀 1236 词库火箭滑读实验弹窗 */}
      <PhonicsWordBlendingModal
        word={blendingWord}
        open={Boolean(blendingWord)}
        onOpenChange={(open) => {
          if (!open) setBlendingWord(null);
        }}
      />
    </Dialog>
  );
};
