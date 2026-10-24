import React, { useState } from "react";
import {
  SparklesIcon,
  StarIcon,
  AwardIcon,
  CheckCircle2Icon,
  LockIcon,
  PlayIcon,
  CompassIcon,
  RouteIcon,
} from "lucide-react";
import { Badge, Progress, Button } from "@renderer/components/ui";
import {
  PHONICS_ISLAND_39_ANCHORS,
  PHONICS_ISLAND_ZONES,
  PHONICS_ISLAND_BADGES,
  PhonicsIslandZone,
  PhonicsAnchorItem,
  IslandBadge,
} from "@renderer/lib/phoneme-anchors";
import {
  PHONEME_TO_GROUP_MAP,
  PhonicsRouteGroup,
  PhonicsRouteStage,
  getCurrentRouteTarget,
} from "@renderer/lib/phonics-route-config";
import {
  savePhonemeMasteryLocal,
  emitPhonemeMasteryUpdate,
} from "@renderer/lib/phoneme-cloud-sync";
import { PhonicsRecommendedRoute } from "./phonics-recommended-route";
import { PhonicsGroupReviewModal } from "./phonics-group-review-modal";
import { PhonicsStageQuizModal } from "./phonics-stage-quiz-modal";

interface PhonicsIslandMapProps {
  masteryMap: Record<string, any>;
  onSelectLevel: (item: PhonicsAnchorItem) => void;
  selectedZone: PhonicsIslandZone;
  onSelectZone: (zone: PhonicsIslandZone) => void;
  onOpenGrandCertificate: () => void;
}

