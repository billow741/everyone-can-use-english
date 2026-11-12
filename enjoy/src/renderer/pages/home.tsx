import React, { useContext, useState, useEffect, useMemo } from "react";
import { AppSettingsProviderContext, usePronunciationCoach } from "@renderer/context";
import { Button } from "@renderer/components/ui";
import { Link, useNavigate } from "react-router-dom";
import {
  SparklesIcon,
  AwardIcon,
  StarIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  BookMarkedIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  RotateCwIcon,
  Volume2Icon,
  MicIcon,
} from "lucide-react";
import { useDailySentence } from "@renderer/lib/daily-sentence";
import { playStandardTts } from "@renderer/lib/phonetics-coach";
import {
  getPhonemeMasteryMap,
  subscribePhonemeMastery,
  ALL_39_PHONEMES,
} from "@renderer/lib/phoneme-data";
import { DailyReportDialog } from "@renderer/components/daily-report-dialog";
import { PhonemeRefinementSlot } from "@renderer/components/pronunciation-assessments";
import {
  getDialogueProgress,
  subscribeDialogueProgress,
  getDialoguePack,
  DialogueProgressMap,
  DialoguePack,
} from "@renderer/lib/dialogue-service";
import { useVocabularyCount } from "@renderer/lib/vocab-count";
import { SectionEntryCards } from "@renderer/components/sections";
import { DailyFableCard } from "@renderer/components/levels/daily-fable-card";
import {
  useLevelRegistry,
  calculateLevelProgress,
  determineCurrentLevel,
  LEVEL_METAS,
  LevelKey,
  LevelProgressInfo,
} from "@renderer/lib/level-registry";
import dayjs from "@renderer/lib/dayjs";

