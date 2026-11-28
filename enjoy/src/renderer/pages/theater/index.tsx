import React, { useEffect, useState, useRef, useMemo, useId } from "react";
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
import { loadCatalog } from "@renderer/lib/listening-sync";
import { LoaderSpin } from "@renderer/components";
import { useCardStagger } from "@renderer/lib/motion";
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
  Search,
  X,
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
  { id: "美国", label: "美国传奇", icon: "🗽" },
  { id: "美食", label: "地道美食", icon: "🫖" },
  { id: "历史", label: "历史人文", icon: "📜" },
];

type WorldLevelFilter = "all" | "A2" | "B1";

const WORLD_LEVELS: Array<{ id: WorldLevelFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "A2", label: "A2" },
  { id: "B1", label: "B1" },
];

const WORLD_LEVEL_DOT_CLASS: Record<"A2" | "B1", string> = {
  A2: "bg-[#3FA46A]",
  B1: "bg-[#7C6BD9]",
};

const WORLD_LAST_VISIT_KEY = "sunnybridge_world_last_visit_v1";

function readWorldLastVisitId(): string | null {
  try {
    const raw = localStorage.getItem(WORLD_LAST_VISIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && parsed.id.trim()) {
      return parsed.id.trim();
    }
  } catch {
    // 忽略损坏的本地续读记录
  }
  return null;
}

