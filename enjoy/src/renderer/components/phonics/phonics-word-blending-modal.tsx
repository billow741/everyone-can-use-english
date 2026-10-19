import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from "@renderer/components/ui";
import {
  PhonicsWord,
  getPhaseMeta,
  getPhonicsTokenIpa,
  playPhonicsTokenSound,
  playPhonicsWordSound,
  isPhonicsVowel,
  isDigraphOrMultiLetter,
} from "@renderer/lib/open-phonics-service";
import {
  Volume2Icon,
  MicIcon,
  SparklesIcon,
  PlayIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  GaugeIcon,
  SquareIcon,
  CheckCircle2Icon,
  FlameIcon,
} from "lucide-react";

interface PhonicsWordBlendingModalProps {
  word: PhonicsWord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PhonicsWordBlendingModal: React.FC<PhonicsWordBlendingModalProps> = ({
  word,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  // 动画与交互控制状态
  const [activeHighlightIndex, setActiveHighlightIndex] = useState<number | null>(null);
  const [isBlending, setIsBlending] = useState(false);
  const [blendingSpeed, setBlendingSpeed] = useState<"normal" | "slow">("normal");
  const [isSqueezed, setIsSqueezed] = useState(false);
  const [sliderPosition, setSliderPosition] = useState<number>(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [lastTriggeredIdx, setLastTriggeredIdx] = useState<number | null>(null);
  const [celebration, setCelebration] = useState(false);

  // 录音跟读比对状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const stopRecordingCleanup = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
  };

  // 重置状态
  useEffect(() => {
    if (!open) {
      setActiveHighlightIndex(null);
      setIsBlending(false);
      setIsSqueezed(false);
      setSliderPosition(0);
      setLastTriggeredIdx(null);
      setCelebration(false);
      stopRecordingCleanup();
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
        setAudioBlobUrl(null);
      }
    }
  }, [open, word]);

  if (!word) return null;

  const phaseMeta = getPhaseMeta(word.phase);
  const phonemeTokens = word.sounds || [];
  const tokenCount = phonemeTokens.length;

  // ---------------------------------------------------------
  // 1. 自动魔法滑读 (Magic Auto-Blending)
  // ---------------------------------------------------------
  const handleStartBlending = async () => {
    if (isBlending || tokenCount === 0) return;
    setIsBlending(true);
    setCelebration(false);
    setIsSqueezed(false);
    setSliderPosition(0);

    const stepInterval = blendingSpeed === "slow" ? 280 : 150;
    const bridgeInterval = blendingSpeed === "slow" ? 200 : 120;

    try {
      // 阶段 1：逐音拆解点读 (Segmenting)
      for (let i = 0; i < tokenCount; i++) {
        setActiveHighlightIndex(i);
        setSliderPosition(((i + 0.5) / tokenCount) * 100);
        // 播放纯音素原声 (零静音延迟)
        await playPhonicsTokenSound(phonemeTokens[i]);
        await new Promise((r) => setTimeout(r, stepInterval));
      }

      // 阶段 2：磁吸靠近滑读 (Squeezing & Sliding)
      setActiveHighlightIndex(null);
      setIsSqueezed(true);
      setSliderPosition(100);
      await new Promise((r) => setTimeout(r, bridgeInterval));

      // 阶段 3：合体高亮与整词 Sonia 示范 (Whole Word Blending)
      setActiveHighlightIndex(-1); // -1 代表全部高亮
      await playPhonicsWordSound(word.word, {
        voice: "en-GB-SoniaNeural",
        rate: blendingSpeed === "slow" ? "-10%" : "-5%",
      });

      // 阶段 4：成功反馈
      setCelebration(true);
      setTimeout(() => setCelebration(false), 2000);
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      setActiveHighlightIndex(null);
      setIsBlending(false);
      setIsSqueezed(false);
    }
  };

  // ---------------------------------------------------------
  // 2. 交互式触感滑轨 (Interactive Slider Blending)
  // ---------------------------------------------------------
  const handleTrackInteraction = async (clientX: number) => {
    if (!sliderTrackRef.current || tokenCount === 0) return;
    const rect = sliderTrackRef.current.getBoundingClientRect();
    const rawRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const percent = Math.round(rawRatio * 100);
    setSliderPosition(percent);

    if (percent >= 96) {
      // 滑到终点：合体发整词
      if (lastTriggeredIdx !== -1) {
        setLastTriggeredIdx(-1);
        setActiveHighlightIndex(-1);
        setIsSqueezed(true);
        setCelebration(true);
        await playPhonicsWordSound(word.word, { voice: "en-GB-SoniaNeural" });
        setTimeout(() => {
          setActiveHighlightIndex(null);
          setIsSqueezed(false);
        }, 500);
      }
    } else {
      // 计算当前落在哪一个音素积木区间
      const currentIdx = Math.min(tokenCount - 1, Math.floor(rawRatio * tokenCount));
      if (lastTriggeredIdx !== currentIdx) {
        setLastTriggeredIdx(currentIdx);
        setActiveHighlightIndex(currentIdx);
        setIsSqueezed(false);
        await playPhonicsTokenSound(phonemeTokens[currentIdx]);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingSlider(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleTrackInteraction(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSlider) return;
    handleTrackInteraction(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSlider) return;
    setIsDraggingSlider(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setTimeout(() => {
      setActiveHighlightIndex(null);
      setLastTriggeredIdx(null);
    }, 400);
  };

  // ---------------------------------------------------------
  // 3. 录音跟读比对功能 (Child Voice Practice)
  // ---------------------------------------------------------

  const handleStartRecording = async () => {
    if (isRecording) {
      handleStopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlobUrl) {
          URL.revokeObjectURL(audioBlobUrl);
        }
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 4) {
            handleStopRecording();
            return 4;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn("Microphone access denied or error:", err);
      alert("无法访问麦克风，请检查浏览器权限。");
    }
  };

  const handleStopRecording = () => {
    stopRecordingCleanup();
  };

  const handlePlayMyVoice = () => {
    if (!audioBlobUrl) return;
    if (userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
    }
    const audio = new Audio(audioBlobUrl);
    userAudioPlayerRef.current = audio;
    setIsPlayingRecording(true);
    audio.onended = () => setIsPlayingRecording(false);
    audio.play().catch(() => setIsPlayingRecording(false));
  };

  // 跳转到深度发音评估
  const handleGoToAssessment = () => {
    onOpenChange(false);
    navigate(
      `/pronunciation_assessments?text=${encodeURIComponent(
        word.word
      )}&source=phonics`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-6 sm:p-7 rounded-3xl bg-[#FFFDF7] dark:bg-slate-900 border-2 border-amber-300/80 shadow-2xl space-y-6">
        {/* 顶部标题栏 */}
        <DialogHeader className="pb-3 border-b border-border/50 text-left space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xl">{phaseMeta.emoji}</span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/40">
                {phaseMeta.titleZh}
              </span>
              <span className="text-xs font-bold text-muted-foreground font-mono">
                Lesson {word.lesson}
              </span>
            </div>
            {word.note && (
              <Badge
                variant="outline"
                className="text-[11px] font-bold text-amber-700 bg-amber-500/10 border-amber-300"
              >
                💡 {word.note}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-4xl font-black text-foreground tracking-tight font-mono">
                {word.word}
              </DialogTitle>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/30 shrink-0">
                🇬🇧 Sonia 示范
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                playPhonicsWordSound(word.word, {
                  voice: "en-GB-SoniaNeural",
                  rate: "-5%",
                })
              }
              className="size-10 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="试听 Sonia 纯正整词英音"
            >
              <Volume2Icon className="size-5" />
            </button>
          </div>

          <DialogDescription className="text-xs text-muted-foreground">
            点击音素积木发原声 · 拖拽小火箭或一键滑读，掌握自然拼读 Blending 核心秘诀
          </DialogDescription>
        </DialogHeader>

        {/* 🧩 核心互动舞台：拼读积木点读区 */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 to-orange-500/5 border-2 border-amber-300/60 text-center space-y-6 shadow-inner relative overflow-hidden">
          {/* 成功庆祝浮动标签 */}
          {celebration && (
            <div className="absolute top-2 right-3 animate-bounce flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black text-xs shadow-md">
              <SparklesIcon className="size-3.5 fill-current" />
              <span>Great Blending! 👏</span>
            </div>
          )}

          {/* 积木群展台 */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-900/80 dark:text-amber-200/80">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <span>拼读积木点读（点击单个积木听纯音）：</span>
            </div>

            {/* 积木群（支持根据 isSqueezed 产生向心聚拢效果） */}
            <div
              className={`flex items-center justify-center transition-all duration-300 py-3 ${
                isSqueezed ? "gap-1" : "gap-3 sm:gap-4"
              }`}
            >
              {phonemeTokens.map((token, idx) => {
                const isCurrent =
                  activeHighlightIndex === idx || activeHighlightIndex === -1;
                const ipaSymbol = getPhonicsTokenIpa(token);
                const isVowel = isPhonicsVowel(token);
                const isBar = isDigraphOrMultiLetter(token);

                return (
                  <div
                    key={`${token}-${idx}`}
                    className="flex flex-col items-center gap-1.5 transition-transform"
                  >
                    {/* 3D 浮雕积木主体按键 */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHighlightIndex(idx);
                        playPhonicsTokenSound(token);
                        setTimeout(() => setActiveHighlightIndex(null), 500);
                      }}
                      className={`relative min-w-[70px] sm:min-w-[84px] px-3 py-3 rounded-2xl font-mono transition-all cursor-pointer select-none active:translate-y-1 active:shadow-none flex flex-col items-center justify-center ${
                        isCurrent
                          ? "bg-gradient-to-b from-amber-400 to-orange-500 text-white border-2 border-amber-600 scale-110 -translate-y-1.5 shadow-[0_6px_0_0_#b45309] ring-4 ring-amber-300/60 z-10"
                          : isVowel
                          ? "bg-gradient-to-b from-amber-50 to-orange-100/90 text-amber-950 border-2 border-amber-300/90 shadow-[0_4px_0_0_#d97706] hover:scale-105 hover:bg-amber-100"
                          : "bg-gradient-to-b from-sky-50 to-cyan-100/90 text-sky-950 border-2 border-sky-300/90 shadow-[0_4px_0_0_#0284c7] hover:scale-105 hover:bg-sky-100"
                      }`}
                      title={`点击发纯音 ${ipaSymbol} (${isVowel ? "元音核心" : "辅音"})`}
                    >
                      {/* 音标小角标 */}
                      <span
                        className={`text-[11px] font-sans font-bold tracking-tight mb-0.5 ${
                          isCurrent
                            ? "text-amber-100"
                            : isVowel
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-sky-700 dark:text-sky-400"
                        }`}
                      >
                        {ipaSymbol}
                      </span>

                      {/* 字素大字 */}
                      <span className="text-2xl sm:text-3xl font-black tracking-wide">
                        {token}
                      </span>

                      {/* 角色标识：元音 vs 辅音 */}
                      <span
                        className={`text-[9px] font-sans font-black px-1.5 py-0.2 rounded mt-1 ${
                          isCurrent
                            ? "bg-black/20 text-white"
                            : isVowel
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                            : "bg-sky-500/20 text-sky-800 dark:text-sky-200"
                        }`}
                      >
                        {isVowel ? "元音" : "辅音"}
                      </span>
                    </button>

                    {/* 教学法指示：Sound Dot (●) vs Sound Bar (▬▬) */}
                    <div className="h-4 flex items-center justify-center">
                      {isBar ? (
                        <div
                          className={`h-2 w-10 sm:w-12 rounded-full transition-all ${
                            isCurrent
                              ? "bg-orange-500 shadow-sm shadow-orange-400 scale-110"
                              : "bg-amber-300/80 dark:bg-amber-600/60"
                          }`}
                          title="二合/复合音条 (Sound Bar)"
                        />
                      ) : (
                        <div
                          className={`size-2.5 rounded-full transition-all ${
                            isCurrent
                              ? "bg-orange-500 shadow-sm shadow-orange-400 scale-125"
                              : "bg-amber-300/80 dark:bg-amber-600/60"
                          }`}
                          title="单音素点 (Sound Dot)"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 教学法图例提示 */}
            <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-400" />
                <span>暖色 = 元音核心</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-sky-400" />
                <span>冷色 = 辅音</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-300" />
                <span>● 单音点</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-1.5 rounded-full bg-amber-300 inline-block" />
                <span>▬▬ 组合条</span>
              </span>
            </div>
          </div>

          {/* 🛹 连贯滑轨交互 (Blending Slide Track) */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-900/80 dark:text-amber-200/80 px-1">
              <span>🛝 手指 / 鼠标滑轨 (从左向右拖动滑拼)：</span>
              <span className="font-mono text-orange-600">
                {sliderPosition >= 96 ? "🏁 合体成功" : `${Math.round(sliderPosition)}%`}
              </span>
            </div>

            {/* 触控滑轨槽 */}
            <div
              ref={sliderTrackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative h-10 w-full rounded-2xl bg-amber-200/50 dark:bg-slate-800 border-2 border-amber-300/80 flex items-center px-2 cursor-grab active:cursor-grabbing touch-none select-none shadow-inner"
            >
              {/* 已滑过的高亮发光进度条 */}
              <div
                className="absolute left-1 top-1 bottom-1 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-90 transition-all pointer-events-none"
                style={{ width: `calc(${sliderPosition}% - 8px)` }}
              />

              {/* 节点音素标记 */}
              {phonemeTokens.map((t, idx) => {
                const nodePercent = ((idx + 0.5) / tokenCount) * 100;
                return (
                  <div
                    key={`node-${t}-${idx}`}
                    className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
                    style={{ left: `${nodePercent}%` }}
                  >
                    <span className="text-[10px] font-mono font-black text-amber-950/60 dark:text-white/60">
                      {t}
                    </span>
                  </div>
                );
              })}

              {/* 终点合体旗帜 */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-xs">
                🏁
              </div>

              {/* 可拖动的小火箭滑块 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-8 rounded-full bg-white dark:bg-slate-900 shadow-md border-2 border-orange-500 flex items-center justify-center text-sm transition-transform hover:scale-110 active:scale-125 z-10"
                style={{
                  left: `${Math.min(94, Math.max(6, sliderPosition))}%`,
                }}
              >
                🚀
              </div>
            </div>
          </div>

          {/* 🚀 控制区：一键魔法滑读 + 速率调节 */}
          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-card/80 p-1 rounded-xl border border-border">
              <GaugeIcon className="size-3.5 text-muted-foreground ml-1" />
              <button
                type="button"
                onClick={() => setBlendingSpeed("slow")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  blendingSpeed === "slow"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🐢 慢速拼读
              </button>
              <button
                type="button"
                onClick={() => setBlendingSpeed("normal")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  blendingSpeed === "normal"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🐰 连贯滑读
              </button>
            </div>

            <Button
              onClick={handleStartBlending}
              disabled={isBlending}
              className="h-11 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm gap-2 shadow-md shadow-orange-500/25 cursor-pointer"
            >
              <Volume2Icon className={`size-4.5 ${isBlending ? "animate-bounce" : ""}`} />
              <span>{isBlending ? "拼读滑行中..." : "一键魔法滑读 (Magic Blending)"}</span>
            </Button>
          </div>
        </div>

        {/* 🎙️ 互动练读与回放比对区 (Child Voice & Echo) */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
              <MicIcon className="size-4 text-orange-500" />
              <span>换我来拼读（录制自己的声音）：</span>
            </div>
            {isRecording && (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-500 animate-pulse">
                <span className="size-2 rounded-full bg-rose-500" />
                正在录音... {recordingSeconds}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={handleStartRecording}
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              className="rounded-xl font-black text-xs gap-1.5 cursor-pointer"
            >
              {isRecording ? (
                <>
                  <SquareIcon className="size-3.5 fill-current" />
                  <span>停止录音</span>
                </>
              ) : (
                <>
                  <MicIcon className="size-3.5 text-orange-500" />
                  <span>{audioBlobUrl ? "重新录音" : "点击开始录音"}</span>
                </>
              )}
            </Button>

            {audioBlobUrl && (
              <>
                <Button
                  onClick={handlePlayMyVoice}
                  disabled={isPlayingRecording}
                  variant="secondary"
                  size="sm"
                  className="rounded-xl font-bold text-xs gap-1.5 cursor-pointer"
                >
                  <PlayIcon className="size-3.5 fill-current" />
                  <span>{isPlayingRecording ? "播放中..." : "听我的录音"}</span>
                </Button>

                <Button
                  onClick={() =>
                    playPhonicsWordSound(word.word, { voice: "en-GB-SoniaNeural" })
                  }
                  variant="ghost"
                  size="sm"
                  className="rounded-xl font-bold text-xs gap-1.5 text-amber-700 hover:text-amber-800 dark:text-amber-300"
                >
                  <Volume2Icon className="size-3.5" />
                  <span>对比 Sonia 原声</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 底部功能条：返回与前往 AI 纠音舱 */}
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs font-bold text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            返回阶梯
          </Button>

          <Button
            size="sm"
            onClick={handleGoToAssessment}
            className="rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-xs gap-1.5 shadow-md border border-amber-300 cursor-pointer"
          >
            <SparklesIcon className="size-3.5 text-amber-400" />
            <span>前往发音魔法纠错舱（深度音素打分）</span>
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
