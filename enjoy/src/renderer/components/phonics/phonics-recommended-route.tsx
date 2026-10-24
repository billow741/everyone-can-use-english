import React, { useMemo } from "react";
import {
  SparklesIcon,
  StarIcon,
  AwardIcon,
  CheckCircle2Icon,
  LockIcon,
  PlayIcon,
  GiftIcon,
  CompassIcon,
  FlameIcon,
  ArrowRightIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Badge, Progress, Button } from "@renderer/components/ui";
import {
  PHONICS_ROUTE_GROUPS,
  PHONICS_ROUTE_STAGES,
  PhonicsRouteGroup,
  PhonicsRouteStage,
  isPhonemeMastered,
  isGroupUnlocked,
  isGroupCompleted,
  isGroupPhonemesMastered,
  isGroupReviewCompleted,
  isStageUnlocked,
  isStageQuizPassed,
  getStageQuizData,
  getCurrentRouteTarget,
  getRouteProgressSummary,
} from "@renderer/lib/phonics-route-config";
import {
  PHONICS_ISLAND_39_ANCHORS,
  PhonicsAnchorItem,
} from "@renderer/lib/phoneme-anchors";

interface PhonicsRecommendedRouteProps {
  masteryMap: Record<string, any>;
  onSelectPhoneme: (item: PhonicsAnchorItem) => void;
  onSelectGroupReview: (group: PhonicsRouteGroup) => void;
  onSelectStageQuiz: (stage: PhonicsRouteStage) => void;
  onSwitchToFreeMode: () => void;
}

