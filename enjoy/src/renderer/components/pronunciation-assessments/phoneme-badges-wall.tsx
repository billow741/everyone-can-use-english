import React, { useState } from "react";
import {
  SparklesIcon,
  CheckCircle2Icon,
  LockIcon,
  FlameIcon,
  ChevronRightIcon,
  TrophyIcon,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Progress,
} from "@renderer/components/ui";
import { calculatePhonemeBadges, PhonemeBadge } from "@renderer/lib/phoneme-badges";

interface PhonemeBadgesWallProps {
  masteryMap: Record<string, boolean>;
  className?: string;
  onSelectPhoneme?: (phonemeId: string) => void;
}

export const PhonemeBadgesWall: React.FC<PhonemeBadgesWallProps> = ({
  masteryMap,
  className = "",
  onSelectPhoneme,
}) => {
  const badges = calculatePhonemeBadges(masteryMap);
  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const [selectedBadge, setSelectedBadge] = useState<PhonemeBadge | null>(null);

  return (
    <Card className={`rounded-3xl border-border bg-card shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="bg-[#E7F2EF]/60 pb-3 border-b border-[#D3E4DE]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-black flex items-center gap-2 text-[#123B3C]">
              <span className="size-7 rounded-[10px] bg-[#F2A93B] text-[#123B3C] flex items-center justify-center text-sm shadow-xs">
                🏆
              </span>
              <span>音素成就勋章</span>
            </CardTitle>
            <p className="text-xs text-[#4E6B69]">
              完成对应练习组可解锁勋章
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs border-[#D3E4DE] bg-white text-[#96690A] dark:text-amber-300 font-bold"
            >
              已解锁 {unlockedCount} / {badges.length} 枚
            </Badge>

          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {badges.map((badge) => {
            const isUnlocked = badge.isUnlocked;
            const progress =
              badge.totalCount > 0
                ? Math.round((badge.unlockedCount / badge.totalCount) * 100)
                : 0;

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isUnlocked
                    ? "bg-gradient-to-br from-amber-500/15 via-background to-orange-500/10 border-amber-500/50 shadow-xs hover:border-amber-500 ring-1 ring-amber-500/20"
                    : "bg-muted/30 hover:bg-muted/60 border-border/70"
                }`}
              >
                {/* 顶部图标与分类 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl p-1.5 rounded-xl bg-background/80 shadow-xs border border-border/50">
                      {badge.icon}
                    </span>
                    {isUnlocked ? (
                      <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-1.5 py-0 gap-1">
                        <CheckCircle2Icon className="size-3" />
                        <span>已获得</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono text-muted-foreground px-1.5 py-0"
                      >
                        {badge.unlockedCount}/{badge.totalCount}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h4
                      className={`text-sm font-bold ${
                        isUnlocked ? "text-foreground font-black" : "text-muted-foreground"
                      }`}
                    >
                      {badge.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* 底部进度条 */}
                <div className="mt-3 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{badge.category}</span>
                    <span className="font-mono font-bold">
                      {isUnlocked ? "100%" : `${progress}%`}
                    </span>
                  </div>
                  <Progress
                    value={isUnlocked ? 100 : progress}
                    className={`h-1.5 bg-muted ${isUnlocked ? "[&>div]:bg-amber-500" : ""}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

    </Card>
  );
};
