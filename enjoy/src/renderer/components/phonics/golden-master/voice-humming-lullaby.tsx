import React, { useState, useEffect, useRef } from "react";
import { MicIcon, SquareIcon, MoonIcon, SparklesIcon } from "lucide-react";
import { phonicsAudioFx, speakGanganPrompt } from "@renderer/lib/phonics-audio-fx";

interface VoiceHummingLullabyProps {
  onSuccess: () => void;
}

export const VoiceHummingLullaby: React.FC<VoiceHummingLullabyProps> = ({ onSuccess }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0); // 0 ~ 100
  const [isPeeking, setIsPeeking] = useState(false);
  const [isAsleep, setIsAsleep] = useState(false);
  const [ganganSpeech, setGanganSpeech] = useState("深吸一口气，按住按钮持续哼 /m/... 给月亮催眠吧！");

  const progressIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    speakGanganPrompt("月亮吃饱啦，揉揉眼睛要睡午觉啦！小勇士，按住麦克风，像哼摇篮曲一样，持续哼 /m/ 给月亮催眠吧！");
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
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {
      // 麦克风无法访问时优雅降级（按住即驱动）
    }
  };

  const stopMic = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // 1. 开始哼鸣催眠 (按住按钮)
  const handleStartHumming = () => {
    if (isAsleep) return;
    phonicsAudioFx.playPop();
    setIsPressing(true);
    setIsPeeking(false);
    setGanganSpeech("对！就是这样，持续哼 /m/，月亮眼皮快合上啦~");

    startMic();

    // 持续累加催眠能量进度
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 3.5;
        if (next >= 100) {
          clearInterval(progressIntervalRef.current);
          handleFallAsleep();
          return 100;
        }
        return next;
      });
    }, 100);
  };

  // 2. 中途松开：月亮偷看一眼！
  const handleStopHumming = () => {
    if (isAsleep) return;
    setIsPressing(false);
    stopMic();

    if (progress < 100) {
      setIsPeeking(true);
      setGanganSpeech("咦？声音停啦？月亮偷偷睁开一只眼睛偷看你呢！");
    }
  };

  // 3. 催眠成功：月亮香甜入睡
  const handleFallAsleep = () => {
    setIsAsleep(true);
    setIsPressing(false);
    stopMic();
    phonicsAudioFx.playSuccessChime();
    setGanganSpeech("呼噜噜~ 月亮睡香香啦！小火车开来啦！🌟");

    speakGanganPrompt("嘘~ 月亮睡香香啦！太棒啦，拼读小火车进站啦！", {
      pitch: 1.25,
      onEnd: () => setTimeout(onSuccess, 800),
    });

    setTimeout(onSuccess, 2200);
  };

  return (
    <div className="relative w-full h-[460px] flex flex-col justify-between items-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-[#060a1d] via-[#101438] to-[#1a1130] p-4 text-white">
      {/* 随进度越来越亮的梦幻萤火虫与星光 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 动态绕月飞舞的 4 只荧光萤火虫 */}
        {[0, 90, 180, 270].map((deg, i) => {
          const active = progress > i * 20;
          return (
            <div
              key={i}
              style={{
                display: active ? "block" : "none",
                top: `${40 + Math.sin((progress * 0.08 + i) * 1.5) * 25}%`,
                left: `${48 + Math.cos((progress * 0.08 + i) * 1.5) * 32}%`,
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
              按住按钮<strong>持续哼 /m/</strong>，越哼月亮越困！
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

      {/* 中部核心舞台：3D 催眠月亮 */}
      <div className="relative flex items-center justify-center my-auto w-full z-10">
        <div className="relative size-44 sm:size-48 flex items-center justify-center">
          {/* 背后柔和睡眠蓝光晕 */}
          <div
            style={{ opacity: 0.3 + (progress / 100) * 0.5 }}
            className="absolute inset-0 rounded-full bg-sky-400/30 blur-3xl -z-10 transition-opacity"
          />

          {/* 3D 月亮主图 (透明通道) */}
          <img
            src="/assets/phonics/anchors/anchor-moon-transparent.png"
            alt="催眠月亮"
            style={{
              filter: `drop-shadow(0 12px 24px rgba(56, 189, 248, ${
                0.2 + (progress / 100) * 0.3
              }))`,
            }}
            className={`w-full h-full object-contain transition-transform duration-300 ${
              isPressing ? "scale-105" : ""
            }`}
          />

          {/* 动态眼睑闭合效果与偷看彩蛋 */}
          {/* 当进度增加时，眼皮向下合拢 */}
          <div
            style={{
              opacity: progress > 20 ? 1 : 0,
            }}
            className="absolute top-[38%] left-[26%] w-[42%] h-[24%] pointer-events-none flex items-center justify-between px-2 transition-opacity"
          >
            {isPeeking ? (
              // 偷看一眼：一只眼睁大，一只眼眯着
              <div className="w-full flex items-center justify-between">
                <span className="text-xl">👁️</span>
                <span className="text-base font-black text-amber-900">~</span>
              </div>
            ) : progress >= 85 || isAsleep ? (
              // 熟睡弯弯月牙眯眯眼 (^ ^)
              <div className="w-full flex items-center justify-between text-2xl font-black text-amber-900 drop-shadow-sm">
                <span>⌒</span>
                <span>⌒</span>
              </div>
            ) : (
              // 慢慢闭上眼帘
              <div className="w-full h-2 rounded-full bg-amber-400/80 blur-[0.5px]" />
            )}
          </div>

          {/* 熟睡呼噜气泡 (Zzz...) */}
          {(isAsleep || progress >= 90) && (
            <div className="absolute -top-6 -right-2 flex flex-col items-center animate-bounce">
              <span className="text-xl font-black text-sky-300 font-mono">Z</span>
              <span className="text-sm font-black text-sky-200 font-mono -translate-x-2">z</span>
              <span className="text-xs font-black text-sky-100 font-mono -translate-x-3">z</span>
            </div>
          )}
        </div>

        {/* 抱枕头的 3D 敢敢小狮子 */}
        <div className="absolute -bottom-2 right-4 sm:right-12 size-20 sm:size-24 pointer-events-none drop-shadow-lg">
          <img
            src="/assets/gangan/gangan_official.png"
            alt="敢敢"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* 底部：大麦克风长按声控遥控器 */}
      <div className="relative w-full flex flex-col items-center gap-2 pb-2 z-20">
        <button
          type="button"
          onPointerDown={handleStartHumming}
          onPointerUp={handleStopHumming}
          onPointerLeave={handleStopHumming}
          disabled={isAsleep}
          className={`size-22 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl relative select-none ${
            isPressing
              ? "bg-gradient-to-r from-sky-400 to-indigo-500 scale-110 ring-8 ring-sky-300/40 text-white animate-pulse"
              : isAsleep
              ? "bg-emerald-500 text-white scale-100"
              : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 ring-4 ring-amber-300/60 hover:scale-105 active:scale-95"
          }`}
        >
          {isPressing ? (
            <>
              <SquareIcon className="size-8 fill-current" />
              <span className="text-[10px] font-black mt-0.5">哼鸣中...</span>
            </>
          ) : isAsleep ? (
            <>
              <SparklesIcon className="size-8 animate-spin" />
              <span className="text-[10px] font-black mt-0.5">月亮睡着啦</span>
            </>
          ) : (
            <>
              <MicIcon className="size-9 fill-current" />
              <span className="text-[10px] font-black mt-0.5">按住长哼 /m/</span>
            </>
          )}
        </button>

        <span className="text-xs font-bold text-slate-300">
          {isPressing
            ? "🎵 正在接收声音能量...萤火虫飞舞中！"
            : isAsleep
            ? "✨ 催眠大成功！小火车正在进站..."
            : "按住按钮像唱摇篮曲一样，持续发出 /m/... 音！"}
        </span>
      </div>
    </div>
  );
};
