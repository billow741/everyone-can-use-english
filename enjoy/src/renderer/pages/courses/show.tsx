import React, { useContext, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  getCurriculumUnitById,
  getUserCurriculumProgress,
  CurriculumUnit,
} from "@renderer/lib/curriculum-service";
import { ArticulatoryTongueVisualizer } from "@renderer/components/pronunciation-assessments/articulatory-tongue-visualizer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
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
  HelpCircle,
  ArrowRight,
  BookOpen,
  Award,
} from "lucide-react";
import { Chapters, LoaderSpin } from "@renderer/components";

export default () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { webApi } = useContext(AppSettingsProviderContext);

  const [unit, setUnit] = useState<CurriculumUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [activePhonemeModal, setActivePhonemeModal] = useState<string | null>(null);

  // 云端旧接口 fallback 状态
  const [apiCourse, setApiCourse] = useState<CourseType | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    // 首选加载内置 20 单元体系
    getCurriculumUnitById(id).then((found) => {
      if (!mounted) return;
      if (found) {
        setUnit(found);
        setLoading(false);
      } else if (webApi) {
        // 尝试从 Web API 加载
        webApi
          .course(id)
          .then((c) => {
            if (mounted) {
              setApiCourse(c);
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
    };
  }, [id, webApi]);

  const handlePlayAudio = (url: string) => {
    if (playingAudio === url) {
      setPlayingAudio(null);
      return;
    }
    const a = new Audio(url);
    setPlayingAudio(url);
    a.play().catch(() => setPlayingAudio(null));
    a.onended = () => setPlayingAudio(null);
    a.onerror = () => setPlayingAudio(null);
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <LoaderSpin />
      </div>
    );
  }

  // 1. 如果是 20 进阶单元：展示高品质少儿沉浸式全景大纲
  if (unit) {
    const progress = getUserCurriculumProgress();
    const isCompleted = progress.completedUnitIds.includes(unit.id);
    const stars = progress.unitStars[unit.id] || 0;

    return (
      <div className="min-h-full max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 面包屑导航 */}
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
              <span className="text-muted-foreground">{unit.levelName}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage className="font-bold text-foreground">
              Unit {String(unit.sequence).padStart(2, "0")} · {unit.title}
            </BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        {/* 单元头部卡片 */}
        <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-sm">
          <div
            className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${unit.gradient}`}
          />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              <div
                className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${unit.gradient} flex items-center justify-center text-4xl shadow-lg shrink-0`}
              >
                {unit.icon}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-500">
                    Unit {String(unit.sequence).padStart(2, "0")} · {unit.levelName}
                  </span>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 已通关
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {unit.title}
                </h1>
                <div className="text-sm font-medium text-muted-foreground">
                  {unit.titleEn}
                </div>
                <p className="text-sm text-muted-foreground/90 max-w-xl pt-1">
                  {unit.tagline}
                </p>
              </div>
            </div>

            {/* 快速进入学习按钮 */}
            <div className="w-full md:w-auto flex flex-col items-center gap-2">
              <Button
                onClick={() => navigate(`/courses/${unit.id}/chapters/1`)}
                className="w-full md:w-auto px-8 py-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5 fill-white text-orange-500" />
                {isCompleted ? "重新进入学习" : "立即开启探索"}
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>最高成就:</span>
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= stars
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 核心亮点与音标靶向卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 重点培养目标 */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <Award className="w-4 h-4 text-amber-500" />
              单元学习目标
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {unit.learningObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 重点音标与 3D 口型联动 */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                重点音标剖析 · 3D 口型透视
              </div>
              <span className="text-[11px] text-muted-foreground">
                点击音标即可调出 Tell Me More 3D 解剖动图
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {unit.phonicsFocus.map((ph) => (
                <button
                  key={ph}
                  onClick={() => setActivePhonemeModal(ph)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 font-bold text-sm transition-all hover:scale-105"
                >
                  <span className="font-mono">/{ph}/</span>
                  <span className="text-xs text-amber-500/80 font-normal group-hover:text-amber-600">
                    查看 3D 发音指导
                  </span>
                </button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-xl border border-border/50 flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>
                <strong>发音秘诀：</strong>
                {unit.phonicsChant}
              </span>
            </div>
          </div>
        </div>

        {/* 核心词汇小卡片 */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-base text-foreground">
              <BookOpen className="w-4 h-4 text-amber-500" />
              核心词汇速递 (Words to Keep)
            </div>
            <span className="text-xs text-muted-foreground">共 4 个重点生词</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {unit.keywords.map((kw, idx) => (
              <div
                key={idx}
                className="bg-muted/40 hover:bg-muted border border-border/80 hover:border-amber-500/40 rounded-xl p-3.5 space-y-1 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{kw.word}</span>
                  <span className="text-[11px] font-mono text-amber-500">{kw.ipa}</span>
                </div>
                <div className="text-xs font-semibold text-muted-foreground">{kw.zh}</div>
                <div className="text-[10px] text-muted-foreground/80 line-clamp-1">
                  {kw.hint}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 四步闭环关卡路线图 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>🗺️</span> 单元学习关卡路线 (Learning Steps)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1: 磨耳朵精听 */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      磨耳朵原声精听
                    </h3>
                    <div className="text-[11px] text-muted-foreground">
                      8 句地道情景原声
                    </div>
                  </div>
                </div>
                <Volume2 className="w-5 h-5 text-blue-500/40" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                听英国/美国专业外教纯正原声朗读，对照少儿易懂中文释义，培养第一语感。
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-blue-500 font-bold">
                <span>包含原声音频</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  进入关卡 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Step 2: 敢敢领读打分 */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      敢敢领读与跟读评测
                    </h3>
                    <div className="text-[11px] text-muted-foreground">
                      5 句核心句挑战
                    </div>
                  </div>
                </div>
                <Mic className="w-5 h-5 text-orange-500/40" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                大声朗读，实时调取声学算法精准纠音，检测音准与节奏，攻克易错音标。
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-orange-500 font-bold">
                <span>实时声学反馈</span>
                <span className="flex items-center gap-1">
                  进入挑战 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Step 3: 词汇精学 */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      核心词汇速记与拼读
                    </h3>
                    <div className="text-[11px] text-muted-foreground">
                      4 个高频单词卡
                    </div>
                  </div>
                </div>
                <BookOpen className="w-5 h-5 text-purple-500/40" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                掌握主题高频单词的标准发音、拼读结构与例句用法，打牢词汇基础。
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-purple-500 font-bold">
                <span>卡片式记忆</span>
                <span className="flex items-center gap-1">
                  复习词汇 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Step 4: 趣味答题闯关 */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      趣味互动闯关测验
                    </h3>
                    <div className="text-[11px] text-muted-foreground">
                      赢取 3 颗小金星
                    </div>
                  </div>
                </div>
                <HelpCircle className="w-5 h-5 text-emerald-500/40" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                听音辨义趣味选择题，答对即获金币奖励，结算解锁通关徽章！
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-emerald-500 font-bold">
                <span>游戏化金币激励</span>
                <span className="flex items-center gap-1">
                  开始闯关 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D 音标模态弹窗 */}
        {activePhonemeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 relative">
              <button
                onClick={() => setActivePhonemeModal(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-bold w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                ✕
              </button>
              <ArticulatoryTongueVisualizer
                phoneme={activePhonemeModal}
                word={unit.keywords[0]?.word}
                onClose={() => setActivePhonemeModal(null)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. 如果是旧的 API Course（非内置 20 单元），保持原有逻辑
  if (apiCourse) {
    return (
      <div className="min-h-full max-w-5xl mx-auto px-4 py-6">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/courses">课程中心</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{apiCourse.title || id}</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-6">
          <Chapters course={apiCourse} />
        </div>
      </div>
    );
  }

  return (
    <div className="py-24 text-center space-y-4">
      <div className="text-4xl">🔍</div>
      <h2 className="text-xl font-bold">未找到该课程单元</h2>
      <Button asChild variant="outline">
        <Link to="/courses">返回课程中心</Link>
      </Button>
    </div>
  );
};
