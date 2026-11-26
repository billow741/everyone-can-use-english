import React, { useState, useEffect, useRef } from "react";
import {
  Volume2Icon,
  SparklesIcon,
  PlayIcon,
  RotateCcwIcon,
  CheckCircle2Icon,
  XCircleIcon,
  FlameIcon,
  AwardIcon,
  TrophyIcon,
  ArrowRightIcon,
  HelpCircleIcon,
  SlidersIcon,
  EarIcon,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@renderer/components/ui";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import { PhonemeItem } from "@renderer/lib/phoneme-data";

interface MinimalPairsChallengeProps {
  phoneme: PhonemeItem;
  className?: string;
}

// 纯 Web Audio API 合成音效（无需外部音频文件）
function playChime(isSuccess: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      // 成功欢快三连音 (C5 -> E5 -> G5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // 失败温和提示音 (A3 -> F3)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(174.61, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.warn("Audio chime failed:", err);
  }
}

export const MinimalPairsChallenge: React.FC<MinimalPairsChallengeProps> = ({
  phoneme,
  className = "",
}) => {
  const minimalPair = phoneme.minimalPair;
  if (!minimalPair || !minimalPair.pairs || minimalPair.pairs.length === 0) {
    return null;
  }

  // 播放与对比状态
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [isComparingPairIdx, setIsComparingPairIdx] = useState<number | null>(null);
  const [activePlaybackToken, setActivePlaybackToken] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // 闯关测试状态（一局定额题数，局末结算，不无限循环计分）
  const QUIZ_TOTAL = 10;
  const [quizPhase, setQuizPhase] = useState<"ready" | "playing" | "finished">("ready");
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [quizPairIndex, setQuizPairIndex] = useState<number>(0);
  const [targetWordChoice, setTargetWordChoice] = useState<1 | 2>(1); // 1 = word1, 2 = word2
  const [userSelection, setUserSelection] = useState<1 | 2 | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [isQuizAudioPlaying, setIsQuizAudioPlaying] = useState<boolean>(false);

  // 切换音标时回到开始界面，分数清零
  useEffect(() => {
    setQuizPhase("ready");
    setQuestionNumber(1);
    setStreak(0);
    setBestStreak(0);
    setTotalAnswered(0);
    setCorrectAnswers(0);
    setUserSelection(null);
  }, [phoneme.id]);

  // 抽一题（尽量不与上一题重复），返回目标词供自动播放
  const dealQuestion = (excludeIdx?: number): string | null => {
    if (!minimalPair.pairs.length) return null;
    let randomIdx = Math.floor(Math.random() * minimalPair.pairs.length);
    if (minimalPair.pairs.length > 1 && excludeIdx !== undefined) {
      while (randomIdx === excludeIdx) {
        randomIdx = Math.floor(Math.random() * minimalPair.pairs.length);
      }
    }
    const randomChoice: 1 | 2 = Math.random() > 0.5 ? 1 : 2;
    setQuizPairIndex(randomIdx);
    setTargetWordChoice(randomChoice);
    setUserSelection(null);
    const pair = minimalPair.pairs[randomIdx];
    return randomChoice === 1 ? pair.word1 : pair.word2;
  };

  // 直接播放指定词（每回合开始自动播放用）
  const playWordDirect = async (word: string) => {
    setIsQuizAudioPlaying(true);
    try {
      await playStandardTts(word, { rate: playbackSpeed });
    } catch (e) {
      console.warn("Quiz audio error:", e);
    } finally {
      setIsQuizAudioPlaying(false);
    }
  };

  const autoPlaySoon = (word: string | null) => {
    if (!word) return;
    window.setTimeout(() => {
      void playWordDirect(word);
    }, 350);
  };

  // 开始一局：计分清零、发第一题并自动播放
  const handleStartGame = () => {
    setStreak(0);
    setBestStreak(0);
    setTotalAnswered(0);
    setCorrectAnswers(0);
    setQuestionNumber(1);
    setQuizPhase("playing");
    autoPlaySoon(dealQuestion());
  };

  // 播放单词
  const playWord = async (word: string) => {
    setPlayingWord(word);
    try {
      await playStandardTts(word, { rate: playbackSpeed });
    } catch (e) {
      console.warn("TTS play failed:", e);
    } finally {
      setPlayingWord((curr) => (curr === word ? null : curr));
    }
  };

  // A -> B 自动对比连播
  const handlePlayPairCompare = async (pairIdx: number) => {
    const pair = minimalPair.pairs[pairIdx];
    if (!pair) return;

    const token = `${pairIdx}-${Date.now()}`;
    setActivePlaybackToken(token);
    setIsComparingPairIdx(pairIdx);

    try {
      // 1. 播放 word1 (当前音标)
      setPlayingWord(pair.word1);
      await playStandardTts(pair.word1, { rate: playbackSpeed });
      setPlayingWord(null);

      // 2. 停顿 500ms
      await new Promise((res) => setTimeout(res, 500));

      // 3. 播放 word2 (对比音标)
      setPlayingWord(pair.word2);
      await playStandardTts(pair.word2, { rate: playbackSpeed });
      setPlayingWord(null);
    } catch (err) {
      console.warn("Pair compare playback interrupted:", err);
    } finally {
      setIsComparingPairIdx(null);
      setPlayingWord(null);
      setActivePlaybackToken(null);
    }
  };

  // 播放闯关目标词
  const playQuizTargetAudio = async () => {
    const currentPair = minimalPair.pairs[quizPairIndex];
    if (!currentPair) return;
    const wordToPlay = targetWordChoice === 1 ? currentPair.word1 : currentPair.word2;

    setIsQuizAudioPlaying(true);
    try {
      await playStandardTts(wordToPlay, { rate: playbackSpeed });
    } catch (e) {
      console.warn("Quiz audio error:", e);
    } finally {
      setIsQuizAudioPlaying(false);
    }
  };

  // 提交闯关答案
  const handleSelectAnswer = (choice: 1 | 2) => {
    if (userSelection !== null) return; // 已作答

    setUserSelection(choice);
    const isCorrect = choice === targetWordChoice;
    setTotalAnswered((prev) => prev + 1);

    if (isCorrect) {
      playChime(true);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setCorrectAnswers((prev) => prev + 1);
    } else {
      playChime(false);
      setStreak(0);
    }
  };

  // 下一题（自动播放新题）；已是最后一题时进入结算
  const handleNextQuizQuestion = () => {
    if (questionNumber >= QUIZ_TOTAL) {
      setQuizPhase("finished");
      return;
    }
    setQuestionNumber((n) => n + 1);
    autoPlaySoon(dealQuestion(quizPairIndex));
  };

  const currentQuizPair = minimalPair.pairs[quizPairIndex] || minimalPair.pairs[0];
  const targetWord = targetWordChoice === 1 ? currentQuizPair.word1 : currentQuizPair.word2;
  const targetIpa = targetWordChoice === 1 ? currentQuizPair.ipa1 : currentQuizPair.ipa2;

  return (
    <Card className={`rounded-[20px] border-[#D3E4DE] bg-white dark:bg-card shadow-none overflow-hidden ${className}`}>
      <CardHeader className="bg-[#E7F2EF]/60 dark:bg-slate-900/50 pb-3 border-b border-[#D3E4DE]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-black flex items-center gap-2 text-[#123B3C] dark:text-foreground">
              <span className="size-7 rounded-[10px] bg-[#0F7B7A] text-white flex items-center justify-center text-sm shadow-xs">
                ⚖️
              </span>
              <span>{minimalPair.pairTitle}</span>
            </CardTitle>
            <p className="text-xs text-[#4E6B69] dark:text-muted-foreground">
              易混音对比辨音练习
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlaybackSpeed((s) => (s === 1.0 ? 0.75 : 1.0))}
              className="min-h-[44px] px-3.5 text-xs rounded-[12px] gap-1.5 border-[#D3E4DE] bg-white text-[#123B3C] hover:bg-[#E7F2EF]"
              title="切换慢速辨音"
            >
              <SlidersIcon className="size-3.5 text-[#0F7B7A]" />
              <span>{playbackSpeed === 1.0 ? "原速 1.0x" : "慢速 0.75x"}</span>
            </Button>

            <Badge
              variant="outline"
              className="font-mono text-xs border-[#D3E4DE] bg-white text-[#0A5E5D] dark:text-emerald-300 px-3 py-1.5"
            >
              {phoneme.symbol} vs {minimalPair.targetSymbol}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs defaultValue="compare" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-sm mx-auto mb-3 p-1 h-auto rounded-[14px] bg-[#E7F2EF]">
            <TabsTrigger value="compare" className="min-h-[44px] rounded-[10px] text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-[#0A5E5D]">
              双音对比精听
            </TabsTrigger>
            <TabsTrigger value="quiz" className="min-h-[44px] rounded-[10px] text-xs font-bold py-2 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-[#0A5E5D]">
              <span>听音辨词小闯关</span>
              {streak > 0 && (
                <span className="size-2 rounded-full bg-[#F2A93B] inline-block" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: 双音对比精听 */}
          <TabsContent value="compare" className="space-y-3 m-0">
            <div className="flex items-center justify-between text-xs text-[#4E6B69] px-1 gap-2 flex-wrap">
              <span>点击卡片单听，或点击「连播对比」对比发音：</span>
              <span className="text-[11px] font-mono">共 {minimalPair.pairs.length} 组高频词</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {minimalPair.pairs.map((pair, pIdx) => {
                const isComparingThis = isComparingPairIdx === pIdx;
                const isWord1Playing = playingWord === pair.word1;
                const isWord2Playing = playingWord === pair.word2;

                return (
                  <div
                    key={pIdx}
                    className="p-3 rounded-[14px] bg-[#F3FAF8] border border-[#D3E4DE] hover:border-[#0F7B7A]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* 对比单词栏 */}
                    <div className="flex items-center gap-2 flex-1">
                      {/* 词 1: 当前音标 */}
                      <button
                        type="button"
                        onClick={() => playWord(pair.word1)}
                        className={`flex-1 min-h-[44px] p-2.5 rounded-[12px] border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isWord1Playing
                            ? "bg-[#F2A93B]/20 border-[#96690A]"
                            : "bg-white hover:bg-[#E7F2EF]/50 border-[#D3E4DE]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#123B3C] font-mono">
                            {pair.word1}
                          </span>
                          <Volume2Icon
                            className={`size-3.5 ${
                              isWord1Playing
                                ? "text-[#96690A] animate-pulse"
                                : "text-[#4E6B69]"
                            }`}
                          />
                        </div>
                        <div className="text-xs text-[#96690A] font-mono mt-0.5 font-bold">
                          {pair.ipa1}
                        </div>
                        <div className="text-[10px] text-[#4E6B69] mt-0.5">
                          目标音 {phoneme.symbol}
                        </div>
                      </button>

                      {/* VS 分隔符 */}
                      <div className="flex flex-col items-center justify-center px-1">
                        <span className="text-[11px] font-black text-[#4E6B69] italic tracking-wider">
                          VS
                        </span>
                      </div>

                      {/* 词 2: 对比音标 */}
                      <button
                        type="button"
                        onClick={() => playWord(pair.word2)}
                        className={`flex-1 min-h-[44px] p-2.5 rounded-[12px] border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isWord2Playing
                            ? "bg-[#E7F2EF] border-[#0F7B7A]"
                            : "bg-white hover:bg-[#E7F2EF]/50 border-[#D3E4DE]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#123B3C] font-mono">
                            {pair.word2}
                          </span>
                          <Volume2Icon
                            className={`size-3.5 ${
                              isWord2Playing
                                ? "text-[#0F7B7A] animate-pulse"
                                : "text-[#4E6B69]"
                            }`}
                          />
                        </div>
                        <div className="text-xs text-[#0A5E5D] font-mono mt-0.5 font-bold">
                          {pair.ipa2}
                        </div>
                        <div className="text-[10px] text-[#4E6B69] mt-0.5">
                          对比音 {minimalPair.targetSymbol}
                        </div>
                      </button>
                    </div>

                    {/* A ➔ B 连播对比按钮 */}
                    <Button
                      size="sm"
                      variant={isComparingThis ? "default" : "outline"}
                      onClick={() => handlePlayPairCompare(pIdx)}
                      disabled={isComparingThis}
                      className={`min-h-[44px] px-3.5 rounded-[12px] text-xs gap-1.5 shrink-0 transition-all font-bold ${
                        isComparingThis
                          ? "bg-[#0F7B7A] text-white"
                          : "border-[#D3E4DE] bg-white text-[#0A5E5D] hover:bg-[#E7F2EF]"
                      }`}
                    >
                      {isComparingThis ? (
                        <>
                          <RotateCcwIcon className="size-3.5 animate-spin" />
                          <span>连播对比中...</span>
                        </>
                      ) : (
                        <>
                          <PlayIcon className="size-3.5 fill-current" />
                          <span>连播对比</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: 听音辨词小闯关 (Blind Listening Quiz) */}
          <TabsContent value="quiz" className="space-y-3 m-0">
            {quizPhase === "ready" && (
              <div className="p-8 rounded-[20px] bg-[#F3FAF8] border border-[#D3E4DE] flex flex-col items-center justify-center text-center space-y-4">
                <div className="size-16 rounded-[14px] bg-[#0F7B7A] text-white flex items-center justify-center shadow-xs">
                  <EarIcon className="size-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-[#123B3C]">听音辨词小闯关</h4>
                  <p className="text-xs text-[#4E6B69]">
                    一局 {QUIZ_TOTAL} 题 · 每题开始自动播音，听完选出你听到的单词
                  </p>
                </div>
                <Button
                  onClick={handleStartGame}
                  className="min-h-[44px] rounded-[14px] bg-[#F2A93B] hover:bg-[#D69128] text-[#123B3C] font-black px-8 py-3 h-auto text-sm shadow-xs gap-2 cursor-pointer"
                >
                  <PlayIcon className="size-4 fill-current" />
                  <span>开始闯关</span>
                </Button>
              </div>
            )}

            {quizPhase === "finished" && (
              <div className="p-8 rounded-[20px] bg-[#E7F2EF] border border-[#D3E4DE] flex flex-col items-center justify-center text-center space-y-4">
                <div className="size-16 rounded-[14px] bg-[#F2A93B] text-[#123B3C] flex items-center justify-center shadow-xs">
                  <TrophyIcon className="size-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-[#123B3C]">闯关完成！</h4>
                  <p className="text-xs text-[#4E6B69]">
                    本局答对 {correctAnswers} / {QUIZ_TOTAL} 题 · 答对率{" "}
                    {totalAnswered > 0
                      ? `${Math.round((correctAnswers / totalAnswered) * 100)}%`
                      : "100%"}{" "}
                    · 最高连胜 {bestStreak}
                  </p>
                </div>
                <Button
                  onClick={handleStartGame}
                  className="min-h-[44px] rounded-[14px] bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white font-bold px-8 py-3 h-auto text-sm shadow-xs gap-2 cursor-pointer"
                >
                  <RotateCcwIcon className="size-4" />
                  <span>再来一局</span>
                </Button>
              </div>
            )}

            {quizPhase === "playing" && (
              <>
            {/* 顶部计分牌与连胜指示器 */}
            <div className="flex items-center justify-between px-3 py-2 rounded-[14px] bg-[#E7F2EF] border border-[#D3E4DE] text-xs gap-2 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 text-[#96690A] font-bold">
                  <FlameIcon className="size-4 fill-[#F2A93B] text-[#96690A]" />
                  <span>当前连胜: {streak}</span>
                </div>
                <div className="text-[#4E6B69] text-[11px]">
                  第 {questionNumber} / {QUIZ_TOTAL} 题 | 已答对: {correctAnswers} | 答对率:{" "}
                  {totalAnswered > 0
                    ? `${Math.round((correctAnswers / totalAnswered) * 100)}%`
                    : "100%"}
                </div>
              </div>

              <Badge
                variant="outline"
                className="bg-white border-[#D3E4DE] text-[#0A5E5D] font-mono text-[10px]"
              >
                盲听测验模式
              </Badge>
            </div>

            {/* 核心辨音试听播音机 */}
            <div className="px-4 py-3.5 rounded-[14px] bg-[#F3FAF8] border border-[#D3E4DE] flex items-center gap-4">
              <div className="size-11 rounded-[12px] bg-[#0F7B7A] text-white flex items-center justify-center relative shrink-0">
                <EarIcon className="size-6" />
                {isQuizAudioPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-[#123B3C]">
                  你听到了下面哪一个单词？
                </h4>
                <p className="text-xs text-[#4E6B69] mt-0.5">
                  仔细辨别元音长短或辅音发音
                </p>
              </div>

              <Button
                onClick={playQuizTargetAudio}
                disabled={isQuizAudioPlaying}
                className="min-h-[44px] rounded-full bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white font-bold px-5 py-2.5 h-auto text-xs gap-2 cursor-pointer shrink-0"
              >
                <Volume2Icon className={`size-4 ${isQuizAudioPlaying ? "animate-bounce" : ""}`} />
                <span>{isQuizAudioPlaying ? "正在发音..." : "再听一次"}</span>
              </Button>
            </div>

            {/* 选项按钮 (Option 1 vs Option 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: word1 */}
              {(() => {
                const isSelected = userSelection === 1;
                const isTarget = targetWordChoice === 1;
                let btnStyle = "bg-white hover:bg-[#E7F2EF]/60 border-[#D3E4DE] text-[#123B3C]";

                if (userSelection !== null) {
                  if (isTarget) {
                    btnStyle =
                      "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-800 font-bold";
                  } else if (isSelected) {
                    btnStyle =
                      "bg-rose-500/15 border-rose-500 ring-2 ring-rose-500/40 text-rose-800";
                  } else {
                    btnStyle = "opacity-40 border-[#D3E4DE]";
                  }
                }

                return (
                  <button
                    type="button"
                    disabled={userSelection !== null}
                    onClick={() => handleSelectAnswer(1)}
                    className={`min-h-[56px] px-4 py-3 rounded-[14px] border text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <div>
                      <div className="font-bold text-base font-mono">{currentQuizPair.word1}</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xs text-[#4E6B69] font-mono">
                          {currentQuizPair.ipa1}
                        </span>
                        <span className="text-[10px] text-[#96690A] font-bold">
                          包含 {phoneme.symbol}
                        </span>
                      </div>
                    </div>

                    {userSelection !== null && (
                      <div>
                        {isTarget ? (
                          <CheckCircle2Icon className="size-5 text-emerald-600" />
                        ) : isSelected ? (
                          <XCircleIcon className="size-5 text-rose-600" />
                        ) : null}
                      </div>
                    )}
                  </button>
                );
              })()}

              {/* Option 2: word2 */}
              {(() => {
                const isSelected = userSelection === 2;
                const isTarget = targetWordChoice === 2;
                let btnStyle = "bg-white hover:bg-[#E7F2EF]/60 border-[#D3E4DE] text-[#123B3C]";

                if (userSelection !== null) {
                  if (isTarget) {
                    btnStyle =
                      "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-800 font-bold";
                  } else if (isSelected) {
                    btnStyle =
                      "bg-rose-500/15 border-rose-500 ring-2 ring-rose-500/40 text-rose-800";
                  } else {
                    btnStyle = "opacity-40 border-[#D3E4DE]";
                  }
                }

                return (
                  <button
                    type="button"
                    disabled={userSelection !== null}
                    onClick={() => handleSelectAnswer(2)}
                    className={`min-h-[56px] px-4 py-3 rounded-[14px] border text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <div>
                      <div className="font-bold text-base font-mono">{currentQuizPair.word2}</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xs text-[#4E6B69] font-mono">
                          {currentQuizPair.ipa2}
                        </span>
                        <span className="text-[10px] text-[#0A5E5D] font-bold">
                          包含 {minimalPair.targetSymbol}
                        </span>
                      </div>
                    </div>

                    {userSelection !== null && (
                      <div>
                        {isTarget ? (
                          <CheckCircle2Icon className="size-5 text-emerald-600" />
                        ) : isSelected ? (
                          <XCircleIcon className="size-5 text-rose-600" />
                        ) : null}
                      </div>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* 作答反馈与下一题导航 */}
            {userSelection !== null && (
              <div
                className={`px-3.5 py-3 rounded-[14px] border transition-all animate-in fade-in slide-in-from-bottom-2 ${
                  userSelection === targetWordChoice
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800"
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
                    <div className="font-black text-sm flex items-center gap-1.5">
                      {userSelection === targetWordChoice ? (
                        <>
                          <CheckCircle2Icon className="size-4 text-emerald-600" />
                          <span>太棒了！辨音正确！</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="size-4 text-rose-600" />
                          <span>答错了，正确单词是「{targetWord}」{targetIpa}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs opacity-90">
                      {userSelection === targetWordChoice
                        ? `你精准识别出了 ${
                            targetWordChoice === 1 ? phoneme.symbol : minimalPair.targetSymbol
                          } 的发音特征！`
                        : `注意区分本音标 ${phoneme.symbol} 与对比音 ${minimalPair.targetSymbol} 的差别。`}
                    </p>
                  </div>

                  <Button
                    onClick={handleNextQuizQuestion}
                    className="min-h-[44px] rounded-[12px] bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white font-bold text-xs px-4 gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>{questionNumber >= QUIZ_TOTAL ? "查看成绩" : "下一题"}</span>
                    <ArrowRightIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
