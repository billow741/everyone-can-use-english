import React from "react";
import {
  SparklesIcon,
  StarIcon,
  AwardIcon,
  CheckCircle2Icon,
  LockIcon,
  PlayIcon,
  CompassIcon,
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

interface PhonicsIslandMapProps {
  masteryMap: Record<string, boolean>;
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
  // 过滤当前需要展示的岛区
  const zonesToDisplay =
    selectedZone === "all"
      ? PHONICS_ISLAND_ZONES.filter((z) => z.key !== "all")
      : PHONICS_ISLAND_ZONES.filter((z) => z.key === selectedZone);

  return (
    <div className="space-y-8 select-none">
      {/* 4 大岛区荣誉勋章成就墙概览 */}
      <div className="p-4 sm:p-5 rounded-3xl bg-card/80 backdrop-blur-md border border-amber-300/40 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
                <span>通关岛 5 大荣誉徽章殿堂</span>
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                  集星解锁
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                点亮整座岛屿的全部发音星，即可荣获专属探险勋章！
              </p>
            </div>
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

      {/* 4 大岛区分岛关卡探索路线 */}
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

            {/* 蜿蜒趣味关卡圆盘路线 (Levels Grid / Path) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-5">
              {zoneItems.map((item, idx) => {
                const isMastered =
                  !!masteryMap[item.id] ||
                  (item.ipaSlug && !!masteryMap[item.ipaSlug]);

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectLevel(item)}
                    className={`group relative rounded-3xl p-3.5 flex flex-col items-center text-center transition-all duration-300 cursor-pointer border-2 hover:shadow-xl hover:-translate-y-1.5 ${
                      isMastered
                        ? "bg-gradient-to-b from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-400 shadow-sm shadow-amber-500/10"
                        : "bg-background/80 hover:bg-card border-border hover:border-amber-400"
                    }`}
                  >
                    {/* 关卡顶部序号 */}
                    <div className="w-full flex items-center justify-between mb-1.5 text-[10px] font-mono font-bold">
                      <span className="text-muted-foreground">#{String(item.order).padStart(2, "0")}</span>
                      {isMastered ? (
                        <StarIcon className="size-4 fill-amber-400 text-amber-500 filter drop-shadow-sm" />
                      ) : (
                        <StarIcon className="size-4 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* 3D 萌宠关卡圆盘 */}
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
                          : "bg-muted hover:bg-amber-500/20 text-foreground hover:text-amber-600"
                      }`}
                    >
                      {isMastered ? "⭐ 重温通关" : "🎮 去闯关"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
