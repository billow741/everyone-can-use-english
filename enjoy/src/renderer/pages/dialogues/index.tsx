import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@renderer/components/ui";
import {
  ArrowLeftIcon,
  SparklesIcon,
  StarIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  SmileIcon,
} from "lucide-react";
import {
  getDialoguePack,
  getDialogueProgress,
  subscribeDialogueProgress,
  DialoguePack,
  DialogueLesson,
  DialogueProgressMap,
} from "@renderer/lib/dialogue-service";

const THEME_ICONS: Record<string, string> = {
  家庭: "🏡",
  朋友: "🎈",
  物品与动物: "🐾",
  旅行: "✈️",
  食物: "🥪",
  描述: "🎨",
  数字与字母: "🔢",
  时间: "⏰",
  自然: "🌊",
};

export default function DialoguesIndex() {
  const navigate = useNavigate();
  const [pack, setPack] = useState<DialoguePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DialogueProgressMap>(() =>
    getDialogueProgress()
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDialoguePack()
      .then((data) => {
        if (mounted) {
          setPack(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.message || "加载课包失败");
          setLoading(false);
        }
      });

    const unsub = subscribeDialogueProgress((newProgress) => {
      if (mounted) {
        setProgress(newProgress);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // 按 theme 分组 12 课
  const groupedLessons = useMemo(() => {
    if (!pack?.lessons) return [];
    const map = new Map<string, DialogueLesson[]>();
    for (const lesson of pack.lessons) {
      const theme = lesson.theme || "综合场景";
      if (!map.has(theme)) {
        map.set(theme, []);
      }
      map.get(theme)!.push(lesson);
    }
    return Array.from(map.entries()).map(([theme, lessons]) => ({
      theme,
      icon: THEME_ICONS[theme] || "💬",
      lessons,
    }));
  }, [pack]);

  // 统计已通关数与总星数
  const stats = useMemo(() => {
    if (!pack?.lessons) return { completed: 0, totalStars: 0 };
    let completed = 0;
    let totalStars = 0;
    for (const lesson of pack.lessons) {
      const prog = progress[lesson.lessonId];
      if (prog && prog.stars > 0) {
        completed += 1;
        totalStars += prog.stars;
      }
    }
    return { completed, totalStars };
  }, [pack, progress]);

  return (
    <div className="min-h-full w-full bg-[#FAF8F5] pb-24 text-slate-900">
      {/* 顶部导航与问候 */}
      <div className="sticky top-0 z-20 border-b border-amber-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 font-bold text-slate-600 hover:bg-amber-100/60 hover:text-slate-900"
          >
            <ArrowLeftIcon className="size-4" />
            <span>返回首页</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 text-xs font-black text-amber-900">
              <StarIcon className="size-3.5 fill-amber-500 text-amber-500" />
              <span>获得 {stats.totalStars} 星</span>
            </span>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-800">
              已完成 {stats.completed} / {pack?.lessons?.length || 12} 课
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 space-y-6">
        {/* 顶部 Hero 卡片 */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-300/40 via-orange-200/30 to-amber-100/40 p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <img
                src="/assets/gangan/gangan_avatar240.png"
                alt="敢敢"
                className="size-16 sm:size-20 rounded-2xl border-2 border-white bg-white p-1 shadow-md shrink-0 object-cover"
              />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    情景对话课 · kids-ok 沉浸会话
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400/30 text-amber-950 border border-amber-400/40">
                    <SparklesIcon className="size-3 fill-amber-600 text-amber-600" />
                    五步闭环
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed max-w-xl">
                  情景导入 ➜ 连贯听音 ➜ 逐句精学 ➜ 角色扮演 ➜ 结算通关。与敢敢一起大声开口，生活日常英文轻松表达！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 状态处理 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <div className="size-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-sm font-bold text-slate-600">
              敢敢正在为你装载对话课包，请稍候...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-6 text-center space-y-3">
            <p className="text-sm font-bold text-rose-800">{error}</p>
            <Button
              size="sm"
              onClick={() => window.location.reload()}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
            >
              刷新重试
            </Button>
          </div>
        )}

        {/* 主体按 Theme 分组陈列 */}
        {!loading && !error && groupedLessons.map(({ theme, icon, lessons }) => (
          <div key={theme} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xl">{icon}</span>
              <h2 className="text-base font-black text-slate-900 tracking-wide">
                {theme} 主题
              </h2>
              <span className="text-xs font-bold text-slate-500">
                ({lessons.length} 课)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map((lesson) => {
                const prog = progress[lesson.lessonId];
                const stars = prog?.stars || 0;
                const isCompleted = stars > 0;
                const partLabel =
                  lesson.parts > 1
                    ? lesson.part === 1
                      ? "上篇"
                      : lesson.part === 2
                      ? "下篇"
                      : `第${lesson.part}部分`
                    : null;

                return (
                  <div
                    key={lesson.lessonId}
                    onClick={() => navigate(`/dialogues/${lesson.lessonId}`)}
                    className="group relative flex flex-col justify-between rounded-3xl border-2 border-amber-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md cursor-pointer"
                  >
                    <div>
                      {/* 卡片头部标签 */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-lg bg-amber-100/80 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200">
                            {lesson.ageBand} 岁
                          </span>
                          {partLabel && (
                            <span className="rounded-lg bg-orange-100/80 px-2 py-0.5 text-[11px] font-black text-orange-900 border border-orange-200">
                              {partLabel}
                            </span>
                          )}
                        </div>

                        {/* 星级徽章 */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((starIdx) => (
                            <StarIcon
                              key={starIdx}
                              className={`size-4 ${
                                starIdx <= stars
                                  ? "fill-amber-400 text-amber-500"
                                  : "fill-slate-100 text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 课名与场景 */}
                      <h3 className="text-base font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                        {lesson.sceneZh}
                        {partLabel ? `（${partLabel}）` : ""}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1 line-clamp-1">
                        {lesson.scene}
                      </p>
                    </div>

                    {/* 卡片底部 */}
                    <div className="mt-5 flex items-center justify-between border-t border-amber-100/80 pt-3 text-xs font-bold">
                      <span className="flex items-center gap-1 text-slate-500">
                        <MessageCircleIcon className="size-3.5 text-amber-500" />
                        <span>{lesson.lines.length} 句会话</span>
                      </span>

                      <div className="flex items-center gap-1 text-amber-700 font-black group-hover:translate-x-0.5 transition-transform">
                        <span>{isCompleted ? "复习巩固" : "开始学习"}</span>
                        <ChevronRightIcon className="size-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
