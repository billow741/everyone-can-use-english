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

  // 闯关测试状态
  const [quizPairIndex, setQuizPairIndex] = useState<number>(0);
  const [targetWordChoice, setTargetWordChoice] = useState<1 | 2>(1); // 1 = word1, 2 = word2
  const [userSelection, setUserSelection] = useState<1 | 2 | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalAnswered, setTotalAnswered] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [isQuizAudioPlaying, setIsQuizAudioPlaying] = useState<boolean>(false);

  // 初始化或切换音标时重置闯关题
  useEffect(() => {
    initRandomQuiz();
  }, [phoneme.id]);

  const initRandomQuiz = () => {
    if (!minimalPair.pairs.length) return;
    const randomIdx = Math.floor(Math.random() * minimalPair.pairs.length);
    const randomChoice: 1 | 2 = Math.random() > 0.5 ? 1 : 2;
    setQuizPairIndex(randomIdx);
    setTargetWordChoice(randomChoice);
    setUserSelection(null);
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

  // 下一题
  const handleNextQuizQuestion = () => {
    initRandomQuiz();
  };

  const currentQuizPair = minimalPair.pairs[quizPairIndex] || minimalPair.pairs[0];
  const targetWord = targetWordChoice === 1 ? currentQuizPair.word1 : currentQuizPair.word2;
  const targetIpa = targetWordChoice === 1 ? currentQuizPair.ipa1 : currentQuizPair.ipa2;

  return (
    <Card className={`rounded-3xl border-border bg-card shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 pb-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <span className="size-7 rounded-xl bg-purple-500 text-white flex items-center justify-center text-sm shadow-md shadow-purple-500/20">
                ⚖️
              </span>
              <span>{minimalPair.pairTitle}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              最小对立体（Minimal Pairs）辨音练习 · 彻底攻克国人易混发音难关
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlaybackSpeed((s) => (s === 1.0 ? 0.75 : 1.0))}
              className="h-7 px-2.5 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground"
              title="切换慢速辨音"
            >
              <SlidersIcon className="size-3" />
              <span>{playbackSpeed === 1.0 ? "原速 1.0x" : "慢速 0.75x"}</span>
            </Button>

            <Badge
              variant="outline"
              className="font-mono text-[11px] border-purple-500/30 text-purple-600 dark:text-purple-300"
            >
              {phoneme.symbol} vs {minimalPair.targetSymbol}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Tabs defaultValue="compare" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-sm mx-auto mb-4 p-1 rounded-2xl bg-muted/60">
            <TabsTrigger value="compare" className="rounded-xl text-xs font-bold py-1.5">
              双音对比精听
            </TabsTrigger>
            <TabsTrigger value="quiz" className="rounded-xl text-xs font-bold py-1.5 flex items-center gap-1.5">
              <span>听音辨词小闯关</span>
              {streak > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-ping inline-block" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: 双音对比精听 */}
          <TabsContent value="compare" className="space-y-3 m-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>点击卡片即可单听，或点击右侧按钮进行「A ➔ B 自动连播对比」：</span>
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
                    className="p-3 rounded-2xl bg-muted/30 border border-border/80 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* 对比单词栏 */}
                    <div className="flex items-center gap-2 flex-1">
                      {/* 词 1: 当前音标 */}
                      <button
                        type="button"
                        onClick={() => playWord(pair.word1)}
                        className={`flex-1 p-2 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isWord1Playing
                            ? "bg-amber-500/15 border-amber-500 shadow-sm ring-1 ring-amber-500/40"
                            : "bg-background/80 hover:bg-background border-border/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground font-mono">
                            {pair.word1}
                          </span>
                          <Volume2Icon
                            className={`size-3.5 ${
                              isWord1Playing
                                ? "text-amber-500 animate-pulse"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-mono mt-0.5 font-bold">
                          {pair.ipa1}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                          本课目标音 [{phoneme.symbol}]
                        </div>
                      </button>

                      {/* VS 分隔符 */}
                      <div className="flex flex-col items-center justify-center px-1">
                        <span className="text-[11px] font-black text-muted-foreground/60 italic tracking-wider">
                          VS
                        </span>
                      </div>

                      {/* 词 2: 对比音标 */}
                      <button
                        type="button"
                        onClick={() => playWord(pair.word2)}
                        className={`flex-1 p-2 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          isWord2Playing
                            ? "bg-purple-500/15 border-purple-500 shadow-sm ring-1 ring-purple-500/40"
                            : "bg-background/80 hover:bg-background border-border/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground font-mono">
                            {pair.word2}
                          </span>
                          <Volume2Icon
                            className={`size-3.5 ${
                              isWord2Playing
                                ? "text-purple-500 animate-pulse"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5 font-bold">
                          {pair.ipa2}
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                          对比辅/元音 [{minimalPair.targetSymbol}]
                        </div>
                      </button>
                    </div>

                    {/* A ➔ B 连播对比按钮 */}
                    <Button
                      size="sm"
                      variant={isComparingThis ? "default" : "outline"}
                      onClick={() => handlePlayPairCompare(pIdx)}
                      disabled={isComparingThis}
                      className={`h-9 px-3 rounded-xl text-xs gap-1.5 shrink-0 transition-all font-semibold ${
                        isComparingThis
                          ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                          : "border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                      }`}
                    >
                      {isComparingThis ? (
                        <>
                          <RotateCcwIcon className="size-3.5 animate-spin" />
                          <span>正在连播对比...</span>
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
          <TabsContent value="quiz" className="space-y-4 m-0">
            {/* 顶部计分牌与连胜指示器 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-indigo-500/10 border border-purple-500/20 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                  <FlameIcon className="size-4 fill-amber-500 text-amber-500" />
                  <span>当前连胜: {streak}</span>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  最佳: {bestStreak} | 答对率:{" "}
                  {totalAnswered > 0
                    ? `${Math.round((correctAnswers / totalAnswered) * 100)}%`
                    : "100%"}
                </div>
              </div>

              <Badge
                variant="outline"
                className="bg-background/80 border-purple-500/30 text-purple-600 dark:text-purple-300 font-mono text-[10px]"
              >
                盲听测验模式
              </Badge>
            </div>

            {/* 核心辨音试听播音机 */}
            <div className="p-6 rounded-3xl bg-muted/20 border border-border/80 flex flex-col items-center justify-center text-center space-y-4">
              <div className="size-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 relative group">
                <EarIcon className="size-8 group-hover:scale-110 transition-transform" />
                {isQuizAudioPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-black text-foreground">
                  你听到了下面哪一个单词？
                </h4>
                <p className="text-xs text-muted-foreground">
                  仔细辨别元音的长短闭合或辅音的发音部位
                </p>
              </div>

              {/* 播放 / 重播声音按钮 */}
              <Button
                onClick={playQuizTargetAudio}
                disabled={isQuizAudioPlaying}
                className="rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 h-auto text-xs shadow-md shadow-purple-500/20 gap-2 cursor-pointer"
              >
                <Volume2Icon className={`size-4 ${isQuizAudioPlaying ? "animate-bounce" : ""}`} />
                <span>{isQuizAudioPlaying ? "正在发音..." : "点击播音 (再听一次)"}</span>
              </Button>
            </div>

            {/* 选项按钮 (Option 1 vs Option 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: word1 */}
              {(() => {
                const isSelected = userSelection === 1;
                const isTarget = targetWordChoice === 1;
                let btnStyle = "bg-muted/40 hover:bg-muted/70 border-border/80 text-foreground";

                if (userSelection !== null) {
                  if (isTarget) {
                    btnStyle =
                      "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold";
                  } else if (isSelected) {
                    btnStyle =
                      "bg-rose-500/15 border-rose-500 ring-2 ring-rose-500/40 text-rose-700 dark:text-rose-300";
                  } else {
                    btnStyle = "opacity-40 border-border";
                  }
                }

                return (
                  <button
                    type="button"
                    disabled={userSelection !== null}
                    onClick={() => handleSelectAnswer(1)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <div>
                      <div className="font-bold text-base font-mono">{currentQuizPair.word1}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {currentQuizPair.ipa1}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                        包含 [{phoneme.symbol}]
                      </div>
                    </div>

                    {userSelection !== null && (
                      <div>
                        {isTarget ? (
                          <CheckCircle2Icon className="size-5 text-emerald-500" />
                        ) : isSelected ? (
                          <XCircleIcon className="size-5 text-rose-500" />
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
                let btnStyle = "bg-muted/40 hover:bg-muted/70 border-border/80 text-foreground";

                if (userSelection !== null) {
                  if (isTarget) {
                    btnStyle =
                      "bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold";
                  } else if (isSelected) {
                    btnStyle =
                      "bg-rose-500/15 border-rose-500 ring-2 ring-rose-500/40 text-rose-700 dark:text-rose-300";
                  } else {
                    btnStyle = "opacity-40 border-border";
                  }
                }

                return (
                  <button
                    type="button"
                    disabled={userSelection !== null}
                    onClick={() => handleSelectAnswer(2)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <div>
                      <div className="font-bold text-base font-mono">{currentQuizPair.word2}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {currentQuizPair.ipa2}
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                        包含 [{minimalPair.targetSymbol}]
                      </div>
                    </div>

                    {userSelection !== null && (
                      <div>
                        {isTarget ? (
                          <CheckCircle2Icon className="size-5 text-emerald-500" />
                        ) : isSelected ? (
                          <XCircleIcon className="size-5 text-rose-500" />
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
                className={`p-4 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-2 ${
                  userSelection === targetWordChoice
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
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
                    <p className="text-xs opacity-90 leading-relaxed">
                      {userSelection === targetWordChoice
                        ? `你精准识别出了 [${
                            targetWordChoice === 1 ? phoneme.symbol : minimalPair.targetSymbol
                          }] 的特征，听觉敏感度进一步提升！`
                        : `注意区分两者的口腔开合与舌位高度：本音标 [${phoneme.symbol}] 与对比音 [${minimalPair.targetSymbol}] 有显著的区别。`}
                    </p>
                  </div>

                  <Button
                    onClick={handleNextQuizQuestion}
                    className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shrink-0 shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    <span>下一题</span>
                    <ArrowRightIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
