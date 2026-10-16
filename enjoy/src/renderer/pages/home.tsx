import React, { useContext, useState, useEffect, useMemo } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import { Button, Progress, Badge } from "@renderer/components/ui";
import { Link } from "react-router-dom";
import {
  SparklesIcon,
  MicIcon,
  BookOpenIcon,
  BotIcon,
  Volume2Icon,
  FlameIcon,
  ArrowRightIcon,
  RotateCwIcon,
  AwardIcon,
  ClapperboardIcon,
  GraduationCapIcon,
  GlobeIcon,
  CheckCircle2Icon,
  BookMarkedIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  ALL_39_PHONEMES,
} from "@renderer/lib/phoneme-data";

export default function Home() {
  const { user, EnjoyApp } = useContext(AppSettingsProviderContext);
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );

  // 监听掌握度实时变更
  useEffect(() => {
    const unsubscribe = subscribePhonemeMastery((state) => {
      setMasteryMap(state.masteryMap);
    });
    return () => unsubscribe();
  }, []);

  // 39 音标掌握进度统计
  const masteredPhonemesCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => masteryMap[p.id]).length;
  }, [masteryMap]);

  const masteryPercentage = Math.round(
    (masteredPhonemesCount / ALL_39_PHONEMES.length) * 100
  );

  // 获取适合当前时段的问候语
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "早上好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }, []);

  const userName =
    user?.name || (user?.isGuest ? "小探险家" : `微信学员_${user?.id?.slice(-4) || ""}`);

  return (
    <div className="w-full relative pb-16">
      <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 space-y-6">
        {/* 1. 顶部聚焦横幅：学员问候 + 今日打卡与音标总进度卡 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/15 border border-amber-300/40 p-6 sm:p-7 shadow-xs">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* 左侧：敢敢吉祥物 + 温暖问候 */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <img
                  src="/assets/qiaobao_sunny240.png"
                  alt="吉祥物敢敢"
                  className="size-16 sm:size-20 rounded-2xl sm:rounded-3xl object-cover border-2 border-amber-300/80 shadow-md bg-white p-1"
                />
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold shadow-xs">
                  敢敢
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    {greeting}，{userName}！
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                    <SparklesIcon className="size-3" />
                    今日学习主场
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-lg">
                  每天 15 分钟跟读与拼读练习，开启标准纯正的英语语感。
                </p>
              </div>
            </div>

            {/* 右侧：紧凑打卡与音标进度指标卡 */}
            <div className="flex items-center gap-3 shrink-0 bg-background/80 backdrop-blur-md border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
              {/* 连续打卡 */}
              <div className="flex flex-col items-center justify-center px-2 border-r border-border/60">
                <div className="flex items-center gap-1 text-orange-500 font-black text-lg sm:text-xl">
                  <FlameIcon className="size-5 fill-orange-500" />
                  <span>3</span>
                  <span className="text-xs text-muted-foreground font-normal">天</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">连续坚持</span>
              </div>

              {/* 39 音标通关进展 */}
              <div className="space-y-1 min-w-[130px] sm:min-w-[150px] pl-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <AwardIcon className="size-3.5 text-amber-500" />
                    39 音标通关
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                    {masteredPhonemesCount}/39
                  </span>
                </div>
                <Progress value={masteryPercentage} className="h-2" />
                <div className="text-[10px] text-muted-foreground text-right">
                  掌握率: {masteryPercentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 核心主打：今日少儿金句跟读与声学评测舱 (Daily Shadowing) */}
        <SunnyBridgeDailySentence />

        {/* 3. 少儿 4 大核心域极简跳转矩阵 (4 Core Domains) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-black tracking-wide text-foreground uppercase">
                4 大核心学习殿堂 · Core Learning Domains
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">根据孩子能力循序渐进</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 域 1：拼读基石 */}
            <Link
              to="/phonemes"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/80 hover:border-amber-400 p-4 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <SparklesIcon className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-600 dark:text-amber-400 font-bold">
                    39音全通
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-1 group-hover:text-amber-600 transition-colors">
                  39 国际音标工坊
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  3D 舌位解剖动态透视、黄金通关口诀与连音特训。
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="font-mono text-[11px] text-muted-foreground">
                  已掌握 {masteredPhonemesCount} 音
                </span>
                <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  进入工坊 <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </Link>

            {/* 域 2：牛津分级绘本 */}
            <Link
              to="/stories"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/80 hover:border-purple-400 p-4 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpenIcon className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-purple-400/40 text-purple-600 dark:text-purple-400 font-bold">
                    ORT 分级
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-1 group-hover:text-purple-600 transition-colors">
                  牛津精选绘本
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  14 册原版大屏点读、单词音素积木拆解与同步精听。
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                <span className="text-[11px] text-muted-foreground">
                  Level 1 - 3
                </span>
                <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  开始点读 <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </Link>

            {/* 域 3：实景情景剧场与漫游 */}
            <Link
              to="/theater"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/80 hover:border-orange-400 p-4 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ClapperboardIcon className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-orange-400/40 text-orange-600 dark:text-orange-400 font-bold">
                    角色飙戏
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-1 group-hover:text-orange-600 transition-colors">
                  敢敢情景微剧场
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  10 部生活实景短剧，配音打分与角色沉浸互动。
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400">
                <span className="text-[11px] text-muted-foreground">
                  含环球漫游
                </span>
                <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  立即登台 <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </Link>

            {/* 域 4：敢敢 AI 陪练舱 */}
            <Link
              to="/conversations"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/80 hover:border-emerald-400 p-4 transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BotIcon className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-400/40 text-emerald-600 dark:text-emerald-400 font-bold">
                    双语外教
                  </Badge>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-1 group-hover:text-emerald-600 transition-colors">
                  敢敢 AI 陪练
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  24 小时随身智能外教，自由口语交流与耐心纠错。
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="text-[11px] text-muted-foreground">
                  随时开口
                </span>
                <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                  开启对话 <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 4. 底部轻量支持条：外教固定课程咨询与预约 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground text-center sm:text-left">
            <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0" />
            <span>
              SunnyBridge 英国牛津原版分级体系 · 1对1 专属固定欧美外教课后辅导
            </span>
          </div>
          <Button
            size="sm"
            onClick={() =>
              EnjoyApp?.shell?.openExternal
                ? EnjoyApp.shell.openExternal("https://www.sunnybridge.qzz.io/apply.html")
                : window.open("https://www.sunnybridge.qzz.io/apply.html", "_blank")
            }
            className="h-8 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shrink-0 cursor-pointer shadow-2xs"
          >
            <SparklesIcon className="size-3.5 mr-1" />
            预约外教试听课
          </Button>
        </div>
      </div>
    </div>
  );
}