export const PhonicsIslandMap: React.FC<PhonicsIslandMapProps> = ({
  masteryMap,
  onSelectLevel,
  selectedZone,
  onSelectZone,
  onOpenGrandCertificate,
}) => {
  // 地图展现模式：'route' = 敢敢推荐路线 (默认) | 'islands' = 4 大岛区自由探索
  const [mapViewMode, setMapViewMode] = useState<"route" | "islands">("route");

  // 弹窗状态：组末 D 寻宝复习关
  const [activeReviewGroup, setActiveReviewGroup] = useState<PhonicsRouteGroup | null>(null);
  // 弹窗状态：阶段盲拼解锁测验
  const [activeQuizStage, setActiveQuizStage] = useState<PhonicsRouteStage | null>(null);

  // 过滤当前需要展示的岛区
  const zonesToDisplay =
    selectedZone === "all"
      ? PHONICS_ISLAND_ZONES.filter((z) => z.key !== "all")
      : PHONICS_ISLAND_ZONES.filter((z) => z.key === selectedZone);

  // 当前主路线目标
  const currentTarget = getCurrentRouteTarget(masteryMap);

  // 组末 D 复习关找齐通过回调
  const handleReviewCompleted = (groupId: string) => {
    const nextMap = {
      ...masteryMap,
      [`review_${groupId}`]: true,
    };
    savePhonemeMasteryLocal(nextMap);
    emitPhonemeMasteryUpdate({ masteryMap: nextMap });
    setActiveReviewGroup(null);
  };

  // 阶段测验通过回调
  const handleQuizPassed = (stageId: number, score: number) => {
    const nextMap = {
      ...masteryMap,
      [`quiz_stage${stageId}`]: true,
      [`quiz_data_stage${stageId}`]: {
        passed: true,
        score,
        completedAt: Date.now(),
      },
    };
    savePhonemeMasteryLocal(nextMap);
    emitPhonemeMasteryUpdate({ masteryMap: nextMap });
  };

  // 阶段测验未达标（回炉 2 个最弱音）回调
  const handleQuizFailed = (stageId: number, score: number, weakestPhonemes: string[]) => {
    const nextMap = {
      ...masteryMap,
      [`quiz_stage${stageId}`]: false,
      [`quiz_data_stage${stageId}`]: {
        passed: false,
        score,
        remedialPhonemes: weakestPhonemes,
        completedAt: Date.now(),
      },
    };
    savePhonemeMasteryLocal(nextMap);
    emitPhonemeMasteryUpdate({ masteryMap: nextMap });
  };

  return (
    <div className="space-y-8 select-none">
      {/* 🗺️ 地图模式切换器：推荐路线 vs 自由探索 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 border border-border w-fit shadow-2xs">
          <button
            type="button"
            onClick={() => setMapViewMode("route")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              mapViewMode === "route"
                ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SparklesIcon className="size-3.5 fill-current" />
            <span>✨ 敢敢推荐路线 (G1→G12)</span>
          </button>

          <button
            type="button"
            onClick={() => setMapViewMode("islands")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              mapViewMode === "islands"
                ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CompassIcon className="size-3.5 text-current" />
            <span>🏝️ 4 大岛区自由探索 (自由模式)</span>
          </button>
        </div>

        <Button
          size="sm"
          onClick={onOpenGrandCertificate}
          className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs gap-1.5 shadow-2xs cursor-pointer shrink-0"
        >
          <AwardIcon className="size-3.5" />
          <span>查看 39 荣誉总证书</span>
        </Button>
      </div>

      {/* 4 大岛区荣誉勋章成就墙概览 (保留原有徽章体系) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-card/80 backdrop-blur-md border border-amber-300/40 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
              <span>通关岛 5 大荣誉徽章殿堂</span>
              <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                集星解锁
              </Badge>
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            点亮整座岛屿的全部发音星，即可荣获专属探险勋章！
          </span>
        </div>

        {/* 徽章列表横排 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PHONICS_ISLAND_BADGES.map((badge) => {
            const zoneItems =
              badge.zone === "all"
                ? PHONICS_ISLAND_39_ANCHORS
                : PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === badge.zone);

            const masteredInZone = zoneItems.filter(
              (a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])
            ).length;

            const isUnlocked = masteredInZone >= badge.requiredCount;
            const pct = Math.round((masteredInZone / badge.requiredCount) * 100);

            return (
              <div
                key={badge.id}
                className={`p-3 rounded-2xl border transition-all flex flex-col items-center text-center relative overflow-hidden ${
                  isUnlocked
                    ? "bg-amber-500/15 border-amber-400 shadow-sm shadow-amber-500/10 scale-102"
                    : "bg-muted/40 border-border opacity-85"
                }`}
              >
                <div className="text-3xl mb-1 filter drop-shadow-sm">
                  {badge.icon}
                </div>
                <div className="text-xs font-black text-foreground">
                  {badge.name}
                </div>
                <div className="text-[10px] text-muted-foreground font-bold mt-0.5">
                  {masteredInZone}/{badge.requiredCount} 颗星
                </div>

                <div className="w-full mt-2">
                  <Progress value={pct} className="h-1.5 rounded-full" />
                </div>

                {isUnlocked ? (
                  <Badge className="mt-1.5 bg-amber-500 text-slate-950 text-[9px] font-black">
                    已点亮 🌟
                  </Badge>
                ) : (
                  <span className="text-[9px] text-muted-foreground mt-1.5 font-bold">
                    差 {badge.requiredCount - masteredInZone} 颗
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 展现模式 1：✨ 敢敢推荐路线 (发光推荐小径 G1→G12) */}
      {mapViewMode === "route" && (
        <PhonicsRecommendedRoute
          masteryMap={masteryMap}
          onSelectPhoneme={onSelectLevel}
          onSelectGroupReview={(group) => setActiveReviewGroup(group)}
          onSelectStageQuiz={(stage) => setActiveQuizStage(stage)}
          onSwitchToFreeMode={() => setMapViewMode("islands")}
        />
      )}

      {/* 展现模式 2：🏝️ 4 大岛区自由探索 (自由模式原样保留，不锁入口) */}
      {mapViewMode === "islands" && (
        <div className="space-y-8">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/40 flex items-center justify-between text-xs">
            <span className="text-amber-950 dark:text-amber-200 font-bold flex items-center gap-1.5">
              <span>🏝️ 自由探索模式：孩子可随意点击任意岛屿、任意关卡体验，不锁自由入口！</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMapViewMode("route")}
              className="rounded-xl border-amber-300 font-black text-xs cursor-pointer"
            >
              <span>返回推荐路线</span>
            </Button>
          </div>

          {zonesToDisplay.map((zone) => {
            const zoneItems = PHONICS_ISLAND_39_ANCHORS.filter((a) => a.zone === zone.key);
            const masteredInZone = zoneItems.filter(
              (a) => masteryMap[a.id] || (a.ipaSlug && masteryMap[a.ipaSlug])
            ).length;
            const isZoneMastered = masteredInZone === zoneItems.length;

            return (
              <div
                key={zone.key}
                className="p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-card/90 via-card/50 to-card/90 border-2 border-border/80 shadow-sm relative overflow-hidden"
              >
                {/* 岛区标题区 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-border/60">
                  <div className="flex items-center gap-3.5">
                    <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-3xl shadow-sm shrink-0">
                      {zone.icon}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black text-foreground">
                          {zone.name}
                        </h2>
                        <Badge className="bg-amber-500 text-slate-950 font-black text-xs">
                          {zone.count} 关
                        </Badge>
                        {isZoneMastered && (
                          <Badge className="bg-emerald-500 text-white font-black text-xs">
                            已全通关 🎉
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {zone.description}
                      </p>
                    </div>
                  </div>

                  {/* 岛区探险进度 */}
                  <div className="sm:text-right shrink-0">
                    <div className="text-xs font-black text-muted-foreground">
                      岛区通关进度
                    </div>
                    <div className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                      {masteredInZone} / {zone.count} 颗星 (
                      {Math.round((masteredInZone / zone.count) * 100)}%)
                    </div>
                  </div>
                </div>

                {/* 关卡圆盘路线 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-5">
                  {zoneItems.map((item) => {
                    const isMastered =
                      !!masteryMap[item.id] ||
                      (item.ipaSlug && !!masteryMap[item.ipaSlug]);
                    const group = PHONEME_TO_GROUP_MAP[item.id];
                    const isCurrent =
                      currentTarget.type === "phoneme" &&
                      currentTarget.phonemeItem?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectLevel(item)}
                        className={`group relative rounded-3xl p-3.5 flex flex-col items-center text-center transition-all duration-300 cursor-pointer border-2 hover:shadow-xl hover:-translate-y-1.5 ${
                          isCurrent
                            ? "bg-amber-500/20 border-amber-500 ring-4 ring-amber-400/50 shadow-md scale-102"
                            : isMastered
                            ? "bg-gradient-to-b from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-400 shadow-sm shadow-amber-500/10"
                            : "bg-background/80 hover:bg-card border-border hover:border-amber-400"
                        }`}
                      >
                        {/* 关卡顶部序号与组标签 */}
                        <div className="w-full flex items-center justify-between mb-1.5 text-[10px] font-mono font-bold">
                          <span className="text-muted-foreground">
                            {group ? `G${group.order}` : `#${String(item.order).padStart(2, "0")}`}
                          </span>
                          {isMastered ? (
                            <StarIcon className="size-4 fill-amber-400 text-amber-500 filter drop-shadow-sm" />
                          ) : isCurrent ? (
                            <SparklesIcon className="size-4 text-amber-500 animate-spin" />
                          ) : (
                            <StarIcon className="size-4 text-muted-foreground/30" />
                          )}
                        </div>

                        {/* 萌宠关卡圆盘 */}
                        <div
                          className={`size-20 sm:size-22 rounded-2xl bg-gradient-to-b ${item.colorBg} p-2 flex items-center justify-center relative shadow-inner border border-black/5 overflow-hidden group-hover:scale-105 transition-transform`}
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.anchorWord}
                            className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-115 transition-transform duration-200"
                            loading="lazy"
                          />
                        </div>

                        {/* 大字母与锚定词 */}
                        <div className="mt-2 text-center">
                          <div className="text-xl sm:text-2xl font-black font-sans tracking-tight text-foreground group-hover:text-amber-500 transition-colors">
                            {item.letter}
                          </div>
                          <div className="text-[11px] font-bold text-muted-foreground truncate max-w-[100px]">
                            {item.anchorWord} · {item.anchorZh}
                          </div>
                        </div>

                        {/* 闯关操作条 */}
                        <button
                          type="button"
                          className={`w-full mt-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                            isMastered
                              ? "bg-amber-500 text-slate-950 hover:bg-amber-600"
                              : isCurrent
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black animate-pulse"
                              : "bg-muted hover:bg-amber-500/20 text-foreground hover:text-amber-600"
                          }`}
                        >
                          {isMastered ? "⭐ 重温通关" : isCurrent ? "🚀 当前应学" : "🎮 去闯关"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 组末 D 模板场景寻宝复习关弹窗 */}
      <PhonicsGroupReviewModal
        group={activeReviewGroup}
        isOpen={Boolean(activeReviewGroup)}
        onClose={() => setActiveReviewGroup(null)}
        onCompleted={handleReviewCompleted}
      />

      {/* 阶段盲拼解锁测验弹窗 */}
      <PhonicsStageQuizModal
        stage={activeQuizStage}
        isOpen={Boolean(activeQuizStage)}
        onClose={() => setActiveQuizStage(null)}
        onPassed={handleQuizPassed}
        onFailed={handleQuizFailed}
        onOpenPhonemeLevel={(item) => {
          setActiveQuizStage(null);
          onSelectLevel(item);
        }}
      />
    </div>
  );
};
