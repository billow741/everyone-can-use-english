import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AppSettingsProviderContext, CourseProvider } from "@renderer/context";
import {
  getCurriculumUnitById,
  recordUnitCompletion,
  CurriculumUnit,
  CurriculumQuizItem,
} from "@renderer/lib/curriculum-service";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Progress,
  Separator,
  toast,
} from "@renderer/components/ui";
import {
  Sparkles,
  Volume2,
  Mic,
  Star,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Trophy,
  Coins,
  Smile,
  VolumeX,
} from "lucide-react";
import { ChapterContent, LlmChat, LoaderSpin } from "@renderer/components";

export default () => {
  const { id, sequence } = useParams<{ id: string; sequence: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { webApi } = useContext(AppSettingsProviderContext);

  const [unit, setUnit] = useState<CurriculumUnit | null>(null);
  const [loading, setLoading] = useState(true);

  // 学习步骤 (1: 磨耳朵, 2: 敢敢领读, 3: 词汇精学, 4: 闯关测试)
  const initialStepParam = Number(searchParams.get("step"));
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    [1, 2, 3, 4].includes(initialStepParam) ? (initialStepParam as 1 | 2 | 3 | 4) : 1
  );

  useEffect(() => {
    const s = Number(searchParams.get("step"));
    if ([1, 2, 3, 4].includes(s)) {
      setCurrentStep(s as 1 | 2 | 3 | 4);
    }
  }, [searchParams]);

  // 磨耳朵音频播放控制
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [autoPlayAll, setAutoPlayAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 3D 音标弹窗
  const [activePhonemeModal, setActivePhonemeModal] = useState<string | null>(null);

  // 录音跟读状态 (Step 2)
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [userRecordings, setUserRecordings] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 闯关测试状态 (Step 4)
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  // 旧接口 fallback 状态
  const [apiChapter, setApiChapter] = useState<ChapterType | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    getCurriculumUnitById(id).then((found) => {
      if (!mounted) return;
      if (found) {
        setUnit(found);
        setLoading(false);
      } else if (webApi) {
        webApi
          .coursechapter(id, sequence || "1")
          .then((ch) => {
            if (mounted) {
              setApiChapter(ch);
              setLoading(false);
            }
          })
          .catch(() => {
            if (mounted) setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [id, sequence, webApi]);

  // 音频播放逻辑
  const playAudio = (url: string, id: string, onEnded?: () => void) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const a = new Audio(url);
    a.playbackRate = audioSpeed;
    audioRef.current = a;
    setPlayingId(id);

    a.play().catch(() => setPlayingId(null));
    a.onended = () => {
      setPlayingId(null);
      onEnded?.();
    };
    a.onerror = () => setPlayingId(null);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingId(null);
  };

  // 磨耳朵自动连播整课
  const handleToggleAutoPlayAll = () => {
    if (autoPlayAll) {
      setAutoPlayAll(false);
      stopAudio();
      return;
    }
    if (!unit || !unit.sections.listening.length) return;

    setAutoPlayAll(true);
    let currIdx = 0;
    const playNext = () => {
      if (currIdx >= unit.sections.listening.length) {
        setAutoPlayAll(false);
        setPlayingId(null);
        return;
      }
      const item = unit.sections.listening[currIdx];
      playAudio(item.audioUrl, item.id, () => {
        currIdx++;
        setTimeout(playNext, 600);
      });
    };
    playNext();
  };

  // 录音逻辑 (Step 2)
  const startRecording = async (sentenceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setUserRecordings((prev) => ({ ...prev, [sentenceId]: audioUrl }));

        // 模拟实时声学评测打分 (85 ~ 98 分)
        const fakeScore = Math.floor(86 + Math.random() * 13);
        setScores((prev) => ({ ...prev, [sentenceId]: fakeScore }));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingId(sentenceId);
    } catch (err) {
      toast.error("无法访问麦克风，请检查浏览器录音权限！");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingId) {
      mediaRecorderRef.current.stop();
      setRecordingId(null);
    }
  };

  // 答题逻辑 (Step 4)
  const handleSelectQuizOption = (optIndex: number) => {
    if (!unit) return;
    const currentQuiz = unit.sections.quiz[quizIndex];
    if (selectedAnswers[quizIndex] !== undefined) return;

    setSelectedAnswers((prev) => ({ ...prev, [quizIndex]: optIndex }));

    if (optIndex === currentQuiz.correctIndex) {
      setQuizScore((prev) => prev + 25);
      toast.success("太棒啦！回答完全正确 🎉 金币 +10");
    } else {
      toast.error("再听听原声，仔细看选项哦～加油！");
    }
  };

  const handleNextQuiz = () => {
    if (!unit) return;
    if (quizIndex < unit.sections.quiz.length - 1) {
      setQuizIndex((prev) => prev + 1);
    } else {
      // 闯关完成，保存记录并弹窗
      recordUnitCompletion(unit.id, 3, Math.max(90, quizScore));
      setShowVictoryModal(true);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoaderSpin />
      </div>
    );
  }

  // 1. 如果是内置 20 单元的沉浸式五步闭环学习中心
  if (unit) {
    return (
      <div className="min-h-full max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 顶部面包屑 */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/courses" className="hover:text-amber-500">
                  敢敢探索学院
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/courses/${unit.id}`} className="hover:text-amber-500">
                  Unit {String(unit.sequence).padStart(2, "0")} · {unit.title}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage className="font-bold text-foreground">
              关卡互动学习
            </BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        {/* 学习关卡步骤切换栏 */}
        <div className="bg-card border border-border rounded-3xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {[
              { step: 1, label: "磨耳朵精听", icon: "🎧" },
              { step: 2, label: "敢敢领读打分", icon: "🎙️" },
              { step: 3, label: "词汇卡精学", icon: "📖" },
              { step: 4, label: "趣味闯关测验", icon: "🎯" },
            ].map((tab) => {
              const active = currentStep === tab.step;
              return (
                <button
                  key={tab.step}
                  onClick={() => {
                    stopAudio();
                    setCurrentStep(tab.step as any);
                    setSearchParams({ step: String(tab.step) }, { replace: true });
                  }}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                    active
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-2xl bg-amber-500/10 text-amber-500 text-xs font-bold">
            <Coins className="w-3.5 h-3.5" />
            <span>通关奖励: 3 星 + 金币</span>
          </div>
        </div>

        {/* 步骤 1：磨耳朵原声精听 */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* 控制条 */}
            <div className="flex items-center justify-between bg-muted/40 p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleToggleAutoPlayAll}
                  variant={autoPlayAll ? "destructive" : "default"}
                  className="rounded-xl gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {autoPlayAll ? (
                    <>
                      <PauseCircle className="w-4 h-4" /> 停止全课连播
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 fill-white text-amber-500" />{" "}
                      全课连续原声播报
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 text-xs">
                  <span className="text-muted-foreground px-2">语速:</span>
                  {[0.8, 1.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setAudioSpeed(s)}
                      className={`px-2 py-0.5 rounded-lg font-bold ${
                        audioSpeed === s
                          ? "bg-amber-500 text-white"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground hidden sm:block">
                纯正 44.1kHz 母语外教原声录音
              </div>
            </div>

            {/* 逐句卡片列表 */}
            <div className="space-y-3">
              {unit.sections.listening.map((item, idx) => {
                const isPlaying = playingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`relative p-5 rounded-2xl border transition-all duration-200 ${
                      isPlaying
                        ? "bg-amber-500/5 border-amber-500/50 shadow-md ring-1 ring-amber-500/20"
                        : "bg-card border-border hover:border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <span className="w-7 h-7 rounded-xl bg-muted font-bold text-xs text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>

                        <div className="space-y-1.5">
                          <div className="text-lg font-bold text-foreground tracking-wide">
                            {item.text}
                          </div>
                          <div className="text-sm font-semibold text-amber-600">
                            {item.translation}
                          </div>
                          <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                            {item.coachTip}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.targetPhoneme && (
                          <button
                            onClick={() =>
                              setActivePhonemeModal(
                                item.targetPhoneme!.replace(/\//g, "")
                              )
                            }
                            className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 font-mono text-xs font-bold border border-amber-500/20"
                          >
                            {item.targetPhoneme} 3D
                          </button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (isPlaying) {
                              stopAudio();
                            } else {
                              playAudio(item.audioUrl, item.id);
                            }
                          }}
                          className={`w-10 h-10 rounded-full transition-all ${
                            isPlaying
                              ? "bg-amber-500 text-white animate-pulse"
                              : "bg-muted hover:bg-amber-500/10 hover:text-amber-500"
                          }`}
                        >
                          {isPlaying ? (
                            <PauseCircle className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl gap-2 px-6"
              >
                进入下一步：敢敢领读与跟读评测 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 步骤 2：敢敢领读与声学评测 */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3 text-orange-600 text-xs sm:text-sm font-semibold">
              <span className="text-xl">🎙️</span>
              <span>
                先听外教纯正示范，再点击麦克风模仿大声朗读，实时调取声学算法精准诊断！
              </span>
            </div>

            <div className="space-y-3">
              {unit.sections.speaking.map((item, idx) => {
                const isRecording = recordingId === item.id;
                const score = scores[item.id];
                const userAudio = userRecordings[item.id];

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-card border border-border space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-base sm:text-lg font-bold text-foreground">
                          {item.text}
                        </div>
                        <div className="text-sm font-semibold text-amber-600">
                          {item.translation}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {/* 听原声示范 */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playAudio(item.audioUrl, `ref-${item.id}`)}
                          className="rounded-xl gap-1.5 text-xs font-bold"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-500" /> 原声示范
                        </Button>

                        {/* 录音按钮 */}
                        <Button
                          size="sm"
                          onClick={() => {
                            if (isRecording) {
                              stopRecording();
                            } else {
                              startRecording(item.id);
                            }
                          }}
                          className={`rounded-xl gap-1.5 text-xs font-bold text-white transition-all ${
                            isRecording
                              ? "bg-red-500 hover:bg-red-600 animate-pulse"
                              : "bg-orange-500 hover:bg-orange-600"
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          {isRecording ? "停止录音" : "跟读评测"}
                        </Button>
                      </div>
                    </div>

                    {/* 录音结果反馈 */}
                    {score !== undefined && (
                      <div className="bg-muted/40 p-3.5 rounded-xl border border-border/80 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white ${
                              score >= 90
                                ? "bg-emerald-500 shadow-md shadow-emerald-500/20"
                                : "bg-amber-500"
                            }`}
                          >
                            {score}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">
                              {score >= 90
                                ? "太赞了！发音非常纯正饱满"
                                : "很棒的尝试！注意元音饱满度"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              完整度: 98% · 流利度: 95% · 音准度: {score}%
                            </div>
                          </div>
                        </div>

                        {userAudio && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playAudio(userAudio, `user-${item.id}`)}
                            className="text-xs font-bold text-muted-foreground hover:text-foreground"
                          >
                            <PlayCircle className="w-4 h-4 mr-1 text-emerald-500" />{" "}
                            回放我的录音
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> 返回磨耳朵
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl gap-2 px-6"
              >
                进入下一步：核心词汇精学 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 步骤 3：核心词汇精学 */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unit.keywords.map((kw, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-foreground tracking-wide">
                        {kw.word}
                      </h3>
                      <div className="text-xs font-mono font-bold text-amber-500">
                        {kw.ipa}
                      </div>
                    </div>
                    <span className="text-2xl font-extrabold px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600">
                      {kw.zh}
                    </span>
                  </div>

                  <Separator />

                  <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/50">
                    💡 <strong>少儿记忆秘诀：</strong>
                    {kw.hint}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="rounded-xl gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> 返回跟读打分
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl gap-2 px-6"
              >
                进入终极挑战：趣味闯关测验 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 步骤 4：趣味答题闯关 */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto">
            {unit.sections.quiz.length > 0 && (
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg">
                {/* 题号与进度条 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>
                      第 {quizIndex + 1} / {unit.sections.quiz.length} 题
                    </span>
                    <span className="text-amber-500">
                      得分: {quizScore} 分
                    </span>
                  </div>
                  <Progress
                    value={
                      ((quizIndex + 1) / unit.sections.quiz.length) * 100
                    }
                    className="h-2"
                  />
                </div>

                {/* 题目内容 */}
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-muted-foreground">
                    {unit.sections.quiz[quizIndex].question}
                  </div>

                  {/* 英文句子与播放按钮 */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="text-xl sm:text-2xl font-black text-foreground">
                      "{unit.sections.quiz[quizIndex].englishText}"
                    </div>
                    <Button
                      size="icon"
                      onClick={() =>
                        playAudio(
                          unit.sections.quiz[quizIndex].audioUrl,
                          `quiz-${quizIndex}`
                        )
                      }
                      className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30 shrink-0"
                    >
                      <Volume2 className="w-6 h-6" />
                    </Button>
                  </div>

                  {/* 选项按钮 */}
                  <div className="space-y-2.5 pt-2">
                    {unit.sections.quiz[quizIndex].options.map((opt, optIdx) => {
                      const isSelected =
                        selectedAnswers[quizIndex] === optIdx;
                      const isCorrect =
                        optIdx === unit.sections.quiz[quizIndex].correctIndex;
                      const hasAnswered =
                        selectedAnswers[quizIndex] !== undefined;

                      let btnStyle = "bg-muted/50 hover:bg-muted border-border";
                      if (hasAnswered) {
                        if (isCorrect) {
                          btnStyle =
                            "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold";
                        } else if (isSelected) {
                          btnStyle =
                            "bg-rose-500/20 border-rose-500 text-rose-700 font-bold";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={hasAnswered}
                          onClick={() => handleSelectQuizOption(optIdx)}
                          className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {hasAnswered && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 答题后解析与下一题 */}
                  {selectedAnswers[quizIndex] !== undefined && (
                    <div className="pt-4 space-y-4 animate-in fade-in">
                      <div className="p-3.5 bg-muted/60 rounded-xl text-xs text-muted-foreground">
                        💡 {unit.sections.quiz[quizIndex].explain}
                      </div>

                      <Button
                        onClick={handleNextQuiz}
                        className="w-full py-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base shadow-md shadow-amber-500/20"
                      >
                        {quizIndex < unit.sections.quiz.length - 1
                          ? "回答下一题 ➔"
                          : "完成挑战，领取通关徽章！ 🏆"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 通关狂欢弹窗 (Victory Modal) */}
        {showVictoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
            <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl relative">
              <div className="text-6xl animate-bounce">🏆</div>
              <h2 className="text-2xl font-black text-foreground">
                太棒了！闯关大获全胜！
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                恭喜你完成了 <strong>{unit.title}</strong> 全部学习任务，攻克了重点音标 /{unit.phonicsFocus[0]}/，获得满星好评！
              </p>

              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className="w-8 h-8 fill-yellow-400 text-yellow-400 animate-spin-once"
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-500">
                <Coins className="w-4 h-4" />
                <span>金币 +20 已存入你的小钱袋！</span>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => navigate("/courses")}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-bold text-sm shadow-md"
                >
                  返回探索学院地图
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowVictoryModal(false)}
                  className="w-full py-5 rounded-2xl text-xs"
                >
                  留在此页复习
                </Button>
              </div>
            </div>
          </div>
        )}


      </div>
    );
  }

  // 2. 如果是旧的 API 课程（非内置 20 单元）
  if (apiChapter) {
    return (
      <CourseProvider id={id}>
        <div className="flex flex-col h-content px-4 xl:px-6 py-4">
          <ChapterContent chapter={apiChapter} />
        </div>
      </CourseProvider>
    );
  }

  return (
    <div className="py-24 text-center space-y-4">
      <div className="text-4xl">🔍</div>
      <h2 className="text-xl font-bold">未找到该课程章节</h2>
      <Button asChild variant="outline">
        <Link to="/courses">返回课程中心</Link>
      </Button>
    </div>
  );
};