// 今日金句跟读与声学评测组件
const SunnyBridgeDailySentence = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const {
    index: currentIndex,
    sentence: currentSentence,
    nextSentence: handleNext,
    totalCount,
  } = useDailySentence();

  const handlePlayAudio = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (currentSentence.audioUrl) {
      const audio = new Audio(currentSentence.audioUrl);
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => fallbackSpeech();
      audio.play().catch(() => fallbackSpeech());
    } else {
      fallbackSpeech();
    }
  };

  const fallbackSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentSentence.text);
      utterance.lang = "en-GB";
      utterance.rate = 0.85;
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
            ☀️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-foreground">
                今日少儿金句跟读 (Daily Shadowing)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                🇬🇧 外教母语原声
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              听纯正发音示范，大声开口跟读评测
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleNext}
          className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-full px-3 gap-1.5 cursor-pointer border border-border/60"
        >
          <RotateCwIcon className="size-3" />
          <span>换一句 ({currentIndex + 1}/{totalCount})</span>
        </Button>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border/60 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {currentSentence.topic && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
                  {currentSentence.topic}
                </span>
              )}
              {currentSentence.phonicsFocus && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  🎯 焦点音: {currentSentence.phonicsFocus}
                </span>
              )}
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground font-serif tracking-wide leading-snug">
              &ldquo;{currentSentence.text}&rdquo;
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {currentSentence.translation}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePlayAudio}
            className={`rounded-xl shrink-0 cursor-pointer h-9 px-3.5 transition-all ${
              isPlaying
                ? "border-amber-500 text-amber-600 animate-pulse bg-amber-500/15"
                : "hover:border-amber-400"
            }`}
          >
            <Volume2Icon className="size-4 mr-1.5 text-amber-500" />
            <span className="font-semibold text-xs">
              {isPlaying ? "正在示范..." : "听外教示范"}
            </span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0" />
          <span>原厂母语真人示范 · AI 音素级精准纠错</span>
        </div>

        <Link
          to={`/pronunciation_assessments?practice=true&text=${encodeURIComponent(
            currentSentence.text
          )}&audioUrl=${encodeURIComponent(currentSentence.audioUrl || "")}`}
          className="w-full sm:w-auto"
        >
          <Button
            size="sm"
            className="w-full sm:w-auto h-9 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl gap-2 shadow-xs cursor-pointer text-xs"
          >
            <MicIcon className="size-4" />
            <span>立即大声跟读打分</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
