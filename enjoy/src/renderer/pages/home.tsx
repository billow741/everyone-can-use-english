import { useIsDesktop } from "@renderer/hooks";
import { DesktopHome, SunnyBridgeDailySentence } from "@renderer/components";
import React, { useContext, useState, useEffect, useMemo } from "react";
import { AppSettingsProviderContext, usePronunciationCoach } from "@renderer/context";
import { Button } from "@renderer/components/ui";
import { Link, useNavigate } from "react-router-dom";
import {
  SparklesIcon,
  AwardIcon,
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
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return <DesktopHome />;
  }

  const { user, EnjoyApp } = useContext(AppSettingsProviderContext);
  const navigate = useNavigate();

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
    user?.name || (user?.isGuest ? "学习者" : `学员_${user?.id?.slice(-4) || ""}`);

  return (
    <div className="w-full relative pb-20">
      <div className="max-w-5xl mx-auto px-4 py-6 lg:px-8 space-y-7">
        
        {/* ========================================================================= */}
        {/* 1. 【顶部欢迎条】：吉祥物敢敢伴学 + 当前级标记 */}
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
                    {greeting}，{userName}。
                  </h1>
                  <span className="inline-flex items-center gap-1 text-xs font-normal px-2.5 py-0.5 rounded-full bg-white/70 text-ink border border-sand-border">
                    <SparklesIcon className="size-3 fill-ink" />
                    当前主修 · {currentLevelMeta.title}
                  </span>
                </div>
                <p className="text-sm font-normal text-ink/85 leading-relaxed max-w-md">
                  今天从哪里开始练习？
                </p>
              </div>
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
                    情景对话
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
                  自然拼读
                </span>
                <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
                  {nextPhoneme
                    ? `练习音素 ${nextPhoneme.symbol}`
                    : "39 个音素全部完成"}
                </span>
                <span className="block text-[11px] font-bold text-slate-500 tabular-nums">
                  音素进度 {masteredPhonemesCount}/39
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
                    生词本
                  </span>
                  <span className="block truncate text-sm font-black text-slate-900 dark:text-slate-100">
                    <span className="tabular-nums">{vocabCount}</span> 个生词待复习
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
        {/* 4. 【金句棚】：每日魔法金句跟读棚（R2 恢复完整形态，置于任务带正下方） */}
        {/* ========================================================================= */}
        <div id="daily-sentence-studio">
          <SunnyBridgeDailySentence />
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
            预约外教试听
          </Button>
        </div>

      </div>
    </div>
  );
}

