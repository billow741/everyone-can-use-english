import React, { useState, useEffect, useRef } from "react";
import { MicIcon, SparklesIcon, StarIcon, Volume2Icon } from "lucide-react";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { GanganInteractiveMascot, GanganPose } from "../game/gangan-interactive-mascot";

interface VoiceHummingLullabyProps {
  onSuccess: () => void;
}

export const VoiceHummingLullaby: React.FC<VoiceHummingLullabyProps> = ({ onSuccess }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0); // 0 ~ 100
  const [micVolume, setMicVolume] = useState(0); // 0 ~ 100 实时音量
  const [isHummingValid, setIsHummingValid] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [isAsleep, setIsAsleep] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  // 文字瘦身：气泡限制 ≤5 字短句，长指令通过语音播报
  const [ganganSpeech, setGanganSpeech] = useState("快哼唱！");
  const [ganganPose, setGanganPose] = useState<GanganPose>("wave");
  
  // A.4 验收指标：催眠曲幕月亮为主角，敢敢开场约 2 秒露面招手后平滑淡出
  const [showGangan, setShowGangan] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);

  useEffect(() => {
    // 语音链路播报完整操作指南
    speakGanganPrompt("月亮吃饱啦，揉揉眼睛要睡午觉啦！小勇士，按住麦克风，像哼摇篮曲一样，用嗓音持续哼唱给月亮催眠吧！");

    // 2 秒后敢敢淡出，让月亮独占核心舞台
    const t = setTimeout(() => {
      setShowGangan(false);
    }, 2000);

    return () => {
      clearTimeout(t);
      stopMic();
    };
  }, []);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;
      setMicPermissionDenied(false);

      startAudioLoop();
    } catch (err) {
      console.warn("麦克风不可用或被拒绝，开启降级模拟", err);
      setMicPermissionDenied(true);
    }
  };

  const startAudioLoop = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkAudio = () => {
      if (!isPressingRef.current) return;

      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      const sampleCount = Math.min(dataArray.length, 60);
      for (let i = 2; i < sampleCount; i++) {
        sum += dataArray[i];
      }
      const avgVolume = sum / (sampleCount - 2);
      const normalizedVol = Math.min(100, Math.round((avgVolume / 140) * 100));
      setMicVolume(normalizedVol);

      const isVoiceActive = avgVolume > 16;
      setIsHummingValid(isVoiceActive);

      if (isVoiceActive) {
        setProgress((prev) => {
          const next = prev + 0.9;
          if (next >= 100) {
            handleFallAsleep();
            return 100;
          }
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(checkAudio);
    };

    rafRef.current = requestAnimationFrame(checkAudio);
  };

  const stopMic = () => {
    isPressingRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicVolume(0);
    setIsHummingValid(false);
  };

  const handleStartHumming = () => {
    if (isAsleep) return;
    phonicsAudioFx.playPop();
    setIsPressing(true);
    isPressingRef.current = true;
    setIsPeeking(false);
    setGanganSpeech("继续哼唱！");
    startMic();
  };

  const handleStopHumming = () => {
    if (isAsleep) return;
    setIsPressing(false);
    isPressingRef.current = false;
    stopMic();

    if (progress < 100) {
      setIsPeeking(true);
      setGanganSpeech("别停哦！👀");
    }
  };

  const handleFallAsleep = () => {
    setIsAsleep(true);
    setIsPressing(false);
    isPressingRef.current = false;
    stopMic();
    phonicsAudioFx.playSuccessChime();
    setGanganSpeech("睡香香啦！");

    speakGanganPrompt("嘘~ 月亮睡香香啦！小勇士的声音真好听！小火车进站啦！", {
      pitch: 1.25,
      onEnd: () => setTimeout(onSuccess, 800),
    });

    setTimeout(onSuccess, 2200);
  };

  const handleFallbackHum = () => {
    if (isAsleep) return;
    setProgress((p) => {
      const next = p + 15;
      if (next >= 100) {
        handleFallAsleep();
        return 100;
      }
      return next;
    });
  };

  return (
    <div className="relative w-full h-[470px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#060a1d] via-[#101438] to-[#1a1130] p-4 text-white">
      {/* 随进度越来越亮的梦幻萤火虫粒子 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[0, 90, 180, 270].map((deg, i) => {
          const active = progress > i * 20;
          return (
            <div
              key={i}
              style={{
                display: active ? "block" : "none",
                top: `${38 + Math.sin((progress * 0.08 + i) * 1.5) * 22}%`,
                left: `${48 + Math.cos((progress * 0.08 + i) * 1.5) * 30}%`,
              }}
              className="absolute size-3 rounded-full bg-lime-300 shadow-[0_0_15px_#bef264] transition-all duration-300 animate-ping"
            />
          );
        })}
      </div>

      {/* 顶部：简明标题与 5 颗星逐颗点亮图形进度 (B.3: 删除"困意 0%"数字进度) */}
      <div className="w-full flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <h3 className="text-sm font-black text-amber-300">
            催眠曲
          </h3>
        </div>

        {/* 5 颗催眠星星逐颗点亮图形进度条 (替代数字百分比) */}
        <div className="flex items-center gap-1.5 bg-black/40 px-3.5 py-1.5 rounded-full border border-sky-400/40">
          {[1, 2, 3, 4, 5].map((starIdx) => {
            const isLit = progress >= starIdx * 20;
            return (
              <StarIcon
                key={starIdx}
                className={`size-4 transition-all duration-300 ${
                  isLit
                    ? "fill-amber-300 text-amber-300 scale-110 drop-shadow-[0_0_8px_#fde047]"
                    : "fill-white/10 text-white/30 scale-90"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 中部核心舞台：3D 催眠月亮作为唯一主角 */}
      <div className="relative flex items-center justify-center my-auto w-full z-10">
        <div className="relative size-44 sm:size-48 flex items-center justify-center">
          {/* 背后柔和睡眠蓝光晕 */}
          <div
            style={{ opacity: 0.3 + (progress / 100) * 0.6 }}
            className="absolute inset-0 rounded-full bg-sky-400/30 blur-3xl -z-10 transition-opacity"
          />

          {/* 3D 黏土月亮 */}
          <img
            src="/assets/phonics/anchors/anchor-moon-transparent.png"
            alt="催眠月亮"
            style={{
              filter: `drop-shadow(0 12px 24px rgba(56, 189, 248, ${
                0.25 + (progress / 100) * 0.35
              }))`,
              transform: isPressing && isHummingValid
                ? "scale(1.05)"
                : isPeeking
                ? "scale(1.02)"
                : undefined,
            }}
            className="w-full h-full object-contain transition-transform duration-300"
          />

          {/* 随催眠进度逐渐下垂的温润睡眠眼帘阴影 */}
          <div
            style={{
              opacity: (progress / 100) * 0.45,
              height: `${Math.min(50, (progress / 100) * 50)}%`,
            }}
            className="absolute top-1/4 left-1/4 right-1/4 rounded-full bg-indigo-950/40 blur-[2px] pointer-events-none transition-all duration-300"
          />

          {/* 正在发声接收声音时的金色音波光环 */}
          {isPressing && isHummingValid && (
            <div className="absolute inset-0 rounded-full ring-4 ring-amber-300/60 animate-ping pointer-events-none" />
          )}

          {/* 熟睡呼噜气泡 (Zzz...) */}
          {(isAsleep || progress >= 85) && (
            <div className="absolute -top-7 -right-3 flex flex-col items-center animate-bounce">
              <span className="text-xl font-black text-sky-300 font-mono">Z</span>
              <span className="text-sm font-black text-sky-200 font-mono -translate-x-2">z</span>
              <span className="text-xs font-black text-sky-100 font-mono -translate-x-3">z</span>
            </div>
          )}
        </div>

        {/* 敢敢开场露面招手约 2 秒后平滑淡出 (A.4 二选一规范实现) */}
        <div
          className={`absolute -bottom-2 right-2 sm:right-8 z-20 transition-opacity duration-700 ${
            showGangan ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <GanganInteractiveMascot
            pose={ganganPose}
            sceneTint="lullaby"
            size={110}
            speechText={ganganSpeech}
          />
        </div>
      </div>

      {/* 实时声波能量反馈小动态线 (简洁直观，无赘述文本) */}
      {isPressing && (
        <div className="w-48 max-w-full flex items-center justify-center gap-1 z-20">
          <div className="w-full h-2 rounded-full bg-slate-900/80 border border-sky-400/50 p-0.5 overflow-hidden flex items-center">
            <div
              style={{ width: `${Math.max(8, micVolume)}%` }}
              className={`h-full rounded-full transition-all duration-100 ${
                isHummingValid
                  ? "bg-gradient-to-r from-emerald-400 to-lime-400 shadow-[0_0_8px_#4ade80]"
                  : "bg-amber-500/70"
              }`}
            />
          </div>
        </div>
      )}

      {/* 底部：大麦克风长按声控遥控器 (精简文字标签) */}
      <div className="relative w-full flex flex-col items-center gap-2 pb-2 z-20">
        <button
          type="button"
          onPointerDown={handleStartHumming}
          onPointerUp={handleStopHumming}
          onPointerLeave={handleStopHumming}
          disabled={isAsleep}
          className={`size-22 rounded-full flex flex-col items-center justify-center p-2 transition-all cursor-pointer shadow-2xl relative select-none ${
            isPressing
              ? isHummingValid
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 scale-105 ring-8 ring-emerald-300/50 text-white"
                : "bg-gradient-to-r from-amber-500 to-orange-500 scale-105 ring-8 ring-amber-300/40 text-slate-950"
              : isAsleep
              ? "bg-emerald-500 text-white scale-100"
              : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 ring-4 ring-amber-300/60 hover:scale-105 active:scale-95"
          }`}
        >
          {isPressing ? (
            <>
              <Volume2Icon className={`size-7 fill-current ${isHummingValid ? "animate-bounce" : ""}`} />
              <span className="text-[10px] font-black mt-0.5">
                {isHummingValid ? "哼唱中" : "哼唱..."}
              </span>
            </>
          ) : isAsleep ? (
            <>
              <SparklesIcon className="size-7 animate-spin" />
              <span className="text-[10px] font-black mt-0.5">已入睡</span>
            </>
          ) : (
            <>
              <MicIcon className="size-7 fill-current" />
              <span className="text-[10px] font-black mt-0.5 text-center leading-tight">
                按住哼
                <br />
                /m/
              </span>
            </>
          )}
        </button>

        {micPermissionDenied && (
          <button
            type="button"
            onClick={handleFallbackHum}
            className="text-[10px] text-amber-300 underline underline-offset-2 cursor-pointer"
          >
            (点击蓄力)
          </button>
        )}
      </div>
    </div>
  );
};