export default function Home() {
  const { user, EnjoyApp } = useContext(AppSettingsProviderContext);
  const navigate = useNavigate();
  const [openDailyReport, setOpenDailyReport] = useState(false);

  // 响应式订阅 39 音标掌握状态
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );

  useEffect(() => {
    const unsub = subscribePhonemeMastery((state) => {
      if (state?.masteryMap) {
        setMasteryMap(state.masteryMap);
      }
    });
    return () => unsub();
  }, []);

  const masteredPhonemesCount = useMemo(() => {
    return ALL_39_PHONEMES.filter((p) => !!masteryMap[p.slug]).length;
  }, [masteryMap]);

  // 响应式订阅对话课进度
  const [dialogueProgress, setDialogueProgress] = useState<DialogueProgressMap>(() =>
    getDialogueProgress()
  );

  useEffect(() => {
    const unsub = subscribeDialogueProgress((prog) => {
      setDialogueProgress(prog);
    });
    return () => unsub();
  }, []);

  // 「继续学」数据源：对话课包（找下一课/进行中课）与生词总数
  const [dialoguePack, setDialoguePack] = useState<DialoguePack | null>(null);

  useEffect(() => {
    let mounted = true;
    getDialoguePack()
      .then((data) => {
        if (mounted) setDialoguePack(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const vocabCount = useVocabularyCount();

  const dialogueTarget = useMemo(() => {
    if (!dialoguePack?.lessons) return null;
    for (const lesson of dialoguePack.lessons) {
      const prog = dialogueProgress[lesson.lessonId];
      if (!prog || prog.stars === 0) {
        const practiced = prog
          ? Object.keys(prog.bestScores || {}).length
          : 0;
        return {
          lesson,
          practiced,
          total: lesson.lines.length,
          allDone: false,
        };
      }
    }
    return { lesson: null, practiced: 0, total: 0, allDone: true };
  }, [dialoguePack, dialogueProgress]);

  const nextPhoneme = useMemo(() => {
    return ALL_39_PHONEMES.find((p) => !masteryMap[p.slug]) || null;
  }, [masteryMap]);

  // 今日任务完成状态（本地持久化与响应式判断）
  const todayKey = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const [isSentenceDone, setIsSentenceDone] = useState<boolean>(() => {
    return localStorage.getItem(`sb_task_sentence_${dayjs().format("YYYY-MM-DD")}`) === "1";
  });

  const handleSentenceDone = () => {
    localStorage.setItem(`sb_task_sentence_${todayKey}`, "1");
    setIsSentenceDone(true);
  };

  // 级别注册表与当前级别推导
  const { resources } = useLevelRegistry();
  const currentLevel = useMemo(() => {
    const map: Record<LevelKey, LevelProgressInfo> = {
      a0: calculateLevelProgress("a0", resources, { masteryMap, dialogueProgress }),
      a1: calculateLevelProgress("a1", resources, { masteryMap, dialogueProgress }),
      a2: calculateLevelProgress("a2", resources, { masteryMap, dialogueProgress }),
      b1: calculateLevelProgress("b1", resources, { masteryMap, dialogueProgress }),
    };
    return determineCurrentLevel(map);
  }, [resources, masteryMap, dialogueProgress]);

  const currentLevelMeta = LEVEL_METAS[currentLevel];

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
        
        {/* ========================================================================= */}
        {/* 1. 【顶部欢迎条】：吉祥物敢敢伴学 + 当前级标记 + 亲子战报 */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-banner-start to-banner-end border border-sand-border text-ink p-5 sm:p-6 shadow-none">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src="/assets/qiaobao_sunny240.png"
                  alt="吉祥物敢敢"
                  className="size-16 sm:size-18 rounded-2xl object-cover border-2 border-white shadow-md bg-white p-1"
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-ink">
                    {greeting}，{userName}！
                  </h1>
                  <span className="inline-flex items-center gap-1 text-xs font-normal px-2.5 py-0.5 rounded-full bg-white/70 text-ink border border-sand-border">
                    <SparklesIcon className="size-3 fill-ink" />
                    当前主修 · {currentLevelMeta.title}
                  </span>
                </div>
                <p className="text-sm font-normal text-ink/85 leading-relaxed max-w-md">
                  今天准备好继续探险了吗？按级别步步通关，每天进步一点点！
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                onClick={() => setOpenDailyReport(true)}
                variant="outline"
                size="sm"
                className="h-9 px-3.5 text-xs font-medium rounded-lg bg-white/90 hover:bg-white text-ink border border-sand-border shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <BookMarkedIcon className="size-3.5 text-sun-orange" />
                <span>生成今日亲子战报</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. 【继续学】：接着上次的地方，一键续学（全部来自真实进度源） */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="size-3 rounded-full bg-orange-500 shadow-xs" />
              <h2 className="text-base font-black tracking-wide text-foreground">
                继续学 · 接着上次的地方
              </h2>
            </div>
            <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300/60">
              当前级别：{currentLevelMeta.name} ({currentLevelMeta.code})
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* 对话课续学 */}
            {dialogueTarget && !dialogueTarget.allDone && dialogueTarget.lesson && (
              <Link
                to={`/dialogues/${dialogueTarget.lesson.lessonId}`}
                className="group flex items-center gap-3 rounded-[14px] border border-sand-border bg-white dark:bg-slate-900 p-4 shadow-none card-hover-lift hover:border-sun-orange"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <MessageCircleIcon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-black text-amber-600">
                    情景对话课
                  </span>
                  <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
                    《{dialogueTarget.lesson.sceneZh}》
                  </span>
                  <span className="block text-[11px] font-bold text-slate-500 tabular-nums">
                    {dialogueTarget.practiced > 0
                      ? `进行中 · 已练 ${dialogueTarget.practiced}/${dialogueTarget.total} 句`
                      : `下一课 · 共 ${dialogueTarget.total} 句会话`}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}

            {/* 39 音标/音素卡续学 */}
            <Link
              to="/phonemes"
              className="group flex items-center gap-3 rounded-[14px] border border-sand-border bg-white dark:bg-slate-900 p-4 shadow-none card-hover-lift hover:border-sun-orange"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <AwardIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-black text-orange-600">
                  39 自然拼读通关岛
                </span>
                <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
                  {nextPhoneme
                    ? `点亮音素 /${nextPhoneme.slug}/`
                    : "39 个音素全部点亮"}
                </span>
                <span className="block text-[11px] font-bold text-slate-500 tabular-nums">
                  已点亮 {masteredPhonemesCount}/39
                </span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-orange-500 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* 生词复习（仅当生词库有词时出现） */}
            {vocabCount > 0 && (
              <Link
                to="/vocabulary"
                className="group flex items-center gap-3 rounded-[14px] border border-sand-border bg-white dark:bg-slate-900 p-4 shadow-none card-hover-lift hover:border-sun-orange"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <BookMarkedIcon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-black text-rose-600">
                    生词库
                  </span>
                  <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
                    <span className="tabular-nums">{vocabCount}</span> 个生词等你复习
                  </span>
                  <span className="block text-[11px] font-bold text-slate-500 tabular-nums">
                    翻一翻卡片，把它们记牢
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-rose-500 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. 【Hero 今日任务带】：瘦身版（R1 恢复，含今日2任务、一键探险与通关星计数） */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden rounded-[14px] border border-sand-border bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-none card-hover-lift">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* 左侧：今日2任务 (D5 规则：主页一屏仅保留横幅处一次敢敢 3D 半身像) */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-lg bg-warm-paper border border-sand-border text-sun-orange flex items-center justify-center shrink-0 card-img-lift">
                <SparklesIcon className="size-5" />
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <SparklesIcon className="size-3.5 text-amber-500 fill-amber-500" />
                    今日探险任务
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
                    每日 2 任务
                  </span>
                </div>

                {/* 2个任务小卡/徽章（含完成态判定） */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 任务 1：朗读魔法金句 */}
                  <button
                    onClick={scrollToDailyStudio}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isSentenceDone
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                        : "bg-white dark:bg-slate-800 text-orange-950 dark:text-orange-200 border-amber-200 hover:border-amber-400"
                    }`}
                  >
                    {isSentenceDone ? (
                      <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <StarIcon className="size-3.5 fill-amber-500 text-amber-500 shrink-0" />
                    )}
                    <span>任务 1: 朗读魔法金句 {isSentenceDone ? "(已完成 +10星)" : "(+10星)"}</span>
                  </button>

                  {/* 任务 2：点亮发音宝藏 */}
                  <Link
                    to="/phonemes"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      masteredPhonemesCount > 0
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300"
                        : "bg-white dark:bg-slate-800 text-orange-950 dark:text-orange-200 border-amber-200 hover:border-amber-400"
                    }`}
                  >
                    {masteredPhonemesCount > 0 ? (
                      <CheckCircle2Icon className="size-3.5 text-purple-600 shrink-0" />
                    ) : (
                      <AwardIcon className="size-3.5 text-purple-600 shrink-0" />
                    )}
                    <span>
                      任务 2: 收集发音宝藏 {masteredPhonemesCount > 0 ? `(已点亮 ${masteredPhonemesCount}/39)` : "(+1勋章)"}
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 右侧：开启今日 8 分钟探险按钮 + 通关星/打卡/战报 */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-between sm:justify-end pt-1 md:pt-0">
              <Button
                onClick={scrollToDailyStudio}
                size="sm"
                className="h-10 px-5 text-xs sm:text-sm font-bold rounded-lg bg-sun-orange hover:bg-sun-orange-hover text-white shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none"
              >
                <SparklesIcon className="size-4 fill-white text-white" />
                <span>开启今日 8 分钟探险</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setOpenDailyReport(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 text-ink dark:text-slate-200 border border-sand-border shadow-none hover:border-sun-orange transition-all cursor-pointer flex items-center gap-1"
                >
                  <BookMarkedIcon className="size-3.5 text-sun-orange" />
                  <span>今日战报</span>
                </Button>

                <div className="flex items-center gap-1.5 bg-amber-100/80 dark:bg-amber-950/50 rounded-xl px-2.5 py-1.5 border border-amber-300/50 text-xs font-black text-amber-900 dark:text-amber-200">
                  <AwardIcon className="size-3.5 text-purple-700 dark:text-purple-400" />
                  <span>通关星 {masteredPhonemesCount}/39</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 档案反哺回炉位（今日任务侧）：≥5 次样本且错误率居高时自动激活 */}
        <PhonemeRefinementSlot variant="home" />

        {/* ========================================================================= */}
        {/* 4. 【金句棚】：每日魔法金句跟读棚（R2 恢复完整形态，置于任务带正下方） */}
        {/* ========================================================================= */}
        <div id="daily-sentence-studio">
          <SunnyBridgeDailySentence onSentenceDone={handleSentenceDone} />
        </div>

        {/* ========================================================================= */}
        {/* 5. 【七大核心版块】：自然拼读 / 听故事 / 环球漫游 / 情景对话 / VOA听力 / 伊索寓言 / 绘本 */}
        {/* ========================================================================= */}
        <SectionEntryCards />

        {/* ========================================================================= */}
        {/* 6. 【伊索「每日一则」常驻位】：对接接口壳，无数据时严格显示「筹备中」 */}
        {/* ========================================================================= */}
        <DailyFableCard />

        {/* ========================================================================= */}
        {/* 7. 【外教试听条】：外教 1对1 预约支持 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 rounded-[14px] bg-warm-paper dark:bg-slate-900 border border-sand-border text-xs shadow-none">
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
            className="h-9 px-5 text-xs font-bold bg-sun-orange hover:bg-sun-orange-hover text-white rounded-lg shrink-0 cursor-pointer shadow-none border-none"
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

// 今日少儿魔法金句跟读与声学评测组件 (纯童趣化表达，完整形态恢复)
const SunnyBridgeDailySentence = (props: { onSentenceDone?: () => void }) => {
  const { onSentenceDone } = props;
  const { openAssessment } = usePronunciationCoach();
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
    <div className="rounded-[14px] border border-sand-border bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-none">
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
                外教纯正原声
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

        <Button
          size="sm"
          onClick={() => {
            const todayDate = dayjs().format("YYYY-MM-DD");
            const quoteRef = currentSentence.id
              ? `${currentSentence.id}#${todayDate}`
              : `quote#${todayDate}`;
            openAssessment({
              referenceText: currentSentence.text,
              translation: currentSentence.translation,
              audioUrl: currentSentence.audioUrl,
              phonicsFocus: currentSentence.phonicsFocus,
              source: "quote",
              contextTitle: "今日每日精读金句",
              archiveContext: {
                source: "quote",
                contextRef: quoteRef,
              },
              onSuccess: () => {
                if (onSentenceDone) onSentenceDone();
              },
            });
          }}
          className="w-full sm:w-auto h-11 px-6 bg-sun-orange hover:bg-sun-orange-hover text-white font-bold rounded-lg gap-2 shadow-none transition-all cursor-pointer text-sm border-none"
        >
          <MicIcon className="size-5" />
          <span>马上大声跟读（领小红花）</span>
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};
