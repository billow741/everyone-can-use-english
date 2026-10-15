import React, { useContext, useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AppSettingsProviderContext } from "@renderer/context";
import {
  getAllCurriculumUnits,
  getUserCurriculumProgress,
  CurriculumUnit,
  UserCurriculumProgress,
} from "@renderer/lib/curriculum-service";
import { CourseCard, LoaderSpin } from "@renderer/components";
import {
  Sparkles,
  Trophy,
  Star,
  Coins,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  Flame,
  Volume2,
} from "lucide-react";
import { Button } from "@renderer/components/ui";

const LEVEL_TABS = [
  { level: 0, label: "全部探索", icon: "🌈", desc: "全景 20 主题阶梯" },
  { level: 1, label: "Level 1 启蒙破冰", icon: "🌱", desc: "日常问候·家庭·数字" },
  { level: 2, label: "Level 2 校园与生活", icon: "🎒", desc: "巴士出行·派对·早餐" },
  { level: 3, label: "Level 3 城市与漫游", icon: "🏙️", desc: "伦敦古街·商场·天气" },
  { level: 4, label: "Level 4 自然与探险", icon: "🚀", desc: "沙滩拾贝·滑雪·露营" },
];

export default () => {
  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [progress, setProgress] = useState<UserCurriculumProgress>(
    getUserCurriculumProgress()
  );

  // 云端/扩展 API 课程
  const { webApi, learningLanguage } = useContext(AppSettingsProviderContext);
  const [apiCourses, setApiCourses] = useState<CourseType[]>([]);
  const [activeTab, setActiveTab] = useState<"curriculum" | "cloud">("curriculum");

  useEffect(() => {
    let mounted = true;
    getAllCurriculumUnits().then((loaded) => {
      if (mounted) {
        setUnits(loaded);
        setLoading(false);
      }
    });

    if (webApi) {
      webApi
        .courses({ page: 1, language: learningLanguage })
        .then(({ courses = [] }) => {
          if (mounted) setApiCourses(courses);
        })
        .catch(() => {});
    }

    setProgress(getUserCurriculumProgress());
    return () => {
      mounted = false;
    };
  }, [webApi, learningLanguage]);

  const filteredUnits = useMemo(() => {
    if (selectedLevel === 0) return units;
    return units.filter((u) => u.level === selectedLevel);
  }, [units, selectedLevel]);

  // 计算成就统计
  const totalStarsEarned = useMemo(() => {
    return Object.values(progress.unitStars).reduce((sum, s) => sum + s, 0);
  }, [progress]);

  const completedCount = useMemo(() => {
    return progress.completedUnitIds.length;
  }, [progress]);

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 顶部 Hero 伴学学院 Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 sm:p-8 shadow-xl shadow-orange-500/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide text-amber-100">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              阳光桥少儿英语 · 敢敢英语探索学院
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm">
              20个主题进阶阶梯 · 纯正外教原声伴学
            </h1>
            <p className="text-amber-100/90 text-sm sm:text-base leading-relaxed">
              基于英国/美国权威母语教学语料精选重塑，融合 39 个国际音标发音剖面、磨耳朵原声精听、逐句发音测评与趣味闯关游戏！
            </p>
          </div>

          {/* 实时成就卡片 */}
          <div className="flex md:flex-col items-center justify-around gap-4 bg-black/15 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-full md:w-auto min-w-[200px]">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/30 flex items-center justify-center text-yellow-300">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
              <div>
                <div className="text-xs text-amber-200">收集小金星</div>
                <div className="text-xl font-black">{totalStarsEarned} / 60</div>
              </div>
            </div>

            <div className="hidden md:block w-full h-px bg-white/10" />

            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-orange-400/30 flex items-center justify-center text-orange-200">
                <Trophy className="w-5 h-5 text-orange-300" />
              </div>
              <div>
                <div className="text-xs text-amber-200">已通关单元</div>
                <div className="text-xl font-black">
                  {completedCount} / {units.length || 20}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主板块选项卡 (敢敢探索学院 vs 云端扩展课) */}
      {apiCourses.length > 0 && (
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "curriculum"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            敢敢进阶阶梯学院 (20单元)
          </button>
          <button
            onClick={() => setActiveTab("cloud")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "cloud"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            云端拓展课程 ({apiCourses.length})
          </button>
        </div>
      )}

      {activeTab === "curriculum" ? (
        <div className="space-y-6">
          {/* Level 筛选分段按钮 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {LEVEL_TABS.map((tab) => {
              const isActive = selectedLevel === tab.level;
              return (
                <button
                  key={tab.level}
                  onClick={() => setSelectedLevel(tab.level)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap border shrink-0 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-md shadow-amber-500/20 scale-[1.02]"
                      : "bg-card text-foreground hover:bg-muted/80 border-border"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <div className="text-left">
                    <div className="leading-tight">{tab.label}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <LoaderSpin />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredUnits.map((unit) => {
                const isCompleted = progress.completedUnitIds.includes(unit.id);
                const stars = progress.unitStars[unit.id] || 0;

                return (
                  <Link
                    key={unit.id}
                    to={`/courses/${unit.id}`}
                    className="group relative flex flex-col justify-between bg-card hover:bg-card/90 border border-border hover:border-amber-500/50 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  >
                    {/* 卡片顶部装饰渐变 */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${unit.gradient}`}
                    />

                    <div>
                      {/* 头部：单元编号 + 等级 + 状态 */}
                      <div className="flex items-center justify-between mb-3 mt-1">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors">
                          Unit {String(unit.sequence).padStart(2, "0")}
                        </span>
                        <div className="flex items-center gap-1">
                          {isCompleted ? (
                            <div className="flex items-center gap-0.5 text-yellow-400">
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
                          ) : (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {unit.levelName.split(" ")[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 大图标与标题 */}
                      <div className="flex items-center gap-3.5 mb-2.5">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${unit.gradient} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform`}
                        >
                          {unit.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base text-foreground truncate group-hover:text-amber-500 transition-colors">
                            {unit.title}
                          </h3>
                          <div className="text-xs text-muted-foreground truncate">
                            {unit.titleEn}
                          </div>
                        </div>
                      </div>

                      {/* 标语描述 */}
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 mb-3 leading-relaxed">
                        {unit.tagline}
                      </p>

                      {/* 核心音标 Focus */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          重点音标:
                        </span>
                        {unit.phonicsFocus.map((ph) => (
                          <span
                            key={ph}
                            className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[11px] font-mono font-bold"
                          >
                            /{ph}/
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 底部进入按钮 */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" />
                        {unit.stats.totalSentences} 句原声
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 group-hover:translate-x-1 transition-transform">
                        {isCompleted ? "复习巩固" : "开始探索"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 云端 API 课程列表（如果有配置） */
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {apiCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};
