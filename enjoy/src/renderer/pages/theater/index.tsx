import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getTheaterCatalog,
  getUserTheaterProgress,
  TheaterScenario,
  UserTheaterProgress,
} from "@renderer/lib/theater-service";
import { LoaderSpin } from "@renderer/components";
import {
  Sparkles,
  Clapperboard,
  PlayCircle,
  Star,
  Trophy,
  Users,
  Compass,
  ArrowRight,
  ChevronRight,
  Flame,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "全部剧目", icon: "🎬" },
  { id: "生活交际", label: "生活交际", icon: "🥐" },
  { id: "趣味才艺", label: "趣味才艺", icon: "🎹" },
  { id: "健康关怀", label: "健康关怀", icon: "🏥" },
  { id: "户外探险", label: "户外探险", icon: "🚆" },
  { id: "友情社交", label: "友情社交", icon: "🎁" },
];

export default () => {
  const [scenarios, setScenarios] = useState<TheaterScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [progress, setProgress] = useState<UserTheaterProgress>({
    completedTheaters: [],
    theaterStars: {},
    roleScores: {},
    totalStars: 0,
  });

  useEffect(() => {
    let mounted = true;
    getTheaterCatalog().then((cat) => {
      if (!mounted) return;
      setScenarios(cat.theaters);
      setProgress(getUserTheaterProgress());
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = scenarios.filter((sc) => {
    if (selectedCategory === "all") return true;
    return sc.category === selectedCategory;
  });

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* 剧场顶部 Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-10 text-white shadow-xl shadow-orange-500/20">
        <div className="absolute -right-8 -bottom-8 text-9xl opacity-15 select-none pointer-events-none">
          🎭
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>SunnyBridge 阳光桥 · 沉浸式情景微剧场</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            敢敢情景剧场 · 角色扮演大挑战
          </h1>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed">
            英国/美国本土演员实景短剧！挑选你喜欢的故事角色，戴上耳机与原声演员同台飙戏，AI
            智能实时检测音准与节奏，赢取金牌小明星！
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Clapperboard className="w-4 h-4 text-yellow-300" />
              <span>精选生活短剧: {scenarios.length} 部</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>已通关演职: {progress.completedTheaters.length} 部</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
              <span>荣誉小星章: {progress.totalStars} 颗</span>
            </div>
          </div>
        </div>
      </div>

      {/* 分类筛选 Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                active
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
                  : "bg-card text-foreground hover:bg-muted border border-border"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 剧场卡片列表 */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <LoaderSpin />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sc) => {
            const isCompleted = progress.completedTheaters.includes(sc.id);
            const stars = progress.theaterStars[sc.id] || 0;

            return (
              <Link
                key={sc.id}
                to={`/theater/${sc.id}`}
                className="group flex flex-col justify-between bg-card hover:bg-card/90 border border-border hover:border-amber-500/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* 封面海报 */}
                <div className="relative aspect-video w-full bg-muted overflow-hidden">
                  <img
                    src={sc.posterUrl}
                    alt={sc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      // fallback if poster is loading
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* 居中大播放图标 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-amber-500 transition-all shadow-lg">
                      <PlayCircle className="w-7 h-7 fill-white text-transparent group-hover:text-amber-500" />
                    </div>
                  </div>

                  {/* 顶部标签 */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1">
                      <span>{sc.icon}</span>
                      <span>{sc.category}</span>
                    </span>
                  </div>

                  {/* 底部成就 */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
                    <span className="truncate max-w-[200px]">{sc.title}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= stars
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 卡片下半部介绍 */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-base text-foreground group-hover:text-amber-500 transition-colors">
                      {sc.titleZh}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {sc.tagline}
                    </p>
                  </div>

                  {/* 角色阵容 */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        扮演: {sc.roles.map((r) => r.name.split(" ")[0]).join(" / ")}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 group-hover:translate-x-1 transition-transform">
                      {isCompleted ? "重新挑战" : "登台飙戏"}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
