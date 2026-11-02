import { useEffect, useState, useContext } from "react";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  toast,
} from "@renderer/components/ui";
import {
  GraduationCapIcon,
  BookMarkedIcon,
  MicIcon,
  SparklesIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  CalendarIcon,
  AwardIcon,
  BotIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  PencilIcon,
  CheckIcon,
  RotateCcwIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import dayjs from "@renderer/lib/dayjs";
import { DailyReportDialog } from "@renderer/components/daily-report-dialog";
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
import {
  getSrsStore,
  countDueFromStore,
  SRS_EVENT,
} from "@renderer/lib/vocab-srs";

export default () => {
  const navigate = useNavigate();
  const { user, webApi, EnjoyApp, login } = useContext(AppSettingsProviderContext);

  const [vocabularyCount, setVocabularyCount] = useState<number>(0);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openReport, setOpenReport] = useState<boolean>(false);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [newNameInput, setNewNameInput] = useState<string>("");

  // Default WeChat-ID-based designation
  const defaultWechatName = user?.isGuest
    ? "阳光桥体验学员"
    : user?.id
    ? `微信学员_${user.id.replace(/^mock_wx_|^wx_student_/, "").slice(-6).toUpperCase()}`
    : "阳光桥学员";

  const displayName = user?.name || defaultWechatName;

  const handleOpenEdit = () => {
    setNewNameInput(user?.name || defaultWechatName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = newNameInput.trim();
    const finalName = trimmed || defaultWechatName;

    const updatedUser = {
      ...(user || {}),
      id: user?.id || `student_${Date.now()}`,
      name: finalName,
      avatarUrl: user?.avatarUrl || "/assets/qiaobao_sunny240.png",
      role: user?.role || "student",
      isGuest: user?.isGuest ?? false,
    };

    if (login) {
      login(updatedUser as any);
    }
    try {
      localStorage.setItem("sunnybridge_user", JSON.stringify(updatedUser));
      if (EnjoyApp?.appSettings?.setUser) {
        await EnjoyApp.appSettings.setUser(updatedUser);
      }
    } catch (e) {
      console.error("Save user error:", e);
    }

    toast.success(`🎉 学员姓名已更新为：“${finalName}”`);
    setIsEditingName(false);
  };

  useEffect(() => {
    // 1. Fetch user vocabulary count
    webApi
      .mineMeanings({ page: 1, items: 1 })
      .then((res: any) => {
        setVocabularyCount(res?.total ?? res?.meanings?.length ?? 0);
      })
      .catch((err) => console.error("fetch meanings count error:", err));

    // 2. Fetch enrolled courses
    webApi
      .courses()
      .then((res: any) => {
        setCourses(res?.courses || []);
      })
      .catch((err) => console.error("fetch courses error:", err));

    setLoading(false);
  }, []);

  // ===== U3 真实学习数据（音素掌握/对话课进度/SRS） =====
  const [masteryMap, setMasteryMap] = useState<Record<string, boolean>>(() =>
    getPhonemeMasteryMap()
  );
  const [dialogueProgress, setDialogueProgress] =
    useState<DialogueProgressMap>(() => getDialogueProgress());
  const [dialoguePack, setDialoguePack] = useState<DialoguePack | null>(null);
  const [, setSrsTick] = useState(0);

  useEffect(() => {
    const unsubP = subscribePhonemeMastery((state) => {
      if (state?.masteryMap) setMasteryMap(state.masteryMap);
    });
    const unsubD = subscribeDialogueProgress((prog) => {
      setDialogueProgress(prog);
    });
    const onSrs = () => setSrsTick((t) => t + 1);
    window.addEventListener(SRS_EVENT, onSrs);
    let mounted = true;
    getDialoguePack()
      .then((data) => {
        if (mounted) setDialoguePack(data);
      })
      .catch(() => {});
    return () => {
      unsubP();
      unsubD();
      window.removeEventListener(SRS_EVENT, onSrs);
      mounted = false;
    };
  }, []);

  const masteredCount = ALL_39_PHONEMES.filter(
    (p) => !!masteryMap[p.slug]
  ).length;
  const nextPhoneme = ALL_39_PHONEMES.find((p) => !masteryMap[p.slug]);
  const srsStore = getSrsStore();
  const srsLearned = Object.keys(srsStore).length;
  const srsDue = countDueFromStore();
  const dialogueScores = Object.values(dialogueProgress).flatMap((p) =>
    Object.values(p.bestScores || {})
  );
  const dialogueBest = dialogueScores.length
    ? Math.max(...dialogueScores)
    : 0;
  const dialogueDoneCount = Object.values(dialogueProgress).filter(
    (p) => p.stars > 0
  ).length;
  const dialogueTarget = (() => {
    if (!dialoguePack?.lessons) return null;
    for (const lesson of dialoguePack.lessons) {
      const prog = dialogueProgress[lesson.lessonId];
      if (!prog || prog.stars === 0) {
        return {
          lesson,
          practiced: prog
            ? Object.keys(prog.bestScores || {}).length
            : 0,
          total: lesson.lines.length,
        };
      }
    }
    return null;
  })();
  const dialogueAllDone =
    !!dialoguePack?.lessons?.length && !dialogueTarget;

  const enrolledCourses = courses.filter((c) => c.enrolled !== false);
  const displayCourses = enrolledCourses.length > 0 ? enrolledCourses : courses;

  return (
    <div className="min-h-full px-4 py-8 lg:px-8 max-w-5xl mx-auto space-y-8 pb-16">
      {/* 1. Student Hero Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-primary/10 border border-amber-500/20 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Glow Ring */}
          <div className="relative">
            <img
              src={user?.avatarUrl || "/assets/qiaobao_sunny240.png"}
              alt={user?.name || "学员头像"}
              className="size-24 rounded-full object-cover border-4 border-background shadow-md bg-white"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-background shadow-xs">
              <CheckCircle2Icon className="size-4" />
            </div>
          </div>

          {/* Student Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 className="text-2xl font-bold font-serif text-foreground">
                {displayName}
              </h1>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 rounded-full text-xs gap-1 border-primary/40 hover:bg-primary/10 text-primary shadow-2xs font-sans"
                onClick={handleOpenEdit}
              >
                <PencilIcon className="size-3" />
                <span>修改名字</span>
              </Button>
              {user?.isGuest ? (
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  游客体验中
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheckIcon className="size-3.5" />
                  微信正式学员 · 永久档案
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5" />
                加入学习：{dayjs(user?.createdAt).format("YYYY年MM月DD日")}
              </span>
              <span className="flex items-center gap-1.5">
                <SparklesIcon className="size-3.5 text-amber-500" />
                伴学导师：小狮子敢敢 (AI 专属外教)
              </span>
            </p>

            <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl gap-1.5 shadow-xs"
                onClick={() =>
                  window.open("https://www.sunnybridge.qzz.io/apply.html", "_blank")
                }
              >
                <SparklesIcon className="size-4" />
                <span>预约真人外教 · 课程咨询</span>
                <ExternalLinkIcon className="size-3 ml-0.5 opacity-80" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1.5"
                onClick={() => navigate("/courses")}
              >
                <GraduationCapIcon className="size-4" />
                <span>进入课程中心</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl gap-1.5 border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold"
                onClick={() => setOpenReport(true)}
              >
                <span>📜 一键生成今日战报</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 1.5 今日任务（全部真实数据） */}
      <div className="bg-card border rounded-3xl p-5 md:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black flex items-center gap-2">
            📋 今日任务
          </h2>
          <span className="text-[11px] font-bold text-muted-foreground">
            {dayjs().format("M月D日")} · 完成一项少一项
          </span>
        </div>

        {/* 任务一：生词复习 */}
        <button
          onClick={() => navigate("/vocabulary")}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-rose-200/80 bg-rose-50/50 p-3.5 text-left transition-all hover:border-rose-300"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <RotateCcwIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">
              {srsDue > 0
                ? `复习 ${srsDue} 个到期生词`
                : srsLearned > 0
                ? "生词复习已跟上 🎉"
                : vocabularyCount > 0
                ? "开始第一轮生词复习"
                : "收录你的第一个生词"}
            </span>
            <span className="block text-[11px] font-bold text-muted-foreground">
              {srsDue > 0
                ? "间隔重复 · 今天不复习，明天要补更多"
                : `已学 ${srsLearned} 词 · 共收录 ${vocabularyCount} 词`}
            </span>
          </span>
          {srsDue === 0 && srsLearned > 0 ? (
            <CheckCircle2Icon className="size-5 shrink-0 text-emerald-500" />
          ) : (
            <ArrowRightIcon className="size-4 shrink-0 text-rose-400" />
          )}
        </button>

        {/* 任务二：对话课 */}
        {dialoguePack && (
          <button
            onClick={() =>
              navigate(
                dialogueTarget
                  ? `/dialogues/${dialogueTarget.lesson.lessonId}`
                  : "/dialogues"
              )
            }
            className="w-full flex items-center gap-3 rounded-2xl border-2 border-violet-200/80 bg-violet-50/50 p-3.5 text-left transition-all hover:border-violet-300"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <MicIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black">
                {dialogueAllDone
                  ? "情景对话课全部完成 🎉"
                  : dialogueTarget
                  ? `${
                      dialogueTarget.practiced > 0 ? "继续" : "开始"
                    }对话课《${dialogueTarget.lesson.sceneZh}》`
                  : "情景对话课"}
              </span>
              <span className="block text-[11px] font-bold text-muted-foreground">
                {dialogueAllDone
                  ? `共 ${dialoguePack.lessons.length} 节 · 最佳分 ${dialogueBest}`
                  : dialogueTarget
                  ? dialogueTarget.practiced > 0
                    ? `进行中 · 已练 ${dialogueTarget.practiced}/${dialogueTarget.total} 句`
                    : `共 ${dialogueTarget.total} 句 · 已完成 ${dialogueDoneCount}/${dialoguePack.lessons.length} 节`
                  : ""}
              </span>
            </span>
            {dialogueAllDone ? (
              <CheckCircle2Icon className="size-5 shrink-0 text-emerald-500" />
            ) : (
              <ArrowRightIcon className="size-4 shrink-0 text-violet-400" />
            )}
          </button>
        )}

        {/* 任务三：拼读 */}
        <button
          onClick={() => navigate("/phonemes")}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 p-3.5 text-left transition-all hover:border-amber-300"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <SparklesIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">
              {nextPhoneme
                ? `点亮音素 /${nextPhoneme.slug}/`
                : "39 个音素全部点亮 🎉"}
            </span>
            <span className="block text-[11px] font-bold text-muted-foreground">
              已点亮 {masteredCount}/39 · 自然拼读通关岛
            </span>
          </span>
          {!nextPhoneme ? (
            <CheckCircle2Icon className="size-5 shrink-0 text-emerald-500" />
          ) : (
            <ArrowRightIcon className="size-4 shrink-0 text-amber-400" />
          )}
        </button>
      </div>

      {/* 2. Key Learning Achievements Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: 自然拼读通关星（真实掌握数） */}
        <div
          onClick={() => navigate("/phonemes")}
          className="cursor-pointer group bg-card hover:bg-muted/40 transition-all border rounded-2xl p-5 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <SparklesIcon className="size-5" />
            </div>
            <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-serif mb-0.5">
            {masteredCount}
            <span className="text-base text-muted-foreground"> / 39</span>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            自然拼读通关星
          </div>
        </div>

        {/* Metric 2: 生词已学（SRS 真实记录） */}
        <div
          onClick={() => navigate("/vocabulary")}
          className="cursor-pointer group bg-card hover:bg-muted/40 transition-all border rounded-2xl p-5 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <BookMarkedIcon className="size-5" />
            </div>
            <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-serif mb-0.5">
            {srsLearned}
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            生词已学 · 共收录 {vocabularyCount} 词
          </div>
        </div>

        {/* Metric 3: 对话课最佳分（真实评测分） */}
        <div
          onClick={() => navigate("/dialogues")}
          className="cursor-pointer group bg-card hover:bg-muted/40 transition-all border rounded-2xl p-5 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <MicIcon className="size-5" />
            </div>
            <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-serif mb-0.5">
            {dialogueBest > 0 ? dialogueBest : "—"}
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            对话课最佳分 · 已完成 {dialogueDoneCount}/{dialoguePack?.lessons.length ?? 12} 节
          </div>
        </div>

        {/* Metric 4: SRS 待复习（真实到期数） */}
        <div
          onClick={() => navigate("/vocabulary")}
          className={`cursor-pointer group bg-card hover:bg-muted/40 transition-all border rounded-2xl p-5 shadow-xs ${
            srsDue > 0 ? "border-rose-300 bg-rose-50/40" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <RotateCcwIcon className="size-5" />
            </div>
            <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-serif mb-0.5">{srsDue}</div>
          <div className="text-xs text-muted-foreground font-medium">
            {srsDue > 0 ? "生词待复习 · 别让记忆溜走" : "生词待复习 · 全部跟上"}
          </div>
        </div>
      </div>

      {/* 3. My Courses & Learning Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AwardIcon className="size-5 text-primary" />
            <h2 className="text-lg font-bold">我的在读少儿课程</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/courses")}
            className="text-xs text-primary"
          >
            <span>全部课程</span>
            <ArrowRightIcon className="size-3 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {displayCourses.slice(0, 3).map((course) => {
            const currentSeq = course.enrollment?.current_chapter_sequence || 1;
            const totalChapters = course.chaptersCount || 3;
            const progressPct = Math.round((currentSeq / totalChapters) * 100);

            return (
              <div
                key={course.id}
                className="bg-card border rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="h-32 bg-muted relative overflow-hidden">
                    <img
                      src={course.coverUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                      共 {totalChapters} 单元
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>学习进度</span>
                      <span className="font-semibold text-primary">
                        第 {currentSeq} / {totalChapters} 单元 ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full rounded-xl gap-1 text-xs"
                    onClick={() =>
                      navigate(
                        `/courses/${course.id}/chapters/${currentSeq}`
                      )
                    }
                  >
                    <span>继续学习第 {currentSeq} 单元</span>
                    <ArrowRightIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Student VIP Privileges Banner */}
      <div className="bg-card border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <SparklesIcon className="size-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm">SunnyBridge 阳光桥 VIP 学员专属权益</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              享有小狮子敢敢不限次纯正美式口语陪练、神经元精准音素纠音及进度永久云端备份。
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl shrink-0 text-xs gap-1"
          onClick={() =>
            window.open("https://www.sunnybridge.qzz.io/apply.html", "_blank")
          }
        >
          <span>了解更多学员权益</span>
          <ArrowRightIcon className="size-3" />
        </Button>
      </div>

      {/* Edit Student Name Modal */}
      <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <PencilIcon className="size-5 text-primary" />
              修改学员姓名 / 英文名
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              设置您或宝贝的专属名字（建议填写英文名如 Lucas, Emma，或中文小名），将实时同步展示在<strong>个人主页、左侧栏、发音测评报告、荣誉勋章</strong>中。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                学员姓名 / 英文名
              </label>
              <Input
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                placeholder="请输入宝贝专属英文名或小名，例如: Lucas Li / 乐乐"
                className="rounded-xl h-10 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveName();
                  }
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                💡 建议填写孩子真实英文名（可加姓氏如 Lucas Li），让学习报告与勋章具备独一无二的专属感。
              </p>
            </div>

            <div className="pt-1 flex items-center justify-start">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs rounded-full px-2.5 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setNewNameInput(defaultWechatName)}
              >
                <RotateCcwIcon className="size-3 mr-1" />
                还原为微信学籍号 ({defaultWechatName})
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setIsEditingName(false)}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-primary text-primary-foreground font-medium gap-1.5"
              onClick={handleSaveName}
            >
              <CheckIcon className="size-4" />
              保存名字
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 今日学情战报弹窗 */}
      <DailyReportDialog open={openReport} onOpenChange={setOpenReport} />
    </div>
  );
};
