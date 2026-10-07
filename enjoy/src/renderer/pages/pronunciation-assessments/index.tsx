import { useEffect, useState, useContext, useRef } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  toast,
} from "@renderer/components/ui";
import {
  ChevronDownIcon,
  Volume2Icon,
  PauseIcon,
  SparklesIcon,
  MicIcon,
  TrophyIcon,
  FlameIcon,
  PlusCircleIcon,
  CheckCircle2Icon,
  GraduationCapIcon,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { t } from "i18next";
import {
  PronunciationAssessmentCard,
  RecordingDetail,
} from "@renderer/components";

// 预设分级精选跟读题库（配高保真真人外教录音 MP3）
const CURATED_LEVELS = [
  {
    id: "level1",
    label: "🐣 Level 1 启蒙",
    badge: "自然拼读 · 基础高频词",
    items: [
      {
        id: "l1-1",
        text: "Look at the cute little cat.",
        translation: "看这只可爱的小猫咪。",
        phonicsFocus: "/ʊ/ 短元音 · /k/ 爆破音",
        audioUrl: "/assets/audio/l1_1.mp3",
      },
      {
        id: "l1-2",
        text: "I love sweet red apples and bananas.",
        translation: "我喜欢甜甜的红苹果和香蕉。",
        phonicsFocus: "/æ/ 梅花音 · /iː/ 长元音",
        audioUrl: "/assets/audio/l1_2.mp3",
      },
      {
        id: "l1-3",
        text: "Good morning! This is my sunny room.",
        translation: "早上好！这是我阳光明媚的房间。",
        phonicsFocus: "/ŋ/ 后鼻音 · /ʌ/ 短元音",
        audioUrl: "/assets/audio/l1_3.mp3",
      },
    ],
  },
  {
    id: "level2",
    label: "🌟 Level 2 进阶",
    badge: "连读技巧 · 日常情景",
    items: [
      {
        id: "l2-1",
        text: "Can you pass me that blue bottle, please?",
        translation: "请把那个蓝色的水杯递给我好吗？",
        phonicsFocus: "连读 pass me · 礼貌降调",
        audioUrl: "/assets/audio/l2_1.mp3",
      },
      {
        id: "l2-2",
        text: "The happy monkey is swinging in the tree.",
        translation: "快乐的猴子在树上荡来荡去。",
        phonicsFocus: "-ing 动词节奏 · 弱读 in the",
        audioUrl: "/assets/audio/l2_2.mp3",
      },
      {
        id: "l2-3",
        text: "We are having fun building sandcastles together.",
        translation: "我们一起开心地堆着沙堡。",
        phonicsFocus: "/ð/ 咬舌音 · 辅音连缀 /st/",
        audioUrl: "/assets/audio/l2_3.mp3",
      },
    ],
  },
  {
    id: "level3",
    label: "🚀 Level 3 挑战",
    badge: "绘本长句 · 纯正抑扬顿挫",
    items: [
      {
        id: "l3-1",
        text: "Practice makes perfect when you keep reading every day!",
        translation: "只要坚持每天大声朗读，熟能生巧不是梦！",
        phonicsFocus: "复合句重音 · 意群自然停顿",
        audioUrl: "/assets/audio/l3_1.mp3",
      },
      {
        id: "l3-2",
        text: "Bright stars shine quietly in the summer night sky.",
        translation: "夏夜静谧的星空中，星星闪耀着明亮的光芒。",
        phonicsFocus: "双元音 /aɪ/ · 抒情升降调",
        audioUrl: "/assets/audio/l3_2.mp3",
      },
      {
        id: "l3-3",
        text: "Gangan loves exploring exciting English stories with you.",
        translation: "敢敢最喜欢和你一起探索精彩的英文故事啦。",
        phonicsFocus: "情感表达 · 语调生动连贯",
        audioUrl: "/assets/audio/l3_3.mp3",
      },
    ],
  },
];

const TODAY_CHALLENGE = {
  text: "The brave little lion always speaks English with confidence!",
  translation: "勇敢的小狮子总是自信大方地说英语！",
  focus: "连读 /vz/ · 咬舌音 /θ/ · 核心重音 confidence",
  audioUrl: "/assets/audio/today_challenge.mp3",
};

export default () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectId = searchParams.get("selectId");

  const { EnjoyApp, webApi } = useContext(AppSettingsProviderContext);
  const [assessments, setAssessments] = useState<PronunciationAssessmentType[]>(
    []
  );
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [orderBy, setOrderBy] = useState<string>("createdAtDesc");
  const [selecting, setSelecting] =
    useState<PronunciationAssessmentType | null>(null);
  const [deleting, setDeleting] = useState<PronunciationAssessmentType | null>(
    null
  );
  const [sharing, setSharing] = useState<RecordingType | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectId && assessments.length > 0) {
      const found = assessments.find((a) => a.id === selectId);
      if (found) {
        setSelecting(found);
      }
    }
  }, [selectId, assessments]);

  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // 播放/暂停高保真外教原声音频（优先 MP3，降级自然发音）
  const playSampleAudio = (text: string, audioUrl?: string) => {
    if (playingUrl === audioUrl && audioUrl) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current = null;
      }
      setPlayingUrl(null);
      return;
    }

    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      sampleAudioRef.current = audio;
      setPlayingUrl(audioUrl);
      audio.onended = () => {
        setPlayingUrl(null);
        sampleAudioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingUrl(null);
        sampleAudioRef.current = null;
        fallbackSpeech(text);
      };
      audio.play().catch(() => {
        setPlayingUrl(null);
        sampleAudioRef.current = null;
        fallbackSpeech(text);
      });
    } else {
      fallbackSpeech(text);
    }
  };

  const fallbackSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      // 优先匹配高质量自然发音
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          (v.name.includes("Natural") ||
            v.name.includes("Online") ||
            v.name.includes("Jenny") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha")) &&
          v.lang.startsWith("en")
      );
      if (naturalVoice) u.voice = naturalVoice;
      u.rate = 0.88;
      window.speechSynthesis.speak(u);
    }
  };

  const handleStartPractice = (sentenceText: string, audioUrl?: string) => {
    const audioParam = audioUrl ? `&audio=${encodeURIComponent(audioUrl)}` : "";
    navigate(
      `/pronunciation_assessments/new?text=${encodeURIComponent(sentenceText)}${audioParam}`
    );
  };

  const handleDelete = async (assessment: PronunciationAssessmentType) => {
    try {
      await EnjoyApp.pronunciationAssessments.destroy(assessment.id);
      setAssessments(assessments.filter((a) => a.id !== assessment.id));
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleShare = async () => {
    if (!sharing) return;

    if (EnjoyApp.recordings?.sync && !sharing.isSynced) {
      try {
        await EnjoyApp.recordings.sync(sharing.id);
      } catch (error) {
        console.warn("sync recording error:", error);
      }
    }
    if (EnjoyApp.recordings?.upload && !sharing.uploadedAt) {
      try {
        await EnjoyApp.recordings.upload(sharing.id);
      } catch (error) {
        console.warn("upload recording error:", error);
      }
    }

    try {
      if (webApi?.createPost) {
        await webApi.createPost({
          targetId: sharing.id,
          targetType: "Recording",
        });
      }
    } catch (e) {
      console.warn("createPost failed:", e);
    }

    // Always copy share link and show positive feedback
    try {
      if (navigator.clipboard) {
        const assessmentId =
          sharing.pronunciationAssessment?.id ||
          (sharing as any)?.targetId ||
          sharing.id;
        await navigator.clipboard.writeText(
          `${window.location.origin}/pronunciation_assessments?selectId=${
            assessmentId || ""
          }`
        );
        toast.success(
          "分享链接已复制！可发给家长或老师查看发音评测报告 🎉"
        );
      } else {
        toast.success("打卡记录已保存，随时可在成长足迹中回顾！");
      }
    } catch {
      toast.success("打卡记录已保存，随时可在成长足迹中回顾！");
    }
    setSharing(null);
  };

  const fetchAssessments = (params?: { offset: number; limit?: number }) => {
    const { offset = 0, limit = 10 } = params || {};
    if (offset > 0 && !hasMore) return;

    let order = ["createdAt", "DESC"];
    switch (orderBy) {
      case "createdAtDesc":
        order = ["createdAt", "DESC"];
        break;
      case "createdAtAsc":
        order = ["createdAt", "ASC"];
        break;
      case "scoreDesc":
        order = ["pronunciationScore", "DESC"];
        break;
      case "scoreAsc":
        order = ["pronunciationScore", "ASC"];
        break;
    }

    EnjoyApp.pronunciationAssessments
      .findAll({
        limit,
        offset,
        order: [order],
      })
      .then((fetchedAssessments) => {
        if (offset === 0) {
          setAssessments(fetchedAssessments);
        } else {
          setAssessments([...assessments, ...fetchedAssessments]);
        }
        setHasMore(fetchedAssessments.length === limit);
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  useEffect(() => {
    fetchAssessments();
  }, [orderBy]);

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* 顶部标题与自定义测评按钮 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <img
            src="/assets/qiaobao_sunny240.png"
            alt="敢敢"
            className="size-12 rounded-full object-cover border-2 border-amber-400 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                语音精准纠音 · 敢敢发音实验室
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                AI 音素级评测
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              基于国际权威语音评测标准，音素级逐词把关，练就地道自信少儿口语
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/pronunciation_assessments/new")}
            className="rounded-xl border-dashed border-amber-400/60 bg-amber-500/5 hover:bg-amber-500/10 text-xs font-semibold gap-1.5"
          >
            <PlusCircleIcon className="size-4 text-amber-600" />
            <span>自定义文本输入</span>
          </Button>
        </div>
      </div>

      {/* 核心板块 1：今日敢敢推荐精读金句 (Hero Card) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-6 md:p-8 border border-amber-400/30 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-xs">
              <FlameIcon className="size-3.5 fill-white" />
              <span>今日推荐金句 · 每日影子跟读打卡</span>
            </div>

            <div>
              <p className="text-xl md:text-2xl font-extrabold text-foreground tracking-wide font-sans leading-snug">
                "{TODAY_CHALLENGE.text}"
              </p>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {TODAY_CHALLENGE.translation}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
              <span className="bg-white/80 dark:bg-black/30 px-2.5 py-1 rounded-lg border border-amber-400/30">
                🎯 发音重点：{TODAY_CHALLENGE.focus}
              </span>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-3 shrink-0">
            <Button
              variant="outline"
              size="lg"
              className={`flex-1 md:flex-none rounded-2xl gap-2 border-amber-400/60 bg-white/80 dark:bg-black/20 hover:bg-amber-500/20 text-xs md:text-sm font-bold shadow-xs ${
                playingUrl === TODAY_CHALLENGE.audioUrl ? "ring-2 ring-amber-500 bg-amber-500/20 text-amber-700" : ""
              }`}
              onClick={() =>
                playSampleAudio(TODAY_CHALLENGE.text, TODAY_CHALLENGE.audioUrl)
              }
            >
              {playingUrl === TODAY_CHALLENGE.audioUrl ? (
                <>
                  <PauseIcon className="size-4 text-amber-600 fill-amber-600" />
                  <span>暂停示范</span>
                </>
              ) : (
                <>
                  <Volume2Icon className="size-4 text-amber-600" />
                  <span>听外教示范音</span>
                </>
              )}
            </Button>

            <Button
              size="lg"
              className="flex-1 md:flex-none rounded-2xl bg-amber-500 hover:bg-amber-600 text-white gap-2 text-xs md:text-sm font-bold shadow-md"
              onClick={() =>
                handleStartPractice(TODAY_CHALLENGE.text, TODAY_CHALLENGE.audioUrl)
              }
            >
              <MicIcon className="size-4 fill-white" />
              <span>开始跟读测评</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 核心板块 2：SunnyBridge 分级跟读题库 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCapIcon className="size-5 text-amber-600" />
            <h2 className="text-base md:text-lg font-bold text-foreground">
              SunnyBridge 分级精读题库
            </h2>
            <span className="text-xs text-muted-foreground">
              （点选任意句子，即可听音跟读打分）
            </span>
          </div>
        </div>

        <Tabs defaultValue="level1" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md h-11 p-1 bg-muted/60 rounded-2xl">
            {CURATED_LEVELS.map((lvl) => (
              <TabsTrigger
                key={lvl.id}
                value={lvl.id}
                className="rounded-xl text-xs md:text-sm font-bold data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                {lvl.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CURATED_LEVELS.map((lvl) => (
            <TabsContent key={lvl.id} value={lvl.id} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lvl.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          Task 0{idx + 1}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.phonicsFocus}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground font-sans leading-relaxed group-hover:text-amber-600 transition-colors">
                        "{item.text}"
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.translation}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex-1 text-xs rounded-xl h-9 gap-1 text-foreground transition-all ${
                          playingUrl === item.audioUrl
                            ? "bg-amber-500/20 text-amber-700 font-bold"
                            : "hover:bg-amber-500/10"
                        }`}
                        onClick={() => playSampleAudio(item.text, item.audioUrl)}
                      >
                        {playingUrl === item.audioUrl ? (
                          <>
                            <PauseIcon className="size-3.5 text-amber-600 fill-amber-600" />
                            <span>暂停</span>
                          </>
                        ) : (
                          <>
                            <Volume2Icon className="size-3.5 text-amber-600" />
                            <span>试听</span>
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs rounded-xl h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 shadow-xs"
                        onClick={() => handleStartPractice(item.text, item.audioUrl)}
                      >
                        <MicIcon className="size-3.5" />
                        <span>跟读打分</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 核心板块 3：我的纠音成长档案与历史记录 */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyIcon className="size-5 text-amber-600" />
            <h2 className="text-base md:text-lg font-bold text-foreground">
              我的发音成长足迹
            </h2>
            <span className="text-xs text-muted-foreground">
              ({assessments.length} 次练习)
            </span>
          </div>

          {assessments.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t("sortBy")}:</Label>
              <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger className="h-8 text-xs rounded-xl w-36">
                  <SelectValue placeholder={t("select_sort_order")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="createdAtDesc">{t("createdAtDesc")}</SelectItem>
                    <SelectItem value="createdAtAsc">{t("createdAtAsc")}</SelectItem>
                    <SelectItem value="scoreDesc">{t("scoreDesc")}</SelectItem>
                    <SelectItem value="scoreAsc">{t("scoreAsc")}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {assessments.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-muted/20 border border-dashed border-border/80">
            <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <SparklesIcon className="size-7" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">
              还没有测评记录哦
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              点击上方【今日推荐金句】或【分级精读题库】里的任意例句，听完外教示范后跟读录音，即可获得第一张专属发音雷达报告！
            </p>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs"
              onClick={() => handleStartPractice(TODAY_CHALLENGE.text)}
            >
              立即跟读今日推荐金句
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assessments.map((assessment) => (
              <PronunciationAssessmentCard
                key={assessment.id}
                pronunciationAssessment={assessment}
                onSelect={setSelecting}
                onDelete={setDeleting}
                onSharing={setSharing}
              />
            ))}
          </div>
        )}

        {hasMore && assessments.length > 0 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAssessments({ offset: assessments.length })}
              className="rounded-xl text-xs px-6"
            >
              {t("loadMore")}
            </Button>
          </div>
        )}
      </div>

      {/* 测评详情弹窗 Sheet */}
      <Sheet
        open={Boolean(selecting)}
        onOpenChange={(value) => {
          if (!value) setSelecting(null);
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          side="bottom"
          className="rounded-t-2xl shadow-lg max-h-content overflow-y-scroll"
          displayClose={false}
        >
          <SheetHeader className="flex items-center justify-center -mt-4 mb-2">
            <SheetTitle className="sr-only">Assessment</SheetTitle>
            <SheetClose>
              <ChevronDownIcon />
            </SheetClose>
          </SheetHeader>
          {selecting && (
            <RecordingDetail
              recording={
                selecting.target || ({
                  id: selecting.targetId || selecting.id,
                  referenceText:
                    selecting.referenceText ||
                    selecting.result?.display ||
                    "",
                  src: (selecting as any).recordingSrc || "",
                  duration: selecting.result?.duration || 5000,
                  language: selecting.language || "en-US",
                } as any)
              }
              pronunciationAssessment={selecting}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
      >
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("areYouSureToDeleteThisAssessment")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleting)}>
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 分享弹窗 */}
      <AlertDialog
        open={Boolean(sharing)}
        onOpenChange={(value) => {
          if (!value) setSharing(null);
        }}
      >
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("shareRecording")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("areYouSureToShareThisRecordingToCommunity")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={handleShare}>{t("share")}</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
