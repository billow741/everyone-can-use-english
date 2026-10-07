import React, { useState } from "react";
import {
  Volume2Icon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  SparklesIcon,
  HelpCircleIcon,
  RepeatIcon,
  PlayIcon,
  FlameIcon,
  Share2Icon,
  CopyIcon,
  CheckIcon,
  AwardIcon,
  XIcon,
} from "lucide-react";
import { Button, Badge, toast } from "@renderer/components/ui";
import {
  getPhonemeCoach,
  getWordPhonetics,
  playStandardTts,
} from "@renderer/lib/phonetics-coach";

export const PronunciationDiagnosticDetail = (props: {
  words?: any[];
  referenceText?: string;
  recordingSrc?: string;
  className?: string;
}) => {
  const { words = [], referenceText = "", recordingSrc, className = "" } = props;
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [playingSlowWord, setPlayingSlowWord] = useState<string | null>(null);
  const [playingMyAudio, setPlayingMyAudio] = useState<string | null>(null);
  const [playingSentence, setPlayingSentence] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. 结构化分析所有单词的发音状况与具体出错音素
  const analyzedWords = words.map((item) => {
    const rawWord = item.word || "";
    const cleanWord = rawWord.toLowerCase().replace(/[^a-z]/g, "");
    const accuracy =
      item.pronunciationAssessment?.accuracyScore ??
      item.accuracyScore ??
      85;
    const errorType =
      item.pronunciationAssessment?.errorType ||
      item.errorType ||
      "None";

    const dictData = getWordPhonetics(cleanWord);

    // 提取或生成音素数据
    let phonemes: Array<{
      phoneme: string;
      score: number;
      isError: boolean;
      guide: any;
    }> = [];

    if (item.phonemes && Array.isArray(item.phonemes) && item.phonemes.length > 0) {
      phonemes = item.phonemes.map((p: any) => {
        const pScore =
          p.pronunciationAssessment?.accuracyScore ??
          p.accuracyScore ??
          accuracy;
        const isError = pScore < 75;
        return {
          phoneme: p.phoneme,
          score: pScore,
          isError,
          guide: getPhonemeCoach(p.phoneme),
        };
      });
    } else {
      // 若原始结果中未包含逐音素切片，采用词典音标智能映射
      phonemes = dictData.phonemes.map((dp, idx) => {
        // 如果单词得分偏低，把核心元音或辅音标记为需要纠偏的音素
        const isKey = dp.isKeyVowel || idx === 1;
        const pScore = isKey && accuracy < 80 ? Math.max(50, accuracy - 15) : accuracy;
        const isError = pScore < 75 || errorType !== "None";
        return {
          phoneme: dp.phoneme,
          score: pScore,
          isError,
          guide: getPhonemeCoach(dp.phoneme),
        };
      });
    }

    const wrongPhonemes = phonemes.filter((p) => p.isError);
    const hasIssue =
      accuracy < 80 || errorType !== "None" || wrongPhonemes.length > 0;

    return {
      word: rawWord,
      cleanWord,
      accuracy,
      errorType,
      phonemes,
      wrongPhonemes,
      hasIssue,
      ipa: dictData.ipa,
      translation: dictData.translation,
      coachingHint: dictData.coachingHint,
      offset: item.offset,
      duration: item.duration,
    };
  });

  const issueWords = analyzedWords.filter((w) => w.hasIssue);
  const excellentWords = analyzedWords.filter((w) => !w.hasIssue);

  // 播放标准 TTS 示范
  const handlePlayTts = async (text: string, isSlow: boolean = false) => {
    if (isSlow) {
      setPlayingSlowWord(text);
      await playStandardTts(text, {
        rate: "-30%",
        onEnd: () => setPlayingSlowWord(null),
      });
    } else {
      setPlayingWord(text);
      await playStandardTts(text, {
        rate: "-10%",
        onEnd: () => setPlayingWord(null),
      });
    }
  };

  // 播放整句示范
  const handlePlaySentence = async () => {
    if (!referenceText) return;
    setPlayingSentence(true);
    await playStandardTts(referenceText, {
      rate: "-10%",
      onEnd: () => setPlayingSentence(false),
    });
  };

  // 播放学生录音切片
  const handlePlayMyRecording = (offset?: number, duration?: number, wordId?: string) => {
    if (!recordingSrc) return;
    setPlayingMyAudio(wordId || "my");

    const audio = new Audio(recordingSrc);
    if (typeof offset === "number" && typeof duration === "number" && duration > 0) {
      const startTime = offset / 1e7;
      const endTime = (offset + duration) / 1e7;
      audio.currentTime = startTime;
      const onTimeUpdate = () => {
        if (audio.currentTime >= endTime) {
          audio.pause();
          audio.removeEventListener("timeupdate", onTimeUpdate);
          setPlayingMyAudio(null);
        }
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
    }

    audio.onended = () => setPlayingMyAudio(null);
    audio.onerror = () => setPlayingMyAudio(null);
    audio.play().catch(() => setPlayingMyAudio(null));
  };

  return (
    <div className={`space-y-4 my-6 ${className}`}>
      {/* 模块头部：明确的具象诊断标识 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              🎯
            </span>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              敢敢发音具象诊断室 · 逐词逐音精准纠错
            </h3>
            {issueWords.length === 0 ? (
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold gap-1">
                <CheckCircle2Icon className="size-3" /> 全优发音
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs font-bold gap-1">
                <AlertTriangleIcon className="size-3" /> 待纠错 {issueWords.length} 词
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 pl-8">
            {issueWords.length === 0
              ? "恭喜！本次录音全句发音饱满自然，未检测到明显发音偏差，继续保持！"
              : "别担心，敢敢已为你精准定位到具体读错的单词与音标。对照下方标准示范跟读，进步立竿见影！"}
          </p>
        </div>

        {/* 整句标准示范播放按钮 */}
        {referenceText && (
          <Button
            size="sm"
            variant="outline"
            className={`rounded-xl text-xs gap-1.5 h-8 border-amber-500/40 bg-background/80 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shrink-0 ${
              playingSentence ? "ring-2 ring-amber-500 bg-amber-500/20" : ""
            }`}
            onClick={handlePlaySentence}
          >
            <Volume2Icon
              className={`size-3.5 ${
                playingSentence ? "animate-bounce text-amber-600" : ""
              }`}
            />
            <span>{playingSentence ? "正在示范整句..." : "听整句标准示范"}</span>
          </Button>
        )}
      </div>

      {/* 核心板块 1：重点待纠错词与音标清单 */}
      {issueWords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200 pl-1">
            <FlameIcon className="size-4 text-orange-500" />
            <span>需重点纠偏的单词及错音诊断：</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {issueWords.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-card border-2 border-amber-500/30 shadow-xs hover:shadow-md transition-all"
              >
                {/* 单词标题、释义与打分 */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold font-serif tracking-wide text-foreground">
                      {item.word}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      {item.ipa}
                    </span>
                    {item.translation && (
                      <span className="text-xs text-muted-foreground">
                        ({item.translation})
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        item.accuracy >= 75
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-red-500/15 text-red-700 dark:text-red-300"
                      }`}
                    >
                      准确度: {item.accuracy}分
                    </span>
                    {item.errorType !== "None" && (
                      <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">
                        {item.errorType === "Mispronunciation"
                          ? "音素发错"
                          : item.errorType === "Omission"
                          ? "漏读/吞音"
                          : item.errorType}
                      </Badge>
                    )}
                  </div>

                  {/* 发音示范按钮群 */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 px-2.5 text-xs rounded-lg gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-500/10 ${
                        playingWord === item.cleanWord ? "bg-amber-500/20 ring-1 ring-amber-500" : ""
                      }`}
                      onClick={() => handlePlayTts(item.cleanWord, false)}
                    >
                      <Volume2Icon
                        className={`size-3 text-amber-600 ${
                          playingWord === item.cleanWord ? "animate-bounce" : ""
                        }`}
                      />
                      <span>{playingWord === item.cleanWord ? "播放中..." : "听正确发音"}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 px-2 text-xs rounded-lg gap-0.5 text-muted-foreground hover:text-foreground ${
                        playingSlowWord === item.cleanWord ? "bg-muted font-bold" : ""
                      }`}
                      onClick={() => handlePlayTts(item.cleanWord, true)}
                      title="慢速慢听，便于仔细分辨口型与音标"
                    >
                      <span>🐢 慢速示范</span>
                    </Button>

                    {recordingSrc && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-xs rounded-lg gap-1 text-muted-foreground hover:text-foreground ${
                          playingMyAudio === item.cleanWord ? "bg-muted font-bold text-foreground" : ""
                        }`}
                        onClick={() =>
                          handlePlayMyRecording(item.offset, item.duration, item.cleanWord)
                        }
                      >
                        <PlayIcon className="size-3" />
                        <span>我的发音</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* 逐音素剖析条：明确标出"哪个音标错了" */}
                <div className="mb-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="text-[11px] font-bold text-muted-foreground mb-2 flex items-center justify-between">
                    <span>音标分解诊断（标红即发音有偏差的音素）：</span>
                    <span className="text-[10px] text-muted-foreground">
                      🟢合格(≥75) · 🔴需改进(&lt;75)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {item.phonemes.map((ph, pIdx) => {
                      const isBad = ph.isError;
                      return (
                        <div
                          key={pIdx}
                          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border text-center transition-all ${
                            isBad
                              ? "bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300 ring-2 ring-red-500/20 shadow-xs"
                              : "bg-background border-border text-foreground/80"
                          }`}
                        >
                          <span className="font-mono text-sm font-bold">
                            /{ph.phoneme}/
                          </span>
                          <span
                            className={`text-[10px] font-bold mt-0.5 ${
                              isBad ? "text-red-600 dark:text-red-400 font-extrabold" : "text-muted-foreground"
                            }`}
                          >
                            {isBad ? `⚠️ ${ph.score}分` : `${ph.score}分`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 针对错音的具体口型与发音指导 */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5 text-xs text-amber-900 dark:text-amber-100">
                  {item.wrongPhonemes.length > 0 ? (
                    item.wrongPhonemes.map((wp, wIdx) => (
                      <div key={wIdx} className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-xs">
                            /{wp.phoneme}/
                          </span>
                          <span>{wp.guide.name} 发音指导：</span>
                        </div>
                        <p className="leading-relaxed pl-2 text-foreground/90">
                          💡 <span className="font-semibold">发音秘籍：</span>
                          {wp.guide.tip}
                        </p>
                        {wp.guide.mouthShape && (
                          <p className="pl-2 text-muted-foreground">
                            👄 <span className="font-semibold">口型要领：</span>
                            {wp.guide.mouthShape}
                          </p>
                        )}
                        {wp.guide.mistake && (
                          <p className="pl-2 text-red-600/90 dark:text-red-400">
                            ⚠️ <span className="font-semibold">常见误区：</span>
                            {wp.guide.mistake}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div>
                      <p className="leading-relaxed text-foreground/90">
                        💡 <span className="font-semibold">发音秘籍：</span>
                        {item.coachingHint || "注意听标准示范，保持口型到位并饱满发音。"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 核心板块 2：发音达标单词微复习 */}
      {excellentWords.length > 0 && (
        <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2Icon className="size-3.5 text-emerald-600" />
              <span>发音达标单词 ({excellentWords.length} 词)：点击亦可听纯正示范</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {excellentWords.map((item, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                className={`h-7 px-2.5 rounded-lg text-xs gap-1.5 bg-background border-border/80 text-foreground hover:bg-muted ${
                  playingWord === item.cleanWord ? "ring-2 ring-emerald-500 bg-emerald-500/10 font-bold" : ""
                }`}
                onClick={() => handlePlayTts(item.cleanWord, false)}
              >
                <span className="font-serif">{item.word}</span>
                <span className="text-[10px] text-emerald-600 font-bold">
                  {item.accuracy}分
                </span>
                <Volume2Icon className="size-3 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 核心板块 3：今日纠音成就打卡海报 (M4.1 裂变闭环) */}
      <div className="pt-2 flex items-center justify-between border-t border-border/60">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <AwardIcon className="size-4 text-amber-500" />
          <span>跟读进步看得见，一键生成微信打卡成果卡片</span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowShareModal(true)}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs gap-1.5 shadow-xs"
        >
          <Share2Icon className="size-3.5" />
          <span>今日打卡成果</span>
        </Button>
      </div>

      {/* 打卡成果弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h3 className="font-bold text-base text-foreground">今日跟读小名师 · 成就卡</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() => setShowShareModal(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent border border-amber-300/40 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/qiaobao_sunny240.png"
                  alt="敢敢"
                  className="size-12 rounded-2xl border border-amber-300 bg-white p-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    SunnyBridge 阳光桥少儿英语
                  </div>
                  <div className="text-sm font-black text-foreground">
                    口型与音标精准纠音认证
                  </div>
                </div>
              </div>

              <div className="bg-background/80 p-3 rounded-xl border border-border/70">
                <div className="text-xs text-muted-foreground mb-1">今日挑战朗读英文：</div>
                <div className="text-sm font-bold font-serif text-foreground">
                  &ldquo;{referenceText}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[10px] text-muted-foreground">总评单词</div>
                  <div className="text-base font-black text-foreground">{words.length} 词</div>
                </div>
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[10px] text-muted-foreground">发音达标</div>
                  <div className="text-base font-black text-emerald-600">{excellentWords.length} 词</div>
                </div>
                <div className="bg-background/80 p-2 rounded-xl border border-border/60">
                  <div className="text-[10px] text-muted-foreground">掌握音标</div>
                  <div className="text-base font-black text-orange-600">
                    {Math.max(1, words.length * 3 - needsFocusWords.length)} 个
                  </div>
                </div>
              </div>

              {needsFocusWords.length > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                  <SparklesIcon className="size-4 shrink-0 text-amber-500" />
                  <span>
                    特别突破难点音标：
                    {needsFocusWords.map((w) => w.word).join("、")} 发音显著提升！
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2 py-5 text-sm shadow-md"
                onClick={() => {
                  const shareText = `🌟【阳光桥少儿英语】我家宝贝今天跟读完成了《${referenceText}》，连读和发音口型大有进步！快来看看宝贝的纯正发音吧 👉 https://app.sunnybridge.qzz.io/pronunciation_assessments`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareText);
                    setCopied(true);
                    toast.success("打卡文案与链接已成功复制，快去微信群打卡吧！");
                    setTimeout(() => setCopied(false), 3000);
                  }
                }}
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                <span>{copied ? "已复制到剪贴板！" : "一键复制朋友圈打卡文案与链接"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
