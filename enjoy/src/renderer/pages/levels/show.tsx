// 阳光桥少儿英语 · 四级同构级内页 (Level Show Page)
// 依据工单 C 规范：级别头 + ①发音训练区（含诊断测入口位） + ②绘本阅读区 + ③听读补充区（注释待P-3）
// 未到级别完全开放（仅标建议，不拦截、不置灰）

import React, { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ORDERED_LEVELS,
  LEVEL_METAS,
  LevelKey,
  useLevelRegistry,
  calculateLevelProgress,
  LevelResource,
} from "@renderer/lib/level-registry";
import { Button, Progress, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from "@renderer/components/ui";
import {
  ArrowLeftIcon,
  SparklesIcon,
  BookOpenIcon,
  MicIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  StethoscopeIcon,
  StarIcon,
  InfoIcon,
  LayersIcon,
} from "lucide-react";
import { getDialogueProgress } from "@renderer/lib/dialogue-service";
import { getFinishedLocal } from "@renderer/lib/listening-sync";

export default function LevelShow() {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const [diagModalOpen, setDiagModalOpen] = useState(false);

  const levelKey = (level || "").trim().toLowerCase() as LevelKey;
  const isValidLevel = ORDERED_LEVELS.includes(levelKey);

  const { resources, loading } = useLevelRegistry();

  // 若路由参数非法，按现有习惯优雅回退
  if (!isValidLevel) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="size-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl font-black">
          ❓
        </div>
        <h2 className="text-xl font-black text-slate-900">未找到该级别</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          阳光英语目前提供自然拼读 A0、初级 A1、中级 A2 与高级 B1 四大级别。
        </p>
        <Button onClick={() => navigate("/")} className="rounded-xl font-bold">
          返回主页
        </Button>
      </div>
    );
  }

  const meta = LEVEL_METAS[levelKey];
  const levelIdx = ORDERED_LEVELS.indexOf(levelKey);

  // 本级总进度
  const progressInfo = useMemo(() => {
    return calculateLevelProgress(levelKey, resources);
  }, [levelKey, resources]);

  // 检查前一级别是否已完成（用于“建议先完成上一级”温和提示）
  const showPriorLevelSuggestion = useMemo(() => {
    if (levelIdx === 0) return false;
    const prevKey = ORDERED_LEVELS[levelIdx - 1];
    const prevProg = calculateLevelProgress(prevKey, resources);
    return prevProg.percentage < 100;
  }, [levelIdx, resources]);

  // ① 发音训练区资源 (zone: pronunciation)
  const pronunciationResources = useMemo(() => {
    return resources.filter((r) => r.level === levelKey && r.zone === "pronunciation");
  }, [resources, levelKey]);

  // ② 绘本阅读区资源 (zone: books)
  const bookResources = useMemo(() => {
    return resources.filter((r) => r.level === levelKey && r.zone === "books");
  }, [resources, levelKey]);

  // 本地进度状态缓存
  const dialProg = useMemo(() => getDialogueProgress(), []);
  const finList = useMemo(() => getFinishedLocal(), []);

  return (
    <div className="min-h-full w-full bg-[#FAF8F5] dark:bg-slate-950 pb-24 text-slate-900 dark:text-slate-100">
      {/* 顶部 Sticky 导航 */}
      <div className="sticky top-0 z-20 border-b border-amber-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-amber-100/60 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            <span>返回主页</span>
          </Button>

          {/* 4 级快速切换项链 */}
          <div className="flex items-center gap-1 sm:gap-2">
            {ORDERED_LEVELS.map((k) => {
              const active = k === levelKey;
              return (
                <Link
                  key={k}
                  to={`/levels/${k}`}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                    active
                      ? "bg-amber-500 text-slate-950 shadow-xs scale-105"
                      : "text-slate-500 hover:text-slate-900 hover:bg-amber-100/50 dark:hover:bg-slate-800"
                  }`}
                >
                  {k.toUpperCase()}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 space-y-7">
        {/* ========================================================= */}
        {/* 级别头：级别名 + CEFR + 出口标准 + 本级总进度 */}
        {/* ========================================================= */}
        <div
          className={`relative overflow-hidden rounded-3xl border-2 ${meta.borderColor} bg-gradient-to-br ${meta.gradient} p-6 sm:p-8 shadow-sm`}
        >
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                  {meta.title}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 border border-black/5 shadow-2xs">
                  {meta.cefr}
                </span>
              </div>

              <span className="text-xs font-black px-3 py-1 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/40">
                {meta.badgeText}
              </span>
            </div>

            {/* 附录出口标准一句话（一字不改） */}
            <div className="rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs p-4 border border-white/60 dark:border-slate-800 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0">🎯</span>
                <div>
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 mb-0.5">
                    本级出口标准
                  </h4>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-relaxed">
                    {meta.outcome}
                  </p>
                </div>
              </div>
            </div>

            {/* 本级总进度条 */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{progressInfo.label}</span>
                <span className="font-black">{progressInfo.percentage}%</span>
              </div>
              <Progress
                value={progressInfo.percentage}
                className="h-2.5 rounded-full bg-white/60 dark:bg-slate-800"
              />
            </div>

            {/* 未到级别提示：完全开放，只标建议，不置灰、不拦截 */}
            {showPriorLevelSuggestion && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/80 px-3.5 py-2 text-xs font-bold text-amber-950 dark:text-amber-200">
                <InfoIcon className="size-4 shrink-0 text-amber-600" />
                <span>
                  💡 温馨提示：建议先完成上一级基础练习，也可根据孩子水平直接自主探索下方资源！
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* ① 发音训练区（核心听说发音） */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="size-3 rounded-full bg-orange-500 shadow-xs" />
              <h2 className="text-base font-black tracking-wide text-foreground">
                🗣️ ① 发音训练区
              </h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              诊断测 + 核心口语发音
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 第一位固定：诊断测入口卡（指向占位态，文案「诊断测筹备中」） */}
            <div
              onClick={() => setDiagModalOpen(true)}
              className="group relative flex flex-col justify-between rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/50 dark:bg-slate-900/50 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 dark:bg-amber-900/60 px-2.5 py-0.5 text-[10px] font-black text-amber-900 dark:text-amber-200">
                    <StethoscopeIcon className="size-3" />
                    第 1 课 · 级别诊断
                  </span>
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                    筹备中
                  </span>
                </div>

                <div className="flex items-center gap-3 my-2">
                  <div className="size-11 rounded-2xl bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                    🩺
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      诊断测筹备中
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      专属发音与朗读能力诊断，只测不锁
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-slate-800 flex items-center justify-between text-xs font-black text-amber-700 dark:text-amber-400">
                <span>内容分批上线</span>
                <ChevronRightIcon className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* 其后按注册表陈列本级 zone=pronunciation 资源，点击跳现有页面 */}
            {pronunciationResources.map((item) => {
              const isDialogue = item.source === "dialogue";
              const lessonId = item.metadata?.lessonId;
              const prog = lessonId ? dialProg[lessonId] : null;
              const isCompleted = prog && prog.stars > 0;

              return (
                <Link
                  key={item.id}
                  to={item.route}
                  className="group relative flex flex-col justify-between rounded-3xl border-2 border-amber-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950 px-2.5 py-0.5 text-[10px] font-black text-sky-800 dark:text-sky-300">
                        {isDialogue ? "情景对话" : "拼读基石"}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600">
                          <CheckCircle2Icon className="size-3.5" />
                          已通关
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 my-2">
                      <div className="size-11 rounded-2xl bg-sky-50 dark:bg-sky-900/40 text-sky-600 flex items-center justify-center text-xl shrink-0">
                        {isDialogue ? "💬" : "🧩"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 transition-colors">
                          {item.title}
                        </h3>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-100/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
                    {isDialogue ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <StarIcon
                            key={s}
                            className={`size-3.5 ${
                              prog && s <= prog.stars
                                ? "fill-amber-400 text-amber-500"
                                : "fill-slate-100 text-slate-300 dark:fill-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span>核心发音模块</span>
                    )}

                    <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-black group-hover:translate-x-0.5 transition-transform">
                      <span>进入练习</span>
                      <ChevronRightIcon className="size-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* ② 绘本阅读区（分级绘本与听力原声） */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="size-3 rounded-full bg-sky-500 shadow-xs" />
              <h2 className="text-base font-black tracking-wide text-foreground">
                📚 ② 绘本阅读区
              </h2>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              原版原声 · 逐句对照
            </span>
          </div>

          {bookResources.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-amber-200/80 bg-white/60 dark:bg-slate-900/60 p-8 text-center space-y-2">
              <div className="text-3xl">🌱</div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                本级专注于字母音素与拼读感知
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                自然拼读 A0 阶段核心打牢 39 音标与词族发音基石，完成拼读后即可轻松过渡至 A1 短故事独立朗读！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookResources.map((item) => {
                const book = item.metadata?.book;
                const chapter = item.metadata?.chapter;
                const isFinished = book && chapter ? !!finList[book]?.[String(chapter)] : false;

                return (
                  <Link
                    key={item.id}
                    to={item.route}
                    className="group relative flex flex-col justify-between rounded-3xl border-2 border-amber-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {item.source === "world" ? "环球漫游" : "分级故事"}
                        </span>
                        {isFinished && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600">
                            <CheckCircle2Icon className="size-3.5" />
                            已听完
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 my-2">
                        <div className="size-11 rounded-2xl bg-amber-50 dark:bg-slate-800 text-amber-700 flex items-center justify-center text-xl shrink-0">
                          📖
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-600 transition-colors">
                            {item.title}
                          </h3>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-100/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>原声跟读</span>
                      <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-black group-hover:translate-x-0.5 transition-transform">
                        <span>点读听读</span>
                        <ChevronRightIcon className="size-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* ③ 听读补充区（VOA 分区）：P-3 后才出现，本期不渲染 */}
        {/* ========================================================= */}
        {/*
          TODO(P-3): 听读补充区（VOA 分区等泛听资源）。
          总体规划定稿：本期 P-1 不渲染该区，仅在代码留注释说明，待 P-3 随相关语料生产上线后再行激活展示。
        */}
      </div>

      {/* 诊断测筹备中提示弹窗 */}
      <Dialog open={diagModalOpen} onOpenChange={setDiagModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StethoscopeIcon className="size-5 text-amber-500" />
              <span>{meta.title} · 诊断测</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-center sm:text-left">
            <div className="size-14 rounded-2xl bg-amber-100 dark:bg-slate-800 text-amber-700 flex items-center justify-center text-2xl mx-auto sm:mx-0">
              🩺
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                诊断测筹备中
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                按照总体规划（决策 2），每级入口第一课为专属能力诊断测（只测不锁）。当前题库正在出题校准中，即将分批上线，敬请期待！
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={() => setDiagModalOpen(false)} className="rounded-xl font-bold">
                我知道了
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
