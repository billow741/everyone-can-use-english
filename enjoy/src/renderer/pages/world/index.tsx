import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCultureCatalog,
  getUserPassport,
  CultureSlide,
  UserPassport,
} from "@renderer/lib/culture-service";
import { LoaderSpin } from "@renderer/components";
import {
  Sparkles,
  Compass,
  MapPin,
  CheckCircle2,
  Coins,
  BookOpen,
  ArrowRight,
  Stamp,
  Globe2,
} from "lucide-react";

export default () => {
  const [slides, setSlides] = useState<CultureSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [passport, setPassport] = useState<UserPassport>({
    collectedStamps: [],
    quizPassedSlides: [],
    totalCoins: 0,
  });

  useEffect(() => {
    let mounted = true;
    getCultureCatalog().then((cat) => {
      if (!mounted) return;
      setSlides(cat.slides);
      setPassport(getUserPassport());
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const regions = [
    { id: "all", label: "全部站点" },
    { id: "英格兰", label: "英格兰名胜" },
    { id: "美食", label: "地道美食" },
    { id: "历史", label: "历史人文" },
  ];

  const filtered = slides.filter((s) => {
    if (selectedRegion === "all") return true;
    if (selectedRegion === "英格兰") return s.region.includes("英格兰") || s.region.includes("伦敦");
    if (selectedRegion === "美食") return s.region.includes("美食") || s.region.includes("生活") || s.titleZh.includes("茶") || s.titleZh.includes("肉");
    if (selectedRegion === "历史") return s.region.includes("历史") || s.region.includes("肯特") || s.region.includes("联合王国");
    return true;
  });

  return (
    <div className="min-h-full max-w-6xl mx-auto px-4 py-6 space-y-8">
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
        {regions.map((reg) => {
          const active = selectedRegion === reg.id;
          return (
            <button
              key={reg.id}
              onClick={() => setSelectedRegion(reg.id)}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]"
                  : "bg-card text-foreground hover:bg-muted border border-border"
              }`}
            >
              {reg.label}
            </button>
          );
        })}
      </div>

      {/* 明信片网格列表 */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <LoaderSpin />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((slide) => {
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
  );
};
