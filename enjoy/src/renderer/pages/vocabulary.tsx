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
} from "lucide-react";
import { useState, useContext, useEffect } from "react";
import {
  AppSettingsProviderContext,
  HotKeysSettingsProviderContext,
} from "@renderer/context";
import { LoaderSpin, MeaningMemorizingCard } from "@renderer/components";
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
          <h1 className="text-lg font-bold">我的生词本</h1>
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

      {/* Main Content Area */}
      <div className="flex-1 max-w-screen-md w-full mx-auto p-4 flex flex-col justify-center">
        {meanings.length === 0 ? (
          /* Clean Empty State */
          <div className="bg-card border rounded-2xl p-10 text-center shadow-sm max-w-lg mx-auto">
            <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <BookOpenIcon className="size-8" />
            </div>
            <h2 className="text-2xl font-bold font-serif mb-2">生词本目前为空</h2>
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
