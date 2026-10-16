import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  Volume2Icon,
  SparklesIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  StarIcon,
  MicIcon,
  BookOpenIcon,
  ArrowRightIcon,
  HelpCircleIcon,
  LayersIcon,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@renderer/components/ui";
import {
  getPhonemeById,
  getAdjacentPhonemes,
  ALL_39_PHONEMES,
  PhonemeItem,
  getPhonemeMasteryMap,
  togglePhonemeMastery,
} from "@renderer/lib/phoneme-data";
import { ArticulatoryTongueVisualizer } from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import { playStandardTts } from "@renderer/lib/phonetics-coach";

export default function PhonemeShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const currentPhoneme = getPhonemeById(id || "p") || ALL_39_PHONEMES[0];
  const { prev, next } = getAdjacentPhonemes(currentPhoneme.id);

  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() => getPhonemeMasteryMap());
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [playingBlock, setPlayingBlock] = useState<string | null>(null);

  const isMastered = !!masteryMap[currentPhoneme.id];
  const isVowel = currentPhoneme.group === "monophthongs" || currentPhoneme.group === "diphthongs";

  // 播放拼读音素积木
  const handlePlayBlock = (letters: string, phoneme: string) => {
    const key = `${letters}-${phoneme}`;
    if (playingBlock === key) return;
    setPlayingBlock(key);
    playStandardTts(letters, {
      onEnd: () => setPlayingBlock(null),
    });
  };

  // 键盘快捷键监听：左右箭头键切换上一个/下一个音标
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免输入框冲突
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === "ArrowLeft") {
        navigate(`/phonemes/${prev.slug}`);
      } else if (e.key === "ArrowRight") {
        navigate(`/phonemes/${next.slug}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prev.slug, next.slug, navigate]);

  // 切换掌握状态
  const handleToggleMastery = () => {
    const nextState = togglePhonemeMastery(currentPhoneme.id);
    setMasteryMap((prev) => ({
      ...prev,
      [currentPhoneme.id]: nextState,
    }));
  };

  // 播放例词读音
  const handlePlayWord = (word: string) => {
    if (playingWord === word) return;
    setPlayingWord(word);
    playStandardTts(word, {
      onEnd: () => setPlayingWord(null),
    });
  };

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 顶部导航与快捷切换条 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 border border-border p-3.5 rounded-2xl">
        {/* 面包屑导航 */}
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/phonemes" className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground">
                  <ArrowLeftIcon className="size-3.5" />
                  <span>39 音标大厅</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="font-bold text-amber-500 font-mono">[{currentPhoneme.id}]</span>
              <span className="text-muted-foreground ml-1">({currentPhoneme.category})</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* 顶部右侧：上一个/下一个音标切换器与掌握星标 */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/phonemes/${prev.slug}`)}
            className="h-8 px-2.5 text-xs rounded-xl gap-1"
            title={`快捷键: ← 上一个 [${prev.id}]`}
          >
            <ChevronLeftIcon className="size-3.5" />
            <span className="font-mono font-bold">[{prev.id}]</span>
            <span className="hidden md:inline text-muted-foreground text-[11px]">
              {prev.name.replace(/\(.*\)/, "").trim()}
            </span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/phonemes/${next.slug}`)}
            className="h-8 px-2.5 text-xs rounded-xl gap-1"
            title={`快捷键: → 下一个 [${next.id}]`}
          >
            <span className="font-mono font-bold">[{next.id}]</span>
            <span className="hidden md:inline text-muted-foreground text-[11px]">
              {next.name.replace(/\(.*\)/, "").trim()}
            </span>
            <ChevronRightIcon className="size-3.5" />
          </Button>

          <Button
            size="sm"
            variant={isMastered ? "default" : "outline"}
            onClick={handleToggleMastery}
            className={`h-8 px-3 text-xs rounded-xl gap-1.5 transition-all ${
              isMastered
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                : "border-border hover:border-amber-500/80"
            }`}
          >
            <StarIcon className={`size-3.5 ${isMastered ? "fill-current" : ""}`} />
            <span>{isMastered ? "已通关" : "标记掌握"}</span>
          </Button>
        </div>
      </div>

      {/* 音标核心头部横幅 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 border border-amber-500/20 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 sm:size-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-mono font-black text-3xl sm:text-4xl text-amber-500 shadow-inner">
              [{currentPhoneme.id}]
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  {currentPhoneme.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    isVowel
                      ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30"
                      : "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30"
                  }`}
                >
                  {currentPhoneme.groupName} · {currentPhoneme.category}
                </Badge>
                {currentPhoneme.voiced ? (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs">
                    声带振动 (浊音)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    声带不振 (清音)
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {currentPhoneme.chineseExplanation}
              </p>
            </div>
          </div>

          {/* 重点示范例词徽章 */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 bg-background/80 px-4 py-2.5 rounded-xl border border-border">
            <span className="text-[11px] text-muted-foreground">核心示范词</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-foreground">
                {currentPhoneme.sampleWord}
              </span>
              <span className="text-xs text-amber-500 font-mono">
                {currentPhoneme.wordIpa}
              </span>
              <button
                type="button"
                onClick={() => handlePlayWord(currentPhoneme.sampleWord)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors"
                title="播放示范词"
              >
                <Volume2Icon className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主体交互区域：3D 沉浸式解剖动效镜舱 */}
      <div className="w-full">
        <ArticulatoryTongueVisualizer
          phoneme={currentPhoneme.id}
          word={currentPhoneme.sampleWord}
          compact={false}
          variant="workshop"
          onStartAssessment={() => {
            navigate(
              `/pronunciation_assessments/new?text=${encodeURIComponent(
                currentPhoneme.sampleWord
              )}`
            );
          }}
        />
      </div>

      {/* 🧩 自然拼读 3 大核心代表词与拆解拼读 (Phonics Sound-Blending Benchmarks) */}
      {currentPhoneme.benchmarkWords && currentPhoneme.benchmarkWords.length > 0 && (
        <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent pb-3.5 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="size-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shadow-sm">
                  🧩
                </span>
                <div>
                  <CardTitle className="text-base sm:text-lg font-black text-foreground">
                    自然拼读 3 大核心代表词与拆解拼读
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    点击各个音素积木试听发音，点击整词听连读混音，掌握音标在真实词汇中的拼读规律
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-600 dark:text-amber-400 self-start sm:self-auto">
                3 阶权威基准词
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentPhoneme.benchmarkWords.map((bm, bIdx) => (
                <div
                  key={bIdx}
                  className="rounded-2xl border border-border bg-muted/20 hover:bg-muted/40 transition-all p-4 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  {/* 顶部单词与释义 */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black font-mono text-foreground">{bm.word}</span>
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">
                          {bm.ipa}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {bm.translation}
                      </Badge>
                    </div>

                    {/* 音素拼读积木栏 (Phonics Sound Blocks) */}
                    <div className="mt-3.5 pt-3 border-t border-border/60">
                      <div className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                        <span>音素拆解连读</span>
                        <span className="text-[10px] text-amber-500 font-mono">点击积木试听</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {bm.blocks.map((blk, kIdx) => {
                          const isTarget = blk.isTarget;
                          const blockKey = `${blk.letters}-${blk.phoneme}`;
                          const isPlayingThisBlock = playingBlock === blockKey;
                          return (
                            <React.Fragment key={kIdx}>
                              <button
                                type="button"
                                onClick={() => handlePlayBlock(blk.letters, blk.phoneme)}
                                className={`group px-3 py-2 rounded-xl text-center border transition-all cursor-pointer ${
                                  isPlayingThisBlock
                                    ? "ring-2 ring-amber-400 bg-amber-500/25"
                                    : isTarget
                                    ? "bg-amber-500/15 border-amber-500/60 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/40"
                                    : "bg-background/80 hover:bg-background border-border"
                                }`}
                                title={`点击试听 [${blk.letters}] -> ${blk.phoneme}`}
                              >
                                <div
                                  className={`font-mono font-black text-sm ${
                                    isTarget ? "text-amber-500" : "text-foreground"
                                  }`}
                                >
                                  {blk.letters}
                                </div>
                                <div
                                  className={`text-[10px] font-mono mt-0.5 ${
                                    isTarget
                                      ? "text-amber-600 dark:text-amber-300 font-bold"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {blk.phoneme}
                                </div>
                              </button>
                              {kIdx < bm.blocks.length - 1 && (
                                <span className="text-muted-foreground font-bold text-xs select-none">
                                  +
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                        <span className="text-muted-foreground font-bold text-xs select-none">=</span>
                        {/* 听整词连读 */}
                        <button
                          type="button"
                          onClick={() => handlePlayWord(bm.word)}
                          className={`px-2.5 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                            playingWord === bm.word ? "ring-2 ring-sky-400 animate-pulse" : ""
                          }`}
                          title="听整词自然拼读连读"
                        >
                          <Volume2Icon className="size-3" />
                          <span>整词</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 拼读规则解释 */}
                  <div className="space-y-3 pt-2">
                    <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">
                        💡 拼读规则:
                      </span>
                      {bm.rule}
                    </div>

                    {/* 底部 AI 跟读测评按钮 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigate(
                          `/pronunciation_assessments/new?text=${encodeURIComponent(bm.word)}`
                        );
                      }}
                      className="w-full h-8 text-xs font-bold rounded-xl border-border hover:border-amber-500/80 hover:text-amber-500 gap-1.5 cursor-pointer"
                    >
                      <MicIcon className="size-3.5" />
                      <span>AI 跟读此词</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 进阶教学辅导卡片网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧 (7 列)：少儿三步黄金通关口诀 + 易错避坑 */}
        <div className="lg:col-span-7 space-y-6">
          {/* 三步黄金通关口诀 */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-amber-500/5 pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">
                    3
                  </span>
                  <span>少儿三步黄金通关口诀</span>
                </div>
                <Badge variant="outline" className="text-[11px] font-normal border-amber-500/30 text-amber-600 dark:text-amber-400">
                  口型 · 气流 · 验证
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              {currentPhoneme.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/80 transition-colors hover:bg-muted/70"
                >
                  <div className="size-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground">
                      {idx === 0 ? "第一步 · 器官定型" : idx === 1 ? "第二步 · 气流发力" : "第三步 · 科学自检"}
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {step}
                    </div>
                  </div>
                </div>
              ))}

              {/* 避坑指南与发音秘籍 */}
              <div className="mt-4 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                  <div className="font-bold text-blue-600 dark:text-blue-300 flex items-center gap-1.5">
                    <SparklesIcon className="size-3.5" />
                    <span>发音关键秘籍</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {currentPhoneme.tip}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                  <div className="font-bold text-rose-600 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertCircleIcon className="size-3.5" />
                    <span>最常见错误避坑</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {currentPhoneme.mistake}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 最小对立体实战辨析 (Minimal Pairs) */}
          {currentPhoneme.minimalPair && currentPhoneme.minimalPair.pairs.length > 0 && (
            <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="bg-purple-500/5 pb-3 border-b border-border">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-lg bg-purple-500 text-white flex items-center justify-center text-xs font-black">
                      ⚖️
                    </span>
                    <span>{currentPhoneme.minimalPair.pairTitle}</span>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-mono border-purple-500/30 text-purple-600 dark:text-purple-300">
                    对比辨析 · 根除混淆
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                <p className="text-xs text-muted-foreground mb-3">
                  点击单词即刻试听两组发音的微妙区别，训练听觉敏感度与口腔肌肉精准定位：
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentPhoneme.minimalPair.pairs.map((pair, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between gap-2"
                    >
                      {/* Word 1 (本音标) */}
                      <button
                        type="button"
                        onClick={() => handlePlayWord(pair.word1)}
                        className={`flex-1 text-left p-1.5 rounded-xl transition-all cursor-pointer ${
                          playingWord === pair.word1 ? "bg-amber-500/20 text-amber-700 font-bold" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground font-mono">{pair.word1}</span>
                          <Volume2Icon className="size-3 text-muted-foreground" />
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">{pair.ipa1}</div>
                      </button>

                      <span className="text-xs font-black text-muted-foreground px-1">VS</span>

                      {/* Word 2 (对比音标) */}
                      <button
                        type="button"
                        onClick={() => handlePlayWord(pair.word2)}
                        className={`flex-1 text-left p-1.5 rounded-xl transition-all cursor-pointer ${
                          playingWord === pair.word2 ? "bg-purple-500/20 text-purple-700 font-bold" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground font-mono">{pair.word2}</span>
                          <Volume2Icon className="size-3 text-muted-foreground" />
                        </div>
                        <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">{pair.ipa2}</div>
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧 (5 列)：核心例词家族 + AI 跟读纠音挑战 */}
        <div className="lg:col-span-5 space-y-6">
          {/* 核心例词家族 */}
          <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-500/5 pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                    🔤
                  </span>
                  <span>核心练习例词家族</span>
                </div>
                <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  {currentPhoneme.practiceWords.length} 组代表词
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              {currentPhoneme.practiceWords.map((pw, wIdx) => {
                const isPlayingThis = playingWord === pw.word;
                return (
                  <div
                    key={wIdx}
                    onClick={() => handlePlayWord(pw.word)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isPlayingThis
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm"
                        : "bg-muted/30 hover:bg-muted/60 border-border"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground font-mono">{pw.word}</span>
                        <span className="text-xs text-muted-foreground">{pw.translation}</span>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                        {pw.ipa}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className={`h-7 w-7 p-0 rounded-lg ${
                        isPlayingThis ? "text-emerald-600 font-bold" : "text-muted-foreground"
                      }`}
                    >
                      <Volume2Icon className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* AI 跟读纠音挑战卡片 */}
          <Card className="rounded-3xl border-border bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 shadow-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
                <MicIcon className="size-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-foreground">AI 智能发音跟读挑战</h3>
                <p className="text-[11px] text-muted-foreground">
                  模仿 3D 动效口型，朗读例词检验发音准确度
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              进入精准纠音题库，AI 发音教练将从
              <strong className="text-foreground"> 完整度、流畅度、音素对齐与语调</strong>
              四个维度进行声学打分。
            </p>

            <Button
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black shadow-md shadow-amber-500/20 py-2.5 h-auto text-xs gap-2 cursor-pointer"
              onClick={() => {
                navigate(
                  `/pronunciation_assessments/new?text=${encodeURIComponent(
                    currentPhoneme.sampleWord
                  )}`
                );
              }}
            >
              <MicIcon className="size-4" />
              <span>开始例词 "{currentPhoneme.sampleWord}" 评测</span>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
