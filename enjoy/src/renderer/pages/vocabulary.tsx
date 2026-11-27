import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
  toast,
} from "@renderer/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenIcon,
  SparklesIcon,
  ZapIcon,
  AwardIcon,
  LoaderIcon,
  PlayIcon,
  XIcon,
  ExternalLinkIcon,
  FilterIcon,
  LayersIcon,
} from "lucide-react";
import { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppSettingsProviderContext,
  HotKeysSettingsProviderContext,
} from "@renderer/context";
import { LoaderSpin, MeaningMemorizingCard } from "@renderer/components";
import { useVocabularyCount } from "@renderer/lib/vocab-count";
import VocabRush, { isRushPlayable } from "@renderer/components/vocab-rush";
import {
  buildReviewQueue,
  countDueFromStore,
  formatInterval,
  getSrsStore,
  gradeMeaning,
  nextIntervalDays,
  syncSrsFromCloud,
  SrsGrade,
  SrsEntry,
} from "@renderer/lib/vocab-srs";
import { useHotkeys } from "react-hotkeys-hook";
import { getFavWordsLocal, loadCatalog } from "@renderer/lib/listening-sync";
import { getDialoguePack, DialoguePack } from "@renderer/lib/dialogue-service";
import { mapDialogueLevel } from "@renderer/lib/level-registry";
import type { Catalog } from "./listening/types";

export interface AggregatedVocabItem {
  id: string;
  word: string;
  source: "dialogue" | "listening";
  sourceLabel: "对话课" | "听力";
  levelLabel: string; // 'A1' | 'A2' | 'B1' | '未分级'
  originTitle: string;
  route: string;
  extra?: string;
}

