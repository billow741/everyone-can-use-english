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
  GlobeIcon,
  CheckCircle2Icon,
  StarIcon,
  CompassIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  ALL_39_PHONEMES,
} from "@renderer/lib/phoneme-data";
import { DailyReportDialog } from "@renderer/components/daily-report-dialog";
import { playStandardTts } from "@renderer/lib/phonetics-coach";

export default function Home() {
  const { user, EnjoyApp } = useContext(AppSettingsProviderContext);
  const [openDailyReport, setOpenDailyReport] = useState(false);

  // 响应式订阅 39 音标掌握状态
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );

  useEffect(() => {
    const unsub = subscribePhonemeMastery((newMap) => {
      setMasteryMap(newMap);
    });
    return () => unsub();
  }, []);

  const masteredPhonemesCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => !!masteryMap[p.slug]).length;
  }, [masteryMap]);

  const masteryPercentage = useMemo(
    () => Math.round((masteredPhonemesCount / 39) * 100),
    [masteredPhonemesCount]
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

  const scrollToDailyStudio = () => {
    const studio = document.getElementById("daily-sentence-studio");
    if (studio) {
      studio.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="w-full relative pb-20">
      <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 space-y-7">
        
        {/* 1. 【一键开练 Super Hero Action 区】：沉浸式今日探险大行动 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 border-2 border-amber-300 shadow-lg text-slate-950 p-6 sm:p-8 transition-all">
          {/* 背景动态光晕与星星装饰 */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 size-64 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-20 size-48 rounded-full bg-yellow-300/20 blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* 左侧：吉祥物敢敢招手 + 今日探险任务 */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-6">
              <div className="relative shrink-0">
                <img
                  src="/assets/qiaobao_sunny240.png"
                  alt="吉祥物敢敢"
                  className="size-20 sm:size-24 rounded-3xl object-cover border-4 border-white shadow-xl bg-white p-1 hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-950 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-black shadow-md border border-amber-300/40">
                  敢敢伴学
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                    {greeting}，{userName}！
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white/30 text-slate-950 border border-white/40 shadow-2xs">
                    <SparklesIcon className="size-3 fill-slate-950" />
                    今日冒险已就绪
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900/90 leading-relaxed max-w-md">
                  小探险家，今天我们一起完成 2 个魔法任务：大声跟读 1 句魔法金句，点亮 1 个发音宝藏！
                </p>

                {/* 2个任务小徽章 */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 text-orange-950 font-black text-xs shadow-2xs border border-white">
                    <StarIcon className="size-3.5 fill-amber-500 text-amber-500" />
                    任务 1: 朗读魔法金句 (+10星)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 text-orange-950 font-black text-xs shadow-2xs border border-white">
                    <AwardIcon className="size-3.5 text-purple-600" />
                    任务 2: 收集发音宝藏 (+1勋章)
                  </span>
                </div>
              </div>
            </div>

            {/* 右侧：超大【一键开启 8 分钟探险】Hero 按钮与打卡数据 */}
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-center gap-3 shrink-0">
              <Button
                onClick={scrollToDailyStudio}
                className="h-12 sm:h-14 px-7 text-sm sm:text-base font-black rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-300 shadow-xl hover:shadow-2xl transition-all hover:scale-102 active:scale-95 cursor-pointer flex items-center justify-center gap-2 border-2 border-amber-300"
              >
                <SparklesIcon className="size-5 fill-amber-300 text-amber-300 animate-spin-slow" />
                <span>开启今日 8 分钟探险</span>
                <ArrowRightIcon className="size-4" />
              </Button>

              <div className="flex items-center gap-2 w-full justify-between sm:justify-end flex-wrap">
                <Button
                  onClick={() => setOpenDailyReport(true)}
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs font-black rounded-xl bg-white/90 hover:bg-white text-slate-950 border border-white shadow-2xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📜 生成今日亲子战报</span>
                </Button>

                <div className="flex items-center justify-center gap-3 bg-white/35 backdrop-blur-md rounded-xl px-3 py-1 border border-white/50 text-xs font-black text-slate-950">
                  <div className="flex items-center gap-1">
                    <FlameIcon className="size-3.5 fill-orange-600 text-orange-600" />
                    <span>3 天</span>
                  </div>
                  <span className="text-slate-950/30">|</span>
                  <div className="flex items-center gap-1">
                    <AwardIcon className="size-3.5 text-purple-800" />
                    <span>{masteredPhonemesCount}/39</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 【核心跟读棚】：今日少儿魔法金句跟读与声学评测舱 (消除黑话) */}
        <div id="daily-sentence-studio">
          <SunnyBridgeDailySentence />
        </div>

        {/* 3. 【4 大探险小岛】：拒绝干瘪卡片，以沉浸式游戏地图呈现 */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="size-3 rounded-full bg-amber-500 shadow-xs" />
              <h2 className="text-base font-black tracking-wide text-foreground">
                🗺️ 4 大探险小岛 · 开启你的英语大世界
              </h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground">像玩游戏一样步步解锁升级</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 小岛 1：拼读基石岛 (自然拼读 + 39音标) */}
            <Link
              to="/phonics"
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-yellow-500/15 border-2 border-amber-300/70 hover:border-amber-400 p-5 transition-all hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="size-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform">
                    🧩
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40">
                    7阶拼读 · 1236词
                  </span>
                </div>
                <h3 className="font-black text-base text-foreground mb-1.5 group-hover:text-amber-600 transition-colors">
                  自然拼读与音标库
                </h3>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  1,236 个分级解码词库与拼读积木，更有 3D 魔法发音镜，见词能读！
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-slate-800 flex items-center justify-between text-xs font-black text-amber-600 dark:text-amber-400">
                <span className="text-[11px] text-muted-foreground">
                  已掌握 {masteredPhonemesCount}/39 音
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  开启拼读 <ArrowRightIcon className="size-3.5" />
                </span>
              </div>
            </Link>

            {/* 小岛 2：牛津绘本王国 */}
            <Link
              to="/stories"
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-pink-500/15 border-2 border-purple-300/70 hover:border-purple-400 p-5 transition-all hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="size-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform">
                    🏰
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-400/40">
                    ORT 原版分级
                  </span>
                </div>
                <h3 className="font-black text-base text-foreground mb-1.5 group-hover:text-purple-600 transition-colors">
                  牛津精选绘本王国
                </h3>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  跟着 Biff、Chip 和狗狗 Floppy 开启魔法钥匙大冒险，大屏原版点读！
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200/50 dark:border-slate-800 flex items-center justify-between text-xs font-black text-purple-600 dark:text-purple-400">
                <span className="text-[11px] text-muted-foreground">
                  精选 14 册
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  开启点读 <ArrowRightIcon className="size-3.5" />
                </span>
              </div>
            </Link>

            {/* 小岛 3：奇遇微剧场与漫游 */}
            <Link
              to="/theater"
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500/15 via-orange-500/10 to-amber-500/15 border-2 border-rose-300/70 hover:border-rose-400 p-5 transition-all hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="size-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform">
                    🎭
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-400/40">
                    实景飙戏 · 环球漫游
                  </span>
                </div>
                <h3 className="font-black text-base text-foreground mb-1.5 group-hover:text-rose-600 transition-colors">
                  奇遇微剧场与漫游
                </h3>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  化身小主角进入生活场景配音飙戏，更有 79 站环球文化探索与护照集章！
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-rose-200/50 dark:border-slate-800 flex items-center justify-between text-xs font-black text-rose-600 dark:text-rose-400">
                <span className="text-[11px] text-muted-foreground">
                  10部短剧 · 79站漫游
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  开启奇遇 <ArrowRightIcon className="size-3.5" />
                </span>
              </div>
            </Link>

            {/* 小岛 4：敢敢 AI 随身外教 */}
            <Link
              to="/conversations"
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border-2 border-emerald-300/70 hover:border-emerald-400 p-5 transition-all hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="size-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform">
                    🤖
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-400/40">
                    随身双语外教
                  </span>
                </div>
                <h3 className="font-black text-base text-foreground mb-1.5 group-hover:text-emerald-600 transition-colors">
                  敢敢 AI 随身外教
                </h3>
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  24 小时随身智能外教，自由对话、耐心倾听，不怕说错，越说越自信！
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-200/50 dark:border-slate-800 flex items-center justify-between text-xs font-black text-emerald-600 dark:text-emerald-400">
                <span className="text-[11px] text-muted-foreground">
                  随时随地聊
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  开启对话 <ArrowRightIcon className="size-3.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 4. 底部支持条：外教 1对1 预约支持 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-amber-50/70 dark:bg-slate-900 border-2 border-amber-300/50 text-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground text-center sm:text-left">
            <CheckCircle2Icon className="size-5 text-emerald-500 shrink-0" />
            <span className="font-bold text-foreground">
              SunnyBridge 英国牛津原版分级体系 · 1对1 专属固定欧美外教课后辅导与纠音
            </span>
          </div>
          <Button
            size="sm"
            onClick={() =>
              EnjoyApp?.shell?.openExternal
                ? EnjoyApp.shell.openExternal("https://www.sunnybridge.qzz.io/apply.html")
                : window.open("https://www.sunnybridge.qzz.io/apply.html", "_blank")
            }
            className="h-9 px-5 text-xs font-black bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-slate-950 rounded-2xl shrink-0 cursor-pointer shadow-xs border border-amber-300"
          >
            <SparklesIcon className="size-3.5 mr-1" />
            预约外教试听课
          </Button>
        </div>

        {/* 今日亲子学情战报弹窗 */}
        <DailyReportDialog
          open={openDailyReport}
          onOpenChange={setOpenDailyReport}
        />
      </div>
    </div>
  );
}

// 今日少儿魔法金句跟读与声学评测组件 (纯童趣化表达，剔除学术黑话)
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
    setIsPlaying(true);
    playStandardTts(currentSentence.text, {
      voice: "en-GB-SoniaNeural",
      rate: "-5%",
      onEnd: () => setIsPlaying(false),
    }).catch(() => setIsPlaying(false));
  };

  // 将语言学焦点音翻译为儿童发音小窍门
  const kidFriendlyFocusHint = useMemo(() => {
    const focus = currentSentence.phonicsFocus || "";
    if (focus.includes("/r/") || focus.includes("卷舌")) {
      return "👅 发音小窍门：舌头尖尖像滑滑梯一样往后卷，但不要碰到嘴巴顶上哦！";
    }
    if (focus.includes("/θ/") || focus.includes("咬舌")) {
      return "🦷 发音小窍门：像小乌龟一样把舌尖伸出小牙齿一点点，轻轻吹气不震动！";
    }
    if (focus.includes("/ð/")) {
      return "🐝 发音小窍门：小牙齿咬住舌尖，嗓子像小蜜蜂一样嗡嗡震动！";
    }
    if (focus.includes("元音") || focus.includes("长元音")) {
      return "😮 发音小窍门：嘴巴像看牙医一样大大张开，声音响亮又好听！";
    }
    return `🎯 发音小窍门: 模仿外教口型，听清每个音符，大声跟读！`;
  }, [currentSentence.phonicsFocus]);

  return (
    <div className="rounded-3xl border-2 border-amber-300/80 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-2xs">
            🌟
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-foreground">
                今日魔法金句 · 大声跟读大挑战
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/40">
                🇬🇧 外教纯正原声
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              听外教纯正示范，跟着敢敢大声开口，赢取今日能量星！
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleNext}
          className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground rounded-full px-3 gap-1.5 cursor-pointer border border-border/80"
        >
          <RotateCwIcon className="size-3.5" />
          <span>换一句 ({currentIndex + 1}/{totalCount})</span>
        </Button>
      </div>

      <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/50 dark:bg-slate-800/60 border-2 border-amber-200/60 dark:border-slate-700 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {currentSentence.topic && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-amber-200 text-amber-900 dark:text-amber-200">
                  {currentSentence.topic}
                </span>
              )}
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                {kidFriendlyFocusHint}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-serif tracking-wide leading-tight">
              &ldquo;{currentSentence.text}&rdquo;
            </div>
            <div className="text-sm font-bold text-muted-foreground">
              {currentSentence.translation}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handlePlayAudio}
            className={`rounded-2xl shrink-0 cursor-pointer h-11 px-5 font-black text-xs transition-all shadow-xs border-2 ${
              isPlaying
                ? "border-amber-500 text-amber-600 animate-pulse bg-amber-100"
                : "bg-white hover:bg-amber-50 text-slate-900 border-amber-300"
            }`}
          >
            <Volume2Icon className="size-4 mr-1.5 text-amber-500" />
            <span>{isPlaying ? "正在示范中..." : "听外教老师范读"}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <CheckCircle2Icon className="size-4.5 text-emerald-500 shrink-0" />
          <span>英国母语真人示范 · 敢敢做你的发音小导师</span>
        </div>

        <Link
          to={`/pronunciation_assessments?practice=true&text=${encodeURIComponent(
            currentSentence.text
          )}&audioUrl=${encodeURIComponent(currentSentence.audioUrl || "")}`}
          className="w-full sm:w-auto"
        >
          <Button
            size="sm"
            className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl gap-2 shadow-md hover:shadow-lg transition-all hover:scale-102 active:scale-95 cursor-pointer text-sm border border-amber-300/40"
          >
            <MicIcon className="size-5" />
            <span>马上大声跟读（领小红花）</span>
            <ArrowRightIcon className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
