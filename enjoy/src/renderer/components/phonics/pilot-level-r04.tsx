import { playSfx, startBgm } from "@renderer/lib/game-audio";
import { GAME_ASSETS } from "@renderer/lib/game-assets";
import React, { useState, useEffect, useRef } from "react";
import {
  PhonicsWord,
  findPhonicsWordSync,
  playPhonicsTokenSound,
  playPhonicsWordSound,
} from "@renderer/lib/open-phonics-service";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";
import {
  recordEvent,
  recordWordExposure,
  recordWordVerifyResult,
  getUnseenWords,
  LearningResult,
} from "@renderer/lib/learning-events";
import {
  updatePilotProbeRuntime,
  markPilotLevelCompleted,
  CampVerificationResult,
} from "@renderer/lib/route-pilot";
import { PhonicsBlendingPanel } from "./phonics-blending-panel";
import { GanganInteractiveMascot } from "./game/gangan-interactive-mascot";
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  Volume2Icon,
  SparklesIcon,
  RadioIcon,
  XIcon,
  CompassIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  AwardIcon,
} from "lucide-react";

export interface PilotLevelR04Props {
  onComplete: (summary: {
    cleared: boolean;
    lit: boolean;
    accuracy: number;
    reviewList: string[];
    durationMs: number;
  }) => void;
  onExit: () => void;
}

function getWordObj(w: string): PhonicsWord {
  const sync = findPhonicsWordSync(w);
  if (sync) return sync;
  const translations: Record<string, string> = {
    sat: "坐（sit 过去式）",
    pat: "轻拍",
    tap: "轻敲",
    sap: "精力/消耗",
    mat: "垫子",
    sit: "坐下",
  };
  return {
    word: w,
    phase: 2,
    lesson: 1,
    sounds: w.split(""),
    translation: translations[w] || "",
  };
}

