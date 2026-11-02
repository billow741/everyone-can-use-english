import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  toast,
} from "@renderer/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenIcon,
  SparklesIcon,
  LoaderIcon,
  PlayIcon,
  XIcon,
} from "lucide-react";
import { useState, useContext, useEffect } from "react";
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
  SrsGrade,
} from "@renderer/lib/vocab-srs";
import { useHotkeys } from "react-hotkeys-hook";

export default () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [meanings, setMeanings] = useState<MeaningType[]>([]);
  const { webApi } = useContext(AppSettingsProviderContext);
  const { currentHotkeys, enabled } = useContext(
    HotKeysSettingsProviderContext
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [nextPage, setNextPage] = useState(1);

  // New word creation state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [contextInput, setContextInput] = useState("");
  const [creating, setCreating] = useState(false);

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

  // ===== U2c SRS 复习 =====
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
  const srsStore = getSrsStore();
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
    const refresh = () => setSrsVersion((v) => v + 1);
    window.addEventListener("sunnybridge:vocab-srs-updated", refresh);
    return () =>
      window.removeEventListener("sunnybridge:vocab-srs-updated", refresh);
  }, []);

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
        // Prepend new word card to list
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
    } catch (err: any) {
      // If delete API not yet implemented, still update UI smoothly
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
    {
      enabled,
    },
    []
  );

  if (loading && meanings.length === 0) {
    return <LoaderSpin />;
  }

  return (
    <div className="h-[100vh] flex flex-col">
      {/* Top Header Bar */}
      <div className="border-b bg-card/60 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpenIcon className="size-5 text-primary" />
          <h1 className="text-lg font-bold">生词库</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            共 {meanings.length} 个单词
          </span>
          {meanings.length > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              当前: 第 {currentIndex + 1} / {meanings.length}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Add Word Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <PlusIcon className="size-4" />
                <span>添加生词</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SparklesIcon className="size-5 text-primary" />
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
                      if (e.key === "Enter" && !creating) {
                        handleCreateWord();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    语境例句 <span className="text-xs text-muted-foreground">(选填，帮助在真实场景中记忆)</span>
                  </label>
                  <Input
                    placeholder="例如: A colorful butterfly is flying in the garden."
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !creating) {
                        handleCreateWord();
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={creating}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleCreateWord}
                    disabled={creating || !wordInput.trim()}
                    className="gap-2"
                  >
                    {creating && <LoaderIcon className="size-4 animate-spin" />}
                    <span>{creating ? "生成卡片中..." : "创建并收录"}</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Current Word Button */}
          {meanings.length > 0 && (
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

      {/* U2c 继续复习货架 */}
      {meanings.length > 0 && view === "browse" && (
        <div className="border-b bg-amber-50/70 px-6 py-3">
          <div className="mx-auto flex w-full max-w-screen-md flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-amber-950">📚 继续复习</span>
              <span className="text-xs font-bold text-amber-900/70">
                {dueCount > 0 ? `${dueCount} 个词到期待复习` : "暂无到期词"}
                {` · 已学 ${learnedCount}/${vocabTotal} 词`}
              </span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-amber-200/70">
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
                className="gap-1.5 rounded-xl bg-amber-400 font-black text-slate-950 shadow-sm hover:bg-amber-500"
              >
                {startingReview ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <PlayIcon className="size-4" />
                )}
                <span>{dueCount > 0 ? `开始复习（${dueCount}）` : "开始复习"}</span>
              </Button>
              <Button
                size="sm"
                onClick={startRush}
                disabled={
                  startingRush ||
                  dueCount + Math.max(0, vocabTotal - learnedCount) < 5
                }
                title={
                  dueCount + Math.max(0, vocabTotal - learnedCount) < 5
                    ? "攒够 5 个词开启极速模式"
                    : "60 秒加时挑战，答对计入复习"
                }
                className="gap-1.5 rounded-xl border-2 border-[#3A2A18] bg-[#E4572E] font-black text-white shadow-[2.5px_2.5px_0_#3A2A18] hover:bg-[#D64A24]"
              >
                {startingRush ? (
                  <LoaderIcon className="size-4 animate-spin" />
                ) : (
                  <span>⚡</span>
                )}
                <span>极速模式</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 max-w-screen-md w-full mx-auto p-4 flex flex-col justify-center">
        {view === "rush" ? (
          <VocabRush queue={rushQueue} onExit={exitRush} />
        ) : view === "review" ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black">
                🧠 SRS 复习 ·{" "}
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
              <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
                <div className="mb-3 text-4xl">🎉</div>
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
          /* Clean Empty State */
          <div className="bg-card border rounded-2xl p-10 text-center shadow-sm max-w-lg mx-auto">
            <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <BookOpenIcon className="size-8" />
            </div>
            <h2 className="text-2xl font-bold font-serif mb-2">生词库目前为空</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              这里没有预置任何生词。你可以在日常阅读故事、练习课程时双击划词收录，也可以直接在下方输入添加你的第一张生词卡片：
            </p>

            <div className="bg-muted/40 p-4 rounded-xl border space-y-3 text-left">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  英文单词
                </label>
                <Input
                  className="mt-1 bg-background"
                  placeholder="例如: rainbow / castle / brave"
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) {
                      handleCreateWord();
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  语境例句（选填）
                </label>
                <Input
                  className="mt-1 bg-background"
                  placeholder="例如: Look at the beautiful rainbow in the blue sky!"
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) {
                      handleCreateWord();
                    }
                  }}
                />
              </div>
              <Button
                className="w-full mt-2 gap-2"
                onClick={handleCreateWord}
                disabled={creating || !wordInput.trim()}
              >
                {creating && <LoaderIcon className="size-4 animate-spin" />}
                <span>{creating ? "AI 智能解析中..." : "+ 创建我的第一张生词卡"}</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Interactive Flashcard View */
          <div className="h-[calc(100vh-8.5rem)] flex items-center justify-between space-x-6">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-md shrink-0 size-11"
              id="vocabulary-previous-button"
              disabled={currentIndex <= 0}
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex(currentIndex - 1);
                }
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
  );
};
