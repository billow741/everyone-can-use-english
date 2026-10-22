import React, { useState, useEffect, useRef } from "react";
import { MicIcon, MoonIcon, SparklesIcon, Volume2Icon, AlertCircleIcon } from "lucide-react";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";
import { GanganInteractiveMascot } from "../game/gangan-interactive-mascot";

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
  const [ganganSpeech, setGanganSpeech] = useState("深吸一口气，按住按钮持续哼 /m/... 给月亮催眠吧！");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPressingRef = useRef(false);

  useEffect(() => {
    speakGanganPrompt("月亮吃饱啦，揉揉眼睛要睡午觉啦！小勇士，按住麦克风，像哼摇篮曲一样，用嗓音持续哼 /m/ 给月亮催眠吧！");
    return () => {
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

      // 计算人声哼鸣频段（约 100Hz ~ 800Hz）的能量平均值
      let sum = 0;
      const sampleCount = Math.min(dataArray.length, 60);
      for (let i = 2; i < sampleCount; i++) {
        sum += dataArray[i];
      }
      const avgVolume = sum / (sampleCount - 2); // 0 ~ 255
      const normalizedVol = Math.min(100, Math.round((avgVolume / 140) * 100));
      setMicVolume(normalizedVol);

      // 关键判定：只有真正检测到声学音量（阈值 > 15）才算在发声哼鸣！
      const isVoiceActive = avgVolume > 16;
      setIsHummingValid(isVoiceActive);

      if (isVoiceActive) {
        setProgress((prev) => {
          // 哼鸣时稳步提升催眠能量
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

  // 1. 开始哼鸣催眠 (按住按钮)
  const handleStartHumming = () => {
    if (isAsleep) return;
    phonicsAudioFx.playPop();
    setIsPressing(true);
    isPressingRef.current = true;
    setIsPeeking(false);
    setGanganSpeech("对！闭上嘴巴，用鼻子持续哼出 /m/... 声音来！");

    startMic();
  };

  // 2. 中途松开：月亮偷看一眼！
  const handleStopHumming = () => {
    if (isAsleep) return;
    setIsPressing(false);
    isPressingRef.current = false;
    stopMic();

    if (progress < 100) {
      setIsPeeking(true);
      setGanganSpeech("咦？声音停啦？月亮偷偷睁开眼偷看你呢！快继续哼！");
    }
  };

  // 3. 催眠成功：月亮香甜入睡
  const handleFallAsleep = () => {
    setIsAsleep(true);
    setIsPressing(false);
    isPressingRef.current = false;
    stopMic();
    phonicsAudioFx.playSuccessChime();
    setGanganSpeech("呼噜噜~ 月亮被你的歌声催眠啦！睡香香啦！小火车开来啦！🌟");

    speakGanganPrompt("嘘~ 月亮睡香香啦！小勇士发出的 /m/ 声音真好听！小火车进站啦！", {
      pitch: 1.25,
      onEnd: () => setTimeout(onSuccess, 800),
    });

    setTimeout(onSuccess, 2200);
  };

  // 降级辅助：麦克风未授权时允许点击发声推进
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
      {/* 随进度越来越亮的梦幻萤火虫与星光 */}
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

      {/* 顶部标题与催眠深度指示 */}
      <div className="w-full flex items-center justify-between px-3 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌙</span>
          <div>
            <h3 className="text-sm font-black text-amber-300">
              玩法二：哼哼催眠曲
            </h3>
            <p className="text-[10px] text-slate-300">
              按住并<strong>真正发声哼 /m/</strong>！音量越大，月亮睡得越香！
            </p>
          </div>
        </div>

        {/* 催眠进度 */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-sky-400/40">
          <MoonIcon className="size-3.5 fill-sky-300 text-sky-300" />
          <span className="text-xs font-mono font-black text-sky-300">
            困意 {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* 敢敢上方提示气泡 */}
      <div className="z-10 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-200 text-xs font-black shadow-md backdrop-blur-sm animate-bounce">
        🦁 敢敢：" {ganganSpeech} "
      </div>

      {/* 中部核心舞台：3D 催眠月亮与睡衣敢敢 */}
      <div className="relative flex items-center justify-center my-auto w-full z-10">
        <div className="relative size-44 sm:size-48 flex items-center justify-center">
          {/* 背后柔和睡眠蓝光晕 */}
          <div
            style={{ opacity: 0.3 + (progress / 100) * 0.6 }}
            className="absolute inset-0 rounded-full bg-sky-400/30 blur-3xl -z-10 transition-opacity"
          />

          {/* 3D 月亮主图 (透明通道原图原生呈现，不再覆盖难看的 emoji 眼睛) */}
          <img
            src="/assets/phonics/anchors/anchor-moon-transparent.png"
            alt="催眠月亮"
            style={{
              filter: `drop-shadow(0 12px 24px rgba(56, 189, 248, ${
                0.25 + (progress / 100) * 0.35
              }))`,
              transform: isPressing && isHummingValid
                ? `scale(1.06) rotate(${Math.sin(Date.now() / 200) * 3}deg)`
                : isPeeking
                ? "scale(1.02) rotate(4deg)"
                : undefined,
            }}
            className="w-full h-full object-contain transition-transform duration-300"
          />

          {/* 中途松开时：月亮调皮偷看标志 */}
          {isPeeking && !isAsleep && (
            <div className="absolute top-2 -right-3 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-lg animate-bounce border border-amber-200">
              偷看 👀 别停哦！
            </div>
          )}

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

        {/* 坐在一旁的睡衣敢敢小狮子 (戴睡帽、睡眼惺忪、呼噜泡泡) */}
        <div className="absolute -bottom-2 right-2 sm:right-8 z-20">
          <GanganInteractiveMascot
            scenario="sleepy"
            size={115}
            onClick={() => {
              phonicsAudioFx.playChime();
              setGanganSpeech("嘘~ 闭上嘴巴从喉咙哼 /m/... 月亮马上睡熟啦！");
            }}
          />
        </div>
      </div>

      {/* 实时麦克风音量可视化动态条 */}
      {isPressing && (
        <div className="w-64 max-w-full flex flex-col items-center gap-1 z-20">
          <div className="w-full h-3 rounded-full bg-slate-900/80 border border-sky-400/50 p-0.5 overflow-hidden flex items-center">
            <div
              style={{ width: `${Math.max(6, micVolume)}%` }}
              className={`h-full rounded-full transition-all duration-100 ${
                isHummingValid
                  ? "bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-400 shadow-[0_0_10px_#4ade80]"
                  : "bg-amber-500/70"
              }`}
            />
          </div>
          <span className="text-[10px] font-bold text-sky-200">
            {isHummingValid
              ? `🎵 检测到有效哼唱声音 (能量 ${micVolume}%)！催眠加速中...`
              : "⚠️ 请大声发出 /m/... 声音，光按着不说话无法蓄力哦！"}
          </span>
        </div>
      )}

      {/* 底部：大麦克风长按声控遥控器 */}
      <div className="relative w-full flex flex-col items-center gap-2 pb-2 z-20">
        <button
          type="button"
          onPointerDown={handleStartHumming}
          onPointerUp={handleStopHumming}
          onPointerLeave={handleStopHumming}
          disabled={isAsleep}
          className={`size-24 rounded-full flex flex-col items-center justify-center p-2 transition-all cursor-pointer shadow-2xl relative select-none ${
            isPressing
              ? isHummingValid
                ? "bg-gradient-to-r from-emerald-400 to-teal-500 scale-110 ring-8 ring-emerald-300/50 text-white animate-pulse"
                : "bg-gradient-to-r from-amber-500 to-orange-500 scale-105 ring-8 ring-amber-300/40 text-slate-950"
              : isAsleep
              ? "bg-emerald-500 text-white scale-100"
              : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 ring-4 ring-amber-300/60 hover:scale-105 active:scale-95"
          }`}
        >
          {isPressing ? (
            <>
              <Volume2Icon className={`size-8 fill-current ${isHummingValid ? "animate-bounce" : ""}`} />
              <span className="text-[10px] font-black mt-1 leading-tight text-center">
                {isHummingValid ? "哼唱有效!" : "请发出声音!"}
              </span>
            </>
          ) : isAsleep ? (
            <>
              <SparklesIcon className="size-8 animate-spin" />
              <span className="text-[10px] font-black mt-1 leading-tight">月亮睡熟啦</span>
            </>
          ) : (
            <>
              <MicIcon className="size-8 fill-current" />
              <span className="text-[10px] font-black mt-1 leading-tight text-center">
                按住大声哼
                <br />
                /m/
              </span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span>
            {isPressing
              ? isHummingValid
                ? "🎵 声音能量注入中...萤火虫漫天飞舞！"
                : "👂 月亮还在听呢，大声哼出 /m/... 呀！"
              : isAsleep
              ? "✨ 催眠大成功！小火车正在进站..."
              : "按住按钮闭起嘴唇，持续发出 /m/... 声音！"}
          </span>

          {micPermissionDenied && (
            <button
              type="button"
              onClick={handleFallbackHum}
              className="text-[10px] text-amber-300 underline underline-offset-2 ml-1 cursor-pointer"
            >
              (麦克风未授权？点击手动蓄力)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
