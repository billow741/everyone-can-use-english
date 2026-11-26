import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  ALPHABET_SONG_CONFIG,
  ALPHABET_SONG_AUDIO_SRC,
  ALPHABET_SONG_TOTAL_DURATION,
  AlphabetSongLetterConfig,
  getLetterConfigByIndex,
  getLetterConfigByTime,
} from "@renderer/lib/alphabet-song-config";
import { playPhonemeSound } from "@renderer/lib/phoneme-data";

gsap.registerPlugin(useGSAP);

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error" | "done";

export default function AlphabetSongPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // 单一事实来源状态机
  const [status, setStatus] = useState<PlaybackStatus>("loading");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(ALPHABET_SONG_TOTAL_DURATION);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stalledWarning, setStalledWarning] = useState<boolean>(false);

  // 纯音素播放中卡片索引（null 表示无纯音播放）
  const [soundingIndex, setSoundingIndex] = useState<number | null>(null);

  // 断点续唱与里程碑鼓励语
  const [resumePromptIndex, setResumePromptIndex] = useState<number | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);

  // 引用追踪与压制
  const currentIndexRef = useRef<number>(0);
  const suppressEncouragementRef = useRef<boolean>(false);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const spotlightInnerRef = useRef<HTMLDivElement | null>(null);
  const prevAnimIndexRef = useRef<number>(0);

  // 当前字母配置
  const currentLetter: AlphabetSongLetterConfig = useMemo(() => {
    return getLetterConfigByIndex(currentIndex);
  }, [currentIndex]);

  // 初始化：检查断点续唱记录
  useEffect(() => {
    try {
      const savedIndexStr = localStorage.getItem("alphabet_song_last_index");
      if (savedIndexStr !== null) {
        const parsed = parseInt(savedIndexStr, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < ALPHABET_SONG_CONFIG.length) {
          setResumePromptIndex(parsed);
        }
      }
    } catch {}
  }, []);

  // 记录播放进度到本地存储
  const saveProgress = useCallback((idx: number) => {
    try {
      localStorage.setItem("alphabet_song_last_index", String(idx));
    } catch {}
  }, []);

  // 清除卡住检测计时器
  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    setStalledWarning(false);
  }, []);

  // 启动卡顿超时检测（超过 6s 提示）
  const startStallTimer = useCallback(() => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => {
      setStalledWarning(true);
    }, 6000);
  }, [clearStallTimer]);

  // 底层原生音频事件绑定（纯事件驱动，解耦 React 闭包）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onCanPlay = () => {
      clearStallTimer();
      setStatus((s) => (s === "loading" ? "idle" : s));
    };

    const onLoadedMetadata = () => {
      const d = audio.duration;
      if (d && !isNaN(d) && isFinite(d) && d > 0) {
        setDuration(d);
      }
    };

    const onWaiting = () => {
      setStatus((s) => {
        if (s === "playing") startStallTimer();
        return s;
      });
    };

    const onPlaying = () => {
      clearStallTimer();
      setStatus("playing");
      setErrorMessage(null);
    };

    const onPause = () => {
      clearStallTimer();
      setStatus((s) => (s !== "done" && s !== "error" ? "paused" : s));
    };

    const onEnded = () => {
      clearStallTimer();
      setStatus("done");
      currentIndexRef.current = ALPHABET_SONG_CONFIG.length - 1;
      setCurrentIndex(ALPHABET_SONG_CONFIG.length - 1);
      setCurrentTime(audio.duration || ALPHABET_SONG_TOTAL_DURATION);
      saveProgress(0);
      setEncouragement(null);
    };

    const onError = () => {
      clearStallTimer();
      setStatus("error");
      setErrorMessage("音频加载失败，请重试");
    };

    const onTimeSync = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      // 时间戳查表计算当前字母（seek 落点比 startTime 低一丝，查表加 0.03s 前瞻避免误判到上一字母）
      const { index } = getLetterConfigByTime(cur + 0.03);
      const prevIndex = currentIndexRef.current;

      if (prevIndex !== index) {
        currentIndexRef.current = index;
        setCurrentIndex(index);
        saveProgress(index);

        if (suppressEncouragementRef.current) {
          setEncouragement(null);
          suppressEncouragementRef.current = false;
        } else {
          const cfg = ALPHABET_SONG_CONFIG[index];
          setEncouragement(cfg?.encouragement || null);
        }
      } else if (suppressEncouragementRef.current) {
        setEncouragement(null);
        suppressEncouragementRef.current = false;
      }
    };

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("timeupdate", onTimeSync);
    audio.addEventListener("seeked", onTimeSync);

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("timeupdate", onTimeSync);
      audio.removeEventListener("seeked", onTimeSync);
    };
  }, [clearStallTimer, startStallTimer, saveProgress]);

  // 纯音播放：模块级单例互斥，快速连点不叠加，跟随静音/音量
  const playPureSoundFor = useCallback(
    (index: number) => {
      const target = ALPHABET_SONG_CONFIG[index];
      if (!target) return;
      setSoundingIndex(index);
      playPhonemeSound(target.soundIpa, {
        volume: isMuted ? 0 : volume,
        muted: isMuted,
        onEnd: () => {
          setSoundingIndex((curr) => (curr === index ? null : curr));
        },
      });
    },
    [volume, isMuted]
  );

  // 控制操作：播放整首/继续
  const playSong = useCallback(() => {
    if (!audioRef.current) return;
    setErrorMessage(null);

    if (status === "done") {
      // 若处于播完状态且在结尾，从头重播
      if (audioRef.current.currentTime >= (audioRef.current.duration || ALPHABET_SONG_TOTAL_DURATION)) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        currentIndexRef.current = 0;
        setCurrentIndex(0);
      }
      setEncouragement(null);
    }

    audioRef.current
      .play()
      .then(() => {
        setStatus("playing");
      })
      .catch((err) => {
        console.warn("Audio play failed:", err);
        setStatus("error");
        setErrorMessage("音频播放被拦截或加载失败，请重试");
      });
  }, [status]);

  // 控制操作：暂停
  const pauseSong = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setStatus("paused");
  }, []);

  // 控制操作：播放/暂停切换
  const togglePlay = useCallback(() => {
    if (status === "playing") {
      pauseSong();
    } else {
      playSong();
    }
  }, [status, playSong, pauseSong]);

  // 控制操作：从头重播整首
  const replaySong = useCallback(() => {
    if (!audioRef.current) return;
    setErrorMessage(null);
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setEncouragement(null);
    audioRef.current
      .play()
      .then(() => {
        setStatus("playing");
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage("音频播放失败，请重试");
      });
  }, []);

  // 点击字母卡交互：
  // 1. 播放中：点网格卡无任何反应（不发声、不暂停、不改高亮、不改游标）；
  // 2. 暂停/闲置/已结束态：seek 到该字母起点 + 改 currentIndex + 发该字母纯音 + 不自动续歌。
  const handleCardClick = useCallback(
    (index: number) => {
      if (status === "playing") return;
      if (!audioRef.current) return;

      setErrorMessage(null);
      const target = ALPHABET_SONG_CONFIG[index];
      if (!target) return;

      // 鼓励压制：handleCardClick 里 seek 之前置 true
      suppressEncouragementRef.current = true;
      setEncouragement(null);

      // 点卡 seek 必须同步改 currentTime 与 currentIndex
      audioRef.current.currentTime = target.startTime;
      setCurrentTime(target.startTime);
      currentIndexRef.current = index;
      setCurrentIndex(index);

      // 闲置点卡小弹跳反馈（Motion Prompt #011 Squash & stretch + #063 Stepper (+/-)）
      if (gridRef.current) {
        const card = gridRef.current.querySelector<HTMLElement>(`[data-letter="${target.letter}"]`);
        if (card) {
          const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (isReduced) {
            gsap.fromTo(card, { opacity: 0.7 }, { opacity: 1, duration: 0.2, overwrite: "auto" });
          } else {
            gsap.timeline({ overwrite: "auto" })
              .to(card, { scale: 0.94, y: 2, duration: 0.08, ease: "power1.inOut" })
              .to(card, { scale: 1.06, y: -4, duration: 0.12, ease: "back.out(2)" })
              .to(card, { scale: 1, y: 0, duration: 0.12, ease: "power1.out" });
          }
        }
      }

      // 发该字母纯音（跟随静音/音量）
      playPureSoundFor(index);
    },
    [status, playPureSoundFor]
  );

  // 断点续唱点击继续：seek 到该字母起点 + playSong()
  const handleResumeClick = useCallback(() => {
    if (resumePromptIndex !== null && audioRef.current) {
      const target = ALPHABET_SONG_CONFIG[resumePromptIndex];
      if (target) {
        audioRef.current.currentTime = target.startTime;
        setCurrentTime(target.startTime);
        currentIndexRef.current = resumePromptIndex;
        setCurrentIndex(resumePromptIndex);
        setResumePromptIndex(null);
        playSong();
      }
    }
  }, [resumePromptIndex, playSong]);

  // 进度条拖拽/点击/键盘 seek
  const seekToTime = useCallback(
    (seekTime: number) => {
      if (!audioRef.current || duration <= 0) return;
      const clamped = Math.max(0, Math.min(duration, seekTime));
      audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);

      const { index } = getLetterConfigByTime(clamped);
      currentIndexRef.current = index;
      setCurrentIndex(index);
      setEncouragement(ALPHABET_SONG_CONFIG[index]?.encouragement || null);
    },
    [duration]
  );

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || !audioRef.current || duration <= 0) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const ratio = clickX / rect.width;
      seekToTime(ratio * duration);
    },
    [duration, seekToTime]
  );

  // 音量切换
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
        audioRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  }, [isMuted]);

  // 键盘快捷键支持：空格切换播放/暂停，左右方向键切换字母
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === "BUTTON") return;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("role") === "slider")) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (status === "playing") return;
        const prevIndex = Math.max(0, currentIndexRef.current - 1);
        handleCardClick(prevIndex);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (status === "playing") return;
        const nextIndex = Math.min(ALPHABET_SONG_CONFIG.length - 1, currentIndexRef.current + 1);
        handleCardClick(nextIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlay, handleCardClick, status]);

  // 卸载清理
  useEffect(() => {
    return () => {
      clearStallTimer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [clearStallTimer]);

  // 字母歌播放时当前卡跟随高亮弹跳/放大（Motion Prompt #123 Bounce + #001 Pop-in，与现有 onTimeSync 节奏同步）
  useEffect(() => {
    if (!gridRef.current) return;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const prevIdx = prevAnimIndexRef.current;
    prevAnimIndexRef.current = currentIndex;

    // 前一张卡平滑收回
    if (prevIdx !== currentIndex) {
      const prevCfg = ALPHABET_SONG_CONFIG[prevIdx];
      if (prevCfg) {
        const prevCard = gridRef.current.querySelector<HTMLElement>(`[data-letter="${prevCfg.letter}"]`);
        if (prevCard) {
          gsap.to(prevCard, {
            scale: 1,
            y: 0,
            duration: 0.2,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      }
    }

    // 播放中当前卡弹跳跟随高亮
    if (status === "playing") {
      const curCfg = ALPHABET_SONG_CONFIG[currentIndex];
      if (curCfg) {
        const curCard = gridRef.current.querySelector<HTMLElement>(`[data-letter="${curCfg.letter}"]`);
        if (curCard) {
          if (isReduced) {
            // prefers-reduced-motion 兜底：只保留淡入淡出
            gsap.fromTo(
              curCard,
              { opacity: 0.75 },
              { opacity: 1, duration: 0.25, ease: "none", overwrite: "auto" }
            );
          } else {
            // Motion Prompt #123 Bounce + #001 Pop-in
            gsap.fromTo(
              curCard,
              { scale: 0.96, y: 0 },
              {
                scale: 1.08,
                y: -6,
                duration: 0.35,
                ease: "back.out(2)",
                overwrite: "auto",
              }
            );
          }
        }
      }
    }
  }, [currentIndex, status]);

  // 悬浮条字母切换淡入（Motion Prompt #074 Fade-in + #044 Cross dissolve）
  useEffect(() => {
    if (status !== "playing" || !spotlightInnerRef.current) return;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReduced) {
      gsap.fromTo(
        spotlightInnerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: "none" }
      );
    } else {
      gsap.fromTo(
        spotlightInnerRef.current,
        { opacity: 0, y: 6, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.22, ease: "power2.out" }
      );
    }
  }, [currentLetter.letter, status]);

  // 格式化秒数为 m:ss
  const formatTime = (sec: number) => {
    const safeSec = Math.max(0, Math.floor(sec));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="min-h-full px-3 sm:px-4 pt-3 sm:pt-6 pb-44 min-[1280px]:pb-8 lg:px-8 max-w-5xl mx-auto space-y-2.5 sm:space-y-5 select-none">
      {/* 隐藏的底层音频元素，preload="auto"，纯事件驱动 */}
      <audio
        ref={audioRef}
        src={ALPHABET_SONG_AUDIO_SRC}
        preload="auto"
      />

      {/* 1. 标题区（页面顶部，移动紧凑） */}
      <div className="relative overflow-hidden rounded-[20px] bg-white border border-[#D3E4DE] p-3 sm:p-5 shadow-[0_1px_3px_rgba(18,59,60,0.04),0_4px_12px_rgba(18,59,60,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          {/* 左侧：眉题＋标题同行 */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#123B3C] shrink-0">
              <span className="size-2 rounded-full bg-[#E8930C]" />
              <span>A0 · 自然拼读</span>
            </div>
            <h1 className="text-[18px] sm:text-[20px] md:text-[26px] font-bold text-[#123B3C] tracking-normal leading-tight">
              26 个英文字母自然拼读
            </h1>
          </div>

          {/* 右侧：敢敢头像 28px（手机）/36px（桌面）＋一句口播 */}
          <div className="flex items-center gap-2 sm:gap-3 bg-[#E7F2EF] px-2.5 sm:px-3 py-1 sm:py-2 rounded-[14px] border border-[#D3E4DE]/80 self-start sm:self-auto shrink-0">
            <img
              src="/assets/gangan/gangan_avatar240.png"
              alt="敢敢"
              className="size-7 sm:size-9 rounded-full object-cover border border-[#D3E4DE] bg-white shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/assets/gangan/gangan_official.png";
              }}
            />
            <p className="text-[11.5px] sm:text-[12.5px] text-[#4E6B69]">
              一个一个唱，26 个字母音就都熟啦
            </p>
          </div>
        </div>

        {/* 断点续唱药丸（有记录时占第二行，触控热区 >= 44px） */}
        {resumePromptIndex !== null && (
          <div className="mt-2.5 pt-2.5 border-t border-[#D3E4DE]/50">
            <button
              type="button"
              onClick={handleResumeClick}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-full bg-[#E7F2EF] text-[#123B3C] text-xs font-semibold border border-[#0F7B7A]/40 hover:bg-[#D3E4DE] transition-all cursor-pointer"
            >
              <Sparkles className="size-3.5 text-[#0F7B7A]" />
              <span>上次唱到 {ALPHABET_SONG_CONFIG[resumePromptIndex].letterDisplay}，点击继续唱</span>
              <ChevronRight className="size-3.5 text-[#0F7B7A]" />
            </button>
          </div>
        )}
      </div>

      {/* 2. 悬浮条（仅播放时渲染；sticky top-[60px] xl:top-0 z-40） */}
      {status === "playing" && (
        <div
          data-testid="spotlight-card"
          className="sticky top-[60px] xl:top-0 z-40 w-fit mx-auto pointer-events-none select-none"
        >
          <div
            key={currentLetter.letter}
            ref={spotlightInnerRef}
            className="flex items-baseline gap-3 bg-white/95 backdrop-blur-md border border-[#D3E4DE] px-[22px] py-[10px] md:px-[28px] md:py-[12px] rounded-full shadow-[0_4px_16px_rgba(18,59,60,0.1)]"
          >
            <span
              data-testid="spotlight-big-letter"
              className="font-[CharisSIL,serif] font-bold text-[56px] md:text-[68px] text-[#123B3C] leading-none"
            >
              {currentLetter.letterDisplay}
            </span>
            <span
              data-testid="spotlight-ipa"
              className="font-[CharisSIL,serif] font-bold text-[24px] md:text-[30px] text-[#0F7B7A] leading-none"
            >
              {currentLetter.soundIpa}
            </span>
          </div>
        </div>
      )}

      {/* 3. 26 字母网格（页面本体，取消网格头） */}
      <div
        ref={gridRef}
        data-testid="alphabet-grid"
        className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 sm:gap-3"
      >
        {ALPHABET_SONG_CONFIG.map((item, idx) => {
          const isCurrent = currentIndex === idx;
          const isSounding = soundingIndex === idx;
          const isHighlighted = isCurrent || isSounding;

          return (
            <button
              key={item.letter}
              type="button"
              data-letter={item.letter}
              data-testid={`card-${item.letter}`}
              data-sounding={isSounding ? "true" : undefined}
              onClick={() => handleCardClick(idx)}
              aria-label={`字母 ${item.letterDisplay}, 字母音 ${item.soundIpa}`}
              className={`relative flex flex-col items-center justify-center p-1.5 sm:p-3 rounded-[14px] min-h-[54px] sm:min-h-[82px] transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#0F7B7A] focus-visible:outline-offset-[3px] ${
                isHighlighted
                  ? "bg-[#E7F2EF] border-2 border-[#0F7B7A] -translate-y-1 shadow-[0_4px_12px_rgba(15,123,122,0.2)]"
                  : "bg-white border border-[#D3E4DE] hover:border-[#0F7B7A]/60 hover:-translate-y-0.5 shadow-xs"
              }`}
            >
              {/* 纯音播放中：右上角 8px 青色脉冲圆点 */}
              {isSounding && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#0F7B7A] animate-pulse" />
              )}

              {/* 字母本身 */}
              <span
                data-testid={`card-letter-${item.letter}`}
                className="font-[CharisSIL,serif] font-bold text-[18px] sm:text-[26px] text-[#123B3C] leading-tight"
              >
                {item.letterDisplay}
              </span>

              {/* 对应美音字母音 IPA */}
              <span
                data-testid={`card-ipa-${item.letter}`}
                className="font-[CharisSIL,serif] text-[11px] sm:text-[12.5px] text-[#4E6B69] mt-0.5"
              >
                {item.soundIpa}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. 网格下方一行：左「去纠错舱练发音 →」，右「跳过到词族 →」 */}
      <div className="flex items-center justify-between text-xs sm:text-sm px-1">
        <Link
          to="/pronunciation_assessments"
          className="text-[#0F7B7A] font-semibold hover:underline inline-flex items-center gap-1 min-h-[44px] py-2 transition-colors"
        >
          <span>去纠错舱练 {currentLetter.soundIpa}</span>
          <ArrowRight className="size-3.5" />
        </Link>
        <Link
          to="/families"
          className="inline-flex items-center gap-1 min-h-[44px] py-2 text-[#4E6B69] hover:text-[#0F7B7A] font-medium transition-colors"
        >
          <span>跳过，去词族</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* 5. 鼓励语行（条件出现）：网格下方 */}
      {encouragement && (
        <div className="text-center text-xs font-semibold text-[#0A5E5D] flex items-center justify-center gap-1.5 motion-safe:animate-in motion-safe:fade-in">
          <Sparkles className="size-3.5" />
          <span>{encouragement}</span>
        </div>
      )}

      {/* 6. 音频异常与卡顿提示条 */}
      {(errorMessage || stalledWarning) && (
        <div
          data-testid="audio-error-banner"
          className="rounded-[14px] bg-[#D9553F]/10 border border-[#D9553F]/30 p-3 text-xs text-[#D9553F] flex items-center gap-2"
        >
          <AlertCircle className="size-4 shrink-0" />
          <div className="flex-1">
            {errorMessage || (stalledWarning ? "音频正在缓冲中，请耐心等候..." : "")}
          </div>
          {errorMessage && (
            <button
              type="button"
              onClick={playSong}
              className="min-h-[44px] px-3.5 py-2 rounded-[10px] bg-[#D9553F] text-white font-bold hover:bg-[#C44732] cursor-pointer"
            >
              重试
            </button>
          )}
        </div>
      )}

      {/* 7. 底部播放条（紧随内容且配合 pb-44，确保不被 MobileTabBar 遮挡或切半；桌面端 sticky 吸底） */}
      <div
        data-testid="playback-control-bar"
        className="relative xl:sticky xl:bottom-4 z-30 w-full rounded-[20px] bg-white/95 backdrop-blur-md border border-[#D3E4DE] p-2.5 sm:p-4 shadow-[0_4px_16px_rgba(18,59,60,0.1)] flex flex-col gap-2 sm:gap-3"
      >
        {/* 顶部加一行「正在唱」歌词字幕 */}
        {status === "playing" && (
          <div
            data-testid="now-singing-caption"
            className="text-center font-[CharisSIL,serif] text-[15px] sm:text-[16px] text-[#123B3C] font-medium leading-relaxed truncate px-2"
          >
            {currentLetter.lyric}
          </div>
        )}

        {/* 播放控制按钮与进度组件（触控热区 >= 44px） */}
        <div className="flex items-center gap-2 sm:gap-4 w-full">
          {/* 播放/暂停大按钮 (48px) */}
          <button
            type="button"
            data-testid="btn-play-toggle"
            onClick={togglePlay}
            aria-label={status === "playing" ? "暂停" : "播放"}
            className="size-12 rounded-full bg-[#0F7B7A] hover:bg-[#0A5E5D] text-white flex items-center justify-center shrink-0 shadow-sm transition-all active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0F7B7A]"
          >
            {status === "playing" ? (
              <Pause className="size-5 fill-white" />
            ) : (
              <Play className="size-5 fill-white ml-0.5" />
            )}
          </button>

          {/* 重播按钮 (44px) */}
          <button
            type="button"
            data-testid="btn-replay"
            onClick={replaySong}
            aria-label="从头重播"
            title="从头重播"
            className="size-11 rounded-full bg-white hover:bg-[#E7F2EF] border border-[#D3E4DE] text-[#123B3C] flex items-center justify-center shrink-0 transition-all active:scale-[0.97] cursor-pointer"
          >
            <RotateCcw className="size-4" />
          </button>

          {/* 进度条轨道与拖拽/点击/键盘区域 */}
          <div
            ref={progressBarRef}
            data-testid="progress-track"
            onClick={handleSeek}
            role="slider"
            tabIndex={0}
            aria-label="音频进度条"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration || 0)}
            aria-valuenow={Math.round(currentTime || 0)}
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            onKeyDown={(e) => {
              if (duration <= 0) return;
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                seekToTime(currentTime - 5);
              } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                seekToTime(currentTime + 5);
              } else if (e.key === "Home") {
                e.preventDefault();
                seekToTime(0);
              } else if (e.key === "End") {
                e.preventDefault();
                seekToTime(duration);
              }
            }}
            className="flex-1 h-11 flex items-center cursor-pointer group"
          >
            <div className="relative w-full h-1.5 rounded-full bg-[#D3E4DE] overflow-visible">
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#0F7B7A] rounded-full transition-[width] duration-100"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-[#0F7B7A] border-2 border-white shadow-xs -ml-1.5 transition-[left] duration-100"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 字母进度与时间码 */}
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#4E6B69] shrink-0 font-mono tabular-nums">
            <span data-testid="letter-progress" className="font-semibold text-[#123B3C]">
              {currentIndex + 1} / 26
            </span>
            <span className="hidden sm:inline text-[#D3E4DE]">|</span>
            <span data-testid="timecode" className="hidden sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* 音量控制（桌面端显示滑杆，手机端显示静音切换 >=44px） */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <button
              type="button"
              data-testid="btn-mute"
              onClick={toggleMute}
              aria-label={isMuted ? "取消静音" : "静音"}
              className="size-11 rounded-full hover:bg-[#E7F2EF] text-[#123B3C] flex items-center justify-center cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="size-4 text-[#D9553F]" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="音量控制"
              className="hidden md:block w-16 h-1 accent-[#0F7B7A] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
