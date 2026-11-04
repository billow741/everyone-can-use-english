// 阳光桥少儿英语 · G1 四关试点航线主控 (RoutePilotSection)
// 探险漫画风视觉改造：头图横幅、开场故事卡、漫画过场接线、剧情残页卡与声效 BGM

import React, { useState, useEffect } from "react";
import {
  getPilotProgress,
  markPilotLevelCompleted,
  resetPilotProgress,
  PILOT_UPDATED_EVENT,
  PilotLevelId,
  RoutePilotProgress,
  PilotLevelState,
} from "@renderer/lib/route-pilot";
import {
  getGameStoryState,
  saveGameStoryState,
  resetGameStoryState,
  GAME_STORY_UPDATED_EVENT,
  GameStoryState,
} from "@renderer/lib/game-story";
import {
  playSfx,
  startBgm,
  stopBgm,
  startCampfireSfx,
  stopCampfireSfx,
  isMuted,
  toggleMuted,
} from "@renderer/lib/game-audio";
import { GAME_ASSETS, CUTSCENE_SCRIPTS } from "@renderer/lib/game-assets";
import { CutscenePlayer } from "./cutscene-player";
import { PilotLevelA } from "./pilot-level-a";
import { PilotLevelB } from "./pilot-level-b";
import { PilotLevelR04 } from "./pilot-level-r04";
import {
  RotateCcwIcon,
  CheckCircle2Icon,
  SparklesIcon,
  AwardIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";

interface CardMeta {
  id: PilotLevelId;
  title: string;
  subtitle: string;
  phoneme: string;
  letter: string;
  anchorWord: string;
  typeTag: string;
  description: string;
}

const PILOT_CARDS: CardMeta[] = [
  {
    id: "R01",
    title: "R01 微风码头",
    subtitle: "开音定向关",
    phoneme: "/æ/",
    letter: "A",
    anchorWord: "apple",
    typeTag: "关型 A · 寻音信标",
    description: "只教 /æ/ 与字母 A。灰雾杂音中寻音，3 轮锁定真正的 /æ/ 信标。",
  },
  {
    id: "R02",
    title: "R02 苹果灯塔",
    subtitle: "三音序列关",
    phoneme: "/s/",
    letter: "S",
    anchorWord: "sun",
    typeTag: "关型 A · 定向与三音序列",
    description: "教 /s/ 与字母 S。池内双音定向混编，随后复现三音序列。",
  },
  {
    id: "R03",
    title: "R03 虎爪小径",
    subtitle: "引导拼读关",
    phoneme: "/t/",
    letter: "T",
    anchorWord: "tiger",
    typeTag: "关型 B · 手动拼装线",
    description: "教 /t/ 与字母 T。全岛首次三音遗迹合体 (sat)，亲手滑读点亮灯火。",
  },
  {
    id: "R04",
    title: "R04 猪鼻营地",
    subtitle: "组末综合关",
    phoneme: "/p/",
    letter: "P",
    anchorWord: "pig",
    typeTag: "关型 B · 营地校验",
    description: "教 /p/ 与字母 P。队列拼读 Q=3、盲音迁移验证与营地四项两线结算。",
  },
];

export const RoutePilotSection: React.FC = () => {
  const [progress, setProgress] = useState<RoutePilotProgress>(() => getPilotProgress());
  const [story, setStory] = useState<GameStoryState>(() => getGameStoryState());
  const [activeLevelId, setActiveLevelId] = useState<PilotLevelId | null>(null);

  // 正在播放的剧情过场
  const [playingCutscene, setPlayingCutscene] = useState<
    keyof typeof CUTSCENE_SCRIPTS | null
  >(null);

  // CS-R04 播放完毕后展示残页碎片卡
  const [showLogpageCard, setShowLogpageCard] = useState<boolean>(false);

  // 关卡结算信息条
  const [settlementInfo, setSettlementInfo] = useState<{
    levelId: PilotLevelId;
    result: "independent" | "assisted";
    durationMs: number;
    details?: string;
    lit?: boolean;
    reviewList?: string[];
  } | null>(null);

  // 监听试点区进度更新
  useEffect(() => {
    const handleUpdate = () => {
      setProgress(getPilotProgress());
    };
    window.addEventListener(PILOT_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(PILOT_UPDATED_EVENT, handleUpdate);
  }, []);

  // 监听故事状态更新
  useEffect(() => {
    const handleStoryUpdate = () => {
      setStory(getGameStoryState());
    };
    window.addEventListener(GAME_STORY_UPDATED_EVENT, handleStoryUpdate);
    return () => window.removeEventListener(GAME_STORY_UPDATED_EVENT, handleStoryUpdate);
  }, []);

  // BGM 调度：试点区可见且无进行中关卡时 title；R04 关内与 CS-R04 期间 camp；离开/静音时停
  useEffect(() => {
    if (activeLevelId === "R04" || playingCutscene === "CS-R04") {
      startBgm("camp");
      if (playingCutscene === "CS-R04") {
        startCampfireSfx();
      }
    } else if (activeLevelId === "R01" || activeLevelId === "R02" || activeLevelId === "R03") {
      stopBgm();
      stopCampfireSfx();
    } else {
      // 试点区主卡面展示中
      startBgm("title");
      stopCampfireSfx();
    }

    return () => {
      stopCampfireSfx();
    };
  }, [activeLevelId, playingCutscene]);

  // 组件卸载时停止背景音效
  useEffect(() => {
    return () => {
      stopBgm();
      stopCampfireSfx();
    };
  }, []);

  // 点击卡片进入关卡前置过场判定
  const handleCardClick = (levelId: PilotLevelId) => {
    playSfx("tap");
    const st = getGameStoryState();

    if (levelId === "R01" && !st.g1inSeen) {
      setPlayingCutscene("CS-G1-IN");
      return;
    }

    if (levelId === "R03" && !st.r03PreSeen) {
      setPlayingCutscene("CS-R03-PRE");
      return;
    }

    if (levelId === "R04" && !st.r04ArrSeen) {
      setPlayingCutscene("CS-R04-ARR");
      return;
    }

    setActiveLevelId(levelId);
  };

  // 过场播放完成或跳过回调
  const handleCutsceneDone = (skipped: boolean) => {
    const current = playingCutscene;
    setPlayingCutscene(null);

    if (current === "CS-00") {
      saveGameStoryState({ cs00Seen: true });
      setStory(getGameStoryState());
    } else if (current === "CS-G1-IN") {
      saveGameStoryState({ g1inSeen: true });
      setStory(getGameStoryState());
      setActiveLevelId("R01");
    } else if (current === "CS-R03-PRE") {
      saveGameStoryState({ r03PreSeen: true });
      setStory(getGameStoryState());
      setActiveLevelId("R03");
    } else if (current === "CS-R03-FINAL") {
      // R03 定格格播完，结算条已展示
    } else if (current === "CS-R04-ARR") {
      saveGameStoryState({ r04ArrSeen: true });
      setStory(getGameStoryState());
      setActiveLevelId("R04");
    } else if (current === "CS-R04") {
      saveGameStoryState({ cs04Seen: true });
      setStory(getGameStoryState());
      stopCampfireSfx();
      // 播完展示残页碎片卡
      setShowLogpageCard(true);
    }
  };

  // R01/R02 关卡完成结算
  const handleLevelAComplete = (summary: {
    result: "independent" | "assisted";
    independentCount: number;
    assistedCount: number;
    firstTryAccuracy: number;
    durationMs: number;
  }) => {
    if (!activeLevelId) return;
    const currentLvl = activeLevelId;

    markPilotLevelCompleted(currentLvl, {
      completed: true,
      result: summary.result,
      firstTryCount: summary.independentCount,
      totalQuestions: summary.independentCount + summary.assistedCount,
      durationMs: summary.durationMs,
    });

    // independent -> place-lit; assisted -> stamp
    if (summary.result === "independent") {
      playSfx("place-lit");
    } else {
      playSfx("stamp");
    }

    setSettlementInfo({
      levelId: currentLvl,
      result: summary.result,
      durationMs: summary.durationMs,
      details: `独立完成 ${summary.independentCount} 题 • 协助 ${summary.assistedCount} 题 • 首次正确率 ${Math.round(
        summary.firstTryAccuracy * 100
      )}%`,
    });

    setActiveLevelId(null);
  };

  // R03 关卡完成结算 (内嵌 CS-R03-FINAL 定格格)
  const handleLevelBComplete = (summary: {
    result: "independent" | "assisted";
    firstIndependentBlend: boolean;
    durationMs: number;
  }) => {
    markPilotLevelCompleted("R03", {
      completed: true,
      result: summary.result,
      firstIndependentBlend: summary.firstIndependentBlend,
      durationMs: summary.durationMs,
    });

    setActiveLevelId(null);

    // 播放定格格（Pam 句，sat……路出声了）
    setPlayingCutscene("CS-R03-FINAL");

    if (summary.result === "independent") {
      playSfx("place-lit");
    } else {
      playSfx("stamp");
    }

    setSettlementInfo({
      levelId: "R03",
      result: summary.result,
      durationMs: summary.durationMs,
      details: summary.firstIndependentBlend
        ? "✨ 首次亲手独立拼读 sat 成功！已记录 firstIndependentBlend。"
        : "向导跟读协助完成 sat 拼读，仪式照常走完。",
    });
  };

  // R04 关卡完成结算
  const handleLevelR04Complete = (summary: {
    cleared: boolean;
    lit: boolean;
    accuracy: number;
    reviewList: string[];
    durationMs: number;
  }) => {
    markPilotLevelCompleted("R04", {
      completed: true,
      result: summary.lit ? "independent" : "assisted",
      campVerification: {
        cleared: summary.cleared,
        lit: summary.lit,
        accuracy: summary.accuracy,
        reviewList: summary.reviewList,
      },
      durationMs: summary.durationMs,
    });

    setActiveLevelId(null);

    // 组徽点亮线判定：lit 时播 badge-lit；assisted/待点亮时播 stamp（绝不播 place-lit）
    if (summary.lit) {
      playSfx("badge-lit");
    } else {
      playSfx("stamp");
    }

    setSettlementInfo({
      levelId: "R04",
      result: summary.lit ? "independent" : "assisted",
      durationMs: summary.durationMs,
      lit: summary.lit,
      reviewList: summary.reviewList,
      details: `营地过关线：已达成 • 组徽点亮线：${
        summary.lit
          ? "🏆 已点亮 (首次正确率 " + Math.round(summary.accuracy * 100) + "%)"
          : "待点亮 (首次正确率 " + Math.round(summary.accuracy * 100) + "%)"
      }${summary.reviewList.length > 0 ? " • 复练项：" + summary.reviewList.join(", ") : ""}`,
    });

    // 若尚未观看 CS-R04，结算后触发
    const st = getGameStoryState();
    if (!st.cs04Seen) {
      setPlayingCutscene("CS-R04");
    }
  };

  // 重置试点进度与故事状态 (调试辅助)
  const handleReset = () => {
    playSfx("tap");
    if (window.confirm("确定要重置试点区全部四关的进度与剧情故事状态吗？")) {
      resetPilotProgress();
      resetGameStoryState();
      setStory(getGameStoryState());
      setSettlementInfo(null);
      setShowLogpageCard(false);
    }
  };

  // 风格令牌
  const containerStyle: React.CSSProperties = {
    backgroundColor: "#F3E3C2",
    color: "#3A2A18",
    borderColor: "#3A2A18",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#FFF8EA",
    color: "#3A2A18",
    borderColor: "#3A2A18",
    boxShadow: "4px 4px 0px #3A2A18",
  };

  // R04 营地点亮后换 wld-main-lit.webp
  const isCampLit = Boolean(progress.levels.R04.campVerification?.lit);
  const bannerImage = isCampLit
    ? GAME_ASSETS.world.mainLit
    : GAME_ASSETS.world.main;

  // 关卡卡片地点背景映射
  const getCardBg = (cardId: PilotLevelId, state: PilotLevelState): string => {
    const scene = {
      R01: GAME_ASSETS.scenes.breezeDock,
      R02: GAME_ASSETS.scenes.appleLighthouse,
      R03: GAME_ASSETS.scenes.tigerTrail,
      R04: GAME_ASSETS.scenes.pigCamp,
    }[cardId];

    if (!state.unlocked || !state.completed) {
      return scene.silent;
    }

    if (cardId === "R04") {
      return state.campVerification?.lit ? scene.lit : scene.base;
    }

    if (state.result === "independent") {
      return scene.lit;
    }

    return scene.base;
  };

  // 关卡卡片状态角标映射 (status-sprite.svg)
  const getCardStatusSprite = (
    cardId: PilotLevelId,
    state: PilotLevelState
  ): {
    symbolId: string;
    label: string;
    badgeBg: string;
  } => {
    if (!state.unlocked) {
      return {
        symbolId: "st-node-locked",
        label: "未解锁",
        badgeBg: "bg-neutral-300 text-neutral-600",
      };
    }
    if (!state.completed) {
      return {
        symbolId: "st-node-unlocked",
        label: "可挑战",
        badgeBg: "bg-[#FFB340] text-[#3A2A18]",
      };
    }
    // Completed
    if (cardId === "R04") {
      if (state.campVerification?.lit) {
        return {
          symbolId: "st-node-lit",
          label: "营地点亮",
          badgeBg: "bg-[#FFB340] text-[#3A2A18]",
        };
      }
      return {
        symbolId: "st-node-assisted",
        label: "过关待点亮",
        badgeBg: "bg-[#2E7D5B] text-white",
      };
    }

    if (state.result === "independent") {
      return {
        symbolId: "st-node-done",
        label: "独立完成",
        badgeBg: "bg-[#2E7D5B] text-white",
      };
    }

    return {
      symbolId: "st-node-assisted",
      label: "协助过关",
      badgeBg: "bg-[#FFB340] text-[#3A2A18]",
    };
  };

  return (
    <div
      className="mt-10 mb-8 p-5 sm:p-6 rounded-3xl border-[3px] border-[#3A2A18] relative overflow-hidden transition-all"
      style={containerStyle}
    >
      <div className="absolute inset-2 border border-dashed border-[#3A2A18]/30 rounded-2xl pointer-events-none" />

      {/* 区块头图 (world/wld-main.webp，R04营地点亮后换 wld-main-lit.webp，右下开场故事重播按钮) */}
      <div className="relative z-10 mb-5 rounded-2xl border-2 border-[#3A2A18] overflow-hidden shadow-[4px_4px_0_#3A2A18] bg-[#2A1E14]">
        <div className="w-full h-36 sm:h-44 relative overflow-hidden">
          <img
            src={bannerImage}
            alt="世界航线主图"
            className="w-full h-full object-cover transition-all duration-700"
          />

          {/* 头图渐变与标题徽标 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full border border-white/40 bg-[#2E7D5B] text-white shadow-sm">
                    G1 探索者试点航线
                  </span>
                  <span className="text-[11px] font-bold text-white/80 drop-shadow">
                    记账完全隔离 • 沉浸剧情
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  探索者前哨站 · G1 试点航线 (R01–R04)
                </h2>
              </div>

              {/* 头图右下控件群：静音切换 + 开场故事重播按钮 */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => {
                    const next = toggleMuted();
                    setStory((prev) => ({ ...prev, muted: next }));
                  }}
                  className="px-2.5 py-1.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFF8EA] hover:bg-[#F3E3C2] text-xs font-black text-[#3A2A18] flex items-center gap-1.5 shadow-[2px_2px_0_#3A2A18] cursor-pointer transition-colors"
                  title={story.muted ? "点击开启声音" : "点击静音"}
                >
                  {story.muted ? (
                    <VolumeXIcon className="size-3.5 text-[#D63C2F]" />
                  ) : (
                    <Volume2Icon className="size-3.5 text-[#2E7D5B]" />
                  )}
                  <span>{story.muted ? "静音中" : "声音"}</span>
                </button>

                <button
                  onClick={() => {
                    playSfx("tap");
                    setPlayingCutscene("CS-00");
                  }}
                  className="px-3 py-1.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] hover:bg-[#e09827] text-xs font-black text-[#3A2A18] flex items-center gap-1.5 shadow-[2px_2px_0_#3A2A18] cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  <svg className="size-3.5 fill-[#3A2A18]">
                    <use href="/assets/game/svg/icons-sprite.svg#icn-play" />
                  </svg>
                  <span>开场故事</span>
                </button>

                <button
                  onClick={handleReset}
                  className="px-2.5 py-1.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFF8EA] hover:bg-[#F3E3C2] text-xs font-bold text-[#3A2A18]/70 flex items-center gap-1 cursor-pointer shadow-[2px_2px_0_#3A2A18] transition-colors"
                  title="重置试点全部四关进度与剧情记录"
                >
                  <RotateCcwIcon className="size-3" />
                  <span className="hidden sm:inline">重置</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CS-00 首次开场故事入口卡 (cs00Seen 为 false 时展示在顶部，播完收起) */}
      {!story.cs00Seen && !activeLevelId && (
        <div className="relative z-10 mb-5 p-4 sm:p-5 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] shadow-[3px_3px_0_#3A2A18] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl border-2 border-[#3A2A18] bg-[#FFB340] flex items-center justify-center shrink-0 shadow-[2px_2px_0_#3A2A18]">
              <svg className="size-7 fill-[#3A2A18]">
                <use href="/assets/game/svg/icons-sprite.svg#icn-play" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.2 rounded border border-[#3A2A18] bg-[#D63C2F] text-white">
                  启航序章
                </span>
                <span className="text-xs font-bold text-[#3A2A18]/70">
                  迷雾降临 · 开场故事
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-[#3A2A18] mt-1">
                那天夜里，雾从海上漫过来，地图上的灯灭了……和敢敢一起喊回声音！
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSfx("tap");
              setPlayingCutscene("CS-00");
            }}
            className="px-5 py-2.5 rounded-2xl border-2 border-[#3A2A18] bg-[#2E7D5B] hover:bg-[#25694c] text-white font-black text-xs sm:text-sm tracking-wide shadow-[3px_3px_0_#3A2A18] cursor-pointer flex items-center gap-2 shrink-0 transition-transform hover:-translate-y-0.5"
          >
            <svg className="size-4 fill-white">
              <use href="/assets/game/svg/icons-sprite.svg#icn-play" />
            </svg>
            <span>播放开场故事</span>
          </button>
        </div>
      )}

      {/* 结算通知条 (若刚完成一关) */}
      {settlementInfo && !activeLevelId && (
        <div className="relative z-10 mt-3 mb-5 p-4 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] shadow-[3px_3px_0_#3A2A18] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            {/* 组徽点亮或常规划定图标 */}
            {settlementInfo.levelId === "R04" && settlementInfo.lit ? (
              <div className="w-12 h-12 rounded-xl border-2 border-[#3A2A18] bg-[#FFF8EA] flex items-center justify-center p-1 shadow-[2px_2px_0_#3A2A18]">
                <img
                  src={GAME_ASSETS.svg.colBadgeG1}
                  alt="G1 探索者徽章"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : settlementInfo.levelId === "R04" && !settlementInfo.lit ? (
              <div className="w-12 h-12 rounded-xl border-2 border-[#3A2A18] bg-neutral-200 flex items-center justify-center p-1.5 shadow-[2px_2px_0_#3A2A18]">
                <svg className="w-8 h-8">
                  <use href="/assets/game/svg/status-sprite.svg#st-badge-grey" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl border-2 border-[#3A2A18] bg-[#2E7D5B] flex items-center justify-center text-white">
                <CheckCircle2Icon className="size-6" />
              </div>
            )}

            <div>
              <div className="text-xs font-black text-[#2E7D5B] flex items-center gap-1.5">
                <span>{settlementInfo.levelId} 关卡结算完成</span>
                <span className="text-[10px] px-2 py-0.2 rounded border border-[#3A2A18]/30 bg-[#F3E3C2] text-[#3A2A18]">
                  耗时 {Math.round(settlementInfo.durationMs / 1000)}s
                </span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded border border-[#3A2A18]/30 font-black ${
                    settlementInfo.result === "independent"
                      ? "bg-[#2E7D5B] text-white"
                      : "bg-[#FFB340] text-[#3A2A18]"
                  }`}
                >
                  {settlementInfo.result === "independent"
                    ? "独立过关"
                    : "协助过关 (assisted)"}
                </span>

                {settlementInfo.levelId === "R04" && settlementInfo.lit && (
                  <span className="text-[10px] px-2 py-0.2 rounded border border-[#3A2A18] bg-[#FFB340] text-[#3A2A18] font-black">
                    🏆 G1 探索者金徽已点亮
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-[#3A2A18] mt-0.5">
                {settlementInfo.details}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playSfx("tap");
              setSettlementInfo(null);
            }}
            className="text-xs font-bold text-[#3A2A18]/70 hover:text-[#3A2A18] px-2.5 py-1 cursor-pointer border border-[#3A2A18]/30 rounded-lg bg-[#F3E3C2]"
          >
            ✕ 知道了
          </button>
        </div>
      )}

      {/* 剧情过场播放器大弹层 */}
      {playingCutscene && (
        <CutscenePlayer
          config={CUTSCENE_SCRIPTS[playingCutscene]}
          onDone={handleCutsceneDone}
        />
      )}

      {/* CS-R04 后展示的残页碎片卡 */}
      {showLogpageCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-3xl border-[3px] border-[#3A2A18] p-5 sm:p-6 relative shadow-[6px_6px_0_#3A2A18]"
            style={containerStyle}
          >
            <div className="absolute inset-2 border border-dashed border-[#3A2A18]/30 rounded-2xl pointer-events-none" />

            <div className="relative z-10 text-center">
              <span className="text-[11px] font-black px-3 py-1 rounded-full border border-[#3A2A18] bg-[#FFB340] text-[#3A2A18]">
                获得重要剧情线索
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#3A2A18] mt-2">
                老船长的日志 · 遗落残页 #01
              </h3>

              {/* 残页图像与上叠 UI 文本层 */}
              <div className="relative my-4 rounded-2xl border-2 border-[#3A2A18] overflow-hidden shadow-[3px_3px_0_#3A2A18] bg-[#E5D2A8]">
                <img
                  src={GAME_ASSETS.props.logpage01Art}
                  alt="老船长日志残页"
                  className="w-full aspect-[4/3] object-cover"
                />
                {/* 衬线斜体、做旧色文本层 */}
                <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none bg-black/5">
                  <p className="font-serif italic text-2xl sm:text-3xl text-[#42250E] font-black tracking-widest drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)] text-center">
                    … sat … a tap, tap … pat …
                  </p>
                </div>
              </div>

              <p className="text-xs font-bold text-[#3A2A18]/70 px-4">
                「等你学会更多声音，这一页会自己长出字来。」
              </p>

              <button
                onClick={() => {
                  playSfx("stamp");
                  setShowLogpageCard(false);
                }}
                className="mt-4 w-full py-3 rounded-2xl border-2 border-[#3A2A18] bg-[#2E7D5B] hover:bg-[#25694c] text-white font-black text-sm tracking-wide shadow-[3px_3px_0_#3A2A18] cursor-pointer flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
              >
                <svg className="size-4 fill-white">
                  <use href="/assets/game/svg/icons-sprite.svg#icn-logpage" />
                </svg>
                <span>收进日志册</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 正在挑战的关卡容器 */}
      {activeLevelId && (
        <div className="relative z-20 my-4 animate-in fade-in">
          {(activeLevelId === "R01" || activeLevelId === "R02") && (
            <PilotLevelA
              levelId={activeLevelId}
              onComplete={handleLevelAComplete}
              onExit={() => {
                playSfx("tap");
                setActiveLevelId(null);
              }}
            />
          )}

          {activeLevelId === "R03" && (
            <PilotLevelB
              onComplete={handleLevelBComplete}
              onExit={() => {
                playSfx("tap");
                setActiveLevelId(null);
              }}
            />
          )}

          {activeLevelId === "R04" && (
            <PilotLevelR04
              onComplete={handleLevelR04Complete}
              onExit={() => {
                playSfx("tap");
                setActiveLevelId(null);
              }}
            />
          )}
        </div>
      )}

      {/* 试点区四张关卡卡面 (未处于关卡挑战中时呈现) */}
      {!activeLevelId && (
        <div className="relative z-10 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
          {PILOT_CARDS.map((card) => {
            const state =
              progress.levels[card.id] || { completed: false, unlocked: false };
            const isUnlocked = state.unlocked;
            const bgImage = getCardBg(card.id, state);
            const status = getCardStatusSprite(card.id, state);

            return (
              <div
                key={card.id}
                className={`relative rounded-2xl border-[3px] border-[#3A2A18] p-4 flex flex-col justify-between transition-all select-none overflow-hidden ${
                  !isUnlocked
                    ? "opacity-60 bg-neutral-200 cursor-not-allowed border-dashed"
                    : "hover:-translate-y-1 cursor-pointer"
                }`}
                style={isUnlocked ? cardStyle : undefined}
                onClick={() => {
                  if (isUnlocked) {
                    handleCardClick(card.id);
                  }
                }}
              >
                {/* 卡片地点背景图层 (silent -> 原图 -> lit) */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <img
                    src={bgImage}
                    alt={card.title}
                    className="w-full h-full object-cover opacity-20 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8EA]/40 via-[#FFF8EA]/80 to-[#FFF8EA]" />
                </div>

                <div className="relative z-10">
                  {/* 状态徽标 (status-sprite.svg) */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black px-2 py-0.5 rounded-lg border border-[#3A2A18] bg-[#F3E3C2]">
                      {card.id}
                    </span>

                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-lg border border-[#3A2A18] flex items-center gap-1 shadow-sm ${status.badgeBg}`}
                    >
                      <svg className="size-3.5 shrink-0">
                        <use
                          href={`/assets/game/svg/status-sprite.svg#${status.symbolId}`}
                        />
                      </svg>
                      <span>{status.label}</span>
                    </span>
                  </div>

                  {/* 字母与锚定物 */}
                  <div className="my-2 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl border-2 border-[#3A2A18] bg-[#F3E3C2] flex items-center justify-center text-3xl font-black text-[#3A2A18] shadow-[2px_2px_0_#3A2A18]">
                      {card.letter}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#3A2A18]">
                        {card.title}
                      </h3>
                      <div className="text-xs font-bold text-[#3A2A18]/70 flex items-center gap-1">
                        <span>{card.phoneme}</span>
                        <span>•</span>
                        <span>{card.anchorWord}</span>
                      </div>
                    </div>
                  </div>

                  {/* 关型标签与说明 */}
                  <div className="mt-2 text-[11px] font-black text-[#2E7D5B]">
                    {card.typeTag}
                  </div>
                  <p className="mt-1 text-xs font-bold text-[#3A2A18]/80 leading-snug line-clamp-2">
                    {card.description}
                  </p>
                </div>

                {/* 卡底状态细节 */}
                <div className="relative z-10 mt-4 pt-3 border-t border-[#3A2A18]/20 flex items-center justify-between">
                  {card.id === "R03" && state.firstIndependentBlend && (
                    <span className="text-[10px] font-black text-[#2E7D5B] flex items-center gap-0.5">
                      <SparklesIcon className="size-3" /> 独立拼装达成
                    </span>
                  )}

                  {card.id === "R04" && state.campVerification && (
                    <span className="text-[10px] font-black flex items-center gap-0.5">
                      {state.campVerification.lit ? (
                        <span className="text-[#FFB340] flex items-center gap-0.5 font-black">
                          <AwardIcon className="size-3 text-[#FFB340]" /> 组徽已点亮
                        </span>
                      ) : (
                        <span className="text-neutral-500 font-bold">
                          组徽待点亮
                        </span>
                      )}
                    </span>
                  )}

                  {!(
                    (card.id === "R03" && state.firstIndependentBlend) ||
                    (card.id === "R04" && state.campVerification)
                  ) && (
                    <span className="text-[10px] font-bold text-[#3A2A18]/60">
                      {card.subtitle}
                    </span>
                  )}

                  <span className="text-xs font-black text-[#3A2A18] flex items-center gap-0.5">
                    {isUnlocked ? "进入 ➔" : "待解锁"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