export const PilotLevelR04: React.FC<PilotLevelR04Props> = ({ onComplete, onExit }) => {
  const startTimeRef = useRef<number>(Date.now());

  // 阶段：intro (开音P) -> queue (队列拼读 Q=3) -> verify (迁移验证 1 题) -> camp (营地校验 4 项) -> summary (结算)
  const [isCompleting, setIsCompleting] = useState<boolean>(false);

  // R04 关内常驻营地 BGM (56BPM 营火氛围)
  useEffect(() => {
    startBgm("camp");
  }, []);

  const [phase, setPhase] = useState<"intro" | "queue" | "verify" | "camp" | "summary">("intro");

  // 队列词池 Q=3 计算
  const [queueWords, setQueueWords] = useState<string[]>(["sat", "pat", "tap"]);
  const [queueIdx, setQueueIdx] = useState<number>(0);
  const [queueDemoUsed, setQueueDemoUsed] = useState<boolean>(false);
  const queueDemoUsedRef = useRef<boolean>(false);
  const [queueAttempt, setQueueAttempt] = useState<number>(1);
  const [queueVisitedTokens, setQueueVisitedTokens] = useState<Set<string>>(new Set());
  const [queueWordReadDone, setQueueWordReadDone] = useState<boolean>(false);
  const [isDemonstrating, setIsDemonstrating] = useState<boolean>(false);

  // 迁移验证词与状态
  const [migrationWord, setMigrationWord] = useState<string>("");
  const [verifyOptions, setVerifyOptions] = useState<string[]>([]);
  const [verifyAttempt, setVerifyAttempt] = useState<number>(1);
  const [migrationPassed, setMigrationPassed] = useState<boolean>(false);
  const [verifyFeedback, setVerifyFeedback] = useState<string>("任务：听整词发音，从 3 个声纹卡中选出正确的单词。");
  const [verifyRevealed, setVerifyRevealed] = useState<boolean>(false);

  // 营地校验 4 项状态
  // 1: /s/ vs /m/ 听辨
  // 2: /æ/ vs /e/ 听辨
  // 3: 拼一个 -at 词 (pat)
  // 4: 迁移词点读
  const [campStep, setCampStep] = useState<number>(1);
  const [campFirstTryCount, setCampFirstTryCount] = useState<number>(0);
  const [campReviewList, setCampReviewList] = useState<string[]>([]);
  const [campStepAttempt, setCampStepAttempt] = useState<number>(1);
  const [campFeedback, setCampFeedback] = useState<string>("营地校验 01：听辨 /s/ vs /m/。");
  const [campBlendVisited, setCampBlendVisited] = useState<Set<string>>(new Set());
  const [campBlendWordDone, setCampBlendWordDone] = useState<boolean>(false);
  const [campBlendDemoUsed, setCampBlendDemoUsed] = useState<boolean>(false);
  const campBlendDoneRef = useRef<boolean>(false);

  // 初始化队列与迁移词
  useEffect(() => {
    // 依据工单：[sat 热身] + [pat、tap 中未练过的优先]
    const candidates = ["pat", "tap"];
    const unseen = getUnseenWords(candidates);
    let picked: string[] = [];

    if (unseen.length === 2) {
      picked = ["pat", "tap"];
    } else if (unseen.length === 1) {
      const other = candidates.find((c) => c !== unseen[0]) || "sap";
      picked = [unseen[0], other];
    } else {
      // 全练过则任选其二
      picked = ["pat", "tap"];
    }

    const q = ["sat", picked[0], picked[1]];
    setQueueWords(q);

    // 记录热身词 sat 曝光
    recordWordExposure(q[0], "practice");
  }, []);

  const currentQueueWord = queueWords[queueIdx] || "sat";

  // 探针同步
  useEffect(() => {
    let stepNumber = 1;
    if (phase === "queue") stepNumber = 1 + queueIdx;
    else if (phase === "verify") stepNumber = 4;
    else if (phase === "camp") stepNumber = 4 + campStep;
    else if (phase === "summary") stepNumber = 9;

    updatePilotProbeRuntime({
      currentLevel: "R04",
      stepIndex: stepNumber,
      independentCount: campFirstTryCount,
      assistedCount: campReviewList.length,
    });
  }, [phase, queueIdx, campStep, campFirstTryCount, campReviewList.length]);

  // 队列词示范
  const handleQueueDemo = async () => {
    if (isDemonstrating) return;
    setIsDemonstrating(true);
    queueDemoUsedRef.current = true;
    setQueueDemoUsed(true);

    try {
      const sounds = currentQueueWord.split("");
      for (const s of sounds) {
        await playPhonicsTokenSound(s);
        await new Promise((r) => setTimeout(r, 600));
      }
      await playPhonicsWordSound(currentQueueWord);
    } finally {
      setIsDemonstrating(false);
    }
  };

  // 队列词拼读完成
  const handleQueueBlendComplete = () => {
    const isIndep = !queueDemoUsedRef.current && queueAttempt === 1;
    const res: LearningResult = isIndep ? "independent" : "assisted";

    const evt = recordEvent({
      phoneme: "p",
      word: currentQueueWord,
      skill: "blend",
      mode: "pilot-r04-queue",
      levelId: "R04",
      attempt: queueAttempt,
      firstTry: isIndep,
      result: res,
      scaffold: queueDemoUsedRef.current ? 1 : 0,
    });

    if (evt) updatePilotProbeRuntime({ latestEvent: evt });

    advanceQueue();
  };

  // 队列词跟读完成出口
  const handleQueueAssistedExit = () => {
    const evt = recordEvent({
      phoneme: "p",
      word: currentQueueWord,
      skill: "blend",
      mode: "pilot-r04-queue",
      levelId: "R04",
      attempt: Math.max(queueAttempt, 2),
      firstTry: false,
      result: "assisted",
      scaffold: 2,
    });

    if (evt) updatePilotProbeRuntime({ latestEvent: evt });
    advanceQueue();
  };

  // 推进队列
  const advanceQueue = () => {
    setQueueDemoUsed(false);
    queueDemoUsedRef.current = false;
    setQueueAttempt(1);
    setQueueVisitedTokens(new Set());
    setQueueWordReadDone(false);

    if (queueIdx + 1 < queueWords.length) {
      const nextIdx = queueIdx + 1;
      setQueueIdx(nextIdx);
      recordWordExposure(queueWords[nextIdx], "practice");
    } else {
      // 队列 Q=3 全部完成，进入迁移验证：延迟至此时选取迁移词，确保排除队列已练词
      const unseenPool = getUnseenWords(["sat", "pat", "sap", "tap"]);
      const confusionPool = ["mat", "sit"];
      const migrationWord =
        unseenPool[0] || confusionPool.find((w) => !queueWords.includes(w)) || "mat";
      setMigrationWord(migrationWord);

      // 构造三选一选项
      const distractorPool = ["sat", "pat", "sap", "tap", "mat", "sit"].filter(
        (w) => w !== migrationWord
      );
      const opts = [
        migrationWord,
        distractorPool[0] || "sat",
        distractorPool[1] || "pat",
      ].sort(() => Math.random() - 0.5);
      setVerifyOptions(opts);

      setPhase("verify");
      recordWordExposure(migrationWord, "verify");
      // 自动播放迁移词整词发音
      setTimeout(() => {
        playPhonicsWordSound(migrationWord);
      }, 500);
    }
  };

  // 迁移验证听音选择
  const handleVerifyChoice = (chosen: string) => {
    playPhonicsWordSound(chosen);

    if (chosen === migrationWord) {
      // 选对
      const isIndep = verifyAttempt === 1;
      const res: LearningResult = isIndep ? "independent" : "assisted";
      setMigrationPassed(true);
      recordWordVerifyResult(migrationWord, isIndep);

      const evt = recordEvent({
        phoneme: "p",
        word: migrationWord,
        skill: "verify" as any,
        mode: "pilot-r04-verify",
        levelId: "R04",
        attempt: verifyAttempt,
        firstTry: isIndep,
        result: res,
        scaffold: isIndep ? 0 : 1,
      });

      if (evt) updatePilotProbeRuntime({ latestEvent: evt });

      setVerifyFeedback(`信号锁定！迁移词 ${migrationWord} 验证通过。`);
      setTimeout(() => {
        setPhase("camp");
      }, 1200);
    } else {
      // 选错
      if (verifyAttempt === 1) {
        setVerifyAttempt(2);
        setVerifyFeedback("声纹不匹配，重试一次！请再听一次整词发音。");
        playPhonicsWordSound(migrationWord);
      } else {
        // 二次错：揭示答案，记 assisted
        setMigrationPassed(false);
        setVerifyRevealed(true);
        recordWordVerifyResult(migrationWord, false);

        const evt = recordEvent({
          phoneme: "p",
          word: migrationWord,
          skill: "verify" as any,
          mode: "pilot-r04-verify",
          levelId: "R04",
          attempt: 2,
          firstTry: false,
          result: "assisted",
          scaffold: 2,
        });

        if (evt) updatePilotProbeRuntime({ latestEvent: evt });

        setVerifyFeedback(`向导校准：正确单词为 ${migrationWord}。已为你揭示并同步。`);
        setTimeout(() => {
          setPhase("camp");
        }, 1800);
      }
    }
  };

  // 营地校验 4 项处理
  // Step 1: /s/ vs /m/
  const handleCampStep1Choice = (chosen: "s" | "m") => {
    playPhonemeSound(chosen);
    if (chosen === "s") {
      const isIndep = campStepAttempt === 1;
      if (isIndep) setCampFirstTryCount((c) => c + 1);
      else setCampReviewList((l) => [...l, "/s/ 听辨"]);

      const evt = recordEvent({
        phoneme: "s",
        skill: "listen",
        mode: "pilot-r04-camp-s",
        levelId: "R04",
        attempt: campStepAttempt,
        firstTry: isIndep,
        result: isIndep ? "independent" : "assisted",
        scaffold: isIndep ? 0 : 1,
      });
      if (evt) updatePilotProbeRuntime({ latestEvent: evt });

      setCampFeedback("校验 01 通过！进入校验 02：听辨 /æ/ vs /e/。");
      setTimeout(() => {
        setCampStep(2);
        setCampStepAttempt(1);
      }, 1000);
    } else {
      if (campStepAttempt === 1) {
        setCampStepAttempt(2);
        setCampFeedback("声纹偏差，请重听目标音 /s/。");
        playPhonemeSound("s");
      } else {
        setCampReviewList((l) => [...l, "/s/ 听辨"]);
        const evt = recordEvent({
          phoneme: "s",
          skill: "listen",
          mode: "pilot-r04-camp-s",
          levelId: "R04",
          attempt: 2,
          firstTry: false,
          result: "assisted",
          scaffold: 2,
        });
        if (evt) updatePilotProbeRuntime({ latestEvent: evt });

        setCampFeedback("向导校准：目标音为 /s/。进入校验 02。");
        setTimeout(() => {
          setCampStep(2);
          setCampStepAttempt(1);
        }, 1200);
      }
    }
  };

  // Step 2: /æ/ vs /e/
  const handleCampStep2Choice = (chosen: "ae" | "e") => {
    playPhonemeSound(chosen);
    if (chosen === "ae") {
      const isIndep = campStepAttempt === 1;
      if (isIndep) setCampFirstTryCount((c) => c + 1);
      else setCampReviewList((l) => [...l, "/æ/ 听辨"]);

      const evt = recordEvent({
        phoneme: "ae",
        skill: "listen",
        mode: "pilot-r04-camp-ae",
        levelId: "R04",
        attempt: campStepAttempt,
        firstTry: isIndep,
        result: isIndep ? "independent" : "assisted",
        scaffold: isIndep ? 0 : 1,
      });
      if (evt) updatePilotProbeRuntime({ latestEvent: evt });

      setCampFeedback("校验 02 通过！进入校验 03：拼读 -at 词 pat。");
      setTimeout(() => {
        campBlendDoneRef.current = false;
        setCampStep(3);
        setCampStepAttempt(1);
        recordWordExposure("pat", "practice");
      }, 1000);
    } else {
      if (campStepAttempt === 1) {
        setCampStepAttempt(2);
        setCampFeedback("声纹偏差，请重听目标音 /æ/。");
        playPhonemeSound("ae");
      } else {
        setCampReviewList((l) => [...l, "/æ/ 听辨"]);
        const evt = recordEvent({
          phoneme: "ae",
          skill: "listen",
          mode: "pilot-r04-camp-ae",
          levelId: "R04",
          attempt: 2,
          firstTry: false,
          result: "assisted",
          scaffold: 2,
        });
        if (evt) updatePilotProbeRuntime({ latestEvent: evt });

        setCampFeedback("向导校准：目标音为 /æ/。进入校验 03。");
        setTimeout(() => {
          campBlendDoneRef.current = false;
          setCampStep(3);
          setCampStepAttempt(1);
          recordWordExposure("pat", "practice");
        }, 1200);
      }
    }
  };

  // Step 3: 拼读 pat
  const handleCampStep3BlendComplete = (isAssistedExit: boolean = false) => {
    if (campBlendDoneRef.current) return;
    campBlendDoneRef.current = true;

    const isIndep = !campBlendDemoUsed && !isAssistedExit && campStepAttempt === 1;
    if (isIndep) setCampFirstTryCount((c) => c + 1);
    else setCampReviewList((l) => [...l, "pat 拼读"]);

    const evt = recordEvent({
      phoneme: "p",
      word: "pat",
      skill: "blend",
      mode: "pilot-r04-camp-blend",
      levelId: "R04",
      attempt: campStepAttempt,
      firstTry: isIndep,
      result: isIndep ? "independent" : "assisted",
      scaffold: isIndep ? 0 : 1,
    });
    if (evt) updatePilotProbeRuntime({ latestEvent: evt });

    setCampFeedback(`校验 03 通过！进入校验 04：迁移词 ${migrationWord} 点读。`);
    setTimeout(() => {
      setCampStep(4);
      setCampStepAttempt(1);
    }, 1000);
  };

  // Step 4: 迁移词点读
  const handleCampStep4Finish = () => {
    // 迁移词点读完成
    setCampFirstTryCount((c) => c + 1);

    const evt = recordEvent({
      phoneme: "p",
      word: migrationWord,
      skill: "listen",
      mode: "pilot-r04-camp-read",
      levelId: "R04",
      attempt: 1,
      firstTry: true,
      result: "independent",
      scaffold: 0,
    });
    if (evt) updatePilotProbeRuntime({ latestEvent: evt });

    finishCampVerification();
  };

  // 营地校验结束与两线结算
  const finishCampVerification = () => {
    setIsCompleting(true);
    playSfx("hush-recede");
    const durationMs = Date.now() - startTimeRef.current;
    // 过关线：4 项全走完（含 assisted）= 过关
    const cleared = true;

    // 点亮线：4 项首次正确率 ≥ 70% (即至少 3/4=75%) 且迁移项答对
    const finalAccuracy = (campFirstTryCount + 1) / 4; // 含第4项
    const lit = finalAccuracy >= 0.7 && migrationPassed;

    const fullReviewList = [...campReviewList];
    if (!migrationPassed && !fullReviewList.includes(`${migrationWord} 迁移验证`)) {
      fullReviewList.push(`${migrationWord} 迁移验证`);
    }

    const campResult: CampVerificationResult = {
      cleared,
      lit,
      accuracy: finalAccuracy,
      reviewList: fullReviewList,
    };

    // 汇总事件
    const summaryEvt = recordEvent({
      phoneme: "p",
      skill: "review",
      mode: "pilot-r04-summary",
      levelId: "R04",
      attempt: 1,
      firstTry: lit,
      result: lit ? "independent" : "assisted",
      scaffold: 0,
      durationMs,
    });

    if (summaryEvt) {
      updatePilotProbeRuntime({
        latestEvent: summaryEvt,
        campResult,
      });
    }

    markPilotLevelCompleted("R04", {
      completed: true,
      result: lit ? "independent" : "assisted",
      campVerification: campResult,
      durationMs,
    });

    setPhase("summary");
    if (lit) {
      playSfx("badge-lit");
    } else {
      playSfx("stamp");
    }

    onComplete({
      cleared,
      lit,
      accuracy: finalAccuracy,
      reviewList: fullReviewList,
      durationMs,
    });
  };

  // 样式
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

  const sceneAssets = GAME_ASSETS.scenes.pigCamp;
  const currentSceneBg = isCompleting
    ? sceneAssets.lit
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

      {/* 顶栏 */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-[#3A2A18]/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl text-white border-2 border-[#3A2A18] bg-[#2E7D5B]">
            R04
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide text-[#3A2A18]">
              R04 猪鼻营地 · 组末校验站
            </h2>
            <div className="text-xs font-bold text-[#3A2A18]/70 flex items-center gap-2">
              <span>开音：/p/</span>
              <span>•</span>
              <span>锚定词：pig</span>
              <span>•</span>
              <span>
                {phase === "intro"
                  ? "开音简报"
                  : phase === "queue"
                  ? `队列拼装 ${queueIdx + 1}/3 (${currentQueueWord})`
                  : phase === "verify"
                  ? `迁移验证 (听音三选一)`
                  : phase === "camp"
                  ? `营地校验 项 0${campStep}/04`
                  : "校验两线结算"}
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

      {/* 阶段 1：开音引导 */}
      {phase === "intro" && (
        <div className="relative z-10 mt-6 text-center max-w-lg mx-auto py-4">
          <div className="w-24 h-24 mx-auto rounded-3xl border-[3px] border-[#3A2A18] bg-[#2E7D5B] flex items-center justify-center text-5xl font-black text-white shadow-[4px_4px_0_#3A2A18]">
            P
          </div>
          <h3 className="text-xl font-black text-[#3A2A18] mt-4">
            新音素锁定：/p/ · pig
          </h3>
          <p className="text-xs font-bold text-[#3A2A18]/80 mt-2 leading-relaxed">
            双唇紧闭，随后气流瞬间冲出：/p/。至此 G1 四音（s, a, t, p）全部齐聚！
            接下来依次完成：队列 Q=3 手动拼读、盲音迁移验证、以及组末营地校验。
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => playPhonemeSound("p")}
              className="px-4 py-2.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFF8EA] hover:bg-[#F3E3C2] font-black text-xs text-[#3A2A18] flex items-center gap-1.5 shadow-[2px_2px_0_#3A2A18] cursor-pointer"
            >
              <Volume2Icon className="size-4 text-[#2E7D5B]" />
              <span>听音 /p/</span>
            </button>
            <button
              onClick={() => setPhase("queue")}
              className="px-6 py-2.5 rounded-xl border-[3px] border-[#3A2A18] bg-[#2E7D5B] hover:bg-[#25694c] text-white font-black text-xs shadow-[3px_3px_0_#3A2A18] flex items-center gap-1 cursor-pointer active:translate-y-0.5"
            >
              <span>进入队列拼读 (Q=3)</span>
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* 阶段 2：队列拼读 Q=3 */}
      {phase === "queue" && (
        <div className="relative z-10 mt-5">
          <div
            className="p-3 rounded-2xl border-2 border-[#3A2A18] flex flex-wrap items-center justify-between gap-3 mb-4"
            style={{ backgroundColor: "#FFF8EA" }}
          >
            <div className="flex items-center gap-2.5">
              <GanganInteractiveMascot
                size={48}
                pose={queueDemoUsed ? "nod" : "idle"}
                mood={queueDemoUsed ? "happy" : "conducting"}
              />
              <div>
                <div className="text-xs font-black text-[#2E7D5B] flex items-center gap-1">
                  <RadioIcon className="size-3.5" />
                  <span>
                    任务：手动拼读第 {queueIdx + 1}/3 词 ({currentQueueWord})
                    {queueIdx === 0 && " [热身词：不降级]"}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#3A2A18]/80">
                  手动拖动滑轨依次经过全部音素块，合出整词发音。
                </div>
              </div>
            </div>

            <button
              disabled={isDemonstrating}
              onClick={handleQueueDemo}
              className="px-4 py-2 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] hover:bg-[#ffaa22] font-black text-xs text-[#3A2A18] shadow-[2px_2px_0_#3A2A18] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <SparklesIcon className="size-3.5" />
              <span>{isDemonstrating ? "示范发音中..." : "请敢敢示范 (置 assisted)"}</span>
            </button>
          </div>

          {/* 面板 */}
          <div className="bg-[#FFF8EA] rounded-2xl border-2 border-[#3A2A18] p-3 shadow-[3px_3px_0_#3A2A18]">
            <PhonicsBlendingPanel
              key={currentQueueWord}
              word={getWordObj(currentQueueWord)}
              manualOnly={true}
              onManualBlendComplete={handleQueueBlendComplete}
              onTokenVisit={(sound) => {
                setQueueVisitedTokens((prev) => new Set(prev).add(sound));
              }}
              showHeader={false}
            />
          </div>

          {/* 辅导出口 */}
          {(queueDemoUsed || queueAttempt >= 2) && (
            <div className="mt-4 p-4 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] shadow-[3px_3px_0_#3A2A18]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-[#D63C2F] flex items-center gap-1">
                  <AlertCircleIcon className="size-4" />
                  跟读协助通道
                </span>
                <span className="text-[11px] font-bold text-[#3A2A18]/70">
                  记 assisted 标记推进
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 my-2">
                {currentQueueWord.split("").map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      playPhonicsTokenSound(t);
                      setQueueVisitedTokens((prev) => new Set(prev).add(t));
                    }}
                    className={`py-2 px-3 rounded-xl border-2 border-[#3A2A18] text-xs font-black flex items-center gap-2 cursor-pointer ${
                      queueVisitedTokens.has(t)
                        ? "bg-[#2E7D5B] text-white"
                        : "bg-[#F3E3C2] text-[#3A2A18]"
                    }`}
                  >
                    <span>点读 /{t}/</span>
                    {queueVisitedTokens.has(t) && <CheckCircle2Icon className="size-3.5" />}
                  </button>
                ))}

                <button
                  onClick={async () => {
                    await playPhonicsWordSound(currentQueueWord);
                    setQueueWordReadDone(true);
                  }}
                  className={`py-2 px-3 rounded-xl border-2 border-[#3A2A18] text-xs font-black flex items-center gap-2 cursor-pointer ${
                    queueWordReadDone ? "bg-[#2E7D5B] text-white" : "bg-[#FFB340] text-[#3A2A18]"
                  }`}
                >
                  <span>跟读整词</span>
                  {queueWordReadDone && <CheckCircle2Icon className="size-3.5" />}
                </button>
              </div>

              <div className="mt-3 text-right">
                <button
                  onClick={handleQueueAssistedExit}
                  className="px-5 py-2 rounded-xl border-2 border-[#3A2A18] bg-[#2E7D5B] text-white font-black text-xs uppercase tracking-wider shadow-[2px_2px_0_#3A2A18] cursor-pointer"
                >
                  确认跟读完成 (assisted)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 阶段 3：迁移验证 1 题（听音三选一） */}
      {phase === "verify" && (
        <div className="relative z-10 mt-6 max-w-lg mx-auto py-2">
          <div className="p-5 rounded-3xl border-2 border-[#3A2A18] bg-[#FFF8EA] shadow-[4px_4px_0_#3A2A18] text-center">
            <span className="text-xs font-black text-[#2E7D5B] uppercase tracking-wider flex items-center justify-center gap-1">
              <CompassIcon className="size-4" />
              盲音迁移验证 (听音三选一)
            </span>
            <p className="text-sm font-bold text-[#3A2A18] mt-2 mb-4">{verifyFeedback}</p>

            <button
              onClick={() => playPhonicsWordSound(migrationWord)}
              className="px-5 py-2.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] hover:bg-[#ffaa22] font-black text-xs text-[#3A2A18] shadow-[2px_2px_0_#3A2A18] flex items-center gap-2 mx-auto mb-6 cursor-pointer"
            >
              <Volume2Icon className="size-4 text-[#3A2A18]" />
              <span>播放整词发音</span>
            </button>

            <div className="grid grid-cols-3 gap-3">
              {verifyOptions.map((opt) => {
                const isTarget = opt === migrationWord;
                const isHighlighted = verifyRevealed && isTarget;

                return (
                  <button
                    key={opt}
                    onClick={() => handleVerifyChoice(opt)}
                    className={`py-5 px-2 rounded-2xl border-[3px] border-[#3A2A18] font-black text-2xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] transition-all cursor-pointer ${
                      isHighlighted
                        ? "bg-[#2E7D5B] text-white animate-pulse"
                        : "bg-[#F3E3C2] hover:bg-[#FFF8EA]"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 阶段 4：营地校验 4 项 */}
      {phase === "camp" && (
        <div className="relative z-10 mt-5">
          <div
            className="p-3.5 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheckIcon className="size-5 text-[#2E7D5B]" />
              <div>
                <div className="text-xs font-black text-[#3A2A18]">
                  营地综合校验 · 进度 0{campStep}/04
                </div>
                <div className="text-[11px] font-bold text-[#3A2A18]/70">
                  {campFeedback}
                </div>
              </div>
            </div>
            <div className="text-xs font-black text-[#2E7D5B]">
              首次答对：{campFirstTryCount}/4
            </div>
          </div>

          {/* 校验 01：/s/ vs /m/ */}
          {campStep === 1 && (
            <div className="p-6 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] text-center max-w-md mx-auto shadow-[3px_3px_0_#3A2A18]">
              <p className="text-sm font-bold text-[#3A2A18] mb-3">
                听音辨析：目标声音是 /s/ 还是 /m/？
              </p>
              <button
                onClick={() => playPhonemeSound("s")}
                className="px-4 py-2 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] font-black text-xs text-[#3A2A18] flex items-center gap-1.5 mx-auto mb-5 shadow-[2px_2px_0_#3A2A18] cursor-pointer"
              >
                <Volume2Icon className="size-4" />
                <span>播放声音</span>
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleCampStep1Choice("s")}
                  className="p-4 rounded-2xl border-[3px] border-[#3A2A18] bg-[#F3E3C2] hover:bg-[#FFB340] font-black text-3xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] cursor-pointer"
                >
                  /s/
                </button>
                <button
                  onClick={() => handleCampStep1Choice("m")}
                  className="p-4 rounded-2xl border-[3px] border-[#3A2A18] bg-[#F3E3C2] hover:bg-[#FFB340] font-black text-3xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] cursor-pointer"
                >
                  /m/
                </button>
              </div>
            </div>
          )}

          {/* 校验 02：/æ/ vs /e/ */}
          {campStep === 2 && (
            <div className="p-6 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] text-center max-w-md mx-auto shadow-[3px_3px_0_#3A2A18]">
              <p className="text-sm font-bold text-[#3A2A18] mb-3">
                听音辨析：目标声音是 /æ/ 还是 /e/？
              </p>
              <button
                onClick={() => playPhonemeSound("ae")}
                className="px-4 py-2 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] font-black text-xs text-[#3A2A18] flex items-center gap-1.5 mx-auto mb-5 shadow-[2px_2px_0_#3A2A18] cursor-pointer"
              >
                <Volume2Icon className="size-4" />
                <span>播放声音</span>
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleCampStep2Choice("ae")}
                  className="p-4 rounded-2xl border-[3px] border-[#3A2A18] bg-[#F3E3C2] hover:bg-[#FFB340] font-black text-3xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] cursor-pointer"
                >
                  /æ/
                </button>
                <button
                  onClick={() => handleCampStep2Choice("e")}
                  className="p-4 rounded-2xl border-[3px] border-[#3A2A18] bg-[#F3E3C2] hover:bg-[#FFB340] font-black text-3xl text-[#3A2A18] shadow-[3px_3px_0_#3A2A18] cursor-pointer"
                >
                  /e/
                </button>
              </div>
            </div>
          )}

          {/* 校验 03：拼一个 -at 词 (pat) */}
          {campStep === 3 && (
            <div className="bg-[#FFF8EA] rounded-2xl border-2 border-[#3A2A18] p-4 shadow-[3px_3px_0_#3A2A18]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-[#2E7D5B]">
                  拼读 -at 词：pat
                </span>
                <button
                  onClick={async () => {
                    setCampBlendDemoUsed(true);
                    await playPhonicsTokenSound("p");
                    await new Promise((r) => setTimeout(r, 500));
                    await playPhonicsTokenSound("a");
                    await new Promise((r) => setTimeout(r, 500));
                    await playPhonicsTokenSound("t");
                    await new Promise((r) => setTimeout(r, 500));
                    await playPhonicsWordSound("pat");
                  }}
                  className="px-3 py-1.5 rounded-xl border-2 border-[#3A2A18] bg-[#FFB340] font-black text-xs text-[#3A2A18] cursor-pointer"
                >
                  敢敢示范 pat
                </button>
              </div>

              <PhonicsBlendingPanel
                word={getWordObj("pat")}
                manualOnly={true}
                onManualBlendComplete={() => handleCampStep3BlendComplete(false)}
                onTokenVisit={(sound) => {
                  setCampBlendVisited((prev) => new Set(prev).add(sound));
                }}
                showHeader={false}
              />

              <div className="mt-3 text-right">
                <button
                  onClick={() => handleCampStep3BlendComplete(true)}
                  className="px-4 py-1.5 rounded-xl border-2 border-[#3A2A18] bg-[#F3E3C2] text-xs font-bold text-[#3A2A18] hover:bg-[#FFB340] cursor-pointer"
                >
                  跳过/跟读完成 (assisted)
                </button>
              </div>
            </div>
          )}

          {/* 校验 04：迁移词点读 */}
          {campStep === 4 && (
            <div className="p-6 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] text-center max-w-md mx-auto shadow-[3px_3px_0_#3A2A18]">
              <span className="text-xs font-black text-[#2E7D5B] uppercase tracking-wider">
                迁移词点读复核
              </span>
              <div className="my-4 text-4xl font-black text-[#3A2A18] tracking-widest font-mono">
                {migrationWord}
              </div>

              <div className="flex items-center justify-center gap-2 mb-6">
                {migrationWord.split("").map((t, i) => (
                  <button
                    key={i}
                    onClick={() => playPhonicsTokenSound(t)}
                    className="w-12 h-12 rounded-xl border-2 border-[#3A2A18] bg-[#F3E3C2] hover:bg-[#FFB340] text-lg font-black text-[#3A2A18] flex items-center justify-center shadow-[2px_2px_0_#3A2A18] cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={() => playPhonicsWordSound(migrationWord)}
                  className="px-4 h-12 rounded-xl border-2 border-[#3A2A18] bg-[#2E7D5B] text-white text-xs font-black flex items-center gap-1 shadow-[2px_2px_0_#3A2A18] cursor-pointer"
                >
                  <Volume2Icon className="size-4" />
                  <span>整词发音</span>
                </button>
              </div>

              <button
                onClick={handleCampStep4Finish}
                className="w-full py-3 rounded-2xl border-[3px] border-[#3A2A18] bg-[#2E7D5B] hover:bg-[#25694c] text-white font-black text-sm tracking-wider shadow-[3px_3px_0_#3A2A18] cursor-pointer"
              >
                完成点读，提交营地两线结算
              </button>
            </div>
          )}
        </div>
      )}

      {/* 阶段 5：两线结果展示 (Summary) */}
      {phase === "summary" && (
        <div className="relative z-10 mt-6 max-w-xl mx-auto py-2">
          <div className="p-6 rounded-3xl border-[3px] border-[#3A2A18] bg-[#FFF8EA] shadow-[5px_5px_0_#3A2A18] text-center">
            {((campFirstTryCount + 1) / 4 >= 0.7 && migrationPassed) ? (
              <div className="w-16 h-16 rounded-2xl border-2 border-[#3A2A18] bg-[#FFF8EA] flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0_#3A2A18] p-1">
                <img
                  src={GAME_ASSETS.svg.colBadgeG1}
                  alt="G1 探索者金徽"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl border-2 border-[#3A2A18] bg-neutral-200 flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0_#3A2A18] p-2">
                <svg className="w-10 h-10">
                  <use href="/assets/game/svg/status-sprite.svg#st-badge-grey" />
                </svg>
              </div>
            )}

            <h3 className="text-xl font-black text-[#3A2A18]">
              R04 猪鼻营地 · 校验结算简报
            </h3>

            {/* 两线结果条 */}
            <div className="mt-5 space-y-3 text-left">
              {/* 线 1：过关线 */}
              <div className="p-3.5 rounded-2xl border-2 border-[#3A2A18] bg-[#F3E3C2] flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-[#3A2A18]">① 过关线 (流程完整度)</div>
                  <div className="text-[11px] font-bold text-[#3A2A18]/70">
                    4 项营地校验全部完成
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl border border-[#3A2A18] bg-[#2E7D5B] text-white text-xs font-black">
                  已达成
                </span>
              </div>

              {/* 线 2：组徽点亮线 */}
              <div
                className={`p-3.5 rounded-2xl border-2 border-[#3A2A18] flex items-center justify-between ${
                  (campFirstTryCount + 1) / 4 >= 0.7 && migrationPassed
                    ? "bg-[#FFF8EA] ring-2 ring-[#FFB340]"
                    : "bg-neutral-100 opacity-90"
                }`}
              >
                <div>
                  <div className="text-xs font-black text-[#3A2A18] flex items-center gap-1.5">
                    <span>② 组徽点亮线 (高标准掌握)</span>
                    {((campFirstTryCount + 1) / 4 >= 0.7 && migrationPassed) && (
                      <span className="text-xs">🏆 金徽</span>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-[#3A2A18]/70">
                    首次正确率 {Math.round(((campFirstTryCount + 1) / 4) * 100)}% (标准 ≥70%) •{" "}
                    迁移项：{migrationPassed ? "答对" : "未通过"}
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-xl border border-[#3A2A18] text-xs font-black ${
                    (campFirstTryCount + 1) / 4 >= 0.7 && migrationPassed
                      ? "bg-[#FFB340] text-[#3A2A18]"
                      : "bg-neutral-300 text-neutral-600"
                  }`}
                >
                  {(campFirstTryCount + 1) / 4 >= 0.7 && migrationPassed ? "已点亮" : "待点亮 (灰徽)"}
                </span>
              </div>
            </div>

            {/* 复练清单 (若有错项) */}
            {campReviewList.length > 0 && (
              <div className="mt-4 p-3 rounded-2xl border border-dashed border-[#D63C2F] bg-[#FFF8EA] text-left">
                <div className="text-xs font-black text-[#D63C2F] mb-1">
                  🎯 建议巩固复练清单：
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {campReviewList.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md border border-[#3A2A18]/30 bg-[#F3E3C2] text-[11px] font-bold text-[#3A2A18]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={onExit}
                className="w-full py-3 rounded-2xl border-[3px] border-[#3A2A18] bg-[#2E7D5B] hover:bg-[#25694c] text-white font-black text-sm tracking-wider shadow-[3px_3px_0_#3A2A18] cursor-pointer"
              >
                返回试点区航线图
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
