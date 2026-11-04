import { playSfx } from "@renderer/lib/game-audio";
import { GAME_ASSETS } from "@renderer/lib/game-assets";
import React, { useState, useEffect, useRef } from "react";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import { recordEvent, LearningResult } from "@renderer/lib/learning-events";
import { updatePilotProbeRuntime, PilotLevelId } from "@renderer/lib/route-pilot";
import { GanganInteractiveMascot } from "./game/gangan-interactive-mascot";
import {
  RadioIcon,
  Volume2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  SparklesIcon,
  CompassIcon,
  XIcon,
} from "lucide-react";

export interface PilotLevelAProps {
  levelId: "R01" | "R02";
  onComplete: (summary: {
    result: "independent" | "assisted";
    independentCount: number;
    assistedCount: number;
    firstTryAccuracy: number;
    durationMs: number;
  }) => void;
  onExit: () => void;
}

interface BeaconOption {
  id: string;
  label: string;
  sound: string;
  isTarget: boolean;
  tip: string;
}

interface SignalRoundConfig {
  targetPhoneme: string;
  targetSound: string;
  targetLabel: string;
  anchorWord: string;
  beacons: BeaconOption[];
}

interface DualSequenceConfig {
  targetPhoneme: string;
  sequenceSounds: [string, string];
  sequenceLabels: [string, string];
  options: { label: string; sound: string }[];
}