export default function VocabularyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [meanings, setMeanings] = useState<MeaningType[]>([]);
  const { webApi } = useContext(AppSettingsProviderContext);
  const { currentHotkeys, enabled } = useContext(
    HotKeysSettingsProviderContext
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [nextPage, setNextPage] = useState(1);

  // Tab: 聚合清单 (aggregate) 还是 翻卡/复习 (cards)
  const [mainTab, setMainTab] = useState<"aggregate" | "cards">("aggregate");

  // New word creation state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [contextInput, setContextInput] = useState("");
  const [creating, setCreating] = useState(false);

  // ===== 聚合数据源（只读聚合，不改存储结构，不上云） =====
  const [dialoguePack, setDialoguePack] = useState<DialoguePack | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [srsStore, setSrsStore] = useState<Record<string, SrsEntry>>(() => getSrsStore());
  const [favWordsMap, setFavWordsMap] = useState<Record<string, Record<string, string[]>>>(() =>
    getFavWordsLocal()
  );
  const [sourceFilter, setSourceFilter] = useState<"all" | "dialogue" | "listening">("all");

  useEffect(() => {
    let mounted = true;
    getDialoguePack().then((pack) => {
      if (mounted) setDialoguePack(pack);
    }).catch(() => {});

    loadCatalog().then((cat) => {
      if (mounted) setCatalog(cat);
    }).catch(() => {});

    const updateSrs = () => setSrsStore(getSrsStore());
    const updateFav = () => setFavWordsMap(getFavWordsLocal());

    window.addEventListener("sunnybridge:vocab-srs-updated", updateSrs);
    window.addEventListener("storage", updateFav);

    syncSrsFromCloud().catch(() => {});

    return () => {
      mounted = false;
      window.removeEventListener("sunnybridge:vocab-srs-updated", updateSrs);
      window.removeEventListener("storage", updateFav);
    };
  }, []);

  // 1. 对话课生词 SRS 派生条目
  const dialogueItems = useMemo<AggregatedVocabItem[]>(() => {
    const list: AggregatedVocabItem[] = [];
    const entries = Object.values(srsStore);

    for (const entry of entries) {
      const wordClean = (entry.word || "").trim();
      if (!wordClean) continue;

      // 匹配对话课包中的课时与级别
      let matchedLesson: import("@renderer/lib/dialogue-service").DialogueLesson | null = null;
      if (dialoguePack?.lessons) {
        for (const lesson of dialoguePack.lessons) {
          const matchLine = lesson.lines.some((l) =>
            l.text.toLowerCase().includes(wordClean.toLowerCase())
          );
          if (matchLine) {
            matchedLesson = lesson;
            break;
          }
        }
      }

      let levelLabel = "未分级";
      let originTitle = "情景对话";
      let route = "/dialogues";

      if (matchedLesson) {
        const lvl = mapDialogueLevel(matchedLesson.level);
        levelLabel = lvl.toUpperCase();
        originTitle = matchedLesson.sceneZh || matchedLesson.scene || "对话课";
        route = `/dialogues/${matchedLesson.lessonId}`;
      }

      list.push({
        id: `dialogue-${entry.id || wordClean}`,
        word: wordClean,
        source: "dialogue",
        sourceLabel: "对话课",
        levelLabel,
        originTitle,
        route,
        extra: entry.intervalDays ? `复习间隔 ${formatInterval(entry.intervalDays)}` : undefined,
      });
    }

    return list;
  }, [srsStore, dialoguePack]);

  // 2. 听力收藏词派生条目（按 book / chapter 展开，不合并同词多行）
  const listeningItems = useMemo<AggregatedVocabItem[]>(() => {
    const list: AggregatedVocabItem[] = [];
    const chapters = catalog?.chapters || [];

    for (const [book, chaptersMap] of Object.entries(favWordsMap)) {
      for (const [chapter, words] of Object.entries(chaptersMap || {})) {
        if (!Array.isArray(words)) continue;

        const chMeta = chapters.find(
          (c) => c.book === book && String(c.chapter) === String(chapter)
        );

        const levelLabel = chMeta?.level ? chMeta.level.toUpperCase() : "未分级";
        const originTitle = chMeta
          ? `${chMeta.title_zh || chMeta.title_en} · 第${chapter}章`
          : `${book} · ${chapter}`;
        const route = `/listening/${book}/${chapter}`;

        for (const w of words) {
          const clean = (w || "").trim();
          if (!clean) continue;
          list.push({
            id: `listening-${book}-${chapter}-${clean}`,
            word: clean,
            source: "listening",
            sourceLabel: "听力",
            levelLabel,
            originTitle,
            route,
          });
        }
      }
    }

    return list;
  }, [favWordsMap, catalog]);

  // 聚合总列表（只读展示，同词多来源分行各标来源）
  const aggregatedList = useMemo<AggregatedVocabItem[]>(() => {
    let combined: AggregatedVocabItem[] = [];
    if (sourceFilter === "all" || sourceFilter === "dialogue") {
      combined = [...combined, ...dialogueItems];
    }
    if (sourceFilter === "all" || sourceFilter === "listening") {
      combined = [...combined, ...listeningItems];
    }
    return combined;
  }, [dialogueItems, listeningItems, sourceFilter]);

  // ===== 翻卡背词与原有 SRS 逻辑 =====
  const fetchMeanings = async (page: number = nextPage) => {
    if (!page) return;
    if (loading) return;

    setLoading(true);
    webApi
      .mineMeanings({ page, items: 10 })
      .then((response) => {
        const fetched = response?.meanings || [];
        if (page === 1) {
          setMeanings(fetched);
        } else {
          setMeanings((prev) => [...prev, ...fetched]);
        }
        setNextPage(response.next);
      })
      .catch((err) => {
        console.error("fetchMeanings error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const vocabTotal = useVocabularyCount();
  const [view, setView] = useState<"browse" | "review" | "rush">("browse");
  const [rushQueue, setRushQueue] = useState<MeaningType[]>([]);
  const [startingRush, setStartingRush] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<MeaningType[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewDone, setReviewDone] = useState(0);
  const [reviewAgain, setReviewAgain] = useState(0);
  const [reviewFinished, setReviewFinished] = useState(false);
  const [startingReview, setStartingReview] = useState(false);
  const [, setSrsVersion] = useState(0);
  const learnedCount = Object.keys(srsStore).length;
  const dueCount = countDueFromStore();

  const startReview = async () => {
    setStartingReview(true);
    try {
      let all: MeaningType[] = [];
      let page: number | null = 1;
      let guard = 0;
      while (page && guard < 10) {
        const res: any = await webApi.mineMeanings({ page, items: 50 });
        all = [...all, ...((res?.meanings || []) as MeaningType[])];
        page = res?.next ?? null;
        guard++;
      }
      const queue = buildReviewQueue(all, Date.now(), 20);
      setReviewQueue(queue);
      setReviewIdx(0);
      setReviewDone(0);
      setReviewAgain(0);
      setReviewFinished(queue.length === 0);
      setView("review");
    } catch {
      toast.error("复习词表加载失败，请重试");
    } finally {
      setStartingReview(false);
    }
  };

  const startRush = async () => {
    setStartingRush(true);
    try {
      let all: MeaningType[] = [];
      let page: number | null = 1;
      let guard = 0;
      while (page && guard < 10) {
        const res: any = await webApi.mineMeanings({ page, items: 50 });
        all = [...all, ...((res?.meanings || []) as MeaningType[])];
        page = res?.next ?? null;
        guard++;
      }
      const queue = buildReviewQueue(all, Date.now(), 20).filter(isRushPlayable);
      if (queue.length === 0) {
        toast.error("暂时没有能用来极速挑战的词");
        return;
      }
      setRushQueue(queue);
      setView("rush");
    } catch {
      toast.error("词表加载失败，请重试");
    } finally {
      setStartingRush(false);
    }
  };

  const exitRush = () => {
    setView("browse");
    setSrsVersion((v) => v + 1);
  };

  const currentReview = reviewQueue[reviewIdx];
  const currentEntry = currentReview ? srsStore[currentReview.id] : undefined;

  const handleGrade = (grade: SrsGrade) => {
    if (!currentReview) return;
    gradeMeaning(currentReview, grade);
    setReviewDone((d) => d + 1);
    if (grade === "again") setReviewAgain((a) => a + 1);
    setSrsVersion((v) => v + 1);
    if (reviewIdx + 1 >= reviewQueue.length) {
      setReviewFinished(true);
    } else {
      setReviewIdx(reviewIdx + 1);
    }
  };

  useEffect(() => {
    fetchMeanings(1);
  }, []);

  const handleCreateWord = async () => {
    const trimmedWord = wordInput.trim();
    if (!trimmedWord) {
      toast.warning("请输入想要添加的英文单词");
      return;
    }

    setCreating(true);
    try {
      const res = await webApi.lookup({
        word: trimmedWord,
        context: contextInput.trim(),
        sourceType: "manual",
      });

      if (res && res.meaning) {
        setMeanings((prev) => [res.meaning, ...prev]);
        setCurrentIndex(0);
        setWordInput("");
        setContextInput("");
        setDialogOpen(false);
        toast.success(`生词 "${trimmedWord}" 已成功收录！`);
      } else {
        toast.error("生词卡片生成失败，请重试");
      }
    } catch (err: any) {
      toast.error(err.message || "创建失败，请检查网络");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCurrentWord = async () => {
    const current = meanings[currentIndex];
    if (!current) return;

    if (!confirm(`确定要将单词 "${current.word}" 从生词本中移除吗？`)) {
      return;
    }

    try {
      await webApi.deleteMeaning(current.id);
      toast.success(`已将 "${current.word}" 移出生词本`);
      const nextList = meanings.filter((_, idx) => idx !== currentIndex);
      setMeanings(nextList);
      if (currentIndex >= nextList.length) {
        setCurrentIndex(Math.max(0, nextList.length - 1));
      }
    } catch {
      const nextList = meanings.filter((_, idx) => idx !== currentIndex);
      setMeanings(nextList);
      if (currentIndex >= nextList.length) {
        setCurrentIndex(Math.max(0, nextList.length - 1));
      }
      toast.info(`已移除 "${current.word}"`);
    }
  };

  useHotkeys(
    [currentHotkeys.PlayPreviousSegment, currentHotkeys.PlayNextSegment],
    (keyboardEvent, hotkeyEvent) => {
      if (mainTab !== "cards") return;
      keyboardEvent.preventDefault();
      switch (hotkeyEvent.keys.join("")) {
        case currentHotkeys.PlayPreviousSegment.toLowerCase():
          document.getElementById("vocabulary-previous-button")?.click();
          break;
        case currentHotkeys.PlayNextSegment.toLowerCase():
          document.getElementById("vocabulary-next-button")?.click();
          break;
      }
    },
    { enabled },
    [mainTab]
  );

  return (
    <div className="h-[100vh] flex flex-col bg-warm-paper dark:bg-slate-950">
      {/* 顶部标题栏与模式切换 */}
      <div className="border-b border-sand-border bg-white dark:bg-slate-900 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <BookOpenIcon className="size-5 text-amber-500" />
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100">生词本</h1>
          
          {/* 主模式切换 Tab */}
          <div className="flex items-center rounded-lg bg-warm-paper p-0.5 border border-sand-border text-xs font-bold">
            <button
              onClick={() => setMainTab("aggregate")}
              className={`px-3 py-1 rounded-md transition-all ${
                mainTab === "aggregate"
                  ? "bg-sun-orange text-white font-bold shadow-none"
                  : "text-warm-muted hover:text-ink"
              }`}
            >
              来源聚合清单 ({dialogueItems.length + listeningItems.length})
            </button>
            <button
              onClick={() => setMainTab("cards")}
              className={`px-3 py-1 rounded-md transition-all ${
                mainTab === "cards"
                  ? "bg-sun-orange text-white font-bold shadow-none"
                  : "text-warm-muted hover:text-ink"
              }`}
            >
              翻卡背词 ({meanings.length})
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 添加生词 Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-none rounded-lg font-bold bg-sun-orange hover:bg-sun-orange-hover text-white border-none">
                <PlusIcon className="size-4" />
                <span>收录生词</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[20px] bg-white border border-sand-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SparklesIcon className="size-5 text-amber-500" />
                  <span>收录新单词到生词本</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    英文单词 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="输入单词，例如: butterfly / explore"
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                      if (e.key === "Enter" && !creating) handleCreateWord();
                    }}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    语境例句 <span className="text-xs text-muted-foreground">(选填)</span>
                  </label>
                  <Input
                    placeholder="例如: A colorful butterfly is flying in the garden."
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                      if (e.key === "Enter" && !creating) handleCreateWord();
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                    取消
                  </Button>
                  <Button onClick={handleCreateWord} disabled={creating || !wordInput.trim()} className="gap-2">
                    {creating && <LoaderIcon className="size-4 animate-spin" />}
                    <span>{creating ? "生成卡片中..." : "创建并收录"}</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {mainTab === "cards" && meanings.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              title="将此词移出生词本"
              onClick={handleDeleteCurrentWord}
            >
              <Trash2Icon className="size-4 mr-1" />
              <span>移除</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模式 A：生词本展示层聚合（对话课生词 SRS + 听力收藏词，并列展示，只读聚合） */}
      {/* ========================================================================= */}
      {mainTab === "aggregate" ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-5">
          {/* 筛选与汇总栏 */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[14px] bg-white dark:bg-slate-900 border border-sand-border dark:border-slate-800 shadow-none">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-warm-muted dark:text-slate-300">
                来源筛选:
              </span>
              <button
                onClick={() => setSourceFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-none ${
                  sourceFilter === "all"
                    ? "bg-sun-orange text-white"
                    : "bg-warm-paper text-ink border border-sand-border hover:bg-white"
                }`}
              >
                全部 ({dialogueItems.length + listeningItems.length})
              </button>
              <button
                onClick={() => setSourceFilter("dialogue")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-none ${
                  sourceFilter === "dialogue"
                    ? "bg-level-a1 text-white"
                    : "bg-warm-paper text-ink border border-sand-border hover:bg-white"
                }`}
              >
                对话课生词 ({dialogueItems.length})
              </button>
              <button
                onClick={() => setSourceFilter("listening")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-none ${
                  sourceFilter === "listening"
                    ? "bg-level-a0 text-white"
                    : "bg-warm-paper text-ink border border-sand-border hover:bg-white"
                }`}
              >
                听力收藏词 ({listeningItems.length})
              </button>
            </div>

            <span className="text-xs font-bold text-muted-foreground">
              只读聚合 · 点击词卡一键直达原课/原章
            </span>
          </div>

          {/* 聚合词表列表 */}
          {aggregatedList.length === 0 ? (
            <div className="rounded-[14px] border border-sand-border bg-card-muted dark:bg-slate-900/70 p-12 text-center space-y-3 shadow-none">
              <div className="size-12 rounded-lg bg-white dark:bg-slate-800 text-warm-muted border border-sand-border flex items-center justify-center mx-auto">
                <BookOpenIcon className="size-6" />
              </div>
              <h3 className="text-base font-bold text-ink dark:text-slate-100">
                暂无收录的生词或收藏词
              </h3>
              <p className="text-xs text-warm-muted max-w-md mx-auto leading-relaxed">
                在对话课精学练习或听力绘本播放器中点击单词收藏，生词将自动归类到此处，并标注来源与级别！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {aggregatedList.map((item) => {
                const isDialogue = item.source === "dialogue";
                return (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.route)}
                    className="group relative flex flex-col justify-between p-4 rounded-[14px] border border-sand-border dark:border-slate-800 bg-white dark:bg-slate-900 card-hover-lift hover:border-sun-orange transition-colors cursor-pointer shadow-none"
                  >
                    <div>
                      {/* 顶部标签行：来源标签 + 级别标签 */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${
                            isDialogue
                              ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300"
                              : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {item.sourceLabel}
                        </span>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${
                            item.levelLabel === "未分级"
                              ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                          }`}
                        >
                          {item.levelLabel}
                        </span>
                      </div>

                      {/* 单词大标题 */}
                      <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                        {item.word}
                      </h4>

                      {/* 出处课名/章名 */}
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        来自：{item.originTitle}
                      </p>
                    </div>

                    {/* 底部跳转提示 */}
                    <div className="mt-3 pt-2.5 border-t border-amber-100/80 dark:border-slate-800 flex items-center justify-between text-[11px] font-black text-amber-700 dark:text-amber-400">
                      <span>{item.extra || "原课精学"}</span>
                      <span className="inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        <span>跳转</span>
                        <ExternalLinkIcon className="size-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 模式 B：原有翻卡背词、SRS 阶段复习与极速挑战 */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* U2c 继续复习货架 */}
          {meanings.length > 0 && view === "browse" && (
            <div className="border-b border-sand-border bg-warm-paper dark:bg-slate-900 px-6 py-3 shrink-0">
              <div className="mx-auto flex w-full max-w-screen-md flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-amber-950 dark:text-amber-200">继续复习</span>
                  <span className="text-xs font-bold text-amber-900/70 dark:text-amber-400 tabular-nums">
                    {dueCount > 0 ? `${dueCount} 个词到期待复习` : "暂无到期词"}
                    {` · 已学 ${learnedCount}/${vocabTotal} 词`}
                  </span>
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-amber-200/70 dark:bg-slate-800">
                    <div
                      className="h-full bg-emerald-400 transition-all"
                      style={{
                        width: `${
                          vocabTotal > 0
                            ? Math.min(100, Math.round((learnedCount / vocabTotal) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={startReview}
                    disabled={startingReview}
                    className="gap-1.5 rounded-lg bg-sun-orange font-bold text-white shadow-none hover:bg-sun-orange-hover border-none"
                  >
                    {startingReview ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <PlayIcon className="size-4" />
                    )}
                    <span>开始复习{dueCount > 0 ? <>（<span className="tabular-nums">{dueCount}</span>）</> : null}</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={startRush}
                    disabled={
                      startingRush ||
                      dueCount + Math.max(0, vocabTotal - learnedCount) < 5
                    }
                    className="gap-1.5 rounded-lg bg-destructive hover:bg-destructive-hover font-bold text-white shadow-none border-none"
                  >
                    {startingRush ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <ZapIcon className="size-4" />
                    )}
                    <span>极速模式</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 max-w-screen-md w-full mx-auto p-4 flex flex-col justify-center overflow-y-auto">
            {view === "rush" ? (
              <VocabRush queue={rushQueue} onExit={exitRush} />
            ) : view === "review" ? (
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">
                    SRS 间隔复习 ·{" "}
                    {reviewFinished
                      ? reviewQueue.length
                      : Math.min(reviewIdx + 1, reviewQueue.length)}{" "}
                    / {reviewQueue.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView("browse")}
                    className="gap-1 text-muted-foreground"
                  >
                    <XIcon className="size-4" />
                    <span>退出复习</span>
                  </Button>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{
                      width: `${
                        reviewQueue.length > 0
                          ? Math.round((reviewDone / reviewQueue.length) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {reviewFinished ? (
                  <div className="rounded-[20px] border border-sand-border bg-white p-10 text-center shadow-none">
                    <div className="mb-3 flex justify-center text-sun-orange">
                      <AwardIcon className="size-10" />
                    </div>
                    <h2 className="mb-2 text-xl font-bold">
                      {reviewQueue.length === 0
                        ? "现在没有要复习的词"
                        : "本次复习完成！"}
                    </h2>
                    <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                      {reviewQueue.length === 0
                        ? "新词和到期词都会出现在这里，按时回来哦。"
                        : `本次共复习 ${reviewDone} 个词${
                            reviewAgain > 0
                              ? `，其中 ${reviewAgain} 个选了「忘了」，10 分钟后会再出现`
                              : ""
                          }。按时复习，记得更牢。`}
                    </p>
                    <Button onClick={() => setView("browse")}>返回生词库</Button>
                  </div>
                ) : currentReview ? (
                  <>
                    <div className="flex h-[52vh] flex-col overflow-hidden rounded-2xl border bg-background p-6 shadow-xl">
                      <MeaningMemorizingCard
                        key={currentReview.id}
                        meaning={currentReview}
                      />
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      先翻到背面看释义，再诚实地给自己打分
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          {
                            g: "again" as SrsGrade,
                            label: "忘了",
                            cls: "border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-200",
                          },
                          {
                            g: "hard" as SrsGrade,
                            label: "模糊",
                            cls: "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200",
                          },
                          {
                            g: "good" as SrsGrade,
                            label: "记得",
                            cls: "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
                          },
                          {
                            g: "easy" as SrsGrade,
                            label: "太简单",
                            cls: "border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200",
                          },
                        ]
                      ).map((b) => (
                        <button
                          key={b.g}
                          onClick={() => handleGrade(b.g)}
                          className={`flex flex-col items-center gap-0.5 rounded-2xl border-2 px-2 py-3 transition-all ${b.cls}`}
                        >
                          <span className="text-sm font-black">{b.label}</span>
                          <span className="text-[11px] font-bold opacity-70">
                            {formatInterval(nextIntervalDays(currentEntry, b.g))}后
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : meanings.length === 0 ? (
              <div className="bg-card-muted border border-sand-border rounded-[14px] p-10 text-center shadow-none max-w-lg mx-auto">
                <div className="size-14 rounded-full bg-white text-sun-orange border border-sand-border flex items-center justify-center mx-auto mb-4">
                  <BookOpenIcon className="size-7" />
                </div>
                <h2 className="text-2xl font-bold font-serif mb-2">生词库目前为空</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  你可以在日常阅读故事、练习课程时双击划词收录，也可以直接点击上方「收录生词」添加卡片。
                </p>
              </div>
            ) : (
              <div className="h-[calc(100vh-10rem)] flex items-center justify-between space-x-6">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full shadow-md shrink-0 size-11"
                  id="vocabulary-previous-button"
                  disabled={currentIndex <= 0}
                  onClick={() => {
                    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
                  }}
                >
                  <ChevronLeftIcon className="size-6" />
                </Button>

                <div className="bg-background flex-1 h-[88%] border p-6 rounded-2xl shadow-xl flex flex-col overflow-hidden">
                  <MeaningMemorizingCard meaning={meanings[currentIndex]} />
                </div>

                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full shadow-md shrink-0 size-11"
                  id="vocabulary-next-button"
                  disabled={currentIndex >= meanings.length - 1 && !nextPage}
                  onClick={() => {
                    if (currentIndex < meanings.length - 1) {
                      setCurrentIndex(currentIndex + 1);
                    }
                    if (currentIndex === meanings.length - 2 && nextPage) {
                      fetchMeanings(nextPage);
                    }
                  }}
                >
                  <ChevronRightIcon className="size-6" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
