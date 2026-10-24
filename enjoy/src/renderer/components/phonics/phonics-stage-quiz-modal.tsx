import React, { useState, useEffect, useRef } from "react";
import {
  XIcon,
  Volume2Icon,
  StarIcon,
  SparklesIcon,
  CheckCircle2Icon,
  AwardIcon,
  RotateCcwIcon,
  ArrowRightIcon,
  FlameIcon,
  HelpCircleIcon,
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
  PhonicsRouteStage,
  PhonicsQuizWord,
  findWeakestPhonemesForStage,
} from "@renderer/lib/phonics-route-config";
import {
  PHONICS_ISLAND_39_ANCHORS,
  PhonicsAnchorItem,
} from "@renderer/lib/phoneme-anchors";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import {
  phonicsAudioFx,
  speakGanganPrompt,
} from "@renderer/lib/phonics-audio-fx";

interface PhonicsStageQuizModalProps {
  stage: PhonicsRouteStage | null;
  isOpen: boolean;
  onClose: () => void;
  onPassed: (stageId: number, score: number) => void;
  onFailed: (stageId: number, score: number, weakestPhonemes: string[]) => void;
  onOpenPhonemeLevel: (item: PhonicsAnchorItem) => void;
}

export const PhonicsStageQuizModal: React.FC<PhonicsStageQuizModalProps> = ({
  stage,
  isOpen,
  onClose,
  onPassed,
  onFailed,
  onOpenPhonemeLevel,
}) => {
  if (!stage) return null;

  // 当前第几题 (0 ~ 4)
  const [currentIndex, setCurrentIndex] = useState(0);
  // 当前题孩子拼出的字母序列
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  // 5 道题的答题对错记录
  const [results, setResults] = useState<boolean[]>([]);
  // 错题索引集合
  const [wrongWordIndices, setWrongWordIndices] = useState<number[]>([]);
  // 判定状态 (用于按键后的动画)
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  // 是否全部 5 题完成
  const [isFinished, setIsFinished] = useState(false);
  // 正在播放音频
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  // 敢敢伴学口播
  const [ganganSpeech, setGanganSpeech] = useState("");

  const currentAudioRef = useRef<any>(null);

  const currentWord: PhonicsQuizWord | null = stage.quizWords[currentIndex] || null;

  // 停止音频
  const stopAllAudio = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsPlayingAudio(false);
  };

  // 重置测验状态并在打开时播报
  useEffect(() => {
    if (isOpen && stage) {
      setCurrentIndex(0);
      setInputLetters([]);
      setResults([]);
      setWrongWordIndices([]);
      setIsEvaluating(false);
      setIsAnswerCorrect(null);
      setIsFinished(false);

      const intro = `小勇士！欢迎来到${stage.name}${stage.title}！仔细听读音，按顺序拼出 5 个新单词，答对 4 词就能解锁下一阶段哦！`;
      setGanganSpeech(intro);

      const timer = setTimeout(() => {
        speakGanganPrompt(intro, {
          onEnd: () => {
            if (stage.quizWords[0]) {
              playWordAudio(stage.quizWords[0].word);
            }
          },
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        stopAllAudio();
      };
    }
  }, [isOpen, stage?.id]);

  // 播放当前单词纯读音（无字母提示，盲听）
  const playWordAudio = (word: string) => {
    stopAllAudio();
    setIsPlayingAudio(true);
    setGanganSpeech(`请仔细听单词发音，按顺序选出字母块拼出来！`);

    playStandardTts(word, {
      rate: "-15%", // 略放慢语速，贴合 3~6 岁听觉辨析
      onEnd: () => setIsPlayingAudio(false),
    });
  };

  // 点击待选字母块填入槽位
  const handleSelectLetter = (letter: string, blockIdx: number) => {
    if (isEvaluating || !currentWord) return;
    if (inputLetters.length >= currentWord.displayLetters.length) return;

    phonicsAudioFx.playPop();
    setInputLetters((prev) => [...prev, letter]);
  };

  // 点击已填入槽位撤回
  const handleRemoveLetter = (index: number) => {
    if (isEvaluating) return;
    phonicsAudioFx.playPop();
    setInputLetters((prev) => prev.filter((_, i) => i !== index));
  };

  // 提交当前拼词核验
  const handleSubmitWord = () => {
    if (isEvaluating || !currentWord) return;
    if (inputLetters.length === 0) return;

    setIsEvaluating(true);
    const spelled = inputLetters.join("").toLowerCase();
    const target = currentWord.word.toLowerCase();
    const isCorrect = spelled === target;

    setIsAnswerCorrect(isCorrect);

    if (isCorrect) {
      phonicsAudioFx.playSuccessChime();
      const praise = `太棒啦！拼对了单词 ${currentWord.word}！`;
      setGanganSpeech(praise);
      speakGanganPrompt(praise, { pitch: 1.2 });
    } else {
      phonicsAudioFx.playPop();
      const nextWrong = [...wrongWordIndices, currentIndex];
      setWrongWordIndices(nextWrong);
      const enc = `加油！这个词是 ${currentWord.word}，我们继续下一题！`;
      setGanganSpeech(enc);
      speakGanganPrompt(enc);
    }

    // 记录答题结果并进入下一题
    setTimeout(() => {
      const nextResults = [...results, isCorrect];
      setResults(nextResults);
      setIsEvaluating(false);
      setIsAnswerCorrect(null);
      setInputLetters([]);

      if (currentIndex + 1 < stage.quizWords.length) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        playWordAudio(stage.quizWords[nextIdx].word);
      } else {
        // 全部 5 题完成，结算
        setIsFinished(true);
        const finalScore = nextResults.filter(Boolean).length;
        if (finalScore >= 4) {
          phonicsAudioFx.playStampSound();
          const passedPrompt = `太神奇啦！你答对了 ${finalScore} 题，顺利通过${stage.name}测验！下一阶段已解锁！`;
          setGanganSpeech(passedPrompt);
          speakGanganPrompt(passedPrompt, { pitch: 1.3 });
          onPassed(stage.id, finalScore);
        } else {
          phonicsAudioFx.playPop();
          const wrongList = isCorrect ? wrongWordIndices : [...wrongWordIndices, currentIndex];
          const weakest2 = findWeakestPhonemesForStage(stage.id, wrongList);
          const failedPrompt = `别灰心！已经答对了 ${finalScore} 题！敢敢为你找到了需要重点回炉复习的 2 个发音宝贝，我们去复习一下吧！`;
          setGanganSpeech(failedPrompt);
          speakGanganPrompt(failedPrompt, { pitch: 1.1 });
          onFailed(stage.id, finalScore, weakest2);
        }
      }
    }, 1200);
  };

  // 计算最终得分与回炉弱项
  const score = results.filter(Boolean).length;
  const isPassed = score >= 4;
  const weakestPhonemeIds = isFinished && !isPassed
    ? findWeakestPhonemesForStage(stage.id, wrongWordIndices)
    : [];

  const weakestItems = weakestPhonemeIds
    .map((pid) => PHONICS_ISLAND_39_ANCHORS.find((a) => a.id === pid))
    .filter(Boolean) as PhonicsAnchorItem[];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/10 via-background to-background shadow-2xl select-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{stage.name} - {stage.title}</DialogTitle>
        </DialogHeader>

        {/* 顶部通关站头部 */}
        <div className="relative px-5 py-3.5 bg-gradient-to-r from-amber-500/25 via-purple-500/20 to-amber-500/25 border-b border-amber-300/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl shadow-xs border-2 border-amber-300">
              🦁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white font-black text-[10px]">
                  阶段盲拼解锁测验
                </Badge>
                <span className="text-xs font-black font-mono text-foreground">
                  {stage.name} · 共 5 题
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-foreground mt-0.5">
                {stage.title}
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

        {/* 测验进度指示灯 */}
        <div className="px-5 py-2.5 bg-muted/30 border-b border-border/60 flex items-center justify-between">
          <span className="text-xs font-black text-muted-foreground">
            测验进度：第 {Math.min(currentIndex + 1, 5)} / 5 题（答对 4 题及以上解锁下一阶段）
          </span>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3, 4].map((idx) => {
              const res = results[idx];
              return (
                <div
                  key={idx}
                  className={`size-3 rounded-full transition-all ${
                    res === true
                      ? "bg-emerald-500 scale-110 shadow-xs"
                      : res === false
                      ? "bg-rose-400 scale-110"
                      : idx === currentIndex && !isFinished
                      ? "bg-amber-500 ring-2 ring-amber-300 animate-pulse"
                      : "bg-muted-foreground/30"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 敢敢口播伴学条 */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-300/30 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-amber-950 dark:text-amber-200 line-clamp-1">
            🦁 敢敢老师：{ganganSpeech}
          </p>
          {currentWord && !isFinished && (
            <Button
              size="sm"
              onClick={() => playWordAudio(currentWord.word)}
              disabled={isPlayingAudio}
              className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <Volume2Icon className={`size-3.5 ${isPlayingAudio ? "animate-bounce" : ""}`} />
              <span>听发音</span>
            </Button>
          )}
        </div>

        {/* 测验主体交互区 */}
        <div className="p-6 min-h-[360px] flex flex-col items-center justify-center">
          {/* 测验结束：通过界面 */}
          {isFinished && isPassed && (
            <div className="flex flex-col items-center text-center space-y-4 py-2 animate-in zoom-in-75 duration-300">
              <div className="size-28 rounded-full border-4 border-dashed border-emerald-500 bg-emerald-500/20 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/20">
                <AwardIcon className="size-12 fill-current" />
                <span className="text-xs font-black font-mono mt-1">⭐ 出关达标 ⭐</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground">
                  🎉 恭喜小勇士！顺利通过{stage.name}测验！
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  盲拼新词全过关，下一阶段全新探险路线已为你敞开！
                </p>
              </div>

              {/* 三星鼓励 */}
              <div className="flex items-center gap-2">
                <StarIcon className="size-7 fill-amber-400 text-amber-500 animate-bounce" />
                <StarIcon className="size-9 fill-amber-400 text-amber-500 animate-bounce delay-100" />
                <StarIcon className="size-7 fill-amber-400 text-amber-500 animate-bounce delay-200" />
              </div>

              <Button
                onClick={onClose}
                className="h-11 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <SparklesIcon className="size-4" />
                <span>点亮新阶段 · 继续探险</span>
              </Button>
            </div>
          )}

          {/* 测验结束：未达标回炉界面 */}
          {isFinished && !isPassed && (
            <div className="w-full flex flex-col items-center text-center space-y-4 py-2 animate-in zoom-in-75 duration-300">
              <div className="size-24 rounded-full border-4 border-dashed border-amber-500 bg-amber-500/20 flex flex-col items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg">
                <FlameIcon className="size-10 fill-current" />
                <span className="text-xs font-black font-mono mt-0.5">精准备考</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-foreground">
                  别灰心！已经很棒啦！
                </h3>
                <p className="text-xs text-muted-foreground font-semibold max-w-md">
                  无需重学整段！系统已根据错题，为你精确定位到本阶段最需要回炉的 <strong>2 个发音宝贝</strong>：
                </p>
              </div>

              {/* 回炉 2 个目标音素卡片 */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                {weakestItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-3xl border-2 border-amber-400 bg-amber-500/10 flex flex-col items-center text-center shadow-xs"
                  >
                    <div className="size-16 rounded-2xl bg-white/80 dark:bg-slate-900/80 p-2 flex items-center justify-center mb-2 shadow-inner">
                      <img
                        src={item.imageUrl}
                        alt={item.anchorWord}
                        className="w-full h-full object-contain filter drop-shadow-xs"
                      />
                    </div>
                    <span className="text-2xl font-black font-sans text-foreground">
                      {item.letter}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground mt-0.5">
                      {item.anchorWord} · {item.anchorZh}
                    </span>

                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        onOpenPhonemeLevel(item);
                      }}
                      className="w-full mt-3 h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1 cursor-pointer"
                    >
                      <RotateCcwIcon className="size-3" />
                      <span>立即回炉复习</span>
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl font-black text-xs cursor-pointer"
                >
                  稍后回炉
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // 重新挑战测验
                    setCurrentIndex(0);
                    setInputLetters([]);
                    setResults([]);
                    setWrongWordIndices([]);
                    setIsFinished(false);
                    if (stage.quizWords[0]) {
                      playWordAudio(stage.quizWords[0].word);
                    }
                  }}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 cursor-pointer"
                >
                  <RotateCcwIcon className="size-3.5" />
                  <span>重新挑战测验</span>
                </Button>
              </div>
            </div>
          )}

          {/* 测验进行中：盲拼题面 */}
          {!isFinished && currentWord && (
            <div className="w-full flex flex-col items-center space-y-6">
              {/* 大喇叭听音盲盒 */}
              <div className="flex flex-col items-center text-center space-y-2">
                <button
                  type="button"
                  onClick={() => playWordAudio(currentWord.word)}
                  disabled={isPlayingAudio}
                  className="size-24 rounded-full bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-transform cursor-pointer border-4 border-white/80 dark:border-slate-800"
                >
                  <Volume2Icon className={`size-11 ${isPlayingAudio ? "animate-bounce" : ""}`} />
                </button>
                <p className="text-xs text-muted-foreground font-semibold">
                  点击大喇叭听单词读音（不给字母提示哦）
                </p>
              </div>

              {/* 待拼出的空白字母卡槽 */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                {currentWord.displayLetters.map((_, slotIdx) => {
                  const letter = inputLetters[slotIdx];
                  return (
                    <button
                      key={slotIdx}
                      type="button"
                      onClick={() => letter && handleRemoveLetter(slotIdx)}
                      className={`size-14 sm:size-16 rounded-2xl border-2 flex items-center justify-center text-2xl sm:text-3xl font-black font-sans transition-all cursor-pointer ${
                        letter
                          ? isAnswerCorrect === true
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 scale-105"
                            : isAnswerCorrect === false
                            ? "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 animate-shake"
                            : "bg-amber-500/15 border-amber-400 text-foreground hover:bg-amber-500/25"
                          : "bg-muted/40 border-dashed border-border text-muted-foreground/30"
                      }`}
                    >
                      {letter || ""}
                    </button>
                  );
                })}
              </div>

              {/* 乱序备选字母块（供点击选择） */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {currentWord.scrambledLetters.map((letter, bIdx) => {
                  // 计算该字母当前已被使用的次数
                  const usedCount = inputLetters.filter((l) => l === letter).length;
                  const totalInScrambled = currentWord.scrambledLetters.filter((l) => l === letter).length;
                  const isUsed = usedCount >= totalInScrambled;

                  return (
                    <button
                      key={bIdx}
                      type="button"
                      disabled={isUsed || isEvaluating}
                      onClick={() => handleSelectLetter(letter, bIdx)}
                      className={`size-13 sm:size-14 rounded-2xl border-2 flex items-center justify-center text-xl sm:text-2xl font-black font-sans shadow-md transition-all active:scale-90 ${
                        isUsed
                          ? "bg-muted/30 border-border text-muted-foreground/30 pointer-events-none"
                          : "bg-gradient-to-b from-sky-400 to-blue-500 text-white border-sky-300 hover:scale-110 cursor-pointer shadow-sky-500/20"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>

              {/* 确认拼好按钮 */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInputLetters([])}
                  disabled={inputLetters.length === 0 || isEvaluating}
                  className="rounded-xl font-bold text-xs cursor-pointer"
                >
                  <RotateCcwIcon className="size-3 mr-1" />
                  <span>清空重选</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleSubmitWord}
                  disabled={inputLetters.length === 0 || isEvaluating}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-sm shadow-amber-500/25 cursor-pointer"
                >
                  <SparklesIcon className="size-3.5" />
                  <span>拼好啦！提交核验</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