export const PhonicsRecommendedRoute: React.FC<PhonicsRecommendedRouteProps> = ({
  masteryMap,
  onSelectPhoneme,
  onSelectGroupReview,
  onSelectStageQuiz,
  onSwitchToFreeMode,
}) => {
  // 当前应学目标与路线汇总
  const summary = useMemo(() => getRouteProgressSummary(masteryMap), [masteryMap]);
  const currentTarget = summary.target;

  // 点击快速继续按钮，直达当前关卡
  const handleContinueTarget = () => {
    if (currentTarget.type === "phoneme" && currentTarget.phonemeItem) {
      onSelectPhoneme(currentTarget.phonemeItem);
    } else if (currentTarget.type === "review" && currentTarget.group) {
      onSelectGroupReview(currentTarget.group);
    } else if (currentTarget.type === "quiz" && currentTarget.stage) {
      onSelectStageQuiz(currentTarget.stage);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* 🌟 推荐探险主进度控制台 (Hero Bar) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400/50 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-500 text-slate-950 font-black text-xs gap-1">
                <SparklesIcon className="size-3 fill-current" />
                <span>推荐主路线</span>
              </Badge>
              <span className="text-xs font-mono font-black text-amber-900 dark:text-amber-200 bg-amber-400/30 px-2.5 py-0.5 rounded-lg">
                当前应学：{currentTarget.label}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {currentTarget.subLabel}
            </h2>

            <p className="text-xs text-muted-foreground font-medium">
              按合成式自然拼读体系（G1→G12）循序渐进，学完即可拼真词，配组末寻宝与阶段盲拼测验！
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* 一键直达当前应学关卡 */}
            {currentTarget.type !== "all_done" && (
              <Button
                onClick={handleContinueTarget}
                className="h-11 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm gap-2 shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <PlayIcon className="size-4 fill-current" />
                <span>🚀 继续推荐路线</span>
              </Button>
            )}

            {/* 自由模式切换快捷入口 */}
            <Button
              variant="outline"
              onClick={onSwitchToFreeMode}
              className="h-11 px-4 rounded-2xl border-amber-300 font-bold text-xs gap-1.5 cursor-pointer bg-background/80 hover:bg-background"
            >
              <CompassIcon className="size-4 text-amber-500" />
              <span>4 大岛区自由探索</span>
            </Button>
          </div>
        </div>

        {/* 路线总进度条 */}
        <div className="mt-5 pt-4 border-t border-amber-300/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-muted-foreground font-bold">
            <span>
              已点亮：<strong className="text-foreground font-mono">{summary.masteredPhonemesCount}</strong> / 39 颗星
            </span>
            <span>·</span>
            <span>
              通关组数：<strong className="text-foreground font-mono">{summary.completedGroupsCount}</strong> / 12 组
            </span>
            <span>·</span>
            <span>
              通过测验：<strong className="text-foreground font-mono">{summary.passedStagesCount}</strong> / 4 阶段
            </span>
          </div>

          <div className="flex items-center gap-3 sm:w-64">
            <Progress value={summary.pct} className="h-2.5 rounded-full" />
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 shrink-0">
              {summary.pct}%
            </span>
          </div>
        </div>
      </div>

      {/* 蜿蜒推荐探险小径（按 4 大阶段顺序列出 12 组与阶段测验） */}
      <div className="space-y-10">
        {PHONICS_ROUTE_STAGES.map((stage) => {
          const stageGroups = PHONICS_ROUTE_GROUPS.filter((g) => g.stage === stage.id);
          const isStageTestUnlocked = isStageUnlocked(stage.id, masteryMap);
          const isStageTestPassed = isStageQuizPassed(stage.id, masteryMap);
          const stageQuizData = getStageQuizData(stage.id, masteryMap);

          return (
            <div key={stage.id} className="space-y-4">
              {/* 阶段大横幅标题 */}
              <div className="px-5 py-3 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">
                    {stage.id === 1 ? "🌱" : stage.id === 2 ? "🚀" : stage.id === 3 ? "✨" : "👑"}
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
                      <span>{stage.name} · {stage.title}</span>
                      <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-300/40 text-[10px] font-black">
                        {stage.totalSounds} 音
                      </Badge>
                      {isStageTestPassed && (
                        <Badge className="bg-emerald-500 text-white text-[10px] font-black">
                          测验已出关 🎉
                        </Badge>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {stage.description}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-muted-foreground">
                  第 {stageGroups[0]?.order} ~ {stageGroups[stageGroups.length - 1]?.order} 组
                </span>
              </div>

              {/* 阶段内的各组卡片流 */}
              <div className="grid grid-cols-1 gap-5">
                {stageGroups.map((group) => {
                  const unlocked = isGroupUnlocked(group, masteryMap);
                  const soundsOk = isGroupPhonemesMastered(group, masteryMap);
                  const reviewOk = isGroupReviewCompleted(group.id, masteryMap);
                  const groupDone = soundsOk && reviewOk;

                  const groupItems = group.phonemeIds
                    .map((id) => PHONICS_ISLAND_39_ANCHORS.find((a) => a.id === id))
                    .filter(Boolean) as PhonicsAnchorItem[];

                  return (
                    <div
                      key={group.id}
                      className={`relative rounded-3xl border-2 p-4 sm:p-5 transition-all ${
                        groupDone
                          ? "bg-card/90 border-emerald-400/50 shadow-sm"
                          : unlocked
                          ? "bg-card border-amber-400 shadow-md shadow-amber-500/10"
                          : "bg-muted/30 border-border/60 opacity-80"
                      }`}
                    >
                      {/* 组卡片顶部说明 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/60">
                        <div className="flex items-center gap-2.5">
                          <span className="size-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black font-mono text-xs">
                            G{group.order}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm sm:text-base font-black text-foreground">
                                {group.title}
                              </h4>
                              {groupDone ? (
                                <Badge className="bg-emerald-500 text-white font-black text-[10px]">
                                  全组通关 ⭐
                                </Badge>
                              ) : unlocked ? (
                                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                                  推荐闯关中 🚀
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                                  <LockIcon className="size-3" /> 未解锁
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">
                              {group.description} · 可拼词示例: {group.cumulativeWordsExample.slice(0, 4).join(", ")}
                            </p>
                          </div>
                        </div>

                        {!unlocked && (
                          <div className="text-xs text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 px-3 py-1 rounded-xl">
                            🔒 需完成前置关卡及 D 复习关解锁
                          </div>
                        )}
                      </div>

                      {/* 发光推荐小径节点流：组内音素节点 + 组末 D 寻宝节点 */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        {groupItems.map((item, itemIdx) => {
                          const isMastered = isPhonemeMastered(item.id, masteryMap);
                          const isCurrent =
                            currentTarget.type === "phoneme" &&
                            currentTarget.phonemeItem?.id === item.id;

                          // 检查是否在阶段测验中被定位为回炉音素
                          const isRemedial =
                            stageQuizData &&
                            !stageQuizData.passed &&
                            stageQuizData.remedialPhonemes?.includes(item.id);

                          return (
                            <React.Fragment key={item.id}>
                              {/* 单音节点卡片 */}
                              <div
                                onClick={() => onSelectPhoneme(item)}
                                className={`group relative rounded-3xl p-3 flex flex-col items-center text-center transition-all duration-200 cursor-pointer border-2 min-w-[90px] sm:min-w-[105px] ${
                                  isCurrent
                                    ? "bg-gradient-to-b from-amber-500/25 to-amber-500/10 border-amber-500 ring-4 ring-amber-400/50 shadow-lg shadow-amber-500/25 scale-105"
                                    : isMastered
                                    ? "bg-amber-500/10 border-amber-400/70 shadow-xs hover:scale-102"
                                    : "bg-background/80 hover:bg-card border-border hover:border-amber-400"
                                }`}
                              >
                                {/* 节点顶标 */}
                                <div className="w-full flex items-center justify-between mb-1 text-[10px] font-mono font-bold">
                                  <span className="text-muted-foreground">
                                    G{group.order}-{itemIdx + 1}
                                  </span>
                                  {isMastered ? (
                                    <StarIcon className="size-3.5 fill-amber-400 text-amber-500" />
                                  ) : isRemedial ? (
                                    <FlameIcon className="size-3.5 text-rose-500 fill-current" />
                                  ) : (
                                    <StarIcon className="size-3.5 text-muted-foreground/30" />
                                  )}
                                </div>

                                {/* 萌宠图标 */}
                                <div
                                  className={`size-14 sm:size-16 rounded-2xl bg-gradient-to-b ${item.colorBg} p-1.5 flex items-center justify-center relative shadow-inner overflow-hidden group-hover:scale-105 transition-transform`}
                                >
                                  <img
                                    src={item.imageUrl}
                                    alt={item.anchorWord}
                                    className="w-full h-full object-contain filter drop-shadow-xs"
                                    loading="lazy"
                                  />
                                </div>

                                {/* 大字母与锚定词 */}
                                <div className="mt-1.5 text-center">
                                  <div className="text-lg font-black font-sans tracking-tight text-foreground group-hover:text-amber-500 transition-colors">
                                    {item.letter}
                                  </div>
                                  <div className="text-[10px] font-bold text-muted-foreground truncate max-w-[80px]">
                                    {item.anchorWord}
                                  </div>
                                </div>

                                {/* 标识胶囊 */}
                                {isCurrent ? (
                                  <Badge className="mt-1.5 bg-amber-500 text-slate-950 font-black text-[9px] animate-pulse">
                                    当前应学
                                  </Badge>
                                ) : isRemedial ? (
                                  <Badge className="mt-1.5 bg-rose-500 text-white font-black text-[9px]">
                                    🔥 回炉
                                  </Badge>
                                ) : isMastered ? (
                                  <span className="mt-1.5 text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                                    已通关 ⭐
                                  </span>
                                ) : (
                                  <span className="mt-1.5 text-[9px] text-muted-foreground font-semibold">
                                    待学习
                                  </span>
                                )}
                              </div>

                              {/* 发光连线箭头 */}
                              <div className="text-amber-400/60 font-black text-sm shrink-0">
                                ➔
                              </div>
                            </React.Fragment>
                          );
                        })}

                        {/* 🎁 组末 D 模板复习寻宝关节点 */}
                        <div
                          onClick={() => {
                            // 自由模式不阻拦进入体验
                            onSelectGroupReview(group);
                          }}
                          className={`group relative rounded-3xl p-3 flex flex-col items-center text-center transition-all duration-200 cursor-pointer border-2 min-w-[110px] sm:min-w-[125px] ${
                            reviewOk
                              ? "bg-emerald-500/15 border-emerald-400 shadow-sm"
                              : soundsOk
                              ? "bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/40 shadow-lg shadow-amber-500/20 animate-pulse scale-105"
                              : "bg-muted/40 border-border/80 opacity-70"
                          }`}
                        >
                          <div className="w-full flex items-center justify-between mb-1 text-[10px] font-mono font-bold">
                            <span className="text-muted-foreground">组末寻宝</span>
                            {reviewOk ? (
                              <CheckCircle2Icon className="size-3.5 text-emerald-500" />
                            ) : (
                              <GiftIcon className="size-3.5 text-amber-500" />
                            )}
                          </div>

                          <div className="size-14 sm:size-16 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 p-2 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform text-white">
                            🎁
                          </div>

                          <div className="mt-1.5 text-center">
                            <div className="text-xs font-black text-foreground">
                              D 寻宝关
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground truncate max-w-[90px]">
                              找齐本组宝贝
                            </div>
                          </div>

                          {reviewOk ? (
                            <Badge className="mt-1.5 bg-emerald-500 text-white font-black text-[9px]">
                              已全找齐 ✨
                            </Badge>
                          ) : soundsOk ? (
                            <Badge className="mt-1.5 bg-amber-500 text-slate-950 font-black text-[9px] animate-bounce">
                              ⭐ 去寻宝
                            </Badge>
                          ) : (
                            <span className="mt-1.5 text-[9px] text-muted-foreground font-semibold">
                              需先通关音素
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 🎓 阶段终点站：阶段盲拼解锁测验节点 */}
              <div
                onClick={() => onSelectStageQuiz(stage)}
                className={`p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isStageTestPassed
                    ? "bg-emerald-500/10 border-emerald-400 shadow-sm"
                    : isStageTestUnlocked
                    ? "bg-gradient-to-r from-purple-500/20 via-pink-500/15 to-amber-500/20 border-purple-400 ring-2 ring-purple-400/40 shadow-lg shadow-purple-500/20 scale-101"
                    : "bg-muted/30 border-border/80 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-13 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                    🎓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-white font-black text-[10px]">
                        阶段里程碑
                      </Badge>
                      <h4 className="text-sm sm:text-base font-black text-foreground">
                        {stage.name} · {stage.title} (5 词盲拼)
                      </h4>
                      {isStageTestPassed ? (
                        <Badge className="bg-emerald-500 text-white font-black text-[10px]">
                          已出关通过 🎉
                        </Badge>
                      ) : stageQuizData && !stageQuizData.passed ? (
                        <Badge className="bg-rose-500 text-white font-black text-[10px]">
                          需回炉 2 音
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {stage.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    size="sm"
                    className={`h-9 px-4 rounded-xl font-black text-xs gap-1.5 shadow-xs cursor-pointer ${
                      isStageTestPassed
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : isStageTestUnlocked
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span>{isStageTestPassed ? "⭐ 查看测验" : "🎮 挑战盲拼测验"}</span>
                    <ChevronRightIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
