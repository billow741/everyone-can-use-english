import { playSfx } from "@renderer/lib/game-audio";
import { GAME_ASSETS } from "@renderer/lib/game-assets";
import React, { useState, useEffect, useRef } from "react";
import {
  PhonicsWord,
  findPhonicsWordSync,
  playPhonicsTokenSound,
  playPhonicsWordSound,
} from "@renderer/lib/open-phonics-service";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { recordEvent, recordWordExposure, LearningResult } from "@renderer/lib/learning-events";
import { updatePilotProbeRuntime } from "@renderer/lib/route-pilot";
import { PhonicsBlendingPanel } from "./phonics-blending-panel";
import { GanganInteractiveMascot } from "./game/gangan-interactive-mascot";
import {
  SparklesIcon,
  Volume2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  RadioIcon,
  XIcon,
  CompassIcon,
} from "lucide-react";

export interface PilotLevelBProps {
  onComplete: (summary: {
    result: "independent" | "assisted";
    firstIndependentBlend: boolean;
    durationMs: number;
  }) => void;
  onExit: () => void;
}

export const PilotLevelB: React.FC<PilotLevelBProps> = ({ onComplete, onExit }) => {
  const startTimeRef = useRef<number>(Date.now());

  // 关卡阶段：intro (开音教学) -> blend (sat 手动拼装) -> ceremony (全岛仪式) -> interlude (s/t 听辨) -> replay (复现练习)
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [phase, setPhase] = useState<"intro" | "blend" | "ceremony" | "interlude" | "replay">("intro");

  // 单词定义：sat
  const satWord: PhonicsWord = findPhonicsWordSync("sat") || {
    word: "sat",
    phase: 2,
    lesson: 1,
    sounds: ["s", "a", "t"],
    translation: "坐（sit 过去式）",
  };

  // 拼读状态
  const [demoUsed, setDemoUsed] = useState<boolean>(false);
  const demoUsedRef = useRef<boolean>(false);
  const [attempt, setAttempt] = useState<number>(1);
  const attemptRef = useRef<number>(1);
  const [scaffold, setScaffold] = useState<number>(0);
  const scaffoldRef = useRef<number>(0);
  const [isDemonstrating, setIsDemonstrating] = useState<boolean>(false);

  // 积木卡访问与跟读记录 (用于两次拼不出或使用示范后的跟读出口)
  const [visitedTokens, setVisitedTokens] = useState<Set<string>>(new Set());
  const visitedTokensRef = useRef<Set<string>>(new Set());
  const [wordReadDone, setWordReadDone] = useState<boolean>(false);

  // 首次独立拼出标记 (铁律：复拼不得覆盖此标记)
  const [firstIndependentBlend, setFirstIndependentBlend] = useState<boolean>(false);
  const firstIndependentBlendRef = useRef<boolean>(false);

  // 中间听辨状态
  const [interludeAttempt, setInterludeAttempt] = useState<number>(1);
  const [interludeFeedback, setInterludeFeedback] = useState<string>("声波冷却校准：听辨目标音是 /s/ 还是 /t/？");

  // 复现练习状态
  const [replayAttempt, setReplayAttempt] = useState<number>(1);
  const [replayDemoUsed, setReplayDemoUsed] = useState<boolean>(false);

  // 初始曝光记录
  useEffect(() => {
    recordWordExposure("sat", "practice");
    updatePilotProbeRuntime({
      currentLevel: "R03",
      stepIndex: 1,
      independentCount: firstIndependentBlendRef.current ? 1 : 0,
      assistedCount: !firstIndependentBlendRef.current ? 0 : 0,
    });
  }, []);

  // 探针同步
  const syncProbe = (step: number) => {
    updatePilotProbeRuntime({
      currentLevel: "R03",
      stepIndex: step,
      independentCount: firstIndependentBlendRef.current ? 1 : 0,
      assistedCount: firstIndependentBlendRef.current ? 0 : 1,
    });
  };

  // 敢敢示范逻辑：依次播放 s、a、t 三个音素音，再播放整词音 sat
  const handleGanganDemo = async () => {
    if (isDemonstrating) return;
    setIsDemonstrating(true);
    demoUsedRef.current = true;
    setDemoUsed(true);
    scaffoldRef.current = Math.max(scaffoldRef.current, 1);
    setScaffold(scaffoldRef.current);

    try {
      await playPhonicsTokenSound("s");
      await new Promise((r) => setTimeout(r, 600));
      await playPhonicsTokenSound("a");
      await new Promise((r) => setTimeout(r, 600));
      await playPhonicsTokenSound("t");
      await new Promise((r) => setTimeout(r, 600));
      await playPhonicsWordSound("sat");
    } finally {
      setIsDemonstrating(false);
    }
  };

  // 手动滑读到达终点回调（仅手动到达触发，自动滑读不触发）
  const handleManualBlendComplete = () => {
    playSfx("word-formed");
    if (phase === "blend") {
      const isIndep = !demoUsedRef.current && attemptRef.current === 1;
      const res: LearningResult = isIndep ? "independent" : "assisted";

      if (isIndep) {
        firstIndependentBlendRef.current = true;
        setFirstIndependentBlend(true);
      }

      const evt = recordEvent({
        phoneme: "t",
        word: "sat",
        skill: "blend",
        mode: "pilot-r03-blend",
        levelId: "R03",
        attempt: attemptRef.current,
        firstTry: isIndep,
        result: res,
        scaffold: scaffoldRef.current,
      });

      if (evt) updatePilotProbeRuntime({ latestEvent: evt });
      syncProbe(2);

      // 进入仪式庆祝
      setTimeout(() => {
        setPhase("ceremony");
      }, 500);
    } else if (phase === "replay") {
      // 复现练习完成
      const isReplayIndep = !replayDemoUsed && replayAttempt === 1;
      const res: LearningResult = isReplayIndep ? "independent" : "assisted";

      const evt = recordEvent({
        phoneme: "t",
        word: "sat",
        skill: "blend",
        mode: "pilot-r03-replay",
        levelId: "R03",
        attempt: replayAttempt,
        firstTry: isReplayIndep,
        result: res,
        scaffold: 0,
      });

      if (evt) updatePilotProbeRuntime({ latestEvent: evt });

      // 完成整关
      completeLevel();
    }
  };

  // 跟读完成出口（二次失败或示范后：点读三张积木各一次＋整词跟读一次 -> assisted 完成）
  const handleAssistedExitComplete = () => {
    playSfx("echo-slot");
    if (phase === "blend") {
      firstIndependentBlendRef.current = false;
      setFirstIndependentBlend(false);

      const evt = recordEvent({
        phoneme: "t",
        word: "sat",
        skill: "blend",
        mode: "pilot-r03-blend",
        levelId: "R03",
        attempt: Math.max(attemptRef.current, 2),
        firstTry: false,
        result: "assisted",
        scaffold: scaffoldRef.current + 2,
      });

      if (evt) updatePilotProbeRuntime({ latestEvent: evt });
      syncProbe(2);

      setPhase("ceremony");
    } else if (phase === "replay") {
      const evt = recordEvent({
        phoneme: "t",
        word: "sat",
        skill: "blend",
        mode: "pilot-r03-replay",
        levelId: "R03",
        attempt: 2,
        firstTry: false,
        result: "assisted",
        scaffold: 1,
      });
      if (evt) updatePilotProbeRuntime({ latestEvent: evt });
      completeLevel();
    }
  };

  // 跟读整词发音
  const handlePlayAssistedWord = async () => {
    await playPhonicsWordSound("sat");
    setWordReadDone(true);
  };

  // 中间听辨交互 (s/t 对比，为 20s 冷却填补认知体验)
  const handleInterludeChoice = (chosen: "s" | "t") => {
    playPhonemeSound(chosen);
    if (chosen === "t") {
      // 答对
      const isIndep = interludeAttempt === 1;
      const evt = recordEvent({
        phoneme: "t",
        skill: "listen",
        mode: "pilot-r03-interlude",
        levelId: "R03",
        attempt: interludeAttempt,
        firstTry: isIndep,
        result: isIndep ? "independent" : "assisted",
        scaffold: 0,
      });
      if (evt) updatePilotProbeRuntime({ latestEvent: evt });

      setInterludeFeedback("校准成功！/t/ 信号清晰。进入 sat 延迟复现练习。");
      setTimeout(() => {
        setPhase("replay");
        syncProbe(4);
      }, 1000);
    } else {
      // 答错
      if (interludeAttempt === 1) {
        setInterludeAttempt(2);
        setInterludeFeedback("信号偏差。请重听目标音 /t/。");
        playPhonemeSound("t");
      } else {
        const evt = recordEvent({
          phoneme: "t",
          skill: "listen",
          mode: "pilot-r03-interlude",
          levelId: "R03",
          attempt: 2,
          firstTry: false,
          result: "assisted",
          scaffold: 1,
        });
        if (evt) updatePilotProbeRuntime({ latestEvent: evt });
        setInterludeFeedback("向导联动：目标音为 /t/。进入 sat 延迟复现练习。");
        setTimeout(() => {
          setPhase("replay");
          syncProbe(4);
        }, 1200);
      }
    }
  };

  // 完成整关
  const completeLevel = () => {
    setIsCompleting(true);
    playSfx("hush-recede");

    const durationMs = Date.now() - startTimeRef.current;
    const isIndep = firstIndependentBlendRef.current;

    // 汇总事件
    const summaryEvt = recordEvent({
      phoneme: "t",
      skill: "review",
      mode: "pilot-r03-summary",
      levelId: "R03",
      attempt: 1,
      firstTry: isIndep,
      result: isIndep ? "independent" : "assisted",
      scaffold: 0,
      durationMs,
    });

    if (summaryEvt) updatePilotProbeRuntime({ latestEvent: summaryEvt });

    setTimeout(() => {
      onComplete({
        result: isIndep ? "independent" : "assisted",
        firstIndependentBlend: isIndep,
        durationMs,
      });
    }, 800);
  };

  // 样式常量
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

  const isAssistedExitReady =
    visitedTokens.has("s") &&
    visitedTokens.has("a") &&
    visitedTokens.has("t") &&
    wordReadDone;

  const sceneAssets = GAME_ASSETS.scenes.tigerTrail;
  const isAssistedOutcome = !firstIndependentBlendRef.current;
  const currentSceneBg = isCompleting
    ? (isAssistedOutcome ? sceneAssets.base : sceneAssets.lit)
    : sceneAssets.silent;

  return (
    <div
      className="p-5 rounded-3xl border-[3px] border-[#3A2A18] max-w-4xl mx-auto my-3 relative overflow-hidden"
      style={containerStyle}
    >
      {/* 关内背景层 (地点图 + 雾层，进入时 silent，完成时淡出雾层并交叉淡入 lit/原图) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-3xl">
        <img
          src={currentSceneBg}
          alt="地点背景"
          className="w-full h-full object-cover transition-all duration-700 opacity-25"
        />
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none ${
            isCompleting ? "opacity-0" : "opacity-35 animate-pulse"
          }`}
          style={{
            backgroundImage: `url(${GAME_ASSETS.fx.hushFog2})`,
          }}
        />
      </div>

      <div className="absolute inset-2 border border-dashed border-[#3A2A18]/30 rounded-2xl pointer-events-none z-0" />

      {/* 关卡顶栏 */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-[#3A2A18]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl text-white border-2 border-[#3A2A18] bg-[#FFB340]">
            R03
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide text-[#3A2A18]">
              R03 虎爪小径 · 手动拼装线
            </h2>
            <div className="text-xs font-bold text-[#3A2A18]/70 flex items-center gap-2">
              <span>开音：/t/</span>
              <span>•</span>
              <span>锚定词：tiger</span>
              <span>•</span>
              <span>合体目标：sat</span>
              <span>•</span>
              <span>
                {phase === "intro"
                  ? "开音简报"
                  : phase === "blend"
                  ? "首词手动合体"
                  : phase === "ceremony"
                  ? "仪式时刻"
                  : phase === "interlude"
                  ? "声波冷却听辨"
                  : "sat 复现练习"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            playSfx("tap");
            onExit();
          }}
          className="px-3 py-1.5 rounded-xl font-bold text-xs border-2 border-[#3A2A18] bg-[#FFF8EA] hover:bg-[#F3E3C2] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <XIcon className="size-3.5" />
          <span>退出任务</span>
        </button>
      </div>

      {/* 阶段 1：开音引导 (Intro) */}
      {phase === "intro" && (
        <div className="relative z-10 mt-6 text-center max-w-lg mx-auto py-4">
          <div className="w-24 h-24 mx-auto rounded-3xl border-[3px] border-[#3A2A18] bg-[#FFB340] flex items-center justify-center text-5xl font-black text-[#3A2A18] shadow-[4px_4px_0_#3A2A18]">
            T
          </div>
          <h3 className="text-xl font-black text-[#3A2A18] mt-4">
            新音素锁定：/t/ · tiger
          </h3>
          <p className="text-xs font-bold text-[#3A2A18]/80 mt-2 leading-relaxed">
            舌尖轻抵上齿龈，短促爆破吐气：/t/。现在，前两关收集的 /s/、/æ/ 与 /t/ 已全部齐聚！
            准备亲手启动滑轨，完成全岛第一次拼读合体。
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => playPhonemeSound("t")}
              className="px-4 py-2.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFF8EA] hover:bg-[#F3E3C2] font-black text-xs text-[#3A2A18] flex items-center gap-1.5 shadow-[2px_2px_0_#3A2A18] cursor-pointer"
            >
              <Volume2Icon className="size-4 text-[#2E7D5B]" />
              <span>听音 /t/</span>
            </button>
            <button
              onClick={() => {
                setPhase("blend");
                syncProbe(1);
              }}
              className="px-6 py-2.5 rounded-xl border-[3px] border-[#3A2A18] bg-[#2E7D5B] hover:bg-[#25694c] text-white font-black text-xs shadow-[3px_3px_0_#3A2A18] flex items-center gap-1 cursor-pointer active:translate-y-0.5"
            >
              <span>启动遗迹合体 (拼 sat)</span>
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* 阶段 2：sat 手动拼装 (PhonicsBlendingPanel manualOnly) */}
      {(phase === "blend" || phase === "replay") && (
        <div className="relative z-10 mt-5">
          {/* 简报与示范条 */}
          <div
            className="p-3 rounded-2xl border-2 border-[#3A2A18] flex flex-wrap items-center justify-between gap-3 mb-4"
            style={{ backgroundColor: "#FFF8EA" }}
          >
            <div className="flex items-center gap-2.5">
              <GanganInteractiveMascot
                size={48}
                pose={demoUsed ? "nod" : "conductor"}
                mood={demoUsed ? "happy" : "conducting"}
              />
              <div>
                <div className="text-xs font-black text-[#2E7D5B] flex items-center gap-1">
                  <RadioIcon className="size-3.5" />
                  <span>
                    {phase === "blend" ? "任务：手动拼读 sat" : "【复现练习】再次手动拼读 sat"}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#3A2A18]/80">
                  {phase === "blend"
                    ? "亲手拖拽滑轨经过全部音素块，合出整词音。完成只认亲手滑轨！"
                    : "注：此题为复现练习，诚实记录为 replay，不覆盖首次独立标记。"}
                </div>
              </div>
            </div>

            <button
              disabled={isDemonstrating}
              onClick={handleGanganDemo}
              className="px-4 py-2 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] hover:bg-[#ffaa22] font-black text-xs text-[#3A2A18] shadow-[2px_2px_0_#3A2A18] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <SparklesIcon className="size-3.5" />
              <span>{isDemonstrating ? "敢敢示范发音中..." : "请敢敢示范 (置 assisted)"}</span>
            </button>
          </div>

          {/* 核心内嵌 PhonicsBlendingPanel (manualOnly 模式) */}
          <div className="bg-[#FFF8EA] rounded-2xl border-2 border-[#3A2A18] p-3 shadow-[3px_3px_0_#3A2A18]">
            <PhonicsBlendingPanel
              word={satWord}
              manualOnly={true}
              onManualBlendComplete={handleManualBlendComplete}
              onTokenVisit={(sound) => {
                visitedTokensRef.current.add(sound);
                setVisitedTokens(new Set(visitedTokensRef.current));
              }}
              showHeader={false}
            />
          </div>

          {/* 辅导出口：两次拼不出来或使用示范后的跟读完成通道 */}
          {(demoUsed || attempt >= 2) && (
            <div
              className="mt-4 p-4 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] shadow-[3px_3px_0_#3A2A18]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#D63C2F] flex items-center gap-1">
                  <AlertCircleIcon className="size-4" />
                  跟读协助通道 (点读全部积木＋跟读整词后可由此过关)
                </span>
                <span className="text-[11px] font-bold text-[#3A2A18]/70">
                  记 assisted 标记，不影响仪式体验
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2">
                {["s", "a", "t"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      playPhonicsTokenSound(t);
                      visitedTokensRef.current.add(t);
                      setVisitedTokens(new Set(visitedTokensRef.current));
                    }}
                    className={`py-2 px-3 rounded-xl border-2 border-[#3A2A18] text-xs font-black flex items-center justify-between cursor-pointer ${
                      visitedTokens.has(t)
                        ? "bg-[#2E7D5B] text-white"
                        : "bg-[#F3E3C2] text-[#3A2A18]"
                    }`}
                  >
                    <span>点读 /{t}/</span>
                    {visitedTokens.has(t) && <CheckCircle2Icon className="size-3.5" />}
                  </button>
                ))}

                <button
                  onClick={handlePlayAssistedWord}
                  className={`py-2 px-3 rounded-xl border-2 border-[#3A2A18] text-xs font-black flex items-center justify-between cursor-pointer ${
                    wordReadDone ? "bg-[#2E7D5B] text-white" : "bg-[#FFB340] text-[#3A2A18]"
                  }`}
                >
                  <span>跟读整词 sat</span>
                  {wordReadDone && <CheckCircle2Icon className="size-3.5" />}
                </button>
              </div>

              <div className="mt-3 text-right">
                <button
                  disabled={!isAssistedExitReady}
                  onClick={handleAssistedExitComplete}
                  className={`px-5 py-2 rounded-xl border-2 border-[#3A2A18] font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    isAssistedExitReady
                      ? "bg-[#2E7D5B] text-white shadow-[2px_2px_0_#3A2A18]"
                      : "opacity-50 cursor-not-allowed bg-neutral-300 text-neutral-600"
                  }`}
                >
                  确认跟读完成 (以协助态推进)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 阶段 3：全岛仪式时刻 (CSS 简版漫画格) */}
      {phase === "ceremony" && (
        <div className="relative z-10 my-6 max-w-xl mx-auto">
          <div
            className="p-6 rounded-3xl border-[4px] border-[#3A2A18] bg-[#FFF8EA] shadow-[6px_6px_0_#3A2A18] text-center"
          >
            <div className="inline-block px-3 py-1 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] text-xs font-black text-[#3A2A18] mb-3">
              ✨ 遗迹共鸣 · 全岛仪式时刻
            </div>

            {/* 漫画格：Pam sat. */}
            <div className="my-4 p-5 rounded-2xl border-[3px] border-[#3A2A18] bg-[#F3E3C2] relative overflow-hidden">
              <div className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded bg-[#3A2A18] text-white">
                SCENE 01
              </div>
              <div className="text-4xl font-black text-[#3A2A18] my-3 tracking-widest font-mono">
                Pam sat.
              </div>
              <div className="text-sm font-black text-[#2E7D5B]">
                声音找回来了：sat
              </div>
            </div>

            <p className="text-xs font-bold text-[#3A2A18]/80 leading-relaxed max-w-md mx-auto">
              三个音素遗迹 /s/、/æ/、/t/ 严丝合缝合体。虎爪小径第一盏信号灯点亮！
              {firstIndependentBlend
                ? "（本次为你亲手独立完成拼装，已记入 firstIndependentBlend 标记）"
                : "（本次由向导跟读协助完成，高光属于你，已记入 assisted 标记）"}
            </p>

            <div className="mt-6">
              <button
                onClick={() => {
                  setPhase("interlude");
                  syncProbe(3);
                }}
                className="px-6 py-3 rounded-2xl border-[3px] border-[#3A2A18] bg-[#2E7D5B] hover:bg-[#25694c] text-white font-black text-xs shadow-[3px_3px_0_#3A2A18] cursor-pointer"
              >
                继续前进：进入 20 秒声波冷却校准
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 阶段 4：中间校准听辨 (20秒延迟插题，s vs t) */}
      {phase === "interlude" && (
        <div className="relative z-10 mt-6 max-w-md mx-auto text-center py-4">
          <div
            className="p-5 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] shadow-[3px_3px_0_#3A2A18]"
          >
            <span className="text-xs font-black text-[#2E7D5B] flex items-center justify-center gap-1 mb-2">
              <CompassIcon className="size-4" />
              声波冷却校准
            </span>
            <p className="text-sm font-bold text-[#3A2A18] mb-4">{interludeFeedback}</p>

            <button
              onClick={() => playPhonemeSound("t")}
              className="px-4 py-2 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] font-black text-xs text-[#3A2A18] flex items-center gap-1.5 mx-auto mb-5 shadow-[2px_2px_0_#3A2A18] cursor-pointer"
            >
              <Volume2Icon className="size-4" />
              <span>播放校准声音</span>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleInterludeChoice("s")}
                className="p-4 rounded-2xl border-[3px] border-[#3A2A18] bg-[#F3E3C2] hover:bg-[#FFB340] font-black text-2xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] cursor-pointer"
              >
                /s/
              </button>
              <button
                onClick={() => handleInterludeChoice("t")}
                className="p-4 rounded-2xl border-[3px] border-[#3A2A18] bg-[#F3E3C2] hover:bg-[#FFB340] font-black text-2xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] cursor-pointer"
              >
                /t/
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
