import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getTheaterCatalog,
  getUserTheaterProgress,
  TheaterScenario,
  UserTheaterProgress,
} from "@renderer/lib/theater-service";
import {
  getCultureCatalog,
  getUserPassport,
  CultureSlide,
  UserPassport,
} from "@renderer/lib/culture-service";
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
  Globe2,
  MapPin,
  Coins,
} from "lucide-react";

const THEATER_CATEGORIES = [
  { id: "all", label: "全部剧目", icon: "🎬" },
  { id: "生活交际", label: "生活交际", icon: "🥐" },
  { id: "趣味才艺", label: "趣味才艺", icon: "🎹" },
  { id: "健康关怀", label: "健康关怀", icon: "🏥" },
  { id: "户外探险", label: "户外探险", icon: "🚆" },
  { id: "友情社交", label: "友情社交", icon: "🎁" },
];

const WORLD_REGIONS = [
  { id: "all", label: "全部站点", icon: "🌍" },
  { id: "英格兰", label: "英格兰名胜", icon: "🏰" },
  { id: "美食", label: "地道美食", icon: "🫖" },
  { id: "历史", label: "历史人文", icon: "📜" },
];

export default ({ defaultTab }: { defaultTab?: "theater" | "world" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"theater" | "world">(
    (urlTab === "world" || defaultTab === "world") ? "world" : "theater"
  );

  // 剧场数据
  const [scenarios, setScenarios] = useState<TheaterScenario[]>([]);
  const [theaterLoading, setTheaterLoading] = useState(true);
  const [selectedTheaterCat, setSelectedTheaterCat] = useState("all");
  const [theaterProgress, setTheaterProgress] = useState<UserTheaterProgress>({
    completedTheaters: [],
    theaterStars: {},
    roleScores: {},
    totalStars: 0,
  });

  // 环球漫游数据
  const [slides, setSlides] = useState<CultureSlide[]>([]);
  const [worldLoading, setWorldLoading] = useState(true);
  const [selectedWorldRegion, setSelectedWorldRegion] = useState("all");
  const [passport, setPassport] = useState<UserPassport>({
    collectedStamps: [],
    quizPassedSlides: [],
    totalCoins: 0,
  });

  // 同步 URL 参数
  useEffect(() => {
    if (urlTab === "world" && activeTab !== "world") {
      setActiveTab("world");
    } else if (urlTab === "theater" && activeTab !== "theater") {
      setActiveTab("theater");
    }
  }, [urlTab]);

  const handleTabChange = (tab: "theater" | "world") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    let mounted = true;
    getTheaterCatalog().then((cat) => {
      if (!mounted) return;
      setScenarios(cat.theaters);
      setTheaterProgress(getUserTheaterProgress());
      setTheaterLoading(false);
    });

    getCultureCatalog().then((cat) => {
      if (!mounted) return;
      setSlides(cat.slides);
      setPassport(getUserPassport());
      setWorldLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredTheaters = scenarios.filter((sc) => {
    if (selectedTheaterCat === "all") return true;
    return sc.category === selectedTheaterCat;
  });

  const filteredSlides = slides.filter((s) => {
    if (selectedWorldRegion === "all") return true;
    if (selectedWorldRegion === "英格兰") return s.region.includes("英格兰") || s.region.includes("伦敦");
    if (selectedWorldRegion === "美食") return s.region.includes("美食") || s.region.includes("生活") || s.titleZh.includes("茶") || s.titleZh.includes("肉");
    if (selectedWorldRegion === "历史") return s.region.includes("历史") || s.region.includes("肯特") || s.region.includes("联合王国");
    return true;
  });

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 顶部主切换 Tab (一体化微剧场与漫游枢纽) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="p-1.5 rounded-2xl bg-muted/60 border border-border flex items-center gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => handleTabChange("theater")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === "theater"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span className="text-base">🎬</span>
            <span>生活实景微剧场</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono">
              10 剧
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("world")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === "world"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span className="text-base">🌍</span>
            <span>79站环球文化漫游</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono">
              79 站
            </span>
          </button>
        </div>

        {/* 右侧累计荣誉与成就 */}
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Trophy className="size-3.5 text-amber-500" />
            <span>通关短剧: {theaterProgress.completedTheaters.length}</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-300/40 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <span>📮</span>
            <span>集得印章: {passport.collectedStamps.length}</span>
          </span>
        </div>
      </div>

      {/* 🎭 TAB 1: 生活实景微剧场 */}
      {activeTab === "theater" && (
        <div className="space-y-6">
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
                  <span>已通关演职: {theaterProgress.completedTheaters.length} 部</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  <span>荣誉小星章: {theaterProgress.totalStars} 颗</span>
                </div>
              </div>
            </div>
          </div>

          {/* 分类筛选 Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {THEATER_CATEGORIES.map((cat) => {
              const active = selectedTheaterCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedTheaterCat(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
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
          {theaterLoading ? (
            <div className="py-24 flex items-center justify-center">
              <LoaderSpin />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTheaters.map((sc) => {
                const isCompleted = theaterProgress.completedTheaters.includes(sc.id);
                const stars = theaterProgress.theaterStars[sc.id] || 0;

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
      )}

      {/* 🌍 TAB 2: 79站环球文化漫游 */}
      {activeTab === "world" && (
        <div className="space-y-6">
          {/* 环球漫游 Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-10 text-white shadow-xl shadow-indigo-500/20">
            <div className="absolute -right-6 -bottom-6 text-9xl opacity-15 select-none pointer-events-none">
              🌍
            </div>
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white tracking-wide">
                <Globe2 className="w-3.5 h-3.5 text-blue-200" />
                <span>SunnyBridge 阳光桥 · 跨文化素养探索</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                敢敢环球奇遇记 · 世界文化漫游
              </h1>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                告别枯燥背诵，让英语成为探索世界的精彩视窗！漫步伦敦塔桥、品尝香浓下午茶、探寻中世纪大教堂，收集你的专属小狮子旅行印章！
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  <Compass className="w-4 h-4 text-cyan-300" />
                  <span>探索站点: {slides.length} 站</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  <span className="text-sm">📮</span>
                  <span>已集印章: {passport.collectedStamps.length} 枚</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>旅行金币: {passport.totalCoins} 枚</span>
                </div>
              </div>
            </div>
          </div>

          {/* 区域筛选 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {WORLD_REGIONS.map((reg) => {
              const active = selectedWorldRegion === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => setSelectedWorldRegion(reg.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]"
                      : "bg-card text-foreground hover:bg-muted border border-border"
                  }`}
                >
                  <span>{reg.icon}</span>
                  <span>{reg.label}</span>
                </button>
              );
            })}
          </div>

          {/* 明信片网格列表 */}
          {worldLoading ? (
            <div className="py-24 flex items-center justify-center">
              <LoaderSpin />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredSlides.map((slide) => {
                const isStamped = passport.collectedStamps.includes(slide.id);

                return (
                  <Link
                    key={slide.id}
                    to={`/world/${slide.id}`}
                    className="group flex flex-col justify-between bg-card hover:bg-card/90 border border-border hover:border-indigo-500/60 rounded-3xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                  >
                    {/* 拍立得照片 */}
                    <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-muted mb-3 shadow-inner">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* 旅行印章浮层 */}
                      {isStamped && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-md animate-in zoom-in-75">
                          <span>✓ 已打卡</span>
                        </div>
                      )}

                      {/* 地区标签 */}
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-cyan-300" />
                          {slide.region.split("·")[0]}
                        </span>
                      </div>
                    </div>

                    {/* 文字介绍 */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-indigo-500 font-bold mb-0.5">
                          <span>{slide.stamp}</span>
                          <span className="truncate">{slide.title}</span>
                        </div>
                        <h3 className="font-extrabold text-sm text-foreground group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {slide.titleZh}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {slide.tagline}
                        </p>
                      </div>

                      {/* 底部打卡状态 */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold">
                        <span className="text-muted-foreground text-[11px]">
                          {isStamped ? "🌟 已收录护照" : "未收集邮戳"}
                        </span>
                        <span className="text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          <span>翻开探索</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