export default ({ defaultTab }: { defaultTab?: "theater" | "world" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  // 0 批屏蔽微剧场：默认与 ?tab=theater 均回落到环球漫游（world），
  // defaultTab 在屏蔽期间暂不生效；剧场数据与下方 theater 分支代码保留不动
  const [activeTab, setActiveTab] = useState<"theater" | "world">("world");

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
  const [worldLevels, setWorldLevels] = useState<Record<string, "A2" | "B1">>({});
  const [worldLoading, setWorldLoading] = useState(true);
  const [selectedWorldRegion, setSelectedWorldRegion] = useState("all");
  const [selectedWorldLevel, setSelectedWorldLevel] = useState<WorldLevelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyUncollected, setOnlyUncollected] = useState(false);
  const [lastVisitId, setLastVisitId] = useState<string | null>(() => readWorldLastVisitId());
  const [passport, setPassport] = useState<UserPassport>({
    collectedStamps: [],
    quizPassedSlides: [],
    totalCoins: 0,
  });

  const worldSearchId = useId();
  const worldGridRef = useRef<HTMLDivElement>(null);
  const theaterGridRef = useRef<HTMLDivElement>(null);

  // 同步 URL 参数
  useEffect(() => {
    if (urlTab === "world" && activeTab !== "world") {
      setActiveTab("world");
    } else if (urlTab === "theater") {
      // 微剧场已屏蔽：?tab=theater 回落到 world，并把 URL 参数同步为 world
      setActiveTab("world");
      setSearchParams({ tab: "world" });
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

    Promise.all([getCultureCatalog(), loadCatalog()]).then(([cat, listeningCat]) => {
      if (!mounted) return;
      const worldChapters = (listeningCat?.chapters || []).filter(
        (ch) => ch.book === "world"
      );
      const byTitle = new Map<string, "A2" | "B1">();
      for (const ch of worldChapters) {
        const normalized = String(ch.level || "").trim().toUpperCase();
        if (normalized === "A2" || normalized === "B1") {
          byTitle.set(ch.title_en.trim().toLowerCase(), normalized);
        }
      }

      const levelMap: Record<string, "A2" | "B1"> = {};
      cat.slides.forEach((s, idx) => {
        const byEn = byTitle.get(s.title.trim().toLowerCase());
        if (byEn) {
          levelMap[s.id] = byEn;
          return;
        }
        const fallbackLv = String(worldChapters[idx]?.level || "")
          .trim()
          .toUpperCase();
        if (fallbackLv === "A2" || fallbackLv === "B1") {
          levelMap[s.id] = fallbackLv;
        }
      });

      setSlides(cat.slides);
      setWorldLevels(levelMap);
      setPassport(getUserPassport());
      setLastVisitId(readWorldLastVisitId());
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

  const levelCounts = useMemo(() => {
    let a2 = 0;
    let b1 = 0;
    for (const s of slides) {
      const lv = worldLevels[s.id];
      if (lv === "A2") a2 += 1;
      else if (lv === "B1") b1 += 1;
    }
    return { all: slides.length, A2: a2, B1: b1 };
  }, [slides, worldLevels]);

  const continueSlide = useMemo(() => {
    if (!lastVisitId || slides.length === 0) return null;
    const found = slides.find((s) => s.id === lastVisitId || s.rawId === lastVisitId);
    if (!found) return null;
    if (passport.collectedStamps.includes(found.id)) return null;
    return found;
  }, [lastVisitId, slides, passport.collectedStamps]);

  const filteredSlides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return slides.filter((s) => {
      if (selectedWorldRegion !== "all") {
        if (
          selectedWorldRegion === "英格兰" &&
          !s.region.includes("英格兰") &&
          !s.region.includes("伦敦")
        ) {
          return false;
        }
        if (selectedWorldRegion === "美国" && !s.region.includes("美国")) {
          return false;
        }
        if (
          selectedWorldRegion === "美食" &&
          !s.region.includes("美食") &&
          !s.region.includes("生活") &&
          !s.titleZh.includes("茶") &&
          !s.titleZh.includes("肉")
        ) {
          return false;
        }
        if (
          selectedWorldRegion === "历史" &&
          !s.region.includes("历史") &&
          !s.region.includes("肯特") &&
          !s.region.includes("联合王国")
        ) {
          return false;
        }
      }

      if (selectedWorldLevel !== "all" && worldLevels[s.id] !== selectedWorldLevel) {
        return false;
      }

      if (onlyUncollected && passport.collectedStamps.includes(s.id)) {
        return false;
      }

      if (q) {
        const hay = `${s.title} ${s.titleZh} ${s.tagline} ${s.intro}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    slides,
    selectedWorldRegion,
    selectedWorldLevel,
    onlyUncollected,
    searchQuery,
    worldLevels,
    passport.collectedStamps,
  ]);

  useCardStagger(worldGridRef, "a.group", [worldLoading, filteredSlides.length], { stagger: 0.036 });
  useCardStagger(theaterGridRef, "a.group", [theaterLoading, filteredTheaters.length]);

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 顶部主切换 Tab (一体化微剧场与漫游枢纽) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="p-1.5 rounded-2xl bg-muted/60 border border-border flex items-center gap-1.5 shadow-2xs">
          {/* 0 批：微剧场页签已屏蔽（仅断 UI 入口，剧场数据与下方 theater 分支代码保留） */}

          <button
            type="button"
            onClick={() => handleTabChange("world")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === "world"
                ? "bg-[#0F7B7A] text-white shadow-sm scale-[1.02]"
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

        {/* 右侧累计荣誉与成就（仅短剧页签显示，避免与 world Hero 计数重复且不串台） */}
        {activeTab === "theater" && (
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
        )}
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
            <div ref={theaterGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTheaters.map((sc) => {
                const isCompleted = theaterProgress.completedTheaters.includes(sc.id);
                const stars = theaterProgress.theaterStars[sc.id] || 0;

                return (
                  <Link
                    key={sc.id}
                    to={`/theater/${sc.id}`}
                    className="group flex flex-col justify-between bg-card hover:bg-card/90 border border-border hover:border-amber-500/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-1"
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
        <div className="space-y-6 pb-24 xl:pb-8">
          {/* 环球漫游 Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F7B7A] to-[#0A5E5D] p-6 sm:p-10 text-white shadow-lg">
            <div className="absolute -right-6 -bottom-6 text-9xl opacity-15 select-none pointer-events-none">
              🌍
            </div>
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-md text-xs font-bold text-white tracking-wide">
                <Globe2 className="w-3.5 h-3.5 text-[#F2A93B]" />
                <span>SunnyBridge 阳光桥 · 跨文化素养探索</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                环球漫游 · 79 站英美文化
              </h1>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                阅读英美名胜与风土文化短文，听原声跟读并完成文化小测，收集旅行邮戳。
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm font-bold">
                <div className="flex items-center gap-1.5 bg-white border border-[#D3E4DE] text-[#123B3C] px-3 py-1.5 rounded-xl shadow-2xs">
                  <Compass className="w-4 h-4 text-[#0F7B7A]" />
                  <span className="tabular-nums">探索站点：{slides.length} 站</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-[#D3E4DE] text-[#123B3C] px-3 py-1.5 rounded-xl shadow-2xs">
                  <span>📮</span>
                  <span className="tabular-nums">已收集邮戳：{passport.collectedStamps.length} 枚</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-[#D3E4DE] text-[#123B3C] px-3 py-1.5 rounded-xl shadow-2xs">
                  <Coins className="w-4 h-4 text-[#96690A]" />
                  <span className="tabular-nums">旅行金币：{passport.totalCoins} 枚</span>
                </div>
              </div>
            </div>
          </div>

          {/* 续读入口：最近访问但未收集邮戳的站点 */}
          {!worldLoading && continueSlide && (
            <Link
              to={`/world/${continueSlide.id}`}
              data-testid="world-continue-card"
              className="group rounded-2xl bg-white border border-[#D3E4DE] hover:border-[#0F7B7A] p-3.5 sm:p-4 flex items-center gap-3.5 shadow-2xs hover:shadow-md transition-all"
            >
              <div className="w-16 h-12 sm:w-24 sm:h-16 shrink-0 rounded-xl overflow-hidden bg-[#E7F2EF] border border-[#D3E4DE]/60">
                <img
                  src={continueSlide.imageUrl}
                  alt={continueSlide.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wide text-[#0F7B7A]">
                    继续探索
                  </span>
                  {worldLevels[continueSlide.id] && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E7F2EF] text-[#123B3C] text-[10px] font-bold leading-none">
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${
                          WORLD_LEVEL_DOT_CLASS[worldLevels[continueSlide.id]]
                        }`}
                        aria-hidden="true"
                      />
                      <span>{worldLevels[continueSlide.id]}</span>
                    </span>
                  )}
                </div>
                <h2 className="mt-0.5 text-sm sm:text-base font-extrabold text-[#123B3C] truncate group-hover:text-[#0F7B7A] transition-colors">
                  {continueSlide.stamp} {continueSlide.titleZh}
                </h2>
                <p className="mt-0.5 text-xs text-[#4E6B69] truncate">
                  {continueSlide.title} · {continueSlide.region.split("·")[0]}
                </p>
              </div>
              <span className="h-9 px-3 sm:px-4 rounded-xl bg-[#F2A93B] group-hover:bg-[#D69128] text-[#123B3C] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors">
                <span>继续探索</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </Link>
          )}

          {/* 搜索与找站工具栏 */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <label htmlFor={worldSearchId} className="sr-only">
                  搜索站点
                </label>
                <Search
                  className="w-4 h-4 text-[#4E6B69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={worldSearchId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索英文名、中文标题或简介..."
                  data-testid="world-search-input"
                  className="w-full h-10 pl-10 pr-9 rounded-2xl bg-white border border-[#D3E4DE] text-sm text-[#123B3C] placeholder:text-[#4E6B69]/70 focus:border-[#0F7B7A] focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="清除搜索"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[#4E6B69] hover:text-[#123B3C] hover:bg-[#E7F2EF] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-pressed={onlyUncollected}
                onClick={() => setOnlyUncollected((prev) => !prev)}
                data-testid="world-uncollected-toggle"
                className={`h-10 px-3.5 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 border transition-colors shrink-0 cursor-pointer ${
                  onlyUncollected
                    ? "bg-[#0F7B7A] border-[#0F7B7A] text-white shadow-sm"
                    : "bg-white border-[#D3E4DE] text-[#123B3C] hover:bg-[#E7F2EF]"
                }`}
              >
                <span>📮</span>
                <span>只看未收集</span>
              </button>

              <span
                className="text-xs font-bold text-[#4E6B69] tabular-nums shrink-0 ml-auto sm:ml-0"
                aria-live="polite"
                data-testid="world-result-count"
              >
                共 {filteredSlides.length} 站
              </span>
            </div>

            {/* 区域筛选（移动端横向溢出渐隐提示） */}
            <div className="relative">
              <div
                role="group"
                aria-label="区域分类筛选"
                className="world-chips-scroll flex items-center gap-2 overflow-x-auto pb-1 pr-8 sm:pr-0 scrollbar-none"
              >
                {WORLD_REGIONS.map((reg) => {
                  const active = selectedWorldRegion === reg.id;
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedWorldRegion(reg.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                        active
                          ? "bg-[#0F7B7A] text-white shadow-sm scale-[1.02]"
                          : "bg-white text-[#123B3C] hover:bg-[#E7F2EF] border border-[#D3E4DE]"
                      }`}
                    >
                      <span>{reg.icon}</span>
                      <span>{reg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 等级筛选（全部 / A2 / B1，与区域和搜索 AND 叠加） */}
            <div
              role="group"
              aria-label="难度等级筛选"
              className="flex flex-wrap items-center gap-2"
              data-testid="world-level-chips"
            >
              {WORLD_LEVELS.map((lv) => {
                const active = selectedWorldLevel === lv.id;
                const count = levelCounts[lv.id];
                return (
                  <button
                    key={lv.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedWorldLevel(lv.id)}
                    data-testid={`world-level-chip-${lv.id}`}
                    className={`h-8 px-3 rounded-full text-xs leading-none inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      active
                        ? "bg-[#0F7B7A] border-[#0F7B7A] text-white font-bold"
                        : "bg-white border-[#D3E4DE] text-[#123B3C] font-semibold hover:bg-[#E7F2EF]"
                    }`}
                  >
                    {lv.id !== "all" && (
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          active ? "bg-white" : WORLD_LEVEL_DOT_CLASS[lv.id]
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{lv.label}</span>
                    <span className={`tabular-nums ${active ? "text-white/85" : "text-[#4E6B69]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 明信片网格列表 */}
          {worldLoading ? (
            <div className="py-24 flex items-center justify-center">
              <LoaderSpin />
            </div>
          ) : filteredSlides.length === 0 ? (
            <div
              className="py-16 px-4 rounded-3xl bg-white border border-[#D3E4DE] text-center space-y-3"
              data-testid="world-empty-state"
            >
              <div className="text-3xl" aria-hidden="true">
                🧭
              </div>
              <p className="text-sm font-bold text-[#4E6B69]">
                没有找到站点，换个关键词试试
              </p>
              {(selectedWorldRegion !== "all" ||
                selectedWorldLevel !== "all" ||
                onlyUncollected ||
                searchQuery.trim() !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWorldRegion("all");
                    setSelectedWorldLevel("all");
                    setOnlyUncollected(false);
                    setSearchQuery("");
                  }}
                  className="h-8 px-3.5 rounded-full bg-[#E7F2EF] hover:bg-[#D3E4DE] text-[#123B3C] text-xs font-bold transition-colors cursor-pointer"
                >
                  重置筛选
                </button>
              )}
            </div>
          ) : (
            <div ref={worldGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredSlides.map((slide) => {
                const isStamped = passport.collectedStamps.includes(slide.id);
                const slideLevel = worldLevels[slide.id];

                return (
                  <Link
                    key={slide.id}
                    to={`/world/${slide.id}`}
                    className={`group flex flex-col justify-between rounded-3xl p-4 shadow-sm hover:shadow-xl transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-1 relative overflow-hidden border ${
                      isStamped
                        ? "bg-[#FFFDF6] hover:bg-[#FFFDF6] border-[#F2A93B] ring-1 ring-[#F2A93B]/35 hover:border-[#0F7B7A]"
                        : "bg-white hover:bg-white border-[#D3E4DE] hover:border-[#0F7B7A]"
                    }`}
                  >
                    {/* 拍立得照片 */}
                    <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-[#E7F2EF] mb-3 shadow-inner">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* 旅行印章浮层 */}
                      {isStamped && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#F2A93B] text-[#123B3C] px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md border border-white/80 animate-in zoom-in-75">
                          <span>✓ 已打卡</span>
                        </div>
                      )}

                      {/* 地区标签 */}
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-[#F2A93B]" />
                          {slide.region.split("·")[0]}
                        </span>
                      </div>
                    </div>

                    {/* 文字介绍 */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1 text-xs text-[#0F7B7A] font-bold min-w-0">
                            <span>{slide.stamp}</span>
                            <span className="truncate">{slide.title}</span>
                          </div>
                          {slideLevel && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E7F2EF] text-[#123B3C] text-[11px] font-bold leading-none shrink-0"
                              data-testid={`world-card-level-${slide.id}`}
                            >
                              <span
                                className={`size-1.5 rounded-full shrink-0 ${WORLD_LEVEL_DOT_CLASS[slideLevel]}`}
                                aria-hidden="true"
                              />
                              <span>{slideLevel}</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-sm text-[#123B3C] group-hover:text-[#0F7B7A] transition-colors line-clamp-1">
                          {slide.titleZh}
                        </h3>
                        <p className="text-xs text-[#4E6B69] line-clamp-2 mt-1 leading-relaxed">
                          {slide.tagline}
                        </p>
                      </div>

                      {/* 底部打卡状态 */}
                      <div className="pt-3 border-t border-[#D3E4DE] flex items-center justify-between text-xs font-bold">
                        <span className={`text-[11px] ${isStamped ? "text-[#96690A]" : "text-[#4E6B69]"}`}>
                          {isStamped ? "🌟 已收录护照" : "未收集邮戳"}
                        </span>
                        <span className="text-[#0F7B7A] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
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