export const PilotLevelA: React.FC<PilotLevelAProps> = ({
  levelId,
  onComplete,
  onExit,
}) => {
  const startTimeRef = useRef<number>(Date.now());
  const isR01 = levelId === "R01";

  // 轮数与状态管理
  const [phase, setPhase] = useState<"signal" | "sequence" | "completed">("signal");
  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [selectedBeaconIdx, setSelectedBeaconIdx] = useState<number | null>(null);
  const [scansLeft, setScansLeft] = useState<number>(3);
  const [scaffoldLevel, setScaffoldLevel] = useState<number>(0);
  const [attempt, setAttempt] = useState<number>(1);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "neutral" | "success" | "wrong" | "assisted";
    message: string;
  }>({
    type: "neutral",
    message: isR01
      ? "任务：微风信号受损。定向声纹信标，锁定目标声音 /s/。"
      : "任务：苹果灯塔信号微弱。辨析近邻声音 /æ/，锁定目标信标。",
  });
  const [revealedTarget, setRevealedTarget] = useState<boolean>(false);
  const [visitedBeacons, setVisitedBeacons] = useState<Set<number>>(new Set());

  // 双音序列状态 (R02 专有)
  const [seqIdx, setSeqIdx] = useState<number>(0);
  const [seqSelected, setSeqSelected] = useState<string[]>([]);
  const [seqAttempt, setSeqAttempt] = useState<number>(1);
  const [seqScaffold, setSeqScaffold] = useState<number>(0);
  const [seqDemonstrating, setSeqDemonstrating] = useState<boolean>(false);

  // 统计计数
  const independentCountRef = useRef<number>(0);
  const assistedCountRef = useRef<number>(0);

  // R01 配置：3 轮 /s/ 信号定向（对照 /m/、/t/ 远干扰）
  const r01Rounds: SignalRoundConfig[] = [
    {
      targetPhoneme: "s",
      targetSound: "s",
      targetLabel: "S",
      anchorWord: "sun",
      beacons: [
        { id: "b1", label: "S", sound: "s", isTarget: true, tip: "舌尖轻抵齿槽，吐气如微风" },
        { id: "b2", label: "M", sound: "m", isTarget: false, tip: "双唇紧闭，鼻腔哼鸣" },
        { id: "b3", label: "T", sound: "t", isTarget: false, tip: "舌尖爆破，短促有力" },
      ],
    },
    {
      targetPhoneme: "s",
      targetSound: "s",
      targetLabel: "S",
      anchorWord: "sun",
      beacons: [
        { id: "b1", label: "M", sound: "m", isTarget: false, tip: "双唇紧闭，鼻腔哼鸣" },
        { id: "b2", label: "S", sound: "s", isTarget: true, tip: "舌尖轻抵齿槽，吐气如微风" },
        { id: "b3", label: "T", sound: "t", isTarget: false, tip: "舌尖爆破，短促有力" },
      ],
    },
    {
      targetPhoneme: "s",
      targetSound: "s",
      targetLabel: "S",
      anchorWord: "sun",
      beacons: [
        { id: "b1", label: "T", sound: "t", isTarget: false, tip: "舌尖爆破，短促有力" },
        { id: "b2", label: "M", sound: "m", isTarget: false, tip: "双唇紧闭，鼻腔哼鸣" },
        { id: "b3", label: "S", sound: "s", isTarget: true, tip: "舌尖轻抵齿槽，吐气如微风" },
      ],
    },
  ];

  // R02 配置：第一部分 2 轮 /æ/ 近邻对照（对照 /e/、/ɪ/）
  const r02SignalRounds: SignalRoundConfig[] = [
    {
      targetPhoneme: "ae",
      targetSound: "ae",
      targetLabel: "A",
      anchorWord: "apple",
      beacons: [
        { id: "b1", label: "A", sound: "ae", isTarget: true, tip: "张大嘴巴发 /æ/，像咬一口苹果" },
        { id: "b2", label: "E", sound: "e", isTarget: false, tip: "嘴角微扬发 /e/，口型稍扁" },
        { id: "b3", label: "I", sound: "i", isTarget: false, tip: "短促音 /ɪ/，舌面隆起" },
      ],
    },
    {
      targetPhoneme: "ae",
      targetSound: "ae",
      targetLabel: "A",
      anchorWord: "apple",
      beacons: [
        { id: "b1", label: "I", sound: "i", isTarget: false, tip: "短促音 /ɪ/，舌面隆起" },
        { id: "b2", label: "A", sound: "ae", isTarget: true, tip: "张大嘴巴发 /æ/，像咬一口苹果" },
        { id: "b3", label: "E", sound: "e", isTarget: false, tip: "嘴角微扬发 /e/，口型稍扁" },
      ],
    },
  ];

  // R02 配置：第二部分 3 题双音序列
  const r02Sequences: DualSequenceConfig[] = [
    {
      targetPhoneme: "ae",
      sequenceSounds: ["s", "ae"],
      sequenceLabels: ["S", "A"],
      options: [
        { label: "S", sound: "s" },
        { label: "A", sound: "ae" },
      ],
    },
    {
      targetPhoneme: "ae",
      sequenceSounds: ["ae", "s"],
      sequenceLabels: ["A", "S"],
      options: [
        { label: "S", sound: "s" },
        { label: "A", sound: "ae" },
      ],
    },
    {
      targetPhoneme: "ae",
      sequenceSounds: ["s", "ae"],
      sequenceLabels: ["S", "A"],
      options: [
        { label: "S", sound: "s" },
        { label: "A", sound: "ae" },
      ],
    },
  ];

  const currentSignalRounds = isR01 ? r01Rounds : r02SignalRounds;
  const currentSignalConfig = currentSignalRounds[roundIdx] || currentSignalRounds[0];
  const currentSeqConfig = r02Sequences[seqIdx] || r02Sequences[0];

  // 探针同步
  useEffect(() => {
    const totalStep = phase === "signal" ? roundIdx + 1 : currentSignalRounds.length + seqIdx + 1;
    updatePilotProbeRuntime({
      currentLevel: levelId,
      stepIndex: totalStep,
      independentCount: independentCountRef.current,
      assistedCount: assistedCountRef.current,
    });
  }, [levelId, phase, roundIdx, seqIdx]);

  // 信标试听（扫描-1）
  const handleScanBeacon = (idx: number) => {
    playSfx("scan");
    const beacon = currentSignalConfig.beacons[idx];
    if (!beacon) return;

    playPhonemeSound(beacon.sound);
    setVisitedBeacons((prev) => new Set(prev).add(idx));
    setSelectedBeaconIdx(idx);

    if (scansLeft > 0) {
      setScansLeft((prev) => Math.max(0, prev - 1));
    }
  };

  // 播放目标声音提示
  const handlePlayTargetSound = () => {
    playPhonemeSound(currentSignalConfig.targetSound);
  };

  // 确认锁定信号
  const handleLockBeacon = () => {
    if (selectedBeaconIdx === null) return;
    const selected = currentSignalConfig.beacons[selectedBeaconIdx];
    if (!selected) return;

    if (selected.isTarget) {
      playSfx("lock-ok");
      // 答对
      const isIndependent = attempt === 1;
      const res: LearningResult = isIndependent ? "independent" : "assisted";
      if (isIndependent) {
        independentCountRef.current += 1;
      } else {
        assistedCountRef.current += 1;
      }

      const evt = recordEvent({
        phoneme: currentSignalConfig.targetPhoneme,
        skill: "listen",
        mode: isR01 ? "pilot-r01-signal" : "pilot-r02-signal",
        levelId,
        attempt,
        firstTry: isIndependent,
        result: res,
        scaffold: scaffoldLevel,
      });

      if (evt) {
        updatePilotProbeRuntime({ latestEvent: evt });
      }

      setFeedback({
        type: "success",
        message: `信号锁定成功！声纹校准完成：/${currentSignalConfig.targetSound}/。`,
      });

      setTimeout(() => {
        advanceSignalRound();
      }, 1200);
    } else {
      playSfx("lock-soft");
      // 选错
      if (attempt === 1) {
        setAttempt(2);
        // 对比重播：目标音与所选音
        setFeedback({
          type: "wrong",
          message: `声纹不匹配。目标为 /${currentSignalConfig.targetSound}/，你选中了 /${selected.sound}/。请对比辨析后再试。`,
        });
        playPhonemeSound(currentSignalConfig.targetSound);
        setTimeout(() => {
          playPhonemeSound(selected.sound);
        }, 900);

        // 若扫描耗尽，自动充回 1 次并升 scaffold
        if (scansLeft === 0) {
          setScansLeft(1);
          setScaffoldLevel((s) => s + 1);
        }
      } else {
        // 二次错：揭示答案并跟随走完，记 assisted
        assistedCountRef.current += 1;
        setRevealedTarget(true);
        const evt = recordEvent({
          phoneme: currentSignalConfig.targetPhoneme,
          skill: "listen",
          mode: isR01 ? "pilot-r01-signal" : "pilot-r02-signal",
          levelId,
          attempt: 2,
          firstTry: false,
          result: "assisted",
          scaffold: scaffoldLevel + 1,
        });

        if (evt) {
          updatePilotProbeRuntime({ latestEvent: evt });
        }

        setFeedback({
          type: "assisted",
          message: `向导信标联动：目标信号在 ${currentSignalConfig.targetLabel}。已为你自动锁定并同步。`,
        });
        playPhonemeSound(currentSignalConfig.targetSound);

        setTimeout(() => {
          advanceSignalRound();
        }, 1800);
      }
    }
  };

  // 推进信号定向下一轮
  const advanceSignalRound = () => {
    setSelectedBeaconIdx(null);
    setScansLeft(3);
    setScaffoldLevel(0);
    setAttempt(1);
    setRevealedTarget(false);
    setVisitedBeacons(new Set());

    if (roundIdx + 1 < currentSignalRounds.length) {
      setRoundIdx((r) => r + 1);
      setFeedback({
        type: "neutral",
        message: `进入第 ${roundIdx + 2} 轮信标校准。请重新试听定向。`,
      });
    } else {
      // 信号定向阶段完成
      if (!isR01) {
        // R02 进入第二阶段：双音序列
        setPhase("sequence");
        setFeedback({
          type: "neutral",
          message: "信号定向完毕！进入双音序列合成时刻：请按听到的顺序点击声纹卡。",
        });
      } else {
        finishLevel();
      }
    }
  };

  // 播放双音序列
  const handlePlaySequenceAudio = () => {
    const [s1, s2] = currentSeqConfig.sequenceSounds;
    playPhonemeSound(s1);
    setTimeout(() => {
      playPhonemeSound(s2);
    }, 700);
  };

  // 点击双音序列卡片
  const handleSelectSeqCard = (sound: string) => {
    if (seqDemonstrating || seqSelected.length >= 2) return;
    playPhonemeSound(sound);
    const next = [...seqSelected, sound];
    setSeqSelected(next);

    if (next.length === 2) {
      // 判定顺序
      const [t1, t2] = currentSeqConfig.sequenceSounds;
      const isCorrect = next[0] === t1 && next[1] === t2;

      if (isCorrect) {
        const isIndep = seqAttempt === 1;
        if (isIndep) {
          independentCountRef.current += 1;
        } else {
          assistedCountRef.current += 1;
        }

        const evt = recordEvent({
          phoneme: currentSeqConfig.targetPhoneme,
          skill: "listen",
          mode: "pilot-r02-sequence",
          levelId: "R02",
          attempt: seqAttempt,
          firstTry: isIndep,
          result: isIndep ? "independent" : "assisted",
          scaffold: seqScaffold,
        });
        if (evt) updatePilotProbeRuntime({ latestEvent: evt });

        setFeedback({
          type: "success",
          message: `双音序列匹配正确！/${t1}/ ➔ /${t2}/ 畅通链接。`,
        });

        setTimeout(() => {
          advanceSequenceQuestion();
        }, 1200);
      } else {
        // 答错
        if (seqAttempt === 1) {
          setSeqAttempt(2);
          setFeedback({
            type: "wrong",
            message: "双音顺序不一致。两音分开重播，请再次辨析复现顺序。",
          });
          // 分开重播
          handlePlaySequenceAudio();
          setTimeout(() => {
            setSeqSelected([]);
          }, 800);
        } else {
          // 二次错：向导演示并记 assisted
          assistedCountRef.current += 1;
          setSeqDemonstrating(true);
          const evt = recordEvent({
            phoneme: currentSeqConfig.targetPhoneme,
            skill: "listen",
            mode: "pilot-r02-sequence",
            levelId: "R02",
            attempt: 2,
            firstTry: false,
            result: "assisted",
            scaffold: seqScaffold + 1,
          });
          if (evt) updatePilotProbeRuntime({ latestEvent: evt });

          setFeedback({
            type: "assisted",
            message: `演示复现：正确顺序为 /${t1}/ ➔ /${t2}/。已为你同步。`,
          });
          setSeqSelected([t1, t2]);
          handlePlaySequenceAudio();

          setTimeout(() => {
            setSeqDemonstrating(false);
            advanceSequenceQuestion();
          }, 2000);
        }
      }
    }
  };

  // 推进双音序列下一题
  const advanceSequenceQuestion = () => {
    setSeqSelected([]);
    setSeqAttempt(1);
    setSeqScaffold(0);

    if (seqIdx + 1 < r02Sequences.length) {
      setSeqIdx((s) => s + 1);
      setFeedback({
        type: "neutral",
        message: `双音序列第 ${seqIdx + 2} 题。请听音复现两音顺序。`,
      });
    } else {
      finishLevel();
    }
  };

  // 关卡结束汇总
  const finishLevel = () => {
    setIsCompleting(true);
    setPhase("completed");
    playSfx("hush-recede");
    const durationMs = Date.now() - startTimeRef.current;
    const indep = independentCountRef.current;
    const assist = assistedCountRef.current;
    const total = indep + assist;
    const accuracy = total > 0 ? indep / total : 1;
    const levelResult: "independent" | "assisted" = assist === 0 ? "independent" : "assisted";

    // 汇总事件
    const summaryEvt = recordEvent({
      phoneme: isR01 ? "s" : "ae",
      skill: "review",
      mode: isR01 ? "pilot-r01-summary" : "pilot-r02-summary",
      levelId,
      attempt: 1,
      firstTry: assist === 0,
      result: levelResult,
      scaffold: 0,
      durationMs,
    });

    if (summaryEvt) {
      updatePilotProbeRuntime({ latestEvent: summaryEvt });
    }

    setTimeout(() => {
      onComplete({
        result: levelResult,
        independentCount: indep,
        assistedCount: assist,
        firstTryAccuracy: accuracy,
        durationMs,
      });
    }, 800);
  };

  // 探险漫画风通用视觉令牌常量
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

  const sceneAssets = isR01 ? GAME_ASSETS.scenes.breezeDock : GAME_ASSETS.scenes.appleLighthouse;
  const isAssistedOutcome = assistedCountRef.current > 0;
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

      {/* 虚线内框 */}
      <div className="absolute inset-2 border border-dashed border-[#3A2A18]/30 rounded-2xl pointer-events-none z-0" />

      {/* 关卡顶栏：简报信息与退出 */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-[#3A2A18]/20">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl text-white border-2 border-[#3A2A18]"
            style={{ backgroundColor: isR01 ? "#2E7D5B" : "#FFB340" }}
          >
            {levelId}
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide text-[#3A2A18]">
              {isR01 ? "R01 微风码头 · 信号定向" : "R02 苹果灯塔 · 定向与双音序列"}
            </h2>
            <div className="text-xs font-bold text-[#3A2A18]/70 flex items-center gap-2">
              <span>目标音素：/{currentSignalConfig.targetSound}/</span>
              <span>•</span>
              <span>锚定词：{currentSignalConfig.anchorWord}</span>
              <span>•</span>
              <span>
                {phase === "signal"
                  ? `信标定向 轮次 ${roundIdx + 1}/${currentSignalRounds.length}`
                  : `双音序列 题序 ${seqIdx + 1}/${r02Sequences.length}`}
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

      {/* 向导敢敢任务简报栏 */}
      <div
        className="relative z-10 mt-4 p-3.5 rounded-2xl border-2 border-[#3A2A18] flex items-center gap-3.5"
        style={{ backgroundColor: "#FFF8EA" }}
      >
        <GanganInteractiveMascot
          size={58}
          pose={feedback.type === "success" ? "celebrate" : feedback.type === "wrong" ? "nod" : "idle"}
          mood={feedback.type === "success" ? "happy" : feedback.type === "wrong" ? "confused" : "conducting"}
        />
        <div className="flex-1">
          <div className="text-xs font-black tracking-wider uppercase text-[#2E7D5B] flex items-center gap-1">
            <RadioIcon className="size-3.5" />
            <span>敢敢向导简报</span>
          </div>
          <p className="text-sm font-bold text-[#3A2A18] mt-0.5">{feedback.message}</p>
        </div>
        <button
          onClick={phase === "signal" ? handlePlayTargetSound : handlePlaySequenceAudio}
          className="px-3 py-2 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] hover:bg-[#ffaa22] font-black text-xs text-[#3A2A18] flex items-center gap-1.5 shadow-[2px_2px_0_#3A2A18] cursor-pointer"
        >
          <Volume2Icon className="size-4" />
          <span>{phase === "signal" ? "试听目标音" : "重播双音序列"}</span>
        </button>
      </div>

      {/* 关卡主交互区 */}
      {phase === "signal" && (
        <div className="relative z-10 mt-5">
          {/* 扫描余量指示 */}
          <div className="flex items-center justify-between px-2 mb-3">
            <span className="text-xs font-black text-[#3A2A18] flex items-center gap-1">
              <CompassIcon className="size-3.5 text-[#2E7D5B]" />
              信标声纹扫描探测
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#3A2A18]/80">剩余扫描次数：</span>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border border-[#3A2A18] ${
                    i < scansLeft ? "bg-[#2E7D5B]" : "bg-[#3A2A18]/20"
                  }`}
                />
              ))}
              {scaffoldLevel > 0 && (
                <span className="text-[11px] font-black text-[#D63C2F] ml-1">
                  (脚手架已充能 +{scaffoldLevel})
                </span>
              )}
            </div>
          </div>

          {/* 三座信标阵列 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentSignalConfig.beacons.map((b, idx) => {
              const isSelected = selectedBeaconIdx === idx;
              const isVisited = visitedBeacons.has(idx);
              const isTargetRevealed = revealedTarget && b.isTarget;

              return (
                <div
                  key={b.id}
                  onClick={() => handleScanBeacon(idx)}
                  className={`relative p-4 rounded-2xl border-[3px] border-[#3A2A18] cursor-pointer transition-all select-none text-center ${
                    isSelected
                      ? "ring-4 ring-[#2E7D5B] scale-102"
                      : isTargetRevealed
                      ? "ring-4 ring-[#FFB340] animate-pulse"
                      : "hover:-translate-y-0.5"
                  }`}
                  style={cardStyle}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md border border-[#3A2A18] bg-[#F3E3C2]">
                      信标 0{idx + 1}
                    </span>
                    {isVisited && (
                      <span className="text-[10px] font-bold text-[#2E7D5B] flex items-center gap-0.5">
                        <CheckCircle2Icon className="size-3" /> 已扫描
                      </span>
                    )}
                  </div>

                  <div className="my-3 flex justify-center items-center">
                    <div className="w-16 h-16 rounded-2xl border-2 border-[#3A2A18] bg-[#F3E3C2] flex items-center justify-center text-3xl font-black text-[#3A2A18] shadow-[2px_2px_0_#3A2A18]">
                      {b.label}
                    </div>
                  </div>

                  <p className="text-xs font-bold text-[#3A2A18]/80 line-clamp-1">{b.tip}</p>

                  <div className="mt-3 pt-2 border-t border-[#3A2A18]/20 flex items-center justify-center gap-1.5 text-xs font-black text-[#3A2A18]">
                    <Volume2Icon className="size-3.5 text-[#2E7D5B]" />
                    <span>点此试听声纹</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 锁定操作条 */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              disabled={selectedBeaconIdx === null}
              onClick={handleLockBeacon}
              className={`px-8 py-3 rounded-2xl border-[3px] border-[#3A2A18] font-black text-sm tracking-wider uppercase transition-all shadow-[4px_4px_0_#3A2A18] cursor-pointer ${
                selectedBeaconIdx === null
                  ? "opacity-50 cursor-not-allowed bg-neutral-300 text-neutral-600"
                  : "bg-[#2E7D5B] hover:bg-[#25694c] text-white active:translate-x-0.5 active:translate-y-0.5"
              }`}
            >
              锁定此信标信号 (确认)
            </button>
          </div>
        </div>
      )}

      {/* 双音序列交互区 (R02 专有) */}
      {phase === "sequence" && (
        <div className="relative z-10 mt-5">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 rounded-xl border border-[#3A2A18] bg-[#FFF8EA] text-xs font-black text-[#3A2A18]">
              复现顺序槽位 (已选 {seqSelected.length}/2)
            </span>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div
                className="w-20 h-20 rounded-2xl border-[3px] border-[#3A2A18] flex items-center justify-center text-3xl font-black shadow-[3px_3px_0_#3A2A18]"
                style={{ backgroundColor: seqSelected[0] ? "#FFB340" : "#FFF8EA" }}
              >
                {seqSelected[0] ? seqSelected[0].toUpperCase() : "?"}
              </div>
              <ArrowRightIcon className="size-6 text-[#3A2A18]" />
              <div
                className="w-20 h-20 rounded-2xl border-[3px] border-[#3A2A18] flex items-center justify-center text-3xl font-black shadow-[3px_3px_0_#3A2A18]"
                style={{ backgroundColor: seqSelected[1] ? "#FFB340" : "#FFF8EA" }}
              >
                {seqSelected[1] ? seqSelected[1].toUpperCase() : "?"}
              </div>
            </div>
          </div>

          {/* 可选声纹卡片 */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {currentSeqConfig.options.map((opt, i) => (
              <button
                key={i}
                disabled={seqDemonstrating || seqSelected.length >= 2}
                onClick={() => handleSelectSeqCard(opt.sound)}
                className="p-4 rounded-2xl border-[3px] border-[#3A2A18] bg-[#FFF8EA] hover:bg-[#F3E3C2] active:translate-y-0.5 font-black text-2xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
              >
                <span>{opt.label}</span>
                <span className="text-xs font-bold text-[#3A2A18]/60">/{opt.sound}/</span>
              </button>
            ))}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setSeqSelected([])}
              className="px-3 py-1.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFF8EA] text-xs font-bold text-[#3A2A18] hover:bg-[#F3E3C2] transition-colors cursor-pointer"
            >
              清空重置选择
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
